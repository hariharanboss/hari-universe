import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferGeometry, BufferAttribute } from 'three';

// Three depth layers — each with its own radius band, size range, and brightness
const NEAR_COUNT = 200;  // r 20–55  — smaller, slightly brighter
const MID_COUNT  = 260;  // r 55–100 — medium
const FAR_COUNT  = 140;  // r 100–155 — larger apparent size, very faint
const TOTAL      = NEAR_COUNT + MID_COUNT + FAR_COUNT;

function buildDustGeometry() {
  const positions   = new Float32Array(TOTAL * 3);
  const sizes       = new Float32Array(TOTAL);
  const brightnesses = new Float32Array(TOTAL);
  const phases      = new Float32Array(TOTAL);
  const drifts      = new Float32Array(TOTAL * 3);

  let idx = 0;

  const addLayer = (
    count: number,
    rMin: number, rMax: number,
    szMin: number, szMax: number,
    briMin: number, briMax: number,
  ) => {
    for (let i = 0; i < count; i++, idx++) {
      const phi   = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * 2 * Math.PI;
      const r     = rMin + Math.random() * (rMax - rMin);
      positions[idx * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[idx * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[idx * 3 + 2] = r * Math.cos(phi);

      sizes[idx]        = szMin  + Math.random() * (szMax  - szMin);
      brightnesses[idx] = briMin + Math.random() * (briMax - briMin);
      phases[idx]       = Math.random() * Math.PI * 2;

      // Random unit vector for drift direction
      const da = Math.random() * Math.PI * 2;
      const db = Math.acos(2 * Math.random() - 1);
      drifts[idx * 3]     = Math.sin(db) * Math.cos(da);
      drifts[idx * 3 + 1] = Math.sin(db) * Math.sin(da);
      drifts[idx * 3 + 2] = Math.cos(db);
    }
  };

  addLayer(NEAR_COUNT,  20,  55, 0.06, 0.14, 0.08, 0.18);
  addLayer(MID_COUNT,   55, 100, 0.14, 0.28, 0.04, 0.12);
  addLayer(FAR_COUNT,  100, 155, 0.26, 0.46, 0.02, 0.07);

  const geo = new BufferGeometry();
  geo.setAttribute('position',     new BufferAttribute(positions,    3));
  geo.setAttribute('aSize',        new BufferAttribute(sizes,        1));
  geo.setAttribute('aBrightness',  new BufferAttribute(brightnesses, 1));
  geo.setAttribute('aPhase',       new BufferAttribute(phases,       1));
  geo.setAttribute('aDrift',       new BufferAttribute(drifts,       3));
  return geo;
}

const dustVert = /* glsl */`
  attribute float aSize;
  attribute float aBrightness;
  attribute float aPhase;
  attribute vec3  aDrift;
  uniform   float uTime;
  varying   float vBri;

  void main() {
    vBri = aBrightness;
    // Oscillating drift — period ≈ 126 s at speed 0.05, amplitude 0.35 units
    // Not directional (sin oscillates) so particles don't drift away over time
    vec3 driftedPos = position + aDrift * sin(uTime * 0.05 + aPhase) * 0.35;
    vec4 mvPos = modelViewMatrix * vec4(driftedPos, 1.0);
    gl_PointSize = aSize * (500.0 / -mvPos.z);
    gl_Position  = projectionMatrix * mvPos;
  }
`;

const dustFrag = /* glsl */`
  varying float vBri;

  void main() {
    vec2  coord = gl_PointCoord - 0.5;
    float dist  = length(coord);
    if (dist > 0.5) discard;
    float alpha = exp(-dist * dist * 7.0) * vBri;
    // Cool blue-grey tint — interstellar dust scatters short wavelengths
    gl_FragColor = vec4(0.72, 0.82, 0.90, alpha);
  }
`;

export default function SpaceDust() {
  const matUniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  const geometry    = useMemo(buildDustGeometry, []);

  useFrame((_state, delta) => {
    matUniforms.uTime.value += delta;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        uniforms={matUniforms}
        vertexShader={dustVert}
        fragmentShader={dustFrag}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
