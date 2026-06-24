import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { SphereGeometry, BufferAttribute } from 'three';
import type { Group, Mesh } from 'three';

const ORBIT_RADIUS   = 30;
const JUPITER_RADIUS = 0.60;
const ORBIT_SPEED    = 0.018; // rad/s — Kepler: 0.07 * (12/30)^1.5 ≈ 0.018
const SPIN_SPEED     = 0.35;  // rad/s — Jupiter day ≈ 9.9 h, ~2.4× faster than Earth

function buildJupiterGeometry() {
  const geo   = new SphereGeometry(JUPITER_RADIUS, 64, 64);
  const pos   = geo.attributes.position;
  const count = pos.count;
  const buf   = new Float32Array(count * 3);

  const lerp  = (a: number, b: number, f: number) => a + (b - a) * f;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  // Zones lifted, belts unchanged — wider luminance gap
  const cream    = [0.98, 0.94, 0.83] as const; // bright zone tops (+0.02/+0.03/+0.05)
  const beige    = [0.88, 0.79, 0.63] as const; // mid zones (+0.04/+0.05/+0.06)
  const warmOr   = [0.80, 0.56, 0.28] as const; // belt fringes (slight bump)
  const brown    = [0.55, 0.34, 0.15] as const; // belt cores — unchanged
  const darkBelt = [0.40, 0.24, 0.09] as const; // deepest belts — unchanged

  // GRS — three-layer for contrast against dark SEB
  const GRS_LAT   = -0.38;
  const GRS_LON   =  0.80;
  const GRS_LAT_R =  0.24;
  const GRS_LON_R =  0.45;
  const grsHalo  = [0.89, 0.78, 0.57] as const; // pale cream ring outside storm
  const grsOuter = [0.91, 0.33, 0.10] as const; // warm orange-red fringe (brighter)
  const grsCore  = [0.74, 0.14, 0.04] as const; // deep red storm eye

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const nx = x / JUPITER_RADIUS;
    const ny = y / JUPITER_RADIUS; // −1 → +1, latitude proxy
    const nz = z / JUPITER_RADIUS;

    // ── Atmospheric turbulence ──────────────────────────────────────────────
    const warp = (
      Math.sin(nx * 29.3 + nz * 19.7) * 0.07 +
      Math.sin(nz * 37.1 + nx * 43.2) * 0.04 +
      Math.sin(nx * 53.7 + nz * 27.9) * 0.02
    );

    const festoon = (
      Math.sin(nx * 71.3 + nz * 53.1) * 0.025 +
      Math.sin(nz * 89.7 + nx * 67.2) * 0.015
    );

    const wNy = ny + warp;

    // ── Band signal ─────────────────────────────────────────────────────────
    const raw = (
      Math.sin(wNy * Math.PI * 4.5 + festoon * 7.0) * 0.55 +
      Math.sin(wNy * Math.PI * 9.5 + festoon * 3.5) * 0.25 +
      Math.sin(wNy * Math.PI * 2.0)                 * 0.20
    ) * 0.5 + 0.5;

    // ── Contrast transfer ───────────────────────────────────────────────────
    const band = raw > 0.5
      ? 0.5 + 0.5 * Math.pow((raw - 0.5) * 2.0, 0.52)
      : 0.5 - 0.5 * Math.pow((0.5 - raw) * 2.0, 0.52);

    // ── Palette mapping ─────────────────────────────────────────────────────
    let r: number, g: number, b: number;

    if (band < 0.25) {
      const f = band / 0.25;
      r = lerp(darkBelt[0], brown[0], f);
      g = lerp(darkBelt[1], brown[1], f);
      b = lerp(darkBelt[2], brown[2], f);
    } else if (band < 0.50) {
      const f = (band - 0.25) / 0.25;
      r = lerp(brown[0], warmOr[0], f);
      g = lerp(brown[1], warmOr[1], f);
      b = lerp(brown[2], warmOr[2], f);
    } else if (band < 0.75) {
      const f = (band - 0.50) / 0.25;
      r = lerp(warmOr[0], beige[0], f);
      g = lerp(warmOr[1], beige[1], f);
      b = lerp(warmOr[2], beige[2], f);
    } else {
      const f = (band - 0.75) / 0.25;
      r = lerp(beige[0], cream[0], f);
      g = lerp(beige[1], cream[1], f);
      b = lerp(beige[2], cream[2], f);
    }

    // ── Latitudinal modulation ──────────────────────────────────────────────
    // ny² peaks at poles (±1) and is 0 at equator — used for both effects.
    const ny2 = ny * ny;

    // Polar darkening: poles 15 % dimmer, smooth quadratic rolloff
    const polarFactor = 1.0 - 0.15 * ny2;

    // Equatorial haze: vertex-color approximation of atmospheric scattering.
    // Brightens the equatorial band by 5 % — much weaker than Earth's limb.
    // (True view-dependent limb brightening requires a shader; this per-vertex
    // latitudinal boost reads similarly from a fixed camera angle.)
    const hazeFactor  = 1.0 + 0.05 * (1.0 - ny2);

    const latFactor = polarFactor * hazeFactor; // combined in one multiply
    r = clamp(r * latFactor, 0.0, 1.0);
    g = clamp(g * latFactor, 0.0, 1.0);
    b = clamp(b * latFactor, 0.0, 1.0);

    // ── Great Red Spot ──────────────────────────────────────────────────────
    const lon = Math.atan2(nz, nx);
    let dLon = lon - GRS_LON;
    if (dLon >  Math.PI) dLon -= 2 * Math.PI;
    if (dLon < -Math.PI) dLon += 2 * Math.PI;

    // Halo ellipse (25 % larger than outer) — pale cream ring
    // Creates a bright separation between the dark SEB and the red storm.
    const haloDist  = Math.sqrt(
      ((ny - GRS_LAT) / (GRS_LAT_R * 1.25)) ** 2 +
      (dLon           / (GRS_LON_R * 1.25)) ** 2
    );
    const haloT     = clamp(1.0 - haloDist, 0.0, 1.0);
    const haloBlend = haloT * haloT * (3.0 - 2.0 * haloT);

    // Outer ellipse — warm orange-red fringe
    const outerDist  = Math.sqrt(
      ((ny - GRS_LAT) / GRS_LAT_R) ** 2 +
      (dLon           / GRS_LON_R) ** 2
    );
    const outerT     = clamp(1.0 - outerDist, 0.0, 1.0);
    const outerBlend = outerT * outerT * (3.0 - 2.0 * outerT);

    // Inner ellipse (55 % of outer) — deep red storm eye
    const innerDist  = Math.sqrt(
      ((ny - GRS_LAT) / (GRS_LAT_R * 0.55)) ** 2 +
      (dLon           / (GRS_LON_R * 0.55)) ** 2
    );
    const innerT     = clamp(1.0 - innerDist, 0.0, 1.0);
    const innerBlend = innerT * innerT * (3.0 - 2.0 * innerT);

    // Layer order: halo → outer fringe → storm eye
    // Each overwrites the previous in the centre, creating radial depth.
    r = lerp(r, grsHalo[0],  haloBlend);
    g = lerp(g, grsHalo[1],  haloBlend);
    b = lerp(b, grsHalo[2],  haloBlend);
    r = lerp(r, grsOuter[0], outerBlend);
    g = lerp(g, grsOuter[1], outerBlend);
    b = lerp(b, grsOuter[2], outerBlend);
    r = lerp(r, grsCore[0],  innerBlend);
    g = lerp(g, grsCore[1],  innerBlend);
    b = lerp(b, grsCore[2],  innerBlend);

    buf[i * 3]     = r;
    buf[i * 3 + 1] = g;
    buf[i * 3 + 2] = b;
  }

  geo.setAttribute('color', new BufferAttribute(buf, 3));
  return geo;
}

export default function Jupiter() {
  const orbitRef = useRef<Group>(null);
  const meshRef  = useRef<Mesh>(null);
  const geometry = useMemo(buildJupiterGeometry, []);

  useFrame((_state, delta) => {
    if (orbitRef.current) orbitRef.current.rotation.y += ORBIT_SPEED * delta;
    if (meshRef.current)  meshRef.current.rotation.y  += SPIN_SPEED  * delta;
  });

  return (
    <group>
      <group ref={orbitRef}>
        <mesh ref={meshRef} position={[ORBIT_RADIUS, 0, 0]} geometry={geometry}>
          <meshStandardMaterial vertexColors roughness={0.55} metalness={0.0} />
        </mesh>
      </group>
    </group>
  );
}
