// One shared "gust" value (0..1) drives both the curtain shader and the wind audio,
// so the curtains billow exactly when the wind swells.
export const wind = { gust: 0.4, time: 0 }

export function updateGust(t) {
  // Incommensurate slow sines read as irregular, natural gusting.
  const raw =
    0.5 +
    0.28 * Math.sin(t * 0.21) +
    0.14 * Math.sin(t * 0.53 + 1.7) +
    0.08 * Math.sin(t * 1.31 + 0.4)
  wind.time = t
  wind.gust = Math.pow(Math.min(1, Math.max(0, raw)), 1.4)
  return wind.gust
}
