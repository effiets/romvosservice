import { AUTH_SETTINGS } from './auth-config.mjs';
import { authErrorMessage, memberState } from './auth-policy.mjs';
import { connectFirebase } from './auth-service.mjs';
import { initializeScheduleUi } from './schedule-ui.mjs';
import { initializeBackupPreview } from './backup-preview.mjs';

const scheduling = initializeScheduleUi();
initializeBackupPreview();

const byId = id => document.getElementById(id);
const dialog = byId('accountDialog');
const form = byId('accountLoginForm');
const status = byId('accountStatus');
const details = byId('accountDetails');
const sidebar = byId('accountSummary');
const openButton = byId('accountOpen');
const closeButton = byId('accountClose');
const signOutButton = byId('accountSignOut');
const retryButton = byId('accountRetry');
const submitButton = byId('accountSubmit');
let service;
let connection;
let unsubscribeMember;
let membershipTimeout;
let generation = 0;
let approved = false;
let signingIn = false;
let currentUser = null;
let membershipKey;

function message(text, isError = false) {
  status.textContent = text;
  status.classList.toggle('account-error', isError);
}

function syncAccess() {
  const required = AUTH_SETTINGS.requireSignIn || scheduling.requiresAuth();
  closeButton.hidden = required && !approved;
  if (required && !approved && !dialog.open) dialog.showModal();
}

function setApproved(value, member) {
  approved = value;
  const key = value ? `${currentUser.uid}:${member.role}` : '';
  if (key !== membershipKey) {
    membershipKey = key;
    scheduling.membership(value
      ? { user: { uid: currentUser.uid, email: currentUser.email }, role: member.role, scheduling: service.scheduling }
      : {});
  }
  sidebar.textContent = value ? currentUser.email : 'Τοπική λειτουργία';
  openButton.textContent = value ? 'Λογαριασμός' : 'Σύνδεση χρήστη';
  syncAccess();
}

function watchUser(user) {
  const request = ++generation;
  clearTimeout(membershipTimeout);
  unsubscribeMember?.();
  unsubscribeMember = undefined;
  currentUser = user;
  setApproved(false);
  form.hidden = Boolean(user);
  signOutButton.hidden = !user;
  retryButton.hidden = true;
  details.hidden = !user;
  byId('accountEmailValue').textContent = user?.email || '';
  byId('accountUidValue').textContent = user?.uid || '';
  if (!user) {
    submitButton.disabled = signingIn;
    message('Συνδέσου με τον λογαριασμό της ομάδας σου.');
    return;
  }
  message('Έλεγχος πρόσβασης στην ομάδα…');
  membershipTimeout = setTimeout(() => {
    if (request !== generation) return;
    setApproved(false);
    message('Δεν επιβεβαιώθηκε η πρόσβαση. Έλεγξε το δίκτυο ή επικοινώνησε με τον υπεύθυνο και δοκίμασε ξανά.', true);
    retryButton.hidden = false;
  }, 15000);
  unsubscribeMember = service.watchMember(user.uid, snapshot => {
    if (request !== generation) return;
    const state = memberState(snapshot);
    if (state !== 'checking') {
      clearTimeout(membershipTimeout);
      retryButton.hidden = true;
    }
    setApproved(state === 'approved', state === 'approved' ? snapshot.data() : undefined);
    if (state === 'checking') message('Αναμονή επιβεβαίωσης πρόσβασης…');
    else if (state === 'denied') {
      message('Ο λογαριασμός συνδέθηκε, αλλά δεν έχει ενεργή πρόσβαση στην ομάδα. Επικοινώνησε με τον υπεύθυνο.', true);
    } else {
      message('Η σύνδεση και η πρόσβαση στην ομάδα επιβεβαιώθηκαν.');
      if ((AUTH_SETTINGS.requireSignIn || scheduling.requiresAuth()) && dialog.open) dialog.close();
    }
  }, error => {
    if (request !== generation) return;
    clearTimeout(membershipTimeout);
    setApproved(false);
    message(authErrorMessage(error), true);
    retryButton.hidden = false;
  });
}

function ensureConnection() {
  if (connection) return connection;
  message('Σύνδεση με την υπηρεσία…');
  submitButton.disabled = true;
  retryButton.hidden = true;
  connection = connectFirebase(AUTH_SETTINGS).then(result => {
    service = result;
    service.onUser(watchUser);
    return result;
  }).catch(error => {
    connection = undefined;
    message(authErrorMessage(error), true);
    retryButton.hidden = false;
    throw error;
  });
  return connection;
}

openButton.addEventListener('click', () => {
  if (!dialog.open) dialog.showModal();
  ensureConnection().catch(() => {});
});
closeButton.addEventListener('click', () => dialog.close());
dialog.addEventListener('cancel', event => {
  if ((AUTH_SETTINGS.requireSignIn || scheduling.requiresAuth()) && !approved) event.preventDefault();
});
dialog.addEventListener('close', () => { byId('accountPassword').value = ''; });
retryButton.addEventListener('click', () => {
  if (service) watchUser(currentUser);
  else ensureConnection().catch(() => {});
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (signingIn || !form.reportValidity()) return;
  signingIn = true;
  submitButton.disabled = true;
  const email = byId('accountEmail').value.trim();
  const password = byId('accountPassword').value;
  byId('accountPassword').value = '';
  message('Σύνδεση…');
  try {
    const client = await ensureConnection();
    await client.signIn(email, password);
  } catch (error) {
    message(authErrorMessage(error), true);
  } finally {
    signingIn = false;
    submitButton.disabled = false;
  }
});

signOutButton.addEventListener('click', async () => {
  signOutButton.disabled = true;
  try { await service.signOut(); }
  catch (error) { message(authErrorMessage(error), true); }
  finally { signOutButton.disabled = false; }
});

// Optional during setup. Once required, failure never falls back to local access.
syncAccess();
window.addEventListener('romvos:schedule-mode', syncAccess);
if (AUTH_SETTINGS.requireSignIn || scheduling.requiresAuth()) ensureConnection().catch(() => {});
