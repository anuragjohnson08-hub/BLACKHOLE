import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeGentleBlackHoleRotation,
  computeIsotropicScreenCoords,
  computeOrbitalAngularSpeed,
  stepCursorTrailParticle,
  stepParticleKinematics,
  SIMULATION_PRESETS,
  MERTANA_PILLARS,
  type CursorTrailParticle,
  type ParticleState,
  type SimulationConfig,
} from './blackholePhysics';

test('computeIsotropicScreenCoords preserves exact 1:1 circularity in both fullscreen (1920x1080) and half-screen (720x900)', () => {
  const viewports = [
    { w: 1920, h: 1080 }, // Fullscreen 16:9
    { w: 2560, h: 1080 }, // Ultrawide 21:9
    { w: 1440, h: 900 },  // Standard desktop 16:10
    { w: 720, h: 900 },   // Half-screen split
  ];

  for (const vp of viewports) {
    const centerPxX = 0.495 * vp.w;
    const centerPxY = 0.465 * vp.h;
    const pixelRadius = 220; // 220px offset horizontally vs 220px offset vertically

    const rightPoint = computeIsotropicScreenCoords(centerPxX + pixelRadius, centerPxY, vp.w, vp.h);
    const topPoint = computeIsotropicScreenCoords(centerPxX, centerPxY + pixelRadius, vp.w, vp.h);

    assert.ok(
      Math.abs(rightPoint.radius - topPoint.radius) < 1e-9,
      `Black hole must be a perfect circle at ${vp.w}x${vp.h} (got rx=${rightPoint.radius}, ry=${topPoint.radius})`
    );
  }
});

test('computeGentleBlackHoleRotation produces smooth, bounded rotation and precession', () => {
  const rot0 = computeGentleBlackHoleRotation(0, 1.0, -21.5);
  const rot1 = computeGentleBlackHoleRotation(1.0, 1.0, -21.5);

  assert.equal(rot0.lensingAngle, 0);
  assert.ok(rot1.lensingAngle > 0 && rot1.lensingAngle < 0.5, 'Rotation over 1s should be gentle and smooth');
  assert.ok(rot1.accretionPhase > 0 && rot1.accretionPhase < 0.6, 'Accretion drift should be smooth and unhurried');
  assert.ok(
    Math.abs(rot1.precessionTiltRad - rot0.precessionTiltRad) < 0.05,
    'Precession tilt should stay within subtle bounds'
  );
});

test('computeOrbitalAngularSpeed decreases with radius (Keplerian falloff) and scales with spinSpeed', () => {
  const innerSpeed = computeOrbitalAngularSpeed(2.0, 1.0);
  const outerSpeed = computeOrbitalAngularSpeed(6.0, 1.0);
  assert.ok(innerSpeed > outerSpeed, 'Inner accretion orbit must rotate faster than outer orbit');

  const fastSpin = computeOrbitalAngularSpeed(3.0, 2.0);
  const normalSpin = computeOrbitalAngularSpeed(3.0, 1.0);
  assert.ok(Math.abs(fastSpin - normalSpin * 2) < 1e-6, 'Angular speed scales linearly with spinSpeed');
});

test('stepParticleKinematics advances angle and swirls around cursor in vortex mode', () => {
  const baseParticle: ParticleState = {
    x: 3.0,
    y: 0.0,
    z: 0.0,
    vx: 0,
    vy: 0,
    vz: 0,
    radius: 3.0,
    angle: 0,
    angularSpeed: 0.5,
    size: 1.0,
    heat: 0.4,
  };

  const vortexConfig: SimulationConfig = {
    ...SIMULATION_PRESETS.gargantua,
    interactionMode: 'vortex',
  };

  const stepped = stepParticleKinematics(
    baseParticle,
    0.016,
    vortexConfig,
    { x: 3.2, y: 0.2, z: 0, vx: 1.5, vy: -0.5, active: true },
    0
  );

  assert.ok(stepped.angle > baseParticle.angle, 'Particle orbital angle should advance');
  assert.notEqual(stepped.vx, 0, 'Active pointer within range should impart swirling velocity');
  assert.ok(stepped.heat > baseParticle.heat, 'Vortex proximity should heat up plasma particles');

  // Test repulse vs vortex velocity direction
  const repulseConfig: SimulationConfig = {
    ...SIMULATION_PRESETS.gargantua,
    interactionMode: 'repulse',
  };
  const repulsed = stepParticleKinematics(
    baseParticle,
    0.016,
    repulseConfig,
    { x: 3.5, y: 0.0, z: 0, active: true },
    0
  );
  assert.ok(repulsed.vx < 0, 'Repulse mode with pointer at +x offset should push particle in -x direction');
});

test('stepCursorTrailParticle spawns at active cursor and swirls along trail', () => {
  const expiredTrail: CursorTrailParticle = {
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    life: 0.0,
    maxLife: 1.2,
    size: 1.8,
    swirlPhase: 0.5,
  };

  const spawned = stepCursorTrailParticle(
    expiredTrail,
    3,
    0.016,
    { x: 2.0, y: -1.0, z: 0, vx: 3.0, vy: 1.5, active: true },
    1.0
  );

  assert.equal(spawned.life, 1.0, 'Expired trail particle should respawn at full life when cursor is active');
  assert.ok(Math.hypot(spawned.x - 2.0, spawned.y - -1.0) < 0.6, 'Respawned trail particle should appear near cursor');

  const stepped = stepCursorTrailParticle(
    spawned,
    3,
    0.016,
    { x: 2.05, y: -0.95, z: 0, vx: 3.0, vy: 1.5, active: true },
    1.0
  );
  assert.ok(stepped.life < 1.0 && stepped.life > 0, 'Active trail particle life should decay smoothly');
  assert.notEqual(stepped.x, spawned.x, 'Trail particle should swirl and move along its trajectory');
});

test('stepParticleKinematics respawns particle when crossing event horizon', () => {
  const horizonParticle: ParticleState = {
    x: 1.66,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    radius: 1.6805,
    angle: 1.2,
    angularSpeed: 1.0,
    size: 1.5,
    heat: 0.9,
  };

  const config: SimulationConfig = {
    ...SIMULATION_PRESETS.hyper_luminal,
    interactionMode: 'orbit',
  };

  const next = stepParticleKinematics(
    horizonParticle,
    0.05,
    config,
    { x: 0, y: 0, z: 0, active: false },
    0
  );

  assert.ok(next.radius > 7.0, 'Particle crossing inner horizon threshold should respawn in outer accretion disk');
});

test('MERTANA_PILLARS contains all four brand pillars from reference design', () => {
  const labels = MERTANA_PILLARS.map((p) => p.label);
  assert.deepEqual(labels, ['Experience', 'Consistency', 'Quality', 'Dedication']);
});
