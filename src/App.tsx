import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Starfield from './components/Starfield';
import SolarSystem from './components/SolarSystem';

export default function App() {
  return (
    <Canvas
      style={{ width: '100vw', height: '100vh', background: 'black' }}
      camera={{ fov: 60, near: 0.1, far: 1000, position: [0, 12, 30] }}
    >
      <OrbitControls minDistance={3} maxDistance={150} enablePan={false} />
      <ambientLight intensity={0.2} />
      <Starfield />
      <SolarSystem />
    </Canvas>
  );
}
