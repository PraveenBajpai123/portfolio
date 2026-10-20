import * as THREE from 'three'
import { drawIcon } from './icons'

// Procedural textures drawn on canvases (no image downloads).

export function rng(seed = 1) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')]
}

// Once a canvas has been uploaded to the GPU we no longer need its pixels in RAM.
// (Textures that are redrawn later, like the clock, must not use this.)
export function releaseAfterUpload(tex) {
  tex.onUpdate = () => {
    const img = tex.image
    if (!img || !img.getContext) return
    tex.image = { width: img.width, height: img.height }
    img.width = img.height = 0
    tex.onUpdate = null
  }
  return tex
}

// Restore lost GPU textures by reloading (canvas pixels are released after upload).
export function reloadOnContextRestore(canvasEl) {
  canvasEl.addEventListener('webglcontextrestored', () => window.location.reload())
}

// A cached, tileable grain pattern: far cheaper than thousands of fillRect calls.
const grainCache = new Map()
export function grainPattern(ctx, { dark = 0.12, light = 0, size = 128, seed = 1 } = {}) {
  const key = `${dark}|${light}|${size}|${seed}`
  let tile = grainCache.get(key)
  if (!tile) {
    tile = document.createElement('canvas')
    tile.width = tile.height = size
    const t = tile.getContext('2d')
    const img = t.createImageData(size, size)
    const rand = rng(seed)
    for (let i = 0; i < img.data.length; i += 4) {
      const r = rand()
      if (r < 0.5) {
        img.data[i + 3] = Math.floor(rand() * dark * 255)
      } else if (light > 0) {
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255
        img.data[i + 3] = Math.floor(rand() * light * 255)
      }
    }
    t.putImageData(img, 0, 0)
    grainCache.set(key, tile)
  }
  return ctx.createPattern(tile, 'repeat')
}

function grain(ctx, w, h, opts) {
  ctx.fillStyle = grainPattern(ctx, opts)
  ctx.fillRect(0, 0, w, h)
}

function toTexture(c, { srgb = true, repeat, keep = false } = {}) {
  const tex = new THREE.CanvasTexture(c)
  if (!keep) releaseAfterUpload(tex)
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(repeat[0], repeat[1])
  }
  return tex
}

// Worn wooden desk top: planks running along x, with grain and scratches.
export function woodTexture() {
  const W = 1024, H = 512
  const [c, ctx] = canvas(W, H)
  const rand = rng(7)
  const planks = 5
  const ph = H / planks
  for (let p = 0; p < planks; p++) {
    const y0 = p * ph
    const base = 38 + rand() * 14
    ctx.fillStyle = `hsl(${24 + rand() * 6}, ${32 + rand() * 10}%, ${base * 0.55}%)`
    ctx.fillRect(0, y0, W, ph)
    // grain lines
    for (let i = 0; i < 46; i++) {
      const yy = y0 + rand() * ph
      const amp = 2 + rand() * 7
      const freq = 0.002 + rand() * 0.006
      const phase = rand() * 10
      ctx.strokeStyle = `rgba(${rand() < 0.5 ? '20,10,4' : '120,80,45'},${0.08 + rand() * 0.18})`
      ctx.lineWidth = 0.6 + rand() * 2.2
      ctx.beginPath()
      for (let x = 0; x <= W; x += 24) {
        const y = yy + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 3.1 + phase) * amp * 0.3
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    // knots
    for (let k = 0; k < 2; k++) {
      if (rand() < 0.5) continue
      const kx = rand() * W, ky = y0 + ph * (0.25 + rand() * 0.5)
      for (let r = 26; r > 2; r -= 4) {
        ctx.strokeStyle = `rgba(30,15,6,${0.12 + (26 - r) / 120})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.ellipse(kx, ky, r * 2.4, r * 0.7, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
    // seam
    ctx.fillStyle = 'rgba(8,4,2,0.85)'
    ctx.fillRect(0, y0, W, 3)
  }
  // scratches + wear
  for (let i = 0; i < 260; i++) {
    const x = rand() * W, y = rand() * H, len = 10 + rand() * 90
    ctx.strokeStyle = `rgba(200,170,130,${rand() * 0.08})`
    ctx.lineWidth = 0.6
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + len, y + (rand() - 0.5) * 8)
    ctx.stroke()
  }
  grain(ctx, W, H, { dark: 0.14, seed: 7 })
  return toTexture(c)
}

// Dark plaster for the walls.
export function plasterTexture() {
  const S = 512
  const [c, ctx] = canvas(S, S)
  const rand = rng(3)
  ctx.fillStyle = '#5d6478'
  ctx.fillRect(0, 0, S, S)
  for (let i = 0; i < 900; i++) {
    const r = 4 + rand() * 30
    ctx.fillStyle = `rgba(${rand() < 0.5 ? '0,0,0' : '255,255,255'},${rand() * 0.035})`
    ctx.beginPath()
    ctx.arc(rand() * S, rand() * S, r, 0, Math.PI * 2)
    ctx.fill()
  }
  grain(ctx, S, S, { dark: 0.16, seed: 3 })
  return toTexture(c, { repeat: [4, 3] })
}

// Book cover: deep indigo cloth, a neon ribbon along the spine, silver-lavender foil
// title and a row of foil-stamped stack logos — in the site's type.
export function coverTexture(name, subtitle) {
  const W = 1024, H = 1352
  const [c, ctx] = canvas(W, H)
  const g = ctx.createRadialGradient(W * 0.6, H * 0.32, 60, W * 0.55, H * 0.5, W)
  g.addColorStop(0, '#2f2570')
  g.addColorStop(0.6, '#1a1446')
  g.addColorStop(1, '#0e0b28')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  // cloth weave + grain
  ctx.globalAlpha = 0.055
  ctx.fillStyle = '#000'
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1)
  for (let x = 0; x < W; x += 4) ctx.fillRect(x, 0, 1, H)
  ctx.globalAlpha = 1
  grain(ctx, W, H, { dark: 0.1, light: 0.04, seed: 11 })

  // embossed rings, top right
  ctx.save()
  ctx.strokeStyle = 'rgba(200, 185, 255, 0.07)'
  ctx.lineWidth = 2
  for (let r = 60; r < 620; r += 34) {
    ctx.beginPath()
    ctx.arc(W - 90, 250, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()

  // neon ribbon along the spine edge
  const rib = ctx.createLinearGradient(0, 0, 0, H)
  rib.addColorStop(0, '#ff4fd8')
  rib.addColorStop(0.5, '#8a5cff')
  rib.addColorStop(1, '#4ff3ff')
  ctx.fillStyle = rib
  ctx.fillRect(0, 0, 46, H)
  const ribShade = ctx.createLinearGradient(0, 0, 70, 0)
  ribShade.addColorStop(0, 'rgba(0,0,0,0.25)')
  ribShade.addColorStop(0.65, 'rgba(0,0,0,0)')
  ribShade.addColorStop(0.66, 'rgba(0,0,0,0.35)')
  ribShade.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = ribShade
  ctx.fillRect(0, 0, 70, H)

  // worn outer edge
  const edge = ctx.createLinearGradient(W, 0, W - 80, 0)
  edge.addColorStop(0, 'rgba(0,0,0,0.35)')
  edge.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = edge
  ctx.fillRect(0, 0, W, H)

  const foil = ctx.createLinearGradient(120, 300, W - 100, 820)
  foil.addColorStop(0, '#f4f0ff')
  foil.addColorStop(0.45, '#bfb0f5')
  foil.addColorStop(0.72, '#ffd2f3')
  foil.addColorStop(1, '#dcd5ff')
  const sans = '"Manrope", sans-serif'
  const serif = '"Instrument Serif", Georgia, serif'
  const x0 = 136

  ctx.fillStyle = foil
  ctx.font = `800 24px ${sans}`
  ctx.letterSpacing = '10px'
  ctx.fillText('PORTFOLIO · VOL. I', x0, 214)
  ctx.letterSpacing = '0px'
  ctx.fillRect(x0, 248, 64, 4)

  const [first, ...rest] = name.split(' ')
  ctx.font = `400 196px ${serif}`
  ctx.fillText(first, x0 - 8, 520)
  ctx.font = `italic 400 196px ${serif}`
  ctx.fillText(rest.join(' '), x0 - 8, 700)

  ctx.font = `600 36px ${sans}`
  ctx.globalAlpha = 0.85
  ctx.fillText(subtitle, x0, 800)
  ctx.globalAlpha = 1

  // foil-stamped stack logos
  ctx.font = `800 18px ${sans}`
  ctx.letterSpacing = '6px'
  ctx.globalAlpha = 0.6
  ctx.fillStyle = '#d9cffc'
  ctx.fillText('BUILT WITH', x0, H - 330)
  ctx.letterSpacing = '0px'
  ctx.globalAlpha = 0.85
  ;['claude', 'python', 'typescript', 'react', 'nodejs', 'fastapi', 'postgresql'].forEach((key, i) => {
    drawIcon(ctx, key, x0 + i * 78, H - 300, 46, '#d9cffc')
  })
  ctx.globalAlpha = 1

  // monogram seal + prompt
  ctx.strokeStyle = foil
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(W - 190, H - 200, 58, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = foil
  ctx.textAlign = 'center'
  ctx.font = `400 54px ${serif}`
  ctx.fillText('PB', W - 190, H - 183)
  ctx.textAlign = 'left'
  ctx.font = `800 20px ${sans}`
  ctx.letterSpacing = '8px'
  ctx.globalAlpha = 0.7
  ctx.fillText('SCROLL TO OPEN', x0, H - 186)
  ctx.globalAlpha = 1
  ctx.letterSpacing = '0px'
  return toTexture(c)
}

export function leatherTexture() {
  const S = 256
  const [c, ctx] = canvas(S, S)
  ctx.fillStyle = '#1b1540'
  ctx.fillRect(0, 0, S, S)
  grain(ctx, S, S, { dark: 0.14, light: 0.05, seed: 5 })
  return toTexture(c, { repeat: [2, 2] })
}

// Fore-edge of a stack of paper: fine horizontal lines.
export function paperEdgeTexture() {
  const W = 64, H = 256
  const [c, ctx] = canvas(W, H)
  const rand = rng(9)
  ctx.fillStyle = '#e6dcc6'
  ctx.fillRect(0, 0, W, H)
  for (let y = 0; y < H; y += 2) {
    ctx.fillStyle = `rgba(90,70,40,${0.05 + rand() * 0.12})`
    ctx.fillRect(0, y, W, 1)
  }
  return toTexture(c)
}

// Glowing laptop screen with an editor full of code-shaped lines.
export function screenTexture() {
  const W = 512, H = 320
  const [c, ctx] = canvas(W, H)
  const rand = rng(21)
  ctx.fillStyle = '#0c1220'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#121a2c'
  ctx.fillRect(0, 0, 90, H)
  const colors = ['#7aa2f7', '#bb9af7', '#9ece6a', '#e0af68', '#7dcfff', '#c0caf5']
  let y = 18
  while (y < H - 10) {
    let x = 104 + Math.floor(rand() * 4) * 18
    const parts = 1 + Math.floor(rand() * 4)
    for (let p = 0; p < parts; p++) {
      const w = 14 + rand() * 70
      ctx.fillStyle = colors[Math.floor(rand() * colors.length)]
      ctx.globalAlpha = 0.85
      ctx.fillRect(x, y, w, 5)
      x += w + 8
    }
    y += 12 + (rand() < 0.15 ? 12 : 0)
  }
  ctx.globalAlpha = 1
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = 'rgba(192,202,245,0.35)'
    ctx.fillRect(14, 20 + i * 18, 40 + rand() * 30, 5)
  }
  return toTexture(c)
}

// Sheer fabric alpha: soft vertical pleats.
export function curtainAlphaTexture() {
  const W = 512, H = 16
  const [c, ctx] = canvas(W, H)
  const rand = rng(4)
  for (let x = 0; x < W; x++) {
    const v = 150 + 50 * Math.sin(x * 0.09) + 25 * Math.sin(x * 0.31 + 1) + rand() * 20
    ctx.fillStyle = `rgb(${v},${v},${v})`
    ctx.fillRect(x, 0, 1, H)
  }
  return toTexture(c, { srgb: false })
}
