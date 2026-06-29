/**
 * GameScene.js
 * Scène principale — orchestre tous les systèmes du jeu.
 */

import { GameConfig }       from '../config/GameConfig.js';
import { Player }           from '../entities/Player.js';
import { WorldMap }         from '../world/WorldMap.js';
import { Base }             from '../world/Base.js';
import { DayNightCycle }    from '../systems/DayNightCycle.js';
import { AudioManager }     from '../systems/AudioManager.js';
import { SoundManager }     from '../systems/SoundManager.js';
import { ZombieSpawner }    from '../systems/ZombieSpawner.js';
import { Kitchen }          from '../systems/Kitchen.js';
import { Shop }             from '../systems/Shop.js';
import { SurvivorSpawner }  from '../systems/SurvivorSpawner.js';
import { BossSpawner }      from '../systems/BossSpawner.js';
import { HUD }              from '../ui/HUD.js';
import { PlayerHUD }        from '../ui/PlayerHUD.js';
import { Notification }     from '../ui/Notification.js';
import { Bat }              from '../entities/items/Bat.js';

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
    /** @type {Base} */
    this._base = null;
    /** @type {Kitchen} */
    this._kitchen = null;
    /** @type {Shop} */
    this._shop = null;
    /** @type {SurvivorSpawner} */
    this._survivorSpawner = null;
    /** @type {BossSpawner} */
    this._bossSpawner = null;
    /** @type {Notification} */
    this._notification = null;

    // Groupe d'items ramassables du monde
    this._worldItems = null;
  }

  create() {
    const { MAP_WIDTH: W, MAP_HEIGHT: H } = GameConfig;

    this.physics.world.setBounds(0, 0, W, H);

    // Ordre de création (respecte les depths)
    this._buildMap();
    this._buildBase();
    this._spawnWorldItems();
    this._buildPlayer(W, H);
    this._setupCamera(W, H);
    this._buildDayNight();
    this._buildHUDs();
    this._buildAudio();
    this._buildZombies();
    this._buildKitchen();
    this._buildShop();
    this._buildSurvivors();
    this._buildBoss();
    this._setupPhysics();
    this._buildReturnKey();
    this._buildSewerGrate();
    this._buildFinalGate();

    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  // ── Carte ─────────────────────────────────────────────────────────────────

  _buildMap() {
    new WorldMap(this);
  }

  // ── Base ──────────────────────────────────────────────────────────────────

  _buildBase() {
    this._base = new Base(this);
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
    // Spawn légèrement au nord du centre (stall au centre)
    this._player = new Player(this, 1600, 1165);
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

  // ── Cuisine ───────────────────────────────────────────────────────────────

  _buildKitchen() {
    this._kitchen = new Kitchen(this);
  }

  // ── Boutique ──────────────────────────────────────────────────────────────

  _buildShop() {
    this._shop = new Shop(this);
  }

  // ── Survivants ────────────────────────────────────────────────────────────

  _buildSurvivors() {
    this._survivorSpawner = new SurvivorSpawner(this, this._player);
  }

  // ── Boss ──────────────────────────────────────────────────────────────────

  _buildBoss() {
    this._notification = new Notification(this);

    this._bossSpawner = new BossSpawner(
      this, this._player, this._worldItems,
      {
        onBossSpawn: () => {
          this._notification.show(
            '⚠  UNE CRÉATURE SPÉCIALE EST APPARUE !',
            '#ff2200',
            4000
          );
        },
        onBossKill: () => {
          this._notification.show(
            '★  BOSS VAINCU — CLÉ DES ÉGOUTS OBTENUE !',
            '#cc00ff',
            5000
          );
        },
      }
    );

    // Wirer les attaques du joueur vers le boss également
    this._player.on('attack', (info) => {
      if (!info) return;
      this._bossSpawner.handlePlayerAttack(
        info.x, info.y, info.angle, info.range, info.arc, info.damage
      );
    });
  }

  // ── Colliders physiques ────────────────────────────────────────────────────

  _setupPhysics() {
    // Joueur bloqué par les murs
    this.physics.add.collider(this._player, this._base.wallsGroup);

    // Zombies bloqués par les murs + callback d'attaque de mur
    this.physics.add.collider(
      this._spawner.group,
      this._base.wallsGroup,
      (zombie, wall) => zombie.onWallCollision(wall)
    );

    // Boss bloqué par les murs + attaque de mur
    this.physics.add.collider(
      this._bossSpawner.group,
      this._base.wallsGroup,
      (boss, wall) => boss.onWallCollision(wall)
    );
  }

  // ── Grille des Égouts ─────────────────────────────────────────────────────

  _buildSewerGrate() {
    const x = 1650;
    const y = 1450;

    this._sewerGrate = this.add.image(x, y, 'sewer_grate').setDepth(3);

    // Légère animation pulsée
    this.tweens.add({
      targets: this._sewerGrate,
      alpha: 0.6,
      duration: 1200,
      ease: 'Sine.inOut',
      yoyo: true,
      repeat: -1,
    });

    // Texte d'aide
    this._sewerHint = this.add.text(x, y - 28, '[E] Entrer dans les Égouts', {
      fontFamily: 'monospace', fontSize: '11px',
      color: '#aabbff', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(4).setAlpha(0);
  }

  // ── Portail de la Zone Finale ─────────────────────────────────────────────

  _buildFinalGate() {
    const x = 1700;
    const y = 1250;

    // Porte verrouillée (graphique)
    this._finalGateGfx = this.add.graphics().setDepth(4);
    this._finalGateGfx.fillStyle(0x221133, 1);
    this._finalGateGfx.fillRect(x - 20, y - 36, 40, 72);
    this._finalGateGfx.lineStyle(3, 0x660099, 0.9);
    this._finalGateGfx.strokeRect(x - 20, y - 36, 40, 72);
    // Serrure
    this._finalGateGfx.fillStyle(0xaa0088, 1);
    this._finalGateGfx.fillCircle(x, y, 7);
    this._finalGateGfx.fillStyle(0xcc00ff, 0.5);
    this._finalGateGfx.fillCircle(x, y, 4);

    this._finalGateOpen = false;

    this._finalGateHint = this.add.text(x, y - 52, '', {
      fontFamily: 'monospace', fontSize: '11px',
      color: '#cc88ff', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(5).setAlpha(0);

    // Pulsation mystérieuse
    this.tweens.add({
      targets: this._finalGateGfx,
      alpha: 0.7,
      duration: 1400,
      ease: 'Sine.inOut',
      yoyo: true,
      repeat: -1,
    });
  }

  _checkFinalGateInteract() {
    // Portail ouvert : permettre d'entrer dans la Zone Finale
    if (this._finalGateOpen && this._openPortalX !== undefined) {
      const dist = Phaser.Math.Distance.Between(
        this._player.x, this._player.y, this._openPortalX, this._openPortalY
      );
      if (dist < 60) {
        this._finalGateHint
          ?.setPosition(this._openPortalX, this._openPortalY - 60)
          .setText('[E] Entrer dans la Zone Finale')
          .setAlpha(1);
        if (Phaser.Input.Keyboard.JustDown(this._player.keys.E)) {
          this._audio?.stop();
          this.cameras.main.fadeOut(500, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('FinalZoneScene');
          });
        }
      } else {
        this._finalGateHint?.setAlpha(0);
      }
      return;
    }

    if (!this._finalGateGfx || this._finalGateOpen) return;
    const gx = 1700;
    const gy = 1250;
    const dist = Phaser.Math.Distance.Between(this._player.x, this._player.y, gx, gy);

    if (dist < 70) {
      const hasKey = this._player.inventory.countByKey('final_key') > 0;
      this._finalGateHint
        .setText(hasKey ? '[E] Ouvrir la Zone Finale' : 'Clé Finale requise')
        .setAlpha(1);

      if (hasKey && Phaser.Input.Keyboard.JustDown(this._player.keys.E)) {
        this._player.inventory.removeByKey('final_key');
        this._openFinalGate(gx, gy);
      }
    } else {
      this._finalGateHint.setAlpha(0);
    }
  }

  _openFinalGate(x, y) {
    this._finalGateOpen = true;
    this._finalGateHint.setAlpha(0);

    // Explosion violette
    for (let i = 0; i < 8; i++) {
      const ring = this.add.graphics().setDepth(6);
      ring.lineStyle(3, 0xcc00ff, 0.9);
      ring.strokeCircle(x, y, 28);
      this.tweens.add({
        targets: ring,
        scaleX: 4 + i * 0.5, scaleY: 4 + i * 0.5,
        alpha: 0,
        delay: i * 80,
        duration: 600,
        onComplete: () => ring.destroy(),
      });
    }

    // Faire disparaître la porte
    this.tweens.add({
      targets: this._finalGateGfx,
      alpha: 0, scaleX: 2, scaleY: 2,
      duration: 700,
      onComplete: () => this._finalGateGfx.destroy(),
    });

    // Notification victoire totale
    if (this._notification) {
      this._notification.show(
        '🏆  ZONE FINALE DÉVERROUILLÉE — Vous avez vaincu le Roi des Rats !',
        '#ffdd00', 7000
      );
    }

    // Portail scintillant à la place
    const portal = this.add.graphics().setDepth(4);
    const drawPortal = () => {
      portal.clear();
      const t     = this.time.now;
      const alpha = 0.6 + 0.25 * Math.sin(t / 250);
      portal.fillStyle(0xcc00ff, alpha);
      portal.fillCircle(x, y, 22);
      portal.fillStyle(0xffffff, alpha * 0.4);
      portal.fillCircle(x, y, 12);
      portal.lineStyle(2, 0xffffff, alpha);
      portal.strokeCircle(x, y, 28);
    };
    this.events.on('update', drawPortal);

    // Label
    this.add.text(x, y - 44, '✦ ZONE FINALE', {
      fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold',
      color: '#ffdd00', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(5);

    // Mémoriser la position du portail ouvert pour l'interaction E
    this._openPortalX = x;
    this._openPortalY = y;

    this.cameras.main.shake(600, 0.02);
    this.cameras.main.flash(300, 80, 0, 120, true);
  }

  // ── Touche Échap ──────────────────────────────────────────────────────────

  _buildReturnKey() {
    this.input.keyboard.on('keydown-ESC', () => {
      // Priorité : fermer les UIs ouvertes avant de quitter
      if (this._kitchen?.isOpen) { this._kitchen.close(); return; }
      if (this._shop?.isOpen)    { this._shop.close();    return; }

      if (this._audio) this._audio.stop();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MainMenuScene');
      });
    });
  }

  // ── Boucle principale ─────────────────────────────────────────────────────

  update(time, delta) {
    const uiOpen = this._kitchen?.isOpen || this._shop?.isOpen;

    // Geler les inputs du joueur si une UI est ouverte
    if (!uiOpen) {
      this._player.update(time, delta);
      this._handleBaseInput();
      this._checkFinalGateInteract();
    }

    this._dayNight.update(delta);
    this._spawner.update(delta, this._dayNight.isNight);
    this._bossSpawner?.update(delta, this._dayNight.isNight, this._dayNight.dayCount);
    this._survivorSpawner?.update(delta);
    this._base.update(delta, this._player.x, this._player.y);
    this._kitchen?.update(delta, this._player.inventory);
    this._shop?.update();
    this._hud.update();
    this._playerHUD.update();
    this._sound?.resume();
  }

  _handleBaseInput() {
    const keys = this._player.keys;

    // F → porte
    if (Phaser.Input.Keyboard.JustDown(keys.F)) {
      this._base.toggleDoor(this._player.x, this._player.y);
    }

    // R → réparer mur
    if (Phaser.Input.Keyboard.JustDown(keys.R)) {
      this._base.repairNear(this._player.x, this._player.y);
    }

    // E → objet intérieur ou grille des égouts (si pas d'item monde à portée)
    if (Phaser.Input.Keyboard.JustDown(keys.E) && !this._player.nearbyItem) {
      // Grille des égouts : priorité si à portée et clé en inventaire
      if (this._sewerGrate) {
        const distGrate = Phaser.Math.Distance.Between(
          this._player.x, this._player.y, this._sewerGrate.x, this._sewerGrate.y
        );
        if (distGrate < 60) {
          if (this._player.inventory.countByKey('sewer_key') > 0) {
            this._player.inventory.removeByKey('sewer_key');
            if (this._audio) this._audio.stop();
            this.cameras.main.fadeOut(400, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
              this.scene.start('DungeonScene');
            });
            return;
          } else {
            // Pas de clé
            if (!this._sewerNoKeyText) {
              this._sewerNoKeyText = this.add.text(
                this._sewerGrate.x, this._sewerGrate.y - 44,
                'Il faut la Clé des Égouts…', {
                  fontFamily: 'monospace', fontSize: '11px',
                  color: '#ff8888', stroke: '#000', strokeThickness: 2,
                }
              ).setOrigin(0.5).setDepth(5);
              this.time.delayedCall(2500, () => {
                this._sewerNoKeyText?.destroy();
                this._sewerNoKeyText = null;
              });
            }
            return;
          }
        }
      }

      const objKey = this._base.interactNear(this._player.x, this._player.y);
      if (objKey === 'obj_kitchen') {
        this._kitchen.open(this._player.inventory);
      } else if (objKey === 'obj_shop') {
        this._shop.open(this._player.stats, this._player.inventory);
      }
    }

    // Affichage du hint de la grille selon proximité
    if (this._sewerGrate && this._sewerHint) {
      const distGrate = Phaser.Math.Distance.Between(
        this._player.x, this._player.y, this._sewerGrate.x, this._sewerGrate.y
      );
      this._sewerHint.setAlpha(distGrate < 60 ? 1 : 0);
    }
  }
}
