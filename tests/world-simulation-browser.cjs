const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

(async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'room-world-lab-test-'));
  const artifactDir = path.join(__dirname, 'artifacts/world-model');
  fs.mkdirSync(artifactDir, { recursive: true });
  const server = spawn(
    '/Library/Frameworks/Python.framework/Versions/3.14/bin/python3',
    ['backend/server.py', '--port', '8935', '--data-dir', dataDir],
    {
      env: { ...process.env, ROOM_OWNER_PASSWORD: 'world-lab-browser-test-password' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  await new Promise((resolve, reject) => {
    server.stdout.once('data', resolve);
    server.once('error', reject);
    server.once('exit', (code) => reject(new Error(`server exited ${code}`)));
  });

  let browser;
  try {
    browser = await chromium.launch({
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true,
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.setDefaultTimeout(30_000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto('http://127.0.0.1:8935/world-model/demo.html');
    await page.waitForFunction(() => window.__WORLD_LAB__?.snapshot().actors.length === 3);
    assert.match(await page.locator('[data-testid="lab-status"]').textContent(), /不是 AI 世界模型/);
    assert.equal(await page.locator('.actor-card').count(), 3);
    assert.equal(await page.locator('.place').count(), 5);
    assert.equal(await page.locator('#tick').textContent(), '0');

    await page.locator('#step-one').click();
    assert.equal(await page.locator('#tick').textContent(), '1');
    assert.ok(Number(await page.locator('#event-count').textContent()) >= 5);
    assert.ok(await page.locator('.event').count() >= 5);

    await page.locator('#reset').click();
    await page.locator('#step-ten').click();
    const firstRun = await page.evaluate(() => ({
      snapshot: window.__WORLD_LAB__.snapshot(),
      events: window.__WORLD_LAB__.events(),
    }));
    await page.locator('#reset').click();
    await page.locator('#step-ten').click();
    const repeatedRun = await page.evaluate(() => ({
      snapshot: window.__WORLD_LAB__.snapshot(),
      events: window.__WORLD_LAB__.events(),
    }));
    assert.deepEqual(repeatedRun, firstRun, 'resetting the same seed must replay the same world');

    await page.locator('#seed').fill('17');
    await page.locator('#reset').click();
    await page.locator('#step-ten').click();
    const differentRun = await page.evaluate(() => window.__WORLD_LAB__.events());
    assert.notDeepEqual(differentRun, firstRun.events);
    await page.screenshot({ path: path.join(artifactDir, 'desktop.png'), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.waitForFunction(() => window.__WORLD_LAB__?.snapshot().actors.length === 3);
    await page.locator('#step-one').click();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
      'mobile page must not overflow horizontally',
    );
    await page.screenshot({ path: path.join(artifactDir, 'mobile.png'), fullPage: true });

    assert.deepEqual(errors, []);
    console.log('PASS desktop/mobile world lab, deterministic reset and interactive event timeline');
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
