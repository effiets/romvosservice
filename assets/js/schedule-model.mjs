export const SCHEDULE_KINDS = ['employees', 'vehicles', 'jobs', 'drafts', 'candidates', 'board'];
const idPattern = /^[A-Za-z0-9_#:.-]{1,200}$/;

export function stableJson(value) {
  return JSON.stringify(value, (_, item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
    return Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]]));
  });
}

export function recordId(kind, key) {
  if (!SCHEDULE_KINDS.includes(kind) || !idPattern.test(key)) throw new Error('Invalid scheduling record ID');
  return `${kind}__${key}`;
}

export function scheduleRecords(state) {
  const records = new Map();
  for (const kind of SCHEDULE_KINDS) {
    if (kind === 'board') {
      for (const [key, value] of Object.entries(state.board || {})) {
        // Rendering creates empty cells. They are not business changes.
        const empty = Object.entries(value).every(([field, items]) =>
          ['jobs', 'drafts', 'emps', 'vehs'].includes(field) && Array.isArray(items) && !items.length);
        if (!empty) records.set(recordId(kind, key), { kind, key, payload: stableJson(value) });
      }
    } else {
      (state[kind] || []).forEach((value, index) => {
        const id = recordId(kind, value.id);
        if (records.has(id)) throw new Error('Duplicate scheduling record ID');
        records.set(id, { kind, key: value.id, payload: stableJson({ value, index }) });
      });
    }
  }
  return records;
}

export function scheduleState(records) {
  const state = { employees: [], vehicles: [], jobs: [], drafts: [], candidates: [], board: {} };
  const ordered = new Map(SCHEDULE_KINDS.map(kind => [kind, []]));
  for (const [id, record] of records) {
    if (record.deleted) continue;
    if (id !== recordId(record.kind, record.key)) throw new Error('Invalid scheduling record');
    const payload = JSON.parse(record.payload);
    if (record.kind === 'board') {
      if (!/^\d{4}-\d{2}-\d{2}#\d+$/.test(record.key) || !payload || typeof payload !== 'object') throw new Error('Invalid board cell');
      for (const field of ['jobs', 'drafts', 'emps', 'vehs']) {
        if (!Array.isArray(payload[field]) || !payload[field].every(id => typeof id === 'string')) throw new Error('Invalid board references');
      }
      state.board[record.key] = payload;
    } else {
      if (!payload?.value || payload.value.id !== record.key || !Number.isSafeInteger(payload.index) || payload.index < 0) {
        throw new Error('Invalid scheduling record content');
      }
      ordered.get(record.kind).push(payload);
    }
  }
  for (const kind of SCHEDULE_KINDS.filter(kind => kind !== 'board')) {
    state[kind] = ordered.get(kind).sort((a, b) => a.index - b.index || a.value.id.localeCompare(b.value.id)).map(item => item.value);
  }
  return state;
}

export function scheduleChanges(before, after) {
  const changes = [];
  for (const [id, record] of after) {
    if (before.get(id)?.payload !== record.payload) changes.push({ id, ...record, deleted: false });
  }
  for (const [id, record] of before) {
    if (!after.has(id)) changes.push({ id, kind: record.kind, key: record.key, payload: 'null', deleted: true });
  }
  return changes;
}

export function planScheduleCommit(currentMeta, expectedRevision, operationId) {
  if (currentMeta?.operationId === operationId) return { revision: currentMeta.revision, duplicate: true };
  const revision = currentMeta?.revision || 0;
  if (revision !== expectedRevision) {
    throw Object.assign(new Error('The shared schedule changed while you were editing'), { code: 'romvos/conflict' });
  }
  return { revision: revision + 1, duplicate: false };
}
