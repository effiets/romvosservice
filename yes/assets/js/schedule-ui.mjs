import { scheduleChanges, scheduleRecords } from './schedule-model.mjs';

export function initializeScheduleUi() {
  const bridge = window.romvosScheduleBridge;
  const byId = id => document.getElementById(id);
  const dialog = byId('scheduleDialog');
  const status = byId('scheduleStatus');
  const badge = byId('scheduleSummary');
  const modeKey = 'romvos_shared_schedule_v1';
  const originalKey = 'romvos_local_schedule_before_cloud_v1';
  let shared = localStorage.getItem(modeKey) === 'true';
  let member;
  let service;
  let unsubscribe;
  let latest;
  let view;
  let operation;
  let busy = false;
  let failed = false;
  let saveQueued = false;
  let generation = 0;

  function show(text, error = false) {
    status.textContent = text;
    status.classList.toggle('account-error', error);
  }
  function open() { if (!dialog.open) dialog.showModal(); }
  function recoveryKey() { return `romvos_unsaved_schedule_v1_${member?.uid || 'unknown'}`; }
  function controls() {
    byId('scheduleJoin').hidden = shared || !latest?.initialized || !member;
    byId('scheduleInitialize').hidden = shared || !latest || latest.initialized || member?.role !== 'owner';
    byId('scheduleRetry').hidden = !failed || !member || member.role === 'viewer' && Boolean(operation);
    byId('scheduleReload').hidden = !shared || !failed || !latest?.initialized;
    byId('scheduleRecovery').hidden = !member || !(localStorage.getItem(recoveryKey()) || localStorage.getItem(`${recoveryKey()}_previous`));
    byId('scheduleLocal').hidden = !shared;
    byId('scheduleClose').hidden = shared && (busy || failed || !view);
    dialog.querySelectorAll('button').forEach(button => { button.disabled = busy; });
    bridge.lock(shared && (busy || failed || !view || !member));
    byId('accountStorageScope').textContent = shared
      ? 'Κοινά: πρόγραμμα, εργασίες, τεχνικοί και οχήματα. Οι υπόλοιπες ενότητες παραμένουν τοπικές.'
      : 'Τα δεδομένα αποθηκεύονται σε αυτόν τον browser. Το κοινό πρόγραμμα ενεργοποιείται ξεχωριστά.';
  }
  function apply(snapshot) {
    if (!shared || !member || busy || failed) return;
    bridge.apply(snapshot.state);
    view = snapshot;
    badge.textContent = member.role === 'viewer' ? 'Κοινό πρόγραμμα · προβολή' : 'Κοινό πρόγραμμα · αποθηκευμένο';
    show('Το κοινό πρόγραμμα είναι ενημερωμένο.');
    controls();
  }
  function flush() {
    if (shared && latest?.initialized && !busy && !failed && !bridge.editorOpen() && (!view || latest.revision > view.revision)) apply(latest);
  }
  function rememberLocal() {
    localStorage.setItem(originalKey, JSON.stringify(bridge.capture()));
  }
  function enterShared(snapshot) {
    rememberLocal();
    localStorage.setItem(modeKey, 'true');
    shared = true;
    failed = false;
    view = undefined;
    apply(snapshot);
    dialog.close();
  }
  function errorMessage(error) {
    if (error?.code === 'romvos/conflict') return 'Κάποιος άλλαξε το κοινό πρόγραμμα όσο το επεξεργαζόσουν. Η δική σου αλλαγή δεν αντικατέστησε τα κοινά δεδομένα. Κράτησέ την και φόρτωσε το τελευταίο πρόγραμμα για να την εφαρμόσεις ξανά.';
    if (error?.code === 'permission-denied') return 'Δεν επιτρέπεται ακόμη η κοινή αποθήκευση. Χρειάζεται δημοσίευση των νέων κανόνων Firestore και ενεργή πρόσβαση στην ομάδα.';
    if (error?.code === 'romvos/too-large') return 'Το πρόγραμμα έχει πολλές εγγραφές για μία ασφαλή μεταφορά. Η αρχική μεταφορά χρειάζεται προετοιμασία· τα δεδομένα σου παραμένουν στον browser.';
    return 'Η κοινή αποθήκευση δεν ολοκληρώθηκε. Έλεγξε τη σύνδεση και δοκίμασε ξανά. Η αλλαγή σου διατηρείται σε αυτόν τον browser.';
  }
  function onFailure(error) {
    failed = true;
    badge.textContent = shared || operation ? 'Κοινό πρόγραμμα · δεν αποθηκεύτηκε' : 'Κοινή σύνδεση μη διαθέσιμη';
    show(errorMessage(error), true);
    controls(); open();
  }
  function watch() {
    unsubscribe?.();
    const request = ++generation;
    latest = undefined;
    failed = false;
    show('Φόρτωση κοινού προγράμματος…');
    controls();
    unsubscribe = service.watch(snapshot => {
      if (request !== generation) return;
      latest = snapshot;
      if (!shared) {
        show(snapshot.initialized
          ? 'Υπάρχει κοινό πρόγραμμα. Η σύνδεση θα το φορτώσει εδώ. Το σημερινό τοπικό πρόγραμμα θα διατηρηθεί ξεχωριστά στον browser.'
          : member.role === 'owner'
            ? 'Δεν έχει δημιουργηθεί κοινό πρόγραμμα. Μπορείς να ξεκινήσεις με τον πίνακα, τις εργασίες, τους τεχνικούς και τα οχήματα αυτού του browser.'
            : 'Ο υπεύθυνος της ομάδας χρειάζεται να δημιουργήσει πρώτα το κοινό πρόγραμμα.');
        controls();
      } else if (!snapshot.initialized) onFailure(new Error('Shared schedule missing'));
      else if (!view) {
        // First connection must not replace a failed, unsaved local operation.
        const saved = localStorage.getItem(recoveryKey());
        if (saved) {
          try { operation = JSON.parse(saved); } catch { operation = undefined; }
          onFailure(new Error('Unsaved change recovered'));
        } else {
          apply(snapshot);
          if (dialog.open) dialog.close();
        }
      } else flush();
    }, error => { if (request === generation) onFailure(error); });
  }
  async function commit(action, desiredRecords, initializing = false) {
    const request = generation;
    busy = true;
    operation = action;
    // Preserve the attempted change before making any network request.
    try { localStorage.setItem(recoveryKey(), JSON.stringify(action)); }
    catch (error) { busy = false; onFailure(error); return; }
    badge.textContent = 'Κοινό πρόγραμμα · αποθήκευση…';
    show('Αποθήκευση στο κοινό πρόγραμμα…');
    controls();
    try {
      const revision = await service.commit(action);
      if (request !== generation) return;
      failed = false;
      busy = false;
      const own = { revision, initialized: true, records: desiredRecords, state: action.desired, operationId: action.operationId };
      const confirmed = latest?.revision >= revision ? latest : own;
      if (initializing) enterShared(confirmed);
      else { apply(confirmed); if (dialog.open) dialog.close(); }
      localStorage.removeItem(recoveryKey());
      operation = undefined;
    } catch (error) { if (request === generation) { busy = false; onFailure(error); } }
    finally { if (request === generation) { busy = false; controls(); } }
  }
  async function save() {
    saveQueued = false;
    if (!shared || !member || !view || busy || failed) return;
    try {
      const desired = bridge.capture();
      const records = scheduleRecords(desired);
      const changes = scheduleChanges(view.records, records);
      if (!changes.length) return;
      if (member.role === 'viewer') {
        bridge.apply(view.state);
        show('Ο λογαριασμός σου έχει δικαίωμα προβολής. Το κοινό πρόγραμμα δεν άλλαξε.', true);
        open(); return;
      }
      await commit({ expectedRevision: view.revision, operationId: crypto.randomUUID(), changes, desired }, records);
    } catch (error) { onFailure(error); }
  }

  window.romvosScheduleBeforeSave = () => {
    if (!shared) return true;
    if (!member || busy || failed || !view) return false;
    if (member.role === 'viewer') {
      const changed = scheduleChanges(view.records, scheduleRecords(bridge.capture())).length;
      if (changed) {
        bridge.apply(view.state);
        show('Ο λογαριασμός σου έχει δικαίωμα προβολής. Το κοινό πρόγραμμα δεν άλλαξε.', true);
        open(); return false;
      }
    }
    return true;
  };
  window.addEventListener('romvos:schedule-saved', () => {
    if (shared && !saveQueued) { saveQueued = true; queueMicrotask(save); }
  });
  // Modal editors retain the old baseline while typing, so a remote save causes
  // an explicit conflict rather than silently overwriting the form on save.
  const observer = new MutationObserver(flush);
  document.querySelectorAll('.modal').forEach(element => observer.observe(element, { attributes: true, attributeFilter: ['class'] }));
  document.addEventListener('focusout', () => queueMicrotask(flush));
  document.addEventListener('input', () => queueMicrotask(flush));
  document.addEventListener('click', () => queueMicrotask(flush));
  dialog.addEventListener('cancel', event => { if (shared && (busy || failed || !view)) event.preventDefault(); });
  byId('scheduleOpen').addEventListener('click', () => {
    if (!member) { byId('accountOpen').click(); return; }
    if (bridge.editorOpen()) { alert('Ολοκλήρωσε ή κλείσε πρώτα την ανοιχτή επεξεργασία.'); return; }
    open();
    if (!unsubscribe) watch();
  });
  byId('scheduleClose').addEventListener('click', () => dialog.close());
  byId('scheduleJoin').addEventListener('click', () => { if (latest?.initialized) enterShared(latest); });
  byId('scheduleInitialize').addEventListener('click', async () => {
    if (member?.role !== 'owner' || latest?.initialized || busy) return;
    try {
      rememberLocal();
      const desired = bridge.capture();
      const records = scheduleRecords(desired);
      await commit({ expectedRevision: 0, operationId: crypto.randomUUID(), changes: scheduleChanges(new Map(), records), desired }, records, true);
    } catch (error) { onFailure(error); }
  });
  byId('scheduleRetry').addEventListener('click', () => {
    if (operation) commit(operation, scheduleRecords(operation.desired), !shared);
    else watch();
  });
  byId('scheduleReload').addEventListener('click', () => {
    if (!latest?.initialized) return;
    // Keep the recovery file available even after choosing the server version.
    if (operation) localStorage.setItem(`${recoveryKey()}_previous`, JSON.stringify(operation));
    localStorage.removeItem(recoveryKey()); operation = undefined;
    failed = false; apply(latest); dialog.close();
  });
  byId('scheduleRecovery').addEventListener('click', () => {
    const data = localStorage.getItem(recoveryKey()) || localStorage.getItem(`${recoveryKey()}_previous`);
    if (!data) return;
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url;
    link.download = `ROMVOS_UNSAVED_CHANGE_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1500);
  });
  byId('scheduleLocal').addEventListener('click', () => {
    if (busy) return;
    const original = localStorage.getItem(originalKey);
    if (!original) return;
    unsubscribe?.(); unsubscribe = undefined; ++generation;
    shared = false; failed = false; view = undefined; latest = undefined; operation = undefined;
    localStorage.removeItem(modeKey);
    bridge.apply(JSON.parse(original)); bridge.lock(false);
    badge.textContent = 'Τοπικό πρόγραμμα';
    controls(); dialog.close();
    window.dispatchEvent(new Event('romvos:schedule-mode'));
  });
  if (shared) { bridge.lock(true); badge.textContent = 'Κοινό πρόγραμμα · αναμονή σύνδεσης'; }
  return {
    requiresAuth: () => shared,
    membership({ user, role, scheduling }) {
      unsubscribe?.(); unsubscribe = undefined; ++generation;
      busy = false; failed = false; operation = undefined;
      member = user ? { ...user, role } : undefined;
      service = scheduling;
      view = undefined;
      if (shared && member) { open(); watch(); }
      else controls();
    },
  };
}
