/**
 * DungeonAudio.js
 * Ambiance musicale du donjon via Web Audio API.
 * Drone grave (55 Hz + 82.4 Hz) + notes dissonantes aléatoires.
 */

export class DungeonAudio {
  constructor() {
    this._ctx        = null;
    this._masterGain = null;
    this._droneNodes = [];
    this._noteTimer  = null;
    this._running    = false;
  }

  start() {
    if (this._running) return;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('DungeonAudio: Web Audio non disponible', e.message);
      return;
    }

    this._masterGain = this._ctx.createGain();
    this._masterGain.gain.setValueAtTime(0.0001, this._ctx.currentTime);
    this._masterGain.gain.exponentialRampToValueAtTime(0.6, this._ctx.currentTime + 2.5);
    this._masterGain.connect(this._ctx.destination);

    this._startDrones();
    this._scheduleNote();
    this._running = true;
  }

  stop() {
    if (!this._running) return;
    this._running = false;

    if (this._noteTimer) clearTimeout(this._noteTimer);

    if (this._masterGain) {
      const now = this._ctx.currentTime;
      this._masterGain.gain.setValueAtTime(this._masterGain.gain.value, now);
      this._masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
    }

    setTimeout(() => {
      this._droneNodes.forEach(n => { try { n.stop(); } catch (e) {} });
      this._droneNodes = [];
      try { this._ctx.close(); } catch (e) {}
      this._ctx = null;
    }, 1600);
  }

  // ── Drone grave ───────────────────────────────────────────────────────────────

  _startDrones() {
    // Deux oscillateurs + légère distorsion pour l'effet caverneux
    const freqs = [55, 82.4, 110];
    freqs.forEach((freq, i) => {
      const osc   = this._ctx.createOscillator();
      const gain  = this._ctx.createGain();

      osc.type            = i === 2 ? 'sawtooth' : 'sine';
      osc.frequency.value = freq;

      // Légère modulation de fréquence
      const lfo = this._ctx.createOscillator();
      const lfoG = this._ctx.createGain();
      lfo.frequency.value = 0.08 + i * 0.05;
      lfoG.gain.value     = 0.8;
      lfo.connect(lfoG);
      lfoG.connect(osc.frequency);
      lfo.start();

      gain.gain.value = i === 2 ? 0.04 : 0.18;

      osc.connect(gain);
      gain.connect(this._masterGain);
      osc.start();

      this._droneNodes.push(osc, lfo);
    });

    // Réverbération simulée via convolver
    this._addReverb();
  }

  _addReverb() {
    try {
      const convolver = this._ctx.createConvolver();
      const length    = this._ctx.sampleRate * 2.5;
      const impulse   = this._ctx.createBuffer(2, length, this._ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const ch = impulse.getChannelData(c);
        for (let i = 0; i < length; i++) {
          ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
        }
      }
      convolver.buffer = impulse;

      const reverbGain = this._ctx.createGain();
      reverbGain.gain.value = 0.35;
      this._masterGain.connect(convolver);
      convolver.connect(reverbGain);
      reverbGain.connect(this._ctx.destination);
    } catch (e) {
      // Réverb optionnelle
    }
  }

  // ── Notes dissonantes ─────────────────────────────────────────────────────────

  _scheduleNote() {
    if (!this._running) return;

    const delay = 3000 + Math.random() * 7000;
    this._noteTimer = setTimeout(() => {
      if (!this._running || !this._ctx) return;
      this._playDissonantNote();
      this._scheduleNote();
    }, delay);
  }

  _playDissonantNote() {
    // Gamme dissonante (intervalles mineurs / tritons)
    const baseFreqs = [138.6, 155.6, 185, 207.7, 233.1, 277.2, 311.1];
    const freq = baseFreqs[Math.floor(Math.random() * baseFreqs.length)];

    const osc  = this._ctx.createOscillator();
    const gain = this._ctx.createGain();

    osc.type            = 'sine';
    osc.frequency.value = freq;

    const now      = this._ctx.currentTime;
    const duration = 1.5 + Math.random() * 2;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this._masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }
}
