import assert from 'node:assert/strict';
import { chromium } from '/opt/codex/cua_node/lib/node_modules/playwright/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const timeout = 120000;
const evidenceDirectory = fileURLToPath(new URL('../test-results/', import.meta.url));
await mkdir(evidenceDirectory, { recursive:true });
const browser = await chromium.launch({ executablePath:'/usr/bin/chromium', headless:true, args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--host-resolver-rules=MAP terminal.local 127.0.0.1','--no-proxy-server'] });
const errors = [];
const result = { passed:false, errors };
try {
  const page = await browser.newPage({ viewport:{width:1280,height:720}, deviceScaleFactor:1 });
  page.setDefaultTimeout(timeout);
  page.setDefaultNavigationTimeout(timeout);
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if(m.type()==='error') errors.push(m.text()); });
  await page.goto('http://terminal.local:4173/',{ waitUntil:'domcontentloaded', timeout });
  await page.waitForFunction(()=>window.__observatory?.getStats().frames>0,null,{ timeout });
  const sample = () => page.evaluate(() => {
    const canvas=document.querySelector('#universe');
    const gl=canvas.getContext('webgl2');
    const pixels=new Uint8Array(128*128*4);
    gl.readPixels(Math.floor(canvas.width/2-64),Math.floor(canvas.height*.58),128,128,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    let hash=2166136261, lit=0;
    for(let i=0;i<pixels.length;i+=4){hash=Math.imul(hash^pixels[i]^(pixels[i+1]<<8)^(pixels[i+2]<<16),16777619);if(pixels[i]+pixels[i+1]+pixels[i+2]>40)lit++;}
    return {hash,lit,error:gl.getError(),...window.__observatory.getStats()};
  });
  const first=await sample();
  assert.equal(first.renderer,'WebGL 2');
  assert.equal(first.error,0);
  assert(first.lit>100);
  await page.waitForFunction(frames=>window.__observatory.getStats().frames>frames,first.frames,{timeout,polling:250});
  const second=await sample();
  assert.notEqual(first.hash,second.hash);
  assert(second.time>first.time);
  assert.equal(second.error,0);
  await page.locator('.pause-button').click();
  const stopped=await sample();
  assert.equal(stopped.paused,true);
  assert.equal(stopped.userPaused,true);
  assert.equal(stopped.error,0);
  await page.waitForTimeout(350);
  const stillPaused=await sample();
  assert.equal(stillPaused.time,stopped.time);
  assert.equal(stillPaused.hash,stopped.hash);

  // Exercise the range controls and their input handlers, not the render API.
  // Keep time frozen so the framebuffer comparison isolates light intensity.
  await page.locator('.settings-trigger').click();
  const setRange = (selector, value) => page.locator(selector).evaluate((input, next) => {
    input.value=String(next);
    input.dispatchEvent(new Event('input',{bubbles:true}));
  }, value);
  await setRange('#speed',1.4);
  assert.equal(await page.evaluate(()=>window.__observatory.getStats().speed),1.4);
  assert.equal(await page.locator('#speed-value').textContent(),'1.4×');
  await setRange('#intensity',.7);
  const dimmed=await sample();
  assert.equal(dimmed.intensity,.7);
  assert.equal(dimmed.time,stopped.time);
  assert.equal(dimmed.error,0);
  assert.notEqual(dimmed.hash,stopped.hash);
  assert.equal(await page.locator('#intensity-value').textContent(),'70%');
  await setRange('#intensity',1);
  const restoredLight=await sample();
  Object.assign(result,{first,second,stopped,dimmed,restoredLight});
  assert.equal(restoredLight.hash,stopped.hash);
  assert.equal(restoredLight.error,0);
  await page.locator('.reset-button').click();
  const defaults=await page.evaluate(()=>window.__observatory.getStats());
  assert.equal(defaults.speed,1);
  assert.equal(defaults.intensity,1);
  assert.equal(defaults.userPaused,false);
  assert.equal(await page.locator('#speed').inputValue(),'1');
  assert.equal(await page.locator('#intensity').inputValue(),'1');
  assert.equal(await page.locator('#speed-value').textContent(),'1.0×');
  assert.equal(await page.locator('#intensity-value').textContent(),'100%');
  await page.locator('.close-settings').click();
  await page.locator('.pause-button').click();
  assert.equal(await page.evaluate(()=>window.__observatory.getStats().paused),true);
  await page.screenshot({path:`${evidenceDirectory}blackhole-live-desktop.png`, timeout});
  await page.locator('.immersive-button').click();
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.interface')).visibility==='hidden',null,{timeout});
  await page.screenshot({path:`${evidenceDirectory}blackhole-live-immersive.png`, timeout});
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!window.__observatory.getStats().immersive,null,{timeout});
  const beforeResize=await page.evaluate(()=>window.__observatory.getStats().frames);
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(frames=>{
    const stats=window.__observatory.getStats();
    const bounds=document.querySelector('#universe').getBoundingClientRect();
    return stats.frames>frames && bounds.width===390 && bounds.height===844;
  },beforeResize,{timeout,polling:250});
  const mobile=await sample();
  assert.equal(mobile.renderer,'WebGL 2');
  assert.equal(mobile.error,0);
  assert.equal(mobile.paused,true);
  const dimensions=await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight}));
  assert.deepEqual(dimensions,{width:390,height:844});
  await page.screenshot({path:`${evidenceDirectory}blackhole-live-mobile.png`, timeout});
  assert.deepEqual(errors,[]);
  Object.assign(result,{passed:true,first,second,stopped,dimmed,restoredLight,defaults,mobile,dimensions,checks:['Latest shader compiles and draws visible WebGL pixels','Rendered gas changes with time','Latest shader reports no WebGL errors','Pause freezes time and pixels','UI speed and intensity controls update renderer and labels','Intensity changes pixels and restoring light restores the same frame','Reset restores default speed and intensity and resumes animation','Mobile homepage occupies exactly one screen','Desktop, immersive and mobile evidence captured']});
} catch (error) {
  result.failure=error.stack || String(error);
  throw error;
} finally {
  await writeFile(`${evidenceDirectory}render-report.json`,JSON.stringify(result,null,2));
  await browser.close();
}
console.log(JSON.stringify(result,null,2));
