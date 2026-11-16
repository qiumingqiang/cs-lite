export class AudioFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.42;
    this.master.connect(this.ctx.destination);

    const length = Math.floor(this.ctx.sampleRate * 0.5);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  noise(t, duration, frequency, gainValue) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value = 0.85 + Math.random() * 0.3;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(frequency, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(110, frequency * 0.28), t + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainValue, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    src.connect(filter).connect(gain).connect(this.master);
    src.start(t);
    src.stop(t + duration + 0.03);
  }

  thump(t, from, to, duration, gainValue) {
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainValue, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration + 0.03);

    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  shot(kind = 'rifle') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (kind === 'rifle') {
      this.noise(t, 0.2, 2800, 0.5);
      this.thump(t, 130, 42, 0.15, 0.55);
    } else if (kind === 'sniper') {
      this.noise(t, 0.42, 1900, 0.7);
      this.thump(t, 88, 30, 0.3, 0.8);
      this.thump(t + 0.02, 170, 46, 0.2, 0.42);
    } else {
      this.noise(t, 0.15, 3400, 0.36);
      this.thump(t, 190, 60, 0.11, 0.34);
    }
  }

  botShot(distance = 20) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const volume = Math.max(0.05, 0.34 - distance * 0.006);
    this.noise(t, 0.16, 1700, volume);
    this.thump(t, 110, 45, 0.12, volume * 0.7);
  }

  hit(headshot = false) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(headshot ? 1500 : 980, t);
    osc.frequency.exponentialRampToValueAtTime(headshot ? 1900 : 760, t + 0.06);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  hurt() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.noise(t, 0.18, 900, 0.34);
    this.thump(t, 90, 48, 0.18, 0.3);
  }

  empty() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.noise(t, 0.05, 4200, 0.16);
  }

  reload(duration) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const click = (at, freq, vol) => {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = freq;
      filter.Q.value = 3.5;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, t + at);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.09);
      src.connect(filter).connect(gain).connect(this.master);
      src.start(t + at);
      src.stop(t + at + 0.1);
    };
    click(0.05, 1500, 0.22);
    click(duration * 0.62, 900, 0.26);
    click(duration * 0.88, 1250, 0.2);
  }

  switchWeapon() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.noise(t, 0.06, 2600, 0.14);
  }

  announce(text) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.02;
      utterance.pitch = 0.8;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      const english = voices.filter((voice) => /^en[-_]/i.test(voice.lang));
      const voice = english.find((item) => /david|mark|guy|male|google us english/i.test(item.name))
        || english[0];
      if (voice) utterance.voice = voice;

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      // 系统语音不可用时静默跳过，不影响游戏
    }
  }

  botDeath() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.thump(t, 220, 60, 0.26, 0.22);
  }

  playerDeath() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.thump(t, 240, 40, 0.7, 0.4);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.8);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.9);
  }

  roundStart() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [523, 659, 784].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const at = t + i * 0.14;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.16, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.28);
      osc.connect(gain).connect(this.master);
      osc.start(at);
      osc.stop(at + 0.3);
    });
  }

  roundWon() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const at = t + i * 0.11;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.18, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.34);
      osc.connect(gain).connect(this.master);
      osc.start(at);
      osc.stop(at + 0.36);
    });
  }
}
