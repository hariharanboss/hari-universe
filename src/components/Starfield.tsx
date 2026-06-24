import { useMemo } from 'react';
import { AdditiveBlending } from 'three';

const STAR_COUNT = 4000;
const SPREAD = 400;

const vertexShader = /* glsl */`
  attribute float size;
  attribute vec3 starColor;
  varying vec3 vColor;

  void main() {
    vColor = starColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */`
  varying vec3 vColor;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = 1.0 - smoothstep(0.2, 0.5, dist);
    gl_FragColor = vec4(vColor, alpha);
  }
`;

export default function Starfield() {
  const { positions, sizes, colors } = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3);
    const sizes     = new Float32Array(STAR_COUNT);
    const colors    = new Float32Array(STAR_COUNT * 3);

    for (let i = 0; i < STAR_COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * SPREAD;
      positions[i * 3 + 1] = (Math.random() - 0.5) * SPREAD;
      positions[i * 3 + 2] = (Math.random() - 0.5) * SPREAD;

      sizes[i] = Math.random() * 1.2 + 0.3;

      const brightness = 0.6 + Math.random() * 0.4;
      const roll = Math.random();

      if (roll < 0.08) {
        // subtle blue-white
        colors[i * 3]     = brightness * 0.75;
        colors[i * 3 + 1] = brightness * 0.88;
        colors[i * 3 + 2] = brightness;
      } else if (roll < 0.14) {
        // subtle yellow-white
        colors[i * 3]     = brightness;
        colors[i * 3 + 1] = brightness * 0.88;
        colors[i * 3 + 2] = brightness * 0.55;
      } else {
        // white with brightness variation
        colors[i * 3]     = brightness;
        colors[i * 3 + 1] = brightness;
        colors[i * 3 + 2] = brightness;
      }
    }

    return { positions, sizes, colors };
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position"  args={[positions, 3]} />
        <bufferAttribute attach="attributes-size"      args={[sizes, 1]}     />
        <bufferAttribute attach="attributes-starColor" args={[colors, 3]}    />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
