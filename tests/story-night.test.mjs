import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeNight, canResolveNight, constrainNightPosition, circuitStep, createThreat, perceiveThreat, lineBlocked, nextRoutePoint } from '../story-night.mjs';
import { encodeSnapshot, parseSnapshot } from '../gameplay-state.mjs';

test('night evidence, choices, battery and peace ending survive a save round trip', () => {
  const night = normalizeNight({ orders: 3, evidence: ['photo', 'marble', 'badge', 'photo'], power: true, battery: 31, composure: 52, voiceEncountered: true });
  const save = parseSnapshot(encodeSnapshot({ night, horrorEnding: 'peace', horrorChapterStage: 6 }));
  assert.deepEqual(save.night, night);
  assert.equal(save.horrorEnding, 'peace');
  assert.equal(canResolveNight(save.night), true);
  assert.equal(canResolveNight({ ...night, voiceAnswered: true }), false);
  assert.equal(canResolveNight({ ...night, power: false }), false);
  assert.equal(canResolveNight({ ...night, evidence: ['photo', 'marble'] }), false);
});

test('invalid night state cannot inject evidence or overflow resources', () => {
  const night = normalizeNight({ orders: 999, evidence: ['fake', 'constructor', 'photo', 'photo'], battery: -1, composure: Infinity });
  assert.equal(night.orders, 3);
  assert.deepEqual(night.evidence, ['photo']);
  assert.equal(night.battery, 0);
  assert.equal(night.composure, 100);
});

test('night boundaries preserve the connected shop and alley but prevent walking into unfinished scenery', () => {
  for (const input of [{ x: -90, z: -41 }, { x: -80, z: -37 }, { x: -67, z: -29 }]) {
    const position = { ...input };
    constrainNightPosition(position);
    assert.deepEqual(position, input);
  }
  const outside = { x: -120, z: -37 };
  constrainNightPosition(outside);
  assert.equal(outside.x, -93.8);
  const exit = { x: -67, z: 3 };
  constrainNightPosition(exit);
  assert.equal(exit.z, -7.4);
});

test('circuit trips on wrong order and can be solved after retrying', () => {
  assert.deepEqual(circuitStep([], 'altar'), { sequence: [], tripped: true, complete: false });
  const porch = circuitStep([], 'porch');
  assert.equal(porch.complete, false);
  const lane = circuitStep(porch.sequence, 'lane');
  assert.equal(circuitStep(lane.sequence, 'altar').complete, true);
  assert.equal(circuitStep(porch.sequence, 'porch').tripped, true);
});

test('walls block sight from either direction but a parallel open corridor does not', () => {
  const wall = [{ minX: 2, maxX: 3, minZ: -2, maxZ: 2 }];
  assert.equal(lineBlocked({ x: 0, z: 0 }, { x: 5, z: 0 }, wall), true);
  assert.equal(lineBlocked({ x: 5, z: 0 }, { x: 0, z: 0 }, wall), true);
  assert.equal(lineBlocked({ x: 1, z: -3 }, { x: 1, z: 3 }, wall), false);
  assert.equal(lineBlocked({ x: 0, z: 3 }, { x: 5, z: 3 }, wall), false);
});

test('threat loses player after occlusion, searches last known position, then returns to patrol', () => {
  const threat = createThreat();
  const input = { dt: .1, position: { x: 0, z: 0 }, player: { x: 10, z: 0 }, light: true, noise: 0, occluded: false };
  assert.equal(perceiveThreat(threat, input).mode, 'chase');
  const lastKnown = { ...threat.lastKnown };
  for (let i = 0; i < 35; i++) perceiveThreat(threat, { ...input, occluded: true, player: { x: 15, z: 5 } });
  assert.equal(threat.mode, 'search');
  assert.deepEqual(threat.lastKnown, lastKnown);
  for (let i = 0; i < 60; i++) perceiveThreat(threat, { ...input, occluded: true });
  assert.equal(threat.mode, 'patrol');
  assert.equal(threat.lastKnown, null);
});

test('running behind a nearby wall is heard; quiet darkness and the refuge conceal the player', () => {
  const input = { dt: .1, position: { x: 0, z: 0 }, player: { x: 8, z: 0 }, light: false, noise: 90, occluded: true };
  assert.equal(perceiveThreat(createThreat(), input).mode, 'investigate');
  assert.equal(perceiveThreat(createThreat(), { ...input, noise: 28, occluded: false }).mode, 'patrol');
  const refuge = perceiveThreat(createThreat(), { ...input, light: true, occluded: false, refuge: true });
  assert.equal(refuge.sees, false);
  assert.equal(refuge.hears, false);
});

test('navigation detours around a wall and stops when no walkable route exists', () => {
  const wall = [{ minX: 2, maxX: 3, minZ: -2, maxZ: 2 }];
  const start = { x: 0, z: 0 }, goal = { x: 5, z: 0 };
  const nodes = [{ x: 1, z: 3 }, { x: 4, z: 3 }];
  const next = nextRoutePoint(start, goal, nodes, wall);
  assert.deepEqual(next, nodes[0]);
  assert.equal(lineBlocked(start, next, wall, .28), false);
  assert.deepEqual(nextRoutePoint(start, goal, [], wall), start);
});
