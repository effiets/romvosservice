import { inspectAdditionalModules } from './backup-extra-modules.mjs';
import { SCHEDULE_KINDS, SCHEDULE_MAX_CHANGES } from './schedule-model.mjs';

const modules = [
  { key: 'clients', storage: 'cf_clients', label: 'Επαφές' },
  { key: 'employees', storage: 'cf_employees', label: 'Τεχνικοί' },
  { key: 'vehicles', storage: 'cf_vehicles', label: 'Οχήματα' },
  { key: 'jobs', storage: 'cf_jobs', label: 'Εργασίες / ραντεβού' },
  { key: 'drafts', storage: 'romvos_board_drafts', label: 'Πρόχειρες εργασίες' },
  { key: 'candidates', storage: 'romvos_board_candidates_v1', label: 'Υποψήφιες εργασίες' },
  { key: 'board', storage: 'romvos_board', label: 'Θέσεις πίνακα συνεργείων' },
  { key: 'reminders', storage: 'romvos_simple_reminders', label: 'Υπενθυμίσεις' },
  { key: 'todos', storage: 'romvos_todo_v1', label: 'To Do' },
  { key: 'todoArchive', storage: 'romvos_todo_archive_v1', label: 'Αρχείο To Do' },
  { key: 'orders', storage: 'romvos_supplier_orders', label: 'Παραγγελίες' },
  { key: 'incoming', storage: 'romvos_incoming_equipment', label: 'Εισερχόμενος εξοπλισμός' },
  { key: 'returns', storage: 'romvos_pending_returns', label: 'Εκκρεμείς επιστροφές' },
];
const schedulingKeys = ['employees', 'vehicles', 'jobs', 'drafts', 'candidates', 'board'];
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

// Inspection only: no browser storage, network, imports or mutation of app state.
export function inspectRomvosBackup(text) {
  let backup;
  try { backup = JSON.parse(text); }
  catch { throw new Error('Το αρχείο δεν περιέχει έγκυρο JSON.'); }
  if (!isObject(backup) || typeof backup.app !== 'string' || backup.app.trim().toLowerCase() !== 'romvos service') {
    throw new Error('Το αρχείο δεν αναγνωρίζεται ως backup ROMVOS Service.');
  }
  const full = Object.hasOwn(backup, 'storage');
  if (full ? !isObject(backup.storage) : !['employees', 'vehicles', 'jobs'].every(key => Array.isArray(backup[key]))) {
    throw new Error('Η δομή του backup δεν είναι έγκυρη.');
  }
  const counts = {};
  const inventory = [];
  const decoded = new Map();
  let populatedBoardCells = 0;
  for (const module of modules) {
    const source = full ? backup.storage : backup;
    const field = full ? module.storage : module.key;
    if (!Object.hasOwn(source, field)) {
      counts[module.key] = null;
      inventory.push({ ...module, count: null });
      continue;
    }
    let value = source[field];
    if (full && typeof value === 'string') {
      try { value = JSON.parse(value); }
      catch { throw new Error(`Το πεδίο «${module.label}» περιέχει μη έγκυρα δεδομένα.`); }
    }
    if (module.key === 'board') {
      if (!isObject(value) || !Object.values(value).every(isObject)) {
        throw new Error('Ο πίνακας συνεργείων του backup δεν είναι έγκυρος.');
      }
      for (const cell of Object.values(value)) {
        for (const field of ['jobs', 'drafts', 'emps', 'vehs']) {
          if (cell[field] !== undefined && (!Array.isArray(cell[field]) || !cell[field].every(id => typeof id === 'string'))) {
            throw new Error('Οι αναθέσεις του πίνακα συνεργείων δεν είναι έγκυρες.');
          }
        }
        if (['jobs', 'drafts', 'emps', 'vehs'].some(field => cell[field]?.length)) populatedBoardCells++;
      }
      counts.board = Object.keys(value).length;
    } else {
      if (!Array.isArray(value) || !value.every(isObject)) throw new Error(`Το πεδίο «${module.label}» δεν είναι έγκυρη λίστα εγγραφών.`);
      counts[module.key] = value.length;
    }
    inventory.push({ ...module, count: counts[module.key] });
    decoded.set(module.key, value);
  }
  const extraModules = full ? inspectAdditionalModules(backup.storage) : [];
  if (inventory.every(module => module.count === null) && !extraModules.length) throw new Error('Το αρχείο δεν περιέχει αναγνωρίσιμες ενότητες της εφαρμογής.');
  const warnings = [];
  if (schedulingKeys.some(key => counts[key] === null)) warnings.push('Δεν περιλαμβάνονται όλες οι ενότητες του προγράμματος σε αυτό το backup.');
  const schedulingCount = schedulingKeys.filter(key => key !== 'board').reduce((sum, key) => sum + (counts[key] || 0), populatedBoardCells);
  if (!schedulingCount) warnings.push('Δεν εντοπίστηκαν εργασίες, τεχνικοί, οχήματα ή αναθέσεις στο πρόγραμμα αυτού του backup.');
  if (!full) warnings.push('Αυτό είναι παλαιότερο backup βασικών ενοτήτων. Για την τελική μεταφορά χρειάζεται πλήρες backup από το κουμπί BACKUP ΔΕΔΟΜΕΝΩΝ.');
  const boardReferences = [];
  for (const [field, module, label] of [
    ['emps', 'employees', 'τεχνικών'], ['vehs', 'vehicles', 'οχημάτων'],
    ['drafts', 'drafts', 'εργασιών πίνακα'], ['jobs', 'jobs', 'εργασιών'],
  ]) {
    if (!decoded.has('board') || !decoded.has(module)) continue;
    const known = new Set(decoded.get(module).map(record => record.id));
    const references = Object.values(decoded.get('board')).flatMap(cell => cell[field] || []);
    const missing = new Set(references.filter(id => !known.has(id)));
    boardReferences.push({ field, module, references: references.length, uniqueReferences: new Set(references).size, missingInPrimaryList: missing.size });
    if (missing.size) warnings.push(`${missing.size} κωδικοί ${label} του πίνακα δεν βρέθηκαν στην αντίστοιχη κύρια λίστα. Χρειάζεται έλεγχος των ιστορικών αναθέσεων.`);
  }
  const serviceCount = inventory.filter(module => module.key !== 'board').reduce((sum, module) => sum + (module.count || 0), populatedBoardCells);
  const cloudDocuments = SCHEDULE_KINDS.length;
  const migration = { schedulingRecords: schedulingCount, serviceRecords: serviceCount, cloudDocuments,
    singleCommitLimit: SCHEDULE_MAX_CHANGES, needsStagedImport: cloudDocuments > SCHEDULE_MAX_CHANGES };
  if (extraModules.length) warnings.push('Το backup περιλαμβάνει πρόσθετες ενότητες ή ξεχωριστά αντίγραφα που χρειάζονται αντιστοίχιση με την τρέχουσα εφαρμογή πριν από τη μεταφορά. Δεν επιλέγεται αυτόματα κάποια έκδοση.');
  if (extraModules.some(module => module.sources.some(source => source.invalid))) warnings.push('Κάποια πρόσθετα σύνολα περιέχουν μη έγκυρο JSON και χρειάζονται έλεγχο.');
  const createdAt = typeof backup.createdAt === 'string' && Number.isFinite(Date.parse(backup.createdAt)) ? backup.createdAt : null;
  return { format: full ? 'full' : 'legacy', createdAt, counts, inventory, populatedBoardCells, extraModules, boardReferences, migration, warnings };
}
