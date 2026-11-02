import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeScheduleUi } from '../assets/js/schedule-ui.mjs';
import { scheduleRecords } from '../assets/js/schedule-model.mjs';
import { createSharedServiceBackup, prepareServiceBackup } from '../assets/js/backup-service.mjs';

const baseState = title => ({ employees: [], vehicles: [], jobs: [], drafts: [],
  candidates: [{ id: 'CAN-1', title }], board: {}, clients: [], reminders: [], todos: [],
  todoArchive: [], orders: [], incoming: [], returns: [] });
const snapshot = (revision, title) => {
  const state = baseState(title);
  return { revision, initialized: true, schemaVersion: 3, state, records: scheduleRecords(state),
    operationId: `snapshot-${revision}`.padEnd(36, '0') };
};
const tick = () => new Promise(resolve => setImmediate(resolve));

function fixture(role = 'owner', initial = {}, options = {}) {
  const savedGlobals = Object.fromEntries(['window', 'document', 'localStorage', 'MutationObserver', 'confirm'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
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
  const storage = new Map(options.shared === false ? [] : [['romvos_shared_schedule_v1', 'true']]);
  let current = { ...baseState('Original'), ...initial };
  let editing = false;
  let locked = false;
  let listener;
  const remoteState = options.remoteTitle ? baseState(options.remoteTitle) : current;
  let remote = options.initialized === false
    ? { revision: 0, initialized: false, state: baseState(''), records: new Map() }
    : { ...snapshot(1, 'Original'), state: structuredClone(remoteState), records: scheduleRecords(remoteState) };
  const calls = [];
  const downloads = [];
  const alerts = [];
  const legacyCalls = [];
  const bridge = {
    capture: () => structuredClone(current),
    apply: state => { current = structuredClone(state); },
    editorOpen: () => editing,
    lock(value) { locked = value; },
  };
  const win = new EventTarget(); win.romvosScheduleBridge = bridge;
  win.backupAllRomvosData = () => legacyCalls.push('backup');
  win.restoreAllRomvosData = () => legacyCalls.push('restore');
  Object.assign(globalThis, {
    window: win, document: doc,
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    MutationObserver: class { observe() {} },
    confirm: () => true,
  });
  const service = {
    watch(callback) { listener = callback; callback(remote); return () => {}; },
    async commit(action) {
      calls.push(action);
      if (action.expectedRevision !== remote.revision) throw Object.assign(new Error('Conflict'), { code: 'romvos/conflict' });
      remote = { revision: remote.revision + 1, initialized: true, schemaVersion: 3,
        state: action.desired, records: scheduleRecords(action.desired), operationId: action.operationId };
      listener(remote);
      return remote.revision;
    },
  };
  const ui = initializeScheduleUi({
    sharedOnly: options.sharedOnly === true,
    download: (text, filename) => downloads.push({ text, filename }),
    now: () => new Date('2026-11-02T16:30:45.000Z'),
    alert: message => alerts.push(message),
    confirm: message => typeof options.confirm === 'function' ? options.confirm(message) : options.confirm !== false,
    prompt: () => options.prompt ?? 'ΕΠΑΝΑΦΟΡΑ',
  });
  ui.membership({ user: { uid: 'owner', email: 'owner@example.test' }, role, scheduling: service });
  return {
    storage, elements, calls, downloads, alerts, legacyCalls, win, bridge, document: doc,
    current: () => current,
    locked: () => locked,
    ui,
    edit: title => { current = baseState(title); },
    editService: patch => { Object.assign(current, structuredClone(patch)); },
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

test('multiple legacy writes in one action become one service transaction', async () => {
  const app = fixture('editor', { todos: [{ id: 'TODO-1', title: 'Task' }] });
  try {
    app.editService({ todoArchive: [{ id: 'TODO-1', title: 'Task', done: true }] });
    app.win.dispatchEvent(new Event('romvos:schedule-saved'));
    app.editService({ todos: [] });
    app.win.dispatchEvent(new Event('romvos:schedule-saved'));
    await tick();
    assert.equal(app.calls.length, 1);
    assert.equal(app.calls[0].changes.length, 2);
    assert(app.calls[0].changes.some(change => change.key === 'todos'));
    assert(app.calls[0].changes.some(change => change.key === 'todoArchive'));
  } finally { app.restore(); }
});

test('viewer popup writes are denied and post-write legacy assignments are reverted', async () => {
  const app = fixture('viewer', { returns: [{ id: 'RET-1', status: 'Pending' }] });
  try {
    assert.equal(app.win.romvosServiceBeforeWrite(), false);
    app.editService({ returns: [{ id: 'RET-1', status: 'Unauthorized' }] });
    await tick();
    assert.equal(app.current().returns[0].status, 'Pending');
    assert.equal(app.calls.length, 0);
  } finally { app.restore(); }
});

test('required shared mode automatically loads cloud data and subsequent live updates', () => {
  const app = fixture('editor', { candidates: [{ id: 'CAN-1', title: 'Local copy' }] },
    { shared: false, sharedOnly: true, remoteTitle: 'Cloud copy' });
  try {
    assert.equal(app.current().candidates[0].title, 'Cloud copy');
    assert.equal(app.storage.get('romvos_shared_schedule_v1'), 'true');
    assert.equal(app.elements.get('scheduleJoin').hidden, true);
    assert.equal(app.elements.get('scheduleLocal').hidden, true);
    assert.equal(app.elements.get('scheduleSummary').textContent, 'Κοινό πρόγραμμα · αποθηκευμένο');
    assert.equal(app.locked(), false);
    app.remote(2, 'Other user live change');
    assert.equal(app.current().candidates[0].title, 'Other user live change');
    app.elements.get('scheduleLocal').click();
    assert.equal(app.storage.get('romvos_shared_schedule_v1'), 'true');
  } finally { app.restore(); }
});

test('required shared mode blocks an editor while the common database is empty', () => {
  const app = fixture('editor', {}, { shared: false, sharedOnly: true, initialized: false });
  try {
    assert.equal(app.ui.requiresAuth(), true);
    assert.equal(app.locked(), true);
    assert.equal(app.elements.get('scheduleDialog').open, true);
    assert.equal(app.elements.get('scheduleClose').hidden, true);
    assert.equal(app.elements.get('scheduleImportBackup').hidden, true);
    assert.equal(app.win.romvosScheduleBeforeSave(), false);
    assert.equal(app.win.romvosServiceBeforeWrite(), false);
    const restoreInput = { value: 'selected' };
    assert.equal(app.win.backupAllRomvosData(), null);
    assert.equal(app.win.restoreAllRomvosData(restoreInput), false);
    assert.equal(restoreInput.value, '');
    assert.deepEqual(app.legacyCalls, []);
    app.elements.get('scheduleClose').click();
    assert.equal(app.elements.get('scheduleDialog').open, true);
    let accountOpened = false;
    app.document.getElementById('accountOpen').addEventListener('click', () => { accountOpened = true; });
    app.elements.get('scheduleAccount').click();
    assert.equal(accountOpened, true);
    assert.equal(app.elements.get('scheduleDialog').open, false);
  } finally { app.restore(); }
});

test('owner can initialize required shared mode once from a validated backup selection', async () => {
  const app = fixture('owner', {}, { sharedOnly: true, initialized: false });
  try {
    assert.equal(app.storage.has('romvos_shared_schedule_v1'), false);
    const desired = { ...baseState('Imported'), clients: [{ id: 'CLI-1', name: 'Imported contact' }],
      board: { '2026-07-29#5': { jobs: [], drafts: [], emps: ['EMP-old'], vehs: [] } } };
    const records = scheduleRecords(desired);
    app.win.dispatchEvent(new CustomEvent('romvos:backup-selected', { detail: {
      state: desired, records, fileName: 'ROMVOS_BACKUP.json', source: { createdAt: '2026-11-02T06:48:00Z' },
    } }));
    assert.equal(app.elements.get('scheduleImportBackup').hidden, false);
    app.elements.get('scheduleImportBackup').click();
    await tick();
    assert.equal(app.calls.length, 1);
    assert.equal(app.calls[0].expectedRevision, 0);
    assert.equal(app.calls[0].changes.length, 13);
    assert.equal(app.current().clients[0].name, 'Imported contact');
    assert.equal(app.current().board['2026-07-29#5'].emps[0], 'EMP-old');
    assert.equal(app.storage.get('romvos_shared_schedule_v1'), 'true');
    const preserved = JSON.parse(app.storage.get('romvos_local_schedule_before_cloud_v1'));
    assert.equal(preserved.candidates[0].title, 'Original');
  } finally { app.restore(); }
});

test('owner backup exports the acknowledged cloud snapshot and marks its revision', () => {
  const app = fixture();
  try {
    app.edit('Unsaved browser value');
    const result = app.win.backupAllRomvosData();
    assert(result);
    assert.equal(app.downloads.length, 1);
    const prepared = prepareServiceBackup(app.downloads[0].text);
    assert.equal(prepared.state.candidates[0].title, 'Original');
    assert.match(app.downloads[0].filename, /REV-1\.json$/);
    assert.equal(JSON.parse(app.storage.get('romvos_last_shared_backup_v1')).revision, 1);
    assert.match(app.elements.get('romvosBackupHint').textContent, /Τελευταίο backup/);
  } finally { app.restore(); }
});

test('editor cannot use shared backup or restore controls', async () => {
  const app = fixture('editor');
  try {
    assert.equal(app.elements.get('romvosBackupButton').hidden, true);
    assert.equal(app.win.backupAllRomvosData(), null);
    const input = { files: [{ name: 'backup.json', size: 10, text: async () => '{}' }], value: 'selected' };
    assert.equal(await app.win.restoreAllRomvosData(input), false);
    assert.equal(app.downloads.length, 0);
    assert.equal(app.calls.length, 0);
    assert.equal(input.value, '');
  } finally { app.restore(); }
});

test('owner restore downloads the current server state then commits atomically', async () => {
  const app = fixture();
  try {
    const desired = { ...baseState('Restored'), clients: [{ id: 'CLI-1', name: 'Restored contact' }] };
    const payload = createSharedServiceBackup({ state: desired, revision: 4,
      operationId: 'restore-source'.padEnd(36, '0'), createdAt: '2026-11-01T16:00:00.000Z',
      createdBy: { uid: 'owner', email: 'owner@example.test' } });
    const text = JSON.stringify(payload);
    const input = { files: [{ name: 'ROMVOS_SHARED_BACKUP.json', size: text.length, text: async () => text }], value: 'selected' };
    assert.equal(await app.win.restoreAllRomvosData(input), true);
    assert.equal(app.calls.length, 1);
    assert.equal(app.calls[0].expectedRevision, 1);
    assert.equal(app.calls[0].changes.length, 2);
    assert.equal(app.current().candidates[0].title, 'Restored');
    assert.equal(app.current().clients[0].name, 'Restored contact');
    assert.match(app.downloads[0].filename, /^ROMVOS_BEFORE_RESTORE_/);
    assert(app.storage.has('romvos_pre_restore_shared_backup_v1'));
    assert.equal(input.value, '');
  } finally { app.restore(); }
});

test('cancelled restore leaves the shared database unchanged', async () => {
  const app = fixture('owner', {}, { confirm: false });
  try {
    const desired = baseState('Cancelled restore');
    const payload = createSharedServiceBackup({ state: desired, revision: 2,
      operationId: 'cancelled'.padEnd(36, '0'), createdAt: '2026-11-01T16:00:00.000Z',
      createdBy: { uid: 'owner', email: 'owner@example.test' } });
    const text = JSON.stringify(payload);
    const input = { files: [{ name: 'backup.json', size: text.length, text: async () => text }], value: 'selected' };
    assert.equal(await app.win.restoreAllRomvosData(input), false);
    assert.equal(app.calls.length, 0);
    assert.equal(app.downloads.length, 0);
  } finally { app.restore(); }
});

test('restore is cancelled if the cloud revision changes during confirmation', async () => {
  let app;
  app = fixture('owner', {}, { confirm: () => { app.remote(2, 'Concurrent update'); return true; } });
  try {
    const desired = baseState('Stale restore');
    const payload = createSharedServiceBackup({ state: desired, revision: 2,
      operationId: 'stale-restore'.padEnd(36, '0'), createdAt: '2026-11-01T16:00:00.000Z',
      createdBy: { uid: 'owner', email: 'owner@example.test' } });
    const text = JSON.stringify(payload);
    const input = { files: [{ name: 'backup.json', size: text.length, text: async () => text }], value: 'selected' };
    assert.equal(await app.win.restoreAllRomvosData(input), false);
    assert.equal(app.calls.length, 0);
    assert.equal(app.downloads.length, 0);
    assert.equal(app.current().candidates[0].title, 'Concurrent update');
  } finally { app.restore(); }
});

test('local mode delegates to the original local backup tools', () => {
  const app = fixture('owner', {}, { shared: false, sharedOnly: false, initialized: false });
  try {
    app.win.backupAllRomvosData();
    app.win.restoreAllRomvosData({});
    assert.deepEqual(app.legacyCalls, ['backup', 'restore']);
    assert.equal(app.downloads.length, 0);
  } finally { app.restore(); }
});
