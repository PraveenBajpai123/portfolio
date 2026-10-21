import { useEffect, useRef } from 'react'
import { useStore } from '../store'

// Soft violet window light falling across a dark wall, dappled by the shadows of a ficus
// that sways in the breeze. Inspired by React Bits' "Dappled Light", written from scratch
// for this site (plain 2D canvas, no dependencies).
//
//  · a slanted, four-pane window of light with a violet bloom and film grain (light only)
//  · leaf shadows from a procedural ficus reaching in from the top-right; farther branches
//    cast softer shadows; clouds drift over now and then and soften the light
//  · moving the pointer stirs the leaves in that direction, a click sends a gust
//  · focus-in on first appearance; a still frame for reduced-motion users
//
// Drawn at ~36% resolution and upscaled by the browser (which is also what makes the light
// soft), at 24 fps, only while mounted and visible. Blur filters are used sparingly: only for
// distant branches and the intro; the glow comes from a tiny downscaled copy instead.

const OPT = {
  lightColor: [157, 134, 255], // soft violet
  bloomColor: [123, 92, 255],
  windowAngle: 28, // degrees
  windowSize: 0.6, // window height relative to the component height
  intensity: 0.85,
  bloom: 0.6,
  wind: 0.45,
  windSpeed: 1,
  clouds: 0.25,
  grain: 0.22,
  depth: 0.7,
  softness: 1,
  scale: 1.25, // plant size
  res: 0.36,
  fps: 24, // the breeze is slow; 24 fps is plenty
}

function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), a | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A ficus: a few branches reaching in from the top-right corner, leaves alternating along them.
function makePlant(seed = 1) {
  const r = rng(seed)
  const branches = []
  const count = 6
  for (let b = 0; b < count; b++) {
    const depth = r() // 0 = close to the wall (sharp), 1 = far (soft)
    const len = 0.55 + r() * 0.45
    const angle = Math.PI * (0.62 + (b / (count - 1)) * 0.38) + (r() - 0.5) * 0.18 // pointing down-left
    const bend = (r() - 0.5) * 0.7
    const leaves = []
    const n = 9 + Math.floor(r() * 7)
    for (let i = 0; i < n; i++) {
      const t = 0.12 + (i / n) * 0.88
      leaves.push({
        t,
        side: i % 2 ? 1 : -1,
        size: (0.055 + r() * 0.035) * (1.1 - t * 0.35),
        tilt: 0.5 + r() * 0.6,
        phase: r() * Math.PI * 2,
        flutter: 0.6 + r() * 1.4,
      })
    }
    branches.push({
      ox: 1.02 - r() * 0.06,
      oy: -0.04 + r() * 0.1,
      angle,
      len,
      bend,
      depth,
      phase: r() * Math.PI * 2,
      leaves,
    })
  }
  return branches.sort((a, b) => b.depth - a.depth) // far first
}

function leafPath(ctx, x, y, size, rot) {
  // pointed ellipse
  const l = size
  const w = size * 0.42
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(l * 0.45, -w, l, 0)
  ctx.quadraticCurveTo(l * 0.45, w, 0, 0)
  ctx.restore()
}

function grainTile() {
  const s = 96
  const c = document.createElement('canvas')
  c.width = c.height = s
  const x = c.getContext('2d')
  const img = x.createImageData(s, s)
  const r = rng(7)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = r() * 255
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  x.putImageData(img, 0, 0)
  return c
}

export default function DappledLight({ className = '' }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const host = canvas.parentElement
    const ctx = canvas.getContext('2d')
    const light = document.createElement('canvas') // light minus shadows
    const lctx = light.getContext('2d')
    const glow = document.createElement('canvas') // tiny copy, upscaled = soft bloom
    const gctx = glow.getContext('2d')
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const hasFilter = 'filter' in ctx
    const plant = makePlant(1)
    const grain = grainTile()
    const o = { ...OPT, fps: useStore.getState().load < 1 ? 20 : OPT.fps }

    let w = 1
    let h = 1
    let raf = 0
    let last = 0
    const start = performance.now()
    const air = { x: 0, vx: 0, gust: 0, px: null }

    const resize = () => {
      const rect = host.getBoundingClientRect()
      w = Math.max(64, Math.round(rect.width * o.res))
      h = Math.max(64, Math.round(rect.height * o.res))
      canvas.width = light.width = w
      canvas.height = light.height = h
      glow.width = Math.max(8, Math.round(w / 6))
      glow.height = Math.max(8, Math.round(h / 6))
    }

    const drawWindow = (t, clouds) => {
      const H = h * o.windowSize
      const W = H * 0.8
      // keep the window to the right so the name sits on dark wall
      const cx = w * (w > h ? 0.82 : 0.86)
      const cy = h * 0.46
      const skew = Math.tan((o.windowAngle * Math.PI) / 180)
      lctx.save()
      lctx.translate(cx, cy)
      lctx.transform(1, 0.12, -skew * 0.55, 1, 0, 0) // slanted projection on the wall
      const g = lctx.createRadialGradient(0, 0, W * 0.1, 0, 0, Math.max(W, H) * 0.75)
      const [r, gg, b] = o.lightColor
      const k = o.intensity * clouds
      g.addColorStop(0, `rgba(${r + 40},${gg + 50},${b},${k})`)
      g.addColorStop(1, `rgba(${r},${gg},${b},${k * 0.55})`)
      lctx.fillStyle = g
      const bar = W * 0.045
      const pw = (W - bar) / 2
      const ph = (H - bar) / 2
      for (const [px, py] of [
        [-W / 2, -H / 2],
        [-W / 2 + pw + bar, -H / 2],
        [-W / 2, -H / 2 + ph + bar],
        [-W / 2 + pw + bar, -H / 2 + ph + bar],
      ]) {
        lctx.fillRect(px, py, pw, ph)
      }
      lctx.restore()
    }

    const drawShadows = (t, sway) => {
      lctx.globalCompositeOperation = 'destination-out'
      const S = Math.min(w, h) * 1.15 * o.scale
      for (const br of plant) {
        const blur = (0.6 + br.depth * o.depth * 6) * o.softness * (w / 700)
        // only distant branches get a real blur; near ones stay crisp (and cheap)
        if (hasFilter) lctx.filter = br.depth > 0.45 ? `blur(${blur.toFixed(2)}px)` : 'none'
        lctx.fillStyle = `rgba(0,0,0,${0.72 + (1 - br.depth) * 0.26})`
        lctx.strokeStyle = lctx.fillStyle
        const swayB = sway * (0.6 + br.depth * 0.6) + Math.sin(t * 0.7 * o.windSpeed + br.phase) * 0.03 * o.wind
        const ang = br.angle + swayB
        const ox = br.ox * w
        const oy = br.oy * h
        // branch as a gentle curve
        const steps = 10
        let px = ox
        let py = oy
        lctx.lineWidth = Math.max(1, S * 0.006)
        lctx.beginPath()
        lctx.moveTo(px, py)
        const pts = []
        for (let i = 1; i <= steps; i++) {
          const f = i / steps
          const a = ang + br.bend * f + swayB * f * 0.8
          px += Math.cos(a) * ((br.len * S) / steps)
          py += Math.sin(a) * ((br.len * S) / steps)
          pts.push([px, py, a])
          lctx.lineTo(px, py)
        }
        lctx.stroke()
        for (const lf of br.leaves) {
          const idx = Math.min(pts.length - 1, Math.floor(lf.t * pts.length))
          const [lx, ly, a] = pts[idx]
          const flutter = Math.sin(t * lf.flutter * o.windSpeed * 1.6 + lf.phase) * 0.18 * (o.wind + air.gust)
          leafPath(lctx, lx, ly, lf.size * S, a + lf.side * lf.tilt + flutter)
          lctx.fill()
        }
      }
      if (hasFilter) lctx.filter = 'none'
      lctx.globalCompositeOperation = 'source-over'
    }

    const frame = (now) => {
      raf = reduced ? 0 : requestAnimationFrame(frame)
      if (!reduced && now - last < 1000 / o.fps) return
      const dt = Math.min(0.1, (now - last) / 1000 || 0.016)
      last = now
      const t = (now - start) / 1000

      // breeze: base sway + pointer stir + gusts
      air.vx *= Math.exp(-dt * 1.5)
      air.gust *= Math.exp(-dt * 1.2)
      const base = Math.sin(t * 0.55 * o.windSpeed) * 0.06 + Math.sin(t * 1.27 * o.windSpeed + 1.3) * 0.025
      const sway = reduced ? 0 : (base * o.wind + air.vx * 0.12 + Math.sin(t * 3.1) * air.gust * 0.09)

      // clouds: now and then the light dims and softens
      const cloud = reduced ? 1 : 1 - o.clouds * Math.max(0, Math.sin(t * 0.09) * Math.sin(t * 0.23 + 1)) * 1.6
      const intro = reduced ? 1 : Math.min(1, t / 2.6)

      lctx.clearRect(0, 0, w, h)
      drawWindow(t, cloud)
      drawShadows(t, sway)
      // grain only where there is light
      lctx.globalCompositeOperation = 'source-atop'
      lctx.globalAlpha = o.grain * 0.5
      lctx.fillStyle = lctx.createPattern(grain, 'repeat')
      lctx.fillRect(0, 0, w, h)
      lctx.globalAlpha = 1
      lctx.globalCompositeOperation = 'source-over'

      ctx.clearRect(0, 0, w, h)
      // focus-in during the intro only; afterwards the upscale provides the softness
      const focus = (1 - intro) * 10
      if (hasFilter && focus > 0.5) ctx.filter = `blur(${focus.toFixed(2)}px)`
      ctx.globalAlpha = intro
      ctx.drawImage(light, 0, 0)
      if (hasFilter) ctx.filter = 'none'
      // bloom: shrink the light to a tiny canvas and stretch it back (bilinear = soft glow)
      gctx.clearRect(0, 0, glow.width, glow.height)
      gctx.drawImage(light, 0, 0, glow.width, glow.height)
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = o.bloom * 0.55 * intro
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(glow, 0, 0, w, h)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
    }

    const onMove = (e) => {
      if (air.px !== null) air.vx = Math.max(-3, Math.min(3, air.vx + (e.clientX - air.px) * 0.004))
      air.px = e.clientX
    }
    const onDown = (e) => {
      if (e.target.closest('a, button, label, input')) return // controls don't cause gusts
      air.gust = Math.min(2, air.gust + 1.2)
    }
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf)
        raf = 0
      } else if (!raf && !reduced) raf = requestAnimationFrame(frame)
    }

    resize()
    const ro = new ResizeObserver(() => {
      resize()
      if (reduced) frame(performance.now())
    })
    ro.observe(host)
    window.addEventListener('pointermove', onMove, { passive: true })
    host.addEventListener('pointerdown', onDown)
    document.addEventListener('visibilitychange', onVisibility)
    raf = requestAnimationFrame(frame)
    // while the 3D room loads, keep this light: halve the frame rate
    const unsub = useStore.subscribe((s) => {
      o.fps = s.load < 1 ? 20 : OPT.fps
    })

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      unsub()
      window.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerdown', onDown)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <canvas ref={ref} className={`dappled-light ${className}`} aria-hidden="true" />
}
