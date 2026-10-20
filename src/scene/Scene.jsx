import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing'
import * as THREE from 'three'
import Room from './Room'
import Decor from './Decor'
import Desk, { DESK_TOP } from './Desk'
import Lamp from './Lamp'
import Book from './Book'
import CameraRig from './CameraRig'
import { updateGust } from '../lib/wind'
import { updateAudio } from '../lib/audio'
import { scroll, useStore, bumpLoad } from '../store'
import { motion, shadows, IDLE_FPS } from '../lib/perf'

const BOOK_POS = new THREE.Vector3(0.0, DESK_TOP, -0.14)

// Compile every shader up front, then report when the first frames are on screen,
// so the intro loader only unlocks once the room is really ready.
function Warmup() {
  const { gl, scene, camera } = useThree()
  const frames = useRef(-1)
  useEffect(() => {
    let alive = true
    bumpLoad(0.66) // scene objects created
    const done = () => {
      if (!alive) return
      if (useStore.getState().stage < 3) useStore.setState({ stage: 3 })
      bumpLoad(0.93)
      frames.current = 0
    }
    const run = gl.compileAsync ? gl.compileAsync(scene, camera) : Promise.resolve(gl.compile(scene, camera))
    run.then(done, done)
    return () => {
      alive = false
    }
  }, [gl, scene, camera])
  useFrame(() => {
    if (frames.current < 0) return
    frames.current++
    if (frames.current === 3 && useStore.getState().stage < 4) {
      useStore.setState({ stage: 4 })
      bumpLoad(1)
    }
  })
  return null
}

// Decides when to draw: every display frame while something moves, IDLE_FPS while idle,
// never while the intro covers the canvas. Also re-renders shadow maps only when asked.
function FrameDriver() {
  const { invalidate, gl } = useThree()
  useEffect(() => {
    gl.shadowMap.autoUpdate = false
    let raf
    let last = 0
    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      const { entered, stage } = useStore.getState()
      if (!entered && stage >= 4) return // intro is covering the canvas
      const active = stage < 4 || now < motion.until
      if (active || now - last >= 1000 / IDLE_FPS - 2) {
        last = now
        invalidate()
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [invalidate, gl])
  useFrame(() => {
    if (shadows.dirty) {
      gl.shadowMap.needsUpdate = true
      shadows.dirty = false
    }
  })
  return null
}

// Steps quality down on slow devices. Only frames rendered while something moves are
// measured, because idle frames are intentionally throttled.
// Phones (narrow screen, high pixel density) get special treatment while reading.
const IS_PHONE =
  typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 600 && window.devicePixelRatio >= 2

// Resolution follows what you're doing: moderate in the room (lots of moving light,
// cheap), the screen's real sharpness while reading the book (mostly still, text needs it).
// Reports reading mode so the scene can pause post effects (grain would sit on the text).
function DprController({ quality, onReading }) {
  const setDpr = useThree((s) => s.setDpr)
  const state = useRef({ reading: null, dpr: 0 })
  useFrame(() => {
    const reading = (scroll.focus || 0) > 0.75
    const device = window.devicePixelRatio || 1
    const roomDpr = quality >= 2 ? 1 : Math.min(device, 1.5)
    const readDpr = Math.min(device, IS_PHONE ? 2.5 : 2)
    const dpr = reading ? readDpr : roomDpr
    const st = state.current
    if (dpr !== st.dpr) {
      st.dpr = dpr
      setDpr(dpr)
    }
    if (reading !== st.reading) {
      st.reading = reading
      onReading(reading)
    }
  })
  return null
}

function QualityGuard({ onDecline }) {
  const acc = useRef({ sum: 0, n: 0, last: 0 })
  useFrame((_, delta) => {
    const now = performance.now()
    if (!onDecline || now > motion.until || delta > 0.25) return
    const a = acc.current
    a.sum += delta
    a.n++
    if (a.n < 90) return
    const avg = a.sum / a.n
    a.sum = 0
    a.n = 0
    if (avg > 1 / 38 && now - a.last > 3000) {
      a.last = now
      onDecline()
    }
  })
  return null
}

// Add ?perf to the URL for a tiny readout: rendered frames/s, draw calls, GPU objects, JS heap.
const SHOW_PERF = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('perf')
function PerfReadout() {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    window.__three = { gl, scene, camera } // handy for poking at the scene from DevTools
  }, [gl, scene, camera])
  const frames = useRef(0)
  const last = useRef({ calls: 0, triangles: 0 })
  useEffect(() => {
    gl.info.autoReset = false // count every pass of a frame (shadows, scene, effects)
    const el = document.createElement('div')
    el.style.cssText =
      'position:fixed;left:8px;bottom:8px;z-index:99;padding:6px 9px;border-radius:8px;background:rgba(0,0,0,.7);color:#9ff4ff;font:11px/1.4 monospace;pointer-events:none;white-space:pre'
    document.body.appendChild(el)
    const id = setInterval(() => {
      const heap = performance.memory ? `${Math.round(performance.memory.usedJSHeapSize / 1048576)} MB` : 'n/a'
      el.textContent =
        `render ${frames.current} fps
` +
        `draw calls ${last.current.calls}  tris ${last.current.triangles}
` +
        `textures ${gl.info.memory.textures}  geometries ${gl.info.memory.geometries}
` +
        `JS heap ${heap}`
      frames.current = 0
    }, 1000)
    return () => {
      clearInterval(id)
      el.remove()
      gl.info.autoReset = true
    }
  }, [gl])
  // runs before anything renders: read last frame's totals, then reset
  useFrame(() => {
    if (gl.info.render.calls) last.current = { calls: gl.info.render.calls, triangles: gl.info.render.triangles }
    gl.info.reset()
    frames.current++
  }, -1)
  return null
}

function WindDriver() {
  const lastAudio = useRef(0)
  useFrame((state) => {
    const t = state.clock.elapsedTime
    const gust = updateGust(t)
    // audio parameters glide on their own; ~8 updates a second is plenty
    if (t - lastAudio.current > 0.12) {
      lastAudio.current = t
      updateAudio(gust, scroll.focus || 0)
    }
  })
  return null
}

function Moonlight() {
  const target = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.set(0.55, DESK_TOP, -0.05)
    return o
  }, [])
  return (
    <>
      <primitive object={target} />
      <directionalLight
        position={[1.9, 3.3, -3.9]}
        target={target}
        color="#a99cff"
        intensity={0.9}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
        shadow-camera-left={-1.6}
        shadow-camera-right={1.6}
        shadow-camera-top={1.6}
        shadow-camera-bottom={-1.6}
        shadow-camera-near={1}
        shadow-camera-far={9}
      />
    </>
  )
}

export default function Scene({ pages, reducedMotion, quality = 0, onDecline }) {
  const [reading, setReading] = useState(false)
  const lowPower = quality >= 1
  // post effects (glow, grain, vignette) pause while reading: crisp text matters more there
  const effectsOn = !lowPower && !reading
  const aim = useMemo(() => new THREE.Vector3(BOOK_POS.x + 0.02, DESK_TOP + 0.01, BOOK_POS.z + 0.02), [])
  return (
    <>
      <color attach="background" args={['#07051a']} />
      <fog attach="fog" args={['#07051a', 3.2, 9]} />
      <ambientLight color="#4a3a88" intensity={0.3} />
      <hemisphereLight args={["#4a46a0", "#0b0a12", 0.75]} />
      <Moonlight />

      <Room calm={reducedMotion ? 0.35 : 1} />
      <Decor />
      <Desk />
      <Lamp aim={aim} />
      <Book pages={pages} reducedMotion={reducedMotion} position={BOOK_POS} />

      <CameraRig bookPos={BOOK_POS} />
      <WindDriver />
      <Warmup />
      <FrameDriver />
      <QualityGuard onDecline={onDecline} />
      {SHOW_PERF && <PerfReadout />}

      <DprController quality={quality} onReading={setReading} />
      {!lowPower && (
        <EffectComposer multisampling={2} enabled={effectsOn}>
          <Bloom mipmapBlur intensity={1.05} luminanceThreshold={1.05} luminanceSmoothing={0.2} radius={0.7} />
          <Vignette offset={0.28} darkness={0.72} />
          <Noise opacity={0.035} />
        </EffectComposer>
      )}
    </>
  )
}
