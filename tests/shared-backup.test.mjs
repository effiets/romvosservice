import test from 'node:test';
import assert from 'node:assert/strict';
import { createSharedServiceBackup, prepareServiceBackup, SERVICE_BACKUP_FIELDS,
  sharedBackupFilename } from '../assets/js/backup-service.mjs';

const state = () => ({
  employees: [{ id: 'EMP-1', name: 'Technician' }],
  vehicles: [{ id: 'VEH-1', plate: 'TEST-1' }],
  jobs: [],
  drafts: [{ id: 'DRF-1', richTitle: '<b>Appointment</b>' }],
  candidates: [],
  board: { '2026-07-29#5': { jobs: [], drafts: ['DRF-1'], emps: ['EMP-1'], vehs: ['VEH-1'] } },
  clients: [{ id: 'CLI-1', sites: [{ name: 'Branch' }] }],
  reminders: [{ id: 'REM-1', text: 'Reminder' }],
  todos: [{ id: 'TODO-1', title: 'Task' }],
  todoArchive: [{ id: 'TODO-2', done: true }],
  orders: [{ id: 'ORD-1', status: 'Pending' }],
  incoming: [{ id: 'INC-1', items: [{ serial: 'A' }] }],
  returns: [{ id: 'RET-1', history: [{ text: 'Received' }] }],
});

const metadata = {
  revision: 7,
  operationId: '12345678-1234-1234-1234-123456789012',
  createdAt: '2026-11-02T16:30:45.000Z',
  createdBy: { uid: 'owner-uid', email: 'owner@example.test' },
};

test('shared backup contains only all 13 service modules and round trips exactly', () => {
  const source = state();
  const payload = createSharedServiceBackup({ state: source, ...metadata });
  assert.deepEqual(Object.keys(payload.storage).sort(), Object.values(SERVICE_BACKUP_FIELDS).sort());
  assert.equal(payload.shared.cloudDocuments, 13);
  assert.equal(payload.shared.revision, 7);
  assert.equal(payload.shared.serviceRecords, 11);
  assert.equal(Object.hasOwn(payload.storage, 'romvos_shared_schedule_v1'), false);
  const prepared = prepareServiceBackup(JSON.stringify(payload));
  assert.deepEqual(prepared.state, source);
  assert.equal(prepared.state.board['2026-07-29#5'].drafts[0], 'DRF-1');
  assert.equal(prepared.shared.revision, 7);
});

test('shared backup metadata and completeness are validated before restore', () => {
  const payload = createSharedServiceBackup({ state: state(), ...metadata });
  payload.shared.serviceRecords++;
  assert.throws(() => prepareServiceBackup(JSON.stringify(payload)), /κοινής βάσης/);
  const missing = createSharedServiceBackup({ state: state(), ...metadata });
  delete missing.storage.cf_clients;
  assert.throws(() => prepareServiceBackup(JSON.stringify(missing)), /cf_clients/);
  const oversized = createSharedServiceBackup({ state: state(), ...metadata });
  oversized.storage.cf_clients = JSON.stringify([{ id: 'CLI-1', notes: 'x'.repeat(900_001) }]);
  delete oversized.shared;
  delete oversized.backupType;
  delete oversized.backupVersion;
  assert.throws(() => prepareServiceBackup(JSON.stringify(oversized)), /μεγαλύτερη/);
});

test('shared backup filename is deterministic and filesystem safe', () => {
  const filename = sharedBackupFilename(metadata.createdAt, metadata.revision);
  assert.equal(filename, 'ROMVOS_SHARED_BACKUP_2026-11-02T16-30-45Z_REV-7.json');
  assert.equal(filename.includes(':'), false);
});
