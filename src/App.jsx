import { lazy, Suspense, useEffect } from 'react'
import Overlay from './ui/Overlay'
import HiddenResume from './ui/HiddenResume'
import { initScroll } from './lib/scroll'
import { pointer } from './store'
import { kick } from './lib/perf'

// The 3D scene (three.js, drei, post-processing) is split into its own chunk.
const Stage3D = lazy(() => import('./Stage3D'))

// Always start at the top (the landing page), never mid-tour after a reload.
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'

const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function App() {
  useEffect(() => initScroll(reducedMotion), [])

  useEffect(() => {
    const onMove = (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
      kick(300) // camera parallax follows the pointer
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  return (
    <>
      <div className="stage" aria-hidden="true">
        <Suspense fallback={null}>
          <Stage3D reducedMotion={reducedMotion} />
        </Suspense>
      </div>
      <div className="scroll-track" />
      <Overlay />
      <HiddenResume />
    </>
  )
}
