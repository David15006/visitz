/**
 * FinalBoss.js
 * L'Obscur — boss final de la zone finale.
 *
 * 1500 HP, 3 phases, 5 attaques + téléportation (phase 3).
 *
 * Attaques :
 *   charge   — dash 400px/s × 1s vers le joueur
 *   meteor   — 5 zones d'impact retardées autour du joueur
 *   summon   — invoque infectés + rats via callback
 *   vortex   — anneau de 12 projectiles expansifs
 *   quake    — onde de choc radiale depuis le boss
 *   teleport — (phase 3) disparaît et réapparaît
 */

const STATS = {
  hp:       1500,
  speed:    68,
  damage:   45,
  cooldown: 1300,
  range:    64,
  hitbox:   28,
};

const PHASE_HP = { 2: 1000, 3: 500 };  // seuils de transition

const CHARGE_SPEED    = 400;
const CHARGE_DURATION = 1000;

const ATK_INTERVAL = { 1: 5000, 2: 3500, 3: 2000 };

export class FinalBoss extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {object} cbs  { onSummon, onPhaseChange, onDeath }
   */
  constructor(scene, x, y, { onSummon, onPhaseChange, onDeath } = {}) {
    super(scene, x, y, 'fb_idle_0');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this._onSummon      = onSummon;
    this._onPhaseChange = onPhaseChange;
    this._onDeath       = onDeath;

    this._isDead   = false;
    this._hp       = STATS.hp;
    this._phase    = 1;
    this._state    = 'idle';
    this._cooldown = 0;

    this._atkTimer   = ATK_INTERVAL[1];
    this._charging   = false;
    this._chargeDur  = 0;
    this._chargeAngle = 0;

    // Projectiles du vortex (gérés manuellement)
    this._vortexProj = [];

    // Patrouille
    this._patrolTimer = 0;
    this._patrolAngle = 0;

    // Physique
    this.body.setCircle(
      STATS.hitbox,
      this.width  / 2 - STATS.hitbox,
      this.height / 2 - STATS.hitbox
    );
    this.body.setCollideWorldBounds(true);
    this.setDepth(10).setScale(2.5);

    // Graphiques
    this._hpBar = scene.add.graphics().setDepth(13);
    this._aura  = scene.add.graphics().setDepth(9);

    // Apparition spectaculaire
    this.setScale(0).setAlpha(0);
    scene.tweens.add({
      targets: this,
      alpha: 1, scaleX: 2.5, scaleY: 2.5,
      duration: 1200, ease: 'Back.Out',
    });

    this._setupAnims(scene);
  }

  get isDead() { return this._isDead; }
  get hp()     { return this._hp; }
  get phase()  { return this._phase; }

  // ── Anims ──────────────────────────────────────────────────────────────────

  _setupAnims(scene) {
    if (scene.anims.exists('fb-idle')) return;
    scene.anims.create({
      key: 'fb-idle',
      frames: [
        { key: 'fb_idle_0' }, { key: 'fb_idle_1' },
        { key: 'fb_idle_2' }, { key: 'fb_idle_3' },
      ],
      frameRate: 5, repeat: -1,
    });
    scene.anims.create({
      key: 'fb-atk',
      frames: [{ key: 'fb_atk_0' }, { key: 'fb_atk_1' }],
      frameRate: 6, repeat: -1,
    });
  }

  // ── Boucle ─────────────────────────────────────────────────────────────────

  update(delta, player) {
    if (this._isDead) return;

    this._checkPhase();
    this._updateCooldowns(delta);
    this._updateVortex(delta, player);
    this._updateState(player);
    this._execute(delta, player);
    this._drawHpBar();
    this._drawAura();
  }

  // ── Phase ──────────────────────────────────────────────────────────────────

  _checkPhase() {
    const phase = this._hp > PHASE_HP[2] ? 1 : this._hp > PHASE_HP[3] ? 2 : 3;
    if (phase !== this._phase) {
      this._phase = phase;
      this._atkTimer = ATK_INTERVAL[phase];
      this._onPhaseChange?.(phase);
      this._playPhaseTransition(phase);
    }
  }

  _playPhaseTransition(phase) {
    const col = phase === 3 ? 0xff0000 : 0xff4400;
    this.scene.cameras.main.flash(500, (col >> 16) & 0xff, (col >> 8) & 0xff, col & 0xff, true);
    this.scene.cameras.main.shake(600, 0.03);

    for (let i = 0; i < 8; i++) {
      const ring = this.scene.add.graphics().setDepth(12);
      ring.lineStyle(5, col, 0.9);
      ring.strokeCircle(this.x, this.y, 40);
      this.scene.tweens.add({
        targets: ring, scaleX: 8 + i, scaleY: 8 + i, alpha: 0,
        delay: i * 100, duration: 800, onComplete: () => ring.destroy(),
      });
    }
  }

  // ── Cooldowns ──────────────────────────────────────────────────────────────

  _updateCooldowns(delta) {
    if (this._cooldown > 0)  this._cooldown  -= delta;
    if (this._atkTimer > 0)  this._atkTimer  -= delta;

    if (this._charging) {
      this._chargeDur -= delta;
      if (this._chargeDur <= 0) {
        this._charging = false;
        this.clearTint();
      }
    }
  }

  // ── State ──────────────────────────────────────────────────────────────────

  _updateState(player) {
    if (this._charging) return;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    this._state = dist <= STATS.range ? 'attack' : 'chase';
  }

  _execute(delta, player) {
    if (this._charging) { this._doCharge(player); return; }

    // Attaque spéciale périodique
    if (this._atkTimer <= 0) {
      this._atkTimer = ATK_INTERVAL[this._phase];
      this._pickAttack(player);
    }

    if (this._state === 'attack') this._melee(player);
    else                          this._chase(player);
  }

  // ── AI normale ─────────────────────────────────────────────────────────────

  _chase(player) {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.rotation = angle + Math.PI / 2;
    const sp = STATS.speed * (this._phase === 3 ? 1.5 : this._phase === 2 ? 1.2 : 1.0);
    this.body.setVelocity(Math.cos(angle) * sp, Math.sin(angle) * sp);
    this.play('fb-idle', true);
  }

  _melee(player) {
    this.body.setVelocity(0, 0);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.rotation = angle + Math.PI / 2;
    this.play('fb-atk', true);

    if (this._cooldown <= 0) {
      this._cooldown = STATS.cooldown;
      player.takeDamage(STATS.damage);
      this.scene.cameras.main.shake(250, 0.015);
    }
  }

  // ── Choix d'attaque ────────────────────────────────────────────────────────

  _pickAttack(player) {
    const pools = {
      1: ['charge', 'meteor', 'quake'],
      2: ['charge', 'meteor', 'quake', 'summon', 'vortex'],
      3: ['charge', 'charge', 'meteor', 'meteor', 'quake', 'summon', 'vortex', 'teleport'],
    };
    const pool = pools[this._phase];
    const pick = pool[Math.floor(Math.random() * pool.length)];

    switch (pick) {
      case 'charge':   this._startCharge(player);  break;
      case 'meteor':   this._startMeteor(player);  break;
      case 'quake':    this._startQuake(player);   break;
      case 'summon':   this._doSummon();            break;
      case 'vortex':   this._startVortex();         break;
      case 'teleport': this._doTeleport(player);   break;
    }
  }

  // ── Charge ─────────────────────────────────────────────────────────────────

  _startCharge(player) {
    if (this._charging) return;
    this._charging    = true;
    this._chargeDur   = CHARGE_DURATION;
    this._chargeAngle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.setTint(0xff2200);
    this.play('fb-atk', true);

    this.scene.cameras.main.flash(180, 60, 0, 0, true);

    const ring = this.scene.add.graphics().setDepth(11);
    ring.lineStyle(6, 0xff3300, 1);
    ring.strokeCircle(this.x, this.y, 50);
    this.scene.tweens.add({
      targets: ring, alpha: 0, scaleX: 3, scaleY: 3, duration: 450,
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
    if (dist <= STATS.range * 1.6 && this._cooldown <= 0) {
      this._cooldown = STATS.cooldown;
      player.takeDamage(Math.round(STATS.damage * 1.8));
      this.scene.cameras.main.shake(350, 0.025);
    }
  }

  // ── Météores ───────────────────────────────────────────────────────────────

  _startMeteor(player) {
    const count   = this._phase >= 3 ? 7 : 5;
    const warnMs  = 1200;
    const hitR    = 65;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist  = 60 + Math.random() * 180;
      const mx    = player.x + Math.cos(angle) * dist;
      const my    = player.y + Math.sin(angle) * dist;

      // Cercle d'avertissement (rétrécit)
      const warn = this.scene.add.graphics().setDepth(8);
      warn.lineStyle(3, 0xff4400, 0.9);
      warn.strokeCircle(mx, my, hitR);

      this.scene.tweens.add({
        targets: warn, scaleX: 0.2, scaleY: 0.2, alpha: 0.3,
        delay: i * 80, duration: warnMs,
        onComplete: () => {
          warn.destroy();
          this._meteorImpact(mx, my, player, hitR);
        },
      });
    }
  }

  _meteorImpact(mx, my, player, hitR) {
    if (this._isDead) return;

    // Explosion visuelle
    const exp = this.scene.add.graphics().setDepth(12);
    exp.fillStyle(0xff6600, 0.8);
    exp.fillCircle(mx, my, hitR);
    exp.fillStyle(0xffffff, 0.5);
    exp.fillCircle(mx, my, hitR * 0.5);
    this.scene.tweens.add({
      targets: exp, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 500,
      onComplete: () => exp.destroy(),
    });

    // Dommages
    const dist = Phaser.Math.Distance.Between(mx, my, player.x, player.y);
    if (dist <= hitR) {
      player.takeDamage(Math.round(STATS.damage * 0.9));
      this.scene.cameras.main.shake(200, 0.01);
    }
  }

  // ── Invocation ─────────────────────────────────────────────────────────────

  _doSummon() {
    const rats     = this._phase >= 3 ? 4 : 2;
    const infected = this._phase >= 3 ? 4 : 3;

    const circ = this.scene.add.graphics().setDepth(9);
    circ.lineStyle(4, 0xaa0000, 0.9);
    circ.strokeCircle(this.x, this.y, 60);
    this.scene.tweens.add({
      targets: circ, alpha: 0, scaleX: 2.5, scaleY: 2.5, duration: 800,
      onComplete: () => circ.destroy(),
    });

    this.scene.cameras.main.flash(150, 40, 0, 0, true);
    this._onSummon?.(this.x, this.y, rats, infected);
  }

  // ── Vortex ────────────────────────────────────────────────────────────────

  _startVortex() {
    const count = this._phase >= 3 ? 16 : 12;
    const speed = 150;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const gfx   = this.scene.add.graphics().setDepth(8);
      this._vortexProj.push({
        gfx,
        wx: this.x, wy: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 2200, maxLife: 2200,
        hit: false,
      });
    }
  }

  _updateVortex(delta, player) {
    this._vortexProj = this._vortexProj.filter(p => {
      p.life -= delta;
      if (p.life <= 0) { p.gfx.destroy(); return false; }

      p.wx += p.vx * delta / 1000;
      p.wy += p.vy * delta / 1000;

      p.gfx.clear();
      const alpha = p.life / p.maxLife;
      const col   = this._phase === 3 ? 0xff0000 : 0xff6600;
      p.gfx.fillStyle(col, alpha);
      p.gfx.fillCircle(p.wx, p.wy, 9);
      p.gfx.lineStyle(2, 0xffffff, alpha * 0.5);
      p.gfx.strokeCircle(p.wx, p.wy, 9);

      if (!p.hit) {
        const dist = Phaser.Math.Distance.Between(p.wx, p.wy, player.x, player.y);
        if (dist < 22) {
          p.hit = true;
          player.takeDamage(18);
        }
      }
      return true;
    });
  }

  // ── Tremblement de terre ───────────────────────────────────────────────────

  _startQuake(player) {
    const dmg  = Math.round(STATS.damage * 0.75);
    const maxR = 160;

    this.scene.cameras.main.shake(600, 0.025);

    for (let i = 0; i < 5; i++) {
      const ring = this.scene.add.graphics().setDepth(11);
      ring.lineStyle(7 - i, 0xcc6600, 0.9);
      ring.strokeCircle(this.x, this.y, 25);
      this.scene.tweens.add({
        targets: ring, scaleX: maxR / 25 + i * 0.4, scaleY: maxR / 25 + i * 0.4,
        alpha: 0, delay: i * 90, duration: 700, ease: 'Power2',
        onComplete: () => ring.destroy(),
      });
    }

    this.scene.time.delayedCall(280, () => {
      if (this._isDead) return;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (dist <= maxR) {
        player.takeDamage(dmg);
        this.scene.cameras.main.shake(250, 0.018);
      }
    });
  }

  // ── Téléportation (phase 3) ────────────────────────────────────────────────

  _doTeleport(player) {
    // Fade out
    this.scene.tweens.add({
      targets: this, alpha: 0, duration: 300,
      onComplete: () => {
        if (this._isDead) return;

        // Nouvelle position aléatoire dans l'arène
        const angle = Math.random() * Math.PI * 2;
        const dist  = 120 + Math.random() * 160;
        this.setPosition(
          Phaser.Math.Clamp(player.x + Math.cos(angle) * dist, 270, 1330),
          Phaser.Math.Clamp(player.y + Math.sin(angle) * dist, 270, 1330)
        );

        // Onde d'arrivée
        const ring = this.scene.add.graphics().setDepth(9);
        ring.lineStyle(4, 0xaa00ff, 1);
        ring.strokeCircle(this.x, this.y, 40);
        this.scene.tweens.add({
          targets: ring, alpha: 0, scaleX: 2.5, scaleY: 2.5, duration: 400,
          onComplete: () => ring.destroy(),
        });

        // Fade in + burst
        this.scene.tweens.add({
          targets: this, alpha: 1, duration: 250,
          onComplete: () => this._startQuake(player),
        });
      },
    });
  }

  // ── Dégâts ────────────────────────────────────────────────────────────────

  takeDamage(amount) {
    if (this._isDead) return;
    this._hp -= amount;

    this.setTint(0xff0000);
    this.scene.time.delayedCall(160, () => {
      if (!this._isDead) this._charging ? this.setTint(0xff2200) : this.clearTint();
    });

    const t = this.scene.add.text(this.x, this.y - 50, `-${amount}`, {
      fontFamily: 'monospace', fontSize: '22px', fontStyle: 'bold',
      color: '#ffcc00', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(22);
    this.scene.tweens.add({
      targets: t, y: t.y - 55, alpha: 0, duration: 1000,
      ease: 'Power2', onComplete: () => t.destroy(),
    });

    if (this._hp <= 0) this._die();
  }

  _die() {
    this._isDead = true;
    this.body.enable = false;
    this.body.setVelocity(0, 0);

    // Détruire les projectiles
    this._vortexProj.forEach(p => p.gfx.destroy());
    this._vortexProj = [];

    this._hpBar.destroy();
    this._aura.destroy();

    // Grande explosion finale : 16 anneaux
    for (let i = 0; i < 16; i++) {
      const cols = [0xffffff, 0xffdd00, 0xff6600, 0xff0000, 0xaa00ff];
      const col  = cols[i % cols.length];
      const ring = this.scene.add.graphics().setDepth(18);
      ring.fillStyle(col, 0.8);
      ring.fillCircle(this.x, this.y, 30);
      this.scene.tweens.add({
        targets: ring, scaleX: 10 + i * 1.2, scaleY: 10 + i * 1.2, alpha: 0,
        delay: i * 80, duration: 900, ease: 'Power2',
        onComplete: () => ring.destroy(),
      });
    }

    this.scene.cameras.main.shake(1200, 0.06);
    this.scene.cameras.main.flash(600, 255, 240, 200, true);

    this.scene.tweens.add({
      targets: this, alpha: 0, scaleX: 0, scaleY: 0, angle: this.angle + 720,
      duration: 1500, ease: 'Power3',
      onComplete: () => {
        this._onDeath?.();
        this.destroy();
      },
    });
  }

  // ── Rendu ──────────────────────────────────────────────────────────────────

  _drawHpBar() {
    this._hpBar.clear();
    if (this._isDead) return;
    const W   = 80, H = 10;
    const bx  = this.x - W / 2;
    const by  = this.y - this.displayHeight * 0.58 - 16;
    const pct = Math.max(0, this._hp / STATS.hp);
    const col = this._phase === 3 ? 0xff0000 : this._phase === 2 ? 0xff4400 : 0xaa0088;

    this._hpBar.fillStyle(0x111111, 0.9);
    this._hpBar.fillRect(bx - 1, by - 1, W + 2, H + 2);
    if (pct > 0) { this._hpBar.fillStyle(col, 1); this._hpBar.fillRect(bx, by, W * pct, H); }
    this._hpBar.lineStyle(1, 0xffffff, 0.8);
    this._hpBar.strokeRect(bx - 1, by - 1, W + 2, H + 2);
    // Marqueurs de phase
    [0.667, 0.333].forEach(t => {
      this._hpBar.lineStyle(2, 0xffffff, 0.7);
      this._hpBar.lineBetween(bx + W * t, by - 2, bx + W * t, by + H + 2);
    });
  }

  _drawAura() {
    this._aura.clear();
    if (this._isDead) return;
    const t    = this.scene.time.now;
    const col  = this._phase === 3 ? 0xff0000 : this._phase === 2 ? 0xff4400 : 0xaa00ff;
    const col2 = this._phase === 3 ? 0xff6600 : 0xcc00ff;
    const p1   = 0.35 + 0.2 * Math.sin(t / 200);
    const p2   = 0.2  + 0.15 * Math.sin(t / 130 + 1);

    this._aura.lineStyle(5, col, p1);
    this._aura.strokeCircle(this.x, this.y, 50);
    this._aura.lineStyle(3, col2, p2);
    this._aura.strokeCircle(this.x, this.y, 68);

    // Particules orbitales
    for (let i = 0; i < 4; i++) {
      const a  = t / 600 + (i / 4) * Math.PI * 2;
      const ox = Math.cos(a) * 55;
      const oy = Math.sin(a) * 55;
      this._aura.fillStyle(col, 0.7 * p1);
      this._aura.fillCircle(this.x + ox, this.y + oy, 5);
    }
  }

  destroy(fromScene) {
    this._hpBar?.destroy();
    this._aura?.destroy();
    this._vortexProj.forEach(p => p.gfx?.destroy());
    super.destroy(fromScene);
  }
}
