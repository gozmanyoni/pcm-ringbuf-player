import type { PcmArrayType } from 'pcm-ringbuf-player'

/**
 * Musical notes frequencies in Hz
 */
export const NOTES = {
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
}

/**
 * Generate a simple sine wave tone as PCM Int16Array data
 *
 * @param frequency - Frequency in Hz (e.g., 440 for A4)
 * @param durationSeconds - Duration of the tone
 * @param sampleRate - Sample rate in Hz
 * @param channels - Number of channels (1 for mono, 2 for stereo)
 * @returns Int16Array of PCM data
 */
export function generateTone(
  frequency: number,
  durationSeconds: number,
  sampleRate: number,
  channels: number
): Int16Array {
  const numSamples = Math.floor(sampleRate * durationSeconds)
  const totalSamples = numSamples * channels
  const pcmData = new Int16Array(totalSamples)

  const amplitude = 0.3 // 30% volume to avoid clipping
  const maxInt16 = 32767

  for (let i = 0; i < numSamples; i++) {
    // Generate sine wave sample
    const t = i / sampleRate
    const sample = Math.sin(2 * Math.PI * frequency * t)
    const pcmSample = Math.floor(sample * amplitude * maxInt16)

    if (channels === 1) {
      pcmData[i] = pcmSample
    } else if (channels === 2) {
      // Interleaved stereo: [L, R, L, R, ...]
      pcmData[i * 2] = pcmSample // Left channel
      pcmData[i * 2 + 1] = pcmSample // Right channel
    }
  }

  return pcmData
}

/**
 * Generate a chord (multiple frequencies played together)
 *
 * @param frequencies - Array of frequencies to play simultaneously
 * @param durationSeconds - Duration of the chord
 * @param sampleRate - Sample rate in Hz
 * @param channels - Number of channels (1 for mono, 2 for stereo)
 * @returns Int16Array of PCM data
 */
export function generateChord(
  frequencies: number[],
  durationSeconds: number,
  sampleRate: number,
  channels: number
): Int16Array {
  const numSamples = Math.floor(sampleRate * durationSeconds)
  const totalSamples = numSamples * channels
  const pcmData = new Int16Array(totalSamples)

  const amplitude = 0.3 / frequencies.length // Distribute amplitude across frequencies
  const maxInt16 = 32767

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    let sample = 0

    // Sum all frequencies
    for (const freq of frequencies) {
      sample += Math.sin(2 * Math.PI * freq * t)
    }

    const pcmSample = Math.floor(sample * amplitude * maxInt16)

    if (channels === 1) {
      pcmData[i] = pcmSample
    } else if (channels === 2) {
      pcmData[i * 2] = pcmSample
      pcmData[i * 2 + 1] = pcmSample
    }
  }

  return pcmData
}

/**
 * Generate a simple sine wave tone with configurable PCM type
 *
 * @param frequency - Frequency in Hz (e.g., 440 for A4)
 * @param durationSeconds - Duration of the tone
 * @param sampleRate - Sample rate in Hz
 * @param channels - Number of channels (1 for mono, 2 for stereo)
 * @param arrayType - PCM array type ('int16', 'int32', or 'float32')
 * @returns TypedArray of PCM data (Int16Array, Int32Array, or Float32Array)
 */
export function generateToneGeneric<T extends PcmArrayType>(
  frequency: number,
  durationSeconds: number,
  sampleRate: number,
  channels: number,
  arrayType: 'int16' | 'int32' | 'float32'
): T {
  const numSamples = Math.floor(sampleRate * durationSeconds)
  const totalSamples = numSamples * channels

  let pcmData: any
  let amplitude: number
  let maxValue: number

  // Select appropriate array type and max value
  switch (arrayType) {
    case 'int16':
      pcmData = new Int16Array(totalSamples)
      amplitude = 0.3
      maxValue = 32767
      break
    case 'int32':
      pcmData = new Int32Array(totalSamples)
      amplitude = 0.3
      maxValue = 2147483647
      break
    case 'float32':
      pcmData = new Float32Array(totalSamples)
      amplitude = 0.3
      maxValue = 1.0
      break
  }

  for (let i = 0; i < numSamples; i++) {
    // Generate sine wave sample
    const t = i / sampleRate
    const sample = Math.sin(2 * Math.PI * frequency * t)

    // Scale to appropriate range
    const pcmSample = arrayType === 'float32'
      ? sample * amplitude
      : Math.floor(sample * amplitude * maxValue)

    if (channels === 1) {
      pcmData[i] = pcmSample
    } else if (channels === 2) {
      // Interleaved stereo: [L, R, L, R, ...]
      pcmData[i * 2] = pcmSample // Left channel
      pcmData[i * 2 + 1] = pcmSample // Right channel
    }
  }

  return pcmData as T
}
