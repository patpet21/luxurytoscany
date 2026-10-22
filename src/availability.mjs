import {CATALOGUE} from '../public/assets/availability-model.js';

export function availabilityPanel(page) {
  const villa = CATALOGUE.find(v => v.path === page.path);
  return `<section class="content-section availability-section" aria-labelledby="availability-title" data-availability="${villa?.slug || 'unverified'}">
    <p class="eyebrow">A LITTLE CLOSER TO TUSCANY</p>
    <h2 id="availability-title">Time for your <em>escape.</em></h2>
    <p class="availability-intro">${villa ? 'Explore the latest reported occupied dates. Every stay is arranged personally; dates outside these blocks still need confirmation.' : 'Availability for this villa has not been verified. Please speak with our team before making travel arrangements.'}</p>
    <div class="availability-card">
      <div class="availability-toolbar"><span class="availability-badge" data-availability-badge>${villa ? 'Checking the source' : 'No verified source'}</span><button type="button" class="text-link" data-availability-refresh ${villa ? '' : 'hidden'}>Refresh <span aria-hidden="true">↻</span></button></div>
      <p class="availability-status" data-availability-status role="status" aria-live="polite">${villa ? 'Availability is not verified while the source is loading.' : 'Villa Sant’Andrea remains on request. No dates are confirmed as available.'}</p>
      <div class="availability-navigation"><button type="button" data-calendar-prev aria-label="Previous month">←</button><span>YOUR TUSCAN CALENDAR</span><button type="button" data-calendar-next aria-label="Next month">→</button></div>
      <div class="availability-months" data-calendar-months></div>
      <div class="availability-legend"><span><i class="availability-dot is-blocked" aria-hidden="true"></i>Occupied</span><span><i class="availability-dot is-unverified" aria-hidden="true"></i>To be confirmed</span><span><i class="availability-dot is-unknown" aria-hidden="true"></i>Not verified</span></div>
      <p class="availability-caption">Occupied ranges include their final night. A departure date does not consume a night. No instant booking is offered.</p>
      ${villa ? `<a class="availability-source" href="https://www.promozionevilla.it/availability/" target="_blank" rel="noopener noreferrer">Calendar source · Promozione Villa ↗</a>` : ''}
    </div>
    <noscript><p>JavaScript is required to check the current source. No availability is verified here. Contact our team for a manual check.</p></noscript>
  </section>`;
}
