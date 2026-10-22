import {CATALOGUE} from '../public/assets/availability-model.js';
const esc=(value='')=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function calendarCard() {
  return `<div class="availability-card">
    <div class="availability-toolbar"><span class="availability-badge" data-availability-badge>Availability not verified</span><button type="button" class="text-link" data-availability-refresh>Refresh ↻</button></div>
    <p class="availability-status" data-availability-status role="status" aria-live="polite">Checking the latest dates. No availability is confirmed while loading.</p>
    <p class="availability-instructions" data-calendar-instructions tabindex="-1">Choose your check-in, then your check-out. Your departure does not use a night.</p>
    <div class="availability-navigation"><button type="button" data-calendar-prev aria-label="Previous month">←</button><span>YOUR TUSCAN CALENDAR</span><button type="button" data-calendar-next aria-label="Next month">→</button></div>
    <div class="availability-months" data-calendar-months></div>
    <div class="availability-legend"><span><i class="availability-dot is-available" aria-hidden="true"></i>Reported available</span><span><i class="availability-dot is-blocked" aria-hidden="true"></i>Occupied</span><span><i class="availability-dot is-unverified" aria-hidden="true"></i>To be confirmed</span><span><i class="availability-dot is-unknown" aria-hidden="true"></i>Not verified</span></div>
    <div class="availability-party"><label>Adults<input type="number" min="1" max="100" value="2" data-calendar-adults></label><label>Children<input type="number" min="0" max="99" value="0" data-calendar-children></label></div>
    <div class="availability-summary" aria-live="polite"><strong data-calendar-villa></strong><p data-stay-summary>Choose your dates to review your stay.</p><p data-selection-status></p></div>
    <div class="availability-actions"><button type="button" class="text-link" data-calendar-clear>Clear dates</button><button type="button" class="button" data-calendar-continue disabled>Continue ↗</button></div>
    <p class="availability-caption">The last occupied date is included. You may check out before the first occupied night. Reported availability is checked again before your enquiry; a reservation always requires our team’s confirmation.</p>
    <a class="availability-source" href="https://www.promozionevilla.it/availability/" target="_blank" rel="noopener noreferrer">Calendar source · Promozione Villa ↗</a>
  </div>`;
}
export function availabilityPanel(page) {
  const villa=CATALOGUE.find(v=>v.path===page.path);
  return `<section class="content-section availability-section" aria-labelledby="availability-title" data-availability="${villa?.slug||'unverified'}" data-villa-title="${esc(page.title)}" data-capacity="${Number(page.facts?.sleeps)||100}">
    <p class="eyebrow">A LITTLE CLOSER TO TUSCANY</p><h2 id="availability-title">Time for your <em>escape.</em></h2>
    <p class="availability-intro">${villa?'Select your dates and guests, then continue to a personal stay enquiry. Dates marked “To be confirmed” are not verified as available.':'Availability for this villa has not been verified. Please ask our team to check your dates manually.'}</p>
    ${calendarCard()}<noscript><p>JavaScript is required to check and select dates. Please contact our team for a manual check.</p></noscript>
  </section>`;
}
export function finderCalendar() {
  return `<section class="finder-calendar availability-section" data-availability="finder" aria-label="Selected villa calendar" hidden>${calendarCard()}</section>`;
}
export function calendarDialog(villas) {
  return `<dialog id="stay-calendar-dialog" class="stay-calendar-dialog" aria-labelledby="stay-calendar-title"><button type="button" class="dialog-close" data-close-calendar aria-label="Close date selection">×</button><p class="eyebrow">PLAN A PERSONAL STAY</p><h2 id="stay-calendar-title">Your Tuscan <em>dates.</em></h2><label class="calendar-villa-label">Villa<select data-picker-villa><option value="">Choose a villa</option>${villas.map(v=>`<option value="${esc(v.title)}" data-path="${esc(v.path)}" data-capacity="${Number(v.facts?.sleeps)||100}">${esc(v.title)}</option>`).join('')}</select></label><div data-availability="picker">${calendarCard()}</div></dialog>`;
}
