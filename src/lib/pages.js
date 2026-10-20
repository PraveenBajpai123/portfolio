import * as THREE from 'three'
import { releaseAfterUpload, grainPattern } from './textures'
import { drawIcon, ICONS } from './icons'
import { profile, skills, experience, projects, education, achievements, RESUME_PDF } from '../content'

// Every book page is drawn on a canvas and used as a texture. While drawing we record
// link rectangles so clicks on the 3D page (via UV coordinates) can open them.
//
// Design system — shared with the landing page:
//   type   Instrument Serif (display) · Manrope (everything else)
//   colour near-black ink on cool white paper, one violet accent, magenta only as a highlight
//   grid   816px measure, 8px rhythm, generous section spacing

export const PAGE_PX = { w: 1024, h: 1352 }
const { w: W, h: H } = PAGE_PX

const C = {
  paper: '#f7f5f0',
  ink: '#16131f',
  body: '#2c2939',
  sub: '#5b5770',
  faint: '#8d899e',
  accent: '#5a3fe0',
  accentSoft: 'rgba(90, 63, 224, 0.08)',
  magenta: '#c42e93',
  tile: '#eeebe4',
  line: 'rgba(22, 19, 31, 0.12)',
}
const SANS = '"Manrope", system-ui, sans-serif'
const SERIF = '"Instrument Serif", Georgia, serif'

// Phones show one page across the whole screen, so they get sharper page textures.
// Layout is always done in the logical 1024 × 1352 space; the canvas is just scaled.
const IS_PHONE =
  typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 600 && window.devicePixelRatio >= 2
const RES = IS_PHONE ? 1.25 : 1

function makeCanvas() {
  const c = document.createElement('canvas')
  c.width = Math.round(W * RES)
  c.height = Math.round(H * RES)
  const ctx = c.getContext('2d')
  ctx.scale(RES, RES)
  return [c, ctx]
}

// 'left' pages have the spine on their right edge, 'right' pages on their left.
function frame(side) {
  const x0 = side === 'left' ? 92 : 116
  const x1 = side === 'left' ? W - 116 : W - 92
  return { x0, x1, w: x1 - x0 }
}

// ---------- primitives ----------

function font(weight, size, family = SANS, style = '') {
  return `${style} ${weight} ${size}px ${family}`.trim()
}

function text(ctx, str, x, y, { f, color = C.ink, align = 'left', spacing = 0 } = {}) {
  ctx.font = f
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.letterSpacing = `${spacing}px`
  ctx.fillText(str, x, y)
  ctx.letterSpacing = '0px'
  ctx.textAlign = 'left'
}

function width(ctx, str, f, spacing = 0) {
  ctx.font = f
  ctx.letterSpacing = `${spacing}px`
  const w = ctx.measureText(str).width
  ctx.letterSpacing = '0px'
  return w
}

function wrap(ctx, str, maxW) {
  const lines = []
  let line = ''
  for (const word of str.split(' ')) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line)
      line = word
    } else line = test
  }
  if (line) lines.push(line)
  return lines
}

function para(ctx, str, x, y, maxW, { size = 29, lineH = 44, color = C.body, weight = 500 } = {}) {
  ctx.font = font(weight, size)
  ctx.fillStyle = color
  for (const l of wrap(ctx, str, maxW)) {
    ctx.fillText(l, x, y)
    y += lineH
  }
  return y
}

function box(ctx, x, y, w, h, r, fill) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fillStyle = fill
  ctx.fill()
}

function rule(ctx, x0, x1, y, color = C.line) {
  ctx.fillStyle = color
  ctx.fillRect(x0, y, x1 - x0, 2)
}

// Section eyebrow: a short accent bar, a number and a label.
function eyebrow(ctx, num, label, x, y) {
  ctx.fillStyle = C.accent
  ctx.fillRect(x, y - 13, 22, 4)
  const f = font(800, 19)
  text(ctx, num, x + 34, y, { f, color: C.accent, spacing: 2 })
  text(ctx, label.toUpperCase(), x + 34 + width(ctx, num, f, 2) + 16, y, { f, color: C.accent, spacing: 4 })
}

// Small uppercase label used above groups.
function caption(ctx, str, x, y, color = C.faint) {
  text(ctx, str.toUpperCase(), x, y, { f: font(800, 16), color, spacing: 3.5 })
}

function chip(ctx, str, x, y, { fill = C.tile, color = C.body, size = 21, h = 44 } = {}) {
  const f = font(700, size)
  const w = width(ctx, str, f) + 32
  box(ctx, x, y, w, h, h / 2, fill)
  text(ctx, str, x + 16, y + h / 2 + size * 0.36, { f, color })
  return w
}

// Draw a single line, shrinking the font until it fits maxW.
function fitText(ctx, str, x, y, maxW, { weight = 700, size = 18, min = 13, color = C.ink, align = 'left' } = {}) {
  let s = size
  while (s > min && width(ctx, str, font(weight, s)) > maxW) s -= 1
  text(ctx, str, x, y, { f: font(weight, s), color, align })
}

function monogram(ctx, letter, x, y, size) {
  text(ctx, letter, x + size / 2, y + size * 0.8, { f: font(400, size, SERIF), color: C.accent, align: 'center' })
}

// Rounded tile with a brand mark and its name underneath.
function logoTile(ctx, key, name, x, y, w, h) {
  box(ctx, x, y, w, h, 18, C.tile)
  const s = 42
  if (!drawIcon(ctx, key, x + (w - s) / 2, y + 16, s)) monogram(ctx, name[0], x + (w - s) / 2, y + 16, s)
  fitText(ctx, name, x + w / 2, y + h - 17, w - 14, { size: 17, min: 12, align: 'center' })
}

// A row of brand marks with their names: "built with".
function stackRow(ctx, keys, x, y, maxW) {
  const cell = 100
  const fit = Math.max(1, Math.floor((maxW + 28) / cell))
  keys.slice(0, fit).forEach((key, i) => {
    const cx = x + i * cell
    box(ctx, cx, y, 72, 72, 16, C.tile)
    drawIcon(ctx, key, cx + 18, y + 18, 36)
    fitText(ctx, ICONS[key]?.title || key, cx + 36, y + 102, cell - 8, { weight: 600, size: 16, min: 11, color: C.sub, align: 'center' })
  })
  return y + 108
}

function statTile(ctx, big, label, x, y, w, h, { dark = false } = {}) {
  box(ctx, x, y, w, h, 22, dark ? C.ink : C.tile)
  let size = 76
  while (size > 44 && width(ctx, big, font(400, size, SERIF)) > w - 48) size -= 2
  text(ctx, big, x + 24, y + 22 + size * 0.8, { f: font(400, size, SERIF), color: dark ? '#ffffff' : C.accent })
  ctx.font = font(600, 20)
  const lines = wrap(ctx, label, w - 48).slice(0, 2)
  lines.forEach((l, i) =>
    text(ctx, l, x + 24, y + h - 24 - (lines.length - 1 - i) * 27, {
      f: font(600, 20),
      color: dark ? 'rgba(255,255,255,0.72)' : C.sub,
    }),
  )
}

function bullets(ctx, items, x, y, maxW, { size = 28, lineH = 42, gap = 22 } = {}) {
  for (const item of items) {
    ctx.fillStyle = C.accent
    ctx.fillRect(x, y - size * 0.66, 4, size * 0.78)
    y = para(ctx, item, x + 26, y, maxW - 26, { size, lineH }) + gap
  }
  return y - gap
}

// A tappable link row: icon tile, label, handle and an arrow.
function linkRow(ctx, links, l, x, y, w) {
  const h = 76
  box(ctx, x, y + 10, 56, 56, 14, C.tile)
  drawIcon(ctx, l.icon, x + 14, y + 24, 28)
  text(ctx, l.label, x + 76, y + 36, { f: font(800, 24), color: C.ink })
  fitText(ctx, l.value, x + 76, y + 65, w - 76 - 52, { weight: 500, size: 21, min: 15, color: C.sub })
  text(ctx, '↗', x + w - 6, y + 50, { f: font(700, 28), color: C.accent, align: 'right' })
  rule(ctx, x + 76, x + w, y + h + 6)
  links.push({ x, y, w, h: h + 6, href: l.href, label: `${l.label}: ${l.value}` })
  return y + h + 14
}

function button(ctx, links, label, href, x, y, w, { download = false } = {}) {
  const h = 76
  box(ctx, x, y, w, h, h / 2, C.accent)
  text(ctx, label, x + w / 2, y + h / 2 + 9, { f: font(800, 25), color: '#ffffff', align: 'center' })
  links.push({ x, y, w, h, href, label, download })
  return y + h
}

// ---------- paper & page furniture ----------

const paperCache = {}
function paper(ctx, side) {
  if (!paperCache[side]) {
    const [c, p] = makeCanvas()
    p.fillStyle = C.paper
    p.fillRect(0, 0, W, H)
    p.fillStyle = grainPattern(p, { dark: 0.035, size: 128, seed: side === 'left' ? 101 : 102 })
    p.fillRect(0, 0, W, H)
    // soft shading toward the spine and a hint of wear on the outer edge
    const gx = side === 'left' ? W : 0
    const g = p.createLinearGradient(gx, 0, side === 'left' ? W - 130 : 130, 0)
    g.addColorStop(0, 'rgba(40, 30, 60, 0.16)')
    g.addColorStop(0.4, 'rgba(40, 30, 60, 0.04)')
    g.addColorStop(1, 'rgba(40, 30, 60, 0)')
    p.fillStyle = g
    p.fillRect(0, 0, W, H)
    const ox = side === 'left' ? 0 : W
    const e = p.createLinearGradient(ox, 0, side === 'left' ? 26 : W - 26, 0)
    e.addColorStop(0, 'rgba(60, 50, 80, 0.08)')
    e.addColorStop(1, 'rgba(60, 50, 80, 0)')
    p.fillStyle = e
    p.fillRect(0, 0, W, H)
    paperCache[side] = c
  }
  ctx.drawImage(paperCache[side], 0, 0, W, H)
}

function furniture(ctx, side, runningHead, num) {
  const f = frame(side)
  const outer = side === 'left' ? f.x0 : f.x1
  const inner = side === 'left' ? f.x1 : f.x0
  const align = side === 'left' ? 'left' : 'right'
  const innerAlign = side === 'left' ? 'right' : 'left'
  text(ctx, runningHead.toUpperCase(), outer, 82, { f: font(800, 16), color: C.faint, spacing: 4, align })
  rule(ctx, f.x0, f.x1, 104)
  text(ctx, String(num).padStart(2, '0'), outer, H - 62, { f: font(800, 18), color: C.ink, align })
  text(ctx, 'praveenbajpai.in', inner, H - 62, { f: font(600, 16), color: C.faint, align: innerAlign })
}

// ---------- pages ----------

function aboutPage(ctx, links, photo) {
  const side = 'left'
  const f = frame(side)
  paper(ctx, side)
  furniture(ctx, side, profile.name, 1)
  eyebrow(ctx, '01', 'About', f.x0, 176)

  // portrait (photo if available, otherwise initials)
  const r = 84
  const cx = f.x1 - r
  const cy = 200 + r
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()
  if (photo) {
    // zoom in on the face: a centred square from the upper part of the photo
    const side = Math.min(photo.width, photo.height) * 0.6
    const sx = (photo.width - side) / 2
    const sy = Math.max(0, photo.height * 0.1)
    ctx.drawImage(photo, sx, sy, side, side, cx - r, cy - r, r * 2, r * 2)
  } else {
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
    g.addColorStop(0, C.accent)
    g.addColorStop(1, C.magenta)
    ctx.fillStyle = g
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
    text(ctx, 'PB', cx, cy + 26, { f: font(400, 76, SERIF), color: '#ffffff', align: 'center' })
  }
  ctx.restore()

  text(ctx, "Hello, I'm", f.x0, 292, { f: font(400, 100, SERIF), color: C.ink })
  text(ctx, 'Praveen.', f.x0, 386, { f: font(400, 100, SERIF, 'italic'), color: C.accent })

  let y = para(ctx, profile.intro, f.x0, 466, f.w, { size: 28, lineH: 43 })

  // quick facts, 2 × 2
  y += 20
  const gap = 16
  const tw = (f.w - gap) / 2
  const th = 124
  profile.pageFacts.forEach(([k, v], i) => {
    const tx = f.x0 + (i % 2) * (tw + gap)
    const ty = y + Math.floor(i / 2) * (th + gap)
    box(ctx, tx, ty, tw, th, 20, C.tile)
    caption(ctx, k, tx + 24, ty + 40)
    ctx.font = font(700, 24)
    wrap(ctx, v, tw - 48)
      .slice(0, 2)
      .forEach((l, j) => text(ctx, l, tx + 24, ty + 78 + j * 31, { f: font(700, 24), color: C.ink }))
  })
  y += th * 2 + gap + 56

  // find me: icon buttons
  caption(ctx, 'Find me', f.x0, y)
  y += 22
  const cell = f.w / profile.links.length
  profile.links.forEach((l, i) => {
    const bx = f.x0 + i * cell + (cell - 84) / 2
    box(ctx, bx, y, 84, 84, 22, C.tile)
    drawIcon(ctx, l.icon, bx + 24, y + 24, 36)
    fitText(ctx, l.label, bx + 42, y + 116, cell - 8, { size: 18, min: 13, color: C.sub, align: 'center' })
    links.push({ x: bx - 8, y: y - 8, w: 100, h: 136, href: l.href, label: `${l.label}: ${l.value}` })
  })
}

function stackPage(ctx) {
  const side = 'right'
  const f = frame(side)
  paper(ctx, side)
  furniture(ctx, side, 'Toolkit', 2)
  eyebrow(ctx, '02', 'Toolkit', f.x0, 176)
  text(ctx, 'Tools I build with', f.x0, 268, { f: font(400, 84, SERIF), color: C.ink })
  para(ctx, 'The languages, frameworks and services behind the work in this book.', f.x0, 322, f.w, {
    size: 25,
    lineH: 36,
    color: C.sub,
  })

  const cols = 6
  const gap = 12
  const tw = (f.w - gap * (cols - 1)) / cols
  const th = 104
  let y = 396
  for (const group of skills) {
    const withIcons = group.items.filter((i) => i.icon)
    caption(ctx, group.group, f.x0, y)
    y += 18
    if (withIcons.length) {
      withIcons.forEach((item, i) => {
        const tx = f.x0 + (i % cols) * (tw + gap)
        const ty = y + Math.floor(i / cols) * (th + gap)
        logoTile(ctx, item.icon, item.name, tx, ty, tw, th)
      })
      y += Math.ceil(withIcons.length / cols) * (th + gap) - gap + 42
    } else {
      // concepts render as text chips
      let x = f.x0
      for (const item of group.items) {
        const cw = width(ctx, item.name, font(700, 20)) + 32
        if (x + cw > f.x1) {
          x = f.x0
          y += 52
        }
        chip(ctx, item.name, x, y, { size: 20, h: 42 })
        x += cw + 10
      }
      y += 42 + 42
    }
  }
}

function experiencePage(ctx, job, side, num) {
  const f = frame(side)
  paper(ctx, side)
  furniture(ctx, side, side === 'left' ? profile.name : 'Experience', num)
  eyebrow(ctx, '03', 'Experience', f.x0, 176)

  // logo (wordmarks get a wider tile) + dates
  const wide = Boolean(job.logo)
  const lw = wide ? 168 : 96
  box(ctx, f.x0, 210, lw, 96, 22, C.tile)
  if (wide) drawIcon(ctx, job.logo, f.x0 + 18, 210 + 48 - 66, 132)
  else monogram(ctx, job.company[0], f.x0 + 20, 222, 56)
  let chipX = f.x0 + lw + 20
  chipX += chip(ctx, job.when, chipX, 236, { fill: C.accentSoft, color: C.accent }) + 10
  chip(ctx, job.where, chipX, 236)

  ctx.font = font(400, 68, SERIF)
  let y = 390
  for (const l of wrap(ctx, job.company, f.w).slice(0, 2)) {
    text(ctx, l, f.x0, y, { f: font(400, 68, SERIF), color: C.ink })
    y += 68
  }
  y = para(ctx, job.role, f.x0, y + 2, f.w, { size: 25, lineH: 34, color: C.sub, weight: 700 }) + 16

  const gap = 16
  const sw = (f.w - gap) / 2
  job.stats.forEach(([big, small], i) => statTile(ctx, big, small, f.x0 + i * (sw + gap), y, sw, 148, { dark: i === 0 }))
  y += 148 + 58

  y = bullets(ctx, job.page, f.x0, y, f.w) + 52
  caption(ctx, 'Stack', f.x0, y)
  stackRow(ctx, job.stackIcons, f.x0, y + 20, f.w)
}

function projectPage(ctx, links, p, side, num) {
  const f = frame(side)
  paper(ctx, side)
  furniture(ctx, side, side === 'left' ? profile.name : 'Projects', num)
  eyebrow(ctx, '04', 'Projects', f.x0, 176)

  ctx.font = font(400, 88, SERIF)
  let y = 284
  for (const l of wrap(ctx, p.name, f.w).slice(0, 2)) {
    text(ctx, l, f.x0, y, { f: font(400, 88, SERIF), color: C.ink })
    y += 84
  }
  y = para(ctx, p.kind, f.x0, y - 4, f.w, { size: 27, lineH: 36, color: C.sub, weight: 600 }) + 22

  const gap = 16
  const sw = (f.w - gap) / 2
  statTile(ctx, p.stat[0], p.stat[1], f.x0, y, sw, 148, { dark: true })
  const lx = f.x0 + sw + gap
  if (p.link) {
    box(ctx, lx, y, sw, 148, 22, C.accent)
    caption(ctx, 'Live site', lx + 24, y + 44, 'rgba(255,255,255,0.72)')
    fitText(ctx, p.link.label, lx + 24, y + 104, sw - 84, { weight: 800, size: 30, min: 20, color: '#ffffff' })
    text(ctx, '↗', lx + sw - 26, y + 104, { f: font(700, 34), color: '#ffffff', align: 'right' })
    links.push({ x: lx, y, w: sw, h: 148, href: p.link.href, label: `Visit ${p.link.label}` })
  } else {
    box(ctx, lx, y, sw, 148, 22, C.tile)
    caption(ctx, 'Runs on', lx + 24, y + 44)
    para(ctx, 'Browser + serverless jobs', lx + 24, y + 92, sw - 48, { size: 24, lineH: 31, color: C.ink, weight: 700 })
  }
  y += 148 + 58

  y = bullets(ctx, p.page, f.x0, y, f.w) + 52
  caption(ctx, 'Built with', f.x0, y)
  stackRow(ctx, p.stackIcons, f.x0, y + 20, f.w)
}

function educationPage(ctx) {
  const side = 'left'
  const f = frame(side)
  paper(ctx, side)
  furniture(ctx, side, profile.name, 7)
  eyebrow(ctx, '05', 'Education', f.x0, 176)
  const titleF = font(400, 88, SERIF)
  text(ctx, 'Learning', f.x0, 272, { f: titleF, color: C.ink })
  text(ctx, '& wins.', f.x0 + width(ctx, 'Learning ', titleF), 272, {
    f: font(400, 88, SERIF, 'italic'),
    color: C.accent,
  })

  // timeline
  let y = 360
  const tx = f.x0 + 10
  education.forEach((e, i) => {
    ctx.fillStyle = i === 0 ? C.accent : C.faint
    ctx.beginPath()
    ctx.arc(tx, y - 9, 9, 0, Math.PI * 2)
    ctx.fill()
    if (i < education.length - 1) {
      ctx.fillStyle = C.line
      ctx.fillRect(tx - 1, y + 8, 2, 150)
    }
    text(ctx, e.school, tx + 34, y, { f: font(800, 31), color: C.ink })
    text(ctx, e.detail, tx + 34, y + 40, { f: font(500, 24), color: C.sub })
    let cx = tx + 34
    cx += chip(ctx, e.when, cx, y + 62, { size: 19, h: 40 }) + 10
    chip(ctx, e.score, cx, y + 62, { size: 19, h: 40, fill: C.accentSoft, color: C.accent })
    y += 172
  })

  caption(ctx, 'Achievements', f.x0, y + 8)
  y += 30
  const gap = 16
  const tw = (f.w - gap) / 2
  const th = 196
  achievements.forEach(([big, small], i) => {
    const x = f.x0 + (i % 2) * (tw + gap)
    const ty = y + Math.floor(i / 2) * (th + gap)
    box(ctx, x, ty, tw, th, 22, C.tile)
    let size = 54
    while (size > 34 && width(ctx, big, font(400, size, SERIF)) > tw - 48) size -= 2
    text(ctx, big, x + 24, ty + 70, { f: font(400, size, SERIF), color: C.accent })
    ctx.font = font(600, 21)
    wrap(ctx, small, tw - 48)
      .slice(0, 3)
      .forEach((l, j) => text(ctx, l, x + 24, ty + 112 + j * 29, { f: font(600, 21), color: C.sub }))
  })
}

function contactPage(ctx, links) {
  const side = 'right'
  const f = frame(side)
  paper(ctx, side)
  furniture(ctx, side, 'Contact', 8)
  eyebrow(ctx, '06', 'Contact', f.x0, 176)
  text(ctx, "Let's build", f.x0, 286, { f: font(400, 100, SERIF), color: C.ink })
  text(ctx, 'something.', f.x0, 382, { f: font(400, 100, SERIF, 'italic'), color: C.accent })
  let y = para(
    ctx,
    'Have an idea, a role or a hard problem in agentic AI, backends or the web? I would love to hear about it.',
    f.x0,
    456,
    f.w,
    { size: 28, lineH: 42 },
  )
  y += 18
  for (const l of profile.links) y = linkRow(ctx, links, l, f.x0, y, f.w)
  y += 26
  button(ctx, links, 'Download resume (PDF)  ↓', RESUME_PDF, f.x0, y, f.w, { download: true })
}

function blankPage(ctx, side) {
  paper(ctx, side)
}

// ---------- assembly ----------

function texture(c) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return releaseAfterUpload(t)
}

function loadImage(src, timeout = 4000) {
  return new Promise((resolve) => {
    const img = new Image()
    const t = setTimeout(() => resolve(null), timeout)
    img.onload = () => {
      clearTimeout(t)
      resolve(img.naturalWidth ? img : null)
    }
    img.onerror = () => {
      clearTimeout(t)
      resolve(null)
    }
    img.src = src
  })
}

const PAGE_LIST = [
  ['about', (ctx, links, assets) => aboutPage(ctx, links, assets.photo)],
  ['stack', (ctx) => stackPage(ctx)],
  ['samsung', (ctx) => experiencePage(ctx, experience[0], 'left', 3)],
  ['rootvestors', (ctx) => experiencePage(ctx, experience[1], 'right', 4)],
  ['cineprism', (ctx, links) => projectPage(ctx, links, projects[0], 'left', 5)],
  ['editor', (ctx, links) => projectPage(ctx, links, projects[1], 'right', 6)],
  ['education', (ctx) => educationPage(ctx)],
  ['contact', (ctx, links) => contactPage(ctx, links)],
  ['blankLeft', (ctx) => blankPage(ctx, 'left')],
]
export const PAGE_COUNT = PAGE_LIST.length

function drawOne(draw, assets) {
  const [c, ctx] = makeCanvas()
  const links = []
  draw(ctx, links, assets)
  return {
    texture: texture(c),
    links: links.map((l) => ({ ...l, x: l.x / W, y: l.y / H, w: l.w / W, h: l.h / H })),
  }
}

// Draws one page per task so the main thread (and the loader) never stalls.
// onPage(n) is called after each page with the number drawn so far.
export async function drawPagesAsync(onPage) {
  const assets = { photo: await loadImage('/photo.jpg') }
  const pages = {}
  let n = 0
  for (const [id, draw] of PAGE_LIST) {
    pages[id] = drawOne(draw, assets)
    onPage?.(++n)
    await new Promise((r) => setTimeout(r, 0))
  }
  for (const k of Object.keys(paperCache)) {
    paperCache[k].width = paperCache[k].height = 0
    delete paperCache[k]
  }
  return pages
}

// Find a link at a UV coordinate on a page (uv.y = 0 at the bottom of the canvas).
export function linkAt(page, uv) {
  if (!page || !uv) return null
  const x = uv.x
  const y = 1 - uv.y
  return page.links.find((l) => x >= l.x && x <= l.x + l.w && y >= l.y && y <= l.y + l.h) || null
}

// Dev helper: draw one page and return it as a PNG data URL (used to review layouts).
export function previewPage(id, assets = {}) {
  const entry = PAGE_LIST.find(([k]) => k === id)
  if (!entry) return null
  const [c, ctx] = makeCanvas()
  entry[1](ctx, [], assets)
  return c.toDataURL('image/png')
}
