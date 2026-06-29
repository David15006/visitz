/**
 * PlayerHUD.js
 * Interface joueur fixe (scrollFactor 0) :
 *  - Barre de vie (rouge, coin bas-gauche)
 *  - Barre d'endurance (verte/orange, sous la vie)
 *  - Inventaire 8 slots (centre bas)
 *  - Indicateur "Épuisé" si stamina épuisée
 *
 * Profondeur 101 (au-dessus du HUD jour/nuit = 100).
 */

import { GameConfig } from '../config/GameConfig.js';

const DEPTH    = 101;
const { WIDTH, HEIGHT } = GameConfig;

// Dimensions des barres
const BAR_W    = 170;
const BAR_H    = 14;
const BAR_X    = 56;                 // bord gauche de la barre
const HP_Y     = HEIGHT - 82;       // centre Y de la barre de vie
const ST_Y     = HEIGHT - 60;       // centre Y de la barre d'endurance

// Inventaire
const SLOT_SIZE  = 40;
const SLOT_GAP   = 4;
const SLOT_COUNT = 8;
const INV_W      = SLOT_COUNT * (SLOT_SIZE + SLOT_GAP) - SLOT_GAP;
const INV_X      = WIDTH / 2 - INV_W / 2;    // x de départ (coin gauche)
const INV_Y      = HEIGHT - 46;               // centre Y des slots

export class PlayerHUD {
  /**
   * @param {Phaser.Scene} scene
   * @param {Player} player
   */
  constructor(scene, player) {
    this._scene  = scene;
    this._player = player;

    this._buildBars();
    this._buildInventoryUI();
    this._buildExhaustedLabel();
  }

  // ── Construction ──────────────────────────────────────────────────────────

  _buildBars() {
    const gfx = this._scene.add.graphics().setScrollFactor(0).setDepth(DEPTH);

    // Fond commun des deux barres
    gfx.fillStyle(0x000000, 0.55);
    gfx.fillRoundedRect(10, HEIGHT - 96, BAR_W + 60, 52, 6);

    // Icônes
    this._scene.add.text(15, HP_Y, '❤', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ff4455',
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(DEPTH);

    this._scene.add.text(15, ST_Y, '⚡', {
      fontFamily: 'monospace', fontSize: '16px', color: '#55ee66',
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(DEPTH);

    // Fond des barres
    const bgGfx = this._scene.add.graphics().setScrollFactor(0).setDepth(DEPTH);
    bgGfx.fillStyle(0x333333, 1);
    bgGfx.fillRoundedRect(BAR_X, HP_Y - BAR_H / 2, BAR_W, BAR_H, 3);
    bgGfx.fillRoundedRect(BAR_X, ST_Y - BAR_H / 2, BAR_W, BAR_H, 3);

    // Barres de remplissage (Rectangle dont on ajuste la taille)
    this._hpBar = this._scene.add.rectangle(BAR_X, HP_Y, BAR_W, BAR_H, 0xe84040)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(DEPTH);

    this._stBar = this._scene.add.rectangle(BAR_X, ST_Y, BAR_W, BAR_H, 0x44dd55)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(DEPTH);

    // Valeurs texte
    this._hpText = this._scene.add.text(BAR_X + BAR_W + 6, HP_Y, '', {
      fontFamily: 'monospace', fontSize: '11px', color: '#ffaaaa',
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(DEPTH);

    this._stText = this._scene.add.text(BAR_X + BAR_W + 6, ST_Y, '', {
      fontFamily: 'monospace', fontSize: '11px', color: '#aaffbb',
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(DEPTH);
  }

  _buildInventoryUI() {
    // Fond de l'inventaire
    const panelPad = 6;
    this._scene.add.rectangle(
      WIDTH / 2, INV_Y,
      INV_W + panelPad * 2, SLOT_SIZE + panelPad * 2,
      0x000000, 0.55
    ).setScrollFactor(0).setDepth(DEPTH);

    // Slots
    this._slotBgs   = [];  // fonds (Rectangle)
    this._slotIcons = [];  // icônes (Image)
    this._slotKeys  = [];  // labels 1-8 (Text)

    for (let i = 0; i < SLOT_COUNT; i++) {
      const sx = INV_X + i * (SLOT_SIZE + SLOT_GAP);

      // Fond du slot
      const bg = this._scene.add.rectangle(sx, INV_Y, SLOT_SIZE, SLOT_SIZE, 0x223344)
        .setStrokeStyle(1, 0x445566)
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH);
      this._slotBgs.push(bg);

      // Icône de l'item (invisible si slot vide)
      const icon = this._scene.add.image(sx + SLOT_SIZE / 2, INV_Y, 'icon_bat')
        .setDisplaySize(SLOT_SIZE - 8, SLOT_SIZE - 8)
        .setScrollFactor(0)
        .setDepth(DEPTH + 1)
        .setVisible(false);
      this._slotIcons.push(icon);

      // Chiffre du slot
      this._scene.add.text(sx + 3, INV_Y - SLOT_SIZE / 2 + 2, String(i + 1), {
        fontFamily: 'monospace', fontSize: '9px', color: '#445566',
      }).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 1);
    }
  }

  _buildExhaustedLabel() {
    this._exhaustedLabel = this._scene.add.text(WIDTH / 2, HEIGHT - 100, '⚡ ÉPUISÉ', {
      fontFamily: 'monospace',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ff5500',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2).setVisible(false);
  }

  // ── Mise à jour ────────────────────────────────────────────────────────────

  /**
   * Appelé chaque frame depuis GameScene.update().
   */
  update() {
    const stats = this._player.stats;
    const inv   = this._player.inventory;

    this._updateBars(stats);
    this._updateInventorySlots(inv);
    this._updateExhausted(stats);
  }

  _updateBars(stats) {
    // Vie
    const hpW = Math.max(0, BAR_W * stats.healthPercent);
    this._hpBar.setSize(hpW, BAR_H);
    this._hpText.setText(`${Math.ceil(stats.health)}/${stats.maxHealth}`);

    // Couleur santé : vert → orange → rouge selon niveau
    const hp = stats.healthPercent;
    const hpColor = hp > 0.5 ? 0xe84040 : hp > 0.25 ? 0xff8800 : 0xff2200;
    this._hpBar.setFillStyle(hpColor);

    // Endurance
    const stW = Math.max(0, BAR_W * stats.staminaPercent);
    this._stBar.setSize(stW, BAR_H);
    this._stText.setText(`${Math.ceil(stats.stamina)}/${stats.maxStamina}`);

    // Couleur endurance : vert → jaune → orange
    const st = stats.staminaPercent;
    const stColor = st > 0.5 ? 0x44dd55 : st > 0.25 ? 0xdddd22 : 0xff8800;
    this._stBar.setFillStyle(stColor);
  }

  _updateInventorySlots(inv) {
    inv.slots.forEach((item, i) => {
      const isActive = i === inv.activeSlot;
      const bg   = this._slotBgs[i];
      const icon = this._slotIcons[i];

      // Mise en évidence du slot actif
      if (isActive) {
        bg.setFillStyle(0x334466).setStrokeStyle(2, 0xffd700);
      } else {
        bg.setFillStyle(0x223344).setStrokeStyle(1, 0x445566);
      }

      // Icône
      if (item) {
        icon.setTexture(item.icon).setVisible(true);
      } else {
        icon.setVisible(false);
      }
    });
  }

  _updateExhausted(stats) {
    this._exhaustedLabel.setVisible(stats.isExhausted);
    // Clignotement via alpha oscillant
    if (stats.isExhausted) {
      this._exhaustedLabel.setAlpha(
        0.5 + 0.5 * Math.sin(this._scene.time.now / 200)
      );
    }
  }
}
