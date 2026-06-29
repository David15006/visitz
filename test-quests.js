/**
 * Test Playwright — Système de quêtes (étape 11)
 */
import { chromium } from 'playwright';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    headless: true,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();

  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', e => errors.push(e.message));

  await page.goto('http://localhost:8765/index.html');
  await sleep(3500);

  const critical = e =>
    !e.includes('AudioContext') && !e.includes('favicon') &&
    !e.includes('démarrage différé') && !e.includes('DungeonAudio') &&
    !e.includes('RatKingAudio') && !e.includes('FinalBossAudio');

  if (errors.filter(critical).length > 0) {
    console.error('❌ Erreurs JS au chargement :', errors.filter(critical));
    await browser.close(); process.exit(1);
  }
  console.log('✓ Jeu chargé sans erreur');

  // ── Démarrer GameScene ────────────────────────────────────────────────────
  await page.evaluate(() => {
    window.__game.scene.stop('MainMenuScene');
    window.__game.scene.start('GameScene');
  });
  await sleep(2500);

  const gsActive = await page.evaluate(() => window.__game.scene.isActive('GameScene'));
  if (!gsActive) { console.error('❌ GameScene non active'); await browser.close(); process.exit(1); }
  console.log('✓ GameScene active');

  // ── 1. QuestSystem initialisé ─────────────────────────────────────────────
  const questsOk = await page.evaluate(() => !!window.__quests);
  console.log(questsOk ? '✓ QuestSystem initialisé (window.__quests)' : '❌ QuestSystem absent');

  // ── 2. Quête courante = première quête ─────────────────────────────────────
  const firstQuest = await page.evaluate(() => window.__quests?.currentQuest?.id);
  console.log(firstQuest === 'first_night'
    ? '✓ Quête initiale : first_night'
    : `❌ Quête initiale incorrecte : ${firstQuest}`);

  // ── 3. Valider first_night via événement ──────────────────────────────────
  await page.evaluate(() => window.__game.events.emit('quest:first_night'));
  await sleep(200);
  const q1done = await page.evaluate(() => window.__quests.isCompleted('first_night'));
  console.log(q1done ? '✓ Quête "first_night" validée' : '❌ Quête "first_night" non validée');

  const q2active = await page.evaluate(() => window.__quests.currentQuest?.id);
  console.log(q2active === 'sell_dish'
    ? '✓ Quête suivante : sell_dish'
    : `❌ Quête suivante incorrecte : ${q2active}`);

  // ── 4. Valider sell_dish ──────────────────────────────────────────────────
  await page.evaluate(() => window.__game.events.emit('quest:sell_dish'));
  await sleep(200);
  const q2done = await page.evaluate(() => window.__quests.isCompleted('sell_dish'));
  console.log(q2done ? '✓ Quête "sell_dish" validée' : '❌ Quête "sell_dish" non validée');

  // ── 5. Valider buy_weapon ─────────────────────────────────────────────────
  await page.evaluate(() => window.__game.events.emit('quest:buy_weapon'));
  await sleep(200);
  const q3done = await page.evaluate(() => window.__quests.isCompleted('buy_weapon'));
  console.log(q3done ? '✓ Quête "buy_weapon" validée' : '❌ Quête "buy_weapon" non validée');

  // ── 6. Valider kill_boss ──────────────────────────────────────────────────
  await page.evaluate(() => window.__game.events.emit('quest:kill_boss'));
  await sleep(200);
  const q4done = await page.evaluate(() => window.__quests.isCompleted('kill_boss'));
  console.log(q4done ? '✓ Quête "kill_boss" validée' : '❌ Quête "kill_boss" non validée');

  // ── 7. Valider enter_sewer ────────────────────────────────────────────────
  await page.evaluate(() => window.__game.events.emit('quest:enter_sewer'));
  await sleep(200);
  const q5done = await page.evaluate(() => window.__quests.isCompleted('enter_sewer'));
  console.log(q5done ? '✓ Quête "enter_sewer" validée' : '❌ Quête "enter_sewer" non validée');

  // ── 8. Valider kill_ratking depuis DungeonScene ───────────────────────────
  await page.evaluate(() => {
    window.__game.scene.stop('GameScene');
    window.__game.scene.start('DungeonScene');
  });
  await sleep(2500);

  const dsActive = await page.evaluate(() => window.__game.scene.isActive('DungeonScene'));
  console.log(dsActive ? '✓ DungeonScene active' : '❌ DungeonScene non active');

  // Vérifier que le QuestPanel est créé dans DungeonScene
  const panelInDungeon = await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    return !!ds._questPanel;
  });
  console.log(panelInDungeon ? '✓ QuestPanel présent dans DungeonScene' : '❌ QuestPanel absent dans DungeonScene');

  // Simuler la mort du RatKing (déclenche le bon événement)
  await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    ds._onRatKingDeath?.() ?? window.__game.events.emit('quest:kill_ratking');
  });
  await sleep(300);
  const q6done = await page.evaluate(() => window.__quests.isCompleted('kill_ratking'));
  console.log(q6done ? '✓ Quête "kill_ratking" validée' : '❌ Quête "kill_ratking" non validée');

  // ── 9. Valider kill_final depuis FinalZoneScene ───────────────────────────
  await page.evaluate(() => {
    window.__game.scene.stop('DungeonScene');
    window.__game.scene.start('FinalZoneScene');
  });
  await sleep(2500);

  const fzsActive = await page.evaluate(() => window.__game.scene.isActive('FinalZoneScene'));
  console.log(fzsActive ? '✓ FinalZoneScene active' : '❌ FinalZoneScene non active');

  const panelInFinal = await page.evaluate(() => {
    const fz = window.__game.scene.getScene('FinalZoneScene');
    return !!fz._questPanel;
  });
  console.log(panelInFinal ? '✓ QuestPanel présent dans FinalZoneScene' : '❌ QuestPanel absent dans FinalZoneScene');

  await page.evaluate(() => window.__game.events.emit('quest:kill_final'));
  await sleep(300);
  const q7done = await page.evaluate(() => window.__quests.isCompleted('kill_final'));
  console.log(q7done ? '✓ Quête "kill_final" validée' : '❌ Quête "kill_final" non validée');

  // ── 10. Toutes les quêtes complétées ─────────────────────────────────────
  const allDone = await page.evaluate(() => window.__quests.allDone);
  console.log(allDone ? '✓ Toutes les quêtes accomplies (allDone=true)' : '❌ allDone=false');

  const noNext = await page.evaluate(() => window.__quests.currentQuest === null);
  console.log(noNext ? '✓ currentQuest=null (fin de toutes les quêtes)' : '❌ currentQuest non null');

  // ── 11. Pas d'erreurs critiques ───────────────────────────────────────────
  const finalErrors = errors.filter(critical);
  if (finalErrors.length > 0) {
    console.error('❌ Erreurs JS :', finalErrors);
    await browser.close(); process.exit(1);
  }

  console.log('\n✅ Tous les tests du système de quêtes réussis !');
  await browser.close();
  process.exit(0);
}

run().catch(e => {
  console.error('❌ Erreur fatale :', e.message);
  process.exit(1);
});
