import { Item } from './Item.js';

export class SewerKey extends Item {
  constructor() {
    super({
      key:       'sewer_key',
      name:      'Clé des Égouts',
      type:      'key',
      icon:      'icon_sewer_key',
      worldKey:  'sewer_key_world',
      stackable: false,
    });
  }
}
