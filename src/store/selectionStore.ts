import { useState, useEffect } from 'react';
import type { CelestialBody } from './bodies';

// Module-level mutable state — no Context, no external library.
// Pattern: shared variable + subscriber set, same as Zustand internally.
let _selected: CelestialBody | null = null;
const _listeners = new Set<() => void>();

function _notify() {
  _listeners.forEach(fn => fn());
}

export function setSelectedBody(body: CelestialBody): void {
  _selected = body;
  _notify();
}

export function clearSelection(): void {
  _selected = null;
  _notify();
}

// Synchronous read for useFrame callbacks — no React subscription.
export function getSelectedBody(): CelestialBody | null {
  return _selected;
}

// Hook for React components that need to re-render on selection change.
export function useSelection() {
  const [selected, setSelected] = useState<CelestialBody | null>(_selected);

  useEffect(() => {
    const sync = () => setSelected(_selected);
    _listeners.add(sync);
    return () => { _listeners.delete(sync); };
  }, []);

  return { selectedBody: selected, setSelectedBody, clearSelection };
}
