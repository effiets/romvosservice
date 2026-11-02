import { inspectRomvosBackup } from './backup-inspector.mjs';
import { scheduleRecords, scheduleState } from './schedule-model.mjs';

export const SERVICE_BACKUP_FIELDS = Object.freeze({
  employees: 'cf_employees', vehicles: 'cf_vehicles', jobs: 'cf_jobs',
  clients: 'cf_clients', board: 'romvos_board', drafts: 'romvos_board_drafts',
  candidates: 'romvos_board_candidates_v1', reminders: 'romvos_simple_reminders',
  todos: 'romvos_todo_v1', todoArchive: 'romvos_todo_archive_v1',
  orders: 'romvos_supplier_orders', incoming: 'romvos_incoming_equipment',
  returns: 'romvos_pending_returns',
});

const parseStored = (storage, key) => {
  if (!Object.hasOwn(storage, key)) throw new Error(`Λείπει το απαραίτητο πεδίο «${key}».`);
  const value = storage[key];
  if (typeof value !== 'string') return structuredClone(value);
  try { return JSON.parse(value); }
  catch { throw new Error(`Το πεδίο «${key}» δεν περιέχει έγκυρο JSON.`); }
};

// Convert only the modules owned by this HTML. Data belonging to inventory,
// invoices, HR and fleet remains in the source backup and is never uploaded.
export function prepareServiceBackup(text) {
  const report = inspectRomvosBackup(text);
  if (report.format !== 'full') throw new Error('Για την αρχική μεταφορά χρειάζεται πλήρες backup της εφαρμογής.');
  const backup = JSON.parse(text);
  const raw = Object.fromEntries(Object.entries(SERVICE_BACKUP_FIELDS)
    .map(([field, storage]) => [field, parseStored(backup.storage, storage)]));
  // The cloud format intentionally omits renderer-created empty board cells.
  // Reconstructing from records is also the final structural validation.
  const records = scheduleRecords(raw);
  const state = scheduleState(records);
  return {
    state, records, report,
    source: Object.freeze({ createdAt: report.createdAt, serviceRecords: report.migration.serviceRecords }),
  };
}
