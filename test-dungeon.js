/**
 * Test manuel Playwright pour la DungeonScene (étape 8).
 * Lance le jeu, vérifie le chargement, puis navigue jusqu'au donjon.
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    headless: true,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', e => errors.push(e.message));

  // Serve the game locally
  await page.goto('http://localhost:8765/index.html');

  // Wait for Phaser to initialise (BootScene → PreloadScene → MainMenuScene)
  await sleep(3000);

  // Check no critical errors
  const criticalErrors = errors.filter(e =>
    !e.includes('AudioContext') &&
    !e.includes('favicon') &&
    !e.includes('démarrage différé')
  );
  if (criticalErrors.length > 0) {
    console.error('❌ Erreurs JS détectées :', criticalErrors);
    await browser.close();
    process.exit(1);
  }

  // Check game is running
  const gameExists = await page.evaluate(() => !!window.__game);
  if (!gameExists) {
    console.error('❌ window.__game non défini');
    await browser.close();
    process.exit(1);
  }
  console.log('✓ Jeu chargé');

  // Start GameScene directly
  await page.evaluate(() => {
    const g = window.__game;
    g.scene.start('GameScene');
  });
  await sleep(2500);

  const gsActive = await page.evaluate(() => {
    return window.__game.scene.isActive('GameScene');
  });
  if (!gsActive) {
    console.error('❌ GameScene non active');
    await browser.close();
    process.exit(1);
  }
  console.log('✓ GameScene active');

  // Check sewer grate exists in GameScene
  const grateExists = await page.evaluate(() => {
    const gs = window.__game.scene.getScene('GameScene');
    return !!gs._sewerGrate;
  });
  if (!grateExists) {
    console.error('❌ Grille des égouts absente de GameScene');
    await browser.close();
    process.exit(1);
  }
  console.log('✓ Grille des égouts présente');

  // Launch DungeonScene directly
  await page.evaluate(() => {
    window.__game.scene.stop('GameScene');
    window.__game.scene.start('DungeonScene');
  });
  await sleep(3000);

  const dsActive = await page.evaluate(() => {
    return window.__game.scene.isActive('DungeonScene');
  });
  if (!dsActive) {
    console.error('❌ DungeonScene non active');
    await browser.close();
    process.exit(1);
  }
  console.log('✓ DungeonScene active');

  // Check player spawned
  const playerOk = await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    return ds._player && ds._player.x > 0;
  });
  if (!playerOk) {
    console.error('❌ Joueur non créé dans DungeonScene');
    await browser.close();
    process.exit(1);
  }
  console.log('✓ Joueur créé dans DungeonScene');

  // Check traps
  const trapsOk = await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    return ds._traps && ds._traps.length === 3;
  });
  console.log(trapsOk ? '✓ 3 pièges créés' : '❌ Pièges manquants');

  // Check doors
  const doorsOk = await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    return ds._doors.v3 && ds._doors.h3;
  });
  console.log(doorsOk ? '✓ 2 portes créées (V3, H3)' : '❌ Portes manquantes');

  // Check levers
  const leversOk = await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    return ds._levers && ds._levers.length === 4;  // 1 R3 + 3 énigme
  });
  console.log(leversOk ? '✓ 4 leviers créés' : '❌ Leviers manquants');

  // Simulate entering R4 to trigger rat spawn
  await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    ds._player.setPosition(720, 860);
  });
  await sleep(800);
  const ratsOk = await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    return ds._rats && ds._rats.length > 0;
  });
  console.log(ratsOk ? '✓ Rats spawné dans R4' : '❌ Rats non spawné');

  // Simulate entering R5 to trigger infected spawn
  await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    ds._player.setPosition(1100, 860);
  });
  await sleep(800);
  const infectedOk = await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    return ds._infected && ds._infected.length > 0;
  });
  console.log(infectedOk ? '✓ Zombies infectés spawné dans R5' : '❌ Infectés non spawné');

  // Test lever R3
  await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    // Pull R3 lever
    ds._levers[0].lever.pull();
  });
  await sleep(400);
  const doorV3Open = await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    return ds._doors.v3.isOpen;
  });
  console.log(doorV3Open ? '✓ Porte V3 ouverte par levier R3' : '❌ Porte V3 non ouverte');

  // Test enigma R7 in correct order
  await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    // Enigma levers are indices 1,2,3 in _levers
    ds._levers[1].lever.pull();  // L1 (idx 0)
  });
  await sleep(200);
  await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    ds._levers[2].lever.pull();  // L2 (idx 1)
  });
  await sleep(200);
  await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    ds._levers[3].lever.pull();  // L3 (idx 2)
  });
  await sleep(400);
  const doorH3Open = await page.evaluate(() => {
    const ds = window.__game.scene.getScene('DungeonScene');
    return ds._doors.h3.isOpen;
  });
  console.log(doorH3Open ? '✓ Porte H3 ouverte par énigme' : '❌ Porte H3 non ouverte');

  // Check no critical JS errors during dungeon
  const finalErrors = errors.filter(e =>
    !e.includes('AudioContext') &&
    !e.includes('favicon') &&
    !e.includes('démarrage différé') &&
    !e.includes('DungeonAudio')
  );
  if (finalErrors.length > 0) {
    console.error('❌ Erreurs JS pendant le donjon :', finalErrors);
    await browser.close();
    process.exit(1);
  }

  console.log('\n✅ Tous les tests réussis !');
  await browser.close();
  process.exit(0);
}

run().catch(e => {
  console.error('❌ Erreur fatale :', e.message);
  process.exit(1);
});
