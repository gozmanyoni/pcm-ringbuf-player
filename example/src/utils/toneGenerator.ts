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
