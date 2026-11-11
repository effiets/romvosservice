import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const storageScript = readFileSync(new URL('../assets/js/service-storage.js', import.meta.url), 'utf8');
const bridgeScript = readFileSync(new URL('../assets/js/schedule-bridge.js', import.meta.url), 'utf8');
const clone = value => JSON.parse(JSON.stringify(value));

function fixture(initial = {}, options = {}) {
  const backing = new Map(Object.entries(initial));
  class Storage {
    data;
    constructor(data = new Map()) { this.data = data; }
    getItem(key) { return this.data.get(String(key)) ?? null; }
    setItem(key, value) { this.data.set(String(key), String(value)); }
    removeItem(key) { this.data.delete(String(key)); }
    clear() { this.data.clear(); }
  }
  const win = new EventTarget();
  win.ROMVOS_SHARED_ONLY = options.sharedOnly === true;
  const listeners = new Map();
  const elements = new Map();
  const doc = {
    addEventListener(type, callback) { const callbacks = listeners.get(type) || []; callbacks.push(callback); listeners.set(type, callbacks); },
    querySelector: selector => selector === '.app' ? {} : null,
    querySelectorAll: () => [],
    getElementById: id => elements.get(id),
  };
  const context = vm.createContext({ window: win, document: doc, Storage, localStorage: new Storage(backing),
    sessionStorage: new Storage(), Event, CustomEvent, queueMicrotask, render() {}, renderBoard() {},
    K: { e: 'cf_employees', v: 'cf_vehicles', j: 'cf_jobs', c: 'cf_clients', b: 'romvos_board', d: 'romvos_board_drafts', p: 'romvos_board_candidates_v1' },
    E: [], V: [], J: [], C: [], B: {}, D: [], CAND: [], SIMPLE_REMINDERS: [], ORDERS: [], INCOMING: [], RETURNS: [],
  });
  win.clearOrder = () => {};
  vm.runInContext(storageScript, context);
  vm.runInContext(bridgeScript, context);
  let saves = 0;
  win.addEventListener('romvos:schedule-saved', () => saves++);
  return { context, win, backing, storage: context.localStorage, bridge: win.romvosScheduleBridge,
    saves: () => saves,
    input: id => (listeners.get('input') || []).forEach(callback => callback({ target: { id } })),
  };
}

test('direct popup writes refresh globals while cloud applies never trigger another save', () => {
  const app = fixture();
  const returns = [{ id: 'RET-1', status: 'Received', history: [{ text: 'Popup action' }] }];
  app.storage.setItem('romvos_pending_returns', JSON.stringify(returns));
  assert.deepEqual(clone(app.context.RETURNS), returns);
  assert.deepEqual(clone(app.bridge.capture().returns), returns);
  const current = app.bridge.capture();
  current.clients = [{ id: 'CLI-1', name: 'Contact', sites: [{ name: 'Branch' }] }];
  app.bridge.apply(current);
  assert.equal(app.saves(), 1);
  assert.deepEqual(JSON.parse(app.storage.getItem('cf_clients')), current.clients);
});

test('startup and viewer writes cannot change business lists in shared mode', () => {
  const original = JSON.stringify([{ id: 'TODO-1', title: 'Original' }]);
  const app = fixture({ romvos_shared_schedule_v1: 'true', romvos_todo_v1: original });
  app.storage.setItem('romvos_todo_v1', '[]');
  assert.equal(app.storage.getItem('romvos_todo_v1'), original);
  app.win.romvosServiceBeforeWrite = () => false;
  app.storage.removeItem('romvos_todo_v1');
  assert.equal(app.storage.getItem('romvos_todo_v1'), original);
  assert.throws(() => app.storage.clear(), /εισαγωγής/);
  assert.equal(app.saves(), 0);
});

test('required cloud mode blocks local business writes before sign-in finishes', () => {
  const original = JSON.stringify([{ id: 'TODO-1', title: 'Last local copy' }]);
  const app = fixture({ romvos_todo_v1: original }, { sharedOnly: true });
  app.storage.setItem('romvos_todo_v1', '[]');
  app.storage.removeItem('romvos_todo_v1');
  assert.equal(app.storage.getItem('romvos_todo_v1'), original);
  assert.throws(() => app.storage.clear(), /εισαγωγής/);
  assert.equal(app.saves(), 0);
});

test('preferences, other HTML datasets and session storage do not enqueue service saves', () => {
  const app = fixture({ romvos_shared_schedule_v1: 'true' });
  app.storage.setItem('romvos_inventory_v32_items', '[{"id":"OTHER"}]');
  app.storage.setItem('romvos_alert_position', '{"left":10}');
  app.context.sessionStorage.setItem('cf_clients', 'session-only');
  assert.equal(app.saves(), 0);
  assert.equal(app.backing.get('romvos_inventory_v32_items'), '[{"id":"OTHER"}]');
  assert.equal(app.context.sessionStorage.getItem('cf_clients'), 'session-only');
});

test('another tab cannot replace the baseline used by legacy popup readers', () => {
  const original = '[{"id":"TODO-1","title":"Original"}]';
  const app = fixture({ romvos_todo_v1: original });
  app.backing.set('romvos_todo_v1', '[{"id":"TODO-2","title":"Other tab"}]');
  assert.equal(app.storage.getItem('romvos_todo_v1'), original);
  assert.equal(app.bridge.capture().todos[0].id, 'TODO-1');
});

test('editing only an inline date defers updates until the editor is cleared', () => {
  const app = fixture();
  assert.equal(app.bridge.editorOpen(), false);
  app.input('ordExpectedDate');
  assert.equal(app.bridge.editorOpen(), true);
  app.win.clearOrder();
  assert.equal(app.bridge.editorOpen(), false);
  app.input('ordSearch');
  assert.equal(app.bridge.editorOpen(), false);
});

test('upgrading a shared session preserves the original additional lists before cloud load', () => {
  const clients = [{ id: 'CLI-1', name: 'Local contact' }];
  const app = fixture({ romvos_shared_schedule_v1: 'true',
    romvos_local_schedule_before_cloud_v1: '{"employees":[]}', cf_clients: JSON.stringify(clients) });
  const preserved = JSON.parse(app.storage.getItem('romvos_local_schedule_before_cloud_v1'));
  assert.deepEqual(preserved.clients, clients);
  app.bridge.apply(app.bridge.capture());
  assert.deepEqual(JSON.parse(app.storage.getItem('romvos_local_schedule_before_cloud_v1')).clients, clients);
});

test('a locally saved form stops blocking activation after its controller clears it', async () => {
  const app = fixture();
  app.input('simpleRemDate');
  assert.equal(app.bridge.editorOpen(), true);
  app.storage.setItem('romvos_simple_reminders', '[{"id":"REM-1","text":"Saved reminder"}]');
  await new Promise(resolve => queueMicrotask(resolve));
  assert.equal(app.bridge.editorOpen(), false);
});
