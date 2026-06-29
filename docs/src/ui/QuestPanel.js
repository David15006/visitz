/**
 * QuestPanel.js
 * Panneau HUD affichant la quête active dans le coin inférieur droit.
 * S'actualise automatiquement quand le QuestSystem valide une quête.
 *
 * Usage :
 *   this._questPanel = new QuestPanel(this, window.__quests);
 *   // puis dans update() : rien — le panneau s'auto-met à jour via callbacks
 */

const PAD    = 14;   // padding interne
const W_BOX  = 260;  // largeur du panneau
const DEPTH  = 300;  // au-dessus de tout

export class QuestPanel {
  /**
   * @param {Phaser.Scene}   scene
   * @param {QuestSystem}    quests
   */
  constructor(scene, quests) {
    this._scene  = scene;
    this._quests = quests;
    this._container = null;
    this._bg        = null;
    this._titleTxt  = null;
    this._labelTxt  = null;
    this._descTxt   = null;
    this._visible   = true;

    this._build();
    this._refresh();

    // Écouter les changements de quête
    quests.setOnChange(q => this._onQuestComplete(q));

    // Repositionner si la caméra change (redimensionnement)
    this._resizeFn = () => this._reposition();
    scene.scale?.on('resize', this._resizeFn);
  }

  // ── Construction ─────────────────────────────────────────────────────────────

  _build() {
    const scene = this._scene;
    const W = scene.cameras.main.width;
    const H = scene.cameras.main.height;

    this._container = scene.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setAlpha(0);

    // Fond semi-transparent
    this._bg = scene.add.graphics();
    this._container.add(this._bg);

    // Titre "OBJECTIF"
    this._titleTxt = scene.add.text(PAD, PAD, 'OBJECTIF', {
      fontFamily: 'monospace',
      fontSize:   '10px',
      fontStyle:  'bold',
      color:      '#ffcc44',
      stroke:     '#000',
      strokeThickness: 2,
    });
    this._container.add(this._titleTxt);

    // Nom de la quête
    this._labelTxt = scene.add.text(PAD, PAD + 18, '', {
      fontFamily: 'monospace',
      fontSize:   '13px',
      fontStyle:  'bold',
      color:      '#ffffff',
      stroke:     '#000',
      strokeThickness: 3,
      wordWrap:   { width: W_BOX - PAD * 2 },
    });
    this._container.add(this._labelTxt);

    // Description courte
    this._descTxt = scene.add.text(PAD, PAD + 36, '', {
      fontFamily: 'monospace',
      fontSize:   '10px',
      color:      '#aabbcc',
      stroke:     '#000',
      strokeThickness: 2,
      wordWrap:   { width: W_BOX - PAD * 2 },
    });
    this._container.add(this._descTxt);

    this._reposition();

    // Apparition douce
    scene.tweens.add({ targets: this._container, alpha: 1, duration: 600, ease: 'Power2' });
  }

  _reposition() {
    const W = this._scene.cameras.main.width;
    const H = this._scene.cameras.main.height;
    this._container.setPosition(W - W_BOX - 10, H - 100);
  }

  // ── Mise à jour ───────────────────────────────────────────────────────────────

  _refresh() {
    const quest = this._quests.currentQuest;

    if (!quest) {
      // Toutes les quêtes terminées
      this._drawBg('#1a3a1a', '#44ff88');
      this._labelTxt.setText('Toutes les quêtes\nacomplies !').setColor('#44ff88');
      this._descTxt.setText('');
      return;
    }

    this._drawBg('#0d1a2a', '#3366aa');
    this._labelTxt.setText(quest.label).setColor('#ffffff');
    this._descTxt.setText(quest.desc);
  }

  _drawBg(fillHex, borderHex) {
    const h = 90;
    this._bg.clear();
    this._bg.fillStyle(Phaser.Display.Color.HexStringToColor(fillHex).color, 0.82);
    this._bg.fillRoundedRect(0, 0, W_BOX, h, 8);
    this._bg.lineStyle(2, Phaser.Display.Color.HexStringToColor(borderHex).color, 0.9);
    this._bg.strokeRoundedRect(0, 0, W_BOX, h, 8);

    // Barre colorée en haut
    this._bg.fillStyle(Phaser.Display.Color.HexStringToColor(borderHex).color, 0.7);
    this._bg.fillRoundedRect(0, 0, W_BOX, 4, { tl: 8, tr: 8, bl: 0, br: 0 });
  }

  // ── Animation de complétion ───────────────────────────────────────────────────

  _onQuestComplete(completedQuest) {
    const scene = this._scene;
    if (!scene || !scene.scene?.isActive(scene.scene.key)) return;

    // Flash vert + texte "✓ Quête accomplie!"
    const W = scene.cameras.main.width;
    const H = scene.cameras.main.height;

    const banner = scene.add.text(W / 2, H - 130, `✓  ${completedQuest.label}`, {
      fontFamily: 'monospace',
      fontSize:   '17px',
      fontStyle:  'bold',
      color:      '#44ff88',
      stroke:     '#003300',
      strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 10).setAlpha(0);

    scene.tweens.add({
      targets:  banner,
      alpha:    1,
      y:        H - 150,
      duration: 400,
      ease:     'Back.Out',
      onComplete: () => {
        scene.tweens.add({
          targets:  banner,
          alpha:    0,
          y:        H - 170,
          delay:    2000,
          duration: 500,
          onComplete: () => banner.destroy(),
        });
      },
    });

    // Mettre à jour le panneau après un court délai (laisser l'animation se voir)
    scene.time.delayedCall(300, () => this._refresh());
  }

  // ── Nettoyage ─────────────────────────────────────────────────────────────────

  destroy() {
    if (this._resizeFn) {
      this._scene.scale?.off('resize', this._resizeFn);
      this._resizeFn = null;
    }
    // Déconnecter le callback du QuestSystem
    this._quests?.setOnChange(null);
    this._container?.destroy();
    this._container = null;
  }
}
