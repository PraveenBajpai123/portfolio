import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import resumePage from './resume-page.js'

// Adds a preload hint to index.html at build time so the browser fetches Manrope
// ExtraBold right away — the ASCII name needs it before it can draw.
// (Preloading the 3D chunk was tried and dropped: on slow connections it competed with
// the landing page and delayed the first paint more than it saved.)
function preloadCritical() {
  return {
    name: 'preload-critical',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const files = Object.values(ctx.bundle || {})
        const tags = []
        const font = files.find((f) => f.type === 'asset' && /manrope-latin-800-normal.*\.woff2$/.test(f.fileName))
        if (font) {
          tags.push({
            tag: 'link',
            attrs: { rel: 'preload', href: `/${font.fileName}`, as: 'font', type: 'font/woff2', crossorigin: '' },
            injectTo: 'head',
          })
        }
        return tags
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), preloadCritical(), resumePage()],
  server: { port: 5173 },
})
