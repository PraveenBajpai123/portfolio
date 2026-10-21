// Background audio, all generated live with the Web Audio API (no files needed):
//  • a "tape" of calm ambient tracks — slow chords with reverb, a warm bass and sparse
//    piano-like notes; every track has its own key, chords and pace, and never loops exactly
//  • a quiet wind layer underneath (switchable on its own)
//  • a soft paper page-turn
//
// The music player UI drives this through play / pause / nextTrack / prevTrack /
// setWind and reads getMusicState(); subscribe() notifies it of changes.

const LEVELS = {
  music: 0.55, // overall music loudness
  wind: 0.45, // wind is a background layer under the music
  flip: 0.6, // page-turn loudness
}

// The tape. chords: pad notes (MIDI) + bass; melody: scale for the sparse plucks;
// chordLen / step in seconds; pluck: chance of a note per step; duration: track length.
export const TRACKS = [
  {
    title: 'Midnight Desk',
    chords: [
      { notes: [53, 57, 60, 64], bass: 41 }, // Fmaj7
      { notes: [55, 59, 62, 64], bass: 43 }, // G6
      { notes: [52, 55, 59, 62], bass: 40 }, // Em7
      { notes: [57, 60, 64, 67], bass: 45 }, // Am7
    ],
    melody: [72, 74, 76, 79, 81, 84],
    chordLen: 8,
    step: 1,
    pluck: 0.32,
    duration: 180,
  },
  {
    title: 'Neon Rain',
    chords: [
      { notes: [57, 60, 64, 71], bass: 45 }, // Am9
      { notes: [53, 57, 60, 64], bass: 41 }, // Fmaj7
      { notes: [55, 59, 60, 64], bass: 48 }, // Cmaj7
      { notes: [55, 59, 62, 64], bass: 43 }, // G6
    ],
    melody: [69, 72, 74, 76, 79, 81],
    chordLen: 10,
    step: 0.8,
    pluck: 0.26,
    duration: 200,
  },
  {
    title: 'Lamp Glow',
    chords: [
      { notes: [54, 57, 61, 64], bass: 38 }, // Dmaj9
      { notes: [54, 57, 59, 62], bass: 47 }, // Bm7
      { notes: [55, 59, 62, 66], bass: 43 }, // Gmaj7
      { notes: [57, 61, 64, 66], bass: 45 }, // A6
    ],
    melody: [74, 76, 78, 81, 83, 86],
    chordLen: 8,
    step: 1.2,
    pluck: 0.34,
    duration: 170,
  },
  {
    title: 'City Window',
    chords: [
      { notes: [51, 55, 58, 62], bass: 39 }, // Ebmaj7
      { notes: [55, 58, 60, 63], bass: 48 }, // Cm7
      { notes: [56, 60, 63, 67], bass: 44 }, // Abmaj7
      { notes: [53, 58, 62, 67], bass: 46 }, // Bb6
    ],
    melody: [75, 77, 79, 82, 84, 87],
    chordLen: 9,
    step: 1,
    pluck: 0.3,
    duration: 190,
  },
  {
    title: 'Paper Planes',
    chords: [
      { notes: [55, 59, 60, 64], bass: 48 }, // Cmaj7
      { notes: [57, 60, 64, 67], bass: 45 }, // Am7
      { notes: [53, 57, 60, 62], bass: 38 }, // Dm7
      { notes: [55, 60, 62, 65], bass: 43 }, // G7sus4
    ],
    melody: [72, 74, 76, 79, 81, 84],
    chordLen: 6,
    step: 0.75,
    pluck: 0.38,
    duration: 160,
  },
]

let ctx = null
let master, musicBus, reverbIn, bodyGain, airGain, airFilter, airPan, startedAt
let padFilter, keysOut
let flipBuffer = null
let scheduler = null

// music state
const music = { index: 0, playing: false, offset: 0, resumedAt: 0, wind: true }
let seq = null // chord/melody position within the current track
const listeners = new Set()
const emit = () => listeners.forEach((fn) => fn())

// ---------- helpers ----------

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12)

function noiseBuffer(seconds, color) {
  const length = Math.floor(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    let last = 0
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1
      if (color === 'brown') {
        last = (last + 0.02 * white) / 1.02
        data[i] = last * 3.5
      } else if (color === 'pink') {
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.969 * b2 + white * 0.153852
        b3 = 0.8665 * b3 + white * 0.3104856
        b4 = 0.55 * b4 + white * 0.5329522
        b5 = -0.7616 * b5 - white * 0.016898
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
        b6 = white * 0.115926
      } else {
        data[i] = white
      }
    }
  }
  return buffer
}

function impulse(seconds, decay) {
  const length = Math.floor(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
  }
  return buffer
}

function loop(buffer) {
  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.loop = true
  src.start()
  return src
}

// ---------- generative music ----------

function padVoice(dest, freq, t, len, level) {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(level, t + 3)
  g.gain.setValueAtTime(level, t + len)
  g.gain.linearRampToValueAtTime(0, t + len + 3.5)
  g.connect(dest)
  const a = ctx.createOscillator()
  a.type = 'sine'
  a.frequency.value = freq
  const b = ctx.createOscillator()
  b.type = 'triangle'
  b.frequency.value = freq
  b.detune.value = 7
  const bg = ctx.createGain()
  bg.gain.value = 0.35
  a.connect(g)
  b.connect(bg).connect(g)
  for (const o of [a, b]) {
    o.start(t)
    o.stop(t + len + 3.6)
  }
}

function pluck(dest, freq, t, level) {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(level, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2)
  g.connect(dest)
  const a = ctx.createOscillator()
  a.type = 'sine'
  a.frequency.value = freq
  const h = ctx.createOscillator()
  h.type = 'sine'
  h.frequency.value = freq * 2
  const hg = ctx.createGain()
  hg.gain.setValueAtTime(0.18, t)
  hg.gain.exponentialRampToValueAtTime(0.001, t + 0.8)
  a.connect(g)
  h.connect(hg).connect(g)
  for (const o of [a, h]) {
    o.start(t)
    o.stop(t + 3.3)
  }
}

function buildMusicGraph() {
  // pad → gentle low-pass (slowly breathing) → dry + reverb
  padFilter = ctx.createBiquadFilter()
  padFilter.type = 'lowpass'
  padFilter.frequency.value = 950
  padFilter.Q.value = 0.4
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.045
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 320
  lfo.connect(lfoGain).connect(padFilter.frequency)
  lfo.start()
  const padOut = ctx.createGain()
  padOut.gain.value = 0.9
  padFilter.connect(padOut)
  padOut.connect(musicBus)
  padOut.connect(reverbIn)

  keysOut = ctx.createGain()
  keysOut.gain.value = 0.55
  keysOut.connect(musicBus)
  keysOut.connect(reverbIn)
}

function resetSequence() {
  const track = TRACKS[music.index]
  seq = {
    chord: 0,
    nextChord: ctx.currentTime + 0.15,
    nextStep: ctx.currentTime + 2.5,
    lastNote: track.melody[2],
  }
}

function tick() {
  if (!ctx || !music.playing) return
  const track = TRACKS[music.index]
  if (elapsed() >= track.duration) {
    nextTrack()
    return
  }
  const horizon = ctx.currentTime + 1.5
  while (seq.nextChord < horizon) {
    const chord = track.chords[seq.chord % track.chords.length]
    chord.notes.forEach((n) => padVoice(padFilter, midi(n), seq.nextChord, track.chordLen, 0.05))
    padVoice(padFilter, midi(chord.bass), seq.nextChord, track.chordLen, 0.07)
    seq.chord++
    seq.nextChord += track.chordLen
  }
  while (seq.nextStep < horizon) {
    // sparse, wandering melody that prefers small steps
    if (Math.random() < track.pluck) {
      const near = track.melody.filter((n) => Math.abs(n - seq.lastNote) <= 5)
      const note = near[Math.floor(Math.random() * near.length)] || track.melody[2]
      const t = seq.nextStep + Math.random() * 0.15
      pluck(keysOut, midi(note), t, 0.06 + Math.random() * 0.03)
      if (Math.random() < 0.18) pluck(keysOut, midi(note - 12), t + 0.02, 0.035)
      seq.lastNote = note
    }
    seq.nextStep += track.step
  }
}

function elapsed() {
  if (!ctx) return music.offset
  return music.playing ? music.offset + (ctx.currentTime - music.resumedAt) : music.offset
}

function fadeMusic(to, seconds) {
  const now = ctx.currentTime
  musicBus.gain.cancelScheduledValues(now)
  musicBus.gain.setValueAtTime(musicBus.gain.value, now)
  musicBus.gain.linearRampToValueAtTime(to, now + seconds)
}

// ---------- public API ----------

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getMusicState() {
  const track = TRACKS[music.index]
  return {
    started: Boolean(ctx),
    playing: music.playing,
    index: music.index,
    count: TRACKS.length,
    title: track.title,
    duration: track.duration,
    elapsed: Math.min(track.duration, elapsed()),
    wind: music.wind,
  }
}

// Must be called from a click/tap (browsers block audio until a user gesture).
// muted = start with the music paused (wind and page turns still play).
export function startAudio(muted) {
  if (ctx) return
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  ctx = new AC()
  try {
    music.wind = localStorage.getItem('desk-wind') !== '0'
  } catch {
    /* storage unavailable */
  }

  master = ctx.createGain()
  master.gain.value = 1
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -20
  comp.ratio.value = 3
  master.connect(comp).connect(ctx.destination)

  // shared reverb (a generated hall-like tail)
  const reverb = ctx.createConvolver()
  reverb.buffer = impulse(3.5, 3)
  reverbIn = ctx.createGain()
  reverbIn.gain.value = 0.6
  const wet = ctx.createGain()
  wet.gain.value = 0.55
  reverbIn.connect(reverb).connect(wet)

  musicBus = ctx.createGain()
  musicBus.gain.value = 0
  musicBus.connect(master)
  wet.connect(musicBus)

  // wind: low body + airy hush
  const body = loop(noiseBuffer(4, 'brown'))
  const bodyLp = ctx.createBiquadFilter()
  bodyLp.type = 'lowpass'
  bodyLp.frequency.value = 280
  bodyGain = ctx.createGain()
  bodyGain.gain.value = 0
  body.connect(bodyLp).connect(bodyGain).connect(master)

  const air = loop(noiseBuffer(5, 'pink'))
  airFilter = ctx.createBiquadFilter()
  airFilter.type = 'bandpass'
  airFilter.Q.value = 0.7
  airFilter.frequency.value = 700
  const airLp = ctx.createBiquadFilter()
  airLp.type = 'lowpass'
  airLp.frequency.value = 2400
  airGain = ctx.createGain()
  airGain.gain.value = 0
  airPan = ctx.createStereoPanner ? ctx.createStereoPanner() : null
  let node = air.connect(airFilter).connect(airLp).connect(airGain)
  if (airPan) node = node.connect(airPan)
  node.connect(master)

  flipBuffer = noiseBuffer(0.6, 'white')
  startedAt = ctx.currentTime

  buildMusicGraph()
  scheduler = setInterval(tick, 300)
  if (!muted) play(6) // slow first fade-in
  else emit()

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return
    if (document.hidden) ctx.suspend()
    else ctx.resume()
  })
}

// Resume (or start) the music. Starts the audio engine if needed — call from a click.
export function play(fade = 1.2) {
  if (!ctx) {
    startAudio(false)
    return
  }
  if (ctx.state === 'suspended') ctx.resume()
  if (music.playing) return
  music.playing = true
  music.resumedAt = ctx.currentTime
  resetSequence()
  fadeMusic(LEVELS.music, fade)
  tick()
  emit()
}

export function pause() {
  if (!ctx || !music.playing) return
  music.offset = elapsed()
  music.playing = false
  fadeMusic(0, 0.6)
  emit()
}

function switchTrack(index) {
  music.index = (index + TRACKS.length) % TRACKS.length
  music.offset = 0
  if (ctx && music.playing) {
    // dip, start the new progression, swell back in: a soft crossfade
    music.resumedAt = ctx.currentTime
    const now = ctx.currentTime
    musicBus.gain.cancelScheduledValues(now)
    musicBus.gain.setValueAtTime(musicBus.gain.value, now)
    musicBus.gain.linearRampToValueAtTime(LEVELS.music * 0.15, now + 0.5)
    musicBus.gain.linearRampToValueAtTime(LEVELS.music, now + 3)
    resetSequence()
    seq.nextChord = now + 0.5
  }
  emit()
}

export function nextTrack() {
  switchTrack(music.index + 1)
}

export function prevTrack() {
  // like a real player: restart the track if we're more than a few seconds in
  if (elapsed() > 4) switchTrack(music.index)
  else switchTrack(music.index - 1)
}

export function setWind(on) {
  music.wind = on
  try {
    localStorage.setItem('desk-wind', on ? '1' : '0')
  } catch {
    /* storage unavailable */
  }
  emit()
}

// Kept for older callers: muted = music paused.
export function setAudioMuted(muted) {
  if (muted) pause()
  else play()
}

// focus: 0 = room view, 1 = reading the book (wind gets quieter and more muffled).
export function updateAudio(gust, focus) {
  if (!ctx) return
  const now = ctx.currentTime
  const fadeIn = Math.min(1, (now - startedAt) / 5)
  const level = fadeIn * LEVELS.wind * (1 - focus * 0.5) * (music.wind ? 1 : 0)
  bodyGain.gain.setTargetAtTime(level * (0.08 + gust * 0.1), now, 0.4)
  airGain.gain.setTargetAtTime(level * (0.025 + gust * gust * 0.09), now, 0.4)
  airFilter.frequency.setTargetAtTime(480 + gust * 1000 - focus * 220, now, 0.5)
  if (airPan) airPan.pan.setTargetAtTime(Math.sin(now * 0.13) * 0.35, now, 0.8)
}

// A short, soft paper page-turn.
export function playFlip() {
  if (!ctx || !flipBuffer || ctx.state !== 'running') return
  const now = ctx.currentTime
  const rate = 0.9 + Math.random() * 0.2
  const L = LEVELS.flip

  const swish = ctx.createBufferSource()
  swish.buffer = flipBuffer
  swish.playbackRate.value = rate
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 0.9
  bp.frequency.setValueAtTime(1300, now)
  bp.frequency.exponentialRampToValueAtTime(3400, now + 0.22)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, now)
  g.gain.exponentialRampToValueAtTime(0.12 * L, now + 0.04)
  g.gain.exponentialRampToValueAtTime(0.03 * L, now + 0.2)
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.42)
  swish.connect(bp).connect(g).connect(master)
  swish.start(now)
  swish.stop(now + 0.5)

  const thud = ctx.createBufferSource()
  thud.buffer = flipBuffer
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 420
  const tg = ctx.createGain()
  const t0 = now + 0.5 / rate
  tg.gain.setValueAtTime(0.0001, t0)
  tg.gain.exponentialRampToValueAtTime(0.18 * L, t0 + 0.015)
  tg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14)
  thud.connect(lp).connect(tg).connect(master)
  thud.start(t0)
  thud.stop(t0 + 0.2)
}
