import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { plasterTexture } from '../lib/textures'
import Curtain from './Curtain'

// Back wall with a window opening, frame, sill, night sky, rod and two curtains.
export const WIN = { x0: 0.3, x1: 1.2, y0: 0.98, y1: 2.05 }
const WALL_Z = -0.62
const WALL_T = 0.12

const SKY_FRAG = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec2 uv = vUv;
  vec3 top = vec3(0.03, 0.03, 0.12);
  vec3 hor = vec3(0.22, 0.09, 0.38);
  vec3 col = mix(hor, top, smoothstep(0.1, 0.8, uv.y));
  // stars
  vec2 g = uv * vec2(240.0, 170.0);
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float h = hash(id);
  vec2 off = (vec2(hash(id + 1.3), hash(id + 7.1)) - 0.5) * 0.6;
  float star = step(0.982, h) * smoothstep(0.09, 0.0, length(f + off));
  star *= 0.55 + 0.45 * sin(uTime * (0.8 + h * 2.5) + h * 40.0);
  col += star * vec3(0.85, 0.9, 1.0) * smoothstep(0.24, 0.5, uv.y);
  // moon + halo
  vec2 d = (uv - vec2(0.63, 0.67)) * vec2(5.0 / 3.5, 1.0);
  float r = length(d);
  col += vec3(0.5, 0.62, 0.95) * 0.42 * exp(-r * 8.0);
  float disc = smoothstep(0.03, 0.026, r);
  float crater = 0.06 * sin(d.x * 160.0) * sin(d.y * 140.0);
  col = mix(col, vec3(0.93, 0.95, 1.0) - crater, disc);
  // city skyline: two layers of buildings with lit windows and neon signs
  for (int layer = 0; layer < 2; layer++) {
    float fl = float(layer);
    float cols = 26.0 + fl * 14.0;
    float bx = floor(uv.x * cols + fl * 7.3);
    float hb = hash(vec2(bx, fl + 3.0));
    float height = (fl < 0.5 ? 0.3 : 0.2) + hb * (fl < 0.5 ? 0.28 : 0.16);
    if (uv.y < height) {
      vec3 bcol = fl < 0.5 ? vec3(0.035, 0.025, 0.08) : vec3(0.015, 0.01, 0.035);
      // windows
      vec2 wg = vec2(fract(uv.x * cols + fl * 7.3) * 5.0, uv.y * 95.0);
      vec2 wid = vec2(floor(wg.x), floor(wg.y)) + bx * 13.0;
      vec2 wf = fract(wg);
      float lit = step(0.62, hash(wid + fl)) * step(0.25, wf.x) * step(wf.x, 0.75) * step(0.3, wf.y) * step(wf.y, 0.8);
      lit *= step(1.0, wg.x) * step(wg.x, 4.0) * step(uv.y, height - 0.012);
      vec3 wc = mix(vec3(1.0, 0.75, 0.4), vec3(0.5, 0.85, 1.0), step(0.5, hash(wid + 9.0)));
      float flicker = 0.75 + 0.25 * sin(uTime * 0.7 + hash(wid) * 30.0);
      bcol += lit * wc * 0.9 * flicker * (fl < 0.5 ? 0.6 : 1.0);
      // neon signs on some front buildings
      if (fl > 0.5 && hb > 0.7) {
        float sy = height - 0.045;
        float sign = step(abs(uv.y - sy), 0.012) * step(0.2, fract(uv.x * cols)) * step(fract(uv.x * cols), 0.8);
        vec3 nc = hash(vec2(bx, 5.0)) > 0.5 ? vec3(1.0, 0.25, 0.85) : vec3(0.2, 0.95, 1.0);
        bcol += sign * nc * (2.2 + 0.6 * sin(uTime * 2.0 + bx));
      }
      col = bcol;
    }
  }
  // purple haze above the city
  col += vec3(0.45, 0.12, 0.55) * 0.12 * smoothstep(0.65, 0.25, uv.y);
  gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0); // composer expects linear
}
`
const SKY_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`

function Box({ from, to, material, cast = true, receive = true }) {
  const size = [to[0] - from[0], to[1] - from[1], to[2] - from[2]]
  const pos = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2]
  return (
    <mesh position={pos} material={material} castShadow={cast} receiveShadow={receive}>
      <boxGeometry args={size} />
    </mesh>
  )
}

export default function Room({ calm = 1 }) {
  const mats = useMemo(() => {
    const plaster = plasterTexture()
    return {
      wall: new THREE.MeshStandardMaterial({ map: plaster, color: '#5b4f8f', roughness: 1 }),
      frame: new THREE.MeshStandardMaterial({ color: '#c8cfdc', roughness: 0.55 }),
      floor: new THREE.MeshStandardMaterial({ color: '#16110d', roughness: 0.8 }),
      rod: new THREE.MeshStandardMaterial({ color: '#15151a', roughness: 0.4, metalness: 0.7 }),
      sky: new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 } }, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG }),
    }
  }, [])

  useFrame((state) => {
    mats.sky.uniforms.uTime.value = state.clock.elapsedTime
  })

  const z0 = WALL_Z - WALL_T
  const z1 = WALL_Z
  const { x0, x1, y0, y1 } = WIN
  const fz0 = z0 + 0.02
  const fz1 = z1 + 0.012
  const ft = 0.045 // frame thickness

  return (
    <group>
      {/* floor */}
      <mesh rotation-x={-Math.PI / 2} material={mats.floor} receiveShadow>
        <planeGeometry args={[8, 8]} />
      </mesh>
      {/* back wall around the window opening */}
      <Box from={[-3, 0, z0]} to={[x0, 3.4, z1]} material={mats.wall} />
      <Box from={[x1, 0, z0]} to={[3.5, 3.4, z1]} material={mats.wall} />
      <Box from={[x0, 0, z0]} to={[x1, y0, z1]} material={mats.wall} />
      <Box from={[x0, y1, z0]} to={[x1, 3.4, z1]} material={mats.wall} />
      {/* left wall */}
      <Box from={[-1.45, 0, -3]} to={[-1.35, 3.4, 3]} material={mats.wall} />

      {/* window frame */}
      <Box from={[x0, y0, fz0]} to={[x0 + ft, y1, fz1]} material={mats.frame} />
      <Box from={[x1 - ft, y0, fz0]} to={[x1, y1, fz1]} material={mats.frame} />
      <Box from={[x0, y1 - ft, fz0]} to={[x1, y1, fz1]} material={mats.frame} />
      <Box from={[x0, y0, fz0]} to={[x1, y0 + ft, fz1]} material={mats.frame} />
      {/* mullions */}
      <Box from={[(x0 + x1) / 2 - 0.015, y0, fz0 + 0.03]} to={[(x0 + x1) / 2 + 0.015, y1, fz0 + 0.06]} material={mats.frame} />
      <Box from={[x0, 1.66, fz0 + 0.03]} to={[x1, 1.69, fz0 + 0.06]} material={mats.frame} />
      {/* sill */}
      <Box from={[x0 - 0.06, y0 - 0.03, z0]} to={[x1 + 0.06, y0, z1 + 0.07]} material={mats.frame} />

      {/* night sky outside */}
      <mesh position={[0.75, 1.6, -2.6]} material={mats.sky}>
        <planeGeometry args={[5, 3.5]} />
      </mesh>

      {/* curtain rod + curtains */}
      <mesh position={[0.75, 2.17, -0.57]} rotation-z={Math.PI / 2} material={mats.rod}>
        <cylinderGeometry args={[0.009, 0.009, 1.5, 12]} />
      </mesh>
      <Curtain position={[0.33, 2.15, -0.585]} width={0.5} height={1.18} side={-1} seed={0.0} calm={calm} />
      <Curtain position={[1.18, 2.15, -0.585]} width={0.5} height={1.18} side={1} seed={2.3} calm={calm} />
    </group>
  )
}
