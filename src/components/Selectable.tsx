import { useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import type { ReactNode } from 'react';
import type { Group } from 'three';
import { Vector3 } from 'three';
import type { CelestialBody } from '../store/bodies';
import { setSelectedBody, getSelectedBody } from '../store/selectionStore';
import { focusBody } from './CinematicCamera';

interface Props {
  body: CelestialBody;
  children: ReactNode;
}

export default function Selectable({ body, children }: Props) {
  const groupRef = useRef<Group>(null);
  const hovered  = useRef(false);

  const onPointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    hovered.current = true;
    document.body.style.cursor = 'pointer';
  }, []);

  const onPointerOut = useCallback(() => {
    hovered.current = false;
    document.body.style.cursor = 'auto';
  }, []);

  const onClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // Guard: re-clicking the already-selected body does nothing.
    if (getSelectedBody()?.id === body.id) return;
    setSelectedBody(body);
    // Capture world position of this selectable group at click time,
    // then hand off to the camera system. Allocation here is fine (event handler).
    if (groupRef.current) {
      const worldPos = new Vector3();
      groupRef.current.getWorldPosition(worldPos);
      focusBody(body, worldPos);
    }
  }, [body]);

  useFrame((_state, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const isSelected = getSelectedBody()?.id === body.id;
    // hover → 1.06×, selected → 1.08×, idle → 1.0×
    const target = isSelected ? 1.08 : hovered.current ? 1.06 : 1.0;
    const s    = g.scale.x;
    const next = s + (target - s) * Math.min(1.0, delta * 8);
    g.scale.setScalar(next);
  });

  return (
    <group
      ref={groupRef}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      {children}
    </group>
  );
}
