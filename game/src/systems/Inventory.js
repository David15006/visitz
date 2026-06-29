/**
 * Inventory.js
 * Gestion de l'inventaire du joueur.
 * Tableau de N slots, chaque slot contient un Item ou null.
 * Expose le slot actif (changé par les touches 1–8).
 */

export class Inventory {
  /**
   * @param {number} size - Nombre de slots (défaut 8)
   */
  constructor(size = 8) {
    this._size       = size;
    this._slots      = new Array(size).fill(null);
    this._activeSlot = 0;

    /** Callback optionnel appelé à chaque modification */
    this.onChange = null;
  }

  // ── Accesseurs ────────────────────────────────────────────────────────────

  get size()        { return this._size; }
  get slots()       { return this._slots; }
  get activeSlot()  { return this._activeSlot; }

  /** Item actif (slot courant), ou null */
  getActive() { return this._slots[this._activeSlot]; }

  // ── Modification ──────────────────────────────────────────────────────────

  /**
   * Ajoute un item dans le premier slot vide.
   * @param {Item} item
   * @returns {number} Index du slot utilisé, ou -1 si inventaire plein
   */
  add(item) {
    const idx = this._slots.indexOf(null);
    if (idx === -1) return -1;
    this._slots[idx] = item;
    this._notify();
    return idx;
  }

  /**
   * Retire l'item du slot donné.
   * @param {number} slotIndex
   * @returns {Item|null} L'item retiré, ou null
   */
  removeAt(slotIndex) {
    const item = this._slots[slotIndex];
    this._slots[slotIndex] = null;
    this._notify();
    return item;
  }

  /**
   * Change le slot actif (0 à size-1).
   * @param {number} index
   */
  setActiveSlot(index) {
    if (index >= 0 && index < this._size) {
      this._activeSlot = index;
      this._notify();
    }
  }

  /** Slot actif suivant (touche molette ou Tab) */
  nextSlot() {
    this.setActiveSlot((this._activeSlot + 1) % this._size);
  }

  /** Slot actif précédent */
  prevSlot() {
    this.setActiveSlot((this._activeSlot - 1 + this._size) % this._size);
  }

  /** Retourne true si tous les slots sont occupés */
  isFull() { return !this._slots.includes(null); }

  _notify() { if (this.onChange) this.onChange(this._slots, this._activeSlot); }
}
