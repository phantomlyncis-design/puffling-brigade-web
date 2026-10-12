/* Native-scroll orchestration. All links and story content work without this module. */
const root = document.documentElement;
const journey = document.querySelector('#journey');
const status = document.querySelector('#scene-status');
const toggle = document.querySelector('#motion-toggle');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const chapterStarts = [0, .18, .38, .62, .82];
const chapterNames = ['การมาถึง', 'ประตูแห่งเวทมนตร์', 'หอแห่งผู้กล้า', 'พันธสัญญาแรก', 'การเดินทางของคุณ'];
const abort = new AbortController();
const options = { passive: true, signal: abort.signal };
const courtyardElement = document.querySelector('#courtyard');
const courtyardIds = ['world', 'characters', 'creator', 'collection'];
const courtyardStatus = document.querySelector('#courtyard-status');
let courtyardStarts = [];
let courtyardSpan = 1;
let courtyardBottom = Infinity;
let courtyardProgress = 0;
let renderedCourtyard = 0;
let courtyardChapter = 0;
let inCourtyard = false;
let courtyardLoading = false;
let courtyardReady = false;
let courtyardFailed = false;
let selectedHero = 'rachan';
let selectedShirt = 'cream';
const extensionFrame = { progress: 0, dt: 0 };
let world = null;
let scrollProgress = 0;
let sceneProgress = 0;
let chapter = -1;
let span = 1;
let top = 0;
let outside = false;
let paused = false;
let pausedCourtyardChapter = -1;
let frame = 0;
let lastTime = 0;
let elapsed = 0;
let disposed = false;
let failed = false;
let viewportWidth = innerWidth;
let viewportHeight = innerHeight;

function readScroll() {
  scrollProgress = Math.max(0, Math.min(1, (window.scrollY - top) / span));
  outside = window.scrollY > top + span + window.innerHeight * .48;
  root.classList.toggle('outside-journey', outside);
  let next = 0;
  for (let i = 1; i < chapterStarts.length; i++) if (scrollProgress >= chapterStarts[i] - .00001) next = i;
  if (next !== chapter) {
    chapter = next;
    root.dataset.chapter = String(chapter);
    document.querySelector('#chapter-number').textContent = String(chapter + 1).padStart(2, '0');
    document.querySelector('#chapter-name').textContent = chapterNames[chapter];
    document.querySelectorAll('[data-chapter-link]').forEach(link => {
      if (+link.dataset.chapterLink === chapter) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
  }
  root.style.setProperty('--journey-progress', String(scrollProgress));
  if (courtyardElement) {
    courtyardProgress = Math.max(0, Math.min(1, (window.scrollY - top - span) / courtyardSpan));
    inCourtyard = outside && window.scrollY < courtyardBottom - innerHeight * .85;
    root.classList.toggle('in-courtyard', inCourtyard);
    courtyardChapter = 0;
    courtyardStarts.forEach((start, index) => { if (window.scrollY >= start - 2) courtyardChapter = index; });
    root.dataset.courtyard = String(courtyardChapter);
    document.querySelectorAll('#courtyard-nav a').forEach((link, index) => {
      if (index === courtyardChapter) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
    if (scrollProgress > .52) prepareCourtyard();
  }
  requestFrame();
}

async function prepareCourtyard() {
  if (!world || !courtyardElement || courtyardReady || courtyardLoading || courtyardFailed) return;
  courtyardLoading = true;
  root.classList.add('courtyard-loading');
  if (courtyardStatus) courtyardStatus.textContent = 'กำลังเปิดลานปุยนุ่น…';
  try {
    await world.loadCourtyard();
    if (disposed || failed) return;
    courtyardReady = true;
    world.selectHero(selectedHero);
    world.selectShirt(selectedShirt);
    root.classList.add('courtyard-model-ready');
    root.classList.remove('courtyard-fallback');
    if (courtyardStatus) courtyardStatus.textContent = '';
  } catch (error) {
    courtyardFailed = true;
    root.classList.add('courtyard-fallback');
    if (courtyardStatus) courtyardStatus.textContent = 'ชมลานปุยนุ่นและแบบเสื้อผ่านภาพตัวอย่าง';
  } finally {
    courtyardLoading = false;
    root.classList.remove('courtyard-loading');
    requestFrame();
  }
}

function measure() {
  top = journey.getBoundingClientRect().top + window.scrollY;
  span = Math.max(1, journey.offsetHeight - window.innerHeight);
  if (courtyardElement) {
    courtyardStarts = courtyardIds.map(id => document.getElementById(id).getBoundingClientRect().top + scrollY);
    courtyardBottom = courtyardElement.getBoundingClientRect().top + scrollY + courtyardElement.offsetHeight;
    courtyardSpan = Math.max(1, courtyardBottom - innerHeight - top - span);
  }
  world?.resize();
  readScroll();
}

function resizeExperience() {
  if (viewportWidth === innerWidth && viewportHeight === innerHeight) return;
  const mainPosition = scrollProgress, courtPosition = courtyardProgress;
  const wasCourt = inCourtyard, wasJourney = !outside;
  viewportWidth = innerWidth; viewportHeight = innerHeight;
  measure();
  // Keep the same place in the story when the visitor rotates their device.
  if (wasCourt || wasJourney) {
    window.scrollTo({ top: wasCourt ? top + span + courtPosition * courtyardSpan : top + mainPosition * span, behavior: 'instant' });
    readScroll();
  }
}

function requestFrame() {
  if (!frame && world && !document.hidden && !disposed) frame = requestAnimationFrame(draw);
}

function draw(now) {
  frame = 0;
  const dt = Math.min(.05, (now - (lastTime || now)) / 1000);
  lastTime = now;
  const still = reduced.matches || paused;
  // Reduced-motion holds the arrival view; pause freezes the visitor's current view.
  if (!still) {
    sceneProgress += (scrollProgress - sceneProgress) * (1 - Math.exp(-12 * dt));
    if (Math.abs(scrollProgress - sceneProgress) < .0001) sceneProgress = scrollProgress;
    elapsed += dt;
    renderedCourtyard += (courtyardProgress - renderedCourtyard) * (1 - Math.exp(-12 * dt));
    if (Math.abs(renderedCourtyard - courtyardProgress) < .0001) renderedCourtyard = courtyardProgress;
  }
  const staticCourtyard = inCourtyard ? Math.min(1, ((courtyardStarts[courtyardChapter] || top + span) - top - span) / courtyardSpan + .02) : 0;
  if (reduced.matches) renderedCourtyard = staticCourtyard;
  else if (paused) {
    if (!inCourtyard) { renderedCourtyard = 0; pausedCourtyardChapter = -1; }
    else if (pausedCourtyardChapter !== courtyardChapter) {
      renderedCourtyard = staticCourtyard;
      pausedCourtyardChapter = courtyardChapter;
    }
  }
  extensionFrame.progress = renderedCourtyard;
  extensionFrame.dt = dt;
  world.update(reduced.matches ? 0 : sceneProgress, reduced.matches ? 0 : elapsed, still, extensionFrame);
  if (!still && (!outside || inCourtyard)) requestFrame();
}

function updateMotion() {
  root.classList.toggle('reduced-motion', reduced.matches || paused);
  toggle.setAttribute('aria-pressed', String(paused));
  toggle.querySelector('span').textContent = paused ? 'เริ่มการเคลื่อนไหว' : 'หยุดการเคลื่อนไหว';
  toggle.disabled = reduced.matches;
  if (reduced.matches) toggle.querySelector('span').textContent = 'โหมดลดการเคลื่อนไหว';
  lastTime = 0;
  requestFrame();
}

function fallback(reason) {
  failed = true;
  root.classList.remove('scene-ready');
  root.classList.add('scene-fallback');
  root.classList.add('courtyard-fallback');
  root.classList.remove('courtyard-loading');
  if (courtyardStatus) courtyardStatus.textContent = 'ชมลานปุยนุ่นและแบบเสื้อผ่านภาพตัวอย่าง';
  status.textContent = 'วิหารแห่งพันธสัญญาแรก';
  status.dataset.state = 'fallback';
  toggle.hidden = true;
  world?.dispose();
  world = null;
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  // Diagnostic text contains no user or authentication data.
  root.dataset.sceneError = reason instanceof Error ? reason.message : String(reason);
}

root.classList.add('experience-ready');
if (courtyardElement) root.classList.add('courtyard-ready', 'courtyard-loading');
root.dataset.hero = 'rachan';
root.dataset.shirt = 'cream';
root.dataset.chapter = '0';
window.addEventListener('scroll', readScroll, options);
window.addEventListener('resize', resizeExperience, options);
window.visualViewport?.addEventListener('resize', resizeExperience, options);
toggle.addEventListener('click', () => {
  paused = !paused;
  pausedCourtyardChapter = inCourtyard ? courtyardChapter : -1;
  updateMotion();
}, { signal: abort.signal });
reduced.addEventListener('change', updateMotion, { signal: abort.signal });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
  else { lastTime = 0; requestFrame(); }
}, { signal: abort.signal });

// Explicit anchors use the same timeline as the camera, including direct URL hashes.
const chapterIds = ['home', 'gateway', 'legends', 'pact', 'beyond'];
[...chapterIds, ...courtyardIds].forEach(id => { const section = document.getElementById(id); if (section) section.tabIndex = -1; });
function navigateChapter(id, smooth = true) {
  const index = chapterIds.indexOf(id);
  const courtIndex = courtyardIds.indexOf(id);
  if (index < 0 && (courtIndex < 0 || !courtyardElement)) return false;
  const destination = index >= 0 ? top + span * chapterStarts[index] + (index ? 1 : 0) : courtyardStarts[courtIndex] + 1;
  window.scrollTo({ top: destination, behavior: smooth && !reduced.matches ? 'smooth' : 'instant' });
  return true;
}
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  const id = link.getAttribute('href').slice(1);
  if (navigateChapter(id)) {
    event.preventDefault();
    history.pushState(null, '', '#' + id);
    document.getElementById(id)?.focus({ preventScroll: true });
  }
}, { signal: abort.signal });
window.addEventListener('hashchange', () => navigateChapter(location.hash.slice(1), false), { signal: abort.signal });

measure();
updateMotion();
// Browser scroll restoration and initial deep links must happen after layout enhancement.
if ([...chapterIds, ...courtyardIds].includes(location.hash.slice(1))) navigateChapter(location.hash.slice(1), false);

try {
  const { createSanctuary } = await import('./sanctuary-scene.js');
  world = await createSanctuary(document.querySelector('#sanctuary-canvas'), fallback);
  if (disposed || failed) { world.dispose(); world = null; }
  else {
    sceneProgress = scrollProgress;
    renderedCourtyard = courtyardProgress;
    world.update(reduced.matches ? 0 : sceneProgress, 0, reduced.matches, chapter);
    root.classList.add('scene-ready');
    status.textContent = '';
    status.dataset.state = 'ready';
    measure();
    requestFrame();
  }
} catch (error) { fallback(error); }

// Read-only inspection hook: measured renderer output, useful for local acceptance tests.
window.pufflingSanctuary = {
  getState: () => ({ ready: !!world, fallback: failed, progress: scrollProgress, renderedProgress: sceneProgress, chapter, reducedMotion: reduced.matches, paused, courtyardProgress, renderedCourtyard, courtyardChapter, courtyardLoading, courtyardFailed, inCourtyard, ...world?.stats() })
};

// Gallery controls are normal HTML; explicit interactions also work with motion paused.
const heroCopy = {
  rachan: ['ราชันขนฟู', 'ธาตุแดง · ระเบิดวง'],
  wayu: ['วายุเขียว', 'ธาตุเขียว · ระยะไกล'],
  niran: ['นิรันดร์น้ำเงิน', 'ธาตุน้ำเงิน · กันแนว']
};
function setText(id, value) { const element = document.getElementById(id); if (element) element.textContent = value; }
document.querySelectorAll('button[data-hero]').forEach(button => button.addEventListener('click', () => {
  selectedHero = button.dataset.hero;
  document.querySelectorAll('button[data-hero]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  const copy = heroCopy[selectedHero];
  if (copy) { setText('hero-name', copy[0]); setText('hero-role', copy[1]); }
  root.dataset.hero = selectedHero;
  world?.selectHero(selectedHero);
  requestFrame();
}, { signal: abort.signal }));
document.querySelectorAll('button[data-shirt]').forEach(button => button.addEventListener('click', () => {
  selectedShirt = button.dataset.shirt;
  document.querySelectorAll('button[data-shirt]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  setText('shirt-name', selectedShirt === 'cream' ? 'Little King Tee' : 'Wanderer Tee');
  setText('shirt-description', selectedShirt === 'cream' ? 'สีครีมอุ่น กับราชันขนฟูเพื่อนตัวจิ๋ว' : 'สีป่า กับวายุเขียวเพื่อนนักเดินทาง');
  root.dataset.shirt = selectedShirt;
  world?.selectShirt(selectedShirt);
  requestFrame();
}, { signal: abort.signal }));
function updateShirtView(side) {
  document.querySelectorAll('[data-shirt-view]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.shirtView === side)));
}
document.querySelectorAll('[data-shirt-view]').forEach(button => button.addEventListener('click', () => {
  world?.viewShirt(button.dataset.shirtView, reduced.matches || paused);
  updateShirtView(button.dataset.shirtView);
  requestFrame();
}, { signal: abort.signal }));
const shirtInteraction = document.getElementById('shirt-interaction');
let gesture = null;
shirtInteraction?.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, previous: event.clientX, horizontal: false };
}, { signal: abort.signal });
shirtInteraction?.addEventListener('pointermove', event => {
  if (!gesture || gesture.id !== event.pointerId) return;
  if (!gesture.horizontal) {
    const dx = Math.abs(event.clientX - gesture.x), dy = Math.abs(event.clientY - gesture.y);
    if (dx > 7 && dx > dy * 1.2) { gesture.horizontal = true; shirtInteraction.setPointerCapture(event.pointerId); }
    else return;
  }
  world?.rotateShirt((event.clientX - gesture.previous) * .011, true);
  gesture.previous = event.clientX;
  updateShirtView(null);
  requestFrame();
}, { signal: abort.signal });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => shirtInteraction?.addEventListener(name, () => { gesture = null; }, { signal: abort.signal }));
shirtInteraction?.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  if (event.key === 'Home' || event.key === 'End') {
    const side = event.key === 'Home' ? 'front' : 'back';
    world?.viewShirt(side, true);
    updateShirtView(side);
  } else {
    world?.rotateShirt((event.key === 'ArrowLeft' ? -1 : 1) * Math.PI / 12, true);
    updateShirtView(null);
  }
  requestFrame();
}, { signal: abort.signal });

window.addEventListener('pagehide', event => {
  if (event.persisted) { cancelAnimationFrame(frame); frame = 0; return; }
  disposed = true;
  abort.abort();
  cancelAnimationFrame(frame);
  world?.dispose();
});
window.addEventListener('pageshow', event => { if (event.persisted) { lastTime = 0; measure(); requestFrame(); } });
