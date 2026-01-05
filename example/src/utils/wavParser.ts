import type { PcmArrayType } from 'pcm-ringbuf-player'

export interface WavFileInfo {
  sampleRate: number
  channels: number
  bitsPerSample: number
  audioFormat: number
  pcmType: 'int16' | 'int32' | 'float32'
  pcmData: PcmArrayType
  durationSeconds: number
}

/**
 * Parse a WAV file and extract PCM audio data
 * Supports 16-bit PCM, 32-bit PCM, and 32-bit float formats
 */
export async function parseWavFile(file: File): Promise<WavFileInfo> {
  const arrayBuffer = await file.arrayBuffer()
  const dataView = new DataView(arrayBuffer)

  // Verify RIFF header
  const riffId = String.fromCharCode(
    dataView.getUint8(0),
    dataView.getUint8(1),
    dataView.getUint8(2),
    dataView.getUint8(3)
  )
  if (riffId !== 'RIFF') {
    throw new Error('Invalid WAV file: Missing RIFF header')
  }

  // Verify WAVE format
  const waveId = String.fromCharCode(
    dataView.getUint8(8),
    dataView.getUint8(9),
    dataView.getUint8(10),
    dataView.getUint8(11)
  )
  if (waveId !== 'WAVE') {
    throw new Error('Invalid WAV file: Missing WAVE format')
  }

  // Find and parse fmt chunk
  let offset = 12
  let fmtChunkFound = false
  let audioFormat = 0
  let channels = 0
  let sampleRate = 0
  let bitsPerSample = 0

  while (offset < dataView.byteLength - 8) {
    const chunkId = String.fromCharCode(
      dataView.getUint8(offset),
      dataView.getUint8(offset + 1),
      dataView.getUint8(offset + 2),
      dataView.getUint8(offset + 3)
    )
    const chunkSize = dataView.getUint32(offset + 4, true)

    if (chunkId === 'fmt ') {
      audioFormat = dataView.getUint16(offset + 8, true)
      channels = dataView.getUint16(offset + 10, true)
      sampleRate = dataView.getUint32(offset + 12, true)
      bitsPerSample = dataView.getUint16(offset + 22, true)

      // Handle WAVE_FORMAT_EXTENSIBLE (format code 65534 / 0xFFFE)
      // This format is commonly used for 32-bit files and files with >2 channels
      if (audioFormat === 65534) {
        // For WAVE_FORMAT_EXTENSIBLE, the actual format is in the SubFormat GUID
        // The SubFormat GUID starts at byte 24 of the fmt chunk (offset + 32)
        // The first 2 bytes of the GUID contain the actual format code
        const actualFormat = dataView.getUint16(offset + 32, true)
        audioFormat = actualFormat
      }

      fmtChunkFound = true
    } else if (chunkId === 'data' && fmtChunkFound) {
      // Found data chunk, extract PCM data
      const dataOffset = offset + 8
      const dataSize = chunkSize

      // Determine PCM type based on format and bit depth
      let pcmType: 'int16' | 'int32' | 'float32'
      let pcmData: PcmArrayType

      if (audioFormat === 1) {
        // PCM format
        if (bitsPerSample === 16) {
          pcmType = 'int16'
          // Check if offset is aligned to 2-byte boundary
          if (dataOffset % 2 === 0) {
            pcmData = new Int16Array(arrayBuffer, dataOffset, dataSize / 2)
          } else {
            // Copy to aligned buffer
            const uint8Data = new Uint8Array(arrayBuffer, dataOffset, dataSize)
            const alignedBuffer = new ArrayBuffer(dataSize)
            new Uint8Array(alignedBuffer).set(uint8Data)
            pcmData = new Int16Array(alignedBuffer)
          }
        } else if (bitsPerSample === 32) {
          pcmType = 'int32'
          // Check if offset is aligned to 4-byte boundary
          if (dataOffset % 4 === 0) {
            pcmData = new Int32Array(arrayBuffer, dataOffset, dataSize / 4)
          } else {
            // Copy to aligned buffer
            const uint8Data = new Uint8Array(arrayBuffer, dataOffset, dataSize)
            const alignedBuffer = new ArrayBuffer(dataSize)
            new Uint8Array(alignedBuffer).set(uint8Data)
            pcmData = new Int32Array(alignedBuffer)
          }
        } else if (bitsPerSample === 8) {
          // Convert 8-bit unsigned to 16-bit signed
          pcmType = 'int16'
          const uint8Data = new Uint8Array(arrayBuffer, dataOffset, dataSize)
          const int16Data = new Int16Array(dataSize)
          for (let i = 0; i < dataSize; i++) {
            // Convert from unsigned 8-bit [0, 255] to signed 16-bit [-32768, 32767]
            int16Data[i] = (uint8Data[i] - 128) * 256
          }
          pcmData = int16Data
        } else {
          throw new Error(`Unsupported bit depth: ${bitsPerSample}-bit PCM`)
        }
      } else if (audioFormat === 3) {
        // IEEE Float format
        if (bitsPerSample === 32) {
          pcmType = 'float32'
          // Check if offset is aligned to 4-byte boundary
          if (dataOffset % 4 === 0) {
            pcmData = new Float32Array(arrayBuffer, dataOffset, dataSize / 4)
          } else {
            // Copy to aligned buffer
            const uint8Data = new Uint8Array(arrayBuffer, dataOffset, dataSize)
            const alignedBuffer = new ArrayBuffer(dataSize)
            new Uint8Array(alignedBuffer).set(uint8Data)
            pcmData = new Float32Array(alignedBuffer)
          }
        } else {
          throw new Error(`Unsupported float bit depth: ${bitsPerSample}-bit`)
        }
      } else {
        throw new Error(`Unsupported audio format: ${audioFormat}`)
      }

      const numSamples = pcmData.length / channels
      const durationSeconds = numSamples / sampleRate

      return {
        sampleRate,
        channels,
        bitsPerSample,
        audioFormat,
        pcmType,
        pcmData,
        durationSeconds,
      }
    }

    offset += 8 + chunkSize
  }

  throw new Error('Invalid WAV file: No data chunk found')
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
