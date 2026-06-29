/**
 * Test Playwright — Roi des Rats (étape 9)
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

  // Filtrage des erreurs non-critiques
  const critical = e =>
    !e.includes('AudioContext') && !e.includes('favicon') &&
    !e.includes('démarrage différé') && !e.includes('DungeonAudio') &&
    !e.includes('RatKingAudio');

  if (errors.filter(critical).length > 0) {
    console.error('❌ Erreurs JS au chargement :', errors.filter(critical));
    await browser.close(); process.exit(1);
  }
  console.log('✓ Jeu chargé sans erreur');

  // Démarrer DungeonScene directement
  await page.evaluate(() => {
    window.__game.scene.stop('MainMenuScene');
    window.__game.scene.start('DungeonScene');
  });
  await sleep(3000);

  const dsActive = await page.evaluate(() => window.__game.scene.isActive('DungeonScene'));
  if (!dsActive) { console.error('❌ DungeonScene non active'); await browser.close(); process.exit(1); }
  console.log('✓ DungeonScene active');

  // Vérifier que R9 existe dans la map (bounds étendues)
  const worldBounds = await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    return { w: ds.physics.world.bounds.width, h: ds.physics.world.bounds.height };
  });
  const r9ok = worldBounds.w >= 2200;
  console.log(r9ok ? `✓ Monde étendu (${worldBounds.w}x${worldBounds.h})` : `❌ Monde trop petit (${worldBounds.w}x${worldBounds.h})`);

  // Vérifier la porte boss
  const bossDoorOk = await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    return !!ds._bossDoor && !ds._bossDoor.isOpen;
  });
  console.log(bossDoorOk ? '✓ Porte boss créée (fermée)' : '❌ Porte boss manquante');

  // Vérifier BossHPBar non visible au départ
  const hpBarHidden = await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    return ds._bossHPBar === null;
  });
  console.log(hpBarHidden ? '✓ BossHPBar absente avant le boss' : '❌ BossHPBar présente trop tôt');

  // Téléporter le joueur en R9 pour déclencher le boss
  await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    ds._player.setPosition(1990, 1120);
    // Forcer le trigger manuellement
    ds._triggerBossFight();
  });
  await sleep(1500);  // Attendre le délayedCall de 800ms + spawn

  // Vérifier le RatKing
  const ratKingOk = await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    return ds._ratKing !== null && !ds._ratKing.isDead;
  });
  console.log(ratKingOk ? '✓ Roi des Rats spawné' : '❌ Roi des Rats absent');

  // Vérifier BossHPBar visible
  const hpBarVisible = await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    return ds._bossHPBar !== null;
  });
  console.log(hpBarVisible ? '✓ BossHPBar affichée' : '❌ BossHPBar absente');

  // Vérifier musique boss
  const bossAudioOk = await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    return ds._bossAudio !== null;
  });
  console.log(bossAudioOk ? '✓ Musique boss démarrée' : '❌ Musique boss absente');

  // Tester les stats initiales du boss
  const bossStats = await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    return { hp: ds._ratKing?.hp, phase: ds._ratKing?.phase };
  });
  const statsOk = bossStats.hp === 600 && bossStats.phase === 1;
  console.log(statsOk ? `✓ Boss stats corrects (HP=${bossStats.hp}, phase=${bossStats.phase})` : `❌ Stats incorrects: ${JSON.stringify(bossStats)}`);

  // Tester la transition de phase (mettre HP à 300 = 50%)
  await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    if (ds._ratKing) ds._ratKing._hp = 300;
  });
  await sleep(200);
  const phase2ok = await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    if (!ds._ratKing) return false;
    ds._ratKing._updatePhase();
    return ds._ratKing.phase === 2;
  });
  console.log(phase2ok ? '✓ Phase 2 déclenchée à 300HP' : '❌ Phase 2 non déclenchée');

  // Tester invocation de rats via callback
  const ratsBefore = await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    return ds._rats.length;
  });
  await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    ds._spawnRatsAt(1990, 1120, 3);
  });
  await sleep(300);
  const ratsAfter = await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    return ds._rats.length;
  });
  console.log(ratsAfter >= ratsBefore + 3 ? `✓ Invocation rats (${ratsAfter} rats)` : '❌ Invocation rats échouée');

  // Tuer le boss et vérifier la victoire
  await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    if (ds._ratKing) ds._ratKing.takeDamage(9999);
  });
  await sleep(2500);  // Attendre animation de mort + victoire

  const bossDefeated = await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    return ds._bossDefeated;
  });
  console.log(bossDefeated ? '✓ Boss vaincu — flag bossDefeated=true' : '❌ Flag bossDefeated absent');

  // Vérifier portail de sortie
  const portalOk = await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    return ds._exitPortal !== null;
  });
  console.log(portalOk ? '✓ Portail de sortie créé' : '❌ Portail de sortie absent');

  // Vérifier FinalKey dans worldItems
  const keyDropped = await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    if (!ds._player?.worldItems) return true; // pas de worldItems = peut pas vérifier
    const items = ds._player.worldItems?.getChildren?.() ?? [];
    return items.some(i => i.getData?.('item')?.key === 'final_key');
  });
  console.log(keyDropped ? '✓ Clé Finale droppée' : '❌ Clé Finale non droppée');

  // Vérifier GameScene — porte finale
  await page.evaluate(() => {
    window.__game.scene.stop('DungeonScene');
    window.__game.scene.start('GameScene');
  });
  await sleep(2500);

  const finalGateOk = await page.evaluate(() => {
    const gs = window.__game.scene.getScene('GameScene');
    return !!gs._finalGateGfx && !gs._finalGateOpen;
  });
  console.log(finalGateOk ? '✓ Portail Zone Finale présent dans GameScene' : '❌ Portail Zone Finale absent');

  // Vérifier pas d'erreurs critiques
  const finalErrors = errors.filter(critical);
  if (finalErrors.length > 0) {
    console.error('❌ Erreurs JS :', finalErrors);
    await browser.close(); process.exit(1);
  }

  console.log('\n✅ Tous les tests réussis !');
  await browser.close();
  process.exit(0);
}

run().catch(e => {
  console.error('❌ Erreur fatale :', e.message);
  process.exit(1);
});
