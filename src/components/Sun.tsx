import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending } from 'three';
import Selectable from './Selectable';
import { BODIES } from '../store/bodies';

const SUN_TILT = 7.25 * Math.PI / 180;

// ── Animated plasma surface ────────────────────────────────────────────────────

const surfaceVert = /* glsl */`
  varying vec3 vPos;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vPos     = position;
    vNormal  = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const surfaceFrag = /* glsl */`
  uniform float uTime;
  varying vec3 vPos;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vec3 p = normalize(vPos);
    float t = uTime;

    // Slow plasma flow — domain warp displaces the sample point over time
    vec3 q = p + 0.12 * vec3(
      sin(p.y * 3.1 + t * 0.20),
      sin(p.z * 2.9 + t * 0.18),
      sin(p.x * 3.7 + t * 0.22)
    );

    // Three-octave plasma: products of sines create cellular granulation
    // Large granules (slow), medium features, fine detail (fastest)
    float c1 = sin(q.x * 5.1 + t * 0.15) * sin(q.y * 4.7 + t * 0.12) * sin(q.z * 6.3 + t * 0.18);
    float c2 = sin(q.x * 8.3 + t * 0.10) * sin(q.y * 9.1 + t * 0.08) * sin(q.z * 7.7 + t * 0.11);
    float c3 = sin(q.x * 13.7 + t * 0.06) * sin(q.y * 11.9 + t * 0.05) * sin(q.z * 14.3 + t * 0.07);

    float plasma = (c1 * 0.55 + c2 * 0.30 + c3 * 0.15) * 0.5 + 0.5;

    // pow < 1 flattens peaks toward white — brighter cell tops dominate
    float cell = pow(plasma, 0.65);

    // Warm yellow–orange–white palette
    vec3 dark   = vec3(0.82, 0.35, 0.05); // dark channels — deep orange
    vec3 mid    = vec3(0.98, 0.72, 0.20); // plasma body   — golden yellow
    vec3 bright = vec3(1.00, 0.96, 0.78); // cell peaks    — near-white

    vec3 color = cell < 0.5
      ? mix(dark, mid, cell * 2.0)
      : mix(mid, bright, (cell - 0.5) * 2.0);

    // Mild limb darkening — exponent 0.4 keeps the limb warmer than a blackbody
    float ndv = max(dot(vNormal, vViewDir), 0.0);
    color *= (0.75 + 0.25 * pow(ndv, 0.4));

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ── Animated corona ────────────────────────────────────────────────────────────

const coronaVert = /* glsl */`
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPosition.xyz);
    vNormal  = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const coronaFrag = /* glsl */`
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    float rim = 1.0 - max(dot(vNormal, vViewDir), 0.0);

    // Angular wisp modulation — slow independent frequencies around each axis
    float wisp = sin(vNormal.y * 12.0 + uTime * 0.25)
               * sin(vNormal.z *  9.0 + uTime * 0.18)
               * 0.5 + 0.5;

    // Two faint prominence bumps drifting independently
    float dy1  = vNormal.y - sin(uTime * 0.13 + 1.2) * 0.30;
    float dz2  = vNormal.z - sin(uTime * 0.17 + 2.8) * 0.28;
    float prom = max(
      exp(-(dy1 * dy1) * 28.0),
      exp(-(dz2 * dz2) * 22.0)
    ) * 0.18 * (1.0 - rim * rim); // only visible at the edge, never at the centre

    // Slow gentle breathing
    float breathe = 1.0 + 0.06 * sin(uTime * 0.35);

    float alpha = smoothstep(0.0, 0.5, rim) * (1.0 - rim) * 0.5;
    alpha = alpha * breathe * (0.85 + 0.15 * wisp) + prom;

    vec3 color = mix(vec3(1.0, 0.98, 0.85), vec3(1.0, 0.78, 0.2), rim);
    gl_FragColor = vec4(color, alpha);
  }
`;

export default function Sun() {
  const surfaceUniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  const coronaUniforms  = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame((_state, delta) => {
    surfaceUniforms.uTime.value += delta;
    coronaUniforms.uTime.value  += delta;
  });

  return (
    <group>
      <group rotation={[0, 0, SUN_TILT]}>
        <Selectable body={BODIES.SUN}>

          {/* Animated plasma surface */}
          <mesh>
            <sphereGeometry args={[0.9, 64, 64]} />
            <shaderMaterial
              uniforms={surfaceUniforms}
              vertexShader={surfaceVert}
              fragmentShader={surfaceFrag}
            />
          </mesh>

          {/* Animated corona — breathing, wisps, faint prominences */}
          <mesh>
            <sphereGeometry args={[1.3, 64, 32]} />
            <shaderMaterial
              uniforms={coronaUniforms}
              vertexShader={coronaVert}
              fragmentShader={coronaFrag}
              transparent
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>

        </Selectable>
      </group>

      <pointLight color="#FFF4D6" intensity={80} distance={600} decay={2} />
    </group>
  );
}
