import Lenis from 'lenis'
import { scroll, useStore } from '../store'
import { kick } from './perf'

// Scroll timeline, as fractions of total scroll (0 → 1).
export const T = {
  wideHold: 0.05, // establishing shot holds until here
  arrive: 0.2, // camera settles above the closed book
  flips: [0.26, 0.41, 0.56, 0.71], // spread 1..4 opens at these points
  finale: 0.9, // camera starts pulling back
  close: 0.92, // the book closes (pages flip back, cover shuts)
  end: 0.975, // "thanks for reading" card appears
}

export const CHAPTERS = [
  { label: 'Desk', p: 0 },
  { label: 'Cover', p: 0.22 },
  { label: 'About', p: 0.32 },
  { label: 'Experience', p: 0.47 },
  { label: 'Projects', p: 0.62 },
  { label: 'Contact', p: 0.78 },
  { label: 'The end', p: 1 },
]

export function spreadAt(p) {
  if (p >= T.close) return 0 // the story is over: close the book
  let k = 0
  for (const f of T.flips) if (p >= f) k++
  return k
}

export function chapterAt(p) {
  let c = 0
  CHAPTERS.forEach((ch, i) => {
    if (p >= ch.p - 0.02) c = i
  })
  return c
}

let lenis = null

export function initScroll(reducedMotion) {
  lenis = new Lenis({ lerp: reducedMotion ? 1 : 0.075, smoothWheel: !reducedMotion, wheelMultiplier: 0.9 })
  lenis.stop() // unlocked when the visitor enters
  const onScroll = (l) => {
    scroll.progress = l.limit > 0 ? Math.min(1, Math.max(0, l.scroll / l.limit)) : 0
    scroll.velocity = l.velocity
    kick(500)
    const spread = spreadAt(scroll.progress)
    const chapter = chapterAt(scroll.progress)
    const s = useStore.getState()
    if (s.spread !== spread || s.chapter !== chapter) useStore.setState({ spread, chapter })
  }
  lenis.on('scroll', onScroll)
  let raf
  const loop = (time) => {
    lenis.raf(time)
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
  onScroll(lenis)
  return () => {
    cancelAnimationFrame(raf)
    lenis.destroy()
    lenis = null
  }
}

export function startScroll() {
  lenis?.start()
}

export function stopScroll() {
  lenis?.stop()
}

export function scrollToProgress(p, { immediate = false } = {}) {
  if (!lenis) return
  if (immediate) lenis.scrollTo(p * lenis.limit, { immediate: true, force: true })
  else lenis.scrollTo(p * lenis.limit, { duration: 1.6 })
}
