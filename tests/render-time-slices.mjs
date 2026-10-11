import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/opt/codex/cua_node/lib/node_modules/playwright/index.mjs';

// QA-only time slices. This does not change application code or advance its
// paused simulation clock. Continuous animation is checked by render-smoke.mjs.
const baseURL = process.env.CAPTURE_BASE_URL || 'http://terminal.local:4173/';
const outputDirectory = process.env.CAPTURE_OUTPUT_DIR || fileURLToPath(new URL('../test-results/', import.meta.url));
const timeout = 180000;
const sliceTimes = [0, 0.8, 3, 8, 30];
const coreROI = { left: 575, right: 705, top: 237, bottom: 311 };
const hotBandGuard = {
  // Screen coordinates; right/bottom are exclusive (x 585..694, y 123..180).
  roi: { left: 585, right: 695, top: 123, bottom: 181 },
  brightnessThreshold: .95,
  sRGBWeights: [.2126, .7152, .0722],
  maxMedianRunPixels: 8,
  quantiles: 'Linear interpolation at (columnCount - 1) × probability after sorting column run lengths.',
  interpretation: 'Weighted gamma-encoded sRGB brightness proxy; this regression guard catches a wide saturated upper band and does not replace complete visual review.',
};
const errors = [];
const failedResources = [];
const report = {
  passed: false,
  method: 'Browser-only WebGL2 uniform time override; application clock remains paused at 0 seconds. No repository source or renderer API changes.',
  limitation: 'These images compare true shader frames at selected times. Continuous running animation is validated separately by tests/render-smoke.mjs.',
  baseURL,
  viewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
  coreROI,
  coreDarkThreshold: 32,
  hotBandGuard,
  frames: [],
  errors,
  failedResources,
};
let browser;

try {
  await mkdir(outputDirectory, { recursive: true });
  browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--host-resolver-rules=MAP terminal.local 127.0.0.1', '--no-proxy-server'],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(timeout);
  page.setDefaultNavigationTimeout(timeout);
  page.on('pageerror', error => errors.push({ kind: 'pageerror', message: error.message }));
  page.on('console', message => {
    if (message.type() === 'error') errors.push({ kind: 'console', message: message.text(), location: message.location() });
  });
  page.on('response', response => {
    if (response.status() >= 400) failedResources.push({ kind: 'http', status: response.status(), url: response.url() });
  });
  page.on('requestfailed', request => failedResources.push({ kind: 'requestfailed', url: request.url(), error: request.failure()?.errorText }));

  await page.addInitScript(() => {
    window.__qaShaderTime = 0;
    window.__qaTimeOverride = { installed: false, locationLookups: 0, timeWrites: 0, lastRequestedTime: null, lastOverriddenTime: null };
    try {
      const prototype = window.WebGL2RenderingContext?.prototype;
      if (!prototype) throw new Error('WebGL2RenderingContext is unavailable.');
      const getUniformLocation = prototype.getUniformLocation;
      const uniform1f = prototype.uniform1f;
      if (typeof getUniformLocation !== 'function' || typeof uniform1f !== 'function') throw new Error('Required WebGL2 uniform methods are unavailable.');
      const names = new WeakMap();
      const wrappedGetUniformLocation = function (program, name) {
        const location = getUniformLocation.call(this, program, name);
        if (location !== null) names.set(location, String(name));
        if (String(name) === 'time') window.__qaTimeOverride.locationLookups++;
        return location;
      };
      const wrappedUniform1f = function (location, value) {
        if (location !== null && names.get(location) === 'time') {
          const next = window.__qaShaderTime;
          if (!Number.isFinite(next)) throw new Error('QA shader time must remain finite.');
          window.__qaTimeOverride.timeWrites++;
          window.__qaTimeOverride.lastRequestedTime = value;
          window.__qaTimeOverride.lastOverriddenTime = next;
          return uniform1f.call(this, location, next);
        }
        return uniform1f.call(this, location, value);
      };
      prototype.getUniformLocation = wrappedGetUniformLocation;
      prototype.uniform1f = wrappedUniform1f;
      if (prototype.getUniformLocation !== wrappedGetUniformLocation || prototype.uniform1f !== wrappedUniform1f) throw new Error('Browser blocked the QA uniform wrapper.');
      window.__qaTimeOverride.installed = true;
    } catch (error) {
      window.__qaTimeOverride.failure = error.message;
    }
  });

  await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout });
  await page.waitForFunction(() => window.__observatory?.getStats().frames > 0, null, { timeout, polling: 250 });
  const initial = await page.evaluate(() => ({ stats: window.__observatory.getStats(), override: window.__qaTimeOverride, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches }));
  assert(initial.override.installed, `Uniform hook was blocked: ${initial.override.failure || 'unknown reason'}`);
  assert(initial.override.locationLookups > 0 && initial.override.timeWrites > 0, 'Actual shader time uniform must be observed.');
  assert.equal(initial.stats.renderer, 'WebGL 2', 'This capture requires the real WebGL2 renderer.');
  assert.equal(initial.reducedMotion, true);
  assert.equal(initial.stats.paused, true);
  assert.equal(initial.stats.time, 0, 'Application simulation time must remain exactly 0.');
  assert.equal(initial.stats.quality, 1);
  assert.equal(initial.stats.width, 1280);
  assert.equal(initial.stats.height, 720);
  report.initial = initial;
  await page.locator('.immersive-button').click();
  await page.waitForFunction(() => window.__observatory.getStats().immersive && getComputedStyle(document.querySelector('.interface')).visibility === 'hidden', null, { timeout, polling: 250 });

  for (const shaderTime of sliceTimes) {
    const before = await page.evaluate(() => ({ frames: window.__observatory.getStats().frames, timeWrites: window.__qaTimeOverride.timeWrites }));
    await page.locator('#intensity').evaluate((input, next) => {
      window.__qaShaderTime = next;
      input.value = '1';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, shaderTime);
    await page.waitForFunction(({ frames, timeWrites, shaderTime }) => {
      const stats = window.__observatory.getStats();
      const audit = window.__qaTimeOverride;
      return stats.frames > frames && audit.timeWrites > timeWrites && audit.lastOverriddenTime === shaderTime;
    }, { ...before, shaderTime }, { timeout, polling: 250 });

    // readPixels waits for the submitted GPU work, so each screenshot follows
    // a completed real shader frame rather than an arbitrary timer delay.
    const sample = await page.evaluate(({ coreROI: roi, hotBandGuard }) => {
      const canvas = document.querySelector('#universe');
      const gl = canvas.getContext('webgl2');
      if (!gl || gl.isContextLost()) throw new Error('WebGL2 context became unavailable.');
      const priorErrors = [];
      for (let i = 0; i < 16; i++) {
        const error = gl.getError();
        if (error === gl.NO_ERROR) break;
        priorErrors.push(error);
      }
      const pixels = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let hash = 2166136261;
      let litPixels = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        hash = Math.imul(hash ^ pixels[i] ^ (pixels[i + 1] << 8) ^ (pixels[i + 2] << 16), 16777619);
        if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 45) litPixels++;
      }
      let coreTotal = 0, coreMax = 0, coreDark = 0, coreCount = 0, darkMaskHash = 2166136261;
      for (let screenY = roi.top; screenY < roi.bottom; screenY++) {
        const glY = canvas.height - 1 - screenY;
        for (let x = roi.left; x < roi.right; x++) {
          const index = (glY * canvas.width + x) * 4;
          const brightness = Math.max(pixels[index], pixels[index + 1], pixels[index + 2]);
          const dark = brightness < 32;
          coreTotal += brightness;
          coreMax = Math.max(coreMax, brightness);
          if (dark) coreDark++;
          coreCount++;
          darkMaskHash = Math.imul(darkMaskHash ^ Number(dark), 16777619);
        }
      }
      // readPixels has a bottom-left origin; these crops use top-left screen
      // coordinates. Each column records its longest consecutive bright run,
      // rather than adding together disconnected thin filaments.
      const hotROI = hotBandGuard.roi;
      const weights = hotBandGuard.sRGBWeights;
      const columnRuns = [];
      let saturatedPixels = 0;
      for (let x = hotROI.left; x < hotROI.right; x++) {
        let currentRun = 0, longestRun = 0;
        for (let screenY = hotROI.top; screenY < hotROI.bottom; screenY++) {
          const glY = canvas.height - 1 - screenY;
          const index = (glY * canvas.width + x) * 4;
          const brightness = (pixels[index]*weights[0]
                            +pixels[index + 1]*weights[1]
                            +pixels[index + 2]*weights[2])/255;
          if (brightness > hotBandGuard.brightnessThreshold) {
            saturatedPixels++;
            longestRun = Math.max(longestRun, ++currentRun);
          } else {
            currentRun = 0;
          }
        }
        columnRuns.push(longestRun);
      }
      columnRuns.sort((a, b) => a - b);
      const quantile = probability => {
        const index = (columnRuns.length - 1)*probability;
        const lower = Math.floor(index), upper = Math.ceil(index);
        return columnRuns[lower]+(columnRuns[upper]-columnRuns[lower])*(index-lower);
      };
      const hotPixels = (hotROI.right-hotROI.left)*(hotROI.bottom-hotROI.top);
      const finalError = gl.getError();
      if (finalError !== gl.NO_ERROR) priorErrors.push(finalError);
      return {
        hash: hash >>> 0, litPixels, totalPixels: canvas.width * canvas.height, glErrors: priorErrors,
        core: { mean: coreTotal / coreCount, max: coreMax, darkFraction: coreDark / coreCount, darkMaskHash: darkMaskHash >>> 0, pixels: coreCount },
        hotBand: { medianRunPixels: quantile(.5), p90RunPixels: quantile(.9), longestRunPixels: columnRuns.at(-1), saturatedFraction: saturatedPixels/hotPixels, saturatedPixels, pixels: hotPixels, columns: columnRuns.length },
        stats: window.__observatory.getStats(),
        override: { ...window.__qaTimeOverride },
      };
    }, { coreROI, hotBandGuard });
    assert.equal(sample.stats.renderer, 'WebGL 2');
    assert.equal(sample.stats.paused, true);
    assert.equal(sample.stats.time, 0);
    assert.equal(sample.stats.quality, 1);
    assert.equal(sample.stats.width, 1280);
    assert.equal(sample.stats.height, 720);
    assert.equal(sample.stats.intensity, 1);
    assert.equal(sample.stats.immersive, true);
    assert.equal(sample.override.lastRequestedTime, 0, 'Application must still submit its unmodified frozen clock.');
    assert.equal(sample.override.lastOverriddenTime, shaderTime);
    assert.deepEqual(sample.glErrors, [], 'No WebGL errors are permitted.');
    assert(sample.litPixels > 10000, 'Visible star and disc pixels must occupy a nonempty real framebuffer.');
    assert(sample.core.mean <= 10, `Core mean brightness is too high at ${shaderTime}s: ${sample.core.mean}.`);
    assert(sample.core.max <= 64, `Core has a bright hotspot at ${shaderTime}s: ${sample.core.max}.`);
    assert(sample.core.darkFraction >= 0.995, `Core ROI must remain dark at ${shaderTime}s.`);
    if (report.frames.length) assert.equal(sample.core.darkMaskHash, report.frames[0].core.darkMaskHash, 'The central dark ROI must stay fixed across time slices.');
    const screenshotPath = path.join(outputDirectory, `blackhole-cinematic-motion-${shaderTime}.png`);
    const png = await page.screenshot({ path: screenshotPath, timeout });
    report.frames.push({ shaderTime, screenshotPath, screenshotSHA256: createHash('sha256').update(png).digest('hex'), ...sample });
    console.log(JSON.stringify({ captured: shaderTime, screenshotPath, framebufferHash: sample.hash, core: sample.core, hotBand: sample.hotBand, frames: sample.stats.frames }));
    // Record the frame before rejecting it so the report and screenshot retain
    // evidence of the offending band for review.
    assert(sample.hotBand.medianRunPixels <= hotBandGuard.maxMedianRunPixels,
      `Wide saturated upper-band regression at ${shaderTime}s: median consecutive vertical run above weighted sRGB ${hotBandGuard.brightnessThreshold} is ${sample.hotBand.medianRunPixels}px (limit ${hotBandGuard.maxMedianRunPixels}px). This targeted guard does not replace complete visual review.`);
    assert.deepEqual(errors, [], 'Browser errors stop this capture.');
    assert.deepEqual(failedResources, [], 'Resource failures stop this capture.');
  }
  assert.equal(new Set(report.frames.map(frame => frame.hash)).size, sliceTimes.length, 'Every shader time must produce different real framebuffer pixels.');
  assert.equal(new Set(report.frames.map(frame => frame.screenshotSHA256)).size, sliceTimes.length, 'All exported screenshots must differ.');
  report.passed = true;
  report.checks = ['Real WebGL2 at fixed 1280×720, DPR 1, quality 1', 'Only the actual shader time uniform is overridden', 'Application clock stays paused at exactly 0 seconds', 'Real GPU framebuffer and exported image hashes differ at 0/0.8/3/8/30 seconds', 'Central core ROI stays dark across time slices', 'Median upper-hot saturated vertical run stays at or below 8 pixels (targeted regression guard only)', 'No browser, WebGL, or resource errors'];
} catch (error) {
  report.failure = error.stack || String(error);
  process.exitCode = 1;
  console.error(report.failure);
} finally {
  if (browser) await browser.close();
  await mkdir(outputDirectory, { recursive: true });
  const reportPath = path.join(outputDirectory, 'blackhole-cinematic-motion.json');
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, reportPath, capturedFrames: report.frames.length }));
}
