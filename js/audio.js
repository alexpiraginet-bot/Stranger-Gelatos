// Efeitos sonoros sintetizados (WebAudio) — sem arquivos externos.
// No iOS o áudio só inicia após um gesto do usuário: chamamos resume() no Start.
export class Audio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.master = null;
    this.drone = null;
  }

  _ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  resume() {
    const c = this._ensure();
    if (c && c.state === 'suspended') c.resume();
  }

  toggle() { this.enabled = !this.enabled; return this.enabled; }

  _tone({ freq = 440, type = 'sine', dur = 0.15, vol = 0.3, to = null, attack = 0.005, delay = 0 }) {
    const c = this._ensure();
    if (!c || !this.enabled) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  _noise({ dur = 0.2, vol = 0.2, delay = 0, hp = 400 }) {
    const c = this._ensure();
    if (!c || !this.enabled) return;
    const t = c.currentTime + delay;
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
  }

  shoot() { this._tone({ freq: 900, to: 220, type: 'square', dur: 0.12, vol: 0.15 }); this._noise({ dur: 0.08, vol: 0.06 }); }
  empty() { this._tone({ freq: 140, type: 'square', dur: 0.06, vol: 0.12 }); }
  hit() { this._tone({ freq: 240, to: 70, type: 'sawtooth', dur: 0.2, vol: 0.2 }); }
  kill() { this._tone({ freq: 180, to: 50, type: 'sawtooth', dur: 0.4, vol: 0.25 }); this._noise({ dur: 0.3, vol: 0.12, hp: 200 }); }
  pickup() { this._tone({ freq: 660, to: 1320, type: 'triangle', dur: 0.16, vol: 0.2 }); }
  key() { this._tone({ freq: 880, type: 'triangle', dur: 0.1, vol: 0.2 }); this._tone({ freq: 1320, type: 'triangle', dur: 0.18, vol: 0.2, delay: 0.1 }); }
  hurt() { this._tone({ freq: 200, to: 60, type: 'sawtooth', dur: 0.3, vol: 0.28 }); this._noise({ dur: 0.2, vol: 0.15, hp: 150 }); }
  growl() {
    this._tone({ freq: 95, to: 55, type: 'sawtooth', dur: 0.55, vol: 0.18 });
    this._tone({ freq: 70, to: 48, type: 'square', dur: 0.6, vol: 0.1, delay: 0.05 });
    this._noise({ dur: 0.5, vol: 0.07, hp: 120 });
  }
  footstep() { this._noise({ dur: 0.06, vol: 0.05, hp: 250 }); }

  portal() {
    // sweep grave->agudo + agudo->grave (vórtice) + ruído
    this._tone({ freq: 120, to: 900, type: 'sawtooth', dur: 0.7, vol: 0.18 });
    this._tone({ freq: 1000, to: 90, type: 'sine', dur: 1.1, vol: 0.16, delay: 0.4 });
    this._noise({ dur: 1.2, vol: 0.1, hp: 300 });
    for (let i = 0; i < 5; i++) this._tone({ freq: 300 + i * 120, type: 'triangle', dur: 0.25, vol: 0.1, delay: i * 0.12 });
  }

  win() { [523, 659, 784, 1046].forEach((f, i) => this._tone({ freq: f, type: 'triangle', dur: 0.3, vol: 0.22, delay: i * 0.13 })); }
  lose() { [392, 311, 262, 196].forEach((f, i) => this._tone({ freq: f, type: 'sawtooth', dur: 0.35, vol: 0.22, delay: i * 0.16 })); }

  // Drone ambiente grave do Avesso
  startAmbient() {
    const c = this._ensure();
    if (!c || this.drone) return;
    const o = c.createOscillator();
    const o2 = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine'; o.frequency.value = 55;
    o2.type = 'sine'; o2.frequency.value = 58.5; // batimento lento
    g.gain.value = 0.0;
    o.connect(g); o2.connect(g); g.connect(this.master);
    o.start(); o2.start();
    g.gain.linearRampToValueAtTime(0.08, c.currentTime + 2);
    this.drone = { o, o2, g };
  }

  stopAmbient() {
    if (!this.drone || !this.ctx) return;
    const { o, o2, g } = this.drone;
    const t = this.ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(0.0001, t + 0.5);
    o.stop(t + 0.6); o2.stop(t + 0.6);
    this.drone = null;
  }
}
