/**
 * DungeonScene.js
 * Donjon de 9 salles accessible via la Clé des Égouts.
 *
 * Salles :
 *  R1 Entrée   → R2 Pièges  → R3 Levier
 *                ↓              ↓ (porte)
 *  R6 Secret   ← R4 Rats    R5 Infectés
 *                              ↓
 *                           R7 Énigme → (porte) R8 Antichambre → R9 BOSS
 */

import { Player }          from '../entities/Player.js';
import { Rat }             from '../entities/Rat.js';
import { ZombieInfected }  from '../entities/ZombieInfected.js';
import { RatKing }         from '../entities/RatKing.js';
import { Trap, Lever, DungeonDoor } from '../entities/dungeon/DungeonObjects.js';
import { DungeonMap }      from '../world/DungeonMap.js';
import { DungeonAudio }    from '../systems/DungeonAudio.js';
import { RatKingAudio }    from '../systems/RatKingAudio.js';
import { GameConfig }      from '../config/GameConfig.js';
import { Notification }    from '../ui/Notification.js';
import { PlayerHUD }       from '../ui/PlayerHUD.js';
import { BossHPBar }       from '../ui/BossHPBar.js';
import { QuestPanel }      from '../ui/QuestPanel.js';

const W = GameConfig.WIDTH;
const H = GameConfig.HEIGHT;

// Arène R9
const R9 = { x: 1800, y: 960, w: 380, h: 320 };

export class DungeonScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DungeonScene' });

    this._player       = null;
    this._audio        = null;
    this._bossAudio    = null;
    this._map          = null;
    this._notification = null;
    this._playerHUD    = null;
    this._bossHPBar    = null;

    // Ennemis
    this._rats     = [];
    this._infected = [];
    this._ratKing  = null;

    // Objets
    this._traps  = [];
    this._levers = [];
    this._doors  = {};

    // Porte boss (R8 → R9) : s'ouvre à l'entrée, se referme derrière
    this._bossDoor = null;

    // Poison
    this._poisonTimer = 0;
    this._poisonTick  = 0;

    // Énigme R7
    this._enigmaProgress = 0;
    this._enigmaSolved   = false;

    // Flags de salle
    this._roomTriggered = {};

    // Overlay ténèbres
    this._darknessOverlay = null;

    // Boss fight state
    this._bossTriggered  = false;
    this._bossDefeated   = false;
    this._victoryPlaying = false;

    // Portail de sortie (apparaît après victoire)
    this._exitPortal = null;
  }

  // ── Création ──────────────────────────────────────────────────────────────────

  create() {
    this.physics.world.setBounds(0, 0, 2200, 1600);

    this._map = new DungeonMap(this);

    this._buildPlayer();
    this._setupCamera();
    this._buildDoors();
    this._buildTraps();
    this._buildLevers();
    this._buildDarkness();
    this._buildHUD();
    this._buildAudio();
    this._setupPhysics();
    this._setupEvents();
    this._buildReturnKey();

    this.cameras.main.fadeIn(800, 0, 0, 0);

    this._notification = new Notification(this);
    this._notification.show('Vous entrez dans les Égouts…', '#88aaff', 3000);

    // Panneau de quêtes
    if (window.__quests) {
      this._questPanel = new QuestPanel(this, window.__quests);
    }
  }

  // ── Joueur ───────────────────────────────────────────────────────────────────

  _buildPlayer() {
    this._player = new Player(this, 344, 544);

    this._player.on('attack', (info) => {
      if (!info) return;
      this._handlePlayerAttack(info);
    });

    this._player.on('dead', () => this._onPlayerDead());
  }

  _setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, 2200, 1600);
    cam.startFollow(this._player, true, 0.08, 0.08);
    cam.setDeadzone(60, 40);
  }

  // ── Portes ───────────────────────────────────────────────────────────────────

  _buildDoors() {
    this._doors.v3 = new DungeonDoor(this, 1144, 702, 'v');
    this._doors.h3 = new DungeonDoor(this, 1344, 1184, 'h');
    // Porte boss : R8 → R9 (corridor H4 au centre)
    this._bossDoor = new DungeonDoor(this, 1744, 1184, 'h');
  }

  // ── Pièges ───────────────────────────────────────────────────────────────────

  _buildTraps() {
    [
      { x: 680, y: 512 },
      { x: 744, y: 544 },
      { x: 780, y: 510 },
    ].forEach(({ x, y }) => this._traps.push(new Trap(this, x, y, 20)));
  }

  // ── Leviers ──────────────────────────────────────────────────────────────────

  _buildLevers() {
    // Levier R3 → ouvre V3
    const leverR3 = new Lever(this, 1100, 540, () => {
      this._doors.v3.open();
      this._notification.show('Porte ouverte !', '#ffcc00', 2500);
    }, 'E');
    this._levers.push({ lever: leverR3, room: 'R3', enigma: false });

    // Leviers énigme R7
    [
      { x: 1040, y: 1160, label: '1' },
      { x: 1140, y: 1240, label: '2' },
      { x: 1240, y: 1160, label: '3' },
    ].forEach(({ x, y, label }, i) => {
      const lever = new Lever(this, x, y, () => this._onEnigmaLever(i), label);
      this._levers.push({ lever, room: 'R7', enigma: true, idx: i });
    });
  }

  // ── Ténèbres ─────────────────────────────────────────────────────────────────

  _buildDarkness() {
    this._darknessOverlay = this.add.graphics().setScrollFactor(0).setDepth(50);
    this.events.on('update', () => this._updateDarkness());
  }

  _updateDarkness() {
    const ov = this._darknessOverlay;
    ov.clear();
    if (!this._player) return;

    const cam = this.cameras.main;
    const px  = (this._player.x - cam.scrollX) * cam.zoom;
    const py  = (this._player.y - cam.scrollY) * cam.zoom;
    const sw  = this.scale.width;
    const sh  = this.scale.height;

    // Boss fight : légèrement moins sombre pour voir les attaques
    const baseDark = this._bossTriggered && !this._bossDefeated ? 0.72 : 0.82;

    ov.fillStyle(0x000000, baseDark);
    ov.fillRect(0, 0, sw, sh);

    const maxR = this._bossTriggered && !this._bossDefeated ? 220 : 160;
    for (let i = 12; i >= 0; i--) {
      const r     = maxR * (i / 12);
      const alpha = baseDark * (i / 12) * (i / 12);
      ov.fillStyle(0x000000, alpha);
      ov.fillCircle(px, py, r);
    }

    // Teinte verte si empoisonné
    if (this._poisonTimer > 0) {
      ov.fillStyle(0x003300, 0.22);
      ov.fillRect(0, 0, sw, sh);
    }

    // Teinte rouge si boss en phase 3
    if (this._ratKing && this._ratKing.phase === 3) {
      ov.fillStyle(0x1a0000, 0.18);
      ov.fillRect(0, 0, sw, sh);
    }
  }

  // ── HUD ──────────────────────────────────────────────────────────────────────

  _buildHUD() {
    this._playerHUD = new PlayerHUD(this, this._player);

    this._poisonText = this.add.text(W / 2, 36, '', {
      fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold',
      color: '#00ff66', stroke: '#000', strokeThickness: 3,
    }).setScrollFactor(0).setDepth(200).setOrigin(0.5).setAlpha(0);

    this._roomLabel = this.add.text(16, 16, 'Salle 1 — Entrée', {
      fontFamily: 'monospace', fontSize: '13px',
      color: '#8899bb', stroke: '#000', strokeThickness: 2,
    }).setScrollFactor(0).setDepth(200);

    this._enigmaText = this.add.text(W - 16, H - 16, '', {
      fontFamily: 'monospace', fontSize: '13px',
      color: '#ffcc44', stroke: '#000', strokeThickness: 2,
    }).setScrollFactor(0).setDepth(200).setOrigin(1, 1).setAlpha(0);
  }

  // ── Audio ─────────────────────────────────────────────────────────────────────

  _buildAudio() {
    this._audio = new DungeonAudio();
    try { this._audio.start(); } catch (e) {
      console.warn('DungeonAudio: démarrage différé', e.message);
    }
  }

  _startBossMusic() {
    this._audio?.stop();
    this._bossAudio = new RatKingAudio();
    try { this._bossAudio.start(); } catch (e) {
      console.warn('RatKingAudio: démarrage différé', e.message);
    }
  }

  _stopBossMusic() {
    this._bossAudio?.stop();
    this._bossAudio = null;
  }

  // ── Physique ─────────────────────────────────────────────────────────────────

  _setupPhysics() {
    this.physics.add.collider(this._player, this._map.wallsGroup);

    [this._doors.v3, this._doors.h3, this._bossDoor].forEach(door => {
      this.physics.add.collider(this._player, door.body);
    });
  }

  // ── Événements ───────────────────────────────────────────────────────────────

  _setupEvents() {
    this.events.on('player-infected', (duration) => {
      this._poisonTimer = Math.max(this._poisonTimer, duration);
      this._notification.show('☠  EMPOISONNÉ !', '#00ff66', 2000);
    });
  }

  // ── Touche Échap ─────────────────────────────────────────────────────────────

  _buildReturnKey() {
    this.input.keyboard.on('keydown-ESC', () => {
      if (this._victoryPlaying) return;
      this._exitDungeon();
    });
  }

  _exitDungeon() {
    this._audio?.stop();
    this._bossAudio?.stop();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene');
    });
  }

  _onPlayerDead() {
    this._notification.show('Vous êtes mort dans le donjon…', '#ff2200', 3000);
    this.time.delayedCall(2000, () => this._exitDungeon());
  }

  // ── Nettoyage ─────────────────────────────────────────────────────────────────

  shutdown() {
    this._questPanel?.destroy();
    this._questPanel = null;
    this._audio?.stop();
    this._bossAudio?.stop();
  }

  // ── Boucle principale ─────────────────────────────────────────────────────────

  update(time, delta) {
    if (!this._player || this._victoryPlaying) return;

    this._player.update(time, delta);
    this._playerHUD.update();

    this._traps.forEach(t => t.update(delta, this._player));
    this._levers.forEach(({ lever }) => lever.update(this._player));
    this._handleLeverInput();

    // Mise à jour + nettoyage paresseux (évite alloc tableau chaque frame)
    let rAlive = 0;
    for (let i = 0; i < this._rats.length; i++) {
      const r = this._rats[i];
      if (!r.isDead) { r.update(delta, this._player); this._rats[rAlive++] = r; }
    }
    this._rats.length = rAlive;

    let zAlive = 0;
    for (let i = 0; i < this._infected.length; i++) {
      const z = this._infected[i];
      if (!z.isDead) { z.update(delta, this._player); this._infected[zAlive++] = z; }
    }
    this._infected.length = zAlive;

    if (this._ratKing) {
      if (this._ratKing.isDead || !this._ratKing.active) {
        this._ratKing = null;
      } else {
        this._ratKing.update(delta, this._player);
        this._bossHPBar?.setHp(this._ratKing.hp);
      }
    }

    this._updatePoison(delta);
    this._checkRoomTriggers();
  }

  // ── Leviers ──────────────────────────────────────────────────────────────────

  _handleLeverInput() {
    if (!Phaser.Input.Keyboard.JustDown(this._player.keys.E)) return;

    for (const { lever } of this._levers) {
      const dist = Phaser.Math.Distance.Between(
        lever.x, lever.y, this._player.x, this._player.y
      );
      if (dist < 50 && !lever.isPulled) { lever.pull(); break; }
    }
  }

  // ── Énigme ───────────────────────────────────────────────────────────────────

  _onEnigmaLever(idx) {
    if (this._enigmaSolved) return;

    if (idx === this._enigmaProgress) {
      this._enigmaProgress++;
      this._enigmaText.setText(`Énigme : ${this._enigmaProgress}/3`).setAlpha(1);

      if (this._enigmaProgress >= 3) {
        this._enigmaSolved = true;
        this._doors.h3.open();
        this._enigmaText.setText('Énigme résolue !').setStyle({ color: '#00ff88' });
        this._notification.show('✦  PASSAGE OUVERT !', '#00ffcc', 4000);
        this.cameras.main.flash(200, 0, 100, 80, true);
      }
    } else {
      this._enigmaProgress = 0;
      this._enigmaText.setText('Mauvais ordre !').setStyle({ color: '#ff4444' }).setAlpha(1);
      this.time.delayedCall(1500, () => this._enigmaText.setAlpha(0));

      this._levers.filter(({ enigma }) => enigma).forEach(({ lever }) => lever.reset());
      this._spawnRatsAt(this._player.x, this._player.y, 3);
      this._notification.show('⚠  Mauvais ordre ! Des rats apparaissent…', '#ff6600', 3000);
    }
  }

  // ── Poison ───────────────────────────────────────────────────────────────────

  _updatePoison(delta) {
    if (this._poisonTimer <= 0) {
      this._poisonText.setAlpha(0);
      return;
    }
    this._poisonTimer -= delta;
    this._poisonTick  -= delta;

    this._poisonText
      .setText(`☠ POISON ${Math.ceil(this._poisonTimer / 1000)}s`)
      .setAlpha(1);

    if (this._poisonTick <= 0) {
      this._poisonTick = 500;
      this._player.takeDamage(1);
    }
  }

  // ── Déclencheurs de salle ────────────────────────────────────────────────────

  _checkRoomTriggers() {
    const { x: px, y: py } = this._player;

    const labels = {
      R1: 'Salle 1 — Entrée',
      R2: 'Salle 2 — Salle des Pièges',
      R3: 'Salle 3 — Salle du Levier',
      R4: 'Salle 4 — Nid de Rats',
      R5: 'Salle 5 — Zone Infectée',
      R6: 'Salle 6 — Passage Secret',
      R7: 'Salle 7 — Salle des Énigmes',
      R8: 'Salle 8 — Antichambre',
      R9: '⚔  Salle du Roi des Rats',
    };

    const rooms = [
      { id: 'R1', x: 200,  y: 440,  w: 288, h: 208 },
      { id: 'R2', x: 600,  y: 440,  w: 288, h: 208 },
      { id: 'R3', x: 1000, y: 440,  w: 288, h: 208 },
      { id: 'R4', x: 600,  y: 760,  w: 288, h: 208 },
      { id: 'R5', x: 1000, y: 760,  w: 288, h: 208 },
      { id: 'R6', x: 200,  y: 760,  w: 288, h: 208 },
      { id: 'R7', x: 1000, y: 1080, w: 288, h: 208 },
      { id: 'R8', x: 1400, y: 1080, w: 288, h: 208 },
      { id: 'R9', ...R9 },
    ];

    for (const room of rooms) {
      if (!this._inRoom(px, py, room.x, room.y, room.w, room.h)) continue;
      if (!this._roomTriggered[room.id]) {
        this._roomTriggered[room.id] = true;
        this._roomLabel.setText(labels[room.id]);
        this._onRoomEnter(room.id, px, py);
      }
    }
  }

  _onRoomEnter(id, px, py) {
    switch (id) {
      case 'R2':
        this._notification.show('Attention aux pièges !', '#ff8800', 2500);
        break;
      case 'R3':
        this._notification.show('Actionnez le levier [E]', '#ffdd88', 2500);
        break;
      case 'R4':
        this._spawnRatsAt(720, 860, 5);
        this._notification.show('Des rats ! Tuez-les tous !', '#ffaa44', 2500);
        break;
      case 'R5':
        this._spawnInfectedAt(1100, 860, 3);
        this._notification.show('⚠  Zombies Infectés ! Ils empoisonnent !', '#00ff66', 3000);
        break;
      case 'R6':
        this._notification.show('Un coin calme… méfiez-vous.', '#8899ff', 2000);
        break;
      case 'R7':
        this._enigmaText.setAlpha(1).setText('Énigme : 0/3');
        this._notification.show('Actionnez les leviers dans le bon ordre !', '#ffcc44', 3500);
        break;
      case 'R8':
        this._notification.show('Une présence menaçante… Préparez-vous.', '#ff6644', 3000);
        break;
      case 'R9':
        this._triggerBossFight();
        break;
    }
  }

  _inRoom(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }

  // ── Boss fight ────────────────────────────────────────────────────────────────

  _triggerBossFight() {
    if (this._bossTriggered) return;
    this._bossTriggered = true;

    // Bloquer la porte derrière (boss door se ferme visuellement mais pas physiquement —
    // le joueur peut toujours fuir)
    // Flash dramatique
    this.cameras.main.flash(400, 60, 0, 0, true);
    this.cameras.main.shake(500, 0.025);

    // Notification dramatique avec délai
    this._notification.show('⚠  LE ROI DES RATS EST ARRIVÉ !', '#ff2200', 5000);

    // Spawn RatKing au centre de R9
    const bx = R9.x + R9.w / 2;
    const by = R9.y + R9.h / 2;

    this.time.delayedCall(800, () => {
      this._ratKing = new RatKing(
        this, bx, by,
        this._player.worldItems ?? null,
        {
          onSummonRats:  (cx, cy, count) => this._spawnRatsAt(cx, cy, count),
          onPoisonHit:   (dur)           => this.events.emit('player-infected', dur),
          onPhaseChange: (phase)         => this._onBossPhaseChange(phase),
          onDeath:       ()              => this._onRatKingDeath(),
        }
      );

      // Collider boss vs murs
      this.physics.add.collider(
        this._ratKing, this._map.wallsGroup,
        (boss, wall) => boss.onWallCollision(wall)
      );

      // Barre de vie boss
      this._bossHPBar = new BossHPBar(this, '⚔  ROI DES RATS', 600, [0.66, 0.33]);
      this._bossHPBar.show();

      // Musique boss
      this._startBossMusic();
    });
  }

  _onBossPhaseChange(phase) {
    this._bossAudio?.setPhase(phase);

    const msgs = {
      2: ['☠  Phase 2 — Il est enragé !', '#ff8800'],
      3: ['☠☠  Phase 3 — RAGE TOTALE !',   '#ff0000'],
    };
    if (msgs[phase]) {
      this._notification.show(msgs[phase][0], msgs[phase][1], 3000);
    }
  }

  _onRatKingDeath() {
    this._bossDefeated  = true;
    this._victoryPlaying = true;
    this.game.events.emit('quest:kill_ratking');

    this._bossHPBar?.hide();
    this._stopBossMusic();

    // Reprendre la musique du donjon (plus douce après victoire)
    this.time.delayedCall(1500, () => {
      try { this._audio?.start(); } catch (e) {}
    });

    // Séquence de victoire
    this._playVictorySequence();
  }

  // ── Animation de victoire ─────────────────────────────────────────────────────

  _playVictorySequence() {
    const scene = this;
    const cam   = this.cameras.main;

    // 1. Zoom in sur position du boss (centre R9)
    cam.zoomTo(2.0, 1200, 'Power2');

    // 2. Texte de victoire
    this.time.delayedCall(600, () => {
      const victText = scene.add.text(W / 2, H / 2 - 60, '★  VICTOIRE  ★', {
        fontFamily: 'monospace', fontSize: '36px', fontStyle: 'bold',
        color: '#ffdd00', stroke: '#000', strokeThickness: 6,
      }).setScrollFactor(0).setDepth(300).setAlpha(0).setOrigin(0.5);

      scene.tweens.add({
        targets: victText, alpha: 1, y: H / 2 - 70,
        duration: 700, ease: 'Back.Out',
      });

      const subText = scene.add.text(W / 2, H / 2 - 20, 'Le Roi des Rats est vaincu !', {
        fontFamily: 'monospace', fontSize: '18px',
        color: '#ffcc44', stroke: '#000', strokeThickness: 3,
      }).setScrollFactor(0).setDepth(300).setAlpha(0).setOrigin(0.5);

      scene.tweens.add({
        targets: subText, alpha: 1, delay: 300, duration: 500,
      });

      // Pluie de particules dorées
      scene._spawnVictoryParticles();

      // Dézoom progressif
      scene.time.delayedCall(2000, () => {
        cam.zoomTo(1.0, 1500, 'Power2');

        scene.time.delayedCall(1200, () => {
          // Fade out les textes
          scene.tweens.add({
            targets: [victText, subText], alpha: 0, duration: 800,
            onComplete: () => { victText.destroy(); subText.destroy(); },
          });

          // Fin du blocage
          scene._victoryPlaying = false;

          // Créer le portail de sortie
          scene._createExitPortal();

          // Notification finale
          scene._notification.show(
            '★  CLÉ FINALE OBTENUE — La zone finale est déverrouillée !',
            '#ffdd00', 6000
          );
        });
      });
    });
  }

  _spawnVictoryParticles() {
    for (let i = 0; i < 30; i++) {
      this.time.delayedCall(i * 80, () => {
        if (!this.scene.isActive('DungeonScene')) return;
        const px = W / 2 + (Math.random() - 0.5) * W * 0.6;
        const py = H / 2 + (Math.random() - 0.5) * H * 0.5;
        const col = Math.random() < 0.5 ? 0xffdd00 : 0xff8800;
        const star = this.add.graphics().setScrollFactor(0).setDepth(299);
        star.fillStyle(col, 0.9);
        star.fillCircle(px, py, 4 + Math.random() * 5);
        this.tweens.add({
          targets: star,
          y: py - 60 - Math.random() * 80,
          alpha: 0,
          duration: 1200 + Math.random() * 600,
          ease: 'Power2',
          onComplete: () => star.destroy(),
        });
      });
    }
  }

  _createExitPortal() {
    // Portail lumineux au bas de R9
    const px = R9.x + R9.w / 2;
    const py = R9.y + R9.h - 48;

    this._exitPortal = this.add.graphics().setDepth(6);

    const drawPortal = () => {
      this._exitPortal.clear();
      const t     = this.time.now;
      const alpha = 0.7 + 0.2 * Math.sin(t / 300);
      this._exitPortal.fillStyle(0xffdd00, alpha);
      this._exitPortal.fillCircle(px, py, 22);
      this._exitPortal.lineStyle(3, 0xffffff, alpha * 0.8);
      this._exitPortal.strokeCircle(px, py, 28);
    };
    this.events.on('update', drawPortal);

    // Label
    const lbl = this.add.text(px, py - 40, '[ E ] Quitter le donjon', {
      fontFamily: 'monospace', fontSize: '12px',
      color: '#ffdd88', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(7);

    // Sauvegarder pour interaction
    this._exitPortalPos = { x: px, y: py, label: lbl };

    // Input E pour quitter
    this.input.keyboard.on('keydown-E', () => {
      if (!this._exitPortalPos) return;
      const dist = Phaser.Math.Distance.Between(
        this._player.x, this._player.y,
        this._exitPortalPos.x, this._exitPortalPos.y
      );
      if (dist < 60) this._exitDungeon();
    });
  }

  // ── Spawn ennemis ─────────────────────────────────────────────────────────────

  _spawnRatsAt(cx, cy, count) {
    for (let i = 0; i < count; i++) {
      const x   = cx + (Math.random() - 0.5) * 100;
      const y   = cy + (Math.random() - 0.5) * 100;
      const rat = new Rat(this, x, y);
      this._rats.push(rat);
      this.physics.add.collider(rat, this._map.wallsGroup);
    }
  }

  _spawnInfectedAt(cx, cy, count) {
    for (let i = 0; i < count; i++) {
      const x = cx + (Math.random() - 0.5) * 120;
      const y = cy + (Math.random() - 0.5) * 120;
      const z = new ZombieInfected(this, x, y);
      this._infected.push(z);
      this.physics.add.collider(z, this._map.wallsGroup);
    }
  }

  // ── Attaques joueur ──────────────────────────────────────────────────────────

  _handlePlayerAttack({ x, y, angle, range, arc, damage }) {
    const hit = (enemy) => {
      if (enemy.isDead) return;
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (dist > range) return;
      const toTarget = Phaser.Math.Angle.Between(x, y, enemy.x, enemy.y);
      const diff     = Phaser.Math.Angle.Wrap(toTarget - angle);
      if (Math.abs(diff) <= arc / 2) enemy.takeDamage(damage);
    };

    this._rats.forEach(hit);
    this._infected.forEach(hit);
    if (this._ratKing && !this._ratKing.isDead) hit(this._ratKing);
  }
}
