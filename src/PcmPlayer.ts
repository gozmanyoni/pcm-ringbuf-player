import { RingBuffer } from 'ringbuf.js'

const RENDER_QUANTUM_FRAMES = 128
const DEFAULT_MAX_BLOCKS = 1000 // Default buffer size: ~2.7 seconds of buffering
const RING_BUFFER_POINTER_SIZE = 8 // Bytes reserved for ring buffer read/write pointers

export type PcmArrayType = Int16Array | Int32Array | Float32Array

export type PcmArrayConstructor<T extends PcmArrayType> =
  T extends Int16Array ? Int16ArrayConstructor :
  T extends Int32Array ? Int32ArrayConstructor :
  T extends Float32Array ? Float32ArrayConstructor :
  never

interface PcmTypeInfo {
  name: 'int16' | 'int32' | 'float32'
  bytesPerElement: number
  maxValue: number
}

export class PcmPlayer<T extends PcmArrayType = Int16Array> {
  private workletName: string = 'pcm-worklet-processor'

  private context: AudioContext | undefined
  private gainNode: GainNode | undefined
  private channels: number
  private worklet: AudioWorkletNode | undefined
  private buffers: T[] = []
  private pcmType: PcmArrayConstructor<T>
  private pcmTypeInfo: PcmTypeInfo
  private maxBlocks: number
  private sab: SharedArrayBuffer
  private rb: RingBuffer

  constructor(
    sampleRate: number,
    channels: number,
    pcmType?: PcmArrayConstructor<T>,
    maxBlocks: number = DEFAULT_MAX_BLOCKS
  ) {
    this.context = new AudioContext({
      latencyHint: 'playback',
      sampleRate,
    })
    this.gainNode = this.context.createGain()
    this.gainNode.gain.value = 1
    this.gainNode.connect(this.context.destination)
    this.channels = channels
    this.maxBlocks = maxBlocks

    // Set PCM type (default to Int16Array for backward compatibility)
    this.pcmType = pcmType || (Int16Array as PcmArrayConstructor<T>)
    this.pcmTypeInfo = this.getPcmTypeInfo(this.pcmType)

    // Initialize SharedArrayBuffer with correct size for the PCM type
    this.sab = new SharedArrayBuffer(
      RENDER_QUANTUM_FRAMES * this.pcmTypeInfo.bytesPerElement * this.maxBlocks + RING_BUFFER_POINTER_SIZE
    )
    this.rb = new RingBuffer(this.sab, this.pcmType)
  }

  private getPcmTypeInfo(ctor: PcmArrayConstructor<T>): PcmTypeInfo {
    if (ctor === Int16Array as any) {
      return { name: 'int16', bytesPerElement: 2, maxValue: 32768 }
    }
    if (ctor === Int32Array as any) {
      return { name: 'int32', bytesPerElement: 4, maxValue: 2147483648 }
    }
    if (ctor === Float32Array as any) {
      return { name: 'float32', bytesPerElement: 4, maxValue: 1 }
    }
    throw new Error('Unsupported PCM type')
  }

  private feedWorklet(data: T) {
    this.rb.push(data)
  }

  getRawBuffer() {
    return this.sab
  }

  feed(source: T) {
    if (!this.worklet) {
      this.buffers.push(source)
      return
    }

    this.feedWorklet(source)
  }

  volume(volume: number, duration: number = 0) {
    if (this.gainNode) {
      this.gainNode.gain.setTargetAtTime(
        volume,
        this.context!.currentTime + duration,
        duration / 3,
      )
    }
  }

  async start() {
    if (!this.context || !this.gainNode) {
      throw Error(
        'Illegal state - context or gainNode not set - create a new PcmPlayer',
      )
    }

    const isDev =
      typeof import.meta !== 'undefined' &&
      typeof (import.meta as any).env !== 'undefined' &&
      !!(import.meta as any).env.DEV

    const workletURL = isDev
      ? '/audio.worklet.js'
      : new URL('./audio.worklet.js', import.meta.url).href;

    await this.context.audioWorklet.addModule(workletURL)

    this.worklet = new AudioWorkletNode(this.context, this.workletName, {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [this.channels],
      processorOptions: {
        sab: this.sab,
        channels: this.channels,
        pcmType: this.pcmTypeInfo.name,
      },
    })
    this.worklet.connect(this.gainNode)

    for (const source of this.buffers) {
      this.feedWorklet(source)
    }
    this.buffers.length = 0
  }

  async stop() {
    if (!this.context) return

    if (this.context.state !== 'closed') {
      await this.context.close()
    }
    this.gainNode?.disconnect()
    this.worklet?.disconnect()
    this.context = undefined
    this.gainNode = undefined
    this.worklet = undefined
  }
}
