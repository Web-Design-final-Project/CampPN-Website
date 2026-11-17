/* Event Detail — loads ?id=…, handles register / cancel / QR / calendar / favorite / reviews */
import '../main.js';
import { EVENTS, categoryIcon } from '../data.js';
import {
  startMs, deadlineOf, nowMs, formatDateLong, formatDateShort, formatTimeRangeFull,
  weekday, monthShort, dayNumber, STATUS_LABEL, initials, escapeHtml, googleCalendarUrl, isPast,
} from '../logic.js';
import {
  seatsFor, statusFor, locationTypeOf, registrationFor, register, cancelRegistration,
  isFavoriteSync, toggleFavorite, reviewsFor, ratingSummary, reviewEligibility, saveReview, deleteReview,
  CHANGE_EVENT,
} from '../store.js';
import {
  initApp, toast, errorMessage, goToLogin, showQrModal, downloadICS, starsHTML, detailUrl, pageUrl,
  emptyState,
} from '../ui.js';

const $ = (id) => document.getElementById(id);
let user = null;
let event = null;

function setBind(key, value) {
  document.querySelectorAll(`[data-bind="${key}"]`).forEach((el) => { el.textContent = value; });
}

/* ---------- static fields ---------- */

function fillStatic() {
  const seats = seatsFor(event);
  const st = statusFor(event);
  document.title = `${event.title} — CampPN`;

  const cover = $('evCover');
  cover.src = event.img;
  cover.alt = event.title;

  setBind('categoryIcon', categoryIcon(event.category));
  setBind('category', event.category);
  setBind('month', monthShort(event.date));
  setBind('day', dayNumber(event.date));
  setBind('weekday', weekday(event.date));
  setBind('timeRange', formatTimeRangeFull(event.start, event.end));
  setBind('title', event.title);
  setBind('summary', event.desc);
  setBind('dateLong', formatDateLong(event.date));
  setBind('location', event.location);
  setBind('organizer', event.organizer);
  setBind('initials', initials(event.organizer));
  setBind('organizerBlurb', event.organizerBlurb);
  setBind('entry', event.entry);
  setBind('language', event.language);
  setBind('audience', event.audience);
  setBind('address', event.address);
  setBind('locationIntro', 'Join us at the following location.');
  setBind('venueTypeLabel', 'Venue type');
  setBind('venueType', locationTypeOf(event));

  // registration deadline replaces the old static "Certificate" row
  setBind('deadlineIcon', 'event_busy');
  setBind('deadlineLabel', 'Registration deadline');
  const dl = new Date(deadlineOf(event) + 7 * 3600 * 1000);
  setBind('deadlineText', `${formatDateShort(dl.toISOString().slice(0, 10))}, 11:59 PM`);

  // status chip (text, spots, colours)
  setBind('statusText', STATUS_LABEL[st]);
  setBind('spots', st === 'completed' ? 'Event finished' : seats.remaining === 0 ? 'No seats left' : `${seats.remaining} spot${seats.remaining === 1 ? '' : 's'} remaining`);
  const chip = document.querySelector('[data-bind="statusText"]')?.closest('span.inline-flex');
  if (chip) {
    const tone = { open: null, ongoing: null, full: 'amber', closed: 'amber', completed: 'slate' }[st];
    if (tone) {
      chip.classList.remove('bg-[#f5f3ff]', 'text-[#6d28d9]');
      chip.classList.add(tone === 'amber' ? 'bg-amber-50' : 'bg-slate-100', tone === 'amber' ? 'text-amber-700' : 'text-slate-600');
    }
  }

  setBind('percent', `${seats.percent}%`);
  setBind('seatsText', `${seats.registered} of ${seats.capacity} seats registered`);
  $('seatBar').style.width = `${seats.percent}%`;

  $('directionsLink').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location + ', Phnom Penh, Cambodia')}`;

  $('aboutBody').innerHTML = event.about.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
  $('learnList').innerHTML = event.learn.map((l) => `
    <div class="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <span class="material-symbols-outlined mt-0.5 text-[20px] text-[#6d28d9]" aria-hidden="true">check</span>
      <span class="text-sm font-medium text-[#1f2937]">${escapeHtml(l)}</span>
    </div>`).join('');
}

/* ---------- registration / CTA ---------- */

const BTN_PRIMARY = "flex w-full items-center justify-center gap-2 rounded-xl bg-[#6d28d9] px-5 py-3.5 font-['Poppins'] text-sm font-bold text-white shadow-sm transition hover:bg-[#5b21b6] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60";
const BTN_SECONDARY = "flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#c4b5fd] hover:bg-[#f5f3ff] hover:text-[#6d28d9]";
const BTN_DANGER = 'flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-5 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50';

async function renderCta() {
  const area = $('ctaArea');
  const st = statusFor(event);
  const reg = user ? await registrationFor(user.id, event.id) : null;
  const registered = reg && reg.status === 'registered';
  const saved = isFavoriteSync(user?.id, event.id);

  const saveBtn = `
    <button type="button" data-action="save" aria-pressed="${saved}" class="${BTN_SECONDARY}">
      <span class="material-symbols-outlined text-[20px]" aria-hidden="true" style="font-variation-settings:'FILL' ${saved ? 1 : 0}">${saved ? 'bookmark_added' : 'bookmark_border'}</span>
      ${saved ? 'Saved' : 'Save Event'}
    </button>`;

  let main = '';
  if (registered) {
    const finished = st === 'completed';
    main = `
      <div class="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3" role="status">
        <span class="material-symbols-outlined text-[22px] text-emerald-600" aria-hidden="true">check_circle</span>
        <div><p class="text-sm font-bold text-emerald-800">${finished ? 'You were registered' : 'Registration confirmed'}</p>
        <p class="text-xs text-emerald-700">${finished ? 'Thanks for joining. Share your feedback below.' : 'Your QR code is ready for check-in.'}</p></div>
      </div>
      ${finished ? `<a href="#reviewsSection" class="${BTN_PRIMARY}"><span class="material-symbols-outlined text-[20px]" aria-hidden="true">rate_review</span>Write a review</a>` : `
      <button type="button" data-action="qr" class="${BTN_PRIMARY}"><span class="material-symbols-outlined text-[20px]" aria-hidden="true">qr_code_2</span>Show QR code</button>
      <button type="button" data-action="calendar" class="${BTN_SECONDARY}"><span class="material-symbols-outlined text-[20px]" aria-hidden="true">event</span>Add to calendar (.ics)</button>
      <a href="${googleCalendarUrl(event)}" target="_blank" rel="noopener" class="block text-center text-xs font-semibold text-[#6d28d9] hover:underline">Open in Google Calendar</a>`}
      ${(!finished && st !== 'ongoing') ? `<button type="button" data-action="cancel" class="${BTN_DANGER}"><span class="material-symbols-outlined text-[20px]" aria-hidden="true">event_busy</span>Cancel registration</button>` : ''}`;
  } else if (st === 'open') {
    main = user
      ? `<button type="button" data-action="register" class="${BTN_PRIMARY}"><span class="material-symbols-outlined text-[20px]" aria-hidden="true">how_to_reg</span>Register for Event</button>`
      : `<button type="button" data-action="login" class="${BTN_PRIMARY}"><span class="material-symbols-outlined text-[20px]" aria-hidden="true">login</span>Sign in to register</button>
         <p class="text-center text-xs text-slate-400">Free CampPN account needed. It takes less than a minute.</p>`;
  } else {
    const reason = { full: 'This event is fully booked', closed: 'Registration is closed', ongoing: 'This event is happening now', completed: 'This event has finished' }[st];
    main = `<button type="button" disabled class="${BTN_PRIMARY}"><span class="material-symbols-outlined text-[20px]" aria-hidden="true">block</span>${reason}</button>`;
  }

  const remind = (!registered && st === 'open') || (registered && st !== 'completed')
    ? `<div class="flex items-start gap-3 rounded-2xl bg-[#f5f3ff] p-4"><span class="material-symbols-outlined mt-0.5 text-[20px] text-[#6d28d9]" aria-hidden="true">notifications_active</span>
       <div><p class="text-sm font-bold text-[#1f2937]">${registered ? 'Reminders are on' : "Don't miss it"}</p>
       <p class="mt-0.5 text-xs leading-5 text-slate-500">${registered ? "We'll remind you before the event starts." : 'Register to get reminders before the event starts.'}</p></div></div>`
    : '';

  area.innerHTML = `<div class="space-y-3">${main}${saveBtn}${remind}</div>`;
}

let busy = false;
async function onCtaClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn || busy) return;
  const action = btn.dataset.action;
  try {
    if (action === 'login') { goToLogin('Sign in to register for this event.'); return; }
    if (action === 'calendar') { downloadICS(event); toast('Calendar file downloaded. Open it to add the event.', 'success'); return; }
    if (action === 'qr') {
      const reg = await registrationFor(user.id, event.id);
      await showQrModal(event, reg, user);
      return;
    }
    busy = true;
    btn.disabled = true;
    if (action === 'register') {
      const reg = await register(user.id, event.id);
      toast('You are registered! Your QR code is ready.', 'success');
      await refresh();
      await showQrModal(event, reg, user);
    } else if (action === 'cancel') {
      if (!window.confirm('Cancel your registration for this event?')) { btn.disabled = false; busy = false; return; }
      await cancelRegistration(user.id, event.id);
      toast('Registration cancelled.', 'info');
      await refresh();
    } else if (action === 'save') {
      if (!user) { goToLogin('Sign in to save events.'); return; }
      const saved = await toggleFavorite(user.id, event.id);
      toast(saved ? 'Saved to favorites' : 'Removed from favorites', 'success');
      await renderCta();
    }
  } catch (err) {
    toast(errorMessage(err), 'error');
    await refresh();
  } finally {
    busy = false;
  }
}

/* ---------- reviews ---------- */

let draftRating = 0;

function reviewItem(r) {
  const mine = user && r.userId === user.id;
  return `
  <article class="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5">
    <div class="flex items-start gap-3">
      <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-sm font-bold text-violet-700" aria-hidden="true">${escapeHtml(initials(r.userName))}</span>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p class="text-sm font-bold text-[#1f2937]">${escapeHtml(r.userName)}${mine ? ' <span class="ml-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">You</span>' : ''}</p>
          <span class="flex" role="img" aria-label="${r.rating} out of 5 stars">${starsHTML(r.rating, 16)}</span>
          <span class="text-xs text-slate-400">${escapeHtml(formatDateShort(r.createdAt.slice(0, 10)))}</span>
        </div>
        ${r.comment ? `<p class="mt-2 text-sm leading-6 text-slate-600">${escapeHtml(r.comment)}</p>` : ''}
      </div>
    </div>
  </article>`;
}

async function renderReviews() {
  const summary = ratingSummary(event.id);
  $('ratingSummary').innerHTML = summary.count
    ? `<div class="text-right"><p class="font-['Poppins'] text-3xl font-bold text-[#1f2937]">${summary.average.toFixed(1)}</p><p class="text-xs text-slate-400">${summary.count} review${summary.count === 1 ? '' : 's'}</p></div><div class="flex" role="img" aria-label="Average rating ${summary.average} out of 5">${starsHTML(summary.average, 22)}</div>`
    : '<p class="text-sm text-slate-400">No reviews yet</p>';

  const list = reviewsFor(event.id);
  $('reviewList').innerHTML = list.length ? list.map(reviewItem).join('') : '<p class="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">Be the first to share how this event went.</p>';

  const form = $('reviewForm');
  const elig = await reviewEligibility(user?.id, event.id);
  if (!elig.ok) {
    const msg = {
      signin: 'Sign in to leave a review.',
      'not-registered': 'Only students who registered for this event can review it.',
      'not-finished': 'You can leave a review after the event finishes.',
    }[elig.reason] || '';
    form.innerHTML = msg ? `<p class="flex items-center gap-2 rounded-xl bg-[#f5f3ff] px-4 py-3 text-sm text-slate-600"><span class="material-symbols-outlined text-[20px] text-[#6d28d9]" aria-hidden="true">info</span>${msg}</p>` : '';
    return;
  }
  const existing = elig.existing;
  if (existing && !draftRating) draftRating = existing.rating;
  form.innerHTML = `
    <form id="reviewFormEl" novalidate class="rounded-2xl border border-violet-100 bg-[#faf9ff] p-4 sm:p-5">
      <p class="text-sm font-bold text-[#1f2937]">${existing ? 'Update your review' : 'Rate this event'}</p>
      <div class="mt-3 flex gap-1" role="radiogroup" aria-label="Your rating">
        ${[1, 2, 3, 4, 5].map((n) => `<button type="button" role="radio" aria-checked="${draftRating === n}" aria-label="${n} star${n > 1 ? 's' : ''}" data-star="${n}" class="rounded-lg p-1 transition hover:scale-110"><span class="material-symbols-outlined text-[30px] ${n <= draftRating ? 'text-amber-400' : 'text-slate-300'}" style="font-variation-settings:'FILL' ${n <= draftRating ? 1 : 0}" aria-hidden="true">star</span></button>`).join('')}
      </div>
      <label for="reviewComment" class="mt-4 block text-xs font-semibold text-slate-500">Comment (optional)</label>
      <textarea id="reviewComment" rows="3" maxlength="500" class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#6d28d9] focus:ring-4 focus:ring-violet-100" placeholder="What did you like? What could be better?">${escapeHtml(existing?.comment || '')}</textarea>
      <p id="reviewError" role="alert" hidden class="mt-2 text-sm text-rose-600"></p>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" class="rounded-xl bg-[#6d28d9] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#5b21b6]">${existing ? 'Update review' : 'Submit review'}</button>
        ${existing ? '<button type="button" data-delete-review class="text-sm font-semibold text-rose-600 hover:underline">Delete my review</button>' : ''}
      </div>
    </form>`;
}

function bindReviews() {
  $('reviewForm').addEventListener('click', async (e) => {
    const star = e.target.closest('[data-star]');
    if (star) { draftRating = Number(star.dataset.star); await renderReviews(); $('reviewForm').querySelector(`[data-star="${draftRating}"]`)?.focus(); return; }
    if (e.target.closest('[data-delete-review]')) {
      if (!window.confirm('Delete your review?')) return;
      await deleteReview(user.id, event.id);
      draftRating = 0;
      toast('Review deleted.', 'info');
      await renderReviews();
    }
  });
  $('reviewForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('reviewError');
    err.hidden = true;
    try {
      await saveReview(user.id, event.id, draftRating, $('reviewComment').value);
      toast('Thanks for your feedback!', 'success');
      await renderReviews();
    } catch (ex) {
      err.textContent = errorMessage(ex);
      err.hidden = false;
    }
  });
}

/* ---------- related events ---------- */

function renderRelated() {
  const at = nowMs();
  const others = EVENTS.filter((e) => e.id !== event.id && !isPast(e, at));
  const same = others.filter((e) => e.category === event.category);
  const rest = others.filter((e) => e.category !== event.category).sort((a, b) => startMs(a) - startMs(b));
  const picks = [...same, ...rest].slice(0, 3);
  $('relatedList').innerHTML = picks.map((e) => `
    <a href="${detailUrl(e.id)}" class="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#c4b5fd] hover:shadow-md">
      <div class="h-36 w-full overflow-hidden"><img src="${e.img}" alt="${escapeHtml(e.title)}" class="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" /></div>
      <div class="p-5">
        <span class="text-xs font-semibold text-[#6d28d9]">${escapeHtml(e.category)}</span>
        <h3 class="mt-2 font-['Poppins'] font-bold text-[#1f2937]">${escapeHtml(e.title)}</h3>
        <div class="mt-4 flex items-center gap-2 text-xs text-slate-500"><span class="material-symbols-outlined text-[17px]" aria-hidden="true">calendar_month</span>${escapeHtml(formatDateLong(e.date))}</div>
      </div>
    </a>`).join('') || '<p class="text-sm text-slate-500">More events are coming soon.</p>';
}

/* ---------- init ---------- */

async function refresh() {
  fillStatic();
  await renderCta();
  await renderReviews();
}

(async function init() {
  user = await initApp();
  const id = new URLSearchParams(location.search).get('id');
  event = EVENTS.find((e) => e.id === id) || null;
  if (!event) {
    const main = document.querySelector('main');
    main.innerHTML = '<div class="mx-auto max-w-3xl px-6 py-20"></div>';
    emptyState(main.firstElementChild, {
      icon: 'event_busy', title: 'Event not found',
      text: 'This event may have been removed or the link is incorrect.',
      ctaHref: pageUrl('Explore-Event.html'), ctaLabel: 'Browse all events',
    });
    document.title = 'Event not found — CampPN';
    return;
  }
  renderRelated();
  await refresh();
  $('ctaArea').addEventListener('click', onCtaClick);
  bindReviews();
  window.addEventListener(CHANGE_EVENT, async (ev) => {
    if (ev.detail?.kind === 'auth') location.reload();
  });
  window.addEventListener('storage', () => refresh());
})();
