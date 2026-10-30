import * as THREE from 'three';

// Smooth sculpted surfaces, sharing the existing articulated animation pivots.
const sphere = new THREE.SphereGeometry(1, 24, 18);
export function createCitizen({ shirt = 0x287c80, pants = 0x233449, skin = 0xdba579, hair = 0x252b32, backpack = true } = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const material = (color, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness });
  const cloth = material(shirt), denim = material(pants), face = material(skin, 0.65);
  const dark = material(hair, 0.72), white = material(0xf5eee1), bag = material(0xc48a4d);
  const seam = material(new THREE.Color(shirt).multiplyScalar(0.65));
  const lip = material(0x9c6050), innerEar = material(0xc58a6c);
  const iris = material(0x684b32, 0.35), pupil = material(0x171c21, 0.2);
  const sole = material(0xddd9cd), shoe = material(0xeae4d4, 0.7);
  function oval(parent, mat, x, y, z, sx, sy, sz) {
    const mesh = new THREE.Mesh(sphere, mat);
    mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true; parent.add(mesh); return mesh;
  }
  // Interpolated elliptical cross-sections create a continuous silhouette without box edges.
  function sculpt(parent, mat, sections, depth = 1) {
    const curve = new THREE.CatmullRomCurve3(sections.map(([r, y]) => new THREE.Vector3(r, y, 0)));
    const points = curve.getPoints(48).map(p => new THREE.Vector2(Math.max(0, p.x), p.y));
    const mesh = new THREE.Mesh(new THREE.LatheGeometry(points, 32), mat);
    mesh.scale.z = depth; mesh.castShadow = true; parent.add(mesh); return mesh;
  }
  function piping(parent, mat, points, radius = 0.008) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, radius, 6, false), mat);
    parent.add(mesh); return mesh;
  }
  sculpt(body, cloth, [[0, .91], [.19, .925], [.205, 1.0], [.2, 1.12], [.235, 1.31], [.225, 1.4], [.15, 1.45], [.085, 1.47], [0, 1.46]], .66);
  sculpt(body, denim, [[0, .83], [.17, .85], [.2, .91], [.18, .97], [0, .98]], .74);
  oval(body, face, 0, 1.49, 0, .075, .1, .075);
  // Ribbed collar and hem follow the shirt surface.
  const collar = new THREE.Mesh(new THREE.TorusGeometry(.084, .014, 8, 32), seam);
  collar.rotation.x = Math.PI / 2; collar.position.y = 1.46; body.add(collar);
  piping(body, seam, [[-.17, .95, .075], [-.1, .94, .12], [0, .94, .133], [.1, .94, .12], [.17, .95, .075]], .006);
  // Small embroidered leaf emblem on the chest.
  oval(body, white, -.105, 1.32, .142, .017, .027, .004).rotation.z = -.5;
  piping(body, white, [[-.11, 1.29, .148], [-.1, 1.315, .148], [-.09, 1.33, .148]], .003);

  const head = new THREE.Group(); head.position.y = 1.67; body.add(head);
  sculpt(head, face, [[0, -.2], [.075, -.18], [.13, -.135], [.168, -.06], [.18, .025], [.175, .11], [.13, .185], [0, .21]], .9);
  // Cheek volumes and a soft chin make a shaped face rather than a sphere.
  [-1, 1].forEach(side => {
    oval(head, face, side * .1, -.055, .108, .047, .05, .028);
    oval(head, face, side * .177, -.016, -.005, .035, .053, .028);
    oval(head, innerEar, side * .197, -.016, .012, .012, .029, .009);
  });
  oval(head, face, 0, -.14, .09, .075, .047, .046);
  // Sculpted side-part hairstyle, with swept overlapping locks and sideburns.
  oval(head, dark, 0, .105, -.035, .186, .135, .159);
  [-1, 1].forEach(side => oval(head, dark, side * .163, .045, -.03, .025, .09, .095));
  for (let i = 0; i < 5; i++) {
    const lock = oval(head, dark, -.115 + i * .047, .163 + Math.sin(i * .7) * .026, .078, .076, .057, .1);
    lock.rotation.z = -.28 - i * .09;
  }
  const hairHighlight = material(new THREE.Color(hair).multiplyScalar(1.35));
  for (let i = 0; i < 3; i++) piping(head, hairHighlight,
    [[-.12 + i * .045, .15, .148], [-.1 + i * .045, .203, .116], [-.04 + i * .045, .223, .043]], .0025);
  const eyes = [];
  [-1, 1].forEach(side => {
    const eye = new THREE.Group(); eye.position.set(side * .068, .01, .142); head.add(eye); eyes.push(eye);
    oval(eye, white, 0, 0, 0, .039, .027, .019);
    oval(eye, iris, -side * .003, 0, .017, .017, .021, .008);
    oval(eye, pupil, -side * .003, 0, .023, .009, .014, .004);
    oval(eye, white, -.007, .008, .028, .0045, .005, .002);
    piping(head, dark, [[side * .035, .039, .152], [side * .067, .044, .16], [side * .101, .032, .145]], .004);
    piping(head, dark, [[side * .033, .072, .15], [side * .064, .081, .157], [side * .104, .068, .145]], .008);
  });
  oval(head, face, 0, -.025, .153, .022, .049, .026);
  oval(head, face, 0, -.054, .177, .027, .023, .028);
  piping(head, lip, [[-.041, -.111, .132], [0, -.12, .144], [.041, -.111, .132]], .0045);
  oval(head, face, 0, -.13, .134, .028, .009, .009);

  const arms = [], elbows = [], legs = [], knees = [];
  [-1, 1].forEach(side => {
    const arm = new THREE.Group(); arm.position.set(side * .235, 1.385, 0); body.add(arm);
    sculpt(arm, cloth, [[0, -.205], [.075, -.2], [.085, -.14], [.092, -.075], [.073, -.015], [0, .035]], .92);
    sculpt(arm, face, [[0, -.32], [.052, -.305], [.062, -.24], [.065, -.185], [0, -.16]], .96);
    const elbow = new THREE.Group(); elbow.position.y = -.29; arm.add(elbow);
    oval(elbow, face, 0, 0, 0, .053, .054, .053);
    sculpt(elbow, face, [[0, -.245], [.039, -.22], [.045, -.15], [.055, -.07], [.05, -.015], [0, .02]], .95);
    oval(elbow, face, 0, -.252, .006, .046, .072, .032);
    oval(elbow, face, -side * .035, -.24, .019, .02, .039, .023).rotation.z = side * .35;
    // Subtle finger separations on the curved palm.
    for (let f = 0; f < 3; f++) piping(elbow, innerEar,
      [[-.02 + f * .018, -.28, .034], [-.02 + f * .018, -.307, .024]], .0015);
    arms.push(arm); elbows.push(elbow);
    const leg = new THREE.Group(); leg.position.set(side * .108, .91, 0); body.add(leg);
    sculpt(leg, denim, [[0, -.43], [.072, -.4], [.085, -.28], [.103, -.12], [.109, -.025], [.085, .035], [0, .05]], .93);
    const knee = new THREE.Group(); knee.position.y = -.39; leg.add(knee);
    oval(knee, denim, 0, 0, 0, .074, .075, .073);
    sculpt(knee, denim, [[0, -.405], [.06, -.385], [.063, -.29], [.076, -.15], [.074, -.025], [0, .035]], .95);
    // Continuous trouser seam, softly tapered ankle, rounded sneaker toe and heel.
    piping(knee, material(new THREE.Color(pants).multiplyScalar(1.3)),
      [[side * .072, -.035, 0], [side * .074, -.14, 0], [side * .061, -.35, 0]], .002);
    oval(knee, sole, 0, -.476, .055, .087, .036, .165);
    oval(knee, shoe, 0, -.438, .057, .083, .064, .155);
    oval(knee, cloth, 0, -.403, .009, .066, .04, .085);
    for (let lace = 0; lace < 3; lace++) piping(knee, white,
      [[-.042, -.389 - lace * .008, .063 + lace * .024], [0, -.382 - lace * .008, .068 + lace * .024], [.042, -.389 - lace * .008, .063 + lace * .024]], .004);
    legs.push(leg); knees.push(knee);
  });
  if (backpack) {
    oval(body, bag, 0, 1.19, -.215, .177, .237, .116);
    oval(body, bag, 0, 1.085, -.301, .133, .105, .054);
    const leather = material(0x855b35);
    piping(body, leather, [[-.13, 1.17, -.307], [-.1, 1.25, -.326], [0, 1.27, -.333], [.1, 1.25, -.326], [.13, 1.17, -.307]], .006);
    piping(body, leather, [[-.07, 1.39, -.21], [-.06, 1.45, -.21], [.06, 1.45, -.21], [.07, 1.39, -.21]], .014);
    [-1, 1].forEach(side => piping(body, bag,
      [[side * .13, 1.0, .115], [side * .16, 1.2, .149], [side * .17, 1.39, .103], [side * .14, 1.45, -.04], [side * .13, 1.37, -.22]], .018));
    oval(body, white, 0, 1.09, -.354, .025, .018, .003);
  }
  let phase = 0, blend = 0, landing = 0, wasGrounded = true;
  const smooth = (a, b, dt, rate = 14) => THREE.MathUtils.lerp(a, b, 1 - Math.exp(-rate * dt));
  function update(dt, time, speed = 0, grounded = true, vy = 0, talking = false) {
    const run = THREE.MathUtils.clamp((speed - 2.5) / 3, 0, 1);
    blend = smooth(blend, Math.min(speed / 1.2, 1), dt);
    phase += speed * dt * (2.9 - run * 0.6);
    if (grounded && !wasGrounded) landing = 1;
    wasGrounded = grounded;
    landing = Math.max(0, landing - dt * 5);
    const stride = Math.sin(phase) * blend;
    body.position.y = grounded ? Math.abs(Math.sin(phase)) * blend * 0.035 - landing * 0.09 : 0;
    body.rotation.x = smooth(body.rotation.x, grounded ? run * blend * 0.1 : -0.07, dt);
    body.rotation.z = Math.sin(phase) * blend * 0.025;
    body.scale.y = 1 + Math.sin(time * 2.5) * 0.004 * (1 - blend);
    head.rotation.y = smooth(head.rotation.y, talking ? Math.sin(time * 1.2) * 0.12 : 0, dt);
    head.rotation.x = Math.sin(time * (talking ? 4 : 1.6)) * (talking ? 0.045 : 0.018);
    const blinkTime = (time % 4.7);
    const blink = blinkTime < .16 ? Math.max(.08, Math.abs(blinkTime - .08) / .08) : 1;
    eyes.forEach(eye => { eye.scale.y = blink; });
    for (let i = 0; i < 2; i++) {
      const wave = stride * (i ? -1 : 1);
      const legPose = grounded ? wave * (0.48 + run * 0.35) : (i ? 0.25 : -0.5);
      legs[i].rotation.x = smooth(legs[i].rotation.x, legPose, dt);
      knees[i].rotation.x = smooth(knees[i].rotation.x, grounded ? Math.max(0, -wave) * (0.7 + run * 0.7) + landing * 0.35 : 0.7, dt);
      arms[i].rotation.x = smooth(arms[i].rotation.x, grounded ? -wave * (0.45 + run * 0.3) : -0.65 - Math.max(vy, 0) * 0.04, dt);
      arms[i].rotation.z = (i ? -1 : 1) * (0.07 + Math.sin(time * 2) * 0.015);
      elbows[i].rotation.x = smooth(elbows[i].rotation.x, -0.12 - run * 0.85 - (talking && i === 1 ? 0.65 : 0), dt);
    }
  }
  return { root, update };
}
