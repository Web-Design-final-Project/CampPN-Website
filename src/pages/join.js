/* Join Us — real sign in / create account (V1: stored in this browser, see store.js) */
import '../main.js';
import { signIn, signUp, AuthError } from '../store.js';
import { initApp, toast, safeNext, pageUrl, errorMessage } from '../ui.js';

const $ = (id) => document.getElementById(id);
let mode = 'login';

const COPY = {
  login: {
    badge: 'Welcome back',
    title: 'Sign in to Camp<span class="text-[#6d28d9]">PN</span>',
    desc: 'Access your events, registrations, and personalized opportunities.',
    submit: 'Sign In', switchDesc: "Don't have an account?", switchBtn: 'Create one',
  },
  register: {
    badge: 'Get started',
    title: 'Create your Camp<span class="text-[#6d28d9]">PN</span> account',
    desc: 'Join CampPN and discover opportunities built for students.',
    submit: 'Create Account', switchDesc: 'Already have an account?', switchBtn: 'Sign in',
  },
};

function setMode(next) {
  mode = next;
  const c = COPY[mode];
  $('formBadge').textContent = c.badge;
  $('formTitle').innerHTML = c.title;
  $('formDescription').textContent = c.desc;
  $('submitText').textContent = c.submit;
  $('switchDescription').textContent = c.switchDesc;
  $('switchButton').textContent = c.switchBtn;
  const reg = mode === 'register';
  $('nameGroup').classList.toggle('hidden', !reg);
  $('confirmPasswordGroup').classList.toggle('hidden', !reg);
  $('termsGroup').classList.toggle('hidden', !reg);
  $('forgotPassword').classList.toggle('hidden', reg);
  $('password').autocomplete = reg ? 'new-password' : 'current-password';
  showError('');
}

function showError(msg, fieldId) {
  const box = $('formError');
  if (!msg) { box.hidden = true; box.textContent = ''; return; }
  box.innerHTML = '<span class="material-symbols-outlined text-[18px] leading-5" aria-hidden="true">error</span><span></span>';
  box.lastElementChild.textContent = msg;
  box.hidden = false;
  if (fieldId && $(fieldId)) $(fieldId).focus();
}

const FIELD_FOR_CODE = { NAME: 'name', EMAIL: 'email', PASSWORD: 'password', CONFIRM: 'confirmPassword', EXISTS: 'email', CREDENTIALS: 'password', TERMS: 'terms' };

async function onSubmit(e) {
  e.preventDefault();
  showError('');
  const btn = $('submitButton');
  const label = $('submitText');
  const original = label.textContent;
  const email = $('email').value;
  const password = $('password').value;
  try {
    if (!email.trim()) throw new AuthError('EMAIL', 'Please enter your email address.');
    if (!password) throw new AuthError('PASSWORD', 'Please enter your password.');
    btn.disabled = true;
    btn.classList.add('opacity-70');
    label.textContent = mode === 'login' ? 'Signing in…' : 'Creating account…';
    if (mode === 'register') {
      if (!$('terms').checked) throw new AuthError('TERMS', 'Please accept the Terms of Service and Privacy Policy to continue.');
      await signUp({ fullName: $('name').value, email, password, confirmPassword: $('confirmPassword').value });
      toast('Account created. Welcome to CampPN!', 'success');
    } else {
      await signIn({ email, password });
      toast('Signed in. Welcome back!', 'success');
    }
    const next = safeNext(new URLSearchParams(location.search).get('next'));
    setTimeout(() => { location.href = next || pageUrl('Explore-Event.html'); }, 600);
  } catch (err) {
    btn.disabled = false;
    btn.classList.remove('opacity-70');
    label.textContent = original;
    const code = err instanceof AuthError ? err.code : null;
    showError(errorMessage(err), FIELD_FOR_CODE[code]);
  }
}

(async function init() {
  const user = await initApp();
  const params = new URLSearchParams(location.search);

  // Already signed in: nothing to do here — send them on their way.
  if (user) {
    location.replace(safeNext(params.get('next')) || pageUrl('Profile.html'));
    return;
  }

  setMode(params.get('mode') === 'register' ? 'register' : 'login');
  const note = params.get('note');
  if (note) { $('formNote').textContent = note; $('formNote').hidden = false; }

  $('switchButton').addEventListener('click', () => setMode(mode === 'login' ? 'register' : 'login'));
  $('authForm').addEventListener('submit', onSubmit);
  $('forgotPassword').addEventListener('click', () => toast('Password reset needs the online version of CampPN, which is coming soon.', 'info'));

  document.querySelectorAll('[data-toggle-password]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = $(btn.dataset.togglePassword);
      const icon = $(btn.dataset.icon);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      icon.textContent = show ? 'visibility_off' : 'visibility';
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  });
})();
