/**
 * AudioManager.js
 * Musique procédurale via Web Audio API.
 *
 * Musique temporaire générée par synthèse d'oscillateurs.
 * À remplacer par de vrais fichiers audio (MP3/OGG) quand disponibles.
 *
 * Jour  : gamme de Do majeur, tempo vif, son chaleureux (onde sinus)
 * Nuit  : gamme de La mineur, tempo lent, son sombre (onde triangle)
 *
 * Utilise un gain master + deux bus (jour/nuit) pour le crossfade.
 * L'AudioContext est repris depuis Phaser (ou créé si absent).
 */

import { GameConfig } from '../config/GameConfig.js';

// ── Séquences musicales ────────────────────────────────────────────────────

/** Notes de jour : Do majeur penta (fréquences en Hz) */
const DAY_SEQUENCE = [
  261.63, 329.63, 392.00, 329.63, 440.00, 392.00, 523.25, 392.00,  // C4 E4 G4 E4 A4 G4 C5 G4
  349.23, 329.63, 261.63, 293.66, 329.63, 261.63, 196.00, 261.63,  // F4 E4 C4 D4 E4 C4 G3 C4
];
const DAY_BEAT_MS = 380;   // durée par note (ms)

/** Notes de nuit : La mineur harmonique */
const NIGHT_SEQUENCE = [
  220.00, 261.63, 293.66, 220.00, 174.61, 220.00, 261.63, 196.00,  // A3 C4 D4 A3 F3 A3 C4 G3
  164.81, 196.00, 220.00, 174.61, 130.81, 146.83, 164.81, 130.81,  // E3 G3 A3 F3 C3 D3 E3 C3
];
const NIGHT_BEAT_MS = 700; // plus lent la nuit

// ── Classe principale ──────────────────────────────────────────────────────

export class AudioManager {
  constructor() {
    // Récupère le contexte Web Audio (Phaser l'expose via window.AudioContext)
    this._ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Volume master
    this._master = this._ctx.createGain();
    this._master.gain.value = GameConfig.AUDIO.MASTER_VOLUME;
    this._master.connect(this._ctx.destination);

    // Bus jour (gain indépendant pour fade)
    this._dayBus = this._ctx.createGain();
    this._dayBus.gain.value = 0;
    this._dayBus.connect(this._master);

    // Bus nuit
    this._nightBus = this._ctx.createGain();
    this._nightBus.gain.value = 0;
    this._nightBus.connect(this._master);

    // Drone bas continu (basse tenue)
    this._droneDay   = null;
    this._droneNight  = null;

    // Minuteries de séquençage
    this._dayTimer   = null;
    this._nightTimer = null;
    this._dayIdx     = 0;
    this._nightIdx   = 0;

    this._started = false;
  }

  /** Démarre les deux flux et cross-fade vers le mode initial (jour) */
  start() {
    if (this._started) return;
    this._started = true;

    // Reprise de l'AudioContext (politique navigateur : nécessite un geste)
    if (this._ctx.state === 'suspended') {
      this._ctx.resume();
    }

    this._startDrone();
    this._startDaySequence();
    this._startNightSequence();

    // Démarrage en mode jour
    this._dayBus.gain.setValueAtTime(1, this._ctx.currentTime);
    this._nightBus.gain.setValueAtTime(0, this._ctx.currentTime);
  }

  /** Fondu vers la musique de jour */
  transitionToDay() {
    if (!this._started) return;
    const fadeSec = GameConfig.AUDIO.MUSIC_FADE_MS / 1000;
    const now = this._ctx.currentTime;
    this._dayBus.gain.linearRampToValueAtTime(1, now + fadeSec);
    this._nightBus.gain.linearRampToValueAtTime(0, now + fadeSec);
  }

  /** Fondu vers la musique de nuit */
  transitionToNight() {
    if (!this._started) return;
    const fadeSec = GameConfig.AUDIO.MUSIC_FADE_MS / 1000;
    const now = this._ctx.currentTime;
    this._dayBus.gain.linearRampToValueAtTime(0, now + fadeSec);
    this._nightBus.gain.linearRampToValueAtTime(1, now + fadeSec);
  }

  /** Arrête tout proprement */
  stop() {
    clearTimeout(this._dayTimer);
    clearTimeout(this._nightTimer);
    if (this._droneDay)   { this._droneDay.stop();   this._droneDay = null; }
    if (this._droneNight) { this._droneNight.stop();  this._droneNight = null; }
    this._master.gain.setValueAtTime(0, this._ctx.currentTime);
    this._started = false;
  }

  // ── Privé ────────────────────────────────────────────────────────────────

  /** Lance les oscillateurs de basse (drone continu) */
  _startDrone() {
    this._droneDay   = this._makeDrone(65.41,  0.08, 'sine',     this._dayBus);   // C2
    this._droneNight = this._makeDrone(55.00,  0.10, 'triangle', this._nightBus); // A1
  }

  _makeDrone(freq, gainValue, type, bus) {
    const osc  = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = gainValue;
    osc.connect(gain);
    gain.connect(bus);
    osc.start();
    return osc;
  }

  /** Boucle de notes de jour */
  _startDaySequence() {
    const play = () => {
      if (!this._started) return;
      const freq = DAY_SEQUENCE[this._dayIdx % DAY_SEQUENCE.length];
      this._playNote(freq, DAY_BEAT_MS * 0.75, 0.12, 'sine', this._dayBus);
      this._dayIdx++;
      this._dayTimer = setTimeout(play, DAY_BEAT_MS);
    };
    play();
  }

  /** Boucle de notes de nuit */
  _startNightSequence() {
    const play = () => {
      if (!this._started) return;
      const freq = NIGHT_SEQUENCE[this._nightIdx % NIGHT_SEQUENCE.length];
      this._playNote(freq, NIGHT_BEAT_MS * 0.65, 0.14, 'triangle', this._nightBus);
      this._nightIdx++;
      this._nightTimer = setTimeout(play, NIGHT_BEAT_MS);
    };
    play();
  }

  /**
   * Joue une note avec enveloppe ADSR simple.
   * @param {number} freq - Fréquence Hz
   * @param {number} durationMs - Durée de la note
   * @param {number} peakGain - Volume au pic
   * @param {string} type - Type d'oscillateur
   * @param {GainNode} bus - Bus de destination
   */
  _playNote(freq, durationMs, peakGain, type, bus) {
    const now = this._ctx.currentTime;
    const dur = durationMs / 1000;

    const osc  = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;

    // Enveloppe : attack 5% / sustain 70% / release 25%
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + dur * 0.05);       // attack
    gain.gain.setValueAtTime(peakGain * 0.7, now + dur * 0.75);          // sustain
    gain.gain.linearRampToValueAtTime(0, now + dur);                     // release

    osc.connect(gain);
    gain.connect(bus);
    osc.start(now);
    osc.stop(now + dur);
  }
}
