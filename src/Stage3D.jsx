import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import Scene from './scene/Scene'
import { drawPagesAsync, PAGE_COUNT } from './lib/pages'
import { useStore, bumpLoad } from './store'
import { reloadOnContextRestore } from './lib/textures'

// Everything three.js lives in this lazily loaded chunk, so the intro paints
// immediately while the 3D code downloads.

const FONTS = [
  '500 28px "Manrope"',
  '600 28px "Manrope"',
  '700 28px "Manrope"',
  '800 28px "Manrope"',
  '400 80px "Instrument Serif"',
  'italic 400 80px "Instrument Serif"',
  '500 20px "JetBrains Mono"',
  '600 20px "JetBrains Mono"',
  '600 40px "Caveat"',
]

export default function Stage3D({ reducedMotion }) {
  const [pages, setPages] = useState(null)
  // quality steps down if the device struggles: 0 full · 1 no post effects · 2 lower room resolution
  const [quality, setQuality] = useState(0)

  // Fonts must be loaded before the pages are drawn onto canvases.
  useEffect(() => {
    let alive = true
    bumpLoad(0.2) // the 3D code has arrived
    Promise.all(FONTS.map((f) => document.fonts.load(f)))
      .catch(() => {})
      .then(async () => {
        if (!alive) return
        useStore.setState({ stage: 1 })
        bumpLoad(0.28)
        // one page per task, so the loader keeps moving between pages
        const drawn = await drawPagesAsync((n) => bumpLoad(0.28 + (0.32 * n) / PAGE_COUNT))
        if (!alive) return
        setPages(drawn)
        useStore.setState({ ready: true, stage: 2 })
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <Canvas
      frameloop="demand"
      shadows="percentage"
      dpr={[1, 1.5]} /* adjusted live by DprController (room vs reading) */
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      camera={{ fov: 40, near: 0.03, far: 30, position: [0.62, 1.6, 1.55] }}
      onCreated={({ gl }) => reloadOnContextRestore(gl.domElement)}
    >
      {pages && (
        <Scene
          pages={pages}
          reducedMotion={reducedMotion}
          quality={quality}
          onDecline={() => setQuality((q) => Math.min(2, q + 1))}
        />
      )}
    </Canvas>
  )
}
