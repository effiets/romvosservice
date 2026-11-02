import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareServiceBackup, SERVICE_BACKUP_FIELDS } from '../assets/js/backup-service.mjs';
import { scheduleRecords } from '../assets/js/schedule-model.mjs';

const complete = values => JSON.stringify({
  app: 'ROMVOS SERVICE', createdAt: '2026-11-02T06:48:00.060Z',
  storage: Object.fromEntries(Object.entries(SERVICE_BACKUP_FIELDS).map(([field, key]) => [
    key, JSON.stringify(values[field] ?? (field === 'board' ? {} : [])),
  ])),
});
const cell = (draft = '') => ({ jobs: [], drafts: draft ? [draft] : [], emps: [], vehs: [] });

test('a complete backup becomes the exact validated cloud service state', () => {
  const text = complete({
    employees: [{ id: 'EMP-1', name: 'Technician' }],
    clients: [{ id: 'CLI-1', sites: [{ name: 'Branch' }] }],
    drafts: [{ id: 'DRF-1', richTitle: '<b>Work</b>' }],
    board: { '2026-11-02#1': cell('DRF-1'), '2026-11-02#2': cell(), '2026-07-29#5': cell('DRF-1') },
    todos: [{ id: 'TODO-1', title: 'Task' }],
  });
  const prepared = prepareServiceBackup(text);
  assert.deepEqual(prepared.state.clients, [{ id: 'CLI-1', sites: [{ name: 'Branch' }] }]);
  assert.equal(Object.hasOwn(prepared.state.board, '2026-11-02#2'), false);
  assert.equal(prepared.state.board['2026-07-29#5'].drafts[0], 'DRF-1');
  assert.equal(prepared.records.size, scheduleRecords(prepared.state).size);
  assert.equal(prepared.source.createdAt, '2026-11-02T06:48:00.060Z');
});

test('other HTML datasets stay in the source file and never enter service records', () => {
  const payload = JSON.parse(complete({ clients: [{ id: 'CLI-1' }] }));
  payload.storage.romvos_inventory_v32_items = '[{"id":"MAT-1"}]';
  payload.storage.romvos_leave_demo = '{"employees":[{"id":1}]}';
  const prepared = prepareServiceBackup(JSON.stringify(payload));
  assert.equal([...prepared.records.values()].some(record => /MAT-1|employees.*1/.test(record.payload)), false);
  assert.equal(prepared.report.extraModules.some(module => module.key === 'inventory'), true);
  assert.equal(prepared.report.extraModules.some(module => module.key === 'leave'), true);
});

test('missing, legacy and structurally unsafe backups are rejected before any write', () => {
  const missing = JSON.parse(complete({}));
  delete missing.storage.cf_clients;
  assert.throws(() => prepareServiceBackup(JSON.stringify(missing)), /cf_clients/);
  assert.throws(() => prepareServiceBackup(JSON.stringify({ app: 'ROMVOS Service', employees: [], vehicles: [], jobs: [] })), /πλήρες backup/);
  const duplicate = JSON.parse(complete({ clients: [{ id: 'CLI-1' }, { id: 'CLI-1' }] }));
  assert.throws(() => prepareServiceBackup(JSON.stringify(duplicate)), /Duplicate/);
});
