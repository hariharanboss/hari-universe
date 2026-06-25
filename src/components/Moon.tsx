import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { SphereGeometry, BufferAttribute } from 'three';
import type { Group, Mesh } from 'three';
import Selectable from './Selectable';
import { BODIES } from '../store/bodies';

const MOON_ORBIT_RADIUS = 0.55;
const MOON_RADIUS       = 0.06;   // ~27 % of Earth radius — real ratio
const ORBIT_SPEED       = 0.90;   // rad/s — Moon orbits Earth ~13× faster than Earth orbits Sun
const SPIN_SPEED        = 0.10;   // rad/s — visible axial spin

function buildMoonGeometry() {
  const geo   = new SphereGeometry(MOON_RADIUS, 24, 24);
  const pos   = geo.attributes.position;
  const count = pos.count;
  const buf   = new Float32Array(count * 3);

  const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

  const dark   = [0.22, 0.22, 0.21] as const;  // crater floor
  const mid    = [0.44, 0.43, 0.41] as const;  // regolith
  const bright = [0.63, 0.62, 0.59] as const;  // highland

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const t = (
      Math.sin(x * 29.3 + y * 47.1) * 0.50 +
      Math.sin(y * 41.7 + z * 23.3) * 0.30 +
      Math.sin(z * 31.9 + x * 53.7) * 0.20
    ) * 0.5 + 0.5;

    let r: number, g: number, b: number;

    if (t < 0.38) {
      [r, g, b] = dark;
    } else if (t < 0.70) {
      const f = (t - 0.38) / 0.32;
      r = lerp(dark[0], mid[0], f);
      g = lerp(dark[1], mid[1], f);
      b = lerp(dark[2], mid[2], f);
    } else {
      const f = Math.min((t - 0.70) / 0.22, 1.0);
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

export default function Moon() {
  const orbitRef = useRef<Group>(null);
  const meshRef  = useRef<Mesh>(null);
  const geometry = useMemo(buildMoonGeometry, []);

  useFrame((_state, delta) => {
    if (orbitRef.current) orbitRef.current.rotation.y += ORBIT_SPEED * delta;
    if (meshRef.current)  meshRef.current.rotation.y  += SPIN_SPEED  * delta;
  });

  return (
    <group>
      <group ref={orbitRef}>
        <group position={[MOON_ORBIT_RADIUS, 0, 0]}>
          <Selectable body={BODIES.MOON}>
            <mesh ref={meshRef} geometry={geometry}>
              <meshStandardMaterial vertexColors roughness={0.95} metalness={0.0} />
            </mesh>
          </Selectable>
        </group>
      </group>
    </group>
  );
}
