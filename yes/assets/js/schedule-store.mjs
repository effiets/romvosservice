import { planScheduleCommit, recordId, scheduleState } from './schedule-model.mjs';

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
          if (meta && (!Number.isSafeInteger(meta.revision) || meta.revision < 1 || meta.schemaVersion !== 1)) {
            throw new Error('Unsupported scheduling format');
          }
          onData({ revision: meta?.revision || 0, initialized: Boolean(meta), records, state: scheduleState(records), operationId: meta?.operationId });
        } catch (error) { onError(error); }
      }, onError);
    },
    async commit({ expectedRevision, operationId, changes }) {
      const uid = auth.currentUser?.uid;
      if (!uid) throw Object.assign(new Error('Sign-in required'), { code: 'romvos/signed-out' });
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || typeof operationId !== 'string' || operationId.length !== 36) {
        throw new Error('Invalid scheduling operation');
      }
      if (changes.length > 400 || changes.reduce((size, change) => size + new TextEncoder().encode(change.payload).length, 0) > 7_000_000) {
        throw Object.assign(new Error('Too many records for one safe atomic import'), { code: 'romvos/too-large' });
      }
      for (const change of changes) {
        if (recordId(change.kind, change.key) !== change.id || change.payload.length > 250_000) throw new Error('Invalid scheduling change');
      }
      return sdk.runTransaction(db, async transaction => {
        const snapshot = await transaction.get(metaRef);
        const plan = planScheduleCommit(snapshot.exists() ? snapshot.data() : null, expectedRevision, operationId);
        if (plan.duplicate) return plan.revision;
        const metadata = { revision: plan.revision, operationId, updatedBy: uid, updatedAt: sdk.serverTimestamp() };
        // All writes, including candidate → draft → crew moves, commit together.
        for (const { id, ...record } of changes) transaction.set(sdk.doc(collection, id), { ...record, ...metadata });
        transaction.set(metaRef, { ...metadata, schemaVersion: 1 });
        return plan.revision;
      });
    },
  };
}
