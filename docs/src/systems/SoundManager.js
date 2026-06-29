/**
 * SoundManager.js
 * Effets sonores procéduraux via Web Audio API.
 * Sépare les SFX de la musique d'ambiance (AudioManager).
 *
 * Sons disponibles :
 *  - zombieGroan(type) : grognement sourd (normal / fast / tank)
 *  - zombieHit()       : impact charnu (zombie touché par le joueur)
 *  - zombieDeath()     : râle descendant
 *  - playerHit()       : impact + flash (joueur touché)
 *  - pickup()          : bip court de ramassage
 */

import { GameConfig } from '../config/GameConfig.js';

export class SoundManager {
  constructor() {
    this._ctx    = new (window.AudioContext || window.webkitAudioContext)();
    this._master = this._ctx.createGain();
    this._master.gain.value = GameConfig.AUDIO.SFX_VOLUME;
    this._master.connect(this._ctx.destination);

    // Délai anti-spam des grognements (key = zombieId)
    this._groanCooldowns = new Map();
  }

  /** Reprend l'AudioContext si suspendu (politique navigateur) */
  resume() {
    if (this._ctx.state === 'suspended') this._ctx.resume();
  }

  // ── Sons zombies ──────────────────────────────────────────────────────────

  /**
   * Grognement de zombie — joué aléatoirement pendant la traque.
   * @param {string} type - 'normal' | 'fast' | 'tank'
   * @param {string} id   - Identifiant unique du zombie (anti-spam)
   */
  zombieGroan(type, id) {
    const now = this._ctx.currentTime;
    const lastGroan = this._groanCooldowns.get(id) || 0;
    if (now < lastGroan) return;
    // Cooldown aléatoire entre 4 et 9s
    this._groanCooldowns.set(id, now + 4 + Math.random() * 5);

    const freq = type === 'tank' ? 55 : type === 'fast' ? 110 : 80;

    // Oscillateur principal
    const osc  = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    // LFO pour le trémolo (effet de vibration vocale)
    const lfo     = this._ctx.createOscillator();
    const lfoGain = this._ctx.createGain();

    lfo.frequency.value = 5 + Math.random() * 3;
    lfoGain.gain.value  = freq * 0.08;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    osc.type = 'sawtooth';
    osc.frequency.value = freq;

    const dur = 0.6 + Math.random() * 0.5;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.08);
    gain.gain.setValueAtTime(0.14, now + dur * 0.6);
    gain.gain.linearRampToValueAtTime(0, now + dur);

    osc.connect(gain);
    gain.connect(this._master);
    lfo.start(now);
    osc.start(now);
    osc.stop(now + dur);
    lfo.stop(now + dur);
  }

  /**
   * Impact quand le joueur frappe un zombie.
   * Son de choc charnu + transitoire haute fréquence.
   */
  zombieHit() {
    const now = this._ctx.currentTime;

    // Transitoire (clic d'impact)
    const dur    = 0.12;
    const buf    = this._ctx.createBuffer(1, Math.ceil(this._ctx.sampleRate * dur), this._ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 1.5) * 0.9;
    }

    const src    = this._ctx.createBufferSource();
    const filter = this._ctx.createBiquadFilter();
    const gain   = this._ctx.createGain();

    filter.type            = 'lowpass';
    filter.frequency.value = 600;
    gain.gain.value        = 0.6;

    src.buffer = buf;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this._master);
    src.start(now);

    // Basse doublée (thud)
    const osc2 = this._ctx.createOscillator();
    const g2   = this._ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(120, now);
    osc2.frequency.exponentialRampToValueAtTime(40, now + 0.08);
    g2.gain.setValueAtTime(0.35, now);
    g2.gain.linearRampToValueAtTime(0, now + 0.1);
    osc2.connect(g2);
    g2.connect(this._master);
    osc2.start(now);
    osc2.stop(now + 0.1);
  }

  /**
   * Râle de mort d'un zombie : glissement de fréquence descendant.
   * @param {string} type
   */
  zombieDeath(type) {
    const now  = this._ctx.currentTime;
    const freq = type === 'tank' ? 80 : type === 'fast' ? 130 : 100;

    const osc  = this._ctx.createOscillator();
    const gain = this._ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 1.0);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.setValueAtTime(0.18, now + 0.3);
    gain.gain.linearRampToValueAtTime(0, now + 1.0);

    osc.connect(gain);
    gain.connect(this._master);
    osc.start(now);
    osc.stop(now + 1.0);
  }

  /**
   * Impact reçu par le joueur.
   */
  playerHit() {
    const now = this._ctx.currentTime;

    const osc  = this._ctx.createOscillator();
    const gain = this._ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(70, now + 0.12);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.18);

    osc.connect(gain);
    gain.connect(this._master);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Bip court de ramassage d'objet.
   */
  pickup() {
    const now = this._ctx.currentTime;
    [440, 660].forEach((f, i) => {
      const osc  = this._ctx.createOscillator();
      const gain = this._ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      const t = now + i * 0.06;
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.09);
      osc.connect(gain);
      gain.connect(this._master);
      osc.start(t);
      osc.stop(t + 0.1);
    });
  }
}
