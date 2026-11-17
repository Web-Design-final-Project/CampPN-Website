import '../main.js';
import { signIn, AuthError } from '../store.js';
import { initApp, pageUrl, safeNext, errorMessage } from '../ui.js';

const $ = (id) => document.getElementById(id);
const modal = $('registrationModal');
const modalContent = $('modalContent');
const modalTitle = $('modalTitle');
const modalDescription = $('modalDescription');
const modalEyebrow = $('modalEyebrow');
const modalIcon = $('modalIcon');
const backButton = $('modalBack');
const modalDialog = modal.querySelector('[role="dialog"]');
const REGISTRATION_ROLES = ['student', 'organizer', 'enterprise'];
const registrationEndpoint = document.querySelector('meta[name="campn-registration-endpoint"]')?.content.trim();
let restoreFocusTo = null;
let savedBodyOverflow = '';
let closeTimer;

const ROLE_COPY = {
  student: {
    icon: 'school',
    title: 'Student registration',
    description: 'Create a profile for campus events, learning opportunities, and new connections.',
    submit: 'Create student account',
  },
  organizer: {
    icon: 'event_available',
    title: 'Organizer registration',
    description: 'Tell us about your organization and the events you want to bring to campus.',
    submit: 'Create organizer account',
  },
  enterprise: {
    icon: 'apartment',
    title: 'Enterprise registration',
    description: 'Introduce your business and explore ways to connect with students and universities.',
    submit: 'Create enterprise account',
  },
};

const OPTIONS = {
  academicYear: ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5+', 'Graduate', 'Other'],
  organizationType: ['University Club', 'Student Association', 'Event Organizer', 'NGO', 'Other'],
  industry: ['Technology', 'Education', 'Finance', 'Healthcare', 'Marketing', 'Other'],
  interests: ['Workshop', 'Seminar', 'Competition', 'Career', 'Technology', 'Sports', 'Social Events'],
  partnershipInterest: ['Recruitment', 'Sponsorship', 'Internship', 'Job Opportunities', 'Collaboration'],
};

function fieldId(role, name) {
  return `${role}-${name}`;
}

function fieldMarkup(role, { name, label, type = 'text', required = false, placeholder = '', autocomplete, options, full = false }) {
  const id = fieldId(role, name);
  const requiredMark = required ? '<span aria-hidden="true" class="text-rose-600"> *</span>' : '';
  const requiredAttr = required ? ' required' : '';
  const commonAttrs = `id="${id}" name="${name}" class="join-field"${requiredAttr} aria-describedby="${id}-error"`;
  let control;

  if (type === 'select') {
    control = `<select ${commonAttrs}>
      <option value="">Choose ${label.toLowerCase()}</option>
      ${options.map((option) => `<option value="${option}">${option}</option>`).join('')}
    </select>`;
  } else if (type === 'textarea') {
    control = `<textarea ${commonAttrs} placeholder="${placeholder}"></textarea>`;
  } else if (type === 'password') {
    control = `<div class="join-password-wrap">
      <input ${commonAttrs} type="password" autocomplete="${autocomplete}" minlength="8" placeholder="${placeholder}">
      <button type="button" class="join-password-toggle" data-toggle-password="${id}" aria-label="Show ${label.toLowerCase()}">
        <span class="material-symbols-outlined" data-password-icon aria-hidden="true">visibility</span>
      </button>
    </div>`;
  } else {
    const typeAttr = type === 'phone' ? 'tel' : type;
    const autoAttr = autocomplete ? ` autocomplete="${autocomplete}"` : '';
    const inputmode = type === 'phone' ? ' inputmode="tel"' : '';
    control = `<input ${commonAttrs} type="${typeAttr}"${autoAttr}${inputmode} placeholder="${placeholder}">`;
  }

  return `<div class="join-form-field${full ? ' full-width' : ''}">
    <label class="join-field-label" for="${id}">${label}${requiredMark}</label>
    ${control}
    <p class="join-form-error" id="${id}-error" aria-live="polite"></p>
  </div>`;
}

function checkboxGroupMarkup(role, name, label, options) {
  const id = fieldId(role, name);
  const choices = options.map((option, index) => {
    const optionId = `${id}-${index}`;
    return `<label class="join-check-label" for="${optionId}">
      <input class="join-check" id="${optionId}" name="${name}" type="checkbox" value="${option}" aria-describedby="${id}-error">
      <span>${option}</span>
    </label>`;
  }).join('');

  return `<fieldset class="join-form-field full-width">
    <legend class="join-field-label">${label}</legend>
    <div class="join-check-grid" id="${id}">${choices}</div>
    <p class="join-form-error" id="${id}-error" aria-live="polite"></p>
  </fieldset>`;
}

function termsMarkup(role) {
  const id = fieldId(role, 'terms');
  return `<div class="join-form-field full-width">
    <label class="join-check-label" for="${id}">
      <input class="join-check" id="${id}" name="terms" type="checkbox" required aria-describedby="${id}-error">
      <span>I agree to CampPN's Terms and Conditions and Privacy Policy.<span aria-hidden="true" class="text-rose-600"> *</span></span>
    </label>
    <p class="join-form-error" id="${id}-error" aria-live="polite"></p>
  </div>`;
}

function contactFields(role) {
  return `
    ${fieldMarkup(role, { name: 'email', label: role === 'enterprise' ? 'Business email' : 'Email address', type: 'email', required: true, autocomplete: 'email', placeholder: 'you@example.com' })}
    ${fieldMarkup(role, { name: 'phone', label: 'Phone number', type: 'phone', required: true, autocomplete: 'tel', placeholder: '+855 12 345 678' })}`;
}

function securityFields(role) {
  return `
    ${fieldMarkup(role, { name: 'password', label: 'Password', type: 'password', required: true, autocomplete: 'new-password', placeholder: 'At least 8 characters' })}
    ${fieldMarkup(role, { name: 'confirmPassword', label: 'Confirm password', type: 'password', required: true, autocomplete: 'new-password', placeholder: 'Enter your password again' })}
    <p class="join-password-hint full-width">Use at least 8 characters, including an uppercase letter, a lowercase letter, and a number.</p>
    ${termsMarkup(role)}`;
}

function registrationFields(role) {
  if (role === 'student') {
    return `
      ${fieldMarkup(role, { name: 'fullName', label: 'Full name', required: true, autocomplete: 'name', placeholder: 'Your full name' })}
      ${contactFields(role)}
      ${fieldMarkup(role, { name: 'university', label: 'University / Institution', autocomplete: 'organization', placeholder: 'Your school or university' })}
      ${fieldMarkup(role, { name: 'major', label: 'Major / Field of study', placeholder: 'e.g. Computer Science' })}
      ${fieldMarkup(role, { name: 'academicYear', label: 'Current academic year', type: 'select', options: OPTIONS.academicYear })}
      ${checkboxGroupMarkup(role, 'interests', 'Interests', OPTIONS.interests)}
      ${securityFields(role)}`;
  }

  if (role === 'organizer') {
    return `
      ${fieldMarkup(role, { name: 'organizationName', label: 'Organizer / Club name', required: true, autocomplete: 'organization', placeholder: 'Your organization name' })}
      ${fieldMarkup(role, { name: 'contactName', label: "Contact person's full name", required: true, autocomplete: 'name', placeholder: 'Full name' })}
      ${contactFields(role)}
      ${fieldMarkup(role, { name: 'university', label: 'University / Institution', autocomplete: 'organization', placeholder: 'Affiliated institution' })}
      ${fieldMarkup(role, { name: 'organizationType', label: 'Organization type', type: 'select', options: OPTIONS.organizationType })}
      ${fieldMarkup(role, { name: 'website', label: 'Website / Social media link', type: 'url', placeholder: 'https://example.com' })}
      ${fieldMarkup(role, { name: 'description', label: 'Organization description', type: 'textarea', full: true, placeholder: 'What does your organization do?' })}
      ${securityFields(role)}`;
  }

  return `
    ${fieldMarkup(role, { name: 'companyName', label: 'Company / Enterprise name', required: true, autocomplete: 'organization', placeholder: 'Your company name' })}
    ${fieldMarkup(role, { name: 'contactName', label: "Contact person's full name", required: true, autocomplete: 'name', placeholder: 'Full name' })}
    ${contactFields(role)}
    ${fieldMarkup(role, { name: 'industry', label: 'Industry', type: 'select', options: OPTIONS.industry })}
    ${fieldMarkup(role, { name: 'website', label: 'Company website', type: 'url', placeholder: 'https://example.com' })}
    ${fieldMarkup(role, { name: 'address', label: 'Company address', placeholder: 'Business address' })}
    ${fieldMarkup(role, { name: 'description', label: 'Business description', type: 'textarea', full: true, placeholder: 'Tell us about your business' })}
    ${checkboxGroupMarkup(role, 'partnershipInterest', 'Partnership interest', OPTIONS.partnershipInterest)}
    ${securityFields(role)}`;
}

function showFieldError(field, message) {
  const error = $(`${field.id}-error`);
  field.setAttribute('aria-invalid', message ? 'true' : 'false');
  if (error) error.textContent = message;
}

function clearFieldError(field) {
  showFieldError(field, '');
}

function validateRegistration(form, role) {
  let valid = true;
  let firstInvalid = null;
  form.querySelectorAll('[required]').forEach((field) => {
    let message = '';
    if (field.type === 'checkbox' && !field.checked) {
      message = 'You must accept the Terms and Conditions to continue.';
    } else if (field.type !== 'checkbox' && !field.value.trim()) {
      message = 'This field is required.';
    } else if (field.type === 'email' && !field.validity.valid) {
      message = 'Enter a valid email address.';
    } else if (field.type === 'tel') {
      const digits = field.value.replace(/\D/g, '').length;
      if (!/^[+\d\s().-]+$/.test(field.value) || digits < 7 || digits > 15) {
        message = 'Enter a valid phone number with 7 to 15 digits.';
      }
    }

    showFieldError(field, message);
    if (message) {
      valid = false;
      firstInvalid ||= field;
    }
  });

  const password = form.elements.namedItem('password');
  const confirmPassword = form.elements.namedItem('confirmPassword');
  if (password.value && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password.value)) {
    showFieldError(password, 'Use 8+ characters with uppercase, lowercase, and a number.');
    valid = false;
    firstInvalid ||= password;
  }
  if (confirmPassword.value && password.value !== confirmPassword.value) {
    showFieldError(confirmPassword, 'Passwords do not match.');
    valid = false;
    firstInvalid ||= confirmPassword;
  }

  form.querySelectorAll('input[type="url"]').forEach((field) => {
    const message = field.value && !field.validity.valid ? 'Enter a valid URL, including https://.' : '';
    showFieldError(field, message);
    if (message) {
      valid = false;
      firstInvalid ||= field;
    }
  });

  if (!REGISTRATION_ROLES.includes(role)) return false;
  if (firstInvalid) firstInvalid.focus();
  return valid;
}

function formMessage(form, message, kind = 'notice') {
  const box = form.querySelector('[data-form-message]');
  box.textContent = message;
  box.dataset.kind = kind;
  box.hidden = false;
}

function collectFormData(form, role) {
  const data = {};
  for (const [key, value] of new FormData(form).entries()) {
    if (key === 'role' || key === 'terms') continue;
    if (Object.hasOwn(data, key)) {
      if (!Array.isArray(data[key])) data[key] = [data[key]];
      data[key].push(value);
    } else {
      data[key] = value;
    }
  }
  delete data.confirmPassword;
  data.role = role;
  return data;
}

async function submitRegistration(role, form) {
  if (!registrationEndpoint) {
    throw new Error('Registration is not connected to a backend yet. Your details have not been sent or saved, and no account has been created.');
  }

  const response = await fetch(registrationEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'omit',
    body: JSON.stringify(collectFormData(form, role)),
  });
  if (!response.ok) throw new Error(`Registration could not be completed (server returned ${response.status}). Please try again later.`);
  return response;
}

function passwordMarkup(id, label) {
  return `<div class="join-form-field full-width">
    <label class="join-field-label" for="${id}">${label} <span aria-hidden="true" class="text-rose-600">*</span></label>
    <div class="join-password-wrap">
      <input class="join-field" id="${id}" name="${id}" type="password" autocomplete="current-password" required aria-describedby="${id}-error" placeholder="Enter your password">
      <button type="button" class="join-password-toggle" data-toggle-password="${id}" aria-label="Show password">
        <span class="material-symbols-outlined" data-password-icon aria-hidden="true">visibility</span>
      </button>
    </div>
    <p class="join-form-error" id="${id}-error" aria-live="polite"></p>
  </div>`;
}

function registrationForm(role) {
  const copy = ROLE_COPY[role];
  modalIcon.textContent = copy.icon;
  modalEyebrow.textContent = `${role} account`;
  modalTitle.textContent = copy.title;
  modalDescription.textContent = copy.description;
  backButton.hidden = false;
  modalContent.innerHTML = `
    <form id="registrationForm" class="join-registration-form" novalidate>
      <input type="hidden" name="role" value="${role}">
      <div class="join-form-grid">${registrationFields(role)}</div>
      <div class="join-form-footer">
        <div class="join-form-message" data-form-message role="status" aria-live="polite" hidden></div>
        <button class="join-submit" type="submit">
          <span data-submit-label>${copy.submit}</span>
          <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </button>
      </div>
    </form>`;

  const form = $('registrationForm');
  form.querySelectorAll('input, select, textarea').forEach((field) => {
    field.addEventListener('input', () => clearFieldError(field));
    field.addEventListener('change', () => clearFieldError(field));
  });
  form.addEventListener('submit', (event) => onRegistrationSubmit(event, role));
}

async function onRegistrationSubmit(event, role) {
  event.preventDefault();
  const form = event.currentTarget;
  if (form.dataset.submitting === 'true') return;
  if (!validateRegistration(form, role)) return;

  const button = form.querySelector('button[type="submit"]');
  const label = button.querySelector('[data-submit-label]');
  form.dataset.submitting = 'true';
  button.disabled = true;
  label.textContent = 'Submitting…';
  try {
    await submitRegistration(role, form);
    form.reset();
    formMessage(form, 'Your registration was submitted successfully.', 'success');
  } catch (error) {
    formMessage(form, error instanceof Error ? error.message : 'Registration could not be completed. Please try again.');
  } finally {
    delete form.dataset.submitting;
    button.disabled = false;
    label.textContent = ROLE_COPY[role].submit;
  }
}

function signInForm() {
  modalIcon.textContent = 'login';
  modalEyebrow.textContent = 'Welcome back';
  modalTitle.textContent = 'Sign in to CampPN';
  modalDescription.textContent = 'Sign in to access your events, registrations, and profile.';
  backButton.hidden = true;
  modalContent.innerHTML = `
    <form id="signInForm" class="join-registration-form" novalidate>
      <div class="join-form-grid">
        ${fieldMarkup('login', { name: 'email', label: 'Email address', type: 'email', required: true, autocomplete: 'email', placeholder: 'you@example.com', full: true })}
        ${passwordMarkup('login-password', 'Password')}
        <p class="join-password-hint full-width">Sign-in only works for an account already created in this browser.</p>
      </div>
      <div class="join-form-footer">
        <div class="join-form-message" data-form-message role="alert" aria-live="polite" hidden></div>
        <button class="join-submit" type="submit"><span data-submit-label>Sign in</span><span class="material-symbols-outlined" aria-hidden="true">login</span></button>
      </div>
    </form>`;
  $('signInForm').addEventListener('submit', onSignInSubmit);
}

async function onSignInSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const email = form.elements.namedItem('email');
  const password = form.elements.namedItem('login-password');
  let firstInvalid = null;
  [email, password].forEach((field) => {
    const message = !field.value.trim()
      ? 'This field is required.'
      : (field.type === 'email' && !field.validity.valid ? 'Enter a valid email address.' : '');
    showFieldError(field, message);
    if (message && !firstInvalid) firstInvalid = field;
  });
  if (firstInvalid) {
    firstInvalid.focus();
    return;
  }

  const button = form.querySelector('button[type="submit"]');
  const label = button.querySelector('[data-submit-label]');
  button.disabled = true;
  label.textContent = 'Signing in…';
  try {
    await signIn({ email: email.value, password: password.value });
    const next = safeNext(new URLSearchParams(location.search).get('next'));
    location.href = next || pageUrl('Profile.html');
  } catch (error) {
    const message = error instanceof AuthError ? errorMessage(error) : 'Sign-in could not be completed. Please try again.';
    formMessage(form, message);
    if (error instanceof AuthError && error.code === 'CREDENTIALS') password.focus();
    button.disabled = false;
    label.textContent = 'Sign in';
  }
}

function openModal(trigger, render) {
  clearTimeout(closeTimer);
  restoreFocusTo = trigger;
  render();
  savedBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  modal.hidden = false;
  modal.classList.remove('is-open');
  requestAnimationFrame(() => modal.classList.add('is-open'));
  window.setTimeout(() => {
    const first = modalDialog.querySelector('input:not([type="hidden"]), select, textarea')
      || modalDialog.querySelector('button:not([data-modal-close])');
    first?.focus();
  }, 50);
}

function closeModal() {
  if (modal.hidden) return;
  modal.classList.remove('is-open');
  document.body.style.overflow = savedBodyOverflow;
  closeTimer = window.setTimeout(() => {
    modal.hidden = true;
    modalContent.replaceChildren();
    restoreFocusTo?.focus();
    restoreFocusTo = null;
  }, 210);
}

function trapDialogFocus(event) {
  if (event.key === 'Escape') {
    closeModal();
    return;
  }
  if (event.key !== 'Tab') return;

  const focusable = [...modalDialog.querySelectorAll('button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), a[href]')]
    .filter((element) => !element.hidden);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

document.querySelectorAll('[data-register]').forEach((button) => {
  button.addEventListener('click', () => {
    const role = button.dataset.register;
    if (!REGISTRATION_ROLES.includes(role)) return;
    openModal(button, () => registrationForm(role));
  });
});

document.querySelector('[data-open-signin]').addEventListener('click', (event) => {
  openModal(event.currentTarget, signInForm);
});

modal.addEventListener('click', (event) => {
  if (event.target.closest('[data-modal-close]') || event.target.closest('[data-modal-back]')) closeModal();
});
document.addEventListener('keydown', trapDialogFocus);

document.addEventListener('click', (event) => {
  const toggle = event.target.closest('[data-toggle-password]');
  if (!toggle) return;
  const input = $(toggle.dataset.togglePassword);
  if (!input) return;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  toggle.querySelector('[data-password-icon]').textContent = show ? 'visibility_off' : 'visibility';
  toggle.setAttribute('aria-label', `${show ? 'Hide' : 'Show'} password`);
});

initApp();
