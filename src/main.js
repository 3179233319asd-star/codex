import './style.css';
import './chinese-fonts.css';
import './icons.css';
import { createSpace } from './space.js';
import { profile, project, note } from './content.js';

const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const paragraphs = values => values.map(value => `<p>${escapeHTML(value)}</p>`).join('');
const views = [['work', '作品'], ['notes', '随记'], ['about', '关于']];
document.title = `${profile.name}的小站`;
document.querySelector('meta[name="description"]').content = profile.intro;

document.querySelector('#app').innerHTML = `
  <main class="observatory" id="home" aria-labelledby="scene-title">
    <canvas id="universe" aria-label="实时绘制的黑洞，银白吸积盘缓缓旋转，远处星光闪烁" role="img"></canvas>
    <div class="scene-shade" aria-hidden="true"></div>
    <div class="interface">
      <header class="masthead">
        <a class="brand" href="#home">${escapeHTML(profile.name)}的小站</a>
        <nav class="primary-nav" aria-label="个人内容">${views.map(([id, label]) => `<button class="nav-trigger" data-view="${id}" aria-haspopup="dialog" aria-controls="personal-panel" aria-expanded="false">${label}</button>`).join('')}</nav>
      </header>
      <div class="caption"><h1 id="scene-title">${escapeHTML(profile.title)}</h1><p>${escapeHTML(profile.intro)}</p></div>
      <div class="actions" role="group" aria-label="星空控制">
        <button class="control-button pause-button" aria-label="暂停星空动画" aria-pressed="false"><i class="ph-light ph-pause pause-icon" aria-hidden="true"></i><span class="pause-label">暂停</span></button>
        <span class="control-divider" aria-hidden="true"></span>
        <button class="control-button settings-trigger" aria-label="星空设置" aria-controls="settings-panel" aria-expanded="false"><i class="ph-light ph-sliders-horizontal" aria-hidden="true"></i><span>设置</span></button>
        <span class="control-divider" aria-hidden="true"></span>
        <button class="control-button immersive-button" aria-label="进入沉浸模式" title="只看星空 (H)"><i class="ph-light ph-corners-out" aria-hidden="true"></i><span>只看星空</span></button>
      </div>
    </div>
    <section class="settings-panel" id="settings-panel" aria-label="星空设置" hidden>
      <div class="panel-heading"><h2>星空设置</h2><button class="close-settings icon-button" aria-label="关闭星空设置"><i class="ph-light ph-x" aria-hidden="true"></i></button></div>
      <label class="range-label" for="speed">时间流速 <output id="speed-value" for="speed">1.0×</output></label><input id="speed" type="range" min="0.2" max="2" step="0.1" value="1" />
      <label class="range-label" for="intensity">光芒强度 <output id="intensity-value" for="intensity">100%</output></label><input id="intensity" type="range" min="0.5" max="1.5" step="0.05" value="1" />
      <p class="settings-note">按 H 只看星空，空格暂停，Esc 返回。</p><button class="reset-button">恢复默认</button>
    </section>
    <button class="exit-immersive" aria-label="退出沉浸模式" hidden>返回页面 <span>ESC</span></button>
  </main>

  <dialog class="reading-panel personal-panel" id="personal-panel" aria-labelledby="personal-title">
    <div class="panel-heading"><h2 id="personal-title">${escapeHTML(profile.name)}的小站</h2><button class="close-personal icon-button" aria-label="关闭个人内容"><i class="ph-light ph-x" aria-hidden="true"></i></button></div>
    <div class="panel-tabs" role="tablist" aria-label="阅读内容">${views.map(([id, label], index) => `<button class="panel-tab" id="tab-${id}" data-view="${id}" role="tab" aria-controls="${id}" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}">${label}</button>`).join('')}</div>
    <div id="personal-content">
      <section id="work" class="tab-content" role="tabpanel" aria-labelledby="tab-work" tabindex="0">
        <h3><button class="project-trigger" aria-haspopup="dialog" aria-controls="project-panel" aria-expanded="false">${escapeHTML(project.title)}<i class="ph-light ph-arrow-up-right" aria-hidden="true"></i></button></h3>
        <p class="entry-meta">${escapeHTML(project.year)} · ${escapeHTML(project.category)}</p><p>${escapeHTML(project.intro)}</p>
        <div class="project-links"><button class="soft-button project-details-trigger" aria-haspopup="dialog" aria-controls="project-panel">制作记录</button><button class="soft-button view-scene">进入星空<i class="ph-light ph-arrow-up-right" aria-hidden="true"></i></button></div>
      </section>
      <section id="notes" class="tab-content" role="tabpanel" aria-labelledby="tab-notes" tabindex="0" hidden>
        <button class="note-trigger" aria-expanded="false" aria-controls="note-body"><span>${escapeHTML(note.title)}</span><i class="ph-light ph-plus note-icon" aria-hidden="true"></i></button>
        <p class="entry-meta">${escapeHTML(note.date)} · ${escapeHTML(note.category)}</p>
        <div id="note-body" hidden>${paragraphs(note.paragraphs)}<button class="soft-button close-note">收起</button></div>
      </section>
      <section id="about" class="tab-content" role="tabpanel" aria-labelledby="tab-about" tabindex="0" hidden>
        <h3>关于这里</h3>${paragraphs(profile.about)}<a class="soft-button github-link" href="${escapeHTML(profile.github)}" target="_blank" rel="noopener noreferrer">GitHub<i class="ph-light ph-arrow-up-right" aria-hidden="true"></i><span class="sr-only">（在新标签页打开）</span></a>
      </section>
    </div>
  </dialog>
  <dialog class="reading-panel project-panel" id="project-panel" aria-labelledby="project-title">
    <div class="panel-heading"><h2>制作记录</h2><button class="close-project icon-button" aria-label="关闭制作记录"><i class="ph-light ph-x" aria-hidden="true"></i></button></div>
    <h3 id="project-title">${escapeHTML(project.title)}</h3><p class="entry-meta">${escapeHTML(project.year)} · ${escapeHTML(project.category)}</p><div class="dialog-prose">${paragraphs(project.paragraphs)}</div><button class="soft-button project-view-button">进入星空<i class="ph-light ph-arrow-up-right" aria-hidden="true"></i></button>
  </dialog>
  <span class="sr-only" id="announcement" aria-live="polite"></span>`;

const scene = document.querySelector('.observatory');
const space = createSpace(document.querySelector('#universe'));
const personalPanel = document.querySelector('#personal-panel');
const projectPanel = document.querySelector('#project-panel');
const settings = document.querySelector('#settings-panel');
const settingsTrigger = document.querySelector('.settings-trigger');
const pauseButton = document.querySelector('.pause-button');
const exitImmersive = document.querySelector('.exit-immersive');
const noteTrigger = document.querySelector('.note-trigger');
let paused = false;
let immersive = false;
let currentView = 'work';
let lastNavTrigger;
let projectTrigger;
let returnToPersonal = false;

function announce(message) { document.querySelector('#announcement').textContent = message; }
function syncAnimation() { space.setPaused(paused || personalPanel.open || projectPanel.open); }
function updateNavigation() {
  document.querySelectorAll('.nav-trigger').forEach(button => button.setAttribute('aria-expanded', String(personalPanel.open && button.dataset.view === currentView)));
}
function selectView(view, focusTab = false) {
  currentView = view;
  document.querySelectorAll('.panel-tab').forEach(tab => {
    const selected = tab.dataset.view === view;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.querySelector(`#${tab.dataset.view}`).hidden = !selected;
    if (selected && focusTab) tab.focus();
  });
  updateNavigation();
}
function openPersonal(view, focusTab = true) {
  setSettings(false);
  personalPanel.returnValue = '';
  if (!personalPanel.open) personalPanel.showModal();
  selectView(view, focusTab);
  syncAnimation();
}
function setPause(next) {
  paused = next; syncAnimation();
  pauseButton.setAttribute('aria-pressed', String(paused));
  pauseButton.setAttribute('aria-label', paused ? '继续星空动画' : '暂停星空动画');
  pauseButton.querySelector('.pause-label').textContent = paused ? '继续' : '暂停';
  pauseButton.querySelector('.pause-icon').classList.toggle('ph-pause', !paused);
  pauseButton.querySelector('.pause-icon').classList.toggle('ph-play', paused);
  announce(paused ? '星空动画已暂停' : '星空动画已继续');
}
function setSettings(open, restoreFocus = false) {
  settings.hidden = !open; settingsTrigger.setAttribute('aria-expanded', String(open));
  if (open) settings.querySelector('input').focus({ preventScroll: true });
  else if (restoreFocus) settingsTrigger.focus({ preventScroll: true });
}
function setImmersive(next) {
  immersive = next;
  if (next) {
    returnToPersonal = false;
    if (personalPanel.open) personalPanel.close('immersive');
    if (projectPanel.open) projectPanel.close('immersive');
  }
  scene.classList.toggle('is-immersive', next);
  document.querySelector('.interface').inert = next;
  document.querySelector('#personal-content').inert = next;
  exitImmersive.hidden = !next;
  setSettings(false); syncAnimation();
  requestAnimationFrame(() => {
    if (immersive === next) (next ? exitImmersive : document.querySelector('.immersive-button')).focus({ preventScroll: true });
  });
  announce(next ? '已进入沉浸模式，按 Esc 返回' : '已退出沉浸模式');
}
function openProject(event) {
  projectTrigger = event.currentTarget;
  returnToPersonal = personalPanel.open;
  personalPanel.close('project');
  projectPanel.showModal();
  document.querySelector('.project-trigger').setAttribute('aria-expanded', 'true');
  syncAnimation();
}
function setNote(open, restoreFocus = false) {
  document.querySelector('#note-body').hidden = !open;
  noteTrigger.setAttribute('aria-expanded', String(open));
  noteTrigger.querySelector('.note-icon').classList.toggle('ph-plus', !open);
  noteTrigger.querySelector('.note-icon').classList.toggle('ph-x', open);
  if (restoreFocus) noteTrigger.focus({ preventScroll: true });
}

document.querySelectorAll('.nav-trigger').forEach(button => button.addEventListener('click', () => { lastNavTrigger = button; openPersonal(button.dataset.view); }));
document.querySelectorAll('.panel-tab').forEach(tab => {
  tab.addEventListener('click', () => selectView(tab.dataset.view));
  tab.addEventListener('keydown', event => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const index = views.findIndex(([id]) => id === tab.dataset.view);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? views.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + views.length) % views.length;
    selectView(views[next][0], true);
  });
});
document.querySelector('.close-personal').addEventListener('click', () => personalPanel.close());
personalPanel.addEventListener('close', () => {
  updateNavigation(); syncAnimation();
  if (!projectPanel.open && !immersive) lastNavTrigger?.focus({ preventScroll: true });
});
document.querySelectorAll('.project-trigger, .project-details-trigger').forEach(button => button.addEventListener('click', openProject));
document.querySelector('.close-project').addEventListener('click', () => projectPanel.close());
projectPanel.addEventListener('close', () => {
  document.querySelector('.project-trigger').setAttribute('aria-expanded', 'false');
  if (returnToPersonal && !immersive) { openPersonal('work', false); projectTrigger?.focus({ preventScroll: true }); }
  syncAnimation();
});
for (const dialog of [personalPanel, projectPanel]) dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
document.querySelectorAll('.view-scene, .project-view-button').forEach(button => button.addEventListener('click', () => setImmersive(true)));
noteTrigger.addEventListener('click', () => setNote(noteTrigger.getAttribute('aria-expanded') !== 'true'));
document.querySelector('.close-note').addEventListener('click', () => setNote(false, true));
pauseButton.addEventListener('click', () => setPause(!paused));
settingsTrigger.addEventListener('click', () => setSettings(settings.hidden));
document.querySelector('.close-settings').addEventListener('click', () => setSettings(false, true));
document.querySelector('.immersive-button').addEventListener('click', () => setImmersive(true));
exitImmersive.addEventListener('click', () => setImmersive(false));
document.querySelector('#speed').addEventListener('input', event => { space.setSpeed(Number(event.target.value)); document.querySelector('#speed-value').textContent = `${Number(event.target.value).toFixed(1)}×`; });
document.querySelector('#intensity').addEventListener('input', event => { space.setIntensity(Number(event.target.value)); document.querySelector('#intensity-value').textContent = `${Math.round(Number(event.target.value) * 100)}%`; });
document.querySelector('.reset-button').addEventListener('click', () => {
  for (const id of ['speed', 'intensity']) { const input = document.querySelector(`#${id}`); input.value = '1'; input.dispatchEvent(new Event('input')); }
  if (paused) setPause(false);
  announce('星空设置已恢复默认');
});
window.addEventListener('pointermove', event => { if (!personalPanel.open && !projectPanel.open) space.setPointer((event.clientX / innerWidth - .5) * 2, (event.clientY / innerHeight - .5) * 2); });
document.addEventListener('pointerleave', () => space.setPointer(0, 0));
document.addEventListener('pointerdown', event => { if (!settings.hidden && !settings.contains(event.target) && !settingsTrigger.contains(event.target)) setSettings(false); });
window.addEventListener('keydown', event => {
  if (personalPanel.open || projectPanel.open || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && event.key !== 'Escape') return;
  if (event.key === 'Escape') { if (immersive) setImmersive(false); else if (!settings.hidden) setSettings(false, true); }
  if (event.key.toLowerCase() === 'h' && !event.ctrlKey && !event.metaKey && !event.altKey) setImmersive(!immersive);
  if (event.code === 'Space' && !['BUTTON', 'A'].includes(document.activeElement.tagName)) { event.preventDefault(); setPause(!paused); }
});
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
if (motionQuery.matches) setPause(true);
motionQuery.addEventListener('change', event => setPause(event.matches));
window.__observatory = { getStats: () => ({ ...space.getStats(), immersive, heroVisible: true, userPaused: paused, settingsOpen: !settings.hidden, personalOpen: personalPanel.open, currentView }) };
