/**
 * ZombieSpawner.js
 * Gère l'apparition et la mise à jour de tous les zombies.
 * Les zombies ne spawnen et n'attaquent que la nuit.
 */

import { ZombieNormal } from '../entities/zombies/ZombieNormal.js';
import { ZombieFast   } from '../entities/zombies/ZombieFast.js';
import { ZombieTank   } from '../entities/zombies/ZombieTank.js';
import { GameConfig   } from '../config/GameConfig.js';

const { ZOMBIES: CFG } = GameConfig;

const TYPES = [
  { Class: ZombieNormal, weight: 6 },
  { Class: ZombieFast,   weight: 3 },
  { Class: ZombieTank,   weight: 1 },
];

export class ZombieSpawner {
  /**
   * @param {Phaser.Scene} scene
   * @param {Player}       player
   * @param {SoundManager} sound
   * @param {Phaser.GameObjects.Group} worldItems - groupe pour les loots
   */
  constructor(scene, player, sound, worldItems) {
    this._scene      = scene;
    this._player     = player;
    this._sound      = sound;
    this._worldItems = worldItems;

    this._zombies     = [];
    this._spawnTimer  = CFG.SPAWN_INTERVAL;  // spawn dès la première nuit
  }

  // ── Mise à jour ──────────────────────────────────────────────────────────

  /**
   * @param {number}  delta
   * @param {boolean} isNight
   */
  update(delta, isNight) {
    // Spawn
    if (isNight) {
      this._spawnTimer -= delta;
      if (this._spawnTimer <= 0) {
        this._spawnTimer = CFG.SPAWN_INTERVAL;
        this._trySpawn();
      }
    }

    // Mise à jour de chaque zombie vivant
    for (let i = this._zombies.length - 1; i >= 0; i--) {
      const z = this._zombies[i];
      if (z.isDead || !z.active) {
        this._zombies.splice(i, 1);
        continue;
      }
      z.update(delta, this._player, this._sound, isNight);
    }
  }

  // ── Spawn ────────────────────────────────────────────────────────────────

  _trySpawn() {
    if (this._zombies.length >= CFG.MAX_ACTIVE) return;

    const { x, y } = this._randomSpawnPos();
    const ZClass   = this._pickType();
    const zombie   = new ZClass(this._scene, x, y);
    zombie.setWorldItems(this._worldItems);

    this._setupAnimations(zombie);
    this._zombies.push(zombie);
  }

  _randomSpawnPos() {
    const player = this._player;
    const angle  = Math.random() * Math.PI * 2;
    const dist   = CFG.SPAWN_MIN_DIST + Math.random() * (CFG.SPAWN_MAX_DIST - CFG.SPAWN_MIN_DIST);

    const x = Phaser.Math.Clamp(player.x + Math.cos(angle) * dist, 50, GameConfig.MAP_WIDTH  - 50);
    const y = Phaser.Math.Clamp(player.y + Math.sin(angle) * dist, 50, GameConfig.MAP_HEIGHT - 50);
    return { x, y };
  }

  _pickType() {
    const total  = TYPES.reduce((s, t) => s + t.weight, 0);
    let   roll   = Math.random() * total;
    for (const t of TYPES) {
      roll -= t.weight;
      if (roll <= 0) return t.Class;
    }
    return ZombieNormal;
  }

  // ── Animations ───────────────────────────────────────────────────────────

  _setupAnimations(zombie) {
    const pfx = zombie._animPfx;
    if (this._scene.anims.exists(`${pfx}-walk`)) return;

    this._scene.anims.create({
      key: `${pfx}-walk`,
      frames: [
        { key: `${pfx}_walk_0` },
        { key: `${pfx}_walk_1` },
        { key: `${pfx}_walk_2` },
        { key: `${pfx}_walk_3` },
      ],
      frameRate: 8,
      repeat: -1,
    });

    this._scene.anims.create({
      key: `${pfx}-atk`,
      frames: [
        { key: `${pfx}_atk_0` },
        { key: `${pfx}_atk_1` },
      ],
      frameRate: 6,
      repeat: -1,
    });
  }

  // ── Gestion des attaques du joueur ───────────────────────────────────────

  /**
   * Appelé quand le joueur frappe.
   * @param {number} x       centre de l'arc
   * @param {number} y
   * @param {number} angle   angle visé (radians)
   * @param {number} range   portée de la frappe
   * @param {number} arc     demi-angle de l'arc (radians)
   * @param {number} damage
   */
  handlePlayerAttack(x, y, angle, range, arc, damage) {
    for (const z of this._zombies) {
      if (z.isDead) continue;

      const dist = Phaser.Math.Distance.Between(x, y, z.x, z.y);
      if (dist > range) continue;

      const toZombie = Phaser.Math.Angle.Between(x, y, z.x, z.y);
      const diff     = Phaser.Math.Angle.Wrap(toZombie - angle);
      if (Math.abs(diff) > arc / 2) continue;

      z.takeDamage(damage);
      this._sound?.zombieHit();
    }
  }

  get zombies() { return this._zombies; }
}
