import { useEffect, useRef } from 'react'

// A field of fine glints drifting toward the viewer, flashing as they catch the light.
// Plain 2D canvas, no dependencies. Inspired by React Bits' "Glimmer Wrap", written from
// scratch for this site.
//
//  · glints fly out of a vanishing point; streaks lengthen with speed
//  · some flash into four-point stars; out-of-focus ones blur into soft bokeh
//  · the view leans toward the pointer; holding the pointer boosts speed;
//    a click sends a wave of light through the field
//  · fast intro that settles to a calm drift; a still field for reduced-motion users
//
// Glint count scales with screen area, the canvas pixel ratio is capped, and the loop only
// runs while the component is mounted and the tab is visible.

const DEFAULTS = {
  colors: ['#ffffff', '#cbbdff', '#b19eef', '#ff9fe8', '#9ff7ff'],
  maxCount: 1400,
  pxPerGlint: 900, // one glint per this many CSS pixels of screen
  speed: 0.075, // depth units per second at cruise
  focus: 0.42, // depth that is perfectly sharp
  aperture: 2.2, // how quickly glints blur away from the focus depth
  glitter: 0.16, // share of glints that can flash into stars
  parallax: 0.06, // how far the view leans toward the pointer
  maxDpr: 1.5,
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// Soft round sprite used for every glint (cheaper than drawing gradients per glint).
function makeSprite(rgb) {
  const s = 64
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, `rgba(${rgb},1)`)
  g.addColorStop(0.18, `rgba(${rgb},0.85)`)
  g.addColorStop(0.45, `rgba(${rgb},0.22)`)
  g.addColorStop(1, `rgba(${rgb},0)`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  return c
}

export default function GlintField({ className = '', ...opts }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const o = { ...DEFAULTS, ...opts }
    const canvas = canvasRef.current
    const host = canvas.parentElement
    const ctx = canvas.getContext('2d')
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const palette = o.colors.map((hex) => {
      const rgb = hexToRgb(hex)
      return { rgb: rgb.join(','), sprite: makeSprite(rgb.join(',')) }
    })

    let W = 0
    let H = 0
    let dpr = 1
    let glints = []
    const pointer = { x: 0.5, y: 0.5, sx: 0.5, sy: 0.5, down: false }
    const waves = [] // { t0, x, y }
    let boost = 0
    let raf = 0
    let last = performance.now()
    const start = last

    const spawn = (g, initial) => {
      const a = Math.random() * Math.PI * 2
      const r = Math.sqrt(Math.random()) * 1.3 + 0.04 // keep a small hollow at the centre
      g.x = Math.cos(a) * r
      g.y = Math.sin(a) * r * 0.8
      g.z = initial ? Math.random() * 0.96 + 0.04 : 1
      g.pz = g.z
      g.size = 0.6 + Math.random() * 1.1
      g.c = palette[Math.random() < 0.55 ? 0 : 1 + Math.floor(Math.random() * (palette.length - 1))]
      g.phase = Math.random() * Math.PI * 2
      g.rate = 0.6 + Math.random() * 1.6
      g.star = Math.random() < o.glitter
      return g
    }

    const resize = () => {
      const r = host.getBoundingClientRect()
      W = Math.max(1, r.width)
      H = Math.max(1, r.height)
      dpr = Math.min(window.devicePixelRatio || 1, o.maxDpr)
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      const count = Math.min(o.maxCount, Math.round((W * H) / o.pxPerGlint))
      while (glints.length < count) glints.push(spawn({}, true))
      glints.length = count
    }

    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = (now - start) / 1000

      // intro: rush in fast, then ease down to cruising speed
      const intro = reduced ? 0 : Math.max(0, 1 - t / 1.8)
      boost += ((pointer.down ? 1 : 0) - boost) * Math.min(1, dt * 3)
      const speed = reduced ? 0 : o.speed * (1 + intro * intro * 9 + boost * 4)
      const fade = Math.min(1, t / 0.9)

      pointer.sx += (pointer.x - pointer.sx) * Math.min(1, dt * 2.5)
      pointer.sy += (pointer.y - pointer.sy) * Math.min(1, dt * 2.5)
      const cx = W * (0.5 + (pointer.sx - 0.5) * o.parallax * -1)
      const cy = H * (0.46 + (pointer.sy - 0.5) * o.parallax * -1)
      const f = Math.min(W, H) * 0.55 // focal length

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      ctx.globalCompositeOperation = 'lighter'

      for (let i = waves.length - 1; i >= 0; i--) if (t - waves[i].t0 > 2.2) waves.splice(i, 1)

      for (const g of glints) {
        g.pz = g.z
        g.z -= speed * dt
        if (g.z <= 0.04) {
          spawn(g, false)
          continue
        }
        const x = cx + (g.x / g.z) * f
        const y = cy + (g.y / g.z) * f
        if (x < -40 || x > W + 40 || y < -40 || y > H + 40) {
          spawn(g, false)
          continue
        }
        const px = cx + (g.x / g.pz) * f
        const py = cy + (g.y / g.pz) * f

        // brightness: fade in from far away, out when very close, gentle twinkle
        const depthFade = Math.min(1, (1 - g.z) * 3) * Math.min(1, (g.z - 0.04) * 8)
        let alpha = depthFade * (0.55 + 0.45 * Math.sin(t * g.rate + g.phase)) * fade

        // waves of light from clicks
        for (const w of waves) {
          const r = (t - w.t0) * Math.max(W, H) * 0.65
          const d = Math.hypot(x - w.x, y - w.y)
          alpha += Math.exp(-(((d - r) / 46) ** 2)) * (1 - (t - w.t0) / 2.2) * 1.4
        }
        if (alpha <= 0.01) continue
        alpha = Math.min(1, alpha)

        // depth of field: away from the focus depth, glints grow soft and dim
        const blur = Math.abs(g.z - o.focus) * o.aperture
        const base = (g.size / g.z) * 0.9
        const r = base * (1 + blur * 2.2)
        ctx.globalAlpha = alpha / (1 + blur * 1.6)
        ctx.drawImage(g.c.sprite, x - r * 2, y - r * 2, r * 4, r * 4)

        // motion streak
        const streak = Math.hypot(x - px, y - py)
        if (streak > 1.2) {
          ctx.globalAlpha = alpha * 0.45
          ctx.strokeStyle = `rgb(${g.c.rgb})`
          ctx.lineWidth = Math.max(0.5, base * 0.5)
          ctx.beginPath()
          ctx.moveTo(px, py)
          ctx.lineTo(x, y)
          ctx.stroke()
        }

        // glitter: a brief four-point star flash
        if (g.star && !reduced) {
          const flash = Math.max(0, Math.sin(t * g.rate * 0.7 + g.phase * 3)) ** 24
          if (flash > 0.05) {
            const len = base * 7 * flash + 2
            ctx.globalAlpha = alpha * flash
            ctx.strokeStyle = `rgb(${g.c.rgb})`
            ctx.lineWidth = Math.max(0.6, base * 0.35)
            ctx.beginPath()
            ctx.moveTo(x - len, y)
            ctx.lineTo(x + len, y)
            ctx.moveTo(x, y - len)
            ctx.lineTo(x, y + len)
            ctx.stroke()
          }
        }
      }
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'

      if (!reduced || t < 1) raf = requestAnimationFrame(frame)
    }

    const onMove = (e) => {
      const r = host.getBoundingClientRect()
      pointer.x = (e.clientX - r.left) / r.width
      pointer.y = (e.clientY - r.top) / r.height
    }
    const onDown = (e) => {
      pointer.down = true
      const r = host.getBoundingClientRect()
      waves.push({ t0: (performance.now() - start) / 1000, x: e.clientX - r.left, y: e.clientY - r.top })
      if (waves.length > 4) waves.shift()
    }
    const onUp = () => {
      pointer.down = false
    }
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf)
        raf = 0
      } else if (!raf) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(host)
    host.addEventListener('pointermove', onMove)
    host.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    document.addEventListener('visibilitychange', onVisibility)
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.removeEventListener('visibilitychange', onVisibility)
    }
    // options are read once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <canvas ref={canvasRef} className={`glint-field ${className}`} aria-hidden="true" />
}
