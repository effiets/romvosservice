import test from 'node:test';
import assert from 'node:assert/strict';
import { authErrorMessage, memberState, validateFirebaseConfig } from '../assets/js/auth-policy.mjs';
import { AUTH_SETTINGS } from '../assets/js/auth-config.mjs';

const snapshot = (data, fromCache = false) => ({
  metadata: { fromCache }, exists: () => data !== null, data: () => data,
});

test('only server-confirmed active team members are approved', () => {
  for (const role of ['owner', 'editor', 'viewer']) {
    assert.equal(memberState(snapshot({ active: true, role })), 'approved');
    assert.equal(memberState(snapshot({ active: true, role }, true)), 'checking');
  }
});

test('missing, disabled, and malformed membership cannot grant access', () => {
  for (const entry of [null, {}, { active: false, role: 'owner' },
    { active: 'true', role: 'editor' }, { active: true, role: 'admin' }]) {
    assert.equal(memberState(snapshot(entry)), 'denied');
  }
  // A previously approved member loses access when the server revokes it.
  assert.equal(memberState(snapshot({ active: true, role: 'editor' })), 'approved');
  assert.equal(memberState(snapshot({ active: false, role: 'editor' })), 'denied');
});

test('invalid credentials do not disclose whether an account exists', () => {
  const codes = ['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password'];
  assert.equal(new Set(codes.map(code => authErrorMessage({ code }))).size, 1);
  assert(!authErrorMessage(new Error('private diagnostic')).includes('private diagnostic'));
});

test('Firebase configuration must belong to the intended project', () => {
  // Hosting's auto-config may omit appId; Auth and Firestore do not require it.
  const config = { projectId: 'romvos-service', apiKey: 'public-key', authDomain: 'romvos-service.firebaseapp.com' };
  assert.equal(validateFirebaseConfig(config, 'romvos-service'), config);
  for (const invalid of [null, {}, { ...config, projectId: 'another-project' }, { ...config, apiKey: '' }]) {
    assert.throws(() => validateFirebaseConfig(invalid, 'romvos-service'), { code: 'romvos/config' });
  }
});

test('the production service requires approved sign-in for the shared database', () => {
  assert.equal(AUTH_SETTINGS.requireSignIn, true);
  assert.equal(AUTH_SETTINGS.workspaceId, 'romvos');
});
