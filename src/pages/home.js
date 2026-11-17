/* Home — search, category shortcuts, featured + upcoming events from the shared data */
import '../main.js';
import { EVENTS } from '../data.js';
import { startMs, nowMs, isPast, formatDateShort, formatTimeRangeSpaced, dayNumber, monthShort, escapeHtml } from '../logic.js';
import { filterContext, isFavoriteSync } from '../store.js';
import { initApp, bindFavorites, detailUrl, pageUrl } from '../ui.js';

let user = null;

function featuredCard(e) {
  const saved = isFavoriteSync(user?.id, e.id);
  return `
  <article class="event-card group premium-shadow flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:border-[#c4b5fd] hover:shadow-md">
    <div class="shine relative flex aspect-[1.35/1] items-center justify-center overflow-hidden bg-gradient-to-br from-[#6d28d9] via-[#8b5cf6] to-[#c4b5fd] text-white">
      <span class="absolute left-3 top-3 z-20 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase text-[#6d28d9] shadow-sm transition-transform duration-300 group-hover:scale-105">${escapeHtml(e.category)}</span>
      <button type="button" data-fav="${escapeHtml(e.id)}" aria-pressed="${saved}" aria-label="${saved ? 'Remove from favorites' : 'Add to favorites'}"
        class="favorite-button absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 ${saved ? 'text-[#6d28d9]' : 'text-slate-500'} shadow-sm transition-all duration-300 hover:scale-110 hover:bg-white hover:text-[#6d28d9]">
        <span class="favorite-icon material-symbols-outlined text-[19px]" aria-hidden="true" style="font-variation-settings:'FILL' ${saved ? 1 : 0}">favorite</span>
      </button>
      <img src="${e.img}" alt="${escapeHtml(e.title)}" loading="lazy" class="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
    </div>
    <div class="flex flex-1 flex-col p-5">
      <h3 class="text-lg font-bold text-[#1f2937] transition-colors duration-300 group-hover:text-[#6d28d9]">${escapeHtml(e.title)}</h3>
      <div class="mt-4 space-y-2.5 text-xs text-slate-500">
        <div class="flex items-center gap-2"><span class="material-symbols-outlined text-[17px] text-[#8b5cf6]" aria-hidden="true">calendar_month</span> ${escapeHtml(formatDateShort(e.date))}</div>
        <div class="flex items-center gap-2"><span class="material-symbols-outlined text-[17px] text-[#8b5cf6]" aria-hidden="true">schedule</span> ${escapeHtml(formatTimeRangeSpaced(e.start, e.end))}</div>
        <div class="flex items-center gap-2"><span class="material-symbols-outlined text-[17px] text-[#8b5cf6]" aria-hidden="true">location_on</span> ${escapeHtml(e.location)}</div>
      </div>
      <p class="mt-4 text-xs text-slate-400">Organized by ${escapeHtml(e.organizer)}</p>
      <a href="${detailUrl(e.id)}" class="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-[#f5f3ff] px-4 py-2.5 text-xs font-bold text-[#6d28d9] transition duration-300 group-hover:border-[#6d28d9] group-hover:bg-[#6d28d9] group-hover:text-white">View Details <span class="material-symbols-outlined text-[17px]" aria-hidden="true">arrow_forward</span></a>
    </div>
  </article>`;
}

function upcomingRow(e) {
  return `
  <a href="${detailUrl(e.id)}" class="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-[#c4b5fd] hover:shadow-md">
    <div class="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-[#f5f3ff] text-center">
      <div class="text-xl font-bold leading-none text-[#6d28d9]">${Number(dayNumber(e.date))}</div>
      <div class="mt-1 text-[10px] font-semibold uppercase text-[#8b5cf6]">${monthShort(e.date)}</div>
    </div>
    <div class="min-w-0 flex-1">
      <div class="truncate text-sm font-bold text-[#1f2937]">${escapeHtml(e.title)}</div>
      <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
        <span class="rounded-full bg-[#f5f3ff] px-2 py-1 font-semibold text-[#6d28d9]">${escapeHtml(e.category)}</span>
        <span>${escapeHtml(formatTimeRangeSpaced(e.start, e.end))}</span><span>&bull;</span><span>${escapeHtml(e.location)}</span>
      </div>
    </div>
    <span class="material-symbols-outlined text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#6d28d9]" aria-hidden="true">arrow_forward</span>
  </a>`;
}

function goSearch(q) {
  const term = (q || '').trim();
  location.href = pageUrl('Explore-Event.html', term ? { q: term } : undefined);
}

(async function init() {
  user = await initApp();
  const ctx = filterContext();
  const at = nowMs();
  const upcoming = EVENTS.filter((e) => !isPast(e, at));

  // Featured = most popular upcoming events
  const featured = [...upcoming].sort((a, b) => ctx.registeredFor(b) - ctx.registeredFor(a)).slice(0, 4);
  const fg = document.getElementById('featuredGrid');
  fg.innerHTML = featured.length ? featured.map(featuredCard).join('') : '<p class="col-span-full text-sm text-slate-500">No upcoming events right now. Check back soon.</p>';

  const soon = [...upcoming].sort((a, b) => startMs(a) - startMs(b)).slice(0, 4);
  document.getElementById('upcomingList').innerHTML = soon.length ? soon.map(upcomingRow).join('') : '<p class="text-sm text-slate-500">No upcoming events right now. Check back soon.</p>';

  bindFavorites(fg, () => user);

  const input = document.getElementById('homeSearchInput');
  document.getElementById('homeSearchBtn').addEventListener('click', () => goSearch(input.value));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); goSearch(input.value); } });
})();
