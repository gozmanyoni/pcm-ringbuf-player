# PCM RingBuf Player Example

This is a React + Vite + TypeScript example application demonstrating the usage of the [pcm-ringbuf-player](https://github.com/gozmanyoni/pcm-ringbuf-player) library.

## Features

- 🎵 Programmatic audio tone generation (440 Hz sine wave)
- 🔊 Real-time PCM audio playback using AudioWorklet
- 🔄 Play, stop, and restart controls
- 🎨 Modern React with TypeScript and Vite
- ⚡ Hot module replacement for rapid development

## Prerequisites

Before running this example, you need to:

1. Build the parent library:
   ```bash
   cd ..
   npm install
   npm run build
   ```

## Installation

Install dependencies for the example app:

```bash
npm install
```

The `audio.worklet.js` file from the parent library is automatically copied to the build output by the Vite build plugin during development and production builds.

## Development

Start the development server:

```bash
npm run dev
```

Open your browser to the URL shown (typically http://localhost:5173).

**Important:** The dev server is configured with the required HTTP headers for SharedArrayBuffer support:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

## How It Works

1. **Tone Generation** (`src/utils/toneGenerator.ts`):
   - Generates a sine wave at 440 Hz (musical note A4)
   - Converts to 16-bit PCM format (Int16Array)
   - Supports both mono and stereo with interleaved channels

2. **Audio Player** (`src/components/TonePlayer.tsx`):
   - Creates a `PcmPlayer` instance with specified sample rate and channels
   - Feeds audio chunks continuously (100ms intervals)
   - Manages player lifecycle (start, stop, cleanup)

3. **Ring Buffer Transport**:
   - Uses SharedArrayBuffer for efficient thread-safe data transfer
   - Main thread feeds data → Ring buffer → AudioWorklet processes → Speakers

## Browser Support

This example requires a browser that supports:
- SharedArrayBuffer
- AudioWorklet
- ES2020+

Tested on:
- Chrome/Edge 92+
- Firefox 95+
- Safari 16+ (with appropriate headers)

## Project Structure

```
example/
├── public/
│   └── audio.worklet.js        # Copied from parent library
├── src/
│   ├── components/
│   │   └── TonePlayer.tsx      # Main audio player component
│   ├── utils/
│   │   └── toneGenerator.ts    # PCM tone generation utilities
│   ├── App.tsx                 # App container
│   ├── App.css                 # Styles
│   ├── main.tsx                # React entry point
│   └── index.css               # Global styles
├── index.html                  # HTML entry point
├── vite.config.ts              # Vite config with headers
├── tsconfig.json               # TypeScript config
└── package.json                # Dependencies and scripts
```

## Building for Production

Build the example:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Troubleshooting

### "SharedArrayBuffer is not supported"
Make sure you're accessing the dev server via the URL provided by Vite. The required headers are only set by the dev server.

### "Failed to load audio.worklet.js"
Make sure you have built the parent library first with `npm run build` in the parent directory. The Vite plugin will automatically copy the worklet file from `../dist/audio.worklet.js`.

### Audio doesn't play
Check the browser console for errors. Make sure your browser supports AudioWorklet and SharedArrayBuffer.

## Learn More

- [pcm-ringbuf-player Documentation](https://github.com/gozmanyoni/pcm-ringbuf-player)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet)
- [SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer)
