import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { SphereGeometry, BufferAttribute } from 'three';
import type { Group, Mesh } from 'three';

const ORBIT_RADIUS  = 9;
const VENUS_RADIUS  = 0.20;
const ORBIT_SPEED   = 0.11;  // rad/s — Kepler: 0.20 * (6/9)^1.5 ≈ 0.11
const SPIN_SPEED    = 0.08;  // rad/s

function buildVenusGeometry() {
  const geo   = new SphereGeometry(VENUS_RADIUS, 40, 40);
  const pos   = geo.attributes.position;
  const count = pos.count;
  const buf   = new Float32Array(count * 3);

  const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

  // Pale cream cloud tops → warm yellow mid-tones → deeper cloud bands
  const light = [0.95, 0.91, 0.80] as const;
  const mid   = [0.88, 0.82, 0.65] as const;
  const deep  = [0.79, 0.70, 0.50] as const;

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    // Lower frequencies than rocky planets — Venus's clouds are large-scale swirls
    const t = (
      Math.sin(x * 18.5 + y * 31.2) * 0.45 +
      Math.sin(y * 27.8 + z * 15.3) * 0.35 +
      Math.sin(z * 22.1 + x * 38.6) * 0.20
    ) * 0.5 + 0.5;

    let r: number, g: number, b: number;

    if (t < 0.38) {
      [r, g, b] = light;
    } else if (t < 0.68) {
      const f = (t - 0.38) / 0.30;
      r = lerp(light[0], mid[0], f);
      g = lerp(light[1], mid[1], f);
      b = lerp(light[2], mid[2], f);
    } else {
      const f = Math.min((t - 0.68) / 0.24, 1.0);
      r = lerp(mid[0], deep[0], f);
      g = lerp(mid[1], deep[1], f);
      b = lerp(mid[2], deep[2], f);
    }

    buf[i * 3]     = r;
    buf[i * 3 + 1] = g;
    buf[i * 3 + 2] = b;
  }

  geo.setAttribute('color', new BufferAttribute(buf, 3));
  return geo;
}

export default function Venus() {
  const orbitRef = useRef<Group>(null);
  const meshRef  = useRef<Mesh>(null);
  const geometry = useMemo(buildVenusGeometry, []);

  useFrame((_state, delta) => {
    if (orbitRef.current) orbitRef.current.rotation.y += ORBIT_SPEED * delta;
    if (meshRef.current)  meshRef.current.rotation.y  += SPIN_SPEED  * delta;
  });

  return (
    <group>
      <group ref={orbitRef}>
        <mesh ref={meshRef} position={[ORBIT_RADIUS, 0, 0]} geometry={geometry}>
          <meshStandardMaterial vertexColors roughness={0.75} metalness={0.0} />
        </mesh>
      </group>
    </group>
  );
}
