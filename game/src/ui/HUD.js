/**
 * HUD.js
 * Interface utilisateur fixe (indépendante du scroll de la caméra).
 * Affiche : numéro du jour, heure de jeu, coordonnées du joueur, aide clavier.
 * Toutes les zones texte utilisent setScrollFactor(0) pour rester à l'écran.
 */

import { GameConfig } from '../config/GameConfig.js';

/** Icônes de phase (Unicode) */
const PHASE_ICONS = {
  day:     '☀',
  sunset:  '🌅',
  night:   '🌙',
  sunrise: '🌄',
};

export class HUD {
  /**
   * @param {Phaser.Scene} scene
   * @param {DayNightCycle} dayNight - Référence au cycle pour lecture des données
   * @param {Player} player         - Référence au joueur pour les coordonnées
   */
  constructor(scene, dayNight, player) {
    this._scene    = scene;
    this._dayNight = dayNight;
    this._player   = player;

    this._build();
  }

  _build() {
    const { WIDTH, HEIGHT } = GameConfig;
    const DEPTH = 100;

    // ── Panneau supérieur gauche : coordonnées ──────────────────────────
    this._coordText = this._scene.add.text(12, 12, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#aaaacc',
      backgroundColor: '#00000077',
      padding: { x: 6, y: 4 },
    }).setScrollFactor(0).setDepth(DEPTH);

    // ── Panneau supérieur droit : Jour + Heure ─────────────────────────
    this._dayPanel = this._scene.add.text(WIDTH - 12, 12, '', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#f0e080',
      backgroundColor: '#00000088',
      padding: { x: 8, y: 5 },
      align: 'right',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH);

    // ── Indicateur de phase (discret, sous le panneau jour) ────────────
    this._phaseText = this._scene.add.text(WIDTH - 12, 52, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#888899',
      backgroundColor: '#00000066',
      padding: { x: 6, y: 3 },
      align: 'right',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH);

    // ── Aide touches (bas gauche) ───────────────────────────────────────
    this._scene.add.text(12, HEIGHT - 38, 'ZQSD / ↑↓←→ : déplacement   |   Échap : menu', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#555577',
      backgroundColor: '#00000066',
      padding: { x: 6, y: 3 },
    }).setScrollFactor(0).setDepth(DEPTH);
  }

  /**
   * Appelé chaque frame depuis GameScene.update().
   * Rafraîchit tous les textes du HUD.
   */
  update() {
    // Coordonnées joueur
    const px = Math.floor(this._player.x);
    const py = Math.floor(this._player.y);
    this._coordText.setText(`X: ${px}   Y: ${py}`);

    // Jour + Heure de jeu
    const day  = this._dayNight.dayCount;
    const time = this._dayNight.gameTimeString;
    this._dayPanel.setText(`Jour ${day}   ${time}`);

    // Phase avec icône
    const phase = this._dayNight.currentPhase;
    const icon  = PHASE_ICONS[phase] ?? '☀';
    const label = { day: 'Jour', sunset: 'Coucher', night: 'Nuit', sunrise: 'Lever' }[phase];
    this._phaseText.setText(`${icon} ${label}`);

    // Couleur de l'heure selon la phase
    const timeColor = {
      day:     '#f0e080',
      sunset:  '#ff9944',
      night:   '#8888ff',
      sunrise: '#ffcc66',
    }[phase];
    this._dayPanel.setStyle({ color: timeColor });
  }
}
