/**
 * WorldMap.js
 * Construit et affiche toute la carte du monde dans GameScene.
 * Couches (depth order) :
 *   0 - Fond herbe (TileSprite)
 *   1 - Zones colorées (Graphics)
 *   2 - Décorations (arbres, rochers, pierres tombales)
 *   3 - Bordures de zones + labels
 *   4 - Éléments spéciaux (portails, barrières)
 */

import { GameConfig } from '../config/GameConfig.js';
import { ZoneConfig, TREES, ROCKS, GRAVES } from './ZoneConfig.js';

export class WorldMap {
  /**
   * @param {Phaser.Scene} scene - Scène dans laquelle construire la carte
   */
  constructor(scene) {
    this._scene = scene;
    this._build();
  }

  _build() {
    const { MAP_WIDTH: W, MAP_HEIGHT: H } = GameConfig;
    this._drawGround(W, H);
    this._drawZones();
    this._drawLake();
    this._drawDecorations();
    this._drawZoneLabels();
    this._drawSpecialMarkers();
    this._drawBorder(W, H);
  }

  /** Fond de sol : herbe avec texture en grille */
  _drawGround(w, h) {
    // Fond uni vert foncé
    this._scene.add.rectangle(w / 2, h / 2, w, h, GameConfig.MAP.BG_COLOR).setDepth(0);
    // Grille de tuiles d'herbe (TileSprite)
    this._scene.add.tileSprite(w / 2, h / 2, w, h, 'tile').setDepth(0).setAlpha(0.5);
  }

  /** Zones colorées : rectangles semi-transparents */
  _drawZones() {
    const gfx = this._scene.add.graphics().setDepth(1);
    const skip = new Set(['LAKE']); // le lac est dessiné à part

    Object.values(ZoneConfig).forEach(zone => {
      if (skip.has(zone.key)) return;

      gfx.fillStyle(zone.fillColor, 0.75);
      gfx.fillRect(zone.x, zone.y, zone.w, zone.h);

      // Hachures pour les zones verrouillées
      if (zone.type === 'locked') {
        gfx.lineStyle(1, zone.borderColor, 0.25);
        const step = 24;
        for (let d = -zone.h; d < zone.w + zone.h; d += step) {
          const x1 = Math.max(zone.x, zone.x + d);
          const y1 = zone.x + d < zone.x ? zone.y + (zone.x - (zone.x + d)) : zone.y;
          const x2 = Math.min(zone.x + zone.w, zone.x + d + zone.h);
          const y2 = zone.x + d + zone.h > zone.x + zone.w
            ? zone.y + zone.h - (zone.x + d + zone.h - zone.x - zone.w)
            : zone.y + zone.h;
          if (x2 > x1) gfx.lineBetween(x1, y1, x2, y2);
        }
      }
    });
  }

  /** Lac : ellipse bleue avec reflet */
  _drawLake() {
    const z = ZoneConfig.LAKE;
    const cx = z.x + z.w / 2;
    const cy = z.y + z.h / 2;
    const rx = z.w / 2;
    const ry = z.h / 2;

    const gfx = this._scene.add.graphics().setDepth(1);

    // Corps du lac
    gfx.fillStyle(0x0d2b45, 0.9);
    gfx.fillEllipse(cx, cy, z.w, z.h);

    // Reflet lumineux
    gfx.fillStyle(0x3a8fc4, 0.2);
    gfx.fillEllipse(cx - rx * 0.2, cy - ry * 0.25, z.w * 0.45, z.h * 0.35);

    // Bordure eau
    gfx.lineStyle(3, 0x1a6090, 0.8);
    gfx.strokeEllipse(cx, cy, z.w, z.h);

    // Petites vaguelettes
    gfx.lineStyle(1, 0x5ab4e8, 0.3);
    for (let i = 0; i < 5; i++) {
      const wry = ry * (0.3 + i * 0.1);
      const wrx = rx * (0.4 + i * 0.08);
      gfx.strokeEllipse(cx - rx * 0.1, cy + i * 12 - 20, wrx * 2, wry * 0.4);
    }
  }

  /** Arbres, rochers et pierres tombales */
  _drawDecorations() {
    // Arbres
    TREES.forEach(({ x, y, scale }) => {
      this._scene.add.image(x, y, 'tree')
        .setScale(scale)
        .setDepth(2 + y / 10000); // tri par Y pour pseudo-3D
    });

    // Rochers
    ROCKS.forEach(({ x, y, scale }) => {
      this._scene.add.image(x, y, 'rock')
        .setScale(scale)
        .setDepth(2 + y / 10000);
    });

    // Pierres tombales (uniquement dans le cimetière)
    GRAVES.forEach(({ x, y, scale }) => {
      this._scene.add.image(x, y, 'grave')
        .setScale(scale)
        .setDepth(2 + y / 10000);
    });
  }

  /** Labels des zones */
  _drawZoneLabels() {
    Object.values(ZoneConfig).forEach(zone => {
      const cx = zone.x + zone.w / 2;
      const cy = zone.y + zone.h / 2;

      // Nom principal
      this._scene.add.text(cx, cy - (zone.sublabel ? 10 : 0), zone.label, {
        fontFamily: 'monospace',
        fontSize: '18px',
        fontStyle: 'bold',
        color: zone.labelColor,
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(3).setAlpha(0.85);

      // Sous-label (ex : "(fermé)")
      if (zone.sublabel) {
        this._scene.add.text(cx, cy + 16, zone.sublabel, {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: zone.labelColor,
          stroke: '#000000',
          strokeThickness: 2,
        }).setOrigin(0.5).setDepth(3).setAlpha(0.7);
      }

      // Bordure de zone
      const gfx = this._scene.add.graphics().setDepth(3);
      const isLocked = zone.type === 'locked';
      gfx.lineStyle(isLocked ? 3 : 2, zone.borderColor, isLocked ? 0.9 : 0.6);
      if (zone.key === 'LAKE') {
        gfx.strokeEllipse(cx, cy, zone.w, zone.h);
      } else {
        gfx.strokeRect(zone.x, zone.y, zone.w, zone.h);
      }
    });
  }

  /** Marqueurs spéciaux : portails, barrières, icônes */
  _drawSpecialMarkers() {
    // ── Base : étoile / marqueur de départ ──
    const base = ZoneConfig.BASE;
    const bCx = base.x + base.w / 2;
    const bCy = base.y + base.h / 2;
    this._drawStar(bCx, bCy - 70, 18, 5, 0xf0e060, 3);

    // ── Égouts : grille fermée ──
    const sewer = ZoneConfig.SEWER;
    const sCx = sewer.x + sewer.w / 2;
    const sCy = sewer.y + sewer.h / 2;
    this._drawGate(sCx, sCy, 0xcccc44);

    // ── Zone finale : portail fermé ──
    const final = ZoneConfig.FINAL_ZONE;
    const fCx = final.x + final.w / 2;
    const fCy = final.y + final.h / 2;
    this._drawGate(fCx, fCy, 0xff4444);

    // ── Lac : panneau "Eau" ──
    const lake = ZoneConfig.LAKE;
    this._scene.add.text(lake.x + lake.w / 2, lake.y + lake.h / 2, '〜 Lac 〜', {
      fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold',
      color: '#5ab4e8', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(3).setAlpha(0.9);
  }

  /** Dessine une étoile à N branches */
  _drawStar(cx, cy, r, points, color, depth = 4) {
    const gfx = this._scene.add.graphics().setDepth(depth);
    gfx.fillStyle(color, 0.9);
    gfx.lineStyle(2, 0xffffff, 0.6);

    const step = Math.PI / points;
    const verts = [];
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? r : r * 0.4;
      verts.push(cx + Math.cos(i * step - Math.PI / 2) * radius);
      verts.push(cy + Math.sin(i * step - Math.PI / 2) * radius);
    }
    gfx.fillPoints(
      Array.from({ length: points * 2 }, (_, i) => ({ x: verts[i * 2], y: verts[i * 2 + 1] })),
      true
    );
  }

  /** Dessine une grille de barreaux (porte fermée) */
  _drawGate(cx, cy, color) {
    const gfx = this._scene.add.graphics().setDepth(4);
    const w = 60, h = 50;

    // Fond de la porte
    gfx.fillStyle(0x111111, 0.7);
    gfx.fillRect(cx - w / 2, cy - h / 2, w, h);

    // Barreaux verticaux
    gfx.lineStyle(3, color, 0.9);
    for (let i = 0; i <= 4; i++) {
      const bx = cx - w / 2 + (i / 4) * w;
      gfx.lineBetween(bx, cy - h / 2, bx, cy + h / 2);
    }
    // Barreaux horizontaux
    gfx.lineBetween(cx - w / 2, cy - h / 2, cx + w / 2, cy - h / 2);
    gfx.lineBetween(cx - w / 2, cy + h / 2, cx + w / 2, cy + h / 2);

    // Cadenas central
    gfx.fillStyle(color, 0.8);
    gfx.fillCircle(cx, cy, 7);
    gfx.lineStyle(2, 0xffffff, 0.7);
    gfx.strokeCircle(cx, cy, 7);
  }

  /** Bordure extérieure de la carte */
  _drawBorder(w, h) {
    const gfx = this._scene.add.graphics().setDepth(5);
    gfx.lineStyle(5, 0xe94560, 0.7);
    gfx.strokeRect(2, 2, w - 4, h - 4);
  }
}
