/**
 * GameConfig.js
 * Constantes globales du jeu : dimensions, couleurs, vitesses, etc.
 * Modifier ces valeurs pour ajuster le comportement global sans toucher à la logique.
 */

export const GameConfig = {
  // --- Fenêtre de rendu ---
  WIDTH: 960,
  HEIGHT: 540,

  // --- Carte du monde ---
  MAP_WIDTH: 3200,
  MAP_HEIGHT: 2400,

  // --- Joueur ---
  PLAYER: {
    SPEED: 220,
    SIZE: 32,
    COLOR: 0x4fc3f7,
    BORDER_COLOR: 0x0288d1,
  },

  // --- Couleurs de l'interface ---
  UI: {
    BG_COLOR: '#1a1a2e',
    TITLE_COLOR: '#e2e2e2',
    BUTTON_COLOR: '#16213e',
    BUTTON_HOVER: '#0f3460',
    BUTTON_TEXT: '#e94560',
    ACCENT: '#e94560',
  },

  // --- Fond de la carte ---
  MAP: {
    BG_COLOR: 0x2d4a1e,    // vert herbe foncé
    GRID_COLOR: 0x263340,
  },

  // --- Cycle jour / nuit ---
  DAY_NIGHT: {
    // Durées en millisecondes (temps réel)
    DAY_MS:   8 * 60 * 1000,   // 8 minutes de jour
    NIGHT_MS: 4 * 60 * 1000,   // 4 minutes de nuit
    TRANS_MS: 60 * 1000,        // 1 minute de transition de chaque côté

    // Heure de jeu au démarrage d'un cycle
    START_HOUR: 6,              // 06:00

    // Vitesse du temps : 2 minutes de jeu par seconde réelle
    // (16 h de jour en 8 min réelles = 2 gmin/s ; identique la nuit)
    GAME_MIN_PER_REAL_MS: 2 / 1000,

    // Alpha max de l'overlay nocturne
    NIGHT_OVERLAY_ALPHA: 0.68,

    // Couleurs de l'overlay (ARGB hex)
    COLOR_NIGHT:   0x000528,    // bleu nuit
    COLOR_SUNSET:  0xcc4400,    // orange couchant
  },

  // --- Audio ---
  AUDIO: {
    MASTER_VOLUME: 0.5,
    MUSIC_FADE_MS: 3000,        // durée du crossfade jour ↔ nuit
  },
};
