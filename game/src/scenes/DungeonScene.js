/**
 * DungeonScene.js
 * Donjon de 8 salles accessible via la Clé des Égouts.
 *
 * Salles :
 *  R1 Entrée   → R2 Pièges  → R3 Levier
 *                ↓              ↓ (porte)
 *  R6 Secret   ← R4 Rats    R5 Infectés
 *                              ↓
 *                           R7 Énigme → (porte) R8 Sortie
 */

import { Player }          from '../entities/Player.js';
import { Rat }             from '../entities/Rat.js';
import { ZombieInfected }  from '../entities/ZombieInfected.js';
import { Trap, Lever, DungeonDoor } from '../entities/dungeon/DungeonObjects.js';
import { DungeonMap }      from '../world/DungeonMap.js';
import { DungeonAudio }    from '../systems/DungeonAudio.js';
import { GameConfig }      from '../config/GameConfig.js';
import { Notification }    from '../ui/Notification.js';
import { PlayerHUD }       from '../ui/PlayerHUD.js';

const W = GameConfig.WIDTH;
const H = GameConfig.HEIGHT;

export class DungeonScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DungeonScene' });

    this._player      = null;
    this._audio       = null;
    this._map         = null;
    this._notification = null;
    this._playerHUD   = null;

    // Ennemis
    this._rats     = [];
    this._infected = [];

    // Objets
    this._traps  = [];
    this._levers = [];
    this._doors  = {};

    // Poison
    this._poisonTimer = 0;
    this._poisonTick  = 0;

    // Énigme R7 (3 leviers dans l'ordre)
    this._enigmaProgress = 0;
    this._enigmaSolved   = false;

    // Flags d'activation des salles (enemies)
    this._roomTriggered = {};

    // Overlay d'obscurité dynamique
    this._darknessOverlay = null;
  }

  // ── Création ──────────────────────────────────────────────────────────────────

  create() {
    this.physics.world.setBounds(0, 0, 1800, 1400);

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
  }

  // ── Joueur ───────────────────────────────────────────────────────────────────

  _buildPlayer() {
    // Spawn en R1 (entrée)
    this._player = new Player(this, 344, 544);

    // Rewire les attaques joueur vers les ennemis du donjon
    this._player.on('attack', (info) => {
      if (!info) return;
      this._handlePlayerAttack(info);
    });

    // Mort du joueur → retour au jeu
    this._player.on('dead', () => this._onPlayerDead());
  }

  _setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, 1800, 1400);
    cam.startFollow(this._player, true, 0.08, 0.08);
    cam.setDeadzone(60, 40);
  }

  // ── Portes ───────────────────────────────────────────────────────────────────

  _buildDoors() {
    // V3 : corridor R3↔R5 (bloqué jusqu'au levier de R3)
    this._doors.v3 = new DungeonDoor(this, 1144, 702, 'v');
    // H3 : corridor R7↔R8 (bloqué jusqu'à l'énigme de R7)
    this._doors.h3 = new DungeonDoor(this, 1344, 1184, 'h');
  }

  // ── Pièges ───────────────────────────────────────────────────────────────────

  _buildTraps() {
    const trapPositions = [
      { x: 680, y: 512 },
      { x: 744, y: 544 },
      { x: 780, y: 510 },
    ];
    trapPositions.forEach(({ x, y }) => {
      this._traps.push(new Trap(this, x, y, 20));
    });
  }

  // ── Leviers ──────────────────────────────────────────────────────────────────

  _buildLevers() {
    // Levier de R3 : ouvre la porte V3
    const leverR3 = new Lever(this, 1100, 540, () => {
      this._doors.v3.open();
      this._notification.show('Porte ouverte !', '#ffcc00', 2500);
    }, 'E');
    this._levers.push({ lever: leverR3, room: 'R3', enigma: false });

    // Leviers énigme R7 (ordre : L1 → L2 → L3)
    const enigmaPositions = [
      { x: 1040, y: 1160, label: '1' },
      { x: 1140, y: 1240, label: '2' },
      { x: 1240, y: 1160, label: '3' },
    ];
    enigmaPositions.forEach(({ x, y, label }, i) => {
      const lever = new Lever(this, x, y, () => {
        this._onEnigmaLever(i);
      }, label);
      this._levers.push({ lever, room: 'R7', enigma: true, idx: i });
    });
  }

  // ── Ténèbres ─────────────────────────────────────────────────────────────────

  _buildDarkness() {
    // Couche d'obscurité fixe qui suit la caméra
    this._darknessOverlay = this.add.graphics()
      .setScrollFactor(0)
      .setDepth(50);

    this._updateDarkness();

    // Mise à jour à chaque frame
    this.events.on('update', () => this._updateDarkness());
  }

  _updateDarkness() {
    const ov = this._darknessOverlay;
    ov.clear();

    if (!this._player) return;

    // Coordonnées joueur en espace caméra
    const cam = this.cameras.main;
    const px  = (this._player.x - cam.scrollX) * cam.zoom;
    const py  = (this._player.y - cam.scrollY) * cam.zoom;

    const sw = this.scale.width;
    const sh = this.scale.height;

    // Fond très sombre
    ov.fillStyle(0x000000, 0.82);
    ov.fillRect(0, 0, sw, sh);

    // Halo de lumière autour du joueur (gradient approximé)
    const steps   = 12;
    const maxR    = 160;
    for (let i = steps; i >= 0; i--) {
      const r     = maxR * (i / steps);
      const alpha = 0.82 * (i / steps) * (i / steps);
      ov.fillStyle(0x000000, alpha);
      ov.fillCircle(px, py, r);
    }

    // Teinture verte si empoisonné
    if (this._poisonTimer > 0) {
      ov.fillStyle(0x003300, 0.25);
      ov.fillRect(0, 0, sw, sh);
    }
  }

  // ── HUD ─────────────────────────────────────────────────────────────────────

  _buildHUD() {
    this._playerHUD = new PlayerHUD(this, this._player);

    // Indicateur poison
    this._poisonText = this.add.text(W / 2, 36, '', {
      fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold',
      color: '#00ff66', stroke: '#000', strokeThickness: 3,
    }).setScrollFactor(0).setDepth(200).setOrigin(0.5).setAlpha(0);

    // Label de salle courant
    this._roomLabel = this.add.text(16, 16, 'Salle 1 — Entrée', {
      fontFamily: 'monospace', fontSize: '13px',
      color: '#8899bb', stroke: '#000', strokeThickness: 2,
    }).setScrollFactor(0).setDepth(200);

    // Progression énigme
    this._enigmaText = this.add.text(W - 16, H - 16, '', {
      fontFamily: 'monospace', fontSize: '13px',
      color: '#ffcc44', stroke: '#000', strokeThickness: 2,
    }).setScrollFactor(0).setDepth(200).setOrigin(1, 1).setAlpha(0);
  }

  // ── Audio ────────────────────────────────────────────────────────────────────

  _buildAudio() {
    this._audio = new DungeonAudio();
    try {
      this._audio.start();
    } catch (e) {
      console.warn('DungeonAudio: démarrage différé', e.message);
    }
  }

  // ── Physique ─────────────────────────────────────────────────────────────────

  _setupPhysics() {
    // Joueur vs murs
    this.physics.add.collider(this._player, this._map.wallsGroup);

    // Portes (statiques Phaser)
    [this._doors.v3, this._doors.h3].forEach(door => {
      this.physics.add.collider(this._player, door.body);
    });
  }

  // ── Événements ───────────────────────────────────────────────────────────────

  _setupEvents() {
    // Poison émis par ZombieInfected
    this.events.on('player-infected', (duration) => {
      this._poisonTimer = Math.max(this._poisonTimer, duration);
      this._notification.show('☠  EMPOISONNÉ !', '#00ff66', 2000);
    });
  }

  // ── Touche Échap ─────────────────────────────────────────────────────────────

  _buildReturnKey() {
    this.input.keyboard.on('keydown-ESC', () => {
      this._exitDungeon();
    });
  }

  _exitDungeon() {
    if (this._audio) this._audio.stop();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene');
    });
  }

  _onPlayerDead() {
    this._notification.show('Vous êtes mort dans le donjon…', '#ff2200', 3000);
    this.time.delayedCall(2000, () => this._exitDungeon());
  }

  // ── Boucle principale ─────────────────────────────────────────────────────────

  update(time, delta) {
    if (!this._player) return;

    this._player.update(time, delta);
    this._playerHUD.update();

    // Pièges
    this._traps.forEach(t => t.update(delta, this._player));

    // Leviers (proximité hint + interaction E)
    this._levers.forEach(({ lever }) => lever.update(this._player));
    this._handleLeverInput();

    // Ennemis
    this._rats.forEach(r => { if (!r.isDead) r.update(delta, this._player); });
    this._infected.forEach(z => { if (!z.isDead) z.update(delta, this._player); });

    // Nettoyage ennemis morts
    this._rats     = this._rats.filter(r => !r.isDead);
    this._infected = this._infected.filter(z => !z.isDead);

    // Poison
    this._updatePoison(delta);

    // Déclencheurs de salle
    this._checkRoomTriggers();

    // Zone de sortie R8
    this._checkExit();
  }

  // ── Interaction leviers ───────────────────────────────────────────────────────

  _handleLeverInput() {
    const eJustDown = Phaser.Input.Keyboard.JustDown(this._player.keys.E);
    if (!eJustDown) return;

    for (const { lever } of this._levers) {
      const dist = Phaser.Math.Distance.Between(
        lever.x, lever.y, this._player.x, this._player.y
      );
      if (dist < 50 && !lever.isPulled) {
        lever.pull();
        break;
      }
    }
  }

  // ── Énigme ───────────────────────────────────────────────────────────────────

  _onEnigmaLever(idx) {
    if (this._enigmaSolved) return;

    const expected = this._enigmaProgress;
    if (idx === expected) {
      this._enigmaProgress++;
      this._enigmaText
        .setText(`Énigme : ${this._enigmaProgress}/3`)
        .setAlpha(1);

      if (this._enigmaProgress >= 3) {
        // Succès
        this._enigmaSolved = true;
        this._doors.h3.open();
        this._enigmaText.setText('Énigme résolue !').setStyle({ color: '#00ff88' });
        this._notification.show('✦  PASSAGE OUVERT !', '#00ffcc', 4000);
        this.cameras.main.flash(200, 0, 100, 80, true);
      }
    } else {
      // Mauvais ordre : reset + pénalité
      this._enigmaProgress = 0;
      this._enigmaText.setText('Mauvais ordre !').setStyle({ color: '#ff4444' }).setAlpha(1);
      this.time.delayedCall(1500, () => {
        this._enigmaText.setText('').setAlpha(0);
      });

      // Réinitialiser les leviers énigme
      this._levers
        .filter(({ enigma }) => enigma)
        .forEach(({ lever }) => lever.reset());

      // Pénalité : 3 rats
      this._spawnRatsAt(
        this._player.x + (Math.random() - 0.5) * 80,
        this._player.y + (Math.random() - 0.5) * 80,
        3
      );

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

    const sec = Math.ceil(this._poisonTimer / 1000);
    this._poisonText.setText(`☠ POISON ${sec}s`).setAlpha(1);

    if (this._poisonTick <= 0) {
      this._poisonTick = 500;
      this._player.takeDamage(1);
    }
  }

  // ── Déclencheurs d'ennemis ────────────────────────────────────────────────────

  _checkRoomTriggers() {
    const px = this._player.x;
    const py = this._player.y;

    // R4 : rats (sx=600,sy=760,sw=288,sh=208)
    if (!this._roomTriggered.R4 && this._inRoom(px, py, 600, 760, 288, 208)) {
      this._roomTriggered.R4 = true;
      this._roomLabel.setText('Salle 4 — Nid de Rats');
      this._spawnRatsAt(720, 860, 5);
      this._notification.show('Des rats ! Tuez-les tous !', '#ffaa44', 2500);
    }

    // R5 : infectés (sx=1000,sy=760,sw=288,sh=208)
    if (!this._roomTriggered.R5 && this._inRoom(px, py, 1000, 760, 288, 208)) {
      this._roomTriggered.R5 = true;
      this._roomLabel.setText('Salle 5 — Zone Infectée');
      this._spawnInfectedAt(1100, 860, 3);
      this._notification.show('⚠  Zombies Infectés ! Ils empoisonnent !', '#00ff66', 3000);
    }

    // Labels des autres salles
    if (!this._roomTriggered.R1 && this._inRoom(px, py, 200, 440, 288, 208)) {
      this._roomTriggered.R1 = true;
      this._roomLabel.setText('Salle 1 — Entrée');
    }
    if (!this._roomTriggered.R2 && this._inRoom(px, py, 600, 440, 288, 208)) {
      this._roomTriggered.R2 = true;
      this._roomLabel.setText('Salle 2 — Salle des Pièges');
      this._notification.show('Attention aux pièges !', '#ff8800', 2500);
    }
    if (!this._roomTriggered.R3 && this._inRoom(px, py, 1000, 440, 288, 208)) {
      this._roomTriggered.R3 = true;
      this._roomLabel.setText('Salle 3 — Salle du Levier');
      this._notification.show('Actionnez le levier [E]', '#ffdd88', 2500);
    }
    if (!this._roomTriggered.R6 && this._inRoom(px, py, 200, 760, 288, 208)) {
      this._roomTriggered.R6 = true;
      this._roomLabel.setText('Salle 6 — Passage Secret');
      this._notification.show('Un coin calme… méfiez-vous.', '#8899ff', 2000);
    }
    if (!this._roomTriggered.R7 && this._inRoom(px, py, 1000, 1080, 288, 208)) {
      this._roomTriggered.R7 = true;
      this._roomLabel.setText('Salle 7 — Salle des Énigmes');
      this._enigmaText.setAlpha(1).setText('Énigme : 0/3');
      this._notification.show('Actionnez les leviers dans le bon ordre !', '#ffcc44', 3500);
    }
    if (!this._roomTriggered.R8 && this._inRoom(px, py, 1400, 1080, 288, 208)) {
      this._roomTriggered.R8 = true;
      this._roomLabel.setText('Salle 8 — Sortie');
      this._notification.show('Vous apercevez la lumière du jour…', '#ffffaa', 3000);
    }
  }

  _inRoom(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }

  // ── Zone de sortie ────────────────────────────────────────────────────────────

  _checkExit() {
    if (!this._inRoom(this._player.x, this._player.y, 1400, 1080, 288, 208)) return;
    if (this._player.x > 1640 && this._player.y > 1240) {
      this._exitDungeon();
    }
  }

  // ── Spawn ennemis ─────────────────────────────────────────────────────────────

  _spawnRatsAt(cx, cy, count) {
    for (let i = 0; i < count; i++) {
      const x   = cx + (Math.random() - 0.5) * 100;
      const y   = cy + (Math.random() - 0.5) * 100;
      const rat = new Rat(this, x, y);
      this._rats.push(rat);

      // Collider murs
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
      if (Math.abs(diff) <= arc / 2) {
        enemy.takeDamage(damage);
      }
    };

    this._rats.forEach(hit);
    this._infected.forEach(hit);
  }
}
