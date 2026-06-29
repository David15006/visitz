import { Item } from './Item.js';

export class Pistol extends Item {
  constructor() {
    super({ key: 'pistol', name: 'Pistolet', type: 'weapon',
      icon: 'icon_pistol', worldKey: null });
    this.damage         = 25;
    this.attackRange    = 210;
    this.attackCooldown = 800;
    this.attackArc      = 0.18;
    this.arcColor       = 0x44aaff;
    this.price          = 150;
  }
}
