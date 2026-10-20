import {
  siReact,
  siNextdotjs,
  siNodedotjs,
  siExpress,
  siFlask,
  siFastapi,
  siPython,
  siTypescript,
  siJavascript,
  siCplusplus,
  siC,
  siPostgresql,
  siPrisma,
  siNeo4j,
  siTensorflow,
  siClaude,
  siModelcontextprotocol,
  siGit,
  siFfmpeg,
  siVercel,
  siZod,
  siTailwindcss,
  siLeetcode,
  siCodeforces,
  siGithub,
  siGmail,
  siSamsung,
} from 'simple-icons'

// Brand marks (Simple Icons, CC0 SVG data) drawn onto the book's canvases.
// Each entry: { title, hex, path } for a 24×24 SVG path, or { title, hex, draw } for
// marks Simple Icons doesn't ship, drawn by hand in the same 24×24 box.

const si = (icon, hex) => ({ title: icon.title, hex: hex || `#${icon.hex}`, path: icon.path })

const custom = (title, hex, draw) => ({ title, hex, draw })

export const ICONS = {
  react: si(siReact, '#149eca'), // brand cyan is too pale on paper
  nextjs: si(siNextdotjs),
  nodejs: si(siNodedotjs),
  express: si(siExpress),
  flask: si(siFlask),
  fastapi: si(siFastapi),
  python: si(siPython),
  typescript: si(siTypescript),
  javascript: si(siJavascript, '#e2c400'),
  cpp: si(siCplusplus),
  c: si(siC, '#5c6bc0'),
  postgresql: si(siPostgresql),
  prisma: si(siPrisma),
  neo4j: si(siNeo4j),
  tensorflow: si(siTensorflow),
  claude: si(siClaude),
  mcp: { ...si(siModelcontextprotocol), title: 'MCP' },
  git: si(siGit),
  ffmpeg: si(siFfmpeg),
  vercel: si(siVercel),
  zod: si(siZod),
  tailwind: si(siTailwindcss),
  leetcode: si(siLeetcode),
  codeforces: si(siCodeforces),
  github: si(siGithub),
  gmail: si(siGmail),
  samsung: si(siSamsung),

  // hand-drawn marks
  linkedin: custom('LinkedIn', '#0a66c2', (ctx) => {
    roundRect(ctx, 1, 1, 22, 22, 4)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.fillRect(5, 9.5, 3, 9.5)
    ctx.beginPath()
    ctx.arc(6.5, 6.3, 1.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillRect(10.2, 9.5, 2.9, 9.5)
    ctx.beginPath()
    ctx.moveTo(13.1, 12.5)
    ctx.quadraticCurveTo(14, 9.2, 16.6, 9.3)
    ctx.quadraticCurveTo(19.2, 9.4, 19.2, 13)
    ctx.lineTo(19.2, 19)
    ctx.lineTo(16.3, 19)
    ctx.lineTo(16.3, 13.6)
    ctx.quadraticCurveTo(16.2, 11.9, 14.9, 12)
    ctx.quadraticCurveTo(13.2, 12.1, 13.1, 14)
    ctx.closePath()
    ctx.fill()
  }),
  lambda: custom('AWS Lambda', '#ff9900', (ctx) => {
    roundRect(ctx, 1, 1, 22, 22, 5)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = '700 17px "Manrope", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('λ', 12, 17.5)
    ctx.textAlign = 'left'
  }),
  vscode: custom('VS Code', '#007acc', (ctx) => {
    ctx.beginPath()
    ctx.moveTo(17.5, 1.5)
    ctx.lineTo(22.5, 4)
    ctx.lineTo(22.5, 20)
    ctx.lineTo(17.5, 22.5)
    ctx.lineTo(7.5, 13.5)
    ctx.lineTo(3.5, 16.7)
    ctx.lineTo(1.5, 15.5)
    ctx.lineTo(1.5, 8.5)
    ctx.lineTo(3.5, 7.3)
    ctx.lineTo(7.5, 10.5)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.moveTo(17.5, 7)
    ctx.lineTo(11, 12)
    ctx.lineTo(17.5, 17)
    ctx.closePath()
    ctx.fill()
  }),
  sql: custom('SQL', '#336791', (ctx) => {
    // database cylinder
    ctx.lineWidth = 2
    ctx.strokeStyle = ctx.fillStyle
    ctx.beginPath()
    ctx.ellipse(12, 5.5, 8, 3, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(4, 5.5)
    ctx.lineTo(4, 18.5)
    ctx.ellipse(12, 18.5, 8, 3, 0, Math.PI, 0, true)
    ctx.lineTo(20, 5.5)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(12, 12, 8, 3, 0, 0, Math.PI)
    ctx.stroke()
  }),
  rag: custom('RAG', '#6d4aff', (ctx) => {
    // document + magnifier
    ctx.lineWidth = 2
    ctx.strokeStyle = ctx.fillStyle
    roundRect(ctx, 3, 2, 12, 16, 2)
    ctx.stroke()
    ctx.fillRect(6, 6, 6, 1.8)
    ctx.fillRect(6, 9.5, 4, 1.8)
    ctx.beginPath()
    ctx.arc(15.5, 15.5, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(18.4, 18.4)
    ctx.lineTo(21.5, 21.5)
    ctx.lineWidth = 2.6
    ctx.lineCap = 'round'
    ctx.stroke()
  }),
  agent: custom('Agentic AI', '#d0359f', (ctx) => {
    // connected nodes around a spark
    ctx.lineWidth = 1.8
    ctx.strokeStyle = ctx.fillStyle
    const nodes = [
      [4, 6],
      [20, 5],
      [19, 19],
      [5, 18],
    ]
    for (const [x, y] of nodes) {
      ctx.beginPath()
      ctx.moveTo(12, 12)
      ctx.lineTo(x, y)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(x, y, 2.4, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.beginPath()
    for (let i = 0; i < 8; i++) {
      const r = i % 2 ? 2.2 : 5.2
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2
      ctx.lineTo(12 + Math.cos(a) * r, 12 + Math.sin(a) * r)
    }
    ctx.closePath()
    ctx.fill()
  }),
  mail: custom('Email', '#5a3fe0', (ctx) => {
    ctx.lineWidth = 2
    ctx.strokeStyle = ctx.fillStyle
    roundRect(ctx, 2, 4.5, 20, 15, 2.5)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(3, 6)
    ctx.lineTo(12, 13)
    ctx.lineTo(21, 6)
    ctx.stroke()
  }),
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

const pathCache = new Map()

// Draw icon `key` at (x, y), `size` px square. `color` overrides the brand colour.
export function drawIcon(ctx, key, x, y, size, color) {
  const icon = ICONS[key]
  if (!icon) return false
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size / 24, size / 24)
  ctx.fillStyle = color || icon.hex
  if (icon.path) {
    let p = pathCache.get(key)
    if (!p) {
      p = new Path2D(icon.path)
      pathCache.set(key, p)
    }
    ctx.fill(p)
  } else {
    icon.draw(ctx)
  }
  ctx.restore()
  return true
}
