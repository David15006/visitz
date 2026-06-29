/**
 * BootScene.js
 * Génère programmatiquement toutes les textures du jeu.
 * Inclut le spritesheet du joueur (10 frames), les items et les décors.
 */

import { GameConfig } from '../config/GameConfig.js';

const { SPRITE_W: W, SPRITE_H: H } = GameConfig.PLAYER;

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    // Joueur : 10 frames d'animation
    this._createPlayerFrames();

    // Items
    this._createBatWorldTexture();
    this._createBatIconTexture();

    // Décor
    this._createTileTexture();
    this._createTreeTexture();
    this._createRockTexture();
    this._createGraveTexture();

    // Utilitaires
    this._createParticleTexture();

    this.scene.start('PreloadScene');
  }

  // ── Joueur ────────────────────────────────────────────────────────────────

  /**
   * Crée les 10 frames du joueur via une configuration déclarative.
   * batA  : angle de la batte (radians, 0 = droite)
   * ll/rl : offset {x,y} des pieds gauche / droit
   */
  _createPlayerFrames() {
    const frames = [
      { key: 'p_idle_0', batA:  0.85, ll: { x: 0, y:  0 }, rl: { x: 0, y:  0 } },
      { key: 'p_idle_1', batA:  0.90, ll: { x: 0, y:  1 }, rl: { x: 0, y: -1 } },
      { key: 'p_walk_0', batA:  0.80, ll: { x:-4, y: -3 }, rl: { x: 3, y:  3 } },
      { key: 'p_walk_1', batA:  0.85, ll: { x: 0, y:  0 }, rl: { x: 0, y:  0 } },
      { key: 'p_walk_2', batA:  0.80, ll: { x: 3, y:  3 }, rl: { x:-4, y: -3 } },
      { key: 'p_walk_3', batA:  0.85, ll: { x: 0, y:  0 }, rl: { x: 0, y:  0 } },
      // Attaque : swing de haut en bas (−1.4 → 1.2 rad)
      { key: 'p_atk_0', batA: -1.40, ll: { x: 0, y:  0 }, rl: { x: 0, y:  0 } },
      { key: 'p_atk_1', batA: -0.50, ll: { x:-2, y:  0 }, rl: { x: 2, y:  0 } },
      { key: 'p_atk_2', batA:  0.35, ll: { x:-3, y:  2 }, rl: { x: 3, y:  2 } },
      { key: 'p_atk_3', batA:  1.20, ll: { x: 0, y:  0 }, rl: { x: 0, y:  0 } },
    ];
    frames.forEach(f => this._drawPlayerFrame(f.key, f.batA, f.ll, f.rl));
  }

  /**
   * Dessine un seul frame du joueur (vue ¾ top-down).
   * Le sprite est orienté "vers le haut" par défaut.
   * La rotation vers la souris est appliquée par Phaser dans Player.js.
   */
  _drawPlayerFrame(key, batAngle, ll, rl) {
    const gfx = this.make.graphics({ add: false });
    const cx  = W / 2;

    // --- Ombre au sol ---
    gfx.fillStyle(0x000000, 0.22);
    gfx.fillEllipse(cx, H - 2, 30, 9);

    // --- Pieds / jambes ---
    gfx.fillStyle(0x2c2c4e, 1);
    // Pied gauche
    gfx.fillEllipse(cx - 7 + ll.x, 38 + ll.y, 11, 14);
    // Pied droit
    gfx.fillEllipse(cx + 7 + rl.x, 38 + rl.y, 11, 14);

    // Reflet chaussures
    gfx.fillStyle(0x444466, 0.5);
    gfx.fillEllipse(cx - 6 + ll.x, 35 + ll.y, 6, 5);
    gfx.fillEllipse(cx + 8 + rl.x, 35 + rl.y, 6, 5);

    // --- Corps (t-shirt bleu) ---
    gfx.fillStyle(0x3a6ead, 1);
    gfx.fillRoundedRect(cx - 10, 22, 20, 18, 5);

    // Ombre latérale du corps
    gfx.fillStyle(0x2a5090, 0.6);
    gfx.fillRoundedRect(cx + 4, 23, 6, 16, 3);

    // Bras gauche
    gfx.fillStyle(0xf5c397, 1);
    gfx.fillEllipse(cx - 12, 28, 8, 14);

    // --- Batte (tenue par la main droite) ---
    const bOx = cx + 11;  // origine X (main droite)
    const bOy = 28;        // origine Y

    // Handle (poignée fine)
    gfx.lineStyle(3, 0x5c3a1e, 1);
    const hLen = 8;
    gfx.lineBetween(
      bOx, bOy,
      bOx + Math.cos(batAngle) * hLen,
      bOy + Math.sin(batAngle) * hLen
    );
    // Corps de la batte (plus épais)
    gfx.lineStyle(5, 0x9b6b35, 1);
    const tLen = 22;
    gfx.lineBetween(
      bOx + Math.cos(batAngle) * hLen,
      bOy + Math.sin(batAngle) * hLen,
      bOx + Math.cos(batAngle) * tLen,
      bOy + Math.sin(batAngle) * tLen
    );
    // Reflet batte
    gfx.lineStyle(2, 0xcc9966, 0.55);
    gfx.lineBetween(
      bOx + Math.cos(batAngle) * (hLen + 1),
      bOy + Math.sin(batAngle) * (hLen + 1),
      bOx + Math.cos(batAngle) * (tLen - 2),
      bOy + Math.sin(batAngle) * (tLen - 2)
    );

    // --- Tête ---
    // Peau
    gfx.fillStyle(0xf5c397, 1);
    gfx.fillCircle(cx, 13, 12);

    // Casquette — demi-cercle supérieur en coordonnées écran
    // (y négatif = haut ; angles π→2π tracent le demi-cercle du haut)
    gfx.fillStyle(0x9b1a1a, 1);
    const capPts = [];
    for (let a = Math.PI; a <= 2 * Math.PI; a += 0.2) {
      capPts.push({ x: cx + 12 * Math.cos(a), y: 13 + 12 * Math.sin(a) });
    }
    capPts.push({ x: cx + 12, y: 13 }); // fermeture
    gfx.fillPoints(capPts, true);
    // Bord supérieur plein
    gfx.fillRect(cx - 11, 7, 22, 5);
    // Visière
    gfx.fillStyle(0x7a1111, 1);
    gfx.fillRect(cx - 13, 11, 26, 4);

    // Yeux
    gfx.fillStyle(0x1a1a1a, 1);
    gfx.fillCircle(cx - 4, 12, 2.5);
    gfx.fillCircle(cx + 4, 12, 2.5);
    // Reflets yeux
    gfx.fillStyle(0xffffff, 0.7);
    gfx.fillCircle(cx - 3, 11, 1);
    gfx.fillCircle(cx + 5, 11, 1);

    gfx.generateTexture(key, W, H);
    gfx.destroy();
  }

  // ── Items ─────────────────────────────────────────────────────────────────

  /** Batte posée sur le sol (sprite monde, ramassable) */
  _createBatWorldTexture() {
    const gfx = this.make.graphics({ add: false });

    // Ombre
    gfx.fillStyle(0x000000, 0.22);
    gfx.fillEllipse(18, 13, 34, 7);

    // Poignée
    gfx.lineStyle(3, 0x5c3a1e, 1);
    gfx.lineBetween(3, 8, 12, 8);

    // Corps
    gfx.lineStyle(6, 0x9b6b35, 1);
    gfx.lineBetween(12, 8, 34, 8);

    // Reflet
    gfx.lineStyle(2, 0xcc9966, 0.55);
    gfx.lineBetween(13, 7, 33, 7);

    // Aura de ramassage (contour jaune subtil)
    gfx.lineStyle(1, 0xffd700, 0.4);
    gfx.strokeEllipse(18, 9, 36, 14);

    gfx.generateTexture('bat_world', 36, 16);
    gfx.destroy();
  }

  /** Icône de la batte pour l'interface inventaire (24×24) */
  _createBatIconTexture() {
    const gfx = this.make.graphics({ add: false });

    // Fond du slot (transparent)
    gfx.fillStyle(0x000000, 0);
    gfx.fillRect(0, 0, 24, 24);

    // Batte en diagonale (bas-gauche → haut-droit)
    gfx.lineStyle(2, 0x5c3a1e, 1);
    gfx.lineBetween(6, 19, 10, 15);
    gfx.lineStyle(5, 0x9b6b35, 1);
    gfx.lineBetween(10, 15, 20, 5);
    gfx.lineStyle(1, 0xcc9966, 0.7);
    gfx.lineBetween(11, 14, 19, 6);

    gfx.generateTexture('icon_bat', 24, 24);
    gfx.destroy();
  }

  // ── Décor ─────────────────────────────────────────────────────────────────

  _createTileTexture() {
    const gfx = this.make.graphics({ add: false });
    gfx.fillStyle(0x2d4a1e, 1);
    gfx.fillRect(0, 0, 64, 64);
    gfx.fillStyle(0x345520, 0.5);
    gfx.fillRect(4, 4, 28, 28);
    gfx.fillRect(36, 36, 24, 24);
    gfx.lineStyle(1, 0x1e3314, 0.5);
    gfx.strokeRect(0, 0, 64, 64);
    gfx.generateTexture('tile', 64, 64);
    gfx.destroy();
  }

  _createTreeTexture() {
    const gfx = this.make.graphics({ add: false });
    gfx.fillStyle(0x5c3a1e, 1);
    gfx.fillRect(18, 36, 10, 16);
    gfx.fillStyle(0x1a6b1a, 1);
    gfx.fillCircle(20, 34, 14);
    gfx.fillStyle(0x228b22, 1);
    gfx.fillCircle(17, 26, 11);
    gfx.fillStyle(0x32a832, 1);
    gfx.fillCircle(22, 18, 9);
    gfx.fillStyle(0x55cc55, 0.35);
    gfx.fillCircle(16, 22, 5);
    gfx.generateTexture('tree', 40, 52);
    gfx.destroy();
  }

  _createRockTexture() {
    const gfx = this.make.graphics({ add: false });
    gfx.fillStyle(0x777777, 1);
    gfx.fillEllipse(16, 16, 28, 22);
    gfx.fillStyle(0x444444, 0.5);
    gfx.fillEllipse(19, 21, 20, 7);
    gfx.fillStyle(0xaaaaaa, 0.6);
    gfx.fillEllipse(11, 12, 10, 7);
    gfx.fillStyle(0x666666, 1);
    gfx.fillCircle(27, 20, 5);
    gfx.generateTexture('rock', 36, 28);
    gfx.destroy();
  }

  _createGraveTexture() {
    const gfx = this.make.graphics({ add: false });
    gfx.fillStyle(0x555555, 1);
    gfx.fillRect(2, 28, 20, 8);
    gfx.fillStyle(0x666666, 1);
    gfx.fillRect(5, 10, 14, 20);
    gfx.fillCircle(12, 10, 7);
    gfx.fillStyle(0x333333, 0.5);
    gfx.fillRect(6, 11, 3, 18);
    gfx.lineStyle(2, 0x888888, 0.8);
    gfx.lineBetween(12, 5, 12, 28);
    gfx.lineBetween(7, 14, 17, 14);
    gfx.generateTexture('grave', 24, 36);
    gfx.destroy();
  }

  _createParticleTexture() {
    const gfx = this.make.graphics({ add: false });
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(4, 4, 4);
    gfx.generateTexture('particle', 8, 8);
    gfx.destroy();
  }
}
