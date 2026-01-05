import { useEffect, useRef, useState } from 'react'
import { PcmPlayer } from 'pcm-ringbuf-player'
import { generateToneGeneric, NOTES } from '../utils/toneGenerator'

const SAMPLE_RATE = 48000
const CHANNELS = 2 // Stereo

export function TonePlayer() {
  const playerRef = useRef<PcmPlayer<any> | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isStarted, setIsStarted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pcmType, setPcmType] = useState<'int16' | 'int32' | 'float32'>('int16')
  const feedIntervalRef = useRef<number | null>(null)

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
    if (feedIntervalRef.current) {
      clearInterval(feedIntervalRef.current)
      feedIntervalRef.current = null
    }

    if (playerRef.current) {
      await playerRef.current.stop()
      playerRef.current = null
    }

    setIsPlaying(false)
    setIsStarted(false)
  }

  const handlePlay = async () => {
    try {
      setError(null)

      // Create new player instance with selected PCM type
      // Optional 4th parameter: maxBlocks (default: 1000, ~2.7 seconds of buffer)
      let player: PcmPlayer<any>
      switch (pcmType) {
        case 'int16':
          player = new PcmPlayer<Int16Array>(SAMPLE_RATE, CHANNELS, Int16Array)
          break
        case 'int32':
          player = new PcmPlayer<Int32Array>(SAMPLE_RATE, CHANNELS, Int32Array)
          break
        case 'float32':
          player = new PcmPlayer<Float32Array>(SAMPLE_RATE, CHANNELS, Float32Array)
          break
      }
      playerRef.current = player

      // Initialize audio worklet
      await player.start()
      setIsStarted(true)

      // Generate tone chunks and feed continuously
      const chunkDuration = 0.05 // 50ms chunks for smoother buffering
      const toneData = generateToneGeneric(
        NOTES.A4,
        chunkDuration,
        SAMPLE_RATE,
        CHANNELS,
        pcmType
      )

      // Feed initial chunks to build up buffer (1 second = 20 chunks)
      for (let i = 0; i < 20; i++) {
        player.feed(toneData)
      }
      setIsPlaying(true)

      // Continue feeding chunks at a faster rate to stay ahead
      feedIntervalRef.current = window.setInterval(() => {
        if (playerRef.current) {
          playerRef.current.feed(toneData)
        }
      }, 40) // Feed every 40ms (consuming 50ms chunks = buffer grows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start playback')
      console.error('Playback error:', err)
      await cleanup()
    }
  }

  const handleStop = async () => {
    await cleanup()
  }

  const handleRestart = async () => {
    await cleanup()
    // Small delay before restarting
    setTimeout(() => {
      handlePlay()
    }, 100)
  }

  return (
    <div className="tone-player">
      <h2>PCM Tone Player</h2>

      {error && <div className="error">Error: {error}</div>}

      <div className="pcm-type-selector">
        <label htmlFor="pcm-type-select">
          <strong>PCM Type:</strong>{' '}
        </label>
        <select
          id="pcm-type-select"
          value={pcmType}
          onChange={(e) => setPcmType(e.target.value as 'int16' | 'int32' | 'float32')}
          disabled={isPlaying}
        >
          <option value="int16">Int16 (16-bit integer)</option>
          <option value="int32">Int32 (32-bit integer)</option>
          <option value="float32">Float32 (32-bit float)</option>
        </select>
      </div>

      <div className="controls">
        <button onClick={handlePlay} disabled={isPlaying}>
          Play Tone
        </button>

        <button onClick={handleStop} disabled={!isPlaying}>
          Stop
        </button>

        <button onClick={handleRestart} disabled={!isStarted}>
          Restart
        </button>
      </div>

      <div className="info">
        <p>
          <strong>Status:</strong> {isPlaying ? 'Playing A4 (440 Hz)' : 'Stopped'}
        </p>
        <p>
          <strong>Sample Rate:</strong> {SAMPLE_RATE} Hz
        </p>
        <p>
          <strong>Channels:</strong> {CHANNELS === 2 ? 'Stereo' : 'Mono'}
        </p>
        <p>
          <strong>PCM Format:</strong> {pcmType.toUpperCase()}
        </p>
      </div>

      <div className="explanation">
        <h3>How it works</h3>
        <ul>
          <li>Generates a 440 Hz sine wave (musical note A4) programmatically</li>
          <li>Converts the waveform to PCM audio data in your selected format:
            <ul>
              <li><strong>Int16:</strong> 16-bit signed integer (-32768 to 32767)</li>
              <li><strong>Int32:</strong> 32-bit signed integer (-2147483648 to 2147483647)</li>
              <li><strong>Float32:</strong> 32-bit float (-1.0 to 1.0)</li>
            </ul>
          </li>
          <li>Feeds audio chunks continuously to the ring buffer</li>
          <li>AudioWorklet processes the data in real-time for playback</li>
        </ul>
      </div>
    </div>
  )
}
