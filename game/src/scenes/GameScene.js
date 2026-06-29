/**
 * GameScene.js
 * Scène principale de jeu.
 * Contient : la grande carte avec grille, le joueur, la caméra qui suit,
 * les limites physiques du monde, et le HUD de debug.
 */

import { GameConfig } from '../config/GameConfig.js';
import { Player } from '../entities/Player.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });

    /** @type {Player} */
    this._player = null;
  }

  create() {
    const { MAP_WIDTH, MAP_HEIGHT } = GameConfig;

    // Définir les limites du monde physique (taille de la carte)
    this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    this._buildMap(MAP_WIDTH, MAP_HEIGHT);
    this._buildPlayer(MAP_WIDTH, MAP_HEIGHT);
    this._setupCamera(MAP_WIDTH, MAP_HEIGHT);
    this._buildHUD();
    this._buildReturnKey();

    // Fondu d'entrée
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  /** Dessine la grande carte : fond + grille de tuiles + bordure */
  _buildMap(w, h) {
    // Fond uni
    this.add.rectangle(w / 2, h / 2, w, h, GameConfig.MAP.BG_COLOR);

    // Grille de tuiles via TileSprite (performant, une seule draw call)
    this.add.tileSprite(w / 2, h / 2, w, h, 'tile');

    // Bordure visible de la carte
    const border = this.add.graphics();
    border.lineStyle(4, 0xe94560, 0.8);
    border.strokeRect(2, 2, w - 4, h - 4);

    // Marqueurs de coins pour repère visuel
    const markerColor = 0xffffff;
    const markerSize = 20;
    [
      [0, 0], [w, 0], [0, h], [w, h],
    ].forEach(([mx, my]) => {
      border.fillStyle(markerColor, 0.4);
      border.fillRect(mx - markerSize / 2, my - markerSize / 2, markerSize, markerSize);
    });

    // Centre de la carte (repère visuel)
    const cx = this.add.graphics();
    cx.fillStyle(0xe94560, 0.3);
    cx.fillCircle(w / 2, h / 2, 40);
    cx.lineStyle(2, 0xe94560, 0.6);
    cx.strokeCircle(w / 2, h / 2, 60);
    this.add.text(w / 2, h / 2, 'CENTRE', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#e94560',
    }).setOrigin(0.5);
  }

  /** Crée et place le joueur au centre de la carte */
  _buildPlayer(w, h) {
    this._player = new Player(this, w / 2, h / 2);
  }

  /** Configure la caméra principale pour suivre le joueur dans les limites */
  _setupCamera(mapW, mapH) {
    const cam = this.cameras.main;

    // Limites de défilement = limites de la carte
    cam.setBounds(0, 0, mapW, mapH);

    // Suivi du joueur avec lerp (glissement doux)
    cam.startFollow(this._player, true, 0.1, 0.1);

    // Légère zone morte pour éviter les micro-tremblements
    cam.setDeadzone(60, 40);
  }

  /** HUD fixe (indépendant de la caméra) : coordonnées joueur + aide touches */
  _buildHUD() {
    // Utilise une caméra ignorée par la camera principale pour le HUD
    const hud = this.scene.scene.sys.cameras.main;

    // Texte de coordonnées (mis à jour dans update())
    this._coordText = this.add.text(12, 12, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#aaaacc',
      backgroundColor: '#00000066',
      padding: { x: 6, y: 4 },
    }).setScrollFactor(0).setDepth(100);  // setScrollFactor(0) = fixe à l'écran

    // Aide touches
    this.add.text(12, GameConfig.HEIGHT - 40, 'ZQSD / Flèches : déplacement   |   Échap : menu', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#555577',
      backgroundColor: '#00000066',
      padding: { x: 6, y: 3 },
    }).setScrollFactor(0).setDepth(100);
  }

  /** Touche Échap pour revenir au menu principal */
  _buildReturnKey() {
    this.input.keyboard.once('keydown-ESC', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MainMenuScene');
      });
    });
  }

  /** Boucle principale : met à jour le joueur et le HUD */
  update() {
    this._player.update();

    // Mise à jour des coordonnées dans le HUD
    const px = Math.floor(this._player.x);
    const py = Math.floor(this._player.y);
    this._coordText.setText(`X: ${px}   Y: ${py}`);
  }
}
