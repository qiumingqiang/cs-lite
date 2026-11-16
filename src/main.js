import * as THREE from 'three';
import { CONFIG } from './config.js';
import { buildWorld } from './world.js';
import { Player } from './player.js';
import { WeaponSystem } from './weapons.js';
import { BotManager } from './bots.js';
import { HUD } from './hud.js';
import { AudioFX } from './audio.js';
import { Input } from './input.js';
import { rand } from './utils.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('game');

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9fb6c9);
    this.scene.fog = new THREE.Fog(0xbecbd3, 55, 150);

    this.camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.05, 300);
    this.scene.add(this.camera);

    this.world = buildWorld(this.scene);
    this.scene.updateMatrixWorld(true);

    this.player = new Player(this.camera, this.world.playerSpawn);
    this.audio = new AudioFX();
    this.input = new Input(this.canvas);
    this.hud = new HUD();
    this.weapons = new WeaponSystem(this.camera, this.audio);
    this.bots = new BotManager(this.scene, this.world, this);

    this.weapons.onShoot = (weapon, spread) => this.traceShot(weapon, spread);

    this.state = 'menu';
    this.round = 0;
    this.kills = 0;
    this.deaths = 0;
    this.streak = 0;
    this.multiKills = 0;
    this.multiTimer = 0;
    this.roundKills = 0;
    this.stats = { shots: 0, hits: 0 };
    this.time = 0;
    this.effects = [];
    this.timers = [];
    this.puffGeometry = new THREE.SphereGeometry(1, 6, 6);
    this.raycaster = new THREE.Raycaster();
    this.clock = new THREE.Clock();
    this.testMode = false;
    this.everLocked = false;

    this.bindEvents();
    this.hud.hideHud();
    this.hud.showMenu();

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);

    this.exposeDebugApi();
  }

  bindEvents() {
    document.getElementById('startBtn').addEventListener('click', () => {
      this.audio.resume();
      this.startGame();
    });

    document.getElementById('resumeBtn').addEventListener('click', () => this.resume());
    document.getElementById('pause').addEventListener('click', () => this.resume());

    this.canvas.addEventListener('click', () => {
      if (this.state === 'playing' && !this.input.locked && !this.testMode) {
        this.input.requestLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === this.canvas;
      if (locked) {
        this.everLocked = true;
        return;
      }
      if (this.state === 'playing' && this.everLocked && !this.testMode) this.pause();
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('keydown', (e) => {
      if (e.code !== 'Tab') return;
      e.preventDefault();
      if (this.state === 'playing' || this.state === 'dead') {
        this.hud.setScoreboard({
          kills: this.kills,
          deaths: this.deaths,
          round: this.round,
          shots: this.stats.shots,
          hits: this.stats.hits,
          enemies: this.bots.aliveCount,
        });
        this.hud.toggleScoreboard(true);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Tab') this.hud.toggleScoreboard(false);
    });
  }

  startGame(skipLock = false) {
    this.audio.resume();
    this.kills = 0;
    this.deaths = 0;
    this.streak = 0;
    this.multiKills = 0;
    this.multiTimer = 0;
    this.roundKills = 0;
    this.stats.shots = 0;
    this.stats.hits = 0;
    this.timers.length = 0;

    this.hud.hideMenu();
    this.hud.hidePause();
    this.hud.showHud();
    this.hud.setDead(false);
    this.hud.toggleScoreboard(false);

    this.state = 'playing';
    this.input.mouseDown = false;
    this.startRound(1);

    if (skipLock) {
      this.testMode = true;
      this.input.testMode = true;
    } else {
      this.input.requestLock();
    }
  }

  startRound(round) {
    this.round = round;
    this.roundKills = 0;
    this.multiKills = 0;
    this.multiTimer = 0;
    this.player.reset(this.world.playerSpawn);
    this.weapons.resetAmmo();
    this.bots.clear();
    this.hud.clearKillfeed();
    this.hud.clearKillAnnounce();

    const count = Math.min(CONFIG.round.baseBots + round - 1, CONFIG.round.maxBots);
    this.bots.spawn(count, round);

    this.hud.setRound(round);
    this.hud.setKills(this.kills);
    this.hud.setEnemies(count);
    this.hud.setHealth(this.player.health, this.player.armor);
    this.hud.setAmmo(this.weapons.ammo.mag, this.weapons.ammo.reserve, 0);
    this.hud.setWeaponName(this.weapons.weapon.name);
    this.hud.showBanner(`第 ${round} 回合`, `清除 ${count} 名敌人`, 1.8);
    this.audio.roundStart();
  }

  winRound() {
    this.state = 'roundEnd';
    this.player.aimSensitivity = 1;
    const next = this.round + 1;
    this.hud.showBanner('回合胜利', `下一回合 ${next} 即将开始`, 2.3);
    this.audio.roundWon();

    this.schedule(2.8, () => {
      if (this.state !== 'roundEnd') return;
      this.state = 'playing';
      this.startRound(next);
    });
  }

  onBotKilled(bot, headshot) {
    this.kills++;
    this.roundKills++;
    this.streak++;
    this.multiKills = this.multiTimer > 0 ? this.multiKills + 1 : 1;
    this.multiTimer = 10;

    this.hud.setKills(this.kills);
    this.hud.addKillfeed(headshot);
    this.hud.setEnemies(this.bots.aliveCount);
    this.audio.botDeath();
    this.announceKill();
  }

  announceKill() {
    const multi = {
      2: ['Double Kill', '双杀'],
      3: ['Triple Kill', '三杀'],
      4: ['Quadra Kill', '四杀'],
      5: ['Penta Kill', '五杀'],
    }[this.multiKills];

    const streak = {
      3: ['Killing Spree', '大杀特杀'],
      4: ['Rampage', '主宰比赛'],
      5: ['Unstoppable', '无人能挡'],
      6: ['Godlike', '变态杀戮'],
      7: ['Legendary', '超神'],
    }[this.streak];

    const line = multi || streak || (this.kills === 1 ? ['First Blood', '第一滴血'] : null);
    if (!line) return;

    this.hud.showKillAnnounce(line[0], line[1]);
    this.audio.announce(line[0]);
  }

  onPlayerDamaged(bot, amount) {
    if (this.state !== 'playing') return;
    if (this.player.spawnProtect > 0) return;
    this.player.takeDamage(amount);
    this.hud.flashDamage();
    this.audio.hurt();
    if (!this.player.alive) this.onPlayerKilled();
  }

  onPlayerKilled() {
    if (this.state === 'dead') return;
    this.deaths++;
    this.state = 'dead';
    this.streak = 0;
    this.multiKills = 0;
    this.multiTimer = 0;
    this.weapons.resetZoom();
    this.player.aimSensitivity = 1;
    this.hud.setDead(true);
    this.hud.showBanner('阵亡', '3 秒后重新部署', 2.4);
    this.audio.playerDeath();

    this.schedule(3, () => {
      if (this.state !== 'dead') return;
      this.state = 'playing';
      this.hud.setDead(false);
      this.startRound(this.round);
      this.player.spawnProtect = 3;
    });
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.input.mouseDown = false;
    this.weapons.resetZoom();
    this.player.aimSensitivity = 1;
    this.hud.showPause();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.audio.resume();
    this.hud.hidePause();
    this.state = 'playing';
    this.input.mouseDown = false;
    this.input.requestLock();
  }

  traceShot(weapon, spread) {
    this.stats.shots++;
    this.camera.updateMatrixWorld();

    const origin = this.camera.getWorldPosition(new THREE.Vector3());
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);

    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
    const cameraUp = new THREE.Vector3().crossVectors(right, dir).normalize();

    dir
      .addScaledVector(right, rand(-1, 1) * spread)
      .addScaledVector(cameraUp, rand(-1, 1) * spread)
      .normalize();

    const muzzle = origin.clone()
      .addScaledVector(dir, 0.65)
      .addScaledVector(right, 0.18)
      .addScaledVector(cameraUp, -0.12);

    this.raycaster.set(origin, dir);
    this.raycaster.near = 0;
    this.raycaster.far = weapon.range;

    const targets = this.world.solids.concat(this.bots.hitboxes());
    const hits = this.raycaster.intersectObjects(targets, false);

    for (const hit of hits) {
      const bot = hit.object.userData.bot;

      if (bot) {
        if (!bot.alive) continue;

        this.stats.hits++;
        const part = hit.object.userData.part;
        const multiplier = part === 'head' ? weapon.headshot : 1;
        bot.takeDamage(weapon.damage * multiplier, part);

        this.spawnTracer(muzzle, hit.point, 0xffe0a0);
        this.spawnPuff(hit.point, 0x8a1a14, 0.14);
        this.hud.hitmarker(part === 'head');
        this.audio.hit(part === 'head');
        return;
      }

      if (hit.object.userData.solid) {
        this.spawnTracer(muzzle, hit.point, 0xffdf9e);
        this.spawnPuff(hit.point, 0xd8c49a, 0.2);
        return;
      }
    }

    this.spawnTracer(muzzle, origin.clone().addScaledVector(dir, weapon.range), 0xffdf9e);
  }

  spawnTracer(from, to, color = 0xffe0a0) {
    const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    this.scene.add(line);
    this.effects.push({ obj: line, mat: material, life: 0.06, max: 0.06, type: 'tracer' });
  }

  spawnPuff(point, color, size = 0.2) {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.puffGeometry, material);
    mesh.position.copy(point);
    mesh.scale.setScalar(size);
    this.scene.add(mesh);
    this.effects.push({ obj: mesh, mat: material, life: 0.22, max: 0.22, type: 'puff', size });
  }

  updateEffects(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      effect.life -= dt;
      const k = Math.max(0, effect.life / effect.max);

      if (effect.type === 'puff') {
        effect.obj.scale.setScalar(effect.size * (1 + (1 - k) * 2.2));
        effect.mat.opacity = 0.85 * k;
      } else {
        effect.mat.opacity = 0.9 * k;
      }

      if (effect.life <= 0) {
        this.scene.remove(effect.obj);
        if (effect.type === 'tracer') effect.obj.geometry.dispose();
        effect.mat.dispose();
        this.effects.splice(i, 1);
      }
    }
  }

  schedule(delay, fn) {
    this.timers.push({ t: this.time + delay, fn });
  }

  updateTimers() {
    for (let i = this.timers.length - 1; i >= 0; i--) {
      if (this.time >= this.timers[i].t) {
        const { fn } = this.timers[i];
        this.timers.splice(i, 1);
        fn();
      }
    }
  }

  update(dt) {
    this.time += dt;
    this.updateTimers();
    this.updateEffects(dt);
    this.hud.updateDamage(dt);
    this.hud.setScoped(
      (this.state === 'playing' || this.state === 'roundEnd') && this.weapons.scoped
    );
    this.hud.setProtection(
      this.state === 'playing' || this.state === 'dead' ? this.player.spawnProtect : 0
    );

    if (this.state === 'playing') {
      this.multiTimer = Math.max(0, this.multiTimer - dt);
      if (this.multiTimer === 0) this.multiKills = 0;
    }

    if (this.state === 'playing' || this.state === 'roundEnd') {
      this.player.update(dt, this.input, this.world);

      this.weapons.update(dt, this.input, this.player, this.state === 'playing');
      this.player.aimSensitivity = this.state === 'playing'
        ? 1 - this.weapons.zoomEase * 0.68
        : 1;

      this.bots.update(dt, this.player);

      this.hud.setHealth(this.player.health, this.player.armor);
      this.hud.setAmmo(this.weapons.ammo.mag, this.weapons.ammo.reserve, this.weapons.reloadProgress);
      this.hud.setWeaponName(this.weapons.weapon.name);
      this.hud.setSpread(this.weapons.currentSpread(this.player));
      this.hud.setEnemies(this.bots.aliveCount);

      if (this.state === 'playing' && this.bots.total > 0 && this.bots.aliveCount === 0) {
        this.winRound();
      }
    } else if (this.state === 'dead') {
      this.player.update(dt, this.input, this.world);
      this.bots.update(dt, this.player);
      this.hud.setHealth(this.player.health, this.player.armor);
      this.hud.setAmmo(this.weapons.ammo.mag, this.weapons.ammo.reserve, 0);
      this.hud.setEnemies(this.bots.aliveCount);
    } else if (this.state === 'menu') {
      this.player.yaw += dt * 0.04;
      this.player.syncCamera(dt);
    }
  }

  loop() {
    requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  exposeDebugApi() {
    window.__cs = {
      game: this,
      start: (skipLock = true) => this.startGame(skipLock),
      status: () => ({
        state: this.state,
        round: this.round,
        kills: this.kills,
        deaths: this.deaths,
        hp: Math.round(this.player.health),
        armor: Math.round(this.player.armor),
        botsAlive: this.bots.aliveCount,
        botsTotal: this.bots.total,
        mag: this.weapons.ammo.mag,
        reserve: this.weapons.ammo.reserve,
        weapon: this.weapons.weapon.name,
        spread: Number(this.weapons.currentSpread(this.player).toFixed(4)),
        streak: this.streak,
        multiKills: this.multiKills,
        spawnProtect: Number(this.player.spawnProtect.toFixed(2)),
        pos: [Number(this.player.pos.x.toFixed(1)), Number(this.player.pos.z.toFixed(1))],
        calls: this.renderer.info.render.calls,
        triangles: this.renderer.info.render.triangles,
      }),
      bots: () => this.bots.bots.map((bot) => ({
        name: bot.name,
        alive: bot.alive,
        state: bot.state,
        hp: Math.round(bot.health),
        pos: [Math.round(bot.pos.x), Math.round(bot.pos.z)],
      })),
      killAll: () => this.bots.bots.forEach((bot) => {
        if (bot.alive) bot.takeDamage(999, 'body');
      }),
      equip: (index) => this.weapons.switchTo(index),
      press: (code, down = true) => {
        if (down) this.input.keys.add(code);
        else this.input.keys.delete(code);
      },
      look: (dx, dy) => {
        this.input.mouseDX += dx;
        this.input.mouseDY += dy;
      },
      shoot: () => {
        this.input.mouseDown = true;
        setTimeout(() => { this.input.mouseDown = false; }, 60);
      },
    };
  }
}

new Game();
