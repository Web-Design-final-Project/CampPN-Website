# CampPN — Event Campus Website (V1: Student version)

CampPN brings campus events into one place. This is **Version 1 (student-focused)** from
`CampPN-Next-Step.docx`, built with Vite + Tailwind CSS v4.

> **Prototype data layer.** There is no server yet. Accounts, registrations, favorites,
> reviews and notifications are stored in the browser's `localStorage` (per device).
> See [Moving to a real backend](#moving-to-a-real-backend). Do not collect real
> passwords or personal data until that is done.

## What students can do

| Area | Features |
| --- | --- |
| Account | Create account, sign in/out, edit profile, upload picture, change password |
| Discover | Featured + upcoming events, search, category / date / location / status filters, sort |
| Event details | Image, description, date, time, location (+ map link), organizer, category, registered count, seats left, registration deadline |
| Registration | Register, cancel, status, confirmation, **unique QR code** for check-in |
| My Events | Upcoming / Past / Cancelled, QR button, add to calendar (.ics + Google Calendar), cancel |
| Favorites | Save / remove / view saved events |
| Notifications | Registration confirmation & cancellation, automatic reminders (24 h and 3 h before), new events, check-in, mark as read |
| Reviews | Star rating + comment after an event you registered for has finished (one editable review each) |

Not in V1 (planned for V2/V3 in the doc): organizer accounts, event creation, the QR **scanner**,
organizer-triggered notifications (time change / event cancelled), company features.

## Project structure

```
index.html                     Home
page/
  Explore-Event.html           Search + filters
  Event-Detail.html            ?id=<event-id>
  My-Event.html                Registrations
  Favorites.html               Saved events
  Notifications.html           Notification feed
  Profile.html                 Account settings
  Join-Us.html                 Sign in / create account
src/
  data.js                      Seed events + categories  (events / categories tables)
  logic.js                     Pure logic: dates, status, filters, ICS, QR payload (unit tested)
  store.js                     Data layer: users, profiles, registrations, favorites,
                               reviews, notifications  (localStorage)
  ui.js                        Shared UI: auth menu, toast, modal, QR, event card
  pages/*.js                   One small script per page
  style.css, main.js, assets/  Styling and images
tests/logic.test.mjs           Unit tests for src/logic.js
```

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build
npm test           # unit tests for the date / status / filter / ICS / QR logic
```

## How events work

* Events live in `src/data.js`. Add an event by adding an object (date `YYYY-MM-DD`,
  times `HH:MM` in **Phnom Penh time**, `capacity`, `seedRegistered`).
* Status is **calculated from the clock**, never stored: *Registration Open* until
  23:59 the day before, then *Closed*; *Fully Booked* when seats run out;
  *Happening Now*; *Completed*. Past events can no longer be registered for.
* Seats shown = `seedRegistered` + registrations made in this browser.
* The sample events are dated 2026 and are placeholders. Replace them with your real pilot events.

## QR check-in

Registering creates a random token. The QR encodes `CAMPPN:1:<registrationId>:<token>`.
`store.checkInByToken(registrationId, token)` already validates a scanned code, marks
attendance and sends the "Checked in" notification. The V2 organizer scanner only needs
a camera page that calls it.

## Moving to a real backend

All data access goes through `src/store.js` (async functions returning plain objects), so
the pages should not need to change. Suggested path (for example with Supabase):

1. Tables: `users`, `student_profiles`, `categories`, `events`, `registrations`
   (unique `(user_id, event_id)`), `favorites`, `reviews`, `notifications`.
2. Replace each function in `store.js` with an API call, keeping the same names and return shapes.
3. Enforce **on the server**: seat limits, deadlines, "only registered students can review",
   password hashing and reset, and row-level security. The checks in the browser are for UX only.
4. Send reminders from a scheduled job instead of `syncReminders()`.

## Known limits / things to change before going public

* Prototype sign-in is **not secure**: anyone with access to the browser can read `localStorage`.
  Passwords are salted and PBKDF2-hashed so they are never stored in plain text.
* "Continue with Google" is disabled until real auth exists; "Forgot password" needs a server.
* The Home hero numbers (120+ events, 2.5K+ students, 30+ organizations) are static marketing
  text. Replace them with real numbers before showing the site publicly.
* Event images are large (up to ~3.7 MB each, 18 MB total). Resize or convert to WebP for faster loads.
* After an event ends, "attended" is assumed for registered students (no scanner yet), which is what
  allows them to leave a review.
