/* Explore Events — search, category / date / location / status filters, sort, favorites */
import '../main.js';
import { EVENTS, CATEGORIES } from '../data.js';
import { filterEvents, sortEvents } from '../logic.js';
import { filterContext } from '../store.js';
import { initApp, eventCardHTML, bindFavorites, emptyState } from '../ui.js';

const DEFAULTS = { q: '', category: 'all', date: 'any', location: 'all', status: 'all', sort: 'upcoming' };
const $ = (id) => document.getElementById(id);

const PILL_ON = 'whitespace-nowrap rounded-full bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700';
const PILL_OFF = 'whitespace-nowrap rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-medium text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700';
const RADIO_LABEL = 'flex cursor-pointer items-center gap-3 text-sm text-slate-600';

const state = { ...DEFAULTS };
let user = null;

function readUrl() {
  const p = new URLSearchParams(location.search);
  if (p.get('q')) state.q = p.get('q');
  const cat = p.get('category');
  if (cat && CATEGORIES.some((c) => c.id === cat)) state.category = cat;
  for (const k of ['date', 'location', 'status', 'sort']) if (p.get(k)) state[k] = p.get(k);
}
function writeUrl() {
  const p = new URLSearchParams();
  for (const k of Object.keys(DEFAULTS)) if (state[k] !== DEFAULTS[k]) p.set(k, state[k]);
  const qs = p.toString();
  history.replaceState(null, '', location.pathname + (qs ? `?${qs}` : ''));
}

function buildControls() {
  $('categoryPills').innerHTML = [{ id: 'all', label: 'All Events' }, ...CATEGORIES.map((c) => ({ id: c.id, label: c.id }))]
    .map((c) => `<button type="button" data-cat="${c.id}" class="${PILL_OFF}">${c.label}</button>`).join('');
  $('fCategory').innerHTML = '<option value="all">All Categories</option>' + CATEGORIES.map((c) => `<option value="${c.id}">${c.id}</option>`).join('');
  $('fDate').innerHTML = [['any', 'Any Date'], ['today', 'Today'], ['week', 'This Week'], ['month', 'This Month'], ['nextmonth', 'Next Month']]
    .map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  $('fLocation').innerHTML = [['all', 'All Locations'], ['Campus', 'Campus'], ['Auditorium', 'Auditorium'], ['Classroom', 'Classroom'], ['Innovation Hub', 'Innovation Hub'], ['Online', 'Online']]
    .map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  $('fStatus').innerHTML = [['all', 'All events'], ['open', 'Registration Open'], ['upcoming', 'Upcoming'], ['closed', 'Registration Closed'], ['completed', 'Completed']]
    .map(([v, l]) => `<label class="${RADIO_LABEL}"><input type="radio" name="status" value="${v}" class="h-4 w-4 accent-violet-600">${l}</label>`).join('');
  $('sortSelect').innerHTML = [['upcoming', 'Upcoming'], ['newest', 'Newest'], ['popular', 'Popular'], ['oldest', 'Oldest']]
    .map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
}

function syncControls() {
  $('searchInput').value = state.q;
  $('fCategory').value = state.category;
  $('fDate').value = state.date;
  $('fLocation').value = state.location;
  $('sortSelect').value = state.sort;
  document.querySelectorAll('#fStatus input').forEach((r) => { r.checked = r.value === state.status; });
  document.querySelectorAll('#categoryPills [data-cat]').forEach((b) => {
    const on = b.dataset.cat === state.category;
    b.className = on ? PILL_ON : PILL_OFF;
    b.setAttribute('aria-pressed', String(on));
  });
}

function render() {
  const ctx = filterContext();
  const list = sortEvents(filterEvents(EVENTS, state, ctx), state.sort, ctx);
  const grid = $('eventGrid');
  $('resultsCount').textContent = String(list.length);
  $('eventCount').textContent = `${list.length} event${list.length === 1 ? '' : 's'} ${list.length === EVENTS.length ? 'available' : 'found'}`;
  $('resultsTitle').textContent = state.status === 'completed' ? 'Past Events' : 'Events';
  if (!list.length) {
    grid.className = '';
    emptyState(grid, {
      icon: 'search_off', title: 'No events found',
      text: 'Try changing your search or filters.',
      buttonId: 'emptyClear', buttonLabel: 'Clear filters',
    });
    $('emptyClear').addEventListener('click', clearAll);
    return;
  }
  grid.className = 'grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3';
  grid.innerHTML = list.map((e) => eventCardHTML(e, { user })).join('');
}

function update(patch) {
  Object.assign(state, patch);
  syncControls();
  writeUrl();
  render();
}
function clearAll() { update({ ...DEFAULTS }); }

function bind() {
  let timer;
  $('searchInput').addEventListener('input', (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => update({ q: e.target.value.trim() }), 160);
  });
  $('searchInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); update({ q: e.target.value.trim() }); } });
  $('searchBtn').addEventListener('click', () => update({ q: $('searchInput').value.trim() }));
  $('categoryPills').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (b) update({ category: b.dataset.cat });
  });
  $('fCategory').addEventListener('change', (e) => update({ category: e.target.value }));
  $('fDate').addEventListener('change', (e) => update({ date: e.target.value }));
  $('fLocation').addEventListener('change', (e) => update({ location: e.target.value }));
  $('fStatus').addEventListener('change', (e) => { if (e.target.name === 'status') update({ status: e.target.value }); });
  $('sortSelect').addEventListener('change', (e) => update({ sort: e.target.value }));
  $('clearFilters').addEventListener('click', clearAll);
  $('applyFilters').addEventListener('click', () => {
    if (window.matchMedia('(max-width: 1023px)').matches) {
      $('filterPanel').classList.add('hidden');
      $('toggleFilters').setAttribute('aria-expanded', 'false');
    }
  });
  $('toggleFilters').addEventListener('click', () => {
    const open = $('filterPanel').classList.toggle('hidden') === false;
    $('toggleFilters').setAttribute('aria-expanded', String(open));
  });
  bindFavorites($('eventGrid'), () => user);
}

(async function init() {
  user = await initApp();
  buildControls();
  readUrl();
  syncControls();
  bind();
  render();
})();
