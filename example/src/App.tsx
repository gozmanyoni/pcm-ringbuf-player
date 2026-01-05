import { TonePlayer } from './components/TonePlayer'
import { WavPlayer } from './components/WavPlayer'
import './App.css'

function App() {
  return (
    <div className="app">
      <header>
        <h1>PCM RingBuf Player Example</h1>
        <p>A demonstration of the pcm-ringbuf-player library with React and Vite</p>
      </header>

      <main>
        <div className="players-container">
          <TonePlayer />
          <WavPlayer />
        </div>
      </main>

      <footer>
        <p>
          This example demonstrates programmatic PCM audio generation and WAV file playback
          using SharedArrayBuffer and AudioWorklet for efficient, low-latency audio streaming.
        </p>
        <p>
          Supports Int16, Int32, and Float32 PCM audio formats.
        </p>
        <p>
          <a
            href="https://github.com/gozmanyoni/pcm-ringbuf-player"
            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub
          </a>
        </p>
      </footer>
    </div>
  )
}

export default App
