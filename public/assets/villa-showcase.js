/* SUPER TUSCANY — VILLA SHOWCASE
   Real CSS 3D positioning with keyboard, mouse, buttons and touch gestures.
   Degrades to a native, horizontally scrollable collection without JavaScript. */
(() => {
  'use strict';

  const root = document.querySelector('[data-villa-carousel]');
  if (!root) return;

  const viewport = root.querySelector('.villa-showcase-viewport');
  const cards = Array.from(root.querySelectorAll('[data-villa-slide]'));
  const prev = root.querySelector('[data-villa-prev]');
  const next = root.querySelector('[data-villa-next]');
  const progress = root.querySelector('[data-villa-progress]');
  const counter = root.querySelector('[data-villa-current]');
  const activeName = root.querySelector('[data-villa-name]');
  if (!viewport || !cards.length || !prev || !next || !progress || !counter || !activeName) return;

  const links = cards.map(card => card.querySelector('.villa-showcase-link'));
  if (links.some(link => !link)) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const formatNumber = n => String(n).padStart(2, '0');
  let active = 0;
  let gestureStart = null;
  let suppressClick = false;
  let suppressTimer = 0;
  let resizeFrame = 0;

  cards.forEach(card => {
    const photo = card.querySelector('img');
    if (photo) photo.draggable = false;
  });

  function normalizedDistance(itemIndex) {
    let distance = itemIndex - active;
    if (distance > cards.length / 2) distance -= cards.length;
    if (distance < -cards.length / 2) distance += cards.length;
    return distance;
  }

  function layout() {
    const available = viewport.clientWidth;
    const cardWidth = cards[0].offsetWidth || 350;
    const mobile = available <= 640;
    const tablet = available > 640 && available <= 900;
    const near = mobile ? cardWidth * .73 : Math.min(available * .285, cardWidth * .89);
    const far = Math.min(available * .47, cardWidth * 1.54);
    const maxVisible = mobile ? 1 : 2;

    cards.forEach((card, itemIndex) => {
      const distance = normalizedDistance(itemIndex);
      const depth = Math.abs(distance);
      const side = Math.sign(distance);
      const visible = depth <= maxVisible;
      const x = depth === 0 ? 0 : side * (depth === 1 ? near : far);
      const y = depth === 0 ? -10 : depth === 1 ? 17 : 30;
      const z = depth === 0 ? 92 : depth === 1 ? -25 : -195;
      const rotation = depth === 0 ? 0 : side * (depth === 1 ? -26 : -35);
      const scale = depth === 0 ? 1 : depth === 1 ? (mobile ? .88 : .85) : .73;
      const opacity = visible ? (depth === 0 ? 1 : depth === 1 ? .84 : .62) : 0;
      const pose = `translate3d(calc(-50% + ${x}px),calc(-50% + ${y}px),${z}px) rotateY(${rotation}deg) scale(${scale})`;

      card.style.transform = pose;
      card.style.opacity = String(opacity);
      card.style.visibility = visible ? 'visible' : 'hidden';
      card.style.pointerEvents = visible ? 'auto' : 'none';
      card.style.zIndex = String(50 - depth * 10);
      card.dataset.depth = String(depth);
      card.dataset.position = String(distance);
      card.setAttribute('aria-hidden', itemIndex === active ? 'false' : 'true');

      const link = links[itemIndex];
      link.tabIndex = itemIndex === active ? 0 : -1;
      if (itemIndex === active) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    counter.textContent = formatNumber(active + 1);
    progress.style.width = `${((active + 1) / cards.length) * 100}%`;
    activeName.textContent = cards[active].querySelector('.villa-showcase-card-title')?.textContent?.trim() || '';
    root.dataset.activeIndex = String(active);
  }

  function select(index, focusCard = false) {
    active = ((index % cards.length) + cards.length) % cards.length;
    layout();
    if (focusCard) links[active].focus({preventScroll:true});
  }

  prev.addEventListener('click', () => select(active - 1));
  next.addEventListener('click', () => select(active + 1));

  viewport.addEventListener('click', event => {
    const link = event.target.closest('.villa-showcase-link');
    if (!link || !root.contains(link)) return;
    if (suppressClick) {
      event.preventDefault();
      return;
    }
    const selectedIndex = Number(link.closest('[data-villa-slide]')?.dataset.slideIndex);
    if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= cards.length) return;
    if (selectedIndex !== active) {
      event.preventDefault();
      select(selectedIndex);
    }
    // Clicking the already selected villa follows its original property URL.
  });

  viewport.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      select(active + (event.key === 'ArrowRight' ? 1 : -1), event.target.closest('.villa-showcase-link') !== null);
    }
  });

  // Capture swipe direction without hijacking vertical page scrolling.
  viewport.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('.villa-showcase-arrow')) return;
    gestureStart = {id:event.pointerId, x:event.clientX, y:event.clientY};
    viewport.classList.add('is-dragging');
  });
  viewport.addEventListener('pointerup', event => {
    if (!gestureStart || gestureStart.id !== event.pointerId) return;
    const deltaX = event.clientX - gestureStart.x;
    const deltaY = event.clientY - gestureStart.y;
    gestureStart = null;
    viewport.classList.remove('is-dragging');
    if (Math.abs(deltaX) < 45 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) return;

    suppressClick = true;
    window.clearTimeout(suppressTimer);
    suppressTimer = window.setTimeout(() => {suppressClick = false;}, 120);
    select(active + (deltaX < 0 ? 1 : -1));
  });
  viewport.addEventListener('pointercancel', () => {
    gestureStart = null;
    viewport.classList.remove('is-dragging');
  });
  viewport.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse') {
      gestureStart = null;
      viewport.classList.remove('is-dragging');
    }
  });

  function handleResize() {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      layout();
    });
  }
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(handleResize);
    observer.observe(viewport);
  } else {
    window.addEventListener('resize', handleResize, {passive:true});
  }

  // Enable enhanced positioning only after all event handlers are installed.
  root.classList.add('is-3d');
  if (prefersReducedMotion) root.classList.add('is-reduced-motion');
  layout();
})();