/**
 * Super Tuscany — immersive villa carousel.
 * Uses the existing property catalogue, original photographs and URLs.
 * No React or external runtime dependency.
 */
export function villaShowcase(villas, { esc, picture, paths }) {
  const collection = villas.filter(villa => villa.images?.length);
  if (!collection.length) return '';

  // Give the signature residence the opening position when it is available.
  const leadIndex = collection.findIndex(villa => /palazzo rosadi/i.test(villa.title));
  if (leadIndex > 0) collection.unshift(collection.splice(leadIndex, 1)[0]);

  const pad = value => String(value).padStart(2, '0');
  const cards = collection.map((villa, index) => {
    const location = villa.facts?.location || villa.location || 'Tuscany, Italy';
    return `<article class="villa-showcase-card" data-villa-slide data-slide-index="${index}">
      <a class="villa-showcase-link" href="${esc(villa.path)}" aria-label="Explore ${esc(villa.title)}">
        ${picture(villa, 'villa-showcase-photo', 0)}
        <span class="villa-showcase-photo-shade" aria-hidden="true"></span>
        <span class="villa-showcase-card-top" aria-hidden="true">${pad(index + 1)} <span>—</span> PRIVATE VILLA</span>
        <span class="villa-showcase-card-bottom">
          <span class="villa-showcase-card-location">${esc(location)}</span>
          <span class="villa-showcase-card-title">${esc(villa.title)}</span>
          <span class="villa-showcase-card-action">EXPLORE VILLA <span aria-hidden="true">↗</span></span>
        </span>
      </a>
    </article>`;
  }).join('');

  return `<section class="cinema-villas cinema-villas-3d" id="collection" aria-labelledby="cinema-villas-title">
    <div class="cinema-villas-header villa-showcase-heading">
      <p class="eyebrow">THE PRIVATE COLLECTION <span aria-hidden="true">—</span> SUPER TUSCANY</p>
      <h2 id="cinema-villas-title">Our Private <em>Villas.</em></h2>
      <p class="villa-showcase-description">${collection.length} extraordinary properties in the heart of Tuscany.</p>
    </div>
    <div class="villa-showcase" data-villa-carousel>
      <div class="villa-showcase-viewport" role="region" aria-roledescription="carousel" aria-label="Explore private villas in Tuscany">
        <div class="villa-showcase-track" id="villa-showcase-track" data-villa-track>
          ${cards}
        </div>
        <button class="villa-showcase-arrow villa-showcase-arrow-prev" type="button"
          data-villa-prev aria-label="Previous villa" aria-controls="villa-showcase-track">
          <span aria-hidden="true">←</span>
        </button>
        <button class="villa-showcase-arrow villa-showcase-arrow-next" type="button"
          data-villa-next aria-label="Next villa" aria-controls="villa-showcase-track">
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <div class="villa-showcase-footer">
        <div class="villa-showcase-progress" aria-hidden="true"><span data-villa-progress></span></div>
        <div class="villa-showcase-position" aria-live="polite" aria-atomic="true">
          <strong data-villa-current>01</strong> <span>/</span> <span>${pad(collection.length)}</span>
          <span class="villa-showcase-active-name" data-villa-name>${esc(collection[0].title)}</span>
        </div>
        <p class="villa-showcase-hint">DRAG TO EXPLORE <span aria-hidden="true">·</span> SELECT A VILLA</p>
      </div>
      <a class="villa-showcase-view-all" href="${esc(paths.villas)}">VIEW ALL ${collection.length} VILLAS <span aria-hidden="true">↗</span></a>
    </div>
  </section>`;
}
