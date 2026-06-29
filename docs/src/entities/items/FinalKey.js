/**
 * FinalKey.js
 * Clé finale lâchée par le Roi des Rats. Déverrouille la zone finale.
 */

import { Item } from './Item.js';

export class FinalKey extends Item {
  constructor() {
    super({
      key:       'final_key',
      name:      'Clé Finale',
      type:      'key',
      icon:      'icon_final_key',
      worldKey:  'final_key_world',
      stackable: false,
    });
  }
}
