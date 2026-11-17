/* =====================================================================
   CampPN — data store (V1, front-end only)

   Tables follow the "Database Direction" in the Next Step doc:
     users, student_profiles, categories, events, registrations,
     favorites, reviews, notifications

   Everything is persisted in the browser's localStorage, so data is
   per-browser/per-device. This is a prototype layer: when a real
   backend (e.g. Supabase) is added, only THIS file needs to change — every
   function is async (or a tiny sync read helper) and returns plain objects,
   so pages won't care.

   SECURITY NOTE: client-side auth is NOT secure authentication. Anyone
   with access to the browser can read localStorage. Passwords are salted
   + PBKDF2-hashed so plain text is never stored, but real accounts need
   a server.
   ===================================================================== */

import { EVENTS, CATEGORIES, SEED_REVIEWS, locationType } from './data.js';
import {
  nowMs, startMs, endMs, seatInfo, eventStatus, isValidEmail, startsInLabel,
} from './logic.js';

const PREFIX = 'campn.v1.';
export const CHANGE_EVENT = 'campn:change';

/* ---------- storage (with in-memory fallback if localStorage is blocked) ---------- */

const memory = new Map();
function clone(v) { return v === undefined ? v : JSON.parse(JSON.stringify(v)); }
function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw == null) return memory.has(key) ? clone(memory.get(key)) : clone(fallback);
    return JSON.parse(raw);
  } catch {
    return memory.has(key) ? clone(memory.get(key)) : clone(fallback);
  }
}
function write(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    memory.delete(key);
  } catch {
    memory.set(key, clone(value));
  }
}
function emit(detail = {}) {
  try { window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail })); } catch { /* ignore */ }
}

const uid = (p = 'id') => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const hex = (bytes) => Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
const randomHex = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));
const iso = () => new Date(nowMs()).toISOString();

export class AuthError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

/* ---------- password hashing ---------- */

async function hashPassword(password, saltHex) {
  if (!globalThis.crypto?.subtle) {
    throw new AuthError('INSECURE_CONTEXT', 'Secure sign-in needs HTTPS or localhost.');
  }
  const salt = Uint8Array.from(saltHex.match(/.{2}/g).map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return hex(new Uint8Array(bits));
}

/* ---------- auth ---------- */

export const PASSWORD_MIN = 8;

function publicUser(user, profile) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    fullName: profile.fullName || '',
    phone: profile.phone || '',
    university: profile.university || '',
    studentId: profile.studentId || '',
    faculty: profile.faculty || '',
    year: profile.year || '',
    avatar: profile.avatar || '',
  };
}

export async function currentUser() {
  const session = read('session', null);
  if (!session) return null;
  const user = read('users', []).find((u) => u.id === session.userId);
  if (!user) return null;
  return publicUser(user, read('profiles', {})[user.id] || {});
}

export async function signUp({ fullName, email, password, confirmPassword }) {
  fullName = String(fullName || '').trim();
  email = String(email || '').trim().toLowerCase();
  if (fullName.length < 2) throw new AuthError('NAME', 'Please enter your full name.');
  if (!isValidEmail(email)) throw new AuthError('EMAIL', 'Please enter a valid email address.');
  if (String(password || '').length < PASSWORD_MIN) throw new AuthError('PASSWORD', `Password must be at least ${PASSWORD_MIN} characters.`);
  if (confirmPassword !== undefined && password !== confirmPassword) throw new AuthError('CONFIRM', 'Passwords do not match.');

  const users = read('users', []);
  if (users.some((u) => u.email === email)) throw new AuthError('EXISTS', 'An account with this email already exists. Try signing in.');

  const salt = randomHex(16);
  const user = {
    id: uid('u'), email, role: 'student', salt,
    passwordHash: await hashPassword(password, salt),
    createdAt: iso(),
  };
  users.push(user);
  write('users', users);

  const profiles = read('profiles', {});
  profiles[user.id] = { fullName };
  write('profiles', profiles);
  write('session', { userId: user.id });

  await pushNotification(user.id, {
    type: 'welcome', group: 'system', icon: 'waving_hand',
    title: 'Welcome to CampPN',
    body: 'Your account is ready. Explore events, register, and keep your QR codes in My Events.',
    key: 'welcome',
  });
  const soon = EVENTS.filter((e) => startMs(e) > nowMs()).sort((a, b) => startMs(a) - startMs(b)).slice(0, 3);
  if (soon.length) {
    await pushNotification(user.id, {
      type: 'new_event', group: 'events', icon: 'campaign',
      title: 'New events on campus',
      body: `Coming up: ${soon.map((e) => e.title).join(', ')}.`,
      key: 'new-events-welcome',
    });
  }
  emit({ kind: 'auth' });
  return publicUser(user, profiles[user.id]);
}

export async function signIn({ email, password }) {
  email = String(email || '').trim().toLowerCase();
  const user = read('users', []).find((u) => u.email === email);
  // Same message for unknown email / wrong password (no account enumeration)
  const bad = new AuthError('CREDENTIALS', 'Incorrect email or password.');
  if (!user) throw bad;
  const hash = await hashPassword(String(password || ''), user.salt);
  if (hash !== user.passwordHash) throw bad;
  write('session', { userId: user.id });
  emit({ kind: 'auth' });
  return publicUser(user, read('profiles', {})[user.id] || {});
}

export async function signOut() {
  write('session', null);
  emit({ kind: 'auth' });
}

export async function updateProfile(userId, fields) {
  const allowed = ['fullName', 'phone', 'university', 'studentId', 'faculty', 'year', 'avatar'];
  const profiles = read('profiles', {});
  const next = { ...(profiles[userId] || {}) };
  for (const k of allowed) {
    if (fields[k] === undefined) continue;
    let v = String(fields[k]);
    if (k === 'fullName') {
      v = v.trim();
      if (v.length < 2) throw new AuthError('NAME', 'Please enter your full name.');
    }
    if (k === 'avatar' && v.length > 400000) throw new AuthError('AVATAR', 'That image is too large. Please choose a smaller one.');
    if (k !== 'avatar') v = v.trim().slice(0, 120);
    next[k] = v;
  }
  profiles[userId] = next;
  write('profiles', profiles);
  emit({ kind: 'profile' });
  return currentUser();
}

export async function changePassword(userId, current, next, confirm) {
  const users = read('users', []);
  const user = users.find((u) => u.id === userId);
  if (!user) throw new AuthError('AUTH_REQUIRED', 'Please sign in again.');
  if ((await hashPassword(String(current || ''), user.salt)) !== user.passwordHash) {
    throw new AuthError('CURRENT', 'Your current password is incorrect.');
  }
  if (String(next || '').length < PASSWORD_MIN) throw new AuthError('PASSWORD', `New password must be at least ${PASSWORD_MIN} characters.`);
  if (next !== confirm) throw new AuthError('CONFIRM', 'New passwords do not match.');
  if (next === current) throw new AuthError('SAME', 'Choose a password different from the current one.');
  user.salt = randomHex(16);
  user.passwordHash = await hashPassword(next, user.salt);
  write('users', users);
  return true;
}

/* ---------- events ---------- */

export const getCategories = () => CATEGORIES;
export const locationTypeOf = (e) => locationType(e.location);
export const getEvent = (id) => EVENTS.find((e) => e.id === id) || null;

function activeRegs() { return read('registrations', []).filter((r) => r.status === 'registered'); }
function localCount(eventId) { return activeRegs().filter((r) => r.eventId === eventId).length; }

/** Seats combine the seeded count with registrations made in this browser. */
export function seatsFor(event) { return seatInfo(event, localCount(event.id)); }
export function statusFor(event, at = nowMs()) { return eventStatus(event, seatsFor(event).remaining, at); }
export const filterContext = () => ({
  at: nowMs(),
  locationTypeOf,
  remainingFor: (e) => seatsFor(e).remaining,
  registeredFor: (e) => seatsFor(e).registered,
});

/* ---------- registrations ---------- */

export async function myRegistrations(userId) {
  return read('registrations', [])
    .filter((r) => r.userId === userId)
    .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
}

export async function registrationFor(userId, eventId) {
  return read('registrations', []).find((r) => r.userId === userId && r.eventId === eventId) || null;
}

export async function register(userId, eventId) {
  if (!userId) throw new AuthError('AUTH_REQUIRED', 'Please sign in to register.');
  const event = getEvent(eventId);
  if (!event) throw new AuthError('NOT_FOUND', 'This event no longer exists.');

  const regs = read('registrations', []);
  const existing = regs.find((r) => r.userId === userId && r.eventId === eventId);
  if (existing && existing.status === 'registered') throw new AuthError('ALREADY', 'You are already registered for this event.');

  const st = statusFor(event);
  if (st === 'full') throw new AuthError('FULL', 'Sorry, this event is fully booked.');
  if (st !== 'open') throw new AuthError('CLOSED', st === 'completed' ? 'This event has already finished.' : 'Registration for this event is closed.');

  let reg;
  if (existing) {
    // re-registering after a cancellation: reuse the record, issue a fresh QR token
    existing.status = 'registered';
    existing.registeredAt = iso();
    existing.cancelledAt = null;
    existing.qrToken = randomHex(12);
    existing.checkedInAt = null;
    reg = existing;
  } else {
    reg = { id: uid('r'), userId, eventId, status: 'registered', registeredAt: iso(), cancelledAt: null, qrToken: randomHex(12), checkedInAt: null };
    regs.push(reg);
  }
  write('registrations', regs);

  await pushNotification(userId, {
    type: 'registration_confirmed', group: 'registration', icon: 'check_circle',
    title: 'Registration confirmed',
    body: `You're in for ${event.title}. Your QR code is ready in My Events.`,
    eventId, key: `reg-${reg.id}-${reg.registeredAt}`,
  });
  emit({ kind: 'registration', eventId });
  return reg;
}

export async function cancelRegistration(userId, eventId) {
  const regs = read('registrations', []);
  const reg = regs.find((r) => r.userId === userId && r.eventId === eventId && r.status === 'registered');
  if (!reg) throw new AuthError('NOT_REGISTERED', 'You are not registered for this event.');
  const event = getEvent(eventId);
  if (event && nowMs() >= startMs(event)) throw new AuthError('STARTED', 'You can no longer cancel \u2014 this event has already started.');
  reg.status = 'cancelled';
  reg.cancelledAt = iso();
  write('registrations', regs);
  await pushNotification(userId, {
    type: 'registration_cancelled', group: 'registration', icon: 'event_busy',
    title: 'Registration cancelled',
    body: `You cancelled your spot for ${event ? event.title : 'the event'}. You can register again while seats are available.`,
    eventId, key: `cancel-${reg.id}-${reg.cancelledAt}`,
  });
  emit({ kind: 'registration', eventId });
  return reg;
}

/**
 * Organizer-side check-in (the V2 scanner UI will call this).
 * Student QR -> verify registration -> mark attendance.
 */
export async function checkInByToken(registrationId, token) {
  const regs = read('registrations', []);
  const reg = regs.find((r) => r.id === registrationId);
  if (!reg || reg.qrToken !== token || reg.status !== 'registered') throw new AuthError('INVALID_QR', 'This QR code is not valid.');
  if (reg.checkedInAt) return { reg, alreadyCheckedIn: true };
  reg.checkedInAt = iso();
  write('registrations', regs);
  const event = getEvent(reg.eventId);
  await pushNotification(reg.userId, {
    type: 'check_in', group: 'events', icon: 'how_to_reg',
    title: 'Checked in',
    body: `Your attendance at ${event ? event.title : 'the event'} was confirmed.`,
    eventId: reg.eventId, key: `checkin-${reg.id}`,
  });
  emit({ kind: 'registration', eventId: reg.eventId });
  return { reg, alreadyCheckedIn: false };
}

/* ---------- favorites ---------- */

export async function myFavorites(userId) {
  return read('favorites', []).filter((f) => f.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
export function isFavoriteSync(userId, eventId) {
  return !!userId && read('favorites', []).some((f) => f.userId === userId && f.eventId === eventId);
}
export async function toggleFavorite(userId, eventId) {
  if (!userId) throw new AuthError('AUTH_REQUIRED', 'Please sign in to save events.');
  const favs = read('favorites', []);
  const idx = favs.findIndex((f) => f.userId === userId && f.eventId === eventId);
  let saved;
  if (idx >= 0) { favs.splice(idx, 1); saved = false; }
  else { favs.push({ userId, eventId, createdAt: iso() }); saved = true; }
  write('favorites', favs);
  emit({ kind: 'favorite', eventId });
  return saved;
}

/* ---------- reviews ---------- */

export function reviewsFor(eventId) {
  const own = read('reviews', []).filter((r) => r.eventId === eventId);
  const seed = SEED_REVIEWS.filter((r) => r.eventId === eventId);
  return [...own, ...seed].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
export function ratingSummary(eventId) {
  const list = reviewsFor(eventId);
  if (!list.length) return { average: 0, count: 0 };
  const avg = list.reduce((s, r) => s + r.rating, 0) / list.length;
  return { average: Math.round(avg * 10) / 10, count: list.length };
}

/** A student may review an event they registered for (not cancelled) once it has finished. */
export async function reviewEligibility(userId, eventId) {
  if (!userId) return { ok: false, reason: 'signin' };
  const event = getEvent(eventId);
  if (!event) return { ok: false, reason: 'missing' };
  const reg = await registrationFor(userId, eventId);
  if (!reg || reg.status !== 'registered') return { ok: false, reason: 'not-registered' };
  if (nowMs() <= endMs(event)) return { ok: false, reason: 'not-finished' };
  return { ok: true, existing: read('reviews', []).find((r) => r.userId === userId && r.eventId === eventId) || null };
}

export async function saveReview(userId, eventId, rating, comment) {
  const elig = await reviewEligibility(userId, eventId);
  if (!elig.ok) {
    const msg = {
      signin: 'Please sign in to review.',
      'not-registered': 'Only students who registered for this event can review it.',
      'not-finished': 'You can review this event after it finishes.',
      missing: 'This event no longer exists.',
    }[elig.reason];
    throw new AuthError('REVIEW_NOT_ALLOWED', msg);
  }
  rating = Number(rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new AuthError('RATING', 'Please choose a rating from 1 to 5 stars.');
  comment = String(comment || '').trim().slice(0, 500);
  const user = await currentUser();
  const reviews = read('reviews', []);
  const existing = reviews.find((r) => r.userId === userId && r.eventId === eventId);
  if (existing) { existing.rating = rating; existing.comment = comment; existing.createdAt = iso(); existing.userName = user?.fullName || 'Student'; }
  else reviews.push({ id: uid('rv'), userId, eventId, userName: user?.fullName || 'Student', rating, comment, createdAt: iso() });
  write('reviews', reviews);
  emit({ kind: 'review', eventId });
}

export async function deleteReview(userId, eventId) {
  write('reviews', read('reviews', []).filter((r) => !(r.userId === userId && r.eventId === eventId)));
  emit({ kind: 'review', eventId });
}

/* ---------- notifications ---------- */

export async function pushNotification(userId, n) {
  const list = read('notifications', []);
  if (n.key && list.some((x) => x.userId === userId && x.key === n.key)) return null; // de-duplicate
  const item = {
    id: uid('n'), userId, read: false, createdAt: iso(),
    type: n.type, group: n.group, icon: n.icon, title: n.title, body: n.body,
    eventId: n.eventId || null, key: n.key || null,
  };
  list.push(item);
  write('notifications', list);
  emit({ kind: 'notification' });
  return item;
}
export async function myNotifications(userId) {
  return read('notifications', []).filter((n) => n.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
export function unreadCountSync(userId) {
  return userId ? read('notifications', []).filter((n) => n.userId === userId && !n.read).length : 0;
}
export async function markRead(userId, id) {
  const list = read('notifications', []);
  const n = list.find((x) => x.id === id && x.userId === userId);
  if (n && !n.read) { n.read = true; write('notifications', list); emit({ kind: 'notification' }); }
}
export async function markAllRead(userId) {
  const list = read('notifications', []);
  let changed = false;
  list.forEach((n) => { if (n.userId === userId && !n.read) { n.read = true; changed = true; } });
  if (changed) { write('notifications', list); emit({ kind: 'notification' }); }
}

/**
 * Event reminders: for each active registration starting within 24 hours, create one
 * reminder (and one "starting soon" within 3 hours). De-duplicated by key.
 */
export async function syncReminders(userId) {
  if (!userId) return;
  const at = nowMs();
  for (const reg of await myRegistrations(userId)) {
    if (reg.status !== 'registered') continue;
    const event = getEvent(reg.eventId);
    if (!event) continue;
    const diff = startMs(event) - at;
    if (diff <= 0) continue;
    if (diff <= 3 * 3600000) {
      await pushNotification(userId, {
        type: 'event_reminder', group: 'events', icon: 'alarm',
        title: 'Starting soon',
        body: `${event.title} \u2014 ${startsInLabel(event, at).toLowerCase()} at ${event.location}.`,
        eventId: event.id, key: `remind-3h-${reg.id}`,
      });
    } else if (diff <= 24 * 3600000) {
      await pushNotification(userId, {
        type: 'event_reminder', group: 'events', icon: 'event_upcoming',
        title: 'Event reminder',
        body: `${event.title} is coming up \u2014 ${event.location}.`,
        eventId: event.id, key: `remind-24h-${reg.id}`,
      });
    }
  }
}

/* ---------- maintenance ---------- */

export function resetDemoData() {
  ['users', 'profiles', 'session', 'registrations', 'favorites', 'reviews', 'notifications'].forEach((k) => {
    try { window.localStorage.removeItem(PREFIX + k); } catch { /* ignore */ }
    memory.delete(k);
  });
  emit({ kind: 'reset' });
}
