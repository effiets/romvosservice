import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectRomvosBackup } from '../assets/js/backup-inspector.mjs';

const full = storage => JSON.stringify({ app: 'ROMVOS SERVICE', createdAt: '2026-10-27T17:21:22.510Z', storage });
const emptyCell = { jobs: [], drafts: [], emps: [], vehs: [] };

test('full backup distinguishes empty scheduling from contacts and empty rendered cells', () => {
  const report = inspectRomvosBackup(full({
    cf_clients: JSON.stringify([{ id: 'CLI-1' }, { id: 'CLI-2' }]),
    cf_employees: '[]', cf_vehicles: '[]', cf_jobs: '[]', romvos_board_drafts: '[]',
    romvos_board_candidates_v1: '[]', romvos_board: JSON.stringify({ '2026-10-27#1': emptyCell }),
  }));
  assert.equal(report.counts.clients, 2);
  assert.equal(report.counts.jobs, 0);
  assert.equal(report.counts.board, 1);
  assert.equal(report.populatedBoardCells, 0);
  assert.equal(report.counts.todos, null); // absent is not reported as empty
  assert.equal(report.warnings.length, 1);
  assert.equal(report.format, 'full');
});

test('inspects appointments and other modules without changing the input', () => {
  const input = full({
    cf_jobs: JSON.stringify([{ id: 'JOB-1' }]), cf_employees: JSON.stringify([{ id: 'EMP-1' }]),
    romvos_board: JSON.stringify({ '2026-11-02#1': { ...emptyCell, jobs: ['JOB-1'], emps: ['EMP-1'] } }),
    romvos_simple_reminders: JSON.stringify([{ id: 'REM-1' }]), romvos_pending_returns: '[]',
    romvos_todo_archive_v1: JSON.stringify([{ id: 'TODO-1', done: true }]),
  });
  const report = inspectRomvosBackup(input);
  assert.equal(report.counts.jobs, 1);
  assert.equal(report.populatedBoardCells, 1);
  assert.equal(report.counts.reminders, 1);
  assert.equal(report.counts.returns, 0);
  assert.equal(report.counts.todoArchive, 1);
  assert.equal(JSON.parse(input).storage.cf_jobs, '[{"id":"JOB-1"}]');
});

test('recognizes the older basic backup and reports missing modules', () => {
  const report = inspectRomvosBackup(JSON.stringify({ app: 'ROMVOS Service', employees: [], vehicles: [], jobs: [], board: {} }));
  assert.equal(report.format, 'legacy');
  assert.equal(report.createdAt, null);
  assert.equal(report.counts.clients, null);
  assert(report.warnings.some(warning => warning.includes('παλαιότερο')));
});

test('rejects corrupted JSON, unknown files and malformed stored module data', () => {
  for (const input of ['{', '{}', 'null', JSON.stringify({ app: 'Other app', storage: {} }),
    full([]), full({ cf_jobs: 'not JSON' }), full({ cf_employees: '{}' }),
    full({ romvos_board: '[]' }), full({ romvos_board: JSON.stringify({ '2026-11-02#1': { jobs: 'JOB-1' } }) })]) {
    assert.throws(() => inspectRomvosBackup(input));
  }
});

test('additional versions are inventoried separately without selecting or merging a source', () => {
  const report = inspectRomvosBackup(full({
    romvos_inventory_v3_items: '[{"id":"MAT-1"}]',
    romvos_inventory_v32_items: '[{"id":"MAT-1"},{"id":"MAT-2"}]',
    romvos_invoice_control_simple_master_v4_6: JSON.stringify({ version: 4, partners: [], invoices: [{ id: 'INV-1' }, { id: 'INV-1' }] }),
    romvos_invoice_control_simple_master_v4_14: JSON.stringify({ version: 4, partners: [], invoices: [{ id: 'INV-1' }] }),
    romvos_leave_demo: JSON.stringify({ employees: [{ id: 1 }], leaves: [{ employeeId: 1, date: '2026-11-02', type: 'leave' }] }),
    romvos_attendance_v1: JSON.stringify({ config: {}, entries: {} }),
    romvos_fleet_offline_v1: JSON.stringify({ vehicles: [], records: [] }),
  }));
  const inventory = report.extraModules.find(module => module.key === 'inventory');
  assert.equal(inventory.sources.length, 2);
  assert.deepEqual(inventory.sources.map(source => source.entries), [1, 2]);
  const invoices = report.extraModules.find(module => module.key === 'invoices');
  assert.deepEqual(invoices.sources.map(source => source.sections.invoices), [2, 1]);
  assert(report.extraModules.some(module => module.key === 'leave'));
  assert(report.extraModules.some(module => module.key === 'attendance'));
  assert(report.extraModules.some(module => module.key === 'fleet'));
  assert.equal(report.counts.jobs, null);
  assert(report.warnings.some(warning => warning.includes('Δεν επιλέγεται αυτόματα')));
});

test('separate service namespaces are not mistaken for current scheduling', () => {
  const report = inspectRomvosBackup(full({
    cf_jobs: '[]', 'romvos_clean_friend_v48::cf_jobs': '[{"id":"JOB-other"}]',
  }));
  assert.equal(report.counts.jobs, 0);
  assert.equal(report.extraModules.find(module => module.key === 'separateService').sources[0].entries, 1);
});

test('board references missing from primary lists are reported without removing history', () => {
  const report = inspectRomvosBackup(full({
    cf_employees: '[{"id":"EMP-1"}]', cf_vehicles: '[]', cf_jobs: '[]', romvos_board_drafts: '[]',
    romvos_board: JSON.stringify({
      '2026-11-02#1': { ...emptyCell, emps: ['EMP-1', 'EMP-old'], vehs: ['VEH-old'] },
      '2026-11-03#1': { ...emptyCell, emps: ['EMP-old'] },
    }),
  }));
  const employees = report.boardReferences.find(item => item.module === 'employees');
  assert.equal(employees.references, 3);
  assert.equal(employees.uniqueReferences, 2);
  assert.equal(employees.missingInPrimaryList, 1);
  assert.equal(report.boardReferences.find(item => item.module === 'vehicles').missingInPrimaryList, 1);
  assert.equal(report.populatedBoardCells, 2);
});

test('a real-world scheduling backup fits the 13-module atomic import format', () => {
  const report = inspectRomvosBackup(full({
    cf_jobs: '[]',
    cf_employees: JSON.stringify(Array.from({ length: 11 }, (_, id) => ({ id: `EMP-${id}` }))),
    cf_vehicles: JSON.stringify(Array.from({ length: 6 }, (_, id) => ({ id: `VEH-${id}` }))),
    romvos_board_drafts: JSON.stringify(Array.from({ length: 214 }, (_, id) => ({ id: `DRF-${id}` }))),
    romvos_board_candidates_v1: '[{"id":"CAN-1"},{"id":"CAN-2"}]',
    romvos_board: JSON.stringify(Object.fromEntries(Array.from({ length: 195 }, (_, id) => [
      `${new Date(Date.UTC(2026, 0, 1 + id)).toISOString().slice(0, 10)}#1`, { ...emptyCell, drafts: [`DRF-${id}`] },
    ]))),
  }));
  assert.equal(report.migration.schedulingRecords, 428);
  assert.equal(report.migration.serviceRecords, 428);
  assert.equal(report.migration.cloudDocuments, 13);
  assert.equal(report.migration.singleCommitLimit, 20);
  assert.equal(report.migration.needsStagedImport, false);
});

test('the initial import count includes contacts and all the other service lists', () => {
  const report = inspectRomvosBackup(full({ cf_clients: '[{"id":"CLI-1"}]',
    romvos_todo_v1: '[{"id":"TODO-1"}]', romvos_todo_archive_v1: '[{"id":"TODO-2"}]',
    romvos_pending_returns: '[{"id":"RET-1"}]', romvos_inventory_v32_items: '[{"id":"OTHER"}]' }));
  assert.equal(report.migration.serviceRecords, 4);
  assert.equal(report.migration.schedulingRecords, 0);
});

test('corrupt additional datasets are visible and plain preferences are excluded', () => {
  const report = inspectRomvosBackup(full({
    cf_clients: '[]', romvos_inventory_v32_items: '[broken',
    romvos_inventory_v32_loc: 'central', romvos_inventory_material_categories_v23: '1',
  }));
  const sources = report.extraModules.find(module => module.key === 'inventory').sources;
  assert.equal(sources.length, 1);
  assert.equal(sources[0].invalid, true);
  assert(report.warnings.some(warning => warning.includes('μη έγκυρο JSON')));
});
