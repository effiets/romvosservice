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
