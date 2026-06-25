/**
 * Per-body cinematic camera configuration.
 *
 * viewDistance     — distance from the body's centre to the camera lens.
 *                    Tuned to frame each body's defining feature within a 60° FOV:
 *                      Sun     → corona (r=1.3) spans ≈37° — dramatic close-up
 *                      Earth   → atmosphere limb visible, Moon still in-frame
 *                      Jupiter → GRS and band detail legible at ≈27° angular size
 *                      Saturn  → ring disc (r=1.42) spans ≈40° — dominant feature
 *                      Uranus  → sideways tilt axis clearly readable
 *                      Neptune → backed off slightly vs Uranus to show full globe
 *
 * flyDuration      — seconds for the quintic ease-in-out approach animation.
 *
 * minOrbitDist     — closest the user can orbit after arriving (OrbitControls limit).
 * maxOrbitDist     — farthest the user can zoom out from this body's centre.
 */

export interface BodyCameraConfig {
  viewDistance:  number;
  flyDuration:   number;
  minOrbitDist:  number;
  maxOrbitDist:  number;
}

const DEFAULT_CONFIG: BodyCameraConfig = {
  viewDistance:  3.0,
  flyDuration:   3.0,
  minOrbitDist:  0.5,
  maxOrbitDist:  20,
};

export const CAMERA_TARGETS: Record<string, BodyCameraConfig> = {
  //                  view    fly    minOrbit  maxOrbit
  sun:     { viewDistance: 4.0,  flyDuration: 3.5, minOrbitDist: 1.0,  maxOrbitDist: 25  },
  mercury: { viewDistance: 0.6,  flyDuration: 2.2, minOrbitDist: 0.15, maxOrbitDist: 4   },
  venus:   { viewDistance: 1.0,  flyDuration: 2.5, minOrbitDist: 0.25, maxOrbitDist: 6   },
  earth:   { viewDistance: 1.2,  flyDuration: 2.8, minOrbitDist: 0.30, maxOrbitDist: 7   },
  moon:    { viewDistance: 0.35, flyDuration: 2.0, minOrbitDist: 0.10, maxOrbitDist: 2   },
  mars:    { viewDistance: 0.8,  flyDuration: 2.5, minOrbitDist: 0.20, maxOrbitDist: 5   },
  jupiter: { viewDistance: 2.5,  flyDuration: 3.2, minOrbitDist: 0.70, maxOrbitDist: 15  },
  saturn:  { viewDistance: 4.0,  flyDuration: 3.5, minOrbitDist: 1.50, maxOrbitDist: 22  },
  uranus:  { viewDistance: 2.2,  flyDuration: 3.5, minOrbitDist: 0.60, maxOrbitDist: 12  },
  neptune: { viewDistance: 3.0,  flyDuration: 3.5, minOrbitDist: 0.70, maxOrbitDist: 15  },
};

/** Returns the config for a body ID, falling back to a safe default. */
export function getCameraConfig(bodyId: string): BodyCameraConfig {
  return CAMERA_TARGETS[bodyId] ?? DEFAULT_CONFIG;
}
