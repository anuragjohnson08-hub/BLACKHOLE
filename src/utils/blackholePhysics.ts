/**
 * Pure physics, gentle relativistic rotation, scroll choreography, orbital mechanics,
 * and cursor-trail swirl calculations for the Mertana Three.js black hole.
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
  chapterNumber: string;
  label: string;
  tagline: string;
  headline: string;
  metricLabel: string;
  metricValue: string;
  secondaryMetricLabel: string;
  secondaryMetricValue: string;
  description: string;
  scrollTargetTiltDeg: number;
  scrollTargetZoom: number;
  resonanceMultiplier: number;
  accentColor: string;
  alignment: 'left' | 'right';
}

export const MERTANA_PILLARS: PillarItem[] = [
  {
    id: 'experience',
    chapterNumber: '01',
    label: 'Experience',
    tagline: 'RELATIVISTIC DEPTH',
    headline: 'Sculpted Across Deep Gravitational Gradients',
    metricLabel: 'HORIZON STABILITY',
    metricValue: '99.98%',
    secondaryMetricLabel: 'PROPER TIME DILATION',
    secondaryMetricValue: '1.42 γ',
    description:
      'Every interaction is engineered across high-gravity curvature where light bends into concentric clarity and raw energy settles into effortless motion.',
    scrollTargetTiltDeg: -14.0,
    scrollTargetZoom: 1.24,
    resonanceMultiplier: 1.15,
    accentColor: '#FFB84D',
    alignment: 'left',
  },
  {
    id: 'consistency',
    chapterNumber: '02',
    label: 'Consistency',
    tagline: 'INVARIANT ORBITAL MOMENTUM',
    headline: 'Unbroken Momentum From Outer Torus to Core',
    metricLabel: 'ANGULAR SPIN (a/M)',
    metricValue: '0.998 c',
    secondaryMetricLabel: 'ORBITAL COHERENCE',
    secondaryMetricValue: '10^8 Cycles',
    description:
      'Conservation of angular momentum sustains a continuous, luminous plasma stream across the equatorial plane—delivering unwavering output without decay.',
    scrollTargetTiltDeg: -5.5,
    scrollTargetZoom: 1.48,
    resonanceMultiplier: 1.3,
    accentColor: '#F58220',
    alignment: 'right',
  },
  {
    id: 'quality',
    chapterNumber: '03',
    label: 'Quality',
    tagline: 'PHOTON-RING CLARITY',
    headline: 'Spectral Precision at the Innermost Stable Orbit',
    metricLabel: 'LENSING FIDELITY',
    metricValue: '4.21 R_s',
    secondaryMetricLabel: 'PHOTON CAPTURE RADIUS',
    secondaryMetricValue: '2.60 GM/c²',
    description:
      'Zero-compromise optical purity where dual photon rings focus scattered light into razor-sharp concentric harmonics right at the shadow boundary.',
    scrollTargetTiltDeg: 3.5,
    scrollTargetZoom: 1.72,
    resonanceMultiplier: 1.45,
    accentColor: '#FFD992',
    alignment: 'left',
  },
  {
    id: 'dedication',
    chapterNumber: '04',
    label: 'Dedication',
    tagline: 'SINGULARITY FOCUS',
    headline: 'It Starts and Ends With a Zero',
    metricLabel: 'ZERO-POINT CONVERGENCE',
    metricValue: '0.000 Ω',
    secondaryMetricLabel: 'EVENT HORIZON FLUX',
    secondaryMetricValue: '8.94 × 10^44 erg/s',
    description:
      'Total commitment to the singularity: where ride, bond, and growth converge at point zero and transform chaotic cosmic debris into radiant order.',
    scrollTargetTiltDeg: 12.0,
    scrollTargetZoom: 1.96,
    resonanceMultiplier: 1.65,
    accentColor: '#E85D33',
    alignment: 'right',
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

export interface ScrollChoreography {
  scrollProgress: number;     // 0.0 (top hero) to 1.0 (deepest horizon chapter)
  zoomScale: number;          // 1.00 at hero -> 1.96 at final chapter
  cameraZ: number;            // 11.5 at hero -> 6.1 at final chapter
  tiltDegOffset: number;      // 0 deg at hero -> +33.5 deg across scroll
  lensingBoost: number;       // 1.00 -> 1.38 as viewer approaches photon ring
  warpFactor: number;         // 0.0 when still -> up to 2.5 during rapid scroll
  heroSplitPx: number;        // 0px at top -> 280px horizontal split for 'Mer' / 'tana'
  heroLiftPx: number;         // 0px at top -> -110px vertical lift
  heroOpacity: number;        // 1.0 at top -> 0.0 by 24% scroll
  chapterIndex: number;       // 0 = Hero, 1 = Experience, 2 = Consistency, 3 = Quality, 4 = Dedication
  coreTwist: number;          // 0.0 at hero -> 1.0 at final chapter (S-curve core torsion pinch)
  corePressureGlow: number;   // 0.0 -> 1.0 white-hot core compression glow at pinch point
  pressureTremor: number;     // 0.0 -> 1.0 subtle camera micro-tremor under max gravitational pressure
}

export interface PortalCutsceneState {
  progress: number;           // 0.0 to 1.0 over the 2.2s transition cutscene
  stage: 'idle' | 'overdrive' | 'plunge' | 'flash';
  stageLabel: string;
  twistBoost: number;         // Additional core twist rotation during cutscene (0.0 -> 2.4)
  zoomBoost: number;          // Camera plunge multiplier (1.0 -> 3.4)
  warpBoost: number;          // Relativistic particle stream speed (0.0 -> 3.6)
  flashIntensity: number;     // White-hot singularity white-out at climax (0.0 -> 1.0)
  uiFadeOut: number;          // Current page UI opacity (1.0 -> 0.0 in first 30%)
  hudOpacity: number;         // Cutscene loading HUD opacity (0.0 -> 1.0 -> 0.0)
  percent: number;            // 0 to 100 loading percentage
}

/**
 * Pure deterministic calculator for the 3-stage Singularity Portal Transition Cutscene
 * triggered when a user clicks a redirect link.
 */
export function computePortalCutsceneState(rawProgress: number): PortalCutsceneState {
  const p = Math.max(0, Math.min(1, rawProgress));
  if (p <= 0) {
    return {
      progress: 0,
      stage: 'idle',
      stageLabel: 'STANDBY',
      twistBoost: 0,
      zoomBoost: 1,
      warpBoost: 0,
      flashIntensity: 0,
      uiFadeOut: 1,
      hudOpacity: 0,
      percent: 0,
    };
  }

  // Stage classification
  let stage: PortalCutsceneState['stage'] = 'overdrive';
  let stageLabel = 'STAGE 01 // CORE TORSION OVERDRIVE';
  if (p >= 0.76) {
    stage = 'flash';
    stageLabel = 'STAGE 03 // SINGULARITY HORIZON BREACH';
  } else if (p >= 0.32) {
    stage = 'plunge';
    stageLabel = 'STAGE 02 // CROSSING EVENT HORIZON';
  }

  // Rapid S-curve vortex spin buildup across entire cutscene
  const twistBoost = Math.pow(p, 1.3) * 2.45;

  // Plunge zoom: gentle gathering in first 28%, then exponential dive into the core
  const plungePhase = Math.max(0, (p - 0.22) / 0.78);
  const zoomBoost = 1.0 + Math.pow(plungePhase, 2.05) * 2.55;

  // Relativistic particle warp tunnel
  const warpBoost = Math.min(3.8, p * 4.2);

  // White-hot singularity flash in final 26% of cutscene
  const flashPhase = Math.max(0, (p - 0.74) / 0.26);
  const flashIntensity = flashPhase * flashPhase * (3 - 2 * flashPhase);

  // Fade out current page cards over first 28%
  const uiFadeOut = Math.max(0, 1 - p / 0.28);

  // Cutscene telemetry HUD fades in quickly and dims slightly during final white-out
  const hudIn = Math.min(1, p / 0.16);
  const hudOut = p > 0.88 ? Math.max(0, 1 - (p - 0.88) / 0.12) : 1;
  const hudOpacity = hudIn * hudOut;

  return {
    progress: p,
    stage,
    stageLabel,
    twistBoost,
    zoomBoost,
    warpBoost,
    flashIntensity,
    uiFadeOut,
    hudOpacity,
    percent: Math.round(p * 100),
  };
}

/**
 * Pure deterministic scroll choreography calculator mapping normalized scroll progress (0..1)
 * and scroll velocity into 3D black hole zoom, disk tilt, particle warp, core S-curve twist,
 * pressure compression glow, camera micro-tremor, and hero title parallax.
 */
export function computeScrollChoreography(
  rawProgress: number,
  rawVelocity: number
): ScrollChoreography {
  const p = Math.max(0, Math.min(1, rawProgress));
  const absVel = Math.min(1.5, Math.abs(rawVelocity));

  // Smooth zoom into the black hole event horizon (1.00x -> 1.96x)
  const zoomScale = 1.0 + p * 0.96;
  const cameraZ = 11.5 - p * 5.4;

  // Progressive tilt of the equatorial accretion disk (+33.5 deg sweep from -21.5 deg to +12.0 deg)
  const tiltDegOffset = p * 33.5;

  // Heighten photon ring brightness as viewer approaches the horizon
  const lensingBoost = 1.0 + Math.sin(p * Math.PI * 0.5) * 0.35;

  // Warp-speed particle stream multiplier proportional to scroll velocity + base depth
  const warpFactor = Math.min(2.6, absVel * 1.85 + p * 0.25);

  // Smoothly build core S-curve vortex twist from start (0.0) to final chapter (1.0)
  const coreTwist = Math.pow(p, 1.35);

  // White-hot compression glow at the central S-curve pinch point
  const corePressureGlow = Math.pow(coreTwist, 1.2);

  // Subtle high-pressure camera micro-tremor ramping in during the final chapters (p >= 0.62)
  const tremorPhase = Math.max(0, Math.min(1, (p - 0.62) / 0.38));
  const pressureTremor = tremorPhase * tremorPhase * (3 - 2 * tremorPhase);

  // Hero 'Mertana' title parallax split & fade over the first 24% of scroll
  const heroPhase = Math.min(1, p / 0.24);
  const smoothHero = heroPhase * heroPhase * (3 - 2 * heroPhase);
  const heroSplitPx = smoothHero * 260;
  const heroLiftPx = -smoothHero * 95;
  const heroOpacity = Math.max(0, 1 - Math.pow(heroPhase, 1.15));

  // Determine discrete chapter index (0 = Hero, 1..4 = Pillar Chapters)
  let chapterIndex = 0;
  if (p >= 0.80) {
    chapterIndex = 4;
  } else if (p >= 0.57) {
    chapterIndex = 3;
  } else if (p >= 0.34) {
    chapterIndex = 2;
  } else if (p >= 0.14) {
    chapterIndex = 1;
  }

  return {
    scrollProgress: p,
    zoomScale,
    cameraZ,
    tiltDegOffset,
    lensingBoost,
    warpFactor,
    heroSplitPx,
    heroLiftPx,
    heroOpacity,
    chapterIndex,
    coreTwist,
    corePressureGlow,
    pressureTremor,
  };
}

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
  const lensingAngle = elapsedTime * 0.22 * safeSpeed;
  const accretionPhase = elapsedTime * 0.30 * safeSpeed;
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
 * 4. Scroll-driven warp-speed stream factor
 */
export function stepParticleKinematics(
  p: ParticleState,
  dt: number,
  config: SimulationConfig,
  pointerWorld: { x: number; y: number; z: number; vx?: number; vy?: number; active: boolean },
  shockwaveProgress: number,
  warpFactor: number = 0
): ParticleState {
  const clampedDt = Math.min(Math.max(dt, 0.001), 0.05);
  const tiltRad = (config.diskTiltDeg * Math.PI) / 180;
  const cosT = Math.cos(tiltRad);
  const sinT = Math.sin(tiltRad);

  // Advance gentle orbital angle (accelerated during scroll warp)
  const effectiveSpin = config.spinSpeed * (1.0 + warpFactor * 0.85);
  const omega = computeOrbitalAngularSpeed(p.radius, effectiveSpin);
  const nextAngle = p.angle + omega * clampedDt;

  // Gentle inward spiral for accretion stream; respawn at outer edge if swallowed
  let nextRadius = p.radius - 0.035 * effectiveSpin * clampedDt;
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

  // Rotate by disk tilt around Z axis
  const targetX = localX * cosT - verticalWave * sinT;
  const targetY = localX * sinT + verticalWave * cosT;
  const targetZ = localZ;

  // Smooth velocity damping
  let vx = p.vx * 0.945;
  let vy = p.vy * 0.945;
  let vz = p.vz * 0.92;
  let nextHeat =
    p.heat * 0.95 +
    (1.0 - Math.min(1, (nextRadius - 1.6) / 8.0)) * 0.05 +
    Math.min(0.45, warpFactor * 0.18);

  // Scroll warp-speed stream impulse (stretches particles radially & toward viewer Z)
  if (warpFactor > 0.05) {
    const radialNorm = Math.max(0.5, nextRadius);
    vx += (targetX / radialNorm) * warpFactor * 1.8 * clampedDt;
    vy += (targetY / radialNorm) * warpFactor * 1.8 * clampedDt;
    vz += warpFactor * 4.5 * clampedDt;
  }

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

      const rx = dx / dist;
      const ry = dy / dist;
      const tx = -ry;
      const ty = rx;

      if (config.interactionMode === 'vortex') {
        const ringEquilibrium = dist > 0.65 ? 1.0 : -0.8;
        vx += (rx * 5.2 * ringEquilibrium + tx * 9.8) * falloff * clampedDt + ptrVx * falloff * 0.18;
        vy += (ry * 5.2 * ringEquilibrium + ty * 9.8) * falloff * clampedDt + ptrVy * falloff * 0.18;
        vz += Math.sin(dist * 4.0) * falloff * 1.5 * clampedDt;
        nextHeat = Math.min(1.0, nextHeat + falloff * 0.55);
      } else if (config.interactionMode === 'repulse') {
        vx += (-rx * 11.0 + tx * 3.5) * falloff * clampedDt;
        vy += (-ry * 11.0 + ty * 3.5) * falloff * clampedDt;
        vz += (dz / dist) * falloff * 3.0 * clampedDt;
        nextHeat = Math.min(1.0, nextHeat + falloff * 0.4);
      } else if (config.interactionMode === 'orbit') {
        vx += tx * 12.5 * falloff * clampedDt + ptrVx * falloff * 0.15;
        vy += ty * 12.5 * falloff * clampedDt + ptrVy * falloff * 0.15;
        nextHeat = Math.min(1.0, nextHeat + falloff * 0.45);
      } else if (config.interactionMode === 'supernova') {
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

  if (nextLife <= 0) {
    if (!pointerWorld.active) {
      return {
        ...tp,
        life: 0,
      };
    }
    const spawnAngle = index * 2.39996 + tp.swirlPhase;
    const spawnRadius = 0.08 + (index % 7) * 0.045;
    const cosA = Math.cos(spawnAngle);
    const sinA = Math.sin(spawnAngle);

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

  const dxPtr = pointerWorld.x - tp.x;
  const dyPtr = pointerWorld.y - tp.y;
  const distPtr = Math.sqrt(dxPtr * dxPtr + dyPtr * dyPtr + 0.08);

  let vx = tp.vx * 0.96;
  let vy = tp.vy * 0.96;
  const vz = tp.vz * 0.96;

  if (pointerWorld.active && distPtr < 3.2) {
    const pullFactor = (1.0 - distPtr / 3.2) * 3.8;
    const rx = dxPtr / distPtr;
    const ry = dyPtr / distPtr;
    vx += (-ry * 6.5 + rx * 2.4) * pullFactor * clampedDt;
    vy += (rx * 6.5 + ry * 2.4) * pullFactor * clampedDt;
  }

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
