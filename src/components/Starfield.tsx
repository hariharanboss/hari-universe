import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending } from 'three';
import NebulaHaze from './NebulaHaze';
import DistantGalaxies from './DistantGalaxies';

const STAR_COUNT  = 5000;
const GIANT_COUNT = 30;   // 10 blue + 10 orange + 10 white
const TOTAL       = STAR_COUNT + GIANT_COUNT;

// ~4 % of regular stars twinkle independently
const TWINKLE_RATE = 0.04;

const vertexShader = /* glsl */`
  attribute float size;
  attribute vec3  starColor;
  attribute float aTwinkle; // amplitude (0 = static star)
  attribute float aPhase;   // per-star phase offset
  attribute float aSpeed;   // per-star flicker frequency
  uniform   float uTime;
  varying   vec3  vColor;
  varying   float vTwinkle;

  void main() {
    vColor = starColor;

    // Twinkle factor: 1.0 for static stars, ±amplitude for twinklers
    // Floored at 0.25 so twinkling stars never fully disappear
    vTwinkle = max(0.25, 1.0 + aTwinkle * sin(uTime * aSpeed + aPhase));

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    // Slight size modulation reinforces the brightness change
    gl_PointSize = size * vTwinkle * (300.0 / -mvPosition.z);
    gl_Position  = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */`
  varying vec3  vColor;
  varying float vTwinkle;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = exp(-dist * dist * 9.0) * vTwinkle;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

export default function Starfield() {
  const starUniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  const { positions, sizes, colors, twinkles, phases, speeds } = useMemo(() => {
    const positions = new Float32Array(TOTAL * 3);
    const sizes     = new Float32Array(TOTAL);
    const colors    = new Float32Array(TOTAL * 3);
    const twinkles  = new Float32Array(TOTAL); // 0 = static
    const phases    = new Float32Array(TOTAL);
    const speeds    = new Float32Array(TOTAL);

    // ── Regular stars ─────────────────────────────────────────────────────
    for (let i = 0; i < STAR_COUNT; i++) {
      const theta = 2 * Math.PI * Math.random();
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 350 + Math.random() * 130;
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const brightness = 0.55 + Math.random() * 0.45;
      const roll = Math.random();

      if (roll < 0.06) {
        sizes[i] = 0.6 + Math.random() * 0.9;
        colors[i * 3]     = brightness * 0.70;
        colors[i * 3 + 1] = brightness * 0.87;
        colors[i * 3 + 2] = brightness;
      } else if (roll < 0.61) {
        sizes[i] = 0.3 + Math.random() * 1.0;
        colors[i * 3]     = brightness * 0.96;
        colors[i * 3 + 1] = brightness * 0.97;
        colors[i * 3 + 2] = brightness;
      } else if (roll < 0.89) {
        sizes[i] = 0.3 + Math.random() * 1.1;
        colors[i * 3]     = brightness;
        colors[i * 3 + 1] = brightness * 0.93;
        colors[i * 3 + 2] = brightness * 0.81;
      } else {
        sizes[i] = 0.3 + Math.random() * 0.5;
        const dim = brightness * 0.52;
        colors[i * 3]     = dim;
        colors[i * 3 + 1] = dim * 0.76;
        colors[i * 3 + 2] = dim * 0.50;
      }

      // Randomly assign ~4% as twinklers
      if (Math.random() < TWINKLE_RATE) {
        twinkles[i] = 0.10 + Math.random() * 0.22; // amplitude 0.10–0.32
        phases[i]   = Math.random() * Math.PI * 2;
        speeds[i]   = 0.8 + Math.random() * 1.8;   // 0.8–2.6 rad/s
      }
      // non-twinklers: twinkle=0, phase/speed irrelevant (1.0 + 0*sin = 1.0)
    }

    // ── Giant stars — always static, no twinkle ───────────────────────────
    for (let j = 0; j < GIANT_COUNT; j++) {
      const i = STAR_COUNT + j;

      const theta = 2 * Math.PI * Math.random();
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 350 + Math.random() * 130;
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const type = j % 3;
      if (type === 0) {
        sizes[i]          = 3.5 + Math.random() * 2.5;
        colors[i * 3]     = 0.72;
        colors[i * 3 + 1] = 0.88;
        colors[i * 3 + 2] = 1.00;
      } else if (type === 1) {
        sizes[i]          = 3.0 + Math.random() * 2.0;
        colors[i * 3]     = 1.00;
        colors[i * 3 + 1] = 0.58;
        colors[i * 3 + 2] = 0.20;
      } else {
        sizes[i]          = 4.0 + Math.random() * 3.0;
        colors[i * 3]     = 1.00;
        colors[i * 3 + 1] = 0.97;
        colors[i * 3 + 2] = 0.91;
      }
      // twinkles[i] = 0 (default) — giants don't twinkle
    }

    return { positions, sizes, colors, twinkles, phases, speeds };
  }, []);

  useFrame((_state, delta) => {
    starUniforms.uTime.value += delta;
  });

  return (
    <>
      {/* Background haze — renders first, behind everything */}
      <NebulaHaze />

      {/* Distant galaxy smears */}
      <DistantGalaxies />

      {/* Stars — same single draw call as before */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position"  args={[positions, 3]} />
          <bufferAttribute attach="attributes-size"      args={[sizes, 1]}     />
          <bufferAttribute attach="attributes-starColor" args={[colors, 3]}    />
          <bufferAttribute attach="attributes-aTwinkle"  args={[twinkles, 1]}  />
          <bufferAttribute attach="attributes-aPhase"    args={[phases, 1]}    />
          <bufferAttribute attach="attributes-aSpeed"    args={[speeds, 1]}    />
        </bufferGeometry>
        <shaderMaterial
          uniforms={starUniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
    </>
  );
}
