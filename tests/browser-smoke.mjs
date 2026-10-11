import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '/opt/codex/cua_node/lib/node_modules/playwright/index.mjs';

const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
const output = new URL('../test-results/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors = [];
const externalFailures = [];
const failedResponses = [];
const checks = [];
const contexts = [];

async function openScene(options, rendererMode = 'normal') {
  const context = await browser.newContext(options);
  contexts.push(context);
  const page = await context.newPage();
  // SwiftShader compiles and executes this ray shader on the CPU in CI.
  page.setDefaultNavigationTimeout(90000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400) failedResponses.push({ status: response.status(), url: response.url() });
  });
  page.on('console', message => {
    if (message.type() === 'error') {
      if (message.text().includes('net::ERR') && !message.location().url.startsWith(baseURL)) externalFailures.push(message.text());
      else errors.push(message.text());
    }
  });
  await page.addInitScript(mode => {
    const original = HTMLCanvasElement.prototype.getContext;
    window.__contextRequests = [];
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (mode === 'no-webgl' && /webgl/.test(type)) {
        window.__contextRequests.push({ type, success: false });
        return null;
      }
      const result = original.call(this, type, ...args);
      window.__contextRequests.push({ type, success: Boolean(result) });
      return result;
    };
  }, rendererMode);
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__observatory?.getStats, null, { timeout: 90000 });
  await page.waitForTimeout(700);
  return page;
}

const stats = page => page.evaluate(() => window.__observatory.getStats());
const frameFingerprint = page => page.evaluate(() => {
  const canvas = document.querySelector('#universe');
  const gl = canvas.getContext('webgl2');
  const sampleWidth = Math.min(256, canvas.width);
  const sampleHeight = Math.min(256, Math.floor(canvas.height * 0.4));
  const sample = new Uint8Array(sampleWidth * sampleHeight * 4);
  gl.readPixels(Math.floor((canvas.width - sampleWidth) / 2), Math.floor(canvas.height * 0.58), sampleWidth, sampleHeight, gl.RGBA, gl.UNSIGNED_BYTE, sample);
  let hash = 2166136261;
  let visible = 0;
  for (let i = 0; i < sample.length; i += 4) {
    hash = Math.imul(hash ^ sample[i] ^ (sample[i + 1] << 8) ^ (sample[i + 2] << 16), 16777619);
    if (sample[i] + sample[i + 1] + sample[i + 2] > 45) visible++;
  }
  return { hash, visible, error: gl.getError() };
});
async function waitForTimeAdvance(page, previousTime) {
  await page.waitForFunction(previous => {
    const value = window.__observatory?.getStats();
    return value && (value.time ?? value.animationTime ?? value.elapsedTime ?? value.elapsed) > previous;
  }, previousTime, { timeout: 20000, polling: 250 });
}
function animationTime(value) {
  for (const key of ['time', 'animationTime', 'elapsedTime', 'elapsed']) {
    if (typeof value[key] === 'number') return value[key];
  }
  throw new Error(`Renderer diagnostics need a numeric animation time: ${JSON.stringify(value)}`);
}

async function setRange(page, id, value) {
  await page.locator(`#${id}`).evaluate((input, next) => {
    input.value = String(next);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

async function openPersonal(page, view) {
  await page.locator(`.nav-trigger[data-view="${view}"]`).click();
  await page.waitForFunction(name => document.querySelector('#personal-panel').open && !document.getElementById(name).hidden, view);
  assert.equal(await page.locator(`.panel-tab[data-view="${view}"]`).getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('dialog[open]').count(), 1, 'Only one modal should be open');
}

async function closePersonal(page) {
  await page.locator('.close-personal').click();
  await page.waitForFunction(() => !document.querySelector('#personal-panel').open && [...document.querySelectorAll('.nav-trigger')].every(button => button.getAttribute('aria-expanded') === 'false'));
}

async function restoredWork(page) {
  await page.waitForFunction(() => !document.querySelector('#project-panel').open && document.querySelector('#personal-panel').open && document.querySelector('.project-trigger') === document.activeElement);
  assert.equal(await page.locator('#work').evaluate(element => element.hidden), false);
  assert.equal(await page.locator('.project-trigger').getAttribute('aria-expanded'), 'false');
}

async function exitImmersive(page) {
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__observatory.getStats().immersive && document.querySelector('.immersive-button') === document.activeElement);
  assert.equal(await page.locator('#personal-content').evaluate(element => element.inert), false);
}

async function getLayout(page) {
  return page.evaluate(() => ({
    width: innerWidth, height: innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    canvas: document.querySelector('#universe').getBoundingClientRect().toJSON(),
  }));
}

function assertOneScreen(layout, label) {
  assert(layout.scrollWidth <= layout.width + 1, `${label} should not overflow horizontally`);
  assert(layout.scrollHeight <= layout.height + 1, `${label} should stay within one screen`);
  assert.equal(layout.canvas.width, layout.width);
  assert.equal(layout.canvas.height, layout.height);
}

async function assertPanelFits(page, selector, layout) {
  const bounds = await page.locator(selector).boundingBox();
  assert(bounds.x >= 0 && bounds.x + bounds.width <= layout.width, `${selector} should fit horizontally`);
  assert(bounds.y >= 0 && bounds.y + bounds.height <= layout.height, `${selector} should fit vertically`);
}

try {
  const desktop = await openScene({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const requested = await desktop.evaluate(() => window.__contextRequests);
  assert(requested.some(item => /webgl/.test(item.type) && item.success), 'The live scene must use an available WebGL renderer');
  checks.push('WebGL context created successfully');
  assert.equal(await desktop.locator('img, picture, video').count(), 0, 'The reference must be recreated as code rather than a raster background');
  assertOneScreen(await getLayout(desktop), 'Desktop homepage');
  const initial = await stats(desktop);
  const initialFrame = await frameFingerprint(desktop);
  assert.equal(initialFrame.error, 0, 'WebGL should report no drawing errors');
  assert(initialFrame.visible > 200, 'The black-hole ring must draw actual visible pixels');
  await waitForTimeAdvance(desktop, animationTime(initial));
  const moving = await stats(desktop);
  assert(animationTime(moving) > animationTime(initial), 'Animation time should advance while running');
  assert.notEqual((await frameFingerprint(desktop)).hash, initialFrame.hash, 'Rendered ring pixels must change with time');
  checks.push('Animation time advances');
  checks.push('Visible shader pixels change with the animation');
  await desktop.screenshot({ path: new URL('desktop.png', output).pathname, timeout: 90000 });

  await desktop.locator('.pause-button').click();
  assert.equal(await desktop.locator('.pause-button').getAttribute('aria-pressed'), 'true');
  const stopped = await stats(desktop);
  await desktop.waitForTimeout(500);
  assert.equal(animationTime(await stats(desktop)), animationTime(stopped), 'Pause must freeze scene time');
  await desktop.locator('.pause-button').click();
  await waitForTimeAdvance(desktop, animationTime(stopped));
  checks.push('Pause/resume freezes and restores animation');

  await desktop.locator('.settings-trigger').click();
  assert.equal(await desktop.locator('.settings-trigger').getAttribute('aria-expanded'), 'true');
  await setRange(desktop, 'speed', 1.7);
  await setRange(desktop, 'intensity', 0.65);
  assert.equal(await desktop.locator('#speed-value').textContent(), '1.7×');
  assert.equal(await desktop.locator('#intensity-value').textContent(), '65%');
  const adjusted = await stats(desktop);
  assert.equal(adjusted.speed, 1.7, 'Time setting should reach the renderer');
  assert.equal(adjusted.intensity, 0.65, 'Light setting should reach the renderer');
  await desktop.locator('.reset-button').click();
  const reset = await stats(desktop);
  assert.equal(reset.speed, 1);
  assert.equal(reset.intensity, 1);
  await desktop.locator('.close-settings').click();
  checks.push('Settings change renderer values and reset to defaults');

  await desktop.locator('.immersive-button').click();
  await desktop.waitForFunction(() => getComputedStyle(document.querySelector('.interface')).visibility === 'hidden');
  assert.equal((await stats(desktop)).immersive, true);
  assert.equal(await desktop.locator('.interface').evaluate(element => element.inert), true);
  assert.equal(await desktop.locator('#personal-content').evaluate(element => element.inert), true);
  await desktop.screenshot({ path: new URL('immersive.png', output).pathname, timeout: 90000 });
  await exitImmersive(desktop);
  checks.push('Immersive mode hides controls; Escape restores personal access and keyboard focus');

  await openPersonal(desktop, 'work');
  const readingStart = await stats(desktop);
  await desktop.waitForTimeout(500);
  assert.equal(animationTime(await stats(desktop)), animationTime(readingStart), 'Opening personal content should pause the scene behind the dialog');
  await desktop.locator('.project-trigger').click();
  await desktop.waitForFunction(() => document.querySelector('#project-panel').open && !document.querySelector('#personal-panel').open);
  assert.equal(await desktop.locator('dialog[open]').count(), 1);
  assert.equal(await desktop.locator('.project-trigger').getAttribute('aria-expanded'), 'true');
  await desktop.keyboard.press('Escape');
  await restoredWork(desktop);
  await desktop.locator('.project-trigger').click();
  await desktop.locator('.project-view-button').click();
  await desktop.waitForFunction(() => window.__observatory.getStats().immersive && document.querySelector('.project-trigger').getAttribute('aria-expanded') === 'false');
  assert.equal(await desktop.locator('dialog[open]').count(), 0);
  await exitImmersive(desktop);
  checks.push('Work opens a paused personal dialog; project notes replace it, restore focus, and open the live scene');

  await openPersonal(desktop, 'notes');
  await desktop.locator('.note-trigger').click();
  assert.equal(await desktop.locator('.note-trigger').getAttribute('aria-expanded'), 'true');
  assert.equal(await desktop.locator('#note-body').evaluate(element => element.hidden), false);
  assert((await desktop.locator('#note-body').innerText()).trim().length > 100, 'The writing entry should open a readable article');
  assertOneScreen(await getLayout(desktop), 'Homepage with reader open');
  await desktop.locator('.close-note').click();
  assert.equal(await desktop.locator('#note-body').evaluate(element => element.hidden), true);
  assert.equal(await desktop.locator('.note-trigger').evaluate(element => element === document.activeElement), true);
  await desktop.locator('.panel-tab[data-view="notes"]').focus();
  await desktop.keyboard.press('ArrowRight');
  assert.equal(await desktop.locator('.panel-tab[data-view="about"]').getAttribute('aria-selected'), 'true');
  assert.equal(await desktop.locator('#about').evaluate(element => element.hidden), false);
  assert.equal(await desktop.locator('#notes').evaluate(element => element.hidden), true);
  await desktop.keyboard.press('Home');
  assert.equal(await desktop.locator('.panel-tab[data-view="work"]').getAttribute('aria-selected'), 'true');
  await closePersonal(desktop);
  const readingEnd = await stats(desktop);
  await waitForTimeAdvance(desktop, animationTime(readingEnd));
  checks.push('Notes expand within the dialog; keyboard tabs switch personal views and closing resumes animation');

  await desktop.evaluate(() => document.activeElement.blur());
  await desktop.keyboard.press('h');
  assert.equal((await stats(desktop)).immersive, true);
  await desktop.keyboard.press('h');
  assert.equal((await stats(desktop)).immersive, false);
  await desktop.evaluate(() => document.activeElement.blur());
  await desktop.keyboard.press('Space');
  assert.equal(await desktop.locator('.pause-button').getAttribute('aria-pressed'), 'true');
  await desktop.keyboard.press('Space');
  assert.equal(await desktop.locator('.pause-button').getAttribute('aria-pressed'), 'false');
  checks.push('H and Space shortcuts work from the scene');

  await desktop.evaluate(() => {
    const gl = document.querySelector('#universe').getContext('webgl2');
    const extension = gl.getExtension('WEBGL_lose_context');
    if (!extension) throw new Error('WEBGL_lose_context is needed to validate recovery');
    extension.loseContext();
  });
  await desktop.waitForFunction(() => window.__observatory.getStats().renderer === 'Canvas 2D', null, { timeout: 15000 });
  assert.equal(await desktop.locator('canvas').count(), 2, 'Context recovery should create a new Canvas surface');
  const fallbackBounds = await desktop.locator('canvas').first().boundingBox();
  assert.equal(fallbackBounds.x, 0);
  assert.equal(fallbackBounds.y, 0);
  assert.equal(fallbackBounds.width, 1280);
  assert.equal(fallbackBounds.height, 720);
  const recoveredStart = await stats(desktop);
  await waitForTimeAdvance(desktop, animationTime(recoveredStart));
  checks.push('WebGL context loss recovers to a full-screen animated Canvas surface');
  await desktop.context().close();

  // Responsive interaction checks use Canvas; live shader behavior was verified above.
  const mobile = await openScene({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true }, 'no-webgl');
  const layout = await getLayout(mobile);
  assertOneScreen(layout, 'Mobile homepage');
  await mobile.locator('.settings-trigger').tap();
  await assertPanelFits(mobile, '#settings-panel', layout);
  await mobile.locator('.close-settings').tap();
  await openPersonal(mobile, 'work');
  await assertPanelFits(mobile, '#personal-panel', layout);
  await mobile.locator('.project-trigger').tap();
  await assertPanelFits(mobile, '#project-panel', layout);
  await mobile.locator('.close-project').tap();
  await restoredWork(mobile);
  await closePersonal(mobile);
  checks.push('390×844 mobile stays one screen and its settings/personal/project panels remain reachable');

  await mobile.setViewportSize({ width: 844, height: 390 });
  await mobile.waitForTimeout(250);
  const landscape = await getLayout(mobile);
  assertOneScreen(landscape, 'Phone landscape');
  await mobile.locator('.settings-trigger').tap();
  await assertPanelFits(mobile, '#settings-panel', landscape);
  await mobile.locator('.close-settings').tap();
  await openPersonal(mobile, 'work');
  await assertPanelFits(mobile, '#personal-panel', landscape);
  await mobile.locator('.project-trigger').tap();
  await assertPanelFits(mobile, '#project-panel', landscape);
  await mobile.locator('.close-project').tap();
  await restoredWork(mobile);
  await closePersonal(mobile);
  checks.push('844×390 landscape stays one screen and all reading panels fit');
  await mobile.context().close();

  const reduced = await openScene({ viewport: { width: 1024, height: 768 }, reducedMotion: 'reduce' }, 'no-webgl');
  assert.equal(await reduced.locator('.pause-button').getAttribute('aria-pressed'), 'true');
  const reducedStart = await stats(reduced);
  await reduced.waitForTimeout(500);
  assert.equal(animationTime(await stats(reduced)), animationTime(reducedStart), 'Reduced-motion preference should pause the scene by default');
  await openPersonal(reduced, 'work');
  await closePersonal(reduced);
  assert.equal(await reduced.locator('.pause-button').getAttribute('aria-pressed'), 'true');
  assert.equal(animationTime(await stats(reduced)), animationTime(reducedStart), 'Closing personal content should respect reduced-motion preference');
  await reduced.emulateMedia({ reducedMotion: 'no-preference' });
  await waitForTimeAdvance(reduced, animationTime(reducedStart));
  assert.equal(await reduced.locator('.pause-button').getAttribute('aria-pressed'), 'false');
  checks.push('Reduced-motion preference pauses animation and responds to changes');
  await reduced.context().close();

  const fallback = await openScene({ viewport: { width: 1024, height: 768 } }, 'no-webgl');
  assert.equal((await stats(fallback)).renderer, 'Canvas 2D');
  const fallbackStart = await stats(fallback);
  await waitForTimeAdvance(fallback, animationTime(fallbackStart));
  assert.equal(await fallback.locator('canvas').count(), 1, 'Unavailable WebGL should reuse the original canvas');
  await fallback.locator('.pause-button').click();
  const fallbackPaused = await stats(fallback);
  await fallback.waitForTimeout(350);
  assert.equal(animationTime(await stats(fallback)), animationTime(fallbackPaused));
  checks.push('WebGL unavailable: animated Canvas fallback and pause still work');
  await fallback.context().close();

  assert.deepEqual(errors, [], 'There should be no application console or runtime errors');
  assert.deepEqual(failedResponses, [], 'Every requested application resource should load successfully');
  assert.deepEqual(externalFailures, [], 'The page should have no failed external resource requests');
  const report = { passed: true, checks, initialStats: initial, adjustedStats: adjusted, layout, landscape, externalFailures, failedResponses, errors };
  await writeFile(new URL('browser-report.json', output), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  const report = { passed: false, checks, error: error.stack, errors, externalFailures, failedResponses };
  await writeFile(new URL('browser-report.json', output), JSON.stringify(report, null, 2));
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
