import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { SphereGeometry, BufferAttribute } from 'three';
import type { Group, Mesh } from 'three';

const ORBIT_RADIUS = 18;
const MARS_RADIUS  = 0.14;
const ORBIT_SPEED  = 0.04;  // rad/s — Kepler: 0.07 * (12/18)^1.5 ≈ 0.038
const SPIN_SPEED   = 0.14;  // rad/s — Mars day ≈ 24.6 h, close to Earth

function buildMarsGeometry() {
  const geo   = new SphereGeometry(MARS_RADIUS, 36, 36);
  const pos   = geo.attributes.position;
  const count = pos.count;
  const buf   = new Float32Array(count * 3);

  const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

  // Dark basaltic rock → iron-oxide regolith → dusty ochre highlands
  const dark   = [0.42, 0.18, 0.09] as const;
  const mid    = [0.64, 0.30, 0.14] as const;
  const bright = [0.76, 0.47, 0.27] as const;

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const t = (
      Math.sin(x * 31.5 + y * 43.2) * 0.50 +
      Math.sin(y * 19.7 + z * 26.8) * 0.30 +
      Math.sin(z * 37.4 + x * 22.9) * 0.20
    ) * 0.5 + 0.5;

    let r: number, g: number, b: number;

    if (t < 0.40) {
      const f = t / 0.40;
      r = lerp(dark[0], mid[0], f);
      g = lerp(dark[1], mid[1], f);
      b = lerp(dark[2], mid[2], f);
    } else {
      const f = Math.min((t - 0.40) / 0.45, 1.0);
      r = lerp(mid[0], bright[0], f);
      g = lerp(mid[1], bright[1], f);
      b = lerp(mid[2], bright[2], f);
    }

    buf[i * 3]     = r;
    buf[i * 3 + 1] = g;
    buf[i * 3 + 2] = b;
  }

  geo.setAttribute('color', new BufferAttribute(buf, 3));
  return geo;
}

export default function Mars() {
  const orbitRef = useRef<Group>(null);
  const meshRef  = useRef<Mesh>(null);
  const geometry = useMemo(buildMarsGeometry, []);

  useFrame((_state, delta) => {
    if (orbitRef.current) orbitRef.current.rotation.y += ORBIT_SPEED * delta;
    if (meshRef.current)  meshRef.current.rotation.y  += SPIN_SPEED  * delta;
  });

  return (
    <group>
      <group ref={orbitRef}>
        <mesh ref={meshRef} position={[ORBIT_RADIUS, 0, 0]} geometry={geometry}>
          <meshStandardMaterial vertexColors roughness={0.9} metalness={0.0} />
        </mesh>
      </group>
    </group>
  );
}
