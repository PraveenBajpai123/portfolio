import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { wind } from '../lib/wind'
import { curtainAlphaTexture } from '../lib/textures'

// A sheer curtain: a finely subdivided plane hung from its top edge. A vertex shader
// (injected into a standard material so scene lights still apply) pushes it into the
// room with the shared gust value; normals are rebuilt from the displaced surface.

const DISPLACE = /* glsl */ `
uniform float uTime;
uniform float uGust;
uniform float uHeight;
uniform float uSide;
uniform float uSeed;
uniform float uCalm;

vec3 displaceCurtain(vec3 p) {
  float hang = clamp(-p.y / uHeight, 0.0, 1.0);   // 0 at the rod, 1 at the hem
  float h2 = hang * hang;
  float g = uGust * uCalm;
  float t = uTime;
  float pleat = sin(p.x * 62.0 + uSeed) * 0.011 * (0.55 + 0.45 * hang);
  float wave = sin(p.y * 4.2 - t * 1.6 + p.x * 3.0 + uSeed) * 0.6
             + sin(p.y * 9.0 - t * 2.7 + p.x * 7.0 + uSeed * 2.0) * 0.25
             + sin(p.x * 5.0 + t * 1.1) * 0.15;
  vec3 d = vec3(0.0);
  d.z = pleat + h2 * (0.03 + g * 0.34) * (0.78 + 0.22 * wave) + h2 * wave * 0.035 * (0.35 + g);
  d.x = uSide * h2 * g * 0.11 * (0.85 + 0.15 * sin(t * 0.9 + uSeed)) + h2 * sin(t * 1.3 + p.y * 3.0 + uSeed) * 0.014 * uCalm;
  d.y = h2 * g * 0.07;
  return p + d;
}
`

export default function Curtain({ width = 0.45, height = 1.2, side = 1, seed = 0, calm = 1, ...props }) {
  const { geometry, material } = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(width, height, 36, 64)
    geometry.translate(0, -height / 2, 0)
    const uniforms = {
      uTime: { value: 0 },
      uGust: { value: 0.4 },
      uHeight: { value: height },
      uSide: { value: side },
      uSeed: { value: seed },
      uCalm: { value: calm },
    }
    const material = new THREE.MeshStandardMaterial({
      color: '#dfe6f7',
      emissive: '#6d7fae',
      emissiveIntensity: 0.32,
      roughness: 0.95,
      transparent: true,
      opacity: 0.62,
      alphaMap: curtainAlphaTexture(),
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms)
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${DISPLACE}`)
        .replace(
          '#include <beginnormal_vertex>',
          `vec3 cp0 = displaceCurtain(position);
           vec3 cpx = displaceCurtain(position + vec3(0.01, 0.0, 0.0));
           vec3 cpy = displaceCurtain(position + vec3(0.0, 0.01, 0.0));
           vec3 objectNormal = normalize(cross(cpx - cp0, cpy - cp0));
           #ifdef USE_TANGENT
             vec3 objectTangent = vec3(tangent.xyz);
           #endif`,
        )
        .replace('#include <begin_vertex>', 'vec3 transformed = cp0;')
    }
    material.userData.uniforms = uniforms
    return { geometry, material }
  }, [width, height, side, seed, calm])

  useFrame(() => {
    const u = material.userData.uniforms
    u.uTime.value = wind.time
    u.uGust.value = wind.gust
  })

  return <mesh geometry={geometry} material={material} renderOrder={2} {...props} />
}
