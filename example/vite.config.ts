import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { pcmPlayerPlugin } from 'pcm-ringbuf-player/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    pcmPlayerPlugin(), // Automatically copies audio.worklet.js and sets headers
  ],
})
