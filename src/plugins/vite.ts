import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { IncomingMessage, ServerResponse } from 'http'

export interface PcmPlayerVitePluginOptions {
  /**
   * Whether to set the required SharedArrayBuffer headers in dev mode
   * @default true
   */
  setHeaders?: boolean
}

/**
 * Vite plugin for pcm-ringbuf-player
 * - Copies the audio.worklet.js file to the output directory
 * - Sets required CORS headers for SharedArrayBuffer support
 */
export function pcmPlayerPlugin(options: PcmPlayerVitePluginOptions = {}): Plugin[] {
  const { setHeaders = true } = options

  let workletSourcePath: string
  let isBuild = false

  return [
    {
      name: 'pcm-ringbuf-player:copy-worklet',

      configResolved(config: ResolvedConfig) {
        isBuild = config.command === 'build'

        // Find the audio.worklet.js file relative to this plugin file
        // This plugin is at: dist/plugins/vite.js
        // The worklet is at: dist/audio.worklet.js
        try {
          // In ES modules, __dirname is not available, so we use import.meta.url
          const currentFile = fileURLToPath(import.meta.url)
          const pluginDir = dirname(currentFile)
          // Go up from dist/plugins to dist
          const distDir = dirname(pluginDir)
          workletSourcePath = join(distDir, 'audio.worklet.js')
        } catch (e) {
          // Fallback: shouldn't happen in normal usage
          console.error('Failed to resolve audio.worklet.js path:', e)
          workletSourcePath = ''
        }
      },

      buildStart() {
        // Verify the worklet file exists
        if (!existsSync(workletSourcePath)) {
          this.warn(
            `pcm-ringbuf-player: Could not find audio.worklet.js at ${workletSourcePath}. ` +
            'Make sure pcm-ringbuf-player is properly installed.'
          )
        }
      },

      closeBundle() {
        if (!isBuild) return

        // Copy worklet file to output directory
        try {
          const outputPath = join(process.cwd(), 'dist', 'audio.worklet.js')
          const outputDir = dirname(outputPath)

          if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true })
          }

          copyFileSync(workletSourcePath, outputPath)
          console.log('✓ Copied audio.worklet.js to dist/')
        } catch (error) {
          this.error(`Failed to copy audio.worklet.js: ${error}`)
        }
      },

      // For dev mode, serve the worklet file
      configureServer(server: ViteDevServer) {
        server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
          if (req.url === '/audio.worklet.js') {
            try {
              const content = readFileSync(workletSourcePath, 'utf-8')
              res.setHeader('Content-Type', 'application/javascript')
              res.end(content)
              return
            } catch (error) {
              console.error('Failed to serve audio.worklet.js:', error)
            }
          }
          next()
        })
      },
    },

    // Headers plugin (optional, can be disabled)
    ...(setHeaders ? [{
      name: 'pcm-ringbuf-player:headers',
      configureServer(server: ViteDevServer) {
        server.middlewares.use((_req: IncomingMessage, res: ServerResponse, next: () => void) => {
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
          next()
        })
      },
    } as Plugin] : []),
  ]
}

// Default export for convenience
export default pcmPlayerPlugin
