import { Item } from './Item.js';

export class FoodItem extends Item {
  /**
   * @param {object} cfg
   * @param {string} cfg.key
   * @param {string} cfg.name
   * @param {string} cfg.icon
   * @param {number} cfg.healAmount  - PV restaurés à la consommation
   * @param {number} cfg.sellPrice   - Pièces reçues lors d'une vente à un survivant
   * @param {number} cfg.meatCost    - Viandes nécessaires pour cuisiner
   * @param {number} cfg.cookTime    - Temps de cuisson en ms
   */
  constructor({ key, name, icon, healAmount, sellPrice, meatCost, cookTime }) {
    super({ key, name, type: 'food', icon, worldKey: null, stackable: true });
    this.healAmount = healAmount;
    this.sellPrice  = sellPrice;
    this.meatCost   = meatCost;
    this.cookTime   = cookTime;
  }
}
