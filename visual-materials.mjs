import * as THREE from 'three';

// Shared local 1K CC0 scans, no live network dependency during play.
export function createVisualMaterials(renderer) {
  const loader = new THREE.TextureLoader();
  const textureSets = new Map();
  const materials = new Map();
  const anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  function textureSet(asset) {
    if (textureSets.has(asset)) return textureSets.get(asset);
    const set = {};
    for (const type of ['color', 'normal', 'roughness']) {
      const texture = loader.load(`assets/textures/${asset}-${type}.jpg`);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = anisotropy;
      texture.colorSpace = type === 'color' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      set[type] = texture;
    }
    textureSets.set(asset, set);
    return set;
  }
  function surface(asset, color = 0xffffff, wet = false) {
    const key = `${asset}/${color}/${wet}`;
    if (materials.has(key)) return materials.get(key);
    const maps = textureSet(asset);
    const material = new THREE.MeshStandardMaterial({
      map: maps.color,
      normalMap: maps.normal,
      roughnessMap: maps.roughness,
      color,
      normalScale: new THREE.Vector2(wet ? .38 : .65, wet ? .38 : .65),
      roughness: wet ? .68 : .96,
      metalness: 0,
      envMapIntensity: wet ? .65 : .3
    });
    material.name = `CC0/${key}`;
    material.userData.wetSurface = wet;
    materials.set(key, material);
    return material;
  }

  const grain = document.createElement('canvas');
  grain.width = grain.height = 256;
  const ctx = grain.getContext('2d');
  ctx.fillStyle = '#aaa59b'; ctx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x++) {
    const value = 110 + Math.sin(x * .37) * 24 + Math.sin(x * 1.71) * 11;
    ctx.fillStyle = `rgb(${value},${value},${value})`;
    ctx.fillRect(x, 0, 1, 256);
  }
  const grainMap = new THREE.CanvasTexture(grain);
  grainMap.wrapS = grainMap.wrapT = THREE.RepeatWrapping;
  grainMap.colorSpace = THREE.SRGBColorSpace;
  const wood = new THREE.MeshStandardMaterial({ color: 0xa48b64, map: grainMap, bumpMap: grainMap, bumpScale: .006, roughness: .8, envMapIntensity: .2 });

  // A soft cloud sprite replaces the opaque ring previously used for steam.
  const cloudCanvas = document.createElement('canvas');
  cloudCanvas.width = cloudCanvas.height = 128;
  const cloudCtx = cloudCanvas.getContext('2d');
  const gradient = cloudCtx.createRadialGradient(64, 64, 4, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(232,241,231,.5)');
  gradient.addColorStop(.4, 'rgba(226,236,229,.22)');
  gradient.addColorStop(1, 'rgba(226,236,229,0)');
  cloudCtx.fillStyle = gradient; cloudCtx.fillRect(0, 0, 128, 128);
  const steamMap = new THREE.CanvasTexture(cloudCanvas);
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const shadowCtx = shadowCanvas.getContext('2d');
  const shadowGradient = shadowCtx.createRadialGradient(64, 64, 8, 64, 64, 63);
  shadowGradient.addColorStop(0, 'rgba(0,0,0,.68)');
  shadowGradient.addColorStop(.55, 'rgba(0,0,0,.4)');
  shadowGradient.addColorStop(1, 'rgba(0,0,0,0)');
  shadowCtx.fillStyle = shadowGradient; shadowCtx.fillRect(0, 0, 128, 128);
  const contactMap = new THREE.CanvasTexture(shadowCanvas);

  return {
    plaster: color => surface('painted_plaster_wall', color),
    brick: () => surface('red_brick', 0xc5b7a5),
    asphalt: () => surface('asphalt_02', 0xb7b9b6),
    concrete: (wet = false) => surface('concrete_floor_02', wet ? 0x83908c : 0xc5c1b6, wet),
    wood,
    steamMap,
    contactShadow(width, depth) {
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(width, depth).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: contactMap, transparent: true, opacity: .75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
      return shadow;
    },
    updateLighting(night) {
      materials.forEach(material => {
        material.envMapIntensity = material.userData.wetSurface ? (night ? .52 : .8) : (night ? .16 : .45);
      });
    }
  };
}

// Real-world texture scale rather than one stretched photograph per building.
export function worldUVs(geometry, metersPerTile = 2.4) {
  const positions = geometry.attributes.position;
  const normals = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  if (!positions || !normals || !uv) return geometry;
  for (let i = 0; i < positions.count; i++) {
    const nx = Math.abs(normals.getX(i)), ny = Math.abs(normals.getY(i)), nz = Math.abs(normals.getZ(i));
    const u = nx > ny && nx > nz ? positions.getZ(i) : positions.getX(i);
    const v = ny > nx && ny > nz ? positions.getZ(i) : positions.getY(i);
    uv.setXY(i, u / metersPerTile, v / metersPerTile);
  }
  uv.needsUpdate = true;
  return geometry;
}
