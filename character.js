import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { createCitizen as createFallback } from './character-fallback.js';

let assetPromise;
function assets() {
  return assetPromise ??= Promise.all([
    new GLTFLoader().loadAsync('assets/models/Michelle.glb'),
    fetch('assets/models/citizen-animations.json').then(r => {
      if (!r.ok) throw new Error(`Animation HTTP ${r.status}`);
      return r.json();
    })
  ]);
}

export function createCitizen(options = {}) {
  const fallback = createFallback(options);
  const root = new THREE.Group();
  root.add(fallback.root);
  let mixer, model, actions, bones;
  const animationOffset = options.animationOffset ?? Math.random() * 4;
  const accessoryFollowers = [];
  let previousGrounded = true, landing = 0, airborne = 0;
  const offset = new THREE.Quaternion();
  const axis = new THREE.Vector3(1, 0, 0);
  const ready = assets().then(([gltf, data]) => {
    model = clone(gltf.scene);
    const height = options.height ?? 1;
    const width = options.width ?? 1;
    model.scale.set(1.08 * width, 1.08 * height, 1.08 * width);
    model.traverse(mesh => {
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      // Animated bounds cannot be cached from the initial T pose.
      mesh.frustumCulled = false;
      const original = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const materials = original.map(mat => {
        const copy = mat.clone();
        copy.color.multiply(new THREE.Color(options.tint ?? 0xffffff));
        copy.roughness = .82;
        copy.metalness = 0;
        return copy;
      });
      mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
    });
    bones = {};
    model.traverse(n => { if (n.isBone) bones[n.name] = n; });
    buildAccessories();
    mixer = new THREE.AnimationMixer(model);
    actions = data.map(json => mixer.clipAction(THREE.AnimationClip.parse(json)));
    actions.forEach((action, i) => action.setEffectiveWeight(i === 0 ? 1 : 0).play());
    mixer.update(animationOffset);
    root.add(model);
    root.remove(fallback.root);
    const materials = new Set();
    fallback.root.traverse(n => { if (n.isMesh) { materials.add(n.material); } });
    // Fallback geometries may be shared across citizens, so retain them for pending loads.
    materials.forEach(m => m.dispose());
    return true;
  }).catch(error => {
    console.error('Không tải được model cư dân, đang dùng mẫu dự phòng:', error);
    return false;
  });

  function followBone(boneName, object, offset) {
    root.add(object);
    accessoryFollowers.push({ boneName, object, offset: new THREE.Vector3(...offset) });
  }

  function makeMaterial(color, metalness = 0, roughness = .72) {
    return new THREE.MeshStandardMaterial({ color, metalness, roughness });
  }

  function makeGlasses() {
    const group = new THREE.Group();
    const frame = makeMaterial(0x25323a, .35, .35);
    const lens = new THREE.MeshPhysicalMaterial({ color: 0xa9d5df, transparent: true, opacity: .28, roughness: .15 });
    for (const side of [-1, 1]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(.055, .007, 8, 24), frame);
      rim.position.x = side * .061;
      group.add(rim);
      const glass = new THREE.Mesh(new THREE.CircleGeometry(.048, 20), lens);
      glass.position.set(side * .061, 0, .002);
      group.add(glass);
    }
    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(.005, .005, .04, 8), frame);
    bridge.rotation.z = Math.PI / 2;
    group.add(bridge);
    return group;
  }

  function makeCap(color, badge = false) {
    const group = new THREE.Group();
    const fabric = makeMaterial(color);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(.17, .19, .11, 24), fabric);
    crown.position.y = .045;
    group.add(crown);
    const brim = new THREE.Mesh(new THREE.SphereGeometry(.16, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), fabric);
    brim.scale.set(1, .16, .75);
    brim.position.set(0, -.012, .13);
    group.add(brim);
    if (badge) {
      const star = new THREE.Mesh(new THREE.CircleGeometry(.025, 5), makeMaterial(0xe8c35d, .4, .3));
      star.position.set(0, .045, .185);
      group.add(star);
    }
    return group;
  }

  function makeConicalHat() {
    const group = new THREE.Group();
    const straw = makeMaterial(0xe3c993, 0, .9);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(.37, .19, 32, 1, true), straw);
    hat.position.y = .07;
    group.add(hat);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.365, .009, 6, 32), makeMaterial(0x9b7443));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -.025;
    group.add(rim);
    return group;
  }

  function makeChestDetail(kind) {
    const group = new THREE.Group();
    if (kind === 'tie') {
      const tie = new THREE.Mesh(new THREE.ConeGeometry(.035, .2, 4), makeMaterial(0x7b2634));
      tie.rotation.z = Math.PI;
      tie.position.y = -.1;
      group.add(tie);
    } else if (kind === 'badge') {
      const badge = new THREE.Mesh(new THREE.CircleGeometry(.035, 6), makeMaterial(0xe5be57, .45, .3));
      badge.position.set(-.1, .02, .01);
      group.add(badge);
    } else if (kind === 'apron') {
      const apron = new THREE.Mesh(new THREE.PlaneGeometry(.34, .46), makeMaterial(0x596f55));
      apron.position.y = -.15;
      group.add(apron);
    } else if (kind === 'medal') {
      const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(.055, .09), makeMaterial(0xb8323b));
      ribbon.position.set(-.1, .02, 0);
      group.add(ribbon);
      const medal = new THREE.Mesh(new THREE.CircleGeometry(.027, 16), makeMaterial(0xd6ad4a, .6, .25));
      medal.position.set(-.1, -.045, .006);
      group.add(medal);
    }
    return group;
  }

  function buildAccessories() {
    switch (options.look) {
      case 'guard':
        followBone('mixamorigHead', makeCap(0x254d79, true), [0, .24, .015]);
        followBone('mixamorigSpine2', makeChestDetail('badge'), [0, .02, .2]);
        break;
      case 'official':
        followBone('mixamorigHead', makeGlasses(), [0, .015, .188]);
        followBone('mixamorigSpine2', makeChestDetail('tie'), [0, .02, .2]);
        break;
      case 'vendor':
        followBone('mixamorigHead', makeConicalHat(), [0, .26, 0]);
        followBone('mixamorigSpine2', makeChestDetail('apron'), [0, -.02, .205]);
        break;
      case 'resident':
        followBone('mixamorigHead', makeGlasses(), [0, .015, .188]);
        break;
      case 'veteran':
        followBone('mixamorigHead', makeCap(0x425a39, true), [0, .24, .015]);
        followBone('mixamorigSpine2', makeChestDetail('medal'), [0, .02, .2]);
        break;
    }
  }

  const followerPosition = new THREE.Vector3();
  const followerQuaternion = new THREE.Quaternion();
  const rootQuaternion = new THREE.Quaternion();
  function updateAccessories() {
    root.updateMatrixWorld(true);
    root.getWorldQuaternion(rootQuaternion).invert();
    for (const follower of accessoryFollowers) {
      const bone = bones[follower.boneName];
      if (!bone) continue;
      bone.getWorldPosition(followerPosition);
      root.worldToLocal(followerPosition);
      follower.object.position.copy(followerPosition);
      bone.getWorldQuaternion(followerQuaternion);
      follower.object.quaternion.copy(rootQuaternion).multiply(followerQuaternion);
      follower.object.position.add(follower.offset.clone().applyQuaternion(follower.object.quaternion));
    }
  }
  function update(dt, time, speed = 0, grounded = true, vy = 0, talking = false) {
    if (!mixer) { fallback.update(dt, time, speed, grounded, vy, talking); return; }
    const moving = THREE.MathUtils.smoothstep(speed, .05, 1.5);
    const running = THREE.MathUtils.smoothstep(speed, 2.8, 5.5);
    const weights = grounded ? [1 - moving, moving * (1 - running), moving * running] : [1, 0, 0];
    actions.forEach((action, i) => action.setEffectiveWeight(THREE.MathUtils.lerp(action.getEffectiveWeight(), weights[i], 1 - Math.exp(-12 * dt))));
    actions[1].setEffectiveTimeScale(THREE.MathUtils.clamp(speed / 2.7, .65, 1.3));
    actions[2].setEffectiveTimeScale(THREE.MathUtils.clamp(speed / 5.8, .75, 1.25));
    mixer.update(dt);
    airborne = THREE.MathUtils.lerp(airborne, grounded ? 0 : 1, 1 - Math.exp(-16 * dt));
    if (grounded && !previousGrounded) landing = 1;
    previousGrounded = grounded;
    landing = Math.max(0, landing - dt * 5);
    model.position.y = -landing * .07;
    function pose(name, angle) {
      const bone = bones[`mixamorig${name}`];
      if (bone) bone.quaternion.multiply(offset.setFromAxisAngle(axis, angle));
    }
    pose('LeftUpLeg', -.35 * airborne);
    pose('RightUpLeg', .15 * airborne);
    pose('LeftLeg', .65 * airborne + .15 * landing);
    pose('RightLeg', .5 * airborne + .15 * landing);
    pose('LeftArm', -.25 * airborne);
    pose('RightArm', -.25 * airborne);
    if (talking) pose('Head', Math.sin(time * 3) * .035);
    updateAccessories();
  }
  return { root, update, ready };
}
