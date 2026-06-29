/**
 * PlayerStats.js
 * Gère les statistiques vitales du joueur : santé et endurance.
 * Met à jour l'endurance chaque frame selon l'état (course / repos).
 * Émet un flag `isExhausted` quand l'endurance tombe à zéro.
 */

import { GameConfig } from '../config/GameConfig.js';

const S = GameConfig.PLAYER_STATS;

export class PlayerStats {
  constructor() {
    this.maxHealth  = S.MAX_HEALTH;
    this.health     = S.MAX_HEALTH;

    this.maxStamina = S.MAX_STAMINA;
    this.stamina    = S.MAX_STAMINA;

    // Épuisement : actif quand stamina = 0, levé quand stamina > EXHAUSTED_THRESHOLD
    this.isExhausted = false;
  }

  /**
   * Mise à jour chaque frame.
   * @param {number} delta      - temps écoulé en ms
   * @param {boolean} sprinting - le joueur court-il ?
   */
  update(delta, sprinting) {
    const dt = delta / 1000; // secondes

    if (sprinting && !this.isExhausted) {
      this.stamina = Math.max(0, this.stamina - S.STAMINA_DRAIN * dt);
      if (this.stamina === 0) this.isExhausted = true;
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + S.STAMINA_REGEN * dt);
      // Récupération de l'épuisement au seuil
      if (this.isExhausted && this.stamina >= S.EXHAUSTED_THRESHOLD) {
        this.isExhausted = false;
      }
    }
  }

  /**
   * Infliger des dégâts au joueur.
   * @param {number} amount
   * @returns {boolean} true si le joueur est mort (health <= 0)
   */
  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    return this.health <= 0;
  }

  /**
   * Soigner le joueur.
   * @param {number} amount
   */
  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  get healthPercent()  { return this.health  / this.maxHealth; }
  get staminaPercent() { return this.stamina / this.maxStamina; }
}
