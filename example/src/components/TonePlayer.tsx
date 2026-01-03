import { useEffect, useRef, useState } from 'react'
import { PcmPlayer } from 'pcm-ringbuf-player'
import { generateTone, NOTES } from '../utils/toneGenerator'

const SAMPLE_RATE = 48000
const CHANNELS = 2 // Stereo

export function TonePlayer() {
  const playerRef = useRef<PcmPlayer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isStarted, setIsStarted] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

      // Create new player instance
      const player = new PcmPlayer(SAMPLE_RATE, CHANNELS)
      playerRef.current = player

      // Initialize audio worklet
      await player.start()
      setIsStarted(true)

      // Generate tone chunks and feed continuously
      const chunkDuration = 0.1 // 100ms chunks
      const toneData = generateTone(
        NOTES.A4,
        chunkDuration,
        SAMPLE_RATE,
        CHANNELS
      )

      // Start feeding chunks
      player.feed(toneData) // Initial chunk
      setIsPlaying(true)

      feedIntervalRef.current = window.setInterval(() => {
        if (playerRef.current) {
          playerRef.current.feed(toneData)
        }
      }, chunkDuration * 1000) // Feed every 100ms
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
      </div>

      <div className="explanation">
        <h3>How it works</h3>
        <ul>
          <li>Generates a 440 Hz sine wave (musical note A4) programmatically</li>
          <li>Converts the waveform to 16-bit PCM audio data (Int16Array)</li>
          <li>Feeds audio chunks continuously to the ring buffer</li>
          <li>AudioWorklet processes the data in real-time for playback</li>
        </ul>
      </div>
    </div>
  )
}
