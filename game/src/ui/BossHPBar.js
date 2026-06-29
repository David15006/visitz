/**
 * BossHPBar.js
 * Barre de vie du boss affichée en haut de l'écran (scroll factor 0).
 * Affiche le nom, les HP, et des marqueurs de phase.
 */

import { GameConfig } from '../config/GameConfig.js';

const SW = GameConfig.WIDTH;

export class BossHPBar {
  /**
   * @param {Phaser.Scene} scene
   * @param {string} bossName
   * @param {number} maxHp
   * @param {number[]} phaseThresholds  fractions HP (ex: [0.66, 0.33])
   */
  constructor(scene, bossName, maxHp, phaseThresholds = []) {
    this._scene     = scene;
    this._maxHp     = maxHp;
    this._hp        = maxHp;
    this._visible   = false;

    const BAR_W  = 420;
    const BAR_H  = 16;
    const BAR_X  = SW / 2 - BAR_W / 2;
    const BAR_Y  = 22;

    // Conteneur
    this._gfx = scene.add.graphics().setScrollFactor(0).setDepth(250).setAlpha(0);

    // Nom du boss
    this._label = scene.add.text(SW / 2, BAR_Y - 12, bossName, {
      fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold',
      color: '#ffaa00', stroke: '#000', strokeThickness: 3,
    }).setScrollFactor(0).setDepth(251).setOrigin(0.5, 1).setAlpha(0);

    // Marqueurs de phase
    this._phaseMarkers = phaseThresholds.map(t => ({
      t, x: BAR_X + BAR_W * t,
    }));

    this._barX  = BAR_X;
    this._barY  = BAR_Y;
    this._barW  = BAR_W;
    this._barH  = BAR_H;

    this._draw();
  }

  /** Affiche la barre avec un fade-in. */
  show() {
    if (this._visible) return;
    this._visible = true;
    this._scene.tweens.add({
      targets: [this._gfx, this._label],
      alpha: 1, duration: 600, ease: 'Power2',
    });
  }

  /** Cache la barre avec un fade-out. */
  hide() {
    this._scene.tweens.add({
      targets: [this._gfx, this._label],
      alpha: 0, duration: 800, ease: 'Power2',
    });
  }

  /** Met à jour les HP affichés. */
  setHp(hp) {
    this._hp = Math.max(0, hp);
    this._draw();
  }

  _draw() {
    const g   = this._gfx;
    const pct = this._hp / this._maxHp;
    g.clear();

    // Ombre portée
    g.fillStyle(0x000000, 0.5);
    g.fillRoundedRect(this._barX - 2, this._barY - 2, this._barW + 4, this._barH + 4, 4);

    // Fond sombre
    g.fillStyle(0x111111, 0.95);
    g.fillRoundedRect(this._barX, this._barY, this._barW, this._barH, 3);

    // Couleur de la barre selon phase
    const col = pct > 0.66 ? 0xcc3300
              : pct > 0.33 ? 0xff6600
              :               0xff0000;
    g.fillStyle(col, 1);
    if (pct > 0) {
      g.fillRoundedRect(this._barX, this._barY, this._barW * pct, this._barH, 3);
    }

    // Reflet clair
    g.fillStyle(0xffffff, 0.12);
    g.fillRect(this._barX, this._barY, this._barW * pct, this._barH / 2);

    // Bordure
    g.lineStyle(1, 0xff8800, 0.8);
    g.strokeRoundedRect(this._barX, this._barY, this._barW, this._barH, 3);

    // Marqueurs de phase (lignes verticales)
    this._phaseMarkers.forEach(({ t, x }) => {
      g.lineStyle(2, 0xffffff, 0.7);
      g.lineBetween(x, this._barY - 2, x, this._barY + this._barH + 2);
    });
  }

  destroy() {
    this._gfx?.destroy();
    this._label?.destroy();
  }
}
