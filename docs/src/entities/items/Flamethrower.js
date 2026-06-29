import { Item } from './Item.js';

export class Flamethrower extends Item {
  constructor() {
    super({ key: 'flamethrower', name: 'Lance-flammes', type: 'weapon',
      icon: 'icon_flamethrower', worldKey: null });
    this.damage         = 15;
    this.attackRange    = 90;
    this.attackCooldown = 100;
    this.attackArc      = 1.5;
    this.arcColor       = 0xff3300;
    this.price          = 500;
  }
}
