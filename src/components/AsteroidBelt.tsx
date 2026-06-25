import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  IcosahedronGeometry,
  BufferAttribute,
  MeshStandardMaterial,
  Object3D,
} from 'three';
import type { InstancedMesh } from 'three';

const BELT_INNER  = 21;   // just beyond Mars (18), well clear of Jupiter (30)
const BELT_OUTER  = 27;
const BELT_HEIGHT = 0.9;  // ±0.9 units ecliptic scatter — triangular distribution
const COUNT       = 3000;
const K_ORBITAL   = 2.91; // Kepler: 0.07 × 12^1.5

function buildAsteroidGeometry() {
  const geo   = new IcosahedronGeometry(1, 1); // detail=1: 80 triangles, 42 vertices
  const pos   = geo.attributes.position;
  const count = pos.count;

  // Displace each vertex along its normal direction to break icosahedron symmetry
  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const bump = (
      Math.sin(x * 13.7 + y *  7.3) * 0.22 +
      Math.sin(y * 19.1 + z * 11.9) * 0.15 +
      Math.sin(z * 23.3 + x * 17.7) * 0.09
    );

    const s = 1.0 + bump;
    pos.setXYZ(i, x * s, y * s, z * s);
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals(); // recompute after displacement

  // Per-vertex rocky colors — four stops, sin-noise picker + jitter
  const buf = new Float32Array(count * 3);
  const stops = [
    [0.24, 0.21, 0.19], // dark basalt
    [0.42, 0.38, 0.34], // gray rock
    [0.40, 0.30, 0.20], // brown rock
    [0.52, 0.46, 0.36], // dusty tan
  ];

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const t    = Math.sin(x * 41.3 + y * 23.7 + z * 17.1) * 0.5 + 0.5;
    const base = stops[Math.min(3, Math.floor(t * 4))];
    const j    = (Math.sin(x * 97.3 + z * 53.1) * 0.5 + 0.5) * 0.07;

    buf[i * 3]     = Math.min(1, base[0] + j);
    buf[i * 3 + 1] = Math.min(1, base[1] + j * 0.8);
    buf[i * 3 + 2] = Math.min(1, base[2] + j * 0.5);
  }

  geo.setAttribute('color', new BufferAttribute(buf, 3));
  return geo;
}

export default function AsteroidBelt() {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy   = useMemo(() => new Object3D(), []);

  const { geometry, material, belt } = useMemo(() => {
    const geometry = buildAsteroidGeometry();
    const material = new MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0.0,
    });

    const radii     = new Float32Array(COUNT);
    const heights   = new Float32Array(COUNT);
    const scales    = new Float32Array(COUNT);
    const orbAngles = new Float32Array(COUNT);
    const orbSpeeds = new Float32Array(COUNT);
    const spinAngX  = new Float32Array(COUNT);
    const spinAngY  = new Float32Array(COUNT);
    const spinAngZ  = new Float32Array(COUNT);
    const spinSpdX  = new Float32Array(COUNT);
    const spinSpdY  = new Float32Array(COUNT);
    const spinSpdZ  = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      const r       = BELT_INNER + Math.random() * (BELT_OUTER - BELT_INNER);
      radii[i]      = r;
      // Triangular height distribution — concentrated near ecliptic plane
      heights[i]    = (Math.random() + Math.random() - 1.0) * BELT_HEIGHT;
      scales[i]     = 0.016 + Math.random() * 0.064; // 0.016–0.080
      orbAngles[i]  = Math.random() * Math.PI * 2;
      orbSpeeds[i]  = K_ORBITAL / Math.pow(r, 1.5);

      // Random initial rotation and slow chaotic tumble on each axis
      spinAngX[i]   = Math.random() * Math.PI * 2;
      spinAngY[i]   = Math.random() * Math.PI * 2;
      spinAngZ[i]   = Math.random() * Math.PI * 2;
      spinSpdX[i]   = (Math.random() - 0.5) * 0.50;
      spinSpdY[i]   = (Math.random() - 0.5) * 0.80;
      spinSpdZ[i]   = (Math.random() - 0.5) * 0.40;
    }

    return { geometry, material, belt: { radii, heights, scales, orbAngles, orbSpeeds, spinAngX, spinAngY, spinAngZ, spinSpdX, spinSpdY, spinSpdZ } };
  }, []);

  useFrame((_state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const { radii, heights, scales, orbAngles, orbSpeeds, spinAngX, spinAngY, spinAngZ, spinSpdX, spinSpdY, spinSpdZ } = belt;

    for (let i = 0; i < COUNT; i++) {
      orbAngles[i] += orbSpeeds[i] * delta;
      spinAngX[i]  += spinSpdX[i]  * delta;
      spinAngY[i]  += spinSpdY[i]  * delta;
      spinAngZ[i]  += spinSpdZ[i]  * delta;

      dummy.position.set(
        radii[i] * Math.cos(orbAngles[i]),
        heights[i],
        radii[i] * Math.sin(orbAngles[i]),
      );
      dummy.rotation.set(spinAngX[i], spinAngY[i], spinAngZ[i]);
      dummy.scale.setScalar(scales[i]);
      dummy.updateMatrix();

      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, COUNT]} frustumCulled={false} />
  );
}
