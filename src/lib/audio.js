// Background audio, all generated live with the Web Audio API (no files needed):
//  • calm ambient music — slow, soft chords with reverb, a warm bass and occasional
//    gentle piano-like notes; it never loops exactly
//  • a quiet wind layer underneath
//  • a soft paper page-turn
//
// Want your own track instead? Put an MP3 in /public/audio/ and set MUSIC_URL,
// e.g. '/audio/ambient.mp3'. It will loop in place of the generated music.
const MUSIC_URL = null

const LEVELS = {
  music: 0.55, // overall music loudness
  wind: 0.45, // wind is a background layer under the music
  flip: 0.6, // page-turn loudness
}

let ctx = null
let master, musicBus, reverbIn, bodyGain, airGain, airFilter, airPan, startedAt
let flipBuffer = null
let scheduler = null

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

// Fmaj7 → G6 → Em7 → Am7 : warm, unresolved, calm.
const CHORDS = [
  { notes: [53, 57, 60, 64], bass: 41 },
  { notes: [55, 59, 62, 64], bass: 43 },
  { notes: [52, 55, 59, 62], bass: 40 },
  { notes: [57, 60, 64, 67], bass: 45 },
]
const MELODY = [72, 74, 76, 79, 81, 84] // C major pentatonic, upper register
const CHORD_LEN = 8 // seconds per chord
const STEP = 1 // seconds per melody step

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

function startGenerativeMusic() {
  // pad → gentle low-pass (slowly breathing) → dry + reverb
  const padFilter = ctx.createBiquadFilter()
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

  const keysOut = ctx.createGain()
  keysOut.gain.value = 0.55
  keysOut.connect(musicBus)
  const keysSend = ctx.createGain()
  keysSend.gain.value = 1
  keysOut.connect(keysSend).connect(reverbIn)

  let chordIndex = 0
  let nextChord = ctx.currentTime + 0.2
  let nextStep = ctx.currentTime + 4
  let lastNote = 76

  const tick = () => {
    if (!ctx) return
    const horizon = ctx.currentTime + 1.5
    while (nextChord < horizon) {
      const chord = CHORDS[chordIndex % CHORDS.length]
      chord.notes.forEach((n) => padVoice(padFilter, midi(n), nextChord, CHORD_LEN, 0.05))
      padVoice(padFilter, midi(chord.bass), nextChord, CHORD_LEN, 0.07)
      chordIndex++
      nextChord += CHORD_LEN
    }
    while (nextStep < horizon) {
      // sparse, wandering melody that prefers small steps
      if (Math.random() < 0.32) {
        const candidates = MELODY.filter((n) => Math.abs(n - lastNote) <= 5)
        const note = candidates[Math.floor(Math.random() * candidates.length)] || 76
        const t = nextStep + Math.random() * 0.15
        pluck(keysOut, midi(note), t, 0.06 + Math.random() * 0.03)
        if (Math.random() < 0.18) pluck(keysOut, midi(note - 12), t + 0.02, 0.035)
        lastNote = note
      }
      nextStep += STEP
    }
  }
  tick()
  scheduler = setInterval(tick, 300)
}

async function startTrack(url) {
  try {
    const data = await (await fetch(url)).arrayBuffer()
    const buffer = await ctx.decodeAudioData(data)
    const src = loop(buffer)
    src.connect(musicBus)
  } catch {
    startGenerativeMusic() // fall back to the generated music
  }
}

// ---------- public API ----------

// Must be called from a click/tap (browsers block audio until a user gesture).
export function startAudio(muted) {
  if (ctx) return
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  ctx = new AC()

  master = ctx.createGain()
  master.gain.value = muted ? 0 : 1
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

  if (MUSIC_URL) startTrack(MUSIC_URL)
  else startGenerativeMusic()
  musicBus.gain.setValueAtTime(0, ctx.currentTime)
  musicBus.gain.linearRampToValueAtTime(LEVELS.music, ctx.currentTime + 6)

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return
    if (document.hidden) ctx.suspend()
    else ctx.resume()
  })
}

export function setAudioMuted(muted) {
  if (!ctx) return
  if (!muted && ctx.state === 'suspended') ctx.resume()
  master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.35)
}

// focus: 0 = room view, 1 = reading the book (wind gets quieter and more muffled).
export function updateAudio(gust, focus) {
  if (!ctx) return
  const now = ctx.currentTime
  const fadeIn = Math.min(1, (now - startedAt) / 5)
  const level = fadeIn * LEVELS.wind * (1 - focus * 0.5)
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
