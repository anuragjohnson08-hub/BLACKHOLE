import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeOrbitalAngularSpeed,
  stepParticleKinematics,
  SIMULATION_PRESETS,
  MERTANA_PILLARS,
  type ParticleState,
  type SimulationConfig,
} from './blackholePhysics';

test('computeOrbitalAngularSpeed decreases with radius (Keplerian falloff) and scales with spinSpeed', () => {
  const innerSpeed = computeOrbitalAngularSpeed(2.0, 1.0);
  const outerSpeed = computeOrbitalAngularSpeed(6.0, 1.0);
  assert.ok(innerSpeed > outerSpeed, 'Inner accretion orbit must rotate faster than outer orbit');

  const fastSpin = computeOrbitalAngularSpeed(3.0, 2.0);
  const normalSpin = computeOrbitalAngularSpeed(3.0, 1.0);
  assert.ok(Math.abs(fastSpin - normalSpin * 2) < 1e-6, 'Angular speed scales linearly with spinSpeed');
});

test('stepParticleKinematics advances angle and responds to vortex and repulse pointer modes', () => {
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
    { x: 3.2, y: 0.2, z: 0, active: true },
    0
  );

  assert.ok(stepped.angle > baseParticle.angle, 'Particle orbital angle should advance');
  assert.notEqual(stepped.vx, 0, 'Active pointer within range should impart velocity');
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
    { x: 3.2, y: 0.0, z: 0, active: true },
    0
  );
  assert.ok(repulsed.vx < 0, 'Repulse mode with pointer at +x offset should push particle in -x direction');
});

test('stepParticleKinematics respawns particle when crossing event horizon', () => {
  const horizonParticle: ParticleState = {
    x: 1.66,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    radius: 1.681,
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
