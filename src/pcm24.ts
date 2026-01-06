/**
 * Utilities for working with 24-bit PCM audio data
 * Since JavaScript doesn't have Int24Array, we convert to Int32Array
 */

/**
 * Convert 24-bit PCM data to Int32Array
 * 24-bit PCM uses 3 bytes per sample with range -8388608 to 8388607
 * We convert to Int32Array by reading 3 bytes and sign-extending to 32 bits
 *
 * @param data - Raw 24-bit PCM data (3 bytes per sample)
 * @param littleEndian - Byte order (default: true for little-endian)
 * @returns Int32Array with converted samples (left-shifted by 8 bits)
 */
export function pcm24ToInt32(data: Uint8Array, littleEndian: boolean = true): Int32Array {
  const sampleCount = Math.floor(data.length / 3)
  const int32Data = new Int32Array(sampleCount)

  for (let i = 0; i < sampleCount; i++) {
    const offset = i * 3
    let sample: number

    if (littleEndian) {
      // Little-endian: LSB first
      sample = data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16)
    } else {
      // Big-endian: MSB first
      sample = (data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2]
    }

    // Sign extend from 24-bit to 32-bit
    // If the sign bit (bit 23) is set, we need to set all upper bits
    if (sample & 0x800000) {
      sample |= 0xFF000000 // Set upper 8 bits to extend sign
    }

    // Shift left by 8 to align with Int32 range
    // This converts from 24-bit range (-8388608 to 8388607)
    // to 32-bit range (-2147483648 to 2147483392)
    int32Data[i] = sample << 8
  }

  return int32Data
}

/**
 * Convert 24-bit PCM data from ArrayBuffer to Int32Array
 * Convenience wrapper for pcm24ToInt32 that accepts ArrayBuffer
 *
 * @param buffer - ArrayBuffer containing 24-bit PCM data
 * @param offset - Offset in bytes (default: 0)
 * @param length - Length in bytes (default: entire buffer from offset)
 * @param littleEndian - Byte order (default: true)
 * @returns Int32Array with converted samples
 */
export function pcm24BufferToInt32(
  buffer: ArrayBuffer,
  offset: number = 0,
  length?: number,
  littleEndian: boolean = true
): Int32Array {
  const actualLength = length ?? (buffer.byteLength - offset)
  const uint8Data = new Uint8Array(buffer, offset, actualLength)
  return pcm24ToInt32(uint8Data, littleEndian)
}

/**
 * Get the valid sample range for 24-bit PCM
 * Returns the min/max values for 24-bit signed integers
 */
export function getPcm24Range() {
  return {
    min: -8388608,  // -(2^23)
    max: 8388607,   // 2^23 - 1
    bits: 24
  }
}
