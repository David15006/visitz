import { FoodItem } from './FoodItem.js';

export class Steak extends FoodItem {
  constructor() {
    super({ key: 'steak', name: 'Steak', icon: 'icon_steak',
      healAmount: 15, sellPrice: 5, meatCost: 1, cookTime: 3000 });
  }
}
