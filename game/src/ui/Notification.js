/**
 * Notification.js
 * Affiche des messages centrés à l'écran (fade-in / tenue / fade-out).
 * Les notifications se mettent en file et s'affichent l'une après l'autre.
 */

import { GameConfig } from '../config/GameConfig.js';

const { WIDTH, HEIGHT } = GameConfig;
const DEPTH = 300;

export class Notification {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this._scene   = scene;
    this._queue   = [];
    this._active  = false;
  }

  /**
   * Ajoute une notification à la file.
   * @param {string} text
   * @param {string} [color='#ffffff']
   * @param {number} [duration=3000] ms d'affichage avant fondu sortant
   */
  show(text, color = '#ffffff', duration = 3000) {
    this._queue.push({ text, color, duration });
    if (!this._active) this._next();
  }

  _next() {
    if (this._queue.length === 0) { this._active = false; return; }
    this._active = true;

    const { text, color, duration } = this._queue.shift();

    // Fond semi-transparent
    const bg = this._scene.add.graphics()
      .setScrollFactor(0).setDepth(DEPTH).setAlpha(0);
    bg.fillStyle(0x000000, 0.7);
    bg.fillRoundedRect(WIDTH / 2 - 260, HEIGHT / 2 - 85, 520, 56, 8);

    const label = this._scene.add.text(WIDTH / 2, HEIGHT / 2 - 57, text, {
      fontFamily: 'monospace',
      fontSize:   '20px',
      fontStyle:  'bold',
      color,
      stroke:     '#000000',
      strokeThickness: 5,
    }).setScrollFactor(0).setDepth(DEPTH + 1).setOrigin(0.5).setAlpha(0);

    const targets = [bg, label];

    // Fade-in
    this._scene.tweens.add({
      targets,
      alpha: 1,
      duration: 350,
      ease: 'Power2',
      onComplete: () => {
        // Tenue, puis fade-out
        this._scene.time.delayedCall(duration, () => {
          this._scene.tweens.add({
            targets,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
              bg.destroy();
              label.destroy();
              this._next();
            },
          });
        });
      },
    });
  }
}
