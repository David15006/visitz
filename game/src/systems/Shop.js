/**
 * Shop.js
 * Boutique d'armes — UI overlay, achat avec pièces.
 *
 * Catalogue :
 *   [1] Batte de baseball  35 dgt  portée  72   50 p.
 *   [2] Lance              50 dgt  portée 110   80 p.
 *   [3] Pistolet           25 dgt  portée 210  150 p.
 *   [4] Fusil à pompe      60 dgt  portée 130  220 p.
 *   [5] Fusil d'assaut     20 dgt  portée 260  350 p.
 *   [6] Lance-flammes      15 dgt  portée  90  500 p.
 *
 * Contrôles (UI ouverte) :
 *   1-6 : acheter
 *   ESC : fermer (géré par GameScene)
 */

import { GameConfig }    from '../config/GameConfig.js';
import { Bat }           from '../entities/items/Bat.js';
import { Lance }         from '../entities/items/Lance.js';
import { Pistol }        from '../entities/items/Pistol.js';
import { Shotgun }       from '../entities/items/Shotgun.js';
import { AssaultRifle }  from '../entities/items/AssaultRifle.js';
import { Flamethrower }  from '../entities/items/Flamethrower.js';

const { WIDTH, HEIGHT } = GameConfig;

const CATALOG = [
  { ItemClass: Bat,          price:  50, desc: '35 dgt  portee  72px  melee' },
  { ItemClass: Lance,        price:  80, desc: '50 dgt  portee 110px  melee' },
  { ItemClass: Pistol,       price: 150, desc: '25 dgt  portee 210px  tir' },
  { ItemClass: Shotgun,      price: 220, desc: '60 dgt  portee 130px  tir' },
  { ItemClass: AssaultRifle, price: 350, desc: '20 dgt  portee 260px  rapide' },
  { ItemClass: Flamethrower, price: 500, desc: '15 dgt  portee  90px  cone feu' },
];

const PW = 500, PH = 380;
const PX = (WIDTH  - PW) / 2;
const PY = (HEIGHT - PH) / 2;
const CX = WIDTH  / 2;
const D  = 200;

export class Shop {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this._scene  = scene;
    this._isOpen = false;
    this._stats  = null;
    this._inv    = null;

    this._buildUI();
  }

  get isOpen() { return this._isOpen; }

  // ── API ───────────────────────────────────────────────────────────────────

  open(playerStats, inventory) {
    this._stats  = playerStats;
    this._inv    = inventory;
    this._isOpen = true;
    this._setVisible(true);
    this._refresh();
  }

  close() {
    this._isOpen = false;
    this._setVisible(false);
  }

  update() {
    if (!this._isOpen) return;
    this._refresh();
    this._handleKeys();
  }

  // ── Construction ──────────────────────────────────────────────────────────

  _buildUI() {
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

    this._title    = tx('=== BOUTIQUE ===', CX, PY + 16, 17, '#ffe066', true);
    this._coinsTxt = tx('', CX, PY + 46, 13, '#ffdd88');

    this._sep = this._scene.add.graphics().setScrollFactor(0).setDepth(D + 1);
    this._sep.lineStyle(1, 0x334455, 0.9);
    this._sep.lineBetween(PX + 20, PY + 72, PX + PW - 20, PY + 72);

    // Header
    this._scene.add.text(PX + 24, PY + 80, 'Arme                    Prix  Description', {
      fontFamily: 'monospace', fontSize: '11px', color: '#556677',
    }).setScrollFactor(0).setDepth(D + 1);

    // Lignes catalogue
    this._cLines = CATALOG.map((_, i) =>
      this._scene.add.text(PX + 24, PY + 100 + i * 40, '', {
        fontFamily: 'monospace', fontSize: '13px', color: '#aaaaaa',
      }).setScrollFactor(0).setDepth(D + 1)
    );

    this._feedback = this._scene.add.text(CX, PY + PH - 30, '', {
      fontFamily: 'monospace', fontSize: '13px', color: '#ff5555',
    }).setScrollFactor(0).setDepth(D + 1).setOrigin(0.5, 1);

    this._closeHint = this._scene.add.text(CX, PY + PH - 10, '[ESC] Fermer', {
      fontFamily: 'monospace', fontSize: '11px', color: '#445566',
    }).setScrollFactor(0).setDepth(D + 1).setOrigin(0.5, 1);

    this._all = [
      this._bg, this._title, this._coinsTxt, this._sep,
      ...this._cLines, this._feedback, this._closeHint,
    ];
    this._setVisible(false);

    const KC = Phaser.Input.Keyboard.KeyCodes;
    this._numKeys = [KC.ONE, KC.TWO, KC.THREE, KC.FOUR, KC.FIVE, KC.SIX].map(c =>
      this._scene.input.keyboard.addKey(c)
    );
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  _refresh() {
    const coins = this._stats?.coins ?? 0;
    this._coinsTxt.setText(`Pieces disponibles : ${coins}`);

    CATALOG.forEach((entry, i) => {
      const item    = new entry.ItemClass();
      const canBuy  = coins >= entry.price && this._inv && !this._inv.isFull();
      const color   = canBuy ? '#88ff88' : '#885544';
      const name    = item.name.padEnd(24);
      const price   = String(entry.price).padStart(4) + ' p.';
      this._cLines[i].setText(`[${i + 1}] ${name}${price}  ${entry.desc}`).setColor(color);
    });
  }

  _handleKeys() {
    this._numKeys.forEach((k, i) => {
      if (Phaser.Input.Keyboard.JustDown(k)) this._buy(i);
    });
  }

  // ── Achat ─────────────────────────────────────────────────────────────────

  _buy(catalogIdx) {
    const entry = CATALOG[catalogIdx];
    if (!this._stats || !this._inv) return;

    if (this._inv.isFull()) {
      this._showFeedback('Inventaire plein !', '#ff5555');
      return;
    }
    if (this._stats.coins < entry.price) {
      this._showFeedback(`Pas assez de pieces (${entry.price} requis)`, '#ff5555');
      return;
    }

    this._stats.spendCoins(entry.price);
    const weapon = new entry.ItemClass();
    this._inv.add(weapon);
    this._showFeedback(`${weapon.name} achete !`, '#88ff88');
  }

  _showFeedback(text, color) {
    this._feedback.setText(text).setColor(color);
    this._scene.time.delayedCall(2000, () => {
      if (this._feedback) this._feedback.setText('');
    });
  }

  _setVisible(v) { this._all?.forEach(o => o?.setVisible(v)); }
}
