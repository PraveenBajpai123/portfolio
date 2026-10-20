// Frame budget: the canvas renders on demand (frameloop="demand").
// While something moves (scrolling, camera easing, pages turning) we render every
// display frame; when the scene is idle only the ambient loops run (curtains, neon,
// fairy lights), so we drop to a low frame rate. Nothing renders behind the intro.

export const motion = { until: 0 }

// Call whenever something visible is moving; keeps full frame rate for `ms`.
export function kick(ms = 400) {
  const t = performance.now() + ms
  if (t > motion.until) motion.until = t
}

export const IDLE_FPS = 30

// Shadows are static except while book pages move, so the shadow maps are only
// re-rendered when someone asks for it.
export const shadows = { dirty: true }
export function dirtyShadows() {
  shadows.dirty = true
}
