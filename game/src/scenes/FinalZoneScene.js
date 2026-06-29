/**
 * FinalZoneScene.js
 * Zone finale : arène circulaire + L'Obscur (boss final).
 *
 * Entrée via la zone finale déverrouillée par la Clé Finale.
 * Victoire → cinématique → CreditsScene.
 */

import { Player }         from '../entities/Player.js';
import { Rat }            from '../entities/Rat.js';
import { ZombieInfected } from '../entities/ZombieInfected.js';
import { FinalBoss }      from '../entities/FinalBoss.js';
import { FinalBossAudio } from '../systems/FinalBossAudio.js';
import { BossHPBar }      from '../ui/BossHPBar.js';
import { PlayerHUD }      from '../ui/PlayerHUD.js';
import { Notification }   from '../ui/Notification.js';
import { GameConfig }     from '../config/GameConfig.js';
import { QuestPanel }     from '../ui/QuestPanel.js';

const W = GameConfig.WIDTH;
const H = GameConfig.HEIGHT;

// Centre de l'arène
const ARENA = { cx: 800, cy: 800, radius: 430 };

export class FinalZoneScene extends Phaser.Scene {
  constructor() {
    super({ key: 'FinalZoneScene' });

    this._player       = null;
    this._boss         = null;
    this._audio        = null;
    this._bossHPBar    = null;
    this._playerHUD    = null;
    this._notification = null;

    this._rats     = [];
    this._infected = [];

    this._bossDefeated   = false;
    this._cinemaPlaying  = false;
    this._introComplete  = false;

    this._darknessGfx = null;
    this._poisonTimer  = 0;
    this._poisonTick   = 0;
  }

  // ── Création ──────────────────────────────────────────────────────────────────

  create() {
    this.physics.world.setBounds(0, 0, 1600, 1600);

    this._buildArena();
    this._buildPlayer();
    this._setupCamera();
    this._buildHUD();
    this._buildDarkness();
    this._setupEvents();

    // Panneau de quêtes
    if (window.__quests) {
      this._questPanel = new QuestPanel(this, window.__quests);
    }

    // Cinématique d'entrée avant de commencer le combat
    this.cameras.main.fadeIn(1500, 0, 0, 0);
    this._playIntro();
  }

  // ── Arène ────────────────────────────────────────────────────────────────────

  _buildArena() {
    // Fond sombre (monde entier)
    this.add.rectangle(800, 800, 1600, 1600, 0x030306).setDepth(0);

    // Sol de l'arène — dalles de pierre sombres
    const floor = this.add.graphics().setDepth(1);
    floor.fillStyle(0x0d0d18, 1);
    floor.fillCircle(ARENA.cx, ARENA.cy, ARENA.radius);

    // Grille de dalles
    const grid = this.add.graphics().setDepth(1);
    grid.lineStyle(1, 0x1a1a2e, 0.7);
    const tileSize = 48;
    const aMin = ARENA.cx - ARENA.radius;
    const aMax = ARENA.cx + ARENA.radius;
    for (let tx = aMin; tx <= aMax; tx += tileSize) {
      grid.lineBetween(tx, aMin, tx, aMax);
    }
    for (let ty = aMin; ty <= aMax; ty += tileSize) {
      grid.lineBetween(aMin, ty, aMax, ty);
    }

    // Cercles runiques
    const runes = this.add.graphics().setDepth(1);
    [120, 220, 340].forEach((r, i) => {
      const alpha = 0.2 + i * 0.08;
      runes.lineStyle(2, 0x440088, alpha);
      runes.strokeCircle(ARENA.cx, ARENA.cy, r);
    });

    // 8 symboles autour du cercle intérieur
    const sym = this.add.graphics().setDepth(1);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const sx    = ARENA.cx + Math.cos(angle) * 200;
      const sy    = ARENA.cy + Math.sin(angle) * 200;
      sym.lineStyle(2, 0x660099, 0.4);
      sym.strokeRect(sx - 8, sy - 8, 16, 16);
      sym.lineBetween(sx - 8, sy - 8, sx + 8, sy + 8);
      sym.lineBetween(sx + 8, sy - 8, sx - 8, sy + 8);
    }

    // 6 piliers obstacles (murs physiques statiques)
    this._wallsGroup = this.physics.add.staticGroup();
    this._pillars    = [];

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const px    = ARENA.cx + Math.cos(angle) * 350;
      const py    = ARENA.cy + Math.sin(angle) * 350;

      // Visuel du pilier
      const pillar = this.add.graphics().setDepth(4);
      pillar.fillStyle(0x1a0a2e, 1);
      pillar.fillRect(px - 22, py - 22, 44, 44);
      pillar.lineStyle(2, 0x660099, 0.8);
      pillar.strokeRect(px - 22, py - 22, 44, 44);
      // Rune sur pilier
      pillar.lineStyle(1, 0xaa00ff, 0.5);
      pillar.strokeCircle(px, py, 12);

      // Corps physique
      const zone = this.add.zone(px, py, 44, 44);
      this.physics.world.enable(zone, Phaser.Physics.Arcade.STATIC_BODY);
      this._wallsGroup.add(zone);
    }

    // Murs invisibles autour de l'arène (cercle approximé par 12 segments)
    for (let i = 0; i < 12; i++) {
      const a1 = (i / 12) * Math.PI * 2;
      const a2 = ((i + 1) / 12) * Math.PI * 2;
      const mx = ARENA.cx + Math.cos((a1 + a2) / 2) * (ARENA.radius + 10);
      const my = ARENA.cy + Math.sin((a1 + a2) / 2) * (ARENA.radius + 10);
      const zone = this.add.zone(mx, my, 80, 80);
      this.physics.world.enable(zone, Phaser.Physics.Arcade.STATIC_BODY);
      this._wallsGroup.add(zone);
    }

    // Torches sur les piliers
    this._torchGfx = this.add.graphics().setDepth(3);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const px    = ARENA.cx + Math.cos(angle) * 350;
      const py    = ARENA.cy + Math.sin(angle) * 350;
      this.add.image(px, py - 30, 'torch').setDepth(4).setTint(0xff3300);
    }

    // Lueur animée des torches
    this.events.on('update', () => {
      this._torchGfx.clear();
      const t = this.time.now;
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const px    = ARENA.cx + Math.cos(angle) * 350;
        const py    = ARENA.cy + Math.sin(angle) * 350;
        const alpha = 0.1 + 0.06 * Math.sin(t / 150 + i);
        this._torchGfx.fillStyle(0xff2200, alpha);
        this._torchGfx.fillCircle(px, py - 30, 60);
      }
    });
  }

  // ── Joueur ───────────────────────────────────────────────────────────────────

  _buildPlayer() {
    // Spawn au sud de l'arène
    this._player = new Player(this, ARENA.cx, ARENA.cy + 320);

    this._player.on('attack', (info) => {
      if (!info) return;
      this._handleAttack(info);
    });
    this._player.on('dead', () => this._onPlayerDead());
  }

  _setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, 1600, 1600);
    cam.startFollow(this._player, true, 0.07, 0.07);
    cam.setDeadzone(50, 35);
  }

  // ── HUD ──────────────────────────────────────────────────────────────────────

  _buildHUD() {
    this._playerHUD    = new PlayerHUD(this, this._player);
    this._notification = new Notification(this);

    this._poisonText = this.add.text(W / 2, 36, '', {
      fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold',
      color: '#00ff66', stroke: '#000', strokeThickness: 3,
    }).setScrollFactor(0).setDepth(200).setOrigin(0.5).setAlpha(0);
  }

  // ── Ténèbres ─────────────────────────────────────────────────────────────────

  _buildDarkness() {
    this._darknessGfx = this.add.graphics().setScrollFactor(0).setDepth(60);
    this.events.on('update', () => {
      const ov = this._darknessGfx;
      ov.clear();
      if (!this._player) return;

      const cam   = this.cameras.main;
      const px    = (this._player.x - cam.scrollX) * cam.zoom;
      const py    = (this._player.y - cam.scrollY) * cam.zoom;
      const dark  = this._cinemaPlaying ? 0 : 0.75;

      if (dark === 0) return;

      ov.fillStyle(0x000000, dark);
      ov.fillRect(0, 0, W, H);

      const maxR = this._boss && !this._bossDefeated ? 240 : 180;
      for (let i = 12; i >= 0; i--) {
        const r = maxR * (i / 12);
        ov.fillStyle(0x000000, dark * (i / 12) * (i / 12));
        ov.fillCircle(px, py, r);
      }

      if (this._poisonTimer > 0) { ov.fillStyle(0x003300, 0.2); ov.fillRect(0, 0, W, H); }

      if (this._boss && this._boss.phase === 3) {
        ov.fillStyle(0x110000, 0.15); ov.fillRect(0, 0, W, H);
      }
    });
  }

  // ── Événements ───────────────────────────────────────────────────────────────

  _setupEvents() {
    this.events.on('player-infected', (dur) => {
      this._poisonTimer = Math.max(this._poisonTimer, dur);
      this._notification.show('☠  EMPOISONNÉ !', '#00ff66', 2000);
    });

    this.input.keyboard.on('keydown-ESC', () => {
      if (this._cinemaPlaying) return;
      this._exitScene();
    });
  }

  // ── Nettoyage ─────────────────────────────────────────────────────────────────

  shutdown() {
    this._questPanel?.destroy();
    this._questPanel = null;
    this._audio?.stop();
    this._bossHPBar?.destroy();
  }

  _exitScene() {
    this._audio?.stop();
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene');
    });
  }

  // ── Intro cinématique ─────────────────────────────────────────────────────────

  _playIntro() {
    this._cinemaPlaying = true;

    // Texte d'entrée
    const zoneText = this.add.text(W / 2, H / 2 - 40, '— ZONE FINALE —', {
      fontFamily: 'monospace', fontSize: '32px', fontStyle: 'bold',
      color: '#aa00ff', stroke: '#000', strokeThickness: 5,
    }).setScrollFactor(0).setDepth(300).setAlpha(0).setOrigin(0.5);

    const subText = this.add.text(W / 2, H / 2 + 10, 'L\'Obscur vous attend…', {
      fontFamily: 'monospace', fontSize: '18px',
      color: '#cc88ff', stroke: '#000', strokeThickness: 3,
    }).setScrollFactor(0).setDepth(300).setAlpha(0).setOrigin(0.5);

    this.tweens.add({
      targets: zoneText, alpha: 1, duration: 800, ease: 'Power2',
      onComplete: () => {
        this.tweens.add({ targets: subText, alpha: 1, duration: 600 });

        this.time.delayedCall(2500, () => {
          this.tweens.add({
            targets: [zoneText, subText], alpha: 0, duration: 700,
            onComplete: () => {
              zoneText.destroy(); subText.destroy();
              this._cinemaPlaying = false;
              this._introComplete  = true;
              this._spawnBoss();
            },
          });
        });
      },
    });
  }

  // ── Boss ─────────────────────────────────────────────────────────────────────

  _spawnBoss() {
    this._boss = new FinalBoss(
      this,
      ARENA.cx,
      ARENA.cy - 280,
      {
        onSummon:      (cx, cy, rats, infected) => this._summonMinions(cx, cy, rats, infected),
        onPhaseChange: (phase)                  => this._onPhaseChange(phase),
        onDeath:       ()                       => this._onBossDeath(),
      }
    );

    // Collider boss vs piliers
    this.physics.add.collider(this._boss, this._wallsGroup);

    // HP bar
    this._bossHPBar = new BossHPBar(this, "⚔  L'OBSCUR", 1500, [0.667, 0.333]);
    this._bossHPBar.show();

    // Physique joueur vs boss (pas de bloquer — juste dégâts)
    this.physics.add.collider(this._player, this._wallsGroup);

    // Musique
    this._audio = new FinalBossAudio();
    try { this._audio.start(); } catch (e) {}

    // Notification
    this.time.delayedCall(300, () => {
      this._notification.show('⚔  L\'OBSCUR EST ARRIVÉ !', '#aa00ff', 4000);
    });
  }

  _onPhaseChange(phase) {
    this._audio?.setPhase(phase);
    const msgs = {
      2: ['☠  Phase 2 — L\'Obscur se réveille !', '#ff6600'],
      3: ['☠☠  Phase 3 — FORME ULTIME !',         '#ff0000'],
    };
    if (msgs[phase]) this._notification.show(msgs[phase][0], msgs[phase][1], 3500);
  }

  _summonMinions(cx, cy, ratCount, infectedCount) {
    for (let i = 0; i < ratCount; i++) {
      const a   = Math.random() * Math.PI * 2;
      const d   = 60 + Math.random() * 80;
      const rat = new Rat(this, cx + Math.cos(a) * d, cy + Math.sin(a) * d);
      this._rats.push(rat);
      this.physics.add.collider(rat, this._wallsGroup);
    }
    for (let i = 0; i < infectedCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 80 + Math.random() * 100;
      const z = new ZombieInfected(this, cx + Math.cos(a) * d, cy + Math.sin(a) * d);
      this._infected.push(z);
      this.physics.add.collider(z, this._wallsGroup);
    }
  }

  // ── Mort du joueur ────────────────────────────────────────────────────────────

  _onPlayerDead() {
    this._notification.show('Vous avez succombé face à L\'Obscur…', '#ff2200', 3000);
    this.time.delayedCall(2200, () => this._exitScene());
  }

  // ── Victoire ─────────────────────────────────────────────────────────────────

  _onBossDeath() {
    this._bossDefeated  = true;
    this._cinemaPlaying = true;
    this.game.events.emit('quest:kill_final');
    this._boss          = null;

    this._bossHPBar?.hide();
    this._audio?.stop();

    // Éliminer tous les sbires (guard isDead avant destroy pour éviter double-destroy)
    this._rats.forEach(r => { if (!r.isDead && r.active) r.destroy(); });
    this._infected.forEach(z => { if (!z.isDead && z.active) z.destroy(); });
    this._rats     = [];
    this._infected = [];

    this._playVictoryCinematic();
  }

  _playVictoryCinematic() {
    const cam = this.cameras.main;

    // 1. Zoom progressif vers le centre de l'arène
    cam.stopFollow();
    this.tweens.add({
      targets: cam,
      scrollX: ARENA.cx - W / 2,
      scrollY: ARENA.cy - H / 2,
      duration: 1500, ease: 'Power2',
    });
    cam.zoomTo(2.2, 1800, 'Power2');

    // 2. Flash blanc massif
    this.time.delayedCall(1000, () => {
      cam.flash(700, 255, 255, 255, true);
    });

    // 3. Texte de victoire
    this.time.delayedCall(1500, () => {
      const v1 = this.add.text(W / 2, H / 2 - 70, '✦  VICTOIRE ABSOLUE  ✦', {
        fontFamily: 'monospace', fontSize: '34px', fontStyle: 'bold',
        color: '#ffdd00', stroke: '#000', strokeThickness: 7,
      }).setScrollFactor(0).setDepth(300).setAlpha(0).setOrigin(0.5);

      const v2 = this.add.text(W / 2, H / 2, "L'Obscur est vaincu !", {
        fontFamily: 'monospace', fontSize: '20px',
        color: '#ffffff', stroke: '#000', strokeThickness: 4,
      }).setScrollFactor(0).setDepth(300).setAlpha(0).setOrigin(0.5);

      const v3 = this.add.text(W / 2, H / 2 + 40, 'Vous avez sauvé le monde.', {
        fontFamily: 'monospace', fontSize: '16px',
        color: '#88ff88', stroke: '#000', strokeThickness: 3,
      }).setScrollFactor(0).setDepth(300).setAlpha(0).setOrigin(0.5);

      this.tweens.add({ targets: v1, alpha: 1, y: H / 2 - 80, duration: 800, ease: 'Back.Out' });
      this.tweens.add({ targets: v2, alpha: 1, delay: 400, duration: 600 });
      this.tweens.add({ targets: v3, alpha: 1, delay: 700, duration: 600 });

      // Pluie de particules colorées
      this._spawnVictoryParticles();

      // Musique de victoire courte (ambiance céleste)
      this._playVictoryJingle();
    });

    // 4. Transition vers les crédits
    this.time.delayedCall(6500, () => {
      cam.fadeOut(1500, 0, 0, 0);
      cam.once('camerafadeoutcomplete', () => {
        this._audio?.stop();
        this.scene.start('CreditsScene');
      });
    });
  }

  _spawnVictoryParticles() {
    const COLORS = [0xffdd00, 0xff8800, 0xff00ff, 0x00ffcc, 0xffffff, 0x88ff44];
    for (let i = 0; i < 60; i++) {
      this.time.delayedCall(i * 60, () => {
        if (!this.scene.isActive('FinalZoneScene')) return;
        const px  = Math.random() * W;
        const py  = Math.random() * H;
        const col = COLORS[Math.floor(Math.random() * COLORS.length)];
        const r   = 4 + Math.random() * 7;
        const gfx = this.add.graphics().setScrollFactor(0).setDepth(295);
        gfx.fillStyle(col, 0.9);
        gfx.fillCircle(px, py, r);
        this.tweens.add({
          targets: gfx,
          y: py - 100 - Math.random() * 120,
          alpha: 0, duration: 1800 + Math.random() * 800,
          ease: 'Power2', onComplete: () => gfx.destroy(),
        });
      });
    }
  }

  _playVictoryJingle() {
    try {
      const ctx    = new (window.AudioContext || window.webkitAudioContext)();
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.5);
      master.connect(ctx.destination);

      // Accord majeur (ré majeur) + mélodie ascendante
      const notes = [293.7, 369.9, 440.0, 554.4, 587.3, 740.0, 880.0];
      notes.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        const now  = ctx.currentTime + i * 0.25;
        osc.type            = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
        osc.connect(gain); gain.connect(master);
        osc.start(now); osc.stop(now + 1.6);
      });

      setTimeout(() => { try { ctx.close(); } catch (e) {} }, 5000);
    } catch (e) {}
  }

  // ── Update ───────────────────────────────────────────────────────────────────

  update(time, delta) {
    if (this._cinemaPlaying || !this._introComplete) return;

    this._player.update(time, delta);
    this._playerHUD.update();

    // Mise à jour + nettoyage in-place (évite alloc tableau chaque frame)
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

    if (this._boss) {
      if (this._boss.isDead || !this._boss.active) {
        this._boss = null;
      } else {
        this._boss.update(delta, this._player);
        this._bossHPBar?.setHp(this._boss.hp);
      }
    }

    this._updatePoison(delta);
  }

  _updatePoison(delta) {
    if (this._poisonTimer <= 0) { this._poisonText.setAlpha(0); return; }
    this._poisonTimer -= delta;
    this._poisonTick  -= delta;
    this._poisonText.setText(`☠ POISON ${Math.ceil(this._poisonTimer / 1000)}s`).setAlpha(1);
    if (this._poisonTick <= 0) { this._poisonTick = 500; this._player.takeDamage(1); }
  }

  _handleAttack({ x, y, angle, range, arc, damage }) {
    const hit = (e) => {
      if (e.isDead) return;
      const dist = Phaser.Math.Distance.Between(x, y, e.x, e.y);
      if (dist > range) return;
      const diff = Phaser.Math.Angle.Wrap(
        Phaser.Math.Angle.Between(x, y, e.x, e.y) - angle
      );
      if (Math.abs(diff) <= arc / 2) e.takeDamage(damage);
    };

    this._rats.forEach(hit);
    this._infected.forEach(hit);
    if (this._boss && !this._boss.isDead) hit(this._boss);
  }
}
