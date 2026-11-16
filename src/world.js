import * as THREE from 'three';
import { CONFIG } from './config.js';
import { isPointBlocked } from './utils.js';

function makeTexture(size, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  paint(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

function makeSandTexture() {
  return makeTexture(256, (ctx, size) => {
    ctx.fillStyle = '#c8b389';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 14000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 0.5 + Math.random() * 1.6;
      ctx.fillStyle = Math.random() > 0.5
        ? `rgba(255,246,222,${0.04 + Math.random() * 0.08})`
        : `rgba(96,76,44,${0.04 + Math.random() * 0.09})`;
      ctx.fillRect(x, y, r, r);
    }

    for (let i = 0; i < 24; i++) {
      ctx.strokeStyle = 'rgba(104,84,52,0.07)';
      ctx.lineWidth = 1 + Math.random() * 1.4;
      ctx.beginPath();
      let x = Math.random() * size;
      let y = Math.random() * size;
      ctx.moveTo(x, y);
      for (let s = 0; s < 5; s++) {
        x += (Math.random() - 0.5) * 52;
        y += (Math.random() - 0.5) * 52;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  });
}

function makeWallTexture() {
  return makeTexture(256, (ctx, size) => {
    ctx.fillStyle = '#d8c7a1';
    ctx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y += 36) {
      ctx.fillStyle = 'rgba(78,62,38,0.09)';
      ctx.fillRect(0, y, size, 2);
      ctx.fillStyle = 'rgba(255,252,238,0.06)';
      ctx.fillRect(0, y + 2, size, 2);
    }

    for (let i = 0; i < 7000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.fillStyle = Math.random() > 0.5
        ? `rgba(255,250,232,${0.05 + Math.random() * 0.08})`
        : `rgba(88,70,42,${0.04 + Math.random() * 0.1})`;
      ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
  });
}

function makeCrateTexture() {
  return makeTexture(256, (ctx, size) => {
    ctx.fillStyle = '#a97b45';
    ctx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y += 42) {
      ctx.fillStyle = 'rgba(56,34,14,0.35)';
      ctx.fillRect(0, y, size, 3);
      ctx.fillStyle = 'rgba(255,225,180,0.08)';
      ctx.fillRect(0, y + 3, size, 3);
    }

    for (let i = 0; i < 4200; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.fillStyle = Math.random() > 0.5
        ? `rgba(255,230,190,${0.04 + Math.random() * 0.07})`
        : `rgba(60,38,16,${0.04 + Math.random() * 0.12})`;
      ctx.fillRect(x, y, 1 + Math.random() * 3, 1 + Math.random() * 2);
    }

    ctx.strokeStyle = 'rgba(52,32,14,0.55)';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, size - 8, size - 8);

    ctx.fillStyle = 'rgba(48,48,52,0.5)';
    const corner = 22;
    ctx.fillRect(0, 0, corner, corner);
    ctx.fillRect(size - corner, 0, corner, corner);
    ctx.fillRect(0, size - corner, corner, corner);
    ctx.fillRect(size - corner, size - corner, corner, corner);
  });
}

export function buildWorld(scene) {
  const colliders = [];
  const solids = [];
  const waypoints = [];
  const botSpawns = [];

  const sandTexture = makeSandTexture();
  sandTexture.repeat.set(26, 26);
  const wallTexture = makeWallTexture();
  wallTexture.repeat.set(2, 2);
  const crateTexture = makeCrateTexture();

  const groundMat = new THREE.MeshStandardMaterial({ map: sandTexture, roughness: 1, metalness: 0 });
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTexture, roughness: 0.95, metalness: 0.02 });
  const crateMat = new THREE.MeshStandardMaterial({ map: crateTexture, roughness: 0.9, metalness: 0.03 });
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x7c4a32, roughness: 0.72, metalness: 0.25 });
  const sandbagMat = new THREE.MeshStandardMaterial({ color: 0xb8a67c, roughness: 1, metalness: 0 });

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 2;
  skyCanvas.height = 256;
  const skyCtx = skyCanvas.getContext('2d');
  const skyGradient = skyCtx.createLinearGradient(0, 0, 0, 256);
  skyGradient.addColorStop(0, '#4f7fb5');
  skyGradient.addColorStop(0.42, '#9dbdd6');
  skyGradient.addColorStop(0.56, '#d9dedb');
  skyGradient.addColorStop(1, '#c2ad83');
  skyCtx.fillStyle = skyGradient;
  skyCtx.fillRect(0, 0, 2, 256);
  const skyTexture = new THREE.CanvasTexture(skyCanvas);
  skyTexture.colorSpace = THREE.SRGBColorSpace;

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(170, 32, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide, fog: false, depthWrite: false })
  );
  sky.position.y = -12;
  scene.add(sky);

  const hemi = new THREE.HemisphereLight(0xd8e8ff, 0x8b7a52, 0.6);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff0cf, 2.8);
  sun.position.set(30, 46, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -46;
  sun.shadow.camera.right = 46;
  sun.shadow.camera.top = 46;
  sun.shadow.camera.bottom = -46;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 140;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  scene.add(sun.target);

  const fill = new THREE.DirectionalLight(0x9dc2ff, 0.4);
  fill.position.set(-24, 20, -28);
  scene.add(fill);

  function addBox(x, z, w, d, h, material, options = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, h / 2 + (options.y || 0), z);
    mesh.castShadow = options.castShadow !== false;
    mesh.receiveShadow = true;
    mesh.userData.solid = true;
    scene.add(mesh);
    solids.push(mesh);
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    return mesh;
  }

  function addBarrel(x, z) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.7, 14), barrelMat);
    mesh.position.set(x, 0.85, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.solid = true;
    scene.add(mesh);
    solids.push(mesh);
    colliders.push({ minX: x - 0.55, maxX: x + 0.55, minZ: z - 0.55, maxZ: z + 0.55 });
  }

  const H = CONFIG.arena.wallHeight;

  addBox(0, -32, 68, 2, H, wallMat);
  addBox(0, 32, 68, 2, H, wallMat);
  addBox(-32, 0, 2, 68, H, wallMat);
  addBox(32, 0, 2, 68, H, wallMat);

  addBox(0, -2, 7, 7, 3.6, wallMat);
  addBox(-9, -15, 12, 1.1, 4, wallMat);
  addBox(12, 15, 1.1, 12, 4, wallMat);

  addBox(10, 7.5, 3, 3, 2.4, crateMat);
  addBox(8, 10.2, 2.2, 2.2, 1.8, crateMat);
  addBox(-11, 8, 3.2, 3.2, 2.6, crateMat);
  addBox(-13.6, 5.4, 2, 2, 1.8, crateMat);

  addBox(18, -8, 4, 4, 3, crateMat);
  addBox(-18, -10, 4, 4, 3, crateMat);

  addBox(-3, 14, 5, 1.2, 1.15, sandbagMat);
  addBox(4, -12, 5, 1.2, 1.15, sandbagMat);

  addBox(22, 20, 4, 3, 2.6, wallMat);
  addBox(-22, 18, 3, 3, 2.6, wallMat);
  addBox(24, -22, 5, 3, 3.2, wallMat);
  addBox(-24, -22, 4, 4, 3, wallMat);

  addBarrel(4, 12);
  addBarrel(5.3, 12.5);
  addBarrel(-6, -20);
  addBarrel(16, 4);
  addBarrel(-16, 22);
  addBarrel(22, -14);

  const distantMat = new THREE.MeshStandardMaterial({ color: 0xb9a985, roughness: 1, metalness: 0 });
  const distant = [
    [-2, -78, 24, 16, 16],
    [38, -66, 16, 14, 22],
    [-52, -58, 18, 18, 18],
    [66, -30, 16, 22, 14],
    [-72, 6, 20, 20, 24],
    [58, 46, 22, 16, 18],
    [-34, 70, 18, 14, 16],
  ];

  for (const [x, z, w, d, h] of distant) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), distantMat);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    scene.add(mesh);
  }

  const waypointData = [
    [0, 18], [-15, 16], [-22, 4], [-18, -16], [-6, -22],
    [6, -22], [18, -12], [22, 4], [16, 16], [0, 10],
    [0, -12], [-10, 2], [10, 2], [0, -20],
  ];

  for (const [x, z] of waypointData) {
    waypoints.push(new THREE.Vector3(x, 0, z));
  }

  const spawnData = [
    [0, -25], [-20, -18], [20, -18], [-23, 2],
    [23, 2], [-8, -24], [9, -23], [18, 22],
  ];

  for (const [x, z] of spawnData) {
    botSpawns.push(new THREE.Vector3(x, 0, z));
  }

  return {
    colliders,
    solids,
    waypoints,
    botSpawns,
    sun,
    playerSpawn: { x: 0, z: 26, yaw: 0 },
    isBlocked: (x, z, radius) => isPointBlocked(x, z, radius, colliders),
  };
}
