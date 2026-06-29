/**
 * Meat.js
 * Viande brute — butin lâché par les zombies à leur mort.
 * Consommable : restaure de la vie quand utilisé (futur : touche F).
 */

import { Item } from './Item.js';

export class Meat extends Item {
  constructor() {
    super({
      key:      'meat',
      name:     'Viande',
      type:     'consumable',
      icon:     'icon_meat',
      worldKey: 'meat_world',
      stackable: true,
    });

    this.healAmount = 20;   // PV restaurés à la consommation
  }
}
