import { FoodItem } from './FoodItem.js';

export class Soupe extends FoodItem {
  constructor() {
    super({ key: 'soupe', name: 'Soupe', icon: 'icon_soupe',
      healAmount: 25, sellPrice: 12, meatCost: 2, cookTime: 6000 });
  }
}
