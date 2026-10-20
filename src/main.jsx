import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/600.css'
import '@fontsource/caveat/600.css'
import '@fontsource/manrope/400.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/600.css'
import '@fontsource/manrope/700.css'
import '@fontsource/manrope/800.css'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
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
