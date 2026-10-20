import { useEffect, useState } from 'react'
import { useStore, setMuted } from '../store'
import { CHAPTERS, scrollToProgress, stopScroll } from '../lib/scroll'
import Landing from './Landing'
import { startAudio, setAudioMuted } from '../lib/audio'
import { profile, dockLinks, spreads, RESUME_PDF } from '../content'

function SoundIcon({ muted }) {
  return (
    <span className={`bars ${muted ? 'is-muted' : ''}`} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  )
}

function ScrollHint() {
  const entered = useStore((s) => s.entered)
  const chapter = useStore((s) => s.chapter)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    // hide after the first real scroll; no per-frame polling
    const onScroll = () => {
      if (window.scrollY > 40) setScrolled(true)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const show = entered && !scrolled && chapter === 0
  return (
    <div className={`scroll-hint ${show ? 'is-visible' : ''}`} aria-hidden="true">
      <span>Scroll</span>
      <i />
    </div>
  )
}

// Shown once the book has closed at the end of the tour.
function EndCard({ onHome }) {
  const chapter = useStore((s) => s.chapter)
  const visible = CHAPTERS[chapter]?.label === 'The end'
  return (
    <div className={`end-card ${visible ? 'is-visible' : ''}`} aria-hidden={!visible}>
      <p className="end-kicker">The end</p>
      <h2>
        Thanks for <em>reading.</em>
      </h2>
      <p className="end-sub">I'd love to hear from you — {profile.email}</p>
      <div className="end-actions">
        <a className="end-btn is-primary" href={RESUME_PDF} download="Praveen-Bajpai-Resume.pdf" tabIndex={visible ? 0 : -1}>
          Download resume ↓
        </a>
        <button className="end-btn" onClick={() => scrollToProgress(CHAPTERS.find((c) => c.label === 'Cover').p)} tabIndex={visible ? 0 : -1}>
          Read again ↺
        </button>
        <button className="end-btn" onClick={onHome} tabIndex={visible ? 0 : -1}>
          Home
        </button>
      </div>
    </div>
  )
}

function Dock() {
  const spread = useStore((s) => s.spread)
  const chapter = useStore((s) => s.chapter)
  const hoverLink = useStore((s) => s.hoverLink)
  const links = dockLinks[spread] || []
  const inBook = chapter >= 2 && spread >= 1
  const title = spread >= 1 ? spreads[spread - 1].title : ''
  return (
    <div className={`dock ${inBook ? 'is-visible' : ''}`}>
      <div className="dock-title">
        {hoverLink ? (
          <>
            Open <strong>{hoverLink.label}</strong> ↗
          </>
        ) : (
          <>
            <span className="dock-num">{['', 'I', 'II', 'III', 'IV'][spread]}</span> {title}
          </>
        )}
      </div>
      {links.length > 0 && (
        <div className="dock-links">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target={l.href.startsWith('http') ? '_blank' : undefined}
              rel="noopener noreferrer"
              download={l.download ? 'Praveen-Bajpai-Resume.pdf' : undefined}
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Overlay() {
  const entered = useStore((s) => s.entered)
  const muted = useStore((s) => s.muted)
  const chapter = useStore((s) => s.chapter)

  const goHome = () => {
    scrollToProgress(0, { immediate: true })
    stopScroll()
    useStore.setState({ entered: false })
  }

  const toggleSound = () => {
    const next = !muted
    setMuted(next)
    startAudio(next)
    setAudioMuted(next)
  }

  return (
    <>
      <Landing />
      <header className={`hud ${entered ? 'is-visible' : ''}`}>
        <button className="brand" onClick={goHome} title="Back to the home page">
          <strong>{profile.name}</strong>
          <span>{profile.tagline}</span>
        </button>
        <div className="hud-actions">
          <a className="pill" href={RESUME_PDF} download="Praveen-Bajpai-Resume.pdf">
            Resume PDF ↓
          </a>
          <button
            className="pill sound"
            onClick={toggleSound}
            aria-pressed={!muted}
            aria-label={muted ? "Turn music on" : "Mute music"}
          >
            <SoundIcon muted={muted} />
            <span className="sound-label">{muted ? 'Sound off' : 'Sound on'}</span>
          </button>
        </div>
      </header>

      <nav className={`chapters ${entered ? 'is-visible' : ''}`} aria-label="Chapters">
        {CHAPTERS.map((c, i) => (
          <button
            key={c.label}
            className={i === chapter ? 'is-active' : ''}
            onClick={() => scrollToProgress(c.p)}
            aria-current={i === chapter ? 'step' : undefined}
          >
            <span className="dot" />
            <span className="label">{c.label}</span>
          </button>
        ))}
      </nav>

      <ScrollHint />
      <Dock />
      <EndCard onHome={goHome} />
    </>
  )
}
