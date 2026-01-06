import { useEffect, useRef, useState } from 'react'
import { PcmPlayer } from 'pcm-ringbuf-player'
import { parseWavFile, formatFileSize, formatDuration, type WavFileInfo } from '../utils/wavParser'

export function WavPlayer() {
  const playerRef = useRef<PcmPlayer<any> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wavInfo, setWavInfo] = useState<WavFileInfo | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<number>(0)
  const [playbackPosition, setPlaybackPosition] = useState(0)
  const playbackIntervalRef = useRef<number | null>(null)

  // Check SharedArrayBuffer support
  useEffect(() => {
    if (typeof SharedArrayBuffer === 'undefined') {
      setError(
        'SharedArrayBuffer is not supported in your browser. Try Chrome, Edge, or Firefox with HTTPS.'
      )
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  const cleanup = async () => {
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current)
      playbackIntervalRef.current = null
    }

    if (playerRef.current) {
      await playerRef.current.stop()
      playerRef.current = null
    }

    setIsPlaying(false)
    setPlaybackPosition(0)
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setError(null)
      await cleanup()

      setFileName(file.name)
      setFileSize(file.size)

      // Parse WAV file
      const info = await parseWavFile(file)
      setWavInfo(info)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse WAV file')
      console.error('WAV parsing error:', err)
      setWavInfo(null)
      setFileName(null)
      setFileSize(0)
    }
  }

  const handlePlay = async () => {
    if (!wavInfo) return

    try {
      setError(null)

      // Create player with appropriate PCM type
      // Optional 4th parameter: maxBlocks (default: 1000, ~2.7 seconds of buffer)
      // Increase for slower networks/systems, decrease to reduce memory usage
      let player: PcmPlayer<any>
      switch (wavInfo.pcmType) {
        case 'int16':
          player = new PcmPlayer<Int16Array>(
            wavInfo.sampleRate,
            wavInfo.channels,
            Int16Array
            // maxBlocks: 1000 (default)
          )
          break
        case 'int32':
          player = new PcmPlayer<Int32Array>(
            wavInfo.sampleRate,
            wavInfo.channels,
            Int32Array
            // maxBlocks: 1000 (default)
          )
          break
        case 'float32':
          player = new PcmPlayer<Float32Array>(
            wavInfo.sampleRate,
            wavInfo.channels,
            Float32Array
            // maxBlocks: 1000 (default)
          )
          break
      }
      playerRef.current = player

      // Initialize audio worklet
      await player.start()

      // Feed data in chunks to avoid blocking
      const chunkSize = wavInfo.sampleRate * wavInfo.channels * 0.05 // 50ms chunks
      let offset = 0

      const feedChunk = () => {
        if (!playerRef.current || offset >= wavInfo.pcmData.length) {
          // Playback complete
          if (playbackIntervalRef.current) {
            clearInterval(playbackIntervalRef.current)
            playbackIntervalRef.current = null
          }
          setIsPlaying(false)
          setPlaybackPosition(wavInfo.durationSeconds)
          return
        }

        const end = Math.min(offset + chunkSize, wavInfo.pcmData.length)
        const chunk = wavInfo.pcmData.slice(offset, end)
        playerRef.current.feed(chunk as any)
        offset = end

        // Update playback position
        const position = offset / (wavInfo.sampleRate * wavInfo.channels)
        setPlaybackPosition(position)
      }

      // Feed initial chunks to build up buffer (1 second of audio = 20 chunks)
      for (let i = 0; i < 20; i++) {
        feedChunk()
        if (offset >= wavInfo.pcmData.length) break
      }

      setIsPlaying(true)

      // Continue feeding chunks at a faster rate to stay ahead
      playbackIntervalRef.current = window.setInterval(feedChunk, 40)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start playback')
      console.error('Playback error:', err)
      await cleanup()
    }
  }

  const handleStop = async () => {
    await cleanup()
  }

  const handleClearFile = () => {
    cleanup()
    setWavInfo(null)
    setFileName(null)
    setFileSize(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="wav-player">
      <h2>WAV File Player</h2>

      {error && <div className="error">Error: {error}</div>}

      <div className="file-input-section">
        <input
          ref={fileInputRef}
          type="file"
          accept=".wav,audio/wav,audio/wave"
          onChange={handleFileSelect}
          disabled={isPlaying}
        />
        {fileName && (
          <button onClick={handleClearFile} disabled={isPlaying}>
            Clear
          </button>
        )}
      </div>

      {wavInfo && fileName && (
        <div className="file-info">
          <h3>File Information</h3>
          <p>
            <strong>File:</strong> {fileName}
          </p>
          <p>
            <strong>Size:</strong> {formatFileSize(fileSize)}
          </p>
          <p>
            <strong>Duration:</strong> {formatDuration(wavInfo.durationSeconds)}
          </p>
          <p>
            <strong>Sample Rate:</strong> {wavInfo.sampleRate} Hz
          </p>
          <p>
            <strong>Channels:</strong> {wavInfo.channels === 2 ? 'Stereo' : 'Mono'}
          </p>
          <p>
            <strong>Format:</strong> {wavInfo.bitsPerSample}-bit{' '}
            {wavInfo.audioFormat === 3 ? 'Float' : 'PCM'} ({wavInfo.pcmType.toUpperCase()})
          </p>
          {isPlaying && (
            <p>
              <strong>Position:</strong> {formatDuration(playbackPosition)} /{' '}
              {formatDuration(wavInfo.durationSeconds)}
            </p>
          )}
        </div>
      )}

      <div className="controls">
        <button onClick={handlePlay} disabled={!wavInfo || isPlaying}>
          Play WAV
        </button>

        <button onClick={handleStop} disabled={!isPlaying}>
          Stop
        </button>
      </div>

      <div className="explanation">
        <h3>Supported Formats</h3>
        <ul>
          <li><strong>8-bit PCM:</strong> Automatically converted to 16-bit</li>
          <li><strong>16-bit PCM:</strong> Standard CD quality</li>
          <li><strong>24-bit PCM:</strong> Professional audio (converted to 32-bit)</li>
          <li><strong>32-bit PCM:</strong> High-precision integer audio</li>
          <li><strong>32-bit Float:</strong> Professional audio format</li>
        </ul>
      </div>
    </div>
  )
}
