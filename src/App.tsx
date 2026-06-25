import React from 'react';
import { Canvas } from '@react-three/fiber';
import CinematicCamera from './components/CinematicCamera';
import Starfield from './components/Starfield';
import SpaceDust from './components/SpaceDust';
import SolarSystem from './components/SolarSystem';

export default function App() {
  return (
    <Canvas
      style={{ width: '100vw', height: '100vh', background: 'black' }}
      camera={{ fov: 60, near: 0.1, far: 1000, position: [80, 55, 120] }}
    >
      <CinematicCamera />
      <ambientLight intensity={0.2} />
      <Starfield />
      <SpaceDust />
      <SolarSystem />
    </Canvas>
  );
}
