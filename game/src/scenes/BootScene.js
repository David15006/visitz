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
    this._createMeatTextures();

    // Zombies : 6 frames × 3 types
    this._createZombieFrames('zn', 0x4a7a2e, 0x2d5a1a, 0xcc3333); // normal : vert + rouge
    this._createZombieFrames('zf', 0x7a9a2e, 0x4a6a10, 0x3399cc); // fast : vert clair + bleu
    this._createZombieFrames('zt', 0x3a5a20, 0x1a3a08, 0x993300); // tank : vert foncé + orange

    // Décor
    this._createTileTexture();
    this._createTreeTexture();
    this._createRockTexture();
    this._createGraveTexture();

    // Base : murs, porte, objets intérieurs
    this._createWallTextures();
    this._createDoorTextures();
    this._createInteriorTextures();

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

  // ── Murs & Porte ─────────────────────────────────────────────────────────

  _createWallTextures() {
    // Mur horizontal : 64×16 (pierre grise avec joints)
    const h = this.make.graphics({ add: false });
    h.fillStyle(0x888888, 1);
    h.fillRect(0, 0, 64, 16);
    // Joints horizontaux
    h.fillStyle(0x555555, 0.6);
    h.fillRect(0, 7, 64, 2);
    // Blocs décalés
    h.fillStyle(0x999999, 0.4);
    h.fillRect(1, 1, 30, 5);
    h.fillRect(33, 9, 30, 5);
    // Bord sombre
    h.fillStyle(0x333333, 0.5);
    h.fillRect(0, 0, 64, 2);
    h.fillRect(0, 14, 64, 2);
    h.generateTexture('wall_h', 64, 16);
    h.destroy();

    // Mur vertical : 16×64
    const v = this.make.graphics({ add: false });
    v.fillStyle(0x888888, 1);
    v.fillRect(0, 0, 16, 64);
    // Joint vertical
    v.fillStyle(0x555555, 0.6);
    v.fillRect(7, 0, 2, 64);
    // Blocs décalés
    v.fillStyle(0x999999, 0.4);
    v.fillRect(1, 1, 5, 30);
    v.fillRect(9, 33, 5, 30);
    // Bords
    v.fillStyle(0x333333, 0.5);
    v.fillRect(0, 0, 2, 64);
    v.fillRect(14, 0, 2, 64);
    v.generateTexture('wall_v', 16, 64);
    v.destroy();
  }

  _createDoorTextures() {
    // Porte fermée : planches en bois (64×16)
    const dc = this.make.graphics({ add: false });
    dc.fillStyle(0x7a4a1a, 1);
    dc.fillRect(0, 0, 64, 16);
    // Planches verticales
    dc.fillStyle(0x5c3a10, 0.5);
    dc.fillRect(15, 0, 2, 16);
    dc.fillRect(31, 0, 2, 16);
    dc.fillRect(47, 0, 2, 16);
    // Traverse horizontale
    dc.fillStyle(0x5c3a10, 0.7);
    dc.fillRect(0, 7, 64, 2);
    // Reflet
    dc.fillStyle(0xcc8833, 0.25);
    dc.fillRect(1, 1, 62, 4);
    // Poignée
    dc.fillStyle(0xccaa33, 1);
    dc.fillRect(29, 10, 6, 3);
    dc.generateTexture('door_closed', 64, 16);
    dc.destroy();

    // Porte ouverte : cadre transparent (64×16)
    const do_ = this.make.graphics({ add: false });
    do_.fillStyle(0x7a4a1a, 0.25);
    do_.fillRect(0, 0, 64, 4);
    do_.fillRect(0, 12, 64, 4);
    do_.generateTexture('door_open', 64, 16);
    do_.destroy();
  }

  _createInteriorTextures() {
    // Coffre (40×28)
    const chest = this.make.graphics({ add: false });
    chest.fillStyle(0x7a5a2a, 1);
    chest.fillRect(0, 8, 40, 20);
    chest.fillStyle(0x9b7a3a, 1);
    chest.fillRect(0, 0, 40, 12);
    chest.fillStyle(0x555555, 1);
    chest.fillRect(0, 10, 40, 3);
    chest.fillStyle(0xccaa33, 1);
    chest.fillRect(17, 7, 6, 8);
    chest.fillStyle(0x333333, 0.3);
    chest.fillRect(1, 9, 38, 18);
    chest.generateTexture('obj_chest', 40, 28);
    chest.destroy();

    // Cuisine (44×44)
    const kitchen = this.make.graphics({ add: false });
    kitchen.fillStyle(0x555566, 1);
    kitchen.fillRect(0, 0, 44, 44);
    kitchen.fillStyle(0x333344, 0.8);
    kitchen.fillRect(2, 2, 20, 20);
    kitchen.fillRect(22, 2, 20, 20);
    kitchen.fillRect(2, 22, 40, 20);
    // Feux
    kitchen.fillStyle(0xff6622, 0.8);
    kitchen.fillCircle(12, 12, 6);
    kitchen.fillStyle(0xff9933, 0.6);
    kitchen.fillCircle(12, 12, 3);
    kitchen.fillStyle(0xff6622, 0.8);
    kitchen.fillCircle(32, 12, 6);
    // Plan de travail
    kitchen.fillStyle(0x888899, 0.5);
    kitchen.fillRect(3, 23, 38, 18);
    kitchen.generateTexture('obj_kitchen', 44, 44);
    kitchen.destroy();

    // Établi (48×32)
    const wb = this.make.graphics({ add: false });
    wb.fillStyle(0x6b4a1a, 1);
    wb.fillRect(0, 8, 48, 24);
    wb.fillStyle(0x9b7a3a, 1);
    wb.fillRect(0, 0, 48, 10);
    // Outils dessinés
    wb.fillStyle(0x888888, 1);
    wb.fillRect(6, 12, 10, 3);
    wb.fillRect(32, 12, 10, 3);
    wb.fillRect(6, 22, 6, 3);
    wb.fillStyle(0xaaaa44, 1);
    wb.fillRect(20, 14, 8, 10);
    // Pieds
    wb.fillStyle(0x4a3010, 1);
    wb.fillRect(4,  30, 6, 2);
    wb.fillRect(38, 30, 6, 2);
    wb.generateTexture('obj_workbench', 48, 32);
    wb.destroy();

    // Borne boutique (32×44)
    const shop = this.make.graphics({ add: false });
    shop.fillStyle(0x1a2a4a, 1);
    shop.fillRect(0, 0, 32, 44);
    // Écran
    shop.fillStyle(0x2244aa, 0.9);
    shop.fillRect(4, 4, 24, 20);
    shop.fillStyle(0x44aaff, 0.5);
    shop.fillRect(5, 5, 22, 18);
    // Clavier
    shop.fillStyle(0x333333, 1);
    shop.fillRect(4, 28, 24, 10);
    for (let i = 0; i < 6; i++) {
      shop.fillStyle(0x555555, 1);
      shop.fillRect(6 + i * 4, 30, 3, 3);
      shop.fillRect(6 + i * 4, 34, 3, 3);
    }
    // Logo €
    shop.fillStyle(0xffdd00, 1);
    shop.fillRect(13, 8, 6, 2);
    shop.fillRect(10, 12, 8, 2);
    shop.fillRect(13, 16, 6, 2);
    shop.generateTexture('obj_shop', 32, 44);
    shop.destroy();

    // Étal de vente (52×28)
    const stall = this.make.graphics({ add: false });
    stall.fillStyle(0xaa7722, 1);
    stall.fillRect(0, 12, 52, 16);
    // Toit de l'étal
    stall.fillStyle(0xcc3333, 1);
    stall.fillRect(0, 0, 52, 10);
    // Bandes blanches
    stall.fillStyle(0xffffff, 0.5);
    stall.fillRect(0, 2, 8, 6);
    stall.fillRect(16, 2, 8, 6);
    stall.fillRect(32, 2, 8, 6);
    stall.fillRect(48, 2, 4, 6);
    // Marchandises
    stall.fillStyle(0x44aa44, 0.8);
    stall.fillCircle(12, 18, 4);
    stall.fillStyle(0xcc3333, 0.8);
    stall.fillCircle(26, 18, 4);
    stall.fillStyle(0xeecc22, 0.8);
    stall.fillCircle(40, 18, 4);
    stall.generateTexture('obj_stall', 52, 28);
    stall.destroy();
  }

  // ── Zombies ───────────────────────────────────────────────────────────────

  /**
   * Génère 6 frames pour un type de zombie (4 marche + 2 attaque).
   * @param {string} pfx       - 'zn' | 'zf' | 'zt'
   * @param {number} bodyColor - couleur principale du corps
   * @param {number} darkColor - couleur ombre / détails
   * @param {number} eyeColor  - couleur yeux
   */
  _createZombieFrames(pfx, bodyColor, darkColor, eyeColor) {
    // 4 frames de marche (jambes alternées)
    const walkLegs = [
      { ll: { x: -4, y: -3 }, rl: { x: 3, y: 3 } },
      { ll: { x:  0, y:  0 }, rl: { x: 0, y: 0 } },
      { ll: { x:  4, y:  3 }, rl: { x:-3, y:-3 } },
      { ll: { x:  0, y:  0 }, rl: { x: 0, y: 0 } },
    ];
    walkLegs.forEach((leg, i) =>
      this._drawZombieFrame(`${pfx}_walk_${i}`, bodyColor, darkColor, eyeColor, leg.ll, leg.rl, false)
    );

    // 2 frames d'attaque (bras levés)
    this._drawZombieFrame(`${pfx}_atk_0`, bodyColor, darkColor, eyeColor, { x: 0, y: 0 }, { x: 0, y: 0 }, true);
    this._drawZombieFrame(`${pfx}_atk_1`, bodyColor, darkColor, eyeColor, { x:-2, y: 1 }, { x: 2, y: 1 }, true);
  }

  _drawZombieFrame(key, bodyColor, darkColor, eyeColor, ll, rl, attacking) {
    const gfx = this.make.graphics({ add: false });
    const cx  = 20; // centre X (sprite 40×48)

    // Ombre
    gfx.fillStyle(0x000000, 0.2);
    gfx.fillEllipse(cx, 46, 28, 8);

    // Jambes
    gfx.fillStyle(0x2a2a2a, 1);
    gfx.fillEllipse(cx - 7 + ll.x, 37 + ll.y, 10, 13);
    gfx.fillEllipse(cx + 7 + rl.x, 37 + rl.y, 10, 13);

    // Corps
    gfx.fillStyle(bodyColor, 1);
    gfx.fillRoundedRect(cx - 11, 20, 22, 18, 4);

    // Ombre corps
    gfx.fillStyle(darkColor, 0.5);
    gfx.fillRoundedRect(cx + 4, 21, 7, 16, 3);

    if (attacking) {
      // Bras levés
      gfx.fillStyle(0xb8a080, 1);
      gfx.fillEllipse(cx - 14, 20, 9, 14);
      gfx.fillEllipse(cx + 14, 20, 9, 14);
    } else {
      // Bras pendants
      gfx.fillStyle(0xb8a080, 1);
      gfx.fillEllipse(cx - 13, 27, 8, 14);
      gfx.fillEllipse(cx + 13, 27, 8, 14);
    }

    // Tête (peau verdâtre)
    gfx.fillStyle(0xa8b878, 1);
    gfx.fillCircle(cx, 13, 11);

    // Cheveux hirsutes
    gfx.fillStyle(darkColor, 1);
    gfx.fillRect(cx - 10, 5, 20, 6);
    gfx.fillRect(cx - 11, 6, 4, 4);
    gfx.fillRect(cx + 7, 6, 4, 4);

    // Yeux (lueur)
    gfx.fillStyle(eyeColor, 1);
    gfx.fillCircle(cx - 4, 12, 3);
    gfx.fillCircle(cx + 4, 12, 3);
    gfx.fillStyle(0xffffff, 0.6);
    gfx.fillCircle(cx - 3, 11, 1.2);
    gfx.fillCircle(cx + 5, 11, 1.2);

    // Bouche (dents)
    gfx.fillStyle(0x222222, 0.8);
    gfx.fillRect(cx - 4, 17, 8, 3);
    gfx.fillStyle(0xffffff, 0.9);
    gfx.fillRect(cx - 3, 17, 2, 2);
    gfx.fillRect(cx,     17, 2, 2);

    gfx.generateTexture(key, 40, 48);
    gfx.destroy();
  }

  // ── Viande ────────────────────────────────────────────────────────────────

  _createMeatTextures() {
    // Sprite monde (ramassable)
    const wg = this.make.graphics({ add: false });
    wg.fillStyle(0x000000, 0.18);
    wg.fillEllipse(14, 17, 24, 7);
    // Morceau de viande
    wg.fillStyle(0xcc3333, 1);
    wg.fillEllipse(14, 12, 22, 16);
    wg.fillStyle(0xff6655, 0.6);
    wg.fillEllipse(10, 10, 10, 7);
    wg.fillStyle(0x882222, 0.5);
    wg.fillEllipse(18, 14, 8, 5);
    // Reflet
    wg.fillStyle(0xff9999, 0.35);
    wg.fillEllipse(9, 8, 7, 4);
    wg.generateTexture('meat_world', 28, 20);
    wg.destroy();

    // Icône inventaire (24×24)
    const ig = this.make.graphics({ add: false });
    ig.fillStyle(0xcc3333, 1);
    ig.fillEllipse(12, 12, 18, 14);
    ig.fillStyle(0xff6655, 0.6);
    ig.fillEllipse(9, 9, 8, 6);
    ig.fillStyle(0xff9999, 0.35);
    ig.fillEllipse(8, 8, 5, 3);
    ig.generateTexture('icon_meat', 24, 24);
    ig.destroy();
  }
}
