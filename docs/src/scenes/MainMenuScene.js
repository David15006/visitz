/**
 * MainMenuScene.js
 * Menu principal du jeu.
 * Affiche le titre, le bouton "Nouvelle Partie" et le bouton "Quitter".
 * Gère les animations d'entrée et les interactions bouton.
 */

import { GameConfig } from '../config/GameConfig.js';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create() {
    const { WIDTH, HEIGHT } = GameConfig;
    const cx = WIDTH / 2;

    this.cameras.main.setBackgroundColor(GameConfig.UI.BG_COLOR);

    this._buildBackground(WIDTH, HEIGHT);
    this._buildTitle(cx);
    this._buildButtons(cx, HEIGHT);
  }

  /** Décorations de fond : lignes et points discrets */
  _buildBackground(w, h) {
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0x223355, 0.4);

    // Grille décorative
    for (let x = 0; x < w; x += 80) {
      gfx.lineBetween(x, 0, x, h);
    }
    for (let y = 0; y < h; y += 80) {
      gfx.lineBetween(0, y, w, y);
    }

    // Ligne d'accentuation horizontale
    gfx.lineStyle(2, 0xe94560, 0.6);
    gfx.lineBetween(0, h * 0.18, w, h * 0.18);
  }

  /** Titre du jeu avec sous-titre */
  _buildTitle(cx) {
    // Titre principal
    const title = this.add.text(cx, 110, 'MON JEU PHASER', {
      fontFamily: 'monospace',
      fontSize: '48px',
      fontStyle: 'bold',
      color: GameConfig.UI.TITLE_COLOR,
      stroke: GameConfig.UI.BUTTON_TEXT,
      strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0);

    // Sous-titre
    const sub = this.add.text(cx, 170, 'Prototype v0.1', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#666688',
    }).setOrigin(0.5).setAlpha(0);

    // Animation d'entrée
    this.tweens.add({ targets: [title, sub], alpha: 1, y: '-=12', duration: 700, ease: 'Power2' });
  }

  /** Boutons interactifs centrés */
  _buildButtons(cx, height) {
    const btnY1 = height / 2 + 20;
    const btnY2 = height / 2 + 90;

    const btnNewGame = this._createButton(cx, btnY1, 'NOUVELLE PARTIE', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene');
      });
    });

    const btnQuit = this._createButton(cx, btnY2, 'QUITTER', () => {
      // Dans un contexte navigateur, on peut fermer ou afficher un message
      this.add.text(cx, height - 40, 'Ferme l\'onglet pour quitter.', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#888888',
      }).setOrigin(0.5);
    }, true);

    // Animation d'entrée décalée
    [btnNewGame, btnQuit].forEach((btn, i) => {
      btn.setAlpha(0);
      this.tweens.add({
        targets: btn,
        alpha: 1,
        duration: 500,
        delay: 300 + i * 150,
        ease: 'Power1',
      });
    });
  }

  /**
   * Fabrique un bouton stylisé avec hover et callback.
   * @param {number} x
   * @param {number} y
   * @param {string} label
   * @param {Function} onClick
   * @param {boolean} secondary - style alternatif (bouton secondaire)
   * @returns {Phaser.GameObjects.Container}
   */
  _createButton(x, y, label, onClick, secondary = false) {
    const W = 280;
    const H = 52;

    const container = this.add.container(x, y);

    // Fond du bouton
    const bg = this.add.rectangle(0, 0, W, H,
      secondary ? 0x111122 : 0x16213e, 1
    ).setStrokeStyle(2, secondary ? 0x444466 : 0xe94560);

    // Texte
    const text = this.add.text(0, 0, label, {
      fontFamily: 'monospace',
      fontSize: '18px',
      fontStyle: secondary ? 'normal' : 'bold',
      color: secondary ? '#666688' : GameConfig.UI.BUTTON_TEXT,
    }).setOrigin(0.5);

    container.add([bg, text]);
    container.setSize(W, H);
    container.setInteractive({ useHandCursor: true });

    // --- Effets hover ---
    container.on('pointerover', () => {
      bg.setFillStyle(secondary ? 0x1a1a33 : 0x0f3460);
      this.tweens.add({ targets: container, scaleX: 1.04, scaleY: 1.04, duration: 100 });
    });

    container.on('pointerout', () => {
      bg.setFillStyle(secondary ? 0x111122 : 0x16213e);
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100 });
    });

    container.on('pointerdown', () => {
      this.tweens.add({ targets: container, scaleX: 0.96, scaleY: 0.96, duration: 80, yoyo: true,
        onComplete: onClick });
    });

    return container;
  }
}
