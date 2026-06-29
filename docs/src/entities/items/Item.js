/**
 * Item.js
 * Classe de base pour tous les objets du jeu.
 * Définit les propriétés communes : nom, type, icône, empilement.
 */

export class Item {
  /**
   * @param {object} cfg
   * @param {string} cfg.key        - Identifiant unique
   * @param {string} cfg.name       - Nom affiché
   * @param {string} cfg.type       - 'weapon' | 'consumable' | 'resource'
   * @param {string} cfg.icon       - Clé de texture de l'icône (inventaire)
   * @param {string} cfg.worldKey   - Clé de texture du sprite monde
   * @param {boolean} [cfg.stackable=false]
   */
  constructor({ key, name, type, icon, worldKey, stackable = false }) {
    this.key       = key;
    this.name      = name;
    this.type      = type;
    this.icon      = icon;
    this.worldKey  = worldKey;
    this.stackable = stackable;
    this.quantity  = 1;
  }

  /** Crée une copie indépendante de cet item */
  clone() {
    const copy = Object.create(Object.getPrototypeOf(this));
    return Object.assign(copy, this);
  }
}
