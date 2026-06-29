/**
 * Boss.js
 * Créature spéciale apparaissant à partir du Jour 5 (chaque nuit).
 *
 * Stats : 800 HP, lent mais dévastateur.
 * Phases :
 *   HP > 50% → poursuite normale
 *   HP ≤ 50% → charge activée (tous les 8 s, 3× vitesse, 150% dégâts)
 *
 * Mort → lâche la Clé des Égouts, puis appelle le callback onDeath.
 *
 * États AI : idle → chase → attack → charging → dead
 */

import { SewerKey } from './items/SewerKey.js';

const STATS = {
  hp:       800,
  speed:    58,
  damage:   40,
  cooldown: 1500,  // ms entre deux attaques normales
  detect:   420,   // rayon de détection
  range:    58,    // rayon d'attaque au corps à corps
  hitbox:   20,
};

const CHARGE_INTERVAL = 8000;   // ms entre deux charges
const CHARGE_SPEED    = 230;    // vitesse pendant la charge
const CHARGE_DURATION = 1200;   // durée de la charge en ms

export class Boss extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {Phaser.GameObjects.Group} worldItems
   * @param {Function} onDeath
   */
  constructor(scene, x, y, worldItems, onDeath) {
    super(scene, x, y, 'boss_walk_0');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this._worldItems = worldItems;
    this._onDeath    = onDeath;
    this._isDead     = false;

    // Stats live
    this._hp      = STATS.hp;
    this._cooldown = 0;
    this._state    = 'idle';

    // Charge
    this._chargeTimer    = CHARGE_INTERVAL;
    this._chargeDuration = 0;
    this._charging       = false;

    // Patrouille
    this._patrolTimer = 0;
    this._patrolAngle = Math.random() * Math.PI * 2;

    // Cooldown attaque de mur (indépendant du cooldown joueur)
    this._wallDmgCooldown = 0;

    // Physique
    this.body.setCircle(
      STATS.hitbox,
      this.width  / 2 - STATS.hitbox,
      this.height / 2 - STATS.hitbox
    );
    this.body.setCollideWorldBounds(true);
    this.setDepth(10).setScale(1.5);

    // Barre de vie large (boss)
    this._hpBar = scene.add.graphics().setDepth(13);

    // Aura violette pulsée
    this._aura = scene.add.graphics().setDepth(9);

    // Apparition dramatique : scale 0 → 1.5
    this.setScale(0).setAlpha(0);
    scene.tweens.add({
      targets: this,
      alpha: 1, scaleX: 1.5, scaleY: 1.5,
      duration: 600,
      ease: 'Back.Out',
    });

    this._setupAnims(scene);
  }

  get isDead() { return this._isDead; }

  // ── Animations ──────────────────────────────────────────────────────────────

  _setupAnims(scene) {
    if (scene.anims.exists('boss-walk')) return;

    scene.anims.create({
      key: 'boss-walk',
      frames: [
        { key: 'boss_walk_0' }, { key: 'boss_walk_1' },
        { key: 'boss_walk_2' }, { key: 'boss_walk_3' },
      ],
      frameRate: 5,
      repeat: -1,
    });

    scene.anims.create({
      key: 'boss-atk',
      frames: [{ key: 'boss_atk_0' }, { key: 'boss_atk_1' }],
      frameRate: 4,
      repeat: -1,
    });
  }

  // ── Boucle principale ────────────────────────────────────────────────────────

  /**
   * @param {number} delta
   * @param {Player} player
   * @param {boolean} isNight
   */
  update(delta, player, isNight) {
    if (this._isDead) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    if (!isNight) {
      this._idle(delta);
      this._drawHpBar();
      this._drawAura();
      return;
    }

    this._updateCooldowns(delta);
    this._updateState(dist);
    this._execute(dist, player, delta);
    this._drawHpBar();
    this._drawAura();
  }

  _updateCooldowns(delta) {
    if (this._cooldown > 0)        this._cooldown        -= delta;
    if (this._wallDmgCooldown > 0) this._wallDmgCooldown -= delta;

    if (this._charging) {
      this._chargeDuration -= delta;
      if (this._chargeDuration <= 0) {
        // Fin de charge
        this._charging = false;
        this._chargeTimer = CHARGE_INTERVAL;
        this.clearTint();
      }
    } else {
      if (this._chargeTimer > 0) this._chargeTimer -= delta;
    }
  }

  _updateState(dist) {
    if (this._charging) return; // la charge override l'état
    if (dist <= STATS.range)         this._state = 'attack';
    else if (dist <= STATS.detect)   this._state = 'chase';
    else                             this._state = 'idle';
  }

  _execute(dist, player, delta) {
    if (this._charging) { this._doCharge(player); return; }

    switch (this._state) {
      case 'attack': this._attack(player);        break;
      case 'chase':  this._chase(player, delta);  break;
      default:       this._idle(delta);            break;
    }
  }

  // ── États ─────────────────────────────────────────────────────────────────

  _idle(delta) {
    this._patrolTimer -= delta;
    if (this._patrolTimer <= 0) {
      this._patrolTimer = 3000 + Math.random() * 3000;
      this._patrolAngle = Math.random() * Math.PI * 2;
    }
    const sp = STATS.speed * 0.18;
    this.body.setVelocity(
      Math.cos(this._patrolAngle) * sp,
      Math.sin(this._patrolAngle) * sp
    );
    this.rotation = this._patrolAngle + Math.PI / 2;
    this.play('boss-walk', true);
  }

  _chase(player, delta) {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.rotation = angle + Math.PI / 2;
    this.body.setVelocity(
      Math.cos(angle) * STATS.speed,
      Math.sin(angle) * STATS.speed
    );
    this.play('boss-walk', true);

    // Déclenche la charge si HP ≤ 50% et timer prêt
    if (this._chargeTimer <= 0 && !this._charging && this._hp <= STATS.hp * 0.5) {
      this._startCharge(angle);
    }
  }

  _startCharge(angle) {
    this._charging       = true;
    this._chargeDuration = CHARGE_DURATION;
    this.setTint(0xff3300);

    // Flash rouge sur la caméra
    this.scene.cameras.main.flash(180, 100, 0, 0, true);

    // Cercle d'onde de choc visuel
    const ring = this.scene.add.graphics().setDepth(9);
    ring.lineStyle(5, 0xff2200, 1);
    ring.strokeCircle(this.x, this.y, 36);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0, scaleX: 2.5, scaleY: 2.5,
      duration: 450,
      onComplete: () => ring.destroy(),
    });
  }

  _doCharge(player) {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.rotation = angle + Math.PI / 2;
    this.body.setVelocity(
      Math.cos(angle) * CHARGE_SPEED,
      Math.sin(angle) * CHARGE_SPEED
    );
    this.play('boss-walk', true);

    // Impact de charge si le boss touche le joueur
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (dist <= STATS.range * 1.4 && this._cooldown <= 0) {
      this._cooldown = STATS.cooldown;
      player.takeDamage(Math.round(STATS.damage * 1.5));
      this.scene.cameras.main.shake(300, 0.022);
    }
  }

  _attack(player) {
    this.body.setVelocity(0, 0);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.rotation = angle + Math.PI / 2;
    this.play('boss-atk', true);

    if (this._cooldown <= 0) {
      this._cooldown = STATS.cooldown;
      player.takeDamage(STATS.damage);
      this.scene.cameras.main.shake(240, 0.015);

      // Onde de frappe visuelle
      const ring = this.scene.add.graphics().setDepth(9);
      ring.lineStyle(4, 0x880000, 0.9);
      ring.strokeCircle(this.x, this.y, 28);
      this.scene.tweens.add({
        targets: ring,
        alpha: 0, scaleX: 2, scaleY: 2,
        duration: 380,
        onComplete: () => ring.destroy(),
      });
    }
  }

  // ── Interaction murs ─────────────────────────────────────────────────────────

  onWallCollision(wall) {
    if (this._isDead || !wall?.scene) return;
    if (this._wallDmgCooldown > 0)    return;
    this._wallDmgCooldown = 1200;
    // Le boss détruit les murs plus vite
    wall.takeDamage(Math.round(STATS.damage * 1.5));
  }

  // ── Dégâts & mort ────────────────────────────────────────────────────────────

  takeDamage(amount) {
    if (this._isDead) return;
    this._hp -= amount;

    // Flash rouge bref
    this.setTint(0xff0000);
    this.scene.time.delayedCall(150, () => {
      if (!this._isDead) {
        this._charging ? this.setTint(0xff3300) : this.clearTint();
      }
    });

    // Numéro de dégâts (plus grand pour le boss)
    const t = this.scene.add.text(this.x, this.y - 32, `-${amount}`, {
      fontFamily: 'monospace', fontSize: '17px', fontStyle: 'bold',
      color: '#ffaa00', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);
    this.scene.tweens.add({
      targets: t, y: t.y - 38, alpha: 0, duration: 1000,
      ease: 'Power2', onComplete: () => t.destroy(),
    });

    if (this._hp <= 0) this._die();
  }

  _die() {
    this._isDead = true;
    this.body.enable = false;
    this.body.setVelocity(0, 0);
    this._hpBar.destroy();
    this._aura.destroy();

    // Explosion violette en anneaux
    for (let i = 0; i < 7; i++) {
      const ring = this.scene.add.graphics().setDepth(16);
      ring.fillStyle(0x660099, 0.65);
      ring.fillCircle(this.x, this.y, 18);
      this.scene.tweens.add({
        targets: ring,
        scaleX: 3.5 + i * 0.6, scaleY: 3.5 + i * 0.6,
        alpha: 0,
        delay: i * 90,
        duration: 550,
        ease: 'Power2',
        onComplete: () => ring.destroy(),
      });
    }

    // Secousse de caméra forte
    this.scene.cameras.main.shake(600, 0.035);

    this.scene.tweens.add({
      targets: this,
      alpha: 0, angle: this.angle + 200,
      scaleX: 0.15, scaleY: 0.15,
      duration: 900,
      ease: 'Power3',
      onComplete: () => {
        this._dropLoot();
        this._onDeath?.();
        this.destroy();
      },
    });
  }

  _dropLoot() {
    if (!this._worldItems) return;

    const sprite = this.scene.add.image(this.x, this.y, 'sewer_key_world')
      .setDepth(4)
      .setData('item', new SewerKey());

    // Flottement lent + pulsation alpha pour la clé
    this.scene.tweens.add({
      targets: sprite, y: sprite.y - 7,
      duration: 900, ease: 'Sine.inOut', yoyo: true, repeat: -1,
    });
    this.scene.tweens.add({
      targets: sprite, alpha: 0.45,
      duration: 600, ease: 'Sine.inOut', yoyo: true, repeat: -1,
    });

    this._worldItems.add(sprite);
  }

  // ── Rendu HUD boss ──────────────────────────────────────────────────────────

  _drawHpBar() {
    this._hpBar.clear();
    if (this._isDead) return;

    const W   = 64;
    const H   = 8;
    const bx  = this.x - W / 2;
    const by  = this.y - this.displayHeight * 0.6 - 12;
    const pct = Math.max(0, this._hp / STATS.hp);

    // Fond sombre
    this._hpBar.fillStyle(0x111111, 0.9);
    this._hpBar.fillRect(bx - 1, by - 1, W + 2, H + 2);

    // Couleur violette dégradée selon HP
    const col = pct > 0.5 ? 0x9900cc : pct > 0.25 ? 0xcc0088 : 0xff0000;
    this._hpBar.fillStyle(col, 1);
    this._hpBar.fillRect(bx, by, W * pct, H);

    // Bordure violette
    this._hpBar.lineStyle(1, 0xcc00ff, 0.85);
    this._hpBar.strokeRect(bx - 1, by - 1, W + 2, H + 2);
  }

  _drawAura() {
    this._aura.clear();
    if (this._isDead) return;

    const t     = this.scene.time.now;
    const pulse = 0.25 + 0.18 * Math.sin(t / 280);
    this._aura.lineStyle(3, 0x8800cc, pulse);
    this._aura.strokeCircle(this.x, this.y, 30);

    // Deuxième anneau décalé pour effet
    const pulse2 = 0.15 + 0.12 * Math.sin(t / 180 + 1);
    this._aura.lineStyle(2, 0xff00ff, pulse2);
    this._aura.strokeCircle(this.x, this.y, 40);
  }

  // Nettoyage
  destroy(fromScene) {
    this._hpBar?.destroy();
    this._aura?.destroy();
    super.destroy(fromScene);
  }
}
