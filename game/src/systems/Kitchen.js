/**
 * Kitchen.js
 * Système de cuisine : sélection de recette, timer de cuisson, UI overlay.
 *
 * Recettes :
 *   [1] Steak          1 viande  3 s  →  5 pièces
 *   [2] Soupe          2 viande  6 s  → 12 pièces
 *   [3] Brochettes     3 viande  9 s  → 18 pièces
 *   [4] Tarte de viande 4 viande 14 s → 28 pièces
 *
 * Contrôles (UI ouverte) :
 *   1-4 : lancer une recette
 *   ESC : fermer (géré par GameScene)
 */

import { GameConfig }   from '../config/GameConfig.js';
import { Steak }        from '../entities/items/Steak.js';
import { Soupe }        from '../entities/items/Soupe.js';
import { Brochette }    from '../entities/items/Brochette.js';
import { TarteViande }  from '../entities/items/TarteViande.js';

const { WIDTH, HEIGHT } = GameConfig;

const RECIPES = [
  { name: 'Steak',           meatCost: 1, cookTime: 3000,  coinValue:  5, ItemClass: Steak       },
  { name: 'Soupe',           meatCost: 2, cookTime: 6000,  coinValue: 12, ItemClass: Soupe       },
  { name: 'Brochettes',      meatCost: 3, cookTime: 9000,  coinValue: 18, ItemClass: Brochette   },
  { name: 'Tarte de viande', meatCost: 4, cookTime: 14000, coinValue: 28, ItemClass: TarteViande },
];

const PW = 450, PH = 320;
const PX = (WIDTH  - PW) / 2;   // 255
const PY = (HEIGHT - PH) / 2;   // 110
const CX = WIDTH  / 2;
const D  = 200;

export class Kitchen {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this._scene   = scene;
    this._isOpen  = false;
    this._cooking = null;   // { recipe, elapsed }
    this._inv     = null;   // référence à l'inventaire courant

    this._buildUI();
  }

  get isOpen() { return this._isOpen; }

  // ── API publique ──────────────────────────────────────────────────────────

  /** @param {Inventory} inventory */
  open(inventory) {
    this._inv    = inventory;
    this._isOpen = true;
    this._setVisible(true);
    this._refresh();
  }

  close() {
    this._isOpen = false;
    this._setVisible(false);
  }

  /**
   * Appelé chaque frame (même UI fermée pour continuer la cuisson).
   * @param {number} delta
   * @param {Inventory} inventory
   */
  update(delta, inventory) {
    this._inv = inventory;

    if (this._cooking) {
      this._cooking.elapsed += delta;
      if (this._cooking.elapsed >= this._cooking.recipe.cookTime) {
        this._finishCooking();
      }
    }

    if (this._isOpen) {
      this._refresh();
      this._handleKeys();
    }
  }

  // ── Construction de l'UI ──────────────────────────────────────────────────

  _buildUI() {
    // Fond du panel
    this._bg = this._scene.add.graphics().setScrollFactor(0).setDepth(D);
    this._bg.fillStyle(0x080818, 0.95);
    this._bg.fillRoundedRect(PX, PY, PW, PH, 10);
    this._bg.lineStyle(2, 0xffe066, 0.85);
    this._bg.strokeRoundedRect(PX, PY, PW, PH, 10);

    const tx = (txt, cx, y, size, color, bold = false) =>
      this._scene.add.text(cx, y, txt, {
        fontFamily: 'monospace', fontSize: `${size}px`,
        fontStyle: bold ? 'bold' : 'normal', color,
      }).setScrollFactor(0).setDepth(D + 1).setOrigin(0.5, 0);

    this._title   = tx('=== CUISINE ===', CX, PY + 16, 17, '#ffe066', true);
    this._meatTxt = tx('', CX, PY + 48, 13, '#cccccc');

    // Séparateur
    this._sep = this._scene.add.graphics().setScrollFactor(0).setDepth(D + 1);
    this._sep.lineStyle(1, 0x334455, 0.9);
    this._sep.lineBetween(PX + 20, PY + 72, PX + PW - 20, PY + 72);

    // Lignes de recettes
    this._rLines = RECIPES.map((r, i) =>
      this._scene.add.text(PX + 24, PY + 84 + i * 44, '', {
        fontFamily: 'monospace', fontSize: '13px', color: '#aaaaaa',
      }).setScrollFactor(0).setDepth(D + 1)
    );

    // Barre de progression
    this._progressGfx  = this._scene.add.graphics().setScrollFactor(0).setDepth(D + 1);
    this._progressLabel = this._scene.add.text(PX + 24, PY + PH - 55, '', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ff9922',
    }).setScrollFactor(0).setDepth(D + 1);

    this._closeHint = tx('[ESC] Fermer', CX, PY + PH - 18, 11, '#44556677', false);
    this._closeHint.setOrigin(0.5, 1);

    this._all = [
      this._bg, this._title, this._meatTxt, this._sep,
      ...this._rLines, this._progressGfx, this._progressLabel, this._closeHint,
    ];
    this._setVisible(false);

    // Touches numérique 1-4
    const KC = Phaser.Input.Keyboard.KeyCodes;
    this._numKeys = [KC.ONE, KC.TWO, KC.THREE, KC.FOUR].map(c =>
      this._scene.input.keyboard.addKey(c)
    );
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  _refresh() {
    const meat = this._inv?.countByKey('meat') ?? 0;
    this._meatTxt.setText(`Viande disponible : ${meat}`);

    RECIPES.forEach((r, i) => {
      const canCook = meat >= r.meatCost && !this._cooking;
      const color   = canCook ? '#88ff88' : '#885544';
      const name    = r.name.padEnd(18);
      const cost    = `${r.meatCost} viande`.padEnd(10);
      const val     = `${r.coinValue} pieces`;
      this._rLines[i].setText(`[${i + 1}] ${name}${cost}→ ${val}`).setColor(color);
    });

    // Barre de progression
    this._progressGfx.clear();
    if (this._cooking) {
      const pct  = Math.min(1, this._cooking.elapsed / this._cooking.recipe.cookTime);
      const barW = (PW - 48) * pct;
      this._progressLabel.setText(
        `Cuisson : ${this._cooking.recipe.name} (${Math.round(pct * 100)}%)`
      );
      this._progressGfx.fillStyle(0x223333, 1);
      this._progressGfx.fillRect(PX + 24, PY + PH - 38, PW - 48, 12);
      this._progressGfx.fillStyle(0xff8800, 1);
      this._progressGfx.fillRect(PX + 24, PY + PH - 38, barW, 12);
    } else {
      this._progressLabel.setText('');
    }
  }

  _handleKeys() {
    this._numKeys.forEach((k, i) => {
      if (Phaser.Input.Keyboard.JustDown(k)) this._startCooking(i);
    });
  }

  // ── Logique de cuisson ────────────────────────────────────────────────────

  _startCooking(recipeIdx) {
    if (this._cooking) return;
    const recipe = RECIPES[recipeIdx];
    if (!this._inv) return;
    const meat = this._inv.countByKey('meat');
    if (meat < recipe.meatCost) return;

    this._inv.removeByKey('meat', recipe.meatCost);
    this._cooking = { recipe, elapsed: 0 };
  }

  _finishCooking() {
    const recipe = this._cooking.recipe;
    this._cooking = null;

    if (this._inv) this._inv.add(new recipe.ItemClass());

    // Feedback visuel
    const fb = this._scene.add.text(CX, HEIGHT / 2, `${recipe.name} pret ! +1`, {
      fontFamily: 'monospace', fontSize: '15px', fontStyle: 'bold',
      color: '#ffcc44', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(220);
    this._scene.tweens.add({
      targets: fb, y: HEIGHT / 2 - 50, alpha: 0, duration: 1600,
      ease: 'Power2', onComplete: () => fb.destroy(),
    });
  }

  _setVisible(v) { this._all?.forEach(o => o?.setVisible(v)); }
}
