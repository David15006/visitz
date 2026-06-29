/**
 * Player.js
 * Classe représentant le joueur.
 * Gère : le sprite, les déplacements ZQSD, la normalisation diagonale,
 * et les contraintes de carte (bounds clamping).
 */

import { GameConfig } from '../config/GameConfig.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene - Scène parente
   * @param {number} x - Position initiale X
   * @param {number} y - Position initiale Y
   */
  constructor(scene, x, y) {
    super(scene, x, y, 'player');

    // Ajout à la scène et activation de la physique
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Contraindre le joueur dans les limites du monde physique
    this.body.setCollideWorldBounds(true);

    // Taille de la hitbox = taille de la texture
    this.body.setSize(GameConfig.PLAYER.SIZE, GameConfig.PLAYER.SIZE);

    /** @type {Phaser.Types.Input.Keyboard.CursorKeys} */
    this._cursors = null;

    /** @type {{ Z: Phaser.Input.Keyboard.Key, Q: Phaser.Input.Keyboard.Key, S: Phaser.Input.Keyboard.Key, D: Phaser.Input.Keyboard.Key }} */
    this._keys = null;

    this._initInput(scene);
  }

  /** Enregistre les touches ZQSD + flèches */
  _initInput(scene) {
    this._cursors = scene.input.keyboard.createCursorKeys();
    this._keys = scene.input.keyboard.addKeys({
      Z: Phaser.Input.Keyboard.KeyCodes.Z,
      Q: Phaser.Input.Keyboard.KeyCodes.Q,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
    });
  }

  /**
   * Appelé chaque frame depuis GameScene.update().
   * Calcule la vélocité selon les touches pressées.
   */
  update() {
    const speed = GameConfig.PLAYER.SPEED;
    const { Z, Q, S, D } = this._keys;
    const { up, down, left, right } = this._cursors;

    // Vecteur de direction brut
    let dx = 0;
    let dy = 0;

    if (Q.isDown || left.isDown)  dx -= 1;
    if (D.isDown || right.isDown) dx += 1;
    if (Z.isDown || up.isDown)    dy -= 1;
    if (S.isDown || down.isDown)  dy += 1;

    // Normalisation diagonale (vitesse constante dans toutes les directions)
    if (dx !== 0 && dy !== 0) {
      const norm = Math.SQRT2;
      dx /= norm;
      dy /= norm;
    }

    this.body.setVelocity(dx * speed, dy * speed);

    // Rotation du sprite selon la direction (indicateur visuel de direction)
    if (dx !== 0 || dy !== 0) {
      this.rotation = Math.atan2(dy, dx) + Math.PI / 2;
    }
  }
}
