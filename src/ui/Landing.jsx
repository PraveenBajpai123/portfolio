import { useEffect, useRef, useState } from 'react'
import { GITHUB_PATH, LEETCODE_PATH, CODEFORCES_PATH } from './socialIcons'
import { useStore } from '../store'
import { startScroll, scrollToProgress } from '../lib/scroll'
import { startAudio } from '../lib/audio'
import { profile, landing, RESUME_PDF } from '../content'
import DappledLight from './DappledLight'
import AsciiName from './AsciiName'

// First page: a full-screen hero in soft, dappled window light. The 3D room loads behind
// it; the tour button doubles as the loader. Progress comes from store.load (0..1) in small real
// steps; between steps the number keeps creeping so it never looks stuck, and it only
// reaches 100% when the room is truly ready.
const FAILSAFE_MS = 15000 // never lock people out of the tour

const LINKEDIN_PATH =
  'M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z'
const MAIL_PATH = 'M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 2.3V17h16V7.3l-8 5.6-8-5.6zM5.7 7l6.3 4.4L18.3 7H5.7z'

const linkFor = (label) => profile.links.find((l) => l.label === label)
const SOCIAL = [
  { label: 'GitHub', path: GITHUB_PATH, href: linkFor('GitHub')?.href },
  { label: 'LinkedIn', path: LINKEDIN_PATH, href: linkFor('LinkedIn')?.href },
  { label: 'LeetCode', path: LEETCODE_PATH, href: linkFor('LeetCode')?.href },
  { label: 'Codeforces', path: CODEFORCES_PATH, href: linkFor('Codeforces')?.href },
  { label: 'Email', path: MAIL_PATH, href: linkFor('Email')?.href },
].filter((s) => s.href)

// Drives the loader by writing straight to the DOM (no React re-render per frame).
// Returns true once loading is complete.
function useLoader(fillRef, numRef) {
  const [ready, setReady] = useState(() => useStore.getState().load >= 1)
  useEffect(() => {
    if (ready) return
    const fail = setTimeout(() => useStore.setState({ stage: 4, load: 1 }), FAILSAFE_MS)
    let raf
    let value = 0
    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const goal = useStore.getState().load * 100
      const done = goal >= 100
      const ceiling = done ? 100 : Math.min(96, goal + 9) // may run slightly ahead while waiting
      if (value < goal) value += Math.max((goal - value) * 5 * dt, 14 * dt) // catch up quickly
      else value += (ceiling - value) * 0.35 * dt // then creep, slowing down
      value = Math.min(value, ceiling)
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${value / 100})`
      if (numRef.current) numRef.current.textContent = `${Math.floor(value)}%`
      if (done && value > 99.5) {
        setReady(true)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      clearTimeout(fail)
      cancelAnimationFrame(raf)
    }
  }, [ready, fillRef, numRef])
  return ready
}

export default function Landing() {
  const entered = useStore((s) => s.entered)
  const fillRef = useRef(null)
  const numRef = useRef(null)
  const ready = useLoader(fillRef, numRef)
  const [leaving, setLeaving] = useState(false)
  const [hidden, setHidden] = useState(entered)

  // coming back from the tour shows the page again
  useEffect(() => {
    if (!entered) {
      setLeaving(false)
      setHidden(false)
    }
  }, [entered])

  const enter = (p = 0) => {
    if (!ready) return
    startAudio(useStore.getState().muted)
    useStore.setState({ entered: true })
    startScroll()
    if (p > 0) scrollToProgress(p, { immediate: true })
    setLeaving(true)
    setTimeout(() => setHidden(true), 900)
  }

  // dev only: ?autotour=0.36 enters the tour at that scroll point once loaded (for screenshots)
  useEffect(() => {
    if (!import.meta.env.DEV || !ready) return
    const p = new URLSearchParams(window.location.search).get('autotour')
    if (p !== null) enter(parseFloat(p) || 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  if (hidden) return null

  return (
    // data-lenis-prevent: the smooth-scroll library is paused while this page is up and
    // would otherwise swallow wheel/touch scrolling here.
    <div className={`landing ${leaving ? 'is-leaving' : ''}`} data-lenis-prevent>
      <DappledLight />
      <div className="hero-vignette" aria-hidden="true" />

      <header className="hero-top">
        <span className="hero-mark" aria-hidden="true">
          PB
        </span>
        <span className="hero-status">
          <span className="hero-dot" aria-hidden="true" />
          {landing.availability}
        </span>
      </header>

      <main className="hero">
        <h1 className="sr-only">
          {profile.name} — {landing.role}
        </h1>
        <AsciiName lines={['PRAVEEN', 'BAJPAI']} />
        <p className="hero-role">
          {landing.headline}
        </p>
        <span className="hero-rule" aria-hidden="true" />

        <button
          className={`hero-tour ${ready ? 'is-ready' : ''}`}
          onClick={() => enter(0)}
          disabled={!ready}
          aria-busy={!ready}
        >
          <span className="hero-tour-label">
            {ready ? (
              <>
                Take the resume tour
                <span className="hero-arrow" aria-hidden="true">
                  →
                </span>
              </>
            ) : (
              <>
                Preparing the tour <span ref={numRef}>0%</span>
              </>
            )}
          </span>
          <span className="hero-tour-line" aria-hidden="true">
            <span className="hero-tour-fill" ref={fillRef} />
          </span>
        </button>

        <div className="hero-links">
          <a className="hero-link" href="/resume">
            Read online
          </a>
          <span className="hero-links-dot" aria-hidden="true" />
          <a className="hero-link" href={RESUME_PDF} download="Praveen-Bajpai-Resume.pdf">
            Download PDF
          </a>
        </div>

        <ul className="hero-social" aria-label="Contact">
          {SOCIAL.map((s) => (
            <li key={s.label}>
              <a
                href={s.href}
                target={s.href.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                aria-label={s.label}
                title={s.label}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d={s.path} />
                </svg>
              </a>
            </li>
          ))}
        </ul>
      </main>

      <footer className="hero-foot">
        <span className="hero-hint">Move or click to stir the leaves</span>
      </footer>
    </div>
  )
}
