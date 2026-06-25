import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Vector3 } from 'three';
import type { CelestialBody } from '../store/bodies';
import { getCameraConfig } from '../config/cameraTargets';

// ── Scene constants ───────────────────────────────────────────────────────────
const INTRO_DURATION = 9.0;

const INTRO_START  = new Vector3(80, 55, 120);
const INTRO_END    = new Vector3(0, 14, 32);
const ORBIT_TARGET = new Vector3(0, 0, 0);

// ── Easing ────────────────────────────────────────────────────────────────────
// Quintic ease-in-out: extreme slow start (cosmological drift) + gentle landing.
function easeInOutQuint(t: number): number {
  return t < 0.5
    ? 16 * t * t * t * t * t
    : 1 - Math.pow(-2 * t + 2, 5) / 2;
}

// ── Pre-allocated scratch vectors ─────────────────────────────────────────────
// These are module-level constants — never recreated, never allocated in useFrame.
const _scratchPos    = new Vector3();
const _scratchTarget = new Vector3();
const _scratchDir    = new Vector3(); // approach direction for body focus

// ── Body-focus request (from Selectable clicks) ───────────────────────────────
interface PendingBodyFocus {
  body:     CelestialBody;
  worldPos: Vector3; // snapshot at click time
}
let _pendingBodyFocus: PendingBodyFocus | null = null;

/**
 * Smoothly fly the camera toward a selectable body.
 * Called from Selectable.onClick — not in useFrame, so allocation is fine.
 * The approach direction is computed from the camera's current position at the
 * moment useFrame picks up the request, giving a natural arc from wherever the
 * camera happens to be (mid-orbit, mid-intro-completion, mid-fly).
 */
export function focusBody(body: CelestialBody, worldPos: Vector3): void {
  _pendingBodyFocus = { body, worldPos: worldPos.clone() };
}

// ── Low-level fly-to API (overview return, future tours) ─────────────────────
export interface FlyTarget {
  position:      Vector3;
  target:        Vector3;
  duration?:     number;
  minOrbitDist?: number; // applied to OrbitControls on arrival
  maxOrbitDist?: number;
}
let _pendingFly: FlyTarget | null = null;

export function flyTo(dest: FlyTarget): void {
  _pendingFly = dest;
}

export function returnToOverview(): void {
  _pendingFly = {
    position:     INTRO_END.clone(),
    target:       ORBIT_TARGET.clone(),
    duration:     3.5,
    minOrbitDist: 3,
    maxOrbitDist: 150,
  };
}

// ── Controls interface ────────────────────────────────────────────────────────
interface Controls {
  enabled:     boolean;
  target:      Vector3;
  minDistance: number;
  maxDistance: number;
  update():    void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CinematicCamera() {
  const { camera } = useThree();
  const controlsRef = useRef<Controls | null>(null);

  // All animation state lives in refs — zero React re-renders per frame.
  const initialized   = useRef(false);
  const introElapsed  = useRef(0);
  const introComplete = useRef(false);

  const flyActive     = useRef(false);
  const flyElapsed    = useRef(0);
  const flyDuration   = useRef(3.0);
  const flyFromPos    = useRef(new Vector3());
  const flyFromTarget = useRef(new Vector3());
  const flyDestPos    = useRef(new Vector3());
  const flyDestTarget = useRef(new Vector3());
  // Orbit limits to apply when the active fly completes.
  const flyMinOrbit   = useRef(3);
  const flyMaxOrbit   = useRef(150);

  useFrame((_, delta) => {
    const controls = controlsRef.current;

    // ── Frame 0: correct look-at (camera position already set by Canvas prop) ─
    if (!initialized.current) {
      camera.lookAt(ORBIT_TARGET);
      initialized.current = true;
      return;
    }

    const dt = Math.min(delta, 0.1); // cap so tab-background-resume doesn't jump

    // ── Intro fly-in ──────────────────────────────────────────────────────────
    if (!introComplete.current) {
      introElapsed.current = Math.min(introElapsed.current + dt, INTRO_DURATION);
      const t = introElapsed.current / INTRO_DURATION;
      const e = easeInOutQuint(t);

      _scratchPos.lerpVectors(INTRO_START, INTRO_END, e);
      camera.position.copy(_scratchPos);
      camera.lookAt(ORBIT_TARGET);

      if (t >= 1.0) {
        introComplete.current = true;
        if (controls) {
          controls.target.copy(ORBIT_TARGET);
          controls.minDistance = 3;
          controls.maxDistance = 150;
          controls.update();
          controls.enabled = true;
        }
      }
      return;
    }

    // ── Body-focus fly (Selectable click → always interrupts any active fly) ──
    //
    // Processed before _pendingFly so body clicks always take priority.
    // Approaching from the camera's current position produces a natural arc
    // whether the camera is orbiting, mid-flight, or at rest.
    if (_pendingBodyFocus) {
      const { body, worldPos } = _pendingBodyFocus;
      _pendingBodyFocus = null;

      const cfg = getCameraConfig(body.id);

      // Direction: from body toward current camera. Normalize for clean offset.
      _scratchDir.subVectors(camera.position, worldPos);
      if (_scratchDir.lengthSq() < 0.0001) {
        // Degenerate: camera is exactly at the body. Use a pleasant default.
        _scratchDir.set(0, 0.4, 1.0);
      }
      _scratchDir.normalize();

      // Snapshot current fly state as the new 'from' — works during mid-flight.
      flyFromPos.current.copy(camera.position);
      flyFromTarget.current.copy(controls ? controls.target : ORBIT_TARGET);

      // Destination: stand off from the body's centre by viewDistance.
      // addScaledVector modifies flyDestPos in-place — no allocation.
      flyDestPos.current.copy(worldPos).addScaledVector(_scratchDir, cfg.viewDistance);
      flyDestTarget.current.copy(worldPos);

      flyDuration.current = cfg.flyDuration;
      flyElapsed.current  = 0;
      flyActive.current   = true;
      flyMinOrbit.current = cfg.minOrbitDist;
      flyMaxOrbit.current = cfg.maxOrbitDist;

      if (controls) controls.enabled = false;
    }

    // ── Low-level fly (returnToOverview, keyboard nav, tours) ─────────────────
    // Only starts if a body-focus is not already running.
    if (_pendingFly && !flyActive.current) {
      flyFromPos.current.copy(camera.position);
      flyFromTarget.current.copy(controls ? controls.target : ORBIT_TARGET);
      flyDestPos.current.copy(_pendingFly.position);
      flyDestTarget.current.copy(_pendingFly.target);
      flyDuration.current = _pendingFly.duration ?? 3.0;
      flyElapsed.current  = 0;
      flyActive.current   = true;
      flyMinOrbit.current = _pendingFly.minOrbitDist ?? (controls?.minDistance ?? 3);
      flyMaxOrbit.current = _pendingFly.maxOrbitDist ?? (controls?.maxDistance ?? 150);
      _pendingFly         = null;

      if (controls) controls.enabled = false;
    }

    // ── Active fly lerp ───────────────────────────────────────────────────────
    if (flyActive.current) {
      flyElapsed.current = Math.min(flyElapsed.current + dt, flyDuration.current);
      const t = flyElapsed.current / flyDuration.current;
      const e = easeInOutQuint(t);

      // lerpVectors writes into scratch in-place — zero allocation per frame.
      _scratchPos.lerpVectors(flyFromPos.current, flyDestPos.current, e);
      _scratchTarget.lerpVectors(flyFromTarget.current, flyDestTarget.current, e);
      camera.position.copy(_scratchPos);
      camera.lookAt(_scratchTarget);

      if (t >= 1.0) {
        flyActive.current = false;
        if (controls) {
          // Apply per-body orbit limits before re-enabling controls.
          // This prevents OrbitControls from immediately snapping the camera
          // (it computes spherical coords from the current camera position,
          // which is already exactly at flyDestPos — no jump).
          controls.target.copy(flyDestTarget.current);
          controls.minDistance = flyMinOrbit.current;
          controls.maxDistance = flyMaxOrbit.current;
          controls.update();
          controls.enabled = true;
        }
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef as any}
      enabled={false}
      minDistance={3}
      maxDistance={150}
      enablePan={false}
    />
  );
}
