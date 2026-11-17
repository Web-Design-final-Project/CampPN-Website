/* My Events — registrations (Upcoming / Past / Cancelled), QR check-in, calendar, cancel, review */
import '../main.js';
import { getEvent, myRegistrations, cancelRegistration, CHANGE_EVENT } from '../store.js';
import { startMs, endMs, nowMs, formatDateShort, formatTimeRangeSpaced, startsInLabel, escapeHtml } from '../logic.js';
import { categoryIcon } from '../data.js';
import { initApp, toast, errorMessage, showQrModal, downloadICS, signInPrompt, emptyState, detailUrl, pageUrl } from '../ui.js';

const $ = (id) => document.getElementById(id);
let user = null;
let tab = 'upcoming';
let rows = [];

const TAB_ON = 'rounded-lg bg-[#6d28d9] px-4 py-2 text-sm font-semibold text-white';
const TAB_OFF = 'rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-[#f5f3ff] hover:text-[#6d28d9]';

function classify(row, at) {
  if (row.reg.status === 'cancelled') return 'cancelled';
  return at > endMs(row.event) ? 'past' : 'upcoming';
}

async function load() {
  const regs = await myRegistrations(user.id);
  rows = regs.map((reg) => ({ reg, event: getEvent(reg.eventId) })).filter((r) => r.event);
}

function counts(at) {
  const c = { upcoming: 0, past: 0, cancelled: 0 };
  rows.forEach((r) => { c[classify(r, at)] += 1; });
  return c;
}

function badge(kind, row, at) {
  if (kind === 'cancelled') return ['Cancelled', 'bg-rose-500'];
  if (kind === 'past') return [row.reg.checkedInAt ? 'Attended' : 'Completed', 'bg-slate-500'];
  const label = startsInLabel(row.event, at);
  return [label && /tomorrow|hour|min/i.test(label) ? label : 'Registered', 'bg-green-500'];
}

function card(row, at) {
  const { event: e, reg } = row;
  const kind = classify(row, at);
  const [label, color] = badge(kind, row, at);
  const started = at >= startMs(e);
  const actions = [];
  if (kind === 'upcoming') {
    actions.push(`<button type="button" data-qr="${escapeHtml(e.id)}" class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#6d28d9] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#5b21b6]"><span class="material-symbols-outlined text-[16px]" aria-hidden="true">qr_code_2</span>QR check-in</button>`);
    actions.push(`<button type="button" data-cal="${escapeHtml(e.id)}" class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-violet-200 px-4 py-2 text-xs font-semibold text-[#6d28d9] transition hover:bg-[#f5f3ff]"><span class="material-symbols-outlined text-[16px]" aria-hidden="true">event</span>Add to calendar</button>`);
    if (!started) actions.push(`<button type="button" data-cancel="${escapeHtml(e.id)}" class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50">Cancel</button>`);
  }
  if (kind === 'past') {
    actions.push(`<a href="${detailUrl(e.id)}#reviewsSection" class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#6d28d9] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#5b21b6]"><span class="material-symbols-outlined text-[16px]" aria-hidden="true">rate_review</span>Review</a>`);
  }
  actions.push(`<a href="${detailUrl(e.id)}" class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-violet-200 px-4 py-2 text-xs font-semibold text-[#6d28d9] transition hover:bg-[#f5f3ff]">View Details <span class="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span></a>`);
  return `
  <article class="event-card overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm" data-row="${escapeHtml(e.id)}">
    <div class="flex flex-col sm:flex-row">
      <div class="relative h-48 shrink-0 overflow-hidden bg-[#f5f3ff] sm:h-auto sm:w-56">
        <img src="${e.img}" alt="${escapeHtml(e.title)}" loading="lazy" class="event-image h-full w-full object-cover ${kind === 'cancelled' ? 'grayscale' : ''}">
        <span class="absolute left-3 top-3 rounded-full ${color} px-2.5 py-1 text-xs font-semibold text-white shadow-sm">${escapeHtml(label)}</span>
      </div>
      <div class="flex flex-1 flex-col justify-between p-5">
        <div>
          <div class="mb-2 flex items-center gap-2 text-xs font-medium text-[#6d28d9]"><span class="material-symbols-outlined text-[16px]" aria-hidden="true">${categoryIcon(e.category)}</span>${escapeHtml(e.category)}</div>
          <h2 class="font-['Poppins'] text-lg font-bold text-[#1f2937]">${escapeHtml(e.title)}</h2>
          <p class="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">${escapeHtml(e.desc)}</p>
        </div>
        <div class="mt-5 flex flex-col gap-4">
          <div class="flex flex-wrap gap-4 text-xs text-slate-500">
            <span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[17px] text-[#8b5cf6]" aria-hidden="true">calendar_month</span>${escapeHtml(formatDateShort(e.date))} · ${escapeHtml(formatTimeRangeSpaced(e.start, e.end))}</span>
            <span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[17px] text-[#8b5cf6]" aria-hidden="true">location_on</span>${escapeHtml(e.location)}</span>
          </div>
          <div class="flex flex-wrap gap-2">${actions.join('')}</div>
        </div>
      </div>
    </div>
  </article>`;
}

function render() {
  const at = nowMs();
  const c = counts(at);
  document.querySelector('[data-stat="total"]').textContent = String(rows.length);
  document.querySelector('[data-stat="upcoming"]').textContent = String(c.upcoming);
  document.querySelector('[data-stat="past"]').textContent = String(c.past);
  document.querySelector('[data-stat="cancelled"]').textContent = String(c.cancelled);

  $('myTabs').innerHTML = [['upcoming', 'Upcoming'], ['past', 'Past'], ['cancelled', 'Cancelled']]
    .map(([id, label]) => `<button type="button" role="tab" aria-selected="${tab === id}" data-tab="${id}" class="${tab === id ? TAB_ON : TAB_OFF}">${label} <span class="ml-1 text-xs opacity-70">${c[id]}</span></button>`).join('');

  const list = rows.filter((r) => classify(r, at) === tab)
    .sort((a, b) => (tab === 'upcoming' ? startMs(a.event) - startMs(b.event) : startMs(b.event) - startMs(a.event)));
  const box = $('myList');
  if (!list.length) {
    const none = {
      upcoming: ["You haven't joined any events yet.", "Explore CampPN and find an event that's right for you."],
      past: ['No past events yet', 'Events you attended will show up here after they finish.'],
      cancelled: ['No cancelled registrations', 'Registrations you cancel will be listed here.'],
    }[tab];
    emptyState(box, { icon: 'confirmation_number', title: none[0], text: none[1], ctaHref: tab === 'upcoming' ? pageUrl('Explore-Event.html') : undefined, ctaLabel: 'Explore Events' });
    return;
  }
  box.innerHTML = list.map((r) => card(r, at)).join('');
}

async function onClick(e) {
  const t = e.target.closest('[data-tab]');
  if (t) { tab = t.dataset.tab; render(); return; }
  const qr = e.target.closest('[data-qr]');
  const cal = e.target.closest('[data-cal]');
  const cancel = e.target.closest('[data-cancel]');
  try {
    if (qr) {
      const row = rows.find((r) => r.event.id === qr.dataset.qr);
      await showQrModal(row.event, row.reg, user);
    } else if (cal) {
      downloadICS(getEvent(cal.dataset.cal));
      toast('Calendar file downloaded. Open it to add the event.', 'success');
    } else if (cancel) {
      const ev = getEvent(cancel.dataset.cancel);
      if (!window.confirm(`Cancel your registration for "${ev.title}"?`)) return;
      await cancelRegistration(user.id, ev.id);
      toast('Registration cancelled.', 'info');
      await load(); render();
    }
  } catch (err) {
    toast(errorMessage(err), 'error');
  }
}

(async function init() {
  user = await initApp();
  const list = $('myList');
  if (!user) {
    document.querySelectorAll('[data-stat]').forEach((n) => { n.textContent = '0'; });
    $('myTabs').closest('div').classList.add('hidden');
    signInPrompt(list, { title: 'Sign in to see your events', text: 'Your registrations, QR codes, and past events are saved to your CampPN account.' });
    return;
  }
  await load();
  render();
  document.querySelector('main').addEventListener('click', onClick);
  window.addEventListener(CHANGE_EVENT, async (ev) => { if (ev.detail?.kind === 'registration') { await load(); render(); } });
  window.addEventListener('storage', async () => { await load(); render(); });
})();
