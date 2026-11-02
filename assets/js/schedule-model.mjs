export const SCHEDULE_KINDS = ['employees', 'vehicles', 'jobs', 'drafts', 'candidates', 'board',
  'clients', 'reminders', 'todos', 'todoArchive', 'orders', 'incoming', 'returns'];
export const SERVICE_SCHEMA_VERSION = 3;
export const SERVICE_MODULE_KIND = 'module';
export const SCHEDULE_MAX_CHANGES = 20;
export const SERVICE_MAX_PAYLOAD_BYTES = 900_000;
const idPattern = /^[A-Za-z0-9_#:.-]{1,200}$/;

export function stableJson(value) {
  return JSON.stringify(value, (_, item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
    return Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]]));
  });
}

export function recordId(kind, key) {
  const legacy = SCHEDULE_KINDS.includes(kind);
  const module = kind === SERVICE_MODULE_KIND && SCHEDULE_KINDS.includes(key);
  if ((!legacy && !module) || typeof key !== 'string' || !idPattern.test(key)) throw new Error('Invalid service record ID');
  return `${kind}__${key}`;
}

const emptyCell = value => Object.entries(value).every(([field, items]) =>
  ['jobs', 'drafts', 'emps', 'vehs'].includes(field) && Array.isArray(items) && !items.length);

function validateList(kind, value) {
  if (!Array.isArray(value)) throw new Error(`Invalid ${kind} list`);
  const ids = new Set();
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item) || typeof item.id !== 'string' || !idPattern.test(item.id)) {
      throw new Error(`Invalid ${kind} record`);
    }
    if (ids.has(item.id)) throw new Error(`Duplicate ${kind} record ID`);
    ids.add(item.id);
  }
  return value;
}

function validateBoard(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid service board');
  const result = {};
  for (const [key, cell] of Object.entries(value)) {
    if (!/^\d{4}-\d{2}-\d{2}#\d+$/.test(key) || !cell || typeof cell !== 'object' || Array.isArray(cell)) {
      throw new Error('Invalid board cell');
    }
    for (const field of ['jobs', 'drafts', 'emps', 'vehs']) {
      if (!Array.isArray(cell[field]) || !cell[field].every(id => typeof id === 'string')) throw new Error('Invalid board references');
    }
    // Rendering creates empty cells. They are not business data.
    if (!emptyCell(cell)) result[key] = cell;
  }
  return result;
}

// One document per service module keeps initial import and restore atomic while
// staying far below Firestore's document and request-size limits for this app.
export function scheduleRecords(state) {
  const records = new Map();
  for (const key of SCHEDULE_KINDS) {
    const value = key === 'board' ? validateBoard(state.board || {}) : validateList(key, state[key] || []);
    records.set(recordId(SERVICE_MODULE_KIND, key), {
      kind: SERVICE_MODULE_KIND, key, payload: stableJson(value),
    });
  }
  return records;
}

export function scheduleState(records) {
  const state = Object.fromEntries(SCHEDULE_KINDS.map(kind => [kind, kind === 'board' ? {} : []]));
  const modules = new Set();
  const legacy = new Map(SCHEDULE_KINDS.map(kind => [kind, []]));
  for (const [id, record] of records) {
    if (record.deleted) continue;
    if (id !== recordId(record.kind, record.key)) throw new Error('Invalid service record');
    const payload = JSON.parse(record.payload);
    if (record.kind === SERVICE_MODULE_KIND) {
      if (modules.has(record.key)) throw new Error('Duplicate service module');
      state[record.key] = record.key === 'board' ? validateBoard(payload) : validateList(record.key, payload);
      modules.add(record.key);
    } else if (record.kind === 'board') {
      if (!modules.has('board')) state.board[record.key] = validateBoard({ [record.key]: payload })[record.key];
    } else {
      // Schema 1 compatibility. Schema 3 module documents take precedence and
      // allow a small atomic upgrade without rewriting hundreds of old records.
      if (!payload?.value || payload.value.id !== record.key || !Number.isSafeInteger(payload.index) || payload.index < 0) {
        throw new Error('Invalid legacy service record content');
      }
      legacy.get(record.kind).push(payload);
    }
  }
  for (const kind of SCHEDULE_KINDS.filter(kind => kind !== 'board')) {
    if (!modules.has(kind)) state[kind] = validateList(kind, legacy.get(kind)
      .sort((a, b) => a.index - b.index || a.value.id.localeCompare(b.value.id)).map(item => item.value));
  }
  return state;
}

export function scheduleChanges(before, after) {
  const changes = [];
  for (const [id, record] of after) {
    if (before.get(id)?.payload !== record.payload) changes.push({ id, ...record, deleted: false });
  }
  // Schema 3 always has all 13 module documents. Old per-record documents are
  // left untouched and ignored, avoiding an unsafe bulk cleanup during upgrade.
  for (const [id, record] of before) {
    if (record.kind === SERVICE_MODULE_KIND && !after.has(id)) {
      changes.push({ id, kind: record.kind, key: record.key, payload: 'null', deleted: true });
    }
  }
  return changes;
}

export function planScheduleCommit(currentMeta, expectedRevision, operationId) {
  if (currentMeta?.operationId === operationId) return { revision: currentMeta.revision, duplicate: true };
  const revision = currentMeta?.revision || 0;
  if (revision !== expectedRevision) {
    throw Object.assign(new Error('The shared service changed while you were editing'), { code: 'romvos/conflict' });
  }
  return { revision: revision + 1, duplicate: false };
}
