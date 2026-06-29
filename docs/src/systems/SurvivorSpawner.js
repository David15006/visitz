/**
 * SurvivorSpawner.js
 * Fait apparaître des survivants à l'étal de vente de la base.
 * Les survivants achètent de la nourriture et paient le joueur en pièces.
 *
 * Fréquence : toutes les 40-80 s. Maximum 1 survivant à la fois.
 */

import { Survivor } from '../entities/Survivor.js';

// Position de l'étal (défini dans Base.js)
const STALL_X = 1600;
const STALL_Y = 1225;

const MIN_INTERVAL = 40000;
const MAX_INTERVAL = 80000;

export class SurvivorSpawner {
  /**
   * @param {Phaser.Scene} scene
   * @param {Player}       player
   */
  constructor(scene, player) {
    this._scene    = scene;
    this._player   = player;
    this._survivor = null;
    this._timer    = 25000;  // premier survivant après 25 s
  }

  update(delta) {
    // Purger si le survivant a fini
    if (this._survivor?.isDone) this._survivor = null;

    if (this._survivor) return;

    this._timer -= delta;
    if (this._timer <= 0) {
      this._timer = MIN_INTERVAL + Math.random() * (MAX_INTERVAL - MIN_INTERVAL);
      this._spawn();
    }
  }

  _spawn() {
    // Légère variation de position autour de l'étal
    const x = STALL_X + (Math.random() - 0.5) * 24;
    const y = STALL_Y + 8;

    this._survivor = new Survivor(
      this._scene, x, y, this._player,
      () => { this._survivor = null; }
    );
  }
}
