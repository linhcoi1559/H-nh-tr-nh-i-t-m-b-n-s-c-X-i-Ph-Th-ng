import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CharacterMotor, RUN_SPEED } from '../movement.mjs';

const origin = () => ({ x: 0, y: 0, z: 0 });
function simulate(input, fps = 60, seconds = 2) {
  const motor = new CharacterMotor(), pos = origin();
  for (let i = 0; i < fps * seconds; i++) motor.update(pos, input, 0, 1 / fps);
  return { motor, pos };
}
test('diagonal travel is normalized', () => {
  const straight = simulate({ x: 0, z: 1 }).pos;
  const diagonal = simulate({ x: 1, z: 1 }).pos;
  assert.ok(Math.abs(straight.z - Math.hypot(diagonal.x, diagonal.z)) < 1e-9);
});
test('walking distance is stable at 30, 60 and 144 FPS', () => {
  const distances = [30, 60, 144].map(fps => simulate({ x: 0, z: 1 }, fps).pos.z);
  assert.ok(Math.max(...distances) - Math.min(...distances) < 0.05);
});
test('run accelerates to a bounded speed and release stops it', () => {
  const { motor, pos } = simulate({ x: 0, z: 1, run: true });
  assert.ok(motor.speed > RUN_SPEED - 0.01 && motor.speed <= RUN_SPEED + 0.001);
  for (let i = 0; i < 60; i++) motor.update(pos, { x: 0, z: 0 }, 0, 1 / 60);
  assert.equal(motor.speed, 0);
});
test('jump returns to ground and does not double jump in mid-air', () => {
  const motor = new CharacterMotor(), pos = origin();
  motor.jump(); motor.update(pos, { x: 0, z: 0 }, 0, 0.1);
  const initial = motor.vy;
  motor.jump(); motor.update(pos, { x: 0, z: 0 }, 0, 0.1);
  assert.ok(motor.vy < initial);
  for (let i = 0; i < 90; i++) motor.update(pos, { x: 0, z: 0 }, 0, 1 / 60);
  assert.equal(pos.y, 0); assert.equal(motor.grounded, true);
});
test('buffered jump shortly before landing executes on next step', () => {
  const motor = new CharacterMotor(), pos = { x: 0, y: 0.01, z: 0 };
  motor.grounded = false; motor.vy = -2; motor.jump();
  motor.update(pos, { x: 0, z: 0 }, 0, 1 / 60);
  motor.update(pos, { x: 0, z: 0 }, 0, 1 / 60);
  assert.equal(motor.grounded, false); assert.ok(motor.vy > 0);
});
test('thin walls block sprinting and allow sliding', () => {
  const motor = new CharacterMotor(), pos = origin();
  const wall = x => x >= 0.5 && x <= 0.7;
  for (let i = 0; i < 20; i++) motor.update(pos, { x: 1, z: 1, run: true }, 0, 0.1, wall);
  assert.ok(pos.x < 0.5); assert.ok(pos.z > 3);
});
test('reset cancels momentum and buffered jumps', () => {
  const { motor } = simulate({ x: 1, z: 1, run: true });
  motor.jump(); motor.reset();
  assert.equal(motor.vx, 0); assert.equal(motor.vz, 0); assert.equal(motor.jumpBuffer, 0);
});
test('movement follows the camera heading and world boundary', () => {
  const motor = new CharacterMotor(), pos = { x: 94.9, y: 0, z: 0 };
  for (let i = 0; i < 60; i++) motor.update(pos, { x: 0, z: 1 }, Math.PI / 2, 1 / 60);
  assert.equal(pos.x, 95); assert.ok(Math.abs(pos.z) < 1e-6);
});
