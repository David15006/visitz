/**
 * DungeonObjects.js
 * Objets interactifs du donjon : pièges, leviers, portes.
 */

// ── Piège à piques ─────────────────────────────────────────────────────────────

export class Trap {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {number} [damage=20]
   */
  constructor(scene, x, y, damage = 20) {
    this._scene   = scene;
    this._damage  = damage;
    this._active  = true;   // true = visible mais inactif, active sur entrée
    this._armed   = true;
    this._cooldown = 0;

    // Sprite du sol (pressure plate)
    this._sprite = scene.add.image(x, y, 'trap_off').setDepth(2);

    // Physique statique pour la détection
    this._zone = scene.add.zone(x, y, 28, 28);
    scene.physics.world.enable(this._zone, Phaser.Physics.Arcade.STATIC_BODY);
  }

  get sprite() { return this._sprite; }
  get zone()   { return this._zone; }

  /** Appelé chaque frame par DungeonScene pour vérifier le joueur. */
  update(delta, player) {
    if (this._cooldown > 0) {
      this._cooldown -= delta;
      if (this._cooldown <= 0) {
        this._armed = true;
        this._sprite.setTexture('trap_off');
      }
      return;
    }

    const dist = Phaser.Math.Distance.Between(
      this._sprite.x, this._sprite.y, player.x, player.y
    );
    if (dist < 24 && this._armed) {
      this._trigger(player);
    }
  }

  _trigger(player) {
    this._armed    = false;
    this._cooldown = 3000;
    this._sprite.setTexture('trap_on');

    player.takeDamage(this._damage);

    // Effet visuel : flash rouge et secousse caméra légère
    this._scene.cameras.main.shake(180, 0.008);

    const flash = this._scene.add.graphics().setDepth(20).setScrollFactor(0);
    flash.fillStyle(0xff0000, 0.35);
    flash.fillRect(0, 0, this._scene.scale.width, this._scene.scale.height);
    this._scene.tweens.add({
      targets: flash, alpha: 0, duration: 300,
      onComplete: () => flash.destroy(),
    });

    // Particules de sang stylisées
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const r = 12 + Math.random() * 16;
      const dot = this._scene.add.graphics().setDepth(8);
      dot.fillStyle(0xcc0000, 1);
      dot.fillCircle(
        this._sprite.x + Math.cos(angle) * 8,
        this._sprite.y + Math.sin(angle) * 8,
        3
      );
      this._scene.tweens.add({
        targets: dot,
        x: dot.x + Math.cos(angle) * r,
        y: dot.y + Math.sin(angle) * r,
        alpha: 0,
        duration: 400,
        onComplete: () => dot.destroy(),
      });
    }
  }

  destroy() {
    this._sprite.destroy();
    this._zone.destroy();
  }
}

// ── Levier ────────────────────────────────────────────────────────────────────

export class Lever {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {Function} onActivate  - appelé quand le joueur actionne le levier
   * @param {string}   [label=''] - lettre/numéro affiché au-dessus
   */
  constructor(scene, x, y, onActivate, label = '') {
    this._scene      = scene;
    this._onActivate = onActivate;
    this._pulled     = false;

    this._sprite = scene.add.image(x, y, 'lever_up').setDepth(4);

    // Texte hint
    this._hint = scene.add.text(x, y - 24, label ? `[${label}]` : '[E]', {
      fontFamily: 'monospace', fontSize: '11px', color: '#ffdd88',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(5).setAlpha(0);
  }

  get x()       { return this._sprite.x; }
  get y()       { return this._sprite.y; }
  get isPulled(){ return this._pulled; }

  /** Affiche/masque le hint selon proximité. */
  update(player) {
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    this._hint.setAlpha(dist < 50 ? 1 : 0);
  }

  /** Appuyer sur le levier. Retourne true si bascule réussie. */
  pull() {
    if (this._pulled) return false;
    this._pulled = true;
    this._sprite.setTexture('lever_down');

    // Flash doré
    const ring = this._scene.add.graphics().setDepth(6);
    ring.lineStyle(3, 0xffcc00, 1);
    ring.strokeCircle(this.x, this.y, 20);
    this._scene.tweens.add({
      targets: ring, alpha: 0, scaleX: 2, scaleY: 2, duration: 400,
      onComplete: () => ring.destroy(),
    });

    this._onActivate?.();
    return true;
  }

  /** Réinitialise le levier (puzzle raté). */
  reset() {
    this._pulled = false;
    this._sprite.setTexture('lever_up');
  }

  destroy() {
    this._sprite.destroy();
    this._hint.destroy();
  }
}

// ── Porte de donjon ───────────────────────────────────────────────────────────

export class DungeonDoor {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {'h'|'v'} orientation  - horizontal ou vertical
   */
  constructor(scene, x, y, orientation = 'h') {
    this._scene  = scene;
    this._open   = false;

    // Corps physique statique (bloque le passage)
    this._body = scene.add.image(x, y, 'dungeon_door_h')
      .setDepth(5)
      .setTint(orientation === 'h' ? 0xaa6622 : 0x886611);

    scene.physics.add.existing(this._body, true);

    if (orientation === 'v') {
      this._body.setAngle(90);
    }
  }

  get body()   { return this._body; }
  get isOpen() { return this._open; }

  open() {
    if (this._open) return;
    this._open = true;

    this._scene.tweens.add({
      targets: this._body,
      alpha: 0,
      scaleX: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        if (this._body?.body) this._body.body.enable = false;
      },
    });

    // Effet sonore visuel
    const ring = this._scene.add.graphics().setDepth(6);
    ring.lineStyle(3, 0xffaa00, 1);
    ring.strokeRect(this._body.x - 20, this._body.y - 8, 40, 16);
    this._scene.tweens.add({
      targets: ring, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 500,
      onComplete: () => ring.destroy(),
    });
  }

  destroy() {
    this._body.destroy();
  }
}
