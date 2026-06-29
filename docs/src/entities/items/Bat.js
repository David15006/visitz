/**
 * Bat.js
 * Batte de baseball — arme de mêlée de départ.
 * Définit les statistiques de combat de la batte.
 */

import { Item } from './Item.js';

export class Bat extends Item {
  constructor() {
    super({
      key:      'bat',
      name:     'Batte de baseball',
      type:     'weapon',
      icon:     'icon_bat',
      worldKey: 'bat_world',
    });

    // Statistiques de combat
    this.damage         = 35;     // dégâts par coup
    this.attackRange    = 72;     // portée de l'arc d'attaque (px)
    this.attackCooldown = 600;    // délai entre deux attaques (ms)
    this.attackArc      = 1.1;    // largeur de l'arc en radians (~63°)
    this.knockback      = 200;    // force de repoussement (px/s, futur)
  }
}
