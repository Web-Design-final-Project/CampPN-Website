/* Profile — personal information, avatar, password, sign out */
import '../main.js';
import {
  updateProfile, changePassword, signOut, resetDemoData, myRegistrations, myFavorites, AuthError,
} from '../store.js';
import { initApp, toast, errorMessage, avatarHTML, signInPrompt, homeHref } from '../ui.js';

const $ = (id) => document.getElementById(id);
let user = null;

function message(el, text, ok) {
  el.hidden = !text;
  el.textContent = text || '';
  el.className = `mt-5 rounded-xl px-4 py-3 text-sm ${ok ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-rose-200 bg-rose-50 text-rose-700'}`;
  if (!text) el.hidden = true;
}

function fillSummary() {
  $('profAvatar').innerHTML = user.avatar
    ? `<img src="${user.avatar}" alt="Profile picture" class="h-full w-full object-cover">`
    : avatarHTML(user, 'h-full w-full', 'text-3xl');
  $('profName').textContent = user.fullName || 'Student';
  $('profEmail').textContent = user.email;
}

function fillForm() {
  $('pfName').value = user.fullName;
  $('pfEmail').value = user.email;
  $('pfPhone').value = user.phone;
  $('pfUniversity').value = user.university;
  $('pfStudentId').value = user.studentId;
  $('pfFaculty').value = user.faculty;
  $('pfYear').value = user.year;
}

async function fillStats() {
  const regs = (await myRegistrations(user.id)).filter((r) => r.status === 'registered');
  $('statRegs').textContent = String(regs.length);
  $('statFavs').textContent = String((await myFavorites(user.id)).length);
  let reviews = 0;
  try {
    const all = JSON.parse(localStorage.getItem('campn.v1.reviews') || '[]');
    reviews = all.filter((r) => r.userId === user.id).length;
  } catch { /* ignore */ }
  $('statReviews').textContent = String(reviews);
}

/** Resize to a small square JPEG so it fits comfortably in localStorage. */
function resizeImage(file, size = 256) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return reject(new AuthError('AVATAR', 'Please choose a PNG, JPG or WebP image.'));
    if (file.size > 8 * 1024 * 1024) return reject(new AuthError('AVATAR', 'That image is too large. Please choose one under 8 MB.'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new AuthError('AVATAR', 'That file could not be read as an image.')); };
    img.src = url;
  });
}

async function refreshUser(patch) {
  user = await updateProfile(user.id, patch);
  fillSummary();
}

function bind() {
  $('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await refreshUser({
        fullName: $('pfName').value, phone: $('pfPhone').value, university: $('pfUniversity').value,
        studentId: $('pfStudentId').value, faculty: $('pfFaculty').value, year: $('pfYear').value,
      });
      message($('profileMsg'), 'Your profile has been updated.', true);
      toast('Profile saved', 'success');
    } catch (err) {
      message($('profileMsg'), errorMessage(err), false);
    }
  });

  $('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await changePassword(user.id, $('pwCurrent').value, $('pwNew').value, $('pwConfirm').value);
      $('passwordForm').reset();
      message($('passwordMsg'), 'Your password has been changed.', true);
      toast('Password updated', 'success');
    } catch (err) {
      message($('passwordMsg'), errorMessage(err), false);
    }
  });

  $('avatarInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      await refreshUser({ avatar: await resizeImage(file) });
      toast('Profile picture updated', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  });
  $('avatarRemove').addEventListener('click', async () => {
    await refreshUser({ avatar: '' });
    toast('Profile picture removed', 'info');
  });

  $('signOutBtn').addEventListener('click', async () => {
    await signOut();
    location.href = homeHref();
  });
  $('resetDemo').addEventListener('click', () => {
    if (!window.confirm('Remove ALL accounts and activity saved in this browser? This cannot be undone.')) return;
    resetDemoData();
    location.href = homeHref();
  });
}

(async function init() {
  user = await initApp();
  if (!user) {
    $('profileRoot').className = '';
    signInPrompt($('profileRoot'), { title: 'Sign in to manage your profile', text: 'Create a free CampPN account to save your details, events, and favorites.' });
    return;
  }
  fillSummary();
  fillForm();
  await fillStats();
  bind();
})();
