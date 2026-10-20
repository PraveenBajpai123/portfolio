import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { posterTexture, corkboardTexture, wallScreenTexture, artTexture } from '../lib/decor'

// Wall decor, neon LED strips, fairy lights and the coloured lights they cast.

const WALL = -0.613 // just in front of the back wall
const LEFT_WALL = -1.343 // just in front of the left wall

function glowTexture() {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, 64)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(0.5, 'rgba(255,255,255,1)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

// All LED tubes and their wall glow, merged into one mesh per colour (a handful of draw
// calls instead of two per strip). Each strip: a → b, the wall normal it glows against,
// colour, brightness and the height of the soft light spill.
function NeonStrips({ strips, glow }) {
  const meshes = useMemo(() => {
    const groups = new Map()
    const xAxis = new THREE.Vector3()
    const yAxis = new THREE.Vector3()
    const zAxis = new THREE.Vector3()
    for (const st of strips) {
      const A = new THREE.Vector3(...st.a)
      const B = new THREE.Vector3(...st.b)
      const len = A.distanceTo(B)
      xAxis.copy(B).sub(A).normalize()
      zAxis.set(...(st.normal || [0, 0, 1]))
      yAxis.crossVectors(zAxis, xAxis)
      const m = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis).setPosition(A.add(B).multiplyScalar(0.5))
      const tube = new THREE.CylinderGeometry(0.0055, 0.0055, len, 8, 1, true).rotateZ(-Math.PI / 2).applyMatrix4(m)
      const spill = new THREE.PlaneGeometry(len + 0.08, st.spill ?? 0.22).translate(0, 0, -0.004).applyMatrix4(m)
      const key = `${st.color}|${st.intensity ?? 4}`
      if (!groups.has(key)) groups.set(key, { color: st.color, intensity: st.intensity ?? 4, tubes: [], spills: [] })
      groups.get(key).tubes.push(tube)
      groups.get(key).spills.push(spill)
    }
    const out = []
    for (const g of groups.values()) {
      out.push({
        geometry: mergeGeometries(g.tubes),
        material: new THREE.MeshBasicMaterial({ color: new THREE.Color(g.color).multiplyScalar(g.intensity), toneMapped: false }),
      })
      out.push({
        geometry: mergeGeometries(g.spills),
        material: new THREE.MeshBasicMaterial({
          map: glow,
          color: new THREE.Color(g.color).multiplyScalar(0.55),
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      })
      g.tubes.concat(g.spills).forEach((geo) => geo.dispose())
    }
    return out
  }, [strips, glow])
  return meshes.map((m, i) => <mesh key={i} geometry={m.geometry} material={m.material} />)
}

const LEFT_NORMAL = [1, 0, 0]
const NEON_STRIPS = [
  { a: [-1.32, 2.28, WALL], b: [0.25, 2.28, WALL], color: '#ff3df0' },
  { a: [-1.315, 0.95, WALL], b: [-1.315, 2.28, WALL], color: '#ff3df0' },
  { a: [-1.3, 0.93, WALL], b: [0.25, 0.93, WALL], color: '#38e8ff', intensity: 3.5 },
  { a: [0.265, 0.93, WALL], b: [0.265, 2.28, WALL], color: '#8a5cff', intensity: 2.6, spill: 0.14 },
  { a: [-0.52, 1.08, WALL], b: [-0.52, 1.82, WALL], color: '#38e8ff', intensity: 3.5, spill: 0.16 },
  // neon frame on the left wall
  { a: [LEFT_WALL, 1.15, 0.16], b: [LEFT_WALL, 1.15, -0.32], color: '#ff3df0', spill: 0.18, normal: LEFT_NORMAL },
  { a: [LEFT_WALL, 1.75, 0.16], b: [LEFT_WALL, 1.75, -0.32], color: '#ff3df0', spill: 0.18, normal: LEFT_NORMAL },
  { a: [LEFT_WALL, 1.15, 0.16], b: [LEFT_WALL, 1.75, 0.16], color: '#ff3df0', spill: 0.18, normal: LEFT_NORMAL },
  { a: [LEFT_WALL, 1.15, -0.32], b: [LEFT_WALL, 1.75, -0.32], color: '#ff3df0', spill: 0.18, normal: LEFT_NORMAL },
]

function Framed({ position, rotation, size, map, emissive = 0.25, frame = '#14121c', depth = 0.014 }) {
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map,
        emissiveMap: map,
        emissive: '#ffffff',
        emissiveIntensity: emissive,
        roughness: 0.6,
      }),
    [map, emissive],
  )
  const [w, h] = size
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w + 0.03, h + 0.03, depth]} />
        <meshStandardMaterial color={frame} roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position-z={depth / 2 + 0.001} material={mat}>
        <planeGeometry args={[w, h]} />
      </mesh>
    </group>
  )
}

const FAIRY_COLORS = ['#ff4fd8', '#38e8ff', '#ffd36e', '#9b7bff', '#7cff8a', '#ff7a59']

function FairyLights() {
  const ref = useRef()
  const { wire, points, phases, base } = useMemo(() => {
    const pts = []
    // drape across the top of the window...
    for (let i = 0; i <= 12; i++) {
      const t = i / 12
      pts.push(new THREE.Vector3(0.22 + t * 1.1, 2.25 - Math.sin(t * Math.PI) * 0.07 - Math.sin(t * Math.PI * 3) * 0.015, -0.55))
    }
    // ...then down the right side
    for (let i = 1; i <= 10; i++) {
      const t = i / 10
      pts.push(new THREE.Vector3(1.32 + Math.sin(t * 9) * 0.018, 2.25 - t * 1.3, -0.55 + Math.sin(t * 5) * 0.01))
    }
    const curve = new THREE.CatmullRomCurve3(pts)
    const wire = new THREE.TubeGeometry(curve, 160, 0.0013, 5, false)
    const count = 58
    const points = curve.getSpacedPoints(count - 1)
    const phases = points.map(() => Math.random() * Math.PI * 2)
    const base = points.map((_, i) => new THREE.Color(FAIRY_COLORS[i % FAIRY_COLORS.length]))
    return { wire, points, phases, base }
  }, [])

  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), c: new THREE.Color() }), [])

  const lastTwinkle = useRef(-1)
  useFrame((state) => {
    const mesh = ref.current
    if (!mesh) return
    const t = state.clock.elapsedTime
    // twinkle is slow; recolouring ~12 times a second looks identical and saves uploads
    if (mesh.userData.placed && t - lastTwinkle.current < 0.08) return
    lastTwinkle.current = t
    points.forEach((p, i) => {
      if (!mesh.userData.placed) {
        tmp.m.makeTranslation(p.x, p.y - 0.008, p.z)
        mesh.setMatrixAt(i, tmp.m)
      }
      const k = 2.2 + 1.4 * Math.sin(t * (0.9 + (i % 5) * 0.21) + phases[i])
      tmp.c.copy(base[i]).multiplyScalar(k)
      mesh.setColorAt(i, tmp.c)
    })
    mesh.userData.placed = true
    mesh.instanceMatrix.needsUpdate = true
    mesh.instanceColor.needsUpdate = true
  })

  return (
    <group>
      <mesh geometry={wire}>
        <meshStandardMaterial color="#1a1a22" roughness={0.6} />
      </mesh>
      <instancedMesh ref={ref} args={[null, null, points.length]} frustumCulled={false}>
        <sphereGeometry args={[0.0085, 10, 10]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <pointLight position={[1.0, 1.75, -0.1]} color="#ff7ad9" intensity={0.35} distance={1.6} decay={2} />
    </group>
  )
}

export default function Decor() {
  const t = useMemo(
    () => ({
      poster: posterTexture(),
      cork: corkboardTexture(),
      screen: wallScreenTexture(),
      art1: artTexture(61, 270),
      art2: artTexture(71, 200),
      glow: glowTexture(),
    }),
    [],
  )
  const screenMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#000', emissive: '#fff', emissiveMap: t.screen, emissiveIntensity: 1.1 }),
    [t],
  )

  return (
    <group>
      {/* corkboard, poster, wall screen, framed art */}
      <Framed position={[-0.82, 1.42, WALL]} size={[0.6, 0.6]} map={t.cork} emissive={0.12} frame="#2a1a10" depth={0.02} />
      <Framed position={[-0.2, 1.52, WALL]} size={[0.38, 0.57]} map={t.poster} emissive={0.7} />
      <Framed position={[-0.84, 1.98, WALL]} size={[0.22, 0.29]} map={t.art1} emissive={0.45} />
      <Framed position={[LEFT_WALL, 1.45, -0.08]} rotation={[0, Math.PI / 2, 0]} size={[0.32, 0.42]} map={t.art2} emissive={0.45} />
      <group position={[0.105, 1.62, WALL]}>
        <mesh>
          <boxGeometry args={[0.215, 0.52, 0.02]} />
          <meshStandardMaterial color="#0b0c12" roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position-z={0.011} material={screenMat}>
          <planeGeometry args={[0.195, 0.495]} />
        </mesh>
      </group>

      {/* neon LED strips */}
      <NeonStrips strips={NEON_STRIPS} glow={t.glow} />

      <FairyLights />

      {/* light the neon casts into the room */}
      <pointLight position={[-1.05, 2.0, -0.42]} color="#ff3df0" intensity={1.4} distance={2.2} decay={2} />
      <pointLight position={[-0.5, 1.0, -0.48]} color="#38e8ff" intensity={0.8} distance={1.3} decay={2} />
      <pointLight position={[0.0, 1.7, -0.15]} color="#8a5cff" intensity={0.7} distance={1.8} decay={2} />
    </group>
  )
}
