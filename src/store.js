import { create } from 'zustand'

// Values read every frame live in plain mutable objects (no React re-renders).
export const scroll = { progress: 0, velocity: 0 }
export const pointer = { x: 0, y: 0 }

function readMuted() {
  try {
    return localStorage.getItem('desk-muted') === '1'
  } catch {
    return false
  }
}

// UI state that React components subscribe to.
export const useStore = create((set) => ({
  ready: false, // fonts loaded + page textures drawn
  stage: 0, // loading: 0 start · 1 fonts · 2 pages drawn · 3 shaders compiled · 4 rendered
  load: 0, // fine-grained loading progress 0..1 (drives the landing page's loader)
  entered: false, // visitor clicked through the intro
  muted: readMuted(),
  spread: 0, // 0 = closed book, 1..4 = open spreads
  chapter: 0,
  hoverLink: null,
  set,
}))

export function setMuted(muted) {
  useStore.setState({ muted })
  try {
    localStorage.setItem('desk-muted', muted ? '1' : '0')
  } catch {
    /* storage unavailable: setting just won't persist */
  }
}

// Report loading progress; it only ever moves forward.
export function bumpLoad(v) {
  if (v > useStore.getState().load) useStore.setState({ load: Math.min(1, v) })
}
