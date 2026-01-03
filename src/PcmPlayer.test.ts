import { PcmPlayer } from './PcmPlayer'

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
    it('should have correct size for SharedArrayBuffer', () => {
      const RENDER_QUANTUM_FRAMES = 128
      const MAX_BLOCKS = 100
      const expectedSize =
        RENDER_QUANTUM_FRAMES * Float32Array.BYTES_PER_ELEMENT * MAX_BLOCKS
      expect(player.getRawBuffer().byteLength).toBe(expectedSize)
    })
  })
})