import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { SphereGeometry, BufferAttribute, AdditiveBlending } from 'three';
import type { Group, Mesh } from 'three';
import Moon from './Moon';
import Selectable from './Selectable';
import { BODIES } from '../store/bodies';

const ORBIT_RADIUS = 12;
const EARTH_RADIUS = 0.22;
const ATMO_RADIUS  = EARTH_RADIUS * 1.18;
const ORBIT_SPEED     = 0.07;   // rad/s — Kepler-scaled slower than Mercury
const SPIN_SPEED      = 0.15;   // rad/s — axial rotation
const EARTH_TILT      = 23.44 * Math.PI / 180; // 23.44° obliquity
const MOON_PLANE_TILT = 5.14  * Math.PI / 180; // 5.14° inclination relative to Earth's equator
const INITIAL_ORBIT   = 5.0;                    // rad — starting orbital angle

const atmoVert = /* glsl */`
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPosition.xyz);
    vNormal  = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const atmoFrag = /* glsl */`
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    float rim   = 1.0 - max(dot(vNormal, vViewDir), 0.0);
    float alpha = pow(rim, 3.0) * 0.68;
    gl_FragColor = vec4(0.3, 0.6, 1.0, alpha);
  }
`;

function buildEarthGeometry() {
  const geo   = new SphereGeometry(EARTH_RADIUS, 48, 48);
  const pos   = geo.attributes.position;
  const count = pos.count;
  const buf   = new Float32Array(count * 3);

  const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

  const deepOcean    = [0.07, 0.18, 0.52] as const;
  const shallowOcean = [0.12, 0.38, 0.72] as const;
  const land         = [0.13, 0.38, 0.12] as const;
  const highland     = [0.48, 0.36, 0.22] as const;

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const t = (
      Math.sin(x * 24.1 + y * 41.7) * 0.50 +
      Math.sin(y * 33.3 + z * 27.1) * 0.30 +
      Math.sin(z * 21.9 + x * 39.7) * 0.20
    ) * 0.5 + 0.5;

    let r: number, g: number, b: number;

    if (t < 0.50) {
      [r, g, b] = deepOcean;
    } else if (t < 0.65) {
      const f = (t - 0.50) / 0.15;
      r = lerp(deepOcean[0], shallowOcean[0], f);
      g = lerp(deepOcean[1], shallowOcean[1], f);
      b = lerp(deepOcean[2], shallowOcean[2], f);
    } else if (t < 0.78) {
      const f = (t - 0.65) / 0.13;
      r = lerp(shallowOcean[0], land[0], f);
      g = lerp(shallowOcean[1], land[1], f);
      b = lerp(shallowOcean[2], land[2], f);
    } else {
      const f = Math.min((t - 0.78) / 0.15, 1.0);
      r = lerp(land[0], highland[0], f);
      g = lerp(land[1], highland[1], f);
      b = lerp(land[2], highland[2], f);
    }

    buf[i * 3]     = r;
    buf[i * 3 + 1] = g;
    buf[i * 3 + 2] = b;
  }

  geo.setAttribute('color', new BufferAttribute(buf, 3));
  return geo;
}

export default function Earth() {
  const orbitRef = useRef<Group>(null);
  const meshRef  = useRef<Mesh>(null);
  const geometry = useMemo(buildEarthGeometry, []);

  useFrame((_state, delta) => {
    if (orbitRef.current) orbitRef.current.rotation.y += ORBIT_SPEED * delta;
    if (meshRef.current)  meshRef.current.rotation.y  += SPIN_SPEED  * delta;
  });

  return (
    <group>
      {/* Orbital group — rotates around Y to orbit the Sun */}
      <group ref={orbitRef} rotation={[0, INITIAL_ORBIT, 0]}>

        {/* Position sub-group keeps the whole Earth system at orbit radius */}
        <group position={[ORBIT_RADIUS, 0, 0]}>

          {/* Axial tilt — everything below inherits Earth's 23.44° obliquity */}
          <group rotation={[0, 0, EARTH_TILT]}>

            {/* Earth body + atmosphere are selectable as one unit */}
            <Selectable body={BODIES.EARTH}>
              <mesh ref={meshRef} geometry={geometry}>
                <meshStandardMaterial vertexColors roughness={0.72} metalness={0.0} />
              </mesh>
              <mesh>
                <sphereGeometry args={[ATMO_RADIUS, 48, 48]} />
                <shaderMaterial
                  vertexShader={atmoVert}
                  fragmentShader={atmoFrag}
                  transparent
                  depthWrite={false}
                  blending={AdditiveBlending}
                />
              </mesh>
            </Selectable>

            {/* Moon orbital plane — outside Earth's Selectable; Moon has its own */}
            <group rotation={[MOON_PLANE_TILT, 0, 0]}>
              <Moon />
            </group>

          </group>
        </group>
      </group>
    </group>
  );
}
