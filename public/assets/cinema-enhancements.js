/* Progressive enhancement for the cinematic homepage.
   The original links and content work with or without this script. */
(() => {
  'use strict';
  if (document.body.dataset.page !== '/') return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (!reduceMotion) {
    document.body.classList.add('cinema-motion-ready');

    if ('IntersectionObserver' in window) {
      const sections = [
        ...document.querySelectorAll([
          '.cinema-promises .cinema-promise',
          '.cinema-editorial-copy',
          '.cinema-villas-header',
          '.cinema-experience-copy',
          '.cinema-search-header',
          '.cinema-destinations > div:first-child',
          '.cinema-about-copy',
          '.cinema-last-word > h2'
        ].join(','))
      ];
      const observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in-view');
          observer.unobserve(entry.target);
        }
      }, {threshold: .09, rootMargin: '0px 0px -4% 0px'});
      sections.forEach((section, index) => {
        section.style.setProperty('--cinema-stagger', `${(index % 3) * 75}ms`);
        section.classList.add('cinema-scroll-reveal');
        observer.observe(section);
      });
    }
  }

  // Keep existing anchor links and labels. The curtain is purely decorative.
  const cards = document.querySelectorAll('.cinema-villas .card');
  function direction(event, element) {
    const box = element.getBoundingClientRect();
    if (!box.width || !box.height) return ['0%', '100%'];
    const x = (event.clientX - box.left - box.width / 2) * box.height / box.width;
    const y = event.clientY - box.top - box.height / 2;
    if (Math.abs(x) > Math.abs(y)) return x < 0 ? ['-100%', '0%'] : ['100%', '0%'];
    return y < 0 ? ['0%', '-100%'] : ['0%', '100%'];
  }
  function setDirection(link, coords) {
    link.style.setProperty('--curtain-x', coords[0]);
    link.style.setProperty('--curtain-y', coords[1]);
  }
  for (const card of cards) {
    const link = card.querySelector('.card-image');
    if (!link) continue;
    const heading = card.querySelector('.card-info h3');
    const overlay = document.createElement('span');
    overlay.className = 'cinema-card-curtain';
    overlay.setAttribute('aria-hidden', 'true');

    const kicker = document.createElement('span');
    kicker.className = 'cinema-card-curtain__kicker';
    kicker.textContent = 'AN EXCEPTIONAL PRIVATE VILLA';
    const name = document.createElement('span');
    name.className = 'cinema-card-curtain__name';
    name.textContent = heading?.textContent?.trim() || 'Discover the villa';
    const action = document.createElement('span');
    action.className = 'cinema-card-curtain__action';
    action.textContent = 'EXPLORE THE VILLA ↗';

    overlay.append(kicker, name, action);
    link.append(overlay);
    link.classList.add('has-cinema-curtain');

    if (!finePointer || reduceMotion) continue;
    link.addEventListener('mouseenter', event => {
      setDirection(link, direction(event, link));
      // Start outside the image, then animate inward on the next paint.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (link.matches(':hover')) link.classList.add('is-curtain-visible');
        });
      });
    });
    link.addEventListener('mouseleave', event => {
      setDirection(link, direction(event, link));
      link.classList.remove('is-curtain-visible');
    });
  }
})();