import { planScheduleCommit, recordId, scheduleState, SCHEDULE_MAX_CHANGES,
  SERVICE_MAX_PAYLOAD_BYTES, SERVICE_SCHEMA_VERSION } from './schedule-model.mjs';

const supportedSchemas = [1, 2, SERVICE_SCHEMA_VERSION];

export function createScheduleStore(sdk, db, auth, workspaceId) {
  const collection = sdk.collection(db, 'workspaces', workspaceId, 'scheduling');
  const metaRef = sdk.doc(collection, '_meta');
  return {
    watch(onData, onError) {
      return sdk.onSnapshot(collection, { includeMetadataChanges: true }, snapshot => {
        // Only server-confirmed, committed snapshots become the editing baseline.
        if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
        try {
          let meta;
          const records = new Map();
          snapshot.forEach(doc => {
            if (doc.id === '_meta') meta = doc.data();
            else if (!doc.data().deleted) records.set(doc.id, doc.data());
          });
          if (!meta && records.size) throw new Error('Scheduling metadata missing');
          if (meta && (!Number.isSafeInteger(meta.revision) || meta.revision < 1 || !supportedSchemas.includes(meta.schemaVersion))) {
            throw new Error('Unsupported scheduling format');
          }
          onData({ revision: meta?.revision || 0, initialized: Boolean(meta), schemaVersion: meta?.schemaVersion,
            records, state: scheduleState(records), operationId: meta?.operationId });
        } catch (error) { onError(error); }
      }, onError);
    },
    async commit({ expectedRevision, operationId, changes }) {
      const uid = auth.currentUser?.uid;
      if (!uid) throw Object.assign(new Error('Sign-in required'), { code: 'romvos/signed-out' });
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || typeof operationId !== 'string' || operationId.length !== 36) {
        throw new Error('Invalid scheduling operation');
      }
      if (changes.length > SCHEDULE_MAX_CHANGES || changes.reduce((size, change) => size + new TextEncoder().encode(change.payload).length, 0) > 7_000_000) {
        throw Object.assign(new Error('Too many records for one safe atomic import'), { code: 'romvos/too-large' });
      }
      for (const change of changes) {
        if (recordId(change.kind, change.key) !== change.id
          || new TextEncoder().encode(change.payload).length > SERVICE_MAX_PAYLOAD_BYTES) throw new Error('Invalid service change');
      }
      return sdk.runTransaction(db, async transaction => {
        const snapshot = await transaction.get(metaRef);
        if (snapshot.exists() && !supportedSchemas.includes(snapshot.data().schemaVersion)) {
          throw new Error('Unsupported service format');
        }
        const plan = planScheduleCommit(snapshot.exists() ? snapshot.data() : null, expectedRevision, operationId);
        if (plan.duplicate) return plan.revision;
        const metadata = { revision: plan.revision, operationId, updatedBy: uid, updatedAt: sdk.serverTimestamp() };
        // All changed modules and the global revision commit together.
        for (const { id, ...record } of changes) transaction.set(sdk.doc(collection, id), { ...record, ...metadata });
        transaction.set(metaRef, { ...metadata, schemaVersion: SERVICE_SCHEMA_VERSION });
        return plan.revision;
      });
    },
  };
}
