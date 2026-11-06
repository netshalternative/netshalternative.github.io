// The numbers behind the scroll effects, kept apart from the page so they can be tested on their own.

const DIM_WORD_OPACITY = 0.18;
const REVEAL_START = 0.8;
const REVEAL_END = 0.55;

/** @param {number} value */
const clamp01 = (value) => Math.min(1, Math.max(0, value));

/**
 * How far the page has scrolled through a tall section whose content stays pinned:
 * 0 when the section's top reaches the top of the screen, 1 when its end reaches the bottom.
 * @param {number} top the section's top, relative to the screen
 * @param {number} height the section's height
 * @param {number} viewport the screen's height
 */
export function stickyProgress(top, height, viewport) {
  const distance = height - viewport;
  return distance > 0 ? clamp01(-top / distance) : 0;
}

/**
 * Which step of a pinned story to show, sharing the progress evenly between the steps.
 * @param {number} progress 0 to 1
 * @param {number} steps
 */
export function storyStep(progress, steps) {
  return Math.min(steps - 1, Math.floor(clamp01(progress) * steps));
}

/**
 * Progress for text that lights up as it passes: 0 when its top is 80% of the way down the screen,
 * 1 when its end is 55% of the way down.
 * @param {number} top
 * @param {number} height
 * @param {number} viewport
 */
export function revealProgress(top, height, viewport) {
  return clamp01((viewport * REVEAL_START - top) / (height + viewport * (REVEAL_START - REVEAL_END)));
}

/**
 * Opacity of one word in a line that lights up word by word as progress goes from 0 to 1.
 * @param {number} index
 * @param {number} count
 * @param {number} progress
 */
export function wordOpacity(index, count, progress) {
  const lit = clamp01(clamp01(progress) * count - index);
  return DIM_WORD_OPACITY + (1 - DIM_WORD_OPACITY) * lit;
}

/**
 * @typedef {object} NumberParts
 * @property {string} prefix text before the number
 * @property {number} value
 * @property {boolean} grouped whether it was written with commas, like 1,200
 * @property {string} suffix text after the number
 */

/**
 * The first number in a text and the text around it: "[10] lakh+" → "[", 10, "] lakh+".
 * @param {string} text
 * @returns {NumberParts | null}
 */
export function numberParts(text) {
  const match = /\d[\d,]*/.exec(text);
  if (!match) return null;
  return {
    prefix: text.slice(0, match.index),
    value: Number(match[0].replace(/,/g, '')),
    grouped: match[0].includes(','),
    suffix: text.slice(match.index + match[0].length),
  };
}

/**
 * The number shown partway through counting up, slowing down as it nears the end.
 * @param {NumberParts} parts
 * @param {number} t 0 at the start, 1 at the end
 */
export function countUpValue(parts, t) {
  const eased = 1 - (1 - clamp01(t)) ** 3;
  const value = Math.round(parts.value * eased);
  return parts.grouped ? value.toLocaleString('en-IN') : String(value);
}
