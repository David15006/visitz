import { Item } from './Item.js';

export class Lance extends Item {
  constructor() {
    super({ key: 'lance', name: 'Lance', type: 'weapon',
      icon: 'icon_lance', worldKey: null });
    this.damage         = 50;
    this.attackRange    = 110;
    this.attackCooldown = 800;
    this.attackArc      = 0.5;
    this.arcColor       = 0x88ccff;
    this.price          = 80;
  }
}
