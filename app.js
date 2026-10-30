import * as THREE from 'three';
import {createScooterMirror} from './scooter-mirrors.mjs';
import {minimapHeadingAngle} from './minimap-heading.mjs';
import {sidewalkSpans,inStreetMouth} from './street-junctions.mjs';
import {buildPhuXaCourt} from './phu-xa-court.mjs';
import {TRAFFIC_STREETS,TRAFFIC_JUNCTIONS,streetTrafficRoute} from './traffic-routes.mjs';
import {buildWestPeachGarden} from './west-peach-garden.mjs';
import {buildDistrictLiving} from './district-living.mjs';
import {gameClockLabel} from './driving-hud.mjs';
import {createPoliceWorld} from './police-world.mjs';
import {connectedTrafficRoute} from './connected-traffic.mjs';
import {constrainPedestrian,pedestrianWaypoint,pedestrianRoute,PEDESTRIAN_CROSSINGS} from './pedestrian-space.mjs';
import {createCityBus,createBusStop,busStops} from './city-bus.mjs';
import {buildCityUtilities} from './city-utilities.mjs';
import {createCityWeather} from './city-weather.mjs';
import {advanceCityClock,nightAmount} from './city-atmosphere-state.mjs';
import {serviceAccess,brakeBikeSpeed,MEMORIAL_ACCESS,blocksMemorialEntrance,memorialPath} from './street-access.mjs';
import {createCitizenFactory,addCitizenIdentityDetails,QUEST_IDENTITIES,AMBIENT_IDENTITIES,RIDER_IDENTITIES,EVENT_IDENTITIES} from './citizen-roster.mjs';
import {forwardClearance,trafficStep,resolveTrafficCar,trafficBodiesOverlap} from './street-traffic.mjs';
import {addCitizenHelmet,dressCitizenMaterials,addCitizenSatchel,compactCitizenMeshes} from './citizen-details.mjs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {compileStaticGroups,compileArchitectureChunks,createShadowBudget,crossingRoadGeometry,detailVisibility} from './render-budget.mjs';
import {createPottedMarketTree,createMarketBouquet,createMarketCanopy} from './market-models.mjs';
import {createStreetTree,createStool,createTeaTable,createParkBench,carCoachwork,scooterPanel,replaceBuildingEnvelopes,refitHumanProportions,ellipsoidGeometry,canonicalBoneName,foliageGeometry,flowerGeometry,archedWindowGeometry,shopCanopyGeometry} from './neighborhood-models.mjs';
import { createVisualMaterials, worldUVs } from './visual-materials.mjs';
import { CollisionGrid, cameraObstructionFraction } from './collision-grid.mjs';
import { ALLEY_BOUNDARY_WALLS, ALLEY_BACKING_BUILDINGS, SOUTH_STREET_INFILL, CORE_BACKDROP_SHELLS, backdropFootprint } from './world-closure.mjs';
import { createDaylife } from './daylife.mjs';
import { createNeighborhoodArcade } from './arcade.mjs';
import { ARCADE_SHOP, ARCADE_APPROACH_WALLS } from './arcade-state.mjs';
import {DISTRICT_ROADS,DISTRICT_PLACES,EAST_PUBLIC_AREAS,nearestRoad,constrainDistrictPosition,districtGroundHeight,districtLocationName} from './district-routes.mjs';
import {buildDistrictExtension} from './district-world.mjs';
import {buildEastWorld} from './east-world.mjs';
import {buildDistrictStreetscape} from './district-streetscape.mjs';
import {persistSnapshot,resetHeldInputs,canUseCamera} from './runtime-guards.mjs';
import {districtPath,nextDistrictWaypoint} from './district-navigation.mjs';
import { EVIDENCE, NIGHT_ORDERS, normalizeNight, canResolveNight, constrainNightPosition, circuitStep, createThreat, perceiveThreat, lineBlocked, nextRoutePoint } from './story-night.mjs';
import {
  SAVE_KEY,
  awardProgress,
  encodeSnapshot,
  parseSnapshot,
  relationshipLevel
} from './gameplay-state.mjs';

// ============================================================================
// 1. KHỞI TẠO ENGINE 3D PBR + POST-PROCESSING (BLOOM, COLOR GRADING, 2K SKY, 2048 SHADOWS)
// ============================================================================
const container = document.getElementById('canvas-container');
const browserPlaytest = ['localhost', '127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).get('playtest') === '1';
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7ec8f8);
scene.fog = new THREE.FogExp2(0xd8ecfa, 0.0011);

const camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.25, 1200);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.info.autoReset = false;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
const shadowBudget=createShadowBudget();
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
container.appendChild(renderer.domElement);
const visualMaterials = createVisualMaterials(renderer);
const maxAnisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());

// Hệ thống Hậu kỳ Điện ảnh (Post-Processing: UnrealBloomPass + Cinematic Hanoi Color Grading & Sharpness)
let composer = null;
let bloomPass = null;
try {
  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(Math.round(window.innerWidth * 0.65), Math.round(window.innerHeight * 0.65)),
    0.26, // Cường độ Bloom vừa vặn làm rực đèn lồng, mặt trời, sơn xe & cổng Neon
    0.45, // Bán kính lan tỏa mềm mại
    0.84  // Ngưỡng lọc sáng (chỉ phát sáng các vùng highlight thật)
  );
  composer.addPass(bloomPass);

  const HanoiCinematicShader = {
    uniforms: {
      tDiffuse: { value: null },
      contrast: { value: 1.0 },
      saturation: { value: 0.94 },
      vignette: { value: 0.08 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float contrast;
      uniform float saturation;
      uniform float vignette;
      varying vec2 vUv;
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        vec3 col = texel.rgb;
        // Cân bằng tương phản & độ bão hòa sắc nắng thu Hà Nội
        col = (col - 0.5) * contrast + 0.5;
        float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(vec3(luma), col, saturation);
        // Viền tối điện ảnh rất nhẹ ở 4 góc màn hình
        vec2 d = vUv - 0.5;
        float vig = clamp(1.0 - dot(d, d) * vignette * 1.6, 0.78, 1.0);
        col *= vig;
        gl_FragColor = vec4(max(col, vec3(0.0)), texel.a);
      }
    `
  };
  const cinematicPass = new ShaderPass(HanoiCinematicShader);
  composer.addPass(cinematicPass);
  // Keep scene-linear HDR values until the final tone-map/sRGB conversion.
  composer.addPass(new OutputPass());
} catch {
  composer = null;
}

const texLoader = new THREE.TextureLoader();
function loadPbrTex(url, repeatX = 1, repeatY = 1, isColor = true) {
  const t = texLoader.load(url);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = maxAnisotropy;
  t.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return t;
}

// Bản đồ phản xạ môi trường PBR (IBL) nạp từ ảnh bầu trời thực 2K Poly Haven giúp kính, sơn ô tô, inox xe máy & mặt nước phản chiếu chân thực
function createHanoiEnvironmentMap() {
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();

    const envCanvas = document.createElement('canvas');
    envCanvas.width = 512;
    envCanvas.height = 256;
    const ectx = envCanvas.getContext('2d');
    const g = ectx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0.0, '#1e40af');
    g.addColorStop(0.38, '#60a5fa');
    g.addColorStop(0.49, '#fef3c7');
    g.addColorStop(0.53, '#d6c7b2');
    g.addColorStop(0.75, '#475569');
    g.addColorStop(1.0, '#1e293b');
    ectx.fillStyle = g;
    ectx.fillRect(0, 0, 512, 256);

    const sunGlow = ectx.createRadialGradient(160, 78, 4, 160, 78, 56);
    sunGlow.addColorStop(0, 'rgba(255, 251, 235, 1.0)');
    sunGlow.addColorStop(0.4, 'rgba(253, 224, 71, 0.55)');
    sunGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ectx.fillStyle = sunGlow;
    ectx.fillRect(90, 15, 140, 130);

    const envTex = new THREE.CanvasTexture(envCanvas);
    envTex.mapping = THREE.EquirectangularReflectionMapping;
    envTex.colorSpace = THREE.SRGBColorSpace;
    const envRT = pmrem.fromEquirectangular(envTex);
    scene.environment = envRT.texture;

    const nightCanvas = document.createElement('canvas');
    nightCanvas.width = 512;
    nightCanvas.height = 256;
    const nightCtx = nightCanvas.getContext('2d');
    const nightGradient = nightCtx.createLinearGradient(0, 0, 0, 256);
    nightGradient.addColorStop(0, '#081018');
    nightGradient.addColorStop(0.48, '#293c45');
    nightGradient.addColorStop(0.56, '#191d1b');
    nightGradient.addColorStop(1, '#090e0f');
    nightCtx.fillStyle = nightGradient;
    nightCtx.fillRect(0, 0, 512, 256);
    [55, 196, 350, 438].forEach((x, i) => {
      nightCtx.fillStyle = i % 2 ? '#889c95' : '#c49a64';
      nightCtx.fillRect(x, 106, 12, 18);
    });
    const nightTexture = new THREE.CanvasTexture(nightCanvas);
    nightTexture.mapping = THREE.EquirectangularReflectionMapping;
    nightTexture.colorSpace = THREE.SRGBColorSpace;
    const nightRT = pmrem.fromEquirectangular(nightTexture);
    scene.userData.visualEnvironments = { day: envRT.texture, night: nightRT.texture };
    nightTexture.dispose();
    if ('environmentIntensity' in scene) scene.environmentIntensity = 0.88;
    envTex.dispose();

    // Khi ảnh bầu trời thực 2K (sky_day_2k.jpg) tải xong, nâng cấp phản xạ IBL lên ảnh bầu trời thực!
    texLoader.load('assets/textures/sky_day_2k.jpg', (realSkyTex) => {
      realSkyTex.mapping = THREE.EquirectangularReflectionMapping;
      realSkyTex.colorSpace = THREE.SRGBColorSpace;
      const realDayRT = pmrem.fromEquirectangular(realSkyTex);
      scene.userData.visualEnvironments.day = realDayRT.texture;
      if (!horrorModeActive && playerState.time < 18.5) {
        scene.environment = realDayRT.texture;
      }
      pmrem.dispose();
    });
  } catch {
    // Fallback an toàn nếu trình duyệt hạn chế PMREM
  }
}
createHanoiEnvironmentMap();

function createRealisticSkyDome() {
  // Khởi tạo bầu trời 2K thực tế từ Poly Haven (kloofendal_48d_partly_cloudy_puresky)
  const skyTex = texLoader.load('assets/textures/sky_day_2k.jpg');
  skyTex.colorSpace = THREE.SRGBColorSpace;
  skyTex.anisotropy = maxAnisotropy;

  const skyGeo = new THREE.SphereGeometry(850, 48, 32);
  skyGeo.scale(-1, 1, 1);
  const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, color: 0xffffff, fog: false });
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);

  // Đĩa Mặt Trời / Mặt Trăng và quầng sáng khí quyển chuyển động thực theo giờ trong ngày
  const celestialGroup = new THREE.Group();
  const orbCore = new THREE.Mesh(
    new THREE.SphereGeometry(24, 24, 20),
    new THREE.MeshBasicMaterial({ color: 0xfffbeb, fog: false })
  );
  const orbHalo = new THREE.Mesh(
    new THREE.RingGeometry(25, 65, 36),
    new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false
    })
  );
  celestialGroup.add(orbCore, orbHalo);
  skyMesh.add(celestialGroup);
  skyMesh.userData = { celestialGroup, orbCore, orbHalo };

  scene.add(skyMesh);
  return skyMesh;
}
const skyDomeMesh = createRealisticSkyDome();

const hemiLight = new THREE.HemisphereLight(0xfffbeb, 0x64748b, 1.12);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xfff8dc, 2.75);
scene.add(sunLight.target);
sunLight.position.set(85, 145, 95);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 5;
sunLight.shadow.camera.far = 420;
const d = 125;
sunLight.shadow.camera.left = -d;
sunLight.shadow.camera.right = d;
sunLight.shadow.camera.top = d;
sunLight.shadow.camera.bottom = -d;
sunLight.shadow.bias = -0.00085;
sunLight.shadow.normalBias = 0.038;
scene.add(sunLight);

const worldGroup = new THREE.Group();
scene.add(worldGroup);

// ============================================================================
// 2. BỘ CHẤT LIỆU PBR QUÉT THỰC TẾ 1K (POLY HAVEN SCANNED TEXTURES + NORMAL/ROUGHNESS MAPS)
// ============================================================================
function createCroppedPhotoTexture(imgUrl, sx, sy, sw, sh) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e6ca96';
  ctx.fillRect(0, 0, 1024, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;

  const img = new Image();
  img.onload = () => {
    ctx.drawImage(
      img,
      img.width * sx,
      img.height * sy,
      img.width * sw,
      img.height * sh,
      0,
      0,
      1024,
      512
    );
    tex.needsUpdate = true;
  };
  img.src = imgUrl;
  return tex;
}

// Tạo bộ 3 tầng tán lá cây Xà Cừ / Sấu cổ thụ Hà Nội tự nhiên (Loại bỏ hoàn toàn lưới đường kẻ nâu & màu xanh nhựa bóng cũ!)
function createNaturalFoliageMaterial(paletteTone = 'mid') {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');

  const palettes = {
    deep: ['#1b3b1a', '#21471e', '#265221', '#1f421b', '#2b5824'],
    mid: ['#285622', '#316528', '#3a722e', '#447d34', '#2d5c25'],
    sunlit: ['#3d752e', '#4b8636', '#5a943e', '#68a246', '#457c32']
  };
  const colors = palettes[paletteTone] || palettes.mid;

  // Nền lá rậm rạp đa sắc độ tự nhiên
  const bgGrad = ctx.createRadialGradient(256, 220, 30, 256, 256, 260);
  bgGrad.addColorStop(0, colors[2]);
  bgGrad.addColorStop(0.65, colors[1]);
  bgGrad.addColorStop(1, colors[0]);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 512, 512);

  // Vẽ 1.400 phiến lá đan xen đa tầng tạo chiều sâu tán cây thật
  for (let i = 0; i < 1400; i++) {
    const lx = Math.random() * 512;
    const ly = Math.random() * 512;
    const rot = Math.random() * Math.PI * 2;
    const lw = 8 + Math.random() * 14;
    const lh = 4 + Math.random() * 7;

    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(rot);
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.ellipse(0, 0, lw, lh, 0, 0, Math.PI * 2);
    ctx.fill();

    if (i % 4 === 0) {
      ctx.fillStyle = 'rgba(254, 249, 195, 0.12)';
      ctx.beginPath();
      ctx.ellipse(lw * 0.2, -lh * 0.2, lw * 0.55, lh * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (i % 5 === 0) {
      ctx.fillStyle = 'rgba(10, 24, 12, 0.18)';
      ctx.beginPath();
      ctx.ellipse(-lw * 0.2, lh * 0.2, lw * 0.6, lh * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;

  const normalMap = loadPbrTex('assets/textures/aerial_grass_rock-normal.jpg', 3, 3, false);
  const roughMap = loadPbrTex('assets/textures/aerial_grass_rock-roughness.jpg', 3, 3, false);

  return new THREE.MeshStandardMaterial({
    map: tex,
    normalMap,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughnessMap: roughMap,
    roughness: 0.78,
    metalness: 0.02,
    envMapIntensity: 0.45
  });
}

const canopyDeepMat = createNaturalFoliageMaterial('deep');
const canopyMidMat = createNaturalFoliageMaterial('mid');
const canopySunlitMat = createNaturalFoliageMaterial('sunlit');
const leafCanopyMat = canopyMidMat;

function createBarkMaterial() {
  const colorMap = loadPbrTex('assets/textures/bark_brown_02-color.jpg', 2, 4, true);
  const normalMap = loadPbrTex('assets/textures/bark_brown_02-normal.jpg', 2, 4, false);
  const roughMap = loadPbrTex('assets/textures/bark_brown_02-roughness.jpg', 2, 4, false);
  return new THREE.MeshStandardMaterial({
    map: colorMap,
    normalMap,
    normalScale: new THREE.Vector2(1.1, 1.1),
    roughnessMap: roughMap,
    roughness: 0.92,
    metalness: 0.0
  });
}
const barkMat = createBarkMaterial();

const sharedPlasterNormal = loadPbrTex('assets/textures/painted_plaster_wall-normal.jpg', 4, 3, false);
const sharedPlasterRough = loadPbrTex('assets/textures/painted_plaster_wall-roughness.jpg', 4, 3, false);

function createSchoolBuildingFacadeMaterial(baseColor = '#e8cf9c') {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d');

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 1024, 512);

  // Vệt rêu phong nhẹ và chiều sâu bóng đổ dưới gờ mái
  for (let i = 0; i < 8000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(95,70,35,0.045)';
    ctx.fillRect(Math.random() * 1024, Math.random() * 512, 2, 2);
  }

  const floors = 3;
  const cols = 6;
  const floorH = 512 / floors;
  const colW = 1024 / cols;

  for (let f = 0; f < floors; f++) {
    const fy = f * floorH;
    // Phào chỉ ngang phân tầng có bóng đổ Ambient Occlusion mềm
    const slabShadow = ctx.createLinearGradient(0, fy, 0, fy + 24);
    slabShadow.addColorStop(0, '#f8fafc');
    slabShadow.addColorStop(0.45, '#e2e8f0');
    slabShadow.addColorStop(0.5, 'rgba(15, 23, 42, 0.28)');
    slabShadow.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = slabShadow;
    ctx.fillRect(0, fy, 1024, 24);

    for (let col = 0; col < cols; col++) {
      const cx = col * colW;
      // Cột pilaster nổi giữa các nhịp cửa sổ
      ctx.fillStyle = '#f5efe2';
      ctx.fillRect(cx - 7, fy, 14, floorH);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.14)';
      ctx.fillRect(cx + 7, fy, 4, floorH);

      const wx = cx + 32;
      const wy = fy + 26;
      const ww = colW - 64;
      const wh = floorH - 48;

      // Hốc tường âm cửa sổ & gờ bệ cửa đá
      ctx.fillStyle = '#574631';
      ctx.fillRect(wx - 6, wy - 6, ww + 12, wh + 12);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(wx - 9, wy + wh + 2, ww + 18, 7);

      // Cửa kính phản quang sâu + rèm lớp học & ánh đèn ấm bên trong
      const glassGrad = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh);
      glassGrad.addColorStop(0, '#0f2238');
      glassGrad.addColorStop(0.35, '#1e3a5f');
      glassGrad.addColorStop(0.52, '#335c85');
      glassGrad.addColorStop(1, '#0b1524');
      ctx.fillStyle = glassGrad;
      ctx.fillRect(wx, wy, ww, wh);

      // Ánh đèn vàng ấm hắt nhẹ từ trần lớp học
      const roomLight = ctx.createRadialGradient(wx + ww * 0.5, wy + wh * 0.3, 4, wx + ww * 0.5, wy + wh * 0.5, ww * 0.65);
      roomLight.addColorStop(0, 'rgba(254, 243, 199, 0.34)');
      roomLight.addColorStop(1, 'rgba(254, 243, 199, 0)');
      ctx.fillStyle = roomLight;
      ctx.fillRect(wx + 4, wy + 4, ww - 8, wh - 8);

      // Lá sách cửa chớp gỗ xanh/nâu hai bên khung cửa sổ trường học Hà Nội
      ctx.fillStyle = '#2d4f3e';
      ctx.fillRect(wx, wy, 14, wh);
      ctx.fillRect(wx + ww - 14, wy, 14, wh);

      // Khung đố cửa gỗ lim sẫm màu (thay cho chữ thập trắng hoạt hình cũ!)
      ctx.strokeStyle = '#3b2818';
      ctx.lineWidth = 4;
      ctx.strokeRect(wx + 2, wy + 2, ww - 4, wh - 4);
      ctx.fillStyle = '#3b2818';
      ctx.fillRect(wx + ww / 2 - 2, wy + 2, 4, wh - 4);
      ctx.fillRect(wx + 2, wy + wh * 0.36, ww - 4, 4);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return new THREE.MeshStandardMaterial({
    map: tex,
    normalMap: sharedPlasterNormal,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughnessMap: sharedPlasterRough,
    roughness: 0.62,
    metalness: 0.08,
    envMapIntensity: 0.65
  });
}
const schoolFacadeMat = createSchoolBuildingFacadeMaterial('#e8cf9c');

const asphaltMaterialList = [];
const sidewalkMaterialList = [];

function createShophouseFacadeMaterial(wallHex, shopTitle, signBgHex) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 768;
  const ctx = c.getContext('2d');

  ctx.fillStyle = wallHex;
  ctx.fillRect(0, 0, 512, 768);

  // Hạt vữa tường nhà phố Hà Nội và vệt nước mưa ngấm nhẹ dưới gờ tường
  for (let i = 0; i < 4200; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(15, 23, 42, 0.035)' : 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(Math.random() * 512, Math.random() * 768, 2, 2);
  }
  const topWeather = ctx.createLinearGradient(0, 0, 0, 56);
  topWeather.addColorStop(0, 'rgba(15, 23, 42, 0.36)');
  topWeather.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = topWeather;
  ctx.fillRect(0, 0, 512, 56);

  [80, 310].forEach((wy) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(55, wy, 402, 175);

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 5;
    ctx.strokeRect(85, wy + 18, 220, 152);
    const g = ctx.createLinearGradient(85, wy, 305, wy + 170);
    g.addColorStop(0, '#0f2238');
    g.addColorStop(0.5, '#2b4c6f');
    g.addColorStop(1, '#09111e');
    ctx.fillStyle = g;
    ctx.fillRect(90, wy + 22, 210, 144);

    // Rèm cửa và ánh đèn ấm bên trong phòng tầng lầu
    ctx.fillStyle = 'rgba(254, 240, 138, 0.24)';
    ctx.fillRect(96, wy + 28, 86, 132);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(45, wy + 125, 422, 8);
    for (let bx = 55; bx <= 455; bx += 20) {
      ctx.fillRect(bx, wy + 125, 5, 50);
    }
  });

  // Biển hiệu cửa hàng tầng 1 sắc nét, tự động co chữ vừa khít bảng hiệu (không bị tràn viền!)
  ctx.fillStyle = signBgHex;
  ctx.fillRect(22, 508, 468, 76);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 4;
  ctx.strokeRect(27, 513, 458, 66);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 22px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(shopTitle, 256, 544, 436);
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 13px "Segoe UI", sans-serif';
  ctx.fillText('ĐC: PHỐ PHÚ THƯỢNG · QUẬN TÂY HỒ · HÀ NỘI', 256, 568, 436);

  // Tầng 1: Cửa kính khung nhôm sâu & kệ hàng hóa ấm áp bên trong
  const shopInterior = ctx.createLinearGradient(45, 595, 45, 768);
  shopInterior.addColorStop(0, '#271306');
  shopInterior.addColorStop(0.5, '#5c280b');
  shopInterior.addColorStop(1, '#0f172a');
  ctx.fillStyle = shopInterior;
  ctx.fillRect(45, 595, 422, 173);

  ctx.fillStyle = 'rgba(253, 224, 71, 0.28)';
  ctx.fillRect(65, 610, 382, 95);
  for (let sx = 75; sx < 420; sx += 68) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
    ctx.fillRect(sx, 635, 48, 62);
  }

  ctx.fillStyle = '#334155';
  ctx.fillRect(45, 595, 422, 42);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.5;
  for (let sy = 601; sy < 637; sy += 9) {
    ctx.beginPath();
    ctx.moveTo(45, sy);
    ctx.lineTo(467, sy);
    ctx.stroke();
  }
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 5;
  ctx.strokeRect(48, 638, 416, 127);
  ctx.beginPath();
  ctx.moveTo(256, 638);
  ctx.lineTo(256, 765);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return new THREE.MeshStandardMaterial({
    map: tex,
    normalMap: sharedPlasterNormal,
    normalScale: new THREE.Vector2(0.42, 0.42),
    roughnessMap: sharedPlasterRough,
    roughness: 0.65,
    metalness: 0.08,
    envMapIntensity: 0.58
  });
}

// Asphalt never contains painted road markings; paint is separate geometry.
function createDetailedAsphaltMaterial() {
  const mat = visualMaterials.asphalt().clone();
  mat.normalScale.set(.32,.32);
  mat.roughness=.94;mat.metalness=0;mat.envMapIntensity=.25;
  asphaltMaterialList.push(mat);
  return mat;
}

// Vỉa hè đá lát PBR kết hợp Normal/Roughness quét thực tế từ Poly Haven (cobblestone_floor_04)
function createHerringboneBrickMaterial(repeatX = 95, repeatY = 2.8, usePolygonOffset = false) {
  const colorMap = loadPbrTex('assets/textures/cobblestone_floor_04-color.jpg', repeatX, repeatY, true);
  const normalMap = loadPbrTex('assets/textures/cobblestone_floor_04-normal.jpg', repeatX, repeatY, false);
  const roughMap = loadPbrTex('assets/textures/cobblestone_floor_04-roughness.jpg', repeatX, repeatY, false);

  const mat = new THREE.MeshStandardMaterial({
    map: colorMap,
    normalMap,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughnessMap: roughMap,
    color: 0xd6cfc2,
    roughness: 0.86,
    metalness: 0.03,
    envMapIntensity: 0.38,
    polygonOffset: usePolygonOffset,
    polygonOffsetFactor: usePolygonOffset ? 1 : 0,
    polygonOffsetUnits: usePolygonOffset ? 2 : 0
  });
  sidewalkMaterialList.push(mat);
  return mat;
}

function createAgedYellowWallMaterial() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#d4a34f';
  ctx.fillRect(0, 0, 512, 256);

  for (let i = 0; i < 4500; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(110,75,20,0.07)' : 'rgba(255,245,210,0.06)';
    ctx.fillRect(Math.random() * 512, Math.random() * 256, 3, 3);
  }

  const topMoss = ctx.createLinearGradient(0, 0, 0, 55);
  topMoss.addColorStop(0, 'rgba(42, 52, 35, 0.72)');
  topMoss.addColorStop(1, 'rgba(42, 52, 35, 0)');
  ctx.fillStyle = topMoss;
  ctx.fillRect(0, 0, 512, 55);

  const botMoss = ctx.createLinearGradient(0, 185, 0, 256);
  botMoss.addColorStop(0, 'rgba(48, 42, 32, 0)');
  botMoss.addColorStop(1, 'rgba(48, 42, 32, 0.68)');
  ctx.fillStyle = botMoss;
  ctx.fillRect(0, 185, 512, 71);

  ctx.strokeStyle = 'rgba(105, 68, 20, 0.55)';
  ctx.lineWidth = 6;
  ctx.strokeRect(24, 36, 464, 172);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(22, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return new THREE.MeshStandardMaterial({
    map: tex,
    normalMap: sharedPlasterNormal,
    normalScale: new THREE.Vector2(0.65, 0.65),
    roughnessMap: sharedPlasterRough,
    roughness: 0.86
  });
}

// Mái ngói đất nung PBR quét thực tế 1K từ Poly Haven (clay_roof_tiles_02)
function createRoofTileMaterial(colorHex = '#b84a32') {
  const colorMap = loadPbrTex('assets/textures/clay_roof_tiles_02-color.jpg', 8, 4, true);
  const normalMap = loadPbrTex('assets/textures/clay_roof_tiles_02-normal.jpg', 8, 4, false);
  const roughMap = loadPbrTex('assets/textures/clay_roof_tiles_02-roughness.jpg', 8, 4, false);
  return new THREE.MeshStandardMaterial({
    map: colorMap,
    normalMap,
    normalScale: new THREE.Vector2(1.05, 1.05),
    roughnessMap: roughMap,
    color: new THREE.Color(colorHex),
    roughness: 0.64,
    metalness: 0.04,
    envMapIntensity: 0.48
  });
}

function makeBannerTexture(line1, line2 = '', bg = '#b91c1c', fg = '#fde047') {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 116);
  ctx.fillStyle = fg;
  ctx.font = 'bold 26px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(line1, 256, line2 ? 48 : 70, 476);
  if (line2) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.fillText(line2, 256, 90, 476);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const roofMatRed = createRoofTileMaterial('#d45b3e');
const roofMatGreen = createRoofTileMaterial('#1d8a7e');
const agedYellowWallMat = createAgedYellowWallMaterial();

function createHipRoofMesh(width, depth, roofHeight, mat = roofMatRed) {
  const w2 = width / 2 + 0.6;
  const d2 = depth / 2 + 0.6;
  const ridgeW = Math.max(width * 0.32, 0.5);

  const vertices = new Float32Array([
    -w2, 0, d2,   w2, 0, d2,   ridgeW, roofHeight, 0,
    -w2, 0, d2,   ridgeW, roofHeight, 0,   -ridgeW, roofHeight, 0,
    w2, 0, -d2,   -w2, 0, -d2,   -ridgeW, roofHeight, 0,
    w2, 0, -d2,   -ridgeW, roofHeight, 0,   ridgeW, roofHeight, 0,
    -w2, 0, -d2,   -w2, 0, d2,   -ridgeW, roofHeight, 0,
    w2, 0, d2,   w2, 0, -d2,   ridgeW, roofHeight, 0
  ]);

  const uvs = new Float32Array([
    0, 0,  1, 0,  0.8, 1,   0, 0,  0.8, 1,  0.2, 1,
    0, 0,  1, 0,  0.8, 1,   0, 0,  0.8, 1,  0.2, 1,
    0, 0,  1, 0,  0.5, 1,
    0, 0,  1, 0,  0.5, 1
  ]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// ============================================================================
// 3. BỘ PHỤ KIỆN & TRANG PHỤC CON NGƯỜI VIỆT NAM GẮN TRỰC TIẾP VÀO XƯƠNG (BONE)
// (Nón lá, Mũ cối, Mũ bảo vệ, Đòn gánh Xôi Phú Thượng, Chổi tre, Loa phường, Balo)
// ============================================================================
function findBone(root, partialName) {
  let found = null;
  const target = partialName.toLowerCase();
  root.traverse((node) => {
    if (!found && node.isBone) {
      const clean = node.name.replace(/^mixamorig:?/i, '').toLowerCase();
      if (clean === target || clean.includes(target)) {
        found = node;
      }
    }
  });
  return found;
}

// Đổi màu quần áo cho mô hình Con Người Thật (ReadyPlayerMe & Michelle) - KHÔNG dùng robot!
function customizeHumanAppearance(clonedScene, options = {}) {
  const {
    topColor = null,
    bottomColor = null,
    shoesColor = null,
    hairColor = null,
    hideHeadwear = false,
    hideBeard = false,
    bodyTint = null
  } = options;

  clonedScene.traverse((child) => {
    if (child.isMesh && child.material) {
      child.material = child.material.clone();
      const matName = (child.material.name || '').toLowerCase();
      const meshName = (child.name || '').toLowerCase();

      // Ẩn mũ len hoặc râu mặc định của ReadyPlayerMe để tạo nhiều khuôn mặt/đầu tóc người Việt khác nhau
      if (hideHeadwear && (matName.includes('headwear') || meshName.includes('headwear'))) {
        child.visible = false;
      }
      if (hideBeard && (matName.includes('beard') || meshName.includes('beard'))) {
        child.visible = false;
      }

      // Đổi màu áo, quần, giày cho model Nam (Wolf3D / ReadyPlayerMe)
      if (topColor !== null && matName.includes('outfit_top')) {
        child.material.map = null;
        child.material.color.setHex(topColor);
        child.material.roughness = 0.65;
      }
      if (bottomColor !== null && matName.includes('outfit_bottom')) {
        child.material.map = null;
        child.material.color.setHex(bottomColor);
        child.material.roughness = 0.75;
      }
      if (shoesColor !== null && matName.includes('outfit_footwear')) {
        child.material.map = null;
        child.material.color.setHex(shoesColor);
      }
      if (hairColor !== null && (matName.includes('headwear') || matName.includes('beard'))) {
        child.material.color.setHex(hairColor);
      }

      // Đổi tông màu trang phục cho model Nữ (Michelle - Ch03_Body)
      if (bodyTint !== null && matName.includes('ch03')) {
        child.material.color.setHex(bodyTint);
      }

      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

// Đồng bộ dấu bán cầu Quaternion xuyên suốt mọi keyframe liên tiếp (chống giật xoay ngược 360° ở đầu gối/vai) và khép kín vòng lặp
function sanitizeQuaternionTrackValues(v) {
  if (v.length < 8) return;
  // 1. Đảm bảo mọi keyframe liên tiếp i -> i+1 đều có tích vô hướng dot >= 0 (cùng bán cầu 4D)
  for (let i = 4; i < v.length; i += 4) {
    const dot =
      v[i - 4] * v[i] +
      v[i - 3] * v[i + 1] +
      v[i - 2] * v[i + 2] +
      v[i - 1] * v[i + 3];
    if (dot < 0) {
      v[i] = -v[i];
      v[i + 1] = -v[i + 1];
      v[i + 2] = -v[i + 2];
      v[i + 3] = -v[i + 3];
    }
  }
  // 2. Khép kín frame cuối cùng trùng khớp với frame đầu tiên và cùng dấu với frame áp chót
  const last = v.length - 4;
  const prev = last - 4;
  const dotFirst =
    v[prev] * v[0] +
    v[prev + 1] * v[1] +
    v[prev + 2] * v[2] +
    v[prev + 3] * v[3];
  const sign = dotFirst < 0 ? -1 : 1;
  v[last] = v[0] * sign;
  v[last + 1] = v[1] * sign;
  v[last + 2] = v[2] * sign;
  v[last + 3] = v[3] * sign;
}

// Chuyển đổi Animation Clip của ReadyPlayerMe sang hệ xương của từng nhân vật (Nam 1m / Nữ 100cm) và làm mượt vòng lặp 100%
function retargetHumanClip(sourceClip, isCentimeterRig = false) {
  const clip = sourceClip.clone();
  const tracks = [];

  clip.tracks.forEach((track) => {
    const dotIdx = track.name.indexOf('.');
    const boneName = track.name.slice(0, dotIdx);
    const prop = track.name.slice(dotIdx + 1);
    const targetBoneName = isCentimeterRig ? `mixamorig:${boneName}` : boneName;

    // Giữ nhân vật bước đi tại chỗ (xoá root motion trôi đi chỗ khác) và làm mượt độ cao Hips
    if (boneName === 'Hips' && prop === 'position') {
      if (isCentimeterRig) return; // Với Michelle (Character xoay +90° X), giữ nguyên Hips.position mặc định để đứng thẳng trên mặt đất
      const t = track.clone();
      const v = t.values;
      let sumY = 0;
      const count = v.length / 3;
      for (let i = 0; i < v.length; i += 3) {
        sumY += v[i + 1];
      }
      const avgY = sumY / count;
      const startY = avgY + (v[1] - avgY) * 0.45;
      for (let i = 0; i < v.length; i += 3) {
        v[i] = 0;     // Không trôi ngang X
        // Giảm biên độ nảy dọc của Hips xuống 45% để khi chạy không bị giật nhấp nhô mạnh
        v[i + 1] = avgY + (v[i + 1] - avgY) * 0.45;
        v[i + 2] = 0; // Không trôi dọc Z
      }
      if (v.length >= 6) {
        v[v.length - 2] = startY;
      }
      t.name = `${targetBoneName}.position`;
      tracks.push(t);
      return;
    }

    // Với Michelle (Character xoay +90° X), bù góc xoay -90° X cho xương Hips để nhân vật ĐỨNG THẲNG 100%, không bị nằm ngang!
    if (boneName === 'Hips' && prop === 'quaternion' && isCentimeterRig) {
      const t = track.clone();
      const v = t.values;
      const fixQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
      const q = new THREE.Quaternion();
      for (let i = 0; i < v.length; i += 4) {
        q.set(v[i], v[i + 1], v[i + 2], v[i + 3]);
        q.premultiply(fixQ);
        v[i] = q.x;
        v[i + 1] = q.y;
        v[i + 2] = q.z;
        v[i + 3] = q.w;
      }
      sanitizeQuaternionTrackValues(v);
      t.name = `${targetBoneName}.quaternion`;
      tracks.push(t);
      return;
    }

    const t = track.clone();
    const v = t.values;
    if (prop === 'quaternion') {
      sanitizeQuaternionTrackValues(v);
    }
    t.name = `${targetBoneName}.${prop}`;
    tracks.push(t);
  });

  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}

// Tự động nhận diện tỷ lệ xương (ReadyPlayerMe = 1m, Mixamo Michelle = 100cm) để gắn phụ kiện Việt Nam chuẩn kích thước
function attachVietnamesePropToBone(root, propType, isCentimeterRig = false) {
  if (!propType) return;
  const headBone = findBone(root, 'Head');
  const spineBone = findBone(root, 'Spine2') || findBone(root, 'Spine1');
  const rightHandBone = findBone(root, 'RightHand');
  const leftHandBone = findBone(root, 'LeftHand');

  const s = isCentimeterRig ? 100 : 1; // Tự động co giãn theo đơn vị xương của model

  // 1. NÓN LÁ VIỆT NAM (Cho Cô Hoa trà đá & Cô gánh Xôi Phú Thượng)
  if (propType === 'non_la' && headBone) {
    const hat = new THREE.Mesh(
      new THREE.ConeGeometry(0.28 * s, 0.16 * s, 20),
      new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.75, side: THREE.DoubleSide })
    );
    hat.position.set(0, 0.2 * s, 0);
    headBone.add(hat);
  }

  // 2. MŨ KÊ-PI BẢO VỆ + DÙI CUI (Cho Bác Bảo Vệ THPT Tây Hồ)
  if (propType === 'security_guard') {
    if (headBone) {
      const capGroup = new THREE.Group();
      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13 * s, 0.12 * s, 0.09 * s, 16),
        new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.5 })
      );
      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.18 * s, 0.02 * s, 0.12 * s),
        new THREE.MeshStandardMaterial({ color: 0x0f172a })
      );
      visor.position.set(0, -0.03 * s, 0.1 * s);
      const badge = new THREE.Mesh(
        new THREE.SphereGeometry(0.022 * s, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xfacc15 })
      );
      badge.position.set(0, 0.01 * s, 0.125 * s);
      capGroup.add(crown, visor, badge);
      capGroup.position.set(0, 0.19 * s, 0);
      headBone.add(capGroup);
    }
    if (rightHandBone) {
      const baton = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018 * s, 0.018 * s, 0.45 * s, 8),
        new THREE.MeshStandardMaterial({ color: 0x111827 })
      );
      baton.rotation.x = Math.PI / 2;
      baton.position.set(0, 0.08 * s, 0.15 * s);
      rightHandBone.add(baton);
    }
  }

  // 3. MŨ CỐI XANH BỘ ĐỘI (Cho Bác Cựu Chiến Binh Phú Thượng)
  if (propType === 'veteran' && headBone) {
    const pith = new THREE.Mesh(
      new THREE.SphereGeometry(0.15 * s, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 })
    );
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19 * s, 0.21 * s, 0.02 * s, 16),
      new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 })
    );
    pith.add(brim);
    pith.position.set(0, 0.15 * s, 0);
    headBone.add(pith);
  }

  // 4. CẶP HỒ SƠ ĐỎ (Cho Cán Bộ UBND Phường Phú Thượng)
  if (propType === 'official') {
    if (leftHandBone) {
      const folder = new THREE.Mesh(
        new THREE.BoxGeometry(0.04 * s, 0.28 * s, 0.36 * s),
        new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.4 })
      );
      folder.position.set(0, 0.12 * s, 0);
      leftHandBone.add(folder);
    }
  }

  // 5. LOA PHƯỜNG CẦM TAY & MŨ PHỚT (Cho Bác Tổ Trưởng Dân Phố Ngã Ba 68)
  if (propType === 'ward_leader') {
    if (headBone) {
      const beret = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14 * s, 0.14 * s, 0.06 * s, 16),
        new THREE.MeshStandardMaterial({ color: 0x78350f })
      );
      beret.position.set(0, 0.18 * s, 0);
      headBone.add(beret);
    }
    if (rightHandBone) {
      const mega = new THREE.Group();
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.12 * s, 0.28 * s, 12),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc })
      );
      cone.rotation.x = -Math.PI / 2;
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.12 * s, 0.018 * s, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0xdc2626 })
      );
      rim.position.z = 0.14 * s;
      mega.add(cone, rim);
      mega.position.set(0, 0.08 * s, 0.14 * s);
      rightHandBone.add(mega);
    }
  }

  // 6. ĐÒN GÁNH TRE & 2 THÚNG XÔI PHÚ THƯỢNG (Cho Cô Gánh Xôi Phú Thượng)
  if (propType === 'xoi_vendor') {
    attachVietnamesePropToBone(root, 'non_la', isCentimeterRig);
    if (spineBone) {
      const poleGroup = new THREE.Group();
      const bambooMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
      const basketMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8 });
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 });

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02 * s, 0.02 * s, 1.55 * s, 8), bambooMat);
      pole.rotation.z = Math.PI / 2;
      pole.position.set(0, 0.28 * s, 0);
      poleGroup.add(pole);

      [-0.68 * s, 0.68 * s].forEach((bx) => {
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.008 * s, 0.008 * s, 0.55 * s, 6), bambooMat);
        rope.position.set(bx, 0, 0);
        poleGroup.add(rope);

        const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * s, 0.18 * s, 0.18 * s, 14), basketMat);
        basket.position.set(bx, -0.28 * s, 0);
        poleGroup.add(basket);

        const bananaLeaf = new THREE.Mesh(new THREE.CircleGeometry(0.22 * s, 12).rotateX(-Math.PI / 2), leafMat);
        bananaLeaf.position.set(bx, -0.18 * s, 0);
        poleGroup.add(bananaLeaf);
      });

      spineBone.add(poleGroup);
    }
  }

  // 7. CHỔI TRE DÀI QUÉT LÁ & NÓN (Cho Bác Lao Công Phố Phú Thượng)
  if (propType === 'sweeper') {
    attachVietnamesePropToBone(root, 'non_la', isCentimeterRig);
    if (rightHandBone) {
      const broom = new THREE.Group();
      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016 * s, 0.016 * s, 1.15 * s, 8),
        new THREE.MeshStandardMaterial({ color: 0xb45309 })
      );
      const brush = new THREE.Mesh(
        new THREE.ConeGeometry(0.18 * s, 0.38 * s, 10),
        new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.9 })
      );
      brush.position.y = -0.55 * s;
      broom.add(stick, brush);
      broom.rotation.x = 0.45;
      rightHandBone.add(broom);
    }
  }

  // 8. BALO HỌC SINH / DU LỊCH (Cho Học Sinh THPT Tây Hồ & Người Chơi)
  if (propType.startsWith('backpack_') && spineBone) {
    const colorMap = {
      backpack_orange: 0xea580c,
      backpack_blue: 0x2563eb,
      backpack_red: 0xdc2626,
      backpack_purple: 0x7c3aed
    };
    const bag = new THREE.Mesh(
      new RoundedBoxGeometry(0.28 * s, 0.38 * s, 0.16 * s, 3, 0.04 * s),
      new THREE.MeshStandardMaterial({ color: colorMap[propType] || 0xea580c, roughness: 0.5 })
    );
    bag.position.set(0, 0.08 * s, -0.16 * s);
    spineBone.add(bag);
  }

  // 9. LÀN NHỰA ĐỎ ĐI CHỢ (Cho Các Bà / Các Chị Đi Chợ Phú Gia)
  if (propType === 'market_basket' && rightHandBone) {
    const basket = new THREE.Mesh(
      new RoundedBoxGeometry(0.18 * s, 0.24 * s, 0.32 * s, 2, 0.03 * s),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 })
    );
    basket.position.set(0, 0.16 * s, 0.08 * s);
    rightHandBone.add(basket);
  }
}

// ============================================================================
// 4. HỆ THỐNG NHÂN VẬT CON NGƯỜI THẬT (KHÔNG ROBOT, KHÔNG LỖI NẰM NGANG!)
// ============================================================================
const playerGroup = new THREE.Group();
playerGroup.visible = false;
playerGroup.position.set(0, 0, 1.5);
scene.add(playerGroup);

let playerMixer = null;
let playerActions = { idle: null, walk: null, run: null, jump: null };
let activeActionName = 'idle';
let playerModel = null;
let playerBones = {};
let playerBoneRest = {};
let playerBoneRestScale = {};
let playerModelBaseY = 0;
const allMixers = [];
const dynamicWalkers = []; // Các NPC con người đi lại, tuần tra, quét rác, bán xôi, đi học
const npcList = [];

const gltfLoader = new GLTFLoader();

function setPlayerAnimation(name) {
  if (activeActionName === name || !playerActions[name]) return;
  const prev = playerActions[activeActionName];
  const next = playerActions[name];
  const isLocomotionPair =
    (activeActionName === 'walk' && name === 'run') ||
    (activeActionName === 'run' && name === 'walk');
  if (prev) prev.fadeOut(isLocomotionPair ? 0.22 : 0.16);
  next.reset();
  if (name === 'jump') {
    next.time = 0.35; // Vào thẳng pha co chân bật nhảy trên không trung
  } else if (isLocomotionPair && prev) {
    const prevDur = prev.getClip()?.duration || 1;
    const nextDur = next.getClip()?.duration || 1;
    next.time = (prev.time % prevDur) * (nextDur / prevDur);
  }
  next.fadeIn(isLocomotionPair ? 0.22 : 0.14).play();
  activeActionName = name;
}

// Tạo bong bóng thoại nhỏ (Ambient Speech Bubble) nổi lên trên đầu NPC khi họ sinh hoạt
function createSpeechBubbleSprite(text) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const ctx = c.getContext('2d');

  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(12, 10, 488, 66, 26);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 21px "Segoe UI", sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 43);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: true, depthWrite: false }));
  sp.scale.set(3.6, 0.68, 1);
  sp.position.y = 2.65;
  return sp;
}

async function loadAllCharactersAndAmbientLife() {
  try {
    // Bộ nhân vật CC0 tạo riêng theo từng vai trò. Mỗi GLB dùng chung rig Grab3D
    // và đã chứa animation nên không cần retarget giữa nhiều bộ xương khác nhau.
    const characterEntries = await Promise.all([
      ['player', 'assets/models/player-cozy-adult.glb'],
      ['guard', 'assets/models/npc-guard-adult.glb'],
      ['official', 'assets/models/npc-official-adult.glb'],
      ['vendor', 'assets/models/npc-vendor-adult.glb'],
      ['resident', 'assets/models/npc-resident-adult.glb'],
      ['veteran', 'assets/models/npc-veteran-adult.glb']
    ].map(async ([key, url]) => [key, await gltfLoader.loadAsync(url)]));
    const characterGlbs = Object.fromEntries(characterEntries);

    const createCitizen=createCitizenFactory(characterGlbs);

    function buildHumanCharacter(gender, config) {
      const isPlayer=config.isPlayer===true;
      const citizen=isPlayer?null:createCitizen(config.identityId);
      const gltf=isPlayer?characterGlbs.player:{animations:citizen.animations};
      const model=isPlayer?SkeletonUtils.clone(characterGlbs.player.scene):citizen.model;
      if(isPlayer)model.userData.citizenIdentity='player';
      model.scale.setScalar(config.scale || 1);
      model.rotation.y = 0;
      const bones = {};
      model.traverse((node) => {
        if (node.isBone) {
          const cleanName = canonicalBoneName(node.name);
          bones[cleanName] = node;
          bones[cleanName.toLowerCase()] = node;
        }
        if (!node.isMesh) return;
        node.castShadow = true;
        node.receiveShadow = false;
        node.frustumCulled = false;
      });

      refitHumanProportions(model, (citizen?.profile.height||1.64) * (config.scale || 1));
      dressCitizenMaterials(model);
      model.userData.savedSkinDraws=compactCitizenMeshes(model);
      if(citizen){
        addCitizenIdentityDetails(model,bones,citizen.profile);
        if(citizen.profile.bag==='satchel')addCitizenSatchel(model,bones);
      }
      model.traverse(node=>{if(!node.isSkinnedMesh)return;node.computeBoundingSphere();node.boundingSphere.radius=node.boundingSphere.radius*1.5+.65;node.frustumCulled=true;});
      const byName = Object.fromEntries(gltf.animations.map((source) => {
        const clip=source.clone();clip.tracks=clip.tracks.filter(track=>!/^head\.scale$/i.test(track.name));
        return [clip.name.toLowerCase(),clip];
      }));
      return {
        model,
        bones,
        clips: {
          idle: byName.idle,
          walk: byName.walk || byName.idle,
          run: byName.run || byName.walk || byName.idle,
          jump: byName.jump || byName.idle,
          talk: byName.wave || byName.idle
        }
      };
    }

    // ------------------------------------------------------------------------
    // A. NHÂN VẬT NGƯỜI CHƠI CHÍNH
    // ------------------------------------------------------------------------
    const hero = buildHumanCharacter('male', {
      modelKey: 'player',
      isPlayer:true,
      scale: 1.02
    });
    playerModel = hero.model;
    hero.model.userData.helmet=addCitizenHelmet(hero.model,hero.bones,0x364c59);
    addCitizenSatchel(hero.model,hero.bones);
    if(hero.model.userData.helmet)hero.model.userData.helmet.visible=false;
    playerModelBaseY = hero.model.position.y;
    playerBones = {};
    playerBoneRest = {};
    playerBoneRestScale = {};
    hero.model.traverse((node) => {
      if (!node.isBone) return;
      const cleanName = canonicalBoneName(node.name);
      playerBones[cleanName] = node;
      playerBones[cleanName.toLowerCase()] = node;
      playerBoneRest[cleanName] = node.quaternion.clone();
      playerBoneRest[cleanName.toLowerCase()] = playerBoneRest[cleanName];
      playerBoneRestScale[cleanName] = node.scale.clone();
      playerBoneRestScale[cleanName.toLowerCase()] = playerBoneRestScale[cleanName];
    });
    playerGroup.add(hero.model);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 })
    );
    shadow.position.y = 0.02;
    playerGroup.add(shadow);

    playerMixer = new THREE.AnimationMixer(hero.model);
    allMixers.push(playerMixer);
    playerActions.idle = playerMixer.clipAction(hero.clips.idle);
    playerActions.walk = playerMixer.clipAction(hero.clips.walk);
    playerActions.run = playerMixer.clipAction(hero.clips.run);
    playerActions.jump = playerMixer.clipAction(hero.clips.jump);
    // Nhịp bước chân & chạy bộ tự nhiên, mượt mà không bị giật nhanh
    playerActions.walk.timeScale = 1.38;
    playerActions.run.timeScale = 1.05;
    playerActions.jump.timeScale = 1.4;
    playerActions.idle.play();

    // ------------------------------------------------------------------------
    // B. Năm NPC nhiệm vụ với danh tính và bộ phận mô hình riêng.
    // ------------------------------------------------------------------------
    const questConfigs = [
      {
        // 1. Bác Bảo vệ THPT Tây Hồ: Người đàn ông mặc áo sơ mi bảo vệ xanh da trời + Quần âu tím than + Mũ kê-pi bảo vệ + Dùi cui
        gender: 'male',
        modelKey: 'guard',
        scale: 1.06,
        prop: 'security_guard',
        style: {
          hideHeadwear: true,
          hideBeard: false,
          topColor: 0x38bdf8,    // Áo đồng phục bảo vệ xanh da trời
          bottomColor: 0x0f172a, // Quần âu xanh đen
          shoesColor: 0x111827
        },
        patrol: { x1: -5.5, z1: 8.2, x2: 2.2, z2: 8.2, speed: 1.45 },
        chatter: ['Học sinh đi học đúng giờ nhé!', 'Cổng 41 Phú Thượng - Trường THPT Tây Hồ']
      },
      {
        // 2. Cán bộ UBND Phường: Nam cán bộ trẻ mặc áo sơ mi trắng công sở + Quần âu đen + Tay cầm cặp hồ sơ đỏ
        gender: 'male',
        modelKey: 'official',
        scale: 1.05,
        prop: 'official',
        style: {
          hideHeadwear: true,
          hideBeard: true,
          topColor: 0xf8fafc,    // Sơ mi trắng công sở
          bottomColor: 0x1e293b, // Quần tây đen
          shoesColor: 0x0f172a
        },
        patrol: { x1: -3.5, z1: -6.2, x2: 3.5, z2: -6.2, speed: 1.35 },
        chatter: ['Chào mừng bà con tới UBND Phường Phú Thượng!', 'Thủ tục hành chính nhanh gọn, tận tâm!']
      },
      {
        // 3. Cô Hoa Bán Trà Đá: Người phụ nữ Việt Nam mặc áo xanh lá + Đội Nón lá truyền thống + Đi lại quanh bàn trà đá
        gender: 'female',
        modelKey: 'vendor',
        scale: 1.02,
        prop: 'non_la',
        style: {
          bodyTint: 0x86efac
        },
        patrol: { x1: -54.5, z1: -5.6, x2: -50.5, z2: -5.6, speed: 1.25 },
        chatter: ['Trà đá, nhân trần mát lạnh 3 nghìn đây!', 'Ngồi ghế xanh nghỉ chân uống nước cháu ơi!']
      },
      {
        // 4. Bác Tổ Trưởng Dân Phố: Bác trai mặc áo khoác kaki vàng đất + Mũ nồi nâu + Tay cầm loa phường
        gender: 'male',
        modelKey: 'resident',
        scale: 1.05,
        prop: 'ward_leader',
        style: {
          hideHeadwear: true,
          hideBeard: false,
          topColor: 0xd97706,    // Áo khoác kaki vàng cam
          bottomColor: 0x451a03, // Quần nâu
          shoesColor: 0x1c1917
        },
        patrol: { x1: 29.0, z1: -5.5, x2: 36.5, z2: -5.5, speed: 1.3 },
        chatter: ['Ngã tư 68 Phú Thượng - Phú Gia trật tự, văn minh!', 'Rẽ phải là vào Đình Phú Gia nhé!']
      },
      {
        // 5. Bác Cựu Chiến Binh: Bác trai mặc quân phục xanh bộ đội + Đội Mũ cối xanh + Đi dạo trang nghiêm
        gender: 'male',
        modelKey: 'veteran',
        scale: 1.05,
        prop: 'veteran',
        style: {
          hideHeadwear: true,
          hideBeard: false,
          topColor: 0x15803d,    // Áo xanh bộ đội Cụ Hồ
          bottomColor: 0x14532d, // Quần quân phục xanh đậm
          shoesColor: 0x111827
        },
        patrol: { x1: -28.0, z1: -28.0, x2: -20.0, z2: -28.0, speed: 1.2 },
        chatter: ['Đời đời nhớ ơn các Anh hùng Liệt sĩ Phú Thượng!', 'Truyền thống cách mạng quê hương Phú Thượng!']
      }
    ];

    npcList.forEach((npcGroup, idx) => {
      const cfg = questConfigs[idx];
      const { model, bones, clips } = buildHumanCharacter(cfg.gender, {...cfg,identityId:QUEST_IDENTITIES[idx]});
      npcGroup.add(model);

      const mixer = new THREE.AnimationMixer(model);
      allMixers.push(mixer);
      const walkAct = mixer.clipAction(clips.walk);
      const idleAct = mixer.clipAction(clips.talk);
      walkAct.timeScale = 1.25;
      walkAct.play();

      const bubble = createSpeechBubbleSprite(cfg.chatter[0]);
      bubble.position.y = 2.85;
      npcGroup.add(bubble);

      dynamicWalkers.push({
        group: npcGroup,
        bones,
        headYaw: 0,
        mixer,
        walkAct,
        idleAct,
        state: 'walk',
        isQuestNPC: true,
        x1: cfg.patrol.x1,
        z1: cfg.patrol.z1,
        x2: cfg.patrol.x2,
        z2: cfg.patrol.z2,
        speed: cfg.patrol.speed,
        dir: 1,
        pauseTimer: 0,
        chatter: cfg.chatter,
        bubble,
        chatTimer: idx * 2.5
      });
    });

    // ------------------------------------------------------------------------
    // C. 11+ NPC CƯ DÂN PHỤ (100% CON NGƯỜI) ĐI LẠI & SINH HOẠT KHẮP PHỐ PHÚ THƯỢNG
    // ------------------------------------------------------------------------
    const ambientDefinitions = [
      // 1. Cô gánh Xôi ở đúng góc vỉa hè trước cổng trường như Street View.
      {
        gender: 'female',
        scale: 1.0,
        prop: 'xoi_vendor',
        isXoiVendor: true,
        style: { bodyTint: 0xfde047 },
        x1: -8,
        z1: 8.4,
        x2: 18,
        z2: 8.4,
        speed: 1.55,
        animType: 'walk',
        chatter: ['Ai Xôi Phú Thượng nóng giòn đê! (Bấm E mua Xôi)', 'Xôi xéo, xôi gấc, xôi cốm Phú Thượng 15k nào!']
      },
      // 2. Bác Lao công quét lá vàng dọc bức tường vàng Trường THPT Tây Hồ
      {
        gender: 'male',
        scale: 1.02,
        prop: 'sweeper',
        style: {
          hideHeadwear: true,
          hideBeard: true,
          topColor: 0x22c55e,    // Áo phản quang môi trường đô thị xanh lá
          bottomColor: 0x1e293b
        },
        x1: -78,
        z1: 7.8,
        x2: -18,
        z2: 7.8,
        speed: 1.35,
        animType: 'walk',
        chatter: ['Quét sạch lá xà cừ cho phố Phú Thượng đẹp nào!', 'Mát trời thế này đi bộ thích thật!']
      },
      // 3 & 4 & 5. Nhóm Học sinh Trường THPT Tây Hồ mặc áo đồng phục trắng đeo balo đi bộ trên vỉa hè Nam vào cổng trường 41
      {
        gender: 'female',
        scale: 0.96,
        prop: 'backpack_blue',
        style: { bodyTint: 0xffffff },
        x1: -65,
        z1: 8.6,
        x2: -4,
        z2: 8.6,
        speed: 2.0,
        animType: 'walk',
        chatter: ['Nhanh lên cậu ơi sắp đánh trống vào lớp rồi!', 'Chiều tan học ra quán cô Hoa uống trà chanh nhé!']
      },
      {
        gender: 'male',
        scale: 0.98,
        prop: 'backpack_red',
        style: {
          hideHeadwear: true,
          hideBeard: true,
          topColor: 0xffffff,    // Đồng phục học sinh áo trắng
          bottomColor: 0x1e3a8a, // Quần xanh tím than
          shoesColor: 0xffffff
        },
        x1: -62,
        z1: 9.2,
        x2: -2,
        z2: 9.2,
        speed: 2.0,
        animType: 'walk',
        chatter: ['Sáng nay tớ vừa làm gói xôi Phú Thượng no căng!', 'Hôm nay lớp mình có tiết Thể dục ngoài sân bóng rổ!']
      },
      {
        gender: 'female',
        scale: 0.95,
        prop: 'backpack_purple',
        style: { bodyTint: 0xfef9c3 },
        x1: 36,
        z1: 8.4,
        x2: -3,
        z2: 8.4,
        speed: 2.1,
        animType: 'walk',
        chatter: ['Đợi tớ vào cổng trường Tây Hồ với!', 'Hàng cây trước cổng trường mình đẹp quá!']
      },
      // 6. Thanh niên chạy bộ thể dục buổi sáng (Run animation) kèm Chú Chó Corgi chạy theo sau!
      {
        gender: 'male',
        scale: 1.05,
        prop: '',
        style: {
          hideHeadwear: false,
          hideBeard: true,
          topColor: 0x0284c7,    // Áo thể thao xanh dương
          bottomColor: 0x0f172a, // Quần thể thao đen
          shoesColor: 0xfacc15
        },
        x1: -95,
        z1: -6.8,
        x2: 34,
        z2: -6.8,
        speed: 4.5,
        animType: 'run',
        hasDog: true,
        chatter: ['Chạy bộ dọc phố Phú Thượng không khí trong lành quá!', 'Chạy nhanh nào Corgi ơi!']
      },
      // 7 & 8. Các bà / các chị xách làn đỏ đi chợ Phú Gia
      {
        gender: 'female',
        scale: 1.0,
        prop: 'market_basket',
        style: { bodyTint: 0xf472b6 },
        x1: 38,
        z1: -7.8,
        x2: -45,
        z2: -7.8,
        speed: 1.75,
        animType: 'walk',
        chatter: ['Đi chợ Phú Gia mua rau tươi về nấu canh nào!', 'Ghé hàng tạp hóa Phú Thượng mua thêm chai dầu ăn!']
      },
      {
        gender: 'female',
        scale: 1.0,
        prop: 'market_basket',
        style: { bodyTint: 0xc084fc },
        x1: 40,
        z1: -35,
        x2: 40,
        z2: 35,
        speed: 1.8,
        animType: 'walk',
        chatter: ['Đường Phố Phú Gia hôm nay đông vui quá!', 'Mua ít hoa quả thắp hương rằm nào!']
      },
      // 9 & 10. Hai khách đang đứng/ngồi uống trà đá & trò chuyện tại Quán Cô Hoa (X = -53.5, Z = -7.2)
      {
        gender: 'male',
        scale: 1.04,
        prop: '',
        style: {
          hideHeadwear: false,
          hideBeard: false,
          topColor: 0x4f46e5,
          bottomColor: 0x1e293b
        },
        x1: -53.2,
        z1: -7.2,
        x2: -53.2,
        z2: -7.2,
        speed: 0,
        rotY: -0.6,
        animType: 'talk',
        chatter: ['Cho thêm cốc trà đá với đĩa hướng dương cô Hoa ơi!', 'Ngồi dưới bóng cây phố Phú Thượng mát thật!']
      },
      {
        gender: 'male',
        scale: 1.03,
        prop: '',
        style: {
          hideHeadwear: true,
          hideBeard: true,
          topColor: 0x059669,
          bottomColor: 0x334155
        },
        x1: -54.6,
        z1: -6.9,
        x2: -54.6,
        z2: -6.9,
        speed: 0,
        rotY: 1.1,
        animType: 'talk',
        chatter: ['Trà đá vỉa hè Hà Nội đúng là số một!', 'Chiều nay đón con ở trường Tây Hồ ngay đối diện luôn!']
      },
      // 11. Học sinh đi bộ trong sân Trường THPT Tây Hồ
      {
        gender: 'male',
        scale: 0.98,
        prop: 'backpack_blue',
        style: {
          hideHeadwear: true,
          hideBeard: true,
          topColor: 0xffffff,
          bottomColor: 0x0f172a
        },
        x1: -10,
        z1: 24,
        x2: 8,
        z2: 24,
        speed: 1.9,
        animType: 'walk',
        chatter: ['Sân trường THPT Tây Hồ rộng và nhiều cây xanh quá!', 'Ra sân bóng rổ làm một trận đi!']
      }
    ];

    ambientDefinitions.push(
      {gender:'female',modelKey:'resident',scale:.98,x1:49.3,z1:-96,x2:49.3,z2:-96,speed:0,animType:'idle',rotY:-Math.PI/2,chatter:['Cô Liên · tiệm may. Bưu kiện của cô có mẫu vải mới.']},
      {gender:'male',modelKey:'veteran',scale:1,x1:-75,z1:-108.8,x2:-75,z2:-108.8,speed:0,animType:'idle',rotY:Math.PI,chatter:['Bác Sơn · hiệu sách. Nhớ đối chiếu nhãn rồi hãy ký nhận nhé.']},
      {gender:'male',modelKey:'vendor',scale:1,x1:27.8,z1:-222,x2:27.8,z2:-222,speed:0,animType:'idle',rotY:-Math.PI/2,chatter:['Chú Bình · quán nước đường đê. Đi chậm, hàng đến nguyên là tốt rồi.']}
    );
    ambientDefinitions.forEach((def, idx) => {
      const grp = new THREE.Group();
      grp.position.set(def.x1, 0.12, def.z1);
      if (def.rotY !== undefined) grp.rotation.y = def.rotY;

      const { model, bones, clips } = buildHumanCharacter(def.gender, {...def,identityId:AMBIENT_IDENTITIES[idx]});
      grp.add(model);

      // Bóng đổ dưới chân
      const sh = new THREE.Mesh(
        new THREE.CircleGeometry(0.36, 16).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 })
      );
      sh.position.y = 0.02;
      grp.add(sh);

      // Nếu là người chạy bộ có Chú Chó Corgi chạy theo sau!
      if (def.hasDog) {
        const dog = createCute3DDog();
        dog.position.set(0, 0, -1.3);
        grp.add(dog);
        grp.dogMesh = dog;
      }

      const mixer = new THREE.AnimationMixer(model);
      allMixers.push(mixer);
      const clipToPlay = clips[def.animType] || clips.walk;
      const act = mixer.clipAction(clipToPlay);
      if (def.animType === 'walk') act.timeScale = 1.3;
      if (def.animType === 'run') act.timeScale = 1.25;
      act.play();

      const bubble = createSpeechBubbleSprite(def.chatter[0]);
      grp.add(bubble);

      worldGroup.add(grp);
      dynamicWalkers.push({
        group: grp,
        bones,
        headYaw: 0,
        mixer,
        isQuestNPC: false,
        isXoiVendor: !!def.isXoiVendor,
        x1: def.x1,
        z1: def.z1,
        x2: def.x2,
        z2: def.z2,
        speed: def.speed,
        dir: 1,
        pauseTimer: 0,
        chatter: def.chatter,
        bubble,
        walkAct: def.speed>0?act:null,
        idleAct: def.speed>0?mixer.clipAction(clips.idle):act,
        chatTimer: idx * 1.8
      });
      grp.visible = !horrorModeActive;
    });

    if (typeof streetEventGroup?.userData?.attachHumanCharacters === 'function') {
      streetEventGroup.userData.attachHumanCharacters(buildHumanCharacter);
    }
    policeController?.attachCharacters(buildHumanCharacter);
    let riderIndex=0;
    for(const vehicle of animatedTraffic){
      const bike=vehicle.mesh;if(!bike?.userData.rider)continue;
      bike.remove(bike.userData.rider);
      const rider=buildHumanCharacter(riderIndex%2?'female':'male',{identityId:RIDER_IDENTITIES[riderIndex],scale:.98});
      addCitizenHelmet(rider.model,rider.bones,[0x425964,0x7d4e42,0xb4ad92,0x424641][riderIndex%4]);
      const axis=new THREE.Vector3(1,0,0);
      for(const [name,angle]of [['upperLeg.L',1.08],['upperLeg.R',1.08],['lowerLeg.L',-1.36],['lowerLeg.R',-1.36],['upperArm.L',1.34],['upperArm.R',1.34],['lowerArm.L',-.68],['lowerArm.R',-.68]])rider.bones[name]?.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(axis,angle));
      rider.model.position.set(-.27,.19,0);rider.model.rotation.y=Math.PI/2;
      rider.model.userData.modelFamily='traffic-rider';bike.add(rider.model);bike.userData.rider=rider.model;
      riderIndex++;
    }
    if(browserPlaytest){
      const diagnostic=document.getElementById('interact-prompt'),families={};
      for(const root of [worldGroup,playerGroup])root.traverse(node=>{const family=node.userData.modelFamily||node.geometry?.userData.modelFamily;if(family)families[family]=(families[family]||0)+(node.isInstancedMesh?node.count:1);});
      const identities=[];scene.traverse(node=>{if(node.userData.citizenIdentity)identities.push({id:node.userData.citizenIdentity,label:node.userData.citizenLabel||'Người chơi',signature:node.userData.citizenSignature||'player'});});
      diagnostic.dataset.citizenRoster=JSON.stringify(identities);
      diagnostic.dataset.modelFamilies=JSON.stringify(families);diagnostic.dataset.charactersReady='true';
    }
  } catch (err) {
    console.warn('Lỗi nạp mô hình NPC:', err);
  }
}

// Tạo chú chó Corgi 3D chạy lon ton theo sau người chạy bộ trên phố Phú Thượng
function createCute3DDog() {
  const dog = new THREE.Group();
  const furMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.7 });

  const body = new THREE.Mesh(ellipsoidGeometry(0.28, 0.24, 0.52), furMat);
  body.position.y = 0.26;
  body.castShadow = true;
  dog.add(body);

  const head = new THREE.Mesh(ellipsoidGeometry(0.24, 0.22, 0.26), furMat);
  head.position.set(0, 0.38, 0.26);
  dog.add(head);

  const snout = new THREE.Mesh(ellipsoidGeometry(0.12, 0.1, 0.14), whiteMat);
  snout.position.set(0, 0.34, 0.4);
  dog.add(snout);

  [-0.08, 0.08].forEach((ex) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 6), furMat);
    ear.position.set(ex, 0.52, 0.24);
    dog.add(ear);
  });

  [
    [-0.09, -0.18],
    [0.09, -0.18],
    [-0.09, 0.18],
    [0.09, 0.18]
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.18, 8), whiteMat);
    leg.position.set(lx, 0.09, lz);
    dog.add(leg);
  });

  return dog;
}

// ============================================================================
// 5. HỆ THỐNG VA CHẠM VẬT LÝ (COLLISION SYSTEM) & DỰNG CẢNH QUAN PHỐ PHÚ THƯỢNG
// ============================================================================
const animatedFlags = [];
const animatedTraffic = [];
const realisticStreetLights = [];
const horrorStreetLights = [];
const horrorSetPieces = { root: null, rain: null, entity: null, altarGlow: null, door: null, occluders: null, clues: [] };
const storyFoodStall = { root: null, warmLight: null, neon: null };
const boxColliders = [];    // Danh sách các khối vật cản hình hộp (Tòa nhà, tường rào, bốt bảo vệ, ô tô, bồn hoa)
const circleColliders = []; // Danh sách các vật cản hình trụ tròn (Gốc cây cổ thụ, cột điện, cột biển báo, bàn trà đá)
const boxCollisionGrid = new CollisionGrid();
const circleCollisionGrid = new CollisionGrid();
const nearbyBoxes = [], nearbyCircles = [], nearbyCameraBoxes = [];

function addBoxCollider(cx, cz, width, depth) {
  boxColliders.push({
    minX: cx - width / 2,
    maxX: cx + width / 2,
    minZ: cz - depth / 2,
    maxZ: cz + depth / 2
  });
  boxCollisionGrid.insert(boxColliders[boxColliders.length - 1], boxColliders.length - 1);
}

function addCircleCollider(cx, cz, radius) {
  circleColliders.push({ x: cx, z: cz, r: radius });
  circleCollisionGrid.insert({ minX: cx - radius, maxX: cx + radius, minZ: cz - radius, maxZ: cz + radius }, circleColliders.length - 1);
}

// Giải quyết va chạm (Push-out sliding collision) giúp nhân vật trượt mượt dọc theo tường/vật thể mà không đi xuyên qua!
function resolvePlayerCollisions(pos, playerRadius = 0.46) {
  for (let iter = 0; iter < 3; iter++) {
    // 1. Va chạm với các khối hộp (Tòa nhà, tường, ô tô, hàng rào)
    boxCollisionGrid.query(pos.x, pos.z, playerRadius, nearbyBoxes);
    for (let i = 0; i < nearbyBoxes.length; i++) {
      const b = boxColliders[nearbyBoxes[i]];
      const closestX = Math.max(b.minX, Math.min(pos.x, b.maxX));
      const closestZ = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
      const dx = pos.x - closestX;
      const dz = pos.z - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < playerRadius * playerRadius) {
        if (distSq > 1e-6) {
          const dist = Math.sqrt(distSq);
          const overlap = playerRadius - dist;
          pos.x += (dx / dist) * overlap;
          pos.z += (dz / dist) * overlap;
        } else {
          // Trường hợp tâm nhân vật lọt hẳn vào trong hộp -> đẩy ra cạnh gần nhất
          const dLeft = Math.abs(pos.x - b.minX);
          const dRight = Math.abs(b.maxX - pos.x);
          const dTop = Math.abs(pos.z - b.minZ);
          const dBottom = Math.abs(b.maxZ - pos.z);
          const minD = Math.min(dLeft, dRight, dTop, dBottom);
          if (minD === dLeft) pos.x = b.minX - playerRadius;
          else if (minD === dRight) pos.x = b.maxX + playerRadius;
          else if (minD === dTop) pos.z = b.minZ - playerRadius;
          else pos.z = b.maxZ + playerRadius;
        }
      }
    }

    // 2. Va chạm với các vật thể hình trụ tròn (Cây xanh, cột điện, bàn trà đá, xe máy)
    circleCollisionGrid.query(pos.x, pos.z, playerRadius, nearbyCircles);
    for (let i = 0; i < nearbyCircles.length; i++) {
      const c = circleColliders[nearbyCircles[i]];
      const dx = pos.x - c.x;
      const dz = pos.z - c.z;
      const minDist = playerRadius + c.r;
      const distSq = dx * dx + dz * dz;
      if (distSq < minDist * minDist && distSq > 1e-6) {
        const dist = Math.sqrt(distSq);
        const overlap = minDist - dist;
        pos.x += (dx / dist) * overlap;
        pos.z += (dz / dist) * overlap;
      }
    }

    // 3. Va chạm nhẹ với 5 NPC nhiệm vụ để không đi xuyên qua người NPC
    for (let i = 0; i < npcList.length; i++) {
      if (!npcList[i].visible) continue;
      const npcPos = npcList[i].position;
      const dx = pos.x - npcPos.x;
      const dz = pos.z - npcPos.z;
      const minDist = playerRadius + 0.42;
      const distSq = dx * dx + dz * dz;
      if (distSq < minDist * minDist && distSq > 1e-6) {
        const dist = Math.sqrt(distSq);
        const overlap = minDist - dist;
        pos.x += (dx / dist) * overlap;
        pos.z += (dz / dist) * overlap;
      }
    }
  }
  resolveDynamicVehicleCollisions(pos, playerRadius);
}

function pushOutFromCircle(pos, centerX, centerZ, minDistance, fallbackX = 1, fallbackZ = 0) {
  const dx = pos.x - centerX;
  const dz = pos.z - centerZ;
  const distSq = dx * dx + dz * dz;
  if (distSq >= minDistance * minDistance) return false;
  if (distSq < 1e-8) {
    pos.x += fallbackX * minDistance;
    pos.z += fallbackZ * minDistance;
    return true;
  }
  const distance = Math.sqrt(distSq);
  const overlap = minDistance - distance;
  pos.x += (dx / distance) * overlap;
  pos.z += (dz / distance) * overlap;
  return true;
}

function resolveDynamicVehicleCollisions(pos, playerRadius) {
  if (horrorModeActive) return;
  if (!playerState.isRidingBike) {
    const forwardX = Math.sin(playerMotorbike.rotation.y);
    const forwardZ = Math.cos(playerMotorbike.rotation.y);
    const halfLength = 0.56;
    const ax = playerMotorbike.position.x - forwardX * halfLength;
    const az = playerMotorbike.position.z - forwardZ * halfLength;
    const bx = playerMotorbike.position.x + forwardX * halfLength;
    const bz = playerMotorbike.position.z + forwardZ * halfLength;
    const abX = bx - ax;
    const abZ = bz - az;
    const abLengthSq = abX * abX + abZ * abZ;
    const t = THREE.MathUtils.clamp(((pos.x - ax) * abX + (pos.z - az) * abZ) / abLengthSq, 0, 1);
    const closestX = ax + abX * t;
    const closestZ = az + abZ * t;
    pushOutFromCircle(pos, closestX, closestZ, playerRadius + 0.34, Math.cos(playerMotorbike.rotation.y), -Math.sin(playerMotorbike.rotation.y));
  }

  if(pos===playerGroup.position)for(const o of policeController?.officers||[])if(o.group.visible)pushOutFromCircle(pos,o.group.position.x,o.group.position.z,playerRadius+.28);
  animatedTraffic.forEach((vehicle) => {
    if(vehicle.kind==='car'||vehicle.kind==='bus'){
      resolveTrafficCar(pos,{x:vehicle.mesh.position.x,z:vehicle.mesh.position.z,yaw:vehicle.yaw,kind:vehicle.kind},playerRadius);
    }else pushOutFromCircle(pos, vehicle.mesh.position.x, vehicle.mesh.position.z, playerRadius + 0.43);
  });
}

let districtExtension=null,districtStreetscape=null,districtLiving=null;
function buildPhuThuong3DWorld() {
  const basePlane = new THREE.Mesh(worldUVs(new THREE.PlaneGeometry(1000, 1000).rotateX(-Math.PI / 2), 3), visualMaterials.concrete());
  basePlane.position.y = -0.05;
  basePlane.receiveShadow = true;
  worldGroup.add(basePlane);


  const asphaltMat = createDetailedAsphaltMaterial();
  const mainStreet = new THREE.Mesh(worldUVs(new THREE.PlaneGeometry(380, 11.4, 76, 2),3), asphaltMat);
  mainStreet.rotation.x = -Math.PI / 2;
  mainStreet.position.set(-10, 0.08, 0);
  mainStreet.receiveShadow = true;
  worldGroup.add(mainStreet);

  const phuGiaRoad = new THREE.Mesh(worldUVs(crossingRoadGeometry(10.8,280,11.4,-140,55),3), asphaltMat);
  phuGiaRoad.rotation.x = -Math.PI / 2;
  phuGiaRoad.position.set(42, 0.08, 0);
  phuGiaRoad.receiveShadow = true;
  worldGroup.add(phuGiaRoad);

  // Crossing paint is built below from the shared pedestrian crossing map.
  const roadPaint=new THREE.MeshStandardMaterial({color:0xd8d6c9,roughness:1,polygonOffset:true,polygonOffsetFactor:-2});
  const markings=new THREE.Group();markings.userData.staticBatch=true;
  for(let x=-180;x<170;x+=10){if(Math.abs(x+15)<7||Math.abs(x-42)<7)continue;const dash=new THREE.Mesh(new THREE.PlaneGeometry(3.5,.14).rotateX(-Math.PI/2),roadPaint);dash.position.set(x,.094,0);markings.add(dash);}
  for(let z=-48;z<55;z+=10){if(Math.abs(z)<8)continue;const dash=new THREE.Mesh(new THREE.PlaneGeometry(.14,3.5).rotateX(-Math.PI/2),roadPaint);dash.position.set(42,.094,z);markings.add(dash);}
  worldGroup.add(markings);

  const sidewalkMat = visualMaterials.concrete();
  for(const side of [-1,1])for(const span of sidewalkSpans(side)){
    const length=span.maxX-span.minX,cx=(span.minX+span.maxX)/2;
    const walk=new THREE.Mesh(worldUVs(new THREE.BoxGeometry(length,.18,side<0?7.2:6.8),3),sidewalkMat);
    walk.position.set(cx,.09,side<0?-9.2:9);walk.receiveShadow=true;worldGroup.add(walk);
    createCurbStones(cx,side*5.65,length);
  }

  buildTHPTTayHoCampus();
  buildUBNDPhuThuongCampus();
  buildShophousesAndTeaStall();
  buildSurroundingPhuThuongDistrict();
  buildExtendedExplorationDistrict();
  buildStreetLevelRealism();
  buildNgo41HorrorAlley();
  buildPermanentWorldClosure();
  buildSouthStreetInfill();
  buildVietnameseFoodStall();
  districtExtension=buildDistrictExtension({world:worldGroup,materials:visualMaterials,asphalt:asphaltMat,label:createNPCLabel,box:addBoxCollider});
  buildEastWorld({world:worldGroup,materials:visualMaterials,box:addBoxCollider});
  buildPhuXaCourt({world:worldGroup,materials:visualMaterials,box:addBoxCollider,label:createNPCLabel});
  buildWestPeachGarden({world:worldGroup,materials:visualMaterials,box:addBoxCollider,label:createNPCLabel});
  districtStreetscape=buildDistrictStreetscape({world:worldGroup,materials:visualMaterials,box:addBoxCollider,buildings:districtExtension.buildingFootprints});
  districtLiving=buildDistrictLiving({world:worldGroup,materials:visualMaterials,box:addBoxCollider,buildings:boxColliders,frontages:districtExtension.frontages});
  if(browserPlaytest)document.getElementById('interact-prompt').dataset.livingDetails=JSON.stringify(districtLiving.counts);
}

function buildPermanentWorldClosure() {
  // These are real, collidable walls in both day and story modes. Keep the
  // street entrance and the food shop doorway open; never rely on fog to seal a gap.
  const root = new THREE.Group();
  root.name = 'PermanentNgo41Closure';
  horrorSetPieces.root.add(root);
  const ground = new THREE.Mesh(worldUVs(new THREE.PlaneGeometry(46, 52).rotateX(-Math.PI / 2), 3), visualMaterials.concrete());
  ground.position.set(-77.5, .024, -32);
  ground.receiveShadow = true;
  root.add(ground);
  for (const [x, z, w, d] of ALLEY_BOUNDARY_WALLS) {
    const h = 4.25;
    const wall = new THREE.Mesh(worldUVs(new THREE.BoxGeometry(w, h, d), 2.4), visualMaterials.brick());
    wall.position.set(x, h / 2, z);
    wall.receiveShadow = true;
    root.add(wall);
    addBoxCollider(x, z, w, d);
    const coping = new THREE.Mesh(new THREE.BoxGeometry(w + .12, .16, d + .12), visualMaterials.plaster(0xaaa594));
    coping.position.set(x, h + .08, z);
    root.add(coping);
  }
  // Backing volumes conceal the ground behind boundary walls from a raised
  // third-person camera too. Their front faces stay outside every playable lane.
  for (const [x,z,w,d,h] of ALLEY_BACKING_BUILDINGS) {
    const body = new THREE.Mesh(worldUVs(new THREE.BoxGeometry(w,h,d), 3), visualMaterials.plaster(0xaaa99a));
    body.position.set(x,h / 2,z); body.receiveShadow = true; root.add(body);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + .3,.22,d + .3), visualMaterials.plaster(0x777a72));
    roof.position.set(x,h + .11,z); root.add(roof);
    addBoxCollider(x,z,w,d);
  }
  // Continuous skyline plus backing houses at the west end of the street.
  // Shared instancing keeps the whole backdrop at three draws, no extra lights.
  const shells = CORE_BACKDROP_SHELLS;
  for (const shell of shells) {
    const bounds=backdropFootprint(shell);
    addBoxCollider(shell[0],shell[1],bounds.width,bounds.depth);
  }
  const outskirts = new THREE.Group();
  outskirts.name = 'DistrictBackdrop';
  worldGroup.add(outskirts);
  const bodies = new THREE.InstancedMesh(worldUVs(new THREE.BoxGeometry(8.15, 12, 14), 3), visualMaterials.plaster(0xffffff), shells.length);
  const roofs = new THREE.InstancedMesh(new THREE.BoxGeometry(8.4, .28, 14.3), visualMaterials.plaster(0x7b7d75), shells.length);
  const windows = new THREE.InstancedMesh(new THREE.BoxGeometry(1.25, 1.55, .12), new THREE.MeshStandardMaterial({ color: 0x34464a, roughness: .65 }), shells.length * 6);
  const dummy = new THREE.Object3D();
  const colors = [0xb8afa0, 0xa8afa5, 0xc4b79a, 0x939e9c];
  shells.forEach(([x,z,side], i) => {
    const h = 11 + (i * 7 % 11);
    const rotation = Math.abs(side) === 2 ? Math.PI / 2 : 0;
    dummy.position.set(x, h / 2 - .15, z); dummy.rotation.set(0, rotation, 0); dummy.scale.set(1, h / 12, 1);
    dummy.updateMatrix(); bodies.setMatrixAt(i, dummy.matrix); bodies.setColorAt(i, new THREE.Color(colors[i % colors.length]));
    dummy.position.y = h; dummy.scale.set(1,1,1); dummy.updateMatrix(); roofs.setMatrixAt(i, dummy.matrix);
    for (let floor = 0; floor < 3; floor++) for (let col = 0; col < 2; col++) {
      const offset = col ? 2 : -2;
      dummy.position.set(Math.abs(side) === 2 ? x - Math.sign(side) * 7.07 : x + offset, 2.6 + floor * 3, Math.abs(side) === 2 ? z + offset : z + side * 7.07);
      dummy.updateMatrix(); windows.setMatrixAt(i * 6 + floor * 2 + col, dummy.matrix);
    }
  });
  outskirts.add(bodies, roofs, windows);
}

function buildSouthStreetInfill() {
  const root = new THREE.Group();
  root.name = 'SouthStreetInfill';
  worldGroup.add(root);
  const houses = SOUTH_STREET_INFILL.filter(([x])=>Math.abs(x-ARCADE_SHOP.x)>.1);
  const count = houses.length;
  const bodies = new THREE.InstancedMesh(worldUVs(new THREE.BoxGeometry(7.4,12,10.5), 3), visualMaterials.plaster(0xffffff), count);
  const roofs = new THREE.InstancedMesh(new THREE.BoxGeometry(7.65,.22,10.75), visualMaterials.plaster(0x878378), count);
  const shutters = new THREE.InstancedMesh(worldUVs(new THREE.BoxGeometry(5.5,2.65,.14), 1.8), visualMaterials.wood, count);
  const windows = new THREE.InstancedMesh(new THREE.BoxGeometry(1.25,1.5,.14), archMaterials.glassDoor, count * 9);
  const ledges = new THREE.InstancedMesh(new THREE.BoxGeometry(6.5,.16,.8), archMaterials.creamMolding, count * 3);
  const awnings = new THREE.InstancedMesh(new THREE.BoxGeometry(6.3,.16,1.1), visualMaterials.plaster(0x667568), count);
  const dummy = new THREE.Object3D();
  const colors = [0xc9b99a,0xb8c0b0,0xd0b3a0,0xb5b0a6];
  houses.forEach(([x,z,w,d,h], i) => {
    dummy.position.set(x,h/2,z); dummy.scale.set(1,h/12,1); dummy.updateMatrix(); bodies.setMatrixAt(i,dummy.matrix);
    bodies.setColorAt(i,new THREE.Color(colors[i % colors.length]));
    dummy.scale.set(1,1,1); dummy.position.y=h+.11; dummy.updateMatrix(); roofs.setMatrixAt(i,dummy.matrix);
    dummy.position.set(x,1.48,z-d/2-.09); dummy.updateMatrix(); shutters.setMatrixAt(i,dummy.matrix);
    dummy.position.set(x,3.12,z-d/2-.55); dummy.updateMatrix(); awnings.setMatrixAt(i,dummy.matrix);
    for (let floor=0; floor<3; floor++) {
      const level = 3.4 + floor * (h - 3.4) / 3;
      dummy.position.set(x,level,z-d/2-.37); dummy.updateMatrix(); ledges.setMatrixAt(i*3+floor,dummy.matrix);
      for (let col=0; col<3; col++) {
        dummy.position.set(x+(col-1)*2,level+1,z-d/2-.09); dummy.updateMatrix(); windows.setMatrixAt(i*9+floor*3+col,dummy.matrix);
      }
    }
    addBoxCollider(x,z,w,d);
  });
  // All repeated frontage detail is six draws; no new lights or shadow casters.
  bodies.receiveShadow = true;
  root.add(bodies,roofs,shutters,windows,ledges,awnings);
  const rear = new THREE.Mesh(worldUVs(new THREE.BoxGeometry(60,5,.4),3),visualMaterials.brick());
  rear.position.set(-51.7,2.5,24); root.add(rear); addBoxCollider(-51.7,24,60,.4);
}

function createZebraCrossing(x, z) {
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9, transparent: true, opacity: 0.8 });
  for (let sz = -4.2; sz <= 4.2; sz += 1.1) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.55), stripeMat);
    s.rotation.x = -Math.PI / 2;
    s.position.set(x, 0.096, z + sz);
    worldGroup.add(s);
  }
}

// Tính độ cao mặt nền vật lý 3D tại tọa độ (x, z): Lòng đường nhựa (0.0m) vs Vỉa hè / Quảng trường Chợ Hoa / Công viên (0.18m)
function getGroundElevationAt(x, z) {
  if (typeof horrorModeActive !== 'undefined' && horrorModeActive) return 0;
  if(z < -55||z>55||x>162||x<-182)return districtGroundHeight(x,z);
  if(Math.abs(x-42)<5.4)return .08;
  if(z>12.4&&Math.abs(x+15)<4.3)return .08;
  if (x < -61 && z < -6.2) return 0; // Khu vực Ngõ 41 & Quán Xôi đêm
  if (z < -34 || z > 42 || x < -196 || x > 172) return 0;
  // Lòng đường chính Phố Phú Thượng
  if (Math.abs(z) < 5.55) return .08;
  // Hai dải vỉa hè chính dọc Phố Phú Thượng (northWalk: z ∈ [-12.8, -5.6], southWalk: z ∈ [5.6, 12.4]) luôn cao 0.18m
  if ((z >= -12.8 && z <= -5.55) || (z >= 5.55 && z <= 12.4)) {
    if (inStreetMouth(x,z)) return .08;
    return 0.18;
  }
  // Lòng đường nhánh Phố Phú Gia (x = 42, ngoài phạm vi vỉa hè chính) & lối rẽ Cổng trường (x = -15)
  if (Math.abs(x - 42) < 5.4) return .08;
  if (z > 12.4 && x > -18.5 && x < -11.5) return .08;
  if (z < -5.55 && x > -69.2 && x < -64.8) return 0;
  return 0.18;
}

let sharedCurbMaterial = null;
let sharedTactileStripMaterial = null;
let sharedGutterMaterial = null;

function createCurbStones(cx, z, totalLen) {
  if (!sharedCurbMaterial) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const ctx = c.getContext('2d');
    // Khối đá bó vỉa granito trắng-xám xen kẽ sơn phản quang + khe nối 3D
    ctx.fillStyle = '#d6d3cb';
    ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(128, 0, 128, 64);
    // Viền sáng đỉnh bó vỉa & khe mạch đá
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(0, 0, 256, 8);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.fillRect(0, 54, 256, 10);
    ctx.fillRect(124, 0, 6, 64);
    ctx.fillRect(250, 0, 6, 64);

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(1, 1);
    tex.anisotropy = 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    sharedCurbMaterial = new THREE.MeshStandardMaterial({
      map: tex,
      bumpMap: tex,
      bumpScale: 0.028,
      roughness: 0.78
    });
  }

  if (!sharedTactileStripMaterial) {
    // Gạch vàng dẫn hướng người khiếm thị có gân nổi 3D trên vỉa hè Hà Nội
    const tc = document.createElement('canvas');
    tc.width = 128;
    tc.height = 128;
    const tctx = tc.getContext('2d');
    tctx.fillStyle = '#ad9554';
    tctx.fillRect(0, 0, 128, 128);
    tctx.strokeStyle = '#713f12';
    tctx.lineWidth = 4;
    tctx.strokeRect(2, 2, 124, 124);
    for (let rib = 18; rib < 112; rib += 22) {
      tctx.fillStyle = '#c0ab70';
      tctx.fillRect(12, rib, 104, 6);
      tctx.fillStyle = '#8e7e50';
      tctx.fillRect(12, rib + 6, 104, 5);
    }
    const tTex = new THREE.CanvasTexture(tc);
    tTex.wrapS = THREE.RepeatWrapping;
    tTex.wrapT = THREE.RepeatWrapping;
    tTex.repeat.set(1, 1);
    tTex.anisotropy = 8;
    tTex.colorSpace = THREE.SRGBColorSpace;
    sharedTactileStripMaterial = new THREE.MeshStandardMaterial({
      map: tTex,
      bumpMap: tTex,
      bumpScale: 0.008,
      roughness: 0.94,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -4
    });
  }

  if (!sharedGutterMaterial) {
    sharedGutterMaterial = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
  }

  const sideSign = Math.sign(z) || 1;

  // 1. Khối đá bó vỉa chính cao 21cm + gờ vát cạnh trên (Beveled Curb Lip) tạo chiều sâu 3D rõ nét
  const curbBody = new THREE.Mesh(new THREE.BoxGeometry(totalLen, 0.21, 0.34, 76, 1, 1), sharedCurbMaterial);
  for(let i=0;i<curbBody.geometry.attributes.uv.count;i++)curbBody.geometry.attributes.uv.setX(i,curbBody.geometry.attributes.uv.getX(i)*totalLen/3.2);
  curbBody.position.set(cx, 0.105, z);
  curbBody.castShadow = false;
  curbBody.receiveShadow = true;
  worldGroup.add(curbBody);

  // 2. Rãnh bê tông thoát nước mép đường nhựa (Roadside Concrete Gutter)
  const gutter = new THREE.Mesh(new THREE.BoxGeometry(totalLen, 0.032, 0.38, 76, 1, 1), sharedGutterMaterial);
  gutter.position.set(cx, 0.016, z - sideSign * 0.32);
  gutter.receiveShadow = true;
  worldGroup.add(gutter);

  // 3. Dải gạch vàng gân nổi 3D dẫn hướng người đi bộ dọc vỉa hè (Chia 76 đoạn + nâng độ cao 0.196m chống Z-fighting tuyệt đối)
  const tactileStrip = new THREE.Mesh(new THREE.BoxGeometry(totalLen, 0.032, 0.44, 76, 1, 1), sharedTactileStripMaterial);
  for(let i=0;i<tactileStrip.geometry.attributes.uv.count;i++)tactileStrip.geometry.attributes.uv.setX(i,tactileStrip.geometry.attributes.uv.getX(i)*totalLen/.42);
  tactileStrip.position.set(cx, 0.196, z + sideSign * 1.18);
  tactileStrip.receiveShadow = true;
  worldGroup.add(tactileStrip);
}

function buildTHPTTayHoCampus() {
  buildStreetViewAccurateSchoolCorner();
  return;

  const thpt = new THREE.Group();
  thpt.position.set(-4, 0, 14.5);
  thpt.rotation.y = Math.PI;
  worldGroup.add(thpt);

  const creamStucco = new THREE.MeshStandardMaterial({ color: 0xf2d9a6, roughness: 0.65 });
  const blueIronMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.65, roughness: 0.3 });

  const campusCourt = new THREE.Mesh(
    new THREE.BoxGeometry(115, 0.14, 75),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 })
  );
  campusCourt.position.set(22, 0.07, -30);
  campusCourt.receiveShadow = true;
  thpt.add(campusCourt);

  const courtSurface = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 15).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.75 })
  );
  courtSurface.position.set(16, 0.16, -24);
  thpt.add(courtSurface);

  const guardHouse = new THREE.Mesh(new RoundedBoxGeometry(5.6, 3.2, 4.4, 2, 0.04), creamStucco);
  guardHouse.position.set(7.2, 1.6, 0.6);
  guardHouse.castShadow = true;
  thpt.add(guardHouse);
  // Tọa độ thế giới của Bốt bảo vệ THPT Tây Hồ (do thpt tại (-4, 14.5) xoay PI): (-4 - 7.2, 14.5 - 0.6) = (-11.2, 13.9)
  addBoxCollider(-11.2, 13.9, 5.8, 4.6);

  const guardRoof = createHipRoofMesh(5.8, 4.6, 1.35, roofMatGreen);
  guardRoof.position.set(7.2, 3.2, 0.6);
  thpt.add(guardRoof);

  [-3.4, 3.4].forEach((gx) => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.6, 1.05), new THREE.MeshStandardMaterial({ color: 0x991b1b }));
    base.position.set(gx, 0.3, 0.6);
    thpt.add(base);

    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.88, 3.2, 0.88), creamStucco);
    shaft.position.set(gx, 2.2, 0.6);
    shaft.castShadow = true;
    thpt.add(shaft);

    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.65, 0.88), blueIronMat);
    lantern.position.set(gx, 4.15, 0.6);
    thpt.add(lantern);
  });

  // Cổng sắt xanh trường THPT Tây Hồ + Tường cổng bên phải
  addBoxCollider(-4.0, 13.9, 7.8, 1.1);
  addBoxCollider(5.4, 13.9, 12.2, 0.8);

  for (let bx = -2.8; bx <= 2.8; bx += 0.24) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.65, 6), blueIronMat);
    bar.position.set(bx, 1.5, 0.6);
    thpt.add(bar);
  }

  const rightWallBase = new THREE.Mesh(new THREE.BoxGeometry(12, 1.4, 0.38), creamStucco);
  rightWallBase.position.set(-9.4, 0.7, 0.6);
  thpt.add(rightWallBase);

  const redBanner = new THREE.Mesh(
    new THREE.PlaneGeometry(5.8, 1.05),
    new THREE.MeshBasicMaterial({
      map: makeBannerTexture('MỪNG ĐẢNG QUANG VINH - MỪNG XUÂN ĐẤT NƯỚC', 'TRƯỜNG THPT TÂY HỒ - 41 PHỐ PHÚ THƯỢNG')
    })
  );
  redBanner.position.set(-6.8, 2.55, 0.82);
  thpt.add(redBanner);

  buildDetailedSchoolBlock(thpt, -10, -9.5, 25, 11.6, 10.5);
  buildDetailedSchoolBlock(thpt, 28, -14.0, 28, 11.6, 10.5);
  buildDetailedSchoolBlock(thpt, 8, -42.0, 34, 12.0, 11.0);
  // Khối va chạm 3 dãy nhà học trường THPT Tây Hồ
  addBoxCollider(6.0, 24.0, 25.4, 10.8);
  addBoxCollider(-32.0, 28.5, 28.4, 10.8);
  addBoxCollider(-12.0, 56.5, 34.4, 11.4);

  createLeafyHanoiTree(12, 22, 9.5, 4.2);
  createLeafyHanoiTree(-18, 25, 10.0, 4.5);
  createLeafyHanoiTree(-38, 22, 9.8, 4.4);

  createDetailedCar(4.2, 9.6, -0.12, 0x64748b, false);
  createDetailedCar(-0.5, 10.3, 0.22, 0x475569, false);
  createDetailedCar(-10.5, 10.3, -0.08, 0xe2e8f0, false);
  createDetailedCar(-15.5, 9.4, -0.24, 0x94a3b8, true);

  const wallWest = new THREE.Mesh(new THREE.BoxGeometry(115, 2.8, 0.44), agedYellowWallMat);
  wallWest.position.set(-76, 1.4, 11.8);
  wallWest.castShadow = true;
  wallWest.receiveShadow = true;
  worldGroup.add(wallWest);
  addBoxCollider(-76, 11.8, 115.4, 0.9);

  const wallEast = new THREE.Mesh(new THREE.BoxGeometry(28, 2.8, 0.44), agedYellowWallMat);
  wallEast.position.set(24, 1.4, 11.8);
  wallEast.castShadow = true;
  wallEast.receiveShadow = true;
  worldGroup.add(wallEast);
  addBoxCollider(24, 11.8, 28.4, 0.9);

  for (let wx = -125; wx <= 36; wx += 5.5) {
    if (wx > -20 && wx < 11) continue;
    const pil = new THREE.Mesh(new THREE.BoxGeometry(0.68, 3.0, 0.68), agedYellowWallMat);
    pil.position.set(wx, 1.5, 11.8);
    pil.castShadow = true;
    worldGroup.add(pil);
  }
}

function buildStreetViewAccurateSchoolCorner() {
  const cream = new THREE.MeshStandardMaterial({ color: 0xd9c7a3, roughness: 0.82 });
  const creamLight = new THREE.MeshStandardMaterial({ color: 0xeee2c7, roughness: 0.8 });
  const weathered = new THREE.MeshStandardMaterial({ color: 0xb9a987, roughness: 0.94 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x59636b, metalness: 0.62, roughness: 0.46 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x7894a1, metalness: 0.18, roughness: 0.25 });
  const asphalt = createDetailedAsphaltMaterial();

  // Street View 41 P. Phú Thượng: đường nhánh hẹp đâm vuông góc vào trục phố chính (UV xoay chuẩn chiều dọc đường).
  const sideRoad = new THREE.Mesh(worldUVs(new THREE.PlaneGeometry(42.6, 8.6, 18, 2).rotateZ(Math.PI / 2),3), asphalt);
  sideRoad.rotation.x = -Math.PI / 2;
  sideRoad.position.set(-15, 0.08, 33.7);
  sideRoad.receiveShadow = true;
  worldGroup.add(sideRoad);

  const sideWalkMat = visualMaterials.concrete();
  [-20.1, -9.9].forEach((x) => {
    const walk = new THREE.Mesh(worldUVs(new THREE.BoxGeometry(1.7, 0.15, 42.6),3), sideWalkMat);
    walk.position.set(x, 0.075, 33.7);
    walk.receiveShadow = true;
    worldGroup.add(walk);
  });

  const campus = new THREE.Group();
  worldGroup.add(campus);

  // Khối lớp học màu vàng kem 4 tầng và cánh nhà chạy sâu vào phố.
  const mainBlock = new THREE.Mesh(new THREE.BoxGeometry(27, 14.6, 12.8), cream);
  mainBlock.position.set(9.5, 7.3, 20.3);
  mainBlock.castShadow = true;
  mainBlock.receiveShadow = true;
  campus.add(mainBlock);
  addBoxCollider(9.5, 20.3, 27.3, 13.1);

  const rearWing = new THREE.Mesh(new THREE.BoxGeometry(12.5, 12.8, 28), cream);
  rearWing.position.set(21.7, 6.4, 39.5);
  rearWing.castShadow = true;
  campus.add(rearWing);
  addBoxCollider(21.7, 39.5, 12.8, 28.4);

  // Mái ngói đỏ dốc truyền thống Việt Nam cho cả khối nhà chính và cánh nhà sau (thay vì mái hộp phẳng cứng nhắc)
  const mainSchoolRoof = createHipRoofMesh(27.8, 13.6, 3.1, roofMatRed);
  mainSchoolRoof.position.set(9.5, 14.6, 20.3);
  campus.add(mainSchoolRoof);

  const rearWingRoof = createHipRoofMesh(13.2, 28.8, 2.7, roofMatRed);
  rearWingRoof.position.set(21.7, 12.8, 39.5);
  campus.add(rearWingRoof);

  // Hệ cột trụ nổi 3D (pilasters) phân chia các nhịp mặt đứng trường học tạo chiều sâu kiến trúc
  for (let col = 0; col <= 7; col++) {
    const pilX = -3.75 + col * 3.75;
    const pilaster = new THREE.Mesh(new RoundedBoxGeometry(0.46, 14.6, 0.42, 2, 0.04), creamLight);
    pilaster.position.set(pilX, 7.3, 13.86);
    pilaster.castShadow = true;
    campus.add(pilaster);
  }

  // Các hàng cửa sổ, mái hắt che nắng 3D, gờ tầng và điều hòa ở mặt đứng trường THPT Tây Hồ
  [3.0, 6.25, 9.5, 12.7].forEach((y, floor) => {
    const band = new THREE.Mesh(new RoundedBoxGeometry(27.6, 0.26, 0.52, 2, 0.04), creamLight);
    band.position.set(9.5, y - 1.35, 13.85);
    campus.add(band);
    for (let col = 0; col < 7; col++) {
      const wx = -1.9 + col * 3.75;
      const windowFrame = new THREE.Mesh(new RoundedBoxGeometry(2.15, 1.7, 0.18, 2, 0.03), iron);
      windowFrame.position.set(wx, y, 13.82);
      campus.add(windowFrame);
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.86, 1.42), glass);
      pane.position.set(wx, y, 13.93);
      campus.add(pane);
      // Mái hắt che mưa nắng nhô ra phía trên mỗi ô cửa sổ
      const canopyBrow = new THREE.Mesh(new RoundedBoxGeometry(2.35, 0.12, 0.48, 2, 0.02), roofMatRed);
      canopyBrow.position.set(wx, y + 0.94, 13.98);
      canopyBrow.rotation.x = 0.14;
      campus.add(canopyBrow);
      if (floor > 0 && col % 3 === 2) {
        const ac = new THREE.Mesh(new RoundedBoxGeometry(0.85, 0.5, 0.38, 2, 0.04), creamLight);
        ac.position.set(-0.55 + col * 3.75, y - 0.65, 14.08);
        campus.add(ac);
      }
    }
  });

  // Tháp cầu thang cong lộ thiên có mái vòm chóp nón là chi tiết nhận diện nổi bật của số 41
  const stairCore = new THREE.Mesh(new CylinderGeometryOrRoundedTower(), creamLight);
  function CylinderGeometryOrRoundedTower() {
    return new THREE.CylinderGeometry(2.45, 2.45, 14.8, 24);
  }
  stairCore.position.set(-4.5, 7.4, 19.8);
  stairCore.castShadow = true;
  campus.add(stairCore);
  const stairRoof = new THREE.Mesh(new THREE.ConeGeometry(2.85, 2.2, 24), roofMatRed);
  stairRoof.position.set(-4.5, 15.9, 19.8);
  campus.add(stairRoof);
  addBoxCollider(-5.0, 20.0, 4.2, 7.5);

  // Khôi phục dãy tường vàng cổ kính phía Tây + hàng trụ cổng + ô tô đỗ dọc vỉa hè trường học
  // The existing street wall must leave the new shop frontage open too.
  for(const [left,right] of ARCADE_APPROACH_WALLS){
    const wallWest = new THREE.Mesh(new THREE.BoxGeometry(right-left,2.5,.42),agedYellowWallMat);
    wallWest.position.set((left+right)/2,1.25,11.8);wallWest.castShadow=true;wallWest.receiveShadow=true;worldGroup.add(wallWest);
    addBoxCollider((left+right)/2,11.8,right-left,.85);
  }

  for (let wx = -122; wx <= -22; wx += 5.5) {
    if(Math.abs(wx-ARCADE_SHOP.x)<ARCADE_SHOP.width/2+.5)continue;
    const pil = new THREE.Mesh(new RoundedBoxGeometry(0.68, 2.85, 0.68, 2, 0.04), agedYellowWallMat);
    pil.position.set(wx, 1.42, 11.8);
    pil.castShadow = true;
    worldGroup.add(pil);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.32, 4).rotateY(Math.PI / 4), roofMatRed);
    cap.position.set(wx, 2.98, 11.8);
    worldGroup.add(cap);
  }

  createDetailedCar(4.2, 9.6, -0.12, 0x64748b, false);
  createDetailedCar(-0.5, 10.3, 0.22, 0x475569, false);
  createDetailedCar(-10.5, 10.3, -0.08, 0xe2e8f0, false);
  createDetailedCar(-24.5, 9.5, -0.05, 0x94a3b8, true);
  [2.8, 5.9, 9.0, 12.1].forEach((y, index) => {
    const landing = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.25, 0.24, 24, 1, false, 0, Math.PI), creamLight);
    landing.position.set(-3.85, y, 18.9 + (index % 2) * 2.8);
    landing.rotation.y = index % 2 ? Math.PI : 0;
    campus.add(landing);
    const rail = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.055, 8, 28, Math.PI), iron);
    rail.position.copy(landing.position);
    rail.position.y += 0.82;
    rail.rotation.x = Math.PI / 2;
    rail.rotation.z = index % 2 ? Math.PI : 0;
    campus.add(rail);
  });

  // Tường thấp, hàng rào sắt và cổng trường mở ra vỉa hè rộng 3–4 m.
  const wallSegments = [
    { x: 9.5, w: 13.5 },
    { x: 26.7, w: 18.8 }
  ];
  wallSegments.forEach(({ x, w }) => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(w, 1.0, 0.46), weathered);
    base.position.set(x, 0.5, 11.9);
    base.castShadow = true;
    campus.add(base);
    addBoxCollider(x, 11.9, w, 0.72);
    for(const y of [1.08,2.55]){const rail=new THREE.Mesh(new THREE.BoxGeometry(w,.07,.09),iron);rail.position.set(x,y,11.9);campus.add(rail);}
    for (let bx = x - w / 2 + 0.25; bx < x + w / 2; bx += 0.42) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.65, 6), iron);
      bar.position.set(bx, 1.75, 11.9);
      campus.add(bar);
    }
  });
  const cornerPost=new THREE.Mesh(new RoundedBoxGeometry(.44,2.7,.6,2,.03),creamLight);
  cornerPost.position.set(36.1,1.35,11.9);campus.add(cornerPost);addBoxCollider(36.1,11.9,.5,.65);
  [-0.1, 2.7].forEach((x) => {
    const gatePost = new THREE.Mesh(new RoundedBoxGeometry(0.65, 3.0, 0.75, 2, 0.04), creamLight);
    gatePost.position.set(x, 1.5, 11.9);
    campus.add(gatePost);
    addBoxCollider(x, 11.9, 0.8, 0.85);
  });
  const schoolSign = createNPCLabel('TRƯỜNG THPT TÂY HỒ · SỐ 41', '#2563eb');
  schoolSign.position.set(1.3, 3.35, 11.72);
  schoolSign.scale.set(4.3, 1.05, 1);
  campus.add(schoolSign);

  const mural = new THREE.Mesh(
    new THREE.PlaneGeometry(10.5, 2.0),
    new THREE.MeshBasicMaterial({ map: makeBannerTexture('CHÀO MỪNG NĂM HỌC MỚI', 'TRƯỜNG THPT TÂY HỒ · PHÚ THƯỢNG') })
  );
  mural.position.set(29.5, 1.75, 11.65);
  campus.add(mural);

  // Góc phố thực tế: cột điện dày dây, ghế nhựa, hàng rong và xe dựng sát tường.
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.25, 9.8, 10), iron);
  pole.position.set(-8.8, 4.9, 7.0);
  pole.castShadow = true;
  campus.add(pole);
  addCircleCollider(-8.8, 7.0, 0.34);
  const wirePoints = [
    new THREE.Vector3(-8.8, 9.0, 7.0),
    new THREE.Vector3(18, 8.4, 8.0),
    new THREE.Vector3(44, 8.8, 7.0)
  ];
  const wireCurve = new THREE.CatmullRomCurve3(wirePoints);
  for (let i = 0; i < 5; i++) {
    const geo = new THREE.BufferGeometry().setFromPoints(wireCurve.getPoints(40).map((p) => p.clone().add(new THREE.Vector3(0, i * 0.16, i * 0.08))));
    campus.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x20242a })));
  }

  const stoolMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.55 });
  [-7.2, -5.8, -4.35].forEach((x, index) => {
    const stool = createStool(0.42, 0.42, 0.42, stoolMat);
    stool.position.set(x, 0.3, 8.8 + (index % 2) * 0.5);
    stool.castShadow = true;
    campus.add(stool);
    addCircleCollider(x, stool.position.z, 0.3);
  });

  const bikeColors = [0x334155, 0x9f1239, 0x1d4ed8, 0xf8fafc, 0x111827, 0x64748b];
  for (let i = 0; i < 10; i++) {
    const bike = createDetailedMotorbike(-8.0, 15.0 + i * 1.65, 0.08 + (i % 2) * 0.14, bikeColors[i % bikeColors.length], campus);
    bike.scale.setScalar(0.86);
  }
  addBoxCollider(-8.0, 22.5, 2.2, 17.5);

  [-1.5, 10.5, 28, 39].forEach((x, index) => {
    createLeafyHanoiTree(x, 10.8 + (index % 2) * 4.4, 8.4 + index * 0.35, 3.5);
  });
}

function buildDetailedSchoolBlock(parent, x, z, width, height, depth) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  parent.add(g);

  const sideMat = new THREE.MeshStandardMaterial({ color: 0xecd39d, roughness: 0.7 });
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    [sideMat, sideMat, sideMat, sideMat, schoolFacadeMat, schoolFacadeMat]
  );
  body.position.y = height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const roof = createHipRoofMesh(width, depth, 2.8, roofMatRed);
  roof.position.y = height;
  g.add(roof);
}

function buildUBNDPhuThuongCampus() {
  const ubnd = new THREE.Group();
  ubnd.position.set(0, 0, -21.5);
  worldGroup.add(ubnd);

  const realUBNDFacadeTex = createCroppedPhotoTexture('assets/ubnd_phu_thuong.jpg', 0.14, 0.21, 0.66, 0.44);
  const realUBNDFacadeMat = new THREE.MeshStandardMaterial({
    map: realUBNDFacadeTex,
    roughness: 0.55
  });
  const creamSideMat = new THREE.MeshStandardMaterial({ color: 0xedd59e, roughness: 0.68 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });

  const courtyard = new THREE.Mesh(
    new THREE.BoxGeometry(52, 0.14, 23.6),
    new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 })
  );
  courtyard.position.set(0, 0.07, -3.2);
  courtyard.receiveShadow = true;
  ubnd.add(courtyard);

  const width = 28;
  const height = 12.0;
  const depth = 11.2;
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    [creamSideMat, creamSideMat, creamSideMat, creamSideMat, realUBNDFacadeMat, schoolFacadeMat]
  );
  body.position.y = height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  ubnd.add(body);
  // Khối va chạm tòa nhà UBND Phường Phú Thượng
  addBoxCollider(0, -21.5, width + 0.4, depth + 0.4);

  const pedShape = new THREE.Shape();
  pedShape.moveTo(-4.6, 0);
  pedShape.lineTo(4.6, 0);
  pedShape.lineTo(0, 2.5);
  pedShape.closePath();
  const ped = new THREE.Mesh(
    new THREE.ExtrudeGeometry(pedShape, { depth: 0.8, bevelEnabled: false }),
    whiteMat
  );
  ped.position.set(0, height - 0.1, depth / 2 - 0.2);
  ubnd.add(ped);

  const emblem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.62, 0.22, 20),
    new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.75, roughness: 0.25 })
  );
  emblem.rotation.x = Math.PI / 2;
  emblem.position.set(0, height + 0.9, depth / 2 + 0.65);
  ubnd.add(emblem);

  const roof = createHipRoofMesh(width, depth, 3.0, roofMatRed);
  roof.position.y = height;
  ubnd.add(roof);

  const fenceZ = 13.8;
  const leftPanoTex = createCroppedPhotoTexture('assets/ubnd_phu_thuong.jpg', 0.01, 0.57, 0.36, 0.13);
  const rightPanoTex = createCroppedPhotoTexture('assets/ubnd_phu_thuong.jpg', 0.58, 0.57, 0.38, 0.13);

  const leftMural = new THREE.Mesh(
    new THREE.BoxGeometry(10.5, 2.25, 0.32),
    new THREE.MeshStandardMaterial({ map: leftPanoTex, roughness: 0.55 })
  );
  leftMural.position.set(-9.2, 1.12, fenceZ);
  leftMural.castShadow = true;
  ubnd.add(leftMural);
  addBoxCollider(-9.2, -7.7, 10.8, 0.8);

  const rightMural = new THREE.Mesh(
    new THREE.BoxGeometry(10.5, 2.25, 0.32),
    new THREE.MeshStandardMaterial({ map: rightPanoTex, roughness: 0.55 })
  );
  rightMural.position.set(9.2, 1.12, fenceZ);
  rightMural.castShadow = true;
  ubnd.add(rightMural);
  addBoxCollider(9.2, -7.7, 10.8, 0.8);

  [-3.8, -2.2, 2.2, 3.8].forEach((gx) => {
    const pil = new THREE.Mesh(new THREE.BoxGeometry(0.68, 2.85, 0.68), whiteMat);
    pil.position.set(gx, 1.42, fenceZ);
    pil.castShadow = true;
    ubnd.add(pil);
    addBoxCollider(gx, -7.7, 0.85, 0.85);
  });

  [-1.8, 0.4].forEach((fx) => {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.09, 10.8, 12),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.9, roughness: 0.15 })
    );
    pole.position.set(fx, 5.4, 10.2);
    ubnd.add(pole);

    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(1.85, 1.15, 8, 4),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, side: THREE.DoubleSide })
    );
    flag.position.set(fx + 0.92, 9.8, 10.2);
    ubnd.add(flag);
    animatedFlags.push(flag);
  });

  createLeafyHanoiTree(-3.4, -6.2, 10.2, 4.4);
  createLeafyHanoiTree(3.6, -6.2, 10.5, 4.6);
  createPoinsettiaPlanter(-8.6, -5.8);
  createPoinsettiaPlanter(8.6, -5.8);
}


function createLeafyHanoiTree(x, z, height, radius) {
  const tree = createStreetTree(height, radius, barkMat);
  tree.position.set(x, 0.18, z); worldGroup.add(tree);
  addCircleCollider(x, z, 0.55);
}

const houseNumberSprites = [];

function createVietnameseAddressPlate(mainText, subText = 'PHỐ PHÚ THƯỢNG - TÂY HỒ', isHighlighted = false) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 192;
  const ctx = c.getContext('2d');

  ctx.fillStyle = isHighlighted ? '#1e3a8a' : '#1d4ed8';
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 172, 22);
  ctx.fill();

  ctx.strokeStyle = isHighlighted ? '#fde047' : '#ffffff';
  ctx.lineWidth = isHighlighted ? 8 : 6;
  ctx.beginPath();
  ctx.roundRect(20, 20, 472, 152, 16);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 54px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(mainText, 256, 82);

  ctx.fillStyle = isHighlighted ? '#fde047' : '#dbeafe';
  ctx.font = 'bold 24px "Segoe UI", sans-serif';
  ctx.fillText(subText, 256, 140);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(isHighlighted ? 1.55 : 1.25, isHighlighted ? 0.58 : 0.46), mat);
  houseNumberSprites.push(plate);
  return plate;
}

function createIronRailingGrilleMaterial() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 256, 128);
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(0, 0, 256, 10);
  ctx.fillRect(0, 118, 256, 10);
  for (let x = 8; x < 256; x += 24) {
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(x, 6, 7, 116);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(x + 1, 56, 5, 16);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(3, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({
    map: tex,
    alphaTest: 0.45,
    side: THREE.DoubleSide,
    metalness: 0.72,
    roughness: 0.34
  });
}

// Bộ vật liệu dùng chung cho chi tiết kiến trúc 3D Nhà phố Hà Nội (ban công, lan can, cửa chớp, hoa giấy, phào chỉ)
const archMaterials = {
  concreteSlab: visualMaterials.plaster(0xb2b0a0),
  creamMolding: new THREE.MeshStandardMaterial({ color: 0xbab3a0, roughness: .9 }),
  granitePillar: new THREE.MeshStandardMaterial({ color: 0x3b403b, metalness: .05, roughness: .7 }),
  ironRailing: new THREE.MeshStandardMaterial({ color: 0x424944, metalness: .55, roughness: .55 }),
  railingGrille: createIronRailingGrilleMaterial(),
  brassTrim: new THREE.MeshStandardMaterial({ color: 0x80704d, metalness: .55, roughness: .55 }),
  woodShutter: visualMaterials.wood,
  greenShutter: new THREE.MeshStandardMaterial({ color: 0x4f6057, roughness: .8 }),
  glassDoor: new THREE.MeshStandardMaterial({ color: 0x263c40, metalness: .12, roughness: .18, envMapIntensity: .5 }),
  foliageGreen: new THREE.MeshStandardMaterial({ color: 0x3f533c, roughness: 1 }),
  bougainvilleaPink: new THREE.MeshStandardMaterial({ color: 0x985e72, roughness: .9 }),
  bougainvilleaOrange: new THREE.MeshStandardMaterial({ color: 0xad7d55, roughness: .9 }),
  terracottaPot: new THREE.MeshStandardMaterial({ color: 0x88674e, roughness: .9 })
};

// Bộ hình học dùng chung (Shared Geometries) cho chi tiết 3D nhà phố giúp tiết kiệm bộ nhớ GPU & cắt giảm ~1.700 draw calls!
const sharedArchGeos = {
  archPane: archedWindowGeometry(),
  archFrame: archedWindowGeometry(true),
  canopy: shopCanopyGeometry(),
  corbel: new RoundedBoxGeometry(0.22, 0.36, 0.82, 2, 0.03),
  shutterLeaf: new RoundedBoxGeometry(0.46, 1.95, 0.06, 2, 0.01),
  acBox: new RoundedBoxGeometry(0.78, 0.52, 0.34, 2, 0.03),
  bush: foliageGeometry(.38),
  blossom: flowerGeometry(.28)
};

// Hàm gắn chi tiết kiến trúc 3D thực tế (Ban công nhô, lan can sắt, giàn hoa giấy, cửa chớp gỗ, phào chỉ, lam sân thượng)
// đã được tối ưu hóa số lượng Mesh để vừa có chiều sâu 3D chân thực, vừa giữ tốc độ 60 FPS mượt mà không khựng!
function decorateHanoiBuilding3D(parent, cx, cz, w, h, d, floors, facingDir = 'south', styleIdx = 0) {
  const details = new THREE.Group();
  details.userData.staticBatch=true;
  details.userData.permanentArchitecture=true;
  details.position.set(cx, 0, cz);
  if (facingDir === 'north') details.rotation.y = Math.PI;
  else if (facingDir === 'east') details.rotation.y = Math.PI / 2;
  else if (facingDir === 'west') details.rotation.y = -Math.PI / 2;
  parent.add(details);

  const frontZ = (facingDir === 'east' || facingDir === 'west') ? w / 2 : d / 2;
  const faceWidth = (facingDir === 'east' || facingDir === 'west') ? d : w;
  const floorH = h / floors;

  // 1. Hai cột trụ ốp đá Granite đen bóng + Hộp kỹ thuật cửa cuốn nổi 3D ở tầng 1
  const colGeo = new RoundedBoxGeometry(0.52, floorH + 0.15, 0.42, 2, 0.03);
  [-faceWidth / 2 + 0.28, faceWidth / 2 - 0.28].forEach((px) => {
    const col = new THREE.Mesh(colGeo, archMaterials.granitePillar);
    col.position.set(px, floorH / 2, frontZ + 0.14);
    details.add(col);
  });

  const shutterHood = new THREE.Mesh(
    sharedArchGeos.canopy,
    archMaterials.concreteSlab
  );
  shutterHood.scale.set(faceWidth-.7,1,.95);
  shutterHood.position.set(0, floorH - 0.12, frontZ + .48);
  details.add(shutterHood);

  // 2. Ban công đúc 3D nhô ra ở các tầng lầu (Tầng 2, 3, 4) kèm lan can sắt mỹ thuật, cửa sổ chớp gỗ & giàn hoa giấy
  for (let f = 1; f < floors; f++) {
    const yBase = f * floorH;
    const balDepth = 1.08;
    const balWidth = faceWidth * (f === 1 ? 0.86 : 0.78);

    // Sàn ban công nhô ra + phào chỉ đỡ bên dưới
    const slab = new THREE.Mesh(
      new RoundedBoxGeometry(balWidth, 0.22, balDepth, 2, 0.03),
      archMaterials.creamMolding
    );
    slab.position.set(0, yBase, frontZ + balDepth / 2 - 0.05);
    details.add(slab);

    // Đôi con sơn đỡ ban công (Corbels)
    [-balWidth * 0.36, balWidth * 0.36].forEach((bx) => {
      const corbel = new THREE.Mesh(sharedArchGeos.corbel, archMaterials.creamMolding);
      corbel.position.set(bx, yBase - 0.24, frontZ + balDepth * 0.32);
      details.add(corbel);
    });

    // Lan can sắt mỹ thuật gộp thành 1 tấm Grille 3D + 1 tay vịn trên (Cắt giảm 18 draw calls mỗi tầng!)
    const railH = 0.92;
    const railZ = frontZ + balDepth - 0.12;
    const topRail = new THREE.Mesh(
      new THREE.BoxGeometry(balWidth + 0.06, 0.065, 0.065),
      styleIdx % 2 === 0 ? archMaterials.ironRailing : archMaterials.brassTrim
    );
    topRail.position.set(0, yBase + railH, railZ);
    details.add(topRail);

    const railPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(balWidth, railH - 0.06),
      archMaterials.railingGrille
    );
    railPanel.position.set(0, yBase + railH / 2 + 0.05, railZ);
    details.add(railPanel);

    // Cửa ban công 3D kết hợp 2 cánh cửa chớp gỗ mở hé hai bên
    const doorW = Math.min(2.1, balWidth * 0.45);
    const doorH = floorH * 0.68;
    const doorFrame = new THREE.Mesh(
      sharedArchGeos.archPane,
      archMaterials.glassDoor
    );
    doorFrame.scale.set(doorW,doorH,1);
    doorFrame.position.set(0, yBase + doorH / 2 + 0.1, frontZ + 0.06);
    const archFrame=new THREE.Mesh(sharedArchGeos.archFrame,archMaterials.creamMolding);
    archFrame.scale.set(doorW*1.14,doorH*1.12,1);archFrame.position.copy(doorFrame.position);archFrame.position.z+=.02;details.add(archFrame);
    details.add(doorFrame);

    const shutterMat = (styleIdx + f) % 2 === 0 ? archMaterials.greenShutter : archMaterials.woodShutter;
    [-1, 1].forEach((side) => {
      const leaf = new THREE.Mesh(sharedArchGeos.shutterLeaf, shutterMat);
      leaf.position.set(side * (doorW / 2 + 0.22), yBase + doorH / 2 + 0.1, frontZ + 0.14);
      leaf.rotation.y = -side * 0.35;
      details.add(leaf);
    });

    // Bồn cây xanh & giàn hoa giấy rủ xuống mép ban công Hà Nội (Tối ưu thành 2 cụm hoa lớn)
    if ((styleIdx + f) % 2 === 0) {
      const bush = new THREE.Mesh(sharedArchGeos.bush, archMaterials.foliageGreen);
      bush.scale.set(1.85, 0.92, 0.92);
      bush.position.set(balWidth * 0.2, yBase + 0.45, railZ - 0.08);
      details.add(bush);

      const flowerMat = styleIdx % 3 === 0 ? archMaterials.bougainvilleaPink : archMaterials.bougainvilleaOrange;
      [-0.22, 0.26].forEach((offsetX, flIdx) => {
        const blossom = new THREE.Mesh(sharedArchGeos.blossom, flowerMat);
        blossom.scale.set(1.45, 0.95, 1.1);
        blossom.position.set(
          balWidth * 0.2 + offsetX,
          yBase + 0.34 - flIdx * 0.14,
          railZ + 0.06
        );
        details.add(blossom);
      });
    }

    // Cục nóng điều hòa gắn tường cạnh ban công
    if (f === 1) {
      const acBox = new THREE.Mesh(sharedArchGeos.acBox, archMaterials.concreteSlab);
      acBox.position.set(-balWidth * 0.34, yBase + floorH * 0.68, frontZ + 0.2);
      details.add(acBox);
    }
  }

  // 3. Tầng thượng: Tường chắn mái & lam bê tông sân thượng tinh gọn
  if (styleIdx % 2 !== 0) {
    const roofParapet = new THREE.Mesh(
      new THREE.BoxGeometry(faceWidth, 0.65, 0.32),
      archMaterials.creamMolding
    );
    roofParapet.position.set(0, h + 0.32, frontZ - 0.1);
    details.add(roofParapet);
  }
}

function buildMemorialAccess(){
  const root=new THREE.Group();root.name='MemorialCourtyard';root.userData.staticBatch=true;
  const stone=new THREE.MeshStandardMaterial({color:0x646a65,roughness:.95});
  const dark=new THREE.MeshStandardMaterial({color:0x363e39,roughness:.8});
  const wall=new THREE.MeshStandardMaterial({color:0xc5bba4,roughness:1});
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(16.5,13).rotateX(-Math.PI/2),visualMaterials.concrete());floor.position.set(-24,.165,-29);floor.receiveShadow=true;root.add(floor);
  const lane=new THREE.Mesh(new THREE.PlaneGeometry(3.8,15.5).rotateX(-Math.PI/2),visualMaterials.concrete());lane.position.set(-20,.165,-14.75);root.add(lane);
  for(const [x,z,w,d]of [[-32.5,-29.5,.3,12.4],[-15.5,-29.5,.3,12.4],[-24,-35.7,17.3,.3]]){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,1.25,d),wall);mesh.position.set(x,.625,z);mesh.castShadow=true;root.add(mesh);addBoxCollider(x,z,w,d);
  }
  for(const x of [-22.35,-17.65]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.18,.23,2.9,12),stone);post.position.set(x,1.45,-9.1);root.add(post);addCircleCollider(x,-9.1,.25);}
  const sign=createVietnameseAddressPlate('LỐI VÀO','KHU TƯỞNG NIỆM · ĐI THẲNG 20 m');sign.scale.set(1.65,1.65,1);sign.position.set(-20,2.85,-9.05);root.add(sign);
  for(const [radius,height,y]of [[1.7,.18,.25],[1.3,.2,.44],[.8,2.4,1.7]]){
    const plinth=new THREE.Mesh(new THREE.CylinderGeometry(radius*.83,radius,height,8),dark);plinth.position.set(-24,y,-33);plinth.castShadow=true;root.add(plinth);
  }
  addCircleCollider(-24,-33,1.75);
  const plaque=createVietnameseAddressPlate('TƯỞNG NIỆM','ĐỜI ĐỜI GHI NHỚ CÁC ANH HÙNG LIỆT SĨ');plaque.position.set(-24,1.7,-32.18);plaque.scale.set(1.3,1.3,1);root.add(plaque);
  worldGroup.add(root);
}

function buildShophousesAndTeaStall() {
  const shopConfigs = [
    { wall: '#f8fafc', title: 'TẠP HÓA PHÚ THƯỢNG', sign: '#1d4ed8' },
    { wall: '#fef3c7', title: 'XÔI PHÚ THƯỢNG GIA TRUYỀN', sign: '#b91c1c' },
    { wall: '#e0f2fe', title: 'NHÀ THUỐC TÂY HỒ', sign: '#047857' },
    { wall: '#f1f5f9', title: 'CÀ PHÊ - GIẢI KHÁT 41', sign: '#92400e' },
    { wall: '#ffedd5', title: 'ĐIỆN DÂN DỤNG & SỬA XE', sign: '#1e40af' }
  ];

  const shopMats = shopConfigs.map((cfg) =>
    createShophouseFacadeMaterial(cfg.wall, cfg.title, cfg.sign)
  );
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 });

  let houseNumberCounter = 31;
  for (let hx = -20; hx >= -115; hx -= 7.8) {
    // Chừa lối mở thông thoáng cho Cổng Ngõ 41 Phú Thượng tại x = -67
    if (Math.abs(hx - -67) < 5.2 || blocksMemorialEntrance(hx)) {
      continue;
    }
    const houseNo = houseNumberCounter;
    houseNumberCounter += 2;

    const idx = Math.abs(Math.floor(hx)) % shopMats.length;
    const floors = 3 + (Math.abs(Math.floor(hx)) % 2);
    const h = floors * 3.6;
    const w = 7.45;
    const d = 12.0;

    const sideColors = [0xe2e8f0, 0xfef3c7, 0xdbeafe, 0xf1f5f9, 0xffedd5];
    const sideMat = new THREE.MeshStandardMaterial({ color: sideColors[idx % sideColors.length], roughness: 0.78 });
    const house = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      [sideMat, sideMat, sideMat, sideMat, shopMats[idx], shopMats[idx]]
    );
    house.position.set(hx, h / 2, -16.0);
    house.castShadow = true;
    house.receiveShadow = true;
    worldGroup.add(house);
    addBoxCollider(hx, -16.0, w + 0.2, d + 0.2);

    // Gắn kiến trúc 3D nổi (ban công, lan can sắt, cửa chớp gỗ, hoa giấy, giàn lam sân thượng)
    decorateHanoiBuilding3D(worldGroup, hx, -16.0, w, h, d, floors, 'south', idx);

    // Gắn biển số nhà chuẩn Hà Nội ở mặt tiền phố Phú Thượng
    const frontPlate = createVietnameseAddressPlate(`SỐ ${houseNo}`, 'PHỐ PHÚ THƯỢNG');
    frontPlate.position.set(hx + w * 0.28, 2.85, -9.62);
    worldGroup.add(frontPlate);

    if (idx % 2 === 0) {
      const roof = createHipRoofMesh(w + 0.4, d + 0.4, 2.1, roofMatRed);
      roof.position.set(hx, h, -16.0);
      worldGroup.add(roof);
    } else {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 1.9, 14), metalMat);
      tank.rotation.z = Math.PI / 2;
      tank.position.set(hx + 1.2, h + 0.85, -17.0);
      tank.castShadow = true;
      worldGroup.add(tank);
    }

    if (hx <= -34) {
      const awningColors = [0x1d4ed8, 0xb91c1c, 0x047857, 0xd97706];
      const awning = new THREE.Mesh(
        new RoundedBoxGeometry(w - 0.2, 0.14, 2.4, 2, 0.03),
        new THREE.MeshStandardMaterial({ color: awningColors[idx % awningColors.length], roughness: 0.55 })
      );
      awning.position.set(hx, 3.32, -8.9);
      awning.rotation.x = 0.22;
      awning.castShadow = true;
      worldGroup.add(awning);
    }
  }

  buildMemorialAccess();
  buildDetailedTeaStall(-54, -6.8);
  buildShipperGarageStation(18.5, -7.2);
  buildExpandedWorldZones();

  for (let tx = -115; tx <= 34; tx += 10.5) {
    if (tx < -18 || tx > 8) {
      createLeafyHanoiTree(tx, 6.6, 9.4 + (Math.abs(tx) % 2.5), 4.2);
    }
    if (tx < -22) {
      createLeafyHanoiTree(tx, -6.2, 9.0 + (Math.abs(tx) % 2.5), 4.0);
    }
  }

  [-48.5, -47.8, -47.1].forEach((bx, idx) => {
    const foam = new THREE.Mesh(
      new RoundedBoxGeometry(0.54, 0.38, 0.42, 2, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 })
    );
    foam.position.set(bx, 0.34, 6.3 + (idx % 2) * 0.35);
    foam.rotation.y = idx * 0.25;
    foam.castShadow = true;
    worldGroup.add(foam);
    addCircleCollider(bx, 6.3 + (idx % 2) * 0.35, 0.35);
  });
}

function buildSurroundingPhuThuongDistrict() {
  buildDetailedSchoolBlock(worldGroup, 26, -15.5, 13, 14.5, 11.5);
  buildDetailedSchoolBlock(worldGroup, 64, 22, 28, 11.8, 11.5);
  buildDetailedSchoolBlock(worldGroup, 64, 42, 26, 11.8, 11.0);
  buildDetailedSchoolBlock(worldGroup, -28, -42, 13, 8.8, 10.5);
  addBoxCollider(26, -15.5, 13.4, 11.8);
  addBoxCollider(64, 22, 28.4, 11.8);
  addBoxCollider(64, 42, 26.4, 11.4);
  addBoxCollider(-28, -42, 13.4, 10.8);

  createLeafyHanoiTree(-18, -36, 9.5, 4.0);
  createLeafyHanoiTree(-38, -36, 9.5, 4.0);

  const subFacade = createShophouseFacadeMaterial('#fef3c7', 'PHỐ PHÚ GIA - TÂY HỒ', '#0f766e');
  const sideMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8 });

  for (let gx = 56; gx <= 115; gx += 9.5) {
    const h = 10.8 + (gx % 3) * 2.4;
    const floors = Math.max(3, Math.round(h / 3.6));
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(8.6, h, 12),
      [sideMat, sideMat, sideMat, sideMat, subFacade, subFacade]
    );
    b.position.set(gx, h / 2, -16);
    b.castShadow = true;
    worldGroup.add(b);
    addBoxCollider(gx, -16, 9.0, 12.2);

    decorateHanoiBuilding3D(worldGroup, gx, -16, 8.6, h, 12, floors, 'south', Math.floor(gx));

    const r = createHipRoofMesh(9.0, 12.4, 2.2, roofMatRed);
    r.position.set(gx, h, -16);
    worldGroup.add(r);
  }

  for (let gz = -30; gz >= -85; gz -= 10) {
    const h = 10.8 + (Math.abs(gz) % 3) * 2.2;
    const floors = Math.max(3, Math.round(h / 3.6));
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(11, h, 9.0),
      [subFacade, subFacade, sideMat, sideMat, sideMat, sideMat]
    );
    b.position.set(55, h / 2, gz);
    b.castShadow = true;
    worldGroup.add(b);
    addBoxCollider(55, gz, 11.2, 9.4);

    decorateHanoiBuilding3D(worldGroup, 55, gz, 11, h, 9.0, floors, 'west', Math.abs(Math.floor(gz)));

    const r = createHipRoofMesh(11.4, 9.4, 2.1, roofMatRed);
    r.position.set(55, h, gz);
    worldGroup.add(r);
  }

  createStreetSignPost(35, 6.8);
  addCircleCollider(35, 6.8, 0.25);

  const poles = [
    { x: 22, z: -5.8 },
    { x: 35, z: 6.8 },
    { x: -16, z: -5.8 },
    { x: -50, z: -5.8 },
    { x: -84, z: -5.8 }
  ];
  poles.forEach((p) => {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.2, 9.2, 10),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 })
    );
    pole.position.set(p.x, 4.6, p.z);
    pole.castShadow = true;
    worldGroup.add(pole);
    addCircleCollider(p.x, p.z, 0.3);

    const crossbar = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.1, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x475569 })
    );
    crossbar.position.set(p.x, 8.2, p.z);
    worldGroup.add(crossbar);
  });

  connectPowerLines(poles[0], poles[1]);
  connectPowerLines(poles[0], poles[2]);
  connectPowerLines(poles[2], poles[3]);
  connectPowerLines(poles[3], poles[4]);

  spawnStreetTraffic();
  spawnCityBuses();
}

function createStripedAwningMaterial(colorA, colorB) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d');
  const stripeW = 32;
  for (let x = 0; x < 256; x += stripeW) {
    ctx.fillStyle = (x / stripeW) % 2 === 0 ? colorA : colorB;
    ctx.fillRect(x, 0, stripeW, 128);
  }
  // Viền bạt đậm phía trước và nếp gấp vải bạt
  ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
  ctx.fillRect(0, 110, 256, 18);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(2, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.72, side: THREE.DoubleSide });
}

// Hệ thống Vật Thể Tương Tác Thế Giới Mở (Công Viên, Máy Tập, Xích Đu, Bập Bênh, Cầu Trượt, Cờ Tướng, Kiot Kem & Chợ Hoa)
const worldInteractables = [];
const animatedWorldProps = [];
let nearestWorldInteractable = null;
let activePropSession = null;

function registerWorldInteractable(cfg) {
  const ringMat = new THREE.MeshBasicMaterial({
    color: cfg.ringColor || 0x38bdf8,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide
  });
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.58, 24).rotateX(-Math.PI / 2),
    ringMat
  );
  ring.position.set(cfg.x, (cfg.y ?? 0.18) + 0.025, cfg.z);
  worldGroup.add(ring);
  const entry = {
    radius: 2.8,
    ...cfg,
    ring
  };
  worldInteractables.push(entry);
  return entry;
}

function buildExtendedExplorationDistrict() {
  const grassColorMap = loadPbrTex('assets/textures/aerial_grass_rock-color.jpg', 12, 8, true);
  const grassNormalMap = loadPbrTex('assets/textures/aerial_grass_rock-normal.jpg', 12, 8, false);
  const grassRoughMap = loadPbrTex('assets/textures/aerial_grass_rock-roughness.jpg', 12, 8, false);
  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x6ba35c,
    map: grassColorMap,
    normalMap: grassNormalMap,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap: grassRoughMap,
    roughness: 0.94
  });
  const timberMat = visualMaterials.wood;
  const darkWoodMat = barkMat;
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd6c7b2, roughness: 0.88 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.72 });
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.65, roughness: 0.32 });
  const ironFrameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.68, roughness: 0.42 });
  const bucketBlackMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55 });
  const ceramicPotMat = new THREE.MeshStandardMaterial({ color: 0x947263, roughness: 0.9 });
  const bambooBasketMat = new THREE.MeshStandardMaterial({ color: 0xa89572, roughness: 0.92 });
  const foliageRichMat = canopyMidMat;
  const warmBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xfbbf24,
    emissiveIntensity: 2.2
  });
  const redLanternMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.35,
    roughness: 0.45
  });

  const wrapPaperMats = [
    new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.75, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: 0xfce7f3, roughness: 0.75, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.75, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: 0xd6b88e, roughness: 0.82, side: THREE.DoubleSide })
  ];

  const petalPalettes = [
    { main: 0xe11d48, sub: 0xfb7185, center: 0xfef08a }, // Hồng nhung Đà Lạt & Hồng phấn
    { main: 0xfacc15, sub: 0xfde047, center: 0x92400e }, // Cúc vàng đại đóa & Hướng dương
    { main: 0xffffff, sub: 0xfef9c3, center: 0xf59e0b }, // Cúc họa mi trắng Hà Nội
    { main: 0xd946ef, sub: 0xf0abfc, center: 0xfef08a }, // Lan hồ điệp tím & Ly hồng
    { main: 0xf97316, sub: 0xfdba74, center: 0x7c2d12 }, // Đồng tiền cam & Hồng cổ Sapa
    { main: 0x38bdf8, sub: 0xbae6fd, center: 0xe0f2fe }  // Cẩm tú cầu xanh Đà Lạt
  ].map((p) => ({
    mainMat: new THREE.MeshStandardMaterial({ color: p.main, roughness: 0.52 }),
    subMat: new THREE.MeshStandardMaterial({ color: p.sub, roughness: 0.55 }),
    centerMat: new THREE.MeshStandardMaterial({ color: p.center, roughness: 0.65 })
  }));

  // Hàm tạo 1 Xô Hoa Tươi / Bó Hoa Gói Giấy Chân Thực (thay thế hoàn toàn 3 quả cầu xếp chồng cũ!)
  function createRealisticFlowerBucket(paletteIdx, withPaperWrap = true, isTall = false) {
    const vesselMat = paletteIdx % 3 === 0 ? bucketBlackMat : paletteIdx % 3 === 1 ? bambooBasketMat : ceramicPotMat;
    return createMarketBouquet(petalPalettes[paletteIdx % petalPalettes.length], vesselMat, isTall, withPaperWrap ? wrapPaperMats[paletteIdx % wrapPaperMats.length] : null);
  }

  // Hàm tạo Chậu Quất Cảnh Tứ Liên / Đào Thế Nhật Tân trang trí lối vào Chợ Hoa (Tán vòm bonsai tự nhiên, không dùng hình nón giả!)
  function createOrnamentalTreePot(x, z, isKumquat = true) {
    const g = createPottedMarketTree(isKumquat);
    g.position.set(x, 0.18, z); worldGroup.add(g);
    addCircleCollider(x, z, 0.58);
  }

  // ==========================================================================
  // 1. TỔ HỢP CHỢ HOA QUẢNG BÁ - TÂY HỒ (X = 114 .. 158, Z = -12.82 .. -23.58 — khớp khít mép sau northWalk, không chồng lấn!)
  // ==========================================================================
  const marketPlaza = new THREE.Mesh(
    new THREE.BoxGeometry(46, 0.18, 10.76, 16, 1, 4),
    createHerringboneBrickMaterial(16, 4.2, true)
  );
  marketPlaza.position.set(135, 0.09, -18.2);
  marketPlaza.receiveShadow = true;
  worldGroup.add(marketPlaza);

  // Viền đá bó vỉa quanh sân chợ hoa
  const borderCurb = new THREE.Mesh(new THREE.BoxGeometry(46.4, 0.22, 0.35), stoneMat);
  borderCurb.position.set(135, 0.11, -23.4);
  worldGroup.add(borderCurb);

  // CỔNG CHÀO CHỢ HOA ĐÊM QUẢNG BÁ (Tại trung tâm lối vào x = 134.5, z = -7.4)
  const gateGroup = new THREE.Group();
  gateGroup.position.set(134.5, 0.16, -7.4);
  worldGroup.add(gateGroup);

  [-3.3, 3.3].forEach((gx) => {
    const base = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.75, 0.95, 2, 0.04), stoneMat);
    base.position.set(gx, 0.38, 0);
    gateGroup.add(base);

    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 4.8, 14), redMat);
    col.position.set(gx, 2.75, 0);
    col.castShadow = true;
    gateGroup.add(col);

    // Vòng chỉ vàng trang trí cột cổng chào
    [1.2, 3.8, 4.9].forEach((ry) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 8, 18).rotateX(Math.PI / 2), goldTrimMat);
      ring.position.set(gx, ry, 0);
      gateGroup.add(ring);
    });

    addBoxCollider(134.5 + gx, -7.4, 0.95, 0.95);
  });

  // Dầm ngang & Mái ngói cổ 2 tầng trên cổng chào Chợ Hoa
  const archBeam = new THREE.Mesh(new RoundedBoxGeometry(7.8, 0.68, 0.72, 2, 0.04), redMat);
  archBeam.position.set(0, 4.85, 0);
  archBeam.castShadow = true;
  gateGroup.add(archBeam);

  const archRoofLower = createHipRoofMesh(8.8, 2.1, 1.15, roofMatRed);
  archRoofLower.position.set(0, 5.18, 0);
  gateGroup.add(archRoofLower);

  const archRoofUpper = createHipRoofMesh(5.6, 1.7, 0.95, roofMatRed);
  archRoofUpper.position.set(0, 6.05, 0);
  gateGroup.add(archRoofUpper);

  // Hoành phi bảng hiệu Cổng Chợ Hoa Quảng Bá
  const gateBanner = new THREE.Mesh(
    new THREE.PlaneGeometry(5.8, 1.05),
    new THREE.MeshBasicMaterial({
      map: makeBannerTexture('CHỢ HOA ĐÊM QUẢNG BÁ - TÂY HỒ', 'TINH HOA SẮC HOA HÀ NỘI · MỞ CỬA 24/7'),
      side: THREE.DoubleSide
    })
  );
  gateBanner.position.set(0, 4.85, 0.4);
  gateGroup.add(gateBanner);

  // Đèn lồng đỏ treo dưới mái cổng chào Chợ Hoa
  [-2.2, -1.1, 1.1, 2.2].forEach((lx) => {
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), redLanternMat);
    lantern.scale.set(1, 1.28, 1);
    lantern.position.set(lx, 4.25, 0.35);
    gateGroup.add(lantern);
  });

  // Đặt 4 chậu Quất cảnh Tứ Liên & Đào thế Nhật Tân hai bên cổng chào Chợ Hoa
  createOrnamentalTreePot(130.1, -7.2, true);
  createOrnamentalTreePot(138.9, -7.2, true);
  createOrnamentalTreePot(116.5, -7.5, false);
  createOrnamentalTreePot(152.5, -7.5, false);

  // Bộ bạt kẻ sọc truyền thống cho các gian hàng hoa
  const awningMats = [
    createStripedAwningMaterial('#b91c1c', '#fef3c7'),
    createStripedAwningMaterial('#047857', '#f8fafc'),
    createStripedAwningMaterial('#1d4ed8', '#eff6ff'),
    createStripedAwningMaterial('#c2410c', '#fffbeb')
  ];

  const stallConfigs = [
    // Dãy sạp mặt tiền (z = -10.5) — hướng ra đường lớn Phố Phú Thượng
    { x: 121.0, z: -10.5, rotY: 0, sign: 'HỒNG ĐÀ LẠT · HOA LY KÉP', color: '#e11d48', style: 0 },
    { x: 128.4, z: -10.5, rotY: 0, sign: 'CÚC ĐẠI ĐÓA · CÚC HỌA MI', color: '#d97706', style: 1 },
    { x: 140.6, z: -10.5, rotY: 0, sign: 'LAN HỒ ĐIỆP · HƯỚNG DƯƠNG', color: '#9333ea', style: 2 },
    { x: 148.0, z: -10.5, rotY: 0, sign: 'ĐÀO NHẬT TÂN · MAI TRẮNG', color: '#db2777', style: 3 },
    // Dãy sạp nhà lồng phía trong (z = -17.8) — đối diện lối đi bộ giữa chợ
    { x: 121.0, z: -17.8, rotY: 0, sign: 'HOA SEN TÂY HỒ · BÁCH HỢP', color: '#059669', style: 1 },
    { x: 128.4, z: -17.8, rotY: 0, sign: 'TULIP HÀ LAN · CẨM TÚ CẦU', color: '#0284c7', style: 2 },
    { x: 140.6, z: -17.8, rotY: 0, sign: 'HOA CƯỚI & GIỎ HOA NGHỆ THUẬT', color: '#be123c', style: 0 },
    { x: 148.0, z: -17.8, rotY: 0, sign: 'BONSAI & GỐM SỨ BÁT TRÀNG', color: '#b45309', style: 3 }
  ];

  // Hàm dựng 1 Gian Hàng Sạp Hoa 3 Tầng Chân Thực (Kệ bậc thang gỗ, xô hoa, bó hoa gói giấy, mái bạt kẻ sọc & đèn dây)
  stallConfigs.forEach((cfg, stallIdx) => {
    const stall = new THREE.Group();
    stall.position.set(cfg.x, 0.16, cfg.z);
    stall.rotation.y = cfg.rotY;
    stall.userData.staticBatch=true;
    worldGroup.add(stall);

    const stallW = 6.0;
    const stallD = 2.6;

    // 1. Khung kệ gỗ bậc thang 3 tầng (Stepped 3-Tier Display Stand)
    // Open trestles let light through the stand rather than forming solid blocks.
    for (const px of [-2.65,2.65]) for (const pz of [-.8,.8]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,1.06,8),ironFrameMat);
      leg.position.set(px,.53,pz);stall.add(leg);
    }

    const tiers = [
      { y: 0.48, z: 0.72, d: 0.82 },  // Bậc 1 (thấp nhất - phía trước)
      { y: 0.78, z: 0.0, d: 0.82 },   // Bậc 2 (ở giữa)
      { y: 1.08, z: -0.72, d: 0.82 }  // Bậc 3 (cao nhất - phía sau)
    ];

    tiers.forEach((t, tierIdx) => {
      const plank = new THREE.Mesh(new RoundedBoxGeometry(stallW, 0.055, t.d + 0.08, 2, 0.018), timberMat);
      plank.position.set(0, t.y, t.z);
      plank.castShadow = true;
      stall.add(plank);

      // Xếp 6 xô hoa / bó hoa gói giấy rực rỡ trên mỗi tầng kệ bậc thang
      for (let col = 0; col < 6; col++) {
        const bx = -2.35 + col * 0.94;
        const palIdx = (stallIdx * 2 + tierIdx + col) % petalPalettes.length;
        const flowerBucket = createRealisticFlowerBucket(
          palIdx,
          (col + tierIdx) % 2 === 0,
          tierIdx === 2
        );
        flowerBucket.position.set(bx, t.y + 0.03, t.z + (col % 2 === 0 ? 0.04 : -0.04));
        flowerBucket.rotation.y = (col * 0.65) + tierIdx * 0.4;
        stall.add(flowerBucket);
      }
    });

    // 2. Các xô hoa tươi & giỏ mây đặt tràn xuống nền gạch phía trước sạp (đặc trưng chợ hoa Hà Nội)
    [-2.4, -1.2, 0, 1.2, 2.4].forEach((fx, fIdx) => {
      const frontBucket = createRealisticFlowerBucket((stallIdx + fIdx + 1) % petalPalettes.length, true, fIdx % 2 === 0);
      frontBucket.position.set(fx, 0, 1.48 + (fIdx % 2) * 0.14);
      stall.add(frontBucket);
    });

    // 3. Hệ 4 cột sắt sơn tĩnh điện & xà ngang đỡ mái bạt
    [
      [-2.8, -1.1],
      [2.8, -1.1],
      [-2.8, 1.1],
      [2.8, 1.1]
    ].forEach(([px, pz]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 2.85, 8), ironFrameMat);
      post.position.set(px, 1.42, pz);
      post.castShadow = true;
      stall.add(post);
    });

    // 4. Mái bạt kẻ sọc nghiêng thoát nước mưa + Diềm bạt phía trước
    const awningMat = awningMats[cfg.style % awningMats.length];
    awningMat.side = THREE.DoubleSide;
    const roofSlope = createMarketCanopy(stallW + 0.55, stallD + 0.95, awningMat);
    roofSlope.position.set(0, 2.82, 0.1);
    roofSlope.castShadow = true;
    stall.add(roofSlope);

    const valance = new THREE.Mesh(new THREE.BoxGeometry(stallW + 0.55, 0.28, 0.06), awningMat);
    valance.position.set(0, 2.54, 1.56);
    stall.add(valance);

    // 5. Dây bóng đèn tròn vàng ấm áp treo dưới hiên mỗi sạp hoa
    [-1.8, 0, 1.8].forEach((lx) => {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), warmBulbMat);
      bulb.position.set(lx, 2.52, 0.95);
      stall.add(bulb);
    });

    // 6. Biển hiệu tên từng sạp hoa
    const stallSign = createNPCLabel(cfg.sign, cfg.color);
    stallSign.position.set(0, 3.38, 0.85);
    stallSign.scale.set(3.4, 0.66, 1);
    stall.add(stallSign);

    addBoxCollider(cfg.x, cfg.z, stallW + 0.25, stallD + 0.45);

    // Cho phép tương tác mua hoa tươi trực tiếp tại từng sạp hoa Chợ Quảng Bá
    registerWorldInteractable({
      id: `market_stall_${stallIdx}`,
      type: 'flower_stall',
      x: cfg.x,
      z: cfg.z + 1.85,
      y: 0.18,
      radius: 2.75,
      ringColor: 0xf43f5e,
      title: cfg.sign,
      prompt: `💐 Mua Hoa Tươi tại sạp ${cfg.sign} (15.000đ · +40 XP)`
    });
  });

  // Dây đèn lồng & bóng đèn chợ đêm giăng ngang lối đi bộ giữa 2 dãy sạp (z = -14.1)
  for (let sx = 119; sx <= 151; sx += 4.0) {
    const stringPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.8, 8), ironFrameMat);
    stringPost.position.set(sx, 1.9, -14.1);
    if (sx === 119 || sx === 151) {
      worldGroup.add(stringPost);
    }
    const hangingLantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 10, 8),
      (Math.round(sx) % 8 === 0) ? redLanternMat : warmBulbMat
    );
    hangingLantern.position.set(sx, 3.55 + Math.sin(sx * 0.5) * 0.15, -14.1);
    worldGroup.add(hangingLantern);
  }

  // Xe máy của thương lái chở sọt hoa tươi đỗ ở hai đầu Chợ Hoa Quảng Bá
  [
    { x: 115.8, z: -9.6, rot: 0.45, color: 0x1d4ed8 },
    { x: 153.2, z: -9.8, rot: -0.52, color: 0xb91c1c }
  ].forEach((bCfg, bIdx) => {
    const flowerBike = createDetailedMotorbike(bCfg.x, bCfg.z, bCfg.rot, bCfg.color, worldGroup);
    flowerBike.scale.setScalar(0.9);
    const rearCrate = new THREE.Mesh(new RoundedBoxGeometry(0.65, 0.42, 0.78, 2, 0.04), bambooBasketMat);
    rearCrate.position.set(-0.48, 0.92, 0);
    flowerBike.add(rearCrate);
    const crateFlowers = createRealisticFlowerBucket(bIdx, true, false);
    crateFlowers.position.set(-0.48, 0.96, 0);
    flowerBike.add(crateFlowers);
    addCircleCollider(bCfg.x, bCfg.z, 0.65);
  });

  // DÃY NHÀ PHỐ & TỔNG KHO HOA TƯƠI HẬU CẢNH CHỢ HOA (Z = -26.5, X = 117 .. 155)
  // Che kín hoàn toàn các khối xám thô kệch ở đường chân trời phía sau Chợ Hoa!
  const marketBackConfigs = [
    { wall: '#fef3c7', title: 'TỔNG KHO HOA ĐÊM QUẢNG BÁ', sign: '#be123c' },
    { wall: '#f8fafc', title: 'PHỤ KIỆN & GIẤY GÓI HOA TÂY HỒ', sign: '#047857' },
    { wall: '#ffedd5', title: 'TRÀ CÚC & CÀ PHÊ CHỢ HOA', sign: '#92400e' },
    { wall: '#e0f2fe', title: 'NHÀ VƯỜN LAN HỒ ĐIỆP HÀ NỘI', sign: '#1d4ed8' },
    { wall: '#fef9c3', title: 'GỐM SỨ BÁT TRÀNG - CHẬU CẢNH', sign: '#b45309' }
  ];
  const marketBackMats = marketBackConfigs.map((c) => createShophouseFacadeMaterial(c.wall, c.title, c.sign));

  for (let idx = 0; idx < 5; idx++) {
    const hx = 118.5 + idx * 8.2;
    const hz = -26.2;
    const w = 7.8;
    const d = 11.5;
    const floors = 3 + (idx % 2);
    const h = floors * 3.6;
    const sideColors = [0xfef3c7, 0xf8fafc, 0xffedd5, 0xe0f2fe, 0xfef9c3];
    const sideMat = new THREE.MeshStandardMaterial({ color: sideColors[idx], roughness: 0.78 });

    const house = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      [sideMat, sideMat, sideMat, sideMat, marketBackMats[idx], marketBackMats[idx]]
    );
    house.position.set(hx, h / 2, hz);
    house.castShadow = true;
    house.receiveShadow = true;
    worldGroup.add(house);
    addBoxCollider(hx, hz, w + 0.2, d + 0.2);

    decorateHanoiBuilding3D(worldGroup, hx, hz, w, h, d, floors, 'south', idx);

    const roof = createHipRoofMesh(w + 0.4, d + 0.4, 2.2, roofMatRed);
    roof.position.set(hx, h, hz);
    worldGroup.add(roof);
  }

  // Cây xanh cổ thụ bóng mát hai đầu khu Chợ Hoa
  createLeafyHanoiTree(114.2, -13.5, 9.8, 4.2);
  createLeafyHanoiTree(155.5, -13.5, 10.2, 4.4);

  // ==========================================================================
  // 2. CÔNG VIÊN VĂN HÓA & HỒ SEN PHÚ THƯỢNG + DÃY PHỐ BAO QUANH (Z = 12.42 .. 35.58 — khớp khít mép sau southWalk, không chồng lấn!)
  // ==========================================================================
  const park = new THREE.Mesh(new THREE.BoxGeometry(52, 0.18, 23.16, 16, 1, 6), grassMat);
  park.position.set(134, 0.09, 24.0);
  park.receiveShadow = true;
  worldGroup.add(park);

  // Viền đá bó vỉa quanh khuôn viên Công viên tạo độ nổi khối 3D rõ nét
  [
    [134, 35.5, 52.4, 0.35],
    [108, 22.5, 0.35, 26.4],
    [160, 22.5, 0.35, 26.4]
  ].forEach(([bx, bz, bw, bd]) => {
    const pCurb = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.24, bd), stoneMat);
    pCurb.position.set(bx, 0.12, bz);
    worldGroup.add(pCurb);
  });

  // --------------------------------------------------------------------------
  // A. DÃY SHOPHOUSE LẤP ĐẦY KHOẢNG TRỐNG GIỮA TRƯỜNG TIỂU HỌC & CÔNG VIÊN (X = 81..99, Z = 18.2)
  // --------------------------------------------------------------------------
  const southGapConfigs = [
    { x: 81.5, z: 18.2, wall: '#fef3c7', title: 'NHÀ SÁCH & VPP PHÚ THƯỢNG', sign: '#1d4ed8', floors: 3 },
    { x: 90.0, z: 18.2, wall: '#fce7f3', title: 'TIỆM BÁNH & TRÀ SỮA TÂY HỒ', sign: '#be185d', floors: 4 },
    { x: 98.5, z: 18.2, wall: '#e0f2fe', title: 'XE ĐẠP ĐIỆN & PHỤ TÙNG HỒ TÂY', sign: '#047857', floors: 3 }
  ];
  southGapConfigs.forEach((cfg, idx) => {
    const w = 7.8;
    const d = 11.2;
    const h = cfg.floors * 3.6;
    const fMat = createShophouseFacadeMaterial(cfg.wall, cfg.title, cfg.sign);
    const sMat = new THREE.MeshStandardMaterial({ color: cfg.wall, roughness: 0.78 });
    const shophouse = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      [sMat, sMat, sMat, sMat, fMat, fMat]
    );
    shophouse.position.set(cfg.x, h / 2, cfg.z);
    shophouse.castShadow = true;
    shophouse.receiveShadow = true;
    worldGroup.add(shophouse);
    addBoxCollider(cfg.x, cfg.z, w + 0.2, d + 0.2);
    decorateHanoiBuilding3D(worldGroup, cfg.x, cfg.z, w, h, d, cfg.floors, 'north', idx);
    const roof = createHipRoofMesh(w + 0.4, d + 0.4, 2.1, roofMatRed);
    roof.position.set(cfg.x, h, cfg.z);
    worldGroup.add(roof);
  });

  // --------------------------------------------------------------------------
  // B. DÃY NHÀ VĂN HÓA, CÀ PHÊ VEN HỒ & NHÀ PHỐ PHÍA SAU + BÊN HÔNG CÔNG VIÊN (Z = 40.2 & X = 165.5)
  // Che kín hoàn toàn các khối hộp xám DistrictBackdrop ở đường chân trời phía Nam & Đông!
  // --------------------------------------------------------------------------
  const parkBackdropConfigs = [
    { x: 86.0, z: 40.2, w: 9.0, d: 11.5, floors: 3, face: 'north', wall: '#ffedd5', title: 'PHỞ BÒ GIA TRUYỀN & BÚN CHẢ', sign: '#b91c1c' },
    { x: 96.2, z: 40.2, w: 9.2, d: 11.5, floors: 4, face: 'north', wall: '#f8fafc', title: 'TRUNG TÂM NGOẠI NGỮ TÂY HỒ', sign: '#1d4ed8' },
    { x: 106.8, z: 40.2, w: 9.5, d: 11.5, floors: 3, face: 'north', wall: '#fef9c3', title: 'CLB DƯỠNG SINH & CỜ TƯỚNG', sign: '#047857' },
    { x: 118.2, z: 40.2, w: 11.2, d: 12.0, floors: 3, face: 'north', wall: '#fde68a', title: 'NHÀ VĂN HÓA PHƯỜNG PHÚ THƯỢNG', sign: '#991b1b' },
    { x: 130.5, z: 40.2, w: 9.6, d: 11.5, floors: 4, face: 'north', wall: '#e0f2fe', title: 'CÀ PHÊ HỒ SEN - TÂY HỒ VIEW', sign: '#0369a1' },
    { x: 141.0, z: 40.2, w: 9.2, d: 11.5, floors: 3, face: 'north', wall: '#fce7f3', title: 'TRÀ SEN QUẢNG AN & BÁNH CỐM', sign: '#be123c' },
    { x: 151.2, z: 40.2, w: 9.4, d: 11.5, floors: 4, face: 'north', wall: '#fef3c7', title: 'SIÊU THỊ MINI PHÚ THƯỢNG', sign: '#b45309' },
    { x: 161.2, z: 40.2, w: 8.8, d: 11.5, floors: 3, face: 'north', wall: '#f1f5f9', title: 'NHÀ THUỐC ĐÔNG Y TÂY HỒ', sign: '#15803d' }
  ];
  parkBackdropConfigs.forEach((cfg, idx) => {
    const h = cfg.floors * 3.65;
    const fMat = createShophouseFacadeMaterial(cfg.wall, cfg.title, cfg.sign);
    const sMat = new THREE.MeshStandardMaterial({ color: cfg.wall, roughness: 0.78 });
    const bldg = new THREE.Mesh(
      new THREE.BoxGeometry(cfg.w, h, cfg.d),
      [sMat, sMat, sMat, sMat, fMat, fMat]
    );
    bldg.position.set(cfg.x, h / 2, cfg.z);
    bldg.castShadow = true;
    bldg.receiveShadow = true;
    worldGroup.add(bldg);
    addBoxCollider(cfg.x, cfg.z, cfg.w + 0.2, cfg.d + 0.2);
    decorateHanoiBuilding3D(worldGroup, cfg.x, cfg.z, cfg.w, h, cfg.d, cfg.floors, cfg.face, idx + 2);
    const roof = createHipRoofMesh(cfg.w + 0.45, cfg.d + 0.45, 2.2, roofMatRed);
    roof.position.set(cfg.x, h, cfg.z);
    worldGroup.add(roof);
  });

  // Dãy nhà phố khóa cảnh phía Đông Công Viên & Chợ Hoa (X = 165.5)
  [
    { z: -16.5, wall: '#fef3c7', title: 'TỔNG ĐẠI LÝ HOA TƯƠI ĐÀ LẠT', sign: '#be123c', floors: 4 },
    { z: 15.5, wall: '#e0f2fe', title: 'CÀ PHÊ SÂN VƯỜN ĐÔNG TÂY HỒ', sign: '#047857', floors: 3 },
    { z: 27.5, wall: '#ffedd5', title: 'NHÀ HÀNG ẨM THỰC SEN TÂY HỒ', sign: '#b45309', floors: 4 }
  ].forEach((cfg, idx) => {
    const w = 10.5;
    const d = 9.2;
    const h = cfg.floors * 3.6;
    const fMat = createShophouseFacadeMaterial(cfg.wall, cfg.title, cfg.sign);
    const sMat = new THREE.MeshStandardMaterial({ color: cfg.wall, roughness: 0.78 });
    const eastHouse = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      [fMat, fMat, sMat, sMat, sMat, sMat]
    );
    eastHouse.position.set(166.2, h / 2, cfg.z);
    eastHouse.castShadow = true;
    eastHouse.receiveShadow = true;
    worldGroup.add(eastHouse);
    addBoxCollider(166.2, cfg.z, w + 0.2, d + 0.2);
    const roof = createHipRoofMesh(w + 0.4, d + 0.4, 2.1, roofMatRed);
    roof.position.set(166.2, h, cfg.z);
    worldGroup.add(roof);
  });

  // --------------------------------------------------------------------------
  // C. CỔNG CHÀO CÔNG VIÊN VĂN HÓA & HÀNG RÀO NGHỆ THUẬT MẶT TIỀN (Z = 10.2)
  // --------------------------------------------------------------------------
  const parkGate = new THREE.Group();
  parkGate.position.set(131.5, 0.18, 10.2);
  worldGroup.add(parkGate);

  [-3.1, 3.1].forEach((gx) => {
    const pBase = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.85, 0.92, 2, 0.04), stoneMat);
    pBase.position.set(gx, 0.42, 0);
    parkGate.add(pBase);

    const pCol = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 4.4, 12), foliageRichMat);
    pCol.position.set(gx, 2.55, 0);
    pCol.castShadow = true;
    parkGate.add(pCol);

    const pRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.04, 8, 16).rotateX(Math.PI / 2), goldTrimMat);
    pRing.position.set(gx, 4.45, 0);
    parkGate.add(pRing);
    addBoxCollider(131.5 + gx, 10.2, 0.92, 0.92);
  });

  const parkGateBeam = new THREE.Mesh(new RoundedBoxGeometry(7.4, 0.62, 0.65, 2, 0.04), foliageRichMat);
  parkGateBeam.position.set(0, 4.55, 0);
  parkGate.add(parkGateBeam);

  const parkGateRoof = createHipRoofMesh(8.2, 1.9, 1.05, roofMatRed);
  parkGateRoof.position.set(0, 4.86, 0);
  parkGate.add(parkGateRoof);

  const parkBanner = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 0.96),
    new THREE.MeshBasicMaterial({
      map: makeBannerTexture('CÔNG VIÊN VĂN HÓA PHÚ THƯỢNG', 'KHÔNG GIAN XANH CỘNG ĐỒNG · HỒ SEN TÂY HỒ'),
      side: THREE.DoubleSide
    })
  );
  parkBanner.position.set(0, 4.55, -0.36);
  parkBanner.rotation.y = Math.PI;
  parkGate.add(parkBanner);

  const parkBannerBack = parkBanner.clone();
  parkBannerBack.position.z = 0.36;
  parkBannerBack.rotation.y = 0;
  parkGate.add(parkBannerBack);

  // Hàng rào trụ đá song sắt thấp & đèn cầu trang trí dọc mặt tiền Công Viên (z = 10.2)
  [111.5, 116.5, 121.5, 126.2, 136.8, 141.8, 146.8, 151.8, 156.8].forEach((px, pIdx) => {
    const pillar = new THREE.Mesh(new RoundedBoxGeometry(0.46, 1.15, 0.46, 2, 0.03), stoneMat);
    pillar.position.set(px, 0.18 + 0.57, 10.2);
    pillar.castShadow = true;
    worldGroup.add(pillar);

    // Đèn cầu trắng ấm trên đỉnh trụ công viên
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), warmBulbMat);
    globe.position.set(px, 0.18 + 1.32, 10.2);
    worldGroup.add(globe);

    if (pIdx !== 3 && pIdx !== 8) {
      const spanW = 4.6;
      const lowWall = new THREE.Mesh(new THREE.BoxGeometry(spanW, 0.36, 0.24), stoneMat);
      lowWall.position.set(px + 2.5, 0.18 + 0.18, 10.2);
      worldGroup.add(lowWall);

      const topRail = new THREE.Mesh(new THREE.BoxGeometry(spanW, 0.06, 0.08), ironFrameMat);
      topRail.position.set(px + 2.5, 0.18 + 0.92, 10.2);
      worldGroup.add(topRail);

      // Bồn hoa rực rỡ sát chân hàng rào công viên
      const planterFlower = createRealisticFlowerBucket(pIdx % petalPalettes.length, false, false);
      planterFlower.position.set(px + 2.5, 0.18, 10.95);
      worldGroup.add(planterFlower);
    }
  });

  // --------------------------------------------------------------------------
  // D. QUẢNG TRƯỜNG LÁT ĐÁ & ĐÀI PHUN NƯỚC ĐÁ TRẮNG 3 TẦNG TRUNG TÂM (X = 131.5, Z = 19.8)
  // --------------------------------------------------------------------------
  const mainWalkwayNS = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.03, 24.5), stoneMat);
  mainWalkwayNS.position.set(131.5, 0.185, 22.2);
  mainWalkwayNS.receiveShadow = true;
  worldGroup.add(mainWalkwayNS);

  const mainWalkwayEW = new THREE.Mesh(new THREE.BoxGeometry(46.0, 0.03, 3.4), stoneMat);
  mainWalkwayEW.position.set(133.0, 0.185, 19.8);
  mainWalkwayEW.receiveShadow = true;
  worldGroup.add(mainWalkwayEW);

  const centralPlazaDisc = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.4, 0.04, 32), stoneMat);
  centralPlazaDisc.position.set(131.5, 0.19, 19.8);
  centralPlazaDisc.receiveShadow = true;
  worldGroup.add(centralPlazaDisc);

  // Đài phun nước nghệ thuật 3 tầng (3-Tier Sculpted Park Fountain)
  const fountainGroup = new THREE.Group();
  fountainGroup.position.set(131.5, 0.2, 19.8);
  worldGroup.add(fountainGroup);

  const fountainPoolRim = new THREE.Mesh(new THREE.TorusGeometry(2.55, 0.24, 10, 28).rotateX(Math.PI / 2), stoneMat);
  fountainPoolRim.position.y = 0.24;
  fountainGroup.add(fountainPoolRim);

  const fountainWaterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.22,
    roughness: 0.12,
    metalness: 0.2
  });
  const fountainWater = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.45, 0.28, 28), fountainWaterMat);
  fountainWater.position.y = 0.15;
  fountainGroup.add(fountainWater);

  const fountainPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.48, 2.65, 14), stoneMat);
  fountainPillar.position.y = 1.35;
  fountainPillar.castShadow = true;
  fountainGroup.add(fountainPillar);

  [
    { y: 1.05, r: 1.45 },
    { y: 1.85, r: 0.98 },
    { y: 2.52, r: 0.55 }
  ].forEach((tier) => {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(tier.r, tier.r * 0.58, 0.24, 18), stoneMat);
    bowl.position.y = tier.y;
    bowl.castShadow = true;
    fountainGroup.add(bowl);

    const waterDisc = new THREE.Mesh(new THREE.CylinderGeometry(tier.r * 0.9, tier.r * 0.9, 0.05, 16), fountainWaterMat);
    waterDisc.position.y = tier.y + 0.11;
    fountainGroup.add(waterDisc);
  });

  // Chùm tia nước trắng sủi bọt trên đỉnh đài phun
  const waterJet = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 0.95, 12),
    new THREE.MeshStandardMaterial({ color: 0xe0f2fe, emissive: 0x7dd3fc, emissiveIntensity: 0.55, roughness: 0.2 })
  );
  waterJet.position.y = 3.05;
  fountainGroup.add(waterJet);
  addCircleCollider(131.5, 19.8, 2.65);

  animatedWorldProps.push({ type: 'fountain', jet: waterJet, baseY: 3.05 });
  registerWorldInteractable({
    id: 'park_fountain',
    type: 'fountain',
    x: 131.5,
    z: 16.6,
    y: 0.18,
    radius: 3.4,
    ringColor: 0x38bdf8,
    title: 'Đài Phun Nước Công Viên Phú Thượng',
    prompt: '⛲ Tung đồng xu ước nguyện tại Đài Phun Nước (1.000đ · +40 XP)'
  });

  // 4 bồn cây hoa cảnh đối xứng 4 góc Quảng trường Đài phun nước
  [
    [127.4, 16.0, true],
    [135.6, 16.0, false],
    [127.4, 23.6, false],
    [135.6, 23.6, true]
  ].forEach(([px, pz, isK]) => {
    createOrnamentalTreePot(px, pz, isK);
  });

  // --------------------------------------------------------------------------
  // E. HỒ SEN TÂY HỒ, CẦU GỖ VÒM ĐỎ & HÒN NON BỘ (X = 146.5, Z = 24.5)
  // --------------------------------------------------------------------------
  const parkPath = new THREE.Mesh(new THREE.RingGeometry(6.5, 8.2, 36).rotateX(-Math.PI / 2), stoneMat);
  parkPath.position.set(146.5, 0.19, 24.5);
  worldGroup.add(parkPath);

  const pondBorder = new THREE.Mesh(new THREE.TorusGeometry(6.35, 0.28, 10, 36).rotateX(Math.PI / 2), stoneMat);
  pondBorder.position.set(146.5, 0.25, 24.5);
  worldGroup.add(pondBorder);

  const pond = new THREE.Mesh(
    new THREE.CircleGeometry(6.2, 40).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.16, metalness: 0.18, transparent: true, opacity: 0.88 })
  );
  pond.position.set(146.5, 0.21, 24.5);
  worldGroup.add(pond);
  addCircleCollider(146.5, 24.5, 6.2);

  // Hòn non bộ đá cảnh giữa Hồ Sen
  const rockeryGroup = new THREE.Group();
  rockeryGroup.position.set(148.5, 0.22, 26.2);
  worldGroup.add(rockeryGroup);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.92 });
  [
    [0, 0.65, 0, 0.95, 1.4, 0.85],
    [-0.65, 0.42, 0.35, 0.65, 0.9, 0.65],
    [0.62, 0.48, -0.28, 0.7, 1.05, 0.6]
  ].forEach(([rx, ry, rz, sx, sy, sz]) => {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 1), rockMat);
    rock.scale.set(sx, sy, sz);
    rock.position.set(rx, ry, rz);
    rock.castShadow = true;
    rockeryGroup.add(rock);
  });

  // Cây cầu gỗ vòm đỏ truyền thống bắc qua bờ Hồ Sen (Red Arched Wooden Bridge)
  const bridgeGroup = new THREE.Group();
  bridgeGroup.position.set(144.2, 0.22, 22.8);
  bridgeGroup.rotation.y = Math.PI / 5;
  worldGroup.add(bridgeGroup);
  for (let seg = -4; seg <= 4; seg++) {
    const archY = Math.cos((seg / 4.5) * (Math.PI / 2)) * 0.68;
    const deck = new THREE.Mesh(new RoundedBoxGeometry(0.78, 0.12, 1.85, 2, 0.02), redMat);
    deck.position.set(seg * 0.72, 0.18 + archY, 0);
    deck.castShadow = true;
    bridgeGroup.add(deck);

    [-0.84, 0.84].forEach((rz) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.75, 8), redMat);
      post.position.set(seg * 0.72, 0.55 + archY, rz);
      bridgeGroup.add(post);

      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), goldTrimMat);
      cap.position.set(seg * 0.72, 0.94 + archY, rz);
      bridgeGroup.add(cap);
    });
  }

  registerWorldInteractable({
    id: 'park_bridge',
    type: 'bridge',
    x: 141.5,
    z: 21.0,
    y: 0.18,
    radius: 3.2,
    ringColor: 0xf472b6,
    title: 'Cầu Gỗ Vòm Đỏ & Hồ Sen Tây Hồ',
    prompt: '🪷 Ngắm Sen Tây Hồ & Thả cá chép cầu an trên Cầu Đỏ (+35 XP)'
  });

  // Lá sen xanh và Bông sen hồng Tây Hồ trên mặt hồ
  const lotusPadMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
  const lotusPinkMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.5 });
  for (let li = 0; li < 18; li++) {
    const angle = (li / 18) * Math.PI * 2;
    const rad = 1.8 + (li % 4) * 1.1;
    const lx = 146.5 + Math.cos(angle) * rad;
    const lz = 24.5 + Math.sin(angle) * rad;
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.03, 12), lotusPadMat);
    pad.position.set(lx, 0.23, lz);
    worldGroup.add(pad);
    if (li % 2 === 0) {
      const lotus = new THREE.Mesh(flowerGeometry(.18), lotusPinkMat);
      lotus.position.set(lx, 0.33, lz);
      worldGroup.add(lotus);
    }
  }

  // Chòi nghỉ lục giác truyền thống (Hexagonal Pavilion) & Bàn cờ tướng đá bên bờ hồ sen
  const gazebo = new THREE.Group();
  gazebo.position.set(137.5, 0.18, 28.5);
  worldGroup.add(gazebo);
  const gazBase = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.75, 0.32, 6), stoneMat);
  gazBase.position.y = 0.16;
  gazebo.add(gazBase);
  for (let gi = 0; gi < 6; gi++) {
    const ga = (gi / 6) * Math.PI * 2;
    const gp = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 2.8, 8), redMat);
    gp.position.set(Math.cos(ga) * 2.15, 1.56, Math.sin(ga) * 2.15);
    gp.castShadow = true;
    gazebo.add(gp);
  }
  const gazRoof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.55, 6), roofMatRed);
  gazRoof.position.y = 3.65;
  gazRoof.castShadow = true;
  gazebo.add(gazRoof);

  // Bàn đá đánh cờ tướng, các quân cờ tướng Đỏ - Đen 3D & 4 đôn đá bên trong Chòi lục giác
  const gazTable = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.52, 0.72, 12), stoneMat);
  gazTable.position.y = 0.68;
  gazebo.add(gazTable);

  const chessBoardTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.76, 0.03, 0.82),
    new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.55 })
  );
  chessBoardTop.position.y = 1.05;
  gazebo.add(chessBoardTop);

  // Các quân cờ tướng Đỏ & Đen đang bày thế cờ giang hồ trên mặt bàn đá
  [
    [-0.22, -0.24, true], [0.0, -0.28, true], [0.22, -0.2, true], [-0.12, -0.08, true],
    [-0.2, 0.24, false], [0.02, 0.28, false], [0.2, 0.18, false], [0.1, 0.06, false]
  ].forEach(([cx, cz, isRedPiece]) => {
    const piece = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.042, 0.028, 10),
      isRedPiece ? redMat : bucketBlackMat
    );
    piece.position.set(cx, 1.08, cz);
    gazebo.add(piece);
  });

  for (let si = 0; si < 4; si++) {
    const sa = (si / 4) * Math.PI * 2 + Math.PI / 4;
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.45, 10), stoneMat);
    stool.position.set(Math.cos(sa) * 1.05, 0.54, Math.sin(sa) * 1.05);
    gazebo.add(stool);
  }
  addCircleCollider(137.5, 28.5, 1.45);

  registerWorldInteractable({
    id: 'park_chess',
    type: 'chess',
    x: 137.5,
    z: 26.2,
    y: 0.18,
    seatX: 137.5 - 0.74,
    seatY: 0.34,
    seatZ: 28.5 - 0.74,
    seatYaw: Math.PI / 4,
    exitX: 135.8,
    exitZ: 26.2,
    radius: 3.3,
    ringColor: 0xfacc15,
    title: 'Bàn Cờ Tướng Đá Chòi Lục Giác',
    prompt: '♟️ Ngồi giải Thế Cờ Tướng Giang Hồ bên Hồ Sen (+45 XP, +15.000đ)'
  });

  // --------------------------------------------------------------------------
  // F. KIOT GIẢI KHÁT & KEM HỒ TÂY TRONG CÔNG VIÊN (X = 113.5, Z = 14.2)
  // --------------------------------------------------------------------------
  const kioskGroup = new THREE.Group();
  kioskGroup.position.set(113.5, 0.18, 14.2);
  worldGroup.add(kioskGroup);

  const kioskBody = new THREE.Mesh(new RoundedBoxGeometry(3.8, 2.4, 2.6, 2, 0.04), timberMat);
  kioskBody.position.y = 1.2;
  kioskBody.castShadow = true;
  kioskGroup.add(kioskBody);

  const kioskCounter = new THREE.Mesh(new RoundedBoxGeometry(4.1, 0.14, 0.85, 2, 0.03), stoneMat);
  kioskCounter.position.set(0, 1.05, 1.15);
  kioskGroup.add(kioskCounter);

  const kioskRoof = createHipRoofMesh(4.6, 3.4, 1.15, roofMatRed);
  kioskRoof.position.y = 2.42;
  kioskGroup.add(kioskRoof);

  const kioskSign = createNPCLabel('🍦 KEM HỒ TÂY · NƯỚC MÍA & TRÀ CHANH', '#f59e0b');
  kioskSign.position.set(0, 3.45, 0.6);
  kioskSign.scale.set(3.5, 0.68, 1);
  kioskGroup.add(kioskSign);
  addBoxCollider(113.5, 14.2, 4.1, 3.0);

  registerWorldInteractable({
    id: 'park_kiosk',
    type: 'kiosk',
    x: 113.5,
    z: 16.4,
    y: 0.18,
    radius: 2.9,
    ringColor: 0xf59e0b,
    title: 'Kiot Kem Hồ Tây & Nước Mía Công Viên',
    prompt: '🍦 Mua Kem Ốc Quế Hồ Tây & Nước Mía (10.000đ · Hồi 100% Thể lực & +35 XP)'
  });

  // 2 Bộ bàn tròn & Ô dù che nắng trước Kiot giải khát công viên
  [118.2, 122.0].forEach((ux, uIdx) => {
    const cafeSet = new THREE.Group();
    cafeSet.position.set(ux, 0.18, 14.5);
    worldGroup.add(cafeSet);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.35, 8), ironFrameMat);
    pole.position.y = 1.18;
    cafeSet.add(pole);

    const umbrella = new THREE.Mesh(
      new THREE.ConeGeometry(1.45, 0.55, 10),
       awningMats[uIdx % awningMats.length]
    );
    umbrella.position.y = 2.35;
    umbrella.castShadow = true;
    cafeSet.add(umbrella);

    const cTable = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.08, 14), stoneMat);
    cTable.position.y = 0.72;
    cafeSet.add(cTable);

    [-0.78, 0.78].forEach((sx) => {
      const chair = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.44, 0.36, 2, 0.03), timberMat);
      chair.position.set(sx, 0.22, 0);
      cafeSet.add(chair);
    });
    addCircleCollider(ux, 14.5, 0.65);

    registerWorldInteractable({
      id: `park_cafe_${uIdx}`,
      type: 'bench',
      x: ux,
      z: 15.6,
      y: 0.18,
      seatX: ux - 0.78,
      seatY: 0.18,
      seatZ: 14.5,
      seatYaw: Math.PI / 2,
      exitX: ux,
      exitZ: 15.8,
      radius: 2.3,
      ringColor: 0x38bdf8,
      title: `Bàn Ô Dù Công Viên #${uIdx + 1}`,
      prompt: '🪑 Ngồi bàn ô dù uống nước mía & hóng mát (Hồi Thể lực · +20 XP)'
    });
  });

  // --------------------------------------------------------------------------
  // G. KHU MÁY TẬP THỂ DỤC NGOÀI TRỜI HÀ NỘI (X = 113 .. 123, Z = 21.5)
  // --------------------------------------------------------------------------
  const gymYellowMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.45, roughness: 0.35 });
  const gymBlueMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.45, roughness: 0.35 });

  const gymPad = new THREE.Mesh(new THREE.BoxGeometry(12.5, 0.03, 4.8), stoneMat);
  gymPad.position.set(118.0, 0.185, 21.5);
  worldGroup.add(gymPad);

  const gymMachineNames = [
    'Máy Đi Bộ Trên Không',
    'Máy Xoay Eo Công Viên',
    'Máy Đẩy Tay Vai Đôi',
    'Máy Đạp Chân Toàn Thân'
  ];

  [113.5, 116.5, 119.5, 122.5].forEach((gx, gIdx) => {
    const machine = new THREE.Group();
    machine.position.set(gx, 0.19, 21.5);
    worldGroup.add(machine);

    const mainPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 1.55, 10), gymBlueMat);
    mainPost.position.y = 0.78;
    mainPost.castShadow = true;
    machine.add(mainPost);

    const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.35, 8).rotateZ(Math.PI / 2), gymYellowMat);
    topBar.position.y = 1.42;
    machine.add(topBar);

    const arms = [];
    const pedals = [];
    [-0.45, 0.45].forEach((sideX) => {
      const swingArm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.15, 8), gymYellowMat);
      swingArm.position.set(sideX, 0.85, 0);
      swingArm.rotation.x = (gIdx % 2 === 0 ? 0.22 : -0.22) * Math.sign(sideX);
      machine.add(swingArm);
      arms.push(swingArm);

      const footPedal = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.06, 0.42, 2, 0.01), gymBlueMat);
      footPedal.position.set(sideX, 0.28, 0.12);
      machine.add(footPedal);
      pedals.push(footPedal);
    });
    addCircleCollider(gx, 21.5, 0.52);

    const gymProp = {
      type: 'gym',
      id: `park_gym_${gIdx}`,
      arms,
      pedals,
      phase: gIdx * 1.1
    };
    animatedWorldProps.push(gymProp);

    registerWorldInteractable({
      id: `park_gym_${gIdx}`,
      type: 'gym',
      gymIndex: gIdx,
      gymProp,
      x: gx,
      z: 22.8,
      y: 0.18,
      mountX: gx,
      mountY: 0.42,
      mountZ: 21.65,
      mountYaw: 0,
      exitX: gx,
      exitZ: 23.0,
      radius: 2.3,
      ringColor: 0xeab308,
      title: gymMachineNames[gIdx],
      prompt: `💪 Lên tập ${gymMachineNames[gIdx]} (Hồi 100% Thể lực · +30 XP)`
    });
  });

  // --------------------------------------------------------------------------
  // H. KHU VUI CHƠI TRẺ EM LIÊN HOÀN: CẦU TRƯỢT MÁI NẤM, BẬP BÊNH & XÍCH ĐU ĐÔI (X = 114 .. 127, Z = 29.5)
  // --------------------------------------------------------------------------
  // 1. Nhà chòi mái nấm & Cầu trượt liên hoàn
  const slideTower = new THREE.Group();
  slideTower.position.set(116.5, 0.18, 29.5);
  worldGroup.add(slideTower);

  const towerDeck = new THREE.Mesh(new RoundedBoxGeometry(2.1, 0.18, 2.1, 2, 0.03), gymBlueMat);
  towerDeck.position.y = 1.45;
  slideTower.add(towerDeck);

  [[-0.88, -0.88], [0.88, -0.88], [-0.88, 0.88], [0.88, 0.88]].forEach(([px, pz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.9, 8), gymYellowMat);
    leg.position.set(px, 1.45, pz);
    leg.castShadow = true;
    slideTower.add(leg);
  });

  const mushroomRoof = new THREE.Mesh(new THREE.ConeGeometry(1.85, 1.15, 12), redMat);
  mushroomRoof.position.y = 3.25;
  mushroomRoof.castShadow = true;
  slideTower.add(mushroomRoof);

  // Máng cầu trượt nghiêng
  const slideChute = new THREE.Mesh(new RoundedBoxGeometry(0.85, 0.14, 2.85, 2, 0.03), gymYellowMat);
  slideChute.position.set(0, 0.78, 2.05);
  slideChute.rotation.x = 0.52;
  slideChute.castShadow = true;
  slideTower.add(slideChute);
  addBoxCollider(116.5, 29.5, 2.2, 2.2);

  registerWorldInteractable({
    id: 'park_slide',
    type: 'slide',
    x: 116.5,
    z: 27.6,
    y: 0.18,
    towerX: 116.5,
    towerZ: 29.5,
    radius: 3.1,
    ringColor: 0xf43f5e,
    title: 'Cầu Trượt Mái Nấm Liên Hoàn',
    prompt: '🛝 Trèo lên chòi nấm & Trượt cầu trượt liên hoàn (+30 XP)'
  });

  // 2. Bập bênh đôi (Seesaw) — Có khớp xoay trục giữa chuyển động thực tế 3D
  const seesaw = new THREE.Group();
  seesaw.position.set(121.2, 0.18, 29.5);
  worldGroup.add(seesaw);
  const pivotBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.55, 8), gymBlueMat);
  pivotBase.position.y = 0.28;
  seesaw.add(pivotBase);
  const plankBeam = new THREE.Mesh(new RoundedBoxGeometry(3.2, 0.1, 0.38, 2, 0.02), gymYellowMat);
  plankBeam.position.y = 0.58;
  plankBeam.rotation.z = 0.14;
  seesaw.add(plankBeam);

  // Tay nắm hai đầu bập bênh
  [-1.1, 1.1].forEach((hx) => {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.32, 8).rotateX(Math.PI / 2), redMat);
    handle.position.set(hx, 0.16, 0);
    plankBeam.add(handle);
  });
  addBoxCollider(121.2, 29.5, 2.6, 0.55);

  const seesawProp = { type: 'seesaw', beam: plankBeam };
  animatedWorldProps.push(seesawProp);

  registerWorldInteractable({
    id: 'park_seesaw',
    type: 'seesaw',
    seesawProp,
    x: 121.2,
    z: 28.2,
    y: 0.18,
    centerX: 121.2,
    centerZ: 29.5,
    exitX: 121.2,
    exitZ: 27.9,
    radius: 2.8,
    ringColor: 0xeab308,
    title: 'Bập Bênh Đôi Công Viên',
    prompt: '⚖️ Lên chơi Bập bênh công viên (W/S nhún · E/Space xuống · +25 XP)'
  });

  // 3. Khung Xích đu đôi có khớp treo đung đưa thực tế 3D (Swing Set with Pendulum Pivot)
  const swingFrame = new THREE.Group();
  swingFrame.position.set(126.2, 0.18, 29.5);
  [-2, 2].forEach((side) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.6, 10), redMat);
    post.position.set(side, 1.8, 0);
    post.rotation.z = side * -0.08;
    swingFrame.add(post);
  });
  const swingBar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.2, 10), redMat);
  swingBar.rotation.z = Math.PI / 2;
  swingBar.position.y = 3.5;
  swingFrame.add(swingBar);

  const swingPivots = [];
  [-0.85, 0.85].forEach((sx) => {
    const pivot = new THREE.Group();
    pivot.position.set(sx, 3.5, 0);
    [-0.24, 0.24].forEach((chainOff) => {
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.55, 6), ironFrameMat);
      chain.position.set(chainOff, -1.28, 0);
      pivot.add(chain);
    });
    const swingSeat = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.07, 0.32, 2, 0.02), gymYellowMat);
    swingSeat.position.set(0, -2.58, 0);
    pivot.add(swingSeat);
    swingFrame.add(pivot);
    swingPivots.push(pivot);
  });
  worldGroup.add(swingFrame);
  addBoxCollider(126.2, 29.5, 4.2, 0.9);

  const swingProp = { type: 'swing', pivots: swingPivots };
  animatedWorldProps.push(swingProp);

  registerWorldInteractable({
    id: 'park_swing',
    type: 'swing',
    swingProp,
    x: 126.2,
    z: 28.0,
    y: 0.18,
    pivotWorldX: 126.2 - 0.85,
    pivotWorldY: 0.18 + 3.5,
    pivotWorldZ: 29.5,
    ropeLength: 2.58,
    exitX: 126.2,
    exitZ: 27.6,
    radius: 2.9,
    ringColor: 0x38bdf8,
    title: 'Xích Đu Đôi Công Viên',
    prompt: '🎠 Ngồi đánh Xích đu công viên (W/S lấy đà · E/Space xuống · +30 XP)'
  });

  // Ghế băng dài nghỉ chân dọc các lối dạo bộ trong Công viên (Ngồi nghỉ chân thực tế)
  [
    [125.5, 15.2, 0],
    [137.5, 15.2, 0],
    [125.5, 24.5, Math.PI],
    [140.2, 19.5, -Math.PI / 2]
  ].forEach(([bx, bz, rotY], bIdx) => {
    const bench = createParkBench(2.8, timberMat);
    bench.position.set(bx, 0.18, bz);
    bench.rotation.y = rotY;
    worldGroup.add(bench);
    addBoxCollider(bx, bz, 2.6, 0.68);

    const frontDirX = Math.sin(rotY);
    const frontDirZ = Math.cos(rotY);
    registerWorldInteractable({
      id: `park_bench_${bIdx}`,
      type: 'bench',
      x: bx + frontDirX * 0.95,
      z: bz + frontDirZ * 0.95,
      y: 0.18,
      seatX: bx + frontDirX * 0.12,
      seatY: 0.26,
      seatZ: bz + frontDirZ * 0.12,
      seatYaw: rotY,
      exitX: bx + frontDirX * 1.15,
      exitZ: bz + frontDirZ * 1.15,
      radius: 2.35,
      ringColor: 0x4ade80,
      title: `Ghế Băng Công Viên #${bIdx + 1}`,
      prompt: '🪑 Ngồi ghế băng công viên hóng gió & hồi 100% Thể lực (+20 XP)'
    });
  });

  // Hàng cây cổ thụ bóng mát quanh Công Viên & Dãy phố Nam
  createLeafyHanoiTree(86.0, 9.2, 9.4, 4.0);
  createLeafyHanoiTree(98.0, 9.2, 9.6, 4.1);
  createLeafyHanoiTree(110.5, 17.5, 9.8, 4.2);
  createLeafyHanoiTree(123.5, 17.2, 9.4, 3.9);
  createLeafyHanoiTree(139.5, 14.2, 9.6, 4.0);
  createLeafyHanoiTree(155.5, 17.5, 10.2, 4.3);
  createLeafyHanoiTree(154.5, 31.5, 9.8, 4.1);
  createLeafyHanoiTree(111.5, 31.8, 9.5, 4.0);

  const parkLabel = createNPCLabel('🌳 CÔNG VIÊN & HỒ SEN PHÚ THƯỢNG', '#4ade80');
  parkLabel.position.set(131.5, 5.8, 10.2);
  worldGroup.add(parkLabel);

  // ==========================================================================
  // 3. VƯỜN ĐÀO PHÚ THƯỢNG & CỔNG LÀNG CỔ PHÚ THƯỢNG (ĐẦU TÂY: X = -153, khớp mép sau southWalk z = 12.42)
  // ==========================================================================
  const orchard = new THREE.Mesh(new THREE.BoxGeometry(50, 0.14, 23.6, 16, 1, 6), grassMat);
  orchard.position.set(-153, 0.07, 24.22);
  orchard.receiveShadow = true;
  worldGroup.add(orchard);

  [-170, -160, -150, -140].forEach((x, row) => {
    [14, 23, 32].forEach((z, col) => {
      const tx = x + (col % 2) * 1.5;
      // Luống đất trồng đào đắp cao
      const mound = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.95, 0.28, 10), darkWoodMat);
      mound.position.set(tx, 0.22, z);
      worldGroup.add(mound);

      const peach = createPottedMarketTree(false);
      peach.remove(peach.children[0],peach.children[1]);
      peach.scale.setScalar(1.75);peach.position.set(tx,.3-.54*1.75,z);
      peach.userData.modelFamily='orchard-tree';worldGroup.add(peach);
      addCircleCollider(tx, z, 0.45);
    });
  });
  const orchardLabel = createNPCLabel('🌸 VƯỜN ĐÀO PHÚ THƯỢNG', '#f472b6');
  orchardLabel.position.set(-154, 5.1, 12.2);
  worldGroup.add(orchardLabel);

  // Cổng Làng Phú Thượng Cổ Kính (Tam quan gạch đỏ mái đao cong)
  [-158, -148].forEach((x) => {
    const pillar = new THREE.Mesh(new RoundedBoxGeometry(2.1, 5.4, 2.2, 3, 0.08), redMat);
    pillar.position.set(x, 2.7, -10.5);
    pillar.castShadow = true;
    worldGroup.add(pillar);
    const cap = new THREE.Mesh(new RoundedBoxGeometry(2.35, 0.35, 2.45, 2, 0.04), goldTrimMat);
    cap.position.set(x, 5.35, -10.5);
    worldGroup.add(cap);
    addBoxCollider(x, -10.5, 2.2, 2.3);
  });
  const gateCrossBeam = new THREE.Mesh(new RoundedBoxGeometry(12.2, 0.95, 1.6, 2, 0.04), stoneMat);
  gateCrossBeam.position.set(-153, 4.85, -10.5);
  worldGroup.add(gateCrossBeam);

  const gateRoof = createHipRoofMesh(14.2, 3.4, 2.0, roofMatRed);
  gateRoof.position.set(-153, 5.35, -10.5);
  worldGroup.add(gateRoof);
  const gateRoofTop = createHipRoofMesh(8.8, 2.4, 1.35, roofMatRed);
  gateRoofTop.position.set(-153, 6.45, -10.5);
  worldGroup.add(gateRoofTop);

  const gateBoard = createNPCLabel('🏮 CỔNG LÀNG CỔ PHÚ THƯỢNG', '#facc15');
  gateBoard.position.set(-153, 4.15, -9.55);
  gateBoard.scale.set(4.8, 1.15, 1);
  worldGroup.add(gateBoard);
}

function buildStreetLevelRealism() {
  const patchMat = new THREE.MeshBasicMaterial({ color: 0x242a2f, transparent: true, opacity: 0.68, depthWrite: false });
  const drainMat = new THREE.MeshStandardMaterial({ color: 0x343b40, metalness: 0.72, roughness: 0.56 });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x8e8d85, roughness: 0.94 });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x687078, metalness: 0.65, roughness: 0.48 });

  // Các mảng vá, nắp cống và vệt xuống cấp giúp mặt đường bớt phẳng giả.
  [
    [-88, -1.9, 3.8, 1.3, 0.18], [-46, 2.1, 5.2, 1.45, -0.08],
    [8, -2.4, 4.4, 1.2, 0.12], [66, 2.0, 5.8, 1.5, -0.16], [112, -1.8, 4.2, 1.1, 0.09]
  ].forEach(([x, z, sx, sz, rot]) => {
    const patch = new THREE.Mesh(new THREE.CircleGeometry(1, 18), patchMat);
    patch.rotation.x = -Math.PI / 2;
    patch.rotation.z = rot;
    patch.scale.set(sx, sz, 1);
    patch.position.set(x, 0.041, z);
    worldGroup.add(patch);
  });

  [-62, -15, 30, 84].forEach((x, index) => {
    const grate = new THREE.Group();
    const frame = new THREE.Mesh(new RoundedBoxGeometry(1.25, 0.055, 0.58, 2, 0.025), drainMat);
    frame.position.y = 0.205;
    grate.add(frame);
    for (let i = -4; i <= 4; i++) {
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.02, 0.42), concreteMat);
      slot.position.set(i * 0.12, 0.24, 0);
      grate.add(slot);
    }
    grate.position.set(x, 0, index % 2 ? 5.25 : -5.25);
    worldGroup.add(grate);
  });

  const manhole = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.045, 28), drainMat);
  manhole.position.set(-15, 0.055, -0.6);
  worldGroup.add(manhole);

  // Dãy nhà ống thấp tầng phía Nam đầu Tây: cửa cuốn, ban công, biển hiệu và điều hòa (không chồng lấn dãy Bắc).
  const facadeColors = [0xc9b99a, 0xb8c0b0, 0xd0b3a0, 0xb5b0a6, 0xc6c0aa, 0xaebbc0];
  const signColors = [0x155e75, 0x9f1239, 0x92400e, 0x166534, 0x334155, 0x7c2d12];
  for (let i = 0; i < 6; i++) {
    const x = -122 + i * 7.4;
    const width = 6.7;
    const height = 10.5 + (i % 3) * 2.1;
    const depth = 10.5;
    const bodyMat = new THREE.MeshStandardMaterial({ color: facadeColors[i], roughness: 0.86 });
    const building = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), bodyMat);
    body.position.y = height / 2;
    body.castShadow = true;
    building.add(body);

    const shutter = new THREE.Mesh(
      new RoundedBoxGeometry(width - 0.75, 2.7, 0.16, 2, 0.025),
      new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.45, roughness: 0.55 })
    );
    shutter.position.set(0, 1.45, -(depth / 2 + 0.09));
    building.add(shutter);
    for (let floor = 1; floor < Math.floor(height / 3.1); floor++) {
      const balcony = new THREE.Mesh(new THREE.BoxGeometry(width - 0.55, 0.16, 1.0), concreteMat);
      balcony.position.set(0, floor * 3.05 + 0.1, -(depth / 2 + 0.42));
      building.add(balcony);
      [-1.65, 0, 1.65].forEach((wx) => {
        const window = new THREE.Mesh(
          new RoundedBoxGeometry(1.25, 1.45, 0.12, 2, 0.02),
          new THREE.MeshStandardMaterial({ color: 0x526e7c, metalness: 0.2, roughness: 0.3 })
        );
        window.position.set(wx, floor * 3.05 + 1.15, -(depth / 2 + 0.08));
        building.add(window);
      });
    }
    const sign = createNPCLabel(['TẠP HÓA PHÚ THƯỢNG', 'PHỞ GÀ GIA TRUYỀN', 'SỬA XE · RỬA XE'][i % 3], `#${signColors[i].toString(16).padStart(6, '0')}`);
    sign.position.set(0, 3.35, -(depth / 2 + 0.28));
    sign.scale.set(4.4, 0.78, 1);
    building.add(sign);
    building.position.set(x, 0.16, 18.2);
    worldGroup.add(building);
    addBoxCollider(x, 18.2, width + 0.2, depth + 0.2);
  }

  // Đèn đường cong kiểu Hà Nội; tối ưu PointLight cách quãng để giảm tải GPU fragment shader.
  [-92, -48, -8, 38, 82, 126].forEach((x, index) => {
    const lamp = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.12, 7.4, 10), poleMat);
    pole.position.y = 3.7;
    pole.castShadow = true;
    lamp.add(pole);
    const arm = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.065, 8, 20, Math.PI / 2), poleMat);
    arm.position.set(index % 2 ? -0.95 : 0.95, 7.05, 0);
    arm.rotation.z = index % 2 ? Math.PI : 0;
    lamp.add(arm);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0xfff0b5, emissive: 0xffc857, emissiveIntensity: 0.2 })
    );
    bulb.position.set(index % 2 ? -1.95 : 1.95, 7.0, 0);
    lamp.add(bulb);
    let light = null;
    if (index % 2 === 0) {
      light = new THREE.PointLight(0xffd58a, 0, 22, 1.5);
      light.position.copy(bulb.position);
      lamp.add(light);
    }
    realisticStreetLights.push({ light, bulb });
    lamp.position.set(x, 0.18, index % 2 ? -6.1 : 6.1);
    worldGroup.add(lamp);
    addCircleCollider(x, lamp.position.z, 0.25);
  });

  // Thùng rác và chậu cây nhỏ phân bố vừa phải trên vỉa hè.
  [-72, -28, 18, 58, 102].forEach((x, index) => {
    const bin = new THREE.Mesh(
      new RoundedBoxGeometry(0.58, 0.86, 0.58, 3, 0.055),
      new THREE.MeshStandardMaterial({ color: index % 2 ? 0x2563eb : 0x15803d, roughness: 0.68 })
    );
    bin.position.set(x, 0.61, index % 2 ? -7.0 : 7.0);
    bin.castShadow = true;
    worldGroup.add(bin);
    addCircleCollider(x, bin.position.z, 0.38);
  });
}

// Ngõ 41 là một lát cắt kể chuyện riêng: ban ngày vẫn là một ngõ dân sinh,
// khi chương đêm bắt đầu mặt đường ướt, đèn huỳnh quang, biển số nhà Hà Nội và Ngách 41/2 dẫn dắt người chơi rõ ràng.
function buildNgo41HorrorAlley() {
  const root = new THREE.Group();
  root.name = 'Ngo41HorrorAlley';
  horrorSetPieces.root = root;
  worldGroup.add(root);

  // Vỏ kiến trúc chỉ dùng trong chương truyện. Các khối nhà xa khép kín đường chân trời,
  // ngăn người chơi nhìn thấy mép mặt phẳng, mặt sau công trình và các khu vực chưa dựng.
  const occluders = new THREE.Group();
  occluders.name = 'Ngo41StoryOccluders';
  const occluderColors = [0x27332f, 0x35312b, 0x2b3438, 0x3b322b];
  [
    { x: -53, z: -32, w: 11, d: 62, h: 13 },
    { x: -107, z: -34, w: 13, d: 58, h: 12 },
    { x: -80, z: -62, w: 64, d: 10, h: 11 },
    { x: -80, z: 3, w: 64, d: 10, h: 12 }
  ].forEach((cfg, index) => {
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(cfg.w, cfg.h, cfg.d),
      new THREE.MeshStandardMaterial({ color: occluderColors[index], roughness: 0.96 })
    );
    block.position.set(cfg.x, cfg.h / 2 - 0.05, cfg.z);
    block.receiveShadow = true;
    occluders.add(block);
  });
  occluders.visible = false;
  root.add(occluders);
  horrorSetPieces.occluders = occluders;

  const wallColors = [0xd6c7b2, 0xc2cfc6, 0xdfc7b4, 0xcbd2d6, 0xd8c3a5, 0xbac7c9, 0xd4c4b4, 0xc4ccd0];
  const wetRoadMat = visualMaterials.concrete(true);

  // 1. Trục chính Ngõ 41 Phú Thượng (chạy từ vỉa hè z = -6.5 tới cuối ngõ z = -53 tại x = -67)
  const alley = new THREE.Mesh(worldUVs(new THREE.PlaneGeometry(5.6, 50).rotateX(-Math.PI / 2), 3), wetRoadMat);
  alley.position.set(-67, 0.035, -30);
  alley.receiveShadow = true;
  root.add(alley);

  // 2. Ngách 41/2 nối trực tiếp từ cửa Quán Xôi Cô Hòa (x = -90, z = -38.2) sang Ngõ 41 (x = -67, z = -37.2)
  const sideLane = new THREE.Mesh(worldUVs(new THREE.BoxGeometry(31, 0.08, 6.2), 3), visualMaterials.concrete(true));
  sideLane.position.set(-80.5, 0.04, -37.5);
  sideLane.receiveShadow = true;
  root.add(sideLane);

  // Tường gạch cổ & nhà dân dọc bờ Bắc Ngách 41/2 (che hoàn toàn khoảng đất trống sau lưng shophouse)
  const laneWallMat = visualMaterials.brick();
  const northLaneWall = new THREE.Mesh(worldUVs(new THREE.BoxGeometry(21.5, 3.3, 0.38), 1.4), laneWallMat);
  northLaneWall.position.set(-84.5, 1.65, -34.1);
  northLaneWall.castShadow = true;
  northLaneWall.receiveShadow = true;
  root.add(northLaneWall);
  addBoxCollider(-84.5, -34.1, 21.8, 0.55);

  // Bờ tường phía Nam của Ngách 41/2 (đoạn từ x = -84.5 tới x = -75.8)
  const southLaneWall = new THREE.Mesh(worldUVs(new THREE.BoxGeometry(9.2, 2.9, 0.38), 1.4), laneWallMat);
  southLaneWall.position.set(-80.2, 1.45, -40.8);
  southLaneWall.castShadow = true;
  root.add(southLaneWall);
  addBoxCollider(-80.2, -40.8, 9.5, 0.55);

  // Biển chỉ dẫn lớn gắn ngay đối diện cửa Quán Xôi Cô Hòa để người chơi bước ra là thấy đường tới Nhà Số 41!
  const guideBoard = createVietnameseAddressPlate('➡️ RẼ PHẢI RA NGÕ 41 (20M)', 'LỐI ĐI TỚI NHÀ SỐ 41 PHÚ THƯỢNG', true);
  guideBoard.position.set(-88.5, 2.35, -33.85);
  guideBoard.scale.setScalar(1.35);
  root.add(guideBoard);

  const cornerGuideBoard = createVietnameseAddressPlate('⬆️ RẼ TRÁI: NHÀ SỐ 41 (8M)', '⬇️ RẼ PHẢI: CUỐI NGÕ 41', true);
  cornerGuideBoard.position.set(-64.15, 2.45, -36.8);
  cornerGuideBoard.rotation.y = -Math.PI / 2;
  cornerGuideBoard.scale.setScalar(1.25);
  root.add(cornerGuideBoard);

  // Đèn đường ấm áp dọc Ngách 41/2 (1 PointLight trung tâm + 3 bóng đèn phát sáng giúp mượt GPU)
  horrorSetPieces.laneBulbs = [];
  [-88, -81, -74].forEach((lx, idx) => {
    const lampBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xfffbeb, emissive: 0xfbbf24, emissiveIntensity: 2.2 })
    );
    lampBulb.position.set(lx, 3.35, -34.45);
    root.add(lampBulb);
    horrorSetPieces.laneBulbs.push(lampBulb);
    if (idx === 1) {
      const laneLight = new THREE.PointLight(0xffd58a, 18, 24, 1.35);
      laneLight.position.set(lx, 3.2, -35.8);
      root.add(laneLight);
      horrorSetPieces.lanePointLight = laneLight;
    }
  });

  const gutterMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.72, metalness: 0.15 });
  [-69.55, -64.45].forEach((x) => {
    const gutter = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 50), gutterMat);
    gutter.position.set(x, 0.06, -30);
    root.add(gutter);
  });

  // 3. Các căn nhà trong Ngõ 41 với Biển Số Nhà Hà Nội (39A, 39B, SỐ 41, 41B, 43, 45)
  // Lưu ý: Tại bên trái (side = -1), chừa khoảng trống từ z = -34.1 tới z = -40.4 làm ngã rẽ Ngách 41/2!
  const alleyHouses = [
    { side: -1, z: -17.5, depth: 9.2, num: 'SỐ 39B', sub: 'NGÕ 41 PHÚ THƯỢNG', isTarget41: false },
    { side: 1,  z: -17.5, depth: 9.2, num: 'SỐ 39A', sub: 'NGÕ 41 PHÚ THƯỢNG', isTarget41: false },
    { side: -1, z: -29.2, depth: 8.8, num: '🏠 SỐ NHÀ 41', sub: 'NGÕ 41 PHÚ THƯỢNG', isTarget41: true },
    { side: 1,  z: -29.2, depth: 8.8, num: 'SỐ 41B', sub: 'NGÕ 41 PHÚ THƯỢNG', isTarget41: false },
    { side: -1, z: -44.8, depth: 8.2, num: 'SỐ 43',  sub: 'NGÕ 41 PHÚ THƯỢNG', isTarget41: false },
    { side: 1,  z: -41.5, depth: 9.2, num: 'SỐ 45',  sub: 'NGÕ 41 PHÚ THƯỢNG', isTarget41: false },
    { side: 1,  z: -51.2, depth: 7.8, num: 'SỐ 47',  sub: 'CUỐI NGÕ 41', isTarget41: false }
  ];

  const doorPanels = new THREE.InstancedMesh(worldUVs(new RoundedBoxGeometry(.075, 1.02, 1.13, 2, .018), .8), visualMaterials.wood, alleyHouses.length * 4);
  const doorHandles = new THREE.InstancedMesh(new THREE.TorusGeometry(.075, .012, 7, 14), archMaterials.brassTrim, alleyHouses.length);
  const panelDummy = new THREE.Object3D();

  alleyHouses.forEach((hCfg, idx) => {
    const width = 6.2;
    const depth = hCfg.depth;
    const floors = 3 + (idx % 2);
    const height = floors * 3.2;
    const x = -67 + hCfg.side * 5.9;
    const wallColor = hCfg.isTarget41 ? 0xfef3c7 : wallColors[idx % wallColors.length];
    const facade = new THREE.Mesh(
      worldUVs(new THREE.BoxGeometry(width, height, depth), 3),
      visualMaterials.plaster(wallColor)
    );
    facade.position.set(x, height / 2, hCfg.z);
    facade.castShadow = true;
    facade.receiveShadow = true;
    root.add(facade);
    addBoxCollider(x, hCfg.z, width + 0.2, depth + 0.2);

    // Mái ngói đỏ / mái dốc truyền thống cho từng ngôi nhà trong Ngõ 41 (không còn đỉnh hộp phẳng)
    const alleyRoof = createHipRoofMesh(width + 0.5, depth + 0.5, 1.85, hCfg.isTarget41 ? roofMatGreen : roofMatRed);
    alleyRoof.position.set(x, height, hCfg.z);
    root.add(alleyRoof);

    // Gắn ban công sắt 3D, cửa sổ chớp gỗ, giàn hoa & phào chỉ hướng ra lòng Ngõ 41
    decorateHanoiBuilding3D(root, x, hCfg.z, width, height, depth, floors, hCfg.side < 0 ? 'east' : 'west', idx + 1);

    const facingX = hCfg.side < 0 ? 1 : -1;
    const frontWallX = x + facingX * (width / 2 + 0.08);

    // Cửa cuốn / cửa gỗ tầng 1 kèm mái hiên ngói cổ
    const shutter = new THREE.Mesh(
      new RoundedBoxGeometry(0.16, 2.65, 3.2, 2, 0.025),
      new THREE.MeshStandardMaterial({
        color: hCfg.isTarget41 ? 0x7c2d12 : 0x334155,
        metalness: 0.45,
        roughness: 0.55
      })
    );
    shutter.position.set(frontWallX, 1.42, hCfg.z);
    root.add(shutter);
    [0, 1].forEach(row => [-1, 1].forEach((column, columnIndex) => {
      panelDummy.position.set(frontWallX + facingX * .12, .82 + row * 1.18, hCfg.z + column * .7);
      panelDummy.rotation.set(0, 0, 0);
      panelDummy.updateMatrix();
      doorPanels.setMatrixAt(idx * 4 + row * 2 + columnIndex, panelDummy.matrix);
    }));
    panelDummy.position.set(frontWallX + facingX * .19, 1.22, hCfg.z + .1);
    panelDummy.rotation.y = Math.PI / 2;
    panelDummy.updateMatrix(); doorHandles.setMatrixAt(idx, panelDummy.matrix);

    const doorCanopy = new THREE.Mesh(
      new RoundedBoxGeometry(0.85, 0.14, 3.8, 2, 0.03),
      hCfg.isTarget41 ? roofMatGreen : roofMatRed
    );
    doorCanopy.position.set(frontWallX + facingX * 0.38, 2.92, hCfg.z);
    doorCanopy.rotation.z = -facingX * 0.18;
    root.add(doorCanopy);

    // Biển số nhà màu xanh trắng chuẩn Hà Nội gắn cạnh cửa từng nhà
    const plate = createVietnameseAddressPlate(hCfg.num, hCfg.sub, hCfg.isTarget41);
    plate.position.set(frontWallX + facingX * 0.12, 2.55, hCfg.z + 2.2);
    plate.rotation.y = facingX > 0 ? Math.PI / 2 : -Math.PI / 2;
    root.add(plate);

    // Nếu là CĂN NHÀ SỐ 41 mục tiêu: thêm đèn hiên vàng rực rỡ + nhãn nổi 3D trên cao để dễ tìm từ xa
    if (hCfg.isTarget41) {
      const porchBulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 14, 10),
        new THREE.MeshStandardMaterial({ color: 0xfffbeb, emissive: 0xfacc15, emissiveIntensity: 3.5 })
      );
      porchBulb.position.set(frontWallX + facingX * 0.25, 3.45, hCfg.z);
      root.add(porchBulb);

      const porchLight = new THREE.PointLight(0xfde047, 24, 16, 1.35);
      porchLight.position.set(frontWallX + facingX * 0.65, 3.35, hCfg.z);
      root.add(porchLight);

      const floatingHouse41Label = createNPCLabel('🏠 NHÀ SỐ 41 · NGÕ 41 PHÚ THƯỢNG', '#facc15');
      floatingHouse41Label.position.set(frontWallX + facingX * 0.5, 4.25, hCfg.z);
      floatingHouse41Label.scale.set(4.5, 0.88, 1);
      root.add(floatingHouse41Label);
      houseNumberSprites.push(floatingHouse41Label);
    }

    for (let floor = 1; floor < Math.floor(height / 3); floor++) {
      const windowMesh = new THREE.Mesh(
        new RoundedBoxGeometry(0.13, 1.5, 1.7, 2, 0.02),
        new THREE.MeshStandardMaterial({
          color: 0x293f42,
          emissive: hCfg.isTarget41 ? 0xb08d53 : 0x34483f,
          emissiveIntensity: hCfg.isTarget41 ? 0.23 : 0.06,
          roughness: 0.19,
          metalness: 0.15,
          envMapIntensity: .75
        })
      );
      windowMesh.position.set(frontWallX, floor * 3.05 + 1.05, hCfg.z + (floor % 2 ? -1.6 : 1.5));
      root.add(windowMesh);
    }
  });

  doorPanels.castShadow = true;
  root.add(doorPanels, doorHandles);
  const wallCaps = new THREE.InstancedMesh(new THREE.CylinderGeometry(.22, .22, 1, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x786956, roughness: .92, envMapIntensity: .15 }), 2);
  [[-84.5, 3.33, -34.1, 21.8], [-80.2, 2.93, -40.8, 9.5]].forEach(([x, y, z, length], i) => {
    panelDummy.position.set(x, y, z); panelDummy.rotation.set(0, 0, 0); panelDummy.scale.set(length, 1, 1);
    panelDummy.updateMatrix(); wallCaps.setMatrixAt(i, panelDummy.matrix);
  });
  root.add(wallCaps);

  // Chi tiết tỉ lệ người thật: ống thoát nước, đồng hồ điện, dây phơi, chậu cây,
  // dép trước cửa và vũng nước. Các đường cong/cylinder phá vỡ silhouette khối hộp.
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x667176, metalness: 0.5, roughness: 0.55 });
  const meterMat = new THREE.MeshStandardMaterial({ color: 0x273238, metalness: 0.38, roughness: 0.5 });
  [-70.25, -63.75].forEach((px, sideIndex) => {
    [-15, -27, -42].forEach((pz, itemIndex) => {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 5.7, 10), pipeMat);
      pipe.position.set(px, 2.85, pz + sideIndex * 0.7);
      pipe.castShadow = true;
      root.add(pipe);
      const elbow = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 8, 16, Math.PI / 2), pipeMat);
      elbow.position.set(px + (sideIndex ? -0.13 : 0.13), 0.18, pz + sideIndex * 0.7);
      elbow.rotation.set(Math.PI / 2, 0, sideIndex ? Math.PI : 0);
      root.add(elbow);
      const meter = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.48, 0.18, 2, 0.025), meterMat);
      meter.position.set(px + (sideIndex ? -0.12 : 0.12), 1.45, pz + 0.75);
      root.add(meter);
      if ((itemIndex + sideIndex) % 2 === 0) {
        const pot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.18, 0.38, 14),
          archMaterials.terracottaPot
        );
        pot.position.set(px + (sideIndex ? -0.42 : 0.42), 0.2, pz - 0.55);
        root.add(pot);
        const plant = new THREE.Mesh(foliageGeometry(.32), archMaterials.foliageGreen);
        plant.scale.set(0.75, 1.35, 0.75);
        plant.position.set(pot.position.x, 0.67, pot.position.z);
        root.add(plant);
      }
    });
  });

  horrorSetPieces.puddleRipples = [];
  [-20.5, -33.0, -46.0].forEach((pz, index) => {
    const puddle = new THREE.Mesh(
      new THREE.CircleGeometry(0.85 + index * 0.13, 28),
      new THREE.MeshPhysicalMaterial({
        color: 0x334155,
        roughness: 0.15,
        metalness: 0,
        clearcoat: .65,
        clearcoatRoughness: 0.14,
        transparent: true,
        opacity: 0.52
      })
    );
    puddle.rotation.x = -Math.PI / 2;
    puddle.scale.set(0.55, 1.65, 1);
    puddle.position.set(-66.6 + (index % 2) * 0.75, 0.052, pz);
    root.add(puddle);

    // Vòng gợn sóng hạt mưa rơi trên vũng nước (Puddle Ripples)
    const ripple = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.208, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: 0xcbd5e1,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    ripple.position.set(puddle.position.x, 0.056, pz);
    root.add(ripple);
    horrorSetPieces.puddleRipples.push(ripple);
  });

  [-25, -41].forEach((pz, lineIndex) => {
    const lineCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-70.2, 6.0 + lineIndex * 0.3, pz),
      new THREE.Vector3(-67, 5.45 + lineIndex * 0.2, pz + 0.2),
      new THREE.Vector3(-63.8, 5.9 + lineIndex * 0.3, pz)
    ]);
    root.add(new THREE.Mesh(new THREE.TubeGeometry(lineCurve, 18, 0.012, 5, false), new THREE.MeshBasicMaterial({ color: 0x17191a })));
    [-1.6, -0.5, 0.75].forEach((offset, clothIndex) => {
      const cloth = new THREE.Mesh(
        new THREE.PlaneGeometry(0.72, 0.9),
        new THREE.MeshStandardMaterial({ color: [0x8b2f34, 0xc6b38e, 0x315b72][clothIndex], side: THREE.DoubleSide, roughness: 0.92 })
      );
      cloth.position.set(-67 + offset, 5.05, pz + 0.1);
      cloth.rotation.y = 0.06 * clothIndex;
      root.add(cloth);
    });
  });

  // Cổng chào Ngõ 41 Phú Thượng ngay mặt phố chính (x = -67, z = -8.2)
  [-69.6, -64.4].forEach((px) => {
    const pillar = new THREE.Mesh(
      new RoundedBoxGeometry(0.65, 4.1, 0.65, 2, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.78 })
    );
    pillar.position.set(px, 2.05, -8.2);
    root.add(pillar);
  });
  const lintel = new THREE.Mesh(
    new RoundedBoxGeometry(6.1, 0.82, 0.65, 2, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.75 })
  );
  lintel.position.set(-67, 4.15, -8.2);
  root.add(lintel);
  const alleySign = createNPCLabel('🏮 CỔNG NGÕ 41 · PHỐ PHÚ THƯỢNG', '#facc15');
  alleySign.position.set(-67, 4.2, -7.75);
  alleySign.scale.set(4.8, 0.88, 1);
  root.add(alleySign);
  houseNumberSprites.push(alleySign);

  // Dây điện chùng, đồng hồ điện và đồ phơi giúp ngõ có cảm giác đã được sinh hoạt lâu năm.
  [-22, -34, -46].forEach((z, index) => {
    const cable = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-71, 7.2 + index * 0.18, z),
      new THREE.Vector3(-67, 6.25 + index * 0.12, z - 0.4),
      new THREE.Vector3(-63, 7.0 + index * 0.16, z)
    ]);
    const cableMesh = new THREE.Mesh(
      new THREE.TubeGeometry(cable, 18, 0.025, 5, false),
      new THREE.MeshBasicMaterial({ color: 0x111416 })
    );
    root.add(cableMesh);
  });

  // Hộp cầu dao điện ở z = -37 (Step 3 của cốt truyện) có đèn báo đỏ/vàng nổi bật
  const breakerBox = new THREE.Mesh(
    new RoundedBoxGeometry(0.28, 0.52, 0.36, 2, 0.03),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xd97706, emissiveIntensity: 0.85, roughness: 0.4 })
  );
  breakerBox.position.set(-64.25, 1.55, -37.0);
  root.add(breakerBox);

  [-13, -25, -37, -48].forEach((z, index) => {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.075, 5.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x41484a, metalness: 0.6, roughness: 0.45 })
    );
    pole.position.set(index % 2 ? -69.15 : -64.85, 2.7, z);
    root.add(pole);
    const tube = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.085, 0.09),
      new THREE.MeshStandardMaterial({ color: 0xd7e7d9, emissive: 0xb9ddc1, emissiveIntensity: 0.65 })
    );
    tube.position.set(pole.position.x + (index % 2 ? 0.3 : -0.3), 5.12, z);
    root.add(tube);
    let light = null;
    if (index === 1 || index === 3) {
      light = new THREE.PointLight(0xfffbeb, 15, 22, 1.4);
      light.position.copy(tube.position);
      root.add(light);
    }
    horrorStreetLights.push({ light, tube, phase: index * 1.73, broken: index === 2 });
  });

  const altar = new THREE.Group();
  const altarTable = new THREE.Mesh(
    new RoundedBoxGeometry(1.25, 0.72, 0.58, 3, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x582f24, roughness: 0.72 })
  );
  altarTable.position.y = 0.36;
  altar.add(altarTable);
  const portrait = new THREE.Mesh(
    new RoundedBoxGeometry(0.52, 0.68, 0.08, 2, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x171719, roughness: 0.55 })
  );
  portrait.position.set(0, 1.08, 0.08);
  altar.add(portrait);
  const incense = new THREE.PointLight(0xe25832, 0, 8, 1.5);
  incense.position.set(0, 1.0, 0.48);
  altar.add(incense);

  // Giếng cổ đá ong bị niêm phong bằng dây bùa đỏ ngay cạnh bàn thờ cuối Ngõ 41 (nơi phát ra Tiếng Gọi đêm 26/10/2008)
  const wellRim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.78, 0.84, 0.62, 16, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.92, side: THREE.DoubleSide })
  );
  wellRim.position.set(1.35, 0.31, 0.25);
  altar.add(wellRim);
  const wellCover = new THREE.Mesh(
    new THREE.CylinderGeometry(0.76, 0.76, 0.08, 16),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 })
  );
  wellCover.position.set(1.35, 0.6, 0.25);
  altar.add(wellCover);
  const redTalisman = new THREE.Mesh(
    new THREE.PlaneGeometry(1.35, 0.16).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xdc2626, side: THREE.DoubleSide })
  );
  redTalisman.position.set(1.35, 0.65, 0.25);
  altar.add(redTalisman);

  altar.position.set(-67, 0.08, -48.4);
  altar.visible = false;
  root.add(altar);
  horrorSetPieces.altarGlow = incense;
  horrorSetPieces.altar = altar;

  // Ba ký ức tùy chọn nằm trong môi trường (sử dụng vòng hào quang phát sáng thay vì PointLight để mượt 60 FPS)
  const clueSpecs = [
    { id: 'photo', title: 'Ảnh hai anh em bên giếng cổ (2008)', x: -69.1, z: -22.4, color: 0xfacc15, kind: 'photo' },
    { id: 'marble', title: 'Viên bi ve xanh của An & Bùa chỉ đỏ', x: -65.35, z: -39.6, color: 0x38bdf8, kind: 'marble' },
    { id: 'badge', title: 'Phù hiệu cháy xém & Biên bản Phú Gia', x: -68.55, z: -45.2, color: 0xf87171, kind: 'badge' }
  ];
  clueSpecs.forEach((spec, index) => {
    const clue = new THREE.Group();
    let mesh;
    if (spec.kind === 'photo') {
      mesh = new THREE.Mesh(
        new RoundedBoxGeometry(0.48, 0.035, 0.34, 2, 0.015),
        new THREE.MeshStandardMaterial({ color: spec.color, emissive: spec.color, emissiveIntensity: 0.45, roughness: 0.6 })
      );
      mesh.rotation.y = 0.28;
    } else if (spec.kind === 'marble') {
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 14, 10),
        new THREE.MeshStandardMaterial({ color: spec.color, emissive: spec.color, emissiveIntensity: 0.65, roughness: 0.2 })
      );
    } else {
      mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.04, 8),
        new THREE.MeshStandardMaterial({ color: spec.color, emissive: spec.color, emissiveIntensity: 0.5, metalness: 0.4, roughness: 0.4 })
      );
      mesh.rotation.x = Math.PI / 2;
    }
    mesh.position.y = 0.12;
    clue.add(mesh);

    const clueHalo = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.38, 20).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: spec.color, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
    );
    clueHalo.position.y = 0.02;
    clue.add(clueHalo);

    clue.position.set(spec.x, 0.06, spec.z);
    clue.userData = { ...spec, collected: false, index, halo: clueHalo };
    clue.visible = false;
    root.add(clue);
    horrorSetPieces.clues.push(clue);
  });

  const door = new THREE.Mesh(
    new RoundedBoxGeometry(0.16, 3.25, 2.25, 3, 0.035),
    new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.75 })
  );
  door.position.set(-69.85, 1.66, -29.2);
  root.add(door);
  horrorSetPieces.door = door;

  // ==========================================================================
  // MÔ HÌNH 3D THỰC THỂ KINH DỊ: “KẺ BẮT CHƯỚC GIỌNG NGƯỜI THÂN” (THE VOICE MIMIC)
  // ==========================================================================
  const entity = new THREE.Group();
  const darkBodyMat = new THREE.MeshStandardMaterial({ color: 0x090a0f, roughness: 0.92 });
  const tatteredRaincoatMat = new THREE.MeshStandardMaterial({
    color: 0xa16207,
    emissive: 0x422006,
    emissiveIntensity: 0.25,
    roughness: 0.85,
    side: THREE.DoubleSide
  });
  const eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xff1e1e });

  // Thân hình cao gầy bất thường + Áo mưa vàng rách tả tơi dính bùn giếng cổ
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.45, 5, 10), darkBodyMat);
  torso.position.y = 1.32;
  entity.add(torso);

  const raincoatShroud = new THREE.Mesh(new THREE.ConeGeometry(0.58, 1.65, 9, 1, true), tatteredRaincoatMat);
  raincoatShroud.position.y = 1.25;
  entity.add(raincoatShroud);

  // Đầu thực thể nghiêng vẹo kỳ dị + Đôi mắt hốc sâu đỏ rực + Miệng há dài
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 2.28, 0.06);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), darkBodyMat);
  head.scale.set(0.88, 1.18, 0.92);
  headGroup.add(head);

  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.55, 8), tatteredRaincoatMat);
  hood.position.set(0, 0.14, -0.02);
  headGroup.add(hood);

  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), eyeGlowMat);
  leftEye.position.set(-0.085, 0.04, 0.22);
  const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), eyeGlowMat);
  rightEye.position.set(0.085, 0.04, 0.22);
  headGroup.add(leftEye, rightEye);

  const jaw = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.16, 0.05),
    new THREE.MeshBasicMaterial({ color: 0x450a0a })
  );
  jaw.position.set(0, -0.11, 0.22);
  headGroup.add(jaw);
  entity.add(headGroup);

  // Chiếc ống nghe điện thoại bàn cũ treo lủng lẳng trước ngực phát sáng đỏ
  const phoneReceiver = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.08, 0.08),
    new THREE.MeshBasicMaterial({ color: 0xdc2626 })
  );
  phoneReceiver.position.set(0, 1.62, 0.33);
  phoneReceiver.rotation.z = 0.35;
  entity.add(phoneReceiver);

  // Hai cánh tay dài ngoằng có khớp giật cục
  const arms = [];
  [-1, 1].forEach((side) => {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 1.42, 4, 8), darkBodyMat);
    arm.position.set(side * 0.42, 1.28, 0.08);
    arm.rotation.z = side * 0.16;
    entity.add(arm);
    arms.push(arm);
  });

  // Vòng hào quang đỏ thẫm dưới chân thực thể
  const entityHalo = new THREE.Mesh(
    new THREE.RingGeometry(0.45, 0.85, 24).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xdc2626, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
  );
  entityHalo.position.y = 0.03;
  entity.add(entityHalo);

  entity.userData = { headGroup, arms, leftEye, rightEye, eyeGlowMat, entityHalo };
  entity.position.set(-67, 0, -49);
  entity.visible = false;
  root.add(entity);
  horrorSetPieces.entity = entity;

  // ==========================================================================
  // MÔ HÌNH 3D ẢO ẢNH: “BÓNG CẬU BÉ ÁO MƯA VÀNG CẦM BÓNG BAY ĐỎ” (APPARITION)
  // ==========================================================================
  const apparition = new THREE.Group();
  const yellowCoatMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xca8a04,
    emissiveIntensity: 0.45,
    transparent: true,
    opacity: 0.88,
    roughness: 0.6
  });
  const childCoat = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.12, 10), yellowCoatMat);
  childCoat.position.y = 0.62;
  apparition.add(childCoat);

  const childHood = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 10), yellowCoatMat);
  childHood.position.y = 1.26;
  apparition.add(childHood);

  const childFace = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0x020617 })
  );
  childFace.position.set(0, 1.25, 0.07);
  apparition.add(childFace);

  // Quả bóng bay màu đỏ máu lơ lửng trên tay cậu bé áo mưa vàng
  const redBalloon = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 14, 12),
    new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xb91c1c, emissiveIntensity: 0.75, roughness: 0.2 })
  );
  redBalloon.scale.set(0.92, 1.12, 0.92);
  redBalloon.position.set(0.32, 1.88, 0.12);
  apparition.add(redBalloon);

  const balloonString = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.85, 6),
    new THREE.MeshBasicMaterial({ color: 0xfecaca })
  );
  balloonString.position.set(0.28, 1.38, 0.1);
  balloonString.rotation.z = -0.1;
  apparition.add(balloonString);

  apparition.userData = { redBalloon };
  apparition.visible = false;
  root.add(apparition);
  horrorSetPieces.apparition = apparition;

  const rainGeo = new THREE.BufferGeometry();
  const rainPositions = new Float32Array(780 * 3);
  for (let i = 0; i < 780; i++) {
    rainPositions[i * 3] = (Math.random() - 0.5) * 44;
    rainPositions[i * 3 + 1] = Math.random() * 24;
    rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 58;
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rain = new THREE.Points(
    rainGeo,
    new THREE.PointsMaterial({ color: 0xa9c6d4, size: 0.055, transparent: true, opacity: 0.62, depthWrite: false })
  );
  rain.visible = false;
  scene.add(rain);
  horrorSetPieces.rain = rain;
}

function buildVietnameseFoodStall() {
  const root = new THREE.Group();
  root.name = 'QuanXoiCoHoa';
  storyFoodStall.root = root;
  worldGroup.add(root);

  const tileCanvas = document.createElement('canvas');
  tileCanvas.width = 256;
  tileCanvas.height = 256;
  const tileCtx = tileCanvas.getContext('2d');
  tileCtx.fillStyle = '#d8d0bd';
  tileCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const ox = x * 64;
      const oy = y * 64;
      tileCtx.strokeStyle = '#575f58';
      tileCtx.lineWidth = 2;
      tileCtx.strokeRect(ox + 1, oy + 1, 62, 62);
      tileCtx.fillStyle = (x + y) % 2 ? '#607267' : '#8a6557';
      tileCtx.beginPath();
      tileCtx.arc(ox + 32, oy + 32, 11, 0, Math.PI * 2);
      tileCtx.fill();
      tileCtx.strokeStyle = '#eee4cb';
      tileCtx.lineWidth = 5;
      tileCtx.beginPath();
      tileCtx.moveTo(ox + 10, oy + 32);
      tileCtx.lineTo(ox + 32, oy + 10);
      tileCtx.lineTo(ox + 54, oy + 32);
      tileCtx.lineTo(ox + 32, oy + 54);
      tileCtx.closePath();
      tileCtx.stroke();
    }
  }
  // Fine scuffs and worn pigment; a cement tile is about 25 cm, not a metre-wide motif.
  for (let i = 0; i < 1800; i++) {
    tileCtx.fillStyle = i % 3 ? 'rgba(70,64,48,.035)' : 'rgba(229,220,197,.14)';
    tileCtx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1);
  }
  const tileTexture = new THREE.CanvasTexture(tileCanvas);
  tileTexture.wrapS = tileTexture.wrapT = THREE.RepeatWrapping;
  tileTexture.repeat.set(9, 7);
  tileTexture.colorSpace = THREE.SRGBColorSpace;
  const floorScan = visualMaterials.concrete();
  const tileMat = new THREE.MeshStandardMaterial({ map: tileTexture, normalMap: floorScan.normalMap, normalScale: new THREE.Vector2(.22, .22), roughnessMap: floorScan.roughnessMap, roughness: .85, envMapIntensity: .28 });
  const greenWall = visualMaterials.plaster(0x9bb4a0);
  const agedGreen = visualMaterials.plaster(0x617d6f);
  const steel = new THREE.MeshStandardMaterial({ color: 0xc0c4bd, metalness: 0.86, roughness: 0.38, envMapIntensity: .65 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xc7e5df,
    transparent: true,
    opacity: 0.09,
    depthWrite: false,
    roughness: 0.16,
    metalness: 0.04,
    side: THREE.DoubleSide
  });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 7.2).rotateX(-Math.PI / 2), tileMat);
  floor.position.set(-90, 0.075, -42);
  floor.receiveShadow = true;
  root.add(floor);

  const backWall = new THREE.Mesh(worldUVs(new THREE.BoxGeometry(9.2, 4.5, 0.28), 2.5), greenWall);
  backWall.position.set(-90, 2.25, -45.45);
  root.add(backWall);
  addBoxCollider(-90, -45.45, 9.2, 0.35);
  [-94.45, -85.55].forEach((x) => {
    const sideWall = new THREE.Mesh(worldUVs(new THREE.BoxGeometry(0.28, 4.5, 7.1), 2.5), agedGreen);
    sideWall.position.set(x, 2.25, -42);
    root.add(sideWall);
    addBoxCollider(x, -42, 0.34, 7.1);
  });

  // Mặt tiền kín với một cửa ra vào thật ở giữa. Trước đây toàn bộ mặt trước bị bỏ
  // trống nên chỉ cần quay camera là nhìn xuyên ra phần hậu cảnh chưa hoàn thiện.
  [
    { x: -92.95, width: 3.0 },
    { x: -87.05, width: 3.0 }
  ].forEach(({ x, width }) => {
    const frontWall = new THREE.Mesh(worldUVs(new THREE.BoxGeometry(width, 4.5, 0.28), 2.5), agedGreen);
    frontWall.position.set(x, 2.25, -38.48);
    frontWall.castShadow = true;
    frontWall.receiveShadow = true;
    root.add(frontWall);
    addBoxCollider(x, -38.48, width, 0.36);
  });
  const doorLintel = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.15, 0.32), greenWall);
  doorLintel.position.set(-90, 3.93, -38.47);
  root.add(doorLintel);
  const awningGeometry = new THREE.PlaneGeometry(4, 1.15, 64, 2).rotateX(-Math.PI / 2);
  for (let i = 0; i < awningGeometry.attributes.position.count; i++) {
    awningGeometry.attributes.position.setY(i, Math.sin(awningGeometry.attributes.position.getX(i) * 25) * .018);
  }
  awningGeometry.computeVertexNormals();
  const awning = new THREE.Mesh(awningGeometry, new THREE.MeshStandardMaterial({ color: 0x76594b, roughness: .75, metalness: .28, side: THREE.DoubleSide }));
  awning.castShadow = true;
  awning.position.set(-90, 3.25, -37.95);
  awning.rotation.x = -0.08;
  root.add(awning);
  const ceiling = new THREE.Mesh(
    new THREE.BoxGeometry(9.2, 0.22, 7.2),
    new THREE.MeshStandardMaterial({ color: 0x5c4939, roughness: 0.94 })
  );
  ceiling.position.set(-90, 4.48, -42);
  root.add(ceiling);

  // Cột tròn, chân tường gốm và xà gỗ phá đường viền hình hộp của gian quán.
  const timberMat = visualMaterials.wood;
  const ceramicMat = new THREE.MeshStandardMaterial({ color: 0x315c58, roughness: 0.68 });
  [[-94.25, -45.18], [-85.75, -45.18], [-94.25, -38.72], [-85.75, -38.72]].forEach(([px, pz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 4.25, 12), timberMat);
    post.position.set(px, 2.13, pz);
    post.castShadow = true;
    root.add(post);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.27, 0.38, 14), ceramicMat);
    base.position.set(px, 0.19, pz);
    root.add(base);
  });
  [-93.2, -90, -86.8].forEach((px) => {
    const rafter = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 6.75, 10), timberMat);
    rafter.position.set(px, 4.28, -42);
    rafter.rotation.x = Math.PI / 2;
    root.add(rafter);
  });
  const skirting = new THREE.Mesh(new RoundedBoxGeometry(8.7, 0.46, 0.18, 2, 0.025), ceramicMat);
  skirting.position.set(-90, 0.24, -45.25);
  root.add(skirting);

  const counter = new THREE.Group();
  const counterBase = new THREE.Mesh(new RoundedBoxGeometry(5.6, 0.92, 0.82, 3, 0.04), steel);
  counterBase.position.y = 0.46;
  counter.add(counterBase);
  const glassCase = new THREE.Mesh(new THREE.PlaneGeometry(5.35, 0.92), glass);
  glassCase.position.set(0, 1.48, 0.37);
  counter.add(glassCase);
  [-2.62, 0, 2.62].forEach((x) => {
    const support = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.02, 0.035), steel);
    support.position.set(x, 1.45, 0.36);
    counter.add(support);
  });
  const caseTop = new THREE.Mesh(new THREE.BoxGeometry(5.42, 0.045, 0.74), steel);
  caseTop.position.set(0, 1.95, 0);
  counter.add(caseTop);
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(5.35, 0.045, 0.66), steel);
  shelf.position.set(0, 1.22, 0);
  counter.add(shelf);
  const upperShelf = shelf.clone();
  upperShelf.position.y = 1.70;
  counter.add(upperShelf);
  const cabinetTrim = new THREE.InstancedMesh(new THREE.BoxGeometry(.018, .77, .025), new THREE.MeshStandardMaterial({ color: 0x37433f, metalness: .5, roughness: .55 }), 5);
  const cabinetDummy = new THREE.Object3D();
  for (let i = 0; i < 5; i++) {
    cabinetDummy.position.set(-2.05 + i * 1.03, .47, .426);
    cabinetDummy.updateMatrix(); cabinetTrim.setMatrixAt(i, cabinetDummy.matrix);
  }
  counter.add(cabinetTrim);
  const handles = new THREE.InstancedMesh(new THREE.TorusGeometry(.065, .012, 6, 12, Math.PI), steel, 4);
  for (let i = 0; i < 4; i++) {
    cabinetDummy.position.set(-1.55 + i * 1.03, .7, .45);
    cabinetDummy.rotation.z = Math.PI / 2;
    cabinetDummy.updateMatrix(); handles.setMatrixAt(i, cabinetDummy.matrix);
  }
  counter.add(handles);
  const grains = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ color: 0xf0ddba, roughness: .87 }), 216);
  const grainDummy = new THREE.Object3D();
  const bowlMat = new THREE.MeshStandardMaterial({ color: 0xf0eadc, roughness: 0.58 });
  const foodColors = [0xd6c29c, 0xe5c94d, 0x8d5b3f, 0x608b4a, 0xd7a26a, 0xb8493d];
  for (let i = 0; i < 9; i++) {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.14, 18), bowlMat);
    bowl.position.set(-2.1 + (i % 5) * 1.02, 1.28 + Math.floor(i / 5) * 0.48, i < 5 ? -0.18 : 0.08);
    counter.add(bowl);
    const food = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: foodColors[i % foodColors.length], roughness: 0.86 })
    );
    food.position.set(bowl.position.x, bowl.position.y + 0.09, bowl.position.z);
    food.scale.y = .55;
    counter.add(food);
    for (let grainIndex = 0; grainIndex < 24; grainIndex++) {
      const angle = grainIndex * 2.39996;
      const radius = .155 * Math.sqrt((grainIndex + .5) / 24);
      grainDummy.position.set(bowl.position.x + Math.cos(angle) * radius, bowl.position.y + .115 + .045 * (1 - radius / .17), bowl.position.z + Math.sin(angle) * radius);
      grainDummy.rotation.y = angle;
      grainDummy.scale.set(.023, .009, .008);
      grainDummy.updateMatrix(); grains.setMatrixAt(i * 24 + grainIndex, grainDummy.matrix);
    }
  }
  counter.add(grains);
  counter.position.set(-90, 0.08, -43.35);
  root.add(counter);
  addBoxCollider(-90, -43.35, 5.8, 1.05);

  // Bộ nồi hấp xôi, rá tre và vật dụng bếp tạo điểm nhìn có hình khối cong ngay giữa quán.
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x59615e, metalness: 0.72, roughness: 0.34 });
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0xb3874d, roughness: 0.84 });
  const steamer = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.39, 0.62, 24), darkSteel);
  pot.position.y = 0.31;
  steamer.add(pot);
  const potRim = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.035, 8, 24), darkSteel);
  potRim.rotation.x = Math.PI / 2;
  potRim.position.y = 0.62;
  steamer.add(potRim);
  const lid = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), darkSteel);
  lid.scale.y = 0.42;
  lid.position.y = 0.66;
  steamer.add(lid);
  const lidHandle = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 7, 14, Math.PI), darkSteel);
  lidHandle.rotation.z = Math.PI / 2;
  lidHandle.position.y = 0.87;
  steamer.add(lidHandle);

  // Làn khói hơi xôi nóng hổi bốc lên từ nồi hấp Xôi Phú Thượng
  storyFoodStall.steamWisps = [];
  for (let sw = 0; sw < 3; sw++) {
    const wisp = new THREE.Sprite(new THREE.SpriteMaterial({ map: visualMaterials.steamMap, color: 0xdce6dd, transparent: true, opacity: .2, depthWrite: false, fog: true }));
    wisp.position.set(0, 0.92 + sw * 0.28, 0);
    steamer.add(wisp);
    storyFoodStall.steamWisps.push(wisp);
  }
  steamer.position.set(-92.25, 1.02, -43.12);
  root.add(steamer);

  const basketProfile = [[.02, 0], [.28, 0], [.34, .04], [.41, .16], [.42, .2]].map(([x, y]) => new THREE.Vector2(x, y));
  const wovenBasket = new THREE.Mesh(new THREE.LatheGeometry(basketProfile, 24), bambooMat);
  wovenBasket.position.set(-87.85, 1.04, -43.15);
  root.add(wovenBasket);
  for (let i = 0; i < 4; i++) {
    const utensil = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.92, 7), darkSteel);
    utensil.position.set(-93.45 + i * 0.22, 2.62 - (i % 2) * 0.12, -45.08);
    root.add(utensil);
    const utensilHead = new THREE.Mesh(
      i % 2 ? new THREE.TorusGeometry(0.1, 0.018, 7, 14) : new THREE.CircleGeometry(0.1, 14),
      darkSteel
    );
    utensilHead.position.set(utensil.position.x, 2.1 - (i % 2) * 0.12, -45.05);
    root.add(utensilHead);
  }

  const bluePlastic = new THREE.MeshStandardMaterial({ color: 0x285669, roughness: .64, envMapIntensity: .3 });
  const furnitureLegs = new THREE.InstancedMesh(new THREE.CylinderGeometry(.032, .047, .65, 8), bluePlastic, 24);
  const stoolSeats = new THREE.InstancedMesh(new THREE.CylinderGeometry(.245, .26, .065, 20), bluePlastic, 4);
  const furnitureDummy = new THREE.Object3D();
  let legIndex = 0, seatIndex = 0;
  [[-93, -39.6], [-87, -39.6]].forEach(([tableX, tableZ]) => {
    const table = new THREE.Mesh(new RoundedBoxGeometry(1.25, 0.11, 0.8, 3, 0.035), bluePlastic);
    table.position.set(tableX, 0.72, tableZ);
    root.add(table);
    [-1, 1].forEach(sx => [-1, 1].forEach(sz => {
      furnitureDummy.position.set(tableX + sx * .43, .35, tableZ + sz * .23);
      furnitureDummy.rotation.set(sz * .1, 0, -sx * .1);
      furnitureDummy.scale.set(1, 1, 1);
      furnitureDummy.updateMatrix(); furnitureLegs.setMatrixAt(legIndex++, furnitureDummy.matrix);
    }));
    [-0.85, 0.85].forEach((side) => {
      furnitureDummy.position.set(tableX + side, .43, tableZ);
      furnitureDummy.rotation.set(0, 0, 0); furnitureDummy.scale.set(1, 1, 1);
      furnitureDummy.updateMatrix(); stoolSeats.setMatrixAt(seatIndex++, furnitureDummy.matrix);
      [-1, 1].forEach(sx => [-1, 1].forEach(sz => {
        furnitureDummy.position.set(tableX + side + sx * .14, .21, tableZ + sz * .14);
        furnitureDummy.rotation.set(sz * .14, 0, -sx * .14);
        furnitureDummy.scale.set(.8, .58, .8);
        furnitureDummy.updateMatrix(); furnitureLegs.setMatrixAt(legIndex++, furnitureDummy.matrix);
      }));
    });
  });
  furnitureLegs.castShadow = stoolSeats.castShadow = true;
  root.add(furnitureLegs, stoolSeats);
  [[-90, -43.35, 6.2, 1.8], [-93, -39.6, 1.8, 1.35], [-87, -39.6, 1.8, 1.35]].forEach(([x, z, width, depth]) => {
    const shadow = visualMaterials.contactShadow(width, depth);
    shadow.position.set(x, .084, z);
    root.add(shadow);
  });

  const menu = createNPCLabel('XÔI XÉO 15K · TRÀ ĐÁ 3K · TRỨNG 8K', '#173e35');
  menu.position.set(-90, 3.45, -45.25);
  menu.scale.set(4.7, 0.82, 1);
  root.add(menu);
  const calendar = createNPCLabel('THÁNG 10  ·  26', '#9f2f2f');
  calendar.position.set(-93.35, 2.55, -45.24);
  calendar.scale.set(2.2, 0.92, 1);
  root.add(calendar);

  const fan = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), steel);
  fan.add(hub);
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.05, 0.22, 2, 0.025), steel);
    blade.position.x = 0.55;
    blade.rotation.y = i * Math.PI * 2 / 3;
    fan.add(blade);
  }
  fan.position.set(-90, 4.2, -42);
  fan.rotation.x = Math.PI / 2;
  root.add(fan);
  storyFoodStall.fan = fan;

  const neonShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 ? 0.28 : 0.65;
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) neonShape.moveTo(x, y); else neonShape.lineTo(x, y);
  }
  neonShape.closePath();
  const neon = new THREE.Mesh(
    new THREE.ShapeGeometry(neonShape),
    new THREE.MeshBasicMaterial({ color: 0xff493f, side: THREE.DoubleSide })
  );
  neon.position.set(-86.35, 3.15, -45.25);
  root.add(neon);
  storyFoodStall.neon = neon;
  const warmLight = new THREE.PointLight(0xff9d5c, 28, 13, 1.5);
  warmLight.position.set(-90, 3.35, -41.4);
  warmLight.castShadow = false;
  root.add(warmLight);
  storyFoodStall.warmLight = warmLight;
  const fillLight = new THREE.PointLight(0xc8ddd3, 13, 11, 1.6);
  fillLight.position.set(-90, 2.25, -38.9);
  root.add(fillLight);
  storyFoodStall.fillLight = fillLight;
}

function createPoinsettiaPlanter(x, z) {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.75 });
  const box = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.54, 1.15, 3, 0.04), woodMat);
  box.position.y = 0.27;
  box.castShadow = true;
  g.add(box);

  const bush = new THREE.Mesh(
    new RoundedBoxGeometry(2.0, 0.35, 0.98, 3, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x15803d })
  );
  bush.position.y = 0.62;
  g.add(bush);

  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });
  for (let i = 0; i < 14; i++) {
    const fl = new THREE.Mesh(flowerGeometry(.16), flowerMat);
    fl.position.set((Math.random() - 0.5) * 1.7, 0.84, (Math.random() - 0.5) * 0.75);
    g.add(fl);
  }
  g.position.set(x, 0.18, z);
  worldGroup.add(g);
  addBoxCollider(x, z, 2.3, 1.25);
}

function createDetailedCar(x, z, rotY, colorHex, isSUV, moving=false) {
  const car = new THREE.Group();car.userData.modelFamily='car';car.userData.staticBatch=true;
  const paintMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    metalness: 0.75,
    roughness: 0.22
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.9,
    roughness: 0.1
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.2 });
  const wheels=[];

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 2.2).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38 })
  );
  shadow.position.y = 0.02;
  car.add(shadow);

  const len = isSUV ? 4.45 : 4.15;
  const h = isSUV ? 0.78 : 0.66;
  const lowerBody = new THREE.Mesh(carCoachwork(len, h, 1.74), paintMat);
  lowerBody.position.y = 0.62;
  lowerBody.castShadow = true;
  lowerBody.receiveShadow = true;
  car.add(lowerBody);

  const cabinLen = isSUV ? 2.75 : 2.15;
  const cabinH = isSUV ? 0.68 : 0.58;
  const cabin = new THREE.Mesh(carCoachwork(cabinLen, cabinH, 1.48, true), glassMat);
  cabin.position.set(isSUV ? -0.15 : -0.1, 0.62 + h * 0.76, 0);
  cabin.castShadow = true;
  car.add(cabin);

  const roof = new THREE.Mesh(carCoachwork(cabinLen * 0.72, 0.085, 1.24), paintMat);
  roof.position.set(isSUV ? -0.15 : -0.1, 0.62 + h * 0.76 + cabinH * 0.5, 0);
  car.add(roof);

  const trimMat = new THREE.MeshStandardMaterial({color:0x3e4545,roughness:.65,metalness:.35});
  for(const side of [-1,1]){
    const pillar=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,cabinH*.8,8),paintMat);
    pillar.position.set(-.15,0.62+h*.76,side*.73);car.add(pillar);
    const sill=new THREE.Mesh(new THREE.CapsuleGeometry(.025,cabinLen*.8,2,8).rotateZ(Math.PI/2),trimMat);
    sill.position.set(-.1,.88,side*.85);car.add(sill);
    for(const doorX of [-.55,.45]){
      const handle=new THREE.Mesh(new THREE.CapsuleGeometry(.018,.13,2,7).rotateZ(Math.PI/2),rimMat);
      handle.position.set(doorX,.85,side*.89);car.add(handle);
    }
    for(const front of [-1,1]){
      const lens=new THREE.Mesh(new THREE.SphereGeometry(.11,12,8),new THREE.MeshStandardMaterial({color:front>0?0xe0e0cb:0x933d35,roughness:.35}));
      lens.scale.set(.35,.58,1.15);lens.position.set(front*(len/2-.025),.70,side*.55);car.add(lens);
    }
  }

  [
    [-1.3, -0.88],
    [1.3, -0.88],
    [-1.3, 0.88],
    [1.3, 0.88]
  ].forEach(([wx, wz]) => {
    const wheelGroup = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 16), tireMat);
    tire.rotation.x = Math.PI / 2;
    wheelGroup.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.25, 12), rimMat);
    rim.rotation.x = Math.PI / 2;
    wheelGroup.add(rim);

    wheelGroup.position.set(wx, 0.36, wz);
    car.add(wheelGroup);
    wheels.push(wheelGroup);
  });

  car.position.set(x, 0.12, z);
  car.rotation.y = rotY;
  worldGroup.add(car);
  // Khối va chạm cho 4 chiếc ô tô đỗ trước cổng THPT Tây Hồ
  if(!moving)addBoxCollider(x, z, len + 0.15, 2.05);
  else {
    const shell=new THREE.Group();shell.userData.staticBatch=true;
    for(const child of [...car.children])if(!wheels.includes(child))shell.add(child);
    car.add(shell);car.userData.staticBatch=false;
  }
  car.userData.wheels=wheels;return car;
}

function buildDetailedTeaStall(x, z) {
  const g = new THREE.Group();g.userData.staticBatch=true;
  g.position.set(x, 0.18, z);

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 2.75, 10),
    new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7 })
  );
  pole.position.y = 1.38;
  g.add(pole);

  const canopy = new THREE.Mesh(
    new THREE.ConeGeometry(2.6, 0.75, 12),
    new THREE.MeshStandardMaterial({ color: 0xf5f5f4, roughness: 0.82, side: THREE.DoubleSide })
  );
  canopy.position.y = 2.7;
  canopy.castShadow = true;
  g.add(canopy);

  const bluePlastic = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35 });
  const table = createTeaTable(0.95, 0.54, 0.65, bluePlastic);
  table.position.set(0.3, 0.27, -0.3);
  table.castShadow = true;
  g.add(table);
  // Va chạm bàn trà đá và dàn xe máy dựng vỉa hè
  addCircleCollider(x + 0.2, z - 0.2, 0.95);
  addBoxCollider(x - 6.2, z + 0.85, 11.2, 1.4);

  const thermos = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.1, 0.38, 12),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 })
  );
  thermos.position.set(0.15, 0.72, -0.35);
  g.add(thermos);

  // Các cốc trà đá vàng óng trên bàn
  [-0.05, 0.38, 0.55].forEach((gx, idx) => {
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.032, 0.12, 10),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, transparent: true, opacity: 0.85 })
    );
    cup.position.set(gx, 0.6, -0.25 + (idx % 2) * 0.15);
    g.add(cup);
  });

  [
    [-0.38, -0.3],
    [0.98, -0.3],
    [0.3, 0.38],
    [-0.85, -0.72]
  ].forEach(([sx, sz]) => {
    const stool = createStool(0.32, 0.32, 0.32, bluePlastic);
    stool.position.set(sx, 0.16, sz);
    stool.castShadow = true;
    g.add(stool);
  });

  const bikeColors = [0x1e293b, 0xb91c1c, 0xf8fafc, 0x1d4ed8, 0x334155, 0xd97706];
  for (let i = 0; i < 8; i++) {
    createDetailedMotorbike(-1.6 - i * 1.32, 0.78 + (i % 2) * 0.2, 1.15, bikeColors[i % bikeColors.length], g);
  }

  worldGroup.add(g);
}

function createDetailedMotorbike(x, z, rotY, colorHex, parent) {
  const bike = new THREE.Group();bike.userData.modelFamily='scooter';
  const paintMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.42, roughness: 0.32 });
  const paintDark = new THREE.MeshStandardMaterial({ color: new THREE.Color(colorHex).multiplyScalar(0.62), metalness: 0.35, roughness: 0.38 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.72 });
  const rubberMat = new THREE.MeshStandardMaterial({ color: 0x08090b, roughness: 0.94 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdce5ea, metalness: 0.92, roughness: 0.13 });
  const alloyMat = new THREE.MeshStandardMaterial({ color: 0x7b8791, metalness: 0.82, roughness: 0.24 });

  const rearBody = new THREE.Mesh(scooterPanel('rear'), paintMat);
  rearBody.position.set(-0.25, 0.59, 0);
  rearBody.castShadow = true;
  bike.add(rearBody);

  const sidePanel = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 14), paintMat);
  sidePanel.scale.set(1.2, 0.68, 0.72);
  sidePanel.position.set(-0.32, 0.62, 0);
  sidePanel.castShadow = true;
  bike.add(sidePanel);

  const floorBoard = new THREE.Mesh(new RoundedBoxGeometry(0.58, 0.09, 0.4, 3, 0.035), darkMat);
  floorBoard.position.set(0.13, 0.39, 0);
  bike.add(floorBoard);

  const seat = new THREE.Mesh(scooterPanel('seat'), darkMat);
  seat.position.set(-0.27, 0.86, 0);
  seat.rotation.z = -0.025;
  bike.add(seat);

  const seatTrim = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.012, 0.375), chromeMat);
  seatTrim.position.set(-0.27, 0.79, 0);
  bike.add(seatTrim);

  const frontShield = new THREE.Mesh(scooterPanel('shield'), paintMat);
  frontShield.position.set(0.41, 0.77, 0);
  frontShield.rotation.z = -0.12;
  frontShield.castShadow = true;
  bike.add(frontShield);

  const centerTrim = new THREE.Mesh(new RoundedBoxGeometry(0.035, 0.52, 0.405, 3, 0.012), chromeMat);
  centerTrim.position.set(0.425, 0.79, 0);
  centerTrim.rotation.z = -0.12;
  bike.add(centerTrim);

  const engine = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.29, 0.34, 4, 0.06), paintDark);
  engine.position.set(-0.28, 0.39, 0);
  engine.castShadow = true;
  bike.add(engine);
  const engineCover = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.035, 20), alloyMat);
  engineCover.rotation.x = Math.PI / 2;
  engineCover.position.set(-0.3, 0.4, -0.19);
  bike.add(engineCover);

  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.58, 12), chromeMat);
  exhaust.rotation.z = Math.PI / 2;
  exhaust.position.set(-0.39, 0.29, -0.25);
  bike.add(exhaust);
  const mufflerTip = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.035, 12), darkMat);
  mufflerTip.rotation.x = Math.PI / 2;
  mufflerTip.position.set(-0.69, 0.29, -0.25);
  bike.add(mufflerTip);

  const steering = new THREE.Group();
  steering.position.set(0.36, 0, 0);
  bike.add(steering);

  const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.023, 0.023, 0.64, 10), chromeMat);
  handlebar.rotation.x = Math.PI / 2;
  handlebar.position.set(0, 1.12, 0);
  steering.add(handlebar);

  const grips = [];
  [-1, 1].forEach((side) => {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.14, 12), rubberMat);
    grip.rotation.x = Math.PI / 2;
    grip.position.set(0, 1.12, side * 0.37);
    steering.add(grip);
    grips.push(grip);
    steering.add(createScooterMirror(side, chromeMat));
  });

  [-0.11, 0.11].forEach((sideZ) => {
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.62, 10), chromeMat);
    fork.position.set(0.15, 0.57, sideZ);
    fork.rotation.z = -0.12;
    steering.add(fork);
  });

  const wheels = [];
  [-0.52, 0.54].forEach((wx, index) => {
    const wheelPivot = new THREE.Group();
    wheelPivot.position.set(wx, 0.26, 0);
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.052, 10, 28), rubberMat);
    tire.castShadow = true;
    wheelPivot.add(tire);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.018, 8, 24), alloyMat);
    wheelPivot.add(rim);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.14, 14), alloyMat);
    hub.rotation.x = Math.PI / 2;
    wheelPivot.add(hub);
    for (let spokeIndex = 0; spokeIndex < 6; spokeIndex++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.17, 0.012), alloyMat);
      spoke.position.y = 0.085;
      spoke.rotation.z = (spokeIndex / 6) * Math.PI * 2;
      wheelPivot.add(spoke);
    }
    if (index === 1) {
      const brakeDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.012, 20), chromeMat);
      brakeDisc.rotation.x = Math.PI / 2;
      brakeDisc.position.z = -0.075;
      wheelPivot.add(brakeDisc);
    }
    (index === 1 ? steering : bike).add(wheelPivot);
    if (index === 1) wheelPivot.position.x -= steering.position.x;
    wheels.push(wheelPivot);
  });

  const rearShock = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.48, 10), chromeMat);
  rearShock.position.set(-0.45, 0.51, 0.19);
  rearShock.rotation.z = -0.34;
  bike.add(rearShock);

  const headlight = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 20, 12),
    new THREE.MeshStandardMaterial({ color: 0xfff7c2, emissive: 0xffd86b, emissiveIntensity: 0.5 })
  );
  headlight.scale.set(0.55, 1, 1);
  headlight.position.set(0.57, 0.99, 0);
  bike.add(headlight);

  const tailLight = new THREE.Mesh(
    new RoundedBoxGeometry(0.07, 0.12, 0.25, 3, 0.025),
    new THREE.MeshStandardMaterial({ color: 0xef233c, emissive: 0xb00020, emissiveIntensity: 0.55 })
  );
  tailLight.position.set(-0.67, 0.67, 0);
  bike.add(tailLight);

  const plate = new THREE.Mesh(
    new RoundedBoxGeometry(0.035, 0.16, 0.27, 2, 0.015),
    new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.5 })
  );
  plate.position.set(-0.72, 0.48, 0);
  const plateCanvas=document.createElement('canvas');plateCanvas.width=128;plateCanvas.height=80;
  const plateInk=plateCanvas.getContext('2d');plateInk.fillStyle='#e5e1d4';plateInk.fillRect(0,0,128,80);
  plateInk.strokeStyle='#353a39';plateInk.lineWidth=4;plateInk.strokeRect(3,3,122,74);
  plateInk.fillStyle='#202928';plateInk.textAlign='center';plateInk.font='bold 27px sans-serif';
  plateInk.fillText('29–T1',64,31);plateInk.fillText(String(41000+(createDetailedMotorbike.serial=(createDetailedMotorbike.serial||0)+1)),64,65);
  const plateTexture=new THREE.CanvasTexture(plateCanvas);plateTexture.colorSpace=THREE.SRGBColorSpace;
  const plateFace=new THREE.MeshStandardMaterial({map:plateTexture,roughness:.7});
  plate.material=[plate.material,plateFace,plate.material,plate.material,plate.material,plate.material];
  plate.rotation.z = -0.16;
  bike.add(plate);

  const indicators=[];
  const amber=new THREE.MeshStandardMaterial({color:0xb87723,emissive:0xffa226,emissiveIntensity:0});
  for(const front of [false,true])for(const side of [-1,1]){
    const lens=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),amber.clone());
    lens.scale.set(.6,.75,1.2);lens.position.set(front?.55:-.69,front?.91:.66,side*.19);
    (front?steering:bike).add(lens);if(front)lens.position.x-=steering.position.x;
    indicators.push({lens,side});
  }
  bike.userData.indicators=indicators;
  bike.userData.tailLightMesh=tailLight;
  bike.userData.wheels = wheels;
  bike.userData.steering = steering;
  bike.userData.grips = grips;
  bike.userData.visualBody = rearBody;
  bike.userData.headlightMesh = headlight;
  bike.userData.paintMat = paintMat;
  bike.userData.paintDark = paintDark;

  bike.position.set(x, parent === worldGroup ? getGroundElevationAt(x, z) : 0, z);
  bike.rotation.y = rotY;
  parent.add(bike);
  return bike;
}

function buildShipperGarageStation(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0.18, z);

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.78, roughness: 0.28 });
  const yellowAccentMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.45, roughness: 0.35 });
  const redToolMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.55, roughness: 0.32 });
  const neonSignMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.65,
    roughness: 0.3
  });

  // Nền gạch & bệ nâng xe máy của Xưởng Độ Xe
  const floorPad = new THREE.Mesh(
    new RoundedBoxGeometry(4.6, 0.08, 2.8, 3, 0.03),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.72, metalness: 0.25 })
  );
  floorPad.position.set(0, 0.04, 0);
  floorPad.receiveShadow = true;
  g.add(floorPad);

  const rampStripe = new THREE.Mesh(
    new THREE.BoxGeometry(4.4, 0.09, 0.22),
    yellowAccentMat
  );
  rampStripe.position.set(0, 0.045, 1.28);
  g.add(rampStripe);

  // 4 cột thép & mái vòm sọc vàng-đen phong cách Racing Garage
  [
    [-2.05, -1.15],
    [2.05, -1.15],
    [-2.05, 1.15],
    [2.05, 1.15]
  ].forEach(([px, pz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.9, 10), frameMat);
    post.position.set(px, 1.45, pz);
    post.castShadow = true;
    g.add(post);
  });

  const roofAwning = new THREE.Mesh(
    new RoundedBoxGeometry(4.8, 0.22, 3.1, 3, 0.05),
    createStripedAwningMaterial('#f59e0b', '#0f172a')
  );
  roofAwning.position.set(0, 2.95, 0);
  roofAwning.rotation.x = -0.08;
  roofAwning.castShadow = true;
  g.add(roofAwning);

  // Biển hiệu phát sáng phía trên trạm
  const signBoard = new THREE.Mesh(new RoundedBoxGeometry(4.2, 0.62, 0.14, 3, 0.03), frameMat);
  signBoard.position.set(0, 3.38, 1.32);
  g.add(signBoard);

  const neonTrim = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.08, 0.16), neonSignMat);
  neonTrim.position.set(0, 3.08, 1.33);
  g.add(neonTrim);

  // Tủ đồ nghề cơ khí màu đỏ & chồng lốp xe độ
  const toolCabinet = new THREE.Mesh(new RoundedBoxGeometry(1.15, 1.1, 0.62, 3, 0.04), redToolMat);
  toolCabinet.position.set(-1.35, 0.58, -0.72);
  toolCabinet.castShadow = true;
  g.add(toolCabinet);

  const tireMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.9 });
  for (let ti = 0; ti < 3; ti++) {
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.09, 10, 20), tireMat);
    tire.rotation.x = Math.PI / 2;
    tire.position.set(1.45, 0.16 + ti * 0.19, -0.68);
    tire.castShadow = true;
    g.add(tire);
  }

  // Bình Nitro xanh dương trưng bày cạnh tủ đồ nghề
  const nitroTank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.68, 14),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.72, roughness: 0.22, emissive: 0x0369a1, emissiveIntensity: 0.45 })
  );
  nitroTank.position.set(-0.55, 0.38, -0.78);
  g.add(nitroTank);

  // Một chiếc xe mẫu trưng bày trên bệ độ xe
  const displayBike = createDetailedMotorbike(0.35, -0.35, 0.35, 0xf59e0b, g);
  displayBike.scale.setScalar(0.82);

  worldGroup.add(g);
  addBoxCollider(x, z - 0.55, 4.3, 1.6);

  registerWorldInteractable({
    id: 'shipper_garage_station',
    type: 'shipper_garage',
    title: 'Trạm Shipper Siêu Tốc & Xưởng Độ Xe 41',
    prompt: '⚡ Mở Trạm Shipper Siêu Tốc & Xưởng Độ Xe 3D (Phím E / G)',
    x,
    y: 0.18,
    z: z + 1.15,
    radius: 3.6,
    ringColor: 0xfacc15
  });
}

const animatedLotusFish = [];
let animatedJianziShuttle = null;
let playerTycoonUpgradeMeshes = [];

function buildExpandedWorldZones() {
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b3e26, roughness: 0.78 });
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0xd9a05b, roughness: 0.72 });
  const redLacquerMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.55 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.65, roughness: 0.28 });
  const lanternGlowMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.45,
    roughness: 0.4
  });

  // ==========================================================================
  // 1. QUÁN XÔI & TRÀ ĐÁ TỰ QUẢN CỦA NGƯỜI CHƠI 3D (x = -26.5, z = -7.0)
  // ==========================================================================
  {
    const sx = -26.5;
    const sz = -7.0;
    const stallGroup = new THREE.Group();
    stallGroup.position.set(sx, 0.18, sz);

    const counter = new THREE.Mesh(new RoundedBoxGeometry(2.6, 0.92, 1.05, 3, 0.04), woodMat);
    counter.position.set(0, 0.46, 0);
    counter.castShadow = true;
    stallGroup.add(counter);

    const steamerPot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.24, 0.44, 14),
      new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.72, roughness: 0.25 })
    );
    steamerPot.position.set(-0.55, 1.12, 0);
    stallGroup.add(steamerPot);

    const teaDispenser = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.46, 12),
      new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.35 })
    );
    teaDispenser.position.set(0.55, 1.13, 0);
    stallGroup.add(teaDispenser);

    [-1.15, 1.15].forEach((px) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.6, 10), woodMat);
      post.position.set(px, 1.3, 0);
      stallGroup.add(post);

      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), lanternGlowMat);
      lantern.scale.set(1, 1.25, 1);
      lantern.position.set(px, 2.35, 0.45);
      stallGroup.add(lantern);
    });

    const roof = new THREE.Mesh(
      new RoundedBoxGeometry(3.1, 0.18, 1.75, 3, 0.04),
      createStripedAwningMaterial('#991b1b', '#fef3c7')
    );
    roof.position.set(0, 2.62, 0.1);
    roof.rotation.x = 0.12;
    roof.castShadow = true;
    stallGroup.add(roof);

    // Các bộ bàn ghế mở rộng theo cấp độ nâng cấp Quán (Level 1 -> 4)
    playerTycoonUpgradeMeshes = [];
    [
      [-1.8, 0.85],
      [1.8, 0.85],
      [0, 1.25]
    ].forEach(([tx, tz], idx) => {
      const setGrp = new THREE.Group();
      setGrp.position.set(tx, 0, tz);
      const tbl = createTeaTable(0.72, 0.48, 0.56, bambooMat);
      tbl.position.y = 0.24;
      tbl.castShadow = true;
      setGrp.add(tbl);
      [-0.48, 0.48].forEach((cx) => {
        const stool = createStool(0.28, 0.3, 0.28,
          new THREE.MeshStandardMaterial({ color: idx % 2 === 0 ? 0x9c6256 : 0x526b77, roughness: 0.7 }));
        stool.position.set(cx, 0.15, 0);
        setGrp.add(stool);
      });
      stallGroup.add(setGrp);
      playerTycoonUpgradeMeshes.push(setGrp);
    });

    worldGroup.add(stallGroup);
    addBoxCollider(sx, sz, 2.7, 1.15);

    registerWorldInteractable({
      id: 'player_tycoon_stall',
      type: 'tycoon_stall',
      title: 'Quán Xôi & Trà Đá Tự Quản Của Linh',
      prompt: '🏮 Mở Ca Bán Hàng Xôi - Trà Đá Combo & Thu Tiền Quán (Phím E)',
      x: sx,
      y: 0.18,
      z: sz + 1.25,
      radius: 3.2,
      ringColor: 0xf59e0b
    });
  }

  // ==========================================================================
  // 2. BẾN CÂU CÁ GỖ LIM & ĐÀN CÁ KOI 3D TẠI HỒ SEN (x = 145.5, z = 24.5)
  // ==========================================================================
  {
    const px = 145.2;
    const pz = 24.5;
    const pierGroup = new THREE.Group();
    pierGroup.position.set(px, 0.18, pz);

    const deck = new THREE.Mesh(new RoundedBoxGeometry(3.8, 0.14, 2.4, 2, 0.03), woodMat);
    deck.position.set(0, 0.12, 0);
    deck.receiveShadow = true;
    pierGroup.add(deck);

    // Cọc gỗ cắm xuống mặt hồ & lan can tre
    [
      [-1.6, -1.0],
      [1.6, -1.0],
      [-1.6, 1.0],
      [1.6, 1.0]
    ].forEach(([cx, cz]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8), woodMat);
      post.position.set(cx, 0.45, cz);
      pierGroup.add(post);
    });

    // 2 Cần câu trúc uốn cong hướng ra mặt Hồ Sen kèm phao câu đỏ
    [-0.55, 0.55].forEach((rz) => {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.028, 2.6, 8), bambooMat);
      rod.position.set(-0.6, 0.95, rz);
      rod.rotation.z = 1.05;
      pierGroup.add(rod);

      const bobber = new THREE.Mesh(
        new THREE.SphereGeometry(0.075, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xb91c1c, emissiveIntensity: 0.5 })
      );
      bobber.position.set(-2.1, -0.1, rz);
      pierGroup.add(bobber);
    });

    // Giỏ tre đựng cá & ghế đẩu ngồi câu
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.36, 12), bambooMat);
    basket.position.set(0.65, 0.36, -0.65);
    pierGroup.add(basket);

    // Đàn 6 chú Cá Koi & Cá Chép Vàng 3D bơi lượn dưới mặt nước Hồ Sen
    const fishColors = [0xf97316, 0xfacc15, 0xef4444, 0xffffff, 0xfb923c, 0xfde047];
    for (let fi = 0; fi < 6; fi++) {
      const fishGrp = new THREE.Group();
      const fishMat = new THREE.MeshStandardMaterial({
        color: fishColors[fi % fishColors.length],
        roughness: 0.25,
        metalness: 0.15
      });
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.24, 4, 8), fishMat);
      body.rotation.x = Math.PI / 2;
      fishGrp.add(body);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.16, 4), fishMat);
      tail.rotation.x = -Math.PI / 2;
      tail.position.z = -0.2;
      fishGrp.add(tail);

      worldGroup.add(fishGrp);
      animatedLotusFish.push({
        group: fishGrp,
        tail,
        centerX: 141.5 + (fi % 2) * 1.4,
        centerZ: 21.5 + (fi % 3) * 1.6,
        radius: 1.4 + (fi % 3) * 0.65,
        speed: 0.75 + (fi % 3) * 0.22,
        phase: fi * 1.05
      });
    }

    worldGroup.add(pierGroup);

    registerWorldInteractable({
      id: 'lotus_fishing_pier',
      type: 'fishing_pier',
      title: 'Bến Câu Cá Hồ Sen Tây Hồ',
      prompt: '🎣 Buông Cần Câu Cá Koi & Cá Chép Hồ Sen (Phím E · Thưởng tới 120.000đ)',
      x: px + 0.6,
      y: 0.18,
      z: pz,
      radius: 3.4,
      ringColor: 0x38bdf8
    });
  }

  // ==========================================================================
  // 3. SÂN ĐÁ CẦU KIỂNG NGHỆ THUẬT 3D TẠI CÔNG VIÊN (x = 126.5, z = 14.5)
  // ==========================================================================
  {
    const jx = 126.5;
    const jz = 14.5;
    const courtGroup = new THREE.Group();
    courtGroup.position.set(jx, 0.19, jz);

    const lineMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc, side: THREE.DoubleSide });
    const outerRing = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.22, 32).rotateX(-Math.PI / 2), lineMat);
    outerRing.position.y = 0.01;
    courtGroup.add(outerRing);

    // Lưới đá cầu thấp căng ngang giữa sân
    [-1.8, 1.8].forEach((nx) => {
      const netPost = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.35, 8), goldMat);
      netPost.position.set(nx, 0.68, 0);
      courtGroup.add(netPost);
    });
    const netMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.5, 0.42),
      new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
    );
    netMesh.position.set(0, 1.05, 0);
    courtGroup.add(netMesh);

    // Quả cầu lông gà 3D (Shuttlecock) bay qua lại trên sân
    const shuttleGrp = new THREE.Group();
    const baseDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 10), redLacquerMat);
    shuttleGrp.add(baseDisc);
    const feathers = new THREE.Mesh(
      new THREE.ConeGeometry(0.11, 0.22, 10, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    feathers.rotation.x = Math.PI;
    feathers.position.y = 0.12;
    shuttleGrp.add(feathers);
    shuttleGrp.position.set(0, 1.5, 0);
    courtGroup.add(shuttleGrp);
    animatedJianziShuttle = shuttleGrp;

    worldGroup.add(courtGroup);

    registerWorldInteractable({
      id: 'park_jianzi_court',
      type: 'jianzi_court',
      title: 'Sân Đá Cầu Kiểng Nghệ Thuật Công Viên',
      prompt: '🪶 Thi Tâng Cầu Kiểng Nối Combo Nghệ Thuật (Phím E · Thưởng Combo)',
      x: jx,
      y: 0.18,
      z: jz + 1.4,
      radius: 3.4,
      ringColor: 0x4ade80
    });
  }

  // ==========================================================================
  // 4. LẦU VỌNG CẢNH BÁT GIÁC & CÂY ĐÀO ƯỚC NGUYỆN VƯỜN ĐÀO PHÚ THƯỢNG (x = -162, z = 18)
  // ==========================================================================
  {
    const px = -162.0;
    const pz = 18.0;
    const pavGroup = new THREE.Group();
    pavGroup.position.set(px, 0.18, pz);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(3.6, 3.9, 0.36, 8),
      new THREE.MeshStandardMaterial({ color: 0xd6c7b2, roughness: 0.85 })
    );
    base.position.y = 0.18;
    pavGroup.add(base);

    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 3.2, 10), redLacquerMat);
      col.position.set(Math.cos(ang) * 2.9, 1.78, Math.sin(ang) * 2.9);
      col.castShadow = true;
      pavGroup.add(col);
    }

    const roof1 = new THREE.Mesh(new THREE.ConeGeometry(4.3, 1.35, 8), redLacquerMat);
    roof1.position.y = 3.95;
    roof1.castShadow = true;
    pavGroup.add(roof1);

    const roof2 = new THREE.Mesh(new THREE.ConeGeometry(3.0, 1.15, 8), goldMat);
    roof2.position.y = 5.05;
    pavGroup.add(roof2);

    worldGroup.add(pavGroup);
    addCircleCollider(px, pz, 1.2);

    registerWorldInteractable({
      id: 'peach_garden_shrine',
      type: 'peach_shrine',
      title: 'Lầu Vọng Cảnh & Cây Đào Ước Nguyện Phú Thượng',
      prompt: '🌸 Treo Thẻ Ước Nguyện Mùa Xuân Phú Thượng (Phím E · Nhận Lộc +25.000đ & 100% Nitro)',
      x: px,
      y: 0.18,
      z: pz - 3.2,
      radius: 3.5,
      ringColor: 0xf472b6
    });
  }
}

function addTrafficRider(bike, shirtColor = 0x2563eb) {
  const rider = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.82 });
  const trousers = new THREE.MeshStandardMaterial({ color: 0x263548, roughness: 0.88 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd6a178, roughness: 0.72 });
  const helmet = new THREE.MeshStandardMaterial({ color: 0x172033, roughness: 0.5, metalness: 0.12 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.145, 0.28, 5, 10), shirt);
  torso.position.set(-0.18, 1.19, 0);
  torso.rotation.z = -0.18;
  torso.castShadow = true;
  rider.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 16, 12), skin);
  head.position.set(-0.11, 1.55, 0);
  head.castShadow = true;
  rider.add(head);
  const helmetShell = new THREE.Mesh(new THREE.SphereGeometry(0.145, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.58), helmet);
  helmetShell.position.set(-0.11, 1.58, 0);
  rider.add(helmetShell);

  const limbAxis = new THREE.Vector3(0, 1, 0);
  const addLimb = (from, to, radius, material) => {
    const direction = new THREE.Vector3().subVectors(to, from);
    const limb = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.9, direction.length(), 8), material);
    limb.position.copy(from).add(to).multiplyScalar(0.5);
    limb.quaternion.setFromUnitVectors(limbAxis, direction.normalize());
    limb.castShadow = true;
    rider.add(limb);
  };
  [-1, 1].forEach((side) => {
    addLimb(
      new THREE.Vector3(-0.11, 1.34, side * 0.12),
      new THREE.Vector3(0.34, 1.12, side * 0.25),
      0.035,
      shirt
    );
    addLimb(
      new THREE.Vector3(-0.28, 1.03, side * 0.1),
      new THREE.Vector3(-0.04, 0.58, side * 0.2),
      0.052,
      trousers
    );
  });
  bike.add(rider);
  bike.userData.rider = rider;
}

function createStreetSignPost(x, z) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 3.4, 10),
    new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.4 })
  );
  pole.position.y = 1.7;
  g.add(pole);

  const signMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8 });
  const s1 = new THREE.Mesh(new RoundedBoxGeometry(1.45, 0.42, 0.06, 2, 0.02), signMat);
  s1.position.y = 3.15;
  g.add(s1);

  const s2 = new THREE.Mesh(new RoundedBoxGeometry(1.25, 0.42, 0.06, 2, 0.02), signMat);
  s2.position.y = 2.68;
  s2.rotation.y = Math.PI / 2;
  g.add(s2);

  g.position.set(x, 0.15, z);
  worldGroup.add(g);
}

function connectPowerLines(p1, p2) {
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(p1.x, 8.1, p1.z),
    new THREE.Vector3((p1.x + p2.x) / 2, 7.0, (p1.z + p2.z) / 2),
    new THREE.Vector3(p2.x, 8.1, p2.z)
  );
  const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(20));
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x1e293b }));
  worldGroup.add(line);
}

function spawnStreetTraffic() {
  const colors=[0x425f76,0xddd9cc,0x8f443f,0x617568,0x8e794f];
  TRAFFIC_STREETS.forEach((street,index)=>{
    const route=connectedTrafficRoute(street.id),routeLength=route.getLength();
    for(const kind of ['bike','car']){
      const bike=kind==='bike';
      const vehicle=bike?createDetailedMotorbike(0,0,0,colors[index%colors.length],worldGroup):createDetailedCar(0,0,0,colors[(index+2)%colors.length],false,true);
      if(!bike&&(index===0||index===3)){
        const beacons=[];
        for(const [side,color]of [[-1,0xef3d3d],[1,0x3b82ef]]){
          const material=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.6,roughness:.3});
          const lens=new THREE.Mesh(new RoundedBoxGeometry(.27,.13,.28,2,.04),material);lens.position.set(-.1,1.55,side*.34);vehicle.add(lens);beacons.push(material);
        }
        const stripe=new THREE.Mesh(new THREE.BoxGeometry(2.4,.13,1.76),new THREE.MeshStandardMaterial({color:0xe9e9dd}));stripe.position.set(0,.72,0);vehicle.add(stripe);vehicle.userData.policeBeacons=beacons;
      }
      if(bike){
        const signalMeshes=new Set([vehicle.userData.tailLightMesh,vehicle.userData.headlightMesh,...vehicle.userData.indicators.map(i=>i.lens)]);
        for(const parent of [vehicle,vehicle.userData.steering,...vehicle.userData.wheels]){
          const shell=new THREE.Group();shell.userData.staticBatch=true;
          for(const child of [...parent.children])if(child.isMesh&&!signalMeshes.has(child))shell.add(child);
          parent.add(shell);
        }
        addTrafficRider(vehicle,colors[(index+1)%colors.length]);
      }
      let progress=(index*.137+(bike?.12:.62))%1,p,t,yaw;
      for(let attempt=0;attempt<100;attempt++){p=route.getPointAt(progress);t=route.getTangentAt(progress);yaw=Math.atan2(-t.z,t.x);if(!TRAFFIC_JUNCTIONS.some(j=>Math.hypot(p.x-j.x,p.z-j.z)<10)&&!animatedTraffic.some(v=>trafficBodiesOverlap({x:p.x,z:p.z,yaw,kind},{x:v.mesh.position.x,z:v.mesh.position.z,yaw:v.yaw,kind:v.kind},.5)))break;progress=(progress+7/routeLength)%1;}
      vehicle.position.set(p.x,getGroundElevationAt(p.x,p.z)+.02,p.z);vehicle.rotation.y=yaw;
      animatedTraffic.push({id:animatedTraffic.length,mesh:vehicle,kind,streetId:street.id,route,routeLength,progress,cruiseSpeed:bike?5.7:4.8,currentSpeed:2,phase:index*1.9,yaw,lean:0,initialized:true});
    }
  });
}

function spawnCityBuses(){
 const street={id:'city-bus',width:11.4,points:[[-145,0],[135,0]]},route=connectedTrafficRoute('city-bus'),routeLength=route.getLength();
 const stops=busStops(route,[{x:80,z:-2.3,name:'THPT Tây Hồ'},{x:-100,z:2.3,name:'Ngõ 41'}]);
 for(const [x,z,label,angle]of [[80,-8.5,'THPT Tây Hồ',0],[-100,8.5,'Ngõ 41',Math.PI]]){createBusStop(worldGroup,x,z,label,angle);addBoxCollider(x,z,3.6,1.5);}
 for(const initial of [.37,.72]){
  const mesh=createCityBus(),p=route.getPointAt(initial),t=route.getTangentAt(initial),yaw=Math.atan2(-t.z,t.x);mesh.position.set(p.x,.08,p.z);mesh.rotation.y=yaw;worldGroup.add(mesh);
  animatedTraffic.push({id:animatedTraffic.length,mesh,kind:'bus',streetId:street.id,route,routeLength,progress:initial,cruiseSpeed:4.2,currentSpeed:1.5,phase:initial*4,yaw,lean:0,initialized:true,busStops:stops,dwell:0,lastStop:-1});
 }
}

// ============================================================================
// 6. HỆ THỐNG GAMEPLAY NHẬP VAI (RPG): TIỀN, XP, TÚI ĐỒ, XE MÁY, DI SẢN & NHIỆM VỤ
// ============================================================================
const loadedSnapshot = parseSnapshot(localStorage.getItem(SAVE_KEY));
const playerState = {
  coins: loadedSnapshot?.coins ?? 50000,
  xp: loadedSnapshot?.xp ?? 0,
  stamina: loadedSnapshot?.stamina ?? 100,
  isRidingBike: false,
  inventory: new Map(loadedSnapshot?.inventory ?? []), // id -> { name, icon, count }
  completedQuests: new Set(loadedSnapshot?.completedQuests ?? []),
  collectedRelicIds: new Set(loadedSnapshot?.collectedRelicIds ?? []),
  collectedRelics: loadedSnapshot?.collectedRelicIds?.length ?? 0,
  totalRelics: 12,
  snappedPhotos: new Set(loadedSnapshot?.snappedPhotos ?? []),
  relationships: loadedSnapshot?.relationships ?? {
    npc_baove: 0, npc_ubnd: 0, npc_trada: 0, npc_ngaba: 0, npc_lietsi: 0, xoi_vendor: 0
  },
  neighborhood: loadedSnapshot?.neighborhood ?? { cohesion: 0, beauty: 0, livelihood: 0, heritage: 0 },
  teaStallUpgrade: loadedSnapshot?.teaStallUpgrade ?? null,
  streetStoryStep: loadedSnapshot?.streetStoryStep ?? 0,
  horrorChapterStage: loadedSnapshot?.horrorChapterStage ?? 0,
  horrorEnding: loadedSnapshot?.horrorEnding ?? null,
  night: normalizeNight(loadedSnapshot?.night),
  daylife: loadedSnapshot?.daylife,
  arcade: loadedSnapshot?.arcade,
  day: loadedSnapshot?.day ?? 1,
  time: loadedSnapshot?.time ?? 9.5
};

let daylifeController = null;
let arcadeController = null;
let policeController = null;
let cityUtilities=null,cityWeather=null,cityWeatherState={wind:.12,rain:0},cityLightingBase=null;

// Cốt truyện đã được viết lại hoàn toàn; bỏ tiến độ bản prototype để người chơi
// không bị ném vào giữa chương với vật phẩm và checkpoint cũ.
const STORY_REVISION_KEY = 'phu_thuong_story_revision';
if (localStorage.getItem(STORY_REVISION_KEY) !== '2') {
  playerState.horrorChapterStage = 0;
  playerState.horrorEnding = null;
  playerState.inventory.delete('don_hang_41');
  playerState.inventory.delete('bang_ghi_am_41');
  localStorage.setItem(STORY_REVISION_KEY, '2');
  queueMicrotask(() => saveGame());
}

if (loadedSnapshot?.playerPosition) {
  playerGroup.position.set(
    loadedSnapshot.playerPosition.x,
    loadedSnapshot.playerPosition.y,
    loadedSnapshot.playerPosition.z
  );
}

const ITEM_CATALOG = {
  xoi_phu_thuong: {
    name: 'Gói Xôi Phú Thượng',
    icon: '🍙',
    category: 'Ẩm thực & Nhiệm vụ Văn hóa',
    description:
      'Gói xôi nếp cái hoa vàng đồ hai lửa dẻo thơm, phủ đỗ xanh đồ tơi và hành phi vàng ruộm gói trong lá chuối tươi — tinh hoa nghề Xôi Phú Thượng (Di sản Văn hóa Phi vật thể Quốc gia 2024).',
    sourceHint:
      'Mua tại gánh xôi của Cô Gánh Xôi đội nón lá ở góc vỉa hè trước cổng Trường THPT Tây Hồ (15.000đ).',
    usageHint:
      'Mang tới cổng Trường THPT Tây Hồ (Số 41) trò chuyện và biếu Bác Bảo Vệ để hoàn thành nhiệm vụ (+35.000đ, +120 XP), hoặc ăn trực tiếp để hồi 100% Thể lực.',
    sourceCoords: { x: -10.5, z: 6.2, title: 'Cô Gánh Xôi Phú Thượng (Góc Cổng Trường 41)' },
    targetCoords: { x: -2.2, z: 8.2, title: 'Bác Bảo Vệ THPT Tây Hồ (Số 41)' },
    canConsume: true
  },
  tra_da: {
    name: 'Cốc Trà Đá Mát Lạnh',
    icon: '🍵',
    category: 'Ẩm thực Vỉa hè',
    description:
      'Cốc trà mạn pha đặc ướp đá mát lạnh đặc trưng của quán nước vỉa hè Hà Nội dưới tán cây xà cừ cổ thụ.',
    sourceHint:
      'Ghé Quán Trà Đá Vỉa Hè của Cô Hoa trên phố Phú Thượng (5.000đ).',
    usageHint:
      'Uống trực tiếp trong túi đồ để giải khát, hồi phục ngay 100% Thể lực và giữ tinh thần bình tĩnh.',
    sourceCoords: { x: -52.5, z: -5.6, title: 'Quán Trà Đá Vỉa Hè Cô Hoa' },
    targetCoords: { x: -52.5, z: -5.6, title: 'Quán Trà Đá Vỉa Hè Cô Hoa' },
    canConsume: true
  },
  kem_ho_tay: {
    name: 'Kem Ốc Quế Hồ Tây',
    icon: '🍦',
    category: 'Ẩm thực Công viên',
    description:
      'Chiếc kem ốc quế cốm sữa dừa mát lạnh đặc sản ven Hồ Tây, thơm ngậy hương cốm non và dừa tươi.',
    sourceHint:
      'Mua tại Kiot Kem Hồ Tây & Nước Mía trong Công Viên Văn Hóa Phú Thượng (10.000đ).',
    usageHint:
      'Thưởng thức ngay trong túi đồ (Phím B) để hồi đầy 100% Thể lực, tăng sự bình tĩnh và nhận +25 XP.',
    sourceCoords: { x: 113.5, z: 16.4, title: 'Kiot Kem Hồ Tây (Công Viên Phú Thượng)' },
    targetCoords: { x: 131.5, z: 19.8, title: 'Quảng Trường Đài Phun Nước Công Viên' },
    canConsume: true
  },
  cong_van_ubnd: {
    name: 'Công Văn Văn Hóa Phường',
    icon: '📜',
    category: 'Nhiệm vụ Khu phố',
    description:
      'Tập công văn đóng dấu đỏ của UBND Phường Phú Thượng thông báo kế hoạch tổ chức Lễ hội Truyền thống & Vinh danh Di sản nghề Xôi Phú Thượng tới các tổ dân phố.',
    sourceHint:
      'Nhận từ anh Cán Bộ Văn Hóa đứng tại sân trụ sở UBND Phường Phú Thượng (đối diện cổng trường THPT Tây Hồ).',
    usageHint:
      'Mang dọc theo phố Phú Thượng về phía Đông tới Ngã Ba 68 Phú Thượng - Phú Gia, bấm [E] trò chuyện với Bác Tổ Trưởng Tổ Dân Phố và chọn giao Công Văn (+40.000đ, +140 XP).',
    sourceCoords: { x: 0, z: -6.2, title: 'Cán Bộ Văn Hóa (Sân UBND Phường Phú Thượng)' },
    targetCoords: { x: 32, z: -5.5, title: 'Bác Tổ Trưởng Ngã Ba 68 Phú Thượng' }
  },
  bo_hoa_cuc: {
    name: 'Bó Hoa Cúc Vàng Tưởng Niệm',
    icon: '💐',
    category: 'Nhiệm vụ Tri ân',
    description:
      'Bó hoa cúc vàng tươi thắm được Cô Hoa cẩn thận chọn từ sáng sớm ở chợ hoa để dâng lên các Anh hùng Liệt sĩ của quê hương Phú Thượng.',
    sourceHint:
      'Nhận miễn phí khi trò chuyện với Cô Hoa tại Quán Trà Đá Vỉa Hè dưới hàng cây xà cừ.',
    usageHint:
      'Mang vào Khu Tưởng Niệm Liệt Sĩ (nằm phía sau UBND Phường Phú Thượng), gặp Bác Cựu Chiến Binh và chọn Dâng hoa tưởng niệm (+50.000đ, +160 XP).',
    sourceCoords: { x: -52.5, z: -5.6, title: 'Cô Hoa (Quán Trà Đá Vỉa Hè)' },
    targetCoords: { x: -24, z: -28, title: 'Bác Cựu Chiến Binh (Đài Tưởng Niệm Liệt Sĩ)' }
  },
  don_hang_41: {
    name: 'Đơn Xôi Nhà 41',
    icon: '🥡',
    category: 'Vật phẩm Cốt truyện Đêm',
    description:
      'Gói xôi nếp trắng không hành phi kèm tờ hóa đơn in nhiệt chữ đỏ lúc 19:41 — đúng khẩu vị của cậu em trai Nguyễn Văn An mất tích năm 2008.',
    sourceHint:
      'Tự tay gói tại Quán Xôi Cô Hoa lúc 19:41 trong Hồi III: Đơn Hàng Cuối Ngõ 41.',
    usageHint:
      'Đi qua Ngách 41/2 vào Ngõ 41 và đặt trước hiên Nhà Số 41 để tìm hiểu sự thật về Tiếng Gọi lúc 19:41.',
    sourceCoords: { x: -90, z: -40.95, title: 'Quán Xôi Cô Hoa (Đầu Ngách 41/2)' },
    targetCoords: { x: -67.2, z: -28.8, title: 'Hiên Nhà Số 41 (Trong Ngõ 41)' }
  },
  bang_ghi_am_41: {
    name: 'Cuộn Băng Số 41',
    icon: '📼',
    category: 'Vật chứng Cốt truyện Đêm',
    description:
      'Cuộn băng cassette cũ kỹ ghi lại lời nhắn và cuộc tìm kiếm trong đêm mưa ngập lịch sử 26/10/2008 của người bố bên miệng giếng cổ sau Nhà số 41.',
    sourceHint:
      'Thu thập tại bàn thờ bên miệng giếng cổ cuối Ngõ 41 trong Hồi III (Đơn Hàng Cuối Ngõ 41).',
    usageHint:
      'Bấm "▶️ Nghe lại nội dung Cuộn Băng 2008" ngay bên dưới để nghe lại lời nhắn của bố về người đã đưa bé An về phía Phú Gia, hoặc mang ra Đầu Ngõ 41 để mở khóa Kết cục.',
    sourceCoords: { x: -67, z: -47.2, title: 'Bàn Thờ Giếng Cổ Cuối Ngõ 41' },
    targetCoords: { x: -67, z: -9.4, title: 'Cổng Đầu Ngõ 41 Phú Thượng' },
    canListen: true
  }
};

playerState.inventory.forEach((item, id) => {
  const meta = ITEM_CATALOG[id];
  if (meta) playerState.inventory.set(id, { ...meta, count: Number(item.count) || 1 });
});

let saveTimer = null;
let lastSaveAt = loadedSnapshot?.savedAt ?? 0;
let saveErrorNotified=false;
function saveGame() {
  const snapshot = {
    version: 1,
    day: playerState.day,
    time: playerState.time,
    coins: playerState.coins,
    xp: playerState.xp,
    stamina: playerState.stamina,
    inventory: [...playerState.inventory.entries()],
    completedQuests: [...playerState.completedQuests],
    snappedPhotos: [...playerState.snappedPhotos],
    collectedRelicIds: [...playerState.collectedRelicIds],
    visitedNPCs: [...visitedNPCs],
    relationships: playerState.relationships,
    neighborhood: playerState.neighborhood,
    teaStallUpgrade: playerState.teaStallUpgrade,
    streetStoryStep: playerState.streetStoryStep,
    horrorChapterStage: playerState.horrorChapterStage,
    horrorEnding: playerState.horrorEnding,
    night: { ...playerState.night, battery: storyFlashlightBattery, composure: storyComposure },
    daylife: playerState.daylife,
    arcade: playerState.arcade,
    playerPosition: playerGroup.position,
    camYaw,
  };
  clearTimeout(saveTimer);saveTimer=null;
  const saved=persistSnapshot(snapshot,()=>localStorage,SAVE_KEY);
  const indicator = document.getElementById('save-indicator');
  if(!saved.ok){
    if(indicator){indicator.textContent=saved.reason==='full'?'Chưa lưu · bộ nhớ trình duyệt đầy':'Chưa lưu · trình duyệt chặn lưu';indicator.classList.remove('saving');indicator.classList.add('save-error');}
    if(!saveErrorNotified){saveErrorNotified=true;showToast('Không lưu được tiến độ. Bạn vẫn chơi tiếp được trong phiên này, nhưng tải lại có thể mất thay đổi mới.',6500);}
    return false;
  }
  saveErrorNotified=false;lastSaveAt=Date.now();
  if (indicator) {
    indicator.textContent = '✓ Đã lưu tự động';
    indicator.classList.remove('saving');
    indicator.classList.remove('save-error');
  }
  return true;
}

function markProgressDirty() {
  const indicator = document.getElementById('save-indicator');
  if (indicator) {
    indicator.textContent = 'Đang lưu…';
    indicator.classList.add('saving');
  }
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveGame, 450);
}

function awardSocialProgress(reward) {
  awardProgress(playerState, reward);
  updatePlayerHUD();
  markProgressDirty();
}

let toastTimer = null;
let lastBalanceBand = null;
function showToast(msg, duration = 3800) {
  const el = document.getElementById('game-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.add('hidden');
  }, duration);
}

// Hiệu ứng âm thanh WebAudio vật lý chân thực (Bước chân vỉa hè/vũng nước, Động cơ xe máy 4 kỳ, Còi xe, Mưa rào & Sấm sét)
const audioCtx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
  ? new (window.AudioContext || window.webkitAudioContext)()
  : null;

let sharedNoiseBuffer = null;
function getSharedNoiseBuffer() {
  if (!audioCtx) return null;
  if (sharedNoiseBuffer) return sharedNoiseBuffer;
  const sampleRate = audioCtx.sampleRate || 44100;
  const length = sampleRate * 2;
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.96300 * b1 + white * 0.296516;
    b2 = 0.57000 * b2 + white * 1.052691;
    data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.12;
  }
  sharedNoiseBuffer = buffer;
  return buffer;
}

let footstepStrideAccumulator = 0;
let footstepLeftRight = 0;
function playFootstepSound(isWetSurface = false, isSprint = false, isLanding = false) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const sidePitch = (footstepLeftRight++ % 2 === 0) ? 1.0 : 0.93;

  // 1. Âm trầm đế giày chạm mặt gạch / nhựa đường
  const thudOsc = audioCtx.createOscillator();
  const thudGain = audioCtx.createGain();
  thudOsc.type = 'triangle';
  const startFreq = (isLanding ? 92 : isSprint ? 118 : 98) * sidePitch;
  thudOsc.frequency.setValueAtTime(startFreq, now);
  thudOsc.frequency.exponentialRampToValueAtTime(32, now + (isLanding ? 0.11 : 0.075));
  const vol = isLanding ? 0.16 : isSprint ? 0.095 : 0.055;
  thudGain.gain.setValueAtTime(vol, now);
  thudGain.gain.exponentialRampToValueAtTime(0.001, now + (isLanding ? 0.12 : 0.08));
  thudOsc.connect(thudGain);
  thudGain.connect(audioCtx.destination);
  thudOsc.start(now);
  thudOsc.stop(now + (isLanding ? 0.13 : 0.085));

  // 2. Âm ma sát sỏi gạch khô hoặc tiếng té nước mưa lẹp nhẹp trong Ngõ 41
  const noiseBuf = getSharedNoiseBuffer();
  if (noiseBuf) {
    const noiseSrc = audioCtx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime((isWetSurface ? 1750 : 920) * sidePitch, now);
    filter.Q.setValueAtTime(isWetSurface ? 2.4 : 3.8, now);
    const nGain = audioCtx.createGain();
    nGain.gain.setValueAtTime(isWetSurface ? vol * 0.95 : vol * 0.48, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + (isWetSurface ? 0.11 : 0.065));
    noiseSrc.connect(filter);
    filter.connect(nGain);
    nGain.connect(audioCtx.destination);
    noiseSrc.start(now, Math.random() * 1.4, isWetSurface ? 0.12 : 0.07);
  }
}

function updateFootstepAudio(delta, isMoving, canSprint, currentFootSpeed) {
  if (!isGrounded || playerState.isRidingBike || isDialogueOpen || !isMoving || currentFootSpeed < 0.65) {
    footstepStrideAccumulator = 0.18;
    return;
  }
  const stepInterval = canSprint ? 0.31 : 0.46;
  footstepStrideAccumulator += delta;
  if (footstepStrideAccumulator >= stepInterval) {
    footstepStrideAccumulator %= stepInterval;
    const inAlley = playerGroup.position.x < -61 && playerGroup.position.z < -7.5;
    playFootstepSound(horrorModeActive || inAlley, canSprint, false);
  }
}

let bikeEngineOsc = null;
let bikeEngineSub = null;
let bikeEngineFilter = null;
let bikeEngineGain = null;

function ensureMotorbikeEngineAudio() {
  if (!audioCtx || bikeEngineOsc) return;
  bikeEngineOsc = audioCtx.createOscillator();
  bikeEngineSub = audioCtx.createOscillator();
  bikeEngineFilter = audioCtx.createBiquadFilter();
  bikeEngineGain = audioCtx.createGain();

  bikeEngineOsc.type = 'sawtooth';
  bikeEngineSub.type = 'triangle';
  bikeEngineOsc.frequency.value = 54;
  bikeEngineSub.frequency.value = 27;

  bikeEngineFilter.type = 'lowpass';
  bikeEngineFilter.frequency.value = 180;
  bikeEngineGain.gain.value = 0.0001;

  bikeEngineOsc.connect(bikeEngineFilter);
  bikeEngineSub.connect(bikeEngineFilter);
  bikeEngineFilter.connect(bikeEngineGain);
  bikeEngineGain.connect(audioCtx.destination);

  bikeEngineOsc.start();
  bikeEngineSub.start();
}

function updateMotorbikeAudio(delta, isRiding, speed, isThrottling) {
  if (!audioCtx) return;
  if (!isRiding || horrorModeActive || isDialogueOpen) {
    if (bikeEngineGain) {
      bikeEngineGain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.08);
    }
    return;
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  ensureMotorbikeEngineAudio();
  if (!bikeEngineOsc || !bikeEngineGain) return;

  const absSpeed = Math.abs(speed);
  const speedRatio = THREE.MathUtils.clamp(absSpeed / 18.5, 0, 1);
  const rpmPulse = Math.sin(performance.now() * 0.045) * 2.2;
  const baseFreq = 48 + speedRatio * 86 + (isThrottling ? 12 : 0) + rpmPulse;
  const now = audioCtx.currentTime;
  bikeEngineOsc.frequency.setTargetAtTime(baseFreq, now, 0.05);
  bikeEngineSub.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.05);
  bikeEngineFilter.frequency.setTargetAtTime(165 + speedRatio * 290 + (isThrottling ? 65 : 0), now, 0.06);
  bikeEngineGain.gain.setTargetAtTime(0.022 + speedRatio * 0.036, now, 0.06);
}

function playMotorbikeHorn() {
  if (!audioCtx || isDialogueOpen || horrorModeActive) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  [0, 0.16].forEach((offset) => {
    [415, 512].forEach((freq) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + offset);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(980, now + offset);
      gain.gain.setValueAtTime(0.065, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.11);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.12);
    });
  });

  // Người dân đi bộ gần đó quay đầu nhìn và phản ứng tự nhiên khi nghe tiếng còi xe
  dynamicWalkers.forEach((dw) => {
    if ((dw.distToPlayer ?? 99) < 12 && dw.bubble) {
      dw.chatTimer = 0.1;
      dw.bubble.visible = true;
    }
  });
  showToast(playerState.isRidingBike ? '📢 Bíp bíp! Đã bấm còi xe máy xin đường.' : '📢 Đã lên tiếng chào bà con quanh phố!', 2200);
}

function playSoundEffect(type) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;

  if (type === 'coin' || type === 'relic') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.14);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.start(now);
    osc.stop(now + 0.22);
  } else if (type === 'quest') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.25, now + 0.1);
    osc.frequency.setValueAtTime(783.99, now + 0.2);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc.start(now);
    osc.stop(now + 0.42);
  } else if (type === 'shutter') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.start(now);
    osc.stop(now + 0.09);
  }
}

function addItemToInventory(itemId, count = 1) {
  const meta = ITEM_CATALOG[itemId];
  if (!meta) return;
  const cur = playerState.inventory.get(itemId) || { ...meta, count: 0 };
  cur.count += count;
  playerState.inventory.set(itemId, cur);
  updatePlayerHUD();
  markProgressDirty();
}

function hasItem(itemId) {
  const it = playerState.inventory.get(itemId);
  return it && it.count > 0;
}

function consumeItem(itemId) {
  const it = playerState.inventory.get(itemId);
  if (!it || it.count <= 0) return false;
  it.count -= 1;
  if (it.count <= 0) playerState.inventory.delete(itemId);
  updatePlayerHUD();
  markProgressDirty();
  return true;
}

function addRewards(coinsDelta, xpDelta) {
  const beforeCoins = playerState.coins;
  playerState.coins = Math.max(0, playerState.coins + coinsDelta);
  playerState.xp += xpDelta;
  updatePlayerHUD();
  markProgressDirty();
  if (coinsDelta < 0) {
    showToast(`💸 Đã chi ${Math.abs(coinsDelta).toLocaleString('vi-VN')}đ · Còn ${playerState.coins.toLocaleString('vi-VN')}đ.`);
  } else if (beforeCoins > 0 && playerState.coins === 0) {
    showToast('⚠️ Bạn đã hết tiền. Hãy làm nhiệm vụ, chụp ảnh hoặc thu thập Di sản để kiếm thêm.');
  }
}

function updatePlayerHUD() {
  const coinsEl = document.getElementById('stat-coins');
  const xpEl = document.getElementById('stat-xp');
  const stamEl = document.getElementById('stat-stamina');
  const rankEl = document.getElementById('player-rank-title');
  const invEl = document.getElementById('inventory-items');
  const relicEl = document.getElementById('relic-counter');
  const photoEl = document.getElementById('photo-counter');
  const dayTimeEl = document.getElementById('day-time-pill');

  if (coinsEl) coinsEl.textContent = `💰 ${playerState.coins.toLocaleString('vi-VN')}đ`;
  const balanceAlert = document.getElementById('balance-alert');
  const balanceBand = playerState.coins === 0 ? 'empty' : playerState.coins < 15000 ? 'low' : 'ok';
  if (coinsEl) coinsEl.classList.toggle('low-balance', balanceBand !== 'ok');
  if (balanceAlert) {
    balanceAlert.classList.toggle('hidden', balanceBand === 'ok');
    balanceAlert.textContent = balanceBand === 'empty'
      ? '⚠️ Hết tiền · Chụp ảnh, nhặt Di sản hoặc làm nhiệm vụ để nhận thưởng.'
      : `🪙 Sắp hết tiền: còn ${playerState.coins.toLocaleString('vi-VN')}đ · Một gói xôi cần 15.000đ.`;
  }
  if (lastBalanceBand !== balanceBand) {
    if (balanceBand === 'empty') setTimeout(() => showToast('⚠️ Bạn đã hết tiền. Hãy khám phá địa danh để kiếm thưởng.'), 0);
    else if (balanceBand === 'low') setTimeout(() => showToast('🪙 Số dư thấp: chưa đủ 15.000đ để mua xôi.'), 0);
    lastBalanceBand = balanceBand;
  }
  if (xpEl) xpEl.textContent = `⭐ ${playerState.xp} XP`;
  if (stamEl) stamEl.textContent = `⚡ ${Math.round(playerState.stamina)}%`;
  if (relicEl) relicEl.textContent = `${playerState.collectedRelics}/${playerState.totalRelics}`;
  if (photoEl) photoEl.textContent = `${playerState.snappedPhotos.size}/${PHOTO_SPOTS.length}`;
  if (dayTimeEl) {
    dayTimeEl.textContent = horrorModeActive
      ? `🌧️ Đêm Ngõ 41 · 19:41`
      : `🗓️ Ngày ${playerState.day} · ${gameClockLabel(playerState.time)}`;
  }

  const n = playerState.neighborhood;
  const reputation = Math.round((n.cohesion + n.beauty + n.livelihood + n.heritage) / 4);
  const reputationEl = document.getElementById('community-reputation');
  if (reputationEl) reputationEl.textContent = reputation;
  ['cohesion', 'beauty', 'livelihood', 'heritage'].forEach((key) => {
    const el = document.getElementById(`stat-${key}`);
    if (el) el.textContent = Math.round(n[key]);
  });

  if (rankEl) {
    if (playerState.xp >= 600) rankEl.textContent = '🏆 Đại Sứ Văn Hóa Phú Thượng (Cấp 4)';
    else if (playerState.xp >= 350) rankEl.textContent = '🌟 Thổ Địa Tây Hồ (Cấp 3)';
    else if (playerState.xp >= 150) rankEl.textContent = '🌿 Công Dân Tích Cực (Cấp 2)';
    else rankEl.textContent = '🚶 Cư Dân Mới (Cấp 1)';
  }

  if (invEl) {
    if (playerState.inventory.size === 0) {
      invEl.innerHTML = '<span class="inv-empty">Trống (Bấm B xem danh mục)</span>';
    } else {
      invEl.innerHTML = '';
      playerState.inventory.forEach((val, id) => {
        const span = document.createElement('span');
        span.className = 'inv-chip';
        span.dataset.itemId = id;
        span.title = 'Nhấp để xem chi tiết & cách sử dụng vật phẩm này';
        span.textContent = `${val.icon} ${val.name} x${val.count}`;
        span.addEventListener('click', (ev) => {
          ev.stopPropagation();
          openInventoryModal(id);
        });
        invEl.appendChild(span);
      });
    }
  }
}

// Xe máy là một thực thể độc lập: khi xuống xe, xe vẫn đỗ lại trong thế giới.
const playerMotorbike = new THREE.Group();
const playerBikeMesh = createDetailedMotorbike(0, 0, -Math.PI / 2, 0xdc2626, playerMotorbike);
playerBikeMesh.scale.setScalar(0.92);
playerMotorbike.position.set(playerGroup.position.x + 0.92, 0, playerGroup.position.z);
playerMotorbike.rotation.y = loadedSnapshot?.camYaw ?? playerGroup.rotation.y;
scene.add(playerMotorbike);

const playerHeadlightTarget = new THREE.Object3D();
playerHeadlightTarget.position.set(10, 0.18, 0);
playerBikeMesh.add(playerHeadlightTarget);
const playerHeadlight = new THREE.SpotLight(0xfff2c2, 0, 34, Math.PI / 7, 0.58, 1.15);
playerHeadlight.position.set(0.62, 1.0, 0);
playerHeadlight.target = playerHeadlightTarget;
playerHeadlight.castShadow = false;
playerBikeMesh.add(playerHeadlight);
let isPlayerHeadlightOn = playerState.time >= 18.2;
let headlightManualOverride = false;

function setPlayerHeadlight(enabled, announce = true) {
  isPlayerHeadlightOn = enabled;
  playerHeadlight.intensity = enabled ? 68 : 0;
  const lampMaterial = playerBikeMesh.userData.headlightMesh?.material;
  if (lampMaterial) {
    lampMaterial.emissiveIntensity = enabled ? 3.2 : 0.35;
    lampMaterial.color.setHex(enabled ? 0xfff8d6 : 0xcbd5e1);
  }
  const btn = document.getElementById('headlight-toggle-btn');
  if (btn) {
    btn.classList.toggle('active', enabled);
    btn.textContent = enabled ? '🔆 Tắt Đèn (L)' : '💡 Đèn Xe (L)';
  }
  if (announce) showToast(enabled ? '🔆 Đã bật đèn pha xe máy.' : '💡 Đã tắt đèn pha xe máy.');
}

function togglePlayerHeadlight() {
  headlightManualOverride = true;
  setPlayerHeadlight(!isPlayerHeadlightOn);
}

setPlayerHeadlight(isPlayerHeadlightOn, false);

// ============================================================================
// HỆ THỐNG CHẾ ĐỘ SHIPPER SIÊU TỐC & XƯỞNG ĐỘ XE PHÚ THƯỢNG 3D (PHÍM G / C)
// ============================================================================
const GARAGE_STORAGE_KEY = 'phu_thuong_shipper_garage_v1';
const BIKE_CATALOG = {
  wave_red: {
    id: 'wave_red',
    name: '🛵 Honda Wave Alpha Đỏ',
    price: 0,
    speedMult: 1.0,
    accelMult: 1.0,
    rewardBonus: 0,
    colorHex: 0xdc2626,
    darkHex: 0x7f1d1d,
    metalness: 0.42,
    roughness: 0.32,
    scale: 0.92,
    perks: 'Tốc độ chuẩn · Linh hoạt trong ngõ nhỏ · Mở khóa sẵn',
    desc: 'Chiếc xe số quốc dân bền bỉ của thanh niên Hà Nội, dễ điều khiển và tiết kiệm nhiên liệu.'
  },
  dream_thai: {
    id: 'dream_thai',
    name: '🏍️ Honda Dream II Thái ("Dream Chiến")',
    price: 45000,
    speedMult: 1.15,
    accelMult: 1.2,
    rewardBonus: 0.15,
    colorHex: 0x5c2415,
    darkHex: 0xb45309,
    metalness: 0.68,
    roughness: 0.24,
    scale: 0.94,
    perks: '+15% Vận tốc · +20% Đề-pa · +15% Thù lao Ship',
    desc: 'Huyền thoại đường phố Tây Hồ với nước sơn nâu nho ánh kim, tiếng máy giòn tan và khả năng bứt tốc cực ngọt.'
  },
  vespa_vintage: {
    id: 'vespa_vintage',
    name: '🛵 Vespa Cổ Hồ Tây Kem Sữa',
    price: 85000,
    speedMult: 1.25,
    accelMult: 1.26,
    rewardBonus: 0.30,
    colorHex: 0xfef3c7,
    darkHex: 0xd97706,
    metalness: 0.56,
    roughness: 0.2,
    scale: 0.96,
    perks: '+25% Vận tốc · Giảm xóc êm ái · +30% Thù lao Ship',
    desc: 'Phong cách thanh lịch dạo quanh Hồ Tây, hệ thống treo êm giúp giữ nguyên vẹn 100% chất lượng đơn hàng.'
  },
  sh_phoenix: {
    id: 'sh_phoenix',
    name: '🚀 SH 150i Phượng Hoàng Lửa',
    price: 140000,
    speedMult: 1.38,
    accelMult: 1.42,
    rewardBonus: 0.50,
    colorHex: 0x18181b,
    darkHex: 0xef4444,
    metalness: 0.85,
    roughness: 0.16,
    scale: 1.0,
    perks: '+38% Vận tốc · Nitro Cực Đại · +50% Thù lao & XP Ship',
    desc: 'Siêu phẩm tay ga thể thao Đen Nhám viền Đỏ Vàng, thống trị mọi cung đường từ Chợ Hoa Quảng Bá tới Cổng Làng Phú Thượng!'
  }
};

const GARAGE_UPGRADES = {
  engine: {
    id: 'engine',
    name: '⚙️ Độ Động Cơ & Pô Tăng Áp',
    maxLevel: 3,
    costs: [20000, 40000, 75000],
    perks: ['Cấp 1: +10% Tốc độ & Đề-pa', 'Cấp 2: +20% Tốc độ & Tiếng pô thể thao', 'Cấp 3: +32% Tốc độ tối đa (Đạt ~98 km/h)'],
    desc: 'Xoáy nòng, tinh chỉnh chế hòa khí và lắp pô tăng áp giúp xe vọt lẹ ngay khi nhích ga.'
  },
  nitro: {
    id: 'nitro',
    name: '🔥 Bình Nitro Phun Lửa Đôi 3D',
    maxLevel: 3,
    costs: [25000, 45000, 80000],
    perks: ['Cấp 1: Phụt lửa Nitro xanh +35% lực đẩy', 'Cấp 2: Nạp Nitro nhanh gấp đôi & Bốc đầu nhẹ', 'Cấp 3: Bình Nitro Siêu Cấp +55% tốc độ bứt phá'],
    desc: 'Giữ Shift khi đang chạy xe để dùng nitro. Space luôn là phanh và ngắt nitro.'
  },
  cargo: {
    id: 'cargo',
    name: '📦 Thùng Hàng Giữ Nhiệt Shipper Pro 3D',
    maxLevel: 3,
    costs: [18000, 35000, 65000],
    perks: ['Cấp 1: Gắn Thùng Shipper 3D · +20% Tiền Tip', 'Cấp 2: Chống sốc hàng hóa 50% · +40% Tiền Tip', 'Cấp 3: Thùng Hoàng Kim Giữ Nhiệt · +65% Tiền Tip'],
    desc: 'Lắp thùng giao hàng chuyên nghiệp phía sau yên xe, giữ xôi luôn nóng và kem không chảy trên mọi địa hình.'
  },
  neon: {
    id: 'neon',
    name: '✨ Đèn Gầm Neon LED 3D & Còi Đa Âm',
    maxLevel: 3,
    costs: [15000, 30000, 55000],
    perks: ['Cấp 1: Đèn Gầm Neon Xanh Cyan · Thưởng Lách Xe +1.000đ', 'Cấp 2: Đèn Gầm Tím Cyberpunk · Thưởng Lách Xe +2.000đ', 'Cấp 3: Đèn Gầm Vàng Hoàng Kim · Thưởng Lách Xe +3.500đ'],
    desc: 'Hệ thống đèn LED gầm xe chiếu sáng mặt đường rực rỡ và tăng tiền thưởng mỗi pha Lách Xe Sát Sạt (Near-Miss).'
  }
};

const SHIPPER_ROUTES = [
  {
    id: 'route_xoi_express',
    stars: 1,
    title: '🍙 Đơn 1: Ship Xôi Xéo Nóng Dọc Phố Chính',
    customer: 'Bác Tổ Trưởng & Bà Con Cổng Làng',
    desc: 'Giao mẻ xôi nếp cái hoa vàng vừa đồ xong từ Cổng Trường 41 dọc thẳng Phố Phú Thượng về Cổng Làng Cổ và Vườn Đào.',
    baseCoins: 35000,
    baseXp: 110,
    timeLimit: 46,
    checkpoints: [
      { x: -12, z: 1.8, label: 'Cổng Trường THPT Tây Hồ (Số 41)' },
      { x: -46, z: 1.8, label: 'Quán Trà Đá Vỉa Hè Cô Hoa' },
      { x: -78, z: 1.8, label: 'Đầu Ngõ 41 Phú Thượng' },
      { x: -115, z: 1.8, label: 'Dốc Hàng Cây Xà Cừ Cổ Thụ' },
      { x: -148, z: -2.2, label: 'Cổng Làng Phú Thượng Cổ' },
      { x: -148, z: 11.5, label: 'Đích: Vườn Đào Phú Thượng' }
    ]
  },
  {
    id: 'route_flower_rush',
    stars: 2,
    title: '💐 Đơn 2: Giao Hoa Tươi Tốc Hành Từ Chợ Hoa',
    customer: 'UBND Phường & Khu Tưởng Niệm',
    desc: 'Nhận kiện hoa hồng & cúc vàng tươi thắm tại Chợ Hoa Quảng Bá, phóng dọc đại lộ về UBND Phường và Đài Tưởng Niệm.',
    baseCoins: 50000,
    baseXp: 145,
    timeLimit: 48,
    checkpoints: [
      { x: 132, z: -3.2, label: 'Cổng Chợ Hoa Quảng Bá' },
      { x: 102, z: -1.8, label: 'Đại Lộ Phía Đông' },
      { x: 68, z: -1.8, label: 'Phố Phú Thượng (Đoạn Trường Tiểu Học)' },
      { x: 36, z: -1.8, label: 'Ngã Ba 68 Phú Thượng - Phú Gia' },
      { x: 4, z: -1.8, label: 'Trụ Sở UBND Phường Phú Thượng' },
      { x: -16, z: -8.5, label: 'Lối Rẽ Khu Tưởng Niệm' },
      { x: -24, z: -22.0, label: 'Đích: Đài Tưởng Niệm Liệt Sĩ' }
    ]
  },
  {
    id: 'route_icecream_park',
    stars: 3,
    title: '🍦 Đơn 3: Ship Kem Hồ Tây Chống Tan Chảy',
    customer: 'Học Sinh Trường THPT Tây Hồ',
    desc: 'Nhận thùng Kem Ốc Quế Cốm Dừa tại Công Viên Phú Thượng, ôm cua tốc độ cao về thẳng sân sau Trường THPT Tây Hồ trước khi kem tan!',
    baseCoins: 65000,
    baseXp: 185,
    timeLimit: 46,
    checkpoints: [
      { x: 114, z: 11.5, label: 'Kiot Kem Hồ Tây (Công Viên)' },
      { x: 106, z: 2.0, label: 'Lối Ra Quảng Trường Công Viên' },
      { x: 68, z: 2.0, label: 'Trường Tiểu Học Phú Thượng' },
      { x: 32, z: 2.0, label: 'Nút Giao 68 Phú Thượng' },
      { x: -2, z: 2.0, label: 'Cổng Chính Trường THPT Tây Hồ' },
      { x: -15, z: 15.0, label: 'Đường Bên Hông Trường THPT' },
      { x: -15, z: 36.0, label: 'Đích: Khu Nội Trú Học Sinh THPT Tây Hồ' }
    ]
  },
  {
    id: 'route_peach_blossom',
    stars: 4,
    title: '🌸 Đơn 4: Chuyến Hàng Xuyên Phường (Tây sang Đông)',
    customer: 'Ban Quản Lý Công Viên & Hồ Sen',
    desc: 'Vận chuyển cành Đào Bích Phú Thượng từ phía Tây băng qua toàn bộ tuyến phố Phú Thượng để kịp trang trí Hồ Sen Công Viên!',
    baseCoins: 85000,
    baseXp: 240,
    timeLimit: 52,
    checkpoints: [
      { x: -146, z: 6.5, label: 'Vườn Đào Phú Thượng' },
      { x: -116, z: 2.0, label: 'Cổng Làng Phú Thượng' },
      { x: -72, z: 2.0, label: 'Khu Phố Cổ Ngõ 41' },
      { x: -34, z: 2.0, label: 'Quán Nước Vỉa Hè Cô Hoa' },
      { x: 6, z: 2.0, label: 'UBND Phường & Trạm Độ Xe' },
      { x: 44, z: 2.0, label: 'Ngã Tư Phú Thượng - Phú Gia' },
      { x: 92, z: 2.0, label: 'Cửa Ngõ Chợ Hoa Quảng Bá' },
      { x: 128, z: 12.2, label: 'Đích: Quảng Trường Đài Phun Nước & Hồ Sen' }
    ]
  },
  {
    id: 'route_tayho_legend',
    stars: 5,
    title: '🔥 Đơn 5: Đại Lộ Huyền Thoại Tây Hồ (Toàn Bản Đồ)',
    customer: 'Giải Đua Giao Hàng Vô Địch Phú Thượng',
    desc: 'Thử thách đỉnh cao 9 cổng Checkpoint nối liền Phố Phú Gia, Chợ Hoa Quảng Bá, Công Viên, Cổng Làng Cổ và về đích tại UBND Phường!',
    baseCoins: 125000,
    baseXp: 340,
    timeLimit: 56,
    checkpoints: [
      { x: 22, z: -1.8, label: 'Xuất Phát: Xưởng Độ Xe Phú Thượng' },
      { x: 42, z: -24.0, label: 'Tuyến Phố Phú Gia' },
      { x: 42, z: -58.0, label: 'Đình Cổ Phú Gia' },
      { x: 42, z: -12.0, label: 'Ngã Ba 68 Phú Gia' },
      { x: 126, z: -2.2, label: 'Chợ Hoa Quảng Bá' },
      { x: 118, z: 11.8, label: 'Công Viên Văn Hóa Phú Thượng' },
      { x: 12, z: 2.0, label: 'Cổng Trường THPT Tây Hồ' },
      { x: -95, z: 2.0, label: 'Đại Lộ Phía Tây' },
      { x: 0, z: -2.8, label: 'Đích Vô Địch: Sân Cờ UBND Phường Phú Thượng' }
    ]
  }
];

const PET_CATALOG = {
  corgi_gold: {
    id: 'corgi_gold',
    name: '🐕 Corgi Vàng Tây Hồ',
    price: 35000,
    bodyColor: 0xf59e0b,
    earColor: 0xb45309,
    desc: 'Chú chó Corgi chân ngắn mũm mĩm chạy lon ton theo sau bạn khắp phố Phú Thượng.',
    perks: 'Tự động thu thập Sao Di Sản ở gần (bán kính 4.8m) & +10% XP dạo phố'
  },
  cat_royal: {
    id: 'cat_royal',
    name: '🐈 Mèo Mướp Hoàng Gia',
    price: 50000,
    bodyColor: 0xfbbf24,
    earColor: 0xf43f5e,
    desc: 'Mèo thần tài đeo chuông vàng, chuyên vẫy gọi khách tới Quán Xôi và mang lại may mắn bên Hồ Sen.',
    perks: '+40% thu nhập thụ động Quán Xôi & +25% thưởng Câu Cá Hồ Sen'
  },
  shiba_shipper: {
    id: 'shiba_shipper',
    name: '🦊 Shiba Đội Mũ Bảo Hiểm',
    price: 75000,
    bodyColor: 0xea580c,
    earColor: 0x7c2d12,
    desc: 'Chiến thần Shiba đam mê tốc độ, đội mũ bảo hiểm mini chạy hộ tống xe máy của bạn.',
    perks: '+25% tốc độ hồi bình Nitro & +18% tiền Tip mọi đơn Shipper'
  }
};

const OUTFIT_CATALOG = {
  outfit_default: {
    id: 'outfit_default',
    name: '👕 Áo Phông Trẻ Trung Phú Thượng',
    price: 0,
    hatType: 'none',
    desc: 'Trang phục dạo phố năng động, gọn gàng cho ngày nắng đẹp bên Hồ Tây.',
    perks: 'Trang phục mặc định cân bằng mọi hoạt động'
  },
  outfit_shipper: {
    id: 'outfit_shipper',
    name: '🧥 Áo Khoác & Mũ Shipper Siêu Tốc',
    price: 25000,
    hatType: 'helmet',
    desc: 'Bộ đồ chuẩn tài xế công nghệ 5 sao kèm Mũ Bảo Hiểm Vàng Phản Quang 3D đội trên đầu.',
    perks: 'Hiển thị Mũ Bảo Hiểm 3D · +15% Tiền thưởng & Tip khi giao đơn Shipper'
  },
  outfit_heritage: {
    id: 'outfit_heritage',
    name: '👒 Áo Nghệ Nhân & Nón Lá Làng Nghề',
    price: 40000,
    hatType: 'nonla',
    desc: 'Tôn vinh nét đẹp truyền thống làng xôi Phú Thượng với chiếc Nón Lá 3D duyên dáng.',
    perks: 'Hiển thị Nón Lá 3D · +25% XP Câu Cá, Đá Cầu & Nhiệm vụ Văn hóa'
  },
  outfit_tycoon: {
    id: 'outfit_tycoon',
    name: '👑 Phong Thái Chủ Tịch & Vương Miện Vàng',
    price: 95000,
    hatType: 'crown',
    desc: 'Biểu tượng đại gia phố Tây Hồ với chiếc Vương Miện Hoàng Kim 3D tỏa sáng rực rỡ.',
    perks: 'Hiển thị Vương Miện 3D · +25% Thu nhập từ Quán Xôi, Shipper & Sự kiện'
  }
};

const TYCOON_UPGRADES = [
  {
    level: 1,
    name: 'Cấp 1: Gánh Xôi & Trà Đá Khởi Nghiệp',
    cost: 0,
    passivePer5s: 650,
    orderBasePay: 14000,
    desc: 'Quầy gỗ mộc mạc với thúng xôi nếp cái hoa vàng và phích đá xanh bên vỉa hè.'
  },
  {
    level: 2,
    name: 'Cấp 2: Nồi Hấp Xôi Đôi & Trà Chanh Giã Tay',
    cost: 35000,
    passivePer5s: 1500,
    orderBasePay: 19000,
    desc: 'Lắp đặt thêm cụm Nồi Hấp Inox Đôi 3D bốc khói và khay Trà Chanh Giã Tay siêu hút khách.'
  },
  {
    level: 3,
    name: 'Cấp 3: Bàn Ghế Mở Rộng & Đèn Lồng Phố Cổ',
    cost: 75000,
    passivePer5s: 2800,
    orderBasePay: 25000,
    desc: 'Mở rộng khu bàn ghế vỉa hè 3D và giăng đèn lồng đỏ rực rỡ thu hút khách du lịch Hồ Tây.'
  },
  {
    level: 4,
    name: 'Cấp 4: Cổng Chào Hoàng Kim "Danh Gia Xôi Phú Thượng"',
    cost: 140000,
    passivePer5s: 4800,
    orderBasePay: 34000,
    desc: 'Dựng Cổng Chào Hoàng Kim 3D bề thế trước quán — Biểu tượng ẩm thực số 1 Phường Phú Thượng!'
  }
];

const TROPHY_CATALOG = [
  {
    id: 'trophy_shipper',
    icon: '⚡',
    title: 'Tay Đua Shipper Tia Chớp',
    desc: 'Hoàn thành ít nhất 3 đơn giao hàng trong chế độ Shipper Siêu Tốc.',
    rewardCoins: 30000,
    rewardXp: 120,
    check: (st) => st.stats.deliveriesCompleted >= 3,
    progressText: (st) => `${Math.min(3, st.stats.deliveriesCompleted)}/3 đơn`
  },
  {
    id: 'trophy_combo',
    icon: '🔥',
    title: 'Bậc Thầy Kỹ Nghệ & Đá Cầu',
    desc: 'Đạt Combo Lách Xe ≥ x2.0 hoặc tâng Cầu Kiểng liên tiếp ≥ 6 nhịp tại Công Viên.',
    rewardCoins: 35000,
    rewardXp: 140,
    check: (st) => st.stats.bestCombo >= 2.0 || (st.stats.bestJianziCombo || 0) >= 6,
    progressText: (st) => `Combo Xe x${st.stats.bestCombo.toFixed(1)} · Cầu ${st.stats.bestJianziCombo || 0}/6`
  },
  {
    id: 'trophy_angler',
    icon: '🎣',
    title: 'Cần Thủ Hồ Sen Tây Hồ',
    desc: 'Câu thành công ít nhất 3 chú cá hoặc thủy sản tại Bến Câu Cá Hồ Sen.',
    rewardCoins: 35000,
    rewardXp: 140,
    check: (st) => (st.stats.fishCaught || 0) >= 3,
    progressText: (st) => `${Math.min(3, st.stats.fishCaught || 0)}/3 cá`
  },
  {
    id: 'trophy_tycoon',
    icon: '🏮',
    title: 'Ông Chủ Quán Xôi Phố Cổ',
    desc: 'Nâng cấp Quán Xôi Tự Quản lên Cấp 2+ hoặc phục vụ 5 lượt khách tại quán.',
    rewardCoins: 45000,
    rewardXp: 160,
    check: (st) => (st.tycoon?.level || 1) >= 2 || (st.tycoon?.totalServed || 0) >= 5,
    progressText: (st) => `Quán Cấp ${st.tycoon?.level || 1} · Phục vụ ${st.tycoon?.totalServed || 0}/5`
  },
  {
    id: 'trophy_hero',
    icon: '🚨',
    title: 'Hiệp Sĩ Đường Phố Phú Thượng',
    desc: 'Giải quyết thành công ít nhất 2 Sự Kiện Khẩn Cấp ngẫu nhiên trên phố.',
    rewardCoins: 50000,
    rewardXp: 180,
    check: (st) => (st.stats.streetEventsResolved || 0) >= 2,
    progressText: (st) => `${Math.min(2, st.stats.streetEventsResolved || 0)}/2 sự kiện`
  },
  {
    id: 'trophy_collector',
    icon: '👑',
    title: 'Đại Gia & Nhà Sưu Tập Tây Hồ',
    desc: 'Sở hữu ít nhất 2 dòng Xe Máy và nhận nuôi ít nhất 1 Thú Cưng 3D.',
    rewardCoins: 80000,
    rewardXp: 250,
    check: (st) => st.ownedBikes.length >= 2 && (st.ownedPets?.length || 0) >= 1,
    progressText: (st) => `Xe ${st.ownedBikes.length}/2 · Thú cưng ${st.ownedPets?.length || 0}/1`
  }
];

const STREET_EVENT_TEMPLATES = [
  {
    id: 'thief_chase',
    title: '🚨 Truy Đuổi Kẻ Gian Giật Túi Trên Phố!',
    desc: 'Kẻ giật túi đang chạy dọc phố. Tổ tuần tra đang truy đuổi. Bấm K báo vị trí để hỗ trợ, hoặc xuống xe gần kẻ gian và bấm E!',
    prompt: '🚨 Bấm [E] Khống chế Kẻ Gian & Trả lại túi xách (+45.000đ)',
    toastDone: '🚔 Tuyệt vời! Bạn đã tóm gọn kẻ gian, trả lại túi xách cho du khách và nhận thưởng nóng từ Công An Phường!',
    x: 24.0,
    z: 2.2,
    patrolRadius: 9.0,
    rewardCoins: 45000,
    rewardXp: 160,
    colorHex: 0xef4444
  },
  {
    id: 'broken_bike',
    title: '🛵 Cứu Hộ Xe Chở Hoa Đào Chết Máy!',
    desc: 'Bác nông dân chở đào Phú Thượng bị tuột xích xe máy ngay cửa ngõ Chợ Hoa Quảng Bá! Hãy tới bấm [E] phụ sửa xe giúp bác kịp phiên chợ!',
    prompt: '🔧 Bấm [E] Sửa xích xe & Đẩy giúp xe chở hoa (+38.000đ)',
    toastDone: '🌸 Đã sửa xong xe chở hoa giúp bác nông dân! Bác gửi tặng bạn tiền cảm ơn và lộc xuân Phú Thượng!',
    x: 84.0,
    z: -2.2,
    patrolRadius: 0,
    rewardCoins: 38000,
    rewardXp: 135,
    colorHex: 0xf59e0b
  },
  {
    id: 'lost_cat',
    title: '🐈 Giải Cứu Mèo Vàng Mắc Kẹt Giữa Ngã Tư!',
    desc: 'Chú mèo vàng của tiệm tạp hóa đang hoảng sợ tại góc Ngã Tư 68 Phú Thượng - Phú Gia! Hãy mau tới bế chú mèo vào lề đường!',
    prompt: '🐈 Bấm [E] Bế Mèo Vàng trao lại cho chủ tiệm (+34.000đ)',
    toastDone: '🐾 Meow! Bạn đã bế chú mèo vàng trao tận tay chủ tiệm tạp hóa và nhận tiền cảm ơn hậu hĩnh!',
    x: 38.5,
    z: -8.2,
    patrolRadius: 0,
    rewardCoins: 34000,
    rewardXp: 125,
    colorHex: 0xfacc15
  },
  {
    id: 'elder_cross',
    title: '👵 Dìu Cụ Già Qua Đường Giờ Cao Điểm!',
    desc: 'Một cụ bà xách làn đi chợ đang lúng túng chưa qua được đường trước cổng UBND Phường vì xe máy đông. Hãy tới bấm [E] dìu cụ qua đường!',
    prompt: '🤝 Bấm [E] Dìu cụ bà qua đường an toàn (+36.000đ)',
    toastDone: '💖 Cụ bà cảm ơn tấm lòng hiếu thảo của bạn và mừng tuổi bạn một phong bao lì xì may mắn!',
    x: -16.0,
    z: 2.2,
    patrolRadius: 0,
    rewardCoins: 36000,
    rewardXp: 140,
    colorHex: 0x38bdf8
  }
];

function loadGarageState() {
  const fallback = {
    equippedBike: 'wave_red',
    ownedBikes: ['wave_red'],
    upgrades: { engine: 0, nitro: 0, cargo: 0, neon: 0 },
    equippedPet: 'none',
    ownedPets: [],
    equippedOutfit: 'outfit_default',
    ownedOutfits: ['outfit_default'],
    tycoon: {
      level: 1,
      uncollectedCash: 0,
      totalServed: 0
    },
    claimedTrophies: [],
    stats: {
      deliveriesCompleted: 0,
      bestCombo: 1.0,
      totalShipEarnings: 0,
      streetEventsResolved: 0,
      fishCaught: 0,
      bestJianziCombo: 0,
      routeRecords: {}
    }
  };
  try {
    const raw = localStorage.getItem(GARAGE_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      equippedBike: BIKE_CATALOG[parsed?.equippedBike] ? parsed.equippedBike : 'wave_red',
      ownedBikes: Array.isArray(parsed?.ownedBikes)
        ? [...new Set(['wave_red', ...parsed.ownedBikes.filter((id) => BIKE_CATALOG[id])])]
        : ['wave_red'],
      upgrades: {
        engine: THREE.MathUtils.clamp(Number(parsed?.upgrades?.engine) || 0, 0, 3),
        nitro: THREE.MathUtils.clamp(Number(parsed?.upgrades?.nitro) || 0, 0, 3),
        cargo: THREE.MathUtils.clamp(Number(parsed?.upgrades?.cargo) || 0, 0, 3),
        neon: THREE.MathUtils.clamp(Number(parsed?.upgrades?.neon) || 0, 0, 3)
      },
      equippedPet: PET_CATALOG[parsed?.equippedPet] ? parsed.equippedPet : 'none',
      ownedPets: Array.isArray(parsed?.ownedPets)
        ? [...new Set(parsed.ownedPets.filter((id) => PET_CATALOG[id]))]
        : [],
      equippedOutfit: OUTFIT_CATALOG[parsed?.equippedOutfit] ? parsed.equippedOutfit : 'outfit_default',
      ownedOutfits: Array.isArray(parsed?.ownedOutfits)
        ? [...new Set(['outfit_default', ...parsed.ownedOutfits.filter((id) => OUTFIT_CATALOG[id])])]
        : ['outfit_default'],
      tycoon: {
        level: THREE.MathUtils.clamp(Number(parsed?.tycoon?.level) || 1, 1, 4),
        uncollectedCash: Math.max(0, Math.round(Number(parsed?.tycoon?.uncollectedCash) || 0)),
        totalServed: Math.max(0, Number(parsed?.tycoon?.totalServed) || 0)
      },
      claimedTrophies: Array.isArray(parsed?.claimedTrophies)
        ? [...new Set(parsed.claimedTrophies)]
        : [],
      stats: {
        deliveriesCompleted: Math.max(0, Number(parsed?.stats?.deliveriesCompleted) || 0),
        bestCombo: Math.max(1, Number(parsed?.stats?.bestCombo) || 1),
        totalShipEarnings: Math.max(0, Number(parsed?.stats?.totalShipEarnings) || 0),
        streetEventsResolved: Math.max(0, Number(parsed?.stats?.streetEventsResolved) || 0),
        fishCaught: Math.max(0, Number(parsed?.stats?.fishCaught) || 0),
        bestJianziCombo: Math.max(0, Number(parsed?.stats?.bestJianziCombo) || 0),
        routeRecords: parsed?.stats?.routeRecords && typeof parsed.stats.routeRecords === 'object'
          ? parsed.stats.routeRecords
          : {}
      }
    };
  } catch {
    return fallback;
  }
}

const garageState = loadGarageState();
function saveGarageState() {
  try {
    localStorage.setItem(GARAGE_STORAGE_KEY, JSON.stringify(garageState));
  } catch { /* ignore quota error */ }
}

// Tạo các phụ tùng 3D gắn trực tiếp lên chiếc xe máy của người chơi (Thùng Shipper, Đèn Gầm Neon, Lửa Nitro Đôi)
const playerCargoBoxGroup = new THREE.Group();
{
  const rackMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.25 });
  const boxMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.2 });
  const stripeMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfacc15,
    emissiveIntensity: 0.85,
    roughness: 0.25
  });
  const rack = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.04, 0.38, 2, 0.01), rackMat);
  rack.position.set(-0.66, 0.88, 0);
  playerCargoBoxGroup.add(rack);

  const cargoCube = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.42, 0.44, 4, 0.045), boxMat);
  cargoCube.position.set(-0.68, 1.11, 0);
  cargoCube.castShadow = true;
  playerCargoBoxGroup.add(cargoCube);

  const reflectBand = new THREE.Mesh(new THREE.BoxGeometry(0.455, 0.06, 0.455), stripeMat);
  reflectBand.position.set(-0.68, 1.12, 0);
  playerCargoBoxGroup.add(reflectBand);

  playerCargoBoxGroup.userData.boxMat = boxMat;
  playerCargoBoxGroup.visible = false;
  playerBikeMesh.add(playerCargoBoxGroup);
}

const playerNeonGlowGroup = new THREE.Group();
{
  const neonMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const underRing = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.66, 28).rotateX(-Math.PI / 2),
    neonMat
  );
  underRing.position.set(-0.08, 0.04, 0);
  underRing.scale.set(1.35, 1, 0.78);
  playerNeonGlowGroup.add(underRing);

  const tubeBar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.78, 10),
    neonMat
  );
  tubeBar.rotation.z = Math.PI / 2;
  tubeBar.position.set(-0.1, 0.24, 0);
  playerNeonGlowGroup.add(tubeBar);

  playerNeonGlowGroup.userData.neonMat = neonMat;
  playerNeonGlowGroup.visible = false;
  playerBikeMesh.add(playerNeonGlowGroup);
}

const playerNitroFlameGroup = new THREE.Group();
{
  const outerFlameMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.88,
    depthWrite: false
  });
  const innerFlameMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.95,
    depthWrite: false
  });
  const outerCone = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.58, 12), outerFlameMat);
  outerCone.rotation.z = Math.PI / 2;
  outerCone.position.set(-0.98, 0.29, -0.25);
  playerNitroFlameGroup.add(outerCone);

  const innerCone = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.36, 10), innerFlameMat);
  innerCone.rotation.z = Math.PI / 2;
  innerCone.position.set(-0.88, 0.29, -0.25);
  playerNitroFlameGroup.add(innerCone);

  playerNitroFlameGroup.visible = false;
  playerBikeMesh.add(playerNitroFlameGroup);
}

let nitroFuel = 100;
let isNitroBoosting = false;
let activeShipperRun = null;
let isShipperModalOpen = false;
let activeShipperTab = 'orders';
let stuntBannerTimer = 0;
const nearMissCooldownMap = new Map();

// Cổng Vòng Sáng Checkpoint 3D cho chế độ Shipper Siêu Tốc
const shipperCheckpointGroup = new THREE.Group();
shipperCheckpointGroup.visible = false;
{
  const archRingMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide
  });
  // Cổng vòm Neon dựng đứng trên mặt đường để phóng xe xuyên qua
  const archTorus = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.14, 14, 36), archRingMat);
  archTorus.position.y = 2.1;
  shipperCheckpointGroup.add(archTorus);

  const groundRing = new THREE.Mesh(
    new THREE.RingGeometry(2.1, 2.55, 36).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.78, side: THREE.DoubleSide })
  );
  groundRing.position.y = 0.06;
  shipperCheckpointGroup.add(groundRing);

  const pillarBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 1.85, 14, 18, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  pillarBeam.position.y = 7.0;
  shipperCheckpointGroup.add(pillarBeam);

  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.55, 0),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 1.6, roughness: 0.2 })
  );
  crystal.position.y = 3.6;
  shipperCheckpointGroup.add(crystal);

  shipperCheckpointGroup.userData = { archTorus, groundRing, pillarBeam, crystal, archRingMat };
  scene.add(shipperCheckpointGroup);
}

function applyGarageToPlayerBike() {
  const bikeMeta = BIKE_CATALOG[garageState.equippedBike] || BIKE_CATALOG.wave_red;
  const paintMat = playerBikeMesh.userData.paintMat;
  const paintDark = playerBikeMesh.userData.paintDark;
  if (paintMat) {
    paintMat.color.setHex(bikeMeta.colorHex);
    paintMat.metalness = bikeMeta.metalness;
    paintMat.roughness = bikeMeta.roughness;
  }
  if (paintDark) {
    paintDark.color.setHex(bikeMeta.darkHex);
  }
  playerBikeMesh.scale.setScalar(bikeMeta.scale || 0.92);

  // Thùng hàng Shipper 3D hiện khi đã nâng cấp Cargo hoặc đang trong ca giao hàng
  const cargoLv = garageState.upgrades.cargo;
  playerCargoBoxGroup.visible = cargoLv > 0 || !!activeShipperRun;
  if (playerCargoBoxGroup.userData.boxMat) {
    const cargoColors = [0xf97316, 0xf59e0b, 0x0ea5e9, 0xfacc15];
    playerCargoBoxGroup.userData.boxMat.color.setHex(cargoColors[cargoLv] || 0xf59e0b);
  }

  // Đèn gầm Neon LED 3D
  const neonLv = garageState.upgrades.neon;
  playerNeonGlowGroup.visible = neonLv > 0;
  if (playerNeonGlowGroup.userData.neonMat) {
    const neonColors = [0x38bdf8, 0x38bdf8, 0xe879f9, 0xfacc15];
    playerNeonGlowGroup.userData.neonMat.color.setHex(neonColors[neonLv] || 0x38bdf8);
  }

  const speedoBikeEl = document.getElementById('speedo-bike-name');
  if (speedoBikeEl) speedoBikeEl.textContent = bikeMeta.name;
}

function getBikeMaxForwardSpeed(withNitro = false) {
  const bikeMeta = BIKE_CATALOG[garageState.equippedBike] || BIKE_CATALOG.wave_red;
  const engineBonus = 1 + garageState.upgrades.engine * 0.1;
  const baseTop = 16.5 * bikeMeta.speedMult * engineBonus;
  if (!withNitro) return baseTop;
  const nitroBonus = 1.28 + garageState.upgrades.nitro * 0.08;
  return baseTop * nitroBonus;
}

function triggerStuntBanner(text) {
  const banner = document.getElementById('shipper-stunt-banner');
  if (!banner) return;
  banner.textContent = text;
  banner.classList.remove('hidden');
  stuntBannerTimer = 2.4;
}

function syncShipperCheckpoint3D() {
  if (!activeShipperRun) {
    shipperCheckpointGroup.visible = false;
    return;
  }
  const cp = activeShipperRun.route.checkpoints[activeShipperRun.cpIndex];
  if (!cp) {
    shipperCheckpointGroup.visible = false;
    return;
  }
  const isFinal = activeShipperRun.cpIndex === activeShipperRun.route.checkpoints.length - 1;
  shipperCheckpointGroup.visible = true;
  shipperCheckpointGroup.position.set(cp.x, getGroundElevationAt(cp.x, cp.z), cp.z);

  // Xoay cổng vòm vuông góc với hướng di chuyển từ người chơi tới cổng
  const dx = cp.x - playerGroup.position.x;
  const dz = cp.z - playerGroup.position.z;
  shipperCheckpointGroup.rotation.y = Math.atan2(dx, dz);

  const { archRingMat, pillarBeam } = shipperCheckpointGroup.userData;
  if (archRingMat) archRingMat.color.setHex(isFinal ? 0x4ade80 : 0x38bdf8);
  if (pillarBeam) pillarBeam.material.color.setHex(isFinal ? 0x4ade80 : 0x38bdf8);
}

function startShipperRoute(routeId) {
  if (horrorModeActive) {
    showToast('⚠️ Không thể nhận đơn Shipper ban ngày khi đang ở trong Cốt truyện Đêm Ngõ 41.');
    return;
  }
  const route = SHIPPER_ROUTES.find((r) => r.id === routeId) || SHIPPER_ROUTES[0];
  if (!route) return;

  if (isShipperModalOpen) closeShipperModal();
  if (activePropSession) stopActivePropSession(false);

  // Tự động gọi chiếc xe máy độ tới ngay dưới chân và lên xe nổ máy xuất phát!
  const firstCp = route.checkpoints[0];
  const startYaw = Math.atan2(firstCp.x - playerGroup.position.x, firstCp.z - playerGroup.position.z);
  playerMotorbike.position.set(playerGroup.position.x, playerGroup.position.y, playerGroup.position.z);
  playerMotorbike.rotation.y = startYaw;
  if (!playerState.isRidingBike) {
    togglePlayerMotorbike();
  }
  playerGroup.rotation.y = startYaw;
  rideMotion.heading = startYaw;
  targetCamYaw = startYaw;
  nitroFuel = 100;

  activeShipperRun = {
    route,
    cpIndex: 0,
    timeLeft: route.timeLimit + garageState.upgrades.cargo * 4,
    elapsed: 0,
    combo: 1.0,
    maxCombo: 1.0,
    cargoHealth: 100,
    nearMissCount: 0
  };

  applyGarageToPlayerBike();
  syncShipperCheckpoint3D();
  playSoundEffect('quest');
  triggerStuntBanner(`🚀 XUẤT PHÁT: ${route.title.toUpperCase()}!`);
  showToast(
    `⚡ Đã nhận "${route.title}"! Tới checkpoint đầu: ${firstCp.label}. Shift: nitro · Space: phanh.`,
    5200
  );
}

function abortShipperRoute(reason = 'Đã hủy đơn Shipper hiện tại.') {
  if (!activeShipperRun) return;
  activeShipperRun = null;
  shipperCheckpointGroup.visible = false;
  applyGarageToPlayerBike();
  const missionBox = document.getElementById('shipper-mission-box');
  if (missionBox) missionBox.classList.add('hidden');
  showToast(`⏹️ ${reason}`, 3800);
}

// ============================================================================
// MÔ HÌNH 3D THÚ CƯNG ĐI THEO (playerPetGroup) & PHỤ KIỆN MŨ / VƯƠNG MIỆN 3D (playerHatGroup)
// ============================================================================
// Hàm dựng mô hình Mèo Vàng 3D chi tiết (dùng làm khung hiển thị tức thì và tự động nâng cấp lên GLB 36 xương có hoạt ảnh mượt mà)
function createDetailedFeline3D() {
  const catRoot = new THREE.Group();
  const fallback = new THREE.Group();
  catRoot.add(fallback);

  const furMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.52 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.55 });
  const creamMat = new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.6 });
  const pinkMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.45 });
  const eyeOuterMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.35, roughness: 0.15 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1 });
  const collarMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 });
  const bellMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.85, roughness: 0.18, emissive: 0xd97706, emissiveIntensity: 0.35 });

  // Thân mèo uyển chuyển + ngực trắng + đùi sau
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.24, 8, 16).rotateX(Math.PI / 2), furMat);
  torso.position.set(0, 0.23, 0);
  torso.castShadow = true;
  fallback.add(torso);

  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.112, 14, 12), creamMat);
  chest.scale.set(0.92, 1.05, 0.85);
  chest.position.set(0, 0.22, 0.13);
  fallback.add(chest);

  // Vằn lưng mướp vàng đặc trưng
  [-0.06, 0.02, 0.09].forEach((sz) => {
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.114, 0.012, 6, 16, Math.PI), stripeMat);
    stripe.rotation.y = Math.PI / 2;
    stripe.position.set(0, 0.24, sz);
    fallback.add(stripe);
  });

  // Đầu mèo tròn bầu + đôi má phính + mõm trắng + mũi hồng + râu mèo
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.36, 0.21);
  fallback.add(headGroup);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.125, 16, 14), furMat);
  skull.scale.set(1.08, 0.96, 1.02);
  skull.castShadow = true;
  headGroup.add(skull);

  [-0.048, 0.048].forEach((cx) => {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), creamMat);
    cheek.scale.set(1.1, 0.85, 0.95);
    cheek.position.set(cx, -0.028, 0.095);
    headGroup.add(cheek);
  });

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.024, 3).rotateX(Math.PI / 2), pinkMat);
  nose.position.set(0, -0.008, 0.138);
  headGroup.add(nose);

  [-0.052, 0.052].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 10), eyeOuterMat);
    eye.scale.set(1, 1.12, 0.65);
    eye.position.set(ex, 0.022, 0.108);
    headGroup.add(eye);

    const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.028, 0.012), pupilMat);
    pupil.position.set(ex, 0.022, 0.122);
    headGroup.add(pupil);
  });

  // Đôi tai mèo 2 lớp (vành ngoài vàng + tai trong hồng phấn)
  [-0.075, 0.075].forEach((ex) => {
    const earOuter = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.11, 4), furMat);
    earOuter.position.set(ex, 0.115, -0.01);
    earOuter.rotation.z = ex < 0 ? 0.24 : -0.24;
    earOuter.rotation.y = ex < 0 ? -0.35 : 0.35;
    headGroup.add(earOuter);

    const earInner = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.075, 3), pinkMat);
    earInner.position.set(ex * 0.96, 0.11, 0.012);
    earInner.rotation.z = ex < 0 ? 0.24 : -0.24;
    headGroup.add(earInner);
  });

  // Vòng cổ đỏ & Chuông vàng leng keng
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.098, 0.018, 8, 20).rotateX(Math.PI / 2), collarMat);
  collar.position.set(0, 0.295, 0.175);
  fallback.add(collar);
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 10), bellMat);
  bell.position.set(0, 0.265, 0.27);
  fallback.add(bell);

  // Đuôi mèo cong chữ S mềm mại
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.25, -0.16),
    new THREE.Vector3(0, 0.34, -0.28),
    new THREE.Vector3(0.03, 0.46, -0.34),
    new THREE.Vector3(-0.02, 0.54, -0.30)
  ]);
  const tailMesh = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 14, 0.026, 8, false), furMat);
  tailMesh.castShadow = true;
  fallback.add(tailMesh);

  // 4 Chân mèo khớp đùi + bàn chân tất trắng (Tất cả đứng trên mặt phẳng y = 0.00!)
  const legs = [];
  [
    [-0.068, 0.12],
    [0.068, 0.12],
    [-0.072, -0.12],
    [0.072, -0.12]
  ].forEach(([lx, lz]) => {
    const legGrp = new THREE.Group();
    legGrp.position.set(lx, 0.16, lz);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.025, 0.14, 10), furMat);
    upper.position.y = -0.07;
    upper.castShadow = true;
    legGrp.add(upper);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), creamMat);
    paw.scale.set(0.95, 0.65, 1.25);
    paw.position.set(0, -0.14, 0.012);
    legGrp.add(paw);
    fallback.add(legGrp);
    legs.push(legGrp);
  });

  catRoot.userData = { fallback, headGroup, tailMesh, legs, bodyMat: furMat, earMat: stripeMat, glbLoaded: false, mixer: null };
  return catRoot;
}

const playerPetGroup = new THREE.Group();
{
  const petFallbackCat = createDetailedFeline3D();
  playerPetGroup.add(petFallbackCat);

  // Mũ bảo hiểm mini cho Shiba Shipper
  const miniHelmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.145, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.3 })
  );
  miniHelmet.position.set(0, 0.45, 0.22);
  miniHelmet.visible = false;
  playerPetGroup.add(miniHelmet);

  const petLabel = createNPCLabel('🐕 Thú Cưng', '#fde047');
  petLabel.position.set(0, 0.85, 0);
  petLabel.scale.set(1.75, 0.36, 1);
  playerPetGroup.add(petLabel);

  const glbCatHolder = new THREE.Group();
  glbCatHolder.visible = false;
  playerPetGroup.add(glbCatHolder);

  const glbDogHolder = new THREE.Group();
  glbDogHolder.visible = false;
  playerPetGroup.add(glbDogHolder);

  playerPetGroup.userData = {
    bodyMat: petFallbackCat.userData.bodyMat,
    earMat: petFallbackCat.userData.earMat,
    miniHelmet,
    tail: petFallbackCat.userData.tailMesh,
    legs: petFallbackCat.userData.legs,
    petLabel,
    petFallbackCat,
    glbCatHolder,
    glbDogHolder,
    catMixer: null,
    dogMixer: null,
    dogActions: {}
  };
  playerPetGroup.visible = false;
  playerPetGroup.position.set(playerGroup.position.x - 1.1, 0, playerGroup.position.z - 0.8);
  scene.add(playerPetGroup);

  // Tải mô hình GLB 3D thực tế cho Mèo Hoàng Gia (cat-golden.glb) & Chó Corgi/Shiba (pet-fox.glb)
  gltfLoader.load('assets/models/cat-golden.glb', (gltf) => {
    const model = gltf.scene;
    model.scale.setScalar(0.00135);
    model.position.y = 0.01;
    model.traverse((n) => {
      if (n.isMesh) {
        n.castShadow = true;
        n.receiveShadow = true;
        n.frustumCulled = false;
        if (n.material) {
          n.material = n.material.clone();
          n.material.color.setHex(0xffd480);
          n.material.roughness = 0.55;
        }
      }
    });
    glbCatHolder.add(model);
    if (gltf.animations?.[0]) {
      const m = new THREE.AnimationMixer(model);
      m.clipAction(gltf.animations[0]).play();
      playerPetGroup.userData.catMixer = m;
    }
    applyPlayerStyle3D();
  }, undefined, () => {});

  gltfLoader.load('assets/models/pet-fox.glb', (gltf) => {
    const model = gltf.scene;
    model.scale.setScalar(0.0056);
    model.position.y = 0.01;
    model.traverse((n) => {
      if (n.isMesh) {
        n.castShadow = true;
        n.receiveShadow = true;
        n.frustumCulled = false;
      }
    });
    glbDogHolder.add(model);
    const m = new THREE.AnimationMixer(model);
    const actions = {};
    gltf.animations.forEach((clip) => {
      actions[clip.name.toLowerCase()] = m.clipAction(clip);
    });
    if (actions.survey) actions.survey.play();
    else if (actions.walk) actions.walk.play();
    playerPetGroup.userData.dogMixer = m;
    playerPetGroup.userData.dogActions = actions;
    applyPlayerStyle3D();
  }, undefined, () => {});
}

// Phụ kiện Mũ / Nón Lá / Vương Miện 3D đội trên đầu nhân vật người chơi
const playerHatGroup = new THREE.Group();
{
  // 1. Mũ Bảo Hiểm Vàng Shipper 3D
  const helmetGroup = new THREE.Group();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.25 })
  );
  helmetGroup.add(dome);
  const visor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.185, 0.185, 0.07, 14, 1, true, -Math.PI * 0.35, Math.PI * 0.7),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15, metalness: 0.8, side: THREE.DoubleSide })
  );
  visor.position.set(0, -0.02, 0.02);
  helmetGroup.add(visor);
  helmetGroup.visible = false;
  playerHatGroup.add(helmetGroup);

  // 2. Nón Lá Làng Nghề Truyền Thống 3D
  const nonlaGroup = new THREE.Group();
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.34, 0.22, 24),
    new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.75, side: THREE.DoubleSide })
  );
  cone.position.y = 0.08;
  nonlaGroup.add(cone);
  nonlaGroup.visible = false;
  playerHatGroup.add(nonlaGroup);

  // 3. Vương Miện Hoàng Kim Đại Gia 3D
  const crownGroup = new THREE.Group();
  const crownMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.75,
    metalness: 0.85,
    roughness: 0.18
  });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.135, 0.09, 16), crownMat);
  crownGroup.add(band);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.11, 8), crownMat);
    spike.position.set(Math.cos(a) * 0.135, 0.08, Math.sin(a) * 0.135);
    crownGroup.add(spike);
  }
  crownGroup.visible = false;
  playerHatGroup.add(crownGroup);

  playerHatGroup.userData = { helmetGroup, nonlaGroup, crownGroup };
  playerHatGroup.position.set(0, 1.68, 0);
  playerGroup.add(playerHatGroup);
}

function syncTycoonStall3D() {
  const lv = garageState.tycoon?.level || 1;
  if (playerTycoonUpgradeMeshes.lv2) playerTycoonUpgradeMeshes.lv2.visible = lv >= 2;
  if (playerTycoonUpgradeMeshes.lv3) playerTycoonUpgradeMeshes.lv3.visible = lv >= 3;
  if (playerTycoonUpgradeMeshes.lv4) playerTycoonUpgradeMeshes.lv4.visible = lv >= 4;
}

function applyPlayerStyle3D() {
  // Cập nhật Thú Cưng 3D (Sử dụng GLB 3D có xương hoạt ảnh nếu đã nạp xong)
  const petMeta = PET_CATALOG[garageState.equippedPet];
  if (!petMeta || horrorModeActive) {
    playerPetGroup.visible = false;
  } else {
    playerPetGroup.visible = true;
    const { bodyMat, earMat, miniHelmet, petFallbackCat, glbCatHolder, glbDogHolder, catMixer, dogMixer } = playerPetGroup.userData;
    if (bodyMat) bodyMat.color.setHex(petMeta.bodyColor);
    if (earMat) earMat.color.setHex(petMeta.earColor);
    const isCat = petMeta.id === 'cat_royal';
    const hasCatGlb = isCat && !!catMixer;
    const hasDogGlb = !isCat && !!dogMixer;
    if (glbCatHolder) glbCatHolder.visible = hasCatGlb;
    if (glbDogHolder) glbDogHolder.visible = hasDogGlb;
    if (petFallbackCat) petFallbackCat.visible = !(hasCatGlb || hasDogGlb);
    if (miniHelmet) miniHelmet.visible = petMeta.id === 'shiba_shipper';
  }

  // Cập nhật Mũ / Nón Lá / Vương Miện 3D trên đầu nhân vật
  const outfitMeta = OUTFIT_CATALOG[garageState.equippedOutfit] || OUTFIT_CATALOG.outfit_default;
  const { helmetGroup, nonlaGroup, crownGroup } = playerHatGroup.userData;
  if (helmetGroup) helmetGroup.visible = outfitMeta.hatType === 'helmet';
  if (nonlaGroup) nonlaGroup.visible = outfitMeta.hatType === 'nonla';
  if (crownGroup) crownGroup.visible = outfitMeta.hatType === 'crown';
  playerHatGroup.visible = outfitMeta.hatType !== 'none' && camMode !== 'fps';
}

// ============================================================================
// HỆ THỐNG SỰ KIỆN ĐƯỜNG PHỐ NGẪU NHIÊN 3D (DYNAMIC STREET EVENTS)
// ============================================================================
let activeStreetEvent = null;
let streetEventSpawnTimer = 28; // Sau 28s dạo phố sẽ phát sinh sự kiện đầu tiên
const streetEventGroup = new THREE.Group();
streetEventGroup.visible = false;
{
  const evShadow = visualMaterials.contactShadow(3.6, 3.6, 0.36);
  evShadow.position.y = 0.015;
  streetEventGroup.add(evShadow);

  const ringMesh = new THREE.Mesh(
    new THREE.RingGeometry(1.55, 1.88, 40).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.78, side: THREE.DoubleSide })
  );
  ringMesh.position.y = 0.04;
  streetEventGroup.add(ringMesh);

  const beaconCrystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.22, 0),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 1.6, roughness: 0.2 })
  );
  beaconCrystal.position.y = 2.85;
  streetEventGroup.add(beaconCrystal);

  const scenes = {
    broken_bike: new THREE.Group(),
    thief_chase: new THREE.Group(),
    lost_cat: new THREE.Group(),
    elder_cross: new THREE.Group()
  };
  Object.values(scenes).forEach((sc) => {
    sc.visible = false;
    streetEventGroup.add(sc);
  });

  // 1. Cảnh 3D: Cứu Hộ Xe Máy Chở Hoa Đào Nhật Tân Chết Máy (broken_bike)
  const smokeWisps = [];
  {
    const sc = scenes.broken_bike;
    const bike = createDetailedMotorbike(-0.28, 0.12, 0.25, 0xb91c1c, sc);
    bike.rotation.x = 0.14; // Xe nghiêng trên chân chống phụ vì tuột xích

    // Sọt tre & Cành Đào Nhật Tân Thế Cổ Thụ buộc sau yên xe
    const carrierGroup = new THREE.Group();
    carrierGroup.position.set(-0.62, 0.94, 0);
    const basketMat = new THREE.MeshStandardMaterial({ color: 0xd9a05b, roughness: 0.86 });
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.7 });
    const peachBlossomMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.55 });
    const peachBudMat = new THREE.MeshStandardMaterial({ color: 0xfb7185, roughness: 0.5 });

    const bambooRack = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.26, 0.52, 3, 0.04), basketMat);
    bambooRack.castShadow = true;
    carrierGroup.add(bambooRack);

    const tieRope = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.54), ropeMat);
    tieRope.position.y = 0.05;
    carrierGroup.add(tieRope);

    const mainBranch = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.065, 1.35, 8), barkMat);
    mainBranch.position.set(-0.1, 0.55, 0);
    mainBranch.rotation.z = 0.35;
    mainBranch.castShadow = true;
    carrierGroup.add(mainBranch);

    [
      [-0.22, 0.95, 0.18, 0.26],
      [-0.05, 1.08, -0.16, 0.28],
      [-0.35, 1.15, 0.0, 0.3],
      [0.08, 0.85, 0.2, 0.22],
      [-0.18, 0.78, -0.22, 0.24]
    ].forEach(([bx, by, bz, br], idx) => {
      const puff = new THREE.Mesh(
        new THREE.IcosahedronGeometry(br, 2),
        idx % 2 === 0 ? peachBlossomMat : peachBudMat
      );
      puff.scale.set(1.18, 0.85, 1.15);
      puff.position.set(bx, by, bz);
      puff.castShadow = true;
      carrierGroup.add(puff);
    });
    bike.add(carrierGroup);

    // Biển tam giác cảnh báo phản quang & Hộp đồ nghề sửa xe đặt dưới lòng đường
    const triGroup = new THREE.Group();
    triGroup.position.set(-1.35, 0.02, -0.28);
    triGroup.rotation.y = 0.4;
    const triMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 0.65,
      roughness: 0.35
    });
    const triBase = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.12), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    triBase.position.y = 0.02;
    triGroup.add(triBase);
    const triCone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.38, 3), triMat);
    triCone.position.y = 0.21;
    triCone.scale.z = 0.22;
    triGroup.add(triCone);
    sc.add(triGroup);

    const toolBox = new THREE.Mesh(
      new RoundedBoxGeometry(0.36, 0.18, 0.22, 2, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.55, roughness: 0.35 })
    );
    toolBox.position.set(-0.55, 0.09, 0.55);
    toolBox.rotation.y = -0.3;
    toolBox.castShadow = true;
    sc.add(toolBox);

    // Làn khói xám bốc lên từ lốc máy xe hỏng
    const smokeMat = new THREE.MeshBasicMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.32,
      depthWrite: false
    });
    for (let i = 0; i < 3; i++) {
      const wisp = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 1), smokeMat.clone());
      wisp.position.set(-0.15, 0.45 + i * 0.22, 0.12);
      sc.add(wisp);
      smokeWisps.push(wisp);
    }

    const humanSlot = new THREE.Group();
    humanSlot.position.set(0.55, 0, -0.42);
    humanSlot.rotation.y = -0.55;
    sc.add(humanSlot);
    sc.userData.humanSlot = humanSlot;
  }

  // 2. Cảnh 3D: Truy Đuổi Kẻ Gian Giật Túi Trên Phố (thief_chase)
  {
    const sc = scenes.thief_chase;
    const humanSlot = new THREE.Group();
    sc.add(humanSlot);
    sc.userData.humanSlot = humanSlot;

    // Chiếc túi xách da đỏ thời trang bị giật đang cầm trên tay
    const bagGroup = new THREE.Group();
    bagGroup.position.set(0.32, 0.98, 0.26);
    const bagBody = new THREE.Mesh(
      new RoundedBoxGeometry(0.28, 0.22, 0.12, 3, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35, metalness: 0.15 })
    );
    bagBody.castShadow = true;
    bagGroup.add(bagBody);
    const bagStrap = new THREE.Mesh(
      new THREE.TorusGeometry(0.09, 0.015, 8, 16, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 })
    );
    bagStrap.position.y = 0.11;
    bagGroup.add(bagStrap);
    sc.add(bagGroup);
  }

  // 3. Cảnh 3D: Giải Cứu Mèo Vàng Mắc Kẹt Giữa Ngã Tư (lost_cat — Mô hình GLB 36 xương + Chủ tiệm vẫy gọi cứu hộ)
  let lostCatModel = null;
  const eventMixers = [];
  {
    const sc = scenes.lost_cat;
    lostCatModel = createDetailedFeline3D();
    lostCatModel.scale.setScalar(1.18);
    sc.add(lostCatModel);

    // Nạp mô hình Mèo Vàng 3D GLB có khung xương hoạt ảnh chân thực (assets/models/cat-golden.glb)
    gltfLoader.load('assets/models/cat-golden.glb', (gltf) => {
      const catGlb = gltf.scene;
      catGlb.scale.setScalar(0.00142);
      catGlb.position.y = 0.01;
      catGlb.traverse((n) => {
        if (n.isMesh) {
          n.castShadow = true;
          n.receiveShadow = true;
          n.frustumCulled = false;
          if (n.material) {
            n.material = n.material.clone();
            n.material.color.setHex(0xffd278);
            n.material.roughness = 0.52;
          }
        }
      });
      if (lostCatModel.userData.fallback) {
        lostCatModel.userData.fallback.visible = false;
      }
      lostCatModel.add(catGlb);
      if (gltf.animations?.[0]) {
        const catMixer = new THREE.AnimationMixer(catGlb);
        catMixer.clipAction(gltf.animations[0]).play();
        eventMixers.push(catMixer);
      }
    }, undefined, () => {});

    // Nệm ổ mèo mây đan tròn + Bát sứ đựng cá & sữa đặt bên cạnh (thay thế khối hộp cam phẳng thô cũ!)
    const bedGroup = new THREE.Group();
    bedGroup.position.set(-0.58, 0.02, -0.22);
    const rattanRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.055, 10, 24).rotateX(Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xd9a05b, roughness: 0.82 })
    );
    rattanRim.position.y = 0.055;
    rattanRim.castShadow = true;
    bedGroup.add(rattanRim);
    const cushion = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.06, 20),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.75 })
    );
    cushion.position.y = 0.035;
    bedGroup.add(cushion);
    sc.add(bedGroup);

    const bowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.085, 0.065, 16),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3 })
    );
    bowl.position.set(-0.22, 0.035, -0.36);
    bowl.castShadow = true;
    sc.add(bowl);

    const trafficCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.48, 14),
      new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 0.35, roughness: 0.4 })
    );
    trafficCone.position.set(0.62, 0.24, -0.24);
    trafficCone.castShadow = true;
    sc.add(trafficCone);

    const humanSlot = new THREE.Group();
    humanSlot.position.set(-0.78, 0, -0.48);
    humanSlot.rotation.y = 0.55;
    sc.add(humanSlot);
    sc.userData.humanSlot = humanSlot;
  }

  // 4. Cảnh 3D: Dìu Cụ Già Qua Đường Giờ Cao Điểm (elder_cross)
  {
    const sc = scenes.elder_cross;
    const humanSlot = new THREE.Group();
    sc.add(humanSlot);
    sc.userData.humanSlot = humanSlot;

    // Làn nhựa đỏ đi chợ truyền thống Hà Nội & Gậy gỗ chống tay
    const basketGroup = new THREE.Group();
    basketGroup.position.set(0.36, 0.52, 0.12);
    const basketBody = new THREE.Mesh(
      new RoundedBoxGeometry(0.34, 0.28, 0.2, 3, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.45 })
    );
    basketBody.castShadow = true;
    basketGroup.add(basketBody);
    const veggies = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 1), canopySunlitMat);
    veggies.position.set(0, 0.16, 0);
    basketGroup.add(veggies);
    sc.add(basketGroup);

    const cane = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.014, 0.92, 8),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.65 })
    );
    cane.position.set(-0.34, 0.46, 0.22);
    cane.rotation.x = 0.12;
    cane.castShadow = true;
    sc.add(cane);
  }

  const eventLabel = createNPCLabel('🚨 SỰ KIỆN KHẨN CẤP (Phím E)', '#fca5a5');
  eventLabel.position.set(0, 3.35, 0);
  eventLabel.scale.set(3.2, 0.62, 1);
  streetEventGroup.add(eventLabel);

  const attachHumanCharacters = (buildHumanFn) => {
    try {
      // Bác nông dân chở đào Phú Thượng
      const farmer = buildHumanFn('male', {identityId:EVENT_IDENTITIES[0],scale:1.02});
      scenes.broken_bike.userData.humanSlot.add(farmer.model);
      const m1 = new THREE.AnimationMixer(farmer.model);
      allMixers.push(m1);
      m1.clipAction(farmer.clips.talk || farmer.clips.idle).play();

      // Kẻ gian giật túi
      const thief = buildHumanFn('male', {identityId:EVENT_IDENTITIES[1],scale:1.02});
      scenes.thief_chase.userData.humanSlot.add(thief.model);
      const m2 = new THREE.AnimationMixer(thief.model);
      allMixers.push(m2);
      m2.clipAction(thief.clips.run || thief.clips.walk).play();
      scenes.thief_chase.userData.flee=()=>{m2.stopAllAction();m2.clipAction(thief.clips.run||thief.clips.walk).play();};
      scenes.thief_chase.userData.detain=()=>{m2.stopAllAction();m2.clipAction(thief.clips.idle).play();};

      // Cụ bà qua đường
      const elder = buildHumanFn('female', {identityId:EVENT_IDENTITIES[2],scale:.96});
      scenes.elder_cross.userData.humanSlot.add(elder.model);
      const m3 = new THREE.AnimationMixer(elder.model);
      allMixers.push(m3);
      eventMixers.push(m3);
      m3.clipAction(elder.clips.talk || elder.clips.idle).play();

      // Chủ tiệm tạp hóa đứng cạnh vẫy gọi cứu hộ chú Mèo Vàng
      if (scenes.lost_cat.userData.humanSlot) {
        const catOwner = buildHumanFn('female', {identityId:EVENT_IDENTITIES[3] || EVENT_IDENTITIES[0], scale: 0.98});
        scenes.lost_cat.userData.humanSlot.add(catOwner.model);
        const m4 = new THREE.AnimationMixer(catOwner.model);
        allMixers.push(m4);
        eventMixers.push(m4);
        m4.clipAction(catOwner.clips.talk || catOwner.clips.idle).play();
      }
      eventMixers.push(m1, m2);
    } catch (e) {
      console.warn('Không thể gắn mô hình nhân vật sự kiện:', e);
    }
  };

  streetEventGroup.userData = {
    ringMesh,
    beaconCrystal,
    scenes,
    smokeWisps,
    lostCatModel,
    eventMixers,
    eventLabel,
    attachHumanCharacters
  };
  scene.add(streetEventGroup);
}

function spawnRandomStreetEvent(forceTemplateId = null) {
  if (horrorModeActive) return;
  const tpl = forceTemplateId
    ? (STREET_EVENT_TEMPLATES.find((t) => t.id === forceTemplateId) || STREET_EVENT_TEMPLATES[0])
    : STREET_EVENT_TEMPLATES[Math.floor(Math.random() * STREET_EVENT_TEMPLATES.length)];

  activeStreetEvent = {
    template: tpl,
    baseX: tpl.x,
    baseZ: tpl.z,
    x: tpl.x,
    z: tpl.z,
    timeLeft: 85
  };

  streetEventGroup.visible = true;
  streetEventGroup.rotation.y=0;
  streetEventGroup.position.set(tpl.x, getGroundElevationAt(tpl.x, tpl.z), tpl.z);
  const { ringMesh, scenes } = streetEventGroup.userData;
  if (ringMesh) ringMesh.material.color.setHex(tpl.colorHex);
  if (scenes) {
    Object.entries(scenes).forEach(([id, grp]) => {
      grp.visible = id === tpl.id;
      if(grp.visible&&id==='thief_chase')grp.userData.flee?.();
    });
  }

  const banner = document.getElementById('street-event-banner');
  const titleEl = document.getElementById('street-event-title');
  const descEl = document.getElementById('street-event-desc');
  if (titleEl) titleEl.textContent = `${tpl.title} (85s)`;
  if (descEl) descEl.textContent = tpl.desc;
  if (banner) banner.classList.remove('hidden');

  playSoundEffect('quest');
  // The event card already contains its title and route button; avoid a second overlay.
}

function resolveActiveStreetEvent() {
  if (!activeStreetEvent) return;
  const tpl = activeStreetEvent.template;
  const outfitBonus = garageState.equippedOutfit === 'outfit_tycoon' ? 1.25 : 1.0;
  const coins = Math.round(tpl.rewardCoins * outfitBonus);
  const xp = Math.round(tpl.rewardXp * (garageState.equippedOutfit === 'outfit_heritage' ? 1.25 : 1.0));

  garageState.stats.streetEventsResolved = (garageState.stats.streetEventsResolved || 0) + 1;
  saveGarageState();

  activeStreetEvent = null;
  streetEventGroup.visible = false;
  document.getElementById('street-event-banner')?.classList.add('hidden');

  addRewards(coins, xp);
  awardSocialProgress({ neighborhood: { cohesion: 5, beauty: 3, livelihood: 3 } });
  playSoundEffect('quest');
  triggerStuntBanner(`🚨 HOÀN THÀNH SỰ KIỆN! +${coins.toLocaleString('vi-VN')}đ · +${xp} XP`);
  showToast(`${tpl.toastDone} (+${coins.toLocaleString('vi-VN')}đ, +${xp} XP)`, 6000);
}

// ============================================================================
// HỆ THỐNG MINI-GAME TƯƠNG TÁC CÔNG VIÊN & KINH DOANH QUÁN XÔI (#park-minigame-modal)
// ============================================================================
let isParkMiniGameOpen = false;
let activeMiniGameTimer = null;

function closeParkMiniGame() {
  if (activeMiniGameTimer) {
    clearInterval(activeMiniGameTimer);
    activeMiniGameTimer = null;
  }
  isParkMiniGameOpen = false;
  isDialogueOpen = false;
  document.getElementById('park-minigame-modal')?.classList.add('hidden');
}

function openFishingMiniGame() {
  if(!requireWorldActivity('fishing_pier'))return;
  if (horrorModeActive) return;
  if (isShipperModalOpen) closeShipperModal();
  if (activeMiniGameTimer) clearInterval(activeMiniGameTimer);

  isParkMiniGameOpen = true;
  isDialogueOpen = true;
  if (document.pointerLockElement) document.exitPointerLock?.();

  const modal = document.getElementById('park-minigame-modal');
  const titleEl = document.getElementById('park-mg-title');
  const bodyEl = document.getElementById('park-mg-body');
  if (!modal || !titleEl || !bodyEl) return;

  titleEl.textContent = '🎣 Bến Câu Cá Hồ Sen Tây Hồ 3D';
  let cursorPos = 15;
  let cursorDir = 1;

  const renderFishingUI = (statusMsg = 'Quan sát phao câu chạy qua vùng Vàng Giữa Hồ và bấm "🎣 GIẬT CẦN NGAY!" để bắt cá quý!') => {
    bodyEl.innerHTML = `
      <div class="mg-stage-box">
        <div class="mg-status-line" id="fishing-status-line">${statusMsg}</div>
        <div class="mg-meter-wrap">
          <div class="mg-sweet-spot" style="left: 38%; width: 24%;"></div>
          <div class="mg-cursor-needle" id="fishing-needle" style="left: ${cursorPos}%;"></div>
        </div>
        <div style="display:flex; justify-content:center; gap:14px; flex-wrap:wrap; font-size:12.5px; color:#cbd5e1;">
          <span>🐟 Cá Rô Đồng: <strong>18.000đ</strong></span>
          <span>🦐 Tôm Càng Xanh: <strong>32.000đ</strong></span>
          <span>🐠 Cá Chép Vàng: <strong>48.000đ</strong></span>
          <span>👑 Cá Koi Hoàng Kim: <strong>85.000đ</strong></span>
        </div>
        <div class="mg-big-action">
          <button type="button" id="fishing-cast-btn" class="choice-btn primary">🎣 GIẬT CẦN CÂU NGAY!</button>
        </div>
        <div style="font-size:12px; color:#94a3b8;">
          Tổng số cá bạn đã câu được: <strong style="color:#fde047;">${garageState.stats.fishCaught || 0} con</strong>
          ${garageState.equippedPet === 'cat_royal' ? ' · 🐈 Mèo Hoàng Gia đang kích hoạt +25% thưởng câu cá!' : ''}
        </div>
      </div>
    `;

    document.getElementById('fishing-cast-btn')?.addEventListener('click', () => {
      const distCenter = Math.abs(cursorPos - 50);
      const petBonus = garageState.equippedPet === 'cat_royal' ? 1.25 : 1.0;
      const outfitBonus = garageState.equippedOutfit === 'outfit_tycoon' ? 1.25 : 1.0;
      const xpBonus = garageState.equippedOutfit === 'outfit_heritage' ? 1.25 : 1.0;

      let catchName = '';
      let baseCash = 18000;
      let baseXp = 45;
      if (distCenter <= 6.5) {
        catchName = '👑 Cá Koi Hoàng Kim Khổng Lồ (Siêu Hiếm!)';
        baseCash = 85000;
        baseXp = 135;
      } else if (distCenter <= 13) {
        catchName = '🐠 Cá Chép Vàng Hồ Tây';
        baseCash = 48000;
        baseXp = 90;
      } else if (distCenter <= 24) {
        catchName = '🦐 Tôm Càng Xanh Hồ Sen';
        baseCash = 32000;
        baseXp = 65;
      } else {
        catchName = '🐟 Cá Rô Đồng Béo Ngậy';
        baseCash = 18000;
        baseXp = 45;
      }

      const finalCoins = Math.round(baseCash * petBonus * outfitBonus);
      const finalXp = Math.round(baseXp * xpBonus);
      garageState.stats.fishCaught = (garageState.stats.fishCaught || 0) + 1;
      saveGarageState();
      addRewards(finalCoins, finalXp);
      awardSocialProgress({ neighborhood: { beauty: 2, cohesion: 2 } });
      playSoundEffect('quest');
      showToast(`🎣 Câu dính ${catchName}! Nhận ngay +${finalCoins.toLocaleString('vi-VN')}đ & +${finalXp} XP!`, 4200);
      renderFishingUI(`🎉 Vừa câu trúng: ${catchName} (+${finalCoins.toLocaleString('vi-VN')}đ)! Thả câu tiếp nào!`);
    });
  };

  renderFishingUI();
  modal.classList.remove('hidden');

  activeMiniGameTimer = setInterval(() => {
    if (!isParkMiniGameOpen) return;
    cursorPos += cursorDir * 3.6;
    if (cursorPos >= 96) {
      cursorPos = 96;
      cursorDir = -1;
    } else if (cursorPos <= 4) {
      cursorPos = 4;
      cursorDir = 1;
    }
    const needle = document.getElementById('fishing-needle');
    if (needle) needle.style.left = `${cursorPos}%`;
  }, 30);
}

function openJianziMiniGame() {
  if(!requireWorldActivity('jianzi_court'))return;
  if (horrorModeActive) return;
  if (isShipperModalOpen) closeShipperModal();
  if (activeMiniGameTimer) clearInterval(activeMiniGameTimer);

  isParkMiniGameOpen = true;
  isDialogueOpen = true;
  if (document.pointerLockElement) document.exitPointerLock?.();

  const modal = document.getElementById('park-minigame-modal');
  const titleEl = document.getElementById('park-mg-title');
  const bodyEl = document.getElementById('park-mg-body');
  if (!modal || !titleEl || !bodyEl) return;

  titleEl.textContent = '🪶 Sân Đá Cầu Kiểng Nghệ Thuật Phú Thượng';
  let shuttlePos = 10;
  let shuttleDir = 1;
  let combo = 0;
  let sessionCoins = 0;

  const renderJianziUI = (msg = 'Canh đúng lúc quả cầu bay vào Vùng Xanh Vàng để tung cú "Phẩy Mắt Cá Chân" nối Combo!') => {
    bodyEl.innerHTML = `
      <div class="mg-stage-box">
        <div class="mg-status-line">${msg}</div>
        <div class="mg-meter-wrap">
          <div class="mg-sweet-spot" style="left: 35%; width: 30%;"></div>
          <div class="mg-cursor-needle" id="jianzi-needle" style="left: ${shuttlePos}%;"></div>
        </div>
        <div style="display:flex; justify-content:center; gap:18px; font-size:14px;">
          <span>🔥 Combo hiện tại: <strong style="color:#4ade80;">${combo} nhịp</strong></span>
          <span>🏆 Kỷ lục cá nhân: <strong style="color:#fde047;">${garageState.stats.bestJianziCombo || 0} nhịp</strong></span>
          <span>💰 Thưởng tích lũy: <strong style="color:#38bdf8;">+${sessionCoins.toLocaleString('vi-VN')}đ</strong></span>
        </div>
        <div class="mg-big-action">
          <button type="button" id="jianzi-kick-btn" class="choice-btn primary">🦶 TÂNG CẦU & VÍT CẦU QUA LƯỚI!</button>
        </div>
      </div>
    `;

    document.getElementById('jianzi-kick-btn')?.addEventListener('click', () => {
      const distCenter = Math.abs(shuttlePos - 50);
      if (distCenter <= 18) {
        combo += 1;
        const kickCoins = (5000 + combo * 2500) * (garageState.equippedOutfit === 'outfit_tycoon' ? 1.25 : 1);
        const roundedKick = Math.round(kickCoins);
        sessionCoins += roundedKick;
        garageState.stats.bestJianziCombo = Math.max(garageState.stats.bestJianziCombo || 0, combo);
        saveGarageState();
        addRewards(roundedKick, 25);
        playSoundEffect('coin');
        const stuntNames = [
          'Cú Đá Mắt Cá Chân Chuẩn Xác!',
          'Đỡ Ngực Xoay Người Vít Cầu!',
          'Cú Đá Móc Câu Qua Lưới Tuyệt Đẹp!',
          'Tuyệt Kỹ Đá Cầu Hồ Tây Liên Hoàn!'
        ];
        const stunt = stuntNames[(combo - 1) % stuntNames.length];
        renderJianziUI(`🔥 COMBO x${combo}: ${stunt} (+${roundedKick.toLocaleString('vi-VN')}đ & +25 XP)`);
      } else {
        const prevCombo = combo;
        combo = 0;
        playSoundEffect('shutter');
        renderJianziUI(`😅 Hụt nhịp ở Combo ${prevCombo}! Đừng lo, tiền thưởng đã vào túi — bấm Tâng Cầu để bắt đầu chuỗi mới!`);
      }
    });
  };

  renderJianziUI();
  modal.classList.remove('hidden');

  activeMiniGameTimer = setInterval(() => {
    if (!isParkMiniGameOpen) return;
    const speed = Math.min(5.8, 3.1 + combo * 0.25);
    shuttlePos += shuttleDir * speed;
    if (shuttlePos >= 96) {
      shuttlePos = 96;
      shuttleDir = -1;
    } else if (shuttlePos <= 4) {
      shuttlePos = 4;
      shuttleDir = 1;
    }
    const needle = document.getElementById('jianzi-needle');
    if (needle) needle.style.left = `${shuttlePos}%`;
  }, 30);
}

const TYCOON_MENU_ITEMS = [
  { id: 'xoi_xeo', icon: '🍙', label: 'Xôi Xéo Đỗ Xanh Hành Phi' },
  { id: 'xoi_khuc', icon: '🌿', label: 'Xôi Khúc Nếp Cái Hoa Vàng' },
  { id: 'xoi_ga', icon: '🍗', label: 'Xôi Gà Nấm Ruốc Trứng Kho' },
  { id: 'tra_da', icon: '🧊', label: 'Trà Đá Mát Lạnh Hồ Tây' },
  { id: 'tra_chanh', icon: '🍋', label: 'Trà Chanh Giã Tay Phố Cổ' },
  { id: 'huong_duong', icon: '🌻', label: 'Đĩa Hướng Dương Rang Củi' }
];

function openTycoonRushMiniGame() {
  if(!requireStreetService('business'))return;
  if (horrorModeActive) return;
  if (isShipperModalOpen) closeShipperModal();
  if (activeMiniGameTimer) clearInterval(activeMiniGameTimer);

  isParkMiniGameOpen = true;
  isDialogueOpen = true;
  if (document.pointerLockElement) document.exitPointerLock?.();

  const modal = document.getElementById('park-minigame-modal');
  const titleEl = document.getElementById('park-mg-title');
  const bodyEl = document.getElementById('park-mg-body');
  if (!modal || !titleEl || !bodyEl) return;

  titleEl.textContent = '🏮 Quán Xôi & Trà Đá Tự Quản Phú Thượng';
  let currentDish = TYCOON_MENU_ITEMS[Math.floor(Math.random() * TYCOON_MENU_ITEMS.length)];
  let rushCombo = 0;

  const customers = [
    '👨‍💼 Anh Tuấn (Dân công sở Cầu Nhật Tân)',
    '👩‍🎓 Nhóm nữ sinh THPT Tây Hồ',
    '🚴‍♂️ Đoàn cua-rơ đạp xe quanh Hồ Tây',
    '📸 Du khách phố cổ Hà Nội',
    '🛵 Anh em tài xế Shipper Phú Thượng'
  ];

  const renderTycoonModalUI = (statusText = 'Chọn đúng món khách đang gọi bên dưới để phục vụ siêu tốc và nhân chuỗi Combo tiền Tip!') => {
    const lv = garageState.tycoon?.level || 1;
    const upgMeta = TYCOON_UPGRADES[lv - 1] || TYCOON_UPGRADES[0];
    const nextUpg = TYCOON_UPGRADES[lv] || null;
    const custName = customers[(garageState.tycoon.totalServed + rushCombo) % customers.length];

    bodyEl.innerHTML = `
      <div class="mg-stage-box" style="text-align:left;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; background:rgba(15,23,42,0.85); padding:10px 14px; border-radius:10px; border:1px solid rgba(250,204,21,0.35);">
          <div>
            <div style="font-size:13.5px; font-weight:800; color:#fde047;">${upgMeta.name}</div>
            <div style="font-size:12px; color:#cbd5e1;">Thu nhập tự động: <strong>+${upgMeta.passivePer5s.toLocaleString('vi-VN')}đ / 5s</strong> · Đã phục vụ: <strong>${garageState.tycoon.totalServed} khách</strong></div>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button type="button" id="tycoon-collect-btn" class="choice-btn primary" style="padding:7px 12px; font-size:12.5px;">
              💰 Thu Két Tiền (${(garageState.tycoon.uncollectedCash || 0).toLocaleString('vi-VN')}đ)
            </button>
            ${nextUpg ? `
              <button type="button" id="tycoon-upgrade-btn" class="choice-btn" style="padding:7px 12px; font-size:12.5px; border-color:#facc15;">
                ⬆️ Nâng Cấp ${nextUpg.level}/4 (${nextUpg.cost.toLocaleString('vi-VN')}đ)
              </button>
            ` : '<span class="shipper-record-badge">🏆 Quán Đã Đạt Cấp Tối Đa 4/4</span>'}
          </div>
        </div>

        <div class="tycoon-customer-box">
          <div style="font-size:12.5px; color:#93c5fd; font-weight:700;">🔔 KHÁCH ĐANG ĐỢI TẠI QUẦY (COMBO x${1 + rushCombo * 0.25}):</div>
          <div style="font-size:15px; font-weight:800; color:#f8fafc;">${custName} gọi món:</div>
          <div style="font-size:17px; font-weight:900; color:#fde047; margin-top:2px;">${currentDish.icon} ${currentDish.label}</div>
          <div style="font-size:12px; color:#86efac; margin-top:4px;">${statusText}</div>
        </div>

        <div class="tycoon-menu-grid">
          ${TYCOON_MENU_ITEMS.map((item) => `
            <button type="button" class="choice-btn tycoon-dish-btn" data-dish="${item.id}" style="text-align:left; padding:10px 12px;">
              <strong style="font-size:15px;">${item.icon}</strong> ${item.label}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    document.getElementById('tycoon-collect-btn')?.addEventListener('click', () => {
      const cash = garageState.tycoon.uncollectedCash || 0;
      if (cash <= 0) {
        showToast('💡 Két tiền tự động vừa được thu hết rồi, hãy chờ vài giây hoặc phục vụ khách trực tiếp nhé!');
        return;
      }
      garageState.tycoon.uncollectedCash = 0;
      saveGarageState();
      addRewards(cash, 35);
      playSoundEffect('coin');
      showToast(`💰 Đã thu +${cash.toLocaleString('vi-VN')}đ tiền lãi tự động từ Quán Xôi & Trà Đá!`, 4000);
      renderTycoonModalUI(`💰 Vừa thu két +${cash.toLocaleString('vi-VN')}đ! Tiếp tục chốt đơn cho khách nào!`);
    });

    document.getElementById('tycoon-upgrade-btn')?.addEventListener('click', () => {
      if (!nextUpg) return;
      if (playerState.coins < nextUpg.cost) {
        showToast(`⚠️ Bạn cần ${nextUpg.cost.toLocaleString('vi-VN')}đ để nâng cấp quán lên Cấp ${nextUpg.level}!`);
        return;
      }
      playerState.coins -= nextUpg.cost;
      garageState.tycoon.level = nextUpg.level;
      saveGarageState();
      syncTycoonStall3D();
      updatePlayerHUD();
      markProgressDirty();
      playSoundEffect('quest');
      showToast(`🏮 Đã nâng cấp Quán Xôi lên Cấp ${nextUpg.level}/4! Mô hình 3D của quán trên vỉa hè đã được mở rộng!`, 5000);
      renderTycoonModalUI(`🎉 Đã nâng cấp lên ${nextUpg.name}! Giá mỗi suất ăn & tiền thụ động đã tăng mạnh!`);
    });

    bodyEl.querySelectorAll('.tycoon-dish-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const picked = btn.getAttribute('data-dish');
        if (picked === currentDish.id) {
          rushCombo += 1;
          garageState.tycoon.totalServed += 1;
          const curUpg = TYCOON_UPGRADES[(garageState.tycoon.level || 1) - 1] || TYCOON_UPGRADES[0];
          const outfitMult = garageState.equippedOutfit === 'outfit_tycoon' ? 1.25 : 1.0;
          const comboMult = Math.min(2.5, 1 + (rushCombo - 1) * 0.2);
          const pay = Math.round(curUpg.orderBasePay * comboMult * outfitMult);
          saveGarageState();
          addRewards(pay, 30);
          awardSocialProgress({ neighborhood: { livelihood: 2, cohesion: 1 } });
          playSoundEffect('coin');
          const servedLabel = currentDish.label;
          currentDish = TYCOON_MENU_ITEMS[Math.floor(Math.random() * TYCOON_MENU_ITEMS.length)];
          renderTycoonModalUI(`✅ Đã bưng "${servedLabel}" chuẩn vị! Khách thưởng nóng +${pay.toLocaleString('vi-VN')}đ & +30 XP!`);
        } else {
          rushCombo = 0;
          playSoundEffect('shutter');
          renderTycoonModalUI(`⚠️ Nhầm món rồi! Khách đang gọi "${currentDish.icon} ${currentDish.label}" cơ, chọn lại nhé!`);
        }
      });
    });
  };

  renderTycoonModalUI();
  modal.classList.remove('hidden');
}

function completeShipperRoute() {
  if (!activeShipperRun) return;
  const run = activeShipperRun;
  const route = run.route;
  const bikeMeta = BIKE_CATALOG[garageState.equippedBike] || BIKE_CATALOG.wave_red;
  const cargoTipBonus = garageState.upgrades.cargo * 0.2;
  const petTipBonus = garageState.equippedPet === 'shiba_shipper' ? 0.18 : 0;
  const outfitBonus = garageState.equippedOutfit === 'outfit_shipper'
    ? 0.15
    : garageState.equippedOutfit === 'outfit_tycoon'
      ? 0.25
      : 0;
  const qualityMult = Math.max(0.5, run.cargoHealth / 100);
  const comboBonusCoins = Math.round(route.baseCoins * (run.maxCombo - 1) * 0.35);
  const tipCoins = Math.round(route.baseCoins * (bikeMeta.rewardBonus + cargoTipBonus + petTipBonus + outfitBonus) * qualityMult);
  const timeBonusCoins = Math.round(run.timeLeft * 650);
  const totalCoins = Math.round(route.baseCoins * qualityMult) + comboBonusCoins + tipCoins + timeBonusCoins;
  const totalXp = Math.round(route.baseXp * (1 + bikeMeta.rewardBonus * 0.5));

  const rank = (run.cargoHealth >= 85 && run.timeLeft >= 12)
    ? 'S'
    : (run.cargoHealth >= 65 && run.timeLeft >= 5)
      ? 'A'
      : 'B';

  garageState.stats.deliveriesCompleted += 1;
  garageState.stats.totalShipEarnings += totalCoins;
  garageState.stats.bestCombo = Math.max(garageState.stats.bestCombo, Number(run.maxCombo.toFixed(2)));
  const prevRec = garageState.stats.routeRecords[route.id];
  const finishTime = Number(run.elapsed.toFixed(1));
  if (!prevRec || finishTime < prevRec.bestTime || rank === 'S') {
    garageState.stats.routeRecords[route.id] = {
      rank: prevRec?.rank === 'S' ? 'S' : rank,
      bestTime: prevRec ? Math.min(prevRec.bestTime, finishTime) : finishTime
    };
  }
  saveGarageState();

  activeShipperRun = null;
  shipperCheckpointGroup.visible = false;
  applyGarageToPlayerBike();

  const missionBox = document.getElementById('shipper-mission-box');
  if (missionBox) missionBox.classList.add('hidden');

  addRewards(totalCoins, totalXp);
  awardSocialProgress({ neighborhood: { livelihood: 4, cohesion: 3 } });
  playSoundEffect('quest');
  triggerStuntBanner(`🏆 GIAO HÀNG HẠNG ${rank}! +${totalCoins.toLocaleString('vi-VN')}đ · +${totalXp} XP`);
  showToast(
    `🏆 HOÀN THÀNH HẠNG ${rank} (${finishTime}s)! Thưởng: +${totalCoins.toLocaleString('vi-VN')}đ (Combo x${run.maxCombo.toFixed(1)} + Tip) & +${totalXp} XP! Bấm [G] để độ xe hoặc chọn đơn mới!`,
    6800
  );
}

function renderShipperModalContent() {
  const stripEl = document.getElementById('shipper-summary-strip');
  const bikeMeta = BIKE_CATALOG[garageState.equippedBike] || BIKE_CATALOG.wave_red;
  const petMeta = PET_CATALOG[garageState.equippedPet];
  if (stripEl) {
    stripEl.innerHTML = `
      <span>💰 Tiền: <strong>${playerState.coins.toLocaleString('vi-VN')}đ</strong></span>
      <span>🛵 Xe: <strong>${bikeMeta.name}</strong></span>
      <span>🏮 Quán Xôi: <strong>Cấp ${garageState.tycoon?.level || 1}/4</strong></span>
      <span>🐾 Thú cưng: <strong>${petMeta ? petMeta.name : 'Chưa dắt theo'}</strong></span>
      <span>🏆 Cúp: <strong>${garageState.claimedTrophies?.length || 0}/${TROPHY_CATALOG.length}</strong></span>
    `;
  }

  const tabs = ['orders', 'garage', 'business', 'style', 'trophies'];
  tabs.forEach((tKey) => {
    const btn = document.getElementById(`tab-btn-${tKey}`);
    const panel = document.getElementById(`shipper-tab-${tKey}`);
    if (btn) {btn.classList.toggle('active', activeShipperTab === tKey);const access=serviceAccess(tKey,serviceContext());btn.disabled=!access.ok;btn.title=access.ok?'':access.reason;}
    if (panel) panel.classList.toggle('hidden', activeShipperTab !== tKey);
  });

  // 1. Render 5 Tuyến Đua Giao Hàng
  const ordersList = document.getElementById('shipper-orders-list');
  if (ordersList) {
    ordersList.innerHTML = '';
    SHIPPER_ROUTES.forEach((route) => {
      const rec = garageState.stats.routeRecords[route.id];
      const card = document.createElement('div');
      card.className = 'shipper-order-card';
      card.innerHTML = `
        <div>
          <div class="shipper-order-top">
            <span class="shipper-stars">${'★'.repeat(route.stars)}${'☆'.repeat(5 - route.stars)} · Độ khó ${route.stars}/5</span>
            ${rec ? `<span class="shipper-record-badge">🏆 Hạng ${rec.rank} · ${rec.bestTime}s</span>` : '<span class="shipper-record-badge">✨ Đơn mới</span>'}
          </div>
          <h4>${route.title}</h4>
          <p>${route.desc}</p>
        </div>
        <div>
          <div class="shipper-order-meta" style="margin-bottom:8px;">
            <span>💰 +${route.baseCoins.toLocaleString('vi-VN')}đ + Tip</span>
            <span>⭐ +${route.baseXp} XP</span>
            <span>📍 ${route.checkpoints.length} Cổng 3D</span>
            <span>⏱️ ${route.timeLimit}s (+5.5s/cổng)</span>
          </div>
          <button type="button" class="choice-btn primary" style="width:100%;">🚀 Nhận Đơn & Phóng Xe Ngay</button>
        </div>
      `;
      card.querySelector('button')?.addEventListener('click', () => startShipperRoute(route.id));
      ordersList.appendChild(card);
    });
  }

  // 2. Render 4 Dòng Xe Máy & 4 Hạng Mục Độ Phụ Tùng 3D
  const bikesList = document.getElementById('garage-bikes-list');
  if (bikesList) {
    bikesList.innerHTML = '';
    Object.values(BIKE_CATALOG).forEach((bike) => {
      const owned = garageState.ownedBikes.includes(bike.id);
      const equipped = garageState.equippedBike === bike.id;
      const item = document.createElement('div');
      item.className = `garage-item-card ${equipped ? 'equipped' : ''}`;
      item.innerHTML = `
        <div class="garage-item-head">
          <strong>${bike.name}</strong>
          <span class="shipper-record-badge">${equipped ? '✓ Đang sử dụng' : owned ? 'Đã sở hữu' : `${bike.price.toLocaleString('vi-VN')}đ`}</span>
        </div>
        <p>${bike.desc}</p>
        <div class="garage-item-perks">⚡ ${bike.perks}</div>
        <button type="button" class="choice-btn ${equipped ? '' : 'primary'}" style="margin-top:4px;" ${equipped ? 'disabled' : ''}>
          ${equipped ? '✓ Xe Đang Trang Bị Trên Phố' : owned ? '🛵 Lấy Xe Này Ra Chạy Ngay' : `💰 Mua Xe Này (${bike.price.toLocaleString('vi-VN')}đ)`}
        </button>
      `;
      item.querySelector('button')?.addEventListener('click', () => {
        if (owned) {
          garageState.equippedBike = bike.id;
          saveGarageState();
          applyGarageToPlayerBike();
          playSoundEffect('coin');
          showToast(`🛵 Đã đổi sang lái chiếc ${bike.name}!`);
          renderShipperModalContent();
          return;
        }
        if (playerState.coins < bike.price) {
          showToast(`⚠️ Bạn cần ${bike.price.toLocaleString('vi-VN')}đ để tậu ${bike.name}! Hãy chạy vài đơn Shipper Siêu Tốc nhé.`);
          return;
        }
        playerState.coins -= bike.price;
        garageState.ownedBikes.push(bike.id);
        garageState.equippedBike = bike.id;
        saveGarageState();
        applyGarageToPlayerBike();
        updatePlayerHUD();
        markProgressDirty();
        playSoundEffect('quest');
        showToast(`🎉 Chúc mừng! Bạn đã tậu và trang bị siêu phẩm ${bike.name}!`, 5000);
        renderShipperModalContent();
      });
      bikesList.appendChild(item);
    });
  }

  const upgList = document.getElementById('garage-upgrades-list');
  if (upgList) {
    upgList.innerHTML = '';
    Object.values(GARAGE_UPGRADES).forEach((upg) => {
      const lv = garageState.upgrades[upg.id] || 0;
      const isMax = lv >= upg.maxLevel;
      const nextCost = isMax ? 0 : upg.costs[lv];
      const item = document.createElement('div');
      item.className = `garage-item-card ${isMax ? 'equipped' : ''}`;
      item.innerHTML = `
        <div class="garage-item-head">
          <strong>${upg.name}</strong>
          <div class="garage-level-pills">
            ${[1, 2, 3].map((step) => `<span class="${lv >= step ? 'filled' : ''}"></span>`).join('')}
          </div>
        </div>
        <p>${upg.desc}</p>
        <div class="garage-item-perks">🔧 ${isMax ? `Đã đạt Cấp tối đa (3/3): ${upg.perks[2]}` : upg.perks[lv]}</div>
        <button type="button" class="choice-btn ${isMax ? '' : 'primary'}" style="margin-top:4px;" ${isMax ? 'disabled' : ''}>
          ${isMax ? '🏆 Đã Độ Tối Đa (Cấp 3/3)' : `🔩 Độ Lên Cấp ${lv + 1}/3 (${nextCost.toLocaleString('vi-VN')}đ)`}
        </button>
      `;
      item.querySelector('button')?.addEventListener('click', () => {
        if (isMax) return;
        if (playerState.coins < nextCost) {
          showToast(`⚠️ Bạn cần ${nextCost.toLocaleString('vi-VN')}đ để nâng cấp ${upg.name}!`);
          return;
        }
        playerState.coins -= nextCost;
        garageState.upgrades[upg.id] = lv + 1;
        nitroFuel = 100;
        saveGarageState();
        applyGarageToPlayerBike();
        updatePlayerHUD();
        markProgressDirty();
        playSoundEffect('quest');
        showToast(`🔧 Đã độ "${upg.name}" lên Cấp ${lv + 1}/3! Phụ tùng 3D đã hiển thị trực tiếp trên xe của bạn!`, 4800);
        renderShipperModalContent();
      });
      upgList.appendChild(item);
    });
  }

  // 3. Render Tab Kinh Doanh Quán Xôi & Sự Kiện Đường Phố / Thế Giới Mở Rộng
  const stallPanel = document.getElementById('business-stall-panel');
  if (stallPanel) {
    const lv = garageState.tycoon?.level || 1;
    const curUpg = TYCOON_UPGRADES[lv - 1] || TYCOON_UPGRADES[0];
    const nextUpg = TYCOON_UPGRADES[lv] || null;
    const cash = garageState.tycoon?.uncollectedCash || 0;

    stallPanel.innerHTML = `
      <div class="garage-item-card equipped">
        <div class="garage-item-head">
          <strong>${curUpg.name}</strong>
          <span class="shipper-record-badge">Khách đã phục vụ: ${garageState.tycoon?.totalServed || 0}</span>
        </div>
        <p>${curUpg.desc}</p>
        <div class="garage-item-perks">
          💵 Lãi tự động: +${curUpg.passivePer5s.toLocaleString('vi-VN')}đ / 5 giây · Giá mỗi suất: ${curUpg.orderBasePay.toLocaleString('vi-VN')}đ
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:6px;">
          <button type="button" id="modal-tycoon-collect-btn" class="choice-btn primary" style="flex:1;">
            💰 Thu Két Tự Động (+${cash.toLocaleString('vi-VN')}đ)
          </button>
          <button type="button" id="modal-tycoon-play-btn" class="choice-btn" style="flex:1; border-color:#38bdf8;">
            🍙 Mở Quầy Bán Hàng Nhanh
          </button>
        </div>
        ${nextUpg ? `
          <button type="button" id="modal-tycoon-upg-btn" class="choice-btn primary" style="margin-top:6px;">
            ⬆️ Nâng Cấp Lên ${nextUpg.name} (${nextUpg.cost.toLocaleString('vi-VN')}đ)
          </button>
        ` : '<div class="garage-item-perks" style="text-align:center; margin-top:4px;">🏆 Quán Xôi 3D của bạn đã đạt cấp Hoàng Kim tối đa (4/4)!</div>'}
        <button type="button" id="modal-tycoon-gps-btn" class="choice-btn" style="margin-top:4px;">
          🧭 Dẫn Đường Tới Quán Xôi 3D Trên Phố (Đối diện THPT Tây Hồ)
        </button>
      </div>
    `;

    stallPanel.querySelector('#modal-tycoon-collect-btn')?.addEventListener('click', () => {
      if ((garageState.tycoon.uncollectedCash || 0) <= 0) {
        showToast('💡 Két tiền tự động vừa được thu hết rồi, hãy chờ vài giây hoặc mở quầy bán hàng trực tiếp nhé!');
        return;
      }
      const collected = garageState.tycoon.uncollectedCash;
      garageState.tycoon.uncollectedCash = 0;
      saveGarageState();
      addRewards(collected, 30);
      playSoundEffect('coin');
      showToast(`💰 Đã thu +${collected.toLocaleString('vi-VN')}đ doanh thu tự động từ Quán Xôi & Trà Đá!`);
      renderShipperModalContent();
    });

    stallPanel.querySelector('#modal-tycoon-play-btn')?.addEventListener('click', () => {
      openTycoonRushMiniGame();
    });

    stallPanel.querySelector('#modal-tycoon-upg-btn')?.addEventListener('click', () => {
      if (!nextUpg) return;
      if (playerState.coins < nextUpg.cost) {
        showToast(`⚠️ Bạn cần ${nextUpg.cost.toLocaleString('vi-VN')}đ để nâng cấp Quán Xôi lên Cấp ${nextUpg.level}!`);
        return;
      }
      playerState.coins -= nextUpg.cost;
      garageState.tycoon.level = nextUpg.level;
      saveGarageState();
      syncTycoonStall3D();
      updatePlayerHUD();
      markProgressDirty();
      playSoundEffect('quest');
      showToast(`🏮 Đã nâng cấp Quán Xôi lên Cấp ${nextUpg.level}/4! Mô hình 3D của quán trên phố đã được mở rộng!`, 5000);
      renderShipperModalContent();
    });

    stallPanel.querySelector('#modal-tycoon-gps-btn')?.addEventListener('click', () => {
      closeShipperModal();
      guideToInventoryTarget({ x: -26.5, z: -7.0, title: 'Quán Xôi & Trà Đá Tự Quản 3D' });
    });
  }

  const eventsPanel = document.getElementById('business-events-panel');
  if (eventsPanel) {
    eventsPanel.innerHTML = `
      <div class="garage-item-card">
        <div class="garage-item-head">
          <strong>🚨 Đội Tuần Tra & Cứu Hộ Đường Phố</strong>
          <span class="shipper-record-badge">Đã giải quyết: ${garageState.stats.streetEventsResolved || 0} vụ</span>
        </div>
        <p>${activeStreetEvent ? `Đang diễn ra: "${activeStreetEvent.template.title}"` : 'Sẵn sàng phát tín hiệu tuần tra để xử lý ngay các tình huống khẩn cấp trên phố Phú Thượng!'}</p>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:4px;">
          <button type="button" id="modal-spawn-event-btn" class="choice-btn primary" style="flex:1;">
            🚨 ${activeStreetEvent ? 'Dẫn Đường Tới Sự Kiện Đang Diễn Ra' : 'Phát Tín Hiệu Sự Kiện Khẩn Cấp Ngay'}
          </button>
        </div>
      </div>

      <div class="garage-item-card">
        <div class="garage-item-head">
          <strong>🎣 Hồ Câu Cá Koi & Sân Đá Cầu Công Viên 3D</strong>
          <span class="shipper-record-badge">Cá: ${garageState.stats.fishCaught || 0} · Đá cầu: ${garageState.stats.bestJianziCombo || 0}</span>
        </div>
        <p>Thư giãn câu Cá Koi Hoàng Kim tại Bến Gỗ Lim Hồ Sen hoặc tỉ thí Đá Cầu Kiểng Nghệ Thuật tại Công Viên Phú Thượng.</p>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:4px;">
          <button type="button" id="modal-fishing-now-btn" class="choice-btn primary" style="flex:1;">🎣 Câu Cá Ngay</button>
          <button type="button" id="modal-jianzi-now-btn" class="choice-btn primary" style="flex:1;">🪶 Đá Cầu Ngay</button>
          <button type="button" id="modal-park-gps-btn" class="choice-btn" style="width:100%;">🧭 Dẫn Đường Tới Bến Câu Cá & Sân Đá Cầu 3D</button>
        </div>
      </div>

      <div class="garage-item-card">
        <div class="garage-item-head">
          <strong>🌸 Lầu Vọng Cảnh & Cây Đào Ước Nguyện Phú Thượng</strong>
          <span class="shipper-record-badge">Khu Mở Rộng Phía Tây</span>
        </div>
        <p>Ghé thăm Lầu Vọng Cảnh Bát Giác 2 Tầng và treo thẻ ước nguyện dưới gốc Đào Cổ Thụ Phú Thượng.</p>
        <button type="button" id="modal-shrine-gps-btn" class="choice-btn" style="margin-top:4px;">
          🧭 Dẫn Đường Tới Lầu Vọng Cảnh Vườn Đào
        </button>
      </div>
    `;

    eventsPanel.querySelector('#modal-spawn-event-btn')?.addEventListener('click', () => {
      closeShipperModal();
      if (!activeStreetEvent) spawnRandomStreetEvent();
      if (activeStreetEvent) {
        guideToInventoryTarget({
          x: activeStreetEvent.x,
          z: activeStreetEvent.z,
          title: activeStreetEvent.template.title
        });
      }
    });

    eventsPanel.querySelector('#modal-fishing-now-btn')?.addEventListener('click', () => openFishingMiniGame());
    eventsPanel.querySelector('#modal-jianzi-now-btn')?.addEventListener('click', () => openJianziMiniGame());
    eventsPanel.querySelector('#modal-park-gps-btn')?.addEventListener('click', () => {
      closeShipperModal();
      guideToInventoryTarget({ x: 145.2, z: 24.5, title: 'Bến Câu Cá Hồ Sen & Sân Đá Cầu 3D' });
    });
    eventsPanel.querySelector('#modal-shrine-gps-btn')?.addEventListener('click', () => {
      closeShipperModal();
      guideToInventoryTarget({ x: -162.0, z: 18.0, title: 'Lầu Vọng Cảnh & Cây Đào Ước Nguyện Phú Thượng' });
    });
  }

  // 4. Render Tab Thú Cưng 3D & Thời Trang 3D
  const petsList = document.getElementById('style-pets-list');
  if (petsList) {
    petsList.innerHTML = '';
    Object.values(PET_CATALOG).forEach((pet) => {
      const owned = garageState.ownedPets.includes(pet.id);
      const equipped = garageState.equippedPet === pet.id;
      const item = document.createElement('div');
      item.className = `garage-item-card ${equipped ? 'equipped' : ''}`;
      item.innerHTML = `
        <div class="garage-item-head">
          <strong>${pet.name}</strong>
          <span class="shipper-record-badge">${equipped ? '✓ Đang đi theo bạn' : owned ? 'Đã nhận nuôi' : `${pet.price.toLocaleString('vi-VN')}đ`}</span>
        </div>
        <p>${pet.desc}</p>
        <div class="garage-item-perks">🐾 ${pet.perks}</div>
        <button type="button" class="choice-btn ${equipped ? '' : 'primary'}" style="margin-top:4px;">
          ${equipped ? '🏠 Cho Thú Cưng Nghỉ Ngơi' : owned ? '🐕 Dắt Thú Cưng Này Đi Dạo Phố' : `💛 Nhận Nuôi (${pet.price.toLocaleString('vi-VN')}đ)`}
        </button>
      `;
      item.querySelector('button')?.addEventListener('click', () => {
        if (equipped) {
          garageState.equippedPet = 'none';
          saveGarageState();
          applyPlayerStyle3D();
          showToast(`🏠 Đã cho ${pet.name} về nghỉ ngơi.`);
          renderShipperModalContent();
          return;
        }
        if (owned) {
          garageState.equippedPet = pet.id;
          saveGarageState();
          applyPlayerStyle3D();
          playSoundEffect('coin');
          showToast(`🐾 ${pet.name} đã xuất hiện bên cạnh bạn trên phố 3D!`);
          renderShipperModalContent();
          return;
        }
        if (playerState.coins < pet.price) {
          showToast(`⚠️ Bạn cần ${pet.price.toLocaleString('vi-VN')}đ để nhận nuôi ${pet.name}!`);
          return;
        }
        playerState.coins -= pet.price;
        garageState.ownedPets.push(pet.id);
        garageState.equippedPet = pet.id;
        saveGarageState();
        applyPlayerStyle3D();
        updatePlayerHUD();
        markProgressDirty();
        playSoundEffect('quest');
        showToast(`🎉 Đã nhận nuôi ${pet.name}! Chú thú cưng 3D đang vẫy đuôi chạy theo sau bạn!`, 5000);
        renderShipperModalContent();
      });
      petsList.appendChild(item);
    });
  }

  const outfitsList = document.getElementById('style-outfits-list');
  if (outfitsList) {
    outfitsList.innerHTML = '';
    Object.values(OUTFIT_CATALOG).forEach((outfit) => {
      const owned = garageState.ownedOutfits.includes(outfit.id);
      const equipped = garageState.equippedOutfit === outfit.id;
      const item = document.createElement('div');
      item.className = `garage-item-card ${equipped ? 'equipped' : ''}`;
      item.innerHTML = `
        <div class="garage-item-head">
          <strong>${outfit.name}</strong>
          <span class="shipper-record-badge">${equipped ? '✓ Đang mặc' : owned ? 'Đã sở hữu' : `${outfit.price.toLocaleString('vi-VN')}đ`}</span>
        </div>
        <p>${outfit.desc}</p>
        <div class="garage-item-perks">✨ ${outfit.perks}</div>
        <button type="button" class="choice-btn ${equipped ? '' : 'primary'}" style="margin-top:4px;" ${equipped ? 'disabled' : ''}>
          ${equipped ? '✓ Đang Trang Bị Trên Nhân Vật 3D' : owned ? '👕 Mặc Bộ Trang Phục Này' : `🛍️ Mua Trang Phục (${outfit.price.toLocaleString('vi-VN')}đ)`}
        </button>
      `;
      item.querySelector('button')?.addEventListener('click', () => {
        if (owned) {
          garageState.equippedOutfit = outfit.id;
          saveGarageState();
          applyPlayerStyle3D();
          playSoundEffect('coin');
          showToast(`👕 Đã khoác bộ "${outfit.name}"!`);
          renderShipperModalContent();
          return;
        }
        if (playerState.coins < outfit.price) {
          showToast(`⚠️ Bạn cần ${outfit.price.toLocaleString('vi-VN')}đ để mua "${outfit.name}"!`);
          return;
        }
        playerState.coins -= outfit.price;
        garageState.ownedOutfits.push(outfit.id);
        garageState.equippedOutfit = outfit.id;
        saveGarageState();
        applyPlayerStyle3D();
        updatePlayerHUD();
        markProgressDirty();
        playSoundEffect('quest');
        showToast(`🎉 Đã mở khóa & diện bộ "${outfit.name}" trên nhân vật 3D!`, 4800);
        renderShipperModalContent();
      });
      outfitsList.appendChild(item);
    });
  }

  // 5. Render Tab Cúp Kỷ Lục & Thành Tựu Phú Thượng
  const trophiesList = document.getElementById('trophies-grid-list');
  if (trophiesList) {
    trophiesList.innerHTML = '';
    TROPHY_CATALOG.forEach((tr) => {
      const unlocked = tr.check(garageState);
      const claimed = garageState.claimedTrophies.includes(tr.id);
      const card = document.createElement('div');
      card.className = `shipper-order-card ${claimed ? 'equipped' : ''}`;
      card.innerHTML = `
        <div>
          <div class="shipper-order-top">
            <span class="shipper-stars">${tr.icon} CÚP DANH GIÁ</span>
            <span class="shipper-record-badge">${claimed ? '✓ Đã nhận thưởng' : unlocked ? '✨ Đủ điều kiện nhận!' : tr.progressText(garageState)}</span>
          </div>
          <h4>${tr.title}</h4>
          <p>${tr.desc}</p>
        </div>
        <div>
          <div class="shipper-order-meta" style="margin-bottom:8px;">
            <span>💰 Thưởng: +${tr.rewardCoins.toLocaleString('vi-VN')}đ</span>
            <span>⭐ +${tr.rewardXp} XP</span>
          </div>
          <button type="button" class="choice-btn ${unlocked && !claimed ? 'primary' : ''}" style="width:100%;" ${(!unlocked || claimed) ? 'disabled' : ''}>
            ${claimed ? '🏆 Đã Trưng Bày Cúp & Nhận Thưởng' : unlocked ? `🎁 Nhận Thưởng Cúp (+${tr.rewardCoins.toLocaleString('vi-VN')}đ)` : `🔒 Tiến độ: ${tr.progressText(garageState)}`}
          </button>
        </div>
      `;
      card.querySelector('button')?.addEventListener('click', () => {
        if (!unlocked || claimed) return;
        garageState.claimedTrophies.push(tr.id);
        saveGarageState();
        addRewards(tr.rewardCoins, tr.rewardXp);
        playSoundEffect('quest');
        showToast(`🏆 Chúc mừng! Bạn đã chinh phục cúp "${tr.title}" (+${tr.rewardCoins.toLocaleString('vi-VN')}đ & +${tr.rewardXp} XP)!`, 5200);
        renderShipperModalContent();
      });
      trophiesList.appendChild(card);
    });
  }
}

function requireWorldActivity(type){
  const target=worldInteractables.find(p=>p.type===type);
  if(!target)return false;
  if(horrorModeActive||playerState.isRidingBike||Math.hypot(playerGroup.position.x-target.x,playerGroup.position.z-target.z)>(target.radius||3.6)){
    showToast(`Tới ${target.title}, xuống xe và bấm E để chơi.`,4200);if(!horrorModeActive)customGpsTarget={x:target.x,z:target.z,title:target.title};return false;
  }return true;
}
function serviceContext(){return {x:playerGroup.position.x,z:playerGroup.position.z,riding:playerState.isRidingBike,night:horrorModeActive};}
function requireStreetService(tab){
  const result=serviceAccess(tab,serviceContext());
  if(!result.ok){showToast(result.reason,4200);if(!horrorModeActive)customGpsTarget={...result.point};}
  return result.ok;
}
function selectShipperTab(tab){if(!requireStreetService(tab))return;activeShipperTab=tab;renderShipperModalContent();}
function openShipperModal(defaultTab = 'orders') {
  if(!requireStreetService(defaultTab))return;
  if (horrorModeActive) {
    showToast('⚠️ Trung tâm Hoạt động & Xưởng Độ Xe chỉ hoạt động vào ban ngày.');
    return;
  }
  if (isSettingsOpen) closeSettingsModal();
  if (isJournalOpen) closeJournalModal();
  if (isInventoryOpen) closeInventoryModal();
  if (isParkMiniGameOpen) closeParkMiniGame();
  activeShipperTab = defaultTab;
  isShipperModalOpen = true;
  isDialogueOpen = true;
  if (document.pointerLockElement) document.exitPointerLock?.();
  renderShipperModalContent();
  document.getElementById('shipper-modal')?.classList.remove('hidden');
}

function closeShipperModal() {
  isShipperModalOpen = false;
  isDialogueOpen = false;
  document.getElementById('shipper-modal')?.classList.add('hidden');
}

function toggleShipperModal(defaultTab = 'orders') {
  if (isShipperModalOpen) closeShipperModal();
  else openShipperModal(serviceAccess('business',serviceContext()).ok?'business':defaultTab);
}

applyGarageToPlayerBike();
applyPlayerStyle3D();

// ============================================================================
// HỆ THỐNG ĐÈN PIN CẦM TAY CÁ NHÂN (PHÍM T) & CẤU HÌNH ĐỒ HỌA / CAMERA (PHÍM O, V)
// ============================================================================
const SETTINGS_KEY = 'phu_thuong_game_settings_v3';
const DEFAULT_SETTINGS = {
  weatherMode: 'auto',
  preset: 'high',
  brightness: 1.15,
  flashlightPower: 1.1,
  camMode: 'tps',
  autoTurnHead: true,
  turnFollowStrength: 1.0,
  cameraSmoothness: 1.0,
  showWaypoints: true,
  fov: 65,
  mouseSensitivity: 1.0,
  shadows: true
};

let gameSettings = { ...DEFAULT_SETTINGS };
try {
  const rawSettings = localStorage.getItem(SETTINGS_KEY);
  if (rawSettings) {
    gameSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) };
  }
} catch {
  gameSettings = { ...DEFAULT_SETTINGS };
}

// Hệ thống hạt Lá Thu Hà Nội rơi & Đom đóm đêm dọc Phố Phú Thượng
const autumnLeafCount = 100;
const autumnLeafGeo = new THREE.BufferGeometry();
const autumnLeafPos = new Float32Array(autumnLeafCount * 3);
const autumnLeafPhase = new Float32Array(autumnLeafCount);
for (let i = 0; i < autumnLeafCount; i++) {
  autumnLeafPos[i * 3] = (Math.random() - 0.5) * 260;
  autumnLeafPos[i * 3 + 1] = 1.2 + Math.random() * 14;
  autumnLeafPos[i * 3 + 2] = (Math.random() - 0.5) * 70;
  autumnLeafPhase[i] = Math.random() * Math.PI * 2;
}
autumnLeafGeo.setAttribute('position', new THREE.BufferAttribute(autumnLeafPos, 3));
const leafSpriteCanvas=document.createElement('canvas');leafSpriteCanvas.width=leafSpriteCanvas.height=32;
const leafSpriteContext=leafSpriteCanvas.getContext('2d');leafSpriteContext.fillStyle='#ffffff';
leafSpriteContext.beginPath();leafSpriteContext.moveTo(5,28);leafSpriteContext.bezierCurveTo(1,12,13,3,29,3);leafSpriteContext.bezierCurveTo(29,18,18,29,5,28);leafSpriteContext.fill();
const leafSpriteMap=new THREE.CanvasTexture(leafSpriteCanvas);
const autumnLeafMat = new THREE.PointsMaterial({
  color: 0x9b7e49,
  map: leafSpriteMap,
  alphaTest: .2,
  size: 0.24,
  transparent: true,
  opacity: 0.55,
  depthWrite: false
});
const autumnParticles = new THREE.Points(autumnLeafGeo, autumnLeafMat);
scene.add(autumnParticles);

// Đường dẫn mũi tên Decal Chevron GPS nằm sát mặt đường hướng tới mục tiêu hiện tại
const gpsGuideGroup = new THREE.Group();
const gpsChevrons = [];
{
  const chevronShape = new THREE.Shape();
  chevronShape.moveTo(0, 0.28);
  chevronShape.lineTo(0.28, -0.06);
  chevronShape.lineTo(0.18, -0.16);
  chevronShape.lineTo(0, 0.06);
  chevronShape.lineTo(-0.18, -0.16);
  chevronShape.lineTo(-0.28, -0.06);
  chevronShape.closePath();
  const chevronGeo = new THREE.ShapeGeometry(chevronShape);
  chevronGeo.rotateX(-Math.PI / 2);

  for (let i = 0; i < 5; i++) {
    const chev = new THREE.Mesh(
      chevronGeo,
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.82 - i * 0.12,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    gpsGuideGroup.add(chev);
    gpsChevrons.push(chev);
  }
}
scene.add(gpsGuideGroup);

// Đèn Pin cầm tay (SpotLight chiếu theo hướng nhìn Camera + PointLight chiếu sáng tầm gần + Mô hình 3D đèn pin)
const flashlightTarget = new THREE.Object3D();
scene.add(flashlightTarget);

const flashlightSpot = new THREE.SpotLight(0xfffbeb, 0, 75, Math.PI / 3.8, 0.42, 1.0);
flashlightSpot.castShadow = false;
flashlightSpot.target = flashlightTarget;
scene.add(flashlightSpot);

const flashlightFill = new THREE.PointLight(0xfff5d6, 0, 14, 1.35);
scene.add(flashlightFill);

// Mô hình 3D chiếc đèn pin cầm tay ở góc dưới bên phải khi ở góc nhìn FPS
const flashlightViewGroup = new THREE.Group();
const flBody = new THREE.Mesh(
  new THREE.CylinderGeometry(0.026, 0.022, 0.22, 14),
  new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.82, roughness: 0.28 })
);
flBody.rotation.x = Math.PI / 2;
flashlightViewGroup.add(flBody);

const flHead = new THREE.Mesh(
  new THREE.CylinderGeometry(0.038, 0.028, 0.065, 16),
  new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.88, roughness: 0.22 })
);
flHead.rotation.x = Math.PI / 2;
flHead.position.z = -0.13;
flashlightViewGroup.add(flHead);

const flLens = new THREE.Mesh(
  new THREE.CircleGeometry(0.034, 16),
  new THREE.MeshBasicMaterial({ color: 0xfef08a })
);
flLens.rotation.y = Math.PI;
flLens.position.z = -0.164;
flashlightViewGroup.add(flLens);

// Chùm tia sáng mờ phát ra từ đầu đèn pin
const flBeamCone = new THREE.Mesh(
  new THREE.ConeGeometry(0.42, 1.65, 18, 1, true),
  new THREE.MeshBasicMaterial({
    color: 0xfffbeb,
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide,
    depthWrite: false
  })
);
flBeamCone.rotation.x = -Math.PI / 2;
flBeamCone.position.z = -0.98;
flashlightViewGroup.add(flBeamCone);
scene.add(flashlightViewGroup);

let isFlashlightOn = false; // Ban ngày dùng ánh sáng tự nhiên; chương đêm bật đèn riêng.

function setPlayerFlashlight(enabled, announce = true) {
  isFlashlightOn = enabled;
  const pwr = gameSettings.flashlightPower || 1.5;
  flashlightSpot.intensity = enabled ? 34 * pwr : 0;
  flashlightSpot.distance = 38 + pwr * 16;
  flashlightFill.intensity = enabled ? 2.2 * pwr : 0;
  flLens.material.color.setHex(enabled ? 0xfef08a : 0x334155);
  flBeamCone.visible = enabled;

  const btn = document.getElementById('flashlight-toggle-btn');
  if (btn) {
    btn.classList.toggle('active', enabled);
    btn.textContent = enabled ? '🔦 Tắt Đèn Pin (T)' : '🔦 Đèn Pin (T)';
  }
  if (announce) {
    showToast(enabled ? '🔦 Đã BẬT Đèn Pin chiếu sáng cá nhân!' : '🔦 Đã TẮT Đèn Pin cá nhân.');
  }
}

function togglePlayerFlashlight() {
  if (isDialogueOpen) return;
  if (horrorModeActive && !isFlashlightOn && storyFlashlightBattery <= 0) {
    showToast('Pin đã cạn. Tìm tủ điện hoặc trở về quán để nhận pin dự phòng.');
    return;
  }
  setPlayerFlashlight(!isFlashlightOn);
}

function updateFlashlightTransform(elapsed = 0, isMoving = false) {
  const dirX = Math.sin(camYaw) * Math.cos(camPitch);
  const dirY = -Math.sin(camPitch);
  const dirZ = Math.cos(camYaw) * Math.cos(camPitch);

  const rightX = -Math.cos(camYaw);
  const rightZ = Math.sin(camYaw);

  const eyeY = playerGroup.position.y + 1.48;
  const bobX = isMoving ? Math.sin(elapsed * 9.5) * 0.012 : 0;
  const bobY = isMoving ? Math.abs(Math.cos(elapsed * 9.5)) * 0.014 : 0;

  // Đặt đèn pin hơi lệch sang tay phải của người chơi
  const handX = playerGroup.position.x + rightX * (0.24 + bobX) + dirX * 0.32;
  const handY = eyeY - 0.22 + bobY + dirY * 0.22;
  const handZ = playerGroup.position.z + rightZ * (0.24 + bobX) + dirZ * 0.32;

  flashlightSpot.position.set(handX, handY, handZ);
  flashlightTarget.position.set(
    playerGroup.position.x + dirX * 32,
    eyeY + dirY * 32,
    playerGroup.position.z + dirZ * 32
  );

  flashlightFill.position.set(
    playerGroup.position.x + dirX * 1.6,
    eyeY + 0.2,
    playerGroup.position.z + dirZ * 1.6
  );

  flashlightViewGroup.visible = camMode === 'fps' && isFlashlightOn;
  if (flashlightViewGroup.visible) {
    flashlightViewGroup.position.set(handX, handY, handZ);
    flashlightViewGroup.lookAt(flashlightTarget.position);
  }
}

const playerRideLegs = new THREE.Group();
const ridePantsMat = new THREE.MeshStandardMaterial({ color: 0x17243a, roughness: 0.88 });
const rideShoeMat = new THREE.MeshStandardMaterial({ color: 0xf2eee5, roughness: 0.72 });
const rideLimbAxis = new THREE.Vector3(0, 1, 0);
function addRideLegSegment(from, to, radius, material) {
  const direction = new THREE.Vector3().subVectors(to, from);
  const segment = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, Math.max(0.02, direction.length() - radius * 2), 5, 10),
    material
  );
  segment.position.copy(from).add(to).multiplyScalar(0.5);
  segment.quaternion.setFromUnitVectors(rideLimbAxis, direction.normalize());
  segment.castShadow = true;
  playerRideLegs.add(segment);
}
[-1, 1].forEach((side) => {
  const hip = new THREE.Vector3(side * 0.105, 0.82, 0.01);
  const knee = new THREE.Vector3(side * 0.12, 0.61, 0.27);
  const ankle = new THREE.Vector3(side * 0.12, 0.37, 0.2);
  addRideLegSegment(hip, knee, 0.065, ridePantsMat);
  addRideLegSegment(knee, ankle, 0.055, ridePantsMat);
  const shoe = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.095, 0.25, 3, 0.035), rideShoeMat);
  shoe.position.set(side * 0.12, 0.345, 0.3);
  shoe.castShadow = true;
  playerRideLegs.add(shoe);
});
playerRideLegs.visible = false;
playerGroup.add(playerRideLegs);

const playerRideArms = new THREE.Group();
const rideShirtMat = new THREE.MeshStandardMaterial({ color: 0xc8443b, roughness: 0.82 });
const rideSkinMat = new THREE.MeshStandardMaterial({ color: 0xd6a178, roughness: 0.7 });
const rideArmGeometry = new THREE.CylinderGeometry(1, 0.9, 1, 10);
const rideArmParts = playerBikeMesh.userData.grips.map(() => {
  const upper = new THREE.Mesh(rideArmGeometry, rideShirtMat);
  const forearm = new THREE.Mesh(rideArmGeometry, rideSkinMat);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 9), rideSkinMat);
  upper.castShadow = true;
  forearm.castShadow = true;
  hand.castShadow = true;
  playerRideArms.add(upper, forearm, hand);
  return { upper, forearm, hand };
});
playerRideArms.visible = false;
playerGroup.add(playerRideArms);

const rideGripWorld = new THREE.Vector3();
const rideGripLocal = new THREE.Vector3();
const rideShoulder = new THREE.Vector3();
const rideElbow = new THREE.Vector3();
const rideSegmentDirection = new THREE.Vector3();
function placeRideArmSegment(mesh, from, to, radius) {
  rideSegmentDirection.subVectors(to, from);
  const length = rideSegmentDirection.length();
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(rideLimbAxis, rideSegmentDirection.normalize());
  mesh.scale.set(radius, length, radius);
}

function updatePlayerRideArms() {
  playerRideArms.visible = playerState.isRidingBike;
  if (!playerState.isRidingBike) return;
  playerMotorbike.updateMatrixWorld(true);
  playerGroup.updateMatrixWorld(true);
  playerBikeMesh.userData.grips.forEach((grip, index) => {
    grip.getWorldPosition(rideGripWorld);
    rideGripLocal.copy(rideGripWorld);
    playerGroup.worldToLocal(rideGripLocal);
    const side = rideGripLocal.x >= 0 ? 1 : -1;
    const shoulderBone=playerBones[index===0?'upperArm.L':'upperArm.R'];
    if(shoulderBone){shoulderBone.getWorldPosition(rideShoulder);playerGroup.worldToLocal(rideShoulder);}
    else rideShoulder.set(side * 0.145, 1.035, 0.015);
    rideElbow.copy(rideShoulder).lerp(rideGripLocal, 0.5);
    rideElbow.y -= 0.12;
    rideElbow.x += side * 0.035;
    const part = rideArmParts[index];
    placeRideArmSegment(part.upper, rideShoulder, rideElbow, 0.052);
    placeRideArmSegment(part.forearm, rideElbow, rideGripLocal, 0.043);
    part.hand.position.copy(rideGripLocal);
  });
}

const rideMotion = {
  speed: 0,
  heading: playerGroup.rotation.y,
  steer: 0,
  lean: 0,
  wheelSpin: 0
};

function togglePlayerMotorbike() {
  if (isDialogueOpen) return;
  if (!playerState.isRidingBike) {
    const distanceToBike = Math.hypot(
      playerGroup.position.x - playerMotorbike.position.x,
      playerGroup.position.z - playerMotorbike.position.z
    );
    if (distanceToBike > 2.6) {
      showToast('🛵 Hãy lại gần chiếc xe máy đang đỗ rồi bấm F để lên xe.');
      return;
    }
    playerState.isRidingBike = true;
    playerGroup.position.x = playerMotorbike.position.x;
    playerGroup.position.z = playerMotorbike.position.z;
    playerGroup.rotation.y = playerMotorbike.rotation.y;
  } else {
    playerState.isRidingBike = false;
    playerMotorbike.position.x = playerGroup.position.x;
    playerMotorbike.position.z = playerGroup.position.z;
    playerMotorbike.rotation.y = playerGroup.rotation.y;
    const dismountSide = 0.92;
    playerGroup.position.x += Math.cos(playerGroup.rotation.y) * dismountSide;
    playerGroup.position.z -= Math.sin(playerGroup.rotation.y) * dismountSide;
    resolvePlayerCollisions(playerGroup.position, 0.46);
  }
  const btn = document.getElementById('vehicle-toggle-btn');
  const motionEl = document.getElementById('motion-label');
  const moveHelp = document.getElementById('control-move');
  const shiftHelp = document.getElementById('control-shift');
  const spaceHelp = document.getElementById('control-space');
  if (playerState.isRidingBike) {
    rideMotion.heading = playerMotorbike.rotation.y;
    rideMotion.speed = 0;
    if (btn) {
      btn.textContent = '🚶 Xuống Xe Bộ (F)';
      btn.classList.add('active');
    }
    if (motionEl) motionEl.textContent = '🛵 Đang lái xe máy dạo phố';
    if (moveHelp) moveHelp.innerHTML = '🛵 <strong>W/S:</strong> Ga · Phanh/Lùi · <strong>A/D:</strong> Đánh lái';
    if (shiftHelp) shiftHelp.innerHTML = '<strong>Shift:</strong> Tăng tốc';
    if (spaceHelp) spaceHelp.innerHTML = '<strong>Space:</strong> Phanh xe';
    showToast('🛵 W: ga · Space: phanh · S: lùi · A/D: đánh lái · Shift: nitro.');
  } else {
    rideMotion.speed = 0;
    rideMotion.steer = 0;
    rideMotion.lean = 0;
    if (btn) {
      btn.textContent = '🛵 Lái Xe Máy (F)';
      btn.classList.remove('active');
    }
    if (motionEl) motionEl.textContent = '🚶 Đi bộ dạo phố';
    if (moveHelp) moveHelp.innerHTML = '🎮 <strong>W, A, S, D:</strong> Di chuyển';
    if (shiftHelp) shiftHelp.innerHTML = '<strong>Shift:</strong> Chạy nhanh';
    if (spaceHelp) spaceHelp.innerHTML = '<strong>Space:</strong> Nhảy';
    showToast('🚶 Đã xuống xe máy đi bộ trên vỉa hè.');
  }
}

// Tạo 12 Ngôi Sao Di Sản dọc tuyến phố và các khu khám phá mở rộng.
const heritageRelics = [];
function spawnHeritageRelics() {
  const relicCoords = [
    { id: 'relic_thpt', x: -4.0, z: 8.5, title: 'Cổng trường THPT Tây Hồ số 41' },
    { id: 'relic_ubnd', x: 0.0, z: -7.5, title: 'Sân cờ UBND Phường Phú Thượng' },
    { id: 'relic_crossing', x: -24.0, z: -4.0, title: 'Vạch sang đường Phú Thượng' },
    { id: 'relic_tea', x: -51.5, z: -5.5, title: 'Quán Trà Đá Vỉa Hè Cô Hoa' },
    { id: 'relic_trees', x: -75.0, z: 8.0, title: 'Hàng cây xà cừ tường vàng' },
    { id: 'relic_junction', x: 18.0, z: 8.0, title: 'Đầu ngã tư Phú Thượng' },
    { id: 'relic_68', x: 38.0, z: -3.5, title: 'Giao lộ 68 Phú Thượng - Phú Gia' },
    { id: 'relic_memorial', x: -24.0, z: -24.0, title: 'Khu tưởng niệm Liệt sĩ Phú Thượng' },
    { id: 'relic_flower_market', x: 134.0, z: -6.5, title: 'Chợ hoa Quảng Bá về đêm' },
    { id: 'relic_community_park', x: 122.0, z: 12.0, title: 'Công viên cộng đồng ven phố' },
    { id: 'relic_peach_garden', x: -154.0, z: 11.0, title: 'Vườn đào Phú Thượng' },
    { id: 'relic_village_gate', x: -153.0, z: -6.4, title: 'Cổng làng Phú Thượng cổ' }
  ];

  const starMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xd97706,
    emissiveIntensity: 0.55,
    metalness: 0.8,
    roughness: 0.15
  });

  relicCoords.forEach((rc) => {
    const grp = new THREE.Group();
    grp.position.set(rc.x, 1.15, rc.z);

    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 0), starMat);
    gem.castShadow = true;
    grp.add(gem);

    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.54, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xfde047, side: THREE.DoubleSide })
    );
    halo.position.y = -0.95;
    grp.add(halo);

    const collected = playerState.collectedRelicIds.has(rc.id);
    grp.userData = { id: rc.id, title: rc.title, collected };
    grp.visible = !collected;
    worldGroup.add(grp);
    heritageRelics.push(grp);
  });
}

// Chức năng Chụp Ảnh Check-in các địa danh (Phím P)
const PHOTO_SPOTS = [
  { id: 'spot_thpt', name: 'Cổng Trường THPT Tây Hồ (Số 41)', x: -2.2, z: 8.2 },
  { id: 'spot_ubnd', name: 'Trụ Sở UBND Phường Phú Thượng', x: 0, z: -6.2 },
  { id: 'spot_trada', name: 'Quán Trà Đá Vỉa Hè Phố Phú Thượng', x: -52.5, z: -5.6 },
  { id: 'spot_ngaba', name: 'Ngã Ba 68 Phú Thượng - Phú Gia', x: 32, z: -5.5 },
  { id: 'spot_lietsi', name: 'Đài Tưởng Niệm Liệt Sĩ Phú Thượng', x: -24, z: -28 },
  { id: 'spot_chohoa', name: 'Chợ Hoa Quảng Bá', x: 134, z: -7 },
  { id: 'spot_congvien', name: 'Công Viên Cộng Đồng Phú Thượng', x: 128, z: 16 },
  { id: 'spot_vuondao', name: 'Vườn Đào Phú Thượng & Cổng Làng', x: -153, z: 8 }
];

function captureLandmarkPhoto() {
  if (daylifeController?.photo()) { playSoundEffect('shutter'); return; }
  if (playerState.isRidingBike) {
    showToast('🛵 Hãy xuống xe trước khi chụp ảnh hoặc tương tác với địa điểm.');
    return;
  }
  playSoundEffect('shutter');
  let matchedSpot = null;
  let minDist = 18.0;
  PHOTO_SPOTS.forEach((sp) => {
    const d = Math.hypot(playerGroup.position.x - sp.x, playerGroup.position.z - sp.z);
    if (d < minDist) {
      minDist = d;
      matchedSpot = sp;
    }
  });

  if (matchedSpot) {
    if (!playerState.snappedPhotos.has(matchedSpot.id)) {
      playerState.snappedPhotos.add(matchedSpot.id);
      addRewards(15000, 60);
      showToast(`📸 Check-in thành công: "${matchedSpot.name}"! (+60 XP, +15.000đ)`);
    } else {
      showToast(`📸 Bạn đã chụp bức ảnh kỷ niệm tại "${matchedSpot.name}" rồi!`);
    }
  } else {
    showToast(`📸 Hãy đứng gần 1 trong ${PHOTO_SPOTS.length} địa điểm chính (dưới 18m) để chụp ảnh Check-in nhận thưởng!`);
  }
}

const STREET_STORY_STEPS = [
  {
    id: 'survey_junction',
    title: 'Khảo sát ngã ba thật',
    prompt: 'Khảo sát mặt đường và luồng xe ở ngã ba',
    x: -15,
    z: 2.2,
    reward: { coins: 8000, xp: 45, neighborhood: { beauty: 2, cohesion: 1 } },
    result: 'Đã ghi nhận mặt đường không có vạch tim và lối rẽ hẹp trước cổng trường.'
  },
  {
    id: 'inspect_facade',
    title: 'Ghi nhận kiến trúc số 41',
    prompt: 'Quan sát cầu thang cong và mặt đứng trường',
    x: 1.4,
    z: 8.6,
    reward: { coins: 9000, xp: 55, neighborhood: { heritage: 3 } },
    result: 'Đã lưu hồ sơ kiến trúc: khối trường vàng kem, cầu thang cong và hàng rào sắt.'
  },
  {
    id: 'organize_bikes',
    title: 'Dọn lối đi học sinh',
    prompt: 'Sắp xếp dãy xe sát tường cho gọn',
    x: -10.1,
    z: 19,
    reward: { coins: 12000, xp: 65, neighborhood: { beauty: 4, cohesion: 3 } },
    result: 'Dãy xe đã được xếp sát tường, trả lại lối đi thông thoáng cho học sinh.'
  },
  {
    id: 'report_utility',
    title: 'Báo điểm mất an toàn',
    prompt: 'Kiểm tra cột điện và nắp cống góc phố',
    x: -9.2,
    z: 6.7,
    reward: { coins: 16000, xp: 85, neighborhood: { beauty: 4, cohesion: 5 } },
    result: 'Đã gửi báo cáo cột điện, dây nổi và thoát nước để tổ dân phố xử lý.'
  }
];

const streetStoryEvents = [];
let nearestStoryEvent = null;

function spawnStreetStoryEvents() {
  STREET_STORY_STEPS.forEach((step, index) => {
    const marker = new THREE.Group();
    marker.position.set(step.x, 0.08, step.z);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.82, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.86, side: THREE.DoubleSide })
    );
    marker.add(ring);
    const pin = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.25, 0),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x075985, emissiveIntensity: 1.15, metalness: 0.42 })
    );
    pin.position.y = 1.05;
    marker.add(pin);
    const label = createNPCLabel(`🔎 ${step.title}`, '#38bdf8');
    label.position.y = 1.85;
    marker.add(label);
    marker.userData = { ...step, index, ring, pin };
    marker.visible = index === playerState.streetStoryStep;
    worldGroup.add(marker);
    streetStoryEvents.push(marker);
  });
  updateStreetStoryUI();
}

function updateStreetStoryUI() {
  const step = playerState.streetStoryStep;
  const titleEl = document.getElementById('street-story-title');
  const progressEl = document.getElementById('street-story-progress');
  if (titleEl) titleEl.textContent = step >= STREET_STORY_STEPS.length
    ? 'Hoàn thành: Góc phố an toàn và đúng bản sắc'
    : STREET_STORY_STEPS[step].title;
  if (progressEl) progressEl.textContent = `${Math.min(step, STREET_STORY_STEPS.length)}/${STREET_STORY_STEPS.length}`;
  streetStoryEvents.forEach((marker, index) => {
    marker.visible = index === step && step < STREET_STORY_STEPS.length;
  });
}

function completeStreetStoryEvent(marker) {
  if (!marker || marker.userData.index !== playerState.streetStoryStep) return;
  const step = marker.userData;
  playerState.streetStoryStep += 1;
  addRewards(step.reward.coins, step.reward.xp);
  awardSocialProgress({ neighborhood: step.reward.neighborhood });
  playSoundEffect('quest');
  showToast(`🔎 ${step.result} (+${step.reward.xp} XP, +${step.reward.coins.toLocaleString('vi-VN')}đ)`);

  if (playerState.streetStoryStep >= STREET_STORY_STEPS.length) {
    addRewards(30000, 140);
    awardSocialProgress({ neighborhood: { cohesion: 8, beauty: 8, heritage: 5 } });
    showToast('🏆 Hoàn thành Chương “Góc Phố Số 41”! Thưởng 30.000đ, 140 XP và uy tín khu phố.');
  }
  updateStreetStoryUI();
  markProgressDirty();
}

const HORROR_CHAPTER_STEPS = [
  { title: 'Nhận hóa đơn chữ máu lúc 19:41 tại quầy xôi', prompt: 'Kiểm tra máy in nhiệt · gói đơn xôi 19:41', x: -90, z: -40.95 },
  { title: 'Giao gói xôi tới Nhà Số 41 & đối mặt Tiếng Gọi', prompt: 'Đặt gói xôi trước cửa Nhà Số 41', x: -67.2, z: -28.8 },
  { title: 'Phá niêm phong Tủ Cầu Dao 3 Nhánh', prompt: 'Mở tủ cầu dao tổng Ngõ 41', x: -64.9, z: -37 },
  { title: 'Lần theo tiếng chuông bên Giếng Cổ cuối ngõ', prompt: 'Kiểm tra bàn thờ & miệng giếng cổ', x: -67, z: -47.2 },
  { title: 'Nghe băng cassette 2008 & đánh thức Kẻ Bắt Chước', prompt: 'Bật máy ghi âm của bố', x: -67, z: -47.2 },
  { title: 'Phóng Xung Đèn (Phím R) & chạy thoát ra Đầu Ngõ 41!', prompt: 'Chạy về cổng Ngõ 41', x: -67, z: -9.4, escape: true }
];

const horrorChapterEvents = [];
let horrorModeActive = false;
let nearestHorrorEvent = null;
let horrorDrone = null;
let horrorDroneGain = null;
let horrorChaseStartedAt = 0;
let storyDialogueQueue = [];
let storyDialogueDone = null;
let storyFlashlightBattery = playerState.night.battery;
let storyComposure = playerState.night.composure;
let storyNoise = 0;
let storyClueCount = playerState.night.evidence.length;
let nearestStoryClue = null;
let storyUiAccumulator = 0;
let nightActivity = null;
let nightCircuit = [];
let kitchenBase = null;
let nightThreat = createThreat();
let nightRouteTimer = 0;
let nightRoutePoint = null;
let nightThreatAccumulator = 0;
let nightExitArmed = true;
let entityStunTimer = 0;
let flashlightBurstTimer = 0;
let heartbeatSoundTimer = 0;
let triggeredHaunts = new Set();
let apparitionActiveTimer = 0;
const nightNodes = [
  { x: -67, z: -50 }, { x: -67, z: -45 }, { x: -67, z: -37.5 },
  { x: -67, z: -29 }, { x: -67, z: -20 }, { x: -67, z: -10 },
  { x: -73, z: -37.5 }, { x: -80, z: -37.5 }, { x: -90, z: -37 }, { x: -90, z: -40.2 }
];
const nightPatrol = [nightNodes[4], nightNodes[3], nightNodes[5], nightNodes[3]];
let nightObstacles = [];

function persistNight() {
  playerState.night.battery = storyFlashlightBattery;
  playerState.night.composure = storyComposure;
  markProgressDirty();
}

function playHorrorKnockSound() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  [0, 0.34, 0.72].forEach((offset) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const t = audioCtx.currentTime + offset;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(115, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.14);
    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.17);
  });
}

function playHorrorPhoneRing() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  [0, 0.18, 0.36].forEach((offset) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const t = audioCtx.currentTime + offset;
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.setValueAtTime(1120, t + 0.06);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  });
}

function playHeartbeatPulse(loud = false) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  [0, 0.18].forEach((offset, idx) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const t = audioCtx.currentTime + offset;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(idx === 0 ? 64 : 52, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + 0.14);
    gain.gain.setValueAtTime(loud ? 0.22 : 0.11, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.16);
  });
}

function triggerFlashlightBurst() {
  if (!horrorModeActive || isDialogueOpen) return;
  if (storyFlashlightBattery < 10) {
    showToast('⚠️ Pin Đèn Pin dưới 10%! Hãy quay về Quán Xôi Cô Hoa để sạc đầy pin miễn phí.');
    return;
  }
  storyFlashlightBattery = Math.max(0, storyFlashlightBattery - 12);
  setPlayerFlashlight(true, false);
  flashlightBurstTimer = 0.65;
  storyComposure = Math.min(100, storyComposure + 18);

  document.body.classList.add('horror-burst-flash');
  setTimeout(() => document.body.classList.remove('horror-burst-flash'), 220);

  // Âm thanh phóng tụ điện hồ quang
  horrorPulse(420, 0.32);

  let hitSomething = false;
  // 1. Nếu có Ảo Ảnh Cậu Bé Áo Mưa Vàng đang hiện hình -> Xua tan ngay lập tức!
  const app = horrorSetPieces.apparition;
  if (app && app.visible) {
    const distApp = Math.hypot(playerGroup.position.x - app.position.x, playerGroup.position.z - app.position.z);
    if (distApp < 18) {
      app.visible = false;
      apparitionActiveTimer = 0;
      document.body.classList.remove('horror-blood-flicker');
      hitSomething = true;
      showToast('⚡ Xung Đèn Pin đã thiêu rụi Ảo Ảnh Áo Mưa Vàng! (+18% Bình tĩnh)', 3800);
    }
  }

  // 2. Nếu Thực Thể Kẻ Bắt Chước đang săn đuổi trong tầm 14m -> Làm choáng (Stun) 4.5 giây!
  const ent = horrorSetPieces.entity;
  if (ent && ent.visible) {
    const distEnt = Math.hypot(playerGroup.position.x - ent.position.x, playerGroup.position.z - ent.position.z);
    if (distEnt < 14.5) {
      entityStunTimer = 4.5;
      hitSomething = true;
      showToast('⚡ ĐÃ LÀM CHOÁNG “KẺ BẮT CHƯỚC” TRONG 4.5 GIÂY! Tranh thủ chạy hoặc rẽ vào ngách ngay!', 4200);
    }
  }

  if (!hitSomething) {
    showToast('⚡ Đã phóng Xung Đèn Pin khuếch đại ánh sáng & trấn tĩnh tinh thần (-12% Pin).', 2800);
  }
  updateStorySurvivalUI();
  persistNight();
}

function openNightActivity(kind, title, content) {
  nightActivity = kind;
  isDialogueOpen = true;
  keys.w = keys.a = keys.s = keys.d = keys.shift = keys.q = false;
  document.exitPointerLock?.();
  document.getElementById('night-title').textContent = title;
  document.getElementById('night-content').innerHTML = content;
  document.getElementById('night-feedback').textContent = '';
  document.getElementById('night-actions').replaceChildren();
  document.getElementById('night-close').classList.remove('hidden');
  document.getElementById('night-activity').classList.remove('hidden');
}

function closeNightActivity() {
  nightActivity = null;
  document.getElementById('night-activity').classList.add('hidden');
  isDialogueOpen = false;
  persistNight();
}

function nightButton(label, callback, disabled = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'choice-btn';
  button.textContent = label;
  button.disabled = disabled;
  button.addEventListener('click', callback);
  document.getElementById('night-actions').append(button);
  return button;
}

function openNightNotebook() {
  const night = playerState.night;
  const cards = Object.entries(EVIDENCE).map(([id, item]) => night.evidence.includes(id)
    ? `<article class="night-evidence"><h3>🔎 ${item.title}</h3><p>${item.text}</p><p class="night-deduction">${item.deduction}</p></article>`
    : '<article class="night-evidence missing">🔒 Vật chứng chưa tìm thấy · Soi đèn tìm vòng sáng tròn dưới chân tường dọc Ngõ 41 (gần Nhà 39B, Ngã ba cầu dao và Bàn thờ cuối ngõ).</article>').join('');
  openNightActivity(
    'notebook',
    '📖 Hồ Sơ Điều Tra Đêm Mưa Số 41 (26/10/2008)',
    `<p>Đúng <strong>19:41</strong>, chiếc máy in đã rút điện tự động in hóa đơn mực đỏ mang tên <strong>Nguyễn Văn Linh</strong>, yêu cầu giao gói xôi nếp trắng không hành tới <strong>Nhà số 41 Ngõ 41</strong> — nơi em trai <strong>An</strong> mất tích bên giếng cổ 18 năm trước.</p>
    <div class="night-checks">
      <span>🍙 ${night.orders}/3 đơn đã gói</span>
      <span>⚡ ${night.power ? 'Đã phá phong ấn Tủ Điện' : 'Tủ điện chưa mở'}</span>
      <span>🗣️ ${night.voiceEncountered ? night.voiceAnswered ? 'Đã lỡ đáp lời Kẻ Bắt Chước' : 'Đã giữ im lặng trước Tiếng Gọi' : 'Chưa đối mặt Tiếng Gọi'}</span>
    </div>
    ${cards}
    <p class="night-help">💡 <strong>Kỹ năng Sinh tồn:</strong> Bấm <strong>Phím R</strong> để phóng <em>Xung Đèn Pin Trừ Tà</em> (thiêu rụi Ảo ảnh áo mưa vàng & làm choáng Kẻ Bắt Chước 4.5 giây) · <strong>Phím T</strong>: Bật/Tắt đèn · <strong>Phím Q</strong>: Đứng nín thở hạ nhịp tim.</p>`
  );
}

function openNightKitchen(marker) {
  const orderIndex = playerState.night.orders;
  const order = NIGHT_ORDERS[orderIndex];
  if (!order) { completeHorrorEvent(marker, true); return; }
  kitchenBase = null;
  openNightActivity(
    'kitchen',
    `🍙 Ca Tối Quán Xôi · Đơn ${orderIndex + 1}/3: ${order.customer}`,
    `<blockquote>“${order.request}”</blockquote>
    <p id="night-kitchen-step"><strong>Bước 1:</strong> Chọn đúng loại xôi theo yêu cầu hoặc bấm nút vào thẳng đơn hàng 19:41 bên dưới.</p>
    <div class="night-ticket">MÁY IN HÓA ĐƠN NHIỆT · PHÚ THƯỢNG 19:41<br>Ngoài trời mưa tầm tã, bóng đèn tuýp trên đầu bắt đầu chập chờn…</div>`
  );
  const pickBase = (base) => {
    if (base !== order.base) {
      document.getElementById('night-feedback').textContent = '⚠️ Chưa đúng loại xôi khách dặn. Hãy nhìn lại lời yêu cầu trong khung trích dẫn phía trên.';
      playerState.night.mistakes++;
      return;
    }
    kitchenBase = base;
    document.getElementById('night-feedback').textContent = '';
    document.getElementById('night-kitchen-step').textContent = `✓ Đã đơm ${base} nóng hổi. Bước 2: Chọn phần ăn kèm rồi bọc lá chuối.`;
    document.getElementById('night-actions').replaceChildren();
    ['Hành phi', 'Muối vừng', 'Không thêm'].forEach(topping => nightButton(`🍃 ${topping}`, () => {
      if (topping !== order.topping) {
        document.getElementById('night-feedback').textContent = '⚠️ Khách dặn phần ăn kèm khác. Hãy chọn lại nhé!';
        playerState.night.mistakes++;
        return;
      }
      playerState.night.orders++;
      persistNight();
      horrorPulse(orderIndex === 2 ? 52 : 110, 0.35);
      openNightActivity(
        'kitchen',
        `✓ Hoàn tất Đơn ${orderIndex + 1}/3: ${kitchenBase} (${topping})`,
        `<p>${order.reply}</p><p class="night-deduction">Tiến độ ca tối: ${playerState.night.orders}/3 đơn hoàn thành.</p>`
      );
      document.getElementById('night-close').classList.add('hidden');
      nightButton(orderIndex < 2 ? '👉 Phục vụ vị khách tiếp theo trong mưa' : '🩸 Cầm Hóa Đơn Mực Đỏ 19:41 & Bước Ra Ngõ 41', () => {
        closeNightActivity();
        if (orderIndex < 2) openNightKitchen(marker);
        else completeHorrorEvent(marker, true);
      });
    }));
  };
  ['Xôi xéo', 'Xôi lạc', 'Nếp trắng'].forEach(base => nightButton(`🍙 ${base}`, () => pickBase(base)));

  // Nút đi tắt cho người chơi muốn vào thẳng cao trào kinh dị 19:41 không cần gói lặp lại 3 lần!
  if (orderIndex < 2) {
    const fastBtn = nightButton('⚡ Bỏ qua khách thường · Nhận ngay Hóa Đơn Máu 19:41 (Vào thẳng Truyện Kinh Dị)', () => {
      playerState.night.orders = 3;
      persistNight();
      closeNightActivity();
      completeHorrorEvent(marker, true);
    });
    fastBtn.style.borderColor = '#ef4444';
    fastBtn.style.color = '#fca5a5';
  }
}

function openNightCircuit(marker) {
  nightCircuit = [];
  openNightActivity(
    'circuit',
    '⚡ Phá Bùa Niêm Phong Tủ Điện Ngõ 41',
    `<p>Ba cầu dao đồng cổ dẫn điện tới 3 khu vực trong Ngõ 41. Dây chỉ đỏ của bố quấn quanh nắp sắt kèm lời dặn khắc sâu:</p>
    <blockquote>“Muốn giữ mạng trước Kẻ Bắt Chước dưới giếng cổ: Phải thắp sáng từ HIÊN NHÀ 41 trước để trấn cửa, nối ra LÒNG NGÕ thứ hai để mở đường rút, và cuối cùng mới cấp nguồn cho BÀN THỜ cuối ngõ!”</blockquote>
    <p class="night-deduction">💡 Thứ tự đúng: <strong>[1. Đèn Hiên] → [2. Đèn Ngõ] → [3. Đèn Bàn Thờ]</strong></p>
    <p id="night-circuit-progress">Trạng thái: Chưa đóng cầu dao nào (0/3).</p>`
  );
  [['porch', '1️⃣ Đèn Hiên (Trấn cửa Nhà 41)'], ['lane', '2️⃣ Đèn Ngõ (Soi đường rút lui)'], ['altar', '3️⃣ Đèn Bàn Thờ & Giếng Cổ']].forEach(([id, label]) => nightButton(label, () => {
    const result = circuitStep(nightCircuit, id);
    nightCircuit = result.sequence;
    document.getElementById('night-feedback').textContent = result.tripped
      ? '💥 XOẸT! Thứ tự sai khiến rơ-le tự ngắt! Hãy bấm lần lượt: 1. Đèn Hiên → 2. Đèn Ngõ → 3. Đèn Bàn Thờ.'
      : `⚡ Đã đóng nhánh điện (${nightCircuit.length}/3) — dòng điện chạy ổn định!`;
    if (result.tripped) {
      playerState.night.mistakes++;
      horrorPulse(55, 0.25);
    } else {
      horrorPulse(145 + nightCircuit.length * 35, 0.2);
    }
    document.getElementById('night-circuit-progress').textContent = `Đã cấp nguồn ${nightCircuit.length}/3 nhánh.`;
    if (result.complete) {
      playerState.night.power = true;
      closeNightActivity();
      completeHorrorEvent(marker, true);
    }
  }));
}

function openNightVoice(onDone) {
  playHorrorKnockSound();
  openNightActivity(
    'voice',
    '🚪 Tiếng Gọi Từ Khe Cửa Nhà Số 41',
    `<blockquote>“Anh Linh ơi… Có phải anh Linh mang xôi nếp trắng về cho em không? Dưới giếng tối và lạnh lắm, anh nói một tiếng rồi mở cửa nắm tay em với…”</blockquote>
    <p>Cánh cửa gỗ lim hé mở 2 phân. Qua khe cửa tối đen không hề có bàn chân người đứng trên mặt đất, chỉ có một chiếc áo mưa vàng ướt sũng đang đung đưa và mùi bùn giếng tanh nồng.</p>
    <p class="night-deduction">⚠️ Lời dặn sống còn: Kẻ Bắt Chước cần bạn LÊN TIẾNG TRẢ LỜI để xác nhận danh tính và cướp bóng!</p>`
  );
  document.getElementById('night-close').classList.add('hidden');
  const choose = (answer, usedBurst = false) => {
    playerState.night.voiceEncountered = true;
    playerState.night.voiceAnswered = answer;
    if (usedBurst) {
      storyComposure = Math.min(100, storyComposure + 12);
      document.body.classList.add('horror-burst-flash');
      setTimeout(() => document.body.classList.remove('horror-burst-flash'), 220);
      horrorPulse(380, 0.35);
    } else {
      storyComposure = Math.max(15, storyComposure - (answer ? 35 : 4));
    }
    closeNightActivity();
    if (answer) {
      flashHorrorScreen();
      horrorPulse(36, 1.1);
      showToast('🩸 BẠN ĐÃ LỠ LỜI ĐÁP! Tiếng cười khàn đặc vang lên — Kẻ Bắt Chước đã nhớ giọng của bạn!', 5200);
    } else if (usedBurst) {
      showToast('⚡ Ánh chớp Đèn Pin lột trần cái bóng không mặt sau khe cửa! Nó rít lên rồi thụt lùi về phía Giếng Cổ cuối ngõ!', 5200);
    } else {
      showToast('🤫 Bạn nín thở lùi khỏi bậc thềm. Tiếng cào cửa sắt im bặt rồi dịch chuyển về phía cuối ngõ.', 4500);
    }
    onDone();
  };
  nightButton('⚡ Phóng Xung Đèn Pin soi thẳng vào khe cửa & tuyệt đối giữ im lặng (Khuyên dùng)', () => choose(false, true));
  nightButton('🤫 Nín thở lùi khỏi cửa · Dán chặt lại bùa chỉ đỏ', () => choose(false, false));
  nightButton('🗣️ Lên tiếng đáp lại: “An đấy à? Đợi anh mở cửa!” (Nguy hiểm)', () => choose(true, false));
}

function isAtNightRefuge() {
  return horrorModeActive && playerState.horrorChapterStage > 0 && playerGroup.position.x < -86
    && playerGroup.position.z < -38.5 && playerGroup.position.z > -44;
}

function openNightRefuge() {
  openNightActivity(
    'refuge',
    '🏮 Trú Ẩn An Toàn Tại Quán Xôi Cô Hoa',
    '<p>Dưới ánh đèn vàng ấm áp và mùi lá chuối thơm phức của quán xôi, tiếng bước chân ướt nước mưa ngoài Ngách 41/2 buộc phải dừng lại. Thực thể dưới giếng cổ không thể bước qua ngưỡng cửa có hơi ấm bếp lửa.</p><p>Bạn có thể sạc đầy Pin Đèn Pin để tiếp tục dùng <strong>Xung Đèn Trừ Tà (Phím R)</strong> ngoài ngõ.</p>'
  );
  nightButton('🔋 Sạc đầy 100% Pin Đèn Pin & Uống trà nóng trấn tĩnh (100% Bình tĩnh)', () => {
    storyFlashlightBattery = 100;
    storyComposure = 100;
    setPlayerFlashlight(true, false);
    persistNight();
    updateStorySurvivalUI();
    document.getElementById('night-feedback').textContent = '✓ Đã sạc đầy 100% Pin và hồi phục hoàn toàn nhịp tim!';
  });
  nightButton('📖 Mở Hồ sơ 3 Vật chứng & Quy tắc giải đố', openNightNotebook);
}

document.getElementById('night-close').addEventListener('click', closeNightActivity);
document.getElementById('night-notebook-btn').addEventListener('click', () => {
  if (!isDialogueOpen) openNightNotebook();
});
document.getElementById('horror-burst-btn')?.addEventListener('click', () => {
  triggerFlashlightBurst();
});

function updateStorySurvivalUI() {
  const battery = document.getElementById('story-battery');
  const heart = document.getElementById('story-heart');
  const noise = document.getElementById('story-noise');
  const clues = document.getElementById('story-clues');
  if (battery) {
    battery.textContent = `${Math.ceil(storyFlashlightBattery)}%`;
    battery.classList.toggle('danger', storyFlashlightBattery < 20);
  }
  if (heart) {
    const bpm = Math.round(165 - storyComposure * 0.93);
    const stateLabel = storyComposure < 28 ? 'HOẢNG LOẠN' : storyComposure < 62 ? 'DỒN DẬP' : 'ỔN ĐỊNH';
    heart.textContent = `${bpm} BPM · ${stateLabel}`;
    heart.classList.toggle('danger', storyComposure < 35);
  }
  if (noise) {
    noise.textContent = storyNoise > 70 ? 'RẤT CAO' : storyNoise > 32 ? 'CAO' : 'THẤP';
    noise.classList.toggle('danger', storyNoise > 70);
  }
  if (clues) clues.textContent = `${storyClueCount}/3`;
  document.body.classList.toggle('story-low-composure', horrorModeActive && storyComposure < 28);
  document.body.classList.toggle('story-chase', horrorModeActive && nightThreat.mode === 'chase' && entityStunTimer <= 0);
  if (horrorModeActive && playerState.horrorChapterStage < 3) {
    const threatEl = document.getElementById('night-threat');
    if (threatEl) {
      if (horrorSetPieces.apparition?.visible) {
        threatEl.textContent = '👻 ẢO ẢNH ÁO MƯA VÀNG PHÍA TRƯỚC · Bấm Phím R để xua tan!';
        threatEl.dataset.state = 'chase';
      } else {
        threatEl.textContent = 'Đêm mưa Ngõ 41 · Bấm Phím R nếu gặp bóng ma cản đường';
        threatEl.dataset.state = 'safe';
      }
    }
  }
  const peaceBtn = document.getElementById('ending-peace-btn');
  if (peaceBtn) {
    peaceBtn.disabled = !canResolveNight(playerState.night);
    peaceBtn.title = playerState.night.voiceAnswered ? 'Tiếng gọi đã nhận ra bạn. Hãy mang hồ sơ ra khỏi ngõ.' : `Tìm đủ 3 vật chứng và cấp điện đúng (${storyClueCount}/3)`;
    peaceBtn.textContent = playerState.night.voiceAnswered ? '🔒 Kẻ Bắt Chước đã nghe được giọng bạn (Không thể mở Kết Trọn Vẹn)'
      : storyClueCount < 3 ? `🔒 Thắp đèn hiên cho An · Cần tìm thêm ${3 - storyClueCount} vật chứng trong ngõ`
      : '🕯️ Thắp đèn hiên nhà 41 · Đặt gói xôi ấm & hóa giải lời nguyền Giếng Cổ (Kết thúc Trọn Vẹn)';
  }
}

function collectStoryClue(clue) {
  if (!clue || clue.userData.collected) return;
  clue.userData.collected = true;
  clue.visible = false;
  if (!playerState.night.evidence.includes(clue.userData.id)) playerState.night.evidence.push(clue.userData.id);
  storyClueCount = playerState.night.evidence.length;
  storyComposure = Math.min(100, storyComposure + 18);
  horrorPulse(132 + storyClueCount * 28, 0.35);
  showToast(`🔎 VẬT CHỨNG ${storyClueCount}/3 · ${clue.userData.title}`, 4200);
  updateStorySurvivalUI();
  persistNight();
  const evidence = EVIDENCE[clue.userData.id];
  openNightActivity('evidence', `🔎 Vật Chứng ${storyClueCount}/3: ${evidence.title}`, `<p>${evidence.text}</p><p class="night-deduction">${evidence.deduction}</p><p>Đã lưu vào Hồ Sơ Điều Tra. Nhấn <strong>Phím J</strong> để đọc lại bất cứ lúc nào.</p>`);
}

const STORY_DIALOGUE = [
  [
    { speaker: 'Chiếc Máy In Hóa Đơn Đã Rút Điện', text: 'RÈ… RÈ… Từ khe máy in không cắm nguồn trên quầy, một tờ hóa đơn tự động trồi ra, chữ in bằng thứ mực đỏ sẫm còn ướt nước giếng cổ: “19:41 – Giao 01 Xôi Nếp Trắng Không Hành tới Nhà Số 41 Ngõ 41. Người nhận: Nguyễn Văn Linh.”' },
    { speaker: 'Linh (Bàng hoàng)', text: 'Đúng 19 giờ 41 phút đêm mưa 26/10/2008… giờ phút em An mặc áo mưa vàng đứng đợi mình ở đầu ngõ rồi biến mất bên miệng giếng cổ sau nhà số 41!' },
    { speaker: 'Mảnh Bùa Giấy Của Bố Kẹp Dưới Đáy Nồi Xôi', text: '“Linh con, thứ ẩn dưới giếng cổ Ngõ 41 là Kẻ Bắt Chước Giọng Người Thân. Nó sống nhờ dòng điện rò rỉ và tiếng chuông điện thoại cắt dây. Nếu đêm nay nó giả giọng em An gọi tên con sau cánh cửa, tuyệt đối ĐỪNG TRẢ LỜI — hãy dùng Xung Đèn Pin (Phím R) để chiếu thẳng vào nó!”' }
  ],
  [
    { speaker: 'Linh', text: 'Trước thềm Nhà số 41 đầy những dấu chân nhỏ xíu in bằng bùn đen dẫn từ dưới lòng ngõ đi xuyên qua cánh cửa gỗ đang khóa trái…' },
    { speaker: 'Tiếng Thì Thầm Sau Khe Cửa Gỗ', text: 'Cánh cửa gỗ lim khẽ rung lên ba nhịp: CỘC… CỘC… CỘC… Một quả bóng bay màu đỏ máu từ từ trôi ra khỏi bóng tối trên ban công tầng 2.' },
    { speaker: 'Hóa Đơn Mực Đỏ Trong Túi Áo', text: 'Những con chữ trên tờ hóa đơn tự động biến đổi: “Đừng tin giọng nói sau cánh cửa. Hãy tìm 3 Vật Chứng dọc chân tường ngõ để biết sự thật đêm 2008!”' }
  ],
  [
    { speaker: 'Linh', text: 'Ba cầu dao đồng đã đóng đúng thứ tự: Đèn hiên nhà 41 bừng sáng trấn giữ cửa trước, đèn lòng ngõ bật lên, và dòng điện vừa chạy tới cuối ngõ…' },
    { speaker: 'Tiếng Chuông Điện Thoại Bàn Cuối Ngõ', text: 'RENG… RENG… RENG… Từ phía miệng giếng cổ bị niêm phong ở cuối Ngõ 41, chiếc điện thoại bàn đã đứt dây từ năm 2008 bỗng đổ chuông điên loạn trong mưa!' },
    { speaker: 'Linh', text: 'Nắp giếng đá ong đang dịch chuyển! Có một bóng người cao ngoằng khoác áo mưa vàng rách nát vừa trồi lên từ phía cuối ngõ! Nếu nó lao tới, mình có thể bấm Phím R (Xung Đèn Pin) để làm nó choáng!' }
  ],
  [
    { speaker: 'Loa Điện Thoại Đứt Dây Bên Giếng Cổ', text: '“Linh ơi… xuống giếng với mẹ và em đi con…” Giọng nói phát ra từ ống nghe nhựa nứt toác, hòa lẫn tiếng nước giếng sục sôi bên dưới tấm bùa đỏ!' },
    { speaker: 'Linh', text: 'Không phải mẹ! Dây điện thoại đã bị bố cắt đứt từ 18 năm trước! Ngay dưới chân bàn thờ có chiếc máy ghi âm cassette của bố và cuộn băng ghi chữ: “SỰ THẬT ĐÊM 26/10/2008”.' },
    { speaker: 'Linh', text: 'Mình phải bấm nút Play nghe cuộn băng này ngay tại đây trước khi cái bóng áo mưa vàng quay lại!' }
  ],
  [
    { speaker: 'Giọng Của Bố Trong Cuộn Băng Năm 2008', text: '“Linh nghe bố dặn đây! Đêm mất điện năm 2008, bé An bị ngạt nước mưa nhưng đã được bác sĩ hộ sinh đưa gấp sang Trạm xá Phú Gia cứu sống! Đứa bé thật sự đã rời khỏi ngõ lúc 19:41!”' },
    { speaker: 'Giọng Của Bố (Hoảng loạn trong băng)', text: '“Còn thứ gõ cửa nhà số 41 tối hôm đó mang giọng của An là Vong Giếng Cổ! Bố đã khóa trái nhà và niêm phong cầu dao để nhốt nó lại. Đừng để nó bắt được con! Chạy ngay ra đầu ngõ đi Linh!”' },
    { speaker: 'Linh', text: 'Thì ra em An vẫn còn sống ở Phú Gia! Kẻ Bắt Chước đã lộ nguyên hình ngay sau lưng mình rồi — Bấm Phím R phóng Xung Đèn Pin làm choáng nó rồi chạy thẳng ra Cổng Ngõ 41!' }
  ]
];

function showStoryDialogue(lines, onDone) {
  storyDialogueQueue = [...lines];
  storyDialogueDone = onDone || null;
  isDialogueOpen = true;
  document.exitPointerLock?.();
  document.getElementById('story-dialogue')?.classList.remove('hidden');
  advanceStoryDialogue();
}

function advanceStoryDialogue() {
  const line = storyDialogueQueue.shift();
  if (line) {
    const speaker = document.getElementById('story-dialogue-speaker');
    const text = document.getElementById('story-dialogue-text');
    if (speaker) speaker.textContent = line.speaker;
    if (text) text.textContent = line.text;
    return;
  }
  document.getElementById('story-dialogue')?.classList.add('hidden');
  isDialogueOpen = false;
  const done = storyDialogueDone;
  storyDialogueDone = null;
  done?.();
}

function spawnHorrorChapterEvents() {
  HORROR_CHAPTER_STEPS.forEach((step, index) => {
    const marker = new THREE.Group();
    marker.position.set(step.x, 0.09, step.z);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.68, 0.98, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: step.escape ? 0xfacc15 : 0xfbbf24,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide
      })
    );
    ring.visible = true;
    marker.add(ring);

    // Cột sáng dẫn đường thẳng đứng (Waypoint Beacon) bằng MeshBasicMaterial trong suốt (0 tốn PointLight shader!)
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.45, 7.5, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: step.escape ? 0xfacc15 : 0xf59e0b,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    beam.position.y = 3.75;
    beam.visible = false;
    marker.add(beam);

    const sigil = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.32, 0),
      new THREE.MeshStandardMaterial({
        color: 0xfde047,
        emissive: 0xd97706,
        emissiveIntensity: 0.9,
        roughness: 0.3
      })
    );
    sigil.position.y = 1.15;
    sigil.visible = false;
    marker.add(sigil);

    const label = createNPCLabel(
      step.escape ? '🏃 LỐI THOÁT NGÕ 41!' : `📍 ${step.title.toUpperCase()}`,
      step.escape ? '#facc15' : '#fbbf24'
    );
    label.position.y = 2.25;
    label.scale.set(4.2, 0.82, 1);
    label.visible = false;
    marker.add(label);

    marker.userData = { ...step, index, ring, sigil, beam, label };
    marker.visible = false;
    worldGroup.add(marker);
    horrorChapterEvents.push(marker);
  });
}

let horrorRainSource = null;
let horrorRainGain = null;
let thunderCooldown = 9.5;
let lightningFlashAmount = 0;

function startHorrorAmbience() {
  if (!audioCtx || horrorDrone) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  horrorDrone = audioCtx.createOscillator();
  horrorDroneGain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  horrorDrone.type = 'sawtooth';
  horrorDrone.frequency.value = 46;
  filter.type = 'lowpass';
  filter.frequency.value = 165;
  horrorDroneGain.gain.value = 0.018;
  horrorDrone.connect(filter);
  filter.connect(horrorDroneGain);
  horrorDroneGain.connect(audioCtx.destination);
  horrorDrone.start();

  // Tiếng mưa rào đêm thu Hà Nội rơi trên mái tôn & gạch ngõ
  const rainBuf = getSharedNoiseBuffer();
  if (rainBuf && !horrorRainSource) {
    horrorRainSource = audioCtx.createBufferSource();
    horrorRainSource.buffer = rainBuf;
    horrorRainSource.loop = true;
    const rainBand = audioCtx.createBiquadFilter();
    rainBand.type = 'bandpass';
    rainBand.frequency.value = 1280;
    rainBand.Q.value = 0.85;
    horrorRainGain = audioCtx.createGain();
    horrorRainGain.gain.value = 0.065;
    horrorRainSource.connect(rainBand);
    rainBand.connect(horrorRainGain);
    horrorRainGain.connect(audioCtx.destination);
    horrorRainSource.start();
  }
}

function stopHorrorAmbience() {
  if (horrorRainSource) {
    try { horrorRainSource.stop(); } catch { /* ignore */ }
    horrorRainSource.disconnect();
    horrorRainGain?.disconnect();
    horrorRainSource = null;
    horrorRainGain = null;
  }
  if (!horrorDrone) return;
  try { horrorDrone.stop(); } catch { /* oscillator may already be stopped */ }
  horrorDrone.disconnect();
  horrorDroneGain?.disconnect();
  horrorDrone = null;
  horrorDroneGain = null;
}

function triggerDistantThunder() {
  if (!horrorModeActive || !audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  lightningFlashAmount = 1.0;
  const noiseBuf = getSharedNoiseBuffer();
  if (!noiseBuf) return;
  setTimeout(() => {
    if (!horrorModeActive || !audioCtx) return;
    const now = audioCtx.currentTime;
    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(160, now);
    lp.frequency.exponentialRampToValueAtTime(38, now + 2.1);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.3);
    src.connect(lp);
    lp.connect(gain);
    gain.connect(audioCtx.destination);
    src.start(now);
    src.stop(now + 2.35);
  }, 320);
}

function horrorPulse(frequency = 92, duration = 0.55) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, frequency * 0.42), audioCtx.currentTime + duration);
  gain.gain.setValueAtTime(0.14, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function flashHorrorScreen() {
  document.body.classList.add('horror-flash');
  setTimeout(() => document.body.classList.remove('horror-flash'), 140);
}

function updateHorrorChapterUI() {
  const stage = playerState.horrorChapterStage;
  const current = HORROR_CHAPTER_STEPS[Math.min(stage, HORROR_CHAPTER_STEPS.length - 1)];
  const panel = document.getElementById('horror-objective');
  panel?.classList.toggle('hidden', !horrorModeActive);
  const objective = document.getElementById('horror-objective-text');
  const count = document.getElementById('horror-step-count');
  const fill = document.getElementById('horror-progress-fill');
  if (objective) objective.textContent = current?.title ?? 'Đã hoàn thành Hồ sơ 41';
  if (count) count.textContent = `${String(Math.min(stage + 1, 6)).padStart(2, '0')}/06`;
  if (fill) fill.style.width = `${Math.min(stage, 6) / 6 * 100}%`;
  horrorChapterEvents.forEach((marker, index) => {
    marker.visible = horrorModeActive && index === stage && stage < HORROR_CHAPTER_STEPS.length;
  });
  const button = document.getElementById('story-mode-btn');
  if (button) {
    button.classList.toggle('active', horrorModeActive);
    button.textContent = horrorModeActive
      ? '⛔ Rời Cốt Truyện'
      : playerState.horrorEnding ? '↻ Chơi Lại Cốt Truyện' : '▶ Cốt Truyện';
  }
}

function isInsideSceneGroup(object, group) {
  for (let node = object; node; node = node.parent) {
    if (node === group) return true;
  }
  return false;
}

const nightDormantObjects = new Map();
function setNightSceneBudget(enabled) {
  if (!enabled) {
    nightDormantObjects.forEach((visible, object) => { object.visible = visible; });
    nightDormantObjects.clear();
    return;
  }
  const playableBounds = new THREE.Box3(new THREE.Vector3(-111, -2, -66), new THREE.Vector3(-52, 25, -6));
  const bounds = new THREE.Box3();
  worldGroup.children.forEach(object => {
    if (!object.visible || object === storyFoodStall.root || object === horrorSetPieces.root || object.isLight) return;
    bounds.setFromObject(object);
    if (!bounds.isEmpty() && !bounds.intersectsBox(playableBounds)) {
      nightDormantObjects.set(object, object.visible);
      object.visible = false;
    }
  });
}

// Hệ thống Sự kiện Kinh dị Động & Ảo ảnh Áo Mưa Vàng dọc Ngách 41/2 và Ngõ 41
function updateHorrorHauntings(delta, elapsed) {
  if (!horrorModeActive || isDialogueOpen) return;
  const px = playerGroup.position.x;
  const pz = playerGroup.position.z;
  const stage = playerState.horrorChapterStage;
  const app = horrorSetPieces.apparition;

  // Haunt 1: Khi vừa bước từ Quán Xôi ra giữa Ngách 41/2 (x > -82), bóng cậu bé áo mưa vàng cầm bóng bay đỏ xuất hiện ở đầu ngã rẽ!
  if (stage >= 1 && !triggeredHaunts.has('haunt_lane_corner') && px > -82 && pz < -34) {
    triggeredHaunts.add('haunt_lane_corner');
    if (app) {
      app.position.set(-68.2, 0.05, -37.2);
      app.rotation.y = -Math.PI / 2;
      app.visible = true;
      apparitionActiveTimer = 7.5;
    }
    document.body.classList.add('horror-blood-flicker');
    setTimeout(() => document.body.classList.remove('horror-blood-flicker'), 950);
    horrorPulse(74, 0.65);
    showToast('🎈 Một đứa trẻ mặc áo mưa vàng cầm bóng bay đỏ đang đứng ở ngã rẽ Ngõ 41! (Bấm Phím R để phóng Xung Đèn Pin)', 4800);
  }

  // Haunt 2: Khi tiến vào Ngõ 41 gần Nhà số 41 (z > -33.5), tiếng gõ cửa 3 nhịp vang lên & bóng áo mưa vàng hiện ra ngay trước hiên nhà 41!
  if (stage === 1 && !triggeredHaunts.has('haunt_house41_porch') && px > -71 && pz > -33.5) {
    triggeredHaunts.add('haunt_house41_porch');
    playHorrorKnockSound();
    if (app) {
      app.position.set(-68.5, 0.05, -29.2);
      app.rotation.y = 0;
      app.visible = true;
      apparitionActiveTimer = 5.5;
    }
    storyComposure = Math.max(25, storyComposure - 10);
    showToast('🚪 CỘC… CỘC… CỘC… Có tiếng gõ cửa vọng ra từ bên trong Căn Nhà Số 41 đang khóa trái!', 4500);
  }

  // Haunt 3: Khi đi về phía Giếng Cổ & Bàn Thờ cuối ngõ (stage >= 3, z < -41), chuông điện thoại đứt dây reo vang!
  if (stage >= 3 && !triggeredHaunts.has('haunt_well_phone') && pz < -41.5) {
    triggeredHaunts.add('haunt_well_phone');
    playHorrorPhoneRing();
    if (app) {
      app.position.set(-65.8, 0.45, -48.1);
      app.rotation.y = Math.PI;
      app.visible = true;
      apparitionActiveTimer = 6.5;
    }
    document.body.classList.add('horror-blood-flicker');
    setTimeout(() => document.body.classList.remove('horror-blood-flicker'), 800);
    showToast('☎️ RENG… RENG… Chiếc điện thoại bàn đã cắt dây bên miệng Giếng Cổ tự động đổ chuông!', 4800);
  }

  // Cập nhật chuyển động lơ lửng của Ảo ảnh Áo Mưa Vàng & tự biến mất khi người chơi rọi đèn tới gần
  if (app && app.visible) {
    apparitionActiveTimer -= delta;
    app.position.y = 0.06 + Math.sin(elapsed * 4.5) * 0.05;
    if (app.userData.redBalloon) {
      app.userData.redBalloon.position.y = 1.88 + Math.sin(elapsed * 3.2) * 0.09;
    }
    const distToApp = Math.hypot(px - app.position.x, pz - app.position.z);
    // Quay mặt nhìn chằm chằm về phía người chơi
    app.rotation.y = lerpAngle(app.rotation.y, Math.atan2(px - app.position.x, pz - app.position.z), delta * 6);
    if (distToApp < 3.4 || apparitionActiveTimer <= 0) {
      app.visible = false;
      if (distToApp < 3.4) {
        horrorPulse(105, 0.35);
        showToast('💨 Cái bóng áo mưa vàng tan biến vào màn mưa lạnh ngắt…', 3200);
      }
    }
  }
}

function updateNightThreat(delta, elapsed) {
  const entity = horrorSetPieces.entity;
  if (!entity?.visible || playerState.horrorChapterStage < 3 || playerState.horrorChapterStage >= 6) return;

  // Hiệu ứng co giật (Twitch) đầu, mắt và hai tay của Thực Thể Kẻ Bắt Chước
  const ud = entity.userData;
  if (ud?.headGroup) {
    if (entityStunTimer > 0) {
      ud.headGroup.rotation.z = Math.sin(elapsed * 38) * 0.45;
      ud.headGroup.rotation.x = -0.35;
      ud.eyeGlowMat?.color.setHex(0x38bdf8);
    } else {
      ud.headGroup.rotation.z = 0.28 + Math.sin(elapsed * 19) * 0.16;
      ud.headGroup.rotation.x = Math.cos(elapsed * 11) * 0.12;
      ud.eyeGlowMat?.color.setHex(0xff1e1e);
    }
  }
  if (ud?.arms) {
    ud.arms.forEach((arm, idx) => {
      const side = idx === 0 ? -1 : 1;
      arm.rotation.x = -0.45 + Math.sin(elapsed * 9 + idx * Math.PI) * 0.35;
      arm.rotation.z = side * (0.18 + Math.abs(Math.cos(elapsed * 7)) * 0.12);
    });
  }

  // Nếu thực thể đang bị choáng bởi Xung Đèn Pin (Phím R) -> Đứng khựng tại chỗ!
  if (entityStunTimer > 0) {
    entityStunTimer = Math.max(0, entityStunTimer - delta);
    const status = document.getElementById('night-threat');
    if (status) {
      status.textContent = `⚡ KẺ BẮT CHƯỚC ĐANG BỊ CHOÁNG (${entityStunTimer.toFixed(1)}s) · Chạy ngay!`;
      status.dataset.state = 'stunned';
    }
    return;
  }

  const refuge = playerGroup.position.x < -86 && playerGroup.position.z < -38.2;
  const perception = perceiveThreat(nightThreat, {
    dt: delta, position: entity.position, player: playerGroup.position,
    light: isFlashlightOn, noise: storyNoise, refuge,
    occluded: lineBlocked(entity.position, playerGroup.position, nightObstacles)
  });
  const target = nightThreat.lastKnown || nightPatrol[nightThreat.patrolIndex % nightPatrol.length];
  if (!nightThreat.lastKnown && Math.hypot(entity.position.x - target.x, entity.position.z - target.z) < .7) nightThreat.patrolIndex++;
  nightRouteTimer -= delta;
  if (nightRouteTimer <= 0 || !nightRoutePoint) {
    nightRouteTimer = .25;
    nightRoutePoint = nextRoutePoint(entity.position, target, nightNodes, nightObstacles);
  }
  const dx = nightRoutePoint.x - entity.position.x;
  const dz = nightRoutePoint.z - entity.position.z;
  const distance = Math.hypot(dx, dz);
  const speed = perception.mode === 'chase' ? (playerState.night.voiceAnswered ? 4.35 : 3.65)
    : perception.mode === 'investigate' ? 2.35 : perception.mode === 'search' ? .85 : 1.45;
  if (distance > .08) {
    const step = Math.min(distance, speed * delta);
    const candidate = { x: entity.position.x + dx / distance * step, z: entity.position.z + dz / distance * step };
    if (!lineBlocked(entity.position, candidate, nightObstacles, .25)) {
      entity.position.x = candidate.x;
      entity.position.z = candidate.z;
      entity.rotation.y = lerpAngle(entity.rotation.y, Math.atan2(dx, dz), 1 - Math.exp(-delta * 9));
    }
  }
  entity.position.y = Math.abs(Math.sin(elapsed * (perception.mode === 'chase' ? 8 : 4))) * .035;
  nightThreatAccumulator += delta;
  if (nightThreatAccumulator > .25) {
    nightThreatAccumulator = 0;
    const status = document.getElementById('night-threat');
    const labels = {
      chase: '🩸 NÓ ĐANG LAO TỚI! Bấm Phím R (Xung Đèn) làm choáng hoặc rẽ vào ngách!',
      investigate: '👣 Tiếng bước chân ướt đang lần theo tiếng động của bạn…',
      search: '👁️ Kẻ Bắt Chước đang lùng sục quanh góc tường vừa thấy bạn',
      patrol: '🌧️ Tiếng chân vọng lại từ cuối ngõ · Đi chậm & tìm 3 vật chứng'
    };
    status.textContent = refuge ? '🏮 QUÁN XÔI · Nơi trú ẩn an toàn (Bấm E để sạc Pin)' : labels[perception.mode];
    status.dataset.state = refuge ? 'safe' : perception.mode;
  }
  if (!refuge && perception.distance < 1.05 && !lineBlocked(entity.position, playerGroup.position, nightObstacles)) {
    flashHorrorScreen();
    horrorPulse(38, 1.1);
    failStoryChase();
  }
}

function setHorrorMode(enabled) {
  horrorModeActive = enabled;
  document.body.classList.toggle('horror-mode', enabled);
  if (!enabled) {
    document.body.classList.remove('story-chase', 'story-low-composure', 'horror-blood-flicker', 'horror-burst-flash');
  }
  npcList.forEach((npc) => { npc.visible = !enabled; });
  dynamicWalkers.forEach((walker) => { walker.group.visible = !enabled; });
  animatedTraffic.forEach((vehicle) => { vehicle.mesh.visible = !enabled; });
  playerMotorbike.visible = !enabled;
  if (autumnParticles) autumnParticles.visible = !enabled && !['low','performance'].includes(gameSettings.preset);
  if (enabled) setCameraMode('fps', false);
  document.getElementById('journal-btn').textContent = enabled ? '📖 Hồ Sơ (J)' : '📖 Kịch Bản (J)';
  document.getElementById('control-move').innerHTML = enabled
    ? '🎮 <strong>WASD:</strong> Di chuyển · <strong>Phím R:</strong> Xung Đèn Trừ Tà · <strong>Phím Q:</strong> Nín thở'
    : '🎮 <strong>W, A, S, D:</strong> Di chuyển & Xoay đầu rẽ';
  setNightSceneBudget(enabled);
  if (horrorSetPieces.occluders) horrorSetPieces.occluders.visible = enabled;
  worldGroup.traverse((object) => {
    if (!object.isSprite) return;
    if (isInsideSceneGroup(object, storyFoodStall.root)) return;
    if (enabled) {
      object.userData.visibleBeforeStory = object.visible;
      object.visible = false;
    } else if ('visibleBeforeStory' in object.userData) {
      object.visible = object.userData.visibleBeforeStory;
      delete object.userData.visibleBeforeStory;
    }
  });
  heritageRelics.forEach((relic) => { relic.visible = !enabled && !relic.userData.collected; });
  if (enabled) streetStoryEvents.forEach((marker) => { marker.visible = false; });
  else updateStreetStoryUI();
  if (horrorSetPieces.rain) horrorSetPieces.rain.visible = enabled && gameSettings.preset !== 'low';
  if (horrorSetPieces.altar) horrorSetPieces.altar.visible = enabled && playerState.horrorChapterStage >= 3;
  horrorSetPieces.clues.forEach((clue) => {
    clue.visible = enabled && !clue.userData.collected;
  });
  if (!enabled && horrorSetPieces.entity) horrorSetPieces.entity.visible = false;
  if (!enabled && horrorSetPieces.apparition) horrorSetPieces.apparition.visible = false;
  if (enabled) startHorrorAmbience();
  else stopHorrorAmbience();
  applyTimeOfDay(playerState.time);
  updateHorrorChapterUI();
}

function beginHorrorChapter(event) {
  if (isDialogueOpen) return;
  if (horrorModeActive || event?.shiftKey) {
    startHorrorChapterSession(event);
    return;
  }
  isDialogueOpen = true;
  document.exitPointerLock?.();
  document.getElementById('story-new-btn').classList.toggle('hidden', playerState.horrorChapterStage === 0 && playerState.night.orders === 0);
  document.getElementById('story-prologue')?.classList.remove('hidden');
}

function startHorrorChapterSession(event) {
  if (event?.shiftKey) {
    playerState.horrorChapterStage = 0;
    playerState.horrorEnding = null;
    playerState.night = normalizeNight();
    storyFlashlightBattery = 100;
    storyComposure = 100;
    storyClueCount = 0;
    storyNoise = 0;
    entityStunTimer = 0;
    triggeredHaunts.clear();
    playerState.inventory.delete('don_hang_41');
    playerState.inventory.delete('bang_ghi_am_41');
    if (horrorSetPieces.entity) horrorSetPieces.entity.visible = false;
    if (horrorSetPieces.apparition) horrorSetPieces.apparition.visible = false;
    if (horrorSetPieces.door) horrorSetPieces.door.rotation.z = 0;
    updatePlayerHUD();
    updateHorrorChapterUI();
    markProgressDirty();
    showToast('↻ Đã đặt lại Hồ sơ Đêm Mưa Số 41 từ đầu.');
    return;
  }
  if (horrorModeActive) {
    setHorrorMode(false);
    showToast('🌤️ Đã tạm dừng cốt truyện kinh dị. Tiến độ điều tra vẫn được lưu.');
    return;
  }
  if (playerState.horrorEnding) {
    playerState.horrorChapterStage = 0;
    playerState.horrorEnding = null;
    playerState.night = normalizeNight();
    playerState.inventory.delete('don_hang_41');
    playerState.inventory.delete('bang_ghi_am_41');
  }
  storyFlashlightBattery = playerState.night.battery;
  storyComposure = playerState.night.composure;
  storyNoise = 0;
  entityStunTimer = 0;
  triggeredHaunts.clear();
  storyClueCount = playerState.night.evidence.length;
  horrorSetPieces.clues.forEach((clue) => { clue.userData.collected = playerState.night.evidence.includes(clue.userData.id); });
  nightThreat = createThreat();
  nightRoutePoint = null;
  nightExitArmed = true;
  nightObstacles = boxColliders.filter(box => box.maxX > -96 && box.minX < -62 && box.maxZ > -54 && box.minZ < -7);
  if (playerState.isRidingBike) togglePlayerMotorbike();
  playerGroup.position.set(-90, 0, -40.15);
  playerGroup.rotation.y = Math.PI;
  syncCameraYaw(Math.PI, 0.08);
  playerState.time = 18.65;
  setPlayerFlashlight(storyFlashlightBattery > 0, false);
  setHorrorMode(true);
  updateStorySurvivalUI();
  if (playerState.horrorChapterStage >= 3 && playerState.horrorChapterStage < 6 && horrorSetPieces.entity) {
    horrorSetPieces.entity.position.set(-67, 0, playerState.horrorChapterStage === 5 ? -50.5 : -17);
    horrorSetPieces.entity.visible = true;
    horrorChaseStartedAt = performance.now();
  } else if (playerState.horrorChapterStage >= 6 && !playerState.horrorEnding) {
    setTimeout(openHorrorEndingChoice, 180);
  }
  showToast(
    playerState.horrorChapterStage === 0
      ? '🕯️ Đêm mưa 19:41 · Bấm [E] tại quầy xôi để nhận Hóa Đơn Mực Đỏ. Bấm [Phím R] để phóng Xung Đèn Trừ Tà!'
      : '🕯️ Đã tiếp tục Hồ Sơ Số 41 từ Quán Xôi. Nhớ dùng [Phím R] để làm choáng Kẻ Bắt Chước!',
    5200
  );
  markProgressDirty();
}

function completeHorrorEvent(marker, activityComplete = false) {
  if (!horrorModeActive || !marker || marker.userData.index !== playerState.horrorChapterStage || marker.userData.escape) return;
  const stage = playerState.horrorChapterStage;
  if (stage === 0 && playerState.night.orders < 3 && !activityComplete) {
    openNightKitchen(marker);
    return;
  }
  if (stage === 2 && !playerState.night.power && !activityComplete) {
    openNightCircuit(marker);
    return;
  }
  horrorPulse(stage === 4 ? 46 : 88 + stage * 14, stage === 4 ? 1.2 : 0.48);

  if (stage === 0) {
    addItemToInventory('don_hang_41', 1);
  } else if (stage === 1) {
    consumeItem('don_hang_41');
    if (horrorSetPieces.door) horrorSetPieces.door.rotation.z = -0.045;
  } else if (stage === 2) {
    flashHorrorScreen();
    playHorrorPhoneRing();
    storyFlashlightBattery = Math.min(100, storyFlashlightBattery + 40);
    showToast('⚡ Đã phá phong ấn Tủ Điện & thu được Pin tụ điện dự phòng (+40% Pin)!', 4000);
  } else if (stage === 3) {
    addItemToInventory('bang_ghi_am_41', 1);
  }

  const finishBeat = () => {
    if (stage === 2 || stage === 4) {
      flashHorrorScreen();
      horrorChaseStartedAt = performance.now();
      if (horrorSetPieces.entity) {
        horrorSetPieces.entity.position.set(-67, 0, stage === 2 ? -17 : -50.5);
        horrorSetPieces.entity.visible = true;
      }
      nightThreat = createThreat();
      if (stage === 4) {
        nightThreat.mode = 'investigate';
        nightThreat.lastKnown = { x: -67, z: -47.2 };
        nightThreat.memory = 3;
      }
      showToast(
        stage === 4
          ? '🩸 KẺ BẮT CHƯỚC ĐÃ TRỒI LÊN TỪ GIẾNG CỔ! Bấm [Phím R] làm choáng nó rồi chạy về Đầu Ngõ 41!'
          : '👣 Có bóng người mặc áo mưa vàng vừa xuất hiện ở đầu ngõ! Đi chậm hoặc dùng [Phím R] nếu nó áp sát!',
        5200
      );
    }
    playerState.horrorChapterStage = Math.min(6, stage + 1);
    if (horrorSetPieces.altar) horrorSetPieces.altar.visible = playerState.horrorChapterStage >= 3;
    applyTimeOfDay(playerState.time);
    updateHorrorChapterUI();
    markProgressDirty();
    persistNight();
  };
  showStoryDialogue(STORY_DIALOGUE[stage] || [], () => {
    if (stage === 1 && !playerState.night.voiceEncountered) openNightVoice(finishBeat);
    else finishBeat();
  });
}

function openHorrorEndingChoice() {
  if (isDialogueOpen) return;
  isDialogueOpen = true;
  document.exitPointerLock?.();
  updateStorySurvivalUI();
  horrorSetPieces.entity.visible = false;
  document.getElementById('horror-choice')?.classList.remove('hidden');
}

function failStoryChase() {
  if (isDialogueOpen) return;
  isDialogueOpen = true;
  document.exitPointerLock?.();
  horrorSetPieces.entity.visible = false;
  document.getElementById('story-fail')?.classList.remove('hidden');
}

function retryStoryChase() {
  document.getElementById('story-fail')?.classList.add('hidden');
  isDialogueOpen = false;
  playerGroup.position.set(-90, 0, -40.15);
  syncCameraYaw(Math.PI, 0.08);
  storyComposure = 72;
  storyNoise = 0;
  storyFlashlightBattery = Math.max(22, storyFlashlightBattery);
  horrorSetPieces.entity.position.set(-67, 0, -52.5);
  horrorSetPieces.entity.visible = true;
  horrorChaseStartedAt = performance.now();
  nightThreat = createThreat();
  nightRoutePoint = null;
  updateStorySurvivalUI();
}

function finishHorrorChapter(ending) {
  if (ending === 'peace' && !canResolveNight(playerState.night)) return;
  if (playerState.horrorEnding) return;
  playerState.horrorEnding = ending;
  playerState.horrorChapterStage = 6;
  isDialogueOpen = false;
  document.getElementById('horror-choice')?.classList.add('hidden');
  if (ending === 'peace') {
    addRewards(65000, 320);
    awardSocialProgress({ neighborhood: { heritage: 10, cohesion: 10, beauty: 6, livelihood: 6 } });
  } else {
    addRewards(ending === 'truth' ? 45000 : 28000, ending === 'truth' ? 220 : 150);
    awardSocialProgress({ neighborhood: ending === 'truth' ? { heritage: 8, cohesion: 3 } : { cohesion: 8 } });
  }
  const message = ending === 'peace'
    ? '🕯️ KẾT TRỌN VẸN “LỜI HỨA MÙA XÔI MỚI”: Ngọn đèn hiên nhà số 41 sáng ấm cùng gói xôi nếp cái hoa vàng. Ký ức về An được hóa giải trong bình yên (+320 XP, +65.000đ).'
    : ending === 'truth'
      ? '📼 KẾT “NGƯỜI NHỚ”: Mặt sau cuộn băng ghi một địa chỉ ở Phú Gia. Hành trình đi tìm sự thật về An vẫn tiếp diễn (+220 XP, +45.000đ).'
      : '🚪 KẾT “CÁNH CỬA KHÉP”: Linh cất cuộn băng ở quán và trở về với mẹ. Bí mật vẫn chưa được giải đáp (+150 XP, +28.000đ).';
  showToast(message, 7500);
  setHorrorMode(false);
  updateHorrorChapterUI();
  markProgressDirty();
  const descriptions = {
    peace: ['Lời hứa mùa xôi mới', 'Linh đặt phần xôi không hành dưới đèn hiên rồi gọi tên An — bằng giọng của chính mình. Tiếng bước chân ngừng lại. Trong khung ảnh hiện một địa chỉ: trạm xá Phú Gia. Bóng tối đã buông tay, nhưng hồ sơ về An vẫn còn một trang bị xé.'],
    truth: ['Người nhớ', 'Linh mang cuộn băng và những vật chứng ra phố. Trong băng có tiếng xe và một người lớn dặn đừng ghi tên mình. Sáng mai, Linh sẽ tới Phú Gia để tìm người đã bế An khỏi ngõ. Đêm nay chưa có câu trả lời cuối cùng.'],
    safe: ['Cánh cửa khép', 'Linh cất cuộn băng ở quán và về nhà trước khi trời sáng. Mẹ ngồi chờ bên cửa, không hỏi vì sao áo con ướt. Sáng hôm sau, trong túi áo lại có một hóa đơn: nhà 41, lúc 19:41.']
  };
  const [title, text] = descriptions[ending];
  openNightActivity('ending', title, `<p>${text}</p><div class="night-checks"><span>${storyClueCount}/3 vật chứng</span><span>${playerState.night.voiceAnswered ? 'Đã đáp tiếng gọi' : 'Giữ im lặng'}</span><span>${playerState.night.orders}/3 đơn hoàn thành</span></div><p class="night-deduction">Hết đêm đầu · Kết quả đã lưu. Hồ sơ Phú Gia là hướng phát triển chương tiếp theo, hiện chưa mở để chơi.</p>`);
}

document.getElementById('story-mode-btn')?.addEventListener('click', beginHorrorChapter);
document.getElementById('story-start-btn')?.addEventListener('click', () => {
  document.getElementById('story-prologue')?.classList.add('hidden');
  isDialogueOpen = false;
  startHorrorChapterSession();
});

document.getElementById('story-new-btn')?.addEventListener('click', () => {
  document.getElementById('story-prologue').classList.add('hidden');
  isDialogueOpen = false;
  startHorrorChapterSession({ shiftKey: true });
  startHorrorChapterSession();
});
document.getElementById('story-cancel-btn')?.addEventListener('click', () => {
  document.getElementById('story-prologue')?.classList.add('hidden');
  isDialogueOpen = false;
});
document.getElementById('story-dialogue-next')?.addEventListener('click', advanceStoryDialogue);
document.getElementById('story-retry-btn')?.addEventListener('click', retryStoryChase);
document.getElementById('ending-peace-btn')?.addEventListener('click', () => finishHorrorChapter('peace'));
document.getElementById('ending-truth-btn')?.addEventListener('click', () => finishHorrorChapter('truth'));
document.getElementById('ending-safe-btn')?.addEventListener('click', () => finishHorrorChapter('safe'));
document.getElementById('ending-return-btn')?.addEventListener('click', () => {
  document.getElementById('horror-choice').classList.add('hidden');
  isDialogueOpen = false;
  playerState.horrorChapterStage = 5;
  nightExitArmed = false;
  horrorSetPieces.entity.position.set(-67, 0, -50.5);
  horrorSetPieces.entity.visible = true;
  nightThreat = createThreat();
  updateHorrorChapterUI();
  persistNight();
});

const QUEST_NPCS = [
  {
    id: 'npc_baove',
    cpKey: 'cong_thpt',
    name: 'Bác Bảo Vệ Trường THPT Tây Hồ',
    role: 'Số 41 Phố Phú Thượng',
    avatar: '👮‍♂️',
    x: -2.2,
    z: 8.2,
    rotY: Math.PI,
    greeting:
      'Chào cháu! Bác trực ca sáng ở cổng số 41 Trường THPT Tây Hồ từ 5h30 sáng nên bụng đang đói cồn cào. Cháu đi dọc vỉa hè thấy Cô Gánh Xôi Phú Thượng thì mua giúp bác một gói xôi nóng nhé!',
    choices: [
      {
        label: '🍙 Biếu Bác gói Xôi Phú Thượng nóng hổi (Hoàn thành nhiệm vụ)',
        action: 'give_xoi',
        reply:
          'Ồ quý hóa quá! Xôi Phú Thượng dẻo thơm bọc lá chuối đúng chuẩn làng nghề Di sản Quốc gia! Cảm ơn cháu rất nhiều, bác gửi cháu tiền xôi và thưởng thêm quà nhé!'
      },
      {
        label: 'Trường THPT Tây Hồ có từ bao giờ ạ?',
        reply:
          'Trường THPT Tây Hồ được thành lập năm 2002 tại số 41 Phố Phú Thượng, là ngôi trường cấp 3 gắn liền với bao thế hệ học sinh vùng Phú Thượng, Nhật Tân, Xuân La!'
      },
      {
        label: 'Cạnh trường mình có những cơ quan nào bác nhỉ?',
        reply:
          'Ngay đối diện qua bên kia đường là UBND Phường Phú Thượng. Đi sang hướng Tây là Trung tâm GDNN - GDTX Tây Hồ (số 43) và Trường Mầm non Phú Thượng (số 45).'
      }
    ]
  },
  {
    id: 'npc_ubnd',
    cpKey: 'ubnd',
    name: 'Cán Bộ Phường Phú Thượng',
    role: 'Trụ sở Đảng ủy - HĐND - UBND Phường',
    avatar: '👨‍💼',
    x: 0,
    z: -6.2,
    rotY: 0,
    greeting:
      'Chào mừng bạn đến Trụ sở Đảng ủy - HĐND - UBND Phường Phú Thượng! Tôi đang có tập Công Văn Văn Hóa Phường cần chuyển gấp tới Bác Tổ Trưởng Dân Phố ở Ngã Ba số 68, bạn giúp tôi một tay nhé?',
    choices: [
      {
        label: '📜 Nhận Công Văn mang tới Ngã Ba 68 giúp Cán bộ (+80 XP)',
        action: 'take_cong_van',
        reply:
          'Cảm ơn bạn! Bạn hãy cầm tập Công Văn này đi về phía Đông tới nút giao số 68 Phố Phú Thượng - Phố Phú Gia giao cho Bác Tổ Trưởng đang cầm loa phường nhé!'
      },
      {
        label: '❓ Giải đố: Nghề truyền thống nào của Phú Thượng đạt Di sản Quốc gia 2024?',
        action: 'quiz_ubnd',
        reply:
          'Chính xác 100%! Nghề làm Xôi Phú Thượng đã được công nhận là Di sản văn hóa phi vật thể Quốc gia năm 2024. Thưởng nóng cho sự am hiểu của bạn!'
      },
      {
        label: 'Cho tôi hỏi về lịch sử vùng đất Phú Thượng?',
        reply:
          'Phú Thượng gồm 3 làng cổ Thượng Thụy, Phú Gia và Phú Xá. Năm 1945, nơi đây từng là "An toàn khu" đón Bác Hồ từ chiến khu Việt Bắc về Hà Nội trước ngày Độc lập 2/9!'
      }
    ]
  },
  {
    id: 'npc_trada',
    cpKey: 'quannuoc',
    name: 'Cô Hoa Bán Trà Đá Vỉa Hè',
    role: 'Quán nước dưới tán cây Phố Phú Thượng',
    avatar: '👩‍🌾',
    x: -52.5,
    z: -5.6,
    rotY: 0.4,
    greeting:
      'Ngồi ghế nhựa xanh nghỉ chân làm cốc trà đá mát lạnh 5.000đ đã cháu ơi! Cô còn chuẩn bị sẵn cả bó Hoa Cúc Vàng tươi để bà con mang vào Đài Tưởng Niệm Liệt Sĩ dâng hương đấy!',
    choices: [
      {
        label: '🍵 Uống cốc Trà Đá mát lạnh (5.000đ - Hồi 100% Thể lực & +80 XP)',
        action: 'buy_tra_da',
        reply:
          'Khà... Mát lạnh sảng khoái! Uống cốc trà đá dưới bóng cây xà cừ Phố Phú Thượng giúp cháu hồi đầy 100% Thể lực (Stamina) để chạy bộ rồi đấy!'
      },
      {
        label: '💐 Nhận Bó Hoa Cúc Vàng mang tới Đài Tưởng Niệm Liệt Sĩ',
        action: 'take_flowers',
        reply:
          'Cô gửi cháu bó hoa cúc vàng tươi thắm này! Cháu hãy mang tới Khu Tưởng Niệm Liệt Sĩ phía sau UBND Phường gặp Bác Cựu Chiến Binh để dâng hoa nhé!'
      },
      {
        label: '🌿 Góp sức làm góc cây xanh cho quán',
        action: 'upgrade_tea_green',
        reply: 'Từ nay góc quán có thêm cây xanh và hoa, khách qua đường sẽ có chỗ nghỉ chân dễ chịu hơn rồi!'
      },
      {
        label: '🏮 Làm bảng kể chuyện Xôi Phú Thượng',
        action: 'upgrade_tea_heritage',
        reply: 'Cô sẽ kể cho khách nghe chuyện làng nghề xôi Phú Thượng. Quán nhỏ mà cũng góp phần giữ ký ức của phố mình!'
      },
      {
        label: 'Mấy thùng xốp trắng bên gốc cây kia là gì thế cô?',
        reply:
          'À, bà con quanh phố tận dụng thùng xốp trồng thêm rau với hoa mười giờ dưới gốc cây bên tường vàng cho phố thêm xanh sạch đẹp đấy cháu ạ!'
      }
    ]
  },
  {
    id: 'npc_ngaba',
    cpKey: 'ngaba',
    name: 'Bác Tổ Trưởng Dân Phố (Ngã Ba 68)',
    role: 'Giao lộ Phố Phú Thượng - Phố Phú Gia',
    avatar: '👴',
    x: 32,
    z: -5.5,
    rotY: -0.6,
    greeting:
      'Cháu đang đứng ở nút giao số 68 Phố Phú Thượng cắt với Phố Phú Gia! Bác đang chờ thông báo văn hóa mới từ bên UBND Phường gửi sang để phát loa thông báo cho bà con.',
    choices: [
      {
        label: '📜 Trao Công Văn từ UBND Phường cho Bác Tổ Trưởng (Hoàn thành nhiệm vụ)',
        action: 'deliver_cong_van',
        reply:
          'Tuyệt vời! Có Công Văn của UBND Phường đây rồi, bác bật loa thông báo cho bà con phố Phú Thượng - Phú Gia ngay! Bác thưởng cháu tiền bồi dưỡng và điểm kinh nghiệm nhé!'
      },
      {
        label: 'Đình Phú Gia và Chùa Bà Già có gì đặc biệt ạ?',
        reply:
          'Đình Phú Gia thờ thần Khai Nguyên và lưu giữ nhiều sắc phong cổ thời Lê - Nguyễn. Còn dọc theo Phố Phú Gia ngay góc ngã tư này là Trường Tiểu học Phú Thượng.'
      }
    ]
  },
  {
    id: 'npc_lietsi',
    cpKey: 'lietsi',
    name: 'Bác Cựu Chiến Binh Phú Thượng',
    role: 'Khu tưởng niệm & Di tích lịch sử',
    avatar: '🎖️',
    x: -24,
    z: -28,
    rotY: 0,
    greeting:
      'Chào cháu! Đây là khuôn viên Nhà tưởng niệm các Anh hùng Liệt sĩ phường Phú Thượng. Nếu cháu có bó hoa cúc vàng mang từ quán Cô Hoa sang thì cùng bác dâng hoa tưởng niệm nhé!',
    choices: [
      {
        label: '💐 Dâng Bó Hoa Cúc Vàng tưởng niệm các Anh hùng Liệt sĩ (Hoàn thành nhiệm vụ)',
        action: 'offer_flowers',
        reply:
          'Xúc động lắm cháu ạ! Thay mặt Hội Cựu Chiến Binh phường Phú Thượng, bác cảm ơn tấm lòng thành kính của cháu. Cháu xứng đáng là Công dân gương mẫu của phố mình!'
      },
      {
        label: 'Cháu muốn tìm hiểu thêm các di tích cách mạng ở Phú Thượng!',
        reply:
          'Ở Phú Thượng có Nhà cụ Nguyễn Thị An – nơi Bác Hồ nghỉ lại từ ngày 23 đến 25/8/1945 trên đường từ Tân Trào về Hà Nội, cùng bến đò Xù lịch sử bên bờ sông Hồng!'
      }
    ]
  }
];

const visitedNPCs = new Set(loadedSnapshot?.visitedNPCs ?? []);

function spawnNPCs() {
  QUEST_NPCS.forEach((data) => {
    const npc = new THREE.Group();
    npc.position.set(data.x, getGroundElevationAt(data.x, data.z), data.z);
    npc.rotation.y = data.rotY;

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.78, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide })
    );
    ring.position.y = 0.04;
    npc.add(ring);

    const labelSprite = createNPCLabel(`❗ ${data.name}`, '#fbbf24');
    labelSprite.position.y = 2.25;
    npc.add(labelSprite);

    npc.userData = data;
    npc.ringMesh = ring;
    worldGroup.add(npc);
    npcList.push(npc);
  });
}

function createNPCLabel(text, borderColor) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 100;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(16, 14, 480, 72, 20);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 22px "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 50);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: true, depthWrite: false }));
  // Place-name overlays are removed, not merely hidden by a graphics preset.
  // Keep NPC interaction markers; neither markers nor speech draw through walls.
  const isPlaceLabel=!String(text).startsWith('❗');
  sp.userData.placeLabel=isPlaceLabel;
  if(isPlaceLabel){sp.visible=false;sp.material.visible=false;}
  sp.scale.set(3.4, 0.68, 1);
  return sp;
}

// ============================================================================
// 7. ĐIỀU KHIỂN NHÂN VẬT, CAMERA XOAY ĐẦU MƯỢT, ĐÈN PIN & BẢNG CẤU HÌNH (SETTINGS)
// ============================================================================
const keys = { w: false, a: false, s: false, d: false, shift: false, space: false, q: false };
let camMode = gameSettings.camMode || 'tps';
let camYaw = loadedSnapshot?.camYaw ?? 0;
let targetCamYaw = camYaw;
let camPitch = 0.16;
let targetCamPitch = camPitch;
let camRoll = 0;
let camDist = 4.35;
let targetCamDist = 4.35;
const smoothCamPos = new THREE.Vector3();
const smoothCamLook = new THREE.Vector3();
let camInitialized = false;
let footVelX = 0;
let footVelZ = 0;
let prevPlayerHeading = loadedSnapshot?.camYaw ?? 0;
let desiredFootBodyYaw = loadedSnapshot?.camYaw ?? 0;
let playerTurnRate = 0;
const headIKState = { yaw: 0, pitch: 0, roll: 0, bodyBank: 0 };
const playerPreIKQuats = {};

let isDraggingMouse = false;
let prevMouse = { x: 0, y: 0 };
let verticalVel = 0;
let isGrounded = true;
let nearestNPC = null;
let isDialogueOpen = false;
let isSettingsOpen = false;
let isJournalOpen = false;
let isInventoryOpen = false;
let selectedInventoryItemId = null;
let customGpsTarget = null;
let districtGuideCache=null;
function guidancePath(target){
  if(!target)return [];
  const p=playerGroup.position,key=`${target.x},${target.z}`;
  if(!districtGuideCache||districtGuideCache.key!==key||Math.hypot(p.x-districtGuideCache.x,p.z-districtGuideCache.z)>2){districtGuideCache={key,x:p.x,z:p.z,path:memorialPath(p,target)||districtPath(p,target)};}
  return districtGuideCache.path;
}

function syncCameraYaw(newYaw, newPitch = camPitch) {
  camYaw = newYaw;
  targetCamYaw = newYaw;
  camPitch = newPitch;
  targetCamPitch = newPitch;
  prevPlayerHeading = newYaw;
  playerTurnRate = 0;
  footVelX = 0;
  footVelZ = 0;
  camInitialized = false;
}

function setCameraMode(mode, announce = true) {
  const nextMode = horrorModeActive || mode === 'fps' ? 'fps' : 'tps';
  camMode = nextMode;
  gameSettings.camMode = nextMode;
  playerGroup.visible = nextMode === 'tps';
  const crosshair = document.getElementById('fps-crosshair');
  if (crosshair) crosshair.style.display = nextMode === 'fps' ? 'block' : 'none';
  const camBtn = document.getElementById('camera-mode-btn');
  if (camBtn) {
    camBtn.classList.toggle('active', nextMode === 'tps');
    camBtn.textContent = nextMode === 'tps' ? '🎥 Góc Nhìn: TPS (V)' : '🎥 Góc Nhìn: FPS (V)';
  }
  const camSelect = document.getElementById('setting-cammode');
  if (camSelect) camSelect.value = nextMode;
  camInitialized = false;
  if (announce) {
    showToast(
      nextMode === 'tps'
        ? '🎥 Đã chuyển sang Góc nhìn Thứ 3 (TPS) — Thấy rõ nhân vật xoay đầu & nghiêng người khi rẽ!'
        : '🎥 Đã chuyển sang Góc nhìn Thứ nhất (FPS) — Nhập vai trực diện & nghiêng đầu mượt khi vào cua!'
    );
  }
}

function toggleCameraMode() {
  if (horrorModeActive) return;
  setCameraMode(camMode === 'tps' ? 'fps' : 'tps', true);
  saveSettingsToStorage();
}

function saveSettingsToStorage() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(gameSettings));
  } catch { /* ignore quota error */ }
}

function applyGameSettings() {
  const weatherControl=document.getElementById('setting-weather');if(weatherControl)weatherControl.value=gameSettings.weatherMode||'auto';
  // 1. Preset đồ họa & Pixel Ratio
  const preset = gameSettings.preset || 'high';
  let maxDpr = 1.5;
  if (preset === 'low') maxDpr = 1.0;
  else if (preset === 'performance') maxDpr = 1.0;
  else if (preset === 'medium') maxDpr = 1.35;
  else if (preset === 'high') maxDpr = 1.65;
  else if (preset === 'ultra') maxDpr = Math.min(window.devicePixelRatio || 2, 2.0);
  const targetDpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  renderer.setPixelRatio(targetDpr);
  if (typeof composer !== 'undefined' && composer) {
    composer.setPixelRatio(targetDpr);
    composer.setSize(window.innerWidth, window.innerHeight);
  }

  if(bloomPass)bloomPass.enabled=preset!=='performance';
  const shadowSize=preset==='performance'?1024:2048;
  if(sunLight.shadow.mapSize.width!==shadowSize){sunLight.shadow.mapSize.set(shadowSize,shadowSize);sunLight.shadow.map?.dispose();sunLight.shadow.map=null;renderer.shadowMap.needsUpdate=true;}
  // 2. Bóng đổ (Shadows) & hạt lá thu
  const useShadows = preset === 'low' ? false : !!gameSettings.shadows;
  renderer.shadowMap.enabled = useShadows;
  sunLight.castShadow = useShadows;
  if (autumnParticles) {
    autumnParticles.visible = !['low','performance'].includes(preset) && !horrorModeActive;
    autumnLeafMat.size = preset === 'ultra' ? 0.2 : 0.16;
  }
  if (horrorSetPieces.rain) horrorSetPieces.rain.visible = horrorModeActive && preset !== 'low';

  // 3. FOV Camera
  camera.fov = Number(gameSettings.fov) || 65;
  camera.updateProjectionMatrix();

  // 4. Chế độ Góc nhìn (TPS / FPS)
  setCameraMode(horrorModeActive ? 'fps' : gameSettings.camMode || 'tps', false);

  // 5. Cường độ Đèn Pin
  setPlayerFlashlight(isFlashlightOn, false);

  // 6. Biển số nhà & Cọc sáng dẫn đường mục tiêu (Waypoints)
  const showWp = gameSettings.showWaypoints !== false;
  houseNumberSprites.forEach((sp) => {
    sp.visible = !horrorModeActive;
  });
  horrorChapterEvents.forEach((marker) => {
    if (marker.userData.beam) marker.userData.beam.visible = showWp;
    if (marker.userData.label) marker.userData.label.visible = showWp;
    if (marker.userData.sigil) marker.userData.sigil.visible = showWp;
  });
  if (gpsGuideGroup) {
    gpsGuideGroup.visible = showWp;
  }

  // 7. Độ sáng màn hình & ánh sáng theo thời gian
  applyTimeOfDay(playerState.time);

  // Đồng bộ giao diện Modal Cấu Hình
  const camModeEl = document.getElementById('setting-cammode');
  const autoTurnEl = document.getElementById('setting-autoturn');
  const turnSpeedEl = document.getElementById('setting-turnspeed');
  const smoothEl = document.getElementById('setting-smoothness');
  const presetEl = document.getElementById('setting-preset');
  const brightEl = document.getElementById('setting-brightness');
  const flashEl = document.getElementById('setting-flashlight');
  const fovEl = document.getElementById('setting-fov');
  const sensEl = document.getElementById('setting-sensitivity');
  const wpEl = document.getElementById('setting-waypoints');
  const shEl = document.getElementById('setting-shadows');

  if (camModeEl) { camModeEl.value = gameSettings.camMode || 'tps'; camModeEl.disabled = horrorModeActive; }
  if (autoTurnEl) autoTurnEl.checked = gameSettings.autoTurnHead !== false;
  if (turnSpeedEl) turnSpeedEl.value = String(gameSettings.turnFollowStrength ?? 1.0);
  if (smoothEl) smoothEl.value = String(gameSettings.cameraSmoothness ?? 1.0);
  if (presetEl) presetEl.value = gameSettings.preset || 'high';
  if (brightEl) brightEl.value = String(gameSettings.brightness);
  if (flashEl) flashEl.value = String(gameSettings.flashlightPower);
  if (fovEl) fovEl.value = String(gameSettings.fov);
  if (sensEl) sensEl.value = String(gameSettings.mouseSensitivity);
  if (wpEl) wpEl.checked = gameSettings.showWaypoints !== false;
  if (shEl) shEl.checked = !!gameSettings.shadows;

  const valTurnSpeed = document.getElementById('val-turnspeed');
  const valSmooth = document.getElementById('val-smoothness');
  const valBright = document.getElementById('val-brightness');
  const valFlash = document.getElementById('val-flashlight');
  const valFov = document.getElementById('val-fov');
  const valSens = document.getElementById('val-sensitivity');
  if (valTurnSpeed) valTurnSpeed.textContent = `${Math.round((gameSettings.turnFollowStrength ?? 1.0) * 100)}%`;
  if (valSmooth) valSmooth.textContent = `${Math.round((gameSettings.cameraSmoothness ?? 1.0) * 100)}%`;
  if (valBright) valBright.textContent = `${Math.round(gameSettings.brightness * 100)}%`;
  if (valFlash) valFlash.textContent = `${Math.round(gameSettings.flashlightPower * 100)}%`;
  if (valFov) valFov.textContent = `${Math.round(gameSettings.fov)}°`;
  if (valSens) valSens.textContent = `${Math.round(gameSettings.mouseSensitivity * 100)}%`;
}

function openSettingsModal() {
  if (isJournalOpen) closeJournalModal();
  if (isInventoryOpen) closeInventoryModal();
  if (isShipperModalOpen) closeShipperModal();
  const cityTimeControl=document.getElementById('setting-citytime');if(cityTimeControl){cityTimeControl.value=String(playerState.time);cityTimeControl.disabled=horrorModeActive;}
  const cityTimeLabel=document.getElementById('val-citytime');if(cityTimeLabel)cityTimeLabel.textContent=gameClockLabel(playerState.time);
  const cityWeatherControl=document.getElementById('setting-weather');if(cityWeatherControl){cityWeatherControl.value=gameSettings.weatherMode||'auto';cityWeatherControl.disabled=horrorModeActive;}
  isSettingsOpen = true;
  isDialogueOpen = true;
  if (document.pointerLockElement) document.exitPointerLock?.();
  applyGameSettings();
  document.getElementById('settings-modal')?.classList.remove('hidden');
}

function closeSettingsModal() {
  isSettingsOpen = false;
  isDialogueOpen = false;
  document.getElementById('settings-modal')?.classList.add('hidden');
  saveSettingsToStorage();
}

function toggleSettingsModal() {
  if (isSettingsOpen) closeSettingsModal();
  else openSettingsModal();
}

function renderJournalModalContent() {
  const containerEl = document.getElementById('journal-chapters');
  if (!containerEl) return;

  const questDoneCount = playerState.completedQuests.size;
  const streetStep = Math.min(playerState.streetStoryStep, STREET_STORY_STEPS.length);
  const horrorStage = Math.min(playerState.horrorChapterStage, HORROR_CHAPTER_STEPS.length);

  const act1Items = [
    { label: '🍙 Mua Xôi Phú Thượng biếu Bác Bảo Vệ (Cổng 41)', done: playerState.completedQuests.has('quest_baove') },
    { label: '📜 Chuyển Công Văn UBND Phường tới Ngã Ba 68', done: playerState.completedQuests.has('quest_ngaba') },
    { label: '💐 Dâng Hoa Cúc Vàng tại Đài Tưởng Niệm Liệt Sĩ', done: playerState.completedQuests.has('quest_lietsi') },
    { label: '🏛️ Giải đố Di sản Quốc gia Xôi Phú Thượng 2024', done: playerState.completedQuests.has('quest_quiz_ubnd') },
    { label: '🍵 Thưởng thức Trà Đá vỉa hè Cô Hoa & Góp sức dựng quán', done: playerState.completedQuests.has('quest_trada') }
  ];

  const act2Items = STREET_STORY_STEPS.map((st, idx) => ({
    label: `🔎 ${idx + 1}. ${st.title}`,
    done: idx < playerState.streetStoryStep,
    current: idx === playerState.streetStoryStep && !horrorModeActive
  }));

  const act3Items = HORROR_CHAPTER_STEPS.map((st, idx) => ({
    label: `🕯️ Bước ${idx + 1}: ${st.title}`,
    done: idx < playerState.horrorChapterStage || !!playerState.horrorEnding,
    current: horrorModeActive && idx === playerState.horrorChapterStage
  }));

  const endingLabel = playerState.horrorEnding === 'peace'
    ? 'Đã đạt Kết thúc Trọn Vẹn: Lời Hứa Mùa Xôi Mới'
    : playerState.horrorEnding === 'truth'
      ? 'Đã đạt Kết thúc: Người Nhớ (Địa chỉ Phú Gia)'
      : playerState.horrorEnding === 'safe'
        ? 'Đã đạt Kết thúc: Cánh Cửa Khép'
        : `${horrorStage}/6 bước`;

  const activeGuide = getActiveGuidanceTarget();

  containerEl.innerHTML = `
    <div class="chapter-card active-chapter">
      <div class="chapter-header">
        <h3>🎯 MỤC TIÊU TIẾP THEO CẦN LÀM NGAY</h3>
        <span class="chapter-badge">Dẫn đường GPS đang bật</span>
      </div>
      <p class="chapter-desc" style="color:#fef08a; font-size:13px; margin-bottom:4px;">
        <strong>Điểm đến hiện tại:</strong> ${activeGuide ? activeGuide.title : ' Tự do khám phá Phố Phú Thượng'} — Hãy đi theo <strong>dải mũi tên sáng dưới mặt đất</strong> hoặc bấm nút <strong>“🧭 Bật Dẫn Đường GPS”</strong> bên dưới để xoay hướng nhìn thẳng tới mục tiêu!
      </p>
    </div>

    <div class="chapter-card ${!horrorModeActive && questDoneCount < 5 ? 'active-chapter' : ''}">
      <div class="chapter-header">
        <h3>Ban ngày · Nhịp sống Phú Thượng</h3>
        <span class="chapter-badge">${questDoneCount}/5 Nhiệm vụ · ${playerState.collectedRelics}/12 Sao Di sản</span>
      </div>
      <p class="chapter-desc">
        <strong>Bối cảnh:</strong> Phố Phú Thượng (Đoạn số 41 – 68, Quận Tây Hồ, Hà Nội) vào buổi sáng nắng thu. Bạn vào vai <strong>Nguyễn Văn Linh</strong> đi dọc phố làm quen với 5 nhân vật, tự tay gói Xôi Phú Thượng (Di sản Quốc gia 2024) và giúp đỡ bà con lối xóm.
      </p>
      <div class="chapter-steps">
        ${act1Items.map((it) => `<div class="chapter-step ${it.done ? 'done' : ''}">${it.done ? '✓' : '○'} ${it.label}</div>`).join('')}
      </div>
    </div>

    <div class="chapter-card ${!horrorModeActive && questDoneCount >= 5 && streetStep < 4 ? 'active-chapter' : ''}">
      <div class="chapter-header">
        <h3>Khảo sát khu phố · Góc số 41</h3>
        <span class="chapter-badge">${streetStep}/${STREET_STORY_STEPS.length} Hạng mục</span>
      </div>
      <p class="chapter-desc">
        <strong>Diễn biến:</strong> Đi tới các cọc sáng xanh dương <code>🔎</code> quanh ngã ba cổng Trường THPT Tây Hồ (Số 41) và bấm <strong>Phím E</strong> để khảo sát mặt đường, kiến trúc cầu thang cong, xếp gọn xe học sinh và kiểm tra hộp điện đầu Ngõ 41.
      </p>
      <div class="chapter-steps">
        ${act2Items.map((it) => `<div class="chapter-step ${it.done ? 'done' : it.current ? 'current' : ''}">${it.done ? '✓' : it.current ? '▶' : '○'} ${it.label}</div>`).join('')}
      </div>
    </div>

    <div class="chapter-card ${horrorModeActive ? 'active-chapter' : ''}">
      <div class="chapter-header">
        <h3>Đêm đầu · Đơn Hàng Cuối Ngõ 41</h3>
        <span class="chapter-badge">${endingLabel}</span>
      </div>
      <p class="chapter-desc">
        <strong>Cách kích hoạt:</strong> Bấm nút đỏ <strong>“▶ Cốt Truyện”</strong> trên thanh công cụ trên cùng. Trời chuyển sang đêm mưa mất điện lúc 18:41. Linh nhận trông quán xôi cho Cô Hoa và phải giao gói xôi cuối ngày tới <strong>Nhà Số 41 trong Ngõ 41</strong> — nơi ẩn giấu bí mật đêm mưa năm 2008 về người em trai thất lạc <strong>Nguyễn Văn An</strong> (3 Kết thúc).
      </p>
      <div class="chapter-steps">
        ${act3Items.map((it) => `<div class="chapter-step ${it.done ? 'done' : it.current ? 'current' : ''}">${it.done ? '✓' : it.current ? '▶' : '○'} ${it.label}</div>`).join('')}
      </div>
    </div>

    <div class="chapter-card">
      <div class="chapter-header">
        <h3>🕹️ TÓM TẮT CHỨC NĂNG CÁC PHÍM & NÚT CÔNG CỤ</h3>
        <span class="chapter-badge">Hướng dẫn nhanh</span>
      </div>
      <div class="chapter-steps">
        <div class="chapter-step"><strong>W, A, S, D + Chuột:</strong> Đi bộ & xoay đầu nhìn theo hướng rẽ</div>
        <div class="chapter-step"><strong>Phím E:</strong> Trò chuyện với NPC / Mua Xôi / Làm nhiệm vụ</div>
        <div class="chapter-step"><strong>Phím F:</strong> Lên / Xuống chiếc Xe máy đỏ đỗ cạnh bạn</div>
        <div class="chapter-step"><strong>Phím V:</strong> Đổi Góc nhìn Thứ 3 (Thấy nhân vật) ↔ Thứ nhất</div>
        <div class="chapter-step"><strong>Phím T / L:</strong> Bật Đèn Pin cầm tay / Đèn pha xe máy</div>
        <div class="chapter-step"><strong>Phím P:</strong> Chụp ảnh Check-in tại 8 địa danh nhận thưởng</div>
        <div class="chapter-step"><strong>Cột bên trái (1–8):</strong> Dịch chuyển tức thời tới 8 địa điểm</div>
        <div class="chapter-step"><strong>▶ Cốt Truyện:</strong> Bắt đầu Hồi III (Đêm mưa Ngõ 41)</div>
      </div>
    </div>
  `;
}

function openJournalModal() {
  if (isSettingsOpen) closeSettingsModal();
  if (isInventoryOpen) closeInventoryModal();
  if (isShipperModalOpen) closeShipperModal();
  isJournalOpen = true;
  isDialogueOpen = true;
  if (document.pointerLockElement) document.exitPointerLock?.();
  renderJournalModalContent();
  document.getElementById('journal-modal')?.classList.remove('hidden');
}

function closeJournalModal() {
  isJournalOpen = false;
  isDialogueOpen = false;
  document.getElementById('journal-modal')?.classList.add('hidden');
}

function toggleJournalModal() {
  if (isJournalOpen) closeJournalModal();
  else openJournalModal();
}

function guideToInventoryTarget(coords) {
  if (!coords) return;
  customGpsTarget = { x: coords.x, z: coords.z, title: coords.title };
  gameSettings.showWaypoints = true;
  applyGameSettings();
  saveSettingsToStorage();
  closeInventoryModal();
  const angleToTarget = Math.atan2(coords.x - playerGroup.position.x, coords.z - playerGroup.position.z);
  if (!playerState.isRidingBike) targetCamYaw = angleToTarget;
  showToast(`🧭 Đã bật dẫn đường GPS tới: ${coords.title}. Đi theo tuyến màu xanh.`, 4500);
}

function useInventoryItem(itemId) {
  if (!hasItem(itemId)) return;
  if (itemId === 'xoi_phu_thuong') {
    if (!playerState.completedQuests.has('quest_baove')) {
      showToast('💡 Gợi ý: Bạn có thể giữ gói xôi này đem biếu Bác Bảo Vệ ở Cổng 41, hoặc bấm ăn thêm lần nữa nếu muốn hồi Thể lực!');
    }
    consumeItem('xoi_phu_thuong');
    playerState.stamina = 100;
    addRewards(0, 25);
    playSoundEffect('quest');
    showToast('🍙 Đã ăn Gói Xôi Phú Thượng nóng hổi! Thể lực hồi 100% (+25 XP).');
    renderInventoryModalContent();
  } else if (itemId === 'tra_da') {
    consumeItem('tra_da');
    playerState.stamina = 100;
    storyComposure = 100;
    addRewards(0, 15);
    playSoundEffect('coin');
    showToast('🍵 Đã uống Cốc Trà Đá mát lạnh! Thể lực & sự bình tĩnh hồi 100% (+15 XP).');
    renderInventoryModalContent();
  } else if (itemId === 'kem_ho_tay') {
    consumeItem('kem_ho_tay');
    playerState.stamina = 100;
    storyComposure = 100;
    addRewards(0, 25);
    playSoundEffect('quest');
    showToast('🍦 Đã thưởng thức Kem Ốc Quế Hồ Tây mát lạnh! Thể lực hồi 100% (+25 XP).');
    renderInventoryModalContent();
  } else if (itemId === 'bang_ghi_am_41') {
    playHorrorPhoneRing();
    showToast('📼 Đang phát lại Cuộn Băng Số 41 (26/10/2008): “Linh ơi... Đêm mưa ngập ấy có người áo tơi đã bế bé An từ miệng giếng cổ sang phía Phú Gia...”', 6500);
  }
}

function renderInventoryModalContent() {
  const summaryEl = document.getElementById('inventory-summary-strip');
  const listEl = document.getElementById('inventory-modal-list');
  const detailEl = document.getElementById('inventory-modal-detail');
  if (!listEl || !detailEl) return;

  let totalOwnedCount = 0;
  playerState.inventory.forEach((v) => { totalOwnedCount += Number(v.count) || 0; });

  if (summaryEl) {
    summaryEl.innerHTML = `
      <span class="inv-stat-badge">🎒 Vật phẩm trong túi: <strong>${totalOwnedCount} món (${playerState.inventory.size} loại)</strong></span>
      <span class="inv-stat-badge">💰 Tiền mặt: <strong>${playerState.coins.toLocaleString('vi-VN')}đ</strong></span>
      <span class="inv-stat-badge">⚡ Thể lực: <strong>${Math.round(playerState.stamina)}%</strong></span>
      <span class="inv-stat-badge">⭐ Sao Di sản: <strong>${playerState.collectedRelics}/${playerState.totalRelics}</strong></span>
      <span class="inv-stat-badge">🔎 Vật chứng Ngõ 41: <strong>${playerState.night.evidence.length}/3</strong></span>
    `;
  }

  const allCatalogIds = Object.keys(ITEM_CATALOG);
  const ownedIds = allCatalogIds.filter((id) => hasItem(id));
  const unownedIds = allCatalogIds.filter((id) => !hasItem(id));

  if (!selectedInventoryItemId || !ITEM_CATALOG[selectedInventoryItemId]) {
    selectedInventoryItemId = ownedIds[0] || allCatalogIds[0];
  }

  listEl.innerHTML = '';

  const addSectionTitle = (text) => {
    const h = document.createElement('div');
    h.className = 'inv-section-heading';
    h.textContent = text;
    listEl.appendChild(h);
  };

  const createSlotCard = (id, isOwned) => {
    const meta = ITEM_CATALOG[id];
    const invEntry = playerState.inventory.get(id);
    const count = isOwned ? (invEntry?.count || 1) : 0;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `inv-slot-card ${selectedInventoryItemId === id ? 'active' : ''} ${!isOwned ? 'unowned' : ''}`;
    btn.innerHTML = `
      <div class="inv-slot-icon">${meta.icon}</div>
      <div class="inv-slot-info">
        <strong>${meta.name}</strong>
        <small>${meta.category}</small>
      </div>
      <span class="inv-slot-qty ${!isOwned ? 'missing' : ''}">${isOwned ? `Đang có x${count}` : 'Chưa có'}</span>
    `;
    btn.addEventListener('click', () => {
      selectedInventoryItemId = id;
      renderInventoryModalContent();
    });
    listEl.appendChild(btn);
  };

  if (ownedIds.length > 0) {
    addSectionTitle(`🎒 Vật phẩm đang có trong Túi Đồ (${ownedIds.length})`);
    ownedIds.forEach((id) => createSlotCard(id, true));
  } else {
    addSectionTitle('🎒 Túi Đồ Hiện Đang Trống');
    const emptyNote = document.createElement('div');
    emptyNote.className = 'inv-detail-box';
    emptyNote.innerHTML = 'Bạn chưa có vật phẩm nào trong túi. Hãy nhấp vào các vật phẩm bên dưới để xem <strong>nơi lấy</strong> và bật <strong>Dẫn đường GPS</strong> tới đó!';
    listEl.appendChild(emptyNote);
  }

  if (unownedIds.length > 0) {
    addSectionTitle(`📋 Vật phẩm khác tại Phố Phú Thượng (${unownedIds.length})`);
    unownedIds.forEach((id) => createSlotCard(id, false));
  }

  // Render chi tiết vật phẩm đang được chọn ở cột bên phải
  const selectedMeta = ITEM_CATALOG[selectedInventoryItemId];
  const isSelectedOwned = hasItem(selectedInventoryItemId);
  const selectedCount = isSelectedOwned ? (playerState.inventory.get(selectedInventoryItemId)?.count || 1) : 0;

  detailEl.innerHTML = `
    <div class="inv-detail-top">
      <div class="inv-detail-big-icon">${selectedMeta.icon}</div>
      <div class="inv-detail-title">
        <h3>${selectedMeta.name}</h3>
        <div class="inv-detail-tags">
          <span class="inv-tag">${selectedMeta.category}</span>
          <span class="inv-tag ${isSelectedOwned ? 'owned' : ''}">
            ${isSelectedOwned ? `✓ Đang có trong túi: x${selectedCount}` : '○ Chưa có trong túi'}
          </span>
        </div>
      </div>
    </div>
    <p class="inv-detail-desc">${selectedMeta.description}</p>
    <div class="inv-detail-box">
      <strong>📍 Nguồn gốc / Nơi lấy vật phẩm:</strong>
      ${selectedMeta.sourceHint}
    </div>
    <div class="inv-detail-box">
      <strong>🎯 Công dụng & Cách sử dụng:</strong>
      ${selectedMeta.usageHint}
    </div>
    <div class="inv-detail-actions" id="inv-detail-actions"></div>
  `;

  const actionsContainer = document.getElementById('inv-detail-actions');
  if (actionsContainer) {
    if (isSelectedOwned && selectedMeta.canConsume) {
      const consumeBtn = document.createElement('button');
      consumeBtn.type = 'button';
      consumeBtn.className = 'choice-btn primary';
      consumeBtn.textContent = selectedInventoryItemId === 'xoi_phu_thuong'
        ? '🍽️ Ăn Gói Xôi Nóng Ngay (+100% Thể lực, +25 XP)'
        : '🍵 Uống Cốc Trà Đá Ngay (+100% Thể lực & Bình tĩnh)';
      consumeBtn.addEventListener('click', () => useInventoryItem(selectedInventoryItemId));
      actionsContainer.appendChild(consumeBtn);
    }

    if (isSelectedOwned && selectedMeta.canListen) {
      const listenBtn = document.createElement('button');
      listenBtn.type = 'button';
      listenBtn.className = 'choice-btn primary';
      listenBtn.textContent = '▶️ Phát Lại Nội Dung Cuộn Băng Số 41 (2008)';
      listenBtn.addEventListener('click', () => useInventoryItem(selectedInventoryItemId));
      actionsContainer.appendChild(listenBtn);
    }

    if (isSelectedOwned && selectedMeta.targetCoords) {
      const guideUseBtn = document.createElement('button');
      guideUseBtn.type = 'button';
      guideUseBtn.className = 'choice-btn';
      guideUseBtn.textContent = `🧭 Dẫn Đường GPS Tới Nơi Dùng: ${selectedMeta.targetCoords.title}`;
      guideUseBtn.addEventListener('click', () => guideToInventoryTarget(selectedMeta.targetCoords));
      actionsContainer.appendChild(guideUseBtn);
    } else if (!isSelectedOwned && selectedMeta.sourceCoords) {
      const guideSourceBtn = document.createElement('button');
      guideSourceBtn.type = 'button';
      guideSourceBtn.className = 'choice-btn primary';
      guideSourceBtn.textContent = `🧭 Dẫn Đường GPS Tới Nơi Lấy: ${selectedMeta.sourceCoords.title}`;
      guideSourceBtn.addEventListener('click', () => guideToInventoryTarget(selectedMeta.sourceCoords));
      actionsContainer.appendChild(guideSourceBtn);
    }
  }
}

function openInventoryModal(selectItemId = null) {
  if (isSettingsOpen) closeSettingsModal();
  if (isJournalOpen) closeJournalModal();
  if (isShipperModalOpen) closeShipperModal();
  if (selectItemId && ITEM_CATALOG[selectItemId]) {
    selectedInventoryItemId = selectItemId;
  }
  isInventoryOpen = true;
  isDialogueOpen = true;
  if (document.pointerLockElement) document.exitPointerLock?.();
  renderInventoryModalContent();
  document.getElementById('inventory-modal')?.classList.remove('hidden');
}

function closeInventoryModal() {
  isInventoryOpen = false;
  isDialogueOpen = false;
  document.getElementById('inventory-modal')?.classList.add('hidden');
}

function toggleInventoryModal() {
  if (isInventoryOpen) closeInventoryModal();
  else openInventoryModal();
}

function getActiveGuidanceTarget() {
  if (activeShipperRun) {
    const cp = activeShipperRun.route.checkpoints[activeShipperRun.cpIndex];
    if (cp) {
      return {
        x: cp.x,
        z: cp.z,
        title: `⚡ Cổng ${activeShipperRun.cpIndex + 1}/${activeShipperRun.route.checkpoints.length}: ${cp.label}`
      };
    }
  }
  if (customGpsTarget) {
    const d = Math.hypot(playerGroup.position.x - customGpsTarget.x, playerGroup.position.z - customGpsTarget.z);
    if (d < 3.6) {
      const reachedTitle = customGpsTarget.title;
      customGpsTarget = null;
      showToast(`📍 Bạn đã tới đích dẫn đường: ${reachedTitle}! Hãy bấm [E] để tương tác.`);
    } else {
      return customGpsTarget;
    }
  }
  if (horrorModeActive) {
    const stage = Math.min(playerState.horrorChapterStage, HORROR_CHAPTER_STEPS.length - 1);
    const step = HORROR_CHAPTER_STEPS[stage];
    if (step) return { x: step.x, z: step.z, title: step.title };
  }
  if (playerState.daylife?.active || playerState.daylife?.mystery?.started&&!playerState.daylife.mystery.ending&&!playerState.daylife.mystery.suspended) return daylifeController?.guidance() || null;
  if (playerState.streetStoryStep < STREET_STORY_STEPS.length) {
    const st = STREET_STORY_STEPS[playerState.streetStoryStep];
    return { x: st.x, z: st.z, title: st.title };
  }
  if (!playerState.completedQuests.has('quest_baove')) {
    return { x: -2.2, z: 8.2, title: 'Bác Bảo Vệ THPT Tây Hồ (Số 41)' };
  }
  if (!playerState.completedQuests.has('quest_ngaba')) {
    return { x: 32, z: -5.5, title: 'Bác Tổ Trưởng Ngã Ba 68' };
  }
  if (!playerState.completedQuests.has('quest_lietsi')) {
    return { x: -24, z: -28, title: 'Đài Tưởng Niệm Liệt Sĩ' };
  }
  return { x: -67, z: -28.8, title: 'Nhà Số 41 Phú Thượng (Ngõ 41)' };
}

renderer.domElement.addEventListener('pointerdown', (e) => {
  isDraggingMouse = true;
  prevMouse = { x: e.clientX, y: e.clientY };
});

renderer.domElement.addEventListener('click', () => {
  if (!isDialogueOpen && !isSettingsOpen && !isJournalOpen && !isInventoryOpen && document.pointerLockElement !== renderer.domElement) {
    const lockRequest = renderer.domElement.requestPointerLock?.();
    lockRequest?.catch?.(() => {
      // Trình duyệt nhúng có thể không cho phép pointer lock; vẫn giữ kéo chuột để xoay camera.
    });
  }
});

document.addEventListener('pointerlockchange', () => {
  document.body.classList.toggle('mouse-locked', document.pointerLockElement === renderer.domElement);
});

window.addEventListener('pointerup', () => {
  isDraggingMouse = false;
});
function releaseGameInputs(){resetHeldInputs(keys);isDraggingMouse=false;footVelX=footVelZ=0;rideMotion.speed=0;}
window.addEventListener('blur',releaseGameInputs);
document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseGameInputs();saveGame();}});

window.addEventListener('pointermove', (e) => {
  if(!canUseCamera({dialogue:isDialogueOpen,settings:isSettingsOpen,journal:isJournalOpen,inventory:isInventoryOpen}))return;
  const locked = document.pointerLockElement === renderer.domElement;
  if (!locked && !isDraggingMouse) return;
  const dx = locked ? e.movementX : e.clientX - prevMouse.x;
  const dy = locked ? e.movementY : e.clientY - prevMouse.y;
  if (!locked) prevMouse = { x: e.clientX, y: e.clientY };

  const sens = Number(gameSettings.mouseSensitivity) || 1.0;
  targetCamYaw -= dx * 0.0052 * sens;
  targetCamPitch = THREE.MathUtils.clamp(targetCamPitch + dy * 0.0042 * sens, -0.45, 1.05);
});

window.addEventListener('wheel', (e) => {
  if(!canUseCamera({dialogue:isDialogueOpen,settings:isSettingsOpen,journal:isJournalOpen,inventory:isInventoryOpen}))return;
  targetCamDist = THREE.MathUtils.clamp(targetCamDist + e.deltaY * 0.006, 2.2, 24);
});

function stopActivePropSession(announce = true) {
  if (!activePropSession) return;
  const { prop, title } = activePropSession;
  if (prop) {
    playerGroup.position.x = prop.exitX ?? prop.x;
    playerGroup.position.z = prop.exitZ ?? prop.z;
    playerGroup.position.y = getGroundElevationAt(playerGroup.position.x, playerGroup.position.z);
  }
  if (playerModel) {
    playerModel.rotation.x = 0;
    playerModel.rotation.z = 0;
    playerModel.position.y = playerModelBaseY;
  }
  [
    'hips', 'spine', 'chest', 'upperLeg.L', 'upperLeg.R', 'lowerLeg.L', 'lowerLeg.R',
    'upperArm.L', 'upperArm.R', 'lowerArm.L', 'lowerArm.R'
  ].forEach((name) => {
    const bone = playerBones[name];
    const rest = playerBoneRest[name];
    if (bone && rest) bone.quaternion.copy(rest);
  });
  activePropSession = null;
  isGrounded = true;
  verticalVel = 0;
  setPlayerAnimation('idle');
  if (announce) {
    showToast(`👟 Đã rời khỏi ${title || 'thiết bị công viên'}. Thể lực hiện tại: ${Math.round(playerState.stamina)}%!`, 2800);
  }
}

function interactWithWorldProp(prop) {
  if (!prop) return;
  if (prop.type === 'swing') {
    activePropSession = { type: 'swing', prop, title: prop.title, timer: 0 };
    addRewards(0, 30);
    awardSocialProgress({ neighborhood: { cohesion: 2, beauty: 1 } });
    playSoundEffect('quest');
    showToast('🎠 Đang ngồi đánh Xích đu công viên! Nhấn giữ [W / S] để lấy đà bay cao, bấm [E] hoặc [Space] để xuống (+30 XP).', 4800);
    return;
  }
  if (prop.type === 'seesaw') {
    activePropSession = { type: 'seesaw', prop, title: prop.title, timer: 0 };
    addRewards(0, 25);
    awardSocialProgress({ neighborhood: { cohesion: 2 } });
    playSoundEffect('quest');
    showToast('⚖️ Đang chơi Bập bênh công viên! Nhấn [W / S] để nhún bập bênh, bấm [E] hoặc [Space] để xuống (+25 XP).', 4800);
    return;
  }
  if (prop.type === 'slide') {
    activePropSession = { type: 'slide', prop, title: prop.title, timer: 0 };
    playerState.stamina = Math.min(100, playerState.stamina + 25);
    addRewards(0, 30);
    awardSocialProgress({ neighborhood: { cohesion: 2 } });
    playSoundEffect('quest');
    showToast('🛝 Vùuuu! Đang trượt từ Chòi Nấm Liên Hoàn xuống máng trượt (+30 XP)!', 3800);
    return;
  }
  if (prop.type === 'gym') {
    activePropSession = { type: 'gym', prop, title: prop.title, timer: 0 };
    addRewards(0, 30);
    awardSocialProgress({ neighborhood: { cohesion: 2, beauty: 1 } });
    playSoundEffect('quest');
    showToast(`💪 Đang tập thể dục trên ${prop.title}! Thể lực đang hồi phục nhanh (+30 XP). Bấm [E] hoặc [Space] để nghỉ.`, 4800);
    return;
  }
  if (prop.type === 'bench') {
    activePropSession = { type: 'bench', prop, title: prop.title, timer: 0 };
    addRewards(0, 20);
    playSoundEffect('coin');
    showToast(`🪑 Đang ngồi nghỉ chân tại ${prop.title} ngắm cảnh công viên & hồi 100% Thể lực (+20 XP). Bấm [E] hoặc [Space] để đứng dậy.`, 4500);
    return;
  }
  if (prop.type === 'chess') {
    activePropSession = { type: 'chess', prop, title: prop.title, timer: 0 };
    const chessMoves = [
      '“Pháo Đầu Mã Đội — Chiếu tướng tuyệt sát!” Các cụ bô lão trong chòi lục giác vỗ đùi khen nước cờ cao!',
      '“Mã Hậu Pháo khóa Tướng!” Bạn vừa hóa giải thành công thế cờ giang hồ bên Hồ Sen Tây Hồ!',
      '“Song Xe đoạt Sĩ Tượng!” Nước cờ sắc bén khiến cả bàn cờ trầm trồ thán phục!'
    ];
    const msg = chessMoves[Math.floor(Math.random() * chessMoves.length)];
    addRewards(15000, 45);
    awardSocialProgress({ neighborhood: { heritage: 2, cohesion: 3 } });
    playSoundEffect('quest');
    showToast(`♟️ ${msg} (+15.000đ, +45 XP)! Bấm [E] hoặc [Space] để đứng dậy.`, 5500);
    return;
  }
  if (prop.type === 'kiosk') {
    if (playerState.coins < 10000) {
      showToast('⚠️ Bạn cần 10.000đ để mua Kem Ốc Quế Hồ Tây & Nước Mía!');
      return;
    }
    playerState.coins -= 10000;
    playerState.stamina = 100;
    addItemToInventory('kem_ho_tay', 1);
    addRewards(0, 35);
    awardSocialProgress({ neighborhood: { livelihood: 2, cohesion: 1 } });
    playSoundEffect('quest');
    showToast('🍦 Đã mua Kem Ốc Quế Hồ Tây & uống Nước Mía mát lạnh! Hồi 100% Thể lực & thêm 1 chiếc Kem vào Túi đồ (+35 XP).', 5200);
    return;
  }
  if (prop.type === 'fountain') {
    if (playerState.coins >= 1000) playerState.coins -= 1000;
    playerState.stamina = Math.min(100, playerState.stamina + 35);
    addRewards(0, 40);
    awardSocialProgress({ neighborhood: { beauty: 3, cohesion: 2 } });
    playSoundEffect('relic');
    showToast('⛲ Keng! Bạn vừa tung đồng xu ước nguyện xuống Đài Phun Nước Đá Trắng 3 Tầng — Cầu chúc bình an cho phố Phú Thượng (+40 XP)!', 5200);
    return;
  }
  if (prop.type === 'bridge') {
    playerState.stamina = 100;
    addRewards(0, 35);
    awardSocialProgress({ neighborhood: { heritage: 2, beauty: 2 } });
    playSoundEffect('relic');
    showToast('🪷 Gió mát từ mặt Hồ Sen Tây Hồ thổi qua Cầu Gỗ Vòm Đỏ thơm ngát hương sen hồng! Thể lực hồi 100% (+35 XP).', 5000);
    return;
  }
  if (prop.type === 'shipper_garage') {
    openShipperModal('orders');
    return;
  }
  if (prop.type === 'tycoon_stall') {
    openTycoonRushMiniGame();
    return;
  }
  if (prop.type === 'fishing_pier') {
    openFishingMiniGame();
    return;
  }
  if (prop.type === 'jianzi_court') {
    openJianziMiniGame();
    return;
  }
  if (prop.type === 'peach_shrine') {
    playerState.stamina = 100;
    const outfitMult = garageState.equippedOutfit === 'outfit_tycoon' ? 1.25 : 1.0;
    const cash = Math.round(25000 * outfitMult);
    addRewards(cash, 85);
    awardSocialProgress({ neighborhood: { heritage: 4, beauty: 3, cohesion: 2 } });
    playSoundEffect('relic');
    triggerStuntBanner(`🌸 PHÚC LỘC VƯỜN ĐÀO PHÚ THƯỢNG! +${cash.toLocaleString('vi-VN')}đ · +85 XP`);
    showToast(`🌸 Bạn vừa treo Thẻ Ước Nguyện Đỏ lên Cây Đào Cổ Thụ Phú Thượng tại Lầu Vọng Cảnh! Hồi 100% Thể lực & nhận lộc may mắn (+${cash.toLocaleString('vi-VN')}đ, +85 XP)!`, 5800);
    return;
  }
  if (prop.type === 'flower_stall') {
    if (playerState.coins < 15000) {
      showToast('⚠️ Bạn cần 15.000đ để mua Hoa Tươi tại sạp Chợ Hoa Quảng Bá!');
      return;
    }
    playerState.coins -= 15000;
    addItemToInventory('bo_hoa_cuc', 1);
    addRewards(0, 40);
    awardSocialProgress({ neighborhood: { livelihood: 3, beauty: 2 } });
    playSoundEffect('quest');
    showToast(`💐 Đã chọn mua 1 Bó Hoa Tươi rực rỡ tại sạp "${prop.title}" (-15.000đ, +40 XP)! Đã cất vào Túi đồ (Phím B).`, 5200);
  }
}

function performPrimaryInteraction() {
  if (isDialogueOpen) return;
  if(playerState.isRidingBike){showToast('Dừng xe và bấm F xuống xe trước khi tương tác. C: nhận đơn ship nhanh · Space: phanh.');return;}
  if(policeController?.interact({x:playerGroup.position.x,z:playerGroup.position.z,riding:playerState.isRidingBike}))return;
  if (activePropSession) {
    stopActivePropSession(true);
    return;
  }
  // Resolve nearby street events only after the player has dismounted.
  if (!horrorModeActive && activeStreetEvent) {
    const distEv = Math.hypot(playerGroup.position.x - activeStreetEvent.x, playerGroup.position.z - activeStreetEvent.z);
    if (distEv < 4.8) {
      resolveActiveStreetEvent();
      return;
    }
  }
  if (arcadeController?.interact()) {
    return;
  } else if (daylifeController?.interact()) {
    return;
  } else if (nearestStoryClue) {
    collectStoryClue(nearestStoryClue);
  } else if (nearestHorrorEvent) {
    completeHorrorEvent(nearestHorrorEvent);
  } else if (isAtNightRefuge()) {
    openNightRefuge();
  } else if (nearestStoryEvent) {
    completeStreetStoryEvent(nearestStoryEvent);
  } else if (nearestNPC) {
    openDialogue(nearestNPC.userData);
  } else if (nearestXoiVendor) {
    buyXoiFromStreetVendor();
  } else if (nearestWorldInteractable) {
    interactWithWorldProp(nearestWorldInteractable);
  }
}

document.getElementById('interact-prompt')?.addEventListener('click', performPrimaryInteraction);
document.getElementById('interact-prompt')?.addEventListener('keydown', (event) => {
  if (event.code === 'Enter' || event.code === 'Space') {
    event.preventDefault();
    performPrimaryInteraction();
  }
});

window.addEventListener('keydown', (e) => {
  if(policeController?.isDetained()){e.preventDefault();return;}
  if(e.code==='KeyY'&&!e.repeat&&!isDialogueOpen){e.preventDefault();guideToStreetEvent();}
  if(e.code==='Tab'&&!e.repeat&&!isDialogueOpen){
    e.preventDefault();keys.w=keys.a=keys.s=keys.d=keys.shift=keys.space=false;rideMotion.speed=0;isDraggingMouse=false;
    document.exitPointerLock?.();showToast('Đã dừng xe · dùng chuột chọn nút. Nhấp vào cảnh để điều khiển tiếp.');return;
  }
  if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.w = true;
  if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.s = true;
  if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.a = true;
  if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.d = true;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.shift = true;
  if (e.code === 'Space') {keys.space = true;if(playerState.isRidingBike)e.preventDefault();}
  if (e.code === 'KeyQ') keys.q = true;
  if (e.code === 'KeyG' && !e.repeat) {
    if (!nightActivity && (!isDialogueOpen || isShipperModalOpen)) {
      toggleShipperModal('orders');
    }
  }
  if (e.code === 'KeyC' && !e.repeat && !isDialogueOpen && !horrorModeActive) {
    const nextRouteIdx = garageState.stats.deliveriesCompleted % SHIPPER_ROUTES.length;
    startShipperRoute(SHIPPER_ROUTES[nextRouteIdx].id);
  }
  if (e.code === 'Space' && !isDialogueOpen && !playerState.isRidingBike) {
    if (activePropSession) {
      e.preventDefault();
      stopActivePropSession(true);
      return;
    }
    if (isGrounded) {
      e.preventDefault();
      verticalVel = 6.2;
      isGrounded = false;
      playFootstepSound(horrorModeActive, true, false);
      if (playerActions.jump) {
        playerActions.jump.time = 0.35; // Nhảy ngay vào pha bật nhảy trên không thay vì bước lấy đà
      }
      setPlayerAnimation('jump');
    }
  }
  if(e.code==='KeyK'&&!e.repeat&&!isDialogueOpen&&!horrorModeActive){e.preventDefault();policeController?.reportCrime();}
  if (e.code === 'KeyH' && !e.repeat && !isDialogueOpen) {
    playMotorbikeHorn();
  }
  if (e.code === 'KeyV' && !isDialogueOpen) {
    toggleCameraMode();
  }
  if (e.code === 'KeyJ' && !e.repeat) {
    if (nightActivity === 'notebook') closeNightActivity();
    else if (!isDialogueOpen && horrorModeActive) openNightNotebook();
    else if (!nightActivity && (!isDialogueOpen || isJournalOpen)) toggleJournalModal();
  }
  if (e.code === 'KeyF' && !isDialogueOpen) {
    togglePlayerMotorbike();
  }
  if (e.code === 'KeyP' && !isDialogueOpen) {
    captureLandmarkPhoto();
  }
  if (e.code === 'KeyE' && !isDialogueOpen) {
    performPrimaryInteraction();
  }
  if ((e.code === 'Enter' || e.code === 'Space') && !document.getElementById('story-dialogue')?.classList.contains('hidden')) {
    e.preventDefault();
    advanceStoryDialogue();
  }
  if (e.code === 'KeyT' && !isDialogueOpen) {
    togglePlayerFlashlight();
  }
  if (e.code === 'KeyR' && !e.repeat && !isDialogueOpen) {
    if (horrorModeActive) triggerFlashlightBurst();
    else togglePlayerFlashlight();
  }
  if ((e.code === 'KeyB' || e.code === 'KeyI') && !e.repeat) {
    if (!nightActivity && (!isDialogueOpen || isInventoryOpen)) {
      toggleInventoryModal();
    }
  }
  if (e.code === 'KeyO' && (!isDialogueOpen || isSettingsOpen)) {
    toggleSettingsModal();
  }
  if (e.code === 'KeyL' && !isDialogueOpen) {
    if (playerState.isRidingBike) togglePlayerHeadlight();
    else togglePlayerFlashlight();
  }
  if (e.code === 'Escape') {
    if (isSettingsOpen) closeSettingsModal();
    else if (isJournalOpen) closeJournalModal();
    else if (isInventoryOpen) closeInventoryModal();
    else if (isShipperModalOpen) closeShipperModal();
    else if (isParkMiniGameOpen) closeParkMiniGame();
    else if (nightActivity) {
      if (!document.getElementById('night-close').classList.contains('hidden')) closeNightActivity();
    } else if (!document.getElementById('story-prologue').classList.contains('hidden')) {
      document.getElementById('story-cancel-btn').click();
    } else if (!document.getElementById('story-dialogue').classList.contains('hidden')) {
      advanceStoryDialogue();
    } else if (isDialogueOpen && document.getElementById('story-fail').classList.contains('hidden') && document.getElementById('horror-choice').classList.contains('hidden')) closeDialogue();
  }
});

let nearestXoiVendor = null;
const XOI_STEPS = [
  {
    instruction: 'Bước 1/3: Chọn loại gạo làm nên độ dẻo thơm của xôi.',
    correct: 'Nếp cái hoa vàng',
    options: [['🌾', 'Nếp cái hoa vàng'], ['🍚', 'Gạo tẻ'], ['🌽', 'Hạt ngô khô']]
  },
  {
    instruction: 'Bước 2/3: Thêm phần nhân truyền thống cho gói xôi xéo.',
    correct: 'Đỗ xanh và hành phi',
    options: [['🫘', 'Đỗ xanh và hành phi'], ['🧀', 'Phô mai'], ['🍬', 'Kẹo đường']]
  },
  {
    instruction: 'Bước 3/3: Chọn vật liệu gói giữ xôi nóng và thơm.',
    correct: 'Lá chuối',
    options: [['🍃', 'Lá chuối'], ['📰', 'Giấy báo'], ['🥡', 'Hộp nhựa']]
  }
];
let xoiGame = null;

function closeXoiMiniGame(message = '') {
  clearInterval(xoiGame?.timer);
  xoiGame = null;
  document.getElementById('xoi-minigame')?.classList.add('hidden');
  isDialogueOpen = false;
  if (message) showToast(message);
}

function renderXoiStep() {
  if (!xoiGame) return;
  const step = XOI_STEPS[xoiGame.step];
  document.getElementById('xoi-instruction').textContent = step.instruction;
  document.querySelectorAll('#xoi-progress span').forEach((el, index) => {
    el.classList.toggle('done', index < xoiGame.step);
    el.classList.toggle('active', index === xoiGame.step);
  });
  const optionsEl = document.getElementById('xoi-options');
  optionsEl.innerHTML = '';
  [...step.options].sort(() => Math.random() - .5).forEach(([icon, label]) => {
    const button = document.createElement('button');
    button.className = 'activity-option';
    button.innerHTML = `<span class="option-icon">${icon}</span>${label}`;
    button.addEventListener('click', () => chooseXoiIngredient(label));
    optionsEl.appendChild(button);
  });
  document.getElementById('xoi-quality').textContent = `Chất lượng: ${'★'.repeat(xoiGame.quality)}${'☆'.repeat(3 - xoiGame.quality)}`;
}

function chooseXoiIngredient(label) {
  if (!xoiGame) return;
  if (label !== XOI_STEPS[xoiGame.step].correct) {
    xoiGame.quality = Math.max(1, xoiGame.quality - 1);
    document.getElementById('xoi-quality').textContent = `Chất lượng: ${'★'.repeat(xoiGame.quality)}${'☆'.repeat(3 - xoiGame.quality)}`;
    playSoundEffect('shutter');
    return;
  }
  xoiGame.step += 1;
  if (xoiGame.step < XOI_STEPS.length) {
    playSoundEffect('coin');
    renderXoiStep();
    return;
  }

  const quality = xoiGame.quality;
  const bonusXp = quality === 3 ? 70 : quality === 2 ? 55 : 40;
  clearInterval(xoiGame.timer);
  playerState.coins -= 15000;
  addItemToInventory('xoi_phu_thuong', 1);
  addRewards(0, bonusXp);
  awardSocialProgress({
    relationship: { xoi_vendor: 3 + quality * 2 },
    neighborhood: { livelihood: quality + 1, heritage: quality === 3 ? 2 : 1 }
  });
  closeXoiMiniGame(`🍙 Gói xôi ${quality} sao đã hoàn thành! (-15.000đ, +${bonusXp} XP)`);
  playSoundEffect('quest');
}

function buyXoiFromStreetVendor() {
  if (playerState.isRidingBike) {
    showToast('🛵 Hãy xuống xe trước khi mua xôi.');
    return;
  }
  if (playerState.coins < 15000) {
    showToast('⚠️ Bạn cần ít nhất 15.000đ để mua gói Xôi Phú Thượng! Hãy nhặt Sao Di Sản hoặc chụp ảnh Check-in nhé.');
    return;
  }
  isDialogueOpen = true;
  xoiGame = { step: 0, quality: 3, seconds: 30, timer: null };
  document.getElementById('xoi-minigame').classList.remove('hidden');
  renderXoiStep();
  xoiGame.timer = setInterval(() => {
    if (!xoiGame) return;
    xoiGame.seconds -= 1;
    document.getElementById('xoi-timer').textContent = `⏱️ ${xoiGame.seconds} giây`;
    if (xoiGame.seconds <= 0) closeXoiMiniGame('⏱️ Hết giờ gói xôi. Bạn có thể thử lại mà không mất tiền.');
  }, 1000);
}

let teaStallUpgradeGroup = null;
function applyTeaStallUpgrade() {
  if (!playerState.teaStallUpgrade || teaStallUpgradeGroup) return;
  teaStallUpgradeGroup = new THREE.Group();
  teaStallUpgradeGroup.position.set(-52.5, 0, -5.6);

  if (playerState.teaStallUpgrade === 'green') {
    const planterMat = new THREE.MeshStandardMaterial({ color: 0x9a5b35, roughness: .82 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x3d8b57, roughness: .72 });
    [-1.15, 1.15].forEach((x, index) => {
      const planter = new THREE.Mesh(new THREE.BoxGeometry(.72, .34, .42), planterMat);
      planter.position.set(x, .17, .5);
      planter.castShadow = true;
      teaStallUpgradeGroup.add(planter);
      for (let i = 0; i < 5; i++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(.16 + (i % 2) * .04, 10, 8), leafMat);
        leaf.scale.set(.72, 1.25, .72);
        leaf.position.set(x + (i - 2) * .12, .46 + (i % 2) * .1, .5 + (i % 2) * .06);
        leaf.castShadow = true;
        teaStallUpgradeGroup.add(leaf);
      }
      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(.055, 8, 6),
        new THREE.MeshStandardMaterial({ color: index ? 0xf9a8d4 : 0xfde047, emissive: 0x3a2300 })
      );
      flower.position.set(x, .72, .5);
      teaStallUpgradeGroup.add(flower);
    });
    const label = createNPCLabel('🌿 Góc xanh cộng đồng', '#8cc4ae');
    label.position.set(0, 2.25, .3);
    label.scale.set(2.7, .54, 1);
    teaStallUpgradeGroup.add(label);
  } else {
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(2.35, 1.05, .1),
      new THREE.MeshStandardMaterial({ color: 0x6d4228, roughness: .76 })
    );
    board.position.set(0, 1.25, .62);
    board.castShadow = true;
    teaStallUpgradeGroup.add(board);
    const label = createNPCLabel('🍙 Chuyện Xôi Phú Thượng', '#e4b36c');
    label.position.set(0, 1.3, .69);
    label.scale.set(2.05, .42, 1);
    teaStallUpgradeGroup.add(label);
    [-1.05, 1.05].forEach((x) => {
      const lantern = new THREE.Mesh(
        new THREE.SphereGeometry(.16, 12, 8),
        new THREE.MeshStandardMaterial({ color: 0xe85d3f, emissive: 0x8c2418, emissiveIntensity: .65 })
      );
      lantern.scale.y = 1.25;
      lantern.position.set(x, 2.05, .65);
      teaStallUpgradeGroup.add(lantern);
    });
  }
  worldGroup.add(teaStallUpgradeGroup);
}

function handleChoiceAction(actionKey, npcData) {
  if (!actionKey) return null;

  if (actionKey === 'give_xoi') {
    if (playerState.completedQuests.has('quest_baove')) {
      return 'Cháu đã biếu bác gói Xôi Phú Thượng rồi, bác ăn no ấm bụng lắm! Cảm ơn cháu nhé!';
    }
    if (!hasItem('xoi_phu_thuong')) {
      showToast('💡 Hãy tìm Cô Gánh Xôi đội nón lá ở góc vỉa hè trước cổng trường và bấm [E] mua gói Xôi Phú Thượng (15.000đ) trước nhé!');
      return 'Cháu chưa có gói Xôi Phú Thượng trong túi đồ! Hãy tìm Cô Gánh Xôi đội nón lá ở góc vỉa hè ngay trước cổng trường rồi bấm phím [E] mua giúp bác nhé!';
    }
    consumeItem('xoi_phu_thuong');
    playerState.completedQuests.add('quest_baove');
    addRewards(35000, 120);
    awardSocialProgress({
      relationship: { npc_baove: 14 },
      neighborhood: { cohesion: 5, heritage: 2 }
    });
    playSoundEffect('quest');
    showToast('🎉 Hoàn thành nhiệm vụ Bác Bảo Vệ! (+35.000đ, +120 XP)');
    updateQuestProgress();
    return null;
  }

  if (actionKey === 'take_cong_van') {
    if (playerState.completedQuests.has('quest_ngaba')) {
      return 'Cảm ơn bạn, tập Công Văn đã được chuyển tới Bác Tổ Trưởng ở Ngã Ba 68 rồi!';
    }
    if (hasItem('cong_van_ubnd')) {
      return 'Bạn đang cầm tập Công Văn Văn Hóa Phường trong túi đồ rồi, hãy mang tới Ngã Ba 68 giao cho Bác Tổ Trưởng nhé!';
    }
    addItemToInventory('cong_van_ubnd', 1);
    addRewards(0, 80);
    awardSocialProgress({ relationship: { npc_ubnd: 5 }, neighborhood: { cohesion: 1 } });
    playSoundEffect('coin');
    showToast('📜 Đã nhận "Công Văn Văn Hóa Phường" (+80 XP)! Hãy mang tới Ngã Ba 68 Phú Thượng.');
    return null;
  }

  if (actionKey === 'quiz_ubnd') {
    if (playerState.completedQuests.has('quest_ubnd')) {
      return 'Bạn đã trả lời xuất sắc câu hỏi Di sản Quốc gia của UBND Phường rồi!';
    }
    playerState.completedQuests.add('quest_ubnd');
    addRewards(25000, 100);
    awardSocialProgress({ relationship: { npc_ubnd: 8 }, neighborhood: { heritage: 5 } });
    playSoundEffect('quest');
    showToast('🎉 Trả lời chính xác Di sản Xôi Phú Thượng! (+25.000đ, +100 XP)');
    updateQuestProgress();
    return null;
  }

  if (actionKey === 'buy_tra_da') {
    if (playerState.coins < 5000) {
      return 'Cháu không đủ 5.000đ rồi, thôi cô Hoa mời cháu uống miễn phí luôn cho mát nhé!';
    }
    playerState.stamina = 100;
    const firstTime = !playerState.completedQuests.has('quest_trada');
    playerState.completedQuests.add('quest_trada');
    addRewards(firstTime ? 15000 : -5000, firstTime ? 90 : 20);
    if (firstTime) awardSocialProgress({ relationship: { npc_trada: 6 }, neighborhood: { livelihood: 2 } });
    playSoundEffect('quest');
    showToast('🍵 Đã uống Trà Đá Vỉa Hè Cô Hoa! Thể lực hồi 100% & hoàn thành nhiệm vụ.');
    updateQuestProgress();
    return null;
  }

  if (actionKey === 'upgrade_tea_green' || actionKey === 'upgrade_tea_heritage') {
    if (!playerState.completedQuests.has('quest_trada')) {
      return 'Cháu ngồi uống với cô một cốc trà trước rồi mình cùng bàn cách làm góc quán đẹp hơn nhé!';
    }
    if (playerState.teaStallUpgrade) {
      return playerState.teaStallUpgrade === 'green'
        ? 'Góc cây xanh mình làm hôm trước đang lên đẹp lắm rồi cháu ạ!'
        : 'Tấm bảng kể chuyện Xôi Phú Thượng đang được nhiều khách dừng lại đọc lắm!';
    }
    if (playerState.coins < 10000) {
      return 'Mình cần khoảng 10.000đ mua ít vật liệu. Cháu có thể chụp ảnh địa danh hoặc làm việc trong phố để dành thêm nhé!';
    }
    playerState.teaStallUpgrade = actionKey === 'upgrade_tea_green' ? 'green' : 'heritage';
    addRewards(-10000, 110);
    if (playerState.teaStallUpgrade === 'green') {
      awardSocialProgress({ relationship: { npc_trada: 12 }, neighborhood: { beauty: 9, cohesion: 3 } });
    } else {
      awardSocialProgress({ relationship: { npc_trada: 12 }, neighborhood: { heritage: 9, livelihood: 3 } });
    }
    applyTeaStallUpgrade();
    playSoundEffect('quest');
    showToast('✨ Quán cô Hoa đã thay đổi theo lựa chọn của bạn!');
    markProgressDirty();
    return null;
  }

  if (actionKey === 'take_flowers') {
    if (playerState.completedQuests.has('quest_lietsi')) {
      return 'Cháu đã dâng bó hoa cúc vàng tại Đài Tưởng Niệm Liệt Sĩ rồi, quý hóa lắm!';
    }
    if (hasItem('bo_hoa_cuc')) {
      return 'Cháu đã có Bó Hoa Cúc Vàng trong túi đồ rồi, hãy mang vào Khu Tưởng Niệm phía sau UBND nhé!';
    }
    addItemToInventory('bo_hoa_cuc', 1);
    awardSocialProgress({ relationship: { npc_trada: 4 } });
    playSoundEffect('coin');
    showToast('💐 Đã nhận "Bó Hoa Cúc Vàng"! Hãy mang tới Khu Tưởng Niệm Liệt Sĩ gặp Bác Cựu Chiến Binh.');
    return null;
  }

  if (actionKey === 'deliver_cong_van') {
    if (playerState.completedQuests.has('quest_ngaba')) {
      return 'Bác đã nhận được Công Văn của UBND Phường và thông báo trên loa phường rồi, cảm ơn cháu!';
    }
    if (!hasItem('cong_van_ubnd')) {
      showToast('💡 Hãy tới sân UBND Phường gặp Cán Bộ Phường để nhận tập Công Văn trước nhé!');
      return 'Cháu chưa có tập Công Văn Văn Hóa Phường trong túi đồ! Hãy quay lại sân UBND Phường gặp anh Cán Bộ áo trắng để nhận công văn nhé!';
    }
    consumeItem('cong_van_ubnd');
    playerState.completedQuests.add('quest_ngaba');
    addRewards(40000, 140);
    awardSocialProgress({
      relationship: { npc_ngaba: 12, npc_ubnd: 4 },
      neighborhood: { cohesion: 6 }
    });
    playSoundEffect('quest');
    showToast('🎉 Hoàn thành nhiệm vụ Ngã Ba 68! (+40.000đ, +140 XP)');
    updateQuestProgress();
    return null;
  }

  if (actionKey === 'offer_flowers') {
    if (playerState.completedQuests.has('quest_lietsi')) {
      return 'Cháu đã cùng bác dâng hoa tưởng niệm các Anh hùng Liệt sĩ Phú Thượng rồi!';
    }
    if (!hasItem('bo_hoa_cuc')) {
      showToast('💡 Hãy ghé Quán Trà Đá Cô Hoa trên vỉa hè nhận Bó Hoa Cúc Vàng trước nhé!');
      return 'Cháu chưa có Bó Hoa Cúc Vàng trong túi đồ! Hãy ghé Quán Trà Đá Vỉa Hè của Cô Hoa dưới tán cây cổ thụ để nhận bó hoa cúc trước nhé!';
    }
    consumeItem('bo_hoa_cuc');
    playerState.completedQuests.add('quest_lietsi');
    addRewards(50000, 160);
    awardSocialProgress({
      relationship: { npc_lietsi: 15, npc_trada: 3 },
      neighborhood: { heritage: 8, cohesion: 3 }
    });
    playSoundEffect('quest');
    showToast('🎉 Hoàn thành nhiệm vụ Dâng Hoa Tưởng Niệm! (+50.000đ, +160 XP)');
    updateQuestProgress();
    return null;
  }

  return null;
}

window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.w = false;
  if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.s = false;
  if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.a = false;
  if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.d = false;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.shift = false;
  if (e.code === 'Space') keys.space = false;
  if (e.code === 'KeyQ') keys.q = false;
});

function openDialogue(npcData) {
  if (playerState.isRidingBike) {
    showToast('🛵 Hãy xuống xe trước khi trò chuyện.');
    return;
  }
  isDialogueOpen = true;
  visitedNPCs.add(npcData.id);
  markProgressDirty();
  updateQuestProgress();

  document.getElementById('dlg-avatar').textContent = npcData.avatar;
  document.getElementById('dlg-speaker').textContent = npcData.name;
  const relation = playerState.relationships[npcData.id] ?? 0;
  const level = relationshipLevel(relation);
  document.getElementById('dlg-role').textContent = `${npcData.role} · Thân thiết ${'♥'.repeat(level)}${'♡'.repeat(5 - level)}`;
  document.getElementById('dlg-text').textContent = npcData.greeting;

  const choicesEl = document.getElementById('dlg-choices');
  choicesEl.innerHTML = '';

  npcData.choices.forEach((c) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = `💬 ${c.label}`;
    btn.addEventListener('click', () => {
      const customReply = handleChoiceAction(c.action, npcData);
      document.getElementById('dlg-text').textContent = customReply || c.reply;
      const updatedRelation = playerState.relationships[npcData.id] ?? 0;
      const updatedLevel = relationshipLevel(updatedRelation);
      document.getElementById('dlg-role').textContent = `${npcData.role} · Thân thiết ${'♥'.repeat(updatedLevel)}${'♡'.repeat(5 - updatedLevel)}`;
    });
    choicesEl.appendChild(btn);
  });

  const closeBtn = document.createElement('button');
  closeBtn.className = 'choice-btn';
  closeBtn.style.borderColor = '#f59e0b';
  closeBtn.textContent = '👋 Cảm ơn, tiếp tục dạo phố (ESC)';
  closeBtn.addEventListener('click', closeDialogue);
  choicesEl.appendChild(closeBtn);

  document.getElementById('dialogue-modal').classList.remove('hidden');
}

function closeDialogue() {
  isDialogueOpen = false;
  document.getElementById('dialogue-modal').classList.add('hidden');
}

function updateQuestProgress() {
  const count = Math.max(visitedNPCs.size, playerState.completedQuests.size);
  const qCount = playerState.completedQuests.size;
  const total = QUEST_NPCS.length;
  const pct = Math.min(100, Math.round(((qCount + visitedNPCs.size * 0.5) / (total * 1.5)) * 100));
  document.getElementById('quest-fill').style.width = `${pct}%`;

  const hintEl = document.getElementById('quest-sub-hint');
  if (qCount >= total) {
    document.getElementById('quest-text').textContent =
      '🏆 Xuất sắc! Bạn đã hoàn thành toàn bộ 5 Nhiệm Vụ Văn Hóa Phố Phú Thượng (5/5)';
    if (hintEl) {
      hintEl.textContent = '🎉 Đã xong chuỗi văn hóa! Tiếp tục Chương “Góc Phố Số 41” và thu thập đủ 12 Sao Di Sản.';
    }
  } else {
    document.getElementById('quest-text').textContent =
      `Hoàn thành Nhiệm Vụ Thực Tế: ${qCount}/5 • Đã ghé thăm: ${visitedNPCs.size}/5 địa điểm`;
    if (hintEl) {
      if (!playerState.completedQuests.has('quest_baove')) {
        hintEl.textContent = '💡 Nhiệm vụ 1: Tìm Cô Gánh Xôi ở góc vỉa hè trước cổng trường, bấm [E] mua Xôi Phú Thượng biếu Bác Bảo Vệ!';
      } else if (!playerState.completedQuests.has('quest_ngaba')) {
        hintEl.textContent = '💡 Nhiệm vụ 2: Nhận Công Văn từ Cán Bộ UBND Phường mang tới Ngã Ba 68 giao cho Bác Tổ Trưởng!';
      } else if (!playerState.completedQuests.has('quest_lietsi')) {
        hintEl.textContent = '💡 Nhiệm vụ 3: Ghé Quán Trà Đá Cô Hoa nhận Bó Hoa Cúc Vàng mang vào Đài Tưởng Niệm Liệt Sĩ!';
      } else {
        hintEl.textContent = '💡 Gợi ý: Giải đố Di sản tại UBND Phường hoặc uống Trà Đá Cô Hoa để hoàn tất 5/5 nhiệm vụ!';
      }
    }
  }
}

const CHECKPOINTS = {
  cong_thpt: {
    x: -2.2,
    z: 2.0,
    yaw: 0.57,
    bikeYaw: Math.PI / 2,
    title: '📍 Đang đứng tại: Số 41 Phố Phú Thượng (Cổng THPT Tây Hồ)'
  },
  ubnd: {
    x: 0,
    z: 2.2,
    yaw: Math.PI,
    bikeYaw: Math.PI / 2,
    title: '📍 Đang đứng tại: Trước Cổng UBND Phường Phú Thượng'
  },
  quannuoc: {
    x: -44,
    z: -1.2,
    yaw: Math.PI * 0.55,
    bikeYaw: Math.PI / 2,
    title: '📍 Đang đứng tại: Quán Trà Đá Vỉa Hè & Hàng Cây Phú Thượng'
  },
  ngaba: {
    x: 38,
    z: -1.0,
    yaw: Math.PI * 0.5,
    bikeYaw: Math.PI / 2,
    title: '📍 Đang đứng tại: Ngã Tư 68 Phố Phú Thượng - Phố Phú Gia'
  },
  lietsi: {
    x: -24,
    z: -22,
    yaw: Math.PI,
    bikeYaw: 0,
    title: '📍 Đang đứng tại: Khu Tưởng Niệm Liệt Sĩ Phường Phú Thượng'
  },
  vuondao: {
    x: -153,
    z: 7.5,
    yaw: Math.PI,
    bikeYaw: Math.PI / 2,
    title: '📍 Đang đứng tại: Vườn Đào Phú Thượng & Cổng Làng Phú Thượng'
  },
  chohoa: {
    x: 134,
    z: -5.0,
    yaw: 0,
    bikeYaw: Math.PI / 2,
    title: '📍 Đang đứng tại: Chợ Hoa Quảng Bá & Công Viên Cộng Đồng'
  },
  ngo41: {
    x: -67,
    z: -6.2,
    yaw: Math.PI,
    bikeYaw: Math.PI / 2,
    title: '📍 Đang đứng tại: Cổng Ngõ 41 & Lối Vào Nhà Số 41 Phú Thượng'
  }
};

document.querySelectorAll('.cp-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.cp;
    const cp = CHECKPOINTS[key];
    if (!cp) return;

    document.querySelectorAll('.cp-btn').forEach((b) => b.classList.toggle('active', b === btn));
    playerGroup.position.set(cp.x, 0, cp.z);
    playerGroup.rotation.y = cp.yaw;
    const bikeYaw = cp.bikeYaw ?? cp.yaw;
    const bikeSideOffset = playerState.isRidingBike ? 0 : 0.92;
    playerMotorbike.position.set(
      cp.x + Math.cos(bikeYaw) * bikeSideOffset,
      0,
      cp.z - Math.sin(bikeYaw) * bikeSideOffset
    );
    playerMotorbike.rotation.y = bikeYaw;
    rideMotion.heading = bikeYaw;
    rideMotion.speed = 0;
    rideMotion.steer = 0;
    rideMotion.lean = 0;
    syncCameraYaw(cp.yaw);
    document.getElementById('hud-location').textContent = cp.title;
    markProgressDirty();
  });
});

document.getElementById('camera-mode-btn')?.addEventListener('click', toggleCameraMode);
document.getElementById('inventory-btn')?.addEventListener('click', () => {
  if (isDialogueOpen && !isInventoryOpen) return;
  toggleInventoryModal();
});
document.getElementById('inventory-bar')?.addEventListener('click', () => {
  if (isDialogueOpen && !isInventoryOpen) return;
  toggleInventoryModal();
});
document.getElementById('inventory-bar')?.addEventListener('keydown', (ev) => {
  if (ev.code === 'Enter' || ev.code === 'Space') {
    ev.preventDefault();
    if (!isDialogueOpen || isInventoryOpen) toggleInventoryModal();
  }
});
document.getElementById('inventory-close-top')?.addEventListener('click', closeInventoryModal);
document.getElementById('inventory-close-btn')?.addEventListener('click', closeInventoryModal);
document.getElementById('journal-btn')?.addEventListener('click', () => {
  if (isDialogueOpen) return;
  if (horrorModeActive) openNightNotebook();
  else toggleJournalModal();
});
document.getElementById('journal-close-top')?.addEventListener('click', closeJournalModal);
document.getElementById('journal-close-btn')?.addEventListener('click', closeJournalModal);
document.getElementById('journal-guide-btn')?.addEventListener('click', () => {
  gameSettings.showWaypoints = true;
  applyGameSettings();
  saveSettingsToStorage();
  closeJournalModal();
  const target = getActiveGuidanceTarget();
  if (target) {
    const angleToTarget = Math.atan2(target.x - playerGroup.position.x, target.z - playerGroup.position.z);
    targetCamYaw = angleToTarget;
    showToast(`🧭 Đã bật Dẫn đường GPS & xoay hướng nhìn tới: ${target.title}!`, 4500);
  }
});

document.getElementById('flashlight-toggle-btn')?.addEventListener('click', togglePlayerFlashlight);
document.getElementById('settings-btn')?.addEventListener('click', toggleSettingsModal);
document.getElementById('settings-close-top')?.addEventListener('click', closeSettingsModal);
document.getElementById('settings-save-btn')?.addEventListener('click', () => {
  closeSettingsModal();
  showToast('✓ Đã lưu cấu hình Đồ họa, Camera & Điều khiển!');
});
document.getElementById('settings-reset-btn')?.addEventListener('click', () => {
  gameSettings = { ...DEFAULT_SETTINGS };
  applyGameSettings();
  saveSettingsToStorage();
  showToast('🔄 Đã khôi phục cấu hình mặc định!');
});

document.getElementById('setting-cammode')?.addEventListener('change', (e) => {
  gameSettings.camMode = e.target.value;
  setCameraMode(gameSettings.camMode, true);
  saveSettingsToStorage();
});
document.getElementById('setting-autoturn')?.addEventListener('change', (e) => {
  gameSettings.autoTurnHead = e.target.checked;
  applyGameSettings();
  saveSettingsToStorage();
});
document.getElementById('setting-turnspeed')?.addEventListener('input', (e) => {
  gameSettings.turnFollowStrength = parseFloat(e.target.value);
  applyGameSettings();
  saveSettingsToStorage();
});
document.getElementById('setting-smoothness')?.addEventListener('input', (e) => {
  gameSettings.cameraSmoothness = parseFloat(e.target.value);
  applyGameSettings();
  saveSettingsToStorage();
});
document.getElementById('setting-preset')?.addEventListener('change', (e) => {
  gameSettings.preset = e.target.value;
  if (gameSettings.preset === 'low') gameSettings.shadows = false;
  else gameSettings.shadows = true;
  applyGameSettings();
  saveSettingsToStorage();
});
document.getElementById('setting-brightness')?.addEventListener('input', (e) => {
  gameSettings.brightness = parseFloat(e.target.value);
  applyGameSettings();
});
document.getElementById('setting-flashlight')?.addEventListener('input', (e) => {
  gameSettings.flashlightPower = parseFloat(e.target.value);
  applyGameSettings();
});
document.getElementById('setting-fov')?.addEventListener('input', (e) => {
  gameSettings.fov = parseFloat(e.target.value);
  applyGameSettings();
});
document.getElementById('setting-sensitivity')?.addEventListener('input', (e) => {
  gameSettings.mouseSensitivity = parseFloat(e.target.value);
  applyGameSettings();
});
document.getElementById('setting-waypoints')?.addEventListener('change', (e) => {
  gameSettings.showWaypoints = e.target.checked;
  applyGameSettings();
  saveSettingsToStorage();
});
document.getElementById('setting-shadows')?.addEventListener('change', (e) => {
  gameSettings.shadows = e.target.checked;
  applyGameSettings();
  saveSettingsToStorage();
});

document.getElementById('vehicle-toggle-btn')?.addEventListener('click', togglePlayerMotorbike);
document.getElementById('shipper-garage-btn')?.addEventListener('click', () => {
  if (isDialogueOpen && !isShipperModalOpen) return;
  toggleShipperModal('orders');
});
document.getElementById('shipper-close-top')?.addEventListener('click', closeShipperModal);
document.getElementById('shipper-modal')?.addEventListener('click',event=>{
  const button=event.target.closest('button'),panel=button?.closest('[id^="shipper-tab-"]');
  if(!panel||/guide|gps/.test(button.id))return;
  if(!requireStreetService(panel.id.replace('shipper-tab-',''))){event.preventDefault();event.stopImmediatePropagation();}
},true);
document.getElementById('shipper-close-btn')?.addEventListener('click', closeShipperModal);
document.getElementById('tab-btn-orders')?.addEventListener('click', () => {
  selectShipperTab('orders');
});
document.getElementById('tab-btn-garage')?.addEventListener('click', () => {
  selectShipperTab('garage');
});
document.getElementById('tab-btn-business')?.addEventListener('click', () => {
  selectShipperTab('business');
});
document.getElementById('tab-btn-style')?.addEventListener('click', () => {
  selectShipperTab('style');
});
document.getElementById('tab-btn-trophies')?.addEventListener('click', () => {
  selectShipperTab('trophies');
});
document.getElementById('park-mg-close-top')?.addEventListener('click', closeParkMiniGame);
document.getElementById('park-mg-close-btn')?.addEventListener('click', closeParkMiniGame);
function guideToStreetEvent(){
  if (!activeStreetEvent){showToast('Hiện chưa có sự kiện đường phố cần dẫn đường.');return;}
  gameSettings.showWaypoints=true;
  guideToInventoryTarget({
    x: activeStreetEvent.x,
    z: activeStreetEvent.z,
    title: activeStreetEvent.template.title
  });
}
document.getElementById('street-event-guide-btn')?.addEventListener('click', guideToStreetEvent);
document.getElementById('shipper-guide-station-btn')?.addEventListener('click', () => {
  closeShipperModal();
  guideToInventoryTarget({ x: 18.5, z: -6.0, title: 'Trạm Shipper Siêu Tốc & Xưởng Độ Xe 41' });
});
document.getElementById('speedo-quick-order-btn')?.addEventListener('click', () => {
  if (isDialogueOpen) return;
  const nextRouteIdx = garageState.stats.deliveriesCompleted % SHIPPER_ROUTES.length;
  startShipperRoute(SHIPPER_ROUTES[nextRouteIdx].id);
});
document.getElementById('speedo-open-garage-btn')?.addEventListener('click', () => {
  if (isDialogueOpen && !isShipperModalOpen) return;
  openShipperModal('garage');
});
document.getElementById('shipper-abort-btn')?.addEventListener('click', () => {
  abortShipperRoute('Đã hủy đơn hàng đang giao.');
});
document.getElementById('headlight-toggle-btn')?.addEventListener('click', togglePlayerHeadlight);
document.getElementById('photo-btn')?.addEventListener('click', captureLandmarkPhoto);
document.getElementById('xoi-cancel-btn')?.addEventListener('click', () => closeXoiMiniGame());

function openDaySummary() {
  isDialogueOpen = true;
  const n = playerState.neighborhood;
  const strongest = Object.entries(n).sort((a, b) => b[1] - a[1])[0];
  const labels = { cohesion: 'Gắn kết', beauty: 'Sạch đẹp', livelihood: 'Sinh kế', heritage: 'Di sản' };
  document.getElementById('summary-title').textContent = `🌙 Tổng kết ngày ${playerState.day}`;
  document.getElementById('summary-content').innerHTML = `
    <div class="summary-row"><span>Nhiệm vụ hoàn thành</span><strong>${playerState.completedQuests.size}</strong></div>
    <div class="summary-row"><span>Việc khu phố hôm nay</span><strong>${playerState.daylife?.completed.length || 0}/4 · ${playerState.daylife?.points || 0} điểm đóng góp còn lại</strong></div>
    <div class="summary-row"><span>Người đã làm quen</span><strong>${visitedNPCs.size}/${QUEST_NPCS.length}</strong></div>
    <div class="summary-row"><span>Ảnh và di sản</span><strong>${playerState.snappedPhotos.size} ảnh · ${playerState.collectedRelics}/${playerState.totalRelics} di sản</strong></div>
    <div class="summary-row"><span>Chương Góc Phố Số 41</span><strong>${Math.min(playerState.streetStoryStep, STREET_STORY_STEPS.length)}/${STREET_STORY_STEPS.length} hạng mục</strong></div>
    <div class="summary-row"><span>Điểm mạnh của khu phố</span><strong>${labels[strongest[0]]} ${Math.round(strongest[1])}</strong></div>
    <div class="summary-row"><span>Lựa chọn tại quán cô Hoa</span><strong>${playerState.teaStallUpgrade === 'green' ? 'Góc xanh' : playerState.teaStallUpgrade === 'heritage' ? 'Kể chuyện di sản' : 'Chưa quyết định'}</strong></div>`;
  document.getElementById('day-summary').classList.remove('hidden');
}

function closeDaySummary() {
  document.getElementById('day-summary').classList.add('hidden');
  isDialogueOpen = false;
}

function startNextDay() {
  playerState.day += 1;
  daylifeController?.dayChanged();
  playerState.time = 7.5;
  playerState.stamina = 100;
  playerGroup.position.set(0, 0, 1.5);
  playerState.isRidingBike = false;
  playerMotorbike.position.set(0, 0, 0.58);
  playerMotorbike.rotation.set(0, Math.PI / 2, 0.065);
  rideMotion.speed = 0;
  rideMotion.heading = Math.PI / 2;
  rideMotion.steer = 0;
  rideMotion.lean = 0;
  closeDaySummary();
  applyTimeOfDay(playerState.time);
  updatePlayerHUD();
  saveGame();
  showToast(`🌤️ Ngày ${playerState.day} bắt đầu. Người dân đã có những câu chuyện mới cho bạn!`);
}

document.getElementById('end-day-btn')?.addEventListener('click', openDaySummary);
document.getElementById('continue-day-btn')?.addEventListener('click', closeDaySummary);
document.getElementById('next-day-btn')?.addEventListener('click', startNextDay);

const _fogColorDay = new THREE.Color(0x334155);
const _fogColorNight = new THREE.Color(0x111c24);
const _sunColorWarm = new THREE.Color(0xffcfa3);
const _sunColorCold = new THREE.Color(0x94a3b8);
let lastClockDisplayStr = '';

function followPlayerShadowArea() {
  if (horrorModeActive) return;
  const x = Math.round(playerGroup.position.x / 8) * 8;
  const z = Math.round(playerGroup.position.z / 8) * 8;
  if (sunLight.target.position.x === x && sunLight.target.position.z === z) return;
  sunLight.position.x += x - sunLight.target.position.x;
  sunLight.position.z += z - sunLight.target.position.z;
  sunLight.target.position.set(x, 0, z);
}

function applyTimeOfDay(hr) {
  const h = Math.floor(hr);
  const m = Math.round((hr - h) * 60);
  const str = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

  const angle = ((hr - 6) / 12) * Math.PI;
  // Follow the playable area instead of rendering shadows over the whole city.
  // Keep light and target offset together so the sun direction stays constant.
  const shadowX = horrorModeActive ? -78 : Math.round(playerGroup.position.x / 8) * 8;
  const shadowZ = horrorModeActive ? -30 : Math.round(playerGroup.position.z / 8) * 8;
  sunLight.position.set(shadowX + Math.cos(angle) * 140, Math.max(Math.sin(angle) * 150, 15), shadowZ + 85);
  const nightVisuals = horrorModeActive || nightAmount(hr)>.5;
  const environments = scene.userData.visualEnvironments;
  if (environments) scene.environment = nightVisuals ? environments.night : environments.day;
  visualMaterials.updateLighting(nightVisuals);
  const shadowExtent = horrorModeActive ? 38 : 65;
  sunLight.target.position.set(shadowX, 0, shadowZ);
  if (sunLight.shadow.camera.right !== shadowExtent) {
    Object.assign(sunLight.shadow.camera, { left: -shadowExtent, right: shadowExtent, top: shadowExtent, bottom: -shadowExtent });
    sunLight.shadow.camera.updateProjectionMatrix();
  }

  const storyTension = horrorModeActive
    ? THREE.MathUtils.clamp(playerState.horrorChapterStage / 5, 0, 1)
    : 0;
  const brightFactor = Number(gameSettings.brightness) || 1.12;
  scene.fog.density = horrorModeActive ? 0.011 + storyTension * 0.003 : 0.0012;
  renderer.toneMappingExposure = (horrorModeActive ? 0.88 - storyTension * 0.06 : 0.98) * brightFactor;

  let periodLabel = 'Nắng Đẹp';
  if (horrorModeActive) {
    scene.fog.color.copy(_fogColorDay).lerp(_fogColorNight, storyTension);
    sunLight.intensity = Math.max(0.55, 0.78 - storyTension * 0.22) * brightFactor;
    sunLight.color.copy(_sunColorWarm).lerp(_sunColorCold, storyTension);
    hemiLight.intensity = Math.max(0.65, 0.85 - storyTension * 0.22) * brightFactor;
    if (skyDomeMesh?.material) skyDomeMesh.material.color.setHex(0x111827);
    if ('environmentIntensity' in scene) scene.environmentIntensity = 0.28;
    periodLabel = 'Mưa Đêm';
  } else if (nightAmount(hr)>.5) {
    scene.fog.color.setHex(0x1e293b);
    sunLight.intensity = 0.78 * brightFactor;
    sunLight.color.setHex(0xb8c7da);
    hemiLight.intensity = 0.65 * brightFactor;
    if (skyDomeMesh?.material) skyDomeMesh.material.color.setHex(0x1e293b);
    if ('environmentIntensity' in scene) scene.environmentIntensity = 0.36;
    periodLabel = 'Chiều Tối';
  } else if (hr >= 16.2) {
    scene.fog.color.setHex(0xfed7aa);
    sunLight.intensity = 2.1 * brightFactor;
    sunLight.color.setHex(0xfb923c);
    hemiLight.intensity = 0.92 * brightFactor;
    if (skyDomeMesh?.material) skyDomeMesh.material.color.setHex(0xfdba74);
    if ('environmentIntensity' in scene) scene.environmentIntensity = 0.58;
    periodLabel = 'Hoàng Hôn';
  } else {
    scene.fog.color.setHex(0xd8ecfa);
    sunLight.intensity = 2.5 * brightFactor;
    sunLight.color.setHex(0xfff8dc);
    hemiLight.intensity = 1.05 * brightFactor;
    if (skyDomeMesh?.material) skyDomeMesh.material.color.setHex(0xffffff);
    if ('environmentIntensity' in scene) scene.environmentIntensity = 0.74;
    periodLabel = 'Nắng Đẹp';
  }

  // Cập nhật vị trí và sắc thái Mặt Trời / Mặt Trăng trên vòm trời
  const skyUd = skyDomeMesh?.userData;
  if (skyUd?.celestialGroup) {
    const orbAngle = horrorModeActive ? Math.PI * 0.72 : angle;
    skyUd.celestialGroup.position.set(
      Math.cos(orbAngle) * 580,
      Math.max(Math.sin(orbAngle) * 520, 75),
      280
    );
    skyUd.celestialGroup.lookAt(0, 0, 0);
    if (horrorModeActive) {
      skyUd.orbCore.material.color.setHex(0xfca5a5);
      skyUd.orbHalo.material.color.setHex(0xef4444);
      skyUd.orbHalo.material.opacity = 0.22;
    } else if (nightAmount(hr)>.5) {
      skyUd.orbCore.material.color.setHex(0xe2e8f0);
      skyUd.orbHalo.material.color.setHex(0x93c5fd);
      skyUd.orbHalo.material.opacity = 0.28;
    } else if (hr >= 16.2) {
      skyUd.orbCore.material.color.setHex(0xffedd5);
      skyUd.orbHalo.material.color.setHex(0xf97316);
      skyUd.orbHalo.material.opacity = 0.48;
    } else {
      skyUd.orbCore.material.color.setHex(0xfffbeb);
      skyUd.orbHalo.material.color.setHex(0xfde047);
      skyUd.orbHalo.material.opacity = 0.36;
    }
  }

  // Độ bóng ướt phản quang của mặt đường nhựa & gạch vỉa hè khi về đêm hoặc trời mưa
  const wetness = horrorModeActive ? 1.0 : THREE.MathUtils.smoothstep(hr, 17.8, 19.5) * 0.45;
  asphaltMaterialList.forEach((mat) => {
    mat.roughness = THREE.MathUtils.lerp(0.76, 0.22, wetness);
    mat.metalness = THREE.MathUtils.lerp(0.08, 0.28, wetness);
  });
  sidewalkMaterialList.forEach((mat) => {
    mat.roughness = THREE.MathUtils.lerp(0.82, 0.32, wetness);
    mat.metalness = THREE.MathUtils.lerp(0.05, 0.18, wetness);
  });

  const fullTimeKey = `${playerState.day}|${str}|${periodLabel}|${horrorModeActive}`;
  if (fullTimeKey !== lastClockDisplayStr) {
    lastClockDisplayStr = fullTimeKey;
    const timeDispEl = document.getElementById('time-display');
    if (timeDispEl) timeDispEl.textContent = `${str} ${periodLabel}`;
    const dayTimeEl = document.getElementById('day-time-pill');
    if (dayTimeEl) {
      dayTimeEl.textContent = horrorModeActive
        ? `🌧️ Đêm Ngõ 41 · 19:41`
        : `🗓️ Ngày ${playerState.day} · ${gameClockLabel(hr)}`;
    }
    const slider = document.getElementById('time-slider');
    if (slider) {
      slider.value = String(hr);
      slider.disabled = horrorModeActive;
    }
  }

  const nightBlend = nightAmount(hr);
  realisticStreetLights.forEach(({ light, bulb }) => {
    if (light) light.intensity = nightBlend * (horrorModeActive ? 7 : 16);
    bulb.material.emissiveIntensity = 0.2 + nightBlend * 2.8;
  });
  if (!headlightManualOverride) setPlayerHeadlight(nightAmount(hr)>.4, false);
  cityLightingBase={sun:sunLight.intensity,hemi:hemiLight.intensity,density:scene.fog.density,fog:scene.fog.color.clone(),sky:skyDomeMesh?.material.color.clone()||new THREE.Color(0xffffff)};
}

document.getElementById('time-slider')?.addEventListener('input', (e) => {
  playerState.time = parseFloat(e.target.value);
  applyTimeOfDay(playerState.time);
  markProgressDirty();
});

applyTimeOfDay(playerState.time);

// ============================================================================
// 8. MINIMAP RADAR & VÒNG LẶP GAME CHÍNH (CẬP NHẬT HÀNH ĐỘNG CỦA 20+ NPC)
// ============================================================================
const minimap = document.getElementById('minimap');
const mctx = minimap.getContext('2d');

function drawMinimap() {
  const w = minimap.width;
  const h = minimap.height;
  mctx.fillStyle = '#0f172a';
  mctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const scale = 1.35;
  const px = playerGroup.position.x;
  const pz = playerGroup.position.z;

  const toMap = (wx, wz) => ({
    x: cx + (wx - px) * scale,
    y: cy + (wz - pz) * scale
  });

  const r1 = toMap(-190, 0);
  const r2 = toMap(170, 0);
  mctx.strokeStyle = '#475569';
  mctx.lineWidth = 12;
  mctx.beginPath();
  mctx.moveTo(r1.x, r1.y);
  mctx.lineTo(r2.x, r2.y);
  mctx.stroke();

  const g1 = toMap(42, -100);
  const g2 = toMap(42, 100);
  mctx.lineWidth = 9;
  mctx.beginPath();
  mctx.moveTo(g1.x, g1.y);
  mctx.lineTo(g2.x, g2.y);
  mctx.stroke();
  for(const area of EAST_PUBLIC_AREAS){const a=toMap(area.minX,area.minZ),b=toMap(area.maxX,area.maxZ);mctx.fillStyle='#36554b';mctx.fillRect(a.x,a.y,b.x-a.x,b.y-a.y);}
  for(const road of DISTRICT_ROADS){
    mctx.strokeStyle='#657b79';mctx.lineWidth=road.width*scale;mctx.beginPath();
    road.points.forEach(([x,z],i)=>{const p=toMap(x,z);if(i)mctx.lineTo(p.x,p.y);else mctx.moveTo(p.x,p.y);});mctx.stroke();
  }
  mctx.font='bold 9px Segoe UI';mctx.fillStyle='#e5d49e';
  for(const place of DISTRICT_PLACES){const p=toMap(place.x,place.z);if(p.x<0||p.y<0||p.x>w||p.y>h)continue;mctx.beginPath();mctx.arc(p.x,p.y,3,0,Math.PI*2);mctx.fill();mctx.fillText(place.name,p.x+5,p.y-5);}

  const s1 = toMap(-15, 0);
  const s2 = toMap(-15, 92);
  mctx.lineWidth = 7;
  mctx.beginPath();
  mctx.moveTo(s1.x, s1.y);
  mctx.lineTo(s2.x, s2.y);
  mctx.stroke();

  // Vẽ Ngõ 41 Phú Thượng và Ngách 41/2 nối Quán Xôi Cô Hòa trên Minimap
  const n1 = toMap(-67, 0);
  const n2 = toMap(-67, -53);
  const ng1 = toMap(-94, -37.5);
  const ng2 = toMap(-67, -37.5);
  mctx.strokeStyle = '#64748b';
  mctx.lineWidth = 6;
  mctx.beginPath();
  mctx.moveTo(n1.x, n1.y);
  mctx.lineTo(n2.x, n2.y);
  mctx.moveTo(ng1.x, ng1.y);
  mctx.lineTo(ng2.x, ng2.y);
  mctx.stroke();

  const drawRect = (wx, wz, rw, rd, color, label) => {
    const p = toMap(wx - rw / 2, wz - rd / 2);
    mctx.fillStyle = color;
    mctx.fillRect(p.x, p.y, rw * scale, rd * scale);
    mctx.fillStyle = '#e2e8f0';
    mctx.font = 'bold 9px "Segoe UI", sans-serif';
    mctx.fillText(label, p.x + 2, p.y + (rd * scale) / 2 + 3);
  };

  drawRect(0, -21, 27, 11, 'rgba(245, 158, 11, 0.45)', 'UBND Phường');
  drawRect(9.5, 20, 27, 13, 'rgba(59, 130, 246, 0.45)', 'THPT Tây Hồ (41)');
  drawRect(-73, -29.2, 8, 9, 'rgba(250, 204, 21, 0.55)', 'Nhà Số 41');
  drawRect(ARCADE_SHOP.x, ARCADE_SHOP.z, ARCADE_SHOP.width, ARCADE_SHOP.depth, 'rgba(205, 167, 86, 0.8)', '♠ Tiệm giải trí');
  drawRect(-90, -42, 9, 7, 'rgba(16, 185, 129, 0.48)', 'Quán Xôi');
  drawRect(64, 22, 26, 12, 'rgba(168, 85, 247, 0.4)', 'TH Tiểu Học');
  drawRect(134, -15, 42, 15, 'rgba(244, 63, 94, 0.42)', 'Chợ Hoa');
  drawRect(134, 22, 48, 25, 'rgba(34, 197, 94, 0.36)', 'Công Viên');
  drawRect(-153, 22, 48, 28, 'rgba(236, 72, 153, 0.38)', 'Vườn Đào');
  drawRect(18.5, -7.2, 8, 5, 'rgba(250, 204, 21, 0.65)', '⚡ Độ Xe');
  drawRect(-26.5, -7.0, 9, 5, 'rgba(234, 88, 12, 0.65)', '🏮 Quán Xôi');
  drawRect(145.2, 24.5, 9, 6, 'rgba(14, 165, 233, 0.6)', '🎣 Câu Cá');
  drawRect(-162.0, 18.0, 9, 8, 'rgba(244, 63, 94, 0.58)', '🌸 Lầu Đào');
  if (activeStreetEvent) {
    const evM = toMap(activeStreetEvent.x, activeStreetEvent.z);
    mctx.beginPath();
    mctx.arc(evM.x, evM.y, 6.0, 0, Math.PI * 2);
    mctx.fillStyle = '#ef4444';
    mctx.fill();
    mctx.lineWidth = 2;
    mctx.strokeStyle = '#fde047';
    mctx.stroke();
  }
  if (activeShipperRun) {
    const cp = activeShipperRun.route.checkpoints[activeShipperRun.cpIndex];
    if (cp) {
      const m = toMap(cp.x, cp.z);
      mctx.save();
      mctx.strokeStyle = '#38bdf8';
      mctx.lineWidth = 2.2;
      mctx.setLineDash([4, 3]);
      mctx.beginPath();
      mctx.moveTo(cx, cy);
      mctx.lineTo(m.x, m.y);
      mctx.stroke();
      mctx.restore();
      mctx.beginPath();
      mctx.arc(m.x, m.y, 6.2, 0, Math.PI * 2);
      mctx.fillStyle = '#0ea5e9';
      mctx.fill();
      mctx.lineWidth = 2;
      mctx.strokeStyle = '#fde047';
      mctx.stroke();
    }
  }
  if(gameSettings.showWaypoints!==false){
    const target=getActiveGuidanceTarget();
    if(target&&(target.z<-55||target.z>55||target.x>162||target.x<-182||playerGroup.position.z<-55||playerGroup.position.z>55||playerGroup.position.x>162||playerGroup.position.x<-182)){
      const path=guidancePath(target);mctx.save();mctx.strokeStyle='#b8dfb8';mctx.lineWidth=2;mctx.setLineDash([4,3]);mctx.beginPath();mctx.moveTo(cx,cy);
      for(const point of path){const p=toMap(point.x,point.z);mctx.lineTo(p.x,p.y);}mctx.stroke();mctx.restore();
    }
  }

  // Vẽ đường dẫn GPS & điểm mục tiêu Cốt Truyện Đơn Hàng Số 41 trên Minimap
  horrorChapterEvents.forEach((marker) => {
    if (!marker.visible) return;
    const m = toMap(marker.position.x, marker.position.z);
    if (gameSettings.showWaypoints !== false) {
      mctx.save();
      mctx.strokeStyle = '#facc15';
      mctx.lineWidth = 2;
      mctx.setLineDash([4, 3]);
      mctx.beginPath();
      mctx.moveTo(cx, cy);
      mctx.lineTo(m.x, m.y);
      mctx.stroke();
      mctx.restore();
    }
    mctx.beginPath();
    mctx.arc(m.x, m.y, 5.5, 0, Math.PI * 2);
    mctx.fillStyle = '#ef4444';
    mctx.fill();
    mctx.lineWidth = 2;
    mctx.strokeStyle = '#fde047';
    mctx.stroke();
  });

  // Vẽ các Ngôi Sao Di Sản chưa nhặt màu vàng ngọc trên Minimap
  heritageRelics.forEach((rel) => {
    if (rel.userData.collected) return;
    const m = toMap(rel.position.x, rel.position.z);
    mctx.beginPath();
    mctx.arc(m.x, m.y, 3.0, 0, Math.PI * 2);
    mctx.fillStyle = '#fde047';
    mctx.fill();
  });

  streetStoryEvents.forEach((marker) => {
    if (!marker.visible) return;
    const m = toMap(marker.position.x, marker.position.z);
    mctx.save();
    mctx.translate(m.x, m.y);
    mctx.rotate(Math.PI / 4);
    mctx.fillStyle = '#38bdf8';
    mctx.fillRect(-4, -4, 8, 8);
    mctx.restore();
  });

  // Vẽ các NPC phụ màu xanh lá nhạt trên Minimap (Cô Gánh Xôi màu hồng cam nổi bật)
  dynamicWalkers.forEach((dw) => {
    if (dw.isQuestNPC) return;
    const m = toMap(dw.group.position.x, dw.group.position.z);
    mctx.beginPath();
    mctx.arc(m.x, m.y, dw.isXoiVendor ? 4.0 : 2.5, 0, Math.PI * 2);
    mctx.fillStyle = dw.isXoiVendor ? '#f97316' : '#94a3b8';
    mctx.fill();
  });

  // Vẽ 5 NPC Nhiệm vụ chính
  npcList.forEach((npc) => {
    const m = toMap(npc.position.x, npc.position.z);
    mctx.beginPath();
    mctx.arc(m.x, m.y, 4.5, 0, Math.PI * 2);
    mctx.fillStyle = visitedNPCs.has(npc.userData.id) ? '#10b981' : '#fbbf24';
    mctx.fill();
  });

  mctx.save();
  mctx.translate(cx, cy);
  mctx.rotate(minimapHeadingAngle(playerState.isRidingBike?rideMotion.heading:playerGroup.rotation.y));
  mctx.fillStyle = '#38bdf8';
  mctx.beginPath();
  mctx.moveTo(0, -7);
  mctx.lineTo(-5, 6);
  mctx.lineTo(5, 6);
  mctx.closePath();
  mctx.fill();
  mctx.restore();
}

function lerpAngle(current, target, t) {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * Math.min(1, t);
}

function angleDifference(from, to) {
  let diff = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function smoothValue(current, target, rate, delta) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-rate * delta));
}

function spinMotorbikeWheels(bike, distance) {
  const rotation = distance / 0.26;
  bike.userData.wheels?.forEach((wheelPivot) => {
    wheelPivot.rotation.z -= rotation;
  });
}

function applyPlayerRidingPose(delta, elapsed) {
  const ridingBlend = playerState.isRidingBike ? 1 : 0;
  if(playerModel?.userData.helmet)playerModel.userData.helmet.visible=!!ridingBlend;
  const braking=!!ridingBlend&&(keys.space||keys.s||(!keys.w&&Math.abs(rideMotion.speed)>.8));
  updateBikeSignals(playerBikeMesh,braking,ridingBlend?rideMotion.steer:0,elapsed);
  playerRideLegs.visible = playerState.isRidingBike;
  playerRideLegs.rotation.z = -rideMotion.lean * 1.08;
  if (playerState.isRidingBike) {
    playerMotorbike.position.x = playerGroup.position.x;
    playerMotorbike.position.z = playerGroup.position.z;
    playerMotorbike.rotation.y = playerGroup.rotation.y;
  }
  const bikeGroundY = getGroundElevationAt(playerMotorbike.position.x, playerMotorbike.position.z);
  const bikeVibrationY = playerState.isRidingBike
    ? Math.sin(elapsed * 10) * Math.min(Math.abs(rideMotion.speed) / 18, 1) * 0.012
    : 0;
  playerMotorbike.position.y = smoothValue(
    playerMotorbike.position.y,
    bikeGroundY + bikeVibrationY,
    18,
    delta
  );
  const bikeLeanTarget = playerState.isRidingBike ? -rideMotion.lean : 0.065;
  playerMotorbike.rotation.z = smoothValue(playerMotorbike.rotation.z, bikeLeanTarget, 10, delta);
  playerBikeMesh.userData.steering.rotation.y = smoothValue(
    playerBikeMesh.userData.steering.rotation.y,
    rideMotion.steer * 0.34,
    12,
    delta
  );
  updatePlayerRideArms();

  if (!playerModel) return;
  playerModel.position.y = smoothValue(playerModel.position.y, playerModelBaseY + ridingBlend * 0.12, 12, delta);
  playerModel.position.z = smoothValue(playerModel.position.z, ridingBlend * 0.07, 12, delta);
  playerModel.rotation.x = smoothValue(playerModel.rotation.x, ridingBlend * 0.035, 10, delta);
  const targetModelBank = playerState.isRidingBike ? -rideMotion.lean * 1.16 : -headIKState.bodyBank * 0.55;
  playerModel.rotation.z = smoothValue(playerModel.rotation.z, targetModelBank, 11, delta);
  const posedBones = [
    'hips', 'spine', 'chest', 'upperLeg.L', 'upperLeg.R', 'lowerLeg.L', 'lowerLeg.R',
    'upperArm.L', 'upperArm.R', 'lowerArm.L', 'lowerArm.R'
  ];
  if (!playerState.isRidingBike) {
    if (applyPlayerRidingPose.wasRiding) {
      posedBones.forEach((name) => {
        const bone = playerBones[name];
        const rest = playerBoneRest[name];
        if (bone && rest) bone.quaternion.copy(rest);
      });
      ['upperArm.L', 'upperArm.R'].forEach((name) => {
        const bone = playerBones[name];
        const restScale = playerBoneRestScale[name];
        if (bone && restScale) bone.scale.copy(restScale);
      });
      applyPlayerRidingPose.wasRiding = false;
    }
    return;
  }
  applyPlayerRidingPose.wasRiding = true;
  ['upperArm.L', 'upperArm.R'].forEach((name) => {
    const bone = playerBones[name];
    if (bone) bone.scale.setScalar(0.001);
  });

  const ridingAxis = new THREE.Vector3(1, 0, 0);
  const ridingOffset = new THREE.Quaternion();
  const poseX = (name, angle) => {
    const bone = playerBones[name];
    const rest = playerBoneRest[name];
    if (bone && rest) bone.quaternion.copy(rest).multiply(ridingOffset.setFromAxisAngle(ridingAxis, angle));
  };
  poseX('hips', 0.02);
  poseX('spine', 0.025);
  poseX('chest', 0.025);
  poseX('upperLeg.L', 1.08);
  poseX('upperLeg.R', 1.08);
  poseX('lowerLeg.L', -1.36);
  poseX('lowerLeg.R', -1.36);
  poseX('upperArm.L', 1.34 + rideMotion.steer * 0.07);
  poseX('upperArm.R', 1.34 - rideMotion.steer * 0.07);
  poseX('lowerArm.L', -0.68);
  poseX('lowerArm.R', -0.68);
  const torsoLean = -rideMotion.lean;
  const applyBodyLean = (name, amount) => {
    const bone = playerBones[name];
    if (bone) bone.rotateZ(torsoLean * amount);
  };
  applyBodyLean('hips', 0.34);
  applyBodyLean('spine', 0.28);
  applyBodyLean('chest', 0.22);
}

const trafficPoint = new THREE.Vector3();
const trafficTangent = new THREE.Vector3();
const trafficLookAhead = new THREE.Vector3();
function updateBikeSignals(bike,braking,turn,elapsed){
  if(bike.userData.tailLightMesh)bike.userData.tailLightMesh.material.emissiveIntensity=braking?2.2:.35;
  const on=Math.abs(turn)>.12&&Math.sin(elapsed*Math.PI*3)>0;
  for(const {lens,side} of bike.userData.indicators||[])lens.material.emissiveIntensity=on&&side===Math.sign(turn)?2.4:0;
}
const streetObstacles=[];
const singleTrafficObstacle=[{x:0,z:0,radius:0,lateralRadius:0}];
const junctionOwners=new Map(),junctionSince=new Map(),junctionYieldUntil=new Map();
function updateStreetTraffic(delta, elapsed) {
  for(const [index,id] of junctionOwners){const j=TRAFFIC_JUNCTIONS[index],v=animatedTraffic.find(a=>a.id===id);if(!v||v.pursuing||Math.hypot(v.mesh.position.x-j.x,v.mesh.position.z-j.z)>14)junctionOwners.delete(index);else if(v.currentSpeed<.1&&elapsed-(junctionSince.get(index)||0)>5&&Math.hypot(v.mesh.position.x-j.x,v.mesh.position.z-j.z)>7){junctionYieldUntil.set(index+':'+id,elapsed+3);junctionOwners.delete(index);}}

  streetObstacles.length=0;
  streetObstacles.push({x:playerGroup.position.x,z:playerGroup.position.z,radius:playerState.isRidingBike?.9:.42});
  if(!playerState.isRidingBike)streetObstacles.push({x:playerMotorbike.position.x,z:playerMotorbike.position.z,radius:.85});
  for(const walker of dynamicWalkers)if(walker.group.visible)streetObstacles.push({x:walker.group.position.x,z:walker.group.position.z,radius:.38});
  for(const officer of policeController?.officers||[])if(officer.group.visible)streetObstacles.push({x:officer.group.position.x,z:officer.group.position.z,radius:.38});
  animatedTraffic.forEach((vehicle) => {
    if(vehicle.pursuing)return;
    vehicle.route.getPointAt(vehicle.progress,trafficPoint);
    vehicle.route.getTangentAt(vehicle.progress,trafficTangent).normalize();
    let gap=forwardClearance(trafficPoint.x,trafficPoint.z,trafficTangent.x,trafficTangent.z,streetObstacles,vehicle.kind==='bus'?1.18:vehicle.kind==='car'?.98:.5,vehicle.kind==='bus'?3.6:vehicle.kind==='car'?2.18:1.12);
    for(const other of animatedTraffic){
      if(other===vehicle)continue;
      const otherPosition=other.mesh.position;
      const alignment=Math.cos(other.yaw)*trafficTangent.x-Math.sin(other.yaw)*trafficTangent.z;
      const close=Math.hypot(otherPosition.x-trafficPoint.x,otherPosition.z-trafficPoint.z)<3.5;
      const obstacle=singleTrafficObstacle[0];obstacle.x=otherPosition.x;obstacle.z=otherPosition.z;obstacle.radius=other.kind==='bus'?3.6:other.kind==='car'?2.2:.65;obstacle.lateralRadius=other.kind==='bus'?1.18:other.kind==='car'?1.02:.45;
      // Stable junction priority prevents two crossing streams waiting forever.
      if(other.route===vehicle.route||alignment>.65||close||vehicle.id>other.id)gap=Math.min(gap,forwardClearance(trafficPoint.x,trafficPoint.z,trafficTangent.x,trafficTangent.z,singleTrafficObstacle,vehicle.kind==='bus'?1.2:vehicle.kind==='car'?.95:.55,vehicle.kind==='bus'?3.6:vehicle.kind==='car'?2.18:1.12));
      if(other.route===vehicle.route){const ahead=(other.progress-vehicle.progress+1)%1;if(ahead>0&&ahead<.1)gap=Math.min(gap,Math.max(0,ahead*vehicle.routeLength-(other.kind==='bus'?7.4:other.kind==='car'?4.2:2.3)));}
    }
    TRAFFIC_JUNCTIONS.forEach((j,index)=>{
      const dx=j.x-trafficPoint.x,dz=j.z-trafficPoint.z,distance=Math.hypot(dx,dz),approaching=dx*trafficTangent.x+dz*trafficTangent.z>0;
      if(distance<13&&approaching){
        if(!junctionOwners.has(index)&&elapsed>(junctionYieldUntil.get(index+':'+vehicle.id)||0)){junctionOwners.set(index,vehicle.id);junctionSince.set(index,elapsed);}
        if(junctionOwners.get(index)!==vehicle.id)gap=Math.min(gap,Math.max(0,distance-8));
      }
    });
    const roadRhythm=.96+Math.sin(elapsed*.48+vehicle.phase)*.04;
    vehicle.route.getTangentAt((vehicle.progress+5/vehicle.routeLength)%1,trafficLookAhead).normalize();
    const curvature=trafficTangent.angleTo(trafficLookAhead);
    const cruise=Math.min(vehicle.cruiseSpeed*roadRhythm,curvature>.5?1.8:curvature>.15?3.3:Infinity);
    if(vehicle.kind==='bus'){
      vehicle.dwell=Math.max(0,vehicle.dwell-delta);
      vehicle.busStops.forEach((stop,i)=>{const ahead=(stop.progress-vehicle.progress+1)%1*vehicle.routeLength;if(i===vehicle.lastStop){if(ahead>14&&ahead<vehicle.routeLength-14)vehicle.lastStop=-1;return;}if(ahead<18)gap=Math.min(gap,Math.max(0,ahead+0.7));if(ahead<.55&&vehicle.dwell===0){vehicle.dwell=8;vehicle.lastStop=i;}});
      if(vehicle.dwell>0)gap=0;
      vehicle.mesh.userData.doors.position.x=smoothValue(vehicle.mesh.userData.doors.position.x,vehicle.dwell>0?2.55:2.05,4,delta);
      vehicle.mesh.userData.doors.position.z=smoothValue(vehicle.mesh.userData.doors.position.z,vehicle.dwell>0?-1.27:-1.15,4,delta);
    }
    const step=trafficStep(vehicle.currentSpeed,cruise,gap,delta);
    vehicle.currentSpeed=step.speed;
    const candidateProgress=(vehicle.progress+step.distance/vehicle.routeLength)%1;
    vehicle.route.getPointAt(candidateProgress,trafficPoint);
    vehicle.route.getTangentAt(candidateProgress,trafficTangent).normalize();
    const candidateYaw=Math.atan2(-trafficTangent.z,trafficTangent.x);
    const candidate={x:trafficPoint.x,z:trafficPoint.z,yaw:candidateYaw,kind:vehicle.kind};
    // No priority exception may allow physical bodies to intersect. New routes
    // share junctions; their progress values are not comparable.
    const occupied=animatedTraffic.some(other=>other!==vehicle&&trafficBodiesOverlap(candidate,{x:other.mesh.position.x,z:other.mesh.position.z,yaw:other.yaw,kind:other.kind}));
    if(occupied){step.distance=0;step.speed=0;step.braking=true;vehicle.currentSpeed=0;}
    else vehicle.progress=candidateProgress;
    vehicle.route.getPointAt(vehicle.progress,trafficPoint);
    vehicle.route.getTangentAt(vehicle.progress,trafficTangent).normalize();
    const targetYaw=Math.atan2(-trafficTangent.z,trafficTangent.x);
    vehicle.route.getTangentAt((vehicle.progress+8/vehicle.routeLength)%1,trafficLookAhead).normalize();
    const turnAhead=angleDifference(targetYaw,Math.atan2(-trafficLookAhead.z,trafficLookAhead.x));
    // Avoid a visible 180-degree swivel on the first frame.
    if(!vehicle.initialized){vehicle.yaw=targetYaw;vehicle.initialized=true;}
    const curveAmount=angleDifference(vehicle.yaw,targetYaw);
    vehicle.yaw=targetYaw;
    const moving=Math.min(1,step.speed/3);
    vehicle.lean=smoothValue(vehicle.lean,THREE.MathUtils.clamp(curveAmount*1.45,-.32,.32)*moving,7,delta);
    vehicle.mesh.position.set(trafficPoint.x,getGroundElevationAt(trafficPoint.x,trafficPoint.z)+.02+Math.sin(elapsed*9+vehicle.phase)*.004*moving,trafficPoint.z);
    vehicle.mesh.rotation.y=vehicle.yaw;vehicle.mesh.rotation.x=vehicle.kind==='car'||vehicle.kind==='bus'?vehicle.lean*.12:vehicle.lean;
    vehicle.mesh.visible=detailVisibility(vehicle.mesh.visible,Math.hypot(trafficPoint.x-playerGroup.position.x,trafficPoint.z-playerGroup.position.z),170,200);
    if(vehicle.kind==='car'||vehicle.kind==='bus'){
      vehicle.mesh.userData.policeBeacons?.forEach((mat,i)=>mat.emissiveIntensity=activeStreetEvent?.template.id==='thief_chase'||policeController?.state.stage!=='patrol'?((Math.floor(elapsed*3)+i)%2?1.6:.1):.08);
      for(const wheel of vehicle.mesh.userData.wheels)wheel.rotation.z-=step.distance/(vehicle.kind==='bus'?.46:.36);
    }else{
      vehicle.mesh.userData.steering.rotation.y=THREE.MathUtils.clamp(curveAmount*.55,-.42,.42);
      updateBikeSignals(vehicle.mesh,step.braking,turnAhead,elapsed);spinMotorbikeWheels(vehicle.mesh,step.distance);
    }
  });
}

let isSprintingState = false;
let lastHudStam = -1;
let clockHudAccumulator = 0;
let lastLightingClockStep=Math.floor(playerState.time*12);
let autosaveAccumulator = 0;
let minimapAccumulator = 0;
let duskNotifiedDay = 0;
let frameSamples = [];
let cpuFrameSamples = [];
let frameStatsAccumulator = 0;
let smoothedDelta = 1 / 60;
let landingImpactDip = 0;
let lastInteractLabelText = '';
let lastInteractHidden = true;
const _tmpDesiredCamPos = new THREE.Vector3();
const _tmpDesiredCamLook = new THREE.Vector3();
const clock = new THREE.Clock();

// Chống Camera TPS xuyên tường / tòa nhà (Spring-Arm Raycast 2D siêu nhẹ trên tập boxColliders)
function constrainCameraFraction(startX, startZ, endX, endZ) {
  const radius = Math.max(Math.abs(endX - startX), Math.abs(endZ - startZ)) / 2 + .28;
  boxCollisionGrid.query((startX + endX) / 2, (startZ + endZ) / 2, radius, nearbyCameraBoxes);
  return cameraObstructionFraction(startX, startZ, endX, endZ, boxColliders, nearbyCameraBoxes);
}

function animate() {
  requestAnimationFrame(animate);
  if (document.hidden) {
    clock.getDelta();
    return;
  }
  const frameStart=performance.now();
  const rawDelta = clock.getDelta();
  const clampedDelta = Math.min(rawDelta > 0 ? rawDelta : 1 / 60, 0.055);
  smoothedDelta = THREE.MathUtils.lerp(smoothedDelta, clampedDelta, 0.42);
  const delta = smoothedDelta;
  const elapsed = clock.elapsedTime;
  clockHudAccumulator+=Math.min(rawDelta,.25);
  if(clockHudAccumulator>=1){
    if(!horrorModeActive&&!isDialogueOpen)Object.assign(playerState,advanceCityClock(playerState.day,playerState.time,clockHudAccumulator));
    clockHudAccumulator=0;
    const pill=document.getElementById('day-time-pill');
    if(pill)pill.textContent=horrorModeActive?`🌧️ Đêm Ngõ 41 · ${gameClockLabel(playerState.time)}`:`🗓️ Ngày ${playerState.day} · ${gameClockLabel(playerState.time)}`;
    const lightingStep=Math.floor(playerState.time*12);
    if(lightingStep!==lastLightingClockStep){lastLightingClockStep=lightingStep;applyTimeOfDay(playerState.time);}
  }
  if (rawDelta > 0 && rawDelta < 1) frameSamples.push(rawDelta * 1000);
  frameStatsAccumulator += rawDelta;
  if (frameStatsAccumulator >= 3 && frameSamples.length) {
    const sorted = frameSamples.slice().sort((a, b) => a - b);
    const cpuSorted=cpuFrameSamples.slice().sort((a,b)=>a-b);
    const cpuP95=cpuSorted[Math.min(cpuSorted.length-1,Math.floor(cpuSorted.length*.95))]??0;
    const average = frameSamples.reduce((sum, value) => sum + value, 0) / frameSamples.length;
    const readout = document.getElementById('performance-readout');
    if (readout) {
      readout.textContent = `${Math.round(1000 / average)} FPS · khung chậm p95 ${Math.round(sorted[Math.floor(sorted.length * .95)])} ms · ${renderer.info.render.calls} lượt vẽ · CPU p95 ${cpuP95.toFixed(1)} ms · DPR ${renderer.getPixelRatio().toFixed(2)}`;
    }
    if(browserPlaytest)document.getElementById('interact-prompt').dataset.performance=JSON.stringify({at:performance.now(),fps:1000/average,cpuP95,p95:sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))],calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,dpr:renderer.getPixelRatio()});
    frameSamples = [];cpuFrameSamples=[];
    frameStatsAccumulator = 0;
  }

  autosaveAccumulator += delta;
  if (autosaveAccumulator >= 15) {
    autosaveAccumulator = 0;
    saveGame();
  }

  let moveX = 0;
  let moveZ = 0;
  if (!isDialogueOpen) {
    if (keys.w) moveZ += 1;
    if (keys.s) moveZ -= 1;
    if (keys.a) moveX += 1;
    if (keys.d) moveX -= 1;
  }
  if (horrorModeActive && keys.q && !isDialogueOpen) {
    moveX = 0;
    moveZ = 0;
    storyComposure = Math.min(100, storyComposure + delta * 16);
    storyNoise = Math.max(0, storyNoise - delta * 55);
  }

  const isMoving = moveX !== 0 || moveZ !== 0;

  // Hysteresis chống nhấp nháy Walk <-> Run khi thanh Stamina cạn về 0
  if (!keys.shift || !isMoving) {
    isSprintingState = false;
  } else if (!isSprintingState && playerState.stamina >= 15) {
    isSprintingState = true;
  } else if (isSprintingState && playerState.stamina <= 0.5) {
    isSprintingState = false;
  }
  const canSprint = isSprintingState;

  if (playerState.isRidingBike) {
    footVelX = 0;
    footVelZ = 0;
    const throttle = keys.w && !keys.s ? 1 : keys.s && !keys.w ? -1 : 0;
    const steerInput = (keys.a ? 1 : 0) - (keys.d ? 1 : 0);
    const bikeMeta = BIKE_CATALOG[garageState.equippedBike] || BIKE_CATALOG.wave_red;
    const brakeHeld=keys.space&&!isDialogueOpen;
    const wantsNitro = !isDialogueOpen && throttle > 0 && keys.shift && !brakeHeld;
    if (wantsNitro && nitroFuel > 2) {
      isNitroBoosting = true;
      const drainRate = Math.max(10, 22 - garageState.upgrades.nitro * 4.2);
      nitroFuel = Math.max(0, nitroFuel - drainRate * delta);
    } else {
      isNitroBoosting = false;
      const petNitroBonus = garageState.equippedPet === 'shiba_shipper' ? 1.25 : 1.0;
      const rechargeRate = (9 + garageState.upgrades.nitro * 4.5) * petNitroBonus;
      nitroFuel = Math.min(100, nitroFuel + rechargeRate * delta);
    }

    const forwardLimit = getBikeMaxForwardSpeed(isNitroBoosting);
    const targetSpeed = throttle > 0 ? forwardLimit : throttle < 0 ? -5.8 : 0;
    const changingDirection = targetSpeed !== 0 && Math.sign(targetSpeed) !== Math.sign(rideMotion.speed);
    const baseAccel = 2.25 * bikeMeta.accelMult * (1 + garageState.upgrades.engine * 0.12) * (isNitroBoosting ? 1.85 : 1);
    const speedRate = changingDirection ? 8.0 : targetSpeed === 0 ? 2.8 : baseAccel;
    // Brake against real frame time: capped/smoothed movement time made braking
    // visibly sluggish when frame rate dropped. Never carry a hidden-tab pause.
    rideMotion.speed = brakeHeld?brakeBikeSpeed(rideMotion.speed,Math.min(rawDelta,.25)):smoothValue(rideMotion.speed, targetSpeed, speedRate, delta);
    const brakeStatus=document.getElementById('speedo-brake-status');
    if(brakeStatus){brakeStatus.textContent=brakeHeld?'PHANH ●':'Space: phanh · Y: dẫn đường · Tab: chuột';brakeStatus.classList.toggle('braking',brakeHeld);}
    if (Math.abs(rideMotion.speed) < 0.035) rideMotion.speed = 0;

    // Shift boosts; Space always brakes and cancels boost, including W+Shift+Space.
    playerNitroFlameGroup.visible = isNitroBoosting && rideMotion.speed > 4.0;
    if (playerNitroFlameGroup.visible) {
      const flamePulse = 0.85 + Math.sin(elapsed * 42) * 0.28 + garageState.upgrades.nitro * 0.18;
      playerNitroFlameGroup.scale.set(flamePulse, 1, 1);
    }
    const targetWheeliePitch = 0;
    playerBikeMesh.rotation.z = smoothValue(playerBikeMesh.rotation.z || 0, targetWheeliePitch, 9, delta);

    // Hiệu ứng FOV Speed Warp tạo cảm giác phóng xe tốc độ cao cực phê
    const baseFov = Number(gameSettings.fov) || 65;
    const speedFovBoost = isNitroBoosting
      ? Math.min(10, (Math.abs(rideMotion.speed) / 26) * 9.5)
      : Math.min(4, (Math.abs(rideMotion.speed) / 22) * 3.5);
    const desiredFov = baseFov + speedFovBoost;
    if (Math.abs(camera.fov - desiredFov) > 0.15) {
      camera.fov = smoothValue(camera.fov, desiredFov, 8, delta);
      camera.updateProjectionMatrix();
    }

    rideMotion.steer = smoothValue(rideMotion.steer, steerInput, steerInput === 0 ? 7.5 : 10, delta);
    const absoluteSpeed = Math.abs(rideMotion.speed);
    const turnStrength = Number(gameSettings.turnFollowStrength) || 1.0;
    if (absoluteSpeed > 0.12) {
      const speedRatio = THREE.MathUtils.clamp(absoluteSpeed / 18.5, 0, 1);
      const steeringRate = THREE.MathUtils.lerp(0.65, 1.85, speedRatio);
      const directionSign = Math.sign(rideMotion.speed);
      const headingDelta = rideMotion.steer * steeringRate * directionSign * delta;
      rideMotion.heading += headingDelta;

      // Khi đánh lái rẽ xe máy (A/D), đầu nhân vật & góc nhìn Camera tự động xoay mượt theo hướng rẽ!
      if (gameSettings.autoTurnHead !== false) {
        targetCamYaw += headingDelta * Math.min(1.3, 0.96 * turnStrength);
        if (directionSign > 0 && !isDraggingMouse) {
          const bikeLookAheadYaw = rideMotion.heading + rideMotion.steer * 0.24;
          targetCamYaw = lerpAngle(targetCamYaw, bikeLookAheadYaw, delta * 2.4 * turnStrength);
        }
      }
    } else if (steerInput !== 0 && gameSettings.autoTurnHead !== false) {
      // Ngay cả khi dừng xe ở ngã ba, bấm A/D vẫn quay đầu & ghi-đông để quan sát hai bên đường
      targetCamYaw += steerInput * 1.35 * turnStrength * delta;
    }

    const previousX = playerGroup.position.x;
    const previousZ = playerGroup.position.z;
    const intendedDistance = rideMotion.speed * delta;
    const collisionSteps = Math.max(1, Math.ceil(Math.abs(intendedDistance) / 0.16));
    const stepDistance = intendedDistance / collisionSteps;
    let bikeBlocked = false;
    for (let stepIndex = 0; stepIndex < collisionSteps; stepIndex++) {
      const stepStartX = playerGroup.position.x;
      const stepStartZ = playerGroup.position.z;
      playerGroup.position.x += Math.sin(rideMotion.heading) * stepDistance;
      playerGroup.position.z += Math.cos(rideMotion.heading) * stepDistance;
      constrainDistrictPosition(playerGroup.position);
      resolvePlayerCollisions(playerGroup.position, 0.62);
      const forwardProgress = (
        (playerGroup.position.x - stepStartX) * Math.sin(rideMotion.heading) +
        (playerGroup.position.z - stepStartZ) * Math.cos(rideMotion.heading)
      ) * Math.sign(stepDistance || 1);
      if (forwardProgress < Math.abs(stepDistance) * 0.3) {
        bikeBlocked = true;
        break;
      }
    }

    const travelled = Math.hypot(playerGroup.position.x - previousX, playerGroup.position.z - previousZ);
    if (bikeBlocked) {
      if (activeShipperRun && absoluteSpeed > 9.5) {
        const armorFactor = Math.max(0.25, 1 - garageState.upgrades.cargo * 0.25);
        activeShipperRun.cargoHealth = Math.max(25, activeShipperRun.cargoHealth - 4.5 * armorFactor);
        activeShipperRun.combo = Math.max(1.0, Number((activeShipperRun.combo - 0.3).toFixed(2)));
      }
      rideMotion.speed *= 0.22;
    } else if (absoluteSpeed > 8.8 && !horrorModeActive) {
      // Kiểm tra Lách Xe Sát Sạt (Near-Miss Stunt) qua xe máy giao thông & người đi bộ trên phố
      animatedTraffic.forEach((veh, vIdx) => {
        const d = Math.hypot(playerGroup.position.x - veh.mesh.position.x, playerGroup.position.z - veh.mesh.position.z);
        const key = `veh_${vIdx}`;
        if (d < 2.75 && d > 0.85 && (elapsed - (nearMissCooldownMap.get(key) || -10)) > 4.2) {
          nearMissCooldownMap.set(key, elapsed);
          const stuntCash = 2000 + garageState.upgrades.neon * 1000;
          nitroFuel = Math.min(100, nitroFuel + 18);
          if (activeShipperRun) {
            activeShipperRun.combo = Math.min(3.5, Number((activeShipperRun.combo + 0.25).toFixed(2)));
            activeShipperRun.maxCombo = Math.max(activeShipperRun.maxCombo, activeShipperRun.combo);
            activeShipperRun.nearMissCount += 1;
          }
          playerState.coins += stuntCash;
          updatePlayerHUD();
          playSoundEffect('coin');
          triggerStuntBanner(`⚡ LÁCH XE SIÊU ĐẲNG! +${stuntCash.toLocaleString('vi-VN')}đ · +18% NITRO${activeShipperRun ? ` · COMBO x${activeShipperRun.combo.toFixed(1)}` : ''}`);
        }
      });
    }
    rideMotion.lean = smoothValue(
      rideMotion.lean,
      THREE.MathUtils.clamp(rideMotion.steer * absoluteSpeed / 42, -0.3, 0.3),
      8,
      delta
    );
    spinMotorbikeWheels(playerBikeMesh, travelled * Math.sign(rideMotion.speed || 1));
    playerGroup.rotation.y = lerpAngle(playerGroup.rotation.y, rideMotion.heading, delta * 12);
    playerState.stamina = Math.min(100, playerState.stamina + delta * 8);
    if (isGrounded) setPlayerAnimation('idle');
  } else if (activePropSession) {
    // Đang tương tác trực tiếp trên thiết bị Công viên (Đánh Xích đu, Chơi Bập bênh, Trượt Cầu trượt, Tập thể dục, Ngồi ghế / Cờ tướng)
    footVelX = 0;
    footVelZ = 0;
    playerState.stamina = Math.min(100, playerState.stamina + delta * 24);
  } else {
    // Đi bộ / chạy bộ với quán tính phản hồi cực nhạy (zero input lag) & trượt tường mượt mà
    // Ở góc nhìn thứ nhất (FPS), phím A/D dùng để bước ngang (Strafe trái/phải) chuẩn FPS — tuyệt đối KHÔNG tự xoay targetCamYaw gây quay vòng tròn tại chỗ!
    if (
      camMode === 'tps' &&
      isMoving &&
      moveZ > 0 &&
      moveX !== 0 &&
      !horrorModeActive &&
      gameSettings.autoTurnHead !== false &&
      !isDraggingMouse &&
      document.pointerLockElement !== renderer.domElement
    ) {
      const turnStrength = Number(gameSettings.turnFollowStrength) || 1.0;
      targetCamYaw += moveX * (canSprint ? 0.65 : 0.48) * turnStrength * delta;
    }

    const moveAngle = Math.atan2(moveX, moveZ) + camYaw;
    let targetSpeed = 0;
    if (isMoving) {
      desiredFootBodyYaw = camMode === 'fps' ? camYaw : moveAngle;
      targetSpeed = canSprint ? 9.6 : 5.2;
      if (canSprint) {
        playerState.stamina = Math.max(0, playerState.stamina - delta * 8);
      } else {
        playerState.stamina = Math.min(100, playerState.stamina + delta * 10);
      }
    } else {
      playerState.stamina = Math.min(100, playerState.stamina + delta * 14);
    }

    const targetVx = isMoving ? Math.sin(moveAngle) * targetSpeed : 0;
    const targetVz = isMoving ? Math.cos(moveAngle) * targetSpeed : 0;
    const accelRate = isMoving ? 17.5 : 20.0;
    footVelX = smoothValue(footVelX, targetVx, accelRate, delta);
    footVelZ = smoothValue(footVelZ, targetVz, accelRate, delta);

    const prevFootX = playerGroup.position.x;
    const prevFootZ = playerGroup.position.z;
    const currentFootSpeed = Math.hypot(footVelX, footVelZ);
    if (currentFootSpeed > 0.02) {
      playerGroup.position.x += footVelX * delta;
      playerGroup.position.z += footVelZ * delta;
      constrainDistrictPosition(playerGroup.position);
    }

    if(!horrorModeActive)constrainPedestrian(playerGroup.position,{x:prevFootX,z:prevFootZ});
    // Kiểm tra va chạm vật lý & trượt mượt dọc tường không bị mắc kẹt vận tốc
    resolvePlayerCollisions(playerGroup.position, 0.46);
    if (horrorModeActive) constrainNightPosition(playerGroup.position);

    if (delta > 0.001) {
      const actualVx = (playerGroup.position.x - prevFootX) / delta;
      const actualVz = (playerGroup.position.z - prevFootZ) / delta;
      footVelX = THREE.MathUtils.lerp(footVelX, actualVx, 0.55);
      footVelZ = THREE.MathUtils.lerp(footVelZ, actualVz, 0.55);
    }

    if (camMode === 'fps') {
      desiredFootBodyYaw = camYaw;
      playerGroup.rotation.y = camYaw;
    } else if (isMoving) {
      const targetBodyYaw = currentFootSpeed > 0.35 ? Math.atan2(footVelX, footVelZ) : moveAngle;
      desiredFootBodyYaw = targetBodyYaw;
      playerGroup.rotation.y = lerpAngle(playerGroup.rotation.y, targetBodyYaw, delta * 13.5);
    }

    if (playerActions.walk) {
      playerActions.walk.timeScale = THREE.MathUtils.clamp(currentFootSpeed / 3.7, 0.88, 1.42);
    }

    if (isGrounded) {
      if (isMoving || currentFootSpeed > 0.38) {
        setPlayerAnimation(canSprint ? 'run' : 'walk');
      } else {
        setPlayerAnimation('idle');
      }
    }
  }

  // Tính tốc độ góc rẽ tức thời (playerTurnRate) để dẫn hướng xoay Đầu, Cổ & Vai nhân vật
  const rawHeadingRate = angleDifference(prevPlayerHeading, playerGroup.rotation.y) / Math.max(delta, 0.001);
  prevPlayerHeading = playerGroup.rotation.y;
  const bodyRemainingTurn = (!playerState.isRidingBike && isMoving)
    ? angleDifference(playerGroup.rotation.y, desiredFootBodyYaw)
    : 0;
  const inputTurnIntent = playerState.isRidingBike
    ? rideMotion.steer * 1.35
    : bodyRemainingTurn * 1.45;
  const targetTurnRate = THREE.MathUtils.clamp(rawHeadingRate * 0.25 + inputTurnIntent, -1.6, 1.6);
  playerTurnRate = smoothValue(playerTurnRate, targetTurnRate, 11, delta);

  // Chỉ cập nhật DOM khi phần trăm Stamina thực sự thay đổi nguyên đơn vị (tránh giật lag trình duyệt)
  const roundedStam = Math.round(playerState.stamina);
  if (roundedStam !== lastHudStam) {
    lastHudStam = roundedStam;
    const stamEl = document.getElementById('stat-stamina');
    if (stamEl) stamEl.textContent = `⚡ ${roundedStam}%`;
  }

  const currentGroundY = getGroundElevationAt(playerGroup.position.x, playerGroup.position.z);
  if (activePropSession) {
    isGrounded = true;
    verticalVel = 0;
  } else if (!isGrounded) {
    setPlayerAnimation('jump');
    playerGroup.position.y += verticalVel * delta;
    verticalVel -= 18 * delta;
    if (playerGroup.position.y <= currentGroundY) {
      playerGroup.position.y = currentGroundY;
      verticalVel = 0;
      isGrounded = true;
      landingImpactDip = 0.13;
      const inAlley = playerGroup.position.x < -61 && playerGroup.position.z < -7.5;
      playFootstepSound(horrorModeActive || inAlley, true, true);
      setPlayerAnimation(isMoving && !playerState.isRidingBike ? (canSprint ? 'run' : 'walk') : 'idle');
    }
  } else {
    // Tự động bước lên / bước xuống bậc vỉa hè cao 18cm mượt mà, chống lún chân & bánh xe xuống vỉa hè
    const prevGroundY = playerGroup.userData.lastGroundY ?? currentGroundY;
    if (Math.abs(currentGroundY - prevGroundY) > 0.08) {
      landingImpactDip = Math.max(landingImpactDip, 0.045);
    }
    playerGroup.userData.lastGroundY = currentGroundY;
    playerGroup.position.y = smoothValue(playerGroup.position.y, currentGroundY, 18, delta);
  }
  landingImpactDip = smoothValue(landingImpactDip, 0, 14, delta);

  // Âm thanh bước chân theo nhịp sải chân & động cơ xe máy 4 kỳ thực tế
  const currentFootSpeedForAudio = Math.hypot(footVelX, footVelZ);
  updateFootstepAudio(delta, isMoving, canSprint, currentFootSpeedForAudio);
  updateMotorbikeAudio(delta, playerState.isRidingBike, rideMotion.speed, keys.w && !keys.s);

  // Xoay và kiểm tra thu thập Sao Di Sản; người lái xe phải xuống xe để khám phá.
  heritageRelics.forEach((rel, idx) => {
    if (horrorModeActive) return;
    if (rel.userData.collected) return;
    rel.children[0].rotation.y = elapsed * 2.2 + idx;
    rel.children[0].position.y = Math.sin(elapsed * 3.0 + idx) * 0.16;
    const d = Math.hypot(
      playerGroup.position.x - rel.position.x,
      playerGroup.position.z - rel.position.z
    );
    const hasCorgiPet = garageState.equippedPet === 'corgi_gold';
    const pickupRadius = hasCorgiPet ? 4.8 : 1.65;
    if ((!playerState.isRidingBike || hasCorgiPet) && d < pickupRadius) {
      rel.userData.collected = true;
      rel.visible = false;
      playerState.collectedRelicIds.add(rel.userData.id);
      playerState.collectedRelics += 1;
      addRewards(10000, 50);
      awardSocialProgress({ neighborhood: { heritage: 2 } });
      playSoundEffect('relic');
      showToast(
        `⭐ ${hasCorgiPet ? '🐕 Corgi Vàng đã gom giúp bạn ' : 'Đã thu thập '}Sao Di Sản (${playerState.collectedRelics}/${playerState.totalRelics}): ${rel.userData.title}! (+50 XP, +10.000đ)`
      );
    }
  });

  // Cập nhật hành vi tuần tra, đi bộ, dừng nghỉ & bong bóng thoại của toàn bộ 17 NPC (Tối ưu LOD theo khoảng cách)
  dynamicWalkers.forEach((dw) => {
    if (horrorModeActive) return;
    const g = dw.group;
    constrainPedestrian(g.position);
    const distToPlayer = Math.hypot(
      playerGroup.position.x - g.position.x,
      playerGroup.position.z - g.position.z
    );
    dw.distToPlayer = distToPlayer;

    // Ẩn các NPC ở quá xa (> 85m) để giảm tải Skeletal Skinning & Shadow Map Pass
    dw.inRenderRange=detailVisibility(dw.inRenderRange??true,distToPlayer,85,105);
    if (!dw.inRenderRange) {
      g.visible = false;
      return;
    }
    g.visible = true;

    // Hiển thị bong bóng thoại luân phiên tự nhiên cho NPC ở gần (< 32m)
    dw.chatTimer += delta;
    if (dw.bubble) {
      const cycle = dw.chatTimer % 11;
      dw.bubble.visible = distToPlayer < 32 && cycle < 4.8;
    }

    // Chuyển động chú chó Corgi nhảy chân sáo theo sau người chạy bộ
    if (g.dogMesh) {
      g.dogMesh.position.y = Math.abs(Math.sin(elapsed * 14)) * 0.12;
      g.dogMesh.rotation.z = Math.sin(elapsed * 14) * 0.08;
    }

    if (!dw.isQuestNPC&&dw.speed>0&&distToPlayer<1.25) {
      if(!dw.yielding&&dw.walkAct&&dw.idleAct){dw.walkAct.fadeOut(.25);dw.idleAct.reset().fadeIn(.25).play();}
      dw.yielding=true;g.rotation.y=lerpAngle(g.rotation.y,Math.atan2(playerGroup.position.x-g.position.x,playerGroup.position.z-g.position.z),delta*4);return;
    }
    if(dw.yielding&&distToPlayer>1.7){dw.yielding=false;if(dw.walkAct&&dw.idleAct){dw.idleAct.fadeOut(.25);dw.walkAct.reset().fadeIn(.25).play();}}
    if(dw.yielding)return;
    if (dw.isQuestNPC && distToPlayer < 4.8) {
      const angleToPlayer = Math.atan2(
        playerGroup.position.x - g.position.x,
        playerGroup.position.z - g.position.z
      );
      g.rotation.y = lerpAngle(g.rotation.y, angleToPlayer, delta * 8);
      if (dw.state !== 'idle' && dw.walkAct && dw.idleAct) {
        dw.state = 'idle';
        dw.walkAct.fadeOut(0.28);
        dw.idleAct.reset().fadeIn(0.28).play();
      }
      return;
    } else if (dw.isQuestNPC && dw.state === 'idle' && dw.pauseTimer <= 0 && dw.walkAct && dw.idleAct) {
      dw.state = 'walk';
      dw.idleAct.fadeOut(0.28);
      dw.walkAct.reset().fadeIn(0.28).play();
    }

    if (dw.speed <= 0) return;

    if (dw.pauseTimer > 0) {
      dw.pauseTimer -= delta;
      if (dw.pauseTimer <= 0 && dw.state !== 'walk' && dw.walkAct && dw.idleAct) {
        dw.state = 'walk';
        dw.idleAct.fadeOut(0.28);
        dw.walkAct.reset().fadeIn(0.28).play();
      }
      return;
    }

    const targetX = dw.dir > 0 ? dw.x2 : dw.x1;
    const targetZ = dw.dir > 0 ? dw.z2 : dw.z1;
    if(!dw.footRoute)dw.footRoute=pedestrianRoute(g.position,{x:targetX,z:targetZ});
    while(dw.footRoute.length>1&&Math.hypot(dw.footRoute[0].x-g.position.x,dw.footRoute[0].z-g.position.z)<.35)dw.footRoute.shift();
    const waypoint=dw.footRoute[0];
    const dx = waypoint.x - g.position.x;
    const dz = waypoint.z - g.position.z;
    const dist = Math.hypot(dx, dz);

    if (Math.hypot(targetX-g.position.x,targetZ-g.position.z) < 0.35) {
      dw.dir *= -1;
      dw.footRoute=null;
      if (dw.isQuestNPC && dw.walkAct && dw.idleAct) {
        dw.pauseTimer = 2.4;
        dw.state = 'idle';
        dw.walkAct.fadeOut(0.28);
        dw.idleAct.reset().fadeIn(0.28).play();
      }
    } else {
      if(dist<.0001)return;
      const step = Math.min(dist,dw.speed * delta);
      g.position.x += (dx / dist) * step;
      g.position.z += (dz / dist) * step;
      constrainPedestrian(g.position);
      g.position.y = getGroundElevationAt(g.position.x, g.position.z);
      g.rotation.y = lerpAngle(g.rotation.y, Math.atan2(dx, dz), delta * 10);
    }
  });

  // Khôi phục Quaternion gốc của xương trước khi chạy AnimationMixer (chống cộng dồn xoay 360 độ do PropertyMixer cache track tĩnh!)
  ['hips', 'spine', 'chest', 'neck', 'head', 'upperLeg.L', 'upperLeg.R', 'lowerLeg.L', 'lowerLeg.R', 'upperArm.L', 'upperArm.R', 'lowerArm.L', 'lowerArm.R'].forEach((bName) => {
    const bone = playerBones[bName];
    const saved = playerPreIKQuats[bName] || playerBoneRest[bName];
    if (bone && saved) bone.quaternion.copy(saved);
  });
  dynamicWalkers.forEach((dw) => {
    if (horrorModeActive || !dw.group.visible) return;
    if (!dw.bones || !dw.preIKQuats) return;
    ['neck', 'head'].forEach((bName) => {
      const bone = dw.bones[bName];
      const saved = dw.preIKQuats[bName];
      if (bone && saved) bone.quaternion.copy(saved);
    });
  });

  if (playerMixer) {
    playerMixer.update(delta);
  }
  if (!horrorModeActive) {
    dynamicWalkers.forEach((dw) => {
      if (dw.group.visible && dw.mixer) {
        // Nearby actors retain full frame-rate poses. Distant skinning can
        // run less often without slowing their movement or animation clock.
        const interval = dw.distToPlayer > 55 ? 1 / 15 : dw.distToPlayer > 25 ? 1 / 30 : 0;
        dw.mixerAccumulator = (dw.mixerAccumulator || 0) + delta;
        if (dw.mixerAccumulator >= interval) {
          dw.mixer.update(dw.mixerAccumulator);
          dw.mixerAccumulator = 0;
        }
      } else {
        dw.mixerAccumulator = 0;
      }
    });
  }

  // Lưu lại Quaternion chuẩn ngay sau AnimationMixer (trước khi áp dụng tư thế lái xe, thiết bị công viên & IK xoay đầu)
  ['hips', 'spine', 'chest', 'neck', 'head', 'upperLeg.L', 'upperLeg.R', 'lowerLeg.L', 'lowerLeg.R', 'upperArm.L', 'upperArm.R', 'lowerArm.L', 'lowerArm.R'].forEach((bName) => {
    const bone = playerBones[bName];
    if (!bone) return;
    if (!playerPreIKQuats[bName]) playerPreIKQuats[bName] = bone.quaternion.clone();
    else playerPreIKQuats[bName].copy(bone.quaternion);
  });

  applyPlayerRidingPose(delta, elapsed);

  // ==========================================================================
  // CẬP NHẬT CHUYỂN ĐỘNG 3D CỦA THIẾT BỊ CÔNG VIÊN & TƯ THẾ TƯƠNG TÁC NHÂN VẬT
  // ==========================================================================
  if (!horrorModeActive) {
    animatedWorldProps.forEach((wp) => {
      if (wp.type === 'fountain') {
        wp.jet.scale.y = 0.85 + Math.sin(elapsed * 7.8) * 0.22;
        wp.jet.rotation.y = elapsed * 2.5;
      } else if (wp.type === 'swing') {
        const isRidingSwing = activePropSession?.prop?.id === 'park_swing';
        const pumpBoost = (keys.w || keys.s) ? 0.68 : 0.48;
        wp.pivots[0].rotation.x = isRidingSwing
          ? Math.sin(elapsed * 3.4) * pumpBoost
          : Math.sin(elapsed * 1.5) * 0.07;
        wp.pivots[1].rotation.x = Math.sin(elapsed * 1.5 + 1.3) * 0.07;
      } else if (wp.type === 'seesaw') {
        const isRidingSeesaw = activePropSession?.prop?.id === 'park_seesaw';
        const rockAmp = (keys.w || keys.s) ? 0.28 : 0.21;
        wp.beam.rotation.z = isRidingSeesaw
          ? Math.sin(elapsed * 3.0) * rockAmp
          : Math.sin(elapsed * 1.4) * 0.07;
      } else if (wp.type === 'gym') {
        const isUsingGym = activePropSession?.prop?.id === wp.id;
        const swingAngle = isUsingGym
          ? Math.sin(elapsed * 6.8) * 0.56
          : Math.sin(elapsed * 1.5 + wp.phase) * 0.05;
        if (wp.arms[0]) wp.arms[0].rotation.x = swingAngle;
        if (wp.arms[1]) wp.arms[1].rotation.x = -swingAngle;
        if (wp.pedals[0]) wp.pedals[0].rotation.x = swingAngle * 0.35;
        if (wp.pedals[1]) wp.pedals[1].rotation.x = -swingAngle * 0.35;
      }
    });
  }

  if (activePropSession && !playerState.isRidingBike) {
    const { type, prop } = activePropSession;
    const sitAxis = new THREE.Vector3(1, 0, 0);
    const sitQuat = new THREE.Quaternion();
    const poseSitBone = (name, angle) => {
      const bone = playerBones[name];
      const rest = playerBoneRest[name];
      if (bone && rest) bone.quaternion.copy(rest).multiply(sitQuat.setFromAxisAngle(sitAxis, angle));
    };

    if (type === 'swing') {
      const swingAngle = prop.swingProp.pivots[0].rotation.x;
      playerGroup.position.x = prop.pivotWorldX;
      playerGroup.position.z = prop.pivotWorldZ + Math.sin(swingAngle) * prop.ropeLength;
      playerGroup.position.y = prop.pivotWorldY - Math.cos(swingAngle) * prop.ropeLength - 0.36;
      playerGroup.rotation.y = Math.PI;
      if (playerModel) playerModel.rotation.x = swingAngle * 0.68;
      setPlayerAnimation('idle');
      poseSitBone('upperLeg.L', 1.25);
      poseSitBone('upperLeg.R', 1.25);
      poseSitBone('lowerLeg.L', -1.1 + Math.sin(elapsed * 3.4) * 0.35);
      poseSitBone('lowerLeg.R', -1.1 + Math.sin(elapsed * 3.4) * 0.35);
      poseSitBone('upperArm.L', 0.85);
      poseSitBone('upperArm.R', 0.85);
    } else if (type === 'seesaw') {
      const beamAngle = prop.seesawProp.beam.rotation.z;
      const seatOffset = -1.22;
      playerGroup.position.x = prop.centerX + Math.cos(beamAngle) * seatOffset;
      playerGroup.position.z = prop.centerZ;
      playerGroup.position.y = 0.18 + 0.58 + Math.sin(beamAngle) * seatOffset - 0.32;
      playerGroup.rotation.y = Math.PI / 2;
      if (playerModel) playerModel.rotation.x = -beamAngle * 0.65;
      setPlayerAnimation('idle');
      poseSitBone('upperLeg.L', 1.18);
      poseSitBone('upperLeg.R', 1.18);
      poseSitBone('lowerLeg.L', -1.2);
      poseSitBone('lowerLeg.R', -1.2);
      poseSitBone('upperArm.L', 0.95);
      poseSitBone('upperArm.R', 0.95);
    } else if (type === 'slide') {
      activePropSession.timer += delta;
      const t = activePropSession.timer;
      if (t < 0.55) {
        const p = t / 0.55;
        playerGroup.position.set(prop.towerX, THREE.MathUtils.lerp(0.18, 1.65, p), prop.towerZ);
        playerGroup.rotation.y = 0;
        setPlayerAnimation('run');
      } else if (t < 1.85) {
        const p = (t - 0.55) / 1.3;
        playerGroup.position.set(
          prop.towerX,
          THREE.MathUtils.lerp(1.65, 0.18, p),
          THREE.MathUtils.lerp(prop.towerZ + 0.3, prop.towerZ + 3.85, p)
        );
        playerGroup.rotation.y = 0;
        setPlayerAnimation('idle');
        poseSitBone('upperLeg.L', 1.3);
        poseSitBone('upperLeg.R', 1.3);
        poseSitBone('lowerLeg.L', -0.45);
        poseSitBone('lowerLeg.R', -0.45);
      } else {
        prop.exitX = prop.towerX;
        prop.exitZ = prop.towerZ + 4.15;
        stopActivePropSession(false);
        verticalVel = 3.8;
        isGrounded = false;
        playSoundEffect('coin');
      }
    } else if (type === 'gym') {
      playerGroup.position.set(prop.mountX, prop.mountY, prop.mountZ);
      if (prop.gymIndex === 1) {
        // Máy Xoay Eo Công Viên: Xoay hông trái - phải nhịp nhàng
        playerGroup.rotation.y = Math.sin(elapsed * 5.2) * 0.75;
        setPlayerAnimation('idle');
      } else {
        playerGroup.rotation.y = prop.mountYaw || 0;
        setPlayerAnimation('run');
      }
      poseSitBone('upperArm.L', 0.95 + Math.sin(elapsed * 6.8) * 0.35);
      poseSitBone('upperArm.R', 0.95 - Math.sin(elapsed * 6.8) * 0.35);
    } else if (type === 'bench' || type === 'chess') {
      playerGroup.position.set(prop.seatX, prop.seatY, prop.seatZ);
      playerGroup.rotation.y = prop.seatYaw || 0;
      setPlayerAnimation('idle');
      poseSitBone('upperLeg.L', 1.32);
      poseSitBone('upperLeg.R', 1.32);
      poseSitBone('lowerLeg.L', -1.35);
      poseSitBone('lowerLeg.R', -1.35);
    }
  }

  // ==========================================================================
  // PROCEDURAL HEAD, NECK & TORSO IK — XOAY ĐẦU ĐÓN HƯỚNG RẼ (KHÔNG BỊ QUAY VÒNG!)
  // ==========================================================================
  {
    const ikSmoothRate = 11.5 * (Number(gameSettings.cameraSmoothness) || 1.0);
    let baseLookYaw = 0;
    if (playerState.isRidingBike) {
      baseLookYaw = rideMotion.steer * 0.46 + playerTurnRate * 0.22;
    } else if (isMoving) {
      const turnDiff = angleDifference(playerGroup.rotation.y, desiredFootBodyYaw);
      baseLookYaw = THREE.MathUtils.clamp(turnDiff * 0.65 + playerTurnRate * 0.28, -0.68, 0.68);
    } else {
      const viewDiff = angleDifference(playerGroup.rotation.y, camYaw);
      if (Math.abs(viewDiff) < 1.05) {
        baseLookYaw = viewDiff * 0.38;
      }
    }

    let poiGlanceYaw = 0;
    const glanceTarget = nearestHorrorEvent || nearestStoryEvent || nearestNPC;
    if (glanceTarget && !canSprint) {
      const gx = glanceTarget.position.x - playerGroup.position.x;
      const gz = glanceTarget.position.z - playerGroup.position.z;
      const gDist = Math.hypot(gx, gz);
      if (gDist > 0.4 && gDist < 4.2) {
        const relPoiYaw = angleDifference(playerGroup.rotation.y, Math.atan2(gx, gz));
        if (Math.abs(relPoiYaw) < 1.1) {
          poiGlanceYaw = relPoiYaw * 0.25;
        }
      }
    }

    const desiredHeadYaw = THREE.MathUtils.clamp(baseLookYaw + poiGlanceYaw, -0.68, 0.68);
    const desiredHeadPitch = THREE.MathUtils.clamp(-camPitch * 0.35, -0.28, 0.28);
    const desiredHeadRoll = THREE.MathUtils.clamp(
      -playerTurnRate * 0.1 - (playerState.isRidingBike ? rideMotion.lean * 0.25 : 0),
      -0.16,
      0.16
    );
    const desiredBodyBank = THREE.MathUtils.clamp(playerTurnRate * 0.14, -0.16, 0.16);

    headIKState.yaw = smoothValue(headIKState.yaw, desiredHeadYaw, ikSmoothRate, delta);
    headIKState.pitch = smoothValue(headIKState.pitch, desiredHeadPitch, ikSmoothRate, delta);
    headIKState.roll = smoothValue(headIKState.roll, desiredHeadRoll, ikSmoothRate, delta);
    headIKState.bodyBank = smoothValue(headIKState.bodyBank, desiredBodyBank, ikSmoothRate, delta);

    if (playerBones.spine) {
      playerBones.spine.rotateY(headIKState.yaw * 0.12);
      if (!playerState.isRidingBike) playerBones.spine.rotateZ(-headIKState.bodyBank * 0.22);
    }
    if (playerBones.chest) {
      playerBones.chest.rotateY(headIKState.yaw * 0.22);
      if (!playerState.isRidingBike) playerBones.chest.rotateZ(-headIKState.bodyBank * 0.3);
    }
    if (playerBones.neck) {
      playerBones.neck.rotateY(headIKState.yaw * 0.35);
      playerBones.neck.rotateX(headIKState.pitch * 0.4);
      playerBones.neck.rotateZ(headIKState.roll * 0.4);
    }
    if (playerBones.head) {
      playerBones.head.rotateY(headIKState.yaw * 0.52);
      playerBones.head.rotateX(headIKState.pitch * 0.55);
      playerBones.head.rotateZ(headIKState.roll * 0.5);
    }

    // Các NPC xung quanh cũng tự động xoay cổ & đầu nhìn theo người chơi khi lại gần
    if (!horrorModeActive) {
      dynamicWalkers.forEach((dw) => {
        if (!dw.group.visible || !dw.bones) return;
        if (!dw.preIKQuats) dw.preIKQuats = {};
        ['neck', 'head'].forEach((bName) => {
          const bone = dw.bones[bName];
          if (!bone) return;
          if (!dw.preIKQuats[bName]) dw.preIKQuats[bName] = bone.quaternion.clone();
          else dw.preIKQuats[bName].copy(bone.quaternion);
        });

        const dist = dw.distToPlayer ?? 99;
        let targetNpcYaw = 0;
        if (dist < 6.0 && dist > 0.35) {
          const dx = playerGroup.position.x - dw.group.position.x;
          const dz = playerGroup.position.z - dw.group.position.z;
          const relYaw = angleDifference(dw.group.rotation.y, Math.atan2(dx, dz));
          if (Math.abs(relYaw) < 1.2) {
            targetNpcYaw = THREE.MathUtils.clamp(relYaw * 0.6, -0.65, 0.65);
          }
        }
        dw.headYaw = smoothValue(dw.headYaw || 0, targetNpcYaw, 8, delta);
        if (Math.abs(dw.headYaw) > 0.005) {
          if (dw.bones.neck) dw.bones.neck.rotateY(dw.headYaw * 0.36);
          if (dw.bones.head) dw.bones.head.rotateY(dw.headYaw * 0.58);
        }
      });
    }
  }

  // ==========================================================================
  // NỘI SUY CAMERA MƯỢT (SPRING-DAMPED CAMERA + HEAD TURN FOLLOW & BANKING)
  // ==========================================================================
  const camSmoothRate = 18.0 * (Number(gameSettings.cameraSmoothness) || 1.0);
  camYaw = lerpAngle(camYaw, targetCamYaw, 1 - Math.exp(-camSmoothRate * delta));
  camPitch = smoothValue(camPitch, targetCamPitch, camSmoothRate, delta);
  camDist = smoothValue(camDist, targetCamDist, 12, delta);

  const targetCamRoll = THREE.MathUtils.clamp(
    -playerTurnRate * 0.022 - (playerState.isRidingBike ? rideMotion.lean * 0.14 : 0),
    -0.065,
    0.065
  );
  camRoll = smoothValue(camRoll, targetCamRoll, 10, delta);

  const footSpeedNow = Math.hypot(footVelX, footVelZ);
  const bobFreq = canSprint ? 13.2 : 9.2;
  const bobAmp = (!playerState.isRidingBike && isGrounded && footSpeedNow > 0.4)
    ? THREE.MathUtils.clamp(footSpeedNow / 9.6, 0.25, 1.0)
    : 0;
  const eyeBobY = Math.abs(Math.cos(elapsed * bobFreq)) * 0.026 * bobAmp;
  const eyeBobSide = Math.sin(elapsed * bobFreq) * 0.018 * bobAmp;
  const idleBreathY = Math.sin(elapsed * 2.1) * 0.0045;

  const baseTargetY = playerGroup.position.y + (playerState.isRidingBike ? 1.56 : 1.52) + eyeBobY + idleBreathY - landingImpactDip;
  const rightVecX = -Math.cos(camYaw);
  const rightVecZ = Math.sin(camYaw);

  if (camMode === 'fps') {
    const fpsLeadYaw = playerState.isRidingBike ? camYaw + playerTurnRate * 0.045 : camYaw;
    const eyeX = playerGroup.position.x + rightVecX * eyeBobSide + Math.sin(fpsLeadYaw) * 0.08;
    const eyeZ = playerGroup.position.z + rightVecZ * eyeBobSide + Math.cos(fpsLeadYaw) * 0.08;
    camera.position.set(eyeX, baseTargetY, eyeZ);
    const lookX = eyeX + Math.sin(fpsLeadYaw) * Math.cos(camPitch) * 12;
    const lookY = baseTargetY - Math.sin(camPitch) * 12;
    const lookZ = eyeZ + Math.cos(fpsLeadYaw) * Math.cos(camPitch) * 12;
    camera.lookAt(lookX, lookY, lookZ);
    camera.rotateZ(camRoll);
  } else {
    const turnLeadOffset = playerTurnRate * 0.28;
    const rawCamX = playerGroup.position.x - Math.sin(camYaw) * Math.cos(camPitch) * camDist + rightVecX * turnLeadOffset * 0.35;
    const rawCamY = Math.max(baseTargetY + Math.sin(camPitch) * camDist, 0.65);
    const rawCamZ = playerGroup.position.z - Math.cos(camYaw) * Math.cos(camPitch) * camDist + rightVecZ * turnLeadOffset * 0.35;

    // Kéo Camera về phía trước nếu bị tường hoặc tòa nhà che khuất (Spring-Arm Wall Occlusion)
    const wallFrac = constrainCameraFraction(playerGroup.position.x, playerGroup.position.z, rawCamX, rawCamZ);
    const desiredCamX = THREE.MathUtils.lerp(playerGroup.position.x, rawCamX, wallFrac);
    const desiredCamY = THREE.MathUtils.lerp(baseTargetY, rawCamY, wallFrac);
    const desiredCamZ = THREE.MathUtils.lerp(playerGroup.position.z, rawCamZ, wallFrac);

    const desiredLookX = playerGroup.position.x + Math.sin(camYaw) * 0.65 - rightVecX * turnLeadOffset * 0.45;
    const desiredLookY = baseTargetY - Math.sin(camPitch) * 0.55;
    const desiredLookZ = playerGroup.position.z + Math.cos(camYaw) * 0.65 - rightVecZ * turnLeadOffset * 0.45;

    if (!camInitialized) {
      smoothCamPos.set(desiredCamX, desiredCamY, desiredCamZ);
      smoothCamLook.set(desiredLookX, desiredLookY, desiredLookZ);
      camInitialized = true;
    } else {
      const followRate = 19 * (Number(gameSettings.cameraSmoothness) || 1.0);
      const alpha = 1 - Math.exp(-followRate * delta);
      _tmpDesiredCamPos.set(desiredCamX, desiredCamY, desiredCamZ);
      _tmpDesiredCamLook.set(desiredLookX, desiredLookY, desiredLookZ);
      smoothCamPos.lerp(_tmpDesiredCamPos, alpha);
      smoothCamLook.lerp(_tmpDesiredCamLook, alpha);
    }
    // Smoothing can cut through a corner even when the destination is safe.
    // Clamp the final arm too, and never impose a minimum arm through a wall.
    const safeFraction = constrainCameraFraction(playerGroup.position.x, playerGroup.position.z, smoothCamPos.x, smoothCamPos.z);
    if (safeFraction < 1) {
      smoothCamPos.x = THREE.MathUtils.lerp(playerGroup.position.x, smoothCamPos.x, safeFraction);
      smoothCamPos.y = THREE.MathUtils.lerp(baseTargetY, smoothCamPos.y, safeFraction);
      smoothCamPos.z = THREE.MathUtils.lerp(playerGroup.position.z, smoothCamPos.z, safeFraction);
    }
    camera.position.copy(smoothCamPos);
    camera.lookAt(smoothCamLook);
    camera.rotateZ(camRoll * 0.55);
  }

  followPlayerShadowArea();
  skyDomeMesh.position.copy(camera.position);
  skyDomeMesh.rotation.y += delta * 0.0038;
  updateFlashlightTransform(elapsed, isMoving);

  // Cập nhật hiệu ứng hạt Lá Thu Hà Nội rơi & Đom đóm đêm dọc Phố Phú Thượng
  if (autumnParticles && autumnParticles.visible) {
    const posArr = autumnParticles.geometry.attributes.position.array;
    const isNight = playerState.time >= 18.0;
    autumnLeafMat.color.setHex(isNight ? 0xb8a86c : 0x9b7e49);
    for (let i = 0; i < autumnLeafCount; i++) {
      const i3 = i * 3;
      const ph = autumnLeafPhase[i];
      if (isNight) {
        posArr[i3] += Math.sin(elapsed * 1.4 + ph) * delta * 0.35;
        posArr[i3 + 1] += Math.cos(elapsed * 1.8 + ph) * delta * 0.25;
        posArr[i3 + 2] += Math.cos(elapsed * 1.2 + ph) * delta * 0.35;
        if (posArr[i3 + 1] < 0.6) posArr[i3 + 1] = 3.5;
        if (posArr[i3 + 1] > 6.5) posArr[i3 + 1] = 1.2;
      } else {
        posArr[i3] += Math.sin(elapsed * 1.6 + ph) * delta * 0.65;
        posArr[i3 + 1] -= (0.65 + (i % 5) * 0.12) * delta;
        posArr[i3 + 2] += Math.cos(elapsed * 1.3 + ph) * delta * 0.45;
        if (posArr[i3 + 1] < 0.15) {
          posArr[i3] = playerGroup.position.x + (Math.random() - 0.5) * 95;
          posArr[i3 + 1] = 9 + Math.random() * 6;
          posArr[i3 + 2] = playerGroup.position.z + (Math.random() - 0.5) * 48;
        }
      }
    }
    autumnParticles.geometry.attributes.position.needsUpdate = true;
  }

  // Cập nhật Dải Mũi Tên Dẫn Đường GPS 3D dưới mặt đất hướng về mục tiêu hiện tại
  if (gpsGuideGroup) {
    const showGps = gameSettings.showWaypoints !== false;
    const destination = showGps ? getActiveGuidanceTarget() : null;
    const guideTarget = destination&&!horrorModeActive?nextDistrictWaypoint(playerGroup.position,guidancePath(destination)):destination;
    if (guideTarget) {
      const gx = guideTarget.x - playerGroup.position.x;
      const gz = guideTarget.z - playerGroup.position.z;
      const gDist = Math.hypot(gx, gz);
      gpsGuideGroup.visible = gDist > 3.2;
      if (gpsGuideGroup.visible) {
        const dirAngle = Math.atan2(gx, gz);
        const ux = gx / gDist;
        const uz = gz / gDist;
        gpsChevrons.forEach((chev, idx) => {
          const flow = ((elapsed * 1.8 + idx * 0.2) % 1);
          const stepDist = 1.45 + idx * 0.82 + flow * 0.6;
          const cx = playerGroup.position.x + ux * stepDist;
          const cz = playerGroup.position.z + uz * stepDist;
          chev.position.set(
            cx,
            getGroundElevationAt(cx, cz) + 0.045,
            cz
          );
          chev.rotation.y = dirAngle;
          chev.material.color.setHex(horrorModeActive ? 0xfbbf24 : 0x38bdf8);
        });
      }
    } else {
      gpsGuideGroup.visible = false;
    }
  }

  if (horrorModeActive && !isDialogueOpen) {
    const noiseTarget = isMoving ? (canSprint ? 92 : 28) : 4;
    storyNoise = smoothValue(storyNoise, noiseTarget, canSprint ? 4.5 : 2.2, delta);
    if (isFlashlightOn && storyFlashlightBattery > 0) {
      storyFlashlightBattery = Math.max(0, storyFlashlightBattery - delta * (playerState.horrorChapterStage >= 4 ? 0.85 : 0.45));
      if (storyFlashlightBattery <= 0) setPlayerFlashlight(false, false);
    }
    const entityDistance = horrorSetPieces.entity?.visible
      ? Math.hypot(playerGroup.position.x - horrorSetPieces.entity.position.x, playerGroup.position.z - horrorSetPieces.entity.position.z)
      : 99;
    const fearTarget = entityDistance < 5.5 ? 12 : (horrorSetPieces.apparition?.visible ? 42 : (!isFlashlightOn && playerState.horrorChapterStage >= 2 ? 48 : 92));
    storyComposure = smoothValue(storyComposure, fearTarget, entityDistance < 5.5 ? 1.8 : 0.22, delta);

    // Hiệu ứng âm thanh Nhịp Tim Đập Thình Thịch khi căng thẳng hoặc khi Kẻ Bắt Chước ở gần
    if (storyComposure < 62 || entityDistance < 14) {
      heartbeatSoundTimer -= delta;
      if (heartbeatSoundTimer <= 0) {
        playHeartbeatPulse(storyComposure < 35 || entityDistance < 7);
        heartbeatSoundTimer = THREE.MathUtils.clamp(storyComposure / 75, 0.42, 1.05);
      }
    }

    if (flashlightBurstTimer > 0) {
      flashlightBurstTimer = Math.max(0, flashlightBurstTimer - delta);
      flashlightSpot.intensity = 135;
      flashlightFill.intensity = 8.5;
    } else if (isFlashlightOn && storyFlashlightBattery < 18) {
      const flicker = Math.sin(elapsed * 29) + Math.sin(elapsed * 53) > 1.25 ? 0.08 : 1;
      const pwr = gameSettings.flashlightPower || 0.85;
      flashlightSpot.intensity = 34 * pwr * flicker;
      flashlightFill.intensity = 2.2 * pwr * flicker;
    } else if (isFlashlightOn) {
      const pwr = gameSettings.flashlightPower || 0.85;
      flashlightSpot.intensity = 34 * pwr;
      flashlightFill.intensity = 2.2 * pwr;
    }
    storyUiAccumulator += delta;
    if (storyUiAccumulator >= 0.16) {
      storyUiAccumulator = 0;
      updateStorySurvivalUI();
    }
    if (horrorSetPieces.rain && gameSettings.preset !== 'low') {
      horrorSetPieces.rain.position.set(playerGroup.position.x, 0, playerGroup.position.z);
      const positions = horrorSetPieces.rain.geometry.attributes.position.array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] -= delta * 15.5;
        if (positions[i] < 0.15) positions[i] = 20 + Math.random() * 4;
      }
      horrorSetPieces.rain.geometry.attributes.position.needsUpdate = true;
    }
    if (horrorSetPieces.puddleRipples) {
      horrorSetPieces.puddleRipples.forEach((rip, idx) => {
        const phase = (elapsed * 1.45 + idx * 0.37) % 1;
        const sc = 0.4 + phase * 2.1;
        rip.scale.setScalar(sc);
        rip.material.opacity = (1 - phase) * 0.48;
      });
    }
    thunderCooldown -= delta;
    if (thunderCooldown <= 0) {
      thunderCooldown = 16 + Math.random() * 14;
      triggerDistantThunder();
    }
    if (lightningFlashAmount > 0) {
      lightningFlashAmount = Math.max(0, lightningFlashAmount - delta * 4.5);
      hemiLight.intensity = 0.72 + lightningFlashAmount * 2.2;
      if (skyDomeMesh?.material) {
        skyDomeMesh.material.color.setHex(lightningFlashAmount > 0.35 ? 0x64748b : 0x111827);
      }
    }
    horrorStreetLights.forEach(({ light, tube, phase, broken }, index) => {
      const randomDrop = broken && Math.sin(elapsed * 17 + phase) > 0.15 ? 0.18 : 1;
      const pulse = 0.86 + Math.sin(elapsed * (2.1 + index * 0.17) + phase) * 0.14;
      if (light) light.intensity = 22 * pulse * randomDrop;
      tube.material.emissiveIntensity = 2.0 * pulse * randomDrop;
    });
    if (horrorSetPieces.altarGlow) {
      horrorSetPieces.altarGlow.intensity = playerState.horrorChapterStage >= 3
        ? 8.5 + Math.sin(elapsed * 7.4) * 2.2
        : 0;
    }
    updateHorrorHauntings(delta, elapsed);
    updateNightThreat(delta, elapsed);
  } else if (!horrorModeActive) {
    const nightAmt = THREE.MathUtils.smoothstep(playerState.time, 17.5, 19.0);
    horrorStreetLights.forEach(({ light, tube }) => {
      if (light) light.intensity = 10 * nightAmt;
      tube.material.emissiveIntensity = 0.35 + nightAmt * 1.2;
    });
  }

  nearestNPC = null;
  let minDist = 4.8;
  npcList.forEach((npc, idx) => {
    if (horrorModeActive) return;
    npc.ringMesh.scale.setScalar(1 + Math.sin(elapsed * 3.5 + idx) * 0.08);
    const d = Math.hypot(
      playerGroup.position.x - npc.position.x,
      playerGroup.position.z - npc.position.z
    );
    if (d < minDist) {
      minDist = d;
      nearestNPC = npc;
    }
  });

  // Kiểm tra khoảng cách tới Cô Gánh Xôi ở góc vỉa hè trước cổng trường.
  nearestXoiVendor = null;
  dynamicWalkers.forEach((dw) => {
    if (horrorModeActive) return;
    if (!dw.isXoiVendor) return;
    if ((dw.distToPlayer ?? 99) < 4.5) {
      nearestXoiVendor = dw;
    }
  });

  nearestStoryEvent = null;
  streetStoryEvents.forEach((marker) => {
    if (!marker.visible) return;
    marker.userData.pin.rotation.y = elapsed * 1.8;
    marker.userData.pin.position.y = 1.05 + Math.sin(elapsed * 3.2) * 0.12;
    marker.userData.ring.scale.setScalar(1 + Math.sin(elapsed * 3.4) * 0.08);
    const d = Math.hypot(
      playerGroup.position.x - marker.position.x,
      playerGroup.position.z - marker.position.z
    );
    if (d < 3.2) nearestStoryEvent = marker;
  });

  nearestHorrorEvent = null;
  horrorChapterEvents.forEach((marker) => {
    if (!marker.visible) return;
    marker.userData.sigil.rotation.y = elapsed * 2.4;
    marker.userData.sigil.position.y = 1.15 + Math.sin(elapsed * 4.1) * 0.12;
    marker.userData.ring.scale.setScalar(1 + Math.sin(elapsed * 3.8) * 0.1);
    const d = Math.hypot(
      playerGroup.position.x - marker.position.x,
      playerGroup.position.z - marker.position.z
    );
    const distHintEl = document.getElementById('horror-distance-hint');
    if (marker.userData.escape && d > 5) nightExitArmed = true;
    if (distHintEl && !isDialogueOpen) {
      const stageGuide = [
        `Bấm [E] tại quầy xôi để nhận Hóa Đơn Mực Đỏ 19:41`,
        'Đi qua Ngách 41/2 bên phải quán, tìm Nhà Số 41 (bấm Phím R nếu gặp bóng ma)',
        'Mở Tủ Cầu Dao đối diện Nhà 41 theo thứ tự: Hiên → Ngõ → Bàn Thờ',
        'Đi về cuối Ngõ 41 kiểm tra Bàn Thờ & Miệng Giếng Cổ bị niêm phong',
        'Bấm [E] nghe cuộn băng cassette của bố năm 2008',
        'Dùng [Phím R] làm choáng Kẻ Bắt Chước rồi chạy thẳng ra Đầu Ngõ 41!'
      ][marker.userData.index] || 'Quan sát ánh sáng và âm thanh trong cảnh';
      const hint = `${d < 6 ? '📍 Rất gần' : d < 18 ? '🧭 Ở gần' : '🔦 Phía trước'} (${Math.round(d)}m) · ${stageGuide}`;
      if (distHintEl.textContent !== hint) distHintEl.textContent = hint;
    }
    if (!isDialogueOpen && nightExitArmed && marker.userData.escape && d < 3.25 && playerState.horrorChapterStage === 5) {
      playerState.horrorChapterStage = 6;
      updateHorrorChapterUI();
      openHorrorEndingChoice();
      markProgressDirty();
    } else if (!marker.userData.escape && d < 3.8) {
      nearestHorrorEvent = marker;
    }
  });

  nearestStoryClue = null;
  if (horrorModeActive) {
    let clueDistance = 2.45;
    horrorSetPieces.clues.forEach((clue) => {
      if (!clue.visible || clue.userData.collected) return;
      if (clue.userData.halo) {
        clue.userData.halo.scale.setScalar(1 + Math.sin(elapsed * 4.2) * 0.12);
      }
      const d = Math.hypot(playerGroup.position.x - clue.position.x, playerGroup.position.z - clue.position.z);
      if (d < clueDistance) {
        clueDistance = d;
        nearestStoryClue = clue;
      }
    });
  }

  // Kiểm tra khoảng cách tới các thiết bị tương tác tại Công Viên & Chợ Hoa Quảng Bá
  nearestWorldInteractable = null;
  if (!horrorModeActive && !playerState.isRidingBike && !activePropSession) {
    let bestPropDist = 99;
    worldInteractables.forEach((item, idx) => {
      if (item.ring) {
        item.ring.visible = true;
        item.ring.scale.setScalar(1 + Math.sin(elapsed * 3.6 + idx * 0.7) * 0.09);
      }
      const d = Math.hypot(playerGroup.position.x - item.x, playerGroup.position.z - item.z);
      if (d < (item.radius || 2.8) && d < bestPropDist) {
        bestPropDist = d;
        nearestWorldInteractable = item;
      }
    });
  } else {
    worldInteractables.forEach((item) => {
      if (item.ring) item.ring.visible = !horrorModeActive;
    });
  }

  let nextInteractLabel = '';
  const arcadePrompt = !isDialogueOpen ? arcadeController?.prompt() : '';
  const daylifePrompt = !isDialogueOpen ? daylifeController?.prompt() : '';
  const distToActiveStreetEvent = (!horrorModeActive && activeStreetEvent)
    ? Math.hypot(playerGroup.position.x - activeStreetEvent.x, playerGroup.position.z - activeStreetEvent.z)
    : 99;
  if (activePropSession && !isDialogueOpen) {
    nextInteractLabel = `⏹️ Rời khỏi ${activePropSession.title} (Phím E / Space · ⚡ Thể lực ${Math.round(playerState.stamina)}%)`;
  } else if (!horrorModeActive&&!isDialogueOpen&&policeController?.interaction({x:playerGroup.position.x,z:playerGroup.position.z,riding:playerState.isRidingBike})) {
    nextInteractLabel='🚔 Làm việc với cán bộ tuần tra (E)';
  } else if (distToActiveStreetEvent < 4.8 && !isDialogueOpen) {
    nextInteractLabel = activeStreetEvent.template.prompt;
  } else if (arcadePrompt) {
    nextInteractLabel = arcadePrompt;
  } else if (daylifePrompt) {
    nextInteractLabel = daylifePrompt;
  } else if (!playerState.isRidingBike && nearestStoryClue && !isDialogueOpen) {
    nextInteractLabel = `🔎 Thu thập Vật chứng: ${nearestStoryClue.userData.title}`;
  } else if (!playerState.isRidingBike && nearestHorrorEvent && !isDialogueOpen) {
    nextInteractLabel = nearestHorrorEvent.userData.prompt;
  } else if (isAtNightRefuge() && !isDialogueOpen) {
    nextInteractLabel = '🔋 Sạc 100% Pin Đèn Pin · Nghỉ trấn tĩnh · Đọc Hồ sơ';
  } else if (!playerState.isRidingBike && nearestStoryEvent && !isDialogueOpen) {
    nextInteractLabel = nearestStoryEvent.userData.prompt;
  } else if (!playerState.isRidingBike && nearestNPC && !isDialogueOpen) {
    nextInteractLabel = `Trò chuyện với ${nearestNPC.userData.name}`;
  } else if (!playerState.isRidingBike && nearestXoiVendor && !isDialogueOpen) {
    nextInteractLabel = 'Mua Gói Xôi Phú Thượng Nóng Hổi (15.000đ)';
  } else if (!playerState.isRidingBike && nearestWorldInteractable && !isDialogueOpen) {
    nextInteractLabel = nearestWorldInteractable.prompt;
  }

  const nextHidden = !nextInteractLabel;
  if (nextInteractLabel !== lastInteractLabelText || nextHidden !== lastInteractHidden) {
    lastInteractLabelText = nextInteractLabel;
    lastInteractHidden = nextHidden;
    const promptEl = document.getElementById('interact-prompt');
    const labelEl = document.getElementById('interact-label');
    if (labelEl && nextInteractLabel) labelEl.textContent = nextInteractLabel;
    if (promptEl) promptEl.classList.toggle('hidden', nextHidden);
  }

  if (!horrorModeActive&&!isDialogueOpen) updateStreetTraffic(delta, elapsed);

  // ==========================================================================
  // CẬP NHẬT CÁ KOI HỒ SEN 3D, QUẢ CẦU KIỂNG 3D, THÚ CƯNG 3D, QUÁN XÔI & SỰ KIỆN PHỐ
  // ==========================================================================
  if (!horrorModeActive) {
    // 1. Đàn Cá Koi 3D bơi lội tại Hồ Sen Tây Hồ
    animatedLotusFish.forEach((f) => {
      f.angle += f.speed * delta;
      const fx = f.cx + Math.cos(f.angle) * f.rx;
      const fz = f.cz + Math.sin(f.angle * 1.4) * f.rz;
      const nextAngle = f.angle + 0.05;
      const nx = f.cx + Math.cos(nextAngle) * f.rx;
      const nz = f.cz + Math.sin(nextAngle * 1.4) * f.rz;
      f.group.position.set(fx, 0.25 + Math.sin(elapsed * 4 + f.phase) * 0.015, fz);
      f.group.rotation.y = Math.atan2(nx - fx, nz - fz) - Math.PI / 2;
      if (f.tail) f.tail.rotation.y = Math.sin(elapsed * 14 + f.phase) * 0.35;
    });

    // 2. Quả Cầu Lông Gà 3D bay qua lại trên Sân Đá Cầu Kiểng
    if (animatedJianziShuttle) {
      const arcPhase = (elapsed * 1.35) % 2;
      const normT = arcPhase <= 1 ? arcPhase : 2 - arcPhase;
      const sx = THREE.MathUtils.lerp(124.2, 128.8, normT);
      const sy = 0.75 + Math.sin(normT * Math.PI) * 1.85;
      animatedJianziShuttle.position.set(sx, sy, 14.5 + Math.sin(elapsed * 2.7) * 0.35);
      animatedJianziShuttle.rotation.z = (arcPhase <= 1 ? -1 : 1) * Math.cos(normT * Math.PI) * 0.65;
      animatedJianziShuttle.rotation.y = elapsed * 5.0;
    }

    // 3. Thú Cưng 3D Đi Theo (playerPetGroup) & Phụ Kiện Mũ / Vương Miện 3D (playerHatGroup)
    const hasPet = garageState.equippedPet && PET_CATALOG[garageState.equippedPet];
    playerPetGroup.visible = !!hasPet;
    if (hasPet) {
      const behindAngle = playerGroup.rotation.y + Math.PI * 0.82;
      const targetPetX = playerGroup.position.x + Math.sin(behindAngle) * 1.25;
      const targetPetZ = playerGroup.position.z + Math.cos(behindAngle) * 1.25;
      const petDx = targetPetX - playerPetGroup.position.x;
      const petDz = targetPetZ - playerPetGroup.position.z;
      const petDist = Math.hypot(petDx, petDz);
      if (petDist > 14) {
        playerPetGroup.position.set(targetPetX, playerGroup.position.y, targetPetZ);
      } else if (petDist > 0.08) {
        const followRate = Math.min(1, delta * (playerState.isRidingBike ? 11.5 : 7.5));
        playerPetGroup.position.x += petDx * followRate;
        playerPetGroup.position.z += petDz * followRate;
        playerPetGroup.rotation.y = lerpAngle(playerPetGroup.rotation.y, Math.atan2(petDx, petDz), delta * 12);
      }
      const petGroundY = getGroundElevationAt(playerPetGroup.position.x, playerPetGroup.position.z);
      const isPetTrotting = petDist > 0.14 || isMoving || Math.abs(rideMotion.speed) > 0.5;
      const { tail, legs, catMixer, dogMixer, dogActions, glbCatHolder, glbDogHolder } = playerPetGroup.userData;
      const usingGlbPet = (glbCatHolder && glbCatHolder.visible) || (glbDogHolder && glbDogHolder.visible);
      const hopY = (!usingGlbPet && isPetTrotting) ? Math.abs(Math.sin(elapsed * 15)) * 0.06 : 0;
      playerPetGroup.position.y = petGroundY + hopY;
      if (catMixer && glbCatHolder?.visible) {
        catMixer.update(delta * (isPetTrotting ? 1.45 : 0.65));
      }
      if (dogMixer && glbDogHolder?.visible) {
        if (dogActions.run && dogActions.walk && dogActions.survey) {
          const wantRun = playerState.isRidingBike && Math.abs(rideMotion.speed) > 6;
          const wantWalk = !wantRun && isPetTrotting;
          dogActions.run.weight = wantRun ? 1 : 0;
          dogActions.walk.weight = wantWalk ? 1 : 0;
          dogActions.survey.weight = (!wantRun && !wantWalk) ? 1 : 0;
          dogActions.run.play();
          dogActions.walk.play();
          dogActions.survey.play();
        }
        dogMixer.update(delta);
      }
      if (tail) tail.rotation.z = Math.sin(elapsed * 14) * 0.28;
      if (legs && legs.length === 4) {
        const legSwing = isPetTrotting ? Math.sin(elapsed * 16) * 0.45 : 0;
        legs[0].rotation.x = legSwing;
        legs[1].rotation.x = -legSwing;
        legs[2].rotation.x = -legSwing;
        legs[3].rotation.x = legSwing;
      }
    }

    const outfitMeta = OUTFIT_CATALOG[garageState.equippedOutfit] || OUTFIT_CATALOG.outfit_default;
    playerHatGroup.visible = outfitMeta.hatType !== 'none' && camMode !== 'fps';
    if (playerHatGroup.visible) {
      playerHatGroup.position.y = playerState.isRidingBike ? 2.15 : 1.72;
      playerHatGroup.rotation.y = headIKState.yaw * 0.65;
    }

    // 4. Lãi Tự Động Quán Xôi & Trà Đá Tự Quản (Mỗi 5 giây cộng tiền vào két quán)
    playerGroup.userData.tycoonTick = (playerGroup.userData.tycoonTick || 0) + delta;
    if (playerGroup.userData.tycoonTick >= 5.0) {
      playerGroup.userData.tycoonTick = 0;
      const lv = garageState.tycoon?.level || 1;
      const upg = TYCOON_UPGRADES[lv - 1] || TYCOON_UPGRADES[0];
      const petMult = garageState.equippedPet === 'cat_royal' ? 1.4 : 1.0;
      const outfitMult = garageState.equippedOutfit === 'outfit_tycoon' ? 1.25 : 1.0;
      const gain = Math.round(upg.passivePer5s * petMult * outfitMult);
      garageState.tycoon.uncollectedCash = Math.min(500000, (garageState.tycoon.uncollectedCash || 0) + gain);
    }

    // 5. Sự Kiện Đường Phố Ngẫu Nhiên 3D (Dynamic Street Events)
    if (activeStreetEvent) {
      if (!isDialogueOpen) {
        activeStreetEvent.timeLeft -= delta;
      }
      if (activeStreetEvent.template.id!=='thief_chase'&&activeStreetEvent.template.patrolRadius > 0) {
        activeStreetEvent.x = activeStreetEvent.baseX + Math.sin(elapsed * 1.6) * activeStreetEvent.template.patrolRadius;
        activeStreetEvent.z = activeStreetEvent.baseZ + Math.cos(elapsed * 1.1) * 1.2;
      }
      streetEventGroup.position.set(
        activeStreetEvent.x,
        getGroundElevationAt(activeStreetEvent.x, activeStreetEvent.z),
        activeStreetEvent.z
      );
      const { ringMesh, beaconCrystal, smokeWisps, lostCatModel, eventMixers } = streetEventGroup.userData;
      if (eventMixers) {
        eventMixers.forEach((m) => m.update(delta));
      }
      if (ringMesh) ringMesh.scale.setScalar(1 + Math.sin(elapsed * 5.0) * 0.08);
      if (beaconCrystal) {
        beaconCrystal.rotation.y = elapsed * 3.2;
        beaconCrystal.position.y = 2.85 + Math.sin(elapsed * 4.5) * 0.12;
      }
      if (smokeWisps) {
        smokeWisps.forEach((wisp, idx) => {
          const cyc = (elapsed * 0.75 + idx * 0.33) % 1;
          wisp.position.y = 0.42 + cyc * 0.85;
          wisp.position.x = -0.15 + Math.sin(elapsed * 2.5 + idx) * 0.07;
          wisp.scale.setScalar(0.65 + cyc * 0.95);
          wisp.material.opacity = Math.sin(cyc * Math.PI) * 0.34;
        });
      }
      if (lostCatModel && activeStreetEvent.template.id === 'lost_cat') {
        const catAngle = elapsed * 1.55;
        const cx = Math.sin(catAngle) * 0.38;
        const cz = Math.cos(catAngle) * 0.26;
        lostCatModel.position.set(cx, 0, cz);
        lostCatModel.rotation.y = Math.atan2(Math.cos(catAngle) * 0.38, -Math.sin(catAngle) * 0.26);
      }
      const evTitleEl = document.getElementById('street-event-title');
      if (evTitleEl) {
        evTitleEl.textContent = `${activeStreetEvent.template.title} (${Math.max(0, Math.ceil(activeStreetEvent.timeLeft))}s)`;
      }
      if (activeStreetEvent.timeLeft <= 0) {
        activeStreetEvent = null;
        streetEventGroup.visible = false;
        document.getElementById('street-event-banner')?.classList.add('hidden');
        streetEventSpawnTimer = 45;
      }
    } else if (!activeShipperRun && !isDialogueOpen && playerGroup.position.z>=-55 && !playerState.daylife?.active && !(playerState.daylife?.mystery?.started&&!playerState.daylife.mystery.ending&&!playerState.daylife.mystery.suspended)) {
      streetEventSpawnTimer -= delta;
      if (streetEventSpawnTimer <= 0) {
        streetEventSpawnTimer = 65;
        spawnRandomStreetEvent();
      }
    }
  } else {
    playerPetGroup.visible = false;
    playerHatGroup.visible = false;
    streetEventGroup.visible = false;
    document.getElementById('street-event-banner')?.classList.add('hidden');
  }

  if(cityWeather){cityWeatherState=cityWeather.update(delta,elapsed,{x:playerGroup.position.x,z:playerGroup.position.z,day:playerState.day,hour:playerState.time,mode:gameSettings.weatherMode,horror:horrorModeActive,performance:['low','performance'].includes(gameSettings.preset)});}
  cityUtilities?.update(delta,elapsed,{x:playerGroup.position.x,z:playerGroup.position.z,hour:playerState.time,night:horrorModeActive,wind:cityWeatherState.wind,performance:['low','performance'].includes(gameSettings.preset)});
  policeController?.update(delta,elapsed,{x:playerGroup.position.x,z:playerGroup.position.z,speed:rideMotion.speed,riding:playerState.isRidingBike,night:horrorModeActive,paused:isDialogueOpen},activeStreetEvent);

  // ==========================================================================
  // CẬP NHẬT ĐỒNG HỒ TỐC ĐỘ (SPEEDOMETER), THANH NITRO & ĐUA SHIPPER SIÊU TỐC 3D
  // ==========================================================================
  {
    const shipperHudEl = document.getElementById('shipper-hud');
    const showShipperHud = !horrorModeActive && (playerState.isRidingBike || !!activeShipperRun);
    if (shipperHudEl) {
      shipperHudEl.classList.toggle('hidden', !showShipperHud);
    }

    if (stuntBannerTimer > 0) {
      stuntBannerTimer = Math.max(0, stuntBannerTimer - delta);
      if (stuntBannerTimer <= 0) {
        document.getElementById('shipper-stunt-banner')?.classList.add('hidden');
      }
    }

    if (showShipperHud) {
      const kmh = Math.round(Math.abs(rideMotion.speed) * 3.4);
      const kmhEl = document.getElementById('speedo-kmh');
      if (kmhEl) kmhEl.textContent = kmh.toString().padStart(2, '0');

      const nitroFillEl = document.getElementById('nitro-bar-fill');
      const nitroValEl = document.getElementById('nitro-val');
      const roundedNitro = Math.round(nitroFuel);
      if (nitroFillEl) nitroFillEl.style.width = `${roundedNitro}%`;
      if (nitroValEl) nitroValEl.textContent = `${roundedNitro}%`;
    }

    const missionBoxEl = document.getElementById('shipper-mission-box');
    if (activeShipperRun && !horrorModeActive) {
      if (missionBoxEl) missionBoxEl.classList.remove('hidden');
      if (!isDialogueOpen) {
        activeShipperRun.timeLeft -= delta;
        activeShipperRun.elapsed += delta;
      }

      const { crystal, groundRing, archTorus } = shipperCheckpointGroup.userData;
      if (crystal) {
        crystal.rotation.y = elapsed * 3.2;
        crystal.position.y = 3.55 + Math.sin(elapsed * 4.5) * 0.22;
      }
      if (groundRing) {
        groundRing.scale.setScalar(1 + Math.sin(elapsed * 5.0) * 0.08);
      }
      if (archTorus) {
        archTorus.rotation.z = Math.sin(elapsed * 2.5) * 0.08;
      }

      const curCp = activeShipperRun.route.checkpoints[activeShipperRun.cpIndex];
      if (curCp) {
        const distToCp = Math.hypot(playerGroup.position.x - curCp.x, playerGroup.position.z - curCp.z);
        if (distToCp < 4.6) {
          activeShipperRun.cpIndex += 1;
          activeShipperRun.timeLeft += 5.5;
          activeShipperRun.combo = Math.min(3.5, Number((activeShipperRun.combo + 0.25).toFixed(2)));
          activeShipperRun.maxCombo = Math.max(activeShipperRun.maxCombo, activeShipperRun.combo);
          nitroFuel = Math.min(100, nitroFuel + 28);

          if (activeShipperRun.cpIndex >= activeShipperRun.route.checkpoints.length) {
            completeShipperRoute();
          } else {
            const nextCp = activeShipperRun.route.checkpoints[activeShipperRun.cpIndex];
            syncShipperCheckpoint3D();
            playSoundEffect('relic');
            triggerStuntBanner(
              `✓ QUA CỔNG ${activeShipperRun.cpIndex}/${activeShipperRun.route.checkpoints.length}! +5.5 GIÂY · COMBO x${activeShipperRun.combo.toFixed(1)}`
            );
            showToast(`📍 Tiếp theo: ${nextCp.label} (+5.5s & +28% Nitro)!`, 2600);
          }
        } else {
          const timerEl = document.getElementById('shipper-mission-timer');
          const starsEl = document.getElementById('shipper-mission-stars');
          const titleEl = document.getElementById('shipper-mission-title');
          const cpProgEl = document.getElementById('shipper-cp-progress');
          const comboEl = document.getElementById('shipper-combo-pill');
          const cargoEl = document.getElementById('shipper-cargo-pill');
          const hintEl = document.getElementById('shipper-next-hint');

          if (timerEl) {
            timerEl.textContent = `⏱️ ${Math.max(0, activeShipperRun.timeLeft).toFixed(1)}s`;
            timerEl.classList.toggle('urgent', activeShipperRun.timeLeft < 10);
          }
          if (starsEl) starsEl.textContent = `⚡ ĐƠN ${'★'.repeat(activeShipperRun.route.stars)}`;
          if (titleEl) titleEl.textContent = activeShipperRun.route.title;
          if (cpProgEl) {
            cpProgEl.textContent = `📍 Cổng: ${activeShipperRun.cpIndex + 1}/${activeShipperRun.route.checkpoints.length}`;
          }
          if (comboEl) comboEl.textContent = `🔥 COMBO x${activeShipperRun.combo.toFixed(1)}`;
          if (cargoEl) cargoEl.textContent = `📦 Hàng: ${Math.round(activeShipperRun.cargoHealth)}%`;
          if (hintEl) {
            hintEl.textContent = `👉 Tới ${curCp.label} (${Math.round(distToCp)}m) · Shift: nitro · Space: phanh`;
          }
        }
      }

      if (activeShipperRun && activeShipperRun.timeLeft <= 0) {
        abortShipperRoute('⏱️ Đã hết thời gian giao đơn! Hãy bấm [C] hoặc [G] để thử lại hoặc độ xe nhanh hơn.');
      }
    } else if (missionBoxEl) {
      missionBoxEl.classList.add('hidden');
    }
  }

  animatedFlags.forEach((f, idx) => {
    f.rotation.y = Math.sin(elapsed * 3.5 + idx) * 0.2;
  });
  if (storyFoodStall.fan) storyFoodStall.fan.rotation.z = elapsed * 2.3;
  if (storyFoodStall.steamWisps) {
    storyFoodStall.steamWisps.forEach((wisp, idx) => {
      const cycle = (elapsed * 0.65 + idx * 0.33) % 1;
      wisp.position.y = 0.88 + cycle * 0.75;
      wisp.position.x = Math.sin(elapsed * 2.1 + idx) * 0.06;
      wisp.scale.setScalar(0.75 + cycle * 0.85);
      wisp.material.opacity = Math.sin(cycle * Math.PI) * 0.26;
    });
  }
  if (storyFoodStall.neon) {
    const neonPulse = 0.92 + Math.sin(elapsed * 4.8) * 0.08;
    storyFoodStall.neon.scale.setScalar(neonPulse);
  }

  minimapAccumulator += delta;
  if (minimapAccumulator >= 0.2 && !horrorModeActive) {
    minimapAccumulator = 0;
    drawMinimap();
    const districtName=districtLocationName(playerGroup.position.x,playerGroup.position.z),location=document.getElementById('hud-location');
    if(location&&districtName){const label='📍 Đang đứng tại: '+districtName;if(location.textContent!==label)location.textContent=label;location.dataset.extension='true';}
    else if(location?.dataset.extension){location.textContent='📍 Đang đứng tại: Phố Phú Thượng';delete location.dataset.extension;}
  }
  if (browserPlaytest) {
    const diagnostic = document.getElementById('interact-prompt');
    diagnostic.dataset.playerPosition = `${playerGroup.position.x.toFixed(2)},${playerGroup.position.z.toFixed(2)}`;
    diagnostic.dataset.rideState=JSON.stringify({speed:rideMotion.speed,nitro:isNitroBoosting,riding:playerState.isRidingBike});
    diagnostic.dataset.guidance=JSON.stringify(getActiveGuidanceTarget());
    diagnostic.dataset.cityAtmosphere=JSON.stringify({weather:cityWeatherState,utilities:cityUtilities?.counts,buses:animatedTraffic.filter(v=>v.kind==='bus').length,time:playerState.time});
    diagnostic.dataset.policeState=JSON.stringify(policeController?.debug());
    diagnostic.dataset.trafficState=JSON.stringify(animatedTraffic.map(v=>({id:v.id,kind:v.kind,street:v.streetId,x:+v.mesh.position.x.toFixed(2),z:+v.mesh.position.z.toFixed(2),speed:+v.currentSpeed.toFixed(2),dwell:v.dwell||0,progress:+v.progress.toFixed(5),yaw:+v.yaw.toFixed(5),police:!!v.mesh.userData.policeBeacons,visible:v.mesh.visible})));
    diagnostic.dataset.horrorStage = String(playerState.horrorChapterStage);
    diagnostic.dataset.cameraState=`${targetCamYaw.toFixed(4)},${targetCamPitch.toFixed(4)},${targetCamDist.toFixed(4)}`;
  }
  daylifeController?.update(delta);
  arcadeController?.update();
  districtExtension?.update(playerGroup.position.x,playerGroup.position.z);
  districtStreetscape?.update(playerGroup.position.x,playerGroup.position.z);
  districtLiving?.update(playerGroup.position.x,playerGroup.position.z);
  const districtGuide=document.getElementById('district-guide');if(districtGuide)districtGuide.hidden=horrorModeActive;
  renderer.info.reset();
  if(renderer.shadowMap.enabled&&shadowBudget.tick(rawDelta,playerGroup.position.x,playerGroup.position.z,false,gameSettings.preset==='performance'))renderer.shadowMap.needsUpdate=true;
  if (typeof composer !== 'undefined' && composer && gameSettings.preset !== 'low') {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
  cpuFrameSamples.push(performance.now()-frameStart);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (typeof composer !== 'undefined' && composer) {
    composer.setSize(window.innerWidth, window.innerHeight);
  }
});

window.addEventListener('beforeunload', saveGame);

buildPhuThuong3DWorld();
syncTycoonStall3D();
spawnNPCs();
spawnHeritageRelics();
spawnStreetStoryEvents();
spawnHorrorChapterEvents();
applyTeaStallUpgrade();
loadAllCharactersAndAmbientLife();
applyGameSettings();
updatePlayerHUD();
updateQuestProgress();
if (loadedSnapshot) {
  showToast(`💾 Đã tiếp tục Ngày ${playerState.day} từ lần chơi trước.`, 2600);
}
daylifeController = createDaylife({
  world:worldGroup,player:playerState,label:createNPCLabel,collider:addCircleCollider,
  snapshot:()=>{
    renderer.render(scene,camera);
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=144;
    const source=renderer.domElement,h=Math.min(source.height,source.width*9/16),w=h*16/9;
    canvas.getContext('2d').drawImage(source,(source.width-w)/2,(source.height-h)/2,w,h,0,0,256,144);
    return canvas.toDataURL('image/jpeg',.65);
  },
  dirty:markProgressDirty,toast:showToast,
  guide:target=>{guideToInventoryTarget(target);showToast('Đã đánh dấu '+target.title+'. Đi theo Phú Gia, qua Phú Xá tới tuyến vòng phía Đông.');},
  canOpen:()=>!isDialogueOpen&&!horrorModeActive,
  context:()=>({x:playerGroup.position.x,z:playerGroup.position.z,yaw:camYaw,night:horrorModeActive,riding:playerState.isRidingBike,paused:isDialogueOpen,cargoStress:playerState.isRidingBike?Math.max(0,Math.abs(rideMotion.lean)-.17)*14:0}),
  pause:(value)=>{isDialogueOpen=value;keys.w=keys.a=keys.s=keys.d=keys.shift=keys.q=false;footVelX=footVelZ=0;if(value)rideMotion.speed=0;},
  reward:(r,kind)=>{addRewards(r.coins,r.xp);awardSocialProgress({neighborhood:kind==='cleanup'?{beauty:5,cohesion:2}:kind==='album'?{heritage:5,cohesion:2}:{livelihood:5,cohesion:2}});playSoundEffect('quest');}
});
arcadeController = createNeighborhoodArcade({
  world:worldGroup,player:playerState,materials:visualMaterials,label:createNPCLabel,box:addBoxCollider,circle:addCircleCollider,
  toast:showToast,
  save:saveGame,canOpen:()=>!isDialogueOpen&&!horrorModeActive,
  context:()=>({x:playerGroup.position.x,z:playerGroup.position.z,night:horrorModeActive,riding:playerState.isRidingBike}),
  guide:(target)=>{if(isDialogueOpen)return;customGpsTarget=target;showToast('♠ Tiệm Giải Trí 41 ở dãy nhà phía Nam, đối diện Ngõ 41. Tới cửa, xuống xe và bấm E.');},
  pause:(value)=>{isDialogueOpen=value;keys.w=keys.a=keys.s=keys.d=keys.shift=keys.q=false;footVelX=footVelZ=0;if(value)rideMotion.speed=0;}
});
policeController=createPoliceWorld({
 world:worldGroup,ground:getGroundElevationAt,toast:showToast,
 cars:()=>animatedTraffic.filter(v=>v.mesh.userData.policeBeacons),
 canMoveCar:(vehicle,candidate)=>!animatedTraffic.some(other=>other!==vehicle&&trafficBodiesOverlap(candidate,{x:other.mesh.position.x,z:other.mesh.position.z,yaw:other.yaw,kind:other.kind},0)),
 stepAside:(vehicle,dt)=>{
  const p=vehicle.mesh.position,near=animatedTraffic.filter(other=>other!==vehicle).sort((a,b)=>Math.hypot(a.mesh.position.x-p.x,a.mesh.position.z-p.z)-Math.hypot(b.mesh.position.x-p.x,b.mesh.position.z-p.z))[0];
  if(!vehicle.emergencySide&&near)vehicle.emergencySide=((near.mesh.position.x-p.x)*Math.sin(vehicle.yaw)+(near.mesh.position.z-p.z)*Math.cos(vehicle.yaw))>0?-1:1;
  for(const side of [vehicle.emergencySide||1,-(vehicle.emergencySide||1)]){const candidate={x:p.x-Math.cos(vehicle.yaw)*2*dt+Math.sin(vehicle.yaw)*side*4*dt,z:p.z+Math.sin(vehicle.yaw)*2*dt+Math.cos(vehicle.yaw)*side*4*dt,yaw:vehicle.yaw,kind:'car'},r=nearestRoad(candidate.x,candidate.z,TRAFFIC_STREETS);if(r.distance>r.width/2-1.1)continue;if(animatedTraffic.some(other=>other!==vehicle&&trafficBodiesOverlap(candidate,{x:other.mesh.position.x,z:other.mesh.position.z,yaw:other.yaw,kind:other.kind},0)))continue;p.x=candidate.x;p.z=candidate.z;vehicle.emergencySide=side;break;}
 },
 endChase:vehicle=>{let best=Infinity;for(const id of ['city-bus','peach-west','market-link','phu-gia','riverside-loop','south-neighborhood']){const route=connectedTrafficRoute(id);for(let i=0;i<600;i++){const p=route.getPointAt(i/600),d=Math.hypot(p.x-vehicle.mesh.position.x,p.z-vehicle.mesh.position.z);if(d<best){best=d;vehicle.progress=i/600;vehicle.route=route;}}}vehicle.routeLength=vehicle.route.getLength();vehicle.pursuing=false;vehicle.currentSpeed=0;},
 detain:()=>{if(playerState.isRidingBike)togglePlayerMotorbike();releaseGameInputs();rideMotion.speed=0;isDialogueOpen=true;gameSettings.camMode='fps';playerGroup.position.set(450,0,150);smoothCamPos.set(450,1.6,150);camera.position.copy(smoothCamPos);targetCamYaw=camYaw=0;targetCamPitch=camPitch=.05;document.exitPointerLock?.();},
 release:()=>{isDialogueOpen=false;releaseGameInputs();playerGroup.position.set(18,.18,-8);smoothCamPos.set(18,1.7,-8);camera.position.copy(smoothCamPos);playerMotorbike.position.set(20,.18,-8);targetCamYaw=camYaw=0;markProgressDirty();},
 collide:(p,r)=>resolvePlayerCollisions(p,r),
 canSee:(a,b)=>{
  boxCollisionGrid.query((a.x+b.x)/2,(a.z+b.z)/2,Math.max(Math.abs(a.x-b.x),Math.abs(a.z-b.z))/2+1,nearbyCameraBoxes);
  const buildings=nearbyCameraBoxes.map(i=>boxColliders[i]).filter(box=>box.maxX-box.minX>3&&box.maxZ-box.minZ>3&&!(a.x>=box.minX&&a.x<=box.maxX&&a.z>=box.minZ&&a.z<=box.maxZ));
  return !lineBlocked(a,b,buildings,.05);
 },
 balance:()=>playerState.coins,pay:amount=>{if(amount)addRewards(-amount,0);},
 placeSuspect:event=>{streetEventGroup.position.set(event.x,getGroundElevationAt(event.x,event.z),event.z);streetEventGroup.rotation.y=Math.PI/2;},
 arrest:reported=>{
  if(!activeStreetEvent||activeStreetEvent.template.id!=='thief_chase')return;
  activeStreetEvent=null;streetEventSpawnTimer=60;
  streetEventGroup.userData.scenes.thief_chase.userData.detain?.();
  document.getElementById('street-event-banner')?.classList.add('hidden');
  if(reported){addRewards(5000,50);showToast('Cảm ơn bạn báo vị trí kẻ trộm: +5.000đ, +50 XP.');}
 },
 hideCaptured:()=>{if(!activeStreetEvent)streetEventGroup.visible=false;}
});
const districtGuideButton=document.createElement('button');
districtGuideButton.id='district-guide';districtGuideButton.textContent='↗ Khám phá ven sông';districtGuideButton.title='Bản đồ tuyến vòng và ba địa điểm mới';
districtGuideButton.onclick=()=>{if(isDialogueOpen||horrorModeActive)return;daylifeController.explore();};
document.body.append(districtGuideButton);
{
 const stripes=PEDESTRIAN_CROSSINGS.flatMap(c=>{const count=Math.ceil(c.length/.95);return Array.from({length:count},(_,i)=>({c,offset:(i-(count-1)/2)*c.length/count}));});
 const paint=new THREE.MeshBasicMaterial({color:0xf1f5f9,polygonOffset:true,polygonOffsetFactor:-2}),mesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),paint,stripes.length),dummy=new THREE.Object3D();
 stripes.forEach(({c,offset},i)=>{const x=c.x+c.nx*offset,z=c.z+c.nz*offset;dummy.position.set(x,getGroundElevationAt(x,z)+.025,z);dummy.rotation.y=-Math.atan2(c.tz,c.tx);dummy.scale.set(c.width,1,.5);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
 mesh.name='Pedestrian crossing paint';worldGroup.add(mesh);
}
cityUtilities=buildCityUtilities({world:worldGroup,ground:getGroundElevationAt,pole:(x,z,r)=>addCircleCollider(x,z,r),blocked:(x,z)=>boxColliders.some(b=>x>b.minX-.3&&x<b.maxX+.3&&z>b.minZ-.3&&z<b.maxZ+.3)});
const wetRoadMaterials=new Set(asphaltMaterialList);
worldGroup.traverse(node=>{if(node.isMesh&&node.geometry?.attributes.normal){const a=node.geometry.attributes.normal;if(a.count&&a.getY(0)>.9&&node.position.y<.15){for(const mat of Array.isArray(node.material)?node.material:[node.material])if(mat?.isMeshStandardMaterial)wetRoadMaterials.add(mat);}}});
cityWeather=createCityWeather({scene,ground:getGroundElevationAt,sun:sunLight,hemi:hemiLight,sky:()=>skyDomeMesh,base:()=>cityLightingBase,surfaces:()=>wetRoadMaterials,sheltered:(x,z)=>boxColliders.some(b=>b.maxX-b.minX>3&&b.maxZ-b.minZ>3&&x>b.minX&&x<b.maxX&&z>b.minZ&&z<b.maxZ)});
const weatherSelect=document.getElementById('setting-weather');if(weatherSelect){weatherSelect.value=gameSettings.weatherMode||'auto';weatherSelect.onchange=()=>{gameSettings.weatherMode=weatherSelect.value;saveSettingsToStorage();};}
const cityTimeInput=document.getElementById('setting-citytime');if(cityTimeInput){cityTimeInput.value=String(playerState.time);cityTimeInput.oninput=()=>{if(horrorModeActive)return;playerState.time=Number(cityTimeInput.value);applyTimeOfDay(playerState.time);markProgressDirty();document.getElementById('val-citytime').textContent=gameClockLabel(playerState.time);};}
const modelReplacement = replaceBuildingEnvelopes(worldGroup);
worldGroup.userData.modelReplacement = modelReplacement;
const staticCompilation=compileStaticGroups(worldGroup);
const architectureCompilation=compileArchitectureChunks(worldGroup);
if(browserPlaytest&&new URLSearchParams(location.search).get('policeDriveTest')==='1')streetEventSpawnTimer=99999;
if(browserPlaytest&&new URLSearchParams(location.search).get('eventTest')==='1')spawnRandomStreetEvent(new URLSearchParams(location.search).get('policeTest')==='1'?'thief_chase':null);
worldGroup.userData.architectureCompilation=architectureCompilation;
worldGroup.updateMatrixWorld(true);worldGroup.matrixAutoUpdate=false;scene.matrixAutoUpdate=false;
if(browserPlaytest)document.getElementById('interact-prompt').dataset.staticCompilation=JSON.stringify({...staticCompilation,architecture:architectureCompilation});
if (browserPlaytest) document.getElementById('interact-prompt').dataset.modelReplacement = JSON.stringify(modelReplacement);
animate();
