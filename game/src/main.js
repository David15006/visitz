/**
 * main.js
 * Point d'entrée du jeu.
 * Configure Phaser 3 et déclare toutes les scènes dans l'ordre de chargement.
 */

import { GameConfig } from './config/GameConfig.js';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { DungeonScene } from './scenes/DungeonScene.js';

/** Configuration Phaser 3 */
const config = {
  type: Phaser.AUTO,          // WebGL si disponible, sinon Canvas

  width: GameConfig.WIDTH,
  height: GameConfig.HEIGHT,

  backgroundColor: GameConfig.UI.BG_COLOR,

  // Centrage automatique dans la page
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  // Physique Arcade (légère, adaptée aux jeux 2D top-down)
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,           // Passer à true pour voir les hitboxes
      gravity: { y: 0 },     // Pas de gravité (vue de dessus)
    },
  },

  // Déclaration des scènes dans l'ordre de démarrage
  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    GameScene,
    DungeonScene,
  ],
};

// Lancement du jeu
const game = new Phaser.Game(config);

// Export pour debugging console (optionnel)
window.__game = game;
