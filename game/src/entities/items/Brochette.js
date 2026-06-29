import { FoodItem } from './FoodItem.js';

export class Brochette extends FoodItem {
  constructor() {
    super({ key: 'brochette', name: 'Brochettes', icon: 'icon_brochette',
      healAmount: 35, sellPrice: 18, meatCost: 3, cookTime: 9000 });
  }
}
