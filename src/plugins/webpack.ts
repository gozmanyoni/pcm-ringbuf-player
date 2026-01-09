import type { Compiler } from 'webpack'
import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

export interface PcmPlayerWebpackPluginOptions {
  /**
   * Output directory for the worklet file
   * @default 'dist'
   */
  outputDir?: string

  /**
   * Whether to set the required SharedArrayBuffer headers in dev mode
   * Note: This requires webpack-dev-server
   * @default true
   */
  setHeaders?: boolean
}

/**
 * Webpack plugin for pcm-ringbuf-player
 * - Copies the audio.worklet.js file to the output directory
 * - Optionally configures webpack-dev-server headers for SharedArrayBuffer
 */
export class PcmPlayerWebpackPlugin {
  private options: Required<PcmPlayerWebpackPluginOptions>
  private workletSourcePath: string = ''

  constructor(options: PcmPlayerWebpackPluginOptions = {}) {
    this.options = {
      outputDir: options.outputDir || 'dist',
      setHeaders: options.setHeaders !== false,
    }
  }

  apply(compiler: Compiler) {
    const pluginName = 'PcmPlayerWebpackPlugin'

    // Find the worklet source file
    compiler.hooks.beforeRun.tap(pluginName, () => {
      try {
        // Find the audio.worklet.js file relative to this plugin file
        // This plugin is at: dist/plugins/webpack.js
        // The worklet is at: dist/audio.worklet.js
        const currentFile = fileURLToPath(import.meta.url)
        const pluginDir = dirname(currentFile)
        // Go up from dist/plugins to dist
        const distDir = dirname(pluginDir)
        this.workletSourcePath = join(distDir, 'audio.worklet.js')
      } catch (e) {
        // Fallback: shouldn't happen in normal usage
        console.error(`[${pluginName}] Failed to resolve audio.worklet.js path:`, e)
        this.workletSourcePath = ''
      }

      if (!existsSync(this.workletSourcePath)) {
        console.warn(
          `[${pluginName}] Warning: Could not find audio.worklet.js at ${this.workletSourcePath}`
        )
      }
    })

    // Copy worklet file after emit
    compiler.hooks.afterEmit.tap(pluginName, (compilation: any) => {
      try {
        const outputPath = join(
          compilation.options.output.path || this.options.outputDir,
          'audio.worklet.js'
        )
        const outputDir = dirname(outputPath)

        if (!existsSync(outputDir)) {
          mkdirSync(outputDir, { recursive: true })
        }

        copyFileSync(this.workletSourcePath, outputPath)
        console.log(`[${pluginName}] ✓ Copied audio.worklet.js to ${outputDir}`)
      } catch (error) {
        compilation.errors.push(
          new Error(`[${pluginName}] Failed to copy audio.worklet.js: ${error}`)
        )
      }
    })

    // Set headers for webpack-dev-server
    if (this.options.setHeaders) {
      compiler.hooks.beforeRun.tap(pluginName, () => {
        const devServer = (compiler.options as any).devServer
        if (devServer) {
          // Set up headers configuration
          const existingHeaders = devServer.headers || {}
          devServer.headers = {
            ...existingHeaders,
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',
          }
        }
      })
    }
  }

  /**
   * Get the webpack-dev-server configuration for SharedArrayBuffer support
   * Use this if you prefer to configure headers manually
   */
  static getDevServerConfig() {
    return {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    }
  }
}

// Default export for convenience
export default PcmPlayerWebpackPlugin
