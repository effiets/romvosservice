import { inspectRomvosBackup } from './backup-inspector.mjs';
import { scheduleRecords, scheduleState, SERVICE_MAX_PAYLOAD_BYTES,
  SERVICE_SCHEMA_VERSION, stableJson } from './schedule-model.mjs';

export const SHARED_BACKUP_TYPE = 'romvos-shared-service';
export const SHARED_BACKUP_VERSION = 1;

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

const byteSize = value => new TextEncoder().encode(value).length;

function serviceRecordCount(state) {
  return Object.entries(state).reduce((total, [field, value]) =>
    total + (field === 'board' ? Object.keys(value).length : value.length), 0);
}

function validateSharedMetadata(backup, report) {
  if (!Object.hasOwn(backup, 'backupType') && !Object.hasOwn(backup, 'shared')) return null;
  const shared = backup.shared;
  if (backup.backupType !== SHARED_BACKUP_TYPE || backup.backupVersion !== SHARED_BACKUP_VERSION
    || !shared || typeof shared !== 'object' || Array.isArray(shared)
    || shared.workspaceId !== 'romvos' || shared.schemaVersion !== SERVICE_SCHEMA_VERSION
    || !Number.isSafeInteger(shared.revision) || shared.revision < 1
    || typeof shared.operationId !== 'string' || shared.operationId.length !== 36
    || shared.cloudDocuments !== Object.keys(SERVICE_BACKUP_FIELDS).length
    || shared.serviceRecords !== report.migration.serviceRecords) {
    throw new Error('Τα στοιχεία της κοινής βάσης μέσα στο backup δεν είναι έγκυρα.');
  }
  return Object.freeze({ ...shared });
}

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
  for (const record of records.values()) {
    if (byteSize(record.payload) > SERVICE_MAX_PAYLOAD_BYTES) {
      throw new Error(`Η ενότητα «${record.key}» είναι μεγαλύτερη από το ασφαλές όριο εισαγωγής.`);
    }
  }
  const state = scheduleState(records);
  const shared = validateSharedMetadata(backup, report);
  return {
    state, records, report, shared,
    source: Object.freeze({ createdAt: report.createdAt, serviceRecords: report.migration.serviceRecords }),
  };
}

// Export only the authoritative service modules. Preferences, recovery data and
// the separate inventory/HR/invoice applications never enter this file.
export function createSharedServiceBackup({ state, revision, operationId, createdAt,
  createdBy, workspaceId = 'romvos' }) {
  if (!Number.isSafeInteger(revision) || revision < 1
    || typeof operationId !== 'string' || operationId.length !== 36
    || typeof createdAt !== 'string' || !Number.isFinite(Date.parse(createdAt))
    || workspaceId !== 'romvos') throw new Error('Invalid shared backup metadata');
  const records = scheduleRecords(state);
  for (const record of records.values()) {
    if (byteSize(record.payload) > SERVICE_MAX_PAYLOAD_BYTES) throw new Error(`Service module too large: ${record.key}`);
  }
  const validated = scheduleState(records);
  const storage = Object.fromEntries(Object.entries(SERVICE_BACKUP_FIELDS)
    .map(([field, key]) => [key, stableJson(validated[field])]));
  return {
    app: 'ROMVOS SERVICE',
    backupType: SHARED_BACKUP_TYPE,
    backupVersion: SHARED_BACKUP_VERSION,
    createdAt,
    storage,
    shared: {
      workspaceId,
      schemaVersion: SERVICE_SCHEMA_VERSION,
      revision,
      operationId,
      createdBy: {
        uid: String(createdBy?.uid || ''),
        email: String(createdBy?.email || ''),
      },
      cloudDocuments: records.size,
      serviceRecords: serviceRecordCount(validated),
    },
  };
}

export function sharedBackupFilename(createdAt, revision, prefix = 'ROMVOS_SHARED_BACKUP') {
  if (!Number.isSafeInteger(revision) || revision < 1 || !Number.isFinite(Date.parse(createdAt))) {
    throw new Error('Invalid backup filename metadata');
  }
  const stamp = new Date(createdAt).toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/:/g, '-');
  return `${prefix}_${stamp}_REV-${revision}.json`;
}
