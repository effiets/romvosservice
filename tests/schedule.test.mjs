import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduleRecords, scheduleState, scheduleChanges, planScheduleCommit } from '../assets/js/schedule-model.mjs';
import { createScheduleStore } from '../assets/js/schedule-store.mjs';

const empty = () => ({ employees: [], vehicles: [], jobs: [], drafts: [], candidates: [], board: {} });
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
  assert.equal(scheduleRecords(state).size, 0);
  const before = { ...empty(), employees: [{ id: 'EMP-1', name: 'Test' }] };
  const after = { ...empty(), employees: [{ name: 'Test', id: 'EMP-1' }] };
  assert.deepEqual(scheduleChanges(scheduleRecords(before), scheduleRecords(after)), []);
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
  assert.equal(write.size, 4); // draft + board + candidate tombstone + revision
  assert.equal([...write.values()].find(record => record.kind === 'candidates').deleted, true);
  assert([...write.values()].every(record => record.revision === 2 && record.updatedBy === 'owner'));
});

test('two clients editing the same revision cannot overwrite each other', async () => {
  const server = fakeFirestore();
  await server.store('owner').commit(action(0, 'initial'));
  const change = title => [{ id: 'drafts__DRF-1', kind: 'drafts', key: 'DRF-1', payload: JSON.stringify({ value: { id: 'DRF-1', title }, index: 0 }), deleted: false }];
  const results = await Promise.allSettled([
    server.store('alice').commit(action(1, 'alice-edit', change('Alice'))),
    server.store('bob').commit(action(1, 'bob-edit', change('Bob'))),
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.code, 'romvos/conflict');
  assert.equal(server.commits.length, 2);
  assert.equal(server.documents.get('workspaces/romvos/scheduling/drafts__DRF-1').updatedBy, 'alice');
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
  await assert.rejects(server.store('owner').commit(action(0, 'too-big', Array(401).fill({ payload: '' }))), { code: 'romvos/too-large' });
  assert.equal(server.documents.size, 0);
  assert.equal(server.commits.length, 0);
  assert.throws(() => planScheduleCommit({ revision: 3, operationId: 'other' }, 2, 'stale'), { code: 'romvos/conflict' });
});

test('malformed cloud records are rejected before reaching the legacy UI', () => {
  assert.throws(() => scheduleState(new Map([['board__2026-11-02#1', { kind: 'board', key: '2026-11-02#1', payload: '{"emps":"not-an-array"}' }]])));
  assert.throws(() => scheduleRecords({ ...empty(), employees: [{ id: '../unsafe' }] }));
  assert.throws(() => scheduleRecords({ ...empty(), employees: [{ id: 'EMP-1' }, { id: 'EMP-1' }] }));
});
