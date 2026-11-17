/* Notifications — generated from the student's real activity (see store.js) */
import '../main.js';
import { EVENTS } from '../data.js';
import {
  getEvent, myNotifications, markRead, markAllRead, myRegistrations, CHANGE_EVENT,
} from '../store.js';
import {
  nowMs, startMs, isPast, dayGroup, relativeTime, formatDateShort, formatTimeRangeSpaced, escapeHtml,
} from '../logic.js';
import { categoryIcon } from '../data.js';
import { initApp, signInPrompt, emptyState, detailUrl, pageUrl } from '../ui.js';

const $ = (id) => document.getElementById(id);
let user = null;
let items = [];
let filter = 'all';

const GROUP_LABEL = { events: 'Events', registration: 'Registration', system: 'System' };
const ICON_STYLE = {
  registration_cancelled: 'bg-red-50 text-red-500',
  event_cancelled: 'bg-red-50 text-red-500',
};
const CHIP_BASE = 'filter-chip shrink-0 rounded-xl border border-transparent px-4 py-2 text-xs font-semibold';

async function load() { items = await myNotifications(user.id); }

function counts() {
  const c = { all: items.length, events: 0, registration: 0, system: 0 };
  items.forEach((n) => { if (c[n.group] !== undefined) c[n.group] += 1; });
  return c;
}

function renderChips() {
  const c = counts();
  $('chips').innerHTML = [['all', 'All'], ['events', 'Events'], ['registration', 'Registration'], ['system', 'System']]
    .map(([id, label]) => {
      const on = filter === id;
      return `<button type="button" role="tab" aria-selected="${on}" data-filter="${id}" class="${CHIP_BASE} ${on ? 'active' : 'text-slate-500'}">${label}<span class="ml-1.5 rounded-full ${on ? 'bg-white/20' : 'bg-slate-100'} px-1.5 py-0.5 text-[10px]">${c[id]}</span></button>`;
    }).join('');
}

function card(n) {
  const unread = !n.read;
  const iconCls = unread ? 'bg-[#6d28d9] text-white shadow-[0_5px_15px_rgba(109,40,217,.2)]' : (ICON_STYLE[n.type] || 'bg-[#f5f3ff] text-[#6d28d9]');
  const href = n.eventId ? detailUrl(n.eventId) : null;
  const wrapOpen = href ? `<a href="${href}" data-nid="${n.id}"` : `<div data-nid="${n.id}"`;
  const wrapClose = href ? '</a>' : '</div>';
  return `
  ${wrapOpen} class="notification-card ${unread ? 'unread border-[#c4b5fd]/50' : 'border-slate-200 bg-white'} relative mb-3 flex gap-4 rounded-2xl border p-5 shadow-card">
    <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconCls}"><span class="material-symbols-outlined" aria-hidden="true">${n.icon}</span></div>
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <h3 class="font-poppins text-sm ${unread ? 'font-semibold' : 'font-medium'} text-[#1f2937]">${escapeHtml(n.title)}</h3>
        ${unread ? '<span class="h-2 w-2 rounded-full bg-[#6d28d9]" aria-label="Unread"></span>' : ''}
      </div>
      <p class="mt-1 text-sm leading-6 text-slate-600">${escapeHtml(n.body)}</p>
      <div class="mt-2 flex items-center gap-2 text-xs font-medium text-slate-400"><span>${escapeHtml(relativeTime(n.createdAt))}</span><span>&bull;</span><span class="text-[#8b5cf6]">${GROUP_LABEL[n.group] || ''}</span></div>
    </div>
  ${wrapClose}`;
}

function renderList() {
  const box = $('notifList');
  const list = items.filter((n) => filter === 'all' || n.group === filter);
  if (!list.length) {
    emptyState(box, {
      icon: 'notifications', title: filter === 'all' ? "You're all caught up" : 'Nothing here yet',
      text: 'Reminders, registration confirmations, and updates will appear here.',
      ctaHref: pageUrl('Explore-Event.html'), ctaLabel: 'Explore Events',
    });
    return;
  }
  const at = nowMs();
  const groups = {};
  list.forEach((n) => { (groups[dayGroup(n.createdAt, at)] ||= []).push(n); });
  box.innerHTML = ['TODAY', 'YESTERDAY', 'EARLIER'].filter((g) => groups[g]).map((g) =>
    `<div class="day-label mb-3 px-1 text-[10px] font-bold text-[#8b5cf6]">${g}</div>${groups[g].map(card).join('')}`).join('');
}

async function renderSide() {
  const at = nowMs();
  const regs = (await myRegistrations(user.id)).filter((r) => r.status === 'registered');
  const next = regs.map((r) => getEvent(r.eventId)).filter((e) => e && !isPast(e, at)).sort((a, b) => startMs(a) - startMs(b))[0];
  const unread = items.filter((n) => !n.read).length;
  const registeredIds = new Set(regs.map((r) => r.eventId));
  const suggestions = EVENTS.filter((e) => !isPast(e, at) && !registeredIds.has(e.id)).sort((a, b) => startMs(a) - startMs(b)).slice(0, 3);

  $('sideCards').innerHTML = `
    <div class="sidebar-card rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div class="mb-4 flex items-center justify-between">
        <div><h3 class="font-poppins text-sm font-semibold">Your activity</h3><p class="mt-1 text-xs text-slate-400">At a glance</p></div>
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f3ff] text-[#6d28d9]"><span class="material-symbols-outlined text-[20px]" aria-hidden="true">analytics</span></div>
      </div>
      <dl class="space-y-3 text-sm">
        <div class="flex justify-between"><dt class="text-slate-500">Unread notifications</dt><dd class="font-semibold text-[#6d28d9]">${unread}</dd></div>
        <div class="flex justify-between"><dt class="text-slate-500">Upcoming registrations</dt><dd class="font-semibold text-[#6d28d9]">${regs.filter((r) => { const e = getEvent(r.eventId); return e && !isPast(e, at); }).length}</dd></div>
      </dl>
    </div>

    <div class="sidebar-card overflow-hidden rounded-2xl border border-[#c4b5fd]/60 bg-[#f5f3ff] p-5 shadow-card">
      <div class="mb-3 flex items-center gap-2">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#6d28d9]"><span class="material-symbols-outlined text-[19px]" aria-hidden="true">event</span></div>
        <div><h3 class="font-poppins text-sm font-bold text-[#6d28d9]">Next up</h3><p class="text-[10px] font-medium uppercase tracking-wider text-[#8b5cf6]">Your next event</p></div>
      </div>
      ${next ? `<p class="text-[13px] leading-6 text-[#1f2937]">${escapeHtml(next.title)}<br><strong>${escapeHtml(formatDateShort(next.date))}</strong>, ${escapeHtml(formatTimeRangeSpaced(next.start, next.end))}, ${escapeHtml(next.location)}.</p>
        <a href="${detailUrl(next.id)}" class="mt-4 block w-full rounded-xl border border-[#6d28d9] bg-white px-4 py-2.5 text-center text-xs font-semibold text-[#6d28d9] transition hover:bg-[#6d28d9] hover:text-white">View event</a>`
      : `<p class="text-[13px] leading-6 text-slate-600">You have no upcoming registrations.</p>
        <a href="${pageUrl('Explore-Event.html')}" class="mt-4 block w-full rounded-xl border border-[#6d28d9] bg-white px-4 py-2.5 text-center text-xs font-semibold text-[#6d28d9] transition hover:bg-[#6d28d9] hover:text-white">Find an event</a>`}
    </div>

    <div class="sidebar-card rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div class="mb-4"><h3 class="font-poppins text-sm font-semibold">Coming up on campus</h3><p class="mt-1 text-xs text-slate-400">Open for registration soon</p></div>
      <div class="space-y-2">
        ${suggestions.length ? suggestions.map((e) => `
        <a href="${detailUrl(e.id)}" class="suggested-event flex items-center gap-3 rounded-xl border border-transparent p-2.5">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f5f3ff] text-[#6d28d9]"><span class="material-symbols-outlined text-[20px]" aria-hidden="true">${categoryIcon(e.category)}</span></div>
          <div class="min-w-0 flex-1"><div class="truncate text-[13px] font-semibold">${escapeHtml(e.title)}</div><div class="mt-0.5 text-[11px] text-slate-400">${escapeHtml(formatDateShort(e.date))} · ${escapeHtml(e.category)}</div></div>
        </a>`).join('') : '<p class="text-xs text-slate-400">No other upcoming events right now.</p>'}
      </div>
      <a href="${pageUrl('Explore-Event.html')}" class="mt-4 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-xs font-semibold text-slate-700 transition hover:border-[#c4b5fd] hover:text-[#6d28d9]">Browse all events</a>
    </div>`;
}

async function refresh() { await load(); renderChips(); renderList(); await renderSide(); }

(async function init() {
  user = await initApp();
  if (!user) {
    $('chips').classList.add('hidden');
    $('sideCards').classList.add('hidden');
    $('markAllRead').classList.add('hidden');
    signInPrompt($('notifList'), { title: 'Sign in to see your notifications', text: 'Reminders, registration confirmations, and updates are saved to your CampPN account.' });
    return;
  }
  await refresh();
  $('chips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-filter]');
    if (b) { filter = b.dataset.filter; renderChips(); renderList(); }
  });
  $('markAllRead').addEventListener('click', async () => { await markAllRead(user.id); await refresh(); });
  // opening a notification marks it as read (the link still navigates)
  $('notifList').addEventListener('click', (e) => {
    const c = e.target.closest('[data-nid]');
    if (c) markRead(user.id, c.dataset.nid);
  });
  window.addEventListener(CHANGE_EVENT, () => refresh());
  window.addEventListener('storage', () => refresh());
})();
