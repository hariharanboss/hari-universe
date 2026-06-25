import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { SphereGeometry, BufferAttribute, DoubleSide } from 'three';
import type { Group, Mesh } from 'three';
import Selectable from './Selectable';
import { BODIES } from '../store/bodies';

const ORBIT_RADIUS  = 44;
const SATURN_RADIUS = 0.52;
const ORBIT_SPEED   = 0.010; // rad/s — Kepler: 0.07 * (12/44)^1.5 ≈ 0.010
const SPIN_SPEED    = 0.32;  // rad/s — Saturn day ≈ 10.7 h, slightly slower than Jupiter
const SATURN_TILT   = 26.73 * Math.PI / 180; // 26.73° obliquity — shared by body and rings
const INITIAL_ORBIT = 3.4;   // rad — starting orbital angle

function buildSaturnGeometry() {
  const geo   = new SphereGeometry(SATURN_RADIUS, 56, 56);
  const pos   = geo.attributes.position;
  const count = pos.count;
  const buf   = new Float32Array(count * 3);

  const lerp  = (a: number, b: number, f: number) => a + (b - a) * f;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  // Pale cream / tan palette — all stops are light, no dark belts like Jupiter
  const paleCream = [0.96, 0.91, 0.76] as const; // bright zone tops
  const cream     = [0.90, 0.84, 0.67] as const; // mid zones
  const paleTan   = [0.83, 0.75, 0.57] as const; // subtle belt fringes
  const warmTan   = [0.76, 0.66, 0.48] as const; // softest belt cores
  const base      = [0.69, 0.59, 0.41] as const; // darkest — still much lighter than Jupiter

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const nx = x / SATURN_RADIUS;
    const ny = y / SATURN_RADIUS;
    const nz = z / SATURN_RADIUS;

    // Gentler warp than Jupiter — Saturn's atmosphere is calmer-looking
    const warp = (
      Math.sin(nx * 21.7 + nz * 15.3) * 0.04 +
      Math.sin(nz * 28.9 + nx * 33.1) * 0.03 +
      Math.sin(nx * 41.3 + nz * 22.7) * 0.01
    );

    const wNy = ny + warp;

    // Fewer band frequencies and lower amplitude → softer, broader bands
    const raw = (
      Math.sin(wNy * Math.PI * 3.5) * 0.50 +
      Math.sin(wNy * Math.PI * 7.5) * 0.28 +
      Math.sin(wNy * Math.PI * 1.5) * 0.22
    ) * 0.5 + 0.5;

    // Gentler contrast transfer (0.65 vs Jupiter's 0.52) — smoother zone/belt transitions
    const band = raw > 0.5
      ? 0.5 + 0.5 * Math.pow((raw - 0.5) * 2.0, 0.65)
      : 0.5 - 0.5 * Math.pow((0.5 - raw) * 2.0, 0.65);

    let r: number, g: number, b: number;

    if (band < 0.25) {
      const f = band / 0.25;
      r = lerp(base[0], warmTan[0], f);
      g = lerp(base[1], warmTan[1], f);
      b = lerp(base[2], warmTan[2], f);
    } else if (band < 0.50) {
      const f = (band - 0.25) / 0.25;
      r = lerp(warmTan[0], paleTan[0], f);
      g = lerp(warmTan[1], paleTan[1], f);
      b = lerp(warmTan[2], paleTan[2], f);
    } else if (band < 0.75) {
      const f = (band - 0.50) / 0.25;
      r = lerp(paleTan[0], cream[0], f);
      g = lerp(paleTan[1], cream[1], f);
      b = lerp(paleTan[2], cream[2], f);
    } else {
      const f = (band - 0.75) / 0.25;
      r = lerp(cream[0], paleCream[0], f);
      g = lerp(cream[1], paleCream[1], f);
      b = lerp(cream[2], paleCream[2], f);
    }

    // Latitudinal modulation — same pattern as Jupiter, slightly gentler
    const ny2 = ny * ny;
    const latFactor = (1.0 - 0.12 * ny2) * (1.0 + 0.04 * (1.0 - ny2));
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

export default function Saturn() {
  const orbitRef = useRef<Group>(null);
  const meshRef  = useRef<Mesh>(null);
  const geometry = useMemo(buildSaturnGeometry, []);

  useFrame((_state, delta) => {
    if (orbitRef.current) orbitRef.current.rotation.y += ORBIT_SPEED * delta;
    if (meshRef.current)  meshRef.current.rotation.y  += SPIN_SPEED  * delta;
  });

  return (
    <group>
      <group ref={orbitRef} rotation={[0, INITIAL_ORBIT, 0]}>
        <group position={[ORBIT_RADIUS, 0, 0]}>

          <group rotation={[0, 0, SATURN_TILT]}>
            {/* Body + rings share one Selectable — hovering either selects Saturn */}
            <Selectable body={BODIES.SATURN}>

            {/* Saturn body — spins on the now-tilted Y axis */}
            <mesh ref={meshRef} geometry={geometry}>
              <meshStandardMaterial vertexColors roughness={0.65} metalness={0.0} />
            </mesh>

            <group rotation={[-Math.PI / 2, 0, 0.1]}>

              {/* Inner ring — C-ring equivalent: dim, close to planet */}
              <mesh>
                <ringGeometry args={[0.72, 0.88, 128]} />
                <meshBasicMaterial
                  color="#847060"
                  transparent
                  opacity={0.28}
                  side={DoubleSide}
                  depthWrite={false}
                />
              </mesh>

              {/* Main ring — B-ring equivalent: brightest, widest */}
              <mesh>
                <ringGeometry args={[0.90, 1.20, 128]} />
                <meshBasicMaterial
                  color="#c0b698"
                  transparent
                  opacity={0.62}
                  side={DoubleSide}
                  depthWrite={false}
                />
              </mesh>

              {/* Outer ring — A-ring equivalent: mid brightness, gap after main */}
              <mesh>
                <ringGeometry args={[1.22, 1.42, 128]} />
                <meshBasicMaterial
                  color="#9e9280"
                  transparent
                  opacity={0.36}
                  side={DoubleSide}
                  depthWrite={false}
                />
              </mesh>

            </group>

            </Selectable>
          </group>
        </group>
      </group>
    </group>
  );
}
