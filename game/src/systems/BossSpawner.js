/**
 * BossSpawner.js
 * Gère l'apparition et la mise à jour du Boss spécial.
 *
 * Règle : 1 boss par nuit, à partir du Jour 5.
 * Le boss spawn au début de la nuit (transition sunset → night).
 */

import { Boss } from '../entities/Boss.js';

// Points de spawn hors de la base (centre ≈ 1600, 1200)
const SPAWN_POSITIONS = [
  { x: 1150, y:  750 },
  { x: 2050, y:  750 },
  { x: 1050, y: 1200 },
  { x: 2150, y: 1200 },
  { x: 1150, y: 1700 },
  { x: 2050, y: 1700 },
  { x: 1600, y:  650 },
  { x: 1600, y: 1800 },
];

export class BossSpawner {
  /**
   * @param {Phaser.Scene} scene
   * @param {Player}       player
   * @param {Phaser.GameObjects.Group} worldItems
   * @param {object} callbacks
   * @param {Function} [callbacks.onBossSpawn] - Appelé juste après l'apparition
   * @param {Function} [callbacks.onBossKill]  - Appelé quand le boss meurt
   */
  constructor(scene, player, worldItems, { onBossSpawn, onBossKill } = {}) {
    this._scene        = scene;
    this._player       = player;
    this._worldItems   = worldItems;
    this._onBossSpawn  = onBossSpawn;
    this._onBossKill   = onBossKill;

    this._boss              = null;
    this._wasNight          = false;
    this._spawnedThisNight  = false;

    // Groupe physique pour les colliders
    this._group = scene.add.group();
  }

  get group()   { return this._group; }
  get hasBoss() { return this._boss !== null && !this._boss.isDead; }

  // ── Mise à jour ─────────────────────────────────────────────────────────────

  /**
   * @param {number}  delta
   * @param {boolean} isNight   - true uniquement pendant la phase 'night'
   * @param {number}  dayCount  - numéro du jour courant
   */
  update(delta, isNight, dayCount) {
    // Détecter la transition jour → nuit pour le spawn
    const justEnteredNight = isNight && !this._wasNight;

    // Réinitialiser le flag de spawn au retour du jour
    if (!isNight && this._wasNight) {
      this._spawnedThisNight = false;
    }

    // Spawner le boss à chaque début de nuit à partir du Jour 5
    if (justEnteredNight && dayCount >= 5 && !this._spawnedThisNight && !this.hasBoss) {
      this._spawnedThisNight = true;
      this._spawn();
    }

    this._wasNight = isNight;

    // Mettre à jour le boss vivant
    if (this._boss) {
      if (this._boss.isDead || !this._boss.active) {
        this._boss = null;
      } else {
        this._boss.update(delta, this._player, isNight);
      }
    }
  }

  // ── Attaque du joueur ───────────────────────────────────────────────────────

  /**
   * Vérifie si le boss est dans l'arc d'attaque du joueur.
   */
  handlePlayerAttack(x, y, angle, range, arc, damage) {
    if (!this._boss || this._boss.isDead) return;

    const dist = Phaser.Math.Distance.Between(x, y, this._boss.x, this._boss.y);
    if (dist > range) return;

    const toTarget = Phaser.Math.Angle.Between(x, y, this._boss.x, this._boss.y);
    const diff     = Phaser.Math.Angle.Wrap(toTarget - angle);
    if (Math.abs(diff) <= arc / 2) {
      this._boss.takeDamage(damage);
    }
  }

  // ── Spawn ────────────────────────────────────────────────────────────────────

  _spawn() {
    const pos = SPAWN_POSITIONS[Math.floor(Math.random() * SPAWN_POSITIONS.length)];

    this._boss = new Boss(
      this._scene, pos.x, pos.y,
      this._worldItems,
      () => this._onBossKill?.()
    );

    this._group.add(this._boss);
    this._onBossSpawn?.();
  }
}
