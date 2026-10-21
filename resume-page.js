import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

// Builds /resume: the whole resume as one plain, static HTML page, generated from
// src/content.js. It loads instantly, its text can be selected and searched, and crawlers
// and AI screeners can read it — the "skip the tour" version of the 3D book.

const require = createRequire(import.meta.url)
const CONTENT = fileURLToPath(new URL('./src/content.js', import.meta.url))
const SITE = 'https://praveenbajpai.in'

const FONTS = [
  ['manrope-400', '@fontsource/manrope/files/manrope-latin-400-normal.woff2'],
  ['manrope-600', '@fontsource/manrope/files/manrope-latin-600-normal.woff2'],
  ['manrope-800', '@fontsource/manrope/files/manrope-latin-800-normal.woff2'],
  ['serif-400', '@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2'],
  ['serif-400i', '@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2'],
]

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const external = (href) => /^https?:/.test(href)
const a = (href, label, extra = '') =>
  `<a href="${esc(href)}"${external(href) ? ' target="_blank" rel="noopener"' : ''}${extra}>${label}</a>`

export function personJsonLd(c) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: c.profile.name,
    url: `${SITE}/`,
    image: `${SITE}/photo.jpg`,
    jobTitle: c.landing.headline,
    description: c.profile.intro,
    email: `mailto:${c.profile.email}`,
    alumniOf: c.education.map((e) => ({ '@type': 'EducationalOrganization', name: e.school })),
    knowsAbout: c.skills.flatMap((g) => g.items.map((i) => i.name)),
    sameAs: c.profile.links.filter((l) => external(l.href)).map((l) => l.href),
  }
}

function render(c, fontUrl) {
  const { profile, landing, experience, projects, skills, education, achievements, RESUME_PDF } = c
  const face = (family, file, weight, style = 'normal') =>
    `@font-face{font-family:'${family}';src:url(${fontUrl(file)}) format('woff2');font-weight:${weight};font-style:${style};font-display:swap}`

  const job = (e) => `
      <article class="item">
        <header class="item-head">
          <div>
            <h3>${esc(e.company)}</h3>
            <p class="role">${esc(e.role)}</p>
          </div>
          <p class="when">${esc(e.when)}<span>${esc(e.where)}</span></p>
        </header>
        <ul class="stats">${e.stats.map(([big, small]) => `<li><b>${esc(big)}</b>${esc(small)}</li>`).join('')}</ul>
        <ul class="points">${e.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
        ${e.products ? `<ul class="products">${e.products.map((p) => `<li><b>${p.link ? a(p.link.href, `${esc(p.name)} ↗`) : esc(p.name)}</b><span>${esc(p.kind)}</span>${esc(p.desc)}</li>`).join('')}</ul>` : ''}
        ${e.tags.length ? `<p class="tags">${e.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</p>` : ''}
      </article>`

  const project = (p) => `
      <article class="item">
        <header class="item-head">
          <div>
            <h3>${esc(p.name)}</h3>
            <p class="role">${esc(p.kind)}</p>
          </div>
          <p class="when">${p.link ? a(p.link.href, `${esc(p.link.label)} ↗`) : ''}<span>${esc(p.stat.join(' '))}</span></p>
        </header>
        <ul class="points">${p.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
        <p class="tags">${p.stack.map((t) => `<span>${esc(t)}</span>`).join('')}</p>
      </article>`

  const title = `${profile.name} — Resume`
  const description = `${landing.headline}. ${profile.intro}`

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${SITE}/resume" />
<meta name="theme-color" content="#f7f5f0" />
<meta property="og:type" content="profile" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${SITE}/resume" />
<meta property="og:image" content="${SITE}/og.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="${SITE}/og.jpg" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="preload" href="${fontUrl('serif-400')}" as="font" type="font/woff2" crossorigin />
<script type="application/ld+json">${JSON.stringify(personJsonLd(c)).replace(/</g, '\\u003c')}</script>
<style>
${face('Manrope', 'manrope-400', 400)}
${face('Manrope', 'manrope-600', 600)}
${face('Manrope', 'manrope-800', 800)}
${face('Instrument Serif', 'serif-400', 400)}
${face('Instrument Serif', 'serif-400i', 400, 'italic')}
:root{--paper:#f7f5f0;--ink:#16131f;--body:#2c2939;--sub:#5b5770;--faint:#8d899e;--accent:#5a3fe0;--accent-soft:rgba(90,63,224,.08);--tile:#eeebe4;--line:rgba(22,19,31,.12)}
@media (prefers-color-scheme:dark){:root{--paper:#0d0a1f;--ink:#f4f1ff;--body:#d9d4ec;--sub:#a59fc0;--faint:#7d7798;--accent:#a996ff;--accent-soft:rgba(169,150,255,.12);--tile:#1a1533;--line:rgba(244,241,255,.12)}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--body);font:400 16px/1.65 Manrope,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration-color:var(--line);text-underline-offset:3px}
a:hover{color:var(--accent);text-decoration-color:currentColor}
.wrap{max-width:820px;margin:0 auto;padding:28px 20px 72px}
.top{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--sub)}
.top a{text-decoration:none}
.btn{display:inline-flex;align-items:center;gap:8px;padding:9px 16px;border-radius:999px;border:1px solid var(--line)}
.btn:hover{border-color:var(--accent)}
.hero{padding:64px 0 36px;border-bottom:1px solid var(--line)}
h1{margin:0;font:400 clamp(48px,9vw,84px)/.95 'Instrument Serif',Georgia,serif;color:var(--ink);letter-spacing:-.01em}
.headline{margin:18px 0 0;font-size:clamp(17px,2.2vw,20px);font-weight:600;color:var(--ink)}
.headline em{font:italic 400 1.15em 'Instrument Serif',Georgia,serif;color:var(--sub)}
.intro{margin:14px 0 0;max-width:62ch;color:var(--sub)}
.status{display:inline-flex;align-items:center;gap:9px;margin-top:20px;font-size:13px;font-weight:600;color:var(--sub)}
.status i{width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 4px rgba(34,197,94,.14)}
.links{display:flex;flex-wrap:wrap;gap:8px 18px;margin:22px 0 0;padding:0;list-style:none;font-size:14px;font-weight:600}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:30px 0 0}
.facts div{padding:14px 16px;border-radius:14px;background:var(--tile)}
.facts dt{font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--faint)}
.facts dd{margin:4px 0 0;font-size:14px;font-weight:600;color:var(--ink);line-height:1.45}
section{padding:44px 0 8px}
h2{display:flex;align-items:center;gap:12px;margin:0 0 22px;font-size:12px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--accent)}
h2::before{content:'';width:18px;height:2px;background:currentColor}
.item{padding:0 0 30px;margin:0 0 30px;border-bottom:1px solid var(--line)}
.item:last-child{border-bottom:0;margin-bottom:0}
.item-head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px 24px;flex-wrap:wrap}
h3{margin:0;font:400 34px/1.1 'Instrument Serif',Georgia,serif;color:var(--ink)}
.role{margin:6px 0 0;font-weight:600;color:var(--sub)}
.when{margin:4px 0 0;text-align:right;font-size:14px;font-weight:600;color:var(--ink)}
.when span{display:block;font-weight:400;color:var(--faint)}
.stats{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0 0;padding:0;list-style:none}
.stats li{padding:10px 16px;border-radius:12px;background:var(--accent-soft);font-size:13px;font-weight:600;color:var(--sub)}
.stats b{margin-right:8px;font:400 24px/1 'Instrument Serif',Georgia,serif;color:var(--accent)}
.points{margin:18px 0 0;padding:0;list-style:none}
.points li{position:relative;padding-left:20px;margin:0 0 10px}
.points li::before{content:'';position:absolute;left:0;top:.62em;width:8px;height:2px;background:var(--accent)}
.products{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin:18px 0 0;padding:0;list-style:none}
.products li{padding:14px 16px;border-radius:14px;background:var(--tile);font-size:14px;color:var(--sub);line-height:1.5}
.products b{display:block;font:400 22px/1.2 'Instrument Serif',Georgia,serif;color:var(--ink)}
.products span{display:block;margin:2px 0 6px;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin:16px 0 0}
.tags span{padding:3px 10px;border-radius:999px;border:1px solid var(--line);font-size:12px;font-weight:600;color:var(--sub)}
.skills{display:grid;gap:14px;margin:0}
.skills div{display:grid;grid-template-columns:130px 1fr;gap:16px}
.skills dt{font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--faint);padding-top:2px}
.skills dd{margin:0;color:var(--ink);font-weight:600}
.rows{margin:0;padding:0;list-style:none}
.rows li{display:flex;justify-content:space-between;gap:6px 20px;flex-wrap:wrap;padding:14px 0;border-bottom:1px solid var(--line)}
.rows li:last-child{border-bottom:0}
.rows b{color:var(--ink);font-weight:800}
.rows span{color:var(--sub)}
footer{margin-top:48px;padding-top:24px;border-top:1px solid var(--line);display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;font-size:13px;color:var(--faint)}
@media (max-width:560px){.skills div{grid-template-columns:1fr;gap:4px}.when{text-align:left}.hero{padding-top:44px}}
@media print{:root{--paper:#fff}.top,footer{display:none}.hero{padding-top:0}section{break-inside:auto}.item{break-inside:avoid}a{text-decoration:none}}
</style>
</head>
<body>
<div class="wrap">
  <nav class="top" aria-label="Site">
    <a href="/">← 3D tour</a>
    <a class="btn" href="${esc(RESUME_PDF)}" download="Praveen-Bajpai-Resume.pdf">Download PDF ↓</a>
  </nav>

  <header class="hero">
    <h1>${esc(profile.name)}</h1>
    <p class="headline">${esc(landing.headline)}</p>
    <p class="intro">${esc(profile.intro)}</p>
    <p class="status"><i aria-hidden="true"></i>${esc(landing.availability)}</p>
    <ul class="links">${profile.links.map((l) => `<li>${a(l.href, esc(l.label))}</li>`).join('')}</ul>
    <dl class="facts">${profile.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
  </header>

  <section aria-labelledby="exp"><h2 id="exp">Experience</h2>${experience.map(job).join('')}
  </section>

  <section aria-labelledby="proj"><h2 id="proj">Projects</h2>${projects.map(project).join('')}
  </section>

  <section aria-labelledby="skills"><h2 id="skills">Skills</h2>
    <dl class="skills">${skills.map((g) => `<div><dt>${esc(g.group)}</dt><dd>${g.items.map((i) => esc(i.name)).join(' · ')}</dd></div>`).join('')}</dl>
  </section>

  <section aria-labelledby="edu"><h2 id="edu">Education</h2>
    <ul class="rows">${education.map((e) => `<li><div><b>${esc(e.school)}</b><br /><span>${esc(e.detail)}</span></div><div><b>${esc(e.score)}</b><br /><span>${esc(e.when)}</span></div></li>`).join('')}</ul>
  </section>

  <section aria-labelledby="ach"><h2 id="ach">Achievements</h2>
    <ul class="rows">${achievements.map(([k, v]) => `<li><b>${esc(k)}</b><span>${esc(v)}</span></li>`).join('')}</ul>
  </section>

  <footer>
    <span>© ${new Date().getFullYear()} ${esc(profile.name)}</span>
    <a href="/">Take the 3D resume tour →</a>
  </footer>
</div>
</body>
</html>
`
}

export default function resumePage() {
  let server = null
  return {
    name: 'resume-page',

    // dev: serve /resume straight from the current content.js
    configureServer(s) {
      server = s
      s.middlewares.use(async (req, res, next) => {
        if (!/^\/resume\/?(\?.*)?$/.test(req.url)) return next()
        const c = await server.ssrLoadModule(CONTENT)
        const html = render(c, (key) => `/@fs/${require.resolve(FONTS.find(([k]) => k === key)[1]).replace(/\\/g, '/')}`)
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(html)
      })
    },

    // the home page gets the same structured data, so search engines know who the site is about
    async transformIndexHtml() {
      const c = server ? await server.ssrLoadModule(CONTENT) : await import(`${pathToFileURL(CONTENT).href}?t=${Date.now()}`)
      return [
        {
          tag: 'script',
          attrs: { type: 'application/ld+json' },
          children: JSON.stringify(personJsonLd(c)).replace(/</g, '\u003c'),
          injectTo: 'head',
        },
      ]
    },

    // build: emit the fonts and dist/resume/index.html
    async generateBundle() {
      const c = await import(`${pathToFileURL(CONTENT).href}?t=${Date.now()}`)
      const urls = {}
      for (const [key, pkg] of FONTS) {
        const ref = this.emitFile({ type: 'asset', name: pkg.split('/').pop(), source: readFileSync(require.resolve(pkg)) })
        urls[key] = `/${this.getFileName(ref)}`
      }
      this.emitFile({ type: 'asset', fileName: 'resume/index.html', source: render(c, (key) => urls[key]) })
    },
  }
}
