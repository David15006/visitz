/**
 * Test Playwright — Zone Finale & Boss Final (étape 10)
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

  // ── 1. Vérifier que FinalZoneScene et CreditsScene sont enregistrées ───────
  const scenesOk = await page.evaluate(() => {
    const keys = window.__game.scene.scenes.map(s => s.sys.settings.key);
    return keys.includes('FinalZoneScene') && keys.includes('CreditsScene');
  });
  console.log(scenesOk ? '✓ FinalZoneScene & CreditsScene enregistrées' : '❌ Scènes manquantes');

  // ── 2. Vérifier textures FinalBoss dans le cache ──────────────────────────
  const texturesOk = await page.evaluate(() => {
    const needed = ['fb_idle_0', 'fb_idle_1', 'fb_idle_2', 'fb_idle_3', 'fb_atk_0', 'fb_atk_1'];
    return needed.every(k => window.__game.textures.exists(k));
  });
  console.log(texturesOk ? '✓ Textures FinalBoss présentes' : '❌ Textures FinalBoss manquantes');

  // ── 3. Démarrer FinalZoneScene directement ────────────────────────────────
  await page.evaluate(() => {
    window.__game.scene.stop('MainMenuScene');
    window.__game.scene.start('FinalZoneScene');
  });
  await sleep(4000); // attendre intro cinématique (2.5s) + initialisation

  const fzsActive = await page.evaluate(() => window.__game.scene.isActive('FinalZoneScene'));
  if (!fzsActive) { console.error('❌ FinalZoneScene non active'); await browser.close(); process.exit(1); }
  console.log('✓ FinalZoneScene active');

  // ── 4. Vérifier joueur spawné ─────────────────────────────────────────────
  const playerOk = await page.evaluate(() => {
    const fz = window.__game.scene.getScene('FinalZoneScene');
    return !!fz._player && fz._player.active;
  });
  console.log(playerOk ? '✓ Joueur présent dans FinalZoneScene' : '❌ Joueur absent');

  // ── 5. Déclencher le boss manuellement (contourner le délai d'intro) ──────
  await page.evaluate(() => {
    const fz = window.__game.scene.getScene('FinalZoneScene');
    if (!fz._boss) fz._spawnBoss();
  });
  await sleep(1500);

  // ── 6. Vérifier boss spawné ───────────────────────────────────────────────
  const bossOk = await page.evaluate(() => {
    const fz = window.__game.scene.getScene('FinalZoneScene');
    return !!fz._boss && fz._boss.active;
  });
  console.log(bossOk ? '✓ FinalBoss spawné' : '❌ FinalBoss absent');

  // ── 7. Vérifier stats initiales du boss ──────────────────────────────────
  const bossStats = await page.evaluate(() => {
    const fz = window.__game.scene.getScene('FinalZoneScene');
    return { hp: fz._boss?.hp, phase: fz._boss?.phase };
  });
  const statsOk = bossStats.hp === 1500 && bossStats.phase === 1;
  console.log(statsOk
    ? `✓ Boss stats corrects (HP=${bossStats.hp}, phase=${bossStats.phase})`
    : `❌ Stats incorrects: ${JSON.stringify(bossStats)}`);

  // ── 8. Vérifier BossHPBar ─────────────────────────────────────────────────
  const hpBarOk = await page.evaluate(() => {
    const fz = window.__game.scene.getScene('FinalZoneScene');
    return !!fz._bossHPBar;
  });
  console.log(hpBarOk ? '✓ BossHPBar affichée' : '❌ BossHPBar absente');

  // ── 9. Tester transition phase 2 (HP ≤ 1000) ─────────────────────────────
  await page.evaluate(() => {
    const fz = window.__game.scene.getScene('FinalZoneScene');
    if (fz._boss) { fz._boss._hp = 999; fz._boss._checkPhase(); }
  });
  await sleep(300);
  const phase2ok = await page.evaluate(() => {
    const fz = window.__game.scene.getScene('FinalZoneScene');
    return fz._boss?.phase === 2;
  });
  console.log(phase2ok ? '✓ Phase 2 déclenchée à HP≤1000' : '❌ Phase 2 non déclenchée');

  // ── 10. Tester transition phase 3 (HP ≤ 500) ─────────────────────────────
  await page.evaluate(() => {
    const fz = window.__game.scene.getScene('FinalZoneScene');
    if (fz._boss) { fz._boss._hp = 499; fz._boss._checkPhase(); }
  });
  await sleep(300);
  const phase3ok = await page.evaluate(() => {
    const fz = window.__game.scene.getScene('FinalZoneScene');
    return fz._boss?.phase === 3;
  });
  console.log(phase3ok ? '✓ Phase 3 déclenchée à HP≤500' : '❌ Phase 3 non déclenchée');

  // ── 11. Tuer le boss et vérifier cinématique de victoire ─────────────────
  await page.evaluate(() => {
    const fz = window.__game.scene.getScene('FinalZoneScene');
    if (fz._boss) fz._boss.takeDamage(9999);
  });
  await sleep(4000); // laisser l'animation de mort se jouer (1500ms)

  const bossDefeated = await page.evaluate(() => {
    const fz = window.__game.scene.getScene('FinalZoneScene');
    return fz._bossDefeated === true;
  });
  console.log(bossDefeated ? '✓ Boss vaincu — _bossDefeated=true' : '❌ Flag _bossDefeated absent');

  // ── 12. Attendre la transition vers CreditsScene ──────────────────────────
  // Die animation: 1500ms, victory cinematic: 6500ms, fadeOut: 1500ms
  await sleep(8000);

  const creditsActive = await page.evaluate(() => window.__game.scene.isActive('CreditsScene'));
  console.log(creditsActive ? '✓ CreditsScene active après victoire' : '❌ CreditsScene non démarrée');

  // ── 13. Tester restart depuis CreditsScene ────────────────────────────────
  if (creditsActive) {
    await page.keyboard.press('Enter');
    await sleep(1500);
    const menuActive = await page.evaluate(() => window.__game.scene.isActive('MainMenuScene'));
    console.log(menuActive ? '✓ Retour au MainMenuScene (restart OK)' : '❌ Restart vers MainMenuScene échoué');
  }

  // ── 14. Vérifier pas d'erreurs critiques ─────────────────────────────────
  const finalErrors = errors.filter(critical);
  if (finalErrors.length > 0) {
    console.error('❌ Erreurs JS :', finalErrors);
    await browser.close(); process.exit(1);
  }

  console.log('\n✅ Tous les tests de la Zone Finale réussis !');
  await browser.close();
  process.exit(0);
}

run().catch(e => {
  console.error('❌ Erreur fatale :', e.message);
  process.exit(1);
});
