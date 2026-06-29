/**
 * Rat.js
 * Ennemi rapide et faible du donjon.
 * Stats : 30 HP, très rapide, peu de dégâts.
 */

const STATS = {
  hp:       30,
  speed:    140,
  damage:   8,
  cooldown: 500,
  detect:   260,
  range:    30,
  hitbox:   8,
};

export class Rat extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'rat_walk_0');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this._isDead   = false;
    this._hp       = STATS.hp;
    this._cooldown = 0;
    this._state    = 'idle';

    this._patrolTimer = 0;
    this._patrolAngle = Math.random() * Math.PI * 2;

    this.body.setCircle(
      STATS.hitbox,
      this.width  / 2 - STATS.hitbox,
      this.height / 2 - STATS.hitbox
    );
    this.body.setCollideWorldBounds(true);
    this.setDepth(6).setScale(0.7);

    this._setupAnims(scene);
  }

  get isDead() { return this._isDead; }

  _setupAnims(scene) {
    if (scene.anims.exists('rat-walk')) return;

    scene.anims.create({
      key: 'rat-walk',
      frames: [
        { key: 'rat_walk_0' }, { key: 'rat_walk_1' },
        { key: 'rat_walk_2' }, { key: 'rat_walk_3' },
      ],
      frameRate: 10,
      repeat: -1,
    });

    scene.anims.create({
      key: 'rat-atk',
      frames: [{ key: 'rat_atk_0' }, { key: 'rat_atk_1' }],
      frameRate: 8,
      repeat: -1,
    });
  }

  update(delta, player) {
    if (this._isDead) return;

    if (this._cooldown > 0) this._cooldown -= delta;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    if (dist <= STATS.range)       this._state = 'attack';
    else if (dist <= STATS.detect) this._state = 'chase';
    else                           this._state = 'idle';

    switch (this._state) {
      case 'attack': this._attack(player);  break;
      case 'chase':  this._chase(player);   break;
      default:       this._idle(delta);     break;
    }
  }

  _idle(delta) {
    this._patrolTimer -= delta;
    if (this._patrolTimer <= 0) {
      this._patrolTimer = 2000 + Math.random() * 2000;
      this._patrolAngle = Math.random() * Math.PI * 2;
    }
    const sp = STATS.speed * 0.25;
    this.body.setVelocity(
      Math.cos(this._patrolAngle) * sp,
      Math.sin(this._patrolAngle) * sp
    );
    this.rotation = this._patrolAngle + Math.PI / 2;
    this.play('rat-walk', true);
  }

  _chase(player) {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.rotation = angle + Math.PI / 2;
    this.body.setVelocity(
      Math.cos(angle) * STATS.speed,
      Math.sin(angle) * STATS.speed
    );
    this.play('rat-walk', true);
  }

  _attack(player) {
    this.body.setVelocity(0, 0);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.rotation = angle + Math.PI / 2;
    this.play('rat-atk', true);

    if (this._cooldown <= 0) {
      this._cooldown = STATS.cooldown;
      player.takeDamage(STATS.damage);
    }
  }

  takeDamage(amount) {
    if (this._isDead) return;
    this._hp -= amount;

    this.setTint(0xff4444);
    this.scene.time.delayedCall(100, () => {
      if (!this._isDead) this.clearTint();
    });

    if (this._hp <= 0) this._die();
  }

  _die() {
    this._isDead = true;
    this.body.enable = false;
    this.body.setVelocity(0, 0);

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0,
      scaleY: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => this.destroy(),
    });
  }
}
