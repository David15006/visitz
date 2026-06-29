/**
 * GameScene.js
 * Scène principale de jeu.
 * Orchestre : WorldMap, Player, DayNightCycle, AudioManager, HUD.
 */

import { GameConfig } from '../config/GameConfig.js';
import { Player }        from '../entities/Player.js';
import { WorldMap }      from '../world/WorldMap.js';
import { DayNightCycle } from '../systems/DayNightCycle.js';
import { AudioManager }  from '../systems/AudioManager.js';
import { HUD }           from '../ui/HUD.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });

    /** @type {Player} */
    this._player = null;
    /** @type {DayNightCycle} */
    this._dayNight = null;
    /** @type {AudioManager} */
    this._audio = null;
    /** @type {HUD} */
    this._hud = null;
  }

  create() {
    const { MAP_WIDTH, MAP_HEIGHT } = GameConfig;

    // Limites du monde physique (collision avec les bords)
    this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // ── Ordre de construction (important pour les depths) ──────────────
    this._buildMap();
    this._buildPlayer(MAP_WIDTH, MAP_HEIGHT);
    this._setupCamera(MAP_WIDTH, MAP_HEIGHT);
    this._buildDayNight();   // après la caméra (overlay suit l'écran)
    this._buildHUD();
    this._buildAudio();
    this._buildReturnKey();

    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  /** Construit la carte du monde */
  _buildMap() {
    new WorldMap(this);
  }

  /** Crée le joueur au centre de la carte */
  _buildPlayer(w, h) {
    // Spawn au centre de la zone Base
    const base = { x: 1600, y: 1200 };
    this._player = new Player(this, base.x, base.y);
    // Le joueur doit être au-dessus du décor
    this._player.setDepth(10);
  }

  /** Configure la caméra avec suivi doux et déadzone */
  _setupCamera(mapW, mapH) {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, mapW, mapH);
    cam.startFollow(this._player, true, 0.09, 0.09);
    cam.setDeadzone(80, 50);
  }

  /** Crée le cycle jour/nuit et branche le callback audio */
  _buildDayNight() {
    this._dayNight = new DayNightCycle(this, (phase) => {
      this._onPhaseChange(phase);
    });
  }

  /** Crée le HUD */
  _buildHUD() {
    this._hud = new HUD(this, this._dayNight, this._player);
  }

  /** Initialise l'audio (démarrage différé au premier geste utilisateur) */
  _buildAudio() {
    this._audio = new AudioManager();
    // L'AudioContext nécessite un geste utilisateur.
    // La scène est lancée depuis un clic sur "Nouvelle Partie", donc on peut démarrer.
    try {
      this._audio.start();
    } catch (e) {
      // Silencieusement ignoré si le navigateur bloque avant interaction
      console.warn('AudioManager: démarrage différé', e.message);
    }
  }

  /** Gère les transitions audio lors d'un changement de phase */
  _onPhaseChange(phase) {
    if (!this._audio) return;
    if (phase === 'night') {
      this._audio.transitionToNight();
    } else if (phase === 'day') {
      this._audio.transitionToDay();
    }
    // sunset et sunrise : pas de transition abrupte,
    // le fondu se fera au prochain changement (night / day)
  }

  /** Touche Échap → retour au menu */
  _buildReturnKey() {
    this.input.keyboard.once('keydown-ESC', () => {
      if (this._audio) this._audio.stop();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MainMenuScene');
      });
    });
  }

  /** Boucle principale */
  update(_time, delta) {
    this._player.update();
    this._dayNight.update(delta);
    this._hud.update();
  }
}
