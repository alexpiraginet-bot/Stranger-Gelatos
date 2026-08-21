// ============================================================================
// GELO NINJA — som sintetizado (WebAudio). Zero arquivos, zero download.
// No iOS o áudio só liga depois de um toque: resume() é chamado no PRIMEIRO
// gesto do jogador.
// ============================================================================

export class Sfx {
  constructor() { this.ctx = null; this.master = null; this.on = true; this.pad = null; }

  _c() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.42;
      this.comp = this.ctx.createDynamicsCompressor();
      this.master.connect(this.comp).connect(this.ctx.destination);
    }
    return this.ctx;
  }

  resume() { const c = this._c(); if (c && c.state === 'suspended') c.resume(); }
  toggle() { this.on = !this.on; if (!this.on) this.stopPad(); return this.on; }

  tone({ f = 440, to = null, type = 'sine', dur = 0.16, vol = 0.25, at = 0.004, delay = 0, q = 0, cut = 0 }) {
    const c = this._c(); if (!c || !this.on) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + at);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (cut) {
      const bp = c.createBiquadFilter();
      bp.type = 'lowpass'; bp.frequency.value = cut; bp.Q.value = q || 1;
      o.connect(bp); node = bp;
    }
    node.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.04);
  }

  noise({ dur = 0.2, vol = 0.18, delay = 0, hp = 500, lp = 12000, curve = 1 }) {
    const c = this._c(); if (!c || !this.on) return;
    const t = c.currentTime + delay;
    const n = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, curve);
    const src = c.createBufferSource(); src.buffer = buf;
    const hpf = c.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = hp;
    const lpf = c.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = lp;
    const g = c.createGain(); g.gain.value = vol;
    src.connect(hpf).connect(lpf).connect(g).connect(this.master);
    src.start(t);
  }

  // --- efeitos do jogo ------------------------------------------------------
  throwBlade() {
    this.noise({ dur: 0.16, vol: 0.13, hp: 1800, curve: 2.2 });
    this.tone({ f: 1400, to: 420, type: 'triangle', dur: 0.12, vol: 0.10 });
  }

  slice(power = 1) {
    // o "shhk" do corte: ruído afiado + queda rápida de tom
    this.noise({ dur: 0.13, vol: 0.20 * power, hp: 2600, curve: 3 });
    this.tone({ f: 2600, to: 700, type: 'sawtooth', dur: 0.1, vol: 0.10 * power, cut: 5200, q: 6 });
    this.tone({ f: 320, to: 120, type: 'sine', dur: 0.16, vol: 0.11 * power });
  }

  perfect() {
    [1046, 1568, 2093].forEach((f, i) => this.tone({ f, type: 'triangle', dur: 0.22, vol: 0.17, delay: i * 0.05 }));
    this.noise({ dur: 0.25, vol: 0.08, hp: 3800 });
  }

  shatter() {
    this.noise({ dur: 0.42, vol: 0.24, hp: 900, curve: 1.4 });
    this.tone({ f: 210, to: 55, type: 'sawtooth', dur: 0.38, vol: 0.18 });
    for (let i = 0; i < 6; i++) {
      this.tone({ f: 900 + Math.random() * 1800, type: 'triangle', dur: 0.1, vol: 0.06, delay: i * 0.035 });
    }
  }

  clank() {   // bateu na placa de aço
    this.tone({ f: 2100, to: 900, type: 'square', dur: 0.1, vol: 0.13, cut: 4200, q: 9 });
    this.noise({ dur: 0.14, vol: 0.13, hp: 2400 });
    this.tone({ f: 160, to: 90, type: 'sine', dur: 0.2, vol: 0.1 });
  }

  ricochet() { this.tone({ f: 1750, to: 2500, type: 'square', dur: 0.07, vol: 0.09 }); this.noise({ dur: 0.06, vol: 0.06, hp: 3000 }); }
  coin() { this.tone({ f: 1046, type: 'square', dur: 0.06, vol: 0.12 }); this.tone({ f: 1568, type: 'square', dur: 0.12, vol: 0.12, delay: 0.055 }); }
  refill() { [660, 880, 1320].forEach((f, i) => this.tone({ f, type: 'triangle', dur: 0.16, vol: 0.14, delay: i * 0.06 })); }
  freeze() { this.tone({ f: 2400, to: 380, type: 'sine', dur: 0.5, vol: 0.14 }); this.noise({ dur: 0.5, vol: 0.07, hp: 2200 }); }
  boom() { this.noise({ dur: 0.7, vol: 0.26, hp: 60, lp: 1600, curve: 1.2 }); this.tone({ f: 110, to: 32, type: 'sawtooth', dur: 0.65, vol: 0.24 }); }
  fail() { [392, 330, 262, 175].forEach((f, i) => this.tone({ f, type: 'sawtooth', dur: 0.3, vol: 0.18, delay: i * 0.12 })); }

  levelUp() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone({ f, type: 'triangle', dur: 0.3, vol: 0.2, delay: i * 0.075 }));
    this.noise({ dur: 0.4, vol: 0.07, hp: 3000, delay: 0.1 });
  }

  bossDown() {
    this.boom();
    [261, 392, 523, 784, 1046].forEach((f, i) => this.tone({ f, type: 'square', dur: 0.4, vol: 0.16, delay: 0.25 + i * 0.11 }));
  }

  unlock() {
    [880, 1174, 1568, 2093].forEach((f, i) => this.tone({ f, type: 'triangle', dur: 0.45, vol: 0.19, delay: i * 0.1 }));
  }

  cycle() {
    [196, 262, 330, 392, 523, 659, 784].forEach((f, i) => this.tone({ f, type: 'triangle', dur: 0.5, vol: 0.19, delay: i * 0.13 }));
    this.noise({ dur: 1.2, vol: 0.08, hp: 400, delay: 0.2 });
  }

  ui() { this.tone({ f: 720, to: 980, type: 'triangle', dur: 0.07, vol: 0.1 }); }

  // Zumbido de fundo (drone gelado) — liga na partida, desliga no menu.
  startPad(base = 55) {
    const c = this._c(); if (!c || this.pad || !this.on) return;
    const g = c.createGain(); g.gain.value = 0;
    const o1 = c.createOscillator(), o2 = c.createOscillator(), o3 = c.createOscillator();
    o1.type = 'sine'; o1.frequency.value = base;
    o2.type = 'sine'; o2.frequency.value = base * 1.5 + 0.7;
    o3.type = 'triangle'; o3.frequency.value = base * 4;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 460;
    o1.connect(lp); o2.connect(lp); o3.connect(lp);
    lp.connect(g).connect(this.master);
    o1.start(); o2.start(); o3.start();
    g.gain.linearRampToValueAtTime(0.075, c.currentTime + 2.5);
    this.pad = { o1, o2, o3, g };
  }

  stopPad() {
    if (!this.pad || !this.ctx) return;
    const { o1, o2, o3, g } = this.pad;
    const t = this.ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(0.0001, t + 0.5);
    o1.stop(t + 0.6); o2.stop(t + 0.6); o3.stop(t + 0.6);
    this.pad = null;
  }
}
