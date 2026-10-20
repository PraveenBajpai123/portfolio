import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { DESK_TOP } from './Desk'
import { scroll } from '../store'

// Architect desk lamp built from primitives, with a warm spotlight aimed at the book.

const BASE = new THREE.Vector3(-0.47, DESK_TOP, -0.38)
const SHOULDER = BASE.clone().add(new THREE.Vector3(0, 0.04, 0))
const ELBOW = new THREE.Vector3(-0.53, 1.17, -0.47)
const HEAD = new THREE.Vector3(-0.25, 1.31, -0.31)

function Rod({ a, b, r = 0.0045, material, offset = [0, 0, 0] }) {
  const { pos, quat, len } = useMemo(() => {
    const o = new THREE.Vector3(...offset)
    const A = a.clone().add(o)
    const B = b.clone().add(o)
    const dir = B.clone().sub(A)
    const len = dir.length()
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
    return { pos: A.add(B).multiplyScalar(0.5), quat, len }
  }, [a, b, offset])
  return (
    <mesh position={pos} quaternion={quat} material={material} castShadow>
      <cylinderGeometry args={[r, r, len, 10]} />
    </mesh>
  )
}

const CONE_FRAG = /* glsl */ `
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vNormalV;
varying vec3 vViewDir;
void main() {
  float along = 1.0 - vUv.y;                 // 0 at the shade, 1 at the desk
  float rim = pow(abs(dot(normalize(vNormalV), normalize(vViewDir))), 1.6);
  float a = uOpacity * rim * (1.0 - along * 0.85) * smoothstep(0.0, 0.08, along);
  gl_FragColor = vec4(vec3(1.0, 0.72, 0.42) * a, a);
}
`
const CONE_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalV;
varying vec3 vViewDir;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormalV = normalMatrix * normal;
  vViewDir = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`

export default function Lamp({ aim }) {
  const coneMat = useRef()
  const spot = useRef()
  const mats = useMemo(
    () => ({
      metal: new THREE.MeshStandardMaterial({ color: '#16171b', roughness: 0.38, metalness: 0.75 }),
      joint: new THREE.MeshStandardMaterial({ color: '#2a2b31', roughness: 0.3, metalness: 0.9 }),
      inner: new THREE.MeshStandardMaterial({
        color: '#f3e3c6',
        emissive: '#ffcf8a',
        emissiveIntensity: 0.9,
        roughness: 0.6,
        side: THREE.BackSide,
      }),
      bulb: new THREE.MeshStandardMaterial({
        color: '#fff3dc',
        emissive: '#ffd59a',
        emissiveIntensity: 9,
        toneMapped: false,
      }),
      spring: new THREE.MeshStandardMaterial({ color: '#6b6e76', roughness: 0.3, metalness: 1 }),
    }),
    [],
  )

  const { shadeQuat, dir, target, shade, cone } = useMemo(() => {
    const dir = aim.clone().sub(HEAD).normalize()
    const shadeQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir)
    const target = new THREE.Object3D()
    target.position.copy(aim)
    const profile = [
      [0.013, -0.02], [0.016, 0.02], [0.03, 0.04], [0.058, 0.085], [0.083, 0.145], [0.085, 0.15],
    ].map(([r, y]) => new THREE.Vector2(r, y))
    const shade = new THREE.LatheGeometry(profile, 48)
    shade.rotateX(Math.PI / 2)
    const coneLen = HEAD.distanceTo(aim) - 0.12
    const cone = { len: coneLen, quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir) }
    return { shadeQuat, dir, target, shade, cone }
  }, [aim])

  const mouth = HEAD.clone().add(dir.clone().multiplyScalar(0.15))
  const lightPos = HEAD.clone().add(dir.clone().multiplyScalar(0.07))
  const conePos = mouth.clone().add(dir.clone().multiplyScalar(cone.len / 2))

  useFrame(() => {
    // fade the light cone out while the camera is close to the book
    const focus = scroll.focus || 0
    if (coneMat.current) coneMat.current.uniforms.uOpacity.value = 0.2 * (1 - focus)
    // dim the lamp while reading so its hot spot never washes out the pages
    if (spot.current) spot.current.intensity = 2.3 * (1 - 0.6 * focus)
  })

  return (
    <group>
      {/* base */}
      <mesh position={[BASE.x, BASE.y + 0.008, BASE.z]} material={mats.metal} castShadow receiveShadow>
        <cylinderGeometry args={[0.075, 0.082, 0.016, 40]} />
      </mesh>
      <mesh position={SHOULDER} material={mats.joint} castShadow>
        <sphereGeometry args={[0.016, 16, 16]} />
      </mesh>
      {/* lower and upper arms: double rods with springs */}
      <Rod a={SHOULDER} b={ELBOW} material={mats.metal} offset={[0, 0, 0.011]} />
      <Rod a={SHOULDER} b={ELBOW} material={mats.metal} offset={[0, 0, -0.011]} />
      <Rod a={SHOULDER} b={ELBOW} r={0.0028} material={mats.spring} offset={[0.022, 0, 0]} />
      <mesh position={ELBOW} material={mats.joint} castShadow>
        <sphereGeometry args={[0.014, 16, 16]} />
      </mesh>
      <Rod a={ELBOW} b={HEAD} material={mats.metal} offset={[0, 0.0, 0.011]} />
      <Rod a={ELBOW} b={HEAD} material={mats.metal} offset={[0, 0.0, -0.011]} />
      <Rod a={ELBOW} b={HEAD} r={0.0028} material={mats.spring} offset={[0, 0.02, 0]} />
      {/* shade */}
      <group position={HEAD} quaternion={shadeQuat}>
        <mesh material={mats.joint} castShadow>
          <sphereGeometry args={[0.018, 16, 16]} />
        </mesh>
        <mesh geometry={shade} material={mats.metal} castShadow />
        <mesh geometry={shade} material={mats.inner} scale={0.985} />
        <mesh position-z={0.085} material={mats.bulb}>
          <sphereGeometry args={[0.022, 24, 24]} />
        </mesh>
      </group>

      <primitive object={target} />
      <spotLight
        ref={spot}
        position={lightPos}
        target={target}
        color="#ffd6a8"
        intensity={2.3}
        angle={0.62}
        penumbra={0.75}
        distance={4}
        decay={2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.01}
        shadow-camera-near={0.05}
        shadow-camera-far={3}
      />

      {/* soft volumetric cone + dust in the lamp light */}
      <mesh position={conePos} quaternion={cone.quat} renderOrder={3}>
        <coneGeometry args={[0.36, cone.len, 48, 1, true]} />
        <shaderMaterial
          ref={coneMat}
          uniforms={{ uOpacity: { value: 0.2 } }}
          vertexShader={CONE_VERT}
          fragmentShader={CONE_FRAG}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.FrontSide}
        />
      </mesh>
      <Sparkles
        count={45}
        position={[(HEAD.x + aim.x) / 2, (HEAD.y + aim.y) / 2 + 0.02, (HEAD.z + aim.z) / 2]}
        scale={[0.5, 0.45, 0.45]}
        size={0.35}
        speed={0.18}
        opacity={0.7}
        color="#ffd29a"
        noise={0.6}
      />
    </group>
  )
}
