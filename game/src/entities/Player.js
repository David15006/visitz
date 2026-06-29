/**
 * Player.js
 * Joueur principal — sprite physique avec animations, stats et inventaire.
 *
 * Fonctionnalités :
 *  - Déplacement ZQSD + flèches (marche / course avec Shift)
 *  - Rotation vers la souris (visée en temps réel)
 *  - Animations : idle, walk, sprint, attack (multi-texture)
 *  - Stamina : drain en sprint, épuisement, régénération
 *  - Attaque au clic gauche avec arc visuel et cooldown
 *  - Ramassage d'objets (touche E, dans le rayon PICKUP_RANGE)
 *  - Inventaire 8 slots, touches 1–8 pour changer le slot actif
 */

import { GameConfig }   from '../config/GameConfig.js';
import { PlayerStats }  from './PlayerStats.js';
import { Inventory }    from '../systems/Inventory.js';
import { Bat }          from './items/Bat.js';

const PC = GameConfig.PLAYER;
const KEY = Phaser.Input.Keyboard.KeyCodes;

export class Player extends Phaser.Physics.Arcade.Sprite {

  /** @param {Phaser.Scene} scene */
  constructor(scene, x, y) {
    super(scene, x, y, 'p_idle_0');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Hitbox circulaire centrée sur le corps (pas la tête)
    this.body.setCircle(PC.HITBOX_RADIUS, 7, 20);
    this.body.setCollideWorldBounds(true);
    this.setDepth(10);

    // Systèmes
    this.stats     = new PlayerStats();
    this.inventory = new Inventory(8);
    this.inventory.add(new Bat()); // arme de départ

    // État interne
    this._aimAngle      = 0;    // angle vers la souris (radians)
    this._attackCooldown = 0;   // ms restantes avant prochain attaque
    this._isAttacking    = false;

    // Groupe d'items du monde (injecté par GameScene)
    this._worldItems = null;
    this._nearbyItem = null;   // item le plus proche dans le rayon

    // Clavier
    this._cursors = scene.input.keyboard.createCursorKeys();
    this._keys    = scene.input.keyboard.addKeys({
      Z: KEY.Z, Q: KEY.Q, S: KEY.S, D: KEY.D,
      E: KEY.E,
      ONE: KEY.ONE, TWO: KEY.TWO, THREE: KEY.THREE, FOUR: KEY.FOUR,
      FIVE: KEY.FIVE, SIX: KEY.SIX, SEVEN: KEY.SEVEN, EIGHT: KEY.EIGHT,
    });
    this._shiftKey = scene.input.keyboard.addKey(KEY.SHIFT);

    // Attaque au clic gauche
    scene.input.on('pointerdown', (ptr) => {
      if (ptr.leftButtonDown()) this._tryAttack();
    });

    // Registre des animations Phaser (multi-texture)
    this._registerAnimations(scene);

    // Texte de hint ramassage (scrollFactor 0 = fixe à l'écran ← NON)
    // Il doit suivre le joueur dans le monde → scrollFactor par défaut (1)
    this._pickupHint = scene.add.text(0, -44, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ffe066',
      backgroundColor: '#00000099',
      padding: { x: 5, y: 3 },
    }).setOrigin(0.5, 1).setDepth(20).setVisible(false);
  }

  // ── Setup ──────────────────────────────────────────────────────────────────

  /** Injecte la référence au groupe d'items monde depuis GameScene */
  setWorldItems(group) {
    this._worldItems = group;
  }

  /** Enregistre toutes les animations (utilise des textures de clés différentes par frame) */
  _registerAnimations(scene) {
    const anims = scene.anims;

    // Idle (2 frames, lent)
    if (!anims.exists('p-idle')) {
      anims.create({
        key: 'p-idle',
        frames: [{ key: 'p_idle_0' }, { key: 'p_idle_1' }],
        frameRate: 2,
        repeat: -1,
      });
    }
    // Marche (4 frames)
    if (!anims.exists('p-walk')) {
      anims.create({
        key: 'p-walk',
        frames: [
          { key: 'p_walk_0' }, { key: 'p_walk_1' },
          { key: 'p_walk_2' }, { key: 'p_walk_3' },
        ],
        frameRate: 8,
        repeat: -1,
      });
    }
    // Sprint (mêmes frames que walk, plus rapide)
    if (!anims.exists('p-sprint')) {
      anims.create({
        key: 'p-sprint',
        frames: [
          { key: 'p_walk_0' }, { key: 'p_walk_1' },
          { key: 'p_walk_2' }, { key: 'p_walk_3' },
        ],
        frameRate: 14,
        repeat: -1,
      });
    }
    // Attaque (4 frames, ne boucle pas)
    if (!anims.exists('p-attack')) {
      anims.create({
        key: 'p-attack',
        frames: [
          { key: 'p_atk_0' }, { key: 'p_atk_1' },
          { key: 'p_atk_2' }, { key: 'p_atk_3' },
        ],
        frameRate: 10,
        repeat: 0,
      });
    }

    // Retour à idle après fin d'attaque
    this.on('animationcomplete-p-attack', () => {
      this._isAttacking = false;
      this.play('p-idle', true);
    });
  }

  // ── Boucle principale ──────────────────────────────────────────────────────

  /**
   * @param {number} time  - Temps absolu (ms)
   * @param {number} delta - Delta frame (ms)
   */
  update(time, delta) {
    this._updateAim();
    this._handleHotkeys();
    this._handleMovement(delta);
    this._updateAttackCooldown(delta);
    this._handlePickup();
    this._updatePickupHint();
  }

  // ── Visée ──────────────────────────────────────────────────────────────────

  _updateAim() {
    const ptr = this.scene.input.activePointer;
    const wp  = this.scene.cameras.main.getWorldPoint(ptr.x, ptr.y);
    this._aimAngle  = Phaser.Math.Angle.Between(this.x, this.y, wp.x, wp.y);
    // Rotation du sprite vers la souris (sprite "up" = -π/2 → offset +π/2)
    this.rotation   = this._aimAngle + Math.PI / 2;
  }

  // ── Hotkeys inventaire ──────────────────────────────────────────────────────

  _handleHotkeys() {
    const k = this._keys;
    const slots = [k.ONE, k.TWO, k.THREE, k.FOUR, k.FIVE, k.SIX, k.SEVEN, k.EIGHT];
    slots.forEach((key, i) => {
      if (Phaser.Input.Keyboard.JustDown(key)) this.inventory.setActiveSlot(i);
    });
  }

  // ── Déplacement ────────────────────────────────────────────────────────────

  _handleMovement(delta) {
    const { Z, Q, S, D } = this._keys;
    const { up, down, left, right } = this._cursors;

    let dx = 0, dy = 0;
    if (Q.isDown || left.isDown)  dx -= 1;
    if (D.isDown || right.isDown) dx += 1;
    if (Z.isDown || up.isDown)    dy -= 1;
    if (S.isDown || down.isDown)  dy += 1;

    const moving = dx !== 0 || dy !== 0;

    // Sprint uniquement si on bouge et non épuisé
    const wantSprint = this._shiftKey.isDown && moving;
    const isSprinting = wantSprint && !this.stats.isExhausted;

    this.stats.update(delta, isSprinting);

    // Normalisation diagonale
    if (dx !== 0 && dy !== 0) {
      dx /= Math.SQRT2;
      dy /= Math.SQRT2;
    }

    const speed = isSprinting ? PC.SPRINT_SPEED : PC.SPEED;
    this.body.setVelocity(dx * speed, dy * speed);

    // Animation selon l'état (pas en cours d'attaque)
    if (!this._isAttacking) {
      if (!moving) {
        this.play('p-idle', true);
      } else if (isSprinting) {
        this.play('p-sprint', true);
      } else {
        this.play('p-walk', true);
      }
    }
  }

  // ── Attaque ────────────────────────────────────────────────────────────────

  _updateAttackCooldown(delta) {
    if (this._attackCooldown > 0) {
      this._attackCooldown -= delta;
    }
  }

  _tryAttack() {
    if (this._attackCooldown > 0) return;

    const weapon = this.inventory.getActive();
    if (!weapon || weapon.type !== 'weapon') return;

    this._attackCooldown = weapon.attackCooldown;
    this._isAttacking    = true;

    this.play('p-attack', true);

    // Arc visuel décalé à l'impact (frame 2 ≈ 200ms)
    this.scene.time.delayedCall(200, () => {
      this._showAttackArc(weapon);
    });
  }

  /** Affiche l'arc d'attaque sur le monde, puis le fait disparaître */
  _showAttackArc(weapon) {
    const gfx = this.scene.add.graphics().setDepth(15);

    // Couleur selon l'arme
    gfx.lineStyle(4, 0xffe566, 0.85);
    gfx.beginPath();
    gfx.arc(
      this.x, this.y,
      weapon.attackRange,
      this._aimAngle - weapon.attackArc / 2,
      this._aimAngle + weapon.attackArc / 2,
      false
    );
    gfx.strokePath();

    // Rayon central (direction de frappe)
    gfx.lineStyle(2, 0xffffff, 0.5);
    gfx.lineBetween(
      this.x, this.y,
      this.x + Math.cos(this._aimAngle) * weapon.attackRange,
      this.y + Math.sin(this._aimAngle) * weapon.attackRange
    );

    // Fondu rapide
    this.scene.tweens.add({
      targets: gfx,
      alpha: 0,
      duration: 220,
      onComplete: () => gfx.destroy(),
    });
  }

  // ── Ramassage ──────────────────────────────────────────────────────────────

  _handlePickup() {
    if (!this._worldItems) return;

    // Cherche l'item le plus proche dans le rayon
    let nearest = null;
    let minDist  = PC.PICKUP_RANGE;

    this._worldItems.getChildren().forEach(sprite => {
      const d = Phaser.Math.Distance.Between(this.x, this.y, sprite.x, sprite.y);
      if (d < minDist) { minDist = d; nearest = sprite; }
    });

    this._nearbyItem = nearest;

    // Ramassage sur E
    if (nearest && Phaser.Input.Keyboard.JustDown(this._keys.E)) {
      const item = nearest.getData('item');
      const slot  = this.inventory.add(item.clone());
      if (slot >= 0) {
        nearest.destroy();
        this._nearbyItem = null;
        this._showPickupFeedback(item.name);
      } else {
        this._showPickupFeedback('Inventaire plein !', 0xff5555);
      }
    }
  }

  /** Met à jour le texte de hint au-dessus du joueur */
  _updatePickupHint() {
    if (this._nearbyItem) {
      const item = this._nearbyItem.getData('item');
      this._pickupHint
        .setText(`[E]  ${item.name}`)
        .setPosition(this.x, this.y - 36)
        .setVisible(true);
    } else {
      this._pickupHint.setVisible(false);
    }
  }

  /** Feedback texte flottant lors d'un ramassage */
  _showPickupFeedback(text, color = 0xffe066) {
    const t = this.scene.add.text(this.x, this.y - 60, text, {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: `#${color.toString(16).padStart(6, '0')}`,
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    this.scene.tweens.add({
      targets: t,
      y: t.y - 30,
      alpha: 0,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => t.destroy(),
    });
  }
}
