import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Latin-only font files (the site has no Cyrillic/Greek/Vietnamese text), and only the
// weights actually used — keeps the render-blocking CSS small.
import '@fontsource/manrope/latin-400.css'
import '@fontsource/manrope/latin-500.css'
import '@fontsource/manrope/latin-600.css'
import '@fontsource/manrope/latin-700.css'
import '@fontsource/manrope/latin-800.css'
import '@fontsource/instrument-serif/latin-400.css'
import '@fontsource/instrument-serif/latin-400-italic.css'
import '@fontsource/jetbrains-mono/latin-600.css'
import '@fontsource/caveat/latin-600.css'
import 'lenis/dist/lenis.css'
import './styles.css'
import './ui/landing.css'
import App from './App'

const previewId = import.meta.env.DEV && new URLSearchParams(window.location.search).get('page')

async function mount() {
  let Root = App
  let props = {}
  if (previewId) {
    Root = (await import('./dev/PagePreview')).default
    props = { id: previewId }
  }
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <Root {...props} />
    </StrictMode>,
  )
}
mount()
