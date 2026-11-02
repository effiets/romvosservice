import { validateFirebaseConfig } from './auth-policy.mjs';
import { createScheduleStore } from './schedule-store.mjs';

// Pin one SDK version for all Firebase products. No Analytics is initialized.
const SDK_BASE = 'https://www.gstatic.com/firebasejs/13.1.0/';

export async function connectFirebase(settings) {
  let config = settings.firebaseConfig;
  if (!config) {
    try {
      const response = await fetch('/__/firebase/init.json', {
        cache: 'no-store', signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw new Error('Firebase configuration unavailable');
      config = await response.json();
    } catch (error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') throw error;
      throw Object.assign(new Error('Firebase Web App configuration required'), { code: 'romvos/config' });
    }
  }
  validateFirebaseConfig(config, settings.projectId);
  const [appSdk, authSdk, dbSdk] = await Promise.all([
    import(`${SDK_BASE}firebase-app.js`),
    import(`${SDK_BASE}firebase-auth.js`),
    import(`${SDK_BASE}firebase-firestore.js`),
  ]);
  const app = appSdk.getApps().find(candidate => candidate.name === 'romvos-team')
    || appSdk.initializeApp(config, 'romvos-team');
  const auth = authSdk.getAuth(app);
  // End the session when the tab closes; never store passwords in app storage.
  await authSdk.setPersistence(auth, authSdk.browserSessionPersistence);
  const db = dbSdk.getFirestore(app);
  return {
    scheduling: createScheduleStore(dbSdk, db, auth, settings.workspaceId),
    onUser: callback => authSdk.onAuthStateChanged(auth, callback),
    signIn: (email, password) => authSdk.signInWithEmailAndPassword(auth, email, password),
    signOut: () => authSdk.signOut(auth),
    watchMember: (uid, callback, onError) => dbSdk.onSnapshot(
      dbSdk.doc(db, 'workspaces', settings.workspaceId, 'members', uid),
      { includeMetadataChanges: true }, callback, onError,
    ),
  };
}
