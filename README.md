# pcm-ringbuf-player

A TypeScript library for playing PCM audio in the browser with support for multiple formats (Int16, Int32, Float32). Uses a ring buffer for efficient, low-latency transport of data between the main thread and the audio thread.

## Features

- ✅ **Multiple PCM formats**: Int16Array, Int32Array, Float32Array
- ✅ **TypeScript generics** for type-safe audio data handling
- ✅ **Configurable buffer size** for different latency/stability requirements
- ✅ **Low-latency playback** using AudioWorklet and SharedArrayBuffer
- ✅ **Volume control** with optional ramping
- ✅ **Type-aware conversion** automatically normalizes to Float32 for Web Audio API

## Installation

```bash
npm install pcm-ringbuf-player
```

## Quick Start

### Basic Usage (Int16)

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

### Using Different PCM Formats

```typescript
import { PcmPlayer } from 'pcm-ringbuf-player'

// Int32 PCM (32-bit signed integer)
const int32Player = new PcmPlayer<Int32Array>(48000, 2, Int32Array)
await int32Player.start()
const int32Data = new Int32Array([/* samples in range -2147483648 to 2147483647 */])
int32Player.feed(int32Data)

// Float32 PCM (normalized -1.0 to 1.0)
const float32Player = new PcmPlayer<Float32Array>(48000, 2, Float32Array)
await float32Player.start()
const float32Data = new Float32Array([/* samples in range -1.0 to 1.0 */])
float32Player.feed(float32Data)
```

### Custom Buffer Size

```typescript
// Default buffer: 1000 blocks (~2.7 seconds at 48kHz stereo)
const defaultPlayer = new PcmPlayer<Int16Array>(48000, 2, Int16Array)

// Larger buffer for unstable networks or background tabs (5 seconds)
const largeBufferPlayer = new PcmPlayer<Int16Array>(48000, 2, Int16Array, 2000)

// Smaller buffer to reduce memory usage (1.3 seconds)
const smallBufferPlayer = new PcmPlayer<Int16Array>(48000, 2, Int16Array, 500)
```

## Example

See the [example](./example) folder for a complete React + Vite + TypeScript application demonstrating:
- **Tone Player**: Programmatic PCM tone generation with selectable formats (Int16/Int32/Float32)
- **WAV File Player**: Upload and play WAV files (supports 8-bit, 16-bit, 32-bit PCM and 32-bit Float)
- Real-time audio playback with play/stop/restart controls
- Proper setup with required SharedArrayBuffer headers

To run the example:
```bash
cd example
npm install
npm run dev
```

The example automatically detects WAV file formats including:
- PCM (8-bit, 16-bit, 32-bit integer)
- IEEE Float (32-bit)
- WAVE_FORMAT_EXTENSIBLE (common in 32-bit files)

## API

### `new PcmPlayer<T>(sampleRate, channels, pcmType?, maxBlocks?)`
Creates a new PCM player instance.

**Parameters:**
- `sampleRate: number` - Sample rate in Hz (e.g., 48000, 44100)
- `channels: number` - Number of audio channels (1 for mono, 2 for stereo)
- `pcmType?: PcmArrayConstructor<T>` - TypedArray constructor (Int16Array, Int32Array, or Float32Array). Default: `Int16Array`
- `maxBlocks?: number` - Buffer size in blocks (128 samples per block). Default: `1000` (~2.7 seconds)

**Returns:** `PcmPlayer<T>` instance

**Examples:**
```typescript
// Default: Int16Array with 1000 blocks
const player1 = new PcmPlayer(48000, 2)

// Explicit Int32Array with default buffer
const player2 = new PcmPlayer<Int32Array>(48000, 2, Int32Array)

// Float32Array with custom buffer size
const player3 = new PcmPlayer<Float32Array>(48000, 2, Float32Array, 2000)
```

### `async start(): Promise<void>`
Initializes the AudioWorklet and starts the player. Must be called before feeding data.

### `feed(source: T): void`
Feeds PCM audio data to the player. The type `T` matches the type specified in the constructor.

**Parameters:**
- `source: T` - PCM audio data (Int16Array, Int32Array, or Float32Array)

**Notes:**
- For stereo, data should be interleaved: `[L, R, L, R, ...]`
- Data is automatically converted to Float32 for Web Audio API:
  - Int16: divided by 32768
  - Int32: divided by 2147483648
  - Float32: passed through (already normalized -1.0 to 1.0)

### `volume(volume: number, duration?: number): void`
Sets the playback volume.

**Parameters:**
- `volume: number` - Volume level (0.0 to 1.0)
- `duration?: number` - Optional ramp duration in seconds. Default: `0`

### `async stop(): Promise<void>`
Stops playback and cleans up resources. Closes the AudioContext and disconnects all nodes.

### `getRawBuffer(): SharedArrayBuffer`
Returns the underlying SharedArrayBuffer used for the ring buffer. Useful for advanced use cases or debugging.

**Returns:** `SharedArrayBuffer`

## Type Exports

The library exports the following types for TypeScript users:

```typescript
import type { PcmArrayType, PcmArrayConstructor } from 'pcm-ringbuf-player'

// PcmArrayType = Int16Array | Int32Array | Float32Array
// PcmArrayConstructor<T> - Conditional type for array constructors
```

## Buffer Size Guidelines

The `maxBlocks` parameter controls the ring buffer size. Each block is 128 samples (RENDER_QUANTUM_FRAMES).

**Formula:** Buffer duration (seconds) ≈ `(maxBlocks * 128) / (sampleRate * channels)`

| maxBlocks | 48kHz Stereo | 48kHz Mono | 44.1kHz Stereo | Use Case |
|-----------|--------------|------------|----------------|----------|
| 250 | ~0.67s | ~1.3s | ~0.72s | Low latency, stable networks |
| 500 | ~1.3s | ~2.7s | ~1.45s | Balanced, memory constrained |
| 1000 (default) | ~2.7s | ~5.3s | ~2.9s | Recommended for most cases |
| 2000 | ~5.3s | ~10.7s | ~5.8s | Unstable networks, background tabs |

**Recommendations:**
- **Increase** for: network streams, background tab performance, slower devices
- **Decrease** for: real-time applications, memory-constrained environments
- Monitor console for "UNDERFLOW" messages to tune appropriately

## Supported PCM Formats

| Format | TypedArray | Range | Bytes/Sample | Common Usage |
|--------|-----------|-------|--------------|--------------|
| 16-bit PCM | Int16Array | -32768 to 32767 | 2 | CD quality, most common |
| 32-bit PCM | Int32Array | -2147483648 to 2147483647 | 4 | High precision integer |
| 32-bit Float | Float32Array | -1.0 to 1.0 | 4 | Professional audio, DAWs |

## Contributing

Contributions are welcome! Please open a PR with:
- Clear description of changes
- Tests for new features
- Updated documentation

## To Do

- [x] Tests
- [x] Support multiple TypedArrays (Int16, Int32, Float32)
- [x] Documentation
- [x] Configurable buffer size
- [ ] Support for 24-bit PCM
- [ ] Real-time resampling

## Performance Tips

1. **Feed in chunks**: Don't feed the entire audio file at once. Feed in small chunks (50-100ms) to avoid blocking the main thread.
   ```typescript
   const chunkSize = sampleRate * channels * 0.05 // 50ms chunks
   for (let i = 0; i < pcmData.length; i += chunkSize) {
     player.feed(pcmData.slice(i, i + chunkSize))
     await new Promise(resolve => setTimeout(resolve, 40)) // Feed faster than playback
   }
   ```

2. **Pre-buffer audio**: Feed several chunks before playback starts to build up a buffer.
   ```typescript
   await player.start()
   // Feed 1 second of audio before considering playback "started"
   for (let i = 0; i < 20; i++) {
     player.feed(chunk)
   }
   ```

3. **Monitor underflows**: Check the browser console for "UNDERFLOW" messages. If you see these frequently, increase `maxBlocks`.

4. **Choose appropriate format**:
   - Use **Int16Array** for most cases (2 bytes/sample, good quality)
   - Use **Int32Array** for high-precision requirements (4 bytes/sample)
   - Use **Float32Array** when audio is already normalized (4 bytes/sample, common in DSP)

## Compatibility

### Browser Support

This library uses `SharedArrayBuffer` and `AudioWorklet`, which require:
- Chrome/Edge 68+
- Firefox 79+
- Safari 14.1+

### Required Headers

To enable `SharedArrayBuffer`, the server must set these HTTP headers:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

**Development Note:** The example app uses Vite which automatically sets these headers in development mode.

For more information see the [SharedArrayBuffer MDN docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer).

## License

MIT 
