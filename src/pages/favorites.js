/* Favorites — events the student saved */
import '../main.js';
import { getEvent, myFavorites, CHANGE_EVENT } from '../store.js';
import { initApp, eventCardHTML, bindFavorites, signInPrompt, emptyState, pageUrl } from '../ui.js';

let user = null;

async function render() {
  const box = document.getElementById('favGrid');
  const favs = await myFavorites(user.id);
  const events = favs.map((f) => getEvent(f.eventId)).filter(Boolean);
  if (!events.length) {
    emptyState(box, {
      icon: 'favorite', title: 'No saved events yet',
      text: 'Tap the heart on any event to save it here for later.',
      ctaHref: pageUrl('Explore-Event.html'), ctaLabel: 'Explore Events',
    });
    return;
  }
  box.innerHTML = `<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">${events.map((e) => eventCardHTML(e, { user })).join('')}</div>`;
}

(async function init() {
  user = await initApp();
  const box = document.getElementById('favGrid');
  if (!user) {
    signInPrompt(box, { title: 'Sign in to see your favorites', text: 'Saved events are kept in your CampPN account.' });
    return;
  }
  await render();
  // un-favoriting removes the card (after the toast), keeping the page in sync
  bindFavorites(box, () => user, () => setTimeout(render, 250));
  window.addEventListener('storage', render);
  window.addEventListener(CHANGE_EVENT, (e) => { if (e.detail?.kind === 'reset') render(); });
})();
