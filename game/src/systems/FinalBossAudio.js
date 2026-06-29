/**
 * FinalBossAudio.js
 * Musique épique du boss final — basse sub-grave, pads choir, tambours 160BPM.
 * Trois phases d'intensité croissante.
 */

const BPM  = 160;
const BEAT = 60 / BPM;

export class FinalBossAudio {
  constructor() {
    this._ctx     = null;
    this._master  = null;
    this._phase   = 1;
    this._running = false;
    this._beatTimer    = null;
    this._melodyTimer  = null;
    this._beat         = 0;
    this._drones       = [];
    this._melodyNotes  = [];
  }

  start() {
    if (this._running) return;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('FinalBossAudio: Web Audio non disponible', e.message);
      return;
    }

    this._master = this._ctx.createGain();
    this._master.gain.setValueAtTime(0.0001, this._ctx.currentTime);
    this._master.gain.exponentialRampToValueAtTime(0.65, this._ctx.currentTime + 2.0);
    this._master.connect(this._ctx.destination);

    this._startBass();
    this._startPads();
    this._startMelody();
    this._scheduleBeat();
    this._running = true;
  }

  stop() {
    if (!this._running) return;
    this._running = false;
    if (this._beatTimer)   clearTimeout(this._beatTimer);
    if (this._melodyTimer) clearTimeout(this._melodyTimer);

    if (this._master) {
      const now = this._ctx.currentTime;
      this._master.gain.setValueAtTime(this._master.gain.value, now);
      this._master.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    }
    setTimeout(() => {
      this._drones.forEach(n => { try { n.stop(); } catch (e) {} });
      try { this._ctx.close(); } catch (e) {}
      this._ctx = null;
    }, 1300);
  }

  setPhase(phase) {
    if (phase === this._phase || !this._running || !this._ctx) return;
    this._phase = phase;
    const gain = phase === 3 ? 0.85 : phase === 2 ? 0.72 : 0.65;
    const now  = this._ctx.currentTime;
    this._master.gain.setValueAtTime(this._master.gain.value, now);
    this._master.gain.linearRampToValueAtTime(gain, now + 0.6);
  }

  // ── Basse sub-grave ────────────────────────────────────────────────────────

  _startBass() {
    [[32.7, 0.20], [49.0, 0.16], [65.4, 0.08]].forEach(([freq, vol]) => {
      const osc  = this._ctx.createOscillator();
      const gain = this._ctx.createGain();

      // LFO de pulsation
      const lfo  = this._ctx.createOscillator();
      const lfoG = this._ctx.createGain();
      lfo.frequency.value = 0.5 + Math.random() * 0.3;
      lfoG.gain.value     = 0.5;
      lfo.connect(lfoG);
      lfoG.connect(osc.frequency);
      lfo.start();

      osc.type            = 'sine';
      osc.frequency.value = freq;
      gain.gain.value     = vol;
      osc.connect(gain);
      gain.connect(this._master);
      osc.start();
      this._drones.push(osc, lfo);
    });
  }

  // ── Pads choraux ──────────────────────────────────────────────────────────

  _startPads() {
    // Accord mineur — mi bémol mineur (Eb, Gb, Bb)
    [[155.6, 0.06], [185.0, 0.05], [233.1, 0.04], [311.1, 0.03]].forEach(([freq, vol]) => {
      const osc    = this._ctx.createOscillator();
      const filter = this._ctx.createBiquadFilter();
      const gain   = this._ctx.createGain();

      osc.type              = 'sawtooth';
      osc.frequency.value   = freq;
      filter.type           = 'lowpass';
      filter.frequency.value = 800;
      filter.Q.value         = 2;
      gain.gain.value        = vol;

      // Légère détune pour richesse
      osc.detune.value = (Math.random() - 0.5) * 12;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this._master);
      osc.start();
      this._drones.push(osc);
    });
  }

  // ── Mélodie menaçante ─────────────────────────────────────────────────────

  _startMelody() {
    // Mode phrygien (très sombre)
    this._melodyNotes = [164.8, 174.6, 196.0, 220.0, 246.9, 261.6, 293.7, 329.6];
    this._melodyIdx   = 0;
    this._playMelodyNote();
  }

  _playMelodyNote() {
    if (!this._running || !this._ctx) return;

    const freq    = this._melodyNotes[this._melodyIdx % this._melodyNotes.length];
    const noteLen = BEAT * (this._phase === 3 ? 0.3 : this._phase === 2 ? 0.45 : 0.65);

    const osc  = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.value = 0.045;
    const now = this._ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.0001, now + noteLen * 0.9);
    osc.connect(gain);
    gain.connect(this._master);
    osc.start(now);
    osc.stop(now + noteLen);

    this._melodyIdx++;
    this._melodyTimer = setTimeout(() => this._playMelodyNote(), noteLen * 1000);
  }

  // ── Batterie ──────────────────────────────────────────────────────────────

  _scheduleBeat() {
    if (!this._running || !this._ctx) return;
    const tempo = BEAT * (this._phase === 3 ? 0.5 : this._phase === 2 ? 0.65 : 1.0) * 1000;
    const b     = this._beat % 8;

    if (b === 0 || b === 4 || (this._phase >= 2 && (b === 2 || b === 6)))
      this._kick();
    if (b === 2 || b === 6 || (this._phase === 3 && b % 2 === 1))
      this._snare();
    if (this._phase >= 2 && b % 1 === 0)
      this._hat();

    this._beat++;
    this._beatTimer = setTimeout(() => this._scheduleBeat(), tempo);
  }

  _kick() {
    if (!this._ctx) return;
    const osc  = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    const now  = this._ctx.currentTime;
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.18);
    gain.gain.setValueAtTime(0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc.connect(gain); gain.connect(this._master);
    osc.start(now); osc.stop(now + 0.3);
  }

  _snare() {
    if (!this._ctx) return;
    const buf  = this._ctx.createBuffer(1, this._ctx.sampleRate * 0.14, this._ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.4);
    const src = this._ctx.createBufferSource();
    const g   = this._ctx.createGain();
    src.buffer = buf; g.gain.value = 0.3;
    src.connect(g); g.connect(this._master);
    src.start();
  }

  _hat() {
    if (!this._ctx) return;
    const buf  = this._ctx.createBuffer(1, this._ctx.sampleRate * 0.03, this._ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 4);
    const src = this._ctx.createBufferSource();
    const g   = this._ctx.createGain();
    src.buffer = buf; g.gain.value = 0.08;
    src.connect(g); g.connect(this._master);
    src.start();
  }
}
