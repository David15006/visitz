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
    SPEED: 220,          // pixels par seconde
    SIZE: 32,            // taille du carré temporaire (px)
    COLOR: 0x4fc3f7,     // bleu clair
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

  // --- Fond de la carte (temporaire) ---
  MAP: {
    BG_COLOR: 0x1b2838,
    GRID_COLOR: 0x263340,
  },
};
