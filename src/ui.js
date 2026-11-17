/* =====================================================================
   CampPN — shared UI helpers used by every page
   (one CampPN: same header, cards, toasts and modals everywhere)
   ===================================================================== */

import QRCode from 'qrcode';
import {
  currentUser, signOut, toggleFavorite, isFavoriteSync, unreadCountSync, syncReminders,
  seatsFor, statusFor, AuthError, CHANGE_EVENT,
} from './store.js';
import {
  escapeHtml, initials, STATUS_LABEL, STATUS_DOT, formatDateShort, formatTimeRange,
  qrPayload, toICS,
} from './logic.js';

/* ---------- paths ---------- */

/** Folder that contains the app pages, relative to the current document ('./page/' on Home, './' inside /page). */
export function pageBase() {
  const a = document.querySelector('a[href$="Join-Us.html"]');
  if (a) return a.getAttribute('href').replace(/Join-Us\.html.*$/, '');
  return location.pathname.includes('/page/') ? './' : './page/';
}
export const homeHref = () => (pageBase() === './' ? '../index.html' : './index.html');
export const pageUrl = (file, params) => {
  const q = params ? `?${new URLSearchParams(params).toString()}` : '';
  return `${pageBase()}${file}${q}`;
};
export const detailUrl = (id) => pageUrl('Event-Detail.html', { id });

export function goToLogin(note) {
  const params = { next: location.pathname + location.search };
  if (note) params.note = note;
  location.href = pageUrl('Join-Us.html', params);
}

/** Only allow same-site relative redirects after sign-in (prevents open redirects). */
export function safeNext(value) {
  if (!value || typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  return value;
}

/* ---------- toast ---------- */

let toastWrap;
export function toast(message, type = 'info') {
  if (!toastWrap) {
    toastWrap = document.createElement('div');
    toastWrap.setAttribute('role', 'status');
    toastWrap.setAttribute('aria-live', 'polite');
    toastWrap.className = 'pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-8';
    document.body.appendChild(toastWrap);
  }
  const palette = { success: 'bg-emerald-600', error: 'bg-rose-600', info: 'bg-slate-900' }[type] || 'bg-slate-900';
  const icon = { success: 'check_circle', error: 'error', info: 'info' }[type] || 'info';
  const el = document.createElement('div');
  el.className = `pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl ${palette} px-4 py-3 text-sm font-medium text-white shadow-xl transition duration-300`;
  el.style.opacity = '0';
  el.style.transform = 'translateY(8px)';
  el.innerHTML = `<span class="material-symbols-outlined text-[20px]" aria-hidden="true">${icon}</span><span></span>`;
  el.lastElementChild.textContent = message;
  toastWrap.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'none'; });
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3800);
}

export function errorMessage(err) {
  return err instanceof AuthError ? err.message : 'Something went wrong. Please try again.';
}

/* ---------- modal ---------- */

export function openModal({ title, html, labelledBy = 'campn-modal-title', onClose }) {
  const previouslyFocused = document.activeElement;
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[90] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4';
  overlay.innerHTML = `
    <div role="dialog" aria-modal="true" aria-labelledby="${labelledBy}"
      class="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:max-w-md sm:rounded-3xl">
      <button type="button" data-close aria-label="Close"
        class="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200">
        <span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
      </button>
      <h2 id="${labelledBy}" class="pr-10 font-['Poppins'] text-lg font-bold text-[#1f2937]">${escapeHtml(title)}</h2>
      <div data-body class="mt-4">${html}</div>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const onKey = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const f = overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      const first = f[0]; const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  function close() {
    overlay.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
    if (onClose) onClose();
  }
  overlay.addEventListener('click', (e) => { if (e.target === overlay || e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', onKey);
  overlay.querySelector('[data-close]').focus();
  return { close, root: overlay, body: overlay.querySelector('[data-body]') };
}

/* ---------- QR check-in ---------- */

export async function qrDataUrl(text) {
  return QRCode.toDataURL(text, { width: 260, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1f2937', light: '#ffffff' } });
}

export async function showQrModal(event, reg, user) {
  const dataUrl = await qrDataUrl(qrPayload(reg));
  openModal({
    title: 'Your check-in QR code',
    html: `
      <div class="text-center">
        <p class="text-sm font-semibold text-[#6d28d9]">${escapeHtml(event.title)}</p>
        <p class="mt-1 text-xs text-slate-500">${escapeHtml(formatDateShort(event.date))} · ${escapeHtml(formatTimeRange(event.start, event.end))} · ${escapeHtml(event.location)}</p>
        <div class="mx-auto mt-5 w-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <img data-qr src="${dataUrl}" alt="QR code for ${escapeHtml(event.title)}" width="240" height="240" class="h-60 w-60" />
        </div>
        <p class="mt-4 text-sm font-semibold text-[#1f2937]">${escapeHtml(user.fullName || user.email)}</p>
        <p class="text-xs text-slate-400">${escapeHtml(user.email)}</p>
        <p class="mt-4 rounded-xl bg-[#f5f3ff] px-4 py-3 text-xs leading-5 text-slate-600">Show this QR code at the event entrance. Each code is unique to your registration.</p>
      </div>`,
  });
}

/* ---------- calendar ---------- */

export function downloadICS(event) {
  const blob = new Blob([toICS(event)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.id}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- stars / avatar ---------- */

export function starsHTML(value, size = 18) {
  const full = Math.round(value);
  return Array.from({ length: 5 }, (_, i) =>
    `<span class="material-symbols-outlined ${i < full ? 'text-amber-400' : 'text-slate-300'}" style="font-size:${size}px;font-variation-settings:'FILL' ${i < full ? 1 : 0}" aria-hidden="true">star</span>`).join('');
}

export function avatarHTML(user, size = 'h-10 w-10', text = 'text-sm') {
  if (user.avatar) return `<img src="${user.avatar}" alt="" class="${size} rounded-xl object-cover" />`;
  return `<span class="flex ${size} items-center justify-center rounded-xl bg-violet-100 ${text} font-bold text-violet-700" aria-hidden="true">${escapeHtml(initials(user.fullName || user.email))}</span>`;
}

/* ---------- event card (same markup/design as the Explore page) ---------- */

export function eventCardHTML(event, { user, detailHref } = {}) {
  const st = statusFor(event);
  const seats = seatsFor(event);
  const saved = isFavoriteSync(user?.id, event.id);
  const low = st === 'open' && seats.remaining > 0 && seats.remaining <= 10;
  const label = STATUS_LABEL[st] + (low ? ` · ${seats.remaining} left` : '');
  return `
  <article class="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-card-hover" data-event-card="${escapeHtml(event.id)}">
    <div class="relative h-48 overflow-hidden bg-violet-50">
      <img src="${event.img}" alt="${escapeHtml(event.title)}" loading="lazy" class="h-full w-full object-cover transition duration-500 group-hover:scale-105">
      <div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent"></div>
      <span class="absolute left-3 top-3 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-violet-700 shadow-sm">${escapeHtml(event.category)}</span>
      <button type="button" data-fav="${escapeHtml(event.id)}" aria-pressed="${saved}" aria-label="${saved ? 'Remove from favorites' : 'Add to favorites'}"
        class="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 ${saved ? 'text-violet-600' : 'text-slate-500'} shadow-sm backdrop-blur transition hover:bg-violet-50 hover:text-violet-600">
        <span class="material-symbols-outlined text-[19px]" aria-hidden="true" style="font-variation-settings:'FILL' ${saved ? 1 : 0}">favorite</span>
      </button>
      <span class="absolute bottom-3 left-3 flex items-center gap-1.5 text-[11px] font-semibold text-white">
        <span class="h-1.5 w-1.5 rounded-full ${STATUS_DOT[st]}"></span>${escapeHtml(label)}
      </span>
    </div>
    <div class="p-5">
      <h3 class="font-['Poppins'] text-lg font-bold leading-snug text-slate-900 transition-colors duration-300 group-hover:text-[#6d28d9]">${escapeHtml(event.title)}</h3>
      <p class="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">${escapeHtml(event.desc)}</p>
      <div class="mt-4 space-y-2.5 border-t border-slate-100 pt-4">
        <div class="flex items-center gap-2.5 text-xs text-slate-500"><span class="material-symbols-outlined text-[18px] text-violet-600" aria-hidden="true">calendar_today</span>${escapeHtml(formatDateShort(event.date))} · ${escapeHtml(formatTimeRange(event.start, event.end))}</div>
        <div class="flex items-center gap-2.5 text-xs text-slate-500"><span class="material-symbols-outlined text-[18px] text-violet-600" aria-hidden="true">location_on</span>${escapeHtml(event.location)}</div>
      </div>
      <div class="mt-4 flex items-center justify-between">
        <p class="text-[11px] font-semibold text-slate-500">${escapeHtml(event.organizer)}</p>
        <a href="${detailHref || detailUrl(event.id)}" class="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-violet-700">Details<span class="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span></a>
      </div>
    </div>
  </article>`;
}

/** Delegated favorites handler. `getUser` returns the signed-in user (or null). */
export function bindFavorites(root, getUser, onChange) {
  root.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-fav]');
    if (!btn || !root.contains(btn)) return;
    e.preventDefault();
    const user = getUser();
    if (!user) { toast('Sign in to save events.', 'info'); setTimeout(() => goToLogin('Sign in to save events.'), 700); return; }
    try {
      const saved = await toggleFavorite(user.id, btn.dataset.fav);
      btn.setAttribute('aria-pressed', String(saved));
      btn.setAttribute('aria-label', saved ? 'Remove from favorites' : 'Add to favorites');
      btn.classList.toggle('text-violet-600', saved);
      btn.classList.toggle('text-[#6d28d9]', saved);
      btn.classList.toggle('text-slate-500', !saved);
      btn.querySelector('.material-symbols-outlined').style.fontVariationSettings = `'FILL' ${saved ? 1 : 0}`;
      toast(saved ? 'Saved to favorites' : 'Removed from favorites', 'success');
      if (onChange) onChange(btn.dataset.fav, saved);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  });
}

/* ---------- header (auth menu, favorites link, notification badge) ---------- */

function renderUserMenu(slot, user) {
  const wrap = document.createElement('div');
  wrap.className = 'relative';
  wrap.setAttribute('data-user-menu', '');
  wrap.innerHTML = `
    <button type="button" aria-haspopup="menu" aria-expanded="false" aria-label="Account menu"
      class="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white pl-1 pr-2.5 text-slate-600 transition hover:border-violet-200 hover:bg-violet-50">
      ${avatarHTML(user, 'h-8 w-8', 'text-xs')}
      <span class="material-symbols-outlined text-[18px]" aria-hidden="true">expand_more</span>
    </button>
    <div role="menu" hidden class="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
      <div class="px-3 py-2.5">
        <p class="truncate font-['Poppins'] text-sm font-bold text-[#1f2937]">${escapeHtml(user.fullName || 'Student')}</p>
        <p class="truncate text-xs text-slate-400">${escapeHtml(user.email)}</p>
      </div>
      <div class="my-1 border-t border-slate-100"></div>
      <a role="menuitem" href="${pageUrl('Profile.html')}" class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-violet-50 hover:text-violet-700"><span class="material-symbols-outlined text-[19px]" aria-hidden="true">person</span>Profile</a>
      <a role="menuitem" href="${pageUrl('My-Event.html')}" class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-violet-50 hover:text-violet-700"><span class="material-symbols-outlined text-[19px]" aria-hidden="true">confirmation_number</span>My Events</a>
      <a role="menuitem" href="${pageUrl('Favorites.html')}" class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-violet-50 hover:text-violet-700"><span class="material-symbols-outlined text-[19px]" aria-hidden="true">favorite</span>Favorites</a>
      <div class="my-1 border-t border-slate-100"></div>
      <button type="button" role="menuitem" data-signout class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"><span class="material-symbols-outlined text-[19px]" aria-hidden="true">logout</span>Sign out</button>
    </div>`;
  slot.replaceWith(wrap);

  const btn = wrap.querySelector('button[aria-haspopup]');
  const menu = wrap.querySelector('[role="menu"]');
  const close = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) menu.querySelector('a')?.focus();
  });
  document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { close(); btn.focus(); } });
  wrap.querySelector('[data-signout]').addEventListener('click', async () => {
    await signOut();
    toast('You have been signed out.', 'info');
    setTimeout(() => { location.href = homeHref(); }, 500);
  });
}

function updateBadge(user) {
  const bell = document.querySelector('header a[aria-label^="Notifications"]');
  if (!bell) return;
  const count = unreadCountSync(user?.id);
  let badge = bell.querySelector('[data-notif-badge]');
  if (!badge) {
    // the page ships a static dot — replace it with a real unread badge
    bell.querySelectorAll('span.rounded-full').forEach((s) => s.remove());
    badge = document.createElement('span');
    badge.setAttribute('data-notif-badge', '');
    bell.appendChild(badge);
  }
  if (count > 0) {
    badge.className = 'absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white ring-2 ring-white';
    badge.textContent = count > 9 ? '9+' : String(count);
    bell.setAttribute('aria-label', `Notifications, ${count} unread`);
    badge.hidden = false;
  } else {
    badge.hidden = true;
    bell.setAttribute('aria-label', 'Notifications');
  }
}

/** Call once per page. Returns the signed-in user (or null). */
export async function initApp() {
  const user = await currentUser();
  const slot = document.querySelector('header a[href$="Join-Us.html"]');
  if (user && slot) renderUserMenu(slot, user);
  if (user) await syncReminders(user.id);
  updateBadge(user);
  window.addEventListener(CHANGE_EVENT, () => updateBadge(user));
  window.addEventListener('storage', () => updateBadge(user));
  return user;
}

/* ---------- empty / sign-in states ---------- */

function stateCard({ icon, title, text, action }) {
  return `
    <div class="rounded-3xl border border-dashed border-violet-200 bg-white px-6 py-14 text-center">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5f3ff] text-[#6d28d9]"><span class="material-symbols-outlined text-[28px]" aria-hidden="true">${icon}</span></div>
      <h2 class="mt-4 font-['Poppins'] text-xl font-bold text-[#1f2937]">${escapeHtml(title)}</h2>
      <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">${escapeHtml(text)}</p>
      ${action || ''}
    </div>`;
}
const CTA_CLASS = 'mt-6 inline-flex items-center gap-2 rounded-xl bg-[#6d28d9] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#5b21b6]';

export function signInPrompt(container, { title, text }) {
  const href = pageUrl('Join-Us.html', { next: location.pathname + location.search });
  container.innerHTML = stateCard({ icon: 'lock', title, text, action: `<a href="${href}" class="${CTA_CLASS}">Sign in or create account</a>` });
}

export function emptyState(container, { icon, title, text, ctaHref, ctaLabel, buttonId, buttonLabel }) {
  let action = '';
  if (ctaHref) action = `<a href="${ctaHref}" class="${CTA_CLASS}">${escapeHtml(ctaLabel)}</a>`;
  else if (buttonId) action = `<button type="button" id="${buttonId}" class="${CTA_CLASS}">${escapeHtml(buttonLabel)}</button>`;
  container.innerHTML = stateCard({ icon, title, text, action });
}
