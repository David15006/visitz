/**
 * Wall.js
 * Segment de mur avec points de vie.
 * Cassable par les zombies, réparable par le joueur.
 */

export class Wall extends Phaser.Physics.Arcade.Image {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x       centre
   * @param {number} y       centre
   * @param {boolean} horizontal - true = 64×16, false = 16×64
   * @param {number} maxHp
   */
  constructor(scene, x, y, horizontal = true, maxHp = 120) {
    super(scene, x, y, horizontal ? 'wall_h' : 'wall_v');

    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body

    const [bw, bh] = horizontal ? [64, 16] : [16, 64];
    this.body.setSize(bw, bh);
    this.setDepth(8);

    this._horizontal = horizontal;
    this._maxHp      = maxHp;
    this._hp         = maxHp;
    this._wallDmgCooldown = 0; // ms avant de pouvoir être refrappé par un zombie

    this._hpBar = scene.add.graphics().setDepth(9);
    this._refreshVisual();
  }

  // ── Mise à jour ──────────────────────────────────────────────────────────

  update(delta) {
    if (this._wallDmgCooldown > 0) this._wallDmgCooldown -= delta;
    this._drawHpBar();
  }

  // ── Dégâts / réparation ──────────────────────────────────────────────────

  takeDamage(amount) {
    if (this._hp <= 0) return;
    this._hp = Math.max(0, this._hp - amount);
    this._refreshVisual();
    if (this._hp <= 0) this._crumble();
  }

  /**
   * @param {number} amount
   * @returns {boolean} true si la réparation a eu effet
   */
  repair(amount) {
    if (this._hp <= 0 || this._hp >= this._maxHp) return false;
    this._hp = Math.min(this._maxHp, this._hp + amount);
    this._refreshVisual();
    return true;
  }

  // ── Accesseurs ───────────────────────────────────────────────────────────

  get hp()          { return this._hp; }
  get maxHp()       { return this._maxHp; }
  get isDestroyed() { return this._hp <= 0; }
  get wallDmgCooldown() { return this._wallDmgCooldown; }
  set wallDmgCooldown(v) { this._wallDmgCooldown = v; }

  // ── Visuels ──────────────────────────────────────────────────────────────

  _refreshVisual() {
    const pct = this._hp / this._maxHp;
    if (pct > 0.75) this.clearTint();
    else if (pct > 0.5) this.setTint(0xffcc88);
    else if (pct > 0.25) this.setTint(0xff7733);
    else this.setTint(0xff2200);
  }

  _drawHpBar() {
    this._hpBar?.clear();
    if (!this._hpBar || this._hp >= this._maxHp || this._hp <= 0) return;

    const W   = 40, H = 4;
    const bx  = this.x - W / 2;
    const by  = this.y - (this._horizontal ? 18 : this.height * 0.5 + 10);
    const pct = this._hp / this._maxHp;

    this._hpBar.fillStyle(0x222222, 0.85);
    this._hpBar.fillRect(bx, by, W, H);

    const col = pct > 0.5 ? 0x44ee44 : pct > 0.25 ? 0xeebb22 : 0xee2222;
    this._hpBar.fillStyle(col, 1);
    this._hpBar.fillRect(bx, by, W * pct, H);
  }

  _crumble() {
    if (this.body) this.body.enable = false;
    this._hpBar?.destroy();
    this._hpBar = null;

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: this._horizontal ? 1.2 : 0.1,
      scaleY: this._horizontal ? 0.1 : 1.2,
      duration: 500,
      ease: 'Power2',
      onComplete: () => this.destroy(),
    });
  }

  destroy(fromScene) {
    this._hpBar?.destroy();
    this._hpBar = null;
    super.destroy(fromScene);
  }
}
