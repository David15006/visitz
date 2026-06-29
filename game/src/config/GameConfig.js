/**
 * GameConfig.js
 * Constantes globales du jeu : dimensions, couleurs, vitesses, etc.
 */

export const GameConfig = {
  // --- Fenêtre de rendu ---
  WIDTH: 960,
  HEIGHT: 540,

  // --- Carte du monde ---
  MAP_WIDTH: 3200,
  MAP_HEIGHT: 2400,

  // --- Joueur : déplacement ---
  PLAYER: {
    SPEED: 210,                  // vitesse marche (px/s)
    SPRINT_SPEED: 370,           // vitesse course (px/s)
    SPRITE_W: 40,
    SPRITE_H: 48,
    HITBOX_RADIUS: 13,           // rayon du cercle de collision
    PICKUP_RANGE: 70,            // distance de ramassage (px)
  },

  // --- Stats joueur ---
  PLAYER_STATS: {
    MAX_HEALTH: 100,
    MAX_STAMINA: 100,
    STAMINA_DRAIN:  28,          // par seconde en sprint
    STAMINA_REGEN:  14,          // par seconde hors sprint
    EXHAUSTED_THRESHOLD: 25,     // seuil de récupération après épuisement
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
    BG_COLOR: 0x2d4a1e,
    GRID_COLOR: 0x263340,
  },

  // --- Cycle jour / nuit ---
  DAY_NIGHT: {
    DAY_MS:   8 * 60 * 1000,
    NIGHT_MS: 4 * 60 * 1000,
    TRANS_MS: 60 * 1000,
    START_HOUR: 6,
    GAME_MIN_PER_REAL_MS: 2 / 1000,
    NIGHT_OVERLAY_ALPHA: 0.68,
    COLOR_NIGHT:  0x000528,
    COLOR_SUNSET: 0xcc4400,
  },

  // --- Audio ---
  AUDIO: {
    MASTER_VOLUME: 0.5,
    MUSIC_FADE_MS: 3000,
  },
};
