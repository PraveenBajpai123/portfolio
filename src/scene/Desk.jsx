import { useMemo } from 'react'
import * as THREE from 'three'
import { woodTexture, screenTexture } from '../lib/textures'
import Gear from './Gear'

export const DESK_TOP = 0.76
const D = { x0: -1.0, x1: 1.2, z0: -0.6, z1: 0.18, t: 0.045 }

export function useMats() {
  return useMemo(() => {
    const wood = woodTexture()
    return {
      wood: new THREE.MeshStandardMaterial({ map: wood, roughness: 0.72, bumpMap: wood, bumpScale: 0.6 }),
      woodDark: new THREE.MeshStandardMaterial({ color: '#2a1c12', roughness: 0.8 }),
      alu: new THREE.MeshStandardMaterial({ color: '#3a3f4a', roughness: 0.35, metalness: 0.8 }),
      keys: new THREE.MeshStandardMaterial({ color: '#16181e', roughness: 0.7 }),
      screen: new THREE.MeshStandardMaterial({
        color: '#000000',
        emissive: '#ffffff',
        emissiveMap: screenTexture(),
        emissiveIntensity: 0.85,
        roughness: 0.3,
      }),
      ceramic: new THREE.MeshStandardMaterial({ color: '#d9d4cc', roughness: 0.35 }),
      coffee: new THREE.MeshStandardMaterial({ color: '#1d0f07', roughness: 0.15 }),
      pot: new THREE.MeshStandardMaterial({ color: '#4a3a33', roughness: 0.9 }),
      soil: new THREE.MeshStandardMaterial({ color: '#1b130d', roughness: 1 }),
      leafInst: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75 }), // tinted per leaf
      notebook: new THREE.MeshStandardMaterial({ color: '#2b211c', roughness: 0.65 }),
      band: new THREE.MeshStandardMaterial({ color: '#0f0c0b', roughness: 0.6 }),
      pen: new THREE.MeshStandardMaterial({ color: '#111216', roughness: 0.3, metalness: 0.6 }),
      gold: new THREE.MeshStandardMaterial({ color: '#c9a050', roughness: 0.3, metalness: 1 }),
      plastic: new THREE.MeshStandardMaterial({ color: '#15161c', roughness: 0.45, metalness: 0.2 }),
    }
  }, [])
}

export function Mug({ m, ...props }) {
  const geo = useMemo(() => {
    const pts = [
      [0, 0], [0.036, 0], [0.04, 0.004], [0.041, 0.09], [0.037, 0.09], [0.036, 0.008], [0, 0.008],
    ].map(([x, y]) => new THREE.Vector2(x, y))
    return new THREE.LatheGeometry(pts, 40)
  }, [])
  return (
    <group {...props}>
      <mesh geometry={geo} material={m.ceramic} castShadow receiveShadow />
      <mesh position-y={0.075} rotation-x={-Math.PI / 2} material={m.coffee}>
        <circleGeometry args={[0.037, 32]} />
      </mesh>
      <mesh position={[0.048, 0.046, 0]} material={m.ceramic} castShadow>
        <torusGeometry args={[0.022, 0.0065, 12, 24, Math.PI * 1.25]} />
      </mesh>
    </group>
  )
}

const leafGeo = new THREE.ConeGeometry(0.012, 1, 6)

export function Plant({ m, scale = 1, seed = 1, ...props }) {
  const leaves = useMemo(() => {
    const out = []
    let s = seed
    const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
    for (let ring = 0; ring < 3; ring++) {
      const n = 6 + ring * 2
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + r() * 0.4 + ring * 0.3
        const tilt = 0.25 + ring * 0.38 + r() * 0.15
        out.push({ a, tilt, len: 0.05 - ring * 0.008 + r() * 0.01, light: r() > 0.5 })
      }
    }
    return out
  }, [seed])
  return (
    <group {...props} scale={scale}>
      <mesh position-y={0.035} material={m.pot} castShadow receiveShadow>
        <cylinderGeometry args={[0.045, 0.035, 0.07, 24]} />
      </mesh>
      <mesh position-y={0.068} material={m.soil}>
        <cylinderGeometry args={[0.041, 0.041, 0.004, 24]} />
      </mesh>
      <instancedMesh
        args={[leafGeo, m.leafInst, leaves.length]}
        position-y={0.07}
        castShadow
        ref={(mesh) => {
          if (!mesh || mesh.userData.done) return
          const mtx = new THREE.Matrix4()
          const rot = new THREE.Matrix4()
          const tilt = new THREE.Matrix4()
          const lift = new THREE.Matrix4()
          const scl = new THREE.Matrix4()
          const dark = new THREE.Color('#3f6146')
          const light = new THREE.Color('#58805a')
          leaves.forEach((l, i) => {
            rot.makeRotationY(l.a)
            tilt.makeRotationZ(-l.tilt)
            lift.makeTranslation(0, l.len, 0)
            scl.makeScale(1, l.len * 2, 0.55)
            mtx.copy(rot).multiply(tilt).multiply(lift).multiply(scl)
            mesh.setMatrixAt(i, mtx)
            mesh.setColorAt(i, l.light ? light : dark)
          })
          mesh.instanceMatrix.needsUpdate = true
          mesh.instanceColor.needsUpdate = true
          mesh.computeBoundingSphere()
          mesh.userData.done = true
        }}
      />
    </group>
  )
}

export function Laptop({ m, ...props }) {
  return (
    <group {...props}>
      <mesh position-y={0.006} material={m.alu} castShadow receiveShadow>
        <boxGeometry args={[0.32, 0.012, 0.22]} />
      </mesh>
      <mesh position={[0, 0.0125, 0.015]} material={m.keys}>
        <boxGeometry args={[0.28, 0.001, 0.1]} />
      </mesh>
      <group position={[0, 0.012, -0.11]} rotation-x={-0.32}>
        <mesh position={[0, 0.105, -0.004]} material={m.alu} castShadow>
          <boxGeometry args={[0.32, 0.21, 0.008]} />
        </mesh>
        <mesh position={[0, 0.107, 0.0005]} material={m.screen}>
          <planeGeometry args={[0.296, 0.185]} />
        </mesh>
      </group>
    </group>
  )
}

function Notebook({ m, ...props }) {
  return (
    <group {...props}>
      <mesh position-y={0.009} material={m.notebook} castShadow receiveShadow>
        <boxGeometry args={[0.15, 0.018, 0.21]} />
      </mesh>
      <mesh position={[0.05, 0.0095, 0]} material={m.band}>
        <boxGeometry args={[0.008, 0.0195, 0.212]} />
      </mesh>
      <group position={[-0.02, 0.022, 0.01]} rotation={[0, 0.5, Math.PI / 2]}>
        <mesh material={m.pen} castShadow>
          <cylinderGeometry args={[0.0045, 0.0045, 0.14, 12]} />
        </mesh>
        <mesh position-y={0.072} material={m.gold}>
          <coneGeometry args={[0.0045, 0.012, 12]} />
        </mesh>
      </group>
    </group>
  )
}

export default function Desk() {
  const m = useMats()
  const w = D.x1 - D.x0
  const d = D.z1 - D.z0
  const cx = (D.x0 + D.x1) / 2
  const cz = (D.z0 + D.z1) / 2
  const legH = DESK_TOP - D.t
  const legs = [
    [D.x0 + 0.06, D.z0 + 0.06],
    [D.x1 - 0.06, D.z0 + 0.06],
    [D.x0 + 0.06, D.z1 - 0.06],
    [D.x1 - 0.06, D.z1 - 0.06],
  ]
  return (
    <group>
      <mesh position={[cx, DESK_TOP - D.t / 2, cz]} material={m.wood} castShadow receiveShadow>
        <boxGeometry args={[w, D.t, d]} />
      </mesh>
      <mesh position={[cx, DESK_TOP - D.t - 0.04, D.z1 - 0.03]} material={m.woodDark} castShadow>
        <boxGeometry args={[w - 0.14, 0.08, 0.02]} />
      </mesh>
      {legs.map(([x, z], i) => (
        <mesh key={i} position={[x, legH / 2, z]} material={m.woodDark} castShadow receiveShadow>
          <boxGeometry args={[0.055, legH, 0.055]} />
        </mesh>
      ))}

      <group position-y={DESK_TOP}>
        <Laptop m={m} position={[-0.8, 0, -0.16]} rotation-y={0.55} />
        <Mug m={m} position={[-0.27, 0, 0.08]} rotation-y={-2.4} />
        <Plant m={m} position={[-0.9, 0, -0.48]} seed={3} />
        <Notebook m={m} position={[0.68, 0, 0.02]} rotation-y={-0.35} />
        <Gear m={m} />
      </group>
    </group>
  )
}
