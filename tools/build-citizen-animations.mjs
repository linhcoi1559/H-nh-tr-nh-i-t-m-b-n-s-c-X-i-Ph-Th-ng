import fs from 'node:fs';
import * as T from 'three';

// Bake world-space rest-pose correction once, not on every game frame.
// Both files are Mixamo assets, but have different local bone axes and proportions.
function loadRig(path, heading = 0) {
  const file = fs.readFileSync(path);
  const jsonLength = file.readUInt32LE(12);
  const data = JSON.parse(file.subarray(20, 20 + jsonLength));
  const bin = file.subarray(28 + jsonLength);
  const nodes = data.nodes.map(n => {
    const o = new T.Object3D();
    o.name = T.PropertyBinding.sanitizeNodeName(n.name || '');
    if (n.translation) o.position.fromArray(n.translation);
    if (n.rotation) o.quaternion.fromArray(n.rotation);
    if (n.scale) o.scale.fromArray(n.scale);
    return o;
  });
  data.nodes.forEach((n, i) => n.children?.forEach(c => nodes[i].add(nodes[c])));
  const root = new T.Group(); root.rotation.y = heading;
  data.scenes[data.scene || 0].nodes.forEach(i => root.add(nodes[i]));
  function values(index) {
    const a = data.accessors[index], view = data.bufferViews[a.bufferView];
    const width = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type];
    if (a.componentType !== 5126 || !width) throw new Error('Unsupported animation accessor');
    const offset = (view.byteOffset || 0) + (a.byteOffset || 0);
    const out = new Float32Array(a.count * width);
    for (let i = 0; i < a.count; i++) for (let j = 0; j < width; j++)
      out[i * width + j] = bin.readFloatLE(offset + i * (view.byteStride || width * 4) + j * 4);
    return out;
  }
  const clips = data.animations.map(a => new T.AnimationClip(a.name, -1, a.channels.map(c => {
    const s = a.samplers[c.sampler];
    const property = { translation: 'position', rotation: 'quaternion', scale: 'scale' }[c.target.path];
    const Track = property === 'quaternion' ? T.QuaternionKeyframeTrack : T.VectorKeyframeTrack;
    return new Track(`${nodes[c.target.node].name}.${property}`, values(s.input), values(s.output));
  })));
  const mixer = new T.AnimationMixer(root);
  const pose = clips.find(c => c.name === 'TPose');
  mixer.clipAction(pose).play(); mixer.setTime(0); root.updateMatrixWorld(true);
  const rest = new Map();
  root.traverse(n => rest.set(n.name, {
    rotation: n.getWorldQuaternion(new T.Quaternion()),
    position: n.getWorldPosition(new T.Vector3()),
    localRotation: n.quaternion.clone(), localPosition: n.position.clone()
  }));
  mixer.stopAllAction();
  // Restore the measured T-pose after stopping the mixer restores initial values.
  root.traverse(n => { const r = rest.get(n.name); n.quaternion.copy(r.localRotation); n.position.copy(r.localPosition); });
  root.updateMatrixWorld(true);
  return { root, rest, clips, mixer, nodes };
}

const source = loadRig('assets/models/Soldier.glb', Math.PI);
const target = loadRig('assets/models/Michelle.glb');
const hipName = 'mixamorigHips';
const srcByName = new Map(source.nodes.map(n => [n.name, n]));
const bones = [];
target.root.traverse(n => { if (n.name.startsWith('mixamorig')) bones.push(n); });
const ratio = target.rest.get(hipName).position.y / source.rest.get(hipName).position.y;
const output = [];
for (const name of ['Idle', 'Walk', 'Run']) {
  const clip = source.clips.find(c => c.name === name);
  const action = source.mixer.clipAction(clip); action.reset().play();
  const frames = Math.ceil(clip.duration * 30), times = [], rotations = bones.map(() => []), hips = [];
  for (let frame = 0; frame <= frames; frame++) {
    const time = frame * clip.duration / frames;
    source.mixer.setTime(frame === frames ? 0 : time); source.root.updateMatrixWorld(true);
    times.push(time);
    bones.forEach((bone, i) => {
      const src = srcByName.get(bone.name), rest = target.rest.get(bone.name);
      if (src) {
        const rotation = src.getWorldQuaternion(new T.Quaternion())
          .multiply(source.rest.get(bone.name).rotation.clone().invert()).multiply(rest.rotation);
        bone.quaternion.copy(bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(rotation));
      } else bone.quaternion.copy(rest.localRotation);
      if (bone.name === hipName) {
        const deltaY = (src.getWorldPosition(new T.Vector3()).y - source.rest.get(hipName).position.y) * ratio;
        const position = rest.position.clone(); position.y += deltaY;
        bone.position.copy(bone.parent.worldToLocal(position));
        hips.push(...bone.position.toArray());
      }
      bone.updateMatrixWorld(true);
      rotations[i].push(...bone.quaternion.toArray());
    });
  }
  const tracks = bones.map((bone, i) => new T.QuaternionKeyframeTrack(`${bone.name}.quaternion`, times, rotations[i]));
  tracks.push(new T.VectorKeyframeTrack(`${hipName}.position`, times, hips));
  const baked = new T.AnimationClip(name, clip.duration, tracks).optimize();
  if (!baked.validate()) throw new Error(`Invalid clip: ${name}`);
  output.push(T.AnimationClip.toJSON(baked));
  source.mixer.stopAllAction();
}
fs.writeFileSync('assets/models/citizen-animations.json', JSON.stringify(output));
console.log('Baked', output.map(c => `${c.name}: ${c.tracks.length} tracks, ${c.duration.toFixed(2)}s`).join('; '));
