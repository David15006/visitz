/**
 * NetworkBridge.js
 * Couche d'abstraction réseau — prépare l'architecture pour le multijoueur.
 *
 * En mode solo (actuel) : toutes les méthodes sont des no-ops ou retournent
 * des valeurs locales. Aucune dépendance externe n'est requise.
 *
 * Pour activer le multijoueur : implémenter les méthodes avec WebSocket/WebRTC
 * et injecter l'instance via `window.__network = new NetworkBridge(wsUrl)`.
 *
 * Architecture événementielle :
 *  - Les scènes émettent des actions via `game.events` (déjà en place)
 *  - NetworkBridge écoute ces événements et les sérialise vers le réseau
 *  - Les messages reçus sont re-émis sur `game.events` pour mise à jour locale
 *
 * Points d'intégration identifiés :
 *  - Player : position, hp, inventaire, attack
 *  - Zombie/Rat/Boss : état (hp, position, isDead)
 *  - QuestSystem : progression partagée ou par joueur
 *  - DayNightCycle : synchronisation de l'heure
 */

export class NetworkBridge {
  /**
   * @param {string|null} serverUrl  URL WebSocket, null = mode solo
   * @param {string}      playerId   Identifiant unique du joueur local
   */
  constructor(serverUrl = null, playerId = _generateId()) {
    this._url      = serverUrl;
    this._playerId = playerId;
    this._socket   = null;
    this._isHost   = false;
    this._peers    = new Map();   // playerId → { x, y, hp, ... }
    this._mode     = serverUrl ? 'online' : 'solo';

    if (serverUrl) {
      this._connect(serverUrl);
    }
  }

  // ── API publique ─────────────────────────────────────────────────────────────

  get playerId()  { return this._playerId; }
  get isOnline()  { return this._mode === 'online' && this._socket?.readyState === 1; }
  get isHost()    { return this._isHost; }
  get peerCount() { return this._peers.size; }

  /**
   * Envoie l'état du joueur local.
   * En solo : no-op.
   * En ligne : sérialise et envoie via WebSocket.
   *
   * @param {{ x, y, hp, angle, activeSlot }} state
   */
  sendPlayerState(state) {
    if (!this.isOnline) return;
    this._send({ type: 'player:state', playerId: this._playerId, ...state });
  }

  /**
   * Envoie une action d'attaque.
   * @param {{ x, y, angle, range, arc, damage }} info
   */
  sendAttack(info) {
    if (!this.isOnline) return;
    this._send({ type: 'player:attack', playerId: this._playerId, ...info });
  }

  /**
   * Envoie un événement de jeu (mort de boss, quête, etc.).
   * @param {string} event  Ex: 'quest:kill_boss', 'boss:phase', 'entity:dead'
   * @param {object} data
   */
  sendEvent(event, data = {}) {
    if (!this.isOnline) return;
    this._send({ type: 'game:event', event, playerId: this._playerId, ...data });
  }

  /**
   * Retourne les états de tous les pairs connectés.
   * En solo : tableau vide.
   */
  getPeers() {
    return [...this._peers.entries()].map(([id, state]) => ({ id, ...state }));
  }

  disconnect() {
    this._socket?.close();
    this._socket = null;
    this._peers.clear();
  }

  // ── Réseau interne ───────────────────────────────────────────────────────────

  _connect(url) {
    try {
      this._socket = new WebSocket(url);
      this._socket.onopen    = ()    => this._onOpen();
      this._socket.onmessage = (ev)  => this._onMessage(JSON.parse(ev.data));
      this._socket.onclose   = ()    => this._onClose();
      this._socket.onerror   = (e)   => console.warn('[NetworkBridge] Erreur WS:', e);
    } catch (e) {
      console.warn('[NetworkBridge] Connexion impossible:', e.message);
    }
  }

  _onOpen() {
    console.log(`[NetworkBridge] Connecté (id=${this._playerId})`);
    this._send({ type: 'player:join', playerId: this._playerId });
  }

  _onMessage(msg) {
    switch (msg.type) {
      case 'player:state':
        if (msg.playerId !== this._playerId) {
          this._peers.set(msg.playerId, msg);
        }
        break;
      case 'player:leave':
        this._peers.delete(msg.playerId);
        break;
      case 'game:event':
        // Ré-émettre sur game.events pour que les scènes puissent réagir
        window.__game?.events.emit(msg.event, msg);
        break;
      case 'host:assign':
        this._isHost = msg.playerId === this._playerId;
        break;
    }
  }

  _onClose() {
    console.log('[NetworkBridge] Déconnecté');
    this._mode = 'solo';
  }

  _send(obj) {
    if (this._socket?.readyState === 1) {
      this._socket.send(JSON.stringify(obj));
    }
  }
}

// ── Utilitaire ───────────────────────────────────────────────────────────────

function _generateId() {
  return Math.random().toString(36).slice(2, 10);
}
