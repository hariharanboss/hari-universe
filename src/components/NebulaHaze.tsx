import { BackSide, AdditiveBlending } from 'three';

const hazeVert = /* glsl */`
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const hazeFrag = /* glsl */`
  varying vec3 vPos;

  void main() {
    vec3 p = normalize(vPos);

    // Three independent sin-product layers — products of two sines each
    // concentrate mass near 0 with rare bright peaks: natural patch distribution
    float n1 = sin(p.x * 2.3 + p.y * 1.8) * sin(p.y * 3.1 + p.z * 2.7) * 0.5 + 0.5;
    float n2 = sin(p.z * 4.7 + p.x * 3.9) * sin(p.y * 5.3 + p.z * 4.1) * 0.5 + 0.5;
    float n3 = sin(p.x * 8.1 + p.z * 7.3) * sin(p.z * 9.7 + p.y * 8.9) * 0.5 + 0.5;

    float haze = n1 * n2 * 0.65 + n3 * 0.35;

    // pow 2.5 pushes most of the sphere close to 0; only the rarest bright
    // patch intersections produce visible colour
    haze = pow(haze, 2.5);

    // Three sky colour zones mapped along a slow latitude gradient
    vec3 coldBlue  = vec3(0.12, 0.18, 0.36);
    vec3 dustPink  = vec3(0.26, 0.10, 0.20);
    vec3 warmDust  = vec3(0.28, 0.20, 0.08);

    float split = fract(p.y * 0.4 + 0.5);
    vec3 col = split < 0.5
      ? mix(coldBlue, dustPink, split * 2.0)
      : mix(dustPink, warmDust, (split - 0.5) * 2.0);

    // Max alpha ≈ 0.045 — imperceptible unless the eye looks for it
    float alpha = haze * 0.05;
    gl_FragColor = vec4(col, alpha);
  }
`;

export default function NebulaHaze() {
  return (
    <mesh renderOrder={-2}>
      <sphereGeometry args={[290, 32, 32]} />
      <shaderMaterial
        vertexShader={hazeVert}
        fragmentShader={hazeFrag}
        side={BackSide}
        transparent
        depthTest={false}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </mesh>
  );
}
