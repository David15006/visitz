/**
 * GameScene.js
 * Scène principale — orchestre tous les systèmes du jeu.
 */

import { GameConfig }    from '../config/GameConfig.js';
import { Player }        from '../entities/Player.js';
import { WorldMap }      from '../world/WorldMap.js';
import { DayNightCycle } from '../systems/DayNightCycle.js';
import { AudioManager }  from '../systems/AudioManager.js';
import { SoundManager }  from '../systems/SoundManager.js';
import { ZombieSpawner } from '../systems/ZombieSpawner.js';
import { HUD }           from '../ui/HUD.js';
import { PlayerHUD }     from '../ui/PlayerHUD.js';
import { Bat }           from '../entities/items/Bat.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });

    /** @type {Player} */
    this._player   = null;
    /** @type {DayNightCycle} */
    this._dayNight = null;
    /** @type {AudioManager} */
    this._audio    = null;
    /** @type {HUD} */
    this._hud      = null;
    /** @type {PlayerHUD} */
    this._playerHUD = null;
    /** @type {SoundManager} */
    this._sound = null;
    /** @type {ZombieSpawner} */
    this._spawner = null;

    // Groupe d'items ramassables du monde
    this._worldItems = null;
  }

  create() {
    const { MAP_WIDTH: W, MAP_HEIGHT: H } = GameConfig;

    this.physics.world.setBounds(0, 0, W, H);

    // Ordre de création (respecte les depths)
    this._buildMap();
    this._spawnWorldItems();
    this._buildPlayer(W, H);
    this._setupCamera(W, H);
    this._buildDayNight();
    this._buildHUDs();
    this._buildAudio();
    this._buildZombies();
    this._buildReturnKey();

    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  // ── Carte ─────────────────────────────────────────────────────────────────

  _buildMap() {
    new WorldMap(this);
  }

  // ── Items du monde ────────────────────────────────────────────────────────

  /**
   * Place quelques battes ramassables aux alentours de la base.
   * Chaque sprite porte ses données item via `setData('item', ...)`.
   */
  _spawnWorldItems() {
    this._worldItems = this.add.group();

    const spawns = [
      { x: 1750, y: 1100 },
      { x: 1420, y: 1350 },
      { x: 1640, y: 900  },
    ];

    spawns.forEach(({ x, y }) => {
      const sprite = this.add.image(x, y, 'bat_world')
        .setDepth(3)
        .setData('item', new Bat());

      // Légère animation de flottement
      this.tweens.add({
        targets: sprite,
        y: y - 5,
        duration: 900 + Math.random() * 400,
        ease: 'Sine.inOut',
        yoyo: true,
        repeat: -1,
      });

      // Glow pulsé (alpha)
      this.tweens.add({
        targets: sprite,
        alpha: 0.65,
        duration: 600,
        ease: 'Sine.inOut',
        yoyo: true,
        repeat: -1,
      });

      this._worldItems.add(sprite);
    });
  }

  // ── Joueur ────────────────────────────────────────────────────────────────

  _buildPlayer(w, h) {
    this._player = new Player(this, 1600, 1200);
    this._player.setWorldItems(this._worldItems);
  }

  // ── Caméra ────────────────────────────────────────────────────────────────

  _setupCamera(mapW, mapH) {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, mapW, mapH);
    cam.startFollow(this._player, true, 0.09, 0.09);
    cam.setDeadzone(80, 50);
  }

  // ── Jour / nuit ────────────────────────────────────────────────────────────

  _buildDayNight() {
    this._dayNight = new DayNightCycle(this, (phase) => {
      if (!this._audio) return;
      if (phase === 'night')   this._audio.transitionToNight();
      if (phase === 'day')     this._audio.transitionToDay();
    });
  }

  // ── HUDs ──────────────────────────────────────────────────────────────────

  _buildHUDs() {
    // HUD général : jour, heure, coords, aide clavier
    this._hud = new HUD(this, this._dayNight, this._player);
    // HUD joueur : vie, endurance, inventaire
    this._playerHUD = new PlayerHUD(this, this._player);
  }

  // ── Audio ─────────────────────────────────────────────────────────────────

  _buildAudio() {
    this._audio = new AudioManager();
    try {
      this._audio.start();
    } catch (e) {
      console.warn('AudioManager: démarrage différé', e.message);
    }
  }

  // ── Zombies ───────────────────────────────────────────────────────────────

  _buildZombies() {
    this._sound   = new SoundManager();
    this._spawner = new ZombieSpawner(this, this._player, this._sound, this._worldItems);

    // Quand le joueur attaque, déléguer la détection au spawner
    this._player.on('attack', (info) => {
      if (!info) return;
      this._spawner.handlePlayerAttack(
        info.x, info.y, info.angle, info.range, info.arc, info.damage
      );
    });
  }

  // ── Touche Échap ──────────────────────────────────────────────────────────

  _buildReturnKey() {
    this.input.keyboard.once('keydown-ESC', () => {
      if (this._audio) this._audio.stop();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MainMenuScene');
      });
    });
  }

  // ── Boucle principale ─────────────────────────────────────────────────────

  update(time, delta) {
    this._player.update(time, delta);
    this._dayNight.update(delta);
    this._spawner.update(delta, this._dayNight.isNight);
    this._hud.update();
    this._playerHUD.update();
    this._sound?.resume();
  }
}
