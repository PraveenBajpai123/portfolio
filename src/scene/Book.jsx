import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import { linkAt } from '../lib/pages'
import { coverTexture, leatherTexture, paperEdgeTexture } from '../lib/textures'
import { playFlip } from '../lib/audio'
import { kick, dirtyShadows } from '../lib/perf'
import { profile } from '../content'

// Book local space: pages lie in the XY plane, the spine runs along Y at x = 0,
// right-hand pages extend toward +x, and +z is "up" off the desk. The parent group
// rotates the whole book flat onto the desk.

export const BOOK = {
  pw: 0.25, // page width
  ph: 0.33, // page height
  leaf: 0.0018, // paper leaf thickness
  block: 0.011, // thickness of each paper block (fake page stack)
  cover: 0.005, // board thickness
  over: 0.008, // cover overhang
}
const SEG = 24
const LEAVES = [
  ['stack', 'samsung'],
  ['rootvestors', 'cineprism'],
  ['editor', 'education'],
  ['contact', 'blankLeft'],
]

const L0 = BOOK.cover + BOOK.block // top of the right-hand paper block
const PIVOT = L0 + LEAVES.length * BOOK.leaf // where the cover hinges when closed

// BoxGeometry draws its six faces as six groups. Our four edge faces share a material,
// so fold them into one group: 3 draw calls per box (edges · front +z · back -z) instead of 6.
function threeGroups(geo) {
  const g = geo.groups.map((x) => ({ ...x }))
  geo.clearGroups()
  geo.addGroup(0, g[0].count + g[1].count + g[2].count + g[3].count, 0)
  geo.addGroup(g[4].start, g[4].count, 1)
  geo.addGroup(g[5].start, g[5].count, 2)
  return geo
}

const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

function pageGeometry() {
  const { pw, ph, leaf } = BOOK
  const geo = new THREE.BoxGeometry(pw, ph, leaf, SEG, 2)
  geo.translate(pw / 2, 0, 0)
  threeGroups(geo)
  const pos = geo.attributes.position
  const segW = pw / SEG
  const idx = []
  const wts = []
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const b = Math.min(SEG - 1, Math.max(0, Math.floor(x / segW)))
    const w = Math.min(1, Math.max(0, (x - b * segW) / segW))
    idx.push(b, b + 1, 0, 0)
    wts.push(1 - w, w, 0, 0)
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4))
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wts, 4))
  return geo
}

// Pages carry a little of their own light (emissiveMap = the page itself) so the text
// stays readable whatever the lamp and the neon do to the room.
// Pages light themselves (emissiveMap = the page) so text keeps its true colours whatever
// the lamp and neon do; a little real lighting stays for shading and page-curl shadows.
// Not tone-mapped, and kept below the bloom threshold, so the paper never haloes.
function paperMat(map) {
  return new THREE.MeshStandardMaterial({
    map,
    color: '#4a4740',
    emissive: '#ffffff',
    emissiveMap: map,
    emissiveIntensity: 0.8,
    roughness: 0.95,
    metalness: 0,
    toneMapped: false,
  })
}

function makeLeaf(geo, edgeMat, front, back, index) {
  const bones = []
  for (let i = 0; i <= SEG; i++) {
    const b = new THREE.Bone()
    if (i > 0) {
      b.position.x = BOOK.pw / SEG
      bones[i - 1].add(b)
    }
    bones.push(b)
  }
  const mats = [edgeMat, paperMat(front.texture), paperMat(back.texture)]
  const mesh = new THREE.SkinnedMesh(geo, mats)
  mesh.add(bones[0])
  mesh.bind(new THREE.Skeleton(bones))
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.frustumCulled = false
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(BOOK.pw / 2, 0, 0), 0.6)
  mesh.userData.faces = { 1: front, 2: back }
  const group = new THREE.Group()
  group.add(mesh)
  return {
    group,
    mesh,
    bones,
    u: 0, // linear turn progress 0 (right) → 1 (left)
    dir: 1,
    moving: false,
    zRight: L0 + (LEAVES.length - 1 - index) * BOOK.leaf + BOOK.leaf / 2,
    zLeft: L0 + index * BOOK.leaf + BOOK.leaf / 2,
  }
}

export default function Book({ pages, reducedMotion, ...props }) {
  const spread = useStore((s) => s.spread)
  const entered = useStore((s) => s.entered)
  const coverRef = useRef()
  const spineRef = useRef()
  const coverState = useRef({ u: 0, moving: false })

  const parts = useMemo(() => {
    const edgeTex = paperEdgeTexture()
    const edgeMat = new THREE.MeshStandardMaterial({ map: edgeTex, roughness: 0.95 })
    const plainPaper = new THREE.MeshStandardMaterial({ color: '#efe5cf', roughness: 0.9 })
    const leather = new THREE.MeshStandardMaterial({ map: leatherTexture(), roughness: 0.62, metalness: 0.05 })
    const coverFront = new THREE.MeshStandardMaterial({
      map: coverTexture(profile.name, profile.tagline),
      roughness: 0.55,
      metalness: 0.15,
    })
    const geo = pageGeometry()
    const leaves = LEAVES.map(([f, b], i) => makeLeaf(geo, edgeMat, pages[f], pages[b], i))

    const boardGeo = new THREE.BoxGeometry(BOOK.pw + BOOK.over, BOOK.ph + BOOK.over * 2, BOOK.cover)
    boardGeo.translate((BOOK.pw + BOOK.over) / 2, 0, 0)
    threeGroups(boardGeo)
    const blockGeo = new THREE.BoxGeometry(BOOK.pw, BOOK.ph, BOOK.block)
    blockGeo.translate(BOOK.pw / 2, 0, 0)
    threeGroups(blockGeo)

    // Left block: its underside shows the "About" page once the cover is opened.
    const aboutMat = paperMat(pages.about.texture)
    const coverBlock = new THREE.Mesh(blockGeo, [edgeMat, plainPaper, aboutMat])
    coverBlock.position.z = BOOK.block / 2
    coverBlock.userData.faces = { 2: pages.about }
    const coverBoard = new THREE.Mesh(boardGeo, [leather, coverFront, leather])
    coverBoard.position.z = BOOK.block + BOOK.cover / 2

    const backBoard = new THREE.Mesh(boardGeo, leather)
    backBoard.position.z = BOOK.cover / 2
    const rightBlock = new THREE.Mesh(blockGeo, [edgeMat, plainPaper, plainPaper])
    rightBlock.position.z = BOOK.cover + BOOK.block / 2

    for (const m of [coverBlock, coverBoard, backBoard, rightBlock]) {
      m.castShadow = true
      m.receiveShadow = true
    }
    return { leaves, coverBlock, coverBoard, backBoard, rightBlock, leather }
  }, [pages])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20)
    const speedMul = reducedMotion ? 3 : 1

    // Cover (rigid board + left paper block)
    const cs = coverState.current
    const coverTarget = spread >= 1 ? 1 : 0
    // Nothing to animate? Skip the bone work entirely.
    const busy = cs.u !== coverTarget || parts.leaves.some((l, i) => l.u !== (spread >= i + 2 ? 1 : 0))
    if (!busy && !cs.wasBusy && cs.posed) return
    const prevCover = cs.u
    // when closing, the cover waits for the first page to turn back so it never passes through it
    const coverBlocked = coverTarget < cs.u && parts.leaves[0].u > 0.35
    if (!coverBlocked) cs.u = THREE.MathUtils.clamp(cs.u + Math.sign(coverTarget - cs.u) * dt * 0.85 * speedMul, 0, 1)
    if (Math.abs(coverTarget - cs.u) < 0.002) cs.u = coverTarget
    if (cs.u !== prevCover && !cs.moving) {
      cs.moving = true
      playFlip()
    }
    if (cs.u === coverTarget) cs.moving = false
    const ct = ease(cs.u)
    const lift = Math.sin(Math.PI * ct)
    if (coverRef.current) {
      coverRef.current.rotation.y = -Math.PI * ct
      coverRef.current.position.z = PIVOT - LEAVES.length * BOOK.leaf * ct + lift * 0.004
    }
    if (spineRef.current) {
      const full = PIVOT + BOOK.block + BOOK.cover
      const open = L0
      spineRef.current.scale.z = THREE.MathUtils.lerp(full, open, ct)
      spineRef.current.position.z = spineRef.current.scale.z / 2
    }

    // Paper leaves: each waits for its neighbour so fast scrolling cascades naturally.
    parts.leaves.forEach((leaf, i) => {
      const target = spread >= i + 2 ? 1 : 0
      const prevU = i === 0 ? cs.u : parts.leaves[i - 1].u
      const nextU = i === parts.leaves.length - 1 ? 0 : parts.leaves[i + 1].u
      let canMove = true
      if (target > leaf.u && prevU < 0.35) canMove = false
      if (target < leaf.u && nextU > 0.65) canMove = false
      if (canMove && leaf.u !== target) {
        if (!leaf.moving) {
          leaf.moving = true
          playFlip()
        }
        leaf.dir = Math.sign(target - leaf.u)
        leaf.u = THREE.MathUtils.clamp(leaf.u + leaf.dir * dt * 1.15 * speedMul, 0, 1)
        if (Math.abs(target - leaf.u) < 0.002) leaf.u = target
      }
      if (leaf.u === target) leaf.moving = false

      const t = ease(leaf.u)
      const lift = Math.sin(Math.PI * t)
      const rest = 0.04 * (1 - lift)
      const curl = lift * 1.25 * leaf.dir
      leaf.group.position.z = THREE.MathUtils.lerp(leaf.zRight, leaf.zLeft, t) + lift * 0.006
      leaf.bones.forEach((bone, j) => {
        if (j === 0) {
          bone.rotation.y = -Math.PI * t - rest * (1 - 2 * t)
          return
        }
        let ry = (curl / SEG) * (0.4 + (j / SEG) * 1.2)
        if (j <= 3) ry += (rest * (1 - 2 * t)) / 3
        bone.rotation.y = ry
        bone.rotation.x = j > SEG / 2 ? leaf.dir * lift * 0.022 * ((j - SEG / 2) / (SEG / 2)) : 0
      })
    })

    // moving pages need full frame rate and fresh shadows (one more pass once they land)
    if (busy || cs.wasBusy) {
      kick(150)
      dirtyShadows()
    }
    cs.wasBusy = busy
    cs.posed = true
  })

  // ---- links on the open pages ----
  const findLink = (e) => {
    if (!entered || spread < 1) return null
    const faces = e.object.userData.faces
    const mi = e.face?.materialIndex
    if (!faces || mi == null || !faces[mi]) return null
    return linkAt(faces[mi], e.uv)
  }
  const onMove = (e) => {
    e.stopPropagation()
    const link = findLink(e)
    document.body.style.cursor = link ? 'pointer' : ''
    const cur = useStore.getState().hoverLink
    if ((cur && cur.href) !== (link && link.href)) useStore.setState({ hoverLink: link })
  }
  const onOut = () => {
    document.body.style.cursor = ''
    useStore.setState({ hoverLink: null })
  }
  const onClick = (e) => {
    // ignore drags / scroll gestures that end on a page; only a deliberate tap opens a link
    if (e.delta > 6 || !e.nativeEvent?.isTrusted) return
    const link = findLink(e)
    if (!link) return
    e.stopPropagation()
    openLink(link)
  }
  const handlers = { onPointerMove: onMove, onPointerOut: onOut, onClick }

  return (
    <group {...props}>
      <group rotation-x={-Math.PI / 2}>
        <primitive object={parts.backBoard} />
        <primitive object={parts.rightBlock} />
        {parts.leaves.map((leaf, i) => (
          <primitive key={i} object={leaf.group} {...handlers} />
        ))}
        <group ref={coverRef} position-z={PIVOT}>
          <primitive object={parts.coverBlock} {...handlers} />
          <primitive object={parts.coverBoard} />
        </group>
        <mesh ref={spineRef} position-x={-BOOK.cover / 2} material={parts.leather} castShadow>
          <boxGeometry args={[BOOK.cover, BOOK.ph + BOOK.over * 2, 1]} />
        </mesh>
      </group>
    </group>
  )
}

export function openLink(link) {
  if (link.download) {
    const a = document.createElement('a')
    a.href = link.href
    a.download = 'Praveen-Bajpai-Resume.pdf'
    document.body.appendChild(a)
    a.click()
    a.remove()
  } else if (link.href.startsWith('mailto:')) {
    window.location.href = link.href
  } else {
    window.open(link.href, '_blank', 'noopener,noreferrer')
  }
}

// Book-space helpers for the camera rig: total height and centre of the open/closed book.
export const BOOK_TOP = PIVOT + BOOK.block + BOOK.cover
