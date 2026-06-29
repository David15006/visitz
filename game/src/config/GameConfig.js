/**
 * GameConfig.js
 * Constantes globales du jeu.
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
    SPEED: 210,
    SPRINT_SPEED: 370,
    SPRITE_W: 40,
    SPRITE_H: 48,
    HITBOX_RADIUS: 13,
    PICKUP_RANGE: 70,
    IFRAMES_MS: 650,        // ms d'invincibilité après un coup reçu
  },

  // --- Stats joueur ---
  PLAYER_STATS: {
    MAX_HEALTH: 100,
    MAX_STAMINA: 100,
    STAMINA_DRAIN: 28,
    STAMINA_REGEN: 14,
    EXHAUSTED_THRESHOLD: 25,
  },

  // --- Zombies ---
  ZOMBIES: {
    MAX_ACTIVE:     10,
    SPAWN_MIN_DIST: 540,     // distance min de spawn par rapport au joueur
    SPAWN_MAX_DIST: 820,
    SPAWN_INTERVAL: 12000,   // ms entre deux vagues

    NORMAL: {
      hp: 60,  speed: 68,  damage: 15, cooldown: 1500,
      detect: 310, range: 50, hitbox: 14,
    },
    FAST: {
      hp: 30,  speed: 145, damage: 10, cooldown:  700,
      detect: 360, range: 44, hitbox: 11,
    },
    TANK: {
      hp: 160, speed: 36,  damage: 30, cooldown: 2200,
      detect: 250, range: 62, hitbox: 18,
    },
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
    SFX_VOLUME: 0.4,
  },
};
