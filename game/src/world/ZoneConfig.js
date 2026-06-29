/**
 * ZoneConfig.js
 * Définitions de toutes les zones de la carte.
 * Chaque zone possède ses coordonnées, couleurs, type et métadonnées.
 *
 * Coordonnées : coin supérieur gauche (x, y) + dimensions (w, h).
 * La carte fait 3200 × 2400 px.
 *
 * Layout visuel approximatif :
 *
 *  [  FORÊT       ] [  ZONE FINALE  ] [   LAC         ]
 *  [               ] [   (fermée)    ] [               ]
 *  [               ] [               ] [               ]
 *  [               ] [     BASE      ] [               ]
 *  [               ] [               ] [               ]
 *  [ ÉGOUTS(ferm.) ] [               ] [  CIMETIÈRE    ]
 */

export const ZoneConfig = {

  // ── Zones principales ──────────────────────────────────────────────────

  FOREST: {
    key: 'FOREST',
    label: 'Forêt',
    x: 80, y: 80, w: 850, h: 850,
    fillColor: 0x1a3d1a,
    borderColor: 0x2d7a2d,
    labelColor: '#7ecf7e',
    type: 'area',          // traversable
  },

  LAKE: {
    key: 'LAKE',
    label: 'Lac',
    x: 2250, y: 80, w: 870, h: 620,
    fillColor: 0x0d2b45,
    borderColor: 0x1a6090,
    labelColor: '#5ab4e8',
    type: 'water',         // bloque le passage (futur)
  },

  BASE: {
    key: 'BASE',
    label: 'Base',
    x: 1250, y: 950, w: 700, h: 500,
    fillColor: 0x2a3d1e,
    borderColor: 0x5a9e3f,
    labelColor: '#a0e070',
    type: 'safe',          // zone de départ/sécurité
  },

  CEMETERY: {
    key: 'CEMETERY',
    label: 'Cimetière',
    x: 2100, y: 1700, w: 950, h: 650,
    fillColor: 0x1e1e1e,
    borderColor: 0x555555,
    labelColor: '#aaaaaa',
    type: 'area',
  },

  // ── Zones verrouillées ─────────────────────────────────────────────────

  SEWER: {
    key: 'SEWER',
    label: 'Égouts',
    sublabel: '(fermé)',
    x: 160, y: 1830, w: 380, h: 300,
    fillColor: 0x2a2a0e,
    borderColor: 0x888833,
    labelColor: '#cccc44',
    type: 'locked',        // inaccessible pour l'instant
  },

  FINAL_ZONE: {
    key: 'FINAL_ZONE',
    label: 'Zone Finale',
    sublabel: '(fermée)',
    x: 1150, y: 80, w: 700, h: 420,
    fillColor: 0x3a0a0a,
    borderColor: 0x993333,
    labelColor: '#ff6666',
    type: 'locked',
  },

};

// ── Scatter : arbres ───────────────────────────────────────────────────────
// Chaque entrée : [x, y, scale] — générés avec une graine fixe pour cohérence.

/** Génère des positions pseudo-aléatoires déterministes dans un rectangle. */
function scatter(seed, count, rx, ry, rw, rh, scaleMin = 0.7, scaleMax = 1.3) {
  const items = [];
  let s = seed;
  const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = 0; i < count; i++) {
    items.push({
      x: rx + rng() * rw,
      y: ry + rng() * rh,
      scale: scaleMin + rng() * (scaleMax - scaleMin),
    });
  }
  return items;
}

const F = ZoneConfig.FOREST;
const C = ZoneConfig.CEMETERY;

// Arbres : beaucoup dans la forêt, quelques-uns ailleurs sur la carte
export const TREES = [
  ...scatter(101, 70, F.x + 20, F.y + 20, F.w - 40, F.h - 40),       // Forêt dense
  ...scatter(202, 20, 1000, 200, 1000, 600),                            // Arbres épars centre-haut
  ...scatter(303, 15, 80, 1000, 900, 800),                              // Bord ouest
  ...scatter(404, 10, 1900, 1000, 200, 900),                            // Bord centre
];

// Rochers : éparpillés sur toute la carte, plus nombreux près du cimetière
export const ROCKS = [
  ...scatter(505, 25, 900, 100, 1100, 800),                             // Zone centrale haute
  ...scatter(606, 20, 80, 900, 900, 800),                               // Zone ouest basse
  ...scatter(707, 30, C.x + 20, C.y + 20, C.w - 40, C.h - 40, 0.5, 1), // Cimetière
  ...scatter(808, 15, 1900, 1400, 1100, 900),                           // Zone est basse
];

// Pierres tombales (uniquement dans le cimetière)
export const GRAVES = scatter(999, 28, C.x + 40, C.y + 40, C.w - 80, C.h - 80, 0.8, 1.1);
