export class HUD {
  constructor() {
    const $ = (id) => document.getElementById(id);

    this.hud = $('hud');
    this.crosshair = $('crosshair');
    this.hitmarkerEl = $('hitmarker');

    this.hpVal = $('hpVal');
    this.armorVal = $('armorVal');
    this.vitals = $('vitals');

    this.weaponName = $('weaponName');
    this.ammoMag = $('ammoMag');
    this.ammoReserve = $('ammoReserve');
    this.reloadBar = $('reloadBar');
    this.reloadFill = this.reloadBar ? this.reloadBar.querySelector('i') : null;

    this.roundLabel = $('roundLabel');
    this.enemyVal = $('enemyVal');
    this.killVal = $('killVal');
    this.killfeed = $('killfeed');

    this.damageVignette = $('damageVignette');

    this.protectEl = $('protect');
    this.protectVal = $('protectVal');
    this.lastProtect = -1;

    this.killAnnounceEl = $('killAnnounce');
    this.kaEn = this.killAnnounceEl.querySelector('.ka-en');
    this.kaZh = this.killAnnounceEl.querySelector('.ka-zh');
    this.killAnnounceTimer = null;

    this.banner = $('banner');
    this.bannerTitle = $('bannerTitle');
    this.bannerSub = $('bannerSub');

    this.menu = $('menu');
    this.pause = $('pause');
    this.scoreboard = $('scoreboard');

    this.sbKills = $('sbKills');
    this.sbDeaths = $('sbDeaths');
    this.sbAccuracy = $('sbAccuracy');
    this.sbRound = $('sbRound');
    this.sbEnemies = $('sbEnemies');

    this.damageFlash = 0;
    this.bannerTimer = null;
    this.hitmarkerTimer = null;
    this.lastMag = -1;
  }

  showHud() {
    this.hud.classList.remove('hidden');
  }

  hideHud() {
    this.hud.classList.add('hidden');
  }

  showMenu() {
    this.menu.classList.remove('hidden');
  }

  hideMenu() {
    this.menu.classList.add('hidden');
  }

  showPause() {
    this.pause.classList.remove('hidden');
  }

  hidePause() {
    this.pause.classList.add('hidden');
  }

  setDead(dead) {
    this.hud.classList.toggle('dead', dead);
  }

  setScoped(scoped) {
    this.hud.classList.toggle('scoped', scoped);
  }

  setProtection(seconds) {
    const value = seconds > 0 ? Math.ceil(seconds) : 0;
    if (value === this.lastProtect) return;
    this.lastProtect = value;
    this.protectEl.classList.toggle('hidden', value === 0);
    if (value > 0) this.protectVal.textContent = value;
  }

  showKillAnnounce(en, zh = '') {
    this.kaEn.textContent = en;
    this.kaZh.textContent = zh;
    this.killAnnounceEl.classList.remove('hidden', 'show');
    void this.killAnnounceEl.offsetWidth;
    this.killAnnounceEl.classList.add('show');

    clearTimeout(this.killAnnounceTimer);
    this.killAnnounceTimer = setTimeout(() => {
      this.killAnnounceEl.classList.remove('show');
      this.killAnnounceEl.classList.add('hidden');
    }, 1700);
  }

  clearKillAnnounce() {
    clearTimeout(this.killAnnounceTimer);
    this.killAnnounceEl.classList.remove('show');
    this.killAnnounceEl.classList.add('hidden');
  }

  setHealth(hp, armor) {
    this.hpVal.textContent = Math.max(0, Math.round(hp));
    this.armorVal.textContent = Math.max(0, Math.round(armor));
    this.hpVal.classList.toggle('low', hp <= 30);
  }

  setWeaponName(name) {
    this.weaponName.textContent = name;
  }

  setAmmo(mag, reserve, reloadProgress = 0) {
    this.ammoMag.textContent = mag;
    this.ammoReserve.textContent = reserve;

    if (reloadProgress > 0) {
      this.reloadBar.classList.remove('hidden');
      this.reloadFill.style.width = `${Math.round(reloadProgress * 100)}%`;
    } else {
      this.reloadBar.classList.add('hidden');
    }

    if (this.lastMag !== -1 && this.lastMag !== mag) {
      this.ammoMag.classList.remove('pop');
      void this.ammoMag.offsetWidth;
      this.ammoMag.classList.add('pop');
    }
    this.lastMag = mag;
  }

  setRound(round) {
    this.roundLabel.textContent = `第 ${round} 回合`;
  }

  setEnemies(count) {
    this.enemyVal.textContent = Math.max(0, count);
  }

  setKills(count) {
    this.killVal.textContent = count;
  }

  setSpread(spread) {
    const gap = 5 + spread * 620;
    this.crosshair.style.setProperty('--gap', `${gap.toFixed(1)}px`);
  }

  hitmarker(headshot = false) {
    this.hitmarkerEl.classList.remove('show', 'head');
    void this.hitmarkerEl.offsetWidth;
    this.hitmarkerEl.classList.add('show');
    if (headshot) this.hitmarkerEl.classList.add('head');

    clearTimeout(this.hitmarkerTimer);
    this.hitmarkerTimer = setTimeout(() => {
      this.hitmarkerEl.classList.remove('show');
    }, 160);
  }

  flashDamage() {
    this.damageFlash = Math.min(1, this.damageFlash + 0.7);
  }

  updateDamage(dt) {
    this.damageFlash = Math.max(0, this.damageFlash - dt * 1.6);
    this.damageVignette.style.opacity = this.damageFlash.toFixed(3);
  }

  clearKillfeed() {
    this.killfeed.innerHTML = '';
  }

  addKillfeed(headshot = false) {
    const row = document.createElement('div');
    row.className = 'kf-row';
    row.innerHTML = '<span class="kf-you">你</span><span class="kf-mark">⌖</span>' +
      '<span class="kf-enemy">敌人</span>';
    if (headshot) {
      const hs = document.createElement('span');
      hs.className = 'kf-hs';
      hs.textContent = '★';
      row.appendChild(hs);
    }
    this.killfeed.prepend(row);

    setTimeout(() => {
      row.classList.add('out');
      setTimeout(() => row.remove(), 450);
    }, 4200);
  }

  showBanner(title, sub = '', seconds = 2) {
    this.bannerTitle.textContent = title;
    this.bannerSub.textContent = sub;
    this.banner.classList.remove('hidden');
    void this.banner.offsetWidth;
    this.banner.classList.add('show');

    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      this.banner.classList.remove('show');
      this.banner.classList.add('hidden');
    }, seconds * 1000);
  }

  toggleScoreboard(show) {
    this.scoreboard.classList.toggle('hidden', !show);
  }

  setScoreboard({ kills, deaths, round, shots, hits, enemies }) {
    this.sbKills.textContent = kills;
    this.sbDeaths.textContent = deaths;
    this.sbRound.textContent = round;
    this.sbEnemies.textContent = enemies;
    this.sbAccuracy.textContent = shots > 0 ? `${Math.round((hits / shots) * 100)}%` : '—';
  }
}
