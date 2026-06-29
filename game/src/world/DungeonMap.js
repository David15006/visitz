/**
 * DungeonMap.js
 * Génère le rendu visuel du donjon (sol, murs, torches) et le groupe physique des murs.
 *
 * Monde : 1800 × 1400 px
 * 8 salles + corridors
 */

export class DungeonMap {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this._scene = scene;

    // Groupe de murs physiques statiques
    this._wallsGroup = scene.physics.add.staticGroup();

    this._build();
  }

  get wallsGroup() { return this._wallsGroup; }

  _build() {
    const scene = this._scene;

    // Fond sombre total (monde étendu pour R9)
    scene.add.rectangle(1100, 800, 2200, 1600, 0x050508).setDepth(0);

    // ── Salles ──────────────────────────────────────────────────────────────
    //
    // Format : { x, y, w, h, openings }
    // openings = liste de { side: 'N'|'S'|'E'|'W', center }
    //   center = coord du centre de l'ouverture sur le côté
    //
    const rooms = [
      // R1 entrée
      {
        id: 'R1', x: 200, y: 440, w: 288, h: 208,
        openings: [
          { side: 'E', center: 544 }, // → corridor H1
          { side: 'S', center: 344 }, // → corridor V1
        ],
      },
      // R2 pièges
      {
        id: 'R2', x: 600, y: 440, w: 288, h: 208,
        openings: [
          { side: 'W', center: 544 }, // ← corridor H1
          { side: 'E', center: 544 }, // → corridor H2
          { side: 'S', center: 744 }, // → corridor V2
        ],
      },
      // R3 levier
      {
        id: 'R3', x: 1000, y: 440, w: 288, h: 208,
        openings: [
          { side: 'W', center: 544 }, // ← corridor H2
          { side: 'S', center: 1144 }, // → corridor V3 (porte)
        ],
      },
      // R4 rats
      {
        id: 'R4', x: 600, y: 760, w: 288, h: 208,
        openings: [
          { side: 'N', center: 744 }, // ← corridor V2
        ],
      },
      // R5 infectés
      {
        id: 'R5', x: 1000, y: 760, w: 288, h: 208,
        openings: [
          { side: 'N', center: 1144 }, // ← corridor V3 (porte)
          { side: 'S', center: 1144 }, // → corridor V4
        ],
      },
      // R6 secret
      {
        id: 'R6', x: 200, y: 760, w: 288, h: 208,
        openings: [
          { side: 'N', center: 344 }, // ← corridor V1
        ],
      },
      // R7 énigme
      {
        id: 'R7', x: 1000, y: 1080, w: 288, h: 208,
        openings: [
          { side: 'N', center: 1144 }, // ← corridor V4
          { side: 'E', center: 1184 }, // → corridor H3 (porte)
        ],
      },
      // R8 antichambre boss
      {
        id: 'R8', x: 1400, y: 1080, w: 288, h: 208,
        openings: [
          { side: 'W', center: 1184 }, // ← corridor H3 (porte)
          { side: 'E', center: 1184 }, // → corridor H4 (boss)
        ],
      },
      // R9 salle du boss (grande arène)
      {
        id: 'R9', x: 1800, y: 960, w: 380, h: 320,
        openings: [
          { side: 'W', center: 1184 }, // ← corridor H4
        ],
      },
    ];

    // Corridors : { x, y, w, h }
    const corridors = [
      { x: 488, y: 512, w: 112, h: 64 },   // H1 R1↔R2
      { x: 888, y: 512, w: 112, h: 64 },   // H2 R2↔R3
      { x: 312, y: 648, w: 64, h: 112 },   // V1 R1↔R6
      { x: 712, y: 648, w: 64, h: 112 },   // V2 R2↔R4
      { x: 1112, y: 648, w: 64, h: 112 },  // V3 R3↔R5 (porte)
      { x: 1112, y: 968, w: 64, h: 112 },  // V4 R5↔R7
      { x: 1288, y: 1152, w: 112, h: 64 }, // H3 R7↔R8 (porte)
      { x: 1688, y: 1152, w: 112, h: 64 }, // H4 R8↔R9 (boss)
    ];

    // Dessiner sols des corridors
    corridors.forEach(({ x, y, w, h }) => {
      this._drawFloor(x, y, w, h);
    });

    // Dessiner salles (sol + murs)
    rooms.forEach(room => {
      this._drawFloor(room.x, room.y, room.w, room.h);
      this._addRoomWalls(room.x, room.y, room.w, room.h, room.openings);
    });

    // Coins de corridor (petits bouchons visuels)
    corridors.forEach(({ x, y, w, h }) => {
      this._addCorridorWalls(x, y, w, h);
    });

    // Torches dans les salles (ambiance)
    this._placeTorches(rooms);
  }

  // ── Sol ──────────────────────────────────────────────────────────────────────

  _drawFloor(x, y, w, h) {
    const scene = this._scene;
    const cx = x + w / 2;
    const cy = y + h / 2;

    // Dalle de base gris sombre
    const floor = scene.add.graphics().setDepth(1);
    floor.fillStyle(0x1a1a22, 1);
    floor.fillRect(x, y, w, h);

    // Grille de dalles
    const tileSize = 32;
    const grid = scene.add.graphics().setDepth(1);
    grid.lineStyle(1, 0x2a2a38, 0.6);
    for (let tx = x; tx <= x + w; tx += tileSize) {
      grid.lineBetween(tx, y, tx, y + h);
    }
    for (let ty = y; ty <= y + h; ty += tileSize) {
      grid.lineBetween(x, ty, x + w, ty);
    }

    // Quelques taches aléatoires (mousse, sang)
    const stain = scene.add.graphics().setDepth(1);
    for (let i = 0; i < Math.floor(w * h / 4000); i++) {
      const sx = x + 16 + Math.random() * (w - 32);
      const sy = y + 16 + Math.random() * (h - 32);
      const col = Math.random() < 0.3 ? 0x330000 : 0x0f1018;
      stain.fillStyle(col, 0.5 + Math.random() * 0.3);
      stain.fillEllipse(sx, sy, 20 + Math.random() * 30, 12 + Math.random() * 20);
    }
  }

  // ── Murs de salle ────────────────────────────────────────────────────────────

  /**
   * Génère les murs physiques d'une salle avec des ouvertures.
   * @param {number} fx  x de la salle
   * @param {number} fy  y de la salle
   * @param {number} fw  largeur
   * @param {number} fh  hauteur
   * @param {Array}  openings  [{ side, center }]
   */
  _addRoomWalls(fx, fy, fw, fh, openings = []) {
    const DOOR_W   = 64;   // largeur d'une ouverture
    const WALL_T   = 16;   // épaisseur visuelle du mur
    const scene    = this._scene;

    // Grouper les ouvertures par côté
    const byS = { N: [], S: [], E: [], W: [] };
    openings.forEach(o => byS[o.side].push(o.center));

    // Mur NORD (y = fy)
    this._segmentWall('H', fx, fy, fw, byS.N, DOOR_W, WALL_T, scene);
    // Mur SUD (y = fy+fh)
    this._segmentWall('H', fx, fy + fh, fw, byS.S, DOOR_W, WALL_T, scene);
    // Mur OUEST (x = fx)
    this._segmentWall('V', fx, fy, fh, byS.W, DOOR_W, WALL_T, scene);
    // Mur EST (x = fx+fw)
    this._segmentWall('V', fx + fw, fy, fh, byS.E, DOOR_W, WALL_T, scene);
  }

  /**
   * Génère des segments de mur le long d'un axe avec des brèches.
   * @param {'H'|'V'} axis
   * @param {number} ax  x de départ (H) ou x fixe (V)
   * @param {number} ay  y fixe (H) ou y de départ (V)
   * @param {number} len longueur totale
   * @param {number[]} holes centres des brèches
   * @param {number} doorW largeur de brèche
   * @param {number} thick épaisseur
   */
  _segmentWall(axis, ax, ay, len, holes, doorW, thick, scene) {
    const halfD = doorW / 2;

    // Construire la liste des intervalles bloqués (murs) en excluant les brèches
    const gaps = holes.map(c => {
      // c est absolu : convertir en relatif sur l'axe
      const rel = axis === 'H' ? (c - ax) : (c - ay);
      return [rel - halfD, rel + halfD];
    }).sort((a, b) => a[0] - b[0]);

    let cursor = 0;
    const segments = [];

    for (const [gStart, gEnd] of gaps) {
      if (cursor < gStart) segments.push([cursor, gStart]);
      cursor = gEnd;
    }
    if (cursor < len) segments.push([cursor, len]);

    segments.forEach(([s, e]) => {
      const segLen = e - s;
      if (segLen <= 0) return;

      // Position centrale du segment
      let wx, wy, ww, wh;
      if (axis === 'H') {
        wx = ax + s + segLen / 2;
        wy = ay;
        ww = segLen;
        wh = thick;
      } else {
        wx = ax;
        wy = ay + s + segLen / 2;
        ww = thick;
        wh = segLen;
      }

      // Visuel
      const gfx = scene.add.graphics().setDepth(3);
      gfx.fillStyle(0x2c2038, 1);
      if (axis === 'H') gfx.fillRect(ax + s, ay - thick / 2, segLen, thick);
      else              gfx.fillRect(ax - thick / 2, ay + s, thick, segLen);

      // Highlight
      gfx.lineStyle(1, 0x4a3860, 0.7);
      if (axis === 'H') gfx.strokeRect(ax + s, ay - thick / 2, segLen, thick);
      else              gfx.strokeRect(ax - thick / 2, ay + s, thick, segLen);

      // Physique statique
      const wall = scene.add.zone(wx, wy, ww, wh);
      scene.physics.world.enable(wall, Phaser.Physics.Arcade.STATIC_BODY);
      this._wallsGroup.add(wall);
    });
  }

  // ── Murs de corridor ─────────────────────────────────────────────────────────

  _addCorridorWalls(x, y, w, h) {
    const scene = this._scene;
    const T     = 12;
    const isH   = w > h;

    if (isH) {
      // Murs nord/sud du corridor horizontal
      [[x, y - T / 2, w, T], [x, y + h - T / 2, w, T]].forEach(([cx, cy, cw, ch]) => {
        const gfx = scene.add.graphics().setDepth(3);
        gfx.fillStyle(0x2c2038, 1);
        gfx.fillRect(cx, cy, cw, ch);
        const wall = scene.add.zone(cx + cw / 2, cy + ch / 2, cw, ch);
        scene.physics.world.enable(wall, Phaser.Physics.Arcade.STATIC_BODY);
        this._wallsGroup.add(wall);
      });
    } else {
      // Murs est/ouest du corridor vertical
      [[x - T / 2, y, T, h], [x + w - T / 2, y, T, h]].forEach(([cx, cy, cw, ch]) => {
        const gfx = scene.add.graphics().setDepth(3);
        gfx.fillStyle(0x2c2038, 1);
        gfx.fillRect(cx, cy, cw, ch);
        const wall = scene.add.zone(cx + cw / 2, cy + ch / 2, cw, ch);
        scene.physics.world.enable(wall, Phaser.Physics.Arcade.STATIC_BODY);
        this._wallsGroup.add(wall);
      });
    }
  }

  // ── Torches ──────────────────────────────────────────────────────────────────

  _placeTorches(rooms) {
    const scene   = this._scene;
    const torches = [
      // Coins des grandes salles
      { x: 220,  y: 460  },
      { x: 460,  y: 460  },
      { x: 620,  y: 460  },
      { x: 860,  y: 460  },
      { x: 1020, y: 460  },
      { x: 1260, y: 460  },
      { x: 220,  y: 620  },
      { x: 460,  y: 620  },
      { x: 620,  y: 620  },
      { x: 860,  y: 620  },
      { x: 220,  y: 780  },
      { x: 460,  y: 780  },
      { x: 620,  y: 780  },
      { x: 860,  y: 780  },
      { x: 1020, y: 780  },
      { x: 1260, y: 780  },
      { x: 1020, y: 1100 },
      { x: 1260, y: 1100 },
      { x: 1420, y: 1100 },
      { x: 1660, y: 1100 },
      { x: 1020, y: 1260 },
      { x: 1260, y: 1260 },
      { x: 1420, y: 1260 },
      { x: 1660, y: 1260 },
      // R9 salle du boss (torches rouges — teinte différente via tint)
      { x: 1830, y: 980  },
      { x: 2140, y: 980  },
      { x: 1830, y: 1260 },
      { x: 2140, y: 1260 },
      { x: 1990, y: 970  },
      { x: 1990, y: 1268 },
      { x: 1808, y: 1120 },
      { x: 2172, y: 1120 },
    ];

    torches.forEach(({ x, y }) => {
      const torch = scene.add.image(x, y, 'torch').setDepth(4);

      // Lumière orangée pulsée
      const light = scene.add.graphics().setDepth(3);
      const updateLight = () => {
        light.clear();
        const t     = scene.time.now;
        const alpha = 0.12 + 0.06 * Math.sin(t / 120 + x);
        light.fillStyle(0xff8800, alpha);
        light.fillCircle(x, y, 55 + 8 * Math.sin(t / 180 + y));
      };

      scene.events.on('update', updateLight);

      // Scintillement du sprite
      scene.tweens.add({
        targets: torch,
        alpha: 0.75,
        duration: 200 + Math.random() * 300,
        ease: 'Sine.inOut',
        yoyo: true,
        repeat: -1,
      });
    });
  }
}
