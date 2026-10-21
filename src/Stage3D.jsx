import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import Scene from './scene/Scene'
import { createPageSlots, drawPagesInto, loadImage, PAGE_COUNT } from './lib/pages'
import { useStore, bumpLoad, setLoadPart } from './store'
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
  '600 20px "JetBrains Mono"',
  '600 40px "Caveat"',
]

export default function Stage3D({ reducedMotion }) {
  const [pages, setPages] = useState(null)
  const [photo, setPhoto] = useState(null)
  // quality steps down if the device struggles: 0 full · 1 no post effects · 2 lower room resolution
  const [quality, setQuality] = useState(0)

  // Fonts must be loaded before the pages are drawn onto canvases.
  useEffect(() => {
    let alive = true
    bumpLoad(0.2) // the 3D code has arrived
    // the cover needs the portrait when the room is built (usually cached from the landing page)
    const photoReady = loadImage('/photo.jpg', 2500)
    Promise.all(FONTS.map((f) => document.fonts.load(f)))
      .catch(() => {})
      .then(async () => {
        if (!alive) return
        setPhoto(await photoReady)
        useStore.setState({ stage: 1 })
        bumpLoad(0.28)
        // Build the room right away with blank pages so its shaders compile in the
        // background while the pages are painted.
        const slots = createPageSlots()
        setPages(slots)
        useStore.setState({ ready: true, stage: 2 })
        await new Promise((r) => setTimeout(r, 0))
        await drawPagesInto(slots, (n) => setLoadPart('pages', n / PAGE_COUNT))
        if (alive) useStore.setState({ pagesReady: true })
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
          photo={photo}
          reducedMotion={reducedMotion}
          quality={quality}
          onDecline={() => setQuality((q) => Math.min(2, q + 1))}
        />
      )}
    </Canvas>
  )
}
