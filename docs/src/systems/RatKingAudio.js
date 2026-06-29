/**
 * RatKingAudio.js
 * Musique du boss Roi des Rats — tambours lourds + mélodie dissonante.
 * Tempo : 140 BPM. Trois phases d'intensité.
 */

const BPM    = 140;
const BEAT   = 60 / BPM;  // secondes par beat

export class RatKingAudio {
  constructor() {
    this._ctx        = null;
    this._master     = null;
    this._phase      = 1;
    this._running    = false;
    this._beatTimer  = null;
    this._beat       = 0;
    this._melodyNodes = [];
    this._droneNodes  = [];
  }

  start() {
    if (this._running) return;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('RatKingAudio: Web Audio non disponible', e.message);
      return;
    }

    this._master = this._ctx.createGain();
    this._master.gain.setValueAtTime(0.0001, this._ctx.currentTime);
    this._master.gain.exponentialRampToValueAtTime(0.55, this._ctx.currentTime + 1.2);
    this._master.connect(this._ctx.destination);

    this._startDrone();
    this._startMelody();
    this._scheduleBeat();
    this._running = true;
  }

  stop() {
    if (!this._running) return;
    this._running = false;

    if (this._beatTimer) clearTimeout(this._beatTimer);
    if (this._melodyTimer) clearTimeout(this._melodyTimer);

    if (this._master) {
      const now = this._ctx.currentTime;
      this._master.gain.setValueAtTime(this._master.gain.value, now);
      this._master.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);
    }

    setTimeout(() => {
      [...this._droneNodes, ...this._melodyNodes].forEach(n => {
        try { n.stop(); } catch (e) {}
      });
      try { this._ctx.close(); } catch (e) {}
      this._ctx = null;
    }, 1100);
  }

  /** Phase 1/2/3 : augmente l'intensité. */
  setPhase(phase) {
    if (phase === this._phase || !this._running || !this._ctx) return;
    this._phase = phase;

    // Accélérer le master gain selon la phase
    const gain = phase === 3 ? 0.75 : phase === 2 ? 0.65 : 0.55;
    this._master.gain.setValueAtTime(this._master.gain.value, this._ctx.currentTime);
    this._master.gain.linearRampToValueAtTime(gain, this._ctx.currentTime + 0.5);
  }

  // ── Drone grave ────────────────────────────────────────────────────────────

  _startDrone() {
    [55, 110, 73.4].forEach((freq, i) => {
      const osc  = this._ctx.createOscillator();
      const gain = this._ctx.createGain();
      osc.type            = i === 2 ? 'sawtooth' : 'sine';
      osc.frequency.value = freq;
      gain.gain.value     = i === 2 ? 0.06 : 0.15;
      osc.connect(gain);
      gain.connect(this._master);
      osc.start();
      this._droneNodes.push(osc);
    });
  }

  // ── Mélodie en boucle ──────────────────────────────────────────────────────

  _startMelody() {
    // Gamme chromatique menaçante (sol mineur harmonique)
    this._melodyNotes = [196, 220, 233.1, 261.6, 293.7, 311.1, 369.9, 392];
    this._melodyIdx   = 0;
    this._playMelodyNote();
  }

  _playMelodyNote() {
    if (!this._running || !this._ctx) return;

    const freq    = this._melodyNotes[this._melodyIdx % this._melodyNotes.length];
    const noteLen = BEAT * (this._phase === 3 ? 0.4 : this._phase === 2 ? 0.6 : 0.9);

    const osc  = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.type            = 'square';
    osc.frequency.value = freq;
    gain.gain.value     = 0.04;
    osc.connect(gain);
    gain.connect(this._master);
    osc.start();
    osc.stop(this._ctx.currentTime + noteLen * 0.8);

    this._melodyIdx++;
    const nextIn = noteLen * 1000;
    this._melodyTimer = setTimeout(() => this._playMelodyNote(), nextIn);
  }

  // ── Batterie synthétique ───────────────────────────────────────────────────

  _scheduleBeat() {
    if (!this._running || !this._ctx) return;

    const tempo  = BEAT * (this._phase === 3 ? 0.6 : this._phase === 2 ? 0.75 : 1.0);
    const b      = this._beat % 8;

    // Grosse caisse sur beats 0, 4 (et 2,6 en phase 3)
    if (b === 0 || b === 4 || (this._phase === 3 && (b === 2 || b === 6))) {
      this._playKick();
    }
    // Caisse claire sur beats 2, 6
    if (b === 2 || b === 6) {
      this._playSnare();
    }
    // Charley rapide en phase 2+
    if (this._phase >= 2 && b % 2 === 1) {
      this._playHihat();
    }

    this._beat++;
    this._beatTimer = setTimeout(() => this._scheduleBeat(), tempo * 1000);
  }

  _playKick() {
    if (!this._ctx) return;
    const osc   = this._ctx.createOscillator();
    const gain  = this._ctx.createGain();
    const now   = this._ctx.currentTime;
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    osc.connect(gain);
    gain.connect(this._master);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  _playSnare() {
    if (!this._ctx) return;
    const buf  = this._ctx.createBuffer(1, this._ctx.sampleRate * 0.12, this._ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.5);
    }
    const src  = this._ctx.createBufferSource();
    const gain = this._ctx.createGain();
    src.buffer      = buf;
    gain.gain.value = 0.25;
    src.connect(gain);
    gain.connect(this._master);
    src.start();
  }

  _playHihat() {
    if (!this._ctx) return;
    const buf  = this._ctx.createBuffer(1, this._ctx.sampleRate * 0.04, this._ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
    }
    const src  = this._ctx.createBufferSource();
    const gain = this._ctx.createGain();
    src.buffer      = buf;
    gain.gain.value = 0.1;
    src.connect(gain);
    gain.connect(this._master);
    src.start();
  }
}
