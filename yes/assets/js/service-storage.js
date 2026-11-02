// Observe only this application's business lists, including writes from legacy
// popup controllers. Preferences and the other HTML applications stay separate.
(function () {
  const keys = new Set([
    'cf_employees', 'cf_vehicles', 'cf_jobs', 'cf_clients', 'romvos_board',
    'romvos_board_drafts', 'romvos_board_candidates_v1', 'romvos_simple_reminders',
    'romvos_todo_v1', 'romvos_todo_archive_v1', 'romvos_supplier_orders',
    'romvos_incoming_equipment', 'romvos_pending_returns',
  ]);
  const original = {
    get: Storage.prototype.getItem, set: Storage.prototype.setItem,
    remove: Storage.prototype.removeItem, clear: Storage.prototype.clear,
  };
  const startupValues = Object.freeze(Object.fromEntries([...keys].map(key => [key, original.get.call(localStorage, key)])));
  // Legacy popup controllers read lists from storage directly. Keep this tab's
  // baseline isolated from local writes in other tabs; cloud snapshots update it.
  const values = new Map(Object.entries(startupValues));
  const shared = () => original.get.call(localStorage, 'romvos_shared_schedule_v1') === 'true';
  function allow(key, value) {
    if (!shared()) return true;
    // This script runs before the legacy startup migrations. An existing cloud
    // session must first obtain its authenticated, server-confirmed baseline.
    return Boolean(window.romvosServiceBeforeWrite?.(key, value));
  }
  function changed(key, value) {
    window.dispatchEvent(new CustomEvent('romvos:service-write', { detail: { key, value } }));
    window.dispatchEvent(new Event('romvos:schedule-saved'));
  }
  Storage.prototype.getItem = function (key) {
    key = String(key);
    return this === localStorage && keys.has(key) ? values.get(key) : original.get.call(this, key);
  };
  Storage.prototype.setItem = function (key, value) {
    key = String(key); value = String(value);
    if (this !== localStorage || !keys.has(key)) return original.set.call(this, key, value);
    if (!allow(key, value)) return;
    const previous = values.get(key);
    original.set.call(this, key, value);
    values.set(key, value);
    if (previous !== value) changed(key, value);
  };
  Storage.prototype.removeItem = function (key) {
    key = String(key);
    if (this !== localStorage || !keys.has(key)) return original.remove.call(this, key);
    if (!allow(key, null)) return;
    const previous = values.get(key);
    original.remove.call(this, key);
    values.set(key, null);
    if (previous !== null) changed(key, null);
  };
  Storage.prototype.clear = function () {
    if (this === localStorage && shared()) {
      throw new Error('Η επαναφορά στην κοινή εφαρμογή πρέπει να γίνει από την ειδική διαδικασία εισαγωγής, ώστε να προστατευθούν τα κοινά δεδομένα.');
    }
    const result = original.clear.call(this);
    if (this === localStorage) for (const key of keys) values.set(key, null);
    return result;
  };
  window.romvosServiceStorage = Object.freeze({
    startupValues,
    // Applying an acknowledged cloud snapshot is local persistence, not a new
    // user operation. Do not feed it back into the save queue.
    replace(next) {
      for (const [key, value] of Object.entries(next)) {
        if (!keys.has(key)) throw new Error('Unknown service storage key');
        original.set.call(localStorage, key, value);
        values.set(key, value);
      }
    },
  });
})();
