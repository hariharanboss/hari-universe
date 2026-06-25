import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { SphereGeometry, BufferAttribute } from 'three';
import type { Group, Mesh } from 'three';

const ORBIT_RADIUS   = 80;
const NEPTUNE_RADIUS = 0.45;
const ORBIT_SPEED    = 0.004; // rad/s — Kepler: 2.91 / 80^1.5 ≈ 0.0041
const SPIN_SPEED     = 0.22;  // rad/s — Neptune day ≈ 16.1 h, slightly faster than Uranus

// Great Dark Spot — dark vortex at southern mid-latitude
const GDS_LAT   = -0.37;
const GDS_LON   =  1.20;
const GDS_LAT_R =  0.18;
const GDS_LON_R =  0.32;

function buildNeptuneGeometry() {
  const geo   = new SphereGeometry(NEPTUNE_RADIUS, 48, 48);
  const pos   = geo.attributes.position;
  const count = pos.count;
  const buf   = new Float32Array(count * 3);

  const lerp  = (a: number, b: number, f: number) => a + (b - a) * f;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  // Deep royal blue — far more saturated and darker than Uranus
  const darkBlue   = [0.12, 0.28, 0.72] as const; // deepest belt cores
  const deepBlue   = [0.18, 0.38, 0.82] as const; // belt-zone boundary
  const midBlue    = [0.26, 0.50, 0.90] as const; // main disk tone
  const brightBlue = [0.36, 0.62, 0.96] as const; // bright zone highlights

  // Storm palette
  const gdsRim    = [0.16, 0.32, 0.76] as const; // outer vortex rim — darker blue fringe
  const gdsVortex = [0.08, 0.18, 0.58] as const; // storm eye — deepest dark blue
  const scooter   = [0.55, 0.72, 0.96] as const; // bright companion cloud

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const nx = x / NEPTUNE_RADIUS;
    const ny = y / NEPTUNE_RADIUS;
    const nz = z / NEPTUNE_RADIUS;

    // Stronger warp than Uranus — Neptune has active atmospheric circulation
    const warp = (
      Math.sin(nx * 18.7 + nz * 13.2) * 0.05 +
      Math.sin(nz * 24.3 + nx * 31.5) * 0.03 +
      Math.sin(nx * 41.7 + nz * 19.1) * 0.015
    );

    const wNy = ny + warp;

    // Higher frequency, more visible bands than Uranus
    const raw = (
      Math.sin(wNy * Math.PI * 3.0) * 0.50 +
      Math.sin(wNy * Math.PI * 6.5) * 0.30 +
      Math.sin(wNy * Math.PI * 1.5) * 0.20
    ) * 0.5 + 0.5;

    // Exponent 0.70 — stronger contrast than Uranus (0.85), softer than Saturn (0.65)
    const band = raw > 0.5
      ? 0.5 + 0.5 * Math.pow((raw - 0.5) * 2.0, 0.70)
      : 0.5 - 0.5 * Math.pow((0.5 - raw) * 2.0, 0.70);

    let r: number, g: number, b: number;

    if (band < 0.33) {
      const f = band / 0.33;
      r = lerp(darkBlue[0], deepBlue[0], f);
      g = lerp(darkBlue[1], deepBlue[1], f);
      b = lerp(darkBlue[2], deepBlue[2], f);
    } else if (band < 0.66) {
      const f = (band - 0.33) / 0.33;
      r = lerp(deepBlue[0], midBlue[0], f);
      g = lerp(deepBlue[1], midBlue[1], f);
      b = lerp(deepBlue[2], midBlue[2], f);
    } else {
      const f = (band - 0.66) / 0.34;
      r = lerp(midBlue[0], brightBlue[0], f);
      g = lerp(midBlue[1], brightBlue[1], f);
      b = lerp(midBlue[2], brightBlue[2], f);
    }

    // Neptune's poles are brighter than its equator — opposite of the gas giants.
    // (1 + 0.10·ny²) brightens poles; (1 − 0.04·(1−ny²)) slightly dims the equatorial band.
    const ny2      = ny * ny;
    const latFactor = (1.0 + 0.10 * ny2) * (1.0 - 0.04 * (1.0 - ny2));
    r = clamp(r * latFactor, 0.0, 1.0);
    g = clamp(g * latFactor, 0.0, 1.0);
    b = clamp(b * latFactor, 0.0, 1.0);

    // ── Great Dark Spot ─────────────────────────────────────────────────────
    const lon = Math.atan2(nz, nx);
    let dLon = lon - GDS_LON;
    if (dLon >  Math.PI) dLon -= 2 * Math.PI;
    if (dLon < -Math.PI) dLon += 2 * Math.PI;

    // Outer rim — slightly darker blue fringe around the vortex
    const rimDist  = Math.sqrt(
      ((ny - GDS_LAT) / GDS_LAT_R) ** 2 +
      (dLon           / GDS_LON_R) ** 2
    );
    const rimT     = clamp(1.0 - rimDist, 0.0, 1.0);
    const rimBlend = rimT * rimT * (3.0 - 2.0 * rimT);

    // Inner vortex eye (60 % of outer) — deep dark blue storm core
    const eyeDist  = Math.sqrt(
      ((ny - GDS_LAT) / (GDS_LAT_R * 0.60)) ** 2 +
      (dLon           / (GDS_LON_R * 0.60)) ** 2
    );
    const eyeT     = clamp(1.0 - eyeDist, 0.0, 1.0);
    const eyeBlend = eyeT * eyeT * (3.0 - 2.0 * eyeT);

    // Scooter — small bright companion cloud offset eastward from the GDS
    const scootDLon = dLon - 0.55;
    const scootDist = Math.sqrt(
      ((ny - GDS_LAT - 0.04) / (GDS_LAT_R * 0.35)) ** 2 +
      (scootDLon              / (GDS_LON_R * 0.28)) ** 2
    );
    const scootT     = clamp(1.0 - scootDist, 0.0, 1.0);
    const scootBlend = scootT * scootT * (3.0 - 2.0 * scootT);

    r = lerp(r, gdsRim[0],    rimBlend);
    g = lerp(g, gdsRim[1],    rimBlend);
    b = lerp(b, gdsRim[2],    rimBlend);
    r = lerp(r, gdsVortex[0], eyeBlend);
    g = lerp(g, gdsVortex[1], eyeBlend);
    b = lerp(b, gdsVortex[2], eyeBlend);
    r = lerp(r, scooter[0],   scootBlend);
    g = lerp(g, scooter[1],   scootBlend);
    b = lerp(b, scooter[2],   scootBlend);

    buf[i * 3]     = clamp(r, 0.0, 1.0);
    buf[i * 3 + 1] = clamp(g, 0.0, 1.0);
    buf[i * 3 + 2] = clamp(b, 0.0, 1.0);
  }

  geo.setAttribute('color', new BufferAttribute(buf, 3));
  return geo;
}

export default function Neptune() {
  const orbitRef = useRef<Group>(null);
  const meshRef  = useRef<Mesh>(null);
  const geometry = useMemo(buildNeptuneGeometry, []);

  useFrame((_state, delta) => {
    if (orbitRef.current) orbitRef.current.rotation.y += ORBIT_SPEED * delta;
    if (meshRef.current)  meshRef.current.rotation.y  += SPIN_SPEED  * delta;
  });

  return (
    <group>
      <group ref={orbitRef}>
        <mesh ref={meshRef} position={[ORBIT_RADIUS, 0, 0]} geometry={geometry}>
          <meshStandardMaterial vertexColors roughness={0.35} metalness={0.05} />
        </mesh>
      </group>
    </group>
  );
}
