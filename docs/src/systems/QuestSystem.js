/**
 * QuestSystem.js
 * Gestion des quêtes principales — validation automatique via événements globaux.
 *
 * Utilisation :
 *   const qs = new QuestSystem(game);   // une seule instance (window.__quests)
 *   qs.complete('first_night');         // validation manuelle si besoin
 *   qs.currentQuest                     // quête active { id, label, desc }
 *   qs.isCompleted(id)                  // booléen
 *
 * Les scènes émettent des événements sur game.events pour déclencher la validation.
 */

export const QUESTS = [
  {
    id:    'first_night',
    label: 'Survivre à la première nuit',
    desc:  'Passez la nuit et attendez l\'aube.',
    event: 'quest:first_night',
  },
  {
    id:    'sell_dish',
    label: 'Vendre un plat',
    desc:  'Vendez un plat cuisiné à un survivant.',
    event: 'quest:sell_dish',
  },
  {
    id:    'buy_weapon',
    label: 'Acheter une arme',
    desc:  'Achetez une arme dans la boutique.',
    event: 'quest:buy_weapon',
  },
  {
    id:    'kill_boss',
    label: 'Tuer la créature',
    desc:  'Éliminez le boss qui rôde dans l\'obscurité.',
    event: 'quest:kill_boss',
  },
  {
    id:    'enter_sewer',
    label: 'Entrer dans les égouts',
    desc:  'Trouvez la Clé des Égouts et descendez dans le donjon.',
    event: 'quest:enter_sewer',
  },
  {
    id:    'kill_ratking',
    label: 'Battre le Roi des Rats',
    desc:  'Défaites le boss du donjon au fond des égouts.',
    event: 'quest:kill_ratking',
  },
  {
    id:    'kill_final',
    label: 'Battre le boss final',
    desc:  'Triomphez de L\'Obscur dans la Zone Finale.',
    event: 'quest:kill_final',
  },
];

export class QuestSystem {
  /**
   * @param {Phaser.Game} game  Référence au jeu Phaser (pour écouter game.events)
   */
  constructor(game) {
    this._game      = game;
    this._completed = new Set();   // IDs des quêtes terminées
    this._listeners = new Map();   // event → handler (pour déregistrement)
    this._onChange  = null;        // callback(quest) quand une quête est validée

    this._registerListeners();
  }

  // ── API publique ─────────────────────────────────────────────────────────────

  /** Quête active (la première non complétée dans l'ordre). */
  get currentQuest() {
    return QUESTS.find(q => !this._completed.has(q.id)) ?? null;
  }

  /** Toutes les quêtes complétées. */
  get completedIds() {
    return [...this._completed];
  }

  /** Vrai si toutes les quêtes sont terminées. */
  get allDone() {
    return this._completed.size >= QUESTS.length;
  }

  isCompleted(id) {
    return this._completed.has(id);
  }

  /**
   * Valide une quête par son ID.
   * Ne fait rien si déjà complétée ou si ce n'est pas la quête actuelle.
   */
  complete(id) {
    if (this._completed.has(id)) return;

    const quest = QUESTS.find(q => q.id === id);
    if (!quest) return;

    this._completed.add(id);
    this._onChange?.(quest);
  }

  /** Appelé par QuestPanel ou toute UI pour être notifié d'un changement. */
  setOnChange(fn) {
    this._onChange = fn;
  }

  destroy() {
    this._listeners.forEach((handler, event) => {
      this._game.events.off(event, handler);
    });
    this._listeners.clear();
  }

  // ── Listeners globaux ────────────────────────────────────────────────────────

  _registerListeners() {
    QUESTS.forEach(q => {
      const handler = () => this.complete(q.id);
      this._game.events.on(q.event, handler);
      this._listeners.set(q.event, handler);
    });
  }
}
