import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeScheduleUi } from '../assets/js/schedule-ui.mjs';
import { scheduleRecords } from '../assets/js/schedule-model.mjs';

const baseState = title => ({ employees: [], vehicles: [], jobs: [], drafts: [],
  candidates: [{ id: 'CAN-1', title }], board: {} });
const snapshot = (revision, title) => {
  const state = baseState(title);
  return { revision, initialized: true, state, records: scheduleRecords(state) };
};
const tick = () => new Promise(resolve => setImmediate(resolve));

function fixture(role = 'owner') {
  const savedGlobals = Object.fromEntries(['window', 'document', 'localStorage', 'MutationObserver'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  class Element extends EventTarget {
    hidden = false; disabled = false; open = false; textContent = '';
    classList = { toggle() {} };
    showModal() { this.open = true; }
    close() { this.open = false; }
    click() { this.dispatchEvent(new Event('click')); }
    querySelectorAll() { return []; }
  }
  const elements = new Map();
  const doc = new EventTarget();
  doc.getElementById = id => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  doc.querySelectorAll = () => [];
  const storage = new Map([['romvos_shared_schedule_v1', 'true']]);
  let current = baseState('Original');
  let editing = false;
  let listener;
  let remote = snapshot(1, 'Original');
  const calls = [];
  const bridge = {
    capture: () => structuredClone(current),
    apply: state => { current = structuredClone(state); },
    editorOpen: () => editing,
    lock() {},
  };
  const win = new EventTarget(); win.romvosScheduleBridge = bridge;
  Object.assign(globalThis, {
    window: win, document: doc,
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    MutationObserver: class { observe() {} },
  });
  const service = {
    watch(callback) { listener = callback; callback(remote); return () => {}; },
    async commit(action) {
      calls.push(action);
      if (action.expectedRevision !== remote.revision) throw Object.assign(new Error('Conflict'), { code: 'romvos/conflict' });
      remote = { revision: remote.revision + 1, initialized: true, state: action.desired, records: scheduleRecords(action.desired) };
      listener(remote);
      return remote.revision;
    },
  };
  const ui = initializeScheduleUi();
  ui.membership({ user: { uid: 'owner', email: 'owner@example.test' }, role, scheduling: service });
  return {
    storage, elements, calls, win, bridge, document: doc,
    current: () => current,
    edit: title => { current = baseState(title); },
    editing: value => { editing = value; },
    remote: (revision, title) => { remote = snapshot(revision, title); listener(remote); },
    restore: () => { for (const [key, descriptor] of Object.entries(savedGlobals)) { if (!descriptor) delete globalThis[key]; else Object.defineProperty(globalThis, key, descriptor); } },
  };
}

test('an open editor keeps its original revision and preserves a rejected change', async () => {
  const app = fixture();
  try {
    app.editing(true); app.edit('My draft');
    app.remote(2, 'Other user');
    assert.equal(app.current().candidates[0].title, 'My draft');
    app.editing(false);
    app.win.dispatchEvent(new Event('romvos:schedule-saved'));
    await tick();
    assert.equal(app.calls[0].expectedRevision, 1);
    assert.equal(app.current().candidates[0].title, 'My draft');
    assert.equal(app.elements.get('scheduleDialog').open, true);
    const recovery = JSON.parse(app.storage.get('romvos_unsaved_schedule_v1_owner'));
    assert.equal(recovery.desired.candidates[0].title, 'My draft');
    app.elements.get('scheduleReload').click();
    assert.equal(app.current().candidates[0].title, 'Other user');
    assert(app.storage.has('romvos_unsaved_schedule_v1_owner_previous'));
    assert.equal(app.elements.get('scheduleRecovery').hidden, false);
  } finally { app.restore(); }
});

test('successful saves handle the server listener arriving before the transaction returns', async () => {
  const app = fixture();
  try {
    app.edit('Saved change');
    app.win.dispatchEvent(new Event('romvos:schedule-saved'));
    await tick();
    assert.equal(app.current().candidates[0].title, 'Saved change');
    assert.equal(app.elements.get('scheduleSummary').textContent, 'Κοινό πρόγραμμα · αποθηκευμένο');
    assert.equal(app.storage.has('romvos_unsaved_schedule_v1_owner'), false);
    app.remote(3, 'Another live update');
    assert.equal(app.current().candidates[0].title, 'Another live update');
  } finally { app.restore(); }
});

test('viewer changes are reverted before the local save and never reach the store', () => {
  const app = fixture('viewer');
  try {
    app.edit('Not permitted');
    assert.equal(app.win.romvosScheduleBeforeSave(), false);
    assert.equal(app.current().candidates[0].title, 'Original');
    assert.equal(app.calls.length, 0);
  } finally { app.restore(); }
});

test('closing a resource editor applies a deferred live update', async () => {
  const app = fixture();
  try {
    app.editing(true);
    app.remote(2, 'Live update');
    assert.equal(app.current().candidates[0].title, 'Original');
    app.editing(false);
    app.document.dispatchEvent(new Event('click'));
    await tick();
    assert.equal(app.current().candidates[0].title, 'Live update');
    assert.equal(app.calls.length, 0);
  } finally { app.restore(); }
});
