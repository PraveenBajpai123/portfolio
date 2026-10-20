import * as THREE from 'three'
import { rng, releaseAfterUpload, grainPattern } from './textures'

// Canvas textures for the room's decor: poster, corkboard, wall screen, art, clock, RGB strip.

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')]
}

function tex(c, srgb = true, keep = false) {
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return keep ? t : releaseAfterUpload(t)
}

const HAND = '"Caveat", cursive'
const MONO = '"JetBrains Mono", monospace'

function skyline(ctx, W, H, baseY, rand, colors) {
  let x = 0
  while (x < W) {
    const bw = 30 + rand() * 70
    const bh = H * (0.12 + rand() * 0.38)
    ctx.fillStyle = '#0b0820'
    ctx.fillRect(x, baseY - bh, bw - 4, bh)
    for (let wy = baseY - bh + 10; wy < baseY - 8; wy += 14) {
      for (let wx = x + 6; wx < x + bw - 12; wx += 11) {
        if (rand() < 0.35) {
          ctx.fillStyle = colors[Math.floor(rand() * colors.length)]
          ctx.globalAlpha = 0.5 + rand() * 0.5
          ctx.fillRect(wx, wy, 5, 7)
        }
      }
    }
    ctx.globalAlpha = 1
    x += bw
  }
}

// "WEB DEVELOPER" neon city poster.
export function posterTexture() {
  const W = 512, H = 768
  const [c, ctx] = canvas(W, H)
  const rand = rng(31)
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#120a2e')
  g.addColorStop(0.55, '#3b0f5c')
  g.addColorStop(1, '#ff3d9a')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  // retro sun
  const sx = W / 2, sy = H * 0.5
  const sun = ctx.createLinearGradient(0, sy - 130, 0, sy + 130)
  sun.addColorStop(0, '#ffd36e')
  sun.addColorStop(1, '#ff2fa0')
  ctx.fillStyle = sun
  ctx.beginPath()
  ctx.arc(sx, sy, 130, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#2a0c4a'
  for (let i = 0; i < 7; i++) ctx.fillRect(sx - 140, sy + 10 + i * 18, 280, 4 + i * 1.4)
  skyline(ctx, W, H, H * 0.86, rand, ['#38e8ff', '#ff5fd2', '#ffd36e'])
  // grid floor
  ctx.strokeStyle = 'rgba(56,232,255,0.7)'
  ctx.lineWidth = 2
  for (let i = 0; i < 8; i++) {
    const y = H * 0.86 + i * i * 2.2
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
  }
  for (let i = -8; i <= 8; i++) {
    ctx.beginPath()
    ctx.moveTo(W / 2 + i * 14, H * 0.86)
    ctx.lineTo(W / 2 + i * 70, H)
    ctx.stroke()
  }
  // neon title
  ctx.textAlign = 'center'
  ctx.font = '600 66px "JetBrains Mono"'
  ctx.shadowColor = '#38e8ff'
  ctx.shadowBlur = 24
  ctx.fillStyle = '#c9fbff'
  ctx.fillText('WEB', W / 2, 120)
  ctx.shadowColor = '#ff3df0'
  ctx.fillStyle = '#ffd1f6'
  ctx.font = '600 54px "JetBrains Mono"'
  ctx.fillText('DEVELOPER', W / 2, 186)
  ctx.shadowBlur = 0
  ctx.font = '500 18px "JetBrains Mono"'
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.letterSpacing = '6px'
  ctx.fillText('BUILD · SHIP · REPEAT', W / 2, 228)
  ctx.letterSpacing = '0px'
  return tex(c)
}

// Corkboard with wireframe sketches and sticky notes.
export function corkboardTexture() {
  const W = 1024, H = 1024
  const [c, ctx] = canvas(W, H)
  const rand = rng(41)
  ctx.fillStyle = '#7a5434'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = grainPattern(ctx, { dark: 0.4, light: 0.18, size: 96, seed: 41 })
  ctx.save()
  ctx.scale(2.5, 2.5) // chunky cork grain
  ctx.fillRect(0, 0, W, H)
  ctx.restore()
  ctx.strokeStyle = '#3d2817'
  ctx.lineWidth = 26
  ctx.strokeRect(13, 13, W - 26, H - 26)

  const pin = (x, y, color) => {
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.beginPath()
    ctx.arc(x + 4, y + 5, 11, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, 11, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.beginPath()
    ctx.arc(x - 3, y - 4, 3.5, 0, Math.PI * 2)
    ctx.fill()
  }

  const wireframe = (x, y, w, h, rot) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fillRect(6, 8, w, h)
    ctx.fillStyle = '#f4f1ea'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#4a5878'
    ctx.lineWidth = 3
    ctx.strokeRect(20, 20, w - 40, 40)
    ctx.strokeRect(20, 76, (w - 50) * 0.55, h * 0.32)
    ctx.beginPath()
    ctx.moveTo(20, 76)
    ctx.lineTo(20 + (w - 50) * 0.55, 76 + h * 0.32)
    ctx.moveTo(20 + (w - 50) * 0.55, 76)
    ctx.lineTo(20, 76 + h * 0.32)
    ctx.stroke()
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#9aa6c0'
      ctx.fillRect(30 + (w - 50) * 0.55, 84 + i * 22, (w - 50) * 0.4, 8)
    }
    for (let i = 0; i < 3; i++) ctx.strokeRect(20 + i * ((w - 40) / 3), 96 + h * 0.32, (w - 60) / 3, h * 0.25)
    ctx.restore()
    pin(x + w / 2, y + 10, '#ff3d7f')
  }

  wireframe(70, 90, 330, 420, -0.04)
  wireframe(560, 470, 360, 440, 0.05)

  const notes = [
    ['ship it!', '#ffe066', 470, 90],
    ['learn\nthree.js', '#ff9ecf', 760, 110],
    ['DSA\ndaily', '#8be9fd', 470, 300],
    ['MCP\nserver', '#b3f58a', 90, 600],
    ['fix bugs\nbefore\ncoffee', '#c9a7ff', 300, 640],
    ['deploy\nfriday?', '#ffb86b', 760, 300],
  ]
  for (const [text, color, x, y] of notes) {
    const rot = (rand() - 0.5) * 0.18
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fillRect(6, 8, 190, 180)
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 190, 180)
    ctx.fillStyle = 'rgba(0,0,0,0.06)'
    ctx.fillRect(0, 0, 190, 26)
    ctx.fillStyle = '#2b2440'
    ctx.font = `600 42px ${HAND}`
    text.split('\n').forEach((l, i) => ctx.fillText(l, 18, 70 + i * 42))
    ctx.restore()
  }
  return tex(c)
}

// Tall wall-mounted screen with code.
export function wallScreenTexture() {
  const W = 256, H = 640
  const [c, ctx] = canvas(W, H)
  const rand = rng(51)
  ctx.fillStyle = '#070b18'
  ctx.fillRect(0, 0, W, H)
  const colors = ['#7aa2f7', '#bb9af7', '#9ece6a', '#e0af68', '#7dcfff', '#f7768e']
  let y = 22
  while (y < H - 10) {
    let x = 14 + Math.floor(rand() * 4) * 12
    const parts = 1 + Math.floor(rand() * 3)
    for (let p = 0; p < parts; p++) {
      const w = 10 + rand() * 50
      ctx.fillStyle = colors[Math.floor(rand() * colors.length)]
      ctx.fillRect(x, y, w, 5)
      x += w + 6
    }
    y += 12 + (rand() < 0.12 ? 10 : 0)
  }
  return tex(c)
}

// Framed art: a dreamy night-city photo.
export function artTexture(seed = 61, hue = 280) {
  const W = 384, H = 512
  const [c, ctx] = canvas(W, H)
  const rand = rng(seed)
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, `hsl(${hue}, 60%, 10%)`)
  g.addColorStop(1, `hsl(${hue + 40}, 70%, 28%)`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rand() * 0.8})`
    ctx.fillRect(rand() * W, rand() * H * 0.5, 2, 2)
  }
  skyline(ctx, W, H, H * 0.95, rand, ['#ffd36e', '#ff5fd2', '#7dcfff'])
  return tex(c)
}

// Digital clock face; call update() to redraw the current time.
export function clockTexture() {
  const W = 256, H = 112
  const [c, ctx] = canvas(W, H)
  const t = tex(c, true, true) // redrawn every minute, so keep the canvas
  const update = () => {
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    ctx.fillStyle = '#05070c'
    ctx.fillRect(0, 0, W, H)
    ctx.font = '700 76px "JetBrains Mono"'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(56,232,255,0.12)'
    ctx.fillText('88:88', W / 2, 84)
    ctx.shadowColor = '#38e8ff'
    ctx.shadowBlur = 14
    ctx.fillStyle = '#9ff4ff'
    ctx.fillText(`${hh}:${mm}`, W / 2, 84)
    ctx.shadowBlur = 0
    t.needsUpdate = true
  }
  update()
  return { texture: t, update }
}

// Horizontal rainbow gradient (scrolled for RGB keyboard/mouse glow).
export function rainbowTexture() {
  const W = 512, H = 4
  const [c, ctx] = canvas(W, H)
  const g = ctx.createLinearGradient(0, 0, W, 0)
  const stops = ['#ff3d7f', '#ffb86b', '#ffe066', '#7cff8a', '#38e8ff', '#7a7cff', '#ff3df0', '#ff3d7f']
  stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  const t = tex(c)
  t.wrapS = THREE.RepeatWrapping
  return t
}
