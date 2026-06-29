import { Item } from './Item.js';

export class AssaultRifle extends Item {
  constructor() {
    super({ key: 'assault_rifle', name: "Fusil d'assaut", type: 'weapon',
      icon: 'icon_ar', worldKey: null });
    this.damage         = 20;
    this.attackRange    = 260;
    this.attackCooldown = 300;
    this.attackArc      = 0.14;
    this.arcColor       = 0x44ff88;
    this.price          = 350;
  }
}
