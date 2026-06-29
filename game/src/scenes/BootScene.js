/**
 * BootScene.js
 * Première scène chargée au démarrage.
 * Génère programmatiquement toutes les textures temporaires du jeu
 * avant de passer à PreloadScene.
 *
 * À terme, ces textures seront remplacées par de vrais sprites
 * chargés dans PreloadScene via this.load.image(...).
 */

import { GameConfig } from '../config/GameConfig.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    // Textures de personnage
    this._createPlayerTexture();

    // Textures de décor
    this._createTileTexture();
    this._createTreeTexture();
    this._createRockTexture();
    this._createGraveTexture();

    // Utilitaires
    this._createParticleTexture();

    this.scene.start('PreloadScene');
  }

  // ── Personnage ────────────────────────────────────────────────────────────

  _createPlayerTexture() {
    const { SIZE, COLOR, BORDER_COLOR } = GameConfig.PLAYER;
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });

    gfx.fillStyle(BORDER_COLOR, 1);
    gfx.fillRect(0, 0, SIZE, SIZE);
    gfx.fillStyle(COLOR, 1);
    gfx.fillRect(2, 2, SIZE - 4, SIZE - 4);

    // Indicateur de direction (triangle pointant vers le haut)
    gfx.fillStyle(0xffffff, 0.8);
    gfx.fillTriangle(SIZE / 2, 4, SIZE - 6, SIZE - 6, 6, SIZE - 6);

    gfx.generateTexture('player', SIZE, SIZE);
    gfx.destroy();
  }

  // ── Sol ───────────────────────────────────────────────────────────────────

  _createTileTexture() {
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });

    // Herbe de base
    gfx.fillStyle(0x2d4a1e, 1);
    gfx.fillRect(0, 0, 64, 64);

    // Légère variation de ton
    gfx.fillStyle(0x345520, 0.5);
    gfx.fillRect(4, 4, 28, 28);
    gfx.fillRect(36, 36, 24, 24);

    // Grille discrète
    gfx.lineStyle(1, 0x1e3314, 0.5);
    gfx.strokeRect(0, 0, 64, 64);

    gfx.generateTexture('tile', 64, 64);
    gfx.destroy();
  }

  // ── Arbre ─────────────────────────────────────────────────────────────────

  _createTreeTexture() {
    const W = 40, H = 52;
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });

    // Tronc
    gfx.fillStyle(0x5c3a1e, 1);
    gfx.fillRect(W / 2 - 5, H - 16, 10, 16);

    // Feuillage (trois cercles superposés = cône stylisé)
    gfx.fillStyle(0x1a6b1a, 1);
    gfx.fillCircle(W / 2, H - 18, 14);
    gfx.fillStyle(0x228b22, 1);
    gfx.fillCircle(W / 2 - 3, H - 26, 11);
    gfx.fillStyle(0x32a832, 1);
    gfx.fillCircle(W / 2 + 2, H - 34, 9);

    // Éclat de lumière
    gfx.fillStyle(0x55cc55, 0.35);
    gfx.fillCircle(W / 2 - 4, H - 30, 5);

    gfx.generateTexture('tree', W, H);
    gfx.destroy();
  }

  // ── Rocher ────────────────────────────────────────────────────────────────

  _createRockTexture() {
    const W = 36, H = 28;
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });

    // Corps principal (irrégulier)
    gfx.fillStyle(0x777777, 1);
    gfx.fillEllipse(W / 2, H / 2 + 2, W - 4, H - 4);

    // Ombre portée
    gfx.fillStyle(0x444444, 0.5);
    gfx.fillEllipse(W / 2 + 3, H / 2 + 5, W - 8, 8);

    // Reflet
    gfx.fillStyle(0xaaaaaa, 0.6);
    gfx.fillEllipse(W / 2 - 5, H / 2 - 4, 10, 7);

    // Petite pierre à côté
    gfx.fillStyle(0x666666, 1);
    gfx.fillCircle(W - 7, H - 4, 5);

    gfx.generateTexture('rock', W, H);
    gfx.destroy();
  }

  // ── Pierre tombale ────────────────────────────────────────────────────────

  _createGraveTexture() {
    const W = 24, H = 36;
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });

    // Socle
    gfx.fillStyle(0x555555, 1);
    gfx.fillRect(2, H - 8, W - 4, 8);

    // Stèle (sommet arrondi)
    gfx.fillStyle(0x666666, 1);
    gfx.fillRect(5, 10, W - 10, H - 16);
    gfx.fillCircle(W / 2, 10, (W - 10) / 2);

    // Ombre
    gfx.fillStyle(0x333333, 0.5);
    gfx.fillRect(6, 11, 3, H - 18);

    // Croix gravée
    gfx.lineStyle(2, 0x888888, 0.8);
    gfx.lineBetween(W / 2, 5, W / 2, H - 12);
    gfx.lineBetween(W / 2 - 5, 14, W / 2 + 5, 14);

    gfx.generateTexture('grave', W, H);
    gfx.destroy();
  }

  // ── Particule ─────────────────────────────────────────────────────────────

  _createParticleTexture() {
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(4, 4, 4);
    gfx.generateTexture('particle', 8, 8);
    gfx.destroy();
  }
}
