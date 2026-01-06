import { pcm24ToInt32, pcm24BufferToInt32, getPcm24Range } from './pcm24'

describe('pcm24 utilities', () => {
  describe('getPcm24Range', () => {
    it('should return correct 24-bit range', () => {
      const range = getPcm24Range()
      expect(range.min).toBe(-8388608)
      expect(range.max).toBe(8388607)
      expect(range.bits).toBe(24)
    })
  })

  describe('pcm24ToInt32', () => {
    it('should convert 24-bit PCM to Int32Array (little-endian)', () => {
      // Create 24-bit PCM data: 3 samples
      // Sample 1: 0x000001 (1)
      // Sample 2: 0x7FFFFF (8388607, max positive)
      // Sample 3: 0x800000 (-8388608, max negative)
      const pcm24Data = new Uint8Array([
        0x01, 0x00, 0x00, // 1 in little-endian
        0xFF, 0xFF, 0x7F, // 8388607 in little-endian
        0x00, 0x00, 0x80, // -8388608 in little-endian
      ])

      const int32Data = pcm24ToInt32(pcm24Data, true)

      expect(int32Data.length).toBe(3)
      // Values are shifted left by 8 bits
      expect(int32Data[0]).toBe(1 << 8) // 256
      expect(int32Data[1]).toBe(8388607 << 8) // 2147483392
      expect(int32Data[2]).toBe(-8388608 << 8) // -2147483648
    })

    it('should convert 24-bit PCM to Int32Array (big-endian)', () => {
      // Create 24-bit PCM data in big-endian
      // Sample 1: 0x000001 (1)
      // Sample 2: 0x7FFFFF (8388607)
      const pcm24Data = new Uint8Array([
        0x00, 0x00, 0x01, // 1 in big-endian
        0x7F, 0xFF, 0xFF, // 8388607 in big-endian
      ])

      const int32Data = pcm24ToInt32(pcm24Data, false)

      expect(int32Data.length).toBe(2)
      expect(int32Data[0]).toBe(1 << 8)
      expect(int32Data[1]).toBe(8388607 << 8)
    })

    it('should handle zero correctly', () => {
      const pcm24Data = new Uint8Array([0x00, 0x00, 0x00])
      const int32Data = pcm24ToInt32(pcm24Data)

      expect(int32Data.length).toBe(1)
      expect(int32Data[0]).toBe(0)
    })

    it('should handle negative values correctly', () => {
      // -1 in 24-bit is 0xFFFFFF
      const pcm24Data = new Uint8Array([
        0xFF, 0xFF, 0xFF, // -1 in little-endian
        0x00, 0x00, 0x80, // -8388608 in little-endian
        0x01, 0x00, 0x80, // -8388607 in little-endian
      ])

      const int32Data = pcm24ToInt32(pcm24Data, true)

      expect(int32Data.length).toBe(3)
      expect(int32Data[0]).toBe(-1 << 8) // -256
      expect(int32Data[1]).toBe(-8388608 << 8) // -2147483648
      expect(int32Data[2]).toBe(-8388607 << 8) // -2147483392
    })

    it('should handle partial data (truncate incomplete samples)', () => {
      // 7 bytes = 2 complete samples + 1 incomplete (should only process 2)
      const pcm24Data = new Uint8Array([
        0x01, 0x00, 0x00,
        0x02, 0x00, 0x00,
        0x03, // Incomplete sample
      ])

      const int32Data = pcm24ToInt32(pcm24Data)

      expect(int32Data.length).toBe(2)
      expect(int32Data[0]).toBe(1 << 8)
      expect(int32Data[1]).toBe(2 << 8)
    })
  })

  describe('pcm24BufferToInt32', () => {
    it('should convert from ArrayBuffer', () => {
      const buffer = new ArrayBuffer(6)
      const view = new Uint8Array(buffer)
      view[0] = 0x01
      view[1] = 0x00
      view[2] = 0x00
      view[3] = 0xFF
      view[4] = 0xFF
      view[5] = 0x7F

      const int32Data = pcm24BufferToInt32(buffer)

      expect(int32Data.length).toBe(2)
      expect(int32Data[0]).toBe(1 << 8)
      expect(int32Data[1]).toBe(8388607 << 8)
    })

    it('should respect offset parameter', () => {
      const buffer = new ArrayBuffer(9)
      const view = new Uint8Array(buffer)
      // Padding bytes
      view[0] = 0xFF
      view[1] = 0xFF
      view[2] = 0xFF
      // Actual data starts at offset 3
      view[3] = 0x01
      view[4] = 0x00
      view[5] = 0x00
      view[6] = 0x02
      view[7] = 0x00
      view[8] = 0x00

      const int32Data = pcm24BufferToInt32(buffer, 3)

      expect(int32Data.length).toBe(2)
      expect(int32Data[0]).toBe(1 << 8)
      expect(int32Data[1]).toBe(2 << 8)
    })

    it('should respect length parameter', () => {
      const buffer = new ArrayBuffer(9)
      const view = new Uint8Array(buffer)
      view[0] = 0x01
      view[1] = 0x00
      view[2] = 0x00
      view[3] = 0x02
      view[4] = 0x00
      view[5] = 0x00
      view[6] = 0x03
      view[7] = 0x00
      view[8] = 0x00

      // Only process first 6 bytes (2 samples)
      const int32Data = pcm24BufferToInt32(buffer, 0, 6)

      expect(int32Data.length).toBe(2)
      expect(int32Data[0]).toBe(1 << 8)
      expect(int32Data[1]).toBe(2 << 8)
    })

    it('should handle offset and length together', () => {
      const buffer = new ArrayBuffer(12)
      const view = new Uint8Array(buffer)
      // Padding
      view[0] = 0xFF
      view[1] = 0xFF
      view[2] = 0xFF
      // Data
      view[3] = 0x01
      view[4] = 0x00
      view[5] = 0x00
      view[6] = 0x02
      view[7] = 0x00
      view[8] = 0x00
      // More data (should be ignored)
      view[9] = 0x03
      view[10] = 0x00
      view[11] = 0x00

      const int32Data = pcm24BufferToInt32(buffer, 3, 6)

      expect(int32Data.length).toBe(2)
      expect(int32Data[0]).toBe(1 << 8)
      expect(int32Data[1]).toBe(2 << 8)
    })
  })
})
