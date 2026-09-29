# Event Campus Website

This project is a static campus event website built with Vite and Tailwind CSS.

## Project structure

- `index.html` — landing page / home screen
- `page/` — separate pages for the app sections
  - `Explore-Event.html` — event discovery page
  - `My-Event.html` — user activity and registered events
  - `Notifications.html` — notification feed
  - `Join-Us.html` — sign-up / registration page
  - `Event-Detial.html` — event details page
- `src/` — shared source assets and styling
  - `main.js` — JavaScript entry file
  - `style.css` — project-wide shared CSS
  - `assets/` — images and visual assets used across the site
- `public/` — static public files
- `vite.config.ts` — Vite configuration
- `package.json` — scripts and dependencies

## How the site is organized

The project is split into:

1. Pages in the root and inside `page/`
2. Shared styling in `src/style.css`
3. Shared image assets in `src/assets/`
4. A small entry script in `src/main.js`

This keeps the site easy to follow because each HTML page handles one surface, while the styling and assets remain centralized.

## Important note

The codebase is primarily static HTML and CSS with minimal JavaScript. No functional logic was changed while organizing this project documentation.

## Run locally

```bash
npm install
npm run dev
```

## Build check

The app is configured for Vite. The project was reviewed without modifying code behavior.
