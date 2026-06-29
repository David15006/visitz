/**
 * Base.js
 * Structure de la base du joueur.
 *
 * Contient :
 *  - Murs (Wall) avec HP, cassables par les zombies, réparables
 *  - Porte (Wall spéciale, toggle avec F)
 *  - Objets intérieurs : Coffre, Cuisine, Établi, Boutique, Étal
 *
 * Layout (en pixels) :
 *   x : 1440 → 1760   (320 px)
 *   y : 1088 → 1312   (224 px)
 *   Porte : bas-centre, largeur 64 px
 */

import { Wall } from '../entities/Wall.js';

// ── Coordonnées de la base ─────────────────────────────────────────────────
const X1 = 1440, Y1 = 1088;
const X2 = 1760, Y2 = 1312;
const DOOR_CX = 1600; // centre X de la porte
const DOOR_W  = 64;
const DOOR_X1 = DOOR_CX - DOOR_W / 2; // 1568
const DOOR_X2 = DOOR_CX + DOOR_W / 2; // 1632

const REPAIR_RANGE   = 72;
const INTERACT_RANGE = 72;
const DOOR_RANGE     = 72;

export class Base {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this._scene = scene;

    // Groupe de tous les murs (statique, utilisé pour les colliders physiques)
    this.wallsGroup = scene.add.group();

    this._walls    = []; // toutes les instances Wall actives
    this._door     = null;
    this._doorOpen = false;

    this._interiors = []; // { sprite, label, action, x, y }

    // Textes de hint
    this._hintInteract = scene.add.text(0, 0, '', {
      fontFamily: 'monospace', fontSize: '12px',
      color: '#ffe066', backgroundColor: '#00000099',
      padding: { x: 5, y: 3 },
    }).setOrigin(0.5, 1).setDepth(22).setScrollFactor(1).setVisible(false);

    this._hintRepair = scene.add.text(0, 0, '', {
      fontFamily: 'monospace', fontSize: '12px',
      color: '#88ffaa', backgroundColor: '#00000099',
      padding: { x: 5, y: 3 },
    }).setOrigin(0.5, 1).setDepth(22).setScrollFactor(1).setVisible(false);

    this._build();
  }

  // ── Construction ─────────────────────────────────────────────────────────

  _build() {
    this._buildWalls();
    this._buildDoor();
    this._buildInteriors();
  }

  _buildWalls() {
    // Mur du HAUT (5 segments 64×16), y_centre = Y1 + 8
    for (let i = 0; i < 5; i++) {
      this._addWall(X1 + 32 + i * 64, Y1 + 8, true);
    }

    // Mur du BAS gauche (2 segments), à gauche de la porte
    this._addWall(X1 + 32,        Y2 - 8, true);
    this._addWall(X1 + 32 + 64,   Y2 - 8, true);

    // Mur du BAS droit (2 segments), à droite de la porte
    this._addWall(DOOR_X2 + 32,        Y2 - 8, true);
    this._addWall(DOOR_X2 + 32 + 64,   Y2 - 8, true);

    // Mur GAUCHE (3 segments 16×64), x_centre = X1 + 8
    this._addWall(X1 + 8, Y1 + 40,        false);
    this._addWall(X1 + 8, Y1 + 40 + 64,   false);
    this._addWall(X1 + 8, Y1 + 40 + 128,  false);

    // Mur DROIT (3 segments)
    this._addWall(X2 - 8, Y1 + 40,        false);
    this._addWall(X2 - 8, Y1 + 40 + 64,   false);
    this._addWall(X2 - 8, Y1 + 40 + 128,  false);
  }

  _addWall(x, y, horizontal) {
    const w = new Wall(this._scene, x, y, horizontal, 120);
    this.wallsGroup.add(w);
    this._walls.push(w);
    return w;
  }

  _buildDoor() {
    // La porte est un mur spécial avec texture différente et HP réduit
    this._door = new Wall(this._scene, DOOR_CX, Y2 - 8, true, 80);
    this._door.setTexture('door_closed');
    this.wallsGroup.add(this._door);
    this._walls.push(this._door);
  }

  _buildInteriors() {
    const defs = [
      { x: 1510, y: 1140, key: 'obj_chest',    label: 'Coffre',   action: 'Ouvrir le coffre' },
      { x: 1690, y: 1145, key: 'obj_kitchen',   label: 'Cuisine',  action: 'Cuisiner de la viande' },
      { x: 1510, y: 1275, key: 'obj_workbench', label: 'Établi',   action: 'Fabriquer' },
      { x: 1690, y: 1275, key: 'obj_shop',      label: 'Boutique', action: 'Acheter des ressources' },
      { x: 1600, y: 1225, key: 'obj_stall',     label: 'Étal',     action: 'Vendre des ressources' },
    ];

    defs.forEach(({ x, y, key, label, action }) => {
      const sprite = this._scene.add.image(x, y, key).setDepth(5);

      const labelText = this._scene.add.text(x, y + sprite.height / 2 + 5, label, {
        fontFamily: 'monospace', fontSize: '10px',
        color: '#ffe066', stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5, 0).setDepth(6);

      this._interiors.push({ sprite, label: labelText, action, x, y });
    });
  }

  // ── Mise à jour ──────────────────────────────────────────────────────────

  /**
   * @param {number} delta
   * @param {number} px   position joueur X
   * @param {number} py   position joueur Y
   */
  update(delta, px, py) {
    // Purger les murs détruits de l'array interne
    this._walls = this._walls.filter(w => {
      if (!w.scene) return false;
      w.update(delta);
      return true;
    });

    this._updateHints(px, py);
  }

  // ── Hints ─────────────────────────────────────────────────────────────────

  _updateHints(px, py) {
    // Hint interaction (porte > objet intérieur)
    const doorNear = this.isDoorNear(px, py);
    const interior = doorNear ? null : this._nearestInterior(px, py);

    if (doorNear) {
      this._hintInteract
        .setText(`[F]  ${this._doorOpen ? 'Fermer' : 'Ouvrir'} la porte`)
        .setPosition(px, py - 52).setVisible(true);
    } else if (interior) {
      this._hintInteract
        .setText(`[E]  ${interior.action}`)
        .setPosition(px, py - 52).setVisible(true);
    } else {
      this._hintInteract.setVisible(false);
    }

    // Hint réparation (mur endommagé à portée)
    const target = this._nearestDamagedWall(px, py);
    if (target) {
      const pct = Math.round((target.hp / target.maxHp) * 100);
      this._hintRepair
        .setText(`[R]  Réparer le mur (${pct}%)`)
        .setPosition(px, py - 68).setVisible(true);
    } else {
      this._hintRepair.setVisible(false);
    }
  }

  // ── Actions publiques ─────────────────────────────────────────────────────

  /** Bascule l'état de la porte si le joueur est assez proche. */
  toggleDoor(px, py) {
    if (!this.isDoorNear(px, py)) return;
    if (!this._door?.scene) return;
    this._doorOpen = !this._doorOpen;
    this._door.body.enable = !this._doorOpen;
    this._door.setAlpha(this._doorOpen ? 0.25 : 1);
    this._door.setTexture(this._doorOpen ? 'door_open' : 'door_closed');
  }

  /**
   * Répare le mur endommagé le plus proche.
   * @returns {boolean} true si un mur a été réparé
   */
  repairNear(px, py) {
    const w = this._nearestDamagedWall(px, py);
    if (!w) return false;
    const ok = w.repair(30);
    if (ok) this._showFeedback('Mur réparé +30', px, py, '#88ffaa');
    return ok;
  }

  /**
   * Interagit avec l'objet intérieur le plus proche.
   * @returns {boolean}
   */
  interactNear(px, py) {
    const obj = this._nearestInterior(px, py);
    if (!obj) return false;
    this._showFeedback(obj.action, px, py, '#aaffff');
    return true;
  }

  isDoorNear(px, py) {
    if (!this._door?.scene) return false;
    return Phaser.Math.Distance.Between(px, py, this._door.x, this._door.y) < DOOR_RANGE;
  }

  hasNearbyInterior(px, py) {
    return !!this._nearestInterior(px, py);
  }

  hasDamagedWallNear(px, py) {
    return !!this._nearestDamagedWall(px, py);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _nearestDamagedWall(px, py) {
    let nearest = null, best = REPAIR_RANGE;
    for (const w of this._walls) {
      if (!w.scene || w.hp >= w.maxHp || w.isDestroyed) continue;
      const d = Phaser.Math.Distance.Between(px, py, w.x, w.y);
      if (d < best) { best = d; nearest = w; }
    }
    return nearest;
  }

  _nearestInterior(px, py) {
    let nearest = null, best = INTERACT_RANGE;
    for (const obj of this._interiors) {
      const d = Phaser.Math.Distance.Between(px, py, obj.x, obj.y);
      if (d < best) { best = d; nearest = obj; }
    }
    return nearest;
  }

  _showFeedback(text, px, py, color = '#ffe066') {
    const t = this._scene.add.text(px, py - 80, text, {
      fontFamily: 'monospace', fontSize: '13px',
      color, stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(25);

    this._scene.tweens.add({
      targets: t, y: t.y - 28, alpha: 0, duration: 1400,
      ease: 'Power2', onComplete: () => t.destroy(),
    });
  }
}
