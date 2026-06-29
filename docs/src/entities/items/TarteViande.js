import { FoodItem } from './FoodItem.js';

export class TarteViande extends FoodItem {
  constructor() {
    super({ key: 'tarte_viande', name: 'Tarte de viande', icon: 'icon_tarte',
      healAmount: 50, sellPrice: 28, meatCost: 4, cookTime: 14000 });
  }
}
