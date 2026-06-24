import { AdditiveBlending } from 'three';

const coronaVert = /* glsl */`
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDir  = normalize(-mvPosition.xyz);
    vNormal   = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const coronaFrag = /* glsl */`
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    float rim   = 1.0 - max(dot(vNormal, vViewDir), 0.0);
    float alpha = smoothstep(0.0, 0.5, rim) * (1.0 - rim) * 0.5;
    vec3  color = mix(vec3(1.0, 0.98, 0.85), vec3(1.0, 0.78, 0.2), rim);
    gl_FragColor = vec4(color, alpha);
  }
`;

export default function Sun() {
  return (
    <group>
      {/* Core sphere — radius reduced 30 % from 2 → 1.4 */}
      <mesh>
        <sphereGeometry args={[0.9, 64, 64]} />
        <meshStandardMaterial
          color="#FDB813"
          emissive="#FF8C00"
          emissiveIntensity={0.6}
          roughness={0.8}
          metalness={0}
        />
      </mesh>

      {/* Corona — 1.44× the core radius, soft inner glow, fades to transparent */}
      <mesh>
        <sphereGeometry args={[1.3, 64, 32]} />
        <shaderMaterial
          vertexShader={coronaVert}
          fragmentShader={coronaFrag}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>

      <pointLight color="#FFF4D6" intensity={3} distance={500} decay={2} />
    </group>
  );
}
