/**
 * RatKing.js
 * Roi des Rats — boss du donjon.
 *
 * Stats : 600 HP, modérément rapide.
 * Phases :
 *   Phase 1 (HP > 66%) : Poursuite + Charge + Zone
 *   Phase 2 (HP > 33%) : + Poison + Invocations plus fréquentes
 *   Phase 3 (HP ≤ 33%) : Enragé — tout plus rapide + double invocation
 *
 * Attaques :
 *   - charge     : dash vers le joueur (280 px/s, 900 ms)
 *   - poison     : nuage toxique à la position du joueur (AoE 80px)
 *   - summon     : invoque 2-4 rats
 *   - zone       : onde de choc circulaire depuis le boss
 */

import { FinalKey } from './items/FinalKey.js';

const STATS = {
  hp:       600,
  speed:    75,
  damage:   38,
  cooldown: 1600,
  detect:   600,
  range:    56,
  hitbox:   24,
};

const CHARGE_SPEED    = 280;
const CHARGE_DURATION = 900;
const CHARGE_INTERVAL = 5000;
const SUMMON_INTERVAL = { 1: 12000, 2: 8000, 3: 5000 };
const ATTACK_INTERVAL = { 1: 4500,  2: 3200, 3: 2000 };

export class RatKing extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {Phaser.GameObjects.Group} worldItems
   * @param {object} callbacks
   * @param {Function} callbacks.onSummonRats   (cx, cy, count)
   * @param {Function} callbacks.onPoisonHit    (duration ms)
   * @param {Function} callbacks.onPhaseChange  (phase 1|2|3)
   * @param {Function} callbacks.onDeath
   */
  constructor(scene, x, y, worldItems, { onSummonRats, onPoisonHit, onPhaseChange, onDeath } = {}) {
    super(scene, x, y, 'rk_walk_0');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this._worldItems     = worldItems;
    this._onSummonRats   = onSummonRats;
    this._onPoisonHit    = onPoisonHit;
    this._onPhaseChange  = onPhaseChange;
    this._onDeath        = onDeath;

    this._isDead  = false;
    this._hp      = STATS.hp;
    this._phase   = 1;
    this._state   = 'idle';
    this._cooldown = 0;

    // Timers d'attaque
    this._attackTimer  = ATTACK_INTERVAL[1];
    this._summonTimer  = SUMMON_INTERVAL[1];
    this._chargeTimer  = CHARGE_INTERVAL;

    // Charge
    this._charging       = false;
    this._chargeDuration = 0;
    this._chargeAngle    = 0;

    // Poison AoE actif
    this._poisonClouds = [];

    // Patrouille idle
    this._patrolTimer = 0;
    this._patrolAngle = Math.random() * Math.PI * 2;

    // Dégâts mur
    this._wallDmgCooldown = 0;

    // Physique
    this.body.setCircle(
      STATS.hitbox,
      this.width  / 2 - STATS.hitbox,
      this.height / 2 - STATS.hitbox
    );
    this.body.setCollideWorldBounds(true);
    this.setDepth(10).setScale(1.8);

    // Barre de vie de proximité (petite, au-dessus du sprite)
    this._hpBarGfx = scene.add.graphics().setDepth(13);

    // Aura de la couronne
    this._aura = scene.add.graphics().setDepth(9);

    // Couronne dorée
    this._crown = scene.add.image(x, y - 28, 'rat_crown').setDepth(14).setScale(1.2);

    // Apparition dramatique
    this.setScale(0).setAlpha(0);
    scene.tweens.add({
      targets: this,
      alpha: 1, scaleX: 1.8, scaleY: 1.8,
      duration: 800, ease: 'Back.Out',
    });

    this._setupAnims(scene);
  }

  get isDead() { return this._isDead; }
  get hp()     { return this._hp; }
  get phase()  { return this._phase; }

  // ── Animations ─────────────────────────────────────────────────────────────

  _setupAnims(scene) {
    if (scene.anims.exists('rk-walk')) return;

    scene.anims.create({
      key: 'rk-walk',
      frames: [
        { key: 'rk_walk_0' }, { key: 'rk_walk_1' },
        { key: 'rk_walk_2' }, { key: 'rk_walk_3' },
      ],
      frameRate: 7,
      repeat: -1,
    });

    scene.anims.create({
      key: 'rk-atk',
      frames: [{ key: 'rk_atk_0' }, { key: 'rk_atk_1' }],
      frameRate: 5,
      repeat: -1,
    });

    scene.anims.create({
      key: 'rk-charge',
      frames: [{ key: 'rk_charge_0' }, { key: 'rk_charge_1' }],
      frameRate: 12,
      repeat: -1,
    });
  }

  // ── Boucle ─────────────────────────────────────────────────────────────────

  update(delta, player) {
    if (this._isDead) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    this._updatePhase();
    this._updateCooldowns(delta);
    this._updatePoisonClouds(delta, player);
    this._updateState(dist);
    this._execute(dist, player, delta);
    this._drawHpBar();
    this._drawAura();

    // Couronne suit le boss
    if (this._crown) {
      this._crown.setPosition(this.x, this.y - this.displayHeight * 0.55);
    }
  }

  // ── Phase ──────────────────────────────────────────────────────────────────

  _updatePhase() {
    const pct   = this._hp / STATS.hp;
    const phase = pct > 0.66 ? 1 : pct > 0.33 ? 2 : 3;

    if (phase !== this._phase) {
      this._phase = phase;
      this._attackTimer = ATTACK_INTERVAL[phase];
      this._summonTimer = SUMMON_INTERVAL[phase];
      this._onPhaseChange?.(phase);
      this._playPhaseTransition(phase);
    }
  }

  _playPhaseTransition(phase) {
    const col = phase === 3 ? 0xff0000 : 0xff6600;
    this.scene.cameras.main.flash(300, (col >> 16) & 0xff, (col >> 8) & 0xff, col & 0xff, true);
    this.scene.cameras.main.shake(400, 0.018);

    // Onde de choc autour du boss
    for (let i = 0; i < 5; i++) {
      const ring = this.scene.add.graphics().setDepth(12);
      ring.lineStyle(4, col, 0.9);
      ring.strokeCircle(this.x, this.y, 32);
      this.scene.tweens.add({
        targets: ring,
        scaleX: 5 + i, scaleY: 5 + i,
        alpha: 0,
        delay: i * 100,
        duration: 600,
        onComplete: () => ring.destroy(),
      });
    }
  }

  // ── Cooldowns ──────────────────────────────────────────────────────────────

  _updateCooldowns(delta) {
    if (this._cooldown > 0)        this._cooldown        -= delta;
    if (this._wallDmgCooldown > 0) this._wallDmgCooldown -= delta;
    if (this._attackTimer > 0)     this._attackTimer     -= delta;
    if (this._summonTimer > 0)     this._summonTimer     -= delta;

    if (this._charging) {
      this._chargeDuration -= delta;
      if (this._chargeDuration <= 0) {
        this._charging = false;
        this._chargeTimer = CHARGE_INTERVAL;
        this.clearTint();
      }
    } else {
      if (this._chargeTimer > 0) this._chargeTimer -= delta;
    }
  }

  // ── State machine ──────────────────────────────────────────────────────────

  _updateState(dist) {
    if (this._charging) return;
    if (dist <= STATS.range)       this._state = 'attack';
    else if (dist <= STATS.detect) this._state = 'chase';
    else                           this._state = 'idle';
  }

  _execute(dist, player, delta) {
    if (this._charging) { this._doCharge(player); return; }

    // Attaque périodique
    if (this._attackTimer <= 0 && this._state === 'chase') {
      this._attackTimer = ATTACK_INTERVAL[this._phase];
      this._pickSpecialAttack(player);
    }

    // Invocation périodique
    if (this._summonTimer <= 0) {
      this._summonTimer = SUMMON_INTERVAL[this._phase];
      this._doSummon();
    }

    switch (this._state) {
      case 'attack': this._attack(player);       break;
      case 'chase':  this._chase(player, delta); break;
      default:       this._idle(delta);           break;
    }
  }

  // ── Attaques spéciales ─────────────────────────────────────────────────────

  _pickSpecialAttack(player) {
    const pool = ['charge', 'zone'];
    if (this._phase >= 2) pool.push('poison', 'poison');
    if (this._phase >= 3) pool.push('charge', 'zone');

    const pick = pool[Math.floor(Math.random() * pool.length)];

    switch (pick) {
      case 'charge':  this._startCharge(player); break;
      case 'poison':  this._startPoison(player); break;
      case 'zone':    this._startZone(player);   break;
    }
  }

  // ── Charge ─────────────────────────────────────────────────────────────────

  _startCharge(player) {
    if (this._charging) return;
    this._charging       = true;
    this._chargeDuration = CHARGE_DURATION;
    this._chargeAngle    = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.setTint(0xff2200);
    this.play('rk-charge', true);

    // Flash rouge caméra
    this.scene.cameras.main.flash(150, 80, 0, 0, true);

    // Onde de départ
    const ring = this.scene.add.graphics().setDepth(11);
    ring.lineStyle(5, 0xff3300, 1);
    ring.strokeCircle(this.x, this.y, 40);
    this.scene.tweens.add({
      targets: ring, alpha: 0, scaleX: 2.5, scaleY: 2.5, duration: 400,
      onComplete: () => ring.destroy(),
    });
  }

  _doCharge(player) {
    this.rotation = this._chargeAngle + Math.PI / 2;
    this.body.setVelocity(
      Math.cos(this._chargeAngle) * CHARGE_SPEED,
      Math.sin(this._chargeAngle) * CHARGE_SPEED
    );

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (dist <= STATS.range * 1.5 && this._cooldown <= 0) {
      this._cooldown = STATS.cooldown;
      player.takeDamage(Math.round(STATS.damage * 1.6));
      this.scene.cameras.main.shake(280, 0.02);
    }
  }

  // ── Poison AoE ─────────────────────────────────────────────────────────────

  _startPoison(player) {
    const px = player.x + (Math.random() - 0.5) * 60;
    const py = player.y + (Math.random() - 0.5) * 60;
    const radius = 80;
    const duration = this._phase >= 3 ? 6000 : 4000;

    // Nuage graphique
    const cloud = this.scene.add.graphics().setDepth(7);
    cloud.fillStyle(0x00cc44, 0.5);
    cloud.fillCircle(px, py, radius);
    cloud.fillStyle(0x00ff88, 0.25);
    cloud.fillCircle(px, py, radius * 0.6);

    // Durée du nuage
    const tickMs  = 800;
    let   elapsed = 0;
    const cloudData = { px, py, radius, elapsed, duration, cloud, tickElapsed: 0 };
    this._poisonClouds.push(cloudData);

    // Disparition progressive
    this.scene.tweens.add({
      targets: cloud, alpha: 0,
      duration: duration,
      ease: 'Linear',
      onComplete: () => {
        cloud.destroy();
        const idx = this._poisonClouds.indexOf(cloudData);
        if (idx !== -1) this._poisonClouds.splice(idx, 1);
      },
    });

    // Avertissement visuel (croix clignotante avant l'apparition)
    const warn = this.scene.add.graphics().setDepth(8);
    warn.lineStyle(3, 0xff4400, 0.9);
    warn.strokeCircle(px, py, radius);
    this.scene.tweens.add({
      targets: warn, alpha: 0, duration: 500, yoyo: true, repeat: 1,
      onComplete: () => warn.destroy(),
    });
  }

  _updatePoisonClouds(delta, player) {
    this._poisonClouds.forEach(c => {
      c.elapsed      += delta;
      c.tickElapsed  += delta;

      if (c.elapsed >= c.duration) return;
      if (c.tickElapsed < 800) return;
      c.tickElapsed = 0;

      const dist = Phaser.Math.Distance.Between(player.x, player.y, c.px, c.py);
      if (dist <= c.radius) {
        this._onPoisonHit?.(4000);
        player.takeDamage(6);
      }
    });
  }

  // ── Zone (onde de choc) ────────────────────────────────────────────────────

  _startZone(player) {
    const damage = Math.round(STATS.damage * 0.8);
    const maxR   = 130;

    // Ondes visuelles
    for (let i = 0; i < 4; i++) {
      const ring = this.scene.add.graphics().setDepth(11);
      ring.lineStyle(6 - i, 0xffaa00, 0.85);
      ring.strokeCircle(this.x, this.y, 20);
      this.scene.tweens.add({
        targets: ring,
        scaleX: maxR / 20 + i * 0.4,
        scaleY: maxR / 20 + i * 0.4,
        alpha: 0,
        delay: i * 100,
        duration: 600,
        ease: 'Power2',
        onComplete: () => ring.destroy(),
      });
    }

    // Vérification collision joueur après expansion (pic à 300ms)
    this.scene.time.delayedCall(300, () => {
      if (this._isDead) return;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (dist <= maxR) {
        player.takeDamage(damage);
        this.scene.cameras.main.shake(200, 0.012);
      }
    });
  }

  // ── Invocation ─────────────────────────────────────────────────────────────

  _doSummon() {
    const count = this._phase === 3 ? 4 : this._phase === 2 ? 3 : 2;

    // Cercle magique visuel
    const circ = this.scene.add.graphics().setDepth(8);
    circ.lineStyle(3, 0xcc8800, 0.9);
    circ.strokeCircle(this.x, this.y, 50);
    this.scene.tweens.add({
      targets: circ, alpha: 0, scaleX: 2, scaleY: 2, duration: 700,
      onComplete: () => circ.destroy(),
    });

    // Flash orange
    this.scene.cameras.main.flash(120, 60, 30, 0, true);

    this._onSummonRats?.(this.x, this.y, count);
  }

  // ── AI normale ─────────────────────────────────────────────────────────────

  _idle(delta) {
    this._patrolTimer -= delta;
    if (this._patrolTimer <= 0) {
      this._patrolTimer = 2000 + Math.random() * 2000;
      this._patrolAngle = Math.random() * Math.PI * 2;
    }
    const sp = STATS.speed * 0.2;
    this.body.setVelocity(
      Math.cos(this._patrolAngle) * sp,
      Math.sin(this._patrolAngle) * sp
    );
    this.rotation = this._patrolAngle + Math.PI / 2;
    this.play('rk-walk', true);
  }

  _chase(player, delta) {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.rotation = angle + Math.PI / 2;
    const sp = STATS.speed * (this._phase === 3 ? 1.4 : 1.0);
    this.body.setVelocity(Math.cos(angle) * sp, Math.sin(angle) * sp);
    this.play('rk-walk', true);
  }

  _attack(player) {
    this.body.setVelocity(0, 0);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.rotation = angle + Math.PI / 2;
    this.play('rk-atk', true);

    if (this._cooldown <= 0) {
      this._cooldown = STATS.cooldown;
      player.takeDamage(STATS.damage);
      this.scene.cameras.main.shake(200, 0.012);
    }
  }

  // ── Murs ───────────────────────────────────────────────────────────────────

  onWallCollision(wall) {
    if (this._isDead || !wall?.scene) return;
    if (this._wallDmgCooldown > 0) return;
    this._wallDmgCooldown = 1000;
    // Stoppe la charge si on heurte un mur
    if (this._charging) {
      this._charging = false;
      this._chargeTimer = CHARGE_INTERVAL;
      this.clearTint();
    }
  }

  // ── Dégâts & mort ──────────────────────────────────────────────────────────

  takeDamage(amount) {
    if (this._isDead) return;
    this._hp -= amount;

    this.setTint(0xff0000);
    this.scene.time.delayedCall(140, () => {
      if (!this._isDead) {
        this._charging ? this.setTint(0xff2200) : this.clearTint();
      }
    });

    // Numéro de dégâts
    const t = this.scene.add.text(this.x, this.y - 38, `-${amount}`, {
      fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold',
      color: '#ffcc00', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);
    this.scene.tweens.add({
      targets: t, y: t.y - 45, alpha: 0, duration: 900,
      ease: 'Power2', onComplete: () => t.destroy(),
    });

    if (this._hp <= 0) this._die();
  }

  _die() {
    this._isDead = true;
    this.body.enable = false;
    this.body.setVelocity(0, 0);

    // Détruire les nuages de poison
    this._poisonClouds.forEach(c => c.cloud?.destroy());
    this._poisonClouds = [];

    this._hpBarGfx.destroy();
    this._aura.destroy();
    this._crown?.destroy();

    // Animation de victoire : explosion massive en anneaux
    for (let i = 0; i < 12; i++) {
      const col  = i % 2 === 0 ? 0xffcc00 : 0xff6600;
      const ring = this.scene.add.graphics().setDepth(16);
      ring.fillStyle(col, 0.7);
      ring.fillCircle(this.x, this.y, 24);
      this.scene.tweens.add({
        targets: ring,
        scaleX: 6 + i * 0.8, scaleY: 6 + i * 0.8,
        alpha: 0,
        delay: i * 80,
        duration: 700,
        ease: 'Power2',
        onComplete: () => ring.destroy(),
      });
    }

    // Secousse de caméra
    this.scene.cameras.main.shake(800, 0.045);

    // Fade out du sprite + couronne
    this.scene.tweens.add({
      targets: this,
      alpha: 0, angle: this.angle + 360,
      scaleX: 0.1, scaleY: 0.1,
      duration: 1200,
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

    const sprite = this.scene.add.image(this.x, this.y, 'final_key_world')
      .setDepth(5)
      .setData('item', new FinalKey());

    // Pulsation très visible (clé importante)
    this.scene.tweens.add({
      targets: sprite, y: sprite.y - 10,
      duration: 700, ease: 'Sine.inOut', yoyo: true, repeat: -1,
    });
    this.scene.tweens.add({
      targets: sprite, alpha: 0.4,
      duration: 400, ease: 'Sine.inOut', yoyo: true, repeat: -1,
    });
    // Aura dorée
    this.scene.tweens.add({
      targets: sprite, scaleX: 1.15, scaleY: 1.15,
      duration: 600, ease: 'Sine.inOut', yoyo: true, repeat: -1,
    });

    this._worldItems.add(sprite);
  }

  // ── Rendu ──────────────────────────────────────────────────────────────────

  _drawHpBar() {
    this._hpBarGfx.clear();
    if (this._isDead) return;

    const W   = 72;
    const H   = 9;
    const bx  = this.x - W / 2;
    const by  = this.y - this.displayHeight * 0.62 - 14;
    const pct = Math.max(0, this._hp / STATS.hp);

    this._hpBarGfx.fillStyle(0x111111, 0.9);
    this._hpBarGfx.fillRect(bx - 1, by - 1, W + 2, H + 2);

    const col = this._phase === 3 ? 0xff0000 : this._phase === 2 ? 0xff6600 : 0xcc3300;
    this._hpBarGfx.fillStyle(col, 1);
    this._hpBarGfx.fillRect(bx, by, W * pct, H);

    this._hpBarGfx.lineStyle(1, 0xffcc00, 0.9);
    this._hpBarGfx.strokeRect(bx - 1, by - 1, W + 2, H + 2);
  }

  _drawAura() {
    this._aura.clear();
    if (this._isDead) return;

    const t  = this.scene.time.now;
    const p1 = 0.3 + 0.2 * Math.sin(t / 200);
    const p2 = 0.2 + 0.15 * Math.sin(t / 140 + 1);
    const col = this._phase === 3 ? 0xff0000 : this._phase === 2 ? 0xff8800 : 0xffcc00;

    this._aura.lineStyle(4, col, p1);
    this._aura.strokeCircle(this.x, this.y, 38);
    this._aura.lineStyle(2, 0xffffff, p2);
    this._aura.strokeCircle(this.x, this.y, 50);
  }

  destroy(fromScene) {
    this._hpBarGfx?.destroy();
    this._aura?.destroy();
    this._crown?.destroy();
    this._poisonClouds.forEach(c => c.cloud?.destroy());
    super.destroy(fromScene);
  }
}
