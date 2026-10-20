import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { scroll, pointer } from '../store'
import { kick } from '../lib/perf'
import { T } from '../lib/scroll'
import { BOOK, BOOK_TOP } from './Book'

const WIDE = { pos: new THREE.Vector3(0.62, 1.6, 1.55), look: new THREE.Vector3(0.1, 0.98, -0.3) }
const TILT = THREE.MathUtils.degToRad(15)

const smooth = (a, b, x) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

// Camera framing the book so the visible pages fit the viewport.
function bookShot(bookPos, aspect, fov, p, out) {
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(fov / 2))
  const portrait = aspect < 0.85
  const pageW = BOOK.pw + BOOK.over
  const open = smooth(T.flips[0] - 0.012, T.flips[0] + 0.05, p)
  // which part of the book to frame
  let cx = THREE.MathUtils.lerp(pageW / 2, 0, open)
  let visibleW = THREE.MathUtils.lerp(pageW, pageW * 2, open)
  if (portrait && open > 0) {
    // phones: one page at a time — left half of each spread's scroll range, then right
    const bounds = [...T.flips, T.finale]
    let side = 0
    for (let i = 0; i < T.flips.length; i++) {
      if (p >= bounds[i] && p < bounds[i + 1]) {
        const sub = (p - bounds[i]) / (bounds[i + 1] - bounds[i])
        side = smooth(0.45, 0.58, sub)
      }
    }
    if (p >= T.finale) side = 1
    cx = THREE.MathUtils.lerp(cx, THREE.MathUtils.lerp(-pageW / 2, pageW / 2, side), open)
    visibleW = THREE.MathUtils.lerp(visibleW, pageW, open)
  }
  const visibleH = BOOK.ph + BOOK.over * 2
  const dist = Math.max((visibleH * 1.2) / (2 * tanHalf), (visibleW * 1.07) / (2 * tanHalf * aspect))
  out.look.set(bookPos.x + cx, bookPos.y + BOOK_TOP, bookPos.z + 0.012)
  out.pos.set(out.look.x, out.look.y + dist * Math.cos(TILT), out.look.z + dist * Math.sin(TILT))
  return out
}

export default function CameraRig({ bookPos }) {
  const { camera, size } = useThree()
  const look = useRef(WIDE.look.clone())
  const tmp = useRef({ pos: new THREE.Vector3(), look: new THREE.Vector3() }).current
  const book = useRef({ pos: new THREE.Vector3(), look: new THREE.Vector3() }).current
  const goal = useRef({ pos: new THREE.Vector3(), look: new THREE.Vector3() }).current
  const wide = useRef({ pos: new THREE.Vector3(), look: new THREE.Vector3() }).current

  useFrame((state, delta) => {
    const p = scroll.progress
    const aspect = size.width / size.height
    bookShot(bookPos, aspect, camera.fov, p, book)

    // narrow screens: step back from the room so the lamp and window still fit
    const back = aspect < 1.2 ? 1 + (1.2 - aspect) * 0.75 : 1
    wide.pos.copy(WIDE.pos).sub(WIDE.look).multiplyScalar(back).add(WIDE.look)
    wide.look.copy(WIDE.look)
    if (aspect < 1) wide.look.x += 0.12

    if (p <= T.wideHold) {
      goal.pos.copy(wide.pos)
      goal.look.copy(wide.look)
      // gentle dolly-in while the visitor starts scrolling
      goal.pos.lerp(wide.look, (p / T.wideHold) * 0.05)
    } else if (p < T.arrive) {
      const t = easeInOut((p - T.wideHold) / (T.arrive - T.wideHold))
      tmp.pos.copy(wide.pos).lerp(wide.look, 0.05)
      goal.pos.copy(tmp.pos).lerp(book.pos, t)
      // arc upward a little mid-move so it feels like leaning over the desk
      goal.pos.y += Math.sin(t * Math.PI) * 0.12
      goal.look.copy(wide.look).lerp(book.look, t)
    } else if (p < T.finale) {
      goal.pos.copy(book.pos)
      goal.look.copy(book.look)
    } else {
      // the book closes while the camera pulls back out into the room
      const t = easeInOut(Math.min(1, (p - T.finale) / (T.end - T.finale)))
      goal.pos.copy(book.pos).lerp(wide.pos, t)
      goal.look.copy(book.look).lerp(wide.look, t)
    }

    // shared "focus" value: 0 looking at the room, 1 reading the book
    scroll.focus = smooth(T.wideHold, T.arrive, p) * (1 - smooth(T.finale, 1, p))

    // subtle parallax from the pointer, weaker while reading
    const par = 1 - scroll.focus * 0.8
    goal.pos.x += pointer.x * 0.05 * par
    goal.pos.y += pointer.y * 0.025 * par

    const k = 1 - Math.exp(-delta * 4.5)
    camera.position.lerp(goal.pos, k)
    look.current.lerp(goal.look, k)
    camera.lookAt(look.current)
    // still easing toward the shot? keep rendering at full rate
    if (camera.position.distanceToSquared(goal.pos) > 1e-7 || look.current.distanceToSquared(goal.look) > 1e-7) kick(120)
  })

  return null
}
