/**
 * Zombie.js
 * Classe de base pour tous les zombies.
 *
 * Machine à états :
 *   idle   → zombie immobile ou en patrouille lente
 *   chase  → zombie fonce vers le joueur
 *   attack → zombie frappe le joueur (à portée)
 *   dead   → animation de mort, puis suppression
 *
 * Les zombies ne s'activent que la nuit (géré par ZombieSpawner qui
 * passe `isNight` en paramètre de update()).
 */

import { Meat } from '../items/Meat.js';

let _zombieIdCounter = 0;

export class Zombie extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {string} textureKey - Frame de départ
   * @param {object} stats      - { hp, speed, damage, cooldown, detect, range, hitbox }
   * @param {string} type       - 'normal' | 'fast' | 'tank'
   * @param {string} animPrefix - Préfixe des animations ('zn' | 'zf' | 'zt')
   */
  constructor(scene, x, y, textureKey, stats, type, animPrefix) {
    super(scene, x, y, textureKey);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Identifiant unique (pour le cooldown des grognements)
    this._id = `zombie_${_zombieIdCounter++}`;

    this._type      = type;
    this._animPfx   = animPrefix;
    this._stats     = { ...stats };

    // Stats live
    this._hp        = stats.hp;
    this._cooldown  = 0;        // ms avant la prochaine attaque
    this._state     = 'idle';
    this._isDead    = false;

    // Patrouille
    this._patrolTimer = 0;
    this._patrolAngle = Math.random() * Math.PI * 2;

    // Grognement
    this._groanTimer    = 2000 + Math.random() * 4000; // première émission

    // Items monde (injecté par ZombieSpawner pour le loot)
    this._worldItems = null;

    // Barre de vie (Graphics séparé, ne tourne pas)
    this._hpBar = scene.add.graphics().setDepth(12);

    // Hitbox
    this.body.setCircle(stats.hitbox,
      this.width  / 2 - stats.hitbox,
      this.height / 2 - stats.hitbox
    );
    this.body.setCollideWorldBounds(true);
    this.setDepth(10);
  }

  // ── Accesseurs ──────────────────────────────────────────────────────────────

  get isDead()  { return this._isDead; }
  get zombieId() { return this._id; }

  setWorldItems(group) { this._worldItems = group; }

  // ── Boucle principale ──────────────────────────────────────────────────────

  /**
   * @param {number} delta
   * @param {Player} player
   * @param {SoundManager} sound
   * @param {boolean} isNight - Zombies actifs uniquement la nuit
   */
  update(delta, player, sound, isNight) {
    if (this._isDead) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    // Attaque uniquement la nuit
    if (!isNight) {
      this._idle(delta);
      this._updateHealthBar();
      return;
    }

    this._updateCooldown(delta);
    this._updateState(dist);
    this._executeState(dist, player, delta, sound);
    this._updateHealthBar();
  }

  _updateCooldown(delta) {
    if (this._cooldown > 0) this._cooldown -= delta;
  }

  _updateState(dist) {
    if (dist <= this._stats.range) {
      this._state = 'attack';
    } else if (dist <= this._stats.detect) {
      this._state = 'chase';
    } else {
      this._state = 'idle';
    }
  }

  _executeState(dist, player, delta, sound) {
    switch (this._state) {
      case 'chase':  this._chase(player, sound, delta);  break;
      case 'attack': this._attack(player, sound, delta); break;
      default:       this._idle(delta);                  break;
    }
  }

  // ── États ──────────────────────────────────────────────────────────────────

  _idle(delta) {
    this._patrolTimer -= delta;
    if (this._patrolTimer <= 0) {
      this._patrolTimer = 2500 + Math.random() * 3000;
      this._patrolAngle = Math.random() * Math.PI * 2;
    }
    const sp = this._stats.speed * 0.25;
    this.body.setVelocity(
      Math.cos(this._patrolAngle) * sp,
      Math.sin(this._patrolAngle) * sp
    );
    this.rotation = this._patrolAngle + Math.PI / 2;
    this.play(`${this._animPfx}-walk`, true);
  }

  _chase(player, sound, delta) {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.rotation = angle + Math.PI / 2;
    this.body.setVelocity(
      Math.cos(angle) * this._stats.speed,
      Math.sin(angle) * this._stats.speed
    );
    this.play(`${this._animPfx}-walk`, true);

    // Grognement occasionnel
    this._groanTimer -= delta;
    if (this._groanTimer <= 0) {
      this._groanTimer = 5000 + Math.random() * 6000;
      sound?.zombieGroan(this._type, this._id);
    }
  }

  _attack(player, sound, delta) {
    // Stopper le mouvement
    this.body.setVelocity(0, 0);
    // Faire face au joueur
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.rotation = angle + Math.PI / 2;

    this.play(`${this._animPfx}-atk`, true);

    if (this._cooldown <= 0) {
      this._cooldown = this._stats.cooldown;
      player.takeDamage(this._stats.damage);
      sound?.playerHit();
    }
  }

  // ── Dégâts & mort ──────────────────────────────────────────────────────────

  /**
   * Applique des dégâts. Déclenche la mort si hp ≤ 0.
   * @param {number} amount
   */
  takeDamage(amount) {
    if (this._isDead) return;

    this._hp -= amount;

    // Flash rouge
    this.setTint(0xff3333);
    this.scene.time.delayedCall(120, () => {
      if (!this._isDead) this.clearTint();
    });

    // Texte de dégâts flottant
    this._showDamageNumber(amount);

    if (this._hp <= 0) this._die();
  }

  _showDamageNumber(amount) {
    const t = this.scene.add.text(this.x, this.y - 20, `-${amount}`, {
      fontFamily: 'monospace',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    this.scene.tweens.add({
      targets: t,
      y: t.y - 28,
      alpha: 0,
      duration: 900,
      ease: 'Power2',
      onComplete: () => t.destroy(),
    });
  }

  _die() {
    this._isDead = true;
    this.body.enable = false;
    this.body.setVelocity(0, 0);
    this._hpBar.destroy();

    // Animation de mort : rotation + fondu
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      angle: this.angle + 90,
      scaleX: 0.4,
      scaleY: 0.4,
      duration: 600,
      ease: 'Power2',
      onComplete: () => {
        this._dropLoot();
        this.destroy();
      },
    });
  }

  _dropLoot() {
    if (!this._worldItems) return;

    // 70% de chances de lâcher de la viande
    if (Math.random() > 0.30) {
      const sprite = this.scene.add.image(this.x, this.y, 'meat_world')
        .setDepth(3)
        .setData('item', new Meat());

      this.scene.tweens.add({
        targets: sprite,
        y: sprite.y - 4,
        duration: 800,
        ease: 'Sine.inOut',
        yoyo: true,
        repeat: -1,
      });

      this._worldItems.add(sprite);
    }
  }

  // ── Barre de vie ───────────────────────────────────────────────────────────

  _updateHealthBar() {
    this._hpBar.clear();
    if (this._isDead) return;

    const W    = 34;
    const H    = 4;
    const bx   = this.x - W / 2;
    const by   = this.y - this.height * 0.55 - 8;
    const pct  = Math.max(0, this._hp / this._stats.hp);

    // Fond
    this._hpBar.fillStyle(0x222222, 0.85);
    this._hpBar.fillRect(bx, by, W, H);

    // Remplissage
    const col = pct > 0.5 ? 0x44ee44 : pct > 0.25 ? 0xeedd22 : 0xee2222;
    this._hpBar.fillStyle(col, 1);
    this._hpBar.fillRect(bx, by, W * pct, H);
  }

  // Nettoyage complet
  destroy(fromScene) {
    this._hpBar?.destroy();
    super.destroy(fromScene);
  }
}
