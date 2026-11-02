import { scheduleChanges, scheduleRecords } from './schedule-model.mjs';
import { createSharedServiceBackup, prepareServiceBackup, sharedBackupFilename } from './backup-service.mjs';

function browserDownload(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function initializeScheduleUi(options = {}) {
  const bridge = window.romvosScheduleBridge;
  const downloadFile = options.download || browserDownload;
  const now = options.now || (() => new Date());
  const confirmAction = options.confirm || (message => confirm(message));
  const promptAction = options.prompt || ((message, value) => prompt(message, value));
  const alertAction = options.alert || (message => alert(message));
  const legacyBackup = window.backupAllRomvosData;
  const legacyRestore = window.restoreAllRomvosData;
  const byId = id => document.getElementById(id);
  const dialog = byId('scheduleDialog');
  const status = byId('scheduleStatus');
  const badge = byId('scheduleSummary');
  const modeKey = 'romvos_shared_schedule_v1';
  const originalKey = 'romvos_local_schedule_before_cloud_v1';
  const lastBackupKey = 'romvos_last_shared_backup_v1';
  const preRestoreKey = 'romvos_pre_restore_shared_backup_v1';
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
  let selectedBackup;

  function show(text, error = false) {
    status.textContent = text;
    status.classList.toggle('account-error', error);
  }
  function open() { if (!dialog.open) dialog.showModal(); }
  function recoveryKey() { return `romvos_unsaved_schedule_v1_${member?.uid || 'unknown'}`; }
  function backupReady() {
    return shared && member?.role === 'owner' && latest?.initialized && view?.initialized
      && !busy && !failed && !bridge.editorOpen() && latest.revision === view.revision;
  }
  function updateBackupControls() {
    const backupButton = byId('romvosBackupButton');
    const restoreButton = byId('romvosRestoreButton');
    const restoreInput = byId('romvosRestoreFile');
    const hint = byId('romvosBackupHint');
    if (!shared) {
      backupButton.hidden = false; restoreButton.hidden = false;
      backupButton.disabled = false; restoreButton.disabled = false; restoreInput.disabled = false;
      backupButton.textContent = '💾 BACKUP ΔΕΔΟΜΕΝΩΝ';
      restoreButton.textContent = '📂 ΕΠΑΝΑΦΟΡΑ BACKUP';
      hint.textContent = 'Κράτησε το αρχείο backup σε ασφαλές σημείο.';
      return;
    }
    const owner = member?.role === 'owner';
    backupButton.hidden = !owner; restoreButton.hidden = !owner;
    backupButton.disabled = !backupReady(); restoreButton.disabled = !backupReady(); restoreInput.disabled = !backupReady();
    backupButton.textContent = '💾 ΛΗΨΗ BACKUP ΚΟΙΝΗΣ ΒΑΣΗΣ';
    restoreButton.textContent = '📂 ΕΠΑΝΑΦΟΡΑ ΚΟΙΝΗΣ ΒΑΣΗΣ';
    if (!owner) {
      hint.textContent = 'Το ημερήσιο backup της κοινής βάσης γίνεται από τον owner.';
      return;
    }
    let saved;
    try { saved = JSON.parse(localStorage.getItem(lastBackupKey) || 'null'); } catch { saved = null; }
    if (!saved?.createdAt || !Number.isFinite(Date.parse(saved.createdAt)) || !Number.isSafeInteger(saved.revision)) {
      hint.textContent = 'Δεν έχει ληφθεί ακόμη κοινό backup σε αυτόν τον browser.';
    } else {
      const date = new Intl.DateTimeFormat('el-GR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(saved.createdAt));
      hint.textContent = latest?.revision > saved.revision
        ? `Τελευταίο backup: ${date} · υπάρχουν νεότερες αλλαγές.`
        : `Τελευταίο backup σε αυτόν τον browser: ${date}.`;
    }
  }
  function controls() {
    byId('scheduleJoin').hidden = shared || !latest?.initialized || !member;
    byId('scheduleInitialize').hidden = shared || !latest || latest.initialized || member?.role !== 'owner';
    byId('scheduleImportBackup').hidden = shared || !selectedBackup || !latest || latest.initialized || member?.role !== 'owner';
    byId('scheduleRetry').hidden = !failed || !member || member.role === 'viewer' && Boolean(operation);
    byId('scheduleReload').hidden = !shared || !failed || !latest?.initialized;
    byId('scheduleRecovery').hidden = !member || !(localStorage.getItem(recoveryKey()) || localStorage.getItem(`${recoveryKey()}_previous`));
    byId('scheduleLocal').hidden = !shared;
    byId('scheduleClose').hidden = shared && (busy || failed || !view);
    dialog.querySelectorAll('button').forEach(button => { button.disabled = busy; });
    bridge.lock(shared && (busy || failed || !view || !member));
    byId('accountStorageScope').textContent = shared
      ? 'Κοινά: πρόγραμμα, εργασίες, τεχνικοί, οχήματα, επαφές, To Do και αρχείο, υπενθυμίσεις, παραγγελίες, εισερχόμενος εξοπλισμός και επιστροφές.'
      : 'Τα δεδομένα αποθηκεύονται σε αυτόν τον browser. Το κοινό πρόγραμμα ενεργοποιείται ξεχωριστά.';
    updateBackupControls();
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
  function backupSnapshot(prefix, markDaily = false) {
    if (!backupReady()) {
      alertAction(bridge.editorOpen()
        ? 'Ολοκλήρωσε ή κλείσε πρώτα την ανοιχτή επεξεργασία.'
        : 'Περίμενε να επιβεβαιωθεί η τελευταία έκδοση της κοινής βάσης και δοκίμασε ξανά.');
      return null;
    }
    const createdAt = now().toISOString();
    const payload = createSharedServiceBackup({
      state: latest.state,
      revision: latest.revision,
      operationId: latest.operationId,
      createdAt,
      createdBy: member,
    });
    const filename = sharedBackupFilename(createdAt, latest.revision, prefix);
    const text = JSON.stringify(payload, null, 2);
    downloadFile(text, filename);
    if (markDaily) {
      localStorage.setItem(lastBackupKey, JSON.stringify({ createdAt, revision: latest.revision }));
      updateBackupControls();
    }
    return { payload, text, filename };
  }
  function exportSharedBackup() {
    if (member?.role !== 'owner') {
      alertAction('Το backup της κοινής βάσης είναι διαθέσιμο μόνο στον owner.');
      return null;
    }
    const result = backupSnapshot('ROMVOS_SHARED_BACKUP', true);
    if (result) alertAction(`Το κοινό backup αποθηκεύτηκε.\n\nΑρχείο: ${result.filename}\n\nΚράτησέ το σε δεύτερο ασφαλές σημείο.`);
    return result;
  }
  async function restoreSharedBackup(input) {
    const file = input?.files?.[0];
    if (!file) return false;
    try {
      if (member?.role !== 'owner') {
        alertAction('Η επαναφορά της κοινής βάσης είναι διαθέσιμη μόνο στον owner.');
        return false;
      }
      if (!backupReady()) {
        alertAction(bridge.editorOpen()
          ? 'Ολοκλήρωσε ή κλείσε πρώτα την ανοιχτή επεξεργασία.'
          : 'Η κοινή βάση δεν είναι ακόμη έτοιμη για ασφαλή επαναφορά.');
        return false;
      }
      if (file.size > 25 * 1024 * 1024) throw new Error('Το αρχείο είναι μεγαλύτερο από 25 MB.');
      const selectedRevision = latest.revision;
      const prepared = prepareServiceBackup(await file.text());
      const changes = scheduleChanges(latest.records, prepared.records);
      if (!changes.length) {
        alertAction('Το backup έχει τα ίδια δεδομένα με την τρέχουσα κοινή βάση. Δεν χρειάζεται επαναφορά.');
        return false;
      }
      const date = prepared.source.createdAt
        ? new Intl.DateTimeFormat('el-GR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Athens' })
          .format(new Date(prepared.source.createdAt))
        : 'χωρίς καταγεγραμμένη ημερομηνία';
      if (!confirmAction(`ΠΡΟΣΟΧΗ — ΕΠΑΝΑΦΟΡΑ ΚΟΙΝΗΣ ΒΑΣΗΣ\n\nΑρχείο: ${file.name}\nBackup: ${date}\nΕγγραφές service: ${prepared.source.serviceRecords}\nΤρέχουσα έκδοση cloud: ${selectedRevision}\nΕνότητες που θα αλλάξουν: ${changes.length}\n\nΤα σημερινά κοινά δεδομένα θα αντικατασταθούν για όλους τους χρήστες.`)) return false;
      if (String(promptAction('Για επιβεβαίωση πληκτρολόγησε ακριβώς ΕΠΑΝΑΦΟΡΑ', '') || '').trim().toUpperCase() !== 'ΕΠΑΝΑΦΟΡΑ') {
        alertAction('Η επαναφορά ακυρώθηκε.');
        return false;
      }
      if (!backupReady() || latest.revision !== selectedRevision) {
        alertAction('Η κοινή βάση άλλαξε όσο έλεγες το backup. Η επαναφορά ακυρώθηκε· έλεγξέ το ξανά.');
        return false;
      }
      // Keep an independent copy of the exact server state that is about to be
      // replaced. The local copy is also retained if the browser blocks download.
      const safety = backupSnapshot('ROMVOS_BEFORE_RESTORE', false);
      if (!safety) return false;
      try { localStorage.setItem(preRestoreKey, safety.text); }
      catch { throw new Error('Δεν υπάρχει αρκετός τοπικός χώρος για το υποχρεωτικό αντίγραφο πριν την επαναφορά.'); }
      const success = await commit({ expectedRevision: selectedRevision, operationId: crypto.randomUUID(),
        changes, desired: prepared.state }, prepared.records);
      if (success) alertAction('Η κοινή βάση επαναφέρθηκε επιτυχώς και η αλλαγή θα εμφανιστεί σε όλους τους χρήστες.');
      return success;
    } catch (error) {
      if (!failed) alertAction(`Η επαναφορά δεν έγινε.\n${error.message}`);
      return false;
    } finally {
      input.value = '';
    }
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
      updateBackupControls();
      if (!shared) {
        show(snapshot.initialized
          ? 'Υπάρχει κοινό πρόγραμμα. Η σύνδεση θα το φορτώσει εδώ. Το σημερινό τοπικό πρόγραμμα θα διατηρηθεί ξεχωριστά στον browser.'
          : member.role === 'owner'
            ? 'Δεν έχει δημιουργηθεί κοινό πρόγραμμα. Η δημιουργία θα μεταφέρει όλες τις ενότητες του service από αυτόν τον browser. Επίλεξε πρώτα το σωστό, ενημερωμένο αντίγραφο.'
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
    catch (error) { busy = false; onFailure(error); return false; }
    badge.textContent = 'Κοινό πρόγραμμα · αποθήκευση…';
    show('Αποθήκευση στο κοινό πρόγραμμα…');
    controls();
    try {
      const revision = await service.commit(action);
      if (request !== generation) return false;
      failed = false;
      busy = false;
      const own = { revision, initialized: true, records: desiredRecords, state: action.desired, operationId: action.operationId };
      const confirmed = latest?.revision >= revision ? latest : own;
      if (initializing) enterShared(confirmed);
      else { apply(confirmed); if (dialog.open) dialog.close(); }
      localStorage.removeItem(recoveryKey());
      operation = undefined;
      return true;
    } catch (error) { if (request === generation) { busy = false; onFailure(error); } return false; }
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
    if (bridge.isApplying?.()) return false;
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
  window.romvosServiceBeforeWrite = () => {
    if (bridge.isApplying?.()) return false;
    if (!shared) return true;
    if (!member || busy || failed || !view) return false;
    if (member.role === 'viewer') {
      bridge.apply(view.state);
      show('Ο λογαριασμός σου έχει δικαίωμα προβολής. Τα κοινά δεδομένα δεν άλλαξαν.', true);
      // Some legacy handlers assign their array again after setItem returns.
      queueMicrotask(() => { if (shared && view && member?.role === 'viewer') bridge.apply(view.state); });
      open();
      return false;
    }
    return true;
  };
  // Preserve the original all-localStorage tools in local mode. In shared mode
  // the same sidebar buttons use only the acknowledged Firestore snapshot.
  window.backupAllRomvosData = (...args) => shared ? exportSharedBackup() : legacyBackup?.(...args);
  window.restoreAllRomvosData = input => shared ? restoreSharedBackup(input) : legacyRestore?.(input);
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
  window.addEventListener('romvos:backup-selected', event => {
    selectedBackup = event.detail || undefined;
    controls();
  });
  byId('scheduleImportBackup').addEventListener('click', async () => {
    if (!selectedBackup || member?.role !== 'owner' || latest?.initialized || busy) return;
    const date = selectedBackup.source.createdAt
      ? new Intl.DateTimeFormat('el-GR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Athens' })
        .format(new Date(selectedBackup.source.createdAt))
      : 'χωρίς καταγεγραμμένη ημερομηνία';
    const count = selectedBackup.records.size;
    if (!confirmAction(`Θα δημιουργηθεί το κοινό service από το αρχείο «${selectedBackup.fileName}».\n\nBackup: ${date}\nΕγγραφές cloud: ${count}\n\nΟι ενότητες των άλλων HTML δεν θα εισαχθούν. Συνέχεια;`)) return;
    try {
      rememberLocal();
      const desired = selectedBackup.state;
      const records = selectedBackup.records;
      await commit({ expectedRevision: 0, operationId: crypto.randomUUID(),
        changes: scheduleChanges(new Map(), records), desired }, records, true);
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
  updateBackupControls();
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
