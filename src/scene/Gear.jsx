import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Laptop, Mug, Plant } from './Desk'
import { clockTexture, rainbowTexture } from '../lib/decor'

// Desk gear (positions are relative to the desk surface): RGB keyboard and mouse,
// headphones, figurines, a digital clock, a second laptop, cables and a gaming chair.

function useRgb() {
  return useMemo(() => {
    const map = rainbowTexture()
    const glow = new THREE.MeshBasicMaterial({ map, color: new THREE.Color(2.2, 2.2, 2.2), toneMapped: false })
    return { map, glow }
  }, [])
}

function Keyboard({ m, rgb, ...props }) {
  const ref = useRef()
  const cols = 15
  const rows = 5
  const pitch = 0.0225
  const w = cols * pitch + 0.012
  const d = rows * pitch + 0.012
  const onInit = (mesh) => {
    if (!mesh || mesh.userData.done) return
    const mtx = new THREE.Matrix4()
    let i = 0
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wide = r === rows - 1 && c > 4 && c < 10
        if (wide && c !== 7) {
          mtx.makeScale(0, 0, 0)
        } else {
          const sx = wide ? 5.4 : 1
          mtx.makeScale(sx, 1, 1)
          mtx.setPosition(-w / 2 + 0.006 + pitch / 2 + c * pitch, 0.022, -d / 2 + 0.006 + pitch / 2 + r * pitch)
        }
        mesh.setMatrixAt(i++, mtx)
      }
    }
    mesh.instanceMatrix.needsUpdate = true
    mesh.userData.done = true
  }
  return (
    <group {...props}>
      <mesh position-y={0.008} material={m.plastic} castShadow receiveShadow>
        <boxGeometry args={[w, 0.016, d]} />
      </mesh>
      {/* backlight plate glowing between the keys */}
      <mesh position-y={0.0165} rotation-x={-Math.PI / 2} material={rgb.glow}>
        <planeGeometry args={[w - 0.008, d - 0.008]} />
      </mesh>
      {/* underglow strip along the front edge */}
      <mesh position={[0, 0.003, d / 2 + 0.001]} material={rgb.glow}>
        <planeGeometry args={[w, 0.005]} />
      </mesh>
      <instancedMesh ref={(r) => { ref.current = r; onInit(r) }} args={[null, null, cols * rows]} castShadow>
        <boxGeometry args={[0.018, 0.009, 0.018]} />
        <meshStandardMaterial color="#1e2029" roughness={0.55} />
      </instancedMesh>
    </group>
  )
}

function Mouse({ m, rgb, ...props }) {
  return (
    <group {...props}>
      <mesh position-y={0.014} scale={[0.032, 0.017, 0.054]} material={m.plastic} castShadow>
        <sphereGeometry args={[1, 24, 16]} />
      </mesh>
      <mesh position-y={0.004} rotation-x={Math.PI / 2} scale={[1, 1.65, 1]} material={rgb.glow}>
        <torusGeometry args={[0.031, 0.0022, 6, 40]} />
      </mesh>
      <mesh position={[0, 0.03, -0.02]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.004, 0.004, 0.007, 12]} />
        <meshStandardMaterial color="#2c2f3a" />
      </mesh>
    </group>
  )
}

function Headphones({ m, ...props }) {
  return (
    <group {...props}>
      <mesh position-y={0.012} rotation-x={-Math.PI / 2} material={m.plastic} castShadow>
        <torusGeometry args={[0.072, 0.008, 10, 40, Math.PI]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.074, 0.018, 0.0]}>
          <mesh material={m.plastic} castShadow>
            <cylinderGeometry args={[0.036, 0.036, 0.034, 28]} />
          </mesh>
          <mesh position-y={0.0175}>
            <torusGeometry args={[0.03, 0.0025, 6, 28]} />
            <meshBasicMaterial color={new THREE.Color(1.6, 0.5, 2.4)} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Figurine({ shirt, skin = '#f1c9a5', hair, beard = false, ...props }) {
  return (
    <group {...props}>
      <mesh position-y={0.004} castShadow>
        <cylinderGeometry args={[0.024, 0.026, 0.008, 24]} />
        <meshStandardMaterial color="#1a1a22" roughness={0.4} />
      </mesh>
      <mesh position-y={0.03} castShadow>
        <capsuleGeometry args={[0.016, 0.02, 6, 16]} />
        <meshStandardMaterial color={shirt} roughness={0.6} />
      </mesh>
      <mesh position-y={0.072} castShadow>
        <sphereGeometry args={[0.024, 24, 18]} />
        <meshStandardMaterial color={skin} roughness={0.55} />
      </mesh>
      {hair && (
        <mesh position-y={0.078} scale={[1.04, 0.75, 1.04]}>
          <sphereGeometry args={[0.024, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={hair} roughness={0.7} />
        </mesh>
      )}
      {beard && (
        <mesh position={[0, 0.062, 0.008]} scale={[1, 0.8, 0.9]}>
          <sphereGeometry args={[0.022, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          <meshStandardMaterial color={hair} roughness={0.8} />
        </mesh>
      )}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.008, 0.075, 0.022]}>
          <sphereGeometry args={[0.0032, 8, 8]} />
          <meshBasicMaterial color="#111" />
        </mesh>
      ))}
    </group>
  )
}

function Clock({ ...props }) {
  const clock = useMemo(() => clockTexture(), [])
  const last = useRef(0)
  useFrame((state) => {
    if (state.clock.elapsedTime - last.current > 15) {
      last.current = state.clock.elapsedTime
      clock.update()
    }
  })
  return (
    <group {...props}>
      <RoundedBox args={[0.12, 0.055, 0.04]} radius={0.008} position-y={0.0275} castShadow>
        <meshStandardMaterial color="#0d0e13" roughness={0.3} metalness={0.4} />
      </RoundedBox>
      <mesh position={[0, 0.0285, 0.0205]}>
        <planeGeometry args={[0.104, 0.043]} />
        <meshBasicMaterial map={clock.texture} color={new THREE.Color(1.6, 1.6, 1.6)} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Cable({ points, radius = 0.003 }) {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)))
    return new THREE.TubeGeometry(curve, 48, radius, 6, false)
  }, [points, radius])
  return (
    <mesh geometry={geo} castShadow>
      <meshStandardMaterial color="#0c0c10" roughness={0.6} />
    </mesh>
  )
}

function Chair(props) {
  const fabric = '#17141f'
  return (
    <group {...props}>
      {/* star base + gas lift */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position-y={0.05} rotation-y={(i / 5) * Math.PI * 2}>
          <boxGeometry args={[0.04, 0.03, 0.56]} />
          <meshStandardMaterial color="#111" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      <mesh position-y={0.25}>
        <cylinderGeometry args={[0.025, 0.03, 0.4, 16]} />
        <meshStandardMaterial color="#222" metalness={0.8} roughness={0.3} />
      </mesh>
      <RoundedBox args={[0.5, 0.09, 0.48]} radius={0.04} position-y={0.48} castShadow receiveShadow>
        <meshStandardMaterial color={fabric} roughness={0.85} />
      </RoundedBox>
      <group position={[0, 0.88, 0.22]} rotation-x={0.12}>
        <RoundedBox args={[0.48, 0.7, 0.09]} radius={0.04} castShadow receiveShadow>
          <meshStandardMaterial color={fabric} roughness={0.85} />
        </RoundedBox>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.14, 0, 0.047]}>
            <boxGeometry args={[0.035, 0.6, 0.004]} />
            <meshStandardMaterial color="#7a3cff" emissive="#5a22d6" emissiveIntensity={0.6} roughness={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

export default function Gear({ m }) {
  const rgb = useRgb()
  useFrame((_, dt) => {
    rgb.map.offset.x = (rgb.map.offset.x + dt * 0.12) % 1
  })
  return (
    <group>
      <Keyboard m={m} rgb={rgb} position={[-0.5, 0, -0.13]} rotation-y={0.08} />
      <Mouse m={m} rgb={rgb} position={[0.37, 0, -0.07]} rotation-y={-0.15} />
      <Headphones m={m} position={[-0.56, 0, 0.09]} rotation-y={0.4} />
      <Figurine shirt="#6d3cff" hair="#2a1b12" position={[-0.27, 0, -0.5]} rotation-y={0.3} />
      <Figurine shirt="#ff8a3d" hair="#3b2416" beard position={[-0.17, 0, -0.53]} rotation-y={-0.1} />
      <Clock position={[-0.66, 0, -0.47]} rotation-y={0.25} />
      <Laptop m={m} position={[0.47, 0, -0.42]} rotation-y={-0.3} />
      <Mug m={m} position={[0.7, 0, -0.27]} rotation-y={-1.2} />
      <Plant m={m} position={[1.05, 0.22, -0.63]} scale={0.9} seed={11} />
      <Cable points={[[-0.5, 0.004, -0.2], [-0.45, 0.004, -0.33], [-0.3, 0.004, -0.42], [-0.05, 0.004, -0.58]]} />
      <Cable points={[[0.38, 0.004, -0.12], [0.33, 0.004, -0.22], [0.38, 0.004, -0.3], [0.52, 0.004, -0.33]]} />
      <Chair position={[1.3, -0.76, 0.6]} rotation-y={-0.75} />
    </group>
  )
}
