import { useEffect, useRef } from 'react'

// Big block letters built from small monospace characters that keep scrambling
// ("MADE TO MOVE" style). The text is rasterised once into a mask; every grid cell that
// falls inside a letter shows a random character on its own timer. Near the pointer the
// characters scramble faster and glow in the site's neon colours. On load the letters
// assemble from scattered characters. Redraws ~24 times a second, and only while visible.

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&@*+=?'
const FPS = 24
const HOVER_R = 120 // px radius of the pointer's influence

const pick = () => GLYPHS[(Math.random() * GLYPHS.length) | 0]

export default function AsciiName({ lines = ['PRAVEEN', 'BAJPAI'], className = '' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const host = canvas.parentElement
    const ctx = canvas.getContext('2d')
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let cells = []
    let W = 0
    let H = 0
    let cw = 8
    let ch = 12
    let dpr = 1
    let raf = 0
    let lastDraw = 0
    let alive = true
    const start = performance.now()
    const pointer = { x: -9999, y: -9999 }

    const build = () => {
      W = Math.max(1, host.clientWidth)
      // cell size scales with the available width (smaller cells on phones)
      cw = Math.max(4.5, Math.min(8.5, W / 150))
      ch = cw * 1.38

      // size the letters so the widest line fills the width
      const probe = document.createElement('canvas').getContext('2d')
      probe.font = '800 100px Manrope, system-ui, sans-serif'
      const widest = Math.max(...lines.map((l) => probe.measureText(l).width))
      const fs = Math.min((W * 0.96 * 100) / widest, 172)
      const lineH = fs * 0.92
      H = Math.ceil(lineH * lines.length + fs * 0.12)

      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      canvas.style.height = `${H}px`

      // rasterise the text into a mask
      const m = document.createElement('canvas')
      m.width = Math.ceil(W)
      m.height = H
      const mx = m.getContext('2d')
      mx.fillStyle = '#fff'
      mx.textAlign = 'center'
      mx.textBaseline = 'alphabetic'
      mx.font = `800 ${fs}px Manrope, system-ui, sans-serif`
      // a stroke on top of the fill fattens the letters so each stroke holds more characters
      mx.strokeStyle = '#fff'
      mx.lineWidth = fs * 0.035
      mx.lineJoin = 'round'
      lines.forEach((l, i) => {
        mx.fillText(l, W / 2, lineH * (i + 1) - fs * 0.04)
        mx.strokeText(l, W / 2, lineH * (i + 1) - fs * 0.04)
      })
      const data = mx.getImageData(0, 0, m.width, m.height).data

      // one cell per grid position that falls inside a letter
      const now = performance.now()
      cells = []
      for (let y = ch / 2; y < H; y += ch) {
        for (let x = cw / 2; x < W; x += cw) {
          const idx = ((y | 0) * m.width + (x | 0)) * 4 + 3
          if (data[idx] > 120) {
            cells.push({
              x,
              y,
              ch: pick(),
              next: now + Math.random() * 2000,
              show: reduced ? 0 : 150 + Math.random() * 900, // intro: appear at a random moment
              glow: 0,
            })
          }
        }
      }
      draw(now, true)
    }

    const draw = (now, force = false) => {
      if (!force && now - lastDraw < 1000 / FPS) return
      lastDraw = now
      const t = now - start
      const r = canvas.getBoundingClientRect()
      const px = pointer.x - r.left
      const py = pointer.y - r.top

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      ctx.font = `600 ${ch * 0.92}px "JetBrains Mono", ui-monospace, monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      for (const c of cells) {
        if (t < c.show) {
          // still assembling: a faint, fast-changing character
          if (Math.random() < 0.35) {
            ctx.globalAlpha = 0.18
            ctx.fillStyle = '#b9a2ff'
            ctx.fillText(pick(), c.x, c.y)
          }
          continue
        }
        const d = Math.hypot(c.x - px, c.y - py)
        const near = d < HOVER_R ? 1 - d / HOVER_R : 0
        c.glow += (near - c.glow) * 0.35
        if (!reduced && now > c.next) {
          c.ch = pick()
          c.next = now + (near > 0 ? 40 + Math.random() * 120 : 400 + Math.random() * 2600)
        }
        const settle = Math.min(1, (t - c.show) / 300)
        if (c.glow > 0.04) {
          // magenta → cyan across the name, brightest at the pointer
          ctx.fillStyle = c.x / W < 0.5 ? '#ff8ae6' : '#8ff6ff'
          ctx.globalAlpha = Math.min(1, 0.55 + c.glow * 0.6) * settle
        } else {
          ctx.fillStyle = '#ece8fb'
          ctx.globalAlpha = (0.62 + ((c.x * 7 + c.y * 13) % 10) / 28) * settle
        }
        ctx.fillText(c.ch, c.x, c.y)
      }
      ctx.globalAlpha = 1
    }

    const loop = (now) => {
      draw(now)
      raf = requestAnimationFrame(loop)
    }

    const onMove = (e) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
    }
    const onLeave = () => {
      pointer.x = pointer.y = -9999
    }
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf)
        raf = 0
      } else if (!raf && !reduced) raf = requestAnimationFrame(loop)
    }

    const ro = new ResizeObserver(() => alive && build())
    // the letter mask needs the real font
    document.fonts
      .load('800 100px Manrope')
      .catch(() => {})
      .then(() => {
        if (!alive) return
        build()
        ro.observe(host)
        if (!reduced) raf = requestAnimationFrame(loop)
      })
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onVisibility)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines.join('|')])

  return (
    <div className={`ascii-name ${className}`}>
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  )
}
