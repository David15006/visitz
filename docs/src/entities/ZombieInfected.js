/**
 * ZombieInfected.js
 * Zombie lent qui applique un poison au joueur lors de ses attaques.
 * Émet l'événement scène 'player-infected' (durée ms) à chaque coup.
 */

const STATS = {
  hp:       150,
  speed:    55,
  damage:   25,
  cooldown: 1800,
  detect:   320,
  range:    38,
  hitbox:   12,
};

export class ZombieInfected extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'zi_walk_0');

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
    this.setDepth(6).setScale(1.1);

    // Aura toxique
    this._aura = scene.add.graphics().setDepth(5);

    this._setupAnims(scene);
  }

  get isDead() { return this._isDead; }

  _setupAnims(scene) {
    if (scene.anims.exists('zi-walk')) return;

    scene.anims.create({
      key: 'zi-walk',
      frames: [
        { key: 'zi_walk_0' }, { key: 'zi_walk_1' },
        { key: 'zi_walk_2' }, { key: 'zi_walk_3' },
      ],
      frameRate: 4,
      repeat: -1,
    });

    scene.anims.create({
      key: 'zi-atk',
      frames: [{ key: 'zi_atk_0' }, { key: 'zi_atk_1' }],
      frameRate: 3,
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

    this._drawAura();
  }

  _idle(delta) {
    this._patrolTimer -= delta;
    if (this._patrolTimer <= 0) {
      this._patrolTimer = 3000 + Math.random() * 3000;
      this._patrolAngle = Math.random() * Math.PI * 2;
    }
    const sp = STATS.speed * 0.2;
    this.body.setVelocity(
      Math.cos(this._patrolAngle) * sp,
      Math.sin(this._patrolAngle) * sp
    );
    this.rotation = this._patrolAngle + Math.PI / 2;
    this.play('zi-walk', true);
  }

  _chase(player) {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.rotation = angle + Math.PI / 2;
    this.body.setVelocity(
      Math.cos(angle) * STATS.speed,
      Math.sin(angle) * STATS.speed
    );
    this.play('zi-walk', true);
  }

  _attack(player) {
    this.body.setVelocity(0, 0);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.rotation = angle + Math.PI / 2;
    this.play('zi-atk', true);

    if (this._cooldown <= 0) {
      this._cooldown = STATS.cooldown;
      player.takeDamage(STATS.damage);
      // Appliquer le poison
      this.scene.events.emit('player-infected', 5000);

      // Nuage toxique
      const cloud = this.scene.add.graphics().setDepth(7);
      cloud.fillStyle(0x44ff44, 0.5);
      cloud.fillCircle(player.x, player.y, 22);
      this.scene.tweens.add({
        targets: cloud,
        alpha: 0, scaleX: 2, scaleY: 2,
        duration: 500,
        onComplete: () => cloud.destroy(),
      });
    }
  }

  takeDamage(amount) {
    if (this._isDead) return;
    this._hp -= amount;

    this.setTint(0xffff44);
    this.scene.time.delayedCall(120, () => {
      if (!this._isDead) this.clearTint();
    });

    // Numéro de dégâts
    const t = this.scene.add.text(this.x, this.y - 24, `-${amount}`, {
      fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold',
      color: '#00ff88', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(20);
    this.scene.tweens.add({
      targets: t, y: t.y - 30, alpha: 0, duration: 800,
      onComplete: () => t.destroy(),
    });

    if (this._hp <= 0) this._die();
  }

  _die() {
    this._isDead = true;
    this.body.enable = false;
    this.body.setVelocity(0, 0);
    this._aura.destroy();

    // Explosion toxique
    for (let i = 0; i < 4; i++) {
      const ring = this.scene.add.graphics().setDepth(8);
      ring.fillStyle(0x00cc44, 0.5);
      ring.fillCircle(this.x, this.y, 14);
      this.scene.tweens.add({
        targets: ring,
        scaleX: 2.5 + i * 0.4, scaleY: 2.5 + i * 0.4,
        alpha: 0,
        delay: i * 80,
        duration: 450,
        onComplete: () => ring.destroy(),
      });
    }

    this.scene.tweens.add({
      targets: this,
      alpha: 0, scaleX: 0, scaleY: 0,
      duration: 500,
      onComplete: () => this.destroy(),
    });
  }

  _drawAura() {
    this._aura.clear();
    if (this._isDead) return;
    const t     = this.scene.time.now;
    const pulse = 0.2 + 0.15 * Math.sin(t / 250);
    this._aura.lineStyle(2, 0x00ff44, pulse);
    this._aura.strokeCircle(this.x, this.y, 22);
  }

  destroy(fromScene) {
    this._aura?.destroy();
    super.destroy(fromScene);
  }
}
