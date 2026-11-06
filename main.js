// Page behaviour: contact links from config.js, the phone menu, the theme button, sending the enquiry form, and the motion.
import { CONTACT } from './config.js';
import { emailLink, enquiryErrors, enquiryMessage, whatsappLink } from './enquiry.js';
import { startMotion } from './motion.js';
import { setUpThemeToggle } from './theme.js';

const GREETING = 'Hello, I would like to know about your ID cards.';
const EMAIL_SUBJECT = 'ID card enquiry';

/** Today as YYYY-MM-DD in the visitor's own time zone. */
function todayIso() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
}

/** Fills every [data-contact] link from config.js; a detail not filled in keeps its [placeholder]. */
function showContacts() {
  const dialable = CONTACT.phone.replace(/[^\d+]/g, '');
  const contacts = {
    whatsapp: { href: whatsappLink(CONTACT.whatsapp, GREETING), text: CONTACT.whatsapp },
    phone: { href: dialable.length >= 10 ? `tel:${dialable}` : null, text: CONTACT.phone },
    email: { href: emailLink(CONTACT.email, EMAIL_SUBJECT, ''), text: CONTACT.email },
  };
  for (const link of document.querySelectorAll('a[data-contact]')) {
    const contact = contacts[/** @type {keyof typeof contacts} */ (link.dataset.contact)];
    if (!contact?.href) continue;
    link.href = contact.href;
    if (contact.href.startsWith('https:')) link.target = '_blank';
    const label = link.querySelector('[data-contact-text]');
    if (label) label.textContent = contact.text;
  }
  const floating = document.querySelector('.whatsapp-float');
  if (floating) floating.hidden = !contacts.whatsapp.href;
}

function setUpMenu() {
  const button = document.querySelector('.menu-button');
  const nav = document.getElementById('site-nav');
  if (!button || !nav) return;
  const setOpen = (/** @type {boolean} */ open) => {
    button.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('open', open);
  };
  button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (event) => {
    if (event.target instanceof HTMLAnchorElement) setOpen(false);
  });
}

/** "Ask for lanyard rates" and similar links tick the matching choices in the form. */
function setUpPreselectLinks(/** @type {HTMLFormElement} */ form) {
  document.addEventListener('click', (event) => {
    const link = event.target instanceof Element ? event.target.closest('a[data-product], a[data-wants]') : null;
    if (!(link instanceof HTMLAnchorElement)) return;
    const { product, wants } = link.dataset;
    const productBox = product ? form.querySelector(`input[name="products"][value="${product}"]`) : null;
    if (productBox instanceof HTMLInputElement) productBox.checked = true;
    const wantsChoice = wants ? form.querySelector(`input[name="wants"][value="${wants}"]`) : null;
    if (wantsChoice instanceof HTMLInputElement) wantsChoice.checked = true;
  });
}

/** @param {HTMLFormElement} form */
function readEnquiry(form) {
  const data = new FormData(form);
  const text = (/** @type {string} */ name) => String(data.get(name) ?? '');
  return {
    school: text('school'),
    name: text('name'),
    phone: text('phone'),
    city: text('city'),
    products: data.getAll('products').map(String),
    quantity: text('quantity'),
    neededBy: text('neededBy'),
    wants: text('wants') || 'both',
    message: text('message'),
  };
}

/**
 * Shows each problem under its field and moves focus to the first one.
 * @param {HTMLFormElement} form
 * @param {Record<string, string>} errors
 */
function showErrors(form, errors) {
  for (const note of form.querySelectorAll('[data-error-for]')) {
    const field = /** @type {HTMLElement} */ (note).dataset.errorFor ?? '';
    note.textContent = errors[field] ?? '';
    /** @type {HTMLElement} */ (note).hidden = !errors[field];
    for (const input of form.querySelectorAll(`[name="${field}"]`)) {
      if (errors[field]) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }
  }
  const first = form.querySelector('[aria-invalid="true"]');
  if (first instanceof HTMLElement) first.focus();
}

function setUpEnquiryForm(/** @type {HTMLFormElement} */ form) {
  const status = form.querySelector('.form-status');
  const neededBy = form.querySelector('input[name="neededBy"]');
  if (neededBy instanceof HTMLInputElement) neededBy.min = todayIso();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const enquiry = readEnquiry(form);
    const errors = enquiryErrors(enquiry, todayIso());
    showErrors(form, errors);
    if (!status) return;
    if (Object.keys(errors).length > 0) {
      status.textContent = 'Please fix the highlighted details.';
      return;
    }
    const channel = event.submitter instanceof HTMLButtonElement ? event.submitter.value : 'whatsapp';
    const message = enquiryMessage(enquiry);
    const link = channel === 'email' ? emailLink(CONTACT.email, `${EMAIL_SUBJECT}: ${enquiry.school.trim()}`, message) : whatsappLink(CONTACT.whatsapp, message);
    if (!link) {
      status.textContent = channel === 'email'
        ? 'Email is not set up on this site yet. Please send the enquiry on WhatsApp or call us.'
        : 'WhatsApp is not set up on this site yet. Please send the enquiry by email or call us.';
      return;
    }
    if (channel === 'email') window.location.href = link;
    else window.open(link, '_blank', 'noopener');
    status.textContent = channel === 'email'
      ? 'Your email app is opening with the enquiry filled in. Press Send there to reach us.'
      : 'WhatsApp is opening with the enquiry filled in. Press Send there to reach us.';
  });
}

showContacts();
setUpMenu();
setUpThemeToggle();
const form = document.getElementById('enquiry');
if (form instanceof HTMLFormElement) {
  setUpPreselectLinks(form);
  setUpEnquiryForm(form);
}
for (const year of document.querySelectorAll('[data-year]')) year.textContent = String(new Date().getFullYear());
startMotion();
