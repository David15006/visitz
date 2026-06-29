/**
 * PreloadScene.js
 * Affiche un écran de chargement avec barre de progression.
 * Simule un chargement (assets futurs à ajouter ici).
 * Lance MainMenuScene une fois terminé.
 */

import { GameConfig } from '../config/GameConfig.js';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    const { WIDTH, HEIGHT } = GameConfig;
    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;

    // --- Fond ---
    this.cameras.main.setBackgroundColor(GameConfig.UI.BG_COLOR);

    // --- Titre de chargement ---
    this.add.text(cx, cy - 80, 'Chargement…', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: GameConfig.UI.TITLE_COLOR,
    }).setOrigin(0.5);

    // --- Conteneur de la barre ---
    const barW = 400;
    const barH = 20;
    const barX = cx - barW / 2;
    const barY = cy - barH / 2;

    // Fond de la barre
    this.add.rectangle(cx, cy, barW + 4, barH + 4, 0x333355).setOrigin(0.5);

    // Barre de remplissage (mise à jour dynamique)
    const bar = this.add.rectangle(barX, barY, 0, barH, 0xe94560).setOrigin(0, 0);

    // Texte pourcentage
    const pct = this.add.text(cx, cy + 30, '0%', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // --- Événement de progression Phaser ---
    this.load.on('progress', (value) => {
      bar.width = barW * value;
      pct.setText(Math.floor(value * 100) + '%');
    });

    // Ici on chargerait des assets réels : images, tilemaps, sons…
    // Ex : this.load.image('hero', 'assets/hero.png');
    // Pour l'instant on simule avec un court délai.
  }

  create() {
    // Court délai pour que la barre soit visible (sinon trop rapide)
    this.time.delayedCall(400, () => {
      this.scene.start('MainMenuScene');
    });
  }
}
