import { PcmPlayer } from './PcmPlayer'

const RENDER_QUANTUM_FRAMES = 128
const DEFAULT_MAX_BLOCKS = 1000
const RING_BUFFER_POINTER_SIZE = 8

describe('PcmPlayer', () => {
  let player: PcmPlayer

  beforeEach(() => {
    // Create a new player for each test
    player = new PcmPlayer(44100, 2)
  })

  afterEach(async () => {
    // Clean up after each test
    await player.stop()
  })

  describe('Constructor', () => {
    it('should initialize with correct sample rate and channels', () => {
      expect(player['channels']).toBe(2)
    })

    it('should create AudioContext with specified sample rate', () => {
      const context = player['context']
      expect(context).toBeDefined()
      expect(context?.sampleRate).toBe(44100)
    })

    it('should create gain node connected to destination', () => {
      const gainNode = player['gainNode']
      expect(gainNode).toBeDefined()
      expect(gainNode?.gain.value).toBe(1)
    })

    it('should initialize buffers array', () => {
      expect(player['buffers']).toEqual([])
    })

    it('should initialize SharedArrayBuffer', () => {
      const sab = player['sab']
      expect(sab).toBeDefined()
      expect(sab.byteLength).toBeGreaterThan(0)
    })

    it('should initialize RingBuffer', () => {
      const rb = player['rb']
      expect(rb).toBeDefined()
    })
  })

  describe('getRawBuffer', () => {
    it('should return the SharedArrayBuffer', () => {
      const sab = player.getRawBuffer()
      expect(sab).toBe(player['sab'])
    })
  })

  describe('feed', () => {
    it('should store data in buffers when worklet is not initialized', () => {
      const testData = new Int16Array([1, 2, 3])
      player.feed(testData)
      expect(player['buffers']).toContainEqual(testData)
    })

    it('should feed data to worklet when initialized', async () => {
      // Start the player to initialize worklet
      await player.start()
      const testData = new Int16Array([1, 2, 3])
      player.feed(testData)

      // Data should be in ring buffer, not buffers array
      expect(player['buffers']).toEqual([])
    })
  })

  describe('volume', () => {
    it('should set volume with default duration', () => {
      const gainNode = player['gainNode']!
      const initialVolume = gainNode.gain.value
      player.volume(0.5)
      expect(gainNode.gain.value).toBeLessThanOrEqual(initialVolume)
    })

    it('should set volume with custom duration', () => {
      const gainNode = player['gainNode']!
      player.volume(0.8, 1)
      expect(gainNode.gain.value).toBe(0.8)
    })
  })

  describe('start', () => {
    it('should initialize worklet node', async () => {
      await player.start()
      expect(player['worklet']).toBeDefined()
    })

    it('should feed buffered data to worklet', async () => {
      const testData = new Int16Array([1, 2, 3])
      player.feed(testData)

      await player.start()

      // Buffers should be empty after start
      expect(player['buffers']).toEqual([])
    })

    it('should throw error when context or gainNode not set', async () => {
      // Manually unset context to test error
      player['context'] = undefined
      await expect(player.start()).rejects.toThrow('Illegal state')
    })
  })

  describe('stop', () => {
    it('should close AudioContext', async () => {
      await player.start()
      const context = player['context']
      expect(context?.state).toBe('running')

      await player.stop()
      expect(player['context']).toBeUndefined()
    })

    it('should disconnect gain node', async () => {
      await player.start()
      const gainNode = player['gainNode']
      expect(gainNode).toBeDefined()

      await player.stop()
      expect(player['gainNode']).toBeUndefined()
    })

    it('should disconnect worklet node', async () => {
      await player.start()
      const worklet = player['worklet']
      expect(worklet).toBeDefined()

      await player.stop()
      expect(player['worklet']).toBeUndefined()
    })

    it('should handle stop when context is already closed', async () => {
      await player.stop()
      // Should not throw error
      expect(player['context']).toBeUndefined()
    })
  })

  describe('SharedArrayBuffer management', () => {
    it('should have correct size for SharedArrayBuffer with default blocks', () => {
      const expectedSize =
        RENDER_QUANTUM_FRAMES * Int16Array.BYTES_PER_ELEMENT * DEFAULT_MAX_BLOCKS + RING_BUFFER_POINTER_SIZE
      expect(player.getRawBuffer().byteLength).toBe(expectedSize)
    })

    it('should accept custom maxBlocks parameter', () => {
      const customPlayer = new PcmPlayer(44100, 2, Int16Array, 500)
      const CUSTOM_MAX_BLOCKS = 500
      const expectedSize =
        RENDER_QUANTUM_FRAMES * Int16Array.BYTES_PER_ELEMENT * CUSTOM_MAX_BLOCKS + RING_BUFFER_POINTER_SIZE
      expect(customPlayer.getRawBuffer().byteLength).toBe(expectedSize)
      customPlayer.stop()
    })
  })
})

describe('PcmPlayer with Int32Array', () => {
  let player: PcmPlayer<Int32Array>

  beforeEach(() => {
    player = new PcmPlayer<Int32Array>(44100, 2, Int32Array)
  })

  afterEach(async () => {
    await player.stop()
  })

  describe('Constructor', () => {
    it('should initialize with Int32Array type', () => {
      expect(player['pcmType']).toBe(Int32Array)
      expect(player['pcmTypeInfo'].name).toBe('int32')
      expect(player['pcmTypeInfo'].bytesPerElement).toBe(4)
    })

    it('should have correct SharedArrayBuffer size for Int32', () => {
      const expectedSize =
        RENDER_QUANTUM_FRAMES * Int32Array.BYTES_PER_ELEMENT * DEFAULT_MAX_BLOCKS + RING_BUFFER_POINTER_SIZE
      expect(player.getRawBuffer().byteLength).toBe(expectedSize)
    })

    it('should accept custom maxBlocks for Int32', () => {
      const customPlayer = new PcmPlayer<Int32Array>(44100, 2, Int32Array, 750)
      const CUSTOM_MAX_BLOCKS = 750
      const expectedSize =
        RENDER_QUANTUM_FRAMES * Int32Array.BYTES_PER_ELEMENT * CUSTOM_MAX_BLOCKS + RING_BUFFER_POINTER_SIZE
      expect(customPlayer.getRawBuffer().byteLength).toBe(expectedSize)
      customPlayer.stop()
    })
  })

  describe('feed', () => {
    it('should accept and feed Int32Array data', () => {
      const testData = new Int32Array([1000000, 2000000, 3000000])
      player.feed(testData)
      expect(player['buffers']).toContainEqual(testData)
    })

    it('should feed Int32Array to worklet when initialized', async () => {
      await player.start()
      const testData = new Int32Array([1000000, 2000000, 3000000])
      player.feed(testData)
      expect(player['buffers']).toEqual([])
    })
  })

  describe('start', () => {
    it('should pass int32 type to worklet', async () => {
      await player.start()
      expect(player['worklet']).toBeDefined()
    })
  })
})

describe('PcmPlayer with Float32Array', () => {
  let player: PcmPlayer<Float32Array>

  beforeEach(() => {
    player = new PcmPlayer<Float32Array>(44100, 2, Float32Array)
  })

  afterEach(async () => {
    await player.stop()
  })

  describe('Constructor', () => {
    it('should initialize with Float32Array type', () => {
      expect(player['pcmType']).toBe(Float32Array)
      expect(player['pcmTypeInfo'].name).toBe('float32')
      expect(player['pcmTypeInfo'].bytesPerElement).toBe(4)
    })

    it('should have correct SharedArrayBuffer size for Float32', () => {
      const expectedSize =
        RENDER_QUANTUM_FRAMES * Float32Array.BYTES_PER_ELEMENT * DEFAULT_MAX_BLOCKS + RING_BUFFER_POINTER_SIZE
      expect(player.getRawBuffer().byteLength).toBe(expectedSize)
    })

    it('should accept custom maxBlocks for Float32', () => {
      const customPlayer = new PcmPlayer<Float32Array>(44100, 2, Float32Array, 250)
      const CUSTOM_MAX_BLOCKS = 250
      const expectedSize =
        RENDER_QUANTUM_FRAMES * Float32Array.BYTES_PER_ELEMENT * CUSTOM_MAX_BLOCKS + RING_BUFFER_POINTER_SIZE
      expect(customPlayer.getRawBuffer().byteLength).toBe(expectedSize)
      customPlayer.stop()
    })
  })

  describe('feed', () => {
    it('should accept and feed Float32Array data', () => {
      const testData = new Float32Array([0.5, 0.75, -0.3])
      player.feed(testData)
      expect(player['buffers']).toContainEqual(testData)
    })

    it('should feed Float32Array to worklet when initialized', async () => {
      await player.start()
      const testData = new Float32Array([0.5, 0.75, -0.3])
      player.feed(testData)
      expect(player['buffers']).toEqual([])
    })
  })

  describe('start', () => {
    it('should pass float32 type to worklet', async () => {
      await player.start()
      expect(player['worklet']).toBeDefined()
    })
  })
})

describe('PcmPlayer backward compatibility', () => {
  it('should default to Int16Array when no type specified', () => {
    const player = new PcmPlayer(44100, 2)
    expect(player['pcmType']).toBe(Int16Array)
    expect(player['pcmTypeInfo'].name).toBe('int16')
  })

  it('should accept Int16Array data with default constructor', async () => {
    const player = new PcmPlayer(44100, 2)
    const testData = new Int16Array([100, 200, 300])
    player.feed(testData)
    expect(player['buffers']).toContainEqual(testData)
    await player.stop()
  })

  it('should work with existing code without modifications', async () => {
    const player = new PcmPlayer(48000, 2)
    const testData = new Int16Array([1, 2, 3, 4, 5, 6])

    player.feed(testData)
    await player.start()

    expect(player['worklet']).toBeDefined()
    await player.stop()
  })
})