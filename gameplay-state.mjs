import { normalizeNight } from './story-night.mjs';
import { normalizeDaylife } from './daylife-state.mjs';
import { normalizeArcade } from './arcade-state.mjs';

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'phu-thuong-save-v1';

export const DEFAULT_RELATIONSHIPS = Object.freeze({
  npc_baove: 0,
  npc_ubnd: 0,
  npc_trada: 0,
  npc_ngaba: 0,
  npc_lietsi: 0,
  xoi_vendor: 0
});

export const DEFAULT_NEIGHBORHOOD = Object.freeze({
  cohesion: 0,
  beauty: 0,
  livelihood: 0,
  heritage: 0
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

export function relationshipLevel(points) {
  if (points >= 80) return 5;
  if (points >= 55) return 4;
  if (points >= 35) return 3;
  if (points >= 18) return 2;
  if (points >= 6) return 1;
  return 0;
}

export function normalizeSnapshot(input = {}) {
  const inventory = Array.isArray(input.inventory)
    ? input.inventory.filter(([id, item]) => typeof id === 'string' && item && Number(item.count) > 0)
    : [];

  return {
    version: SAVE_VERSION,
    savedAt: Number(input.savedAt) || Date.now(),
    day: Math.max(1, Math.floor(Number(input.day) || 1)),
    time: clamp(input.time ?? 9.5, 0, 23.99),
    coins: Math.max(0, Math.floor(Number(input.coins) || 0)),
    xp: Math.max(0, Math.floor(Number(input.xp) || 0)),
    stamina: clamp(input.stamina ?? 100, 0, 100),
    inventory,
    completedQuests: Array.isArray(input.completedQuests) ? [...new Set(input.completedQuests)] : [],
    snappedPhotos: Array.isArray(input.snappedPhotos) ? [...new Set(input.snappedPhotos)] : [],
    collectedRelicIds: Array.isArray(input.collectedRelicIds) ? [...new Set(input.collectedRelicIds)] : [],
    visitedNPCs: Array.isArray(input.visitedNPCs) ? [...new Set(input.visitedNPCs)] : [],
    relationships: Object.fromEntries(Object.keys(DEFAULT_RELATIONSHIPS).map((key) => [
      key,
      clamp(input.relationships?.[key] ?? 0, 0, 100)
    ])),
    neighborhood: Object.fromEntries(Object.keys(DEFAULT_NEIGHBORHOOD).map((key) => [
      key,
      clamp(input.neighborhood?.[key] ?? 0, 0, 100)
    ])),
    teaStallUpgrade: ['green', 'heritage'].includes(input.teaStallUpgrade) ? input.teaStallUpgrade : null,
    streetStoryStep: Math.max(0, Math.min(4, Math.floor(Number(input.streetStoryStep) || 0))),
    horrorChapterStage: Math.max(0, Math.min(6, Math.floor(Number(input.horrorChapterStage) || 0))),
    horrorEnding: ['truth', 'safe', 'peace'].includes(input.horrorEnding) ? input.horrorEnding : null,
    night: normalizeNight(input.night),
    daylife: normalizeDaylife(input.daylife, Math.max(1,Math.floor(Number(input.day)||1))),
    arcade: normalizeArcade(input.arcade, Math.max(1,Math.floor(Number(input.day)||1))),
    playerPosition: {
      x: clamp(input.playerPosition?.x ?? 0, -230, 430),
      y: clamp(input.playerPosition?.y ?? 0, 0, 20),
      z: clamp(input.playerPosition?.z ?? 1.5, -270, 115)
    },
    camYaw: Number.isFinite(Number(input.camYaw)) ? Number(input.camYaw) : 0
  };
}

export function parseSnapshot(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== SAVE_VERSION) return null;
    return normalizeSnapshot(parsed);
  } catch {
    return null;
  }
}

export function encodeSnapshot(snapshot) {
  return JSON.stringify(normalizeSnapshot({ ...snapshot, savedAt: Date.now() }));
}

export function awardProgress(target, { relationship, neighborhood } = {}) {
  if (relationship) {
    for (const [key, amount] of Object.entries(relationship)) {
      if (!(key in target.relationships)) continue;
      target.relationships[key] = clamp(target.relationships[key] + amount, 0, 100);
    }
  }
  if (neighborhood) {
    for (const [key, amount] of Object.entries(neighborhood)) {
      if (!(key in target.neighborhood)) continue;
      target.neighborhood[key] = clamp(target.neighborhood[key] + amount, 0, 100);
    }
  }
  return target;
}
