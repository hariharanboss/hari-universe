import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { SphereGeometry, BufferAttribute } from 'three';
import type { Group, Mesh } from 'three';
import Selectable from './Selectable';
import { BODIES } from '../store/bodies';

const ORBIT_RADIUS   = 6;
const MERCURY_RADIUS = 0.1;   // ~50 % smaller than before
const ORBIT_SPEED    = 0.20;  // rad/s
const SPIN_SPEED     = 0.05;  // rad/s
const INITIAL_ORBIT  = 0.8;   // rad — starting orbital angle

function buildMercuryGeometry() {
  const geo = new SphereGeometry(MERCURY_RADIUS, 32, 32);
  const pos = geo.attributes.position;
  const count = pos.count;
  const colors = new Float32Array(count * 3);

  const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

  // colour stops: dark grey → brown-grey → bright patch
  const dark   = [0.30, 0.28, 0.27] as const;
  const mid    = [0.44, 0.40, 0.37] as const;
  const bright = [0.58, 0.54, 0.51] as const;

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    // overlapping sin waves give cheap spatial pseudo-noise
    const t = (
      Math.sin(x * 23.7 + y * 41.3) * 0.50 +
      Math.sin(y * 37.1 + z * 19.5) * 0.30 +
      Math.sin(z * 28.3 + x * 33.9) * 0.20
    ) * 0.5 + 0.5; // normalise → 0..1

    if (t < 0.5) {
      const f = t * 2;
      colors[i * 3]     = lerp(dark[0], mid[0], f);
      colors[i * 3 + 1] = lerp(dark[1], mid[1], f);
      colors[i * 3 + 2] = lerp(dark[2], mid[2], f);
    } else {
      const f = (t - 0.5) * 2;
      colors[i * 3]     = lerp(mid[0], bright[0], f);
      colors[i * 3 + 1] = lerp(mid[1], bright[1], f);
      colors[i * 3 + 2] = lerp(mid[2], bright[2], f);
    }
  }

  geo.setAttribute('color', new BufferAttribute(colors, 3));
  return geo;
}

export default function Mercury() {
  const orbitRef = useRef<Group>(null);
  const meshRef  = useRef<Mesh>(null);
  const geometry = useMemo(buildMercuryGeometry, []);

  useFrame((_state, delta) => {
    if (orbitRef.current) orbitRef.current.rotation.y += ORBIT_SPEED * delta;
    if (meshRef.current)  meshRef.current.rotation.y  += SPIN_SPEED  * delta;
  });

  return (
    <group>
      <group ref={orbitRef} rotation={[0, INITIAL_ORBIT, 0]}>
        <group position={[ORBIT_RADIUS, 0, 0]}>
          <Selectable body={BODIES.MERCURY}>
            <mesh ref={meshRef} geometry={geometry}>
              <meshStandardMaterial vertexColors roughness={0.95} metalness={0.0} />
            </mesh>
          </Selectable>
        </group>
      </group>
    </group>
  );
}
