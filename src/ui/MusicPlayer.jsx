import { useEffect, useState } from 'react'
import { setMuted } from '../store'
import { getMusicState, subscribe, play, pause, nextTrack, prevTrack, setWind } from '../lib/audio'
import { landing, profile } from '../content'

// Cassette-style player for the generated ambient "tape": track info, progress,
// previous / play-pause / next, a wind (ambience) switch and the portrait as a home button.

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

function Cassette({ spinning }) {
  return (
    <svg className={`mp-cassette ${spinning ? 'is-spinning' : ''}`} viewBox="0 0 48 32" aria-hidden="true">
      <rect x="1" y="1" width="46" height="30" rx="5" className="mp-cas-body" />
      <rect x="7" y="6" width="34" height="14" rx="7" className="mp-cas-window" />
      {[15, 33].map((cx) => (
        <g key={cx} className="mp-reel" style={{ transformOrigin: `${cx}px 13px` }}>
          <circle cx={cx} cy="13" r="5" className="mp-reel-hub" />
          {[0, 60, 120].map((a) => (
            <line key={a} x1={cx} y1="9.4" x2={cx} y2="16.6" transform={`rotate(${a} ${cx} 13)`} className="mp-reel-spoke" />
          ))}
        </g>
      ))}
      <path d="M12 31 L15 24 H33 L36 31" className="mp-cas-foot" />
    </svg>
  )
}

const Icon = {
  prev: <path d="M6 5h2.4v14H6zM19 5.5v13L9.6 12z" />,
  next: <path d="M15.6 5H18v14h-2.4zM5 5.5v13L14.4 12z" />,
  play: <path d="M8 5.5v13l11-6.5-11-6.5z" />,
  pause: <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />,
  headphones: (
    <>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" fill="none" />
      <rect x="3" y="14" width="4.5" height="6.5" rx="1.6" />
      <rect x="16.5" y="14" width="4.5" height="6.5" rx="1.6" />
    </>
  ),
}

export default function MusicPlayer({ onHome }) {
  const [st, setSt] = useState(getMusicState)

  useEffect(() => {
    const update = () => setSt(getMusicState())
    const unsub = subscribe(update)
    // progress: only re-render while music is actually playing
    const id = setInterval(() => {
      if (getMusicState().playing) update()
    }, 500)
    return () => {
      unsub()
      clearInterval(id)
    }
  }, [])

  const toggle = () => {
    if (st.playing) {
      pause()
      setMuted(true)
    } else {
      play()
      setMuted(false)
    }
  }

  const pct = st.duration ? Math.min(100, (st.elapsed / st.duration) * 100) : 0
  const n = (i) => String(i).padStart(2, '0')

  return (
    <div className={`mp ${st.playing ? 'is-playing' : ''}`} role="region" aria-label="Music player">
      <span className="mp-tape" aria-hidden="true">
        <Cassette spinning={st.playing} />
      </span>

      <div className="mp-meta">
        <span className="mp-kicker">
          Track {n(st.index + 1)} / {n(st.count)}
        </span>
        <span className="mp-title" aria-live="polite">
          {st.title}
        </span>
        <span className="mp-bar" aria-hidden="true">
          <i style={{ transform: `scaleX(${pct / 100})` }} />
        </span>
      </div>

      <span className="mp-time" aria-label={`${fmt(st.elapsed)} of ${fmt(st.duration)}`}>
        {fmt(st.elapsed)} / {fmt(st.duration)}
      </span>

      <div className="mp-ctrls">
        <button className="mp-btn mp-prev" onClick={prevTrack} aria-label="Previous track" title="Previous">
          <svg viewBox="0 0 24 24" aria-hidden="true">{Icon.prev}</svg>
        </button>
        <button
          className="mp-btn mp-play"
          onClick={toggle}
          aria-label={st.playing ? 'Pause music' : 'Play music'}
          title={st.playing ? 'Pause' : 'Play'}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">{st.playing ? Icon.pause : Icon.play}</svg>
        </button>
        <button className="mp-btn mp-next" onClick={nextTrack} aria-label="Next track" title="Next">
          <svg viewBox="0 0 24 24" aria-hidden="true">{Icon.next}</svg>
        </button>
        <button
          className={`mp-btn mp-wind ${st.wind ? 'is-on' : ''}`}
          onClick={() => setWind(!st.wind)}
          aria-pressed={st.wind}
          aria-label={st.wind ? 'Turn ambience (wind) off' : 'Turn ambience (wind) on'}
          title={st.wind ? 'Ambience on' : 'Ambience off'}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">{Icon.headphones}</svg>
        </button>
      </div>

      <button className="mp-avatar" onClick={onHome} aria-label="Back to the home page" title="Home">
        <img src={landing.photo} alt={profile.name} />
      </button>
    </div>
  )
}
