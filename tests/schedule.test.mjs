import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduleRecords, scheduleState, scheduleChanges, planScheduleCommit } from '../assets/js/schedule-model.mjs';
import { createScheduleStore } from '../assets/js/schedule-store.mjs';

const empty = () => ({ employees: [], vehicles: [], jobs: [], drafts: [], candidates: [], board: {},
  clients: [], reminders: [], todos: [], todoArchive: [], orders: [], incoming: [], returns: [] });
const cell = () => ({ jobs: [], drafts: [], emps: [], vehs: [] });

function fakeFirestore() {
  const documents = new Map();
  const commits = [];
  let queue = Promise.resolve();
  const sdk = {
    collection: (_, ...parts) => parts.join('/'),
    doc: (collection, id) => `${collection}/${id}`,
    serverTimestamp: () => 'SERVER_TIME',
    runTransaction: (_, callback) => {
      const run = queue.then(async () => {
        const writes = new Map();
        const value = await callback({
          get: async ref => ({ exists: () => documents.has(ref), data: () => documents.get(ref) }),
          set: (ref, data) => writes.set(ref, data),
        });
        for (const [ref, data] of writes) documents.set(ref, data);
        if (writes.size) commits.push(writes);
        return value;
      });
      queue = run.catch(() => {});
      return run;
    },
  };
  return { sdk, documents, commits, store: uid => createScheduleStore(sdk, {}, { currentUser: uid ? { uid } : null }, 'romvos') };
}
const action = (revision, operationId, changes = []) => ({ expectedRevision: revision, operationId: operationId.padEnd(36, '0'), changes });

test('scheduling round trip preserves order, assignment references and rich text', () => {
  const state = empty();
  state.employees = [{ id: 'EMP-b', name: 'Second' }, { id: 'EMP-a', name: 'First' }];
  state.vehicles = [{ id: 'VEH-1', plate: 'TEST-1', outOfService: false }];
  state.drafts = [{ id: 'DRF-1', title: 'Appointment', richTitle: '<b>Appointment</b>' }];
  state.board['2026-11-02#1'] = { ...cell(), emps: ['EMP-b'], vehs: ['VEH-1'], drafts: ['DRF-1'] };
  assert.deepEqual(scheduleState(scheduleRecords(state)), state);
});

test('rendering empty cells and reordering object keys do not trigger writes', () => {
  const state = empty();
  state.board['2026-11-02#1'] = cell();
  assert.equal(scheduleRecords(state).size, 13);
  assert.equal(JSON.parse(scheduleRecords(state).get('module__board').payload)['2026-11-02#1'], undefined);
  const before = { ...empty(), employees: [{ id: 'EMP-1', name: 'Test' }] };
  const after = { ...empty(), employees: [{ name: 'Test', id: 'EMP-1' }] };
  assert.deepEqual(scheduleChanges(scheduleRecords(before), scheduleRecords(after)), []);
});

test('initial service import writes all 13 modules and metadata atomically', async () => {
  const server = fakeFirestore();
  const state = { ...empty(), clients: [{ id: 'CLI-1', name: 'Contact' }] };
  const records = scheduleRecords(state);
  const revision = await server.store('owner').commit(action(0, 'initial-backup', scheduleChanges(new Map(), records)));
  assert.equal(revision, 1);
  assert.equal(server.commits.length, 1);
  assert.equal(server.commits[0].size, 14);
  assert.equal(server.documents.get('workspaces/romvos/scheduling/_meta').schemaVersion, 3);
  assert.deepEqual(JSON.parse(server.documents.get('workspaces/romvos/scheduling/module__clients').payload), state.clients);
});

test('moving a candidate to a crew produces one coherent change set', async () => {
  const server = fakeFirestore();
  const before = { ...empty(), candidates: [{ id: 'CAN-1', title: 'Appointment' }] };
  const after = empty();
  after.drafts = [{ id: 'DRF-1', title: 'Appointment' }];
  after.board['2026-11-02#1'] = { ...cell(), drafts: ['DRF-1'] };
  const store = server.store('owner');
  await store.commit(action(0, 'initial', scheduleChanges(new Map(), scheduleRecords(before))));
  const changes = scheduleChanges(scheduleRecords(before), scheduleRecords(after));
  assert.equal(changes.length, 3);
  await store.commit(action(1, 'move', changes));
  const write = server.commits.at(-1);
  assert.equal(write.size, 4); // three changed modules + revision
  assert.deepEqual(JSON.parse(write.get('workspaces/romvos/scheduling/module__candidates').payload), []);
  assert([...write.values()].every(record => record.revision === 2 && record.updatedBy === 'owner'));
});

test('two clients editing the same revision cannot overwrite each other', async () => {
  const server = fakeFirestore();
  await server.store('owner').commit(action(0, 'initial'));
  const change = title => [{ id: 'module__drafts', kind: 'module', key: 'drafts', payload: JSON.stringify([{ id: 'DRF-1', title }]), deleted: false }];
  const results = await Promise.allSettled([
    server.store('alice').commit(action(1, 'alice-edit', change('Alice'))),
    server.store('bob').commit(action(1, 'bob-edit', change('Bob'))),
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.code, 'romvos/conflict');
  assert.equal(server.commits.length, 2);
  assert.equal(server.documents.get('workspaces/romvos/scheduling/module__drafts').updatedBy, 'alice');
});

test('retrying an acknowledged operation does not duplicate its writes', async () => {
  const server = fakeFirestore();
  const store = server.store('owner');
  assert.equal(await store.commit(action(0, 'same-operation')), 1);
  assert.equal(await store.commit(action(0, 'same-operation')), 1);
  assert.equal(server.commits.length, 1);
});

test('failed and oversized requests leave server data unchanged', async () => {
  const server = fakeFirestore();
  await assert.rejects(server.store(null).commit(action(0, 'no-user')), { code: 'romvos/signed-out' });
  await assert.rejects(server.store('owner').commit(action(0, 'too-big', Array(21).fill({ payload: '' }))), { code: 'romvos/too-large' });
  const oversized = [{ id: 'module__clients', kind: 'module', key: 'clients', payload: 'x'.repeat(900_001), deleted: false }];
  await assert.rejects(server.store('owner').commit(action(0, 'large-module', oversized)), /Invalid service change/);
  assert.equal(server.documents.size, 0);
  assert.equal(server.commits.length, 0);
  assert.throws(() => planScheduleCommit({ revision: 3, operationId: 'other' }, 2, 'stale'), { code: 'romvos/conflict' });
});

test('malformed cloud records are rejected before reaching the legacy UI', () => {
  assert.throws(() => scheduleState(new Map([['board__2026-11-02#1', { kind: 'board', key: '2026-11-02#1', payload: '{"emps":"not-an-array"}' }]])));
  assert.throws(() => scheduleRecords({ ...empty(), employees: [{ id: '../unsafe' }] }));
  assert.throws(() => scheduleRecords({ ...empty(), employees: [{ id: 'EMP-1' }, { id: 'EMP-1' }] }));
  assert.throws(() => scheduleRecords({ ...empty(), clients: [{ name: 'Missing ID' }] }));
});

test('all service modules preserve nested fields and order across a cloud round trip', () => {
  const state = empty();
  state.clients = [{ id: 'CLI-1', sites: [{ name: 'Site', phones: ['123'] }] }];
  state.reminders = [{ id: 'REM-1', text: 'Reminder', done: false, snoozeUntil: '2026-11-04T08:00:00Z' }];
  state.todos = [{ id: 'TODO-1', note: 'Full note', deadlineDate: '2026-11-05' }];
  state.todoArchive = [{ id: 'TODO-2', done: true }];
  state.orders = [{ id: 'ORD-1', paste: 'Original email', status: 'Pending' }];
  state.incoming = [{ id: 'EQ-1', items: [{ serial: 'TEST', qty: 2 }], technicianId: 'EMP-1' }];
  state.returns = [{ id: 'RET-1', documentType: 'Test', history: [{ date: '2026-11-02', text: 'Received' }] }];
  assert.deepEqual(scheduleState(scheduleRecords(state)), state);
});

test('archiving a todo atomically removes the active record and preserves its archive', async () => {
  const server = fakeFirestore();
  const before = { ...empty(), todos: [{ id: 'TODO-1', title: 'Task' }] };
  const after = { ...empty(), todoArchive: [{ id: 'TODO-1', title: 'Task', done: true }] };
  const store = server.store('owner');
  await store.commit(action(0, 'seed-todo', scheduleChanges(new Map(), scheduleRecords(before))));
  await store.commit(action(1, 'archive-todo', scheduleChanges(scheduleRecords(before), scheduleRecords(after))));
  const write = server.commits.at(-1);
  assert.equal(write.size, 3);
  assert.deepEqual(JSON.parse(write.get('workspaces/romvos/scheduling/module__todos').payload), []);
  assert.equal(JSON.parse(write.get('workspaces/romvos/scheduling/module__todoArchive').payload)[0].id, 'TODO-1');
  assert.equal(write.get('workspaces/romvos/scheduling/_meta').schemaVersion, 3);
});

test('removing the first of 431 contacts changes only the contacts module', () => {
  const before = { ...empty(), clients: Array.from({ length: 431 }, (_, i) => ({ id: `CLI-${i}`, name: `Contact ${i}` })) };
  const after = { ...before, clients: before.clients.slice(1) };
  const changes = scheduleChanges(scheduleRecords(before), scheduleRecords(after));
  assert.equal(changes.length, 1);
  assert.equal(changes[0].id, 'module__clients');
  assert.deepEqual(scheduleState(scheduleRecords(after)), after);
});

test('old schema 1 records remain readable until a schema 3 module takes precedence', () => {
  const records = new Map([
    ['employees__EMP-1', { kind: 'employees', key: 'EMP-1', payload: JSON.stringify({ value: { id: 'EMP-1' }, index: 1 }) }],
    ['employees__EMP-2', { kind: 'employees', key: 'EMP-2', payload: JSON.stringify({ value: { id: 'EMP-2' }, index: 0 }) }],
  ]);
  assert.deepEqual(scheduleState(records).employees.map(item => item.id), ['EMP-2', 'EMP-1']);
  records.set('module__employees', { kind: 'module', key: 'employees', payload: '[{"id":"EMP-1"},{"id":"EMP-2"}]' });
  assert.deepEqual(scheduleState(records).employees.map(item => item.id), ['EMP-1', 'EMP-2']);
});

test('only acknowledged supported service snapshots become an editing baseline', () => {
  const server = fakeFirestore();
  let receive;
  server.sdk.onSnapshot = (_, options, callback) => { receive = callback; return () => {}; };
  const accepted = [], errors = [];
  server.store('owner').watch(value => accepted.push(value), error => errors.push(error));
  const state = { ...empty(), clients: [{ id: 'CLI-1', name: 'Live contact' }] };
  const emit = (schemaVersion, metadata = {}) => receive({
    metadata: { fromCache: false, hasPendingWrites: false, ...metadata },
    forEach(callback) {
      callback({ id: '_meta', data: () => ({ revision: 1, schemaVersion }) });
      for (const [id, record] of scheduleRecords(state)) callback({ id, data: () => record });
      callback({ id: 'clients__CLI-deleted', data: () => ({ deleted: true }) });
    },
  });
  emit(2, { fromCache: true }); emit(2, { hasPendingWrites: true });
  assert.equal(accepted.length, 0);
  emit(2);
  assert.deepEqual(accepted[0].state, state);
  emit(99);
  assert.equal(accepted.length, 1);
  assert.equal(errors.length, 1);
});
