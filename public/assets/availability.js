const version = new URL(import.meta.url).searchParams.get('model') || '1';
const {CATALOGUE, CACHE_MS, nameKey, dayState, stayState, usableSnapshot} = await import(`./availability-model.js?v=${encodeURIComponent(version)}`);
const endpoint = '/.netlify/functions/availability';
const pending = new Map();
const snapshots = new Map();

async function readSource(villa, stay) {
  const params = new URLSearchParams({villa:villa.slug, ...(stay || {})});
  const key = params.toString();
  if (!pending.has(key)) pending.set(key, (async () => {
    const response = await fetch(`${endpoint}?${params}`, {cache:'no-store', signal:AbortSignal.timeout(9000)});
    const snapshot = await response.json();
    if (!response.ok || snapshot.villa !== villa.slug || snapshot.id !== villa.id || !usableSnapshot(snapshot)) throw Error('Source not verified');
    snapshots.set(villa.slug, snapshot);
    return snapshot;
  })().finally(() => pending.delete(key)));
  return pending.get(key);
}

const todayInItaly = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Rome', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date());
const dateLabel = iso => new Intl.DateTimeFormat('en-GB', {dateStyle:'long', timeZone:'UTC'}).format(new Date(`${iso}T00:00:00Z`));
const monthLabel = date => new Intl.DateTimeFormat('en-GB', {month:'long', year:'numeric', timeZone:'UTC'}).format(date);

for (const widget of document.querySelectorAll('[data-availability]')) {
  const villa = CATALOGUE.find(v => v.slug === widget.dataset.availability);
  let month = new Date(`${todayInItaly().slice(0,7)}-01T00:00:00Z`), snapshot, timer, loading = false;
  const months = widget.querySelector('[data-calendar-months]');
  const badge = widget.querySelector('[data-availability-badge]');
  const status = widget.querySelector('[data-availability-status]');
  const refresh = widget.querySelector('[data-availability-refresh]');
  const prev = widget.querySelector('[data-calendar-prev]'), next = widget.querySelector('[data-calendar-next]');
  const initialMonth = month.getTime();
  function draw() {
    const valid = usableSnapshot(snapshot);
    const labels = {blocked:'Occupied', unverified:'To be confirmed', unknown:'Not verified'};
    months.replaceChildren();
    for (let offset = 0; offset < 2; offset++) {
      const date = new Date(month); date.setUTCMonth(date.getUTCMonth()+offset);
      const table = document.createElement('table'); table.className = 'availability-month';
      const caption = table.createCaption(); caption.textContent = monthLabel(date);
      const head = table.createTHead().insertRow();
      ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].forEach(day => {
        const th = document.createElement('th'); th.scope = 'col';
        const abbr = document.createElement('abbr'); abbr.title = day; abbr.textContent = day.slice(0,2); th.append(abbr); head.append(th);
      });
      const body = table.createTBody();
      const shift = (date.getUTCDay()+6)%7;
      const count = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth()+1, 0)).getUTCDate();
      let row;
      for (let position = 0; position < Math.ceil((shift+count)/7)*7; position++) {
        if (position%7 === 0) row = body.insertRow();
        const cell = row.insertCell(); const day = position-shift+1;
        if (day < 1 || day > count) continue;
        const iso = `${date.toISOString().slice(0,7)}-${String(day).padStart(2,'0')}`;
        const state = dayState(snapshot, iso);
        cell.className = `is-${state}`;
        const time = document.createElement('time'); time.dateTime = iso; time.textContent = String(day);
        const description = document.createElement('span'); description.className = 'sr-only'; description.textContent = ` ${labels[state]}`;
        cell.append(time, description); cell.title = `${dateLabel(iso)} · ${labels[state]}`;
        if (iso === todayInItaly()) cell.setAttribute('aria-current', 'date');
        if (iso < todayInItaly()) cell.classList.add('is-past');
      }
      months.append(table);
    }
    prev.disabled = month.getTime() <= initialMonth;
    next.disabled = month.getUTCFullYear()*12+month.getUTCMonth() >= new Date(initialMonth).getUTCFullYear()*12+new Date(initialMonth).getUTCMonth()+35;
    badge.textContent = valid ? snapshot.sourceWarning ? 'Source needs confirmation' : 'Occupied dates updated' : loading ? 'Checking the source' : 'Availability not verified';
    badge.classList.toggle('is-synced', valid);
    if (valid) {
      const changed = snapshot.version !== widget.dataset.version && !!widget.dataset.version;
      status.textContent = `${changed ? 'The source has changed. ' : ''}Checked ${new Date(snapshot.checkedAt).toLocaleString('en-GB', {timeZone:'Europe/Rome'})} (Italy). ${snapshot.sourceWarning || 'Other dates require confirmation.'}`;
      widget.dataset.version = snapshot.version;
    } else status.textContent = villa ? loading ? 'Checking the latest reported dates. Availability remains unverified until this check completes.' : 'The source is not currently verified. Please ask our team to check your dates.' : 'Villa Sant’Andrea has no verified availability source. All dates require a manual check.';
  }
  async function load() {
    if (!villa || loading) return;
    loading = true; refresh.disabled = true; draw();
    try { snapshot = await readSource(villa); }
    catch { snapshot = undefined; snapshots.delete(villa.slug); }
    finally {
      loading = false; refresh.disabled = false; draw(); clearTimeout(timer);
      // Expire the presentation before refreshing; never leave a stale success visible.
      const delay = usableSnapshot(snapshot) ? Math.max(1, Date.parse(snapshot.expiresAt)-Date.now()) : 15_000;
      timer = setTimeout(() => { draw(); if (!document.hidden) load(); }, delay);
      document.dispatchEvent(new Event('availability:updated'));
    }
  }
  prev.addEventListener('click', () => { month.setUTCMonth(month.getUTCMonth()-1); draw(); });
  next.addEventListener('click', () => { month.setUTCMonth(month.getUTCMonth()+1); draw(); });
  refresh.addEventListener('click', load);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { draw(); load(); } });
  window.addEventListener('online', load);
  draw(); load();
}

// Preserve the existing enquiry flow. This is a request, never a reservation.
const form = document.querySelector('form[name="stay-request"]');
if (form) {
  const villaInput = form.elements.villa, arrival = form.elements.arrival, departure = form.elements.departure;
  const note = document.createElement('p'); note.className = 'availability-form-note'; note.setAttribute('role','status'); note.setAttribute('aria-live','polite');
  form.querySelector('.form-status').before(note);
  const marker = form.elements['availability-check'];
  let approved, busy = false, ourError = '';
  const villa = () => CATALOGUE.find(v => nameKey(v.title) === nameKey(villaInput.value));
  const signature = () => JSON.stringify([villaInput.value,arrival.value,departure.value]);
  function explain(snapshot) {
    const state = stayState(snapshot, arrival.value, departure.value);
    marker.value = state;
    if (state === 'blocked') {
      ourError = 'This stay includes reported occupied nights. Please choose different dates.';
      arrival.setCustomValidity(ourError); note.textContent = ourError;
    } else {
      if (ourError && arrival.validationMessage === ourError) arrival.setCustomValidity('');
      ourError = '';
      note.textContent = state === 'unverified' ? 'No occupied nights are reported for this range. Availability is still unverified; this sends a manual enquiry only.' : 'These dates are not verified. Our team must check availability manually; this enquiry does not reserve dates.';
    }
    return state;
  }
  function changed() { approved = undefined; explain(snapshots.get(villa()?.slug)); }
  [villaInput, arrival, departure].forEach(input => { input.addEventListener('input',changed); input.addEventListener('change',changed); });
  document.addEventListener('availability:updated', changed);
  // Handles villas preselected by existing page/search buttons without altering them.
  document.addEventListener('click', event => { if (event.target.closest('[data-inquiry="booking"]')) queueMicrotask(changed); });
  form.addEventListener('submit', async event => {
    if (approved === signature()) { approved = undefined; return; }
    event.preventDefault(); event.stopImmediatePropagation();
    if (busy) return;
    busy = true; const startSignature = signature(); const selected = villa();
    const submit = form.querySelector('button[type="submit"]'); submit.disabled = true;
    note.textContent = 'Checking reported occupied dates before sending your enquiry…';
    let snapshot;
    try { if (selected) snapshot = await readSource(selected, {arrival:arrival.value, departure:departure.value}); }
    catch { if (selected) snapshots.delete(selected.slug); }
    finally { busy = false; submit.disabled = false; }
    if (startSignature !== signature()) { changed(); return; }
    const state = explain(snapshot);
    if (state === 'blocked' || state === 'invalid') { form.reportValidity(); return; }
    if (!form.checkValidity()) { form.reportValidity(); return; }
    approved = startSignature;
    form.requestSubmit(submit);
  }, {capture:true});
  changed();
}
