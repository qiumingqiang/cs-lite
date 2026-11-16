import * as THREE from 'three';
import { CONFIG } from './config.js';
import { clamp, damp, circleVsColliders } from './utils.js';

export class Player {
  constructor(camera, spawn) {
    this.camera = camera;
    this.camera.rotation.order = 'YXZ';

    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.eyeHeight = CONFIG.player.eyeHeight;
    this.onGround = true;
    this.crouching = false;

    this.health = CONFIG.player.maxHealth;
    this.armor = CONFIG.player.maxArmor;
    this.alive = true;

    this.bobTime = 0;
    this.shake = 0;
    this.hitFlash = 0;
    this.lookX = 0;
    this.lookY = 0;
    this.aimSensitivity = 1;

    this.reset(spawn);
  }

  reset(spawn) {
    const p = CONFIG.player;
    this.pos.set(spawn.x, 0, spawn.z);
    this.vel.set(0, 0, 0);
    this.yaw = spawn.yaw ?? 0;
    this.pitch = 0;
    this.eyeHeight = p.eyeHeight;
    this.onGround = true;
    this.crouching = false;
    this.health = p.maxHealth;
    this.armor = p.maxArmor;
    this.alive = true;
    this.bobTime = 0;
    this.shake = 0;
    this.hitFlash = 0;
    this.lookX = 0;
    this.lookY = 0;
    this.aimSensitivity = 1;
    this.spawnProtect = 0;
    this.syncCamera(0);
  }

  get speedXZ() {
    return Math.hypot(this.vel.x, this.vel.z);
  }

  update(dt, input, world) {
    if (!this.alive) {
      this.vel.set(0, 0, 0);
      this.syncCamera(0);
      return;
    }

    this.spawnProtect = Math.max(0, this.spawnProtect - dt);

    const p = CONFIG.player;
    const look = input.consumeMouse();
    this.lookX = look.x;
    this.lookY = look.y;
    const sensitivity = p.mouseSensitivity * this.aimSensitivity;
    this.yaw -= look.x * sensitivity;
    this.pitch = clamp(this.pitch - look.y * sensitivity, -1.45, 1.45);

    this.crouching = input.down('ControlLeft') || input.down('KeyC');
    const slowWalk = input.down('ShiftLeft') || input.down('ShiftRight');

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const wish = new THREE.Vector3();
    if (input.down('KeyW')) wish.add(forward);
    if (input.down('KeyS')) wish.sub(forward);
    if (input.down('KeyD')) wish.add(right);
    if (input.down('KeyA')) wish.sub(right);
    if (wish.lengthSq() > 0) wish.normalize();

    let speed = this.crouching ? p.crouchSpeed : p.walkSpeed;
    if (slowWalk && !this.crouching) speed *= p.walkModifier;

    const accel = this.onGround ? 16 : 3;
    this.vel.x = damp(this.vel.x, wish.x * speed, accel, dt);
    this.vel.z = damp(this.vel.z, wish.z * speed, accel, dt);

    if (input.down('Space') && this.onGround) {
      this.vel.y = p.jumpSpeed;
      this.onGround = false;
    }

    this.vel.y -= p.gravity * dt;

    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.pos.y += this.vel.y * dt;

    if (this.pos.y <= 0) {
      this.pos.y = 0;
      this.vel.y = 0;
      this.onGround = true;
    }

    circleVsColliders(this.pos, p.radius, world.colliders, -30.55, 30.55, -30.55, 30.55);

    this.eyeHeight = damp(this.eyeHeight, this.crouching ? p.crouchEyeHeight : p.eyeHeight, 12, dt);
    this.shake = Math.max(0, this.shake - dt * 3.4);
    this.hitFlash = Math.max(0, this.hitFlash - dt * 1.8);

    this.syncCamera(dt);
  }

  syncCamera(dt) {
    const p = CONFIG.player;
    const speed = this.speedXZ;
    const bobAmt = this.onGround ? clamp(speed / p.walkSpeed, 0, 1) : 0;

    if (dt > 0 && this.onGround && speed > 0.4) {
      this.bobTime += dt * (5.5 + speed * 1.3);
    }

    const bobY = Math.sin(this.bobTime * 1.9) * 0.02 * bobAmt;
    const bobX = Math.cos(this.bobTime * 0.95) * 0.014 * bobAmt;

    const shakePitch = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 0.02 : 0;
    const shakeRoll = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 0.035 : 0;

    this.camera.position.set(
      this.pos.x + bobX * 0.35,
      this.pos.y + this.eyeHeight + bobY,
      this.pos.z
    );
    this.camera.rotation.set(this.pitch + shakePitch, this.yaw, shakeRoll + bobX * 0.5, 'YXZ');
  }

  addRecoil(pitch, yaw) {
    this.pitch = clamp(this.pitch + pitch, -1.45, 1.45);
    this.yaw += yaw;
  }

  takeDamage(amount) {
    if (!this.alive || this.spawnProtect > 0) return;

    let damage = amount;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, amount * 0.5);
      this.armor -= absorbed;
      damage -= absorbed;
    }

    this.health = Math.max(0, this.health - damage);
    this.shake = Math.min(1, this.shake + 0.5);
    this.hitFlash = 1;

    if (this.health <= 0) {
      this.alive = false;
      this.vel.set(0, 0, 0);
    }
  }
}
