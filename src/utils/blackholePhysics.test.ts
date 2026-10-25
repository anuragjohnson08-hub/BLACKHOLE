import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeGentleBlackHoleRotation,
  computeIsotropicScreenCoords,
  computeOrbitalAngularSpeed,
  computePortalCutsceneState,
  computeScrollChoreography,
  stepCursorTrailParticle,
  stepParticleKinematics,
  SIMULATION_PRESETS,
  MERTANA_PILLARS,
  type CursorTrailParticle,
  type ParticleState,
  type SimulationConfig,
} from './blackholePhysics';

test('computeScrollChoreography maps scroll progress and velocity to zoom, tilt, coreTwist, pressure effects, hero split, warp, and chapters', () => {
  const origin = computeScrollChoreography(0, 0);
  assert.equal(origin.zoomScale, 1.0);
  assert.equal(origin.heroSplitPx, 0);
  assert.equal(origin.heroOpacity, 1.0);
  assert.equal(origin.chapterIndex, 0);
  assert.equal(origin.coreTwist, 0);
  assert.equal(origin.corePressureGlow, 0);
  assert.equal(origin.pressureTremor, 0);

  const midScroll = computeScrollChoreography(0.45, 0.8);
  assert.ok(midScroll.zoomScale > 1.35, 'Black hole should zoom in as user scrolls down');
  assert.ok(midScroll.tiltDegOffset > 10, 'Accretion disk tilt should progress with scroll');
  assert.equal(midScroll.heroOpacity, 0, 'Hero title should cleanly fade out past 24% scroll');
  assert.ok(midScroll.heroSplitPx > 200, 'Hero title halves should parallax apart');
  assert.ok(midScroll.warpFactor > 1.0, 'Scroll velocity should boost particle warp factor');
  assert.equal(midScroll.chapterIndex, 2, '45% scroll should map to Chapter 2 (Consistency)');
  assert.ok(
    midScroll.coreTwist > 0.25 && midScroll.coreTwist < 0.5,
    'Core S-curve twist should smoothly build through middle chapters'
  );

  const deepHorizon = computeScrollChoreography(1.0, 0);
  assert.ok(deepHorizon.zoomScale > 1.9, 'Deep scroll reaches maximum Event Horizon close-up');
  assert.equal(deepHorizon.chapterIndex, 4, '100% scroll should map to Chapter 4 (Dedication)');
  assert.equal(deepHorizon.coreTwist, 1.0, 'Core twist reaches maximum S-curve pinch at final chapter');
  assert.equal(deepHorizon.corePressureGlow, 1.0, 'Core compression glow peaks at final chapter');
  assert.equal(deepHorizon.pressureTremor, 1.0, 'Gravitational pressure tremor peaks at final chapter');
});

test('computePortalCutsceneState drives 3-stage link redirect transition cutscene (Overdrive -> Plunge -> Singularity Flash)', () => {
  const idle = computePortalCutsceneState(0);
  assert.equal(idle.stage, 'idle');
  assert.equal(idle.zoomBoost, 1);
  assert.equal(idle.flashIntensity, 0);
  assert.equal(idle.uiFadeOut, 1);

  const overdrive = computePortalCutsceneState(0.2);
  assert.equal(overdrive.stage, 'overdrive');
  assert.ok(overdrive.twistBoost > 0.2, 'Core twist overdrive accelerates immediately');
  assert.ok(overdrive.uiFadeOut < 0.4, 'Page UI fades out during stage 1');

  const plunge = computePortalCutsceneState(0.6);
  assert.equal(plunge.stage, 'plunge');
  assert.ok(plunge.zoomBoost > 1.5, 'Camera plunges into event horizon during stage 2');
  assert.equal(plunge.percent, 60);

  const climax = computePortalCutsceneState(1.0);
  assert.equal(climax.stage, 'flash');
  assert.equal(climax.flashIntensity, 1.0, 'Singularity white-out flash reaches 1.0 at 100%');
  assert.equal(climax.percent, 100);
});

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
    const pixelRadius = 220;

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

test('stepParticleKinematics advances angle, swirls around cursor, and accelerates during scroll warp', () => {
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
    0,
    0
  );

  assert.ok(stepped.angle > baseParticle.angle, 'Particle orbital angle should advance');
  assert.notEqual(stepped.vx, 0, 'Active pointer within range should impart swirling velocity');

  // Verify warpFactor accelerates particles along Z and increases orbital progress
  const warped = stepParticleKinematics(
    baseParticle,
    0.016,
    vortexConfig,
    { x: 0, y: 0, z: 0, active: false },
    0,
    1.8
  );
  assert.ok(warped.vz > 0, 'Scroll warp factor should propel particles toward the viewer');
  assert.ok(warped.angle > stepped.angle, 'Scroll warp factor should accelerate orbital speed');
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

test('MERTANA_PILLARS contains all four brand pillars with scroll chapter metadata', () => {
  const labels = MERTANA_PILLARS.map((p) => p.label);
  assert.deepEqual(labels, ['Experience', 'Consistency', 'Quality', 'Dedication']);
  assert.equal(MERTANA_PILLARS[0].chapterNumber, '01');
  assert.equal(MERTANA_PILLARS[3].chapterNumber, '04');
});
