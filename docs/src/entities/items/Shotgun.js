import { Item } from './Item.js';

export class Shotgun extends Item {
  constructor() {
    super({ key: 'shotgun', name: 'Fusil a pompe', type: 'weapon',
      icon: 'icon_shotgun', worldKey: null });
    this.damage         = 60;
    this.attackRange    = 130;
    this.attackCooldown = 1200;
    this.attackArc      = 1.2;
    this.arcColor       = 0xff8822;
    this.price          = 220;
  }
}
