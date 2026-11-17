/* =====================================================================
   CampPN — pure logic (no DOM, no storage). Safe to unit test in Node.
   All event times are Phnom Penh local time (UTC+7, no daylight saving),
   so status calculations are correct whatever timezone the browser is in.
   ===================================================================== */

export const TZ_OFFSET_HOURS = 7;

/** Current time in ms. Can be overridden for demos/tests with globalThis.__CAMPPN_NOW__. */
export function nowMs() {
  if (typeof globalThis !== 'undefined' && globalThis.__CAMPPN_NOW__ != null) {
    const v = globalThis.__CAMPPN_NOW__;
    return typeof v === 'number' ? v : new Date(v).getTime();
  }
  return Date.now();
}

function utcFromLocal(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  return Date.UTC(y, m - 1, d, hh - TZ_OFFSET_HOURS, mm, 0);
}

export const startMs = (e) => utcFromLocal(e.date, e.start);
export const endMs = (e) => utcFromLocal(e.date, e.end);

/** Registration closes at 23:59 (local) the day before the event: 00:00 on the event day minus 1 minute. */
export function deadlineOf(e) {
  return utcFromLocal(e.date, '00:00') - 60 * 1000;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parts(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { y, m, d, dow };
}

export function formatDateShort(dateStr) {
  const { y, m, d } = parts(dateStr);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}
export function formatDateLong(dateStr) {
  const { y, m, d } = parts(dateStr);
  return `${MONTHS_LONG[m - 1]} ${d}, ${y}`;
}
export const monthShort = (dateStr) => MONTHS[parts(dateStr).m - 1];
export const dayNumber = (dateStr) => String(parts(dateStr).d).padStart(2, '0');
export const weekday = (dateStr) => DAYS_LONG[parts(dateStr).dow];

function to12(t) {
  let [h, m] = t.split(':').map(Number);
  const mer = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return { text: `${h}:${String(m).padStart(2, '0')}`, mer };
}
export function formatTimeRange(start, end) {
  const a = to12(start);
  const b = to12(end);
  return a.mer === b.mer ? `${a.text}\u2013${b.text} ${b.mer}` : `${a.text} ${a.mer}\u2013${b.text} ${b.mer}`;
}
export function formatTimeRangeFull(start, end) {
  const a = to12(start);
  const b = to12(end);
  return `${a.text} ${a.mer} \u2013 ${b.text} ${b.mer}`;
}
export function formatTimeRangeSpaced(start, end) {
  return formatTimeRange(start, end).replace('\u2013', ' \u2013 ');
}

/* ---------- seats & status ---------- */

export function seatInfo(event, localActiveCount = 0) {
  const registered = Math.min(event.capacity, event.seedRegistered + localActiveCount);
  const remaining = Math.max(0, event.capacity - registered);
  const percent = Math.round((registered / event.capacity) * 100);
  return { registered, remaining, capacity: event.capacity, percent };
}

/** 'completed' | 'ongoing' | 'full' | 'closed' | 'open' */
export function eventStatus(event, remaining, at = nowMs()) {
  if (at > endMs(event)) return 'completed';
  if (at >= startMs(event)) return 'ongoing';
  if (remaining <= 0) return 'full';
  if (at > deadlineOf(event)) return 'closed';
  return 'open';
}

export const STATUS_LABEL = {
  open: 'Registration Open',
  full: 'Fully Booked',
  closed: 'Registration Closed',
  ongoing: 'Happening Now',
  completed: 'Completed',
};
export const STATUS_DOT = {
  open: 'bg-emerald-400',
  full: 'bg-amber-400',
  closed: 'bg-amber-400',
  ongoing: 'bg-violet-400',
  completed: 'bg-slate-400',
};

export const isUpcoming = (event, at = nowMs()) => at < startMs(event);
export const isPast = (event, at = nowMs()) => at > endMs(event);

/* ---------- filtering & sorting ---------- */

function localDayKey(ms) {
  const d = new Date(ms + TZ_OFFSET_HOURS * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

function addDays(dayKey, n) {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function matchesDate(event, mode, at) {
  if (!mode || mode === 'any') return true;
  const today = localDayKey(at);
  const ev = event.date;
  if (mode === 'today') return ev === today;
  if (mode === 'week') return ev >= today && ev <= addDays(today, 6);
  if (mode === 'month') return ev.slice(0, 7) === today.slice(0, 7);
  if (mode === 'nextmonth') {
    const [y, m] = today.split('-').map(Number);
    const ny = m === 12 ? y + 1 : y;
    const nm = m === 12 ? 1 : m + 1;
    return ev.slice(0, 7) === `${ny}-${String(nm).padStart(2, '0')}`;
  }
  return true;
}

/**
 * ctx = { at?, locationTypeOf(event), remainingFor(event), registeredFor(event) }
 * filters = { q, category, date, location, status }
 */
export function filterEvents(events, filters, ctx) {
  const at = ctx.at ?? nowMs();
  const terms = (filters.q || '').toLowerCase().split(/\s+/).filter(Boolean);
  return events.filter((e) => {
    if (terms.length) {
      const hay = `${e.title} ${e.desc} ${e.organizer} ${e.category} ${e.location}`.toLowerCase();
      if (!terms.every((t) => hay.includes(t))) return false;
    }
    if (filters.category && filters.category !== 'all' && e.category !== filters.category) return false;
    if (!matchesDate(e, filters.date, at)) return false;
    if (filters.location && filters.location !== 'all' && ctx.locationTypeOf(e) !== filters.location) return false;
    const st = eventStatus(e, ctx.remainingFor(e), at);
    switch (filters.status) {
      case 'open': if (st !== 'open') return false; break;
      case 'upcoming': if (!isUpcoming(e, at)) return false; break;
      case 'closed': if (!(st === 'closed' || st === 'full')) return false; break;
      case 'completed': if (st !== 'completed') return false; break;
      default: break;
    }
    return true;
  });
}

export function sortEvents(events, mode, ctx) {
  const at = ctx.at ?? nowMs();
  const list = [...events];
  const byStartAsc = (a, b) => startMs(a) - startMs(b);
  switch (mode) {
    case 'newest':
      return list.sort((a, b) => startMs(b) - startMs(a));
    case 'oldest':
      return list.sort(byStartAsc);
    case 'popular':
      return list.sort((a, b) => ctx.registeredFor(b) - ctx.registeredFor(a));
    case 'upcoming':
    default: {
      const up = list.filter((e) => !isPast(e, at)).sort(byStartAsc);
      const past = list.filter((e) => isPast(e, at)).sort((a, b) => startMs(b) - startMs(a));
      return [...up, ...past];
    }
  }
}

/* ---------- relative labels ---------- */

export function startsInLabel(event, at = nowMs()) {
  const diff = startMs(event) - at;
  if (diff <= 0) return null;
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours < 1) return `Starting in ${Math.max(1, mins)} min`;
  if (hours < 24) return `Starting in ${hours} hour${hours === 1 ? '' : 's'}`;
  if (localDayKey(at + 86400000) === event.date) return 'Starting tomorrow';
  return `In ${Math.round(diff / 86400000)} days`;
}

export function relativeTime(iso, at = nowMs()) {
  const t = new Date(iso).getTime();
  const diff = at - t;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} h ago`;
  const days = Math.floor(diff / 86400000);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(t).toISOString().slice(0, 10);
}

export function dayGroup(iso, at = nowMs()) {
  const k = localDayKey(new Date(iso).getTime());
  const today = localDayKey(at);
  if (k === today) return 'TODAY';
  if (k === addDays(today, -1)) return 'YESTERDAY';
  return 'EARLIER';
}

/* ---------- calendar ---------- */

function stamp(ms) {
  return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function icsEscape(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

export function toICS(event, uidDomain = 'camppn') {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CampPN//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@${uidDomain}`,
    `DTSTAMP:${stamp(nowMs())}`,
    `DTSTART:${stamp(startMs(event))}`,
    `DTEND:${stamp(endMs(event))}`,
    `SUMMARY:${icsEscape(event.title)}`,
    `DESCRIPTION:${icsEscape(event.desc + ' (Organized by ' + event.organizer + ')')}`,
    `LOCATION:${icsEscape(event.location)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsEscape(event.title + ' starts in 1 hour')}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}

export function googleCalendarUrl(event) {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${stamp(startMs(event))}/${stamp(endMs(event))}`,
    details: `${event.desc} (Organized by ${event.organizer})`,
    location: event.location,
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/* ---------- QR payload ---------- */

export const qrPayload = (reg) => `CAMPPN:1:${reg.id}:${reg.qrToken}`;
export function parseQrPayload(text) {
  const m = /^CAMPPN:1:([A-Za-z0-9_-]+):([a-f0-9]{16,})$/.exec(String(text).trim());
  return m ? { registrationId: m[1], token: m[2] } : null;
}

/* ---------- small helpers ---------- */

export const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const initials = (name) =>
  String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || '?';

export const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s).trim());
