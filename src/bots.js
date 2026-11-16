import * as THREE from 'three';
import { CONFIG } from './config.js';
import { clamp, rand, damp, circleVsColliders, UP, createFlashSprite } from './utils.js';

const losRay = new THREE.Raycaster();

const hitboxMaterial = new THREE.MeshBasicMaterial();
hitboxMaterial.visible = false;

const LABEL_WIDTH = 336;
const LABEL_HEIGHT = 120;
const STATE_EMOJI = { patrol: '🙂', search: '🤔', engage: '😠' };
const HIT_EMOJI = '😱';
const DEAD_EMOJI = '💀';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBotLabel(label, { health, maxHealth, emoji, alive }) {
  const { canvas, texture } = label;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT);

  ctx.fillStyle = alive ? 'rgba(8, 12, 16, 0.62)' : 'rgba(24, 10, 10, 0.6)';
  roundRect(ctx, 6, 8, LABEL_WIDTH - 12, LABEL_HEIGHT - 16, 18);
  ctx.fill();
  ctx.strokeStyle = alive ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 110, 96, 0.4)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(54, 60, 32, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 246, 228, 0.92)';
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '44px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  ctx.fillText(emoji, 54, 62);

  const barX = 100;
  const barY = 42;
  const barW = LABEL_WIDTH - 126;
  const barH = 36;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  roundRect(ctx, barX, barY, barW, barH, 18);
  ctx.fill();

  const ratio = alive ? clamp(health / maxHealth, 0, 1) : 0;
  if (ratio > 0) {
    const hue = Math.round(8 + ratio * 112);
    const light = Math.round(42 + ratio * 10);
    ctx.fillStyle = `hsl(${hue}, 78%, ${light}%)`;
    roundRect(ctx, barX + 3, barY + 3, Math.max(10, (barW - 6) * ratio), barH - 6, 15);
    ctx.fill();
  }

  ctx.textAlign = 'right';
  ctx.font = '600 24px "Consolas", "Courier New", monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 4;
  const hpText = alive ? String(Math.max(0, Math.round(health))) : '已击倒';
  ctx.fillText(hpText, barX + barW - 16, barY + barH / 2 + 1);
  ctx.shadowBlur = 0;

  texture.needsUpdate = true;
}

function createBotLabel(health, maxHealth) {
  const canvas = document.createElement('canvas');
  canvas.width = LABEL_WIDTH;
  canvas.height = LABEL_HEIGHT;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.08, (1.08 * LABEL_HEIGHT) / LABEL_WIDTH, 1);
  sprite.renderOrder = 900;
  sprite.frustumCulled = false;

  const label = { canvas, texture, material, sprite };
  drawBotLabel(label, { health, maxHealth, emoji: STATE_EMOJI.patrol, alive: true });
  return label;
}

function buildBotModel() {
  const group = new THREE.Group();
  const materials = [];

  const makeMat = (color) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05 });
    materials.push(material);
    return material;
  };

  const jacket = makeMat(0x8a5f3a);
  const pants = makeMat(0x43403a);
  const skin = makeMat(0xdcae86);
  const vest = makeMat(0x55503f);
  const dark = makeMat(0x1d2023);
  const band = makeMat(0xa8352c);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.72, 0.32), jacket);
  torso.position.y = 1.18;
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  const vestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.42, 0.36), vest);
  vestMesh.position.y = 1.22;
  vestMesh.castShadow = true;
  group.add(vestMesh);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.3), skin);
  head.position.y = 1.72;
  head.castShadow = true;
  group.add(head);

  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.08, 0.33), dark);
  cap.position.y = 1.9;
  cap.castShadow = true;
  group.add(cap);

  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.82, 0.2), pants);
    leg.position.set(side * 0.14, 0.41, 0);
    leg.castShadow = true;
    group.add(leg);
    legs.push(leg);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.56, 0.16), jacket);
    arm.position.set(side * 0.35, 1.16, 0.02);
    arm.rotation.z = side * 0.08;
    arm.castShadow = true;
    group.add(arm);
  }

  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.6), dark);
  gun.position.set(0.16, 1.22, 0.36);
  gun.castShadow = true;
  group.add(gun);

  const flash = createFlashSprite(0.4);
  flash.position.set(0.16, 1.22, 0.68);
  group.add(flash);

  const armband = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.11, 0.18), band);
  armband.position.set(-0.35, 1.33, 0.02);
  armband.castShadow = true;
  group.add(armband);

  const bodyBox = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.5, 0.46), hitboxMaterial);
  bodyBox.position.y = 0.78;
  bodyBox.userData.part = 'body';

  const headBox = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.34), hitboxMaterial);
  headBox.position.y = 1.73;
  headBox.userData.part = 'head';

  group.add(bodyBox, headBox);

  return {
    group,
    materials,
    legs,
    flash,
    hitboxes: [
      { mesh: bodyBox, part: 'body' },
      { mesh: headBox, part: 'head' },
    ],
  };
}

export class Bot {
  constructor(scene, world, spawn, options) {
    this.scene = scene;
    this.world = world;
    this.game = options.game;
    this.name = options.name;

    this.pos = new THREE.Vector3(spawn.x, 0, spawn.z);

    const model = buildBotModel();
    this.group = model.group;
    this.materials = model.materials;
    this.legs = model.legs;
    this.flash = model.flash;
    this.hitboxes = model.hitboxes;

    for (const hitbox of this.hitboxes) {
      hitbox.mesh.userData.bot = this;
      hitbox.mesh.userData.part = hitbox.part;
    }

    this.group.position.copy(this.pos);
    this.group.rotation.y = rand(0, Math.PI * 2);
    scene.add(this.group);

    this.health = CONFIG.bot.health;
    this.alive = true;
    this.removed = false;
    this.deadT = 0;

    this.radius = CONFIG.bot.radius;
    this.speed = CONFIG.bot.speed + rand(-0.25, 0.35);
    this.reaction = options.reaction;
    this.accuracyBonus = options.accuracy;

    this.fireCd = rand(0.4, 1.1);
    this.burstLeft = 0;
    this.burstCd = 0;
    this.aimTimer = 0;
    this.canSee = false;
    this.distToPlayer = 999;
    this.lastSeen = new THREE.Vector3().copy(this.pos);
    this.lastSeenTimer = 0;
    this.perceiveCd = rand(0, 0.12);

    this.waypoint = Math.floor(Math.random() * world.waypoints.length);
    this.strafeDir = Math.random() < 0.5 ? -1 : 1;
    this.strafeTimer = rand(0.8, 1.8);
    this.walkPhase = 0;
    this.muzzleTimer = 0;
    this.hitFlash = 0;
    this.state = 'patrol';
    this.lastState = 'patrol';

    this.maxHealth = CONFIG.bot.health;
    this.emoji = STATE_EMOJI.patrol;
    this.emoteTimer = 0;
    this.label = createBotLabel(this.health, this.maxHealth);
    this.label.sprite.position.set(this.pos.x, 2.42, this.pos.z);
    scene.add(this.label.sprite);
  }

  update(dt, ctx) {
    if (!this.alive) {
      this.deadT += dt;
      this.group.rotation.x = damp(this.group.rotation.x, Math.PI / 2 * 0.94, 6, dt);
      this.label.sprite.position.set(this.pos.x, 1.95, this.pos.z);

      if (this.deadT > 2) {
        const fade = Math.max(0, 1 - (this.deadT - 2) / 1.4);
        for (const material of this.materials) {
          material.transparent = true;
          material.opacity = fade;
        }
        this.label.material.opacity = fade;
        this.flash.visible = false;
      }

      if (this.deadT > 3.4) this.removed = true;
      return;
    }

    const player = ctx.player;
    const bots = ctx.bots;

    this.fireCd -= dt;
    this.burstCd -= dt;
    this.muzzleTimer = Math.max(0, this.muzzleTimer - dt);
    this.flash.visible = this.muzzleTimer > 0;
    this.hitFlash = Math.max(0, this.hitFlash - dt * 4);
    this.applyFlash();

    this.strafeTimer -= dt;
    if (this.strafeTimer <= 0) {
      this.strafeTimer = rand(1, 2.2);
      this.strafeDir *= -1;
    }

    this.perceiveCd -= dt;
    const wasSeeing = this.canSee;
    if (this.perceiveCd <= 0) {
      this.perceiveCd = 0.12;
      this.perceive(player);
    }
    if (this.canSee && !wasSeeing) this.aimTimer = 0;

    if (this.canSee) {
      this.lastSeen.set(player.pos.x, 0, player.pos.z);
      this.lastSeenTimer = 3;
      this.aimTimer += dt;
    } else {
      this.aimTimer = 0;
      this.lastSeenTimer -= dt;
    }

    let moveTarget = null;

    if (this.canSee) {
      this.state = 'engage';
      this.face(player.pos, dt, 9);

      const dist = this.distToPlayer;
      const dirToPlayer = new THREE.Vector3(player.pos.x - this.pos.x, 0, player.pos.z - this.pos.z);
      if (dirToPlayer.lengthSq() > 0.001) dirToPlayer.normalize();

      if (dist > 17) {
        moveTarget = new THREE.Vector3(player.pos.x, 0, player.pos.z);
      } else if (dist < 7) {
        moveTarget = new THREE.Vector3(
          this.pos.x - dirToPlayer.x * 4,
          0,
          this.pos.z - dirToPlayer.z * 4
        );
      } else {
        const side = new THREE.Vector3(-dirToPlayer.z, 0, dirToPlayer.x)
          .multiplyScalar(this.strafeDir);
        moveTarget = new THREE.Vector3(this.pos.x + side.x * 3, 0, this.pos.z + side.z * 3);
      }

      this.tryShoot(player, dist, dt);
    } else if (this.lastSeenTimer > 0) {
      this.state = 'search';
      moveTarget = this.lastSeen.clone();
      this.face(this.lastSeen, dt, 5);
    } else {
      this.state = 'patrol';
      const waypoint = this.world.waypoints[this.waypoint];
      moveTarget = waypoint.clone();
      if (this.pos.distanceTo(waypoint) < 1.6) {
        this.waypoint = (this.waypoint + 1 + Math.floor(Math.random() * 2)) % this.world.waypoints.length;
      }
      this.face(waypoint, dt, 4);
    }

    if (moveTarget) this.move(dt, moveTarget, bots);
    else this.walkPhase = damp(this.walkPhase, 0, 8, dt);

    this.updateEmote(dt);
    this.animateLegs();
    this.group.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.label.sprite.position.set(this.pos.x, 2.42, this.pos.z);
  }

  updateEmote(dt) {
    if (this.state !== this.lastState) {
      this.lastState = this.state;
      if (this.emoteTimer <= 0) {
        this.emoji = STATE_EMOJI[this.state] ?? STATE_EMOJI.patrol;
        this.drawLabel();
      }
    }

    if (this.emoteTimer > 0) {
      this.emoteTimer -= dt;
      if (this.emoteTimer <= 0) {
        this.emoji = STATE_EMOJI[this.state] ?? STATE_EMOJI.patrol;
        this.drawLabel();
      }
    }
  }

  drawLabel() {
    drawBotLabel(this.label, {
      health: this.health,
      maxHealth: this.maxHealth,
      emoji: this.emoji,
      alive: this.alive,
    });
  }

  perceive(player) {
    this.canSee = false;
    if (!player.alive) return;

    const eye = new THREE.Vector3(this.pos.x, 1.6, this.pos.z);
    const target = new THREE.Vector3(player.pos.x, player.pos.y + 1.2, player.pos.z);
    const to = target.clone().sub(eye);
    const dist = to.length();
    this.distToPlayer = dist;

    if (dist > CONFIG.bot.viewRange) return;

    const forward = new THREE.Vector3(
      Math.sin(this.group.rotation.y),
      0,
      Math.cos(this.group.rotation.y)
    );

    const flat = to.clone().setY(0);
    if (flat.lengthSq() < 1e-6) {
      this.canSee = true;
      return;
    }
    flat.normalize();
    if (flat.dot(forward) < 0.15 && dist > 5) return;

    losRay.set(eye, to.clone().normalize());
    losRay.near = 0;
    losRay.far = Math.max(0.2, dist - 0.3);
    const hits = losRay.intersectObjects(this.world.solids, false);
    this.canSee = hits.length === 0;
  }

  face(target, dt, rate) {
    const desired = Math.atan2(target.x - this.pos.x, target.z - this.pos.z);
    let diff = desired - this.group.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.group.rotation.y += diff * Math.min(1, rate * dt);
  }

  move(dt, target, bots) {
    const dir = new THREE.Vector3(target.x - this.pos.x, 0, target.z - this.pos.z);
    const len = dir.length();
    if (len < 0.05) return;
    dir.divideScalar(len);

    this.avoid(dir);

    this.pos.x += dir.x * this.speed * dt;
    this.pos.z += dir.z * this.speed * dt;

    for (const other of bots) {
      if (other === this || !other.alive) continue;
      const dx = this.pos.x - other.pos.x;
      const dz = this.pos.z - other.pos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > 1e-4 && d2 < 1.44) {
        const d = Math.sqrt(d2);
        const push = ((1.2 - d) / d) * 0.5;
        this.pos.x += dx * push;
        this.pos.z += dz * push;
      }
    }

    circleVsColliders(this.pos, this.radius, this.world.colliders, -30.55, 30.55, -30.55, 30.55);
    this.walkPhase += dt * 8;
  }

  avoid(dir) {
    const step = 1.5;
    if (!this.world.isBlocked(this.pos.x + dir.x * step, this.pos.z + dir.z * step, 0.55)) return;

    for (const angle of [0.8, -0.8, 1.5, -1.5, 2.3, -2.3]) {
      const candidate = dir.clone().applyAxisAngle(UP, angle);
      if (!this.world.isBlocked(
        this.pos.x + candidate.x * step,
        this.pos.z + candidate.z * step,
        0.55
      )) {
        dir.copy(candidate);
        return;
      }
    }

    dir.set(0, 0, 0);
  }

  tryShoot(player, dist, dt) {
    if (!player.alive) return;
    if (this.burstLeft <= 0 && this.burstCd > 0) return;
    if (this.fireCd > 0) return;
    if (this.aimTimer < this.reaction) return;

    if (this.burstLeft <= 0) this.burstLeft = 3 + Math.floor(Math.random() * 3);
    this.burstLeft--;
    this.fireCd = 0.11 + Math.random() * 0.09;
    if (this.burstLeft <= 0) this.burstCd = rand(0.9, 1.6);

    this.muzzleTimer = 0.05;
    this.game.audio.botShot(dist);

    const origin = new THREE.Vector3(
      this.pos.x + Math.sin(this.group.rotation.y) * 0.45,
      1.3,
      this.pos.z + Math.cos(this.group.rotation.y) * 0.45
    );

    let chance = 0.5 - dist * 0.0095 + this.accuracyBonus;
    chance = clamp(chance, 0.08, 0.6);
    if (player.speedXZ > 3) chance *= 0.82;
    if (!player.onGround) chance *= 0.85;

    const aimPoint = new THREE.Vector3(player.pos.x, player.pos.y + 1.2, player.pos.z);

    if (Math.random() < chance) {
      aimPoint.x += rand(-0.12, 0.12);
      aimPoint.y += rand(-0.15, 0.15);
      aimPoint.z += rand(-0.12, 0.12);
      this.game.spawnTracer(origin, aimPoint, 0xffc06a);
      this.game.onPlayerDamaged(this, rand(CONFIG.bot.damageMin, CONFIG.bot.damageMax));
    } else {
      const offset = new THREE.Vector3(rand(-1.4, 1.4), rand(-0.8, 1.2), rand(-1.4, 1.4));
      this.game.spawnTracer(origin, aimPoint.clone().add(offset), 0xffc06a);
    }
  }

  takeDamage(amount, part) {
    if (!this.alive) return;

    this.health -= amount;
    this.hitFlash = 3;

    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.deadT = 0;
      this.canSee = false;
      this.emoji = DEAD_EMOJI;
      this.emoteTimer = 0;
      this.drawLabel();
      this.flash.visible = false;
      for (const material of this.materials) {
        material.emissive.setHex(0x000000);
        material.emissiveIntensity = 0;
      }
      this.game.onBotKilled(this, part === 'head');
    } else {
      this.emoji = HIT_EMOJI;
      this.emoteTimer = 0.5;
      this.drawLabel();
    }
  }

  applyFlash() {
    const intensity = clamp(this.hitFlash, 0, 1) * 1.6;
    for (const material of this.materials) {
      material.emissive.setHex(0x8a1410);
      material.emissiveIntensity = intensity;
    }
  }

  animateLegs() {
    const swing = Math.sin(this.walkPhase) * 0.45;
    this.legs[0].rotation.x = swing;
    this.legs[1].rotation.x = -swing;
  }

  dispose() {
    this.scene.remove(this.label.sprite);
    this.label.texture.dispose();
    this.label.material.dispose();

    this.group.traverse((obj) => {
      if (obj.isMesh && !obj.userData.part) {
        obj.geometry.dispose();
        obj.material.dispose?.();
      }
      if (obj.isSprite) {
        obj.material.dispose();
      }
    });
  }
}

export class BotManager {
  constructor(scene, world, game) {
    this.scene = scene;
    this.world = world;
    this.game = game;
    this.bots = [];
  }

  spawn(count, round) {
    for (let i = 0; i < count; i++) {
      const base = this.world.botSpawns[i % this.world.botSpawns.length];
      const spawn = new THREE.Vector3(
        clamp(base.x + rand(-1.6, 1.6), -28, 28),
        0,
        clamp(base.z + rand(-1.6, 1.6), -28, 28)
      );

      let guard = 0;
      while (this.world.isBlocked(spawn.x, spawn.z, 0.8) && guard++ < 12) {
        spawn.x = clamp(spawn.x + rand(-3, 3), -28, 28);
        spawn.z = clamp(spawn.z + rand(-3, 3), -28, 28);
      }

      const bot = new Bot(this.scene, this.world, spawn, {
        name: `邱明东${i + 1}号`,
        reaction: clamp(0.55 - (round - 1) * 0.022, 0.22, 0.6) + rand(0, 0.12),
        accuracy: Math.min(0.2, (round - 1) * 0.02),
        game: this.game,
      });

      this.bots.push(bot);
    }
  }

  update(dt, player) {
    for (const bot of this.bots) {
      bot.update(dt, { player, bots: this.bots });
    }

    for (let i = this.bots.length - 1; i >= 0; i--) {
      const bot = this.bots[i];
      if (bot.removed) {
        this.scene.remove(bot.group);
        bot.dispose();
        this.bots.splice(i, 1);
      }
    }
  }

  clear() {
    for (const bot of this.bots) {
      this.scene.remove(bot.group);
      bot.dispose();
    }
    this.bots.length = 0;
  }

  hitboxes() {
    const list = [];
    for (const bot of this.bots) {
      if (!bot.alive) continue;
      for (const hitbox of bot.hitboxes) list.push(hitbox.mesh);
    }
    return list;
  }

  get aliveCount() {
    let count = 0;
    for (const bot of this.bots) if (bot.alive) count++;
    return count;
  }

  get total() {
    return this.bots.length;
  }
}
