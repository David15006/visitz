/**
 * CreditsScene.js
 * Générique de fin — défilement de texte + musique douce.
 * [Entrée] ou [Espace] : recommencer une partie → MainMenuScene.
 */

import { GameConfig } from '../config/GameConfig.js';

const W = GameConfig.WIDTH;
const H = GameConfig.HEIGHT;

const CREDITS = [
  { text: '★  V I S I T Z  ★',         size: '38px', color: '#ffdd00', gap: 60 },
  { text: 'Un jeu de survie',             size: '18px', color: '#aabbff', gap: 80 },

  { text: '───────────────────',         size: '14px', color: '#444466', gap: 30 },
  { text: 'C O N C E P T I O N',         size: '22px', color: '#cc88ff', gap: 20 },
  { text: '───────────────────',         size: '14px', color: '#444466', gap: 30 },

  { text: 'Développeur',                 size: '16px', color: '#8899aa', gap: 10 },
  { text: 'Claude Sonnet 4.6',           size: '20px', color: '#ffffff', gap: 60 },

  { text: '───────────────────',         size: '14px', color: '#444466', gap: 30 },
  { text: 'M O T E U R',                 size: '22px', color: '#cc88ff', gap: 20 },
  { text: '───────────────────',         size: '14px', color: '#444466', gap: 30 },

  { text: 'Phaser 3.80.1',               size: '18px', color: '#ffffff', gap: 10 },
  { text: 'Web Audio API',               size: '18px', color: '#ffffff', gap: 60 },

  { text: '───────────────────',         size: '14px', color: '#444466', gap: 30 },
  { text: 'S Y S T È M E S',             size: '22px', color: '#cc88ff', gap: 20 },
  { text: '───────────────────',         size: '14px', color: '#444466', gap: 30 },

  { text: 'Combat au corps à corps',     size: '16px', color: '#aabbcc', gap: 8 },
  { text: 'Armes de mêlée et à feu',     size: '16px', color: '#aabbcc', gap: 8 },
  { text: 'Zombies, Boss, Roi des Rats', size: '16px', color: '#aabbcc', gap: 8 },
  { text: "Donjon : 9 salles + L'Obscur",size: '16px', color: '#aabbcc', gap: 8 },
  { text: 'Cuisine & Boutique',          size: '16px', color: '#aabbcc', gap: 8 },
  { text: 'Cycle Jour / Nuit',           size: '16px', color: '#aabbcc', gap: 8 },
  { text: 'Survivants & Énigmes',        size: '16px', color: '#aabbcc', gap: 60 },

  { text: '───────────────────',         size: '14px', color: '#444466', gap: 30 },
  { text: 'M E R C I',                   size: '28px', color: '#ffdd00', gap: 20 },
  { text: '───────────────────',         size: '14px', color: '#444466', gap: 30 },

  { text: "Merci d'avoir joué !",        size: '22px', color: '#ffffff', gap: 20 },
  { text: 'Vous avez sauvé le monde.',   size: '18px', color: '#88ff88', gap: 80 },

  { text: '[ ENTRÉE ]  Nouvelle partie', size: '20px', color: '#ffcc44', gap: 10 },
  { text: '[ ESPACE ]  Nouvelle partie', size: '16px', color: '#aa8833', gap: 0  },
];

export class CreditsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CreditsScene' });
    this._ctx   = null;
    this._music = null;
  }

  create() {
    // Fond étoilé
    this._buildBackground();

    // Textes défilants
    this._buildCreditsText();

    // Input
    this.input.keyboard.on('keydown-ENTER', () => this._restart());
    this.input.keyboard.on('keydown-SPACE', () => this._restart());

    // Musique douce
    this._startMusic();

    this.cameras.main.fadeIn(1200, 0, 0, 0);
  }

  // ── Fond étoilé ──────────────────────────────────────────────────────────────

  _buildBackground() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x020208);

    const stars = this.add.graphics();
    for (let i = 0; i < 200; i++) {
      const sx = Math.random() * W;
      const sy = Math.random() * H;
      const r  = Math.random() < 0.2 ? 2 : 1;
      const a  = 0.3 + Math.random() * 0.7;
      stars.fillStyle(0xffffff, a);
      stars.fillCircle(sx, sy, r);
    }

    // Nébuleuse sombre
    const neb = this.add.graphics();
    neb.fillStyle(0x110022, 0.6);
    neb.fillEllipse(W * 0.3, H * 0.6, 400, 250);
    neb.fillStyle(0x001122, 0.4);
    neb.fillEllipse(W * 0.7, H * 0.3, 300, 200);
  }

  // ── Crédits ──────────────────────────────────────────────────────────────────

  _buildCreditsText() {
    // Conteneur qui va remonter
    const container = this.add.container(0, 0);

    let currentY = H + 40;

    CREDITS.forEach(({ text, size, color, gap }) => {
      const t = this.add.text(W / 2, currentY, text, {
        fontFamily: 'monospace',
        fontSize: size,
        color,
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5, 0);

      container.add(t);
      currentY += t.height + gap;
    });

    // Durée totale du défilement
    const totalHeight = currentY - H;
    const duration    = Math.max(25000, totalHeight * 45);

    this.tweens.add({
      targets: container,
      y: -totalHeight,
      duration,
      ease: 'Linear',
      onComplete: () => {
        // Boucle
        this.tweens.add({ targets: container, y: 0, duration: 0, onComplete: () => {
          this.tweens.add({ targets: container, y: -totalHeight, duration, ease: 'Linear' });
        }});
      },
    });
  }

  // ── Restart ──────────────────────────────────────────────────────────────────

  _restart() {
    this._stopMusic();
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MainMenuScene');
    });
  }

  // ── Musique ambiante douce ────────────────────────────────────────────────────

  _startMusic() {
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { return; }

    const master = this._ctx.createGain();
    master.gain.setValueAtTime(0.0001, this._ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(0.35, this._ctx.currentTime + 3.0);
    master.connect(this._ctx.destination);
    this._music = master;

    // Pads lents (accord majeur lumineux — ré majeur)
    [[146.8, 0.15], [220.0, 0.12], [293.7, 0.10], [440.0, 0.07]].forEach(([f, v]) => {
      const osc   = this._ctx.createOscillator();
      const filt  = this._ctx.createBiquadFilter();
      const gain  = this._ctx.createGain();
      osc.type              = 'sine';
      osc.frequency.value   = f;
      osc.detune.value      = (Math.random() - 0.5) * 8;
      filt.type             = 'lowpass';
      filt.frequency.value  = 1200;
      gain.gain.value       = v;

      // Vibrato lent
      const lfo  = this._ctx.createOscillator();
      const lfoG = this._ctx.createGain();
      lfo.frequency.value = 0.15;
      lfoG.gain.value     = 2;
      lfo.connect(lfoG); lfoG.connect(osc.frequency);
      lfo.start();

      osc.connect(filt); filt.connect(gain); gain.connect(master);
      osc.start();
    });
  }

  _stopMusic() {
    if (!this._music || !this._ctx) return;
    const now = this._ctx.currentTime;
    this._music.gain.setValueAtTime(this._music.gain.value, now);
    this._music.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    setTimeout(() => { try { this._ctx.close(); } catch (e) {} }, 900);
  }
}
