# pcm-ringbuf-player

A simple library that allows playing PCM Audio in the browser leveraging a ring buffer for efficient transport of data between the main thread and the audio thread.

## Installation

```bash
npm install pcm-ringbuf-player
```

## Quick Start

```typescript
import { PcmPlayer } from 'pcm-ringbuf-player'

// Create a player with 48kHz sample rate and stereo (2 channels)
const player = new PcmPlayer(48000, 2)

// Start the audio worklet
await player.start()

// Feed PCM audio data (Int16Array)
const pcmData = new Int16Array([/* your audio samples */])
player.feed(pcmData)

// Control volume (0.0 to 1.0)
player.volume(0.5)

// Stop playback and cleanup
await player.stop()
```

## Example

See the [example](./example) folder for a complete React + Vite + TypeScript application demonstrating:
- Programmatic PCM tone generation
- Real-time audio playback with play/stop/restart controls
- Proper setup with required SharedArrayBuffer headers

To run the example:
```bash
cd example
npm install
npm run dev
```

## API

### `new PcmPlayer(sampleRate: number, channels: number)`
Creates a new PCM player instance.
- `sampleRate`: Sample rate in Hz (e.g., 48000, 44100)
- `channels`: Number of audio channels (1 for mono, 2 for stereo)

### `async start(): Promise<void>`
Initializes the AudioWorklet and starts the player. Must be called before feeding data.

### `feed(source: Int16Array): void`
Feeds PCM audio data to the player. For stereo, data should be interleaved: `[L, R, L, R, ...]`

### `volume(volume: number, duration?: number): void`
Sets the playback volume.
- `volume`: Volume level (0.0 to 1.0)
- `duration`: Optional ramp duration in seconds

### `async stop(): Promise<void>`
Stops playback and cleans up resources.

### `getRawBuffer(): SharedArrayBuffer`
Returns the underlying SharedArrayBuffer used for the ring buffer.

## To Do

- [x] Tests
- [ ] Support Other TypedArrays
- [ ] Documentation
- [x] Support 16 bit signed integer arrays

## Contributing

Happy for contributions - simply open a PR.

## Compatibility

This library uses `SharedArrayBuffer` under the hood, to enable it in the browser, the server serving the page needs to set the following headers

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

For more information and browser compatibiltiy see this [Mozilla developer doc](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer) 
