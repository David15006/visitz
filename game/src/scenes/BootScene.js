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

    // Nourriture
    this._createFoodTextures();

    // Nouvelles armes
    this._createWeaponTextures();

    // Survivant PNJ
    this._createSurvivorTexture();

    // Boss spécial + clé des égouts
    this._createBossFrames();
    this._createSewerKeyTextures();

    // Donjon : rats, infectés, objets interactifs
    this._createRatFrames();
    this._createZombieInfectedFrames();
    this._createDungeonObjectTextures();

    // Boss : Roi des Rats + Clé Finale
    this._createRatKingFrames();
    this._createFinalKeyTextures();

    // Boss final : L'Obscur
    this._createFinalBossFrames();

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

  // ── Nourriture ────────────────────────────────────────────────────────────

  _createFoodTextures() {
    // Steak (24×24) : viande grillée
    const steak = this.make.graphics({ add: false });
    steak.fillStyle(0x7a2200, 1);
    steak.fillEllipse(12, 13, 20, 16);
    steak.fillStyle(0xaa3300, 0.6);
    steak.fillEllipse(10, 11, 12, 8);
    steak.fillStyle(0xcc5522, 0.4);
    steak.fillEllipse(8, 9, 7, 5);
    steak.fillStyle(0x553311, 0.5);
    steak.fillRect(6, 18, 12, 3);
    steak.generateTexture('icon_steak', 24, 24);
    steak.destroy();

    // Soupe (24×24) : bol avec vapeur
    const soupe = this.make.graphics({ add: false });
    soupe.fillStyle(0x885533, 1);
    soupe.fillEllipse(12, 17, 20, 10);
    soupe.fillStyle(0x6b3d22, 1);
    soupe.fillRect(2, 17, 20, 5);
    soupe.fillStyle(0xcc7744, 0.8);
    soupe.fillEllipse(12, 16, 18, 8);
    soupe.fillStyle(0xddaaaa, 0.4);
    soupe.fillEllipse(12, 15, 10, 4);
    // Vapeur
    soupe.lineStyle(1, 0xaaaaaa, 0.5);
    soupe.lineBetween(8, 9, 9, 4);
    soupe.lineBetween(12, 8, 12, 3);
    soupe.lineBetween(16, 9, 15, 4);
    soupe.generateTexture('icon_soupe', 24, 24);
    soupe.destroy();

    // Brochettes (24×24) : bâton avec morceaux de viande
    const broch = this.make.graphics({ add: false });
    broch.lineStyle(2, 0x7a5a2a, 1);
    broch.lineBetween(3, 21, 21, 3);
    broch.fillStyle(0xcc3333, 1);
    broch.fillCircle(7, 17, 3);
    broch.fillCircle(12, 12, 3);
    broch.fillCircle(17, 7, 3);
    broch.fillStyle(0xff6655, 0.5);
    broch.fillCircle(6, 16, 1.5);
    broch.fillCircle(11, 11, 1.5);
    broch.generateTexture('icon_brochette', 24, 24);
    broch.destroy();

    // Tarte de viande (24×24)
    const tarte = this.make.graphics({ add: false });
    tarte.fillStyle(0xcc9944, 1);
    tarte.fillEllipse(12, 16, 22, 14);
    tarte.fillStyle(0xddbb66, 1);
    tarte.fillEllipse(12, 13, 20, 8);
    tarte.fillStyle(0xaa3322, 0.7);
    tarte.fillEllipse(12, 12, 14, 6);
    // Croûte
    tarte.fillStyle(0xcc9944, 1);
    tarte.fillRect(2, 14, 20, 4);
    tarte.lineStyle(1, 0xee8833, 0.6);
    tarte.lineBetween(4, 12, 20, 12);
    tarte.generateTexture('icon_tarte', 24, 24);
    tarte.destroy();
  }

  // ── Nouvelles armes ───────────────────────────────────────────────────────

  _createWeaponTextures() {
    // Lance / Spear (24×24)
    const lance = this.make.graphics({ add: false });
    lance.lineStyle(2, 0x8b6914, 1);
    lance.lineBetween(3, 21, 17, 7);
    lance.fillStyle(0xcccccc, 1);
    lance.fillPoints([
      { x: 17, y: 7 }, { x: 22, y: 2 }, { x: 21, y: 8 },
    ], true);
    lance.fillStyle(0x8b6914, 1);
    lance.fillRect(2, 19, 5, 3);
    lance.generateTexture('icon_lance', 24, 24);
    lance.destroy();

    // Pistolet (24×24)
    const pistol = this.make.graphics({ add: false });
    pistol.fillStyle(0x444444, 1);
    pistol.fillRect(4, 8, 14, 8);
    pistol.fillRect(16, 7, 5, 5);  // canon
    pistol.fillRect(9, 14, 6, 7);  // crosse
    pistol.fillStyle(0x666666, 1);
    pistol.fillRect(5, 9, 4, 4);   // reflet
    pistol.fillStyle(0x222222, 1);
    pistol.fillRect(10, 15, 2, 5); // détente
    pistol.generateTexture('icon_pistol', 24, 24);
    pistol.destroy();

    // Fusil à pompe (24×24)
    const shotgun = this.make.graphics({ add: false });
    shotgun.fillStyle(0x7a5a2a, 1);
    shotgun.fillRect(2, 11, 20, 5);  // fût
    shotgun.fillStyle(0x444444, 1);
    shotgun.fillRect(2, 10, 20, 3);  // canons
    shotgun.fillRect(2, 13, 20, 3);
    shotgun.fillStyle(0x7a5a2a, 1);
    shotgun.fillRect(15, 14, 5, 7);  // crosse
    shotgun.fillStyle(0x555555, 1);
    shotgun.fillRect(20, 10, 3, 6);  // bouche
    shotgun.generateTexture('icon_shotgun', 24, 24);
    shotgun.destroy();

    // Fusil d'assaut (24×24)
    const ar = this.make.graphics({ add: false });
    ar.fillStyle(0x333333, 1);
    ar.fillRect(2, 10, 22, 5);
    ar.fillRect(16, 14, 5, 7);  // crosse
    ar.fillStyle(0x555555, 1);
    ar.fillRect(2, 9, 22, 3);   // canon
    ar.fillRect(9, 14, 4, 5);   // chargeur
    ar.fillStyle(0x222222, 1);
    ar.fillRect(5, 13, 3, 3);   // poignée
    ar.generateTexture('icon_ar', 24, 24);
    ar.destroy();

    // Lance-flammes (24×24)
    const ft = this.make.graphics({ add: false });
    ft.fillStyle(0x555555, 1);
    ft.fillRect(2, 10, 16, 6);   // corps
    ft.fillRect(6, 14, 5, 8);    // réservoir
    ft.fillStyle(0x777777, 1);
    ft.fillRect(16, 11, 7, 3);   // lance-flamme
    // Flamme
    ft.fillStyle(0xff4400, 0.9);
    ft.fillEllipse(21, 12, 8, 7);
    ft.fillStyle(0xff8800, 0.7);
    ft.fillEllipse(22, 12, 5, 5);
    ft.fillStyle(0xffcc00, 0.5);
    ft.fillEllipse(23, 12, 3, 3);
    ft.generateTexture('icon_flamethrower', 24, 24);
    ft.destroy();
  }

  // ── Survivant PNJ ─────────────────────────────────────────────────────────

  _createSurvivorTexture() {
    const gfx = this.make.graphics({ add: false });
    const cx  = 20;

    // Ombre
    gfx.fillStyle(0x000000, 0.2);
    gfx.fillEllipse(cx, 46, 26, 8);

    // Jambes
    gfx.fillStyle(0x4a4a6a, 1);
    gfx.fillEllipse(cx - 6, 37, 10, 13);
    gfx.fillEllipse(cx + 6, 37, 10, 13);

    // Corps (chemise orange)
    gfx.fillStyle(0xdd6611, 1);
    gfx.fillRoundedRect(cx - 10, 20, 20, 18, 4);
    gfx.fillStyle(0xaa4400, 0.5);
    gfx.fillRoundedRect(cx + 4, 21, 6, 16, 3);

    // Bras
    gfx.fillStyle(0xf5c397, 1);
    gfx.fillEllipse(cx - 12, 27, 8, 14);
    gfx.fillEllipse(cx + 12, 27, 8, 14);

    // Tête
    gfx.fillStyle(0xf5c397, 1);
    gfx.fillCircle(cx, 13, 11);

    // Cheveux
    gfx.fillStyle(0x5a3a1a, 1);
    gfx.fillRect(cx - 10, 5, 20, 7);

    // Yeux
    gfx.fillStyle(0x1a1a1a, 1);
    gfx.fillCircle(cx - 4, 12, 2);
    gfx.fillCircle(cx + 4, 12, 2);
    gfx.fillStyle(0xffffff, 0.7);
    gfx.fillCircle(cx - 3, 11, 1);
    gfx.fillCircle(cx + 5, 11, 1);

    // Sourire
    gfx.lineStyle(1, 0x995533, 0.8);
    gfx.lineBetween(cx - 3, 17, cx + 3, 17);

    gfx.generateTexture('survivor', 40, 48);
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

  // ── Boss spécial ───────────────────────────────────────────────────────────

  /**
   * Génère les frames du boss : corps massif violet/pourpre, yeux rouges,
   * piques d'os sur les épaules, posture courbée intimidante.
   * Taille 40×48 (même que zombies), scalée 1.5× en jeu.
   */
  _createBossFrames() {
    const walkLegs = [
      { ll: { x: -5, y: -4 }, rl: { x:  4, y:  4 } },
      { ll: { x:  0, y:  0 }, rl: { x:  0, y:  0 } },
      { ll: { x:  5, y:  4 }, rl: { x: -4, y: -4 } },
      { ll: { x:  0, y:  0 }, rl: { x:  0, y:  0 } },
    ];
    walkLegs.forEach((leg, i) =>
      this._drawBossFrame(`boss_walk_${i}`, leg.ll, leg.rl, false)
    );
    this._drawBossFrame('boss_atk_0', { x: 0, y: 0 }, { x: 0, y: 0 }, true);
    this._drawBossFrame('boss_atk_1', { x:-2, y: 1 }, { x: 2, y: 1 }, true);
  }

  _drawBossFrame(key, ll, rl, attacking) {
    const gfx = this.make.graphics({ add: false });
    const cx  = 20;

    // Ombre élargie (boss est grand)
    gfx.fillStyle(0x000000, 0.3);
    gfx.fillEllipse(cx, 46, 36, 10);

    // Jambes (sombres, massives)
    gfx.fillStyle(0x1a0028, 1);
    gfx.fillEllipse(cx - 8 + ll.x, 37 + ll.y, 13, 15);
    gfx.fillEllipse(cx + 8 + rl.x, 37 + rl.y, 13, 15);
    // Reflet jambes
    gfx.fillStyle(0x330044, 0.5);
    gfx.fillEllipse(cx - 7 + ll.x, 33 + ll.y, 7, 6);
    gfx.fillEllipse(cx + 9 + rl.x, 33 + rl.y, 7, 6);

    // Corps (violet foncé, large)
    gfx.fillStyle(0x3a0055, 1);
    gfx.fillRoundedRect(cx - 13, 18, 26, 20, 5);
    // Ombre corps
    gfx.fillStyle(0x1a0030, 0.6);
    gfx.fillRoundedRect(cx + 5, 19, 8, 18, 3);
    // Reflet corps
    gfx.fillStyle(0x660088, 0.3);
    gfx.fillRoundedRect(cx - 12, 20, 8, 10, 3);

    // Piques osseux sur les épaules
    gfx.fillStyle(0xd4c89a, 1);
    if (attacking) {
      // Épaules hautes
      gfx.fillPoints([
        { x: cx - 14, y: 16 }, { x: cx - 18, y:  8 }, { x: cx - 10, y: 14 },
      ], true);
      gfx.fillPoints([
        { x: cx + 14, y: 16 }, { x: cx + 18, y:  8 }, { x: cx + 10, y: 14 },
      ], true);
    } else {
      gfx.fillPoints([
        { x: cx - 13, y: 18 }, { x: cx - 17, y: 11 }, { x: cx - 9, y: 17 },
      ], true);
      gfx.fillPoints([
        { x: cx + 13, y: 18 }, { x: cx + 17, y: 11 }, { x: cx + 9, y: 17 },
      ], true);
    }

    // Bras (massifs)
    gfx.fillStyle(0x8b60a0, 1);
    if (attacking) {
      gfx.fillEllipse(cx - 16, 18, 11, 16);
      gfx.fillEllipse(cx + 16, 18, 11, 16);
      // Griffes
      gfx.fillStyle(0xd4c89a, 1);
      gfx.fillPoints([
        { x: cx - 20, y: 10 }, { x: cx - 22, y: 5 }, { x: cx - 17, y: 9 },
      ], true);
      gfx.fillPoints([
        { x: cx + 20, y: 10 }, { x: cx + 22, y: 5 }, { x: cx + 17, y: 9 },
      ], true);
    } else {
      gfx.fillEllipse(cx - 15, 26, 10, 16);
      gfx.fillEllipse(cx + 15, 26, 10, 16);
    }

    // Tête (grande, ronde, sombre)
    gfx.fillStyle(0x4a006a, 1);
    gfx.fillCircle(cx, 12, 13);
    // Ombre tête
    gfx.fillStyle(0x220033, 0.55);
    gfx.fillCircle(cx + 3, 14, 9);

    // Cornes (piques osseux sur la tête)
    gfx.fillStyle(0xd4c89a, 1);
    gfx.fillPoints([
      { x: cx - 8, y: 4 }, { x: cx - 11, y: -4 }, { x: cx - 5, y: 3 },
    ], true);
    gfx.fillPoints([
      { x: cx + 8, y: 4 }, { x: cx + 11, y: -4 }, { x: cx + 5, y: 3 },
    ], true);

    // Yeux rouges luisants (grands)
    gfx.fillStyle(0xff0000, 1);
    gfx.fillCircle(cx - 5, 11, 4);
    gfx.fillCircle(cx + 5, 11, 4);
    // Centre des yeux
    gfx.fillStyle(0xff6600, 1);
    gfx.fillCircle(cx - 5, 11, 2.5);
    gfx.fillCircle(cx + 5, 11, 2.5);
    // Reflet yeux
    gfx.fillStyle(0xffcc00, 0.8);
    gfx.fillCircle(cx - 4, 10, 1.2);
    gfx.fillCircle(cx + 6, 10, 1.2);

    // Bouche (cicatrice / dents)
    gfx.fillStyle(0x110011, 0.9);
    gfx.fillRect(cx - 5, 17, 10, 3);
    gfx.fillStyle(0xeeddcc, 0.9);
    for (let t = 0; t < 4; t++) {
      gfx.fillRect(cx - 4 + t * 3, 17, 2, 2);
    }

    gfx.generateTexture(key, 40, 48);
    gfx.destroy();
  }

  // ── Clé des Égouts ─────────────────────────────────────────────────────────

  _createSewerKeyTextures() {
    // Sprite monde : clé rouillée avec aura violette (32×20)
    const wg = this.make.graphics({ add: false });

    // Aura
    wg.lineStyle(2, 0xaa00ff, 0.5);
    wg.strokeEllipse(16, 10, 32, 18);

    // Corps de la clé
    wg.fillStyle(0x8b6914, 1);
    wg.fillCircle(8, 10, 7);    // tête
    wg.fillStyle(0x5c4510, 1);
    wg.fillCircle(8, 10, 4);    // trou de la tête

    // Tige
    wg.fillStyle(0x8b6914, 1);
    wg.fillRect(13, 8, 16, 4);

    // Dents
    wg.fillRect(22, 12, 3, 4);
    wg.fillRect(27, 12, 3, 6);

    // Reflet métal
    wg.fillStyle(0xccaa44, 0.5);
    wg.fillRect(14, 8, 14, 2);
    wg.fillCircle(7, 9, 3);

    // Oxydation verte
    wg.fillStyle(0x226633, 0.4);
    wg.fillCircle(10, 11, 3);
    wg.fillRect(18, 9, 4, 2);

    wg.generateTexture('sewer_key_world', 32, 20);
    wg.destroy();

    // Icône inventaire (24×24)
    const ig = this.make.graphics({ add: false });

    // Fond transparent
    ig.fillStyle(0x000000, 0);
    ig.fillRect(0, 0, 24, 24);

    // Tête de clé
    ig.fillStyle(0x9b7720, 1);
    ig.fillCircle(7, 12, 6);
    ig.fillStyle(0x333333, 1);
    ig.fillCircle(7, 12, 3);

    // Tige
    ig.fillStyle(0x9b7720, 1);
    ig.fillRect(12, 10, 11, 4);

    // Dents
    ig.fillRect(17, 14, 2, 4);
    ig.fillRect(21, 14, 2, 5);

    // Reflet
    ig.fillStyle(0xddcc66, 0.6);
    ig.fillRect(13, 10, 8, 2);
    ig.fillCircle(6, 11, 2);

    // Aura violette
    ig.lineStyle(1, 0xcc00ff, 0.7);
    ig.strokeCircle(7, 12, 8);

    ig.generateTexture('icon_sewer_key', 24, 24);
    ig.destroy();
  }

  // ── Rat ────────────────────────────────────────────────────────────────────

  _createRatFrames() {
    for (let f = 0; f < 4; f++) {
      const g = this.make.graphics({ add: false });
      // Corps brun-gris (24×18)
      g.fillStyle(0x6a5a3a, 1);
      g.fillEllipse(12, 11, 18, 10);

      // Tête
      g.fillStyle(0x7a6a48, 1);
      g.fillEllipse(19, 9, 10, 8);

      // Yeux rouges
      g.fillStyle(0xff2200, 1);
      g.fillCircle(21, 8, 1.5);

      // Oreilles
      g.fillStyle(0xaa7755, 1);
      g.fillCircle(20, 5, 2);
      g.fillCircle(17, 4, 2);

      // Queue sinusoïdale selon frame
      g.lineStyle(2, 0x554433, 1);
      const qOff = Math.sin((f / 4) * Math.PI * 2) * 3;
      g.lineBetween(3, 12, 0, 12 + qOff);

      // Pattes animées
      const legX = [7, 10, 14, 17];
      legX.forEach((lx, i) => {
        const ly = (i + f) % 2 === 0 ? 16 : 18;
        g.fillStyle(0x554433, 1);
        g.fillRect(lx, 14, 2, ly - 14);
      });

      g.generateTexture(`rat_walk_${f}`, 24, 20);
      g.destroy();
    }

    // Frames d'attaque (2)
    for (let f = 0; f < 2; f++) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x8a7048, 1);
      g.fillEllipse(12, 10, 18, 10);
      g.fillStyle(0x9a8060, 1);
      g.fillEllipse(20, 8, 10, 8);

      // Gueule ouverte
      g.fillStyle(0xcc1100, 1);
      g.fillRect(22, 9, 4, 3);
      g.fillStyle(0xffffff, 1);
      g.fillRect(22, 9, 2, 1);

      g.fillStyle(0xff2200, 1);
      g.fillCircle(21, 7, 1.5);

      g.generateTexture(`rat_atk_${f}`, 24, 20);
      g.destroy();
    }
  }

  // ── Zombie Infecté ─────────────────────────────────────────────────────────

  _createZombieInfectedFrames() {
    for (let f = 0; f < 4; f++) {
      const g  = this.make.graphics({ add: false });
      const cx = 16;

      // Corps vert-gris malade (32×40)
      g.fillStyle(0x3a6a3a, 1);
      g.fillRect(cx - 8, 14, 16, 20);

      // Tête
      g.fillStyle(0x4a7a4a, 1);
      g.fillRect(cx - 6, 2, 12, 12);

      // Veines toxiques
      g.lineStyle(1, 0x00ff44, 0.6);
      g.lineBetween(cx - 4, 6, cx - 2, 10);
      g.lineBetween(cx + 2, 4, cx + 4, 9);
      g.lineBetween(cx - 6, 20, cx - 2, 26);
      g.lineBetween(cx + 2, 18, cx + 6, 24);

      // Yeux vert-jaune
      g.fillStyle(0xaaff00, 1);
      g.fillCircle(cx - 3, 7, 2);
      g.fillCircle(cx + 3, 7, 2);

      // Lèvres verdâtres
      g.fillStyle(0x22cc44, 1);
      g.fillRect(cx - 3, 12, 6, 2);

      // Jambes
      const legOff = (f % 2 === 0) ? 3 : 0;
      g.fillStyle(0x2a5a2a, 1);
      g.fillRect(cx - 8, 34, 5, 6 + legOff);
      g.fillRect(cx + 3, 34, 5, 6 - legOff + 3);

      // Bras
      g.fillStyle(0x3a6a3a, 1);
      const armOff = Math.sin((f / 4) * Math.PI * 2) * 4;
      g.fillRect(cx - 14, 16 + armOff, 6, 14);
      g.fillRect(cx + 8,  16 - armOff, 6, 14);

      // Bulle toxique sur épaule
      g.fillStyle(0x00ff66, 0.4);
      g.fillCircle(cx + 10, 14, 4);

      g.generateTexture(`zi_walk_${f}`, 32, 48);
      g.destroy();
    }

    // Frames d'attaque (2)
    for (let f = 0; f < 2; f++) {
      const g  = this.make.graphics({ add: false });
      const cx = 16;

      g.fillStyle(0x3a6a3a, 1);
      g.fillRect(cx - 8, 14, 16, 20);
      g.fillStyle(0x4a7a4a, 1);
      g.fillRect(cx - 6, 2, 12, 12);

      g.lineStyle(1, 0x00ff44, 0.7);
      g.lineBetween(cx - 4, 5, cx + 4, 8);
      g.lineBetween(cx - 5, 18, cx + 5, 28);

      g.fillStyle(0x88ff00, 1);
      g.fillCircle(cx - 3, 7, 2);
      g.fillCircle(cx + 3, 7, 2);

      // Bras avancé en attaque
      const fwd = f === 0 ? -6 : -2;
      g.fillStyle(0x2a5a2a, 1);
      g.fillRect(cx - 20, 14 + fwd, 12, 5);
      g.fillRect(cx + 8,  14,       12, 5);

      // Crachat toxique
      if (f === 0) {
        g.fillStyle(0x00ff44, 0.8);
        g.fillCircle(cx - 22, 13, 4);
      }

      g.generateTexture(`zi_atk_${f}`, 32, 48);
      g.destroy();
    }
  }

  // ── Objets du Donjon ───────────────────────────────────────────────────────

  _createDungeonObjectTextures() {
    // ─ Piège (désarmé) : plaque grise
    const tOff = this.make.graphics({ add: false });
    tOff.fillStyle(0x555566, 1);
    tOff.fillRect(0, 0, 28, 28);
    tOff.lineStyle(2, 0x8888aa, 0.8);
    tOff.strokeRect(1, 1, 26, 26);
    tOff.lineStyle(1, 0x7777aa, 0.5);
    tOff.lineBetween(4, 14, 24, 14);
    tOff.lineBetween(14, 4, 14, 24);
    tOff.generateTexture('trap_off', 28, 28);
    tOff.destroy();

    // ─ Piège (armé) : piques rouges
    const tOn = this.make.graphics({ add: false });
    tOn.fillStyle(0x442222, 1);
    tOn.fillRect(0, 0, 28, 28);
    tOn.fillStyle(0xcc1100, 1);
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        tOn.fillTriangle(
          4 + i * 5, 28,
          6 + i * 5, 8 + j * 2,
          8 + i * 5, 28
        );
      }
    }
    tOn.lineStyle(1, 0xff2200, 0.7);
    tOn.strokeRect(0, 0, 28, 28);
    tOn.generateTexture('trap_on', 28, 28);
    tOn.destroy();

    // ─ Levier (relevé)
    const lUp = this.make.graphics({ add: false });
    // Socle
    lUp.fillStyle(0x665544, 1);
    lUp.fillRect(6, 18, 12, 6);
    lUp.lineStyle(1, 0x998866, 0.8);
    lUp.strokeRect(6, 18, 12, 6);
    // Bras du levier (vertical)
    lUp.fillStyle(0x997755, 1);
    lUp.fillRect(11, 4, 4, 16);
    lUp.fillStyle(0xffcc44, 1);
    lUp.fillCircle(13, 4, 4);
    lUp.generateTexture('lever_up', 26, 26);
    lUp.destroy();

    // ─ Levier (abaissé)
    const lDn = this.make.graphics({ add: false });
    lDn.fillStyle(0x665544, 1);
    lDn.fillRect(6, 18, 12, 6);
    lDn.lineStyle(1, 0x998866, 0.8);
    lDn.strokeRect(6, 18, 12, 6);
    // Bras incliné vers la droite
    lDn.fillStyle(0x997755, 1);
    lDn.fillRect(12, 10, 4, 10);
    lDn.fillRect(14, 6, 10, 4);
    lDn.fillStyle(0xffcc44, 1);
    lDn.fillCircle(22, 7, 4);
    lDn.generateTexture('lever_down', 26, 26);
    lDn.destroy();

    // ─ Porte de donjon (horizontal, 40×12)
    const dh = this.make.graphics({ add: false });
    dh.fillStyle(0x553311, 1);
    dh.fillRect(0, 0, 40, 12);
    dh.lineStyle(2, 0x8855aa, 0.9);
    dh.strokeRect(0, 0, 40, 12);
    dh.fillStyle(0x885500, 0.5);
    dh.fillRect(4, 3, 14, 6);
    dh.fillRect(22, 3, 14, 6);
    // Rune
    dh.lineStyle(1, 0xcc00ff, 0.7);
    dh.lineBetween(18, 1, 22, 11);
    dh.generateTexture('dungeon_door_h', 40, 12);
    dh.destroy();

    // ─ Torche (16×24)
    const torch = this.make.graphics({ add: false });
    // Manche
    torch.fillStyle(0x663311, 1);
    torch.fillRect(6, 10, 4, 14);
    // Flamme
    torch.fillStyle(0xff8800, 1);
    torch.fillEllipse(8, 8, 10, 14);
    torch.fillStyle(0xffdd00, 0.8);
    torch.fillEllipse(8, 10, 6, 8);
    torch.fillStyle(0xffffff, 0.4);
    torch.fillEllipse(8, 12, 3, 4);
    torch.generateTexture('torch', 16, 24);
    torch.destroy();

    // ─ Grille d'égout (entrée donjon, 32×32)
    const grate = this.make.graphics({ add: false });
    grate.fillStyle(0x222233, 1);
    grate.fillRect(0, 0, 32, 32);
    grate.lineStyle(2, 0x444466, 0.9);
    for (let i = 0; i <= 32; i += 8) {
      grate.lineBetween(i, 0, i, 32);
      grate.lineBetween(0, i, 32, i);
    }
    grate.lineStyle(2, 0x6655aa, 0.6);
    grate.strokeRect(0, 0, 32, 32);
    grate.generateTexture('sewer_grate', 32, 32);
    grate.destroy();
  }

  // ── Roi des Rats ──────────────────────────────────────────────────────────

  _createRatKingFrames() {
    // Grande créature ratesque couronnée (48×56)
    for (let f = 0; f < 4; f++) {
      const g  = this.make.graphics({ add: false });
      const cx = 24;

      // Corps brun-gris massif
      g.fillStyle(0x5a4a2e, 1);
      g.fillEllipse(cx, 32, 36, 28);

      // Fourrure sombre
      g.fillStyle(0x3a2a18, 1);
      g.fillEllipse(cx - 12, 32, 12, 18);
      g.fillEllipse(cx + 12, 32, 12, 18);

      // Tête large
      g.fillStyle(0x6a5a38, 1);
      g.fillEllipse(cx, 16, 28, 22);

      // Oreilles pointues
      g.fillStyle(0x4a3a22, 1);
      g.fillTriangle(cx - 12, 12, cx - 18, 0, cx - 6, 6);
      g.fillTriangle(cx + 12, 12, cx + 18, 0, cx + 6, 6);

      // Yeux rouges brillants
      g.fillStyle(0xff1100, 1);
      g.fillCircle(cx - 5, 14, 3);
      g.fillCircle(cx + 5, 14, 3);
      g.fillStyle(0xff6600, 0.6);
      g.fillCircle(cx - 5, 14, 1.5);
      g.fillCircle(cx + 5, 14, 1.5);

      // Cicatrices / moustaches
      g.lineStyle(1, 0x2a1a08, 0.8);
      g.lineBetween(cx - 3, 18, cx - 10, 16);
      g.lineBetween(cx + 3, 18, cx + 10, 16);
      g.lineBetween(cx - 3, 20, cx - 10, 19);
      g.lineBetween(cx + 3, 20, cx + 10, 19);

      // Dents
      g.fillStyle(0xeeeecc, 1);
      g.fillRect(cx - 4, 22, 3, 4);
      g.fillRect(cx + 1, 22, 3, 4);

      // Pattes animées
      const legOff = f % 2 === 0 ? 4 : 0;
      g.fillStyle(0x4a3a22, 1);
      g.fillRect(cx - 18, 42, 8, 10 + legOff);
      g.fillRect(cx + 10, 42, 8, 10 - legOff + 4);

      // Bras lourds
      const armOff = Math.sin((f / 4) * Math.PI * 2) * 5;
      g.fillStyle(0x5a4a2e, 1);
      g.fillRect(cx - 24, 22 + armOff, 8, 18);
      g.fillRect(cx + 16, 22 - armOff, 8, 18);

      // Griffes
      g.fillStyle(0x222222, 1);
      g.fillRect(cx - 26, 39 + armOff, 4, 3);
      g.fillRect(cx + 22, 39 - armOff, 4, 3);

      // Queue épaisse
      g.lineStyle(4, 0x3a2a18, 1);
      const qOff = Math.sin((f / 4) * Math.PI * 2) * 6;
      g.lineBetween(cx - 18, 40, cx - 28, 50 + qOff);

      g.generateTexture(`rk_walk_${f}`, 48, 56);
      g.destroy();
    }

    // Frames d'attaque
    for (let f = 0; f < 2; f++) {
      const g  = this.make.graphics({ add: false });
      const cx = 24;

      g.fillStyle(0x6a4a28, 1);
      g.fillEllipse(cx, 32, 36, 28);
      g.fillStyle(0x4a3018, 1);
      g.fillEllipse(cx - 12, 32, 12, 18);
      g.fillEllipse(cx + 12, 32, 12, 18);

      g.fillStyle(0x7a5a38, 1);
      g.fillEllipse(cx, 15, 28, 22);

      g.fillStyle(0x4a3020, 1);
      g.fillTriangle(cx - 12, 11, cx - 20, -2, cx - 5, 5);
      g.fillTriangle(cx + 12, 11, cx + 20, -2, cx + 5, 5);

      // Yeux rouges plus grands (en colère)
      g.fillStyle(0xff0000, 1);
      g.fillCircle(cx - 5, 13, 4);
      g.fillCircle(cx + 5, 13, 4);

      // Gueule ouverte
      g.fillStyle(0xcc0000, 1);
      g.fillRect(cx - 6, 21, 12, 5);
      g.fillStyle(0xffffff, 1);
      g.fillRect(cx - 5, 21, 3, 3);
      g.fillRect(cx + 2, 21, 3, 3);

      // Bras avancés en frappe
      const fwd = f === 0 ? -8 : -3;
      g.fillStyle(0x5a3a18, 1);
      g.fillRect(cx - 32, 20 + fwd, 14, 6);
      g.fillRect(cx + 18, 20,       14, 6);

      g.generateTexture(`rk_atk_${f}`, 48, 56);
      g.destroy();
    }

    // Frames de charge
    for (let f = 0; f < 2; f++) {
      const g  = this.make.graphics({ add: false });
      const cx = 24;

      // Corps incliné (charge)
      g.fillStyle(0x8a2200, 1);   // teinté rouge pour la charge
      g.fillEllipse(cx, 30, 40, 24);

      g.fillStyle(0x5a1800, 1);
      g.fillEllipse(cx, 14, 26, 20);

      g.fillStyle(0xff0000, 1);
      g.fillCircle(cx - 5, 12, 4);
      g.fillCircle(cx + 5, 12, 4);

      g.fillStyle(0x4a3020, 1);
      g.fillTriangle(cx - 11, 9, cx - 19, -3, cx - 4, 4);
      g.fillTriangle(cx + 11, 9, cx + 19, -3, cx + 4, 4);

      // Lignes de vitesse
      g.lineStyle(2, 0xff4400, 0.7);
      for (let i = 0; i < 4; i++) {
        g.lineBetween(cx - 24, 18 + i * 8, cx - 36, 18 + i * 8);
      }

      g.generateTexture(`rk_charge_${f}`, 48, 56);
      g.destroy();
    }

    // Couronne dorée (24×16)
    const crown = this.make.graphics({ add: false });
    crown.fillStyle(0xffcc00, 1);
    // Base
    crown.fillRect(0, 8, 24, 8);
    // Pointes de la couronne
    crown.fillTriangle(2, 8, 6, 0, 10, 8);
    crown.fillTriangle(10, 8, 12, 2, 14, 8);
    crown.fillTriangle(14, 8, 18, 0, 22, 8);
    // Gemmes
    crown.fillStyle(0xff2200, 1);
    crown.fillCircle(6, 5, 2);
    crown.fillStyle(0x00aaff, 1);
    crown.fillCircle(12, 3, 2);
    crown.fillStyle(0xff2200, 1);
    crown.fillCircle(18, 5, 2);
    // Bordure
    crown.lineStyle(1, 0xaa8800, 1);
    crown.strokeRect(0, 8, 24, 8);
    crown.generateTexture('rat_crown', 24, 16);
    crown.destroy();
  }

  // ── Clé Finale ────────────────────────────────────────────────────────────

  _createFinalKeyTextures() {
    // Monde : clé dorée avec aura rayonnante (36×24)
    const wg = this.make.graphics({ add: false });

    // Aura dorée
    wg.fillStyle(0xffdd00, 0.3);
    wg.fillCircle(18, 12, 18);
    wg.fillStyle(0xffee88, 0.15);
    wg.fillCircle(18, 12, 14);

    // Corps de la clé
    wg.fillStyle(0xffcc00, 1);
    wg.fillCircle(10, 10, 7);      // anneau
    wg.fillStyle(0x1a0800, 1);
    wg.fillCircle(10, 10, 4);      // trou anneau
    wg.fillStyle(0xffcc00, 1);
    wg.fillRect(15, 8, 18, 4);    // tige
    wg.fillRect(29, 8, 3, 7);     // dent 1
    wg.fillRect(24, 8, 3, 5);     // dent 2

    // Reflets
    wg.lineStyle(1, 0xffffff, 0.7);
    wg.strokeCircle(10, 9, 5);

    wg.generateTexture('final_key_world', 36, 24);
    wg.destroy();

    // Icône inventaire (24×24)
    const ig = this.make.graphics({ add: false });
    ig.fillStyle(0xffcc00, 1);
    ig.fillCircle(8, 8, 5);
    ig.fillStyle(0x1a0800, 1);
    ig.fillCircle(8, 8, 3);
    ig.fillStyle(0xffcc00, 1);
    ig.fillRect(12, 6, 10, 3);
    ig.fillRect(19, 6, 2, 5);
    ig.fillRect(15, 6, 2, 4);

    ig.lineStyle(1, 0xffee55, 0.8);
    ig.strokeCircle(8, 8, 5);

    ig.generateTexture('icon_final_key', 24, 24);
    ig.destroy();
  }

  // ── Boss final : L'Obscur ─────────────────────────────────────────────────

  _createFinalBossFrames() {
    // 4 frames idle + 2 frames attaque, 64×80px
    const W = 64, H = 80;

    const drawBody = (g, ox, oy, phase) => {
      // Manteau sombre flottant
      g.fillStyle(0x110011, 1);
      g.fillEllipse(ox + 32, oy + 58, 52, 28);

      // Corps principal
      g.fillStyle(0x1a0033, 1);
      g.fillRoundedRect(ox + 16, oy + 20, 32, 44, 6);

      // Armure thorax
      g.fillStyle(0x330066, 1);
      g.fillRoundedRect(ox + 19, oy + 22, 26, 26, 4);

      // Bords armure violets
      g.lineStyle(2, 0x9900ff, 0.9);
      g.strokeRoundedRect(ox + 19, oy + 22, 26, 26, 4);

      // Runes sur l'armure
      g.fillStyle(0xff00ff, 0.7);
      g.fillRect(ox + 24, oy + 28, 4, 2);
      g.fillRect(ox + 30, oy + 28, 4, 2);
      g.fillRect(ox + 27, oy + 25, 2, 7);
      g.fillRect(ox + 36, oy + 28, 4, 2);
      g.fillRect(ox + 38, oy + 25, 2, 7);

      // Tête / masque
      g.fillStyle(0x220044, 1);
      g.fillEllipse(ox + 32, oy + 14, 28, 26);

      // Masque
      g.fillStyle(0x440088, 1);
      g.fillRoundedRect(ox + 21, oy + 5, 22, 20, 4);

      // Yeux (rouge surnaturel)
      const eyeColor = phase === 3 ? 0xff0000 : phase === 2 ? 0xff4400 : 0xff2200;
      g.fillStyle(eyeColor, 1);
      g.fillRect(ox + 24, oy + 10, 6, 4);
      g.fillRect(ox + 34, oy + 10, 6, 4);

      // Cornes
      g.fillStyle(0x550099, 1);
      g.fillTriangle(ox + 23, oy + 6,  ox + 26, oy + 6,  ox + 22, oy - 3);
      g.fillTriangle(ox + 41, oy + 6,  ox + 38, oy + 6,  ox + 42, oy - 3);
    };

    // Frames idle 0-3 (légère oscillation)
    for (let i = 0; i < 4; i++) {
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0);
      g.fillRect(0, 0, W, H);

      const bob = i < 2 ? 0 : 2; // bobbing

      // Aura sombre
      const auraAlpha = 0.15 + i * 0.03;
      g.fillStyle(0x9900ff, auraAlpha);
      g.fillCircle(W / 2, H / 2 + bob, 30);
      g.fillStyle(0x6600cc, auraAlpha * 0.5);
      g.fillCircle(W / 2, H / 2 + bob, 22);

      drawBody(g, 0, bob, 1);

      // Manteau traîne ondulante
      g.fillStyle(0x0a0016, 0.8);
      g.fillEllipse(W / 2, H - 8 + bob, 40 + i * 2, 18 - i);

      g.generateTexture(`fb_idle_${i}`, W, H);
      g.destroy();
    }

    // Frame attaque 0 (bras levés, aura rouge)
    const ga0 = this.add.graphics();
    ga0.fillStyle(0x000000, 0);
    ga0.fillRect(0, 0, W, H);
    ga0.fillStyle(0xff0000, 0.25);
    ga0.fillCircle(W / 2, H / 2, 34);
    drawBody(ga0, 0, -4, 2);
    // Bras levés
    ga0.fillStyle(0x1a0033, 1);
    ga0.fillRoundedRect(4, 14, 14, 32, 4);  // bras gauche levé
    ga0.fillRoundedRect(46, 14, 14, 32, 4); // bras droit levé
    // Énergie dans les mains
    ga0.fillStyle(0xff00ff, 0.9);
    ga0.fillCircle(11, 14, 7);
    ga0.fillCircle(53, 14, 7);
    ga0.generateTexture('fb_atk_0', W, H);
    ga0.destroy();

    // Frame attaque 1 (charge, corps incliné, énergie violette intense)
    const ga1 = this.add.graphics();
    ga1.fillStyle(0x000000, 0);
    ga1.fillRect(0, 0, W, H);
    ga1.fillStyle(0x6600ff, 0.35);
    ga1.fillCircle(W / 2 + 6, H / 2, 36);
    drawBody(ga1, 4, 0, 3); // décalé → incliné
    // Traînée d'énergie
    ga1.fillStyle(0xcc00ff, 0.6);
    ga1.fillTriangle(0, 30, 0, 50, 20, 40);
    ga1.fillStyle(0xff00ff, 0.4);
    ga1.fillTriangle(0, 35, 0, 45, 12, 40);
    ga1.generateTexture('fb_atk_1', W, H);
    ga1.destroy();
  }
}
