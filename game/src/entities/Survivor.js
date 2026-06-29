/**
 * Survivor.js
 * Survivant PNJ — apparaît à l'étal, achète de la nourriture, repart.
 *
 * États : appearing → waiting → buying → leaving → done
 */

export class Survivor {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {Player} player
   * @param {Function} onDone - callback appelé quand le survivant est parti
   */
  constructor(scene, x, y, player, onDone) {
    this._scene  = scene;
    this._player = player;
    this._onDone = onDone;
    this._done   = false;

    // Sprite
    this._sprite = scene.add.image(x, y, 'survivor').setDepth(11).setScale(0.05);

    // Bulle de dialogue
    this._bubble = scene.add.text(x, y - 58, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#ffffff',
      backgroundColor: '#1a1a3388',
      padding: { x: 7, y: 5 },
      align: 'center',
    }).setOrigin(0.5, 1).setDepth(22).setVisible(false);

    // Pop-in
    scene.tweens.add({
      targets: this._sprite,
      scale: 1,
      duration: 280,
      ease: 'Back.Out',
      onComplete: () => this._appear(),
    });
  }

  get isDone() { return this._done; }

  // ── États ─────────────────────────────────────────────────────────────────

  _appear() {
    this._bubble.setText('Bonjour !\nJe cherche a manger...').setVisible(true);
    this._scene.time.delayedCall(1800, () => this._tryBuy());
  }

  _tryBuy() {
    const inv  = this._player.inventory;
    const slot = inv.findFirstByType('food');

    if (!slot) {
      this._bubble.setText('Dommage...\nRien a acheter.');
      this._scene.time.delayedCall(1500, () => this._leave());
      return;
    }

    const food  = slot.item;
    const price = food.sellPrice;
    inv.removeByKey(food.key, 1);
    this._player.stats.addCoins(price);

    this._bubble.setText(`Merci beaucoup !\n${food.name} - ${price} pieces`);

    // Texte de gain flottant (dans le monde, au-dessus du survivant)
    const fx = this._scene.add.text(
      this._sprite.x, this._sprite.y - 70,
      `+${price} pieces !`, {
        fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold',
        color: '#ffdd33', stroke: '#000000', strokeThickness: 3,
      }
    ).setOrigin(0.5).setDepth(25);
    this._scene.tweens.add({
      targets: fx, y: fx.y - 30, alpha: 0, duration: 1400,
      ease: 'Power2', onComplete: () => fx.destroy(),
    });

    this._scene.time.delayedCall(2200, () => this._leave());
  }

  _leave() {
    this._bubble?.destroy();
    this._bubble = null;

    this._scene.tweens.add({
      targets: this._sprite,
      scale: 0.05,
      alpha: 0,
      duration: 280,
      ease: 'Back.In',
      onComplete: () => {
        this._sprite?.destroy();
        this._done = true;
        this._onDone?.();
      },
    });
  }
}
