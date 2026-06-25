import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { SphereGeometry, BufferAttribute } from 'three';
import type { Group, Mesh } from 'three';
import Selectable from './Selectable';
import { BODIES } from '../store/bodies';

const ORBIT_RADIUS  = 60;
const URANUS_RADIUS = 0.46;
const ORBIT_SPEED   = 0.006; // rad/s — Kepler: 2.91 / 60^1.5 ≈ 0.0063
const SPIN_SPEED    = 0.20;  // rad/s — Uranus day ≈ 17.2 h, slower than Saturn
const URANUS_TILT   = 97.77 * Math.PI / 180; // 97.77° — nearly 90°, rolls on its side
const INITIAL_ORBIT = 0.3;   // rad — starting orbital angle's 10.7 h

function buildUranusGeometry() {
  const geo   = new SphereGeometry(URANUS_RADIUS, 48, 48);
  const pos   = geo.attributes.position;
  const count = pos.count;
  const buf   = new Float32Array(count * 3);

  const lerp  = (a: number, b: number, f: number) => a + (b - a) * f;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  // Compressed pale cyan/blue-green palette — all stops are light, minimal contrast
  const lightCyan = [0.76, 0.93, 0.93] as const; // brightest zone highlights
  const cyan      = [0.64, 0.87, 0.89] as const; // mid-latitude surface
  const blueCyan  = [0.53, 0.80, 0.86] as const; // subtle belt tone
  const deepCyan  = [0.44, 0.74, 0.82] as const; // deepest — still clearly light

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const nx = x / URANUS_RADIUS;
    const ny = y / URANUS_RADIUS;
    const nz = z / URANUS_RADIUS;

    // Very gentle warp — Uranus has almost no visible turbulence
    const warp = (
      Math.sin(nx * 11.3 + nz *  8.7) * 0.02 +
      Math.sin(nz * 17.1 + nx * 13.4) * 0.01
    );

    const wNy = ny + warp;

    // Low-frequency bands, compressed amplitude — barely perceptible
    const raw = (
      Math.sin(wNy * Math.PI * 2.5) * 0.45 +
      Math.sin(wNy * Math.PI * 5.0) * 0.35 +
      Math.sin(wNy * Math.PI * 1.0) * 0.20
    ) * 0.5 + 0.5;

    // Exponent 0.85 — close to 1.0 keeps band contrast very low
    const band = raw > 0.5
      ? 0.5 + 0.5 * Math.pow((raw - 0.5) * 2.0, 0.85)
      : 0.5 - 0.5 * Math.pow((0.5 - raw) * 2.0, 0.85);

    let r: number, g: number, b: number;

    if (band < 0.33) {
      const f = band / 0.33;
      r = lerp(deepCyan[0], blueCyan[0], f);
      g = lerp(deepCyan[1], blueCyan[1], f);
      b = lerp(deepCyan[2], blueCyan[2], f);
    } else if (band < 0.66) {
      const f = (band - 0.33) / 0.33;
      r = lerp(blueCyan[0], cyan[0], f);
      g = lerp(blueCyan[1], cyan[1], f);
      b = lerp(blueCyan[2], cyan[2], f);
    } else {
      const f = (band - 0.66) / 0.34;
      r = lerp(cyan[0], lightCyan[0], f);
      g = lerp(cyan[1], lightCyan[1], f);
      b = lerp(cyan[2], lightCyan[2], f);
    }

    // Very gentle polar darkening — flatter than Saturn, surface reads almost uniform
    const ny2 = ny * ny;
    const latFactor = (1.0 - 0.08 * ny2) * (1.0 + 0.03 * (1.0 - ny2));
    r = clamp(r * latFactor, 0.0, 1.0);
    g = clamp(g * latFactor, 0.0, 1.0);
    b = clamp(b * latFactor, 0.0, 1.0);

    buf[i * 3]     = r;
    buf[i * 3 + 1] = g;
    buf[i * 3 + 2] = b;
  }

  geo.setAttribute('color', new BufferAttribute(buf, 3));
  return geo;
}

export default function Uranus() {
  const orbitRef = useRef<Group>(null);
  const meshRef  = useRef<Mesh>(null);
  const geometry = useMemo(buildUranusGeometry, []);

  useFrame((_state, delta) => {
    if (orbitRef.current) orbitRef.current.rotation.y += ORBIT_SPEED * delta;
    if (meshRef.current)  meshRef.current.rotation.y  += SPIN_SPEED  * delta;
  });

  return (
    <group>
      <group ref={orbitRef} rotation={[0, INITIAL_ORBIT, 0]}>
        <group position={[ORBIT_RADIUS, 0, 0]}>
          <group rotation={[0, 0, URANUS_TILT]}>
            <Selectable body={BODIES.URANUS}>
              <mesh ref={meshRef} geometry={geometry}>
                <meshStandardMaterial vertexColors roughness={0.58} metalness={0.0} />
              </mesh>
            </Selectable>
          </group>
        </group>
      </group>
    </group>
  );
}
