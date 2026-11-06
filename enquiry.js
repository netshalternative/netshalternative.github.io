// The enquiry form's rules and the message it sends. No page code here, so it can be tested on its own.

/** The products a school can ask about: form value → name shown in the message. */
export const PRODUCTS = {
  'id-cards': 'ID cards',
  lanyards: 'Lanyards & ribbons',
  holders: 'Holders & reels',
};

const WANTS = { sample: 'a sample', rates: 'rates', both: 'a sample and rates' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MAX_TEXT = 120;
const MAX_MESSAGE = 1000;
const MAX_CARDS = 1_000_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @typedef {object} Enquiry
 * @property {string} school
 * @property {string} name
 * @property {string} phone
 * @property {string} city
 * @property {string[]} products keys of PRODUCTS
 * @property {string} quantity
 * @property {string} neededBy YYYY-MM-DD, or '' when not given
 * @property {string} wants 'sample', 'rates' or 'both'
 * @property {string} message
 */

/**
 * The 10-digit Indian mobile number in what was typed, allowing +91, 0 and separators; null when there isn't one.
 * @param {string} value
 * @returns {string | null}
 */
function mobileNumber(value) {
  const compact = value.replace(/[\s\-().]/g, '').replace(/^\+/, '');
  if (!/^\d+$/.test(compact)) return null;
  const local = compact.replace(/^(?:091|91|0)(?=\d{10}$)/, '');
  return /^[6-9]\d{9}$/.test(local) ? local : null;
}

/**
 * What is wrong with an enquiry, by field. An empty object means it can be sent.
 * @param {Enquiry} enquiry
 * @param {string} today YYYY-MM-DD
 * @returns {Record<string, string>}
 */
export function enquiryErrors(enquiry, today) {
  /** @type {Record<string, string>} */
  const errors = {};
  const required = { school: 'Enter the school or organisation name.', name: 'Enter your name.', city: 'Enter your city.' };
  for (const [field, problem] of Object.entries(required)) {
    const value = enquiry[/** @type {'school' | 'name' | 'city'} */ (field)].trim();
    if (!value) errors[field] = problem;
    else if (value.length > MAX_TEXT) errors[field] = `Keep this under ${MAX_TEXT} characters.`;
  }
  if (!mobileNumber(enquiry.phone)) errors.phone = 'Enter a 10-digit mobile number.';
  if (!enquiry.products.some((product) => product in PRODUCTS)) errors.products = 'Choose at least one product.';

  const quantity = enquiry.quantity.replace(/,/g, '').trim();
  if (!/^\d+$/.test(quantity) || Number(quantity) < 1 || Number(quantity) > MAX_CARDS) {
    errors.quantity = 'Enter roughly how many cards, for example 500.';
  }
  if (enquiry.neededBy && !ISO_DATE.test(enquiry.neededBy)) errors.neededBy = 'Choose a date.';
  else if (enquiry.neededBy && enquiry.neededBy < today) errors.neededBy = 'Choose today or a later date.';
  if (enquiry.message.length > MAX_MESSAGE) errors.message = 'Keep the message under 1,000 characters.';
  return errors;
}

/**
 * "2026-12-15" → "15 Dec 2026", the same on every phone whatever its language settings.
 * @param {string} isoDate
 */
function readableDate(isoDate) {
  const [year, month, day] = isoDate.split('-');
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
}

/**
 * The enquiry as the message the school sends: a greeting, then one detail per line.
 * @param {Enquiry} enquiry
 * @returns {string}
 */
export function enquiryMessage(enquiry) {
  const wants = WANTS[/** @type {keyof typeof WANTS} */ (enquiry.wants)] ?? WANTS.both;
  const products = Object.entries(PRODUCTS).filter(([key]) => enquiry.products.includes(key)).map(([, label]) => label);
  const lines = [
    `Hello, I would like ${wants}.`,
    '',
    `School: ${enquiry.school.trim()}`,
    `Name: ${enquiry.name.trim()}`,
    `Phone: ${enquiry.phone.trim()}`,
    `City: ${enquiry.city.trim()}`,
    `Products: ${products.join(', ')}`,
    `Number of cards: about ${enquiry.quantity.trim()}`,
  ];
  if (enquiry.neededBy) lines.push(`Needed by: ${readableDate(enquiry.neededBy)}`);
  if (enquiry.message.trim()) lines.push(`Message: ${enquiry.message.trim()}`);
  return lines.join('\n');
}

/**
 * A link that opens a WhatsApp chat with the message typed in, or null without a usable number.
 * A 10-digit number is taken as Indian (+91).
 * @param {string} number
 * @param {string} message
 * @returns {string | null}
 */
export function whatsappLink(number, message) {
  const digits = number.replace(/\D/g, '');
  const international = digits.length === 10 ? `91${digits}` : digits;
  if (international.length < 11 || international.length > 15) return null;
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}

/**
 * A link that opens an email with the subject and message filled in, or null without a usable address.
 * @param {string} address
 * @param {string} subject
 * @param {string} body
 * @returns {string | null}
 */
export function emailLink(address, subject, body) {
  if (!EMAIL.test(address.trim())) return null;
  return `mailto:${address.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
