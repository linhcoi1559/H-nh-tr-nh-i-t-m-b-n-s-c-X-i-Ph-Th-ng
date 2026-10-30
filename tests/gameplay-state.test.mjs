import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  awardProgress,
  encodeSnapshot,
  normalizeSnapshot,
  parseSnapshot,
  relationshipLevel
} from '../gameplay-state.mjs';

test('save snapshots round-trip Maps and Sets represented as arrays', () => {
  const encoded = encodeSnapshot({
    version: 1,
    day: 2,
    time: 18.5,
    coins: 42000,
    xp: 160,
    stamina: 75,
    inventory: [['xoi_phu_thuong', { count: 1 }]],
    completedQuests: ['quest_baove'],
    snappedPhotos: ['spot_thpt'],
    collectedRelicIds: ['relic_thpt'],
    visitedNPCs: ['npc_baove'],
    relationships: { npc_baove: 12 },
    neighborhood: { cohesion: 4 },
    streetStoryStep: 3,
    horrorChapterStage: 4,
    horrorEnding: 'truth',
    playerPosition: { x: -2, y: 0, z: 8 }
  });
  const restored = parseSnapshot(encoded);
  assert.equal(restored.day, 2);
  assert.equal(restored.relationships.npc_baove, 12);
  assert.deepEqual(restored.completedQuests, ['quest_baove']);
  assert.equal(restored.inventory[0][0], 'xoi_phu_thuong');
  assert.equal(restored.streetStoryStep, 3);
  assert.equal(restored.horrorChapterStage, 4);
  assert.equal(restored.horrorEnding, 'truth');
});

test('invalid and out-of-range save values are safely normalized', () => {
  const save = normalizeSnapshot({ day: -3, time: 99, stamina: -5, coins: -20, streetStoryStep: 99, horrorChapterStage: 99, horrorEnding: 'fake' });
  assert.equal(save.day, 1);
  assert.equal(save.time, 23.99);
  assert.equal(save.stamina, 0);
  assert.equal(save.coins, 0);
  assert.equal(save.streetStoryStep, 4);
  assert.equal(save.horrorChapterStage, 6);
  assert.equal(save.horrorEnding, null);
  assert.equal(parseSnapshot('{broken'), null);
});

test('progress awards clamp relationships and neighborhood stats', () => {
  const target = normalizeSnapshot({ relationships: { npc_trada: 98 }, neighborhood: { beauty: 99 } });
  awardProgress(target, {
    relationship: { npc_trada: 8 },
    neighborhood: { beauty: 5, heritage: 3 }
  });
  assert.equal(target.relationships.npc_trada, 100);
  assert.equal(target.neighborhood.beauty, 100);
  assert.equal(target.neighborhood.heritage, 3);
});

test('relationship level exposes six readable tiers', () => {
  assert.deepEqual([0, 6, 18, 35, 55, 80].map(relationshipLevel), [0, 1, 2, 3, 4, 5]);
});
