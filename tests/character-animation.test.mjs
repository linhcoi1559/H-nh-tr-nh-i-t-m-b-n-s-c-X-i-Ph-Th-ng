import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';

const clips = JSON.parse(fs.readFileSync(new URL('../assets/models/citizen-animations.json', import.meta.url)));
const glb = fs.readFileSync(new URL('../assets/models/Michelle.glb', import.meta.url));
const model = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)));
const boneNames = new Set(model.skins[0].joints.map(i => THREE.PropertyBinding.sanitizeNodeName(model.nodes[i].name)));

test('all locomotion clips bind to actual target bones and contain valid normalized rotations', () => {
  assert.deepEqual(clips.map(c => c.name), ['Idle', 'Walk', 'Run']);
  for (const data of clips) {
    const clip = THREE.AnimationClip.parse(data);
    assert.equal(clip.validate(), true);
    for (const track of clip.tracks) {
      const name = track.name.split('.')[0];
      assert.ok(boneNames.has(name), `Missing target bone: ${name}`);
      assert.ok([...track.values].every(Number.isFinite));
      if (track.name.endsWith('.quaternion')) {
        for (let i = 0; i < track.values.length; i += 4) {
          assert.ok(Math.abs(Math.hypot(...track.values.slice(i, i + 4)) - 1) < .001);
        }
        const a = new THREE.Quaternion().fromArray(track.values).normalize();
        const b = new THREE.Quaternion().fromArray(track.values, track.values.length - 4).normalize();
        assert.ok(a.angleTo(b) < .001, `${track.name} has a discontinuous loop`);
      }
    }
    assert.equal(clip.tracks.filter(t => t.name.endsWith('.position')).length, 1);
    assert.equal(clip.tracks.some(t => t.name.endsWith('.scale')), false);
  }
});

