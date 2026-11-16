import * as THREE from 'three';

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export const lerp = (a, b, t) => a + (b - a) * t;

export const rand = (min, max) => min + Math.random() * (max - min);

export const randInt = (min, max) => Math.floor(rand(min, max + 1));

export const damp = (current, target, lambda, dt) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

export const UP = new THREE.Vector3(0, 1, 0);

export function circleVsColliders(pos, radius, colliders, minX = -1000, maxX = 1000, minZ = -1000, maxZ = 1000) {
  for (let iter = 0; iter < 2; iter++) {
    for (const c of colliders) {
      const cx = clamp(pos.x, c.minX, c.maxX);
      const cz = clamp(pos.z, c.minZ, c.maxZ);
      const dx = pos.x - cx;
      const dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;

      if (d2 >= radius * radius) continue;

      if (d2 < 1e-8) {
        const left = pos.x - c.minX;
        const right = c.maxX - pos.x;
        const back = pos.z - c.minZ;
        const front = c.maxZ - pos.z;
        const m = Math.min(left, right, back, front);
        if (m === left) pos.x = c.minX - radius;
        else if (m === right) pos.x = c.maxX + radius;
        else if (m === back) pos.z = c.minZ - radius;
        else pos.z = c.maxZ + radius;
      } else {
        const d = Math.sqrt(d2);
        const push = (radius - d) / d;
        pos.x += dx * push;
        pos.z += dz * push;
      }
    }
  }

  pos.x = clamp(pos.x, minX, maxX);
  pos.z = clamp(pos.z, minZ, maxZ);
}

export function isPointBlocked(x, z, radius, colliders) {
  for (const c of colliders) {
    const cx = clamp(x, c.minX, c.maxX);
    const cz = clamp(z, c.minZ, c.maxZ);
    const dx = x - cx;
    const dz = z - cz;
    if (dx * dx + dz * dz < radius * radius) return true;
  }
  return false;
}

let flashTexture = null;

export function createFlashSprite(size = 0.36) {
  if (!flashTexture) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,225,1)');
    grd.addColorStop(0.22, 'rgba(255,214,130,0.95)');
    grd.addColorStop(0.55, 'rgba(255,150,52,0.28)');
    grd.addColorStop(1, 'rgba(255,120,20,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 64, 64);
    flashTexture = new THREE.CanvasTexture(canvas);
    flashTexture.colorSpace = THREE.SRGBColorSpace;
  }

  const material = new THREE.SpriteMaterial({
    map: flashTexture,
    color: 0xffffff,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.setScalar(size);
  sprite.visible = false;
  sprite.renderOrder = 1000;
  return sprite;
}
