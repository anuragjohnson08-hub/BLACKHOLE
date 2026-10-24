/**
 * Pure physics, gentle relativistic rotation, orbital mechanics, and cursor-trail
 * swirl calculations for the Mertana Three.js black hole and interactive particle field.
 */

export type InteractionMode = 'vortex' | 'repulse' | 'orbit' | 'supernova';

export type PresetId = 'gargantua' | 'hyper_luminal' | 'horizon_eclipse' | 'tidal_surge';

export interface SimulationConfig {
  presetId: PresetId;
  spinSpeed: number;          // 0.2 to 3.0 (0.75 = gentle, captivating rotation)
  lensingIntensity: number;   // 0.5 to 2.0
  particleTurbulence: number; // 0.2 to 2.5
  interactionMode: InteractionMode;
  diskTiltDeg: number;        // Default ~ -21.5 degrees matching Mertana poster
}

export interface PillarItem {
  id: 'experience' | 'consistency' | 'quality' | 'dedication';
  label: string;
  tagline: string;
  metricLabel: string;
  metricValue: string;
  description: string;
  resonanceMultiplier: number;
  accentColor: string;
}

export const MERTANA_PILLARS: PillarItem[] = [
  {
    id: 'experience',
    label: 'Experience',
    tagline: 'RELATIVISTIC DEPTH',
    metricLabel: 'HORIZON STABILITY',
    metricValue: '99.98%',
    description:
      'Engineered across deep gravitational gradients where time dilates and every photon trajectory is sculpted with precision.',
    resonanceMultiplier: 1.15,
    accentColor: '#FFB84D',
  },
  {
    id: 'consistency',
    label: 'Consistency',
    tagline: 'INVARIANT ORBITAL MOMENTUM',
    metricLabel: 'ANGULAR SPIN (a/M)',
    metricValue: '0.998 c',
    description:
      'Unwavering conservation of angular momentum across the accretion torus—sustaining luminous energy output without decay.',
    resonanceMultiplier: 1.3,
    accentColor: '#F58220',
  },
  {
    id: 'quality',
    label: 'Quality',
    tagline: 'PHOTON-RING CLARITY',
    metricLabel: 'LENSING FIDELITY',
    metricValue: '4.21 R_s',
    description:
      'Zero-compromise spectral purity from the innermost stable circular orbit out to the relativistic debris stream.',
    resonanceMultiplier: 1.45,
    accentColor: '#FFD992',
  },
  {
    id: 'dedication',
    label: 'Dedication',
    tagline: 'SINGULARITY FOCUS',
    metricLabel: 'ZERO-POINT CONVERGENCE',
    metricValue: '0.000 Ω',
    description:
      'It starts and ends with a zero: total commitment to gravitational convergence where raw chaos transforms into radiant order.',
    resonanceMultiplier: 1.65,
    accentColor: '#E85D33',
  },
];

export const SIMULATION_PRESETS: Record<PresetId, Omit<SimulationConfig, 'interactionMode'>> = {
  gargantua: {
    presetId: 'gargantua',
    spinSpeed: 0.75,
    lensingIntensity: 1.15,
    particleTurbulence: 1.0,
    diskTiltDeg: -21.5,
  },
  hyper_luminal: {
    presetId: 'hyper_luminal',
    spinSpeed: 1.65,
    lensingIntensity: 1.55,
    particleTurbulence: 1.65,
    diskTiltDeg: -19.5,
  },
  horizon_eclipse: {
    presetId: 'horizon_eclipse',
    spinSpeed: 0.45,
    lensingIntensity: 1.35,
    particleTurbulence: 0.65,
    diskTiltDeg: -23.5,
  },
  tidal_surge: {
    presetId: 'tidal_surge',
    spinSpeed: 1.25,
    lensingIntensity: 1.3,
    particleTurbulence: 1.95,
    diskTiltDeg: -17.5,
  },
};

export interface BlackHoleRotationState {
  lensingAngle: number;
  accretionPhase: number;
  precessionTiltRad: number;
}

/**
 * Converts pixel coordinates (px, py) on a viewport of size (width, height) into
 * isotropic aspect-corrected normalized coordinates p = (px_norm, py_norm) so a
 * circle of radius R in p-space has the exact same pixel radius horizontally and
 * vertically in fullscreen, ultrawide, half-screen, or mobile viewports.
 */
export function computeIsotropicScreenCoords(
  pixelX: number,
  pixelY: number,
  viewportWidth: number,
  viewportHeight: number,
  centerUv: { x: number; y: number } = { x: 0.495, y: 0.465 }
): { x: number; y: number; radius: number } {
  const safeW = Math.max(1, viewportWidth);
  const safeH = Math.max(1, viewportHeight);
  const uvX = pixelX / safeW;
  const uvY = pixelY / safeH;
  const aspect = safeW / safeH;

  const px = (uvX - centerUv.x) * aspect * 2.0;
  const py = (uvY - centerUv.y) * 2.0;
  return {
    x: px,
    y: py,
    radius: Math.hypot(px, py),
  };
}

/**
 * Computes a smooth, gentle, unhurried rotation state for the black hole's
 * gravitational lensing halo, photon rings, and diagonal accretion disk.
 */
export function computeGentleBlackHoleRotation(
  elapsedTime: number,
  spinSpeed: number,
  baseTiltDeg: number
): BlackHoleRotationState {
  const safeSpeed = Math.max(0.1, spinSpeed);
  // Gentle continuous azimuthal rotation (~0.22 rad/sec at spinSpeed=1)
  const lensingAngle = elapsedTime * 0.22 * safeSpeed;
  // Smooth, majestic plasma filament drift (~0.30 units/sec at spinSpeed=1)
  const accretionPhase = elapsedTime * 0.30 * safeSpeed;
  // Subtle harmonic precession (+/- 1.25 deg) so the singularity breathes organically
  const baseTiltRad = (-baseTiltDeg * Math.PI) / 180;
  const precessionTiltRad = baseTiltRad + Math.sin(elapsedTime * 0.24) * 0.022;

  return {
    lensingAngle,
    accretionPhase,
    precessionTiltRad,
  };
}

export interface ParticleState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  angle: number;
  angularSpeed: number;
  size: number;
  heat: number; // 0 (cool dark rock/ember) to 1 (white-hot plasma)
}

export interface CursorTrailParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;     // 0.0 (expired) to 1.0 (freshly emitted at cursor)
  maxLife: number;
  size: number;
  swirlPhase: number;
}

/**
 * Computes gentle Keplerian relativistic angular velocity for a particle at distance r
 * from the singularity (Event Horizon radius r_s = 1.6).
 */
export function computeOrbitalAngularSpeed(radius: number, spinSpeed: number): number {
  const safeRadius = Math.max(1.65, radius);
  const baseKepler = 1.05 / Math.pow(safeRadius, 1.3);
  return baseKepler * Math.max(0.1, spinSpeed);
}

/**
 * Updates a single ambient particle's 3D position and velocity in response to:
 * 1. The gentle tilted accretion disk orbital flow
 * 2. Interactive pointer world coordinates (swirling vortex around cursor, repulse wave, orbital lock, or supernova)
 * 3. Active shockwave pulse radius
 */
export function stepParticleKinematics(
  p: ParticleState,
  dt: number,
  config: SimulationConfig,
  pointerWorld: { x: number; y: number; z: number; vx?: number; vy?: number; active: boolean },
  shockwaveProgress: number
): ParticleState {
  const clampedDt = Math.min(Math.max(dt, 0.001), 0.05);
  const tiltRad = (config.diskTiltDeg * Math.PI) / 180;
  const cosT = Math.cos(tiltRad);
  const sinT = Math.sin(tiltRad);

  // Advance gentle orbital angle
  const omega = computeOrbitalAngularSpeed(p.radius, config.spinSpeed);
  const nextAngle = p.angle + omega * clampedDt;

  // Gentle inward spiral for accretion stream; respawn at outer edge if swallowed
  let nextRadius = p.radius - 0.035 * config.spinSpeed * clampedDt;
  if (nextRadius < 1.68) {
    nextRadius = 7.5 + ((p.size * 13.7) % 4.5);
  } else if (nextRadius > 13.5) {
    nextRadius = 3.2 + ((p.size * 7.3) % 6.0);
  }

  // Local disk plane coordinates (prior to tilt)
  const localX = Math.cos(nextAngle) * nextRadius;
  const localZ = Math.sin(nextAngle) * nextRadius;
  const verticalWave =
    Math.sin(nextAngle * 3.0 + nextRadius * 1.5) * 0.12 * config.particleTurbulence;

  // Rotate by disk tilt around Z axis so disk runs bottom-left to top-right
  const targetX = localX * cosT - verticalWave * sinT;
  const targetY = localX * sinT + verticalWave * cosT;
  const targetZ = localZ;

  // Smooth velocity damping so cursor-swirled particles glide gracefully
  let vx = p.vx * 0.945;
  let vy = p.vy * 0.945;
  let vz = p.vz * 0.945;
  let nextHeat = p.heat * 0.96 + (1.0 - Math.min(1, (nextRadius - 1.6) / 8.0)) * 0.04;

  // Apply interactive pointer swirling & trail forces
  if (pointerWorld.active) {
    const curX = targetX + vx;
    const curY = targetY + vy;
    const curZ = targetZ + vz;
    const dx = pointerWorld.x - curX;
    const dy = pointerWorld.y - curY;
    const dz = pointerWorld.z - curZ;
    const distSq = dx * dx + dy * dy + dz * dz + 0.18;
    const dist = Math.sqrt(distSq);

    const interactionRadius = 5.8;
    if (dist < interactionRadius) {
      const falloff = Math.pow(1.0 - dist / interactionRadius, 1.35) * config.particleTurbulence;
      const ptrVx = pointerWorld.vx ?? 0;
      const ptrVy = pointerWorld.vy ?? 0;

      // Normalized radial & tangential vectors relative to cursor
      const rx = dx / dist;
      const ry = dy / dist;
      const tx = -ry; // Tangential counter-clockwise swirl
      const ty = rx;

      if (config.interactionMode === 'vortex') {
        // Swirl around the cursor + gentle pull toward a 0.65-unit orbital ring around cursor + cursor wake drag
        const ringEquilibrium = dist > 0.65 ? 1.0 : -0.8;
        vx += (rx * 5.2 * ringEquilibrium + tx * 9.8) * falloff * clampedDt + ptrVx * falloff * 0.18;
        vy += (ry * 5.2 * ringEquilibrium + ty * 9.8) * falloff * clampedDt + ptrVy * falloff * 0.18;
        vz += Math.sin(dist * 4.0) * falloff * 1.5 * clampedDt;
        nextHeat = Math.min(1.0, nextHeat + falloff * 0.55);
      } else if (config.interactionMode === 'repulse') {
        // Push outward away from pointer with a tangential curl
        vx += (-rx * 11.0 + tx * 3.5) * falloff * clampedDt;
        vy += (-ry * 11.0 + ty * 3.5) * falloff * clampedDt;
        vz += (dz / dist) * falloff * 3.0 * clampedDt;
        nextHeat = Math.min(1.0, nextHeat + falloff * 0.4);
      } else if (config.interactionMode === 'orbit') {
        // Pure high-speed tangential swirl around the cursor
        vx += tx * 12.5 * falloff * clampedDt + ptrVx * falloff * 0.15;
        vy += ty * 12.5 * falloff * clampedDt + ptrVy * falloff * 0.15;
        nextHeat = Math.min(1.0, nextHeat + falloff * 0.45);
      } else if (config.interactionMode === 'supernova') {
        // Energetic radial + spiral scatter
        vx += (-rx * 15.0 + tx * 6.0) * falloff * clampedDt;
        vy += (-ry * 15.0 + ty * 6.0) * falloff * clampedDt;
        nextHeat = 1.0;
      }
    }
  }

  // Apply shockwave ring expansion impulse
  if (shockwaveProgress > 0 && shockwaveProgress < 1) {
    const waveRadius = 1.6 + shockwaveProgress * 9.5;
    const radialDist = Math.abs(nextRadius - waveRadius);
    if (radialDist < 1.2) {
      const impulse = (1.0 - radialDist / 1.2) * 5.0 * clampedDt;
      const normX = targetX / (nextRadius || 1);
      const normY = targetY / (nextRadius || 1);
      vx += normX * impulse;
      vy += normY * impulse;
      nextHeat = 1.0;
    }
  }

  return {
    ...p,
    x: targetX + vx,
    y: targetY + vy,
    z: targetZ + vz,
    vx,
    vy,
    vz,
    radius: nextRadius,
    angle: nextAngle,
    angularSpeed: omega,
    heat: Math.max(0.05, Math.min(1.0, nextHeat)),
  };
}

/**
 * Updates a dedicated Cursor Trail & Swirl Particle so moving or hovering the mouse
 * creates a luminous swirling ribbon of golden-white sparks that orbit the cursor
 * and gradually spiral toward the black hole singularity.
 */
export function stepCursorTrailParticle(
  tp: CursorTrailParticle,
  index: number,
  dt: number,
  pointerWorld: { x: number; y: number; z: number; vx: number; vy: number; active: boolean },
  spinSpeed: number
): CursorTrailParticle {
  const clampedDt = Math.min(Math.max(dt, 0.001), 0.05);
  let nextLife = tp.life - clampedDt / Math.max(0.3, tp.maxLife);

  // Respawn expired trail particles at the cursor when pointer is active
  if (nextLife <= 0) {
    if (!pointerWorld.active) {
      return {
        ...tp,
        life: 0,
      };
    }
    const spawnAngle = index * 2.39996 + tp.swirlPhase; // Golden angle distribution around cursor
    const spawnRadius = 0.08 + (index % 7) * 0.045;
    const cosA = Math.cos(spawnAngle);
    const sinA = Math.sin(spawnAngle);

    // Tangential orbital velocity around cursor + fraction of cursor motion
    const swirlSpeed = 1.6 + (index % 5) * 0.35;
    return {
      ...tp,
      x: pointerWorld.x + cosA * spawnRadius,
      y: pointerWorld.y + sinA * spawnRadius,
      z: pointerWorld.z + 0.6,
      vx: -sinA * swirlSpeed + pointerWorld.vx * 0.25,
      vy: cosA * swirlSpeed + pointerWorld.vy * 0.25,
      vz: ((index % 3) - 1) * 0.2,
      life: 1.0,
      swirlPhase: tp.swirlPhase + 0.37,
    };
  }

  // Active trail particle: swirl around the cursor if close, and drift toward black hole center (0, -0.25)
  const dxPtr = pointerWorld.x - tp.x;
  const dyPtr = pointerWorld.y - tp.y;
  const distPtr = Math.sqrt(dxPtr * dxPtr + dyPtr * dyPtr + 0.08);

  let vx = tp.vx * 0.96;
  let vy = tp.vy * 0.96;
  let vz = tp.vz * 0.96;

  if (pointerWorld.active && distPtr < 3.2) {
    const pullFactor = (1.0 - distPtr / 3.2) * 3.8;
    // Swirl tangentially around the cursor + soft inward tether
    const rx = dxPtr / distPtr;
    const ry = dyPtr / distPtr;
    vx += (-ry * 6.5 + rx * 2.4) * pullFactor * clampedDt;
    vy += (rx * 6.5 + ry * 2.4) * pullFactor * clampedDt;
  }

  // Gentle gravitational pull toward the main black hole singularity at (0, -0.25)
  const dxBh = -tp.x;
  const dyBh = -0.25 - tp.y;
  const distBh = Math.sqrt(dxBh * dxBh + dyBh * dyBh + 0.5);
  const bhPull = (0.95 * spinSpeed) / distBh;
  vx += ((dxBh / distBh) * 1.4 - (dyBh / distBh) * 1.8) * bhPull * clampedDt;
  vy += ((dyBh / distBh) * 1.4 + (dxBh / distBh) * 1.8) * bhPull * clampedDt;

  return {
    ...tp,
    x: tp.x + vx * clampedDt,
    y: tp.y + vy * clampedDt,
    z: tp.z + vz * clampedDt,
    vx,
    vy,
    vz,
    life: nextLife,
    swirlPhase: tp.swirlPhase + clampedDt * 4.0,
  };
}
