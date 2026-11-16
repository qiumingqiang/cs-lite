import * as THREE from 'three';
import { CONFIG } from './config.js';
import { clamp, rand, damp, createFlashSprite } from './utils.js';

function addPart(group, spec) {
  const material = new THREE.MeshStandardMaterial({
    color: spec.color,
    metalness: spec.metalness ?? 0.35,
    roughness: spec.roughness ?? 0.55,
    emissive: spec.color,
    emissiveIntensity: 0.12,
  });

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(spec.w, spec.h, spec.d),
    material
  );
  mesh.position.set(spec.x, spec.y, spec.z);
  mesh.rotation.set(spec.rx ?? 0, spec.ry ?? 0, spec.rz ?? 0);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  mesh.renderOrder = 999;
  group.add(mesh);
  return mesh;
}

function buildRifle() {
  const group = new THREE.Group();
  group.position.set(0.3, -0.25, -0.85);
  group.rotation.set(0.02, 0.05, 0);
  group.scale.setScalar(0.78);

  addPart(group, { w: 0.055, h: 0.09, d: 0.27, color: 0x6b4326, x: 0, y: -0.015, z: 0.29, rx: 0.05, roughness: 0.85, metalness: 0.03 });
  addPart(group, { w: 0.085, h: 0.1, d: 0.4, color: 0x2f3439, x: 0, y: 0, z: 0 });
  addPart(group, { w: 0.055, h: 0.19, d: 0.1, color: 0x4a3a26, x: 0, y: -0.13, z: -0.01, rx: 0.22, roughness: 0.8 });
  addPart(group, { w: 0.048, h: 0.15, d: 0.075, color: 0x5c3a20, x: 0, y: -0.11, z: 0.13, rx: -0.22, roughness: 0.9, metalness: 0.03 });
  addPart(group, { w: 0.062, h: 0.065, d: 0.24, color: 0x7a4f2c, x: 0, y: -0.005, z: -0.26, roughness: 0.85, metalness: 0.03 });
  addPart(group, { w: 0.036, h: 0.036, d: 0.32, color: 0x1d2023, x: 0, y: 0.016, z: -0.42, metalness: 0.7, roughness: 0.4 });
  addPart(group, { w: 0.03, h: 0.045, d: 0.03, color: 0x141618, x: 0, y: 0.079, z: -0.34 });
  addPart(group, { w: 0.03, h: 0.035, d: 0.06, color: 0x141618, x: 0, y: 0.068, z: 0.02 });
  addPart(group, { w: 0.06, h: 0.028, d: 0.15, color: 0x24282b, x: 0, y: 0.055, z: -0.07 });
  addPart(group, { w: 0.075, h: 0.095, d: 0.105, color: 0x2b2620, x: 0, y: -0.115, z: 0.1, roughness: 0.92, metalness: 0.02 });
  addPart(group, { w: 0.082, h: 0.08, d: 0.14, color: 0x2b2620, x: 0, y: -0.062, z: -0.24, roughness: 0.92, metalness: 0.02 });

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.016, -0.58);
  group.add(muzzle);

  const flash = createFlashSprite(0.34);
  flash.position.copy(muzzle.position);
  group.add(flash);

  return { group, flash, muzzle };
}

function buildPistol() {
  const group = new THREE.Group();
  group.position.set(0.23, -0.2, -0.62);
  group.rotation.set(0.02, 0.05, 0);
  group.scale.setScalar(0.85);

  addPart(group, { w: 0.05, h: 0.065, d: 0.28, color: 0x2b2f33, x: 0, y: 0.015, z: -0.04, metalness: 0.5, roughness: 0.4 });
  addPart(group, { w: 0.042, h: 0.13, d: 0.075, color: 0x1f2225, x: 0, y: -0.075, z: 0.03, rx: -0.22, roughness: 0.85 });
  addPart(group, { w: 0.045, h: 0.045, d: 0.17, color: 0x232629, x: 0, y: 0.015, z: -0.25, metalness: 0.7, roughness: 0.35 });
  addPart(group, { w: 0.012, h: 0.022, d: 0.012, color: 0x0f1113, x: 0, y: 0.055, z: -0.16 });
  addPart(group, { w: 0.012, h: 0.02, d: 0.012, color: 0x0f1113, x: 0, y: 0.055, z: 0.07 });
  addPart(group, { w: 0.06, h: 0.1, d: 0.085, color: 0x2b2620, x: 0, y: -0.085, z: 0.028, rx: -0.22, roughness: 0.92, metalness: 0.02 });

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.015, -0.36);
  group.add(muzzle);

  const flash = createFlashSprite(0.26);
  flash.position.copy(muzzle.position);
  group.add(flash);

  return { group, flash, muzzle };
}

function buildSniper() {
  const group = new THREE.Group();
  group.position.set(0.29, -0.235, -0.95);
  group.rotation.set(0.012, 0.04, 0);
  group.scale.setScalar(0.8);

  addPart(group, { w: 0.07, h: 0.11, d: 0.36, color: 0x3d4a37, x: 0, y: -0.025, z: 0.32, rx: 0.04, roughness: 0.8, metalness: 0.05 });
  addPart(group, { w: 0.05, h: 0.16, d: 0.08, color: 0x2f3830, x: 0, y: -0.12, z: 0.11, rx: -0.2, roughness: 0.85, metalness: 0.03 });
  addPart(group, { w: 0.075, h: 0.11, d: 0.46, color: 0x2a3237, x: 0, y: 0, z: -0.06, metalness: 0.55, roughness: 0.42 });
  addPart(group, { w: 0.035, h: 0.035, d: 0.72, color: 0x1c2124, x: 0, y: 0.012, z: -0.62, metalness: 0.75, roughness: 0.35 });
  addPart(group, { w: 0.052, h: 0.052, d: 0.09, color: 0x14181a, x: 0, y: 0.012, z: -1.0, metalness: 0.8, roughness: 0.3 });
  addPart(group, { w: 0.06, h: 0.12, d: 0.14, color: 0x252b2e, x: 0, y: -0.1, z: -0.06, roughness: 0.7 });
  addPart(group, { w: 0.12, h: 0.026, d: 0.026, color: 0x171b1d, x: 0.09, y: 0.04, z: -0.02, metalness: 0.7, roughness: 0.35 });
  addPart(group, { w: 0.066, h: 0.07, d: 0.2, color: 0x36402f, x: 0, y: -0.02, z: -0.38, roughness: 0.85 });
  addPart(group, { w: 0.03, h: 0.05, d: 0.03, color: 0x111517, x: 0, y: 0.075, z: -0.15 });
  addPart(group, { w: 0.03, h: 0.05, d: 0.03, color: 0x111517, x: 0, y: 0.075, z: -0.01 });

  const scopeMaterial = new THREE.MeshStandardMaterial({
    color: 0x14181b,
    metalness: 0.8,
    roughness: 0.3,
    emissive: 0x14181b,
    emissiveIntensity: 0.12,
  });
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.34, 10), scopeMaterial);
  scope.rotation.x = Math.PI / 2;
  scope.position.set(0, 0.105, -0.08);
  scope.frustumCulled = false;
  scope.renderOrder = 999;
  group.add(scope);

  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(0.036, 14),
    new THREE.MeshBasicMaterial({ color: 0x4d8fd6 })
  );
  lens.position.set(0, 0.105, 0.09);
  lens.frustumCulled = false;
  lens.renderOrder = 999;
  group.add(lens);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.012, -1.05);
  group.add(muzzle);

  const flash = createFlashSprite(0.42);
  flash.position.copy(muzzle.position);
  group.add(flash);

  return { group, flash, muzzle };
}

export class WeaponSystem {
  constructor(camera, audio) {
    this.camera = camera;
    this.audio = audio;
    this.weapons = CONFIG.weapons;
    this.state = this.weapons.map((w) => ({ mag: w.mag, reserve: w.reserve }));
    this.index = 0;
    this.baseFov = camera.fov;
    this.zoomEase = 0;

    this.models = [buildRifle(), buildPistol(), buildSniper()];
    this.group = new THREE.Group();
    this.camera.add(this.group);

    for (const model of this.models) {
      model.group.visible = false;
      model.flash.visible = false;
      this.group.add(model.group);
    }
    this.models[0].group.visible = true;

    this.fireTimer = 0;
    this.switchTimer = 0;
    this.kick = 0;
    this.swayX = 0;
    this.swayY = 0;
    this.reloading = 0;
    this.reloadTotal = 0;
    this.flashTimer = 0;
    this.prevTrigger = false;
    this.reloadHeld = false;
    this.onShoot = null;

    this.flashLight = new THREE.PointLight(0xffb066, 0, 7, 2);
    this.flashLight.position.set(0.3, -0.15, -0.7);
    this.camera.add(this.flashLight);

    this.fillLight = new THREE.PointLight(0xfff0dc, 1.4, 5, 2);
    this.fillLight.position.set(0.35, 0.1, -0.35);
    this.camera.add(this.fillLight);
  }

  get weapon() {
    return this.weapons[this.index];
  }

  get ammo() {
    return this.state[this.index];
  }

  get reloadProgress() {
    return this.reloading > 0 ? 1 - this.reloading / this.reloadTotal : 0;
  }

  get scoped() {
    return this.zoomEase > 0.55;
  }

  resetZoom() {
    this.zoomEase = 0;
    this.models[this.index].group.visible = true;
    if (Math.abs(this.camera.fov - this.baseFov) > 0.01) {
      this.camera.fov = this.baseFov;
      this.camera.updateProjectionMatrix();
    }
  }

  applyFov() {
    const zoomedFov = this.weapon.zoomFov ?? this.baseFov;
    const fov = this.baseFov + (zoomedFov - this.baseFov) * this.zoomEase;
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  resetAmmo() {
    this.state = this.weapons.map((w) => ({ mag: w.mag, reserve: w.reserve }));
    this.reloading = 0;
    this.reloadTotal = 0;
    this.fireTimer = 0;
    this.switchTimer = 0;
    this.kick = 0;
    this.flashTimer = 0;
    this.prevTrigger = false;
    this.index = 0;
    this.zoomEase = 0;
    this.switchTimer = 0.32;

    if (Math.abs(this.camera.fov - this.baseFov) > 0.01) {
      this.camera.fov = this.baseFov;
      this.camera.updateProjectionMatrix();
    }

    this.models.forEach((model, i) => {
      model.group.visible = i === 0;
      model.flash.visible = false;
    });
  }

  currentSpread(player) {
    const w = this.weapon;
    let spread = w.spread;
    spread += w.moveSpread * clamp(player.speedXZ / CONFIG.player.walkSpeed, 0, 1);
    if (!player.onGround) spread += w.airSpread;
    if (player.crouching) spread *= w.crouchBonus;
    return spread;
  }

  tryFire(player) {
    if (this.switchTimer > 0 || this.reloading > 0) return false;
    if (this.fireTimer > 0) return false;

    const w = this.weapon;
    const ammo = this.state[this.index];

    if (ammo.mag <= 0) {
      this.audio.empty();
      this.fireTimer = 0.28;
      this.startReload();
      return false;
    }

    ammo.mag--;
    this.fireTimer = 60 / w.rpm;
    this.kick = Math.min(1.2, this.kick + 0.9);
    this.flashTimer = 0.045;
    player.addRecoil(w.recoil * rand(0.85, 1.15), rand(-1, 1) * w.recoilYaw);
    this.audio.shot(w.id);
    this.onShoot?.(w, this.currentSpread(player));
    return true;
  }

  startReload() {
    if (this.reloading > 0) return;
    const w = this.weapon;
    const ammo = this.state[this.index];
    if (ammo.mag >= w.mag || ammo.reserve <= 0) return;

    this.reloading = w.reload;
    this.reloadTotal = w.reload;
    this.audio.reload(w.reload);
  }

  finishReload() {
    const w = this.weapon;
    const ammo = this.state[this.index];
    const need = w.mag - ammo.mag;
    const take = Math.min(need, ammo.reserve);
    ammo.mag += take;
    ammo.reserve -= take;
  }

  switchTo(index) {
    if (this.switchTimer > 0 || index === this.index) return;
    this.reloading = 0;
    this.models[this.index].group.visible = false;
    this.models[this.index].flash.visible = false;
    this.index = index;
    this.models[this.index].group.visible = true;
    this.switchTimer = 0.32;
    this.zoomEase = 0;
    this.applyFov();
    this.audio.switchWeapon();
  }

  update(dt, input, player, allowFire = true) {
    this.fireTimer = Math.max(0, this.fireTimer - dt);
    this.switchTimer = Math.max(0, this.switchTimer - dt);
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    this.kick = damp(this.kick, 0, 14, dt);

    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) {
        this.reloading = 0;
        this.finishReload();
      }
    }

    if (allowFire) {
      if (input.down('Digit1') && this.index !== 0) this.switchTo(0);
      if (input.down('Digit2') && this.index !== 1) this.switchTo(1);
      if (input.down('Digit3') && this.index !== 2) this.switchTo(2);
    }

    const wantZoom = allowFire
      && Boolean(this.weapon.zoomFov)
      && input.rightDown
      && this.switchTimer <= 0
      && this.reloading <= 0;
    this.zoomEase = damp(this.zoomEase, wantZoom ? 1 : 0, 16, dt);
    this.applyFov();

    const reloadDown = allowFire && input.down('KeyR');
    if (reloadDown && !this.reloadHeld) this.startReload();
    this.reloadHeld = reloadDown;

    const trigger = allowFire && input.mouseDown;
    const wantFire = this.weapon.auto ? trigger : (trigger && !this.prevTrigger);
    this.prevTrigger = trigger;

    if (wantFire) this.tryFire(player);

    this.updateAnimation(dt, player);
  }

  updateAnimation(dt, player) {
    this.swayX = damp(this.swayX, clamp(-player.lookX * 0.0007, -0.03, 0.03), 10, dt);
    this.swayY = damp(this.swayY, clamp(player.lookY * 0.0007, -0.03, 0.03), 10, dt);

    const bob = player.onGround
      ? Math.sin(player.bobTime * 1.9) * 0.009 * clamp(player.speedXZ / 6, 0, 1)
      : 0;
    const reloadProg = this.reloadProgress;
    const reloadDip = Math.sin(reloadProg * Math.PI) * 0.16;
    const switchDip = this.switchTimer > 0
      ? Math.sin((this.switchTimer / 0.32) * Math.PI) * 0.18
      : 0;

    this.group.position.set(
      this.swayX,
      -bob - reloadDip - switchDip,
      this.kick * 0.055
    );
    this.group.rotation.set(
      -this.kick * 0.14 + reloadDip * 1.8,
      this.swayX * 2.4 + this.swayY * 0.6,
      this.swayX * 2 + 0.02
    );

    const model = this.models[this.index];
    model.flash.visible = this.flashTimer > 0;
    model.group.visible = this.zoomEase < 0.82;
    this.flashLight.intensity = this.flashTimer > 0 ? 4 : 0;
  }
}
