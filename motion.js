// Scroll and pointer effects. They only decorate: without them, or for visitors who ask for reduced motion,
// every section still shows in full and the story shows its last step.
import { countUpValue, numberParts, revealProgress, stickyProgress, storyStep, wordOpacity } from './motion-math.js';

const STORY_STEPS = 4;
const COUNT_DURATION_MS = 2200;
const MAX_TILT_DEG = 4;
const STORY_ENTER = 0.6;

/** @param {(entry: IntersectionObserverEntry) => void} onEnter */
function whenVisible(elements, onEnter, threshold = 0.15) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      onEnter(entry);
      observer.unobserve(entry.target);
    }
  }, { threshold, rootMargin: '0px 0px -8% 0px' });
  for (const element of elements) observer.observe(element);
}

/** @param {Element} element */
function countUp(element) {
  const parts = numberParts(element.textContent ?? '');
  if (!parts) return;
  const started = performance.now();
  const frame = (/** @type {number} */ now) => {
    const t = Math.min(1, (now - started) / COUNT_DURATION_MS);
    element.textContent = `${parts.prefix}${countUpValue(parts, t)}${parts.suffix}`;
    if (t < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/**
 * Wraps each word in a span, and returns an update that lights the words as the line scrolls past.
 * @param {HTMLElement} element
 */
function litWords(element) {
  const words = (element.textContent ?? '').trim().split(/\s+/);
  element.textContent = '';
  const spans = words.map((word, index) => {
    const span = document.createElement('span');
    span.className = 'word';
    span.textContent = word;
    element.append(span, index < words.length - 1 ? ' ' : '');
    return span;
  });
  return () => {
    const rect = element.getBoundingClientRect();
    const progress = revealProgress(rect.top, rect.height, window.innerHeight);
    spans.forEach((span, index) => { span.style.opacity = wordOpacity(index, spans.length, progress).toFixed(3); });
  };
}

/**
 * Pins the story and returns an update that picks the step for the scroll position.
 * @param {HTMLElement} story
 */
function pinnedStory(story) {
  story.classList.add('story-pinned');
  const steps = [...story.querySelectorAll('.story-step')];
  return () => {
    const rect = story.getBoundingClientRect();
    const progress = stickyProgress(rect.top, rect.height, window.innerHeight);
    const step = String(storyStep(progress, STORY_STEPS));
    story.style.setProperty('--progress', progress.toFixed(3));
    if (rect.top < window.innerHeight * STORY_ENTER) story.classList.add('is-in');
    if (story.dataset.step === step) return;
    story.dataset.step = step;
    steps.forEach((item, index) => item.classList.toggle('is-active', String(index) === step));
  };
}

/** Runs the updates at most once per frame while the page scrolls or resizes. */
function onScrollFrames(/** @type {Array<() => void>} */ updates) {
  let queued = false;
  const run = () => {
    queued = false;
    for (const update of updates) update();
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(run);
  };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  run();
}

/** The hero card turns towards the mouse, and the spotlight follows it. */
function tiltWithPointer(/** @type {HTMLElement} */ hero) {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  /** @type {PointerEvent | null} */
  let latest = null;
  const apply = () => {
    if (!latest) return;
    const rect = hero.getBoundingClientRect();
    const x = (latest.clientX - rect.left) / rect.width;
    const y = (latest.clientY - rect.top) / rect.height;
    hero.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
    hero.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    hero.style.setProperty('--ry', `${((x - 0.5) * 2 * MAX_TILT_DEG).toFixed(2)}deg`);
    hero.style.setProperty('--rx', `${((0.5 - y) * MAX_TILT_DEG).toFixed(2)}deg`);
    latest = null;
  };
  hero.addEventListener('pointermove', (event) => {
    if (!latest) requestAnimationFrame(apply);
    latest = event;
  });
  hero.addEventListener('pointerleave', () => {
    hero.style.setProperty('--rx', '0deg');
    hero.style.setProperty('--ry', '0deg');
  });
}

export function startMotion() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('motion');
  whenVisible(document.querySelectorAll('[data-reveal]'), (entry) => entry.target.classList.add('is-visible'));
  whenVisible(document.querySelectorAll('[data-count]'), (entry) => countUp(entry.target), 0.6);

  const updates = [...document.querySelectorAll('[data-words]')].filter((element) => element instanceof HTMLElement).map(litWords);
  const story = document.querySelector('.story');
  if (story instanceof HTMLElement) updates.push(pinnedStory(story));
  onScrollFrames(updates);

  const hero = document.querySelector('.hero');
  if (hero instanceof HTMLElement) tiltWithPointer(hero);
}
