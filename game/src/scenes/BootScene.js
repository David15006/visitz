/**
 * BootScene.js
 * Première scène chargée au démarrage.
 * Génère programmatiquement les assets temporaires (textures, sons fictifs)
 * avant de passer à la scène de préchargement.
 *
 * Responsabilités : créer les assets graphiques de base via Graphics API,
 * configurer les paramètres globaux Phaser, puis lancer PreloadScene.
 */

import { GameConfig } from '../config/GameConfig.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  /**
   * Création des textures programmatiques (pas de fichiers externes requis).
   * Toutes les textures "temporaires" sont générées ici.
   */
  create() {
    this._createPlayerTexture();
    this._createTileTexture();
    this._createParticleTexture();

    // Transition immédiate vers le préchargement
    this.scene.start('PreloadScene');
  }

  /** Carré coloré représentant le joueur */
  _createPlayerTexture() {
    const { SIZE, COLOR, BORDER_COLOR } = GameConfig.PLAYER;
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });

    // Bordure
    gfx.fillStyle(BORDER_COLOR, 1);
    gfx.fillRect(0, 0, SIZE, SIZE);

    // Corps
    gfx.fillStyle(COLOR, 1);
    gfx.fillRect(2, 2, SIZE - 4, SIZE - 4);

    // Indicateur de direction (triangle vers le haut)
    gfx.fillStyle(0xffffff, 0.8);
    gfx.fillTriangle(SIZE / 2, 4, SIZE - 6, SIZE - 6, 6, SIZE - 6);

    gfx.generateTexture('player', SIZE, SIZE);
    gfx.destroy();
  }

  /** Tuile de sol pour la grille de la carte */
  _createTileTexture() {
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });

    // Fond de tuile
    gfx.fillStyle(GameConfig.MAP.BG_COLOR, 1);
    gfx.fillRect(0, 0, 64, 64);

    // Grille subtile
    gfx.lineStyle(1, GameConfig.MAP.GRID_COLOR, 0.6);
    gfx.strokeRect(0, 0, 64, 64);

    gfx.generateTexture('tile', 64, 64);
    gfx.destroy();
  }

  /** Petite particule blanche pour effets futurs */
  _createParticleTexture() {
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(4, 4, 4);
    gfx.generateTexture('particle', 8, 8);
    gfx.destroy();
  }
}
