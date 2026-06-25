import { useMemo } from 'react';
import { AdditiveBlending, BufferGeometry, BufferAttribute } from 'three';

const GALAXY_COUNT = 6;
const CORE_PTS     = 20;   // bright compact nucleus
const DISK_PTS     = 80;   // sparse disk / halo
const PER_GALAXY   = CORE_PTS + DISK_PTS;
const TOTAL        = GALAXY_COUNT * PER_GALAXY;

function buildGalaxyGeometry() {
  const pos = new Float32Array(TOTAL * 3);
  const col = new Float32Array(TOTAL * 3);
  const sz  = new Float32Array(TOTAL);

  for (let g = 0; g < GALAXY_COUNT; g++) {
    // Random sky position — very large radius
    const phi = Math.acos(2 * Math.random() - 1);
    const tht = Math.random() * 2 * Math.PI;
    const R   = 390 + Math.random() * 70; // 390–460 units
    const cx  = R * Math.sin(phi) * Math.cos(tht);
    const cy  = R * Math.sin(phi) * Math.sin(tht);
    const cz  = R * Math.cos(phi);

    // Random disk tilt — X rotation then Z rotation
    const tx   = (Math.random() - 0.5) * Math.PI;
    const tz   = (Math.random() - 0.5) * Math.PI;
    const cosx = Math.cos(tx), sinx = Math.sin(tx);
    const cosz = Math.cos(tz), sinz = Math.sin(tz);

    // Scale: total disk diameter in scene units
    const scale = 0.9 + Math.random() * 1.5; // 0.9–2.4 units across

    // Galaxy colour: warm (elliptical) or cool-blue (spiral/irregular)
    const warm = Math.random() > 0.5;
    const baseR = warm ? 0.85 : 0.58;
    const baseG = warm ? 0.70 : 0.65;
    const baseB = warm ? 0.42 : 0.92;

    for (let i = 0; i < PER_GALAXY; i++) {
      const pi     = g * PER_GALAXY + i;
      const isCore = i < CORE_PTS;

      let lx: number, ly: number, lz: number;

      if (isCore) {
        // Gaussian cluster for bright nucleus
        const cr = Math.sqrt(-Math.log(Math.random() + 0.01)) * 0.08 * scale;
        const ca = Math.random() * 2 * Math.PI;
        lx = cr * Math.cos(ca);
        ly = (Math.random() - 0.5) * 0.03 * scale;
        lz = cr * Math.sin(ca);
      } else {
        // Exponential radial profile — dense toward centre, sparse outward
        const dr = -Math.log(Math.random() + 0.01) * 0.20 * scale;
        const da = Math.random() * 2 * Math.PI;
        lx = dr * Math.cos(da);
        ly = (Math.random() - 0.5) * 0.12 * scale; // thin disk
        lz = dr * Math.sin(da);
      }

      // Apply tilt: X rotation
      const ry = ly * cosx - lz * sinx;
      const rz = ly * sinx + lz * cosx;
      // Z rotation
      const fx = lx * cosz - ry * sinz;
      const fy = lx * sinz + ry * cosz;
      const fz = rz;

      pos[pi * 3]     = cx + fx;
      pos[pi * 3 + 1] = cy + fy;
      pos[pi * 3 + 2] = cz + fz;

      const bri       = isCore ? 0.26 : 0.09; // core brighter than disk
      col[pi * 3]     = baseR * bri;
      col[pi * 3 + 1] = baseG * bri;
      col[pi * 3 + 2] = baseB * bri;

      sz[pi] = isCore ? 2.4 : 1.2;
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position',     new BufferAttribute(pos, 3));
  geo.setAttribute('aGalaxyColor', new BufferAttribute(col, 3));
  geo.setAttribute('aSize',        new BufferAttribute(sz,  1));
  return geo;
}

const galaxyVert = /* glsl */`
  attribute float aSize;
  attribute vec3  aGalaxyColor;
  varying   vec3  vCol;

  void main() {
    vCol = aGalaxyColor;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPos.z);
    gl_Position  = projectionMatrix * mvPos;
  }
`;

const galaxyFrag = /* glsl */`
  varying vec3 vCol;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = exp(-dist * dist * 7.0);
    gl_FragColor = vec4(vCol, alpha);
  }
`;

export default function DistantGalaxies() {
  const geometry = useMemo(buildGalaxyGeometry, []);

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        vertexShader={galaxyVert}
        fragmentShader={galaxyFrag}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
