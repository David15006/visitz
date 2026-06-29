/**
 * DayNightCycle.js
 * Gère le cycle jour/nuit du jeu.
 *
 * Durées (temps réel) :
 *   Jour total  : 8 minutes (dont 1 min de coucher de soleil)
 *   Nuit totale : 4 minutes (dont 1 min de lever de soleil)
 *   Cycle total : 12 minutes
 *
 * Phases :
 *   [0 – 7min]   → Plein jour     (overlay alpha 0)
 *   [7 – 8min]   → Coucher soleil (alpha 0 → max, couleur orange→nuit)
 *   [8 – 11min]  → Nuit profonde  (overlay alpha max)
 *   [11 – 12min] → Lever soleil   (alpha max → 0)
 *
 * Temps de jeu : 2 minutes de jeu par seconde réelle (départ à 06:00).
 */

import { GameConfig } from '../config/GameConfig.js';

const DN = GameConfig.DAY_NIGHT;

// Bornes des phases en ms réelles
const SUNSET_START  = DN.DAY_MS - DN.TRANS_MS;   // 7 min
const NIGHT_START   = DN.DAY_MS;                   // 8 min
const SUNRISE_START = DN.DAY_MS + DN.NIGHT_MS - DN.TRANS_MS; // 11 min
const CYCLE_MS      = DN.DAY_MS + DN.NIGHT_MS;    // 12 min

export class DayNightCycle {
  /**
   * @param {Phaser.Scene} scene
   * @param {Function} onPhaseChange - cb(newPhase) appelé lors d'un changement de phase
   *        Phases : 'day' | 'sunset' | 'night' | 'sunrise'
   */
  constructor(scene, onPhaseChange = null) {
    this._scene = scene;
    this._elapsed = 0;          // ms écoulées dans le cycle courant
    this._dayCount = 1;         // numéro du jour
    this._currentPhase = 'day';
    this._onPhaseChange = onPhaseChange;

    // Overlay de lumière (couvre tout le viewport, suit la caméra)
    this._overlay = scene.add
      .rectangle(
        GameConfig.WIDTH / 2,
        GameConfig.HEIGHT / 2,
        GameConfig.WIDTH,
        GameConfig.HEIGHT,
        DN.COLOR_NIGHT,
        0
      )
      .setScrollFactor(0)   // fixe à l'écran, indépendant de la caméra
      .setDepth(50);        // au-dessus du monde, sous le HUD (depth 100)
  }

  /**
   * Mise à jour chaque frame.
   * @param {number} delta - Temps écoulé depuis la dernière frame en ms
   */
  update(delta) {
    this._elapsed += delta;

    // Fin de cycle → nouveau jour
    if (this._elapsed >= CYCLE_MS) {
      this._elapsed -= CYCLE_MS;
      this._dayCount++;
    }

    const t = this._elapsed;
    const newPhase = this._resolvePhase(t);

    // Notification si changement de phase
    if (newPhase !== this._currentPhase) {
      this._currentPhase = newPhase;
      if (this._onPhaseChange) this._onPhaseChange(newPhase);
    }

    // Mise à jour visuelle de l'overlay
    const { alpha, color } = this._calcOverlay(t);
    this._overlay.setFillStyle(color, alpha);
  }

  /** Retourne la phase courante selon le temps dans le cycle */
  _resolvePhase(t) {
    if (t < SUNSET_START)   return 'day';
    if (t < NIGHT_START)    return 'sunset';
    if (t < SUNRISE_START)  return 'night';
    return 'sunrise';
  }

  /**
   * Calcule alpha et couleur de l'overlay en fonction du temps.
   * @returns {{ alpha: number, color: number }}
   */
  _calcOverlay(t) {
    const maxAlpha = DN.NIGHT_OVERLAY_ALPHA;
    const nightColor  = DN.COLOR_NIGHT;
    const sunsetColor = DN.COLOR_SUNSET;

    if (t < SUNSET_START) {
      // Plein jour : overlay invisible
      return { alpha: 0, color: nightColor };
    }

    if (t < NIGHT_START) {
      // Coucher : progress 0→1
      const p = (t - SUNSET_START) / DN.TRANS_MS;
      const color = _lerpColor(sunsetColor, nightColor, p);
      return { alpha: p * maxAlpha, color };
    }

    if (t < SUNRISE_START) {
      // Nuit profonde
      return { alpha: maxAlpha, color: nightColor };
    }

    // Lever : progress 0→1
    const p = (t - SUNRISE_START) / DN.TRANS_MS;
    return { alpha: (1 - p) * maxAlpha, color: _lerpColor(nightColor, sunsetColor, 1 - p) };
  }

  // ── Getters pour le HUD ─────────────────────────────────────────────────

  /** Numéro du jour courant */
  get dayCount() { return this._dayCount; }

  /** Phase courante : 'day' | 'sunset' | 'night' | 'sunrise' */
  get currentPhase() { return this._currentPhase; }

  /**
   * Heure de jeu formatée "HH:MM".
   * 2 minutes de jeu par milliseconde réelle, départ à 06:00.
   */
  get gameTimeString() {
    const totalGameMin = Math.floor(
      this._elapsed * DN.GAME_MIN_PER_REAL_MS + DN.START_HOUR * 60
    ) % (24 * 60);
    const h = Math.floor(totalGameMin / 60).toString().padStart(2, '0');
    const m = (totalGameMin % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  /** Progession dans le cycle courant (0 à 1) */
  get cycleProgress() { return this._elapsed / CYCLE_MS; }
}

// ── Utilitaire ──────────────────────────────────────────────────────────────

/** Interpolation linéaire entre deux couleurs hex RGB */
function _lerpColor(c1, c2, t) {
  const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
  return (
    (Math.round(r1 + (r2 - r1) * t) << 16) |
    (Math.round(g1 + (g2 - g1) * t) << 8)  |
     Math.round(b1 + (b2 - b1) * t)
  );
}
