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
   * Ajoute un item.  Les items stackables s'empilent sur un slot existant.
   * @param {Item} item
   * @returns {number} Index du slot utilisé, ou -1 si inventaire plein
   */
  add(item) {
    // Empilage pour les items stackables
    if (item.stackable) {
      for (let i = 0; i < this._size; i++) {
        if (this._slots[i]?.key === item.key) {
          this._slots[i].quantity += item.quantity ?? 1;
          this._notify();
          return i;
        }
      }
    }
    // Nouveau slot
    const idx = this._slots.indexOf(null);
    if (idx === -1) return -1;
    this._slots[idx] = item;
    this._notify();
    return idx;
  }

  /** Nombre total d'unités d'une clé d'item dans l'inventaire. */
  countByKey(key) {
    let total = 0;
    for (const slot of this._slots) {
      if (slot?.key === key) total += slot.quantity ?? 1;
    }
    return total;
  }

  /**
   * Retire `count` unités d'un item identifié par sa clé.
   * @returns {boolean} true si le retrait complet a réussi
   */
  removeByKey(key, count = 1) {
    let remaining = count;
    for (let i = 0; i < this._size && remaining > 0; i++) {
      if (!this._slots[i] || this._slots[i].key !== key) continue;
      const toRemove = Math.min(remaining, this._slots[i].quantity ?? 1);
      this._slots[i].quantity = (this._slots[i].quantity ?? 1) - toRemove;
      remaining -= toRemove;
      if ((this._slots[i].quantity ?? 0) <= 0) this._slots[i] = null;
    }
    this._notify();
    return remaining === 0;
  }

  /** Retourne le premier slot contenant un item du type donné. */
  findFirstByType(type) {
    for (let i = 0; i < this._size; i++) {
      if (this._slots[i]?.type === type) return { item: this._slots[i], index: i };
    }
    return null;
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
