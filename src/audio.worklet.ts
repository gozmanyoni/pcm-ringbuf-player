// WebAudio's render quantum size.
const RENDER_QUANTUM_FRAMES = 128

const RING_POINTERS_SIZE = 8

type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array

/**
 * A Reader class used by this worklet to read from a Adapted from a SharedArrayBuffer written to by ringbuf.js on the main thread, Adapted from https://github.com/padenot/ringbuf.js
 * MPL-2.0 License (see RingBuffer_LICENSE.txt)
 *
 * @author padenot
 */
class RingBuffReader<T extends TypedArray> {
  private storage: T
  private writePointer: Uint32Array
  private readPointer: Uint32Array

  constructor(buffer: SharedArrayBuffer, ArrayConstructor: any) {
    const storageSize =
      (buffer.byteLength - RING_POINTERS_SIZE) / ArrayConstructor.BYTES_PER_ELEMENT
    this.storage = new ArrayConstructor(buffer, RING_POINTERS_SIZE, storageSize) as T
    // matching capacity and R/W pointers defined in ringbuf.js
    this.writePointer = new Uint32Array(buffer, 0, 1)
    this.readPointer = new Uint32Array(buffer, 4, 1)
  }

  readTo(array: T): number {
    const { readPos, available } = this.getReadInfo()
    if (available === 0) {
      return 0
    }

    const readLength = Math.min(available, array.length)

    const first = Math.min(this.storage.length - readPos, readLength)
    const second = readLength - first

    this.copy(this.storage, readPos, array, 0, first)
    this.copy(this.storage, 0, array, first, second)

    Atomics.store(
      this.readPointer,
      0,
      (readPos + readLength) % this.storage.length,
    )

    return readLength
  }

  getReadInfo() {
    const readPos = Atomics.load(this.readPointer, 0)
    const writePos = Atomics.load(this.writePointer, 0)
    const available =
      (writePos + this.storage.length - readPos) % this.storage.length
    return {
      readPos,
      writePos,
      available,
    }
  }

  private copy(
    input: TypedArray,
    offset_input: number,
    output: TypedArray,
    offset_output: number,
    size: number,
  ) {
    for (let i = 0; i < size; i++) {
      output[offset_output + i] = input[offset_input + i]
    }
  }
}

class PCMWorkletProcessor extends AudioWorkletProcessor {
  private underflowing = false
  private reader: RingBuffReader<any>
  private readerOutput: any
  private channels: number
  private converter: (value: number) => number

  constructor(options: {
    processorOptions: {
      sab: SharedArrayBuffer
      channels: number
      pcmType: 'int16' | 'int32' | 'float32'
    }
  }) {
    super()
    const { sab, channels, pcmType } = options.processorOptions
    this.channels = channels

    // Select appropriate array constructor and converter based on PCM type
    const { ArrayConstructor, converter } = this.getTypeConfig(pcmType)
    this.reader = new RingBuffReader(sab, ArrayConstructor)
    this.readerOutput = new ArrayConstructor(RENDER_QUANTUM_FRAMES * channels)
    this.converter = converter
  }

  private getTypeConfig(pcmType: 'int16' | 'int32' | 'float32') {
    switch (pcmType) {
      case 'int16':
        return {
          ArrayConstructor: Int16Array,
          converter: (value: number) => value / 32768
        }
      case 'int32':
        return {
          ArrayConstructor: Int32Array,
          converter: (value: number) => value / 2147483648
        }
      case 'float32':
        return {
          ArrayConstructor: Float32Array,
          converter: (value: number) => value // Passthrough, already normalized
        }
      default:
        throw new Error(`Unsupported PCM type: ${pcmType}`)
    }
  }

  process(_: Float32Array[][], outputs: Float32Array[][]) {
    const outputChannels = outputs[0]

    const { available } = this.reader.getReadInfo()
    if (available < this.readerOutput.length) {
      if (!this.underflowing) {
        console.debug('UNDERFLOW', available)
      }
      this.underflowing = true
      return true
    }

    this.reader.readTo(this.readerOutput)

    for (let i = 0; i < this.readerOutput.length; i++) {
      // split interleaved audio as it comes from the dongle by splitting it across the channels
      if (this.channels === 2) {
        for (let channel = 0; channel < this.channels; channel++) {
          outputChannels[channel][i] = this.converter(
            this.readerOutput[2 * i + channel],
          )
        }
      } else {
        outputChannels[0][i] = this.converter(this.readerOutput[i])
      }
    }

    this.underflowing = false
    return true
  }
}

registerProcessor('pcm-worklet-processor', PCMWorkletProcessor)
