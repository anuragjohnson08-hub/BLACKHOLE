/**
 * Pure physics, orbital mechanics, and state calculations for the Mertana
 * Three.js relativistic black hole and interactive particle field.
 */

export type InteractionMode = 'vortex' | 'repulse' | 'orbit' | 'supernova';

export type PresetId = 'gargantua' | 'hyper_luminal' | 'horizon_eclipse' | 'tidal_surge';

export interface SimulationConfig {
  presetId: PresetId;
  spinSpeed: number;        // 0.2 to 3.0
  lensingIntensity: number; // 0.5 to 2.0
  particleTurbulence: number; // 0.2 to 2.5
  interactionMode: InteractionMode;
  diskTiltDeg: number;      // Default ~ -21.5 degrees matching Mertana poster
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
    spinSpeed: 1.0,
    lensingIntensity: 1.15,
    particleTurbulence: 1.0,
    diskTiltDeg: -21.5,
  },
  hyper_luminal: {
    presetId: 'hyper_luminal',
    spinSpeed: 2.35,
    lensingIntensity: 1.65,
    particleTurbulence: 1.85,
    diskTiltDeg: -19.0,
  },
  horizon_eclipse: {
    presetId: 'horizon_eclipse',
    spinSpeed: 0.55,
    lensingIntensity: 1.4,
    particleTurbulence: 0.6,
    diskTiltDeg: -24.0,
  },
  tidal_surge: {
    presetId: 'tidal_surge',
    spinSpeed: 1.75,
    lensingIntensity: 1.35,
    particleTurbulence: 2.25,
    diskTiltDeg: -16.5,
  },
};

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

/**
 * Computes Keplerian-inspired relativistic angular velocity for a particle at distance r
 * from the singularity (Event Horizon radius r_s = 1.6).
 */
export function computeOrbitalAngularSpeed(radius: number, spinSpeed: number): number {
  const safeRadius = Math.max(1.65, radius);
  const baseKepler = 2.4 / Math.pow(safeRadius, 1.35);
  return baseKepler * Math.max(0.1, spinSpeed);
}

/**
 * Updates a single particle's 3D position and velocity in response to:
 * 1. The tilted accretion disk orbital flow
 * 2. Interactive pointer world coordinates (attractor, repulsor, orbital swirl, or supernova shockwave)
 * 3. Active shockwave pulse radius
 */
export function stepParticleKinematics(
  p: ParticleState,
  dt: number,
  config: SimulationConfig,
  pointerWorld: { x: number; y: number; z: number; active: boolean },
  shockwaveProgress: number // 0 = inactive, 0..1 = expanding ring
): ParticleState {
  const clampedDt = Math.min(Math.max(dt, 0.001), 0.05);
  const tiltRad = (config.diskTiltDeg * Math.PI) / 180;
  const cosT = Math.cos(tiltRad);
  const sinT = Math.sin(tiltRad);

  // Advance orbital angle
  const omega = computeOrbitalAngularSpeed(p.radius, config.spinSpeed);
  const nextAngle = p.angle + omega * clampedDt;

  // Gentle inward spiral for accretion stream if close, respawn at outer edge if swallowed
  let nextRadius = p.radius - 0.08 * config.spinSpeed * clampedDt;
  if (nextRadius < 1.68) {
    nextRadius = 7.5 + ((p.size * 13.7) % 4.5);
  } else if (nextRadius > 13.5) {
    nextRadius = 3.2 + ((p.size * 7.3) % 6.0);
  }

  // Local disk plane coordinates (prior to tilt)
  const localX = Math.cos(nextAngle) * nextRadius;
  const localZ = Math.sin(nextAngle) * nextRadius;
  const verticalWave =
    Math.sin(nextAngle * 3.0 + nextRadius * 1.5) * 0.14 * config.particleTurbulence;

  // Rotate by disk tilt around Z axis so disk runs bottom-left to top-right
  let targetX = localX * cosT - verticalWave * sinT;
  let targetY = localX * sinT + verticalWave * cosT;
  let targetZ = localZ;

  let vx = p.vx * 0.92;
  let vy = p.vy * 0.92;
  let vz = p.vz * 0.92;
  let nextHeat = p.heat * 0.96 + (1.0 - Math.min(1, (nextRadius - 1.6) / 8.0)) * 0.04;

  // Apply pointer interaction force
  if (pointerWorld.active) {
    const dx = pointerWorld.x - (targetX + p.vx);
    const dy = pointerWorld.y - (targetY + p.vy);
    const dz = pointerWorld.z - (targetZ + p.vz);
    const distSq = dx * dx + dy * dy + dz * dz + 0.35;
    const dist = Math.sqrt(distSq);

    if (dist < 4.8) {
      const falloff = (1.0 - dist / 4.8) * config.particleTurbulence;
      if (config.interactionMode === 'vortex') {
        // Pull toward pointer with tangential swirl
        vx += (dx / dist) * falloff * 6.5 * clampedDt - (dy / dist) * falloff * 4.2 * clampedDt;
        vy += (dy / dist) * falloff * 6.5 * clampedDt + (dx / dist) * falloff * 4.2 * clampedDt;
        nextHeat = Math.min(1.0, nextHeat + falloff * 0.35);
      } else if (config.interactionMode === 'repulse') {
        // Push outward away from pointer
        vx -= (dx / dist) * falloff * 9.5 * clampedDt;
        vy -= (dy / dist) * falloff * 9.5 * clampedDt;
        vz += (dz / dist) * falloff * 3.0 * clampedDt;
        nextHeat = Math.min(1.0, nextHeat + falloff * 0.25);
      } else if (config.interactionMode === 'orbit') {
        // Pure tangential boost
        vx += -(dy / dist) * falloff * 8.0 * clampedDt;
        vy += (dx / dist) * falloff * 8.0 * clampedDt;
        nextHeat = Math.min(1.0, nextHeat + falloff * 0.2);
      } else if (config.interactionMode === 'supernova') {
        // High-energy radial scatter
        vx -= (dx / dist) * falloff * 14.0 * clampedDt;
        vy -= (dy / dist) * falloff * 14.0 * clampedDt;
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
      const normX = targetX / ( nextRadius || 1 );
      const normY = targetY / ( nextRadius || 1 );
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
