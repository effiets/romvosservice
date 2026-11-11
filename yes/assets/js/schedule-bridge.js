// Adapter for the existing global application. Keep its screens and controllers.
(function () {
  const copy = value => JSON.parse(JSON.stringify(value));
  const fields = {
    employees: K.e, vehicles: K.v, jobs: K.j, drafts: K.d, candidates: K.p, board: K.b,
    clients: K.c, reminders: 'romvos_simple_reminders', todos: 'romvos_todo_v1',
    todoArchive: 'romvos_todo_archive_v1', orders: 'romvos_supplier_orders',
    incoming: 'romvos_incoming_equipment', returns: 'romvos_pending_returns',
  };
  const list = value => {
    const parsed = JSON.parse(value || '[]');
    if (!Array.isArray(parsed)) throw new Error('Invalid service list');
    return parsed;
  };
  // Retained as dormant schema-v3 compatibility data. The To-Do feature is no
  // longer exposed by this application, but these values must round-trip so a
  // normal save cannot erase records created by older versions.
  let todos = list(localStorage.getItem(fields.todos));
  let todoArchive = list(localStorage.getItem(fields.todoArchive));
  let applying = false;
  const dirty = new Set();
  const editors = [
    { field: 'clients', prefix: /^(cli|clientSite)/, clear: ['clearClient'], ids: ['cliId', 'cliName'] },
    { field: 'reminders', prefix: /^simpleRem/, clear: ['clearSimpleReminder'], ids: ['simpleRemId', 'simpleRemText'] },
    { field: 'orders', prefix: /^ord/, clear: ['clearOrder'], ids: ['ordId', 'ordSupplier', 'ordTitle'] },
    { field: 'incoming', prefix: /^(in[A-Z]|eq-)/, clear: ['clearIncoming'], ids: ['inId', 'inContact', 'inProblem'] },
    { field: 'returns', prefix: /^ret/, clear: ['clearReturn'], ids: ['retId', 'retContact', 'retSentItem'] },
  ];
  function capture() {
    return copy({ employees: E, vehicles: V, jobs: J, drafts: D, candidates: CAND, board: B,
      clients: C, reminders: SIMPLE_REMINDERS, todos, todoArchive, orders: ORDERS, incoming: INCOMING, returns: RETURNS });
  }
  function updateGlobals(field, value) {
    switch (field) {
      case 'employees': E = value; break;
      case 'vehicles': V = value; break;
      case 'jobs': J = value; break;
      case 'drafts': D = value; break;
      case 'candidates': CAND = value; break;
      case 'board': B = value; break;
      case 'clients': C = value; break;
      case 'reminders': SIMPLE_REMINDERS = value; break;
      case 'todos': todos = value; break;
      case 'todoArchive': todoArchive = value; break;
      case 'orders': ORDERS = value; break;
      case 'incoming': INCOMING = value; break;
      case 'returns': RETURNS = value; break;
    }
  }
  window.addEventListener('romvos:service-write', event => {
    const field = Object.keys(fields).find(field => fields[field] === event.detail.key);
    if (field) updateGlobals(field, JSON.parse(event.detail.value || (field === 'board' ? '{}' : '[]')));
    // Several original controllers clear their form using private functions.
    // Inspect after that handler finishes, without losing unrelated open edits.
    queueMicrotask(() => editors.forEach((editor, index) => {
      if (editor.field === field && editor.ids.every(id => !document.getElementById(id)?.value.trim())) dirty.delete(index);
    }));
  });
  function apply(state) {
    if (applying) return;
    applying = true;
    try {
      const next = copy(state);
      const values = {};
      for (const [field, key] of Object.entries(fields)) {
        const value = next[field] ?? (field === 'board' ? {} : []);
        updateGlobals(field, value);
        values[key] = JSON.stringify(value);
      }
      window.romvosServiceStorage.replace(values);
      dirty.clear();
      render(); renderBoard();
      for (const name of ['fillModuleLists', 'romvosRefreshContactSuggestions', 'renderSimpleReminders',
        'renderOrders', 'renderIncoming', 'renderReturns', 'updateReminderDueBanner']) window[name]?.();
    } finally { applying = false; }
  }
  function editorOpen() {
    return Boolean(document.querySelector('.modal.open, #romvosInAppMove.show')) || dirty.size > 0
      || ['empName', 'vehPlate', ...editors.flatMap(editor => editor.ids)]
        .some(id => Boolean(document.getElementById(id)?.value.trim()));
  }
  function track(event) {
    const id = event.target?.id || event.target?.className || '';
    if (/Search|Filter|CompleteMode|ArchiveToggle/i.test(id)) return;
    editors.forEach((editor, index) => { if (editor.prefix.test(id)) dirty.add(index); });
  }
  document.addEventListener('input', track);
  document.addEventListener('change', track);
  editors.forEach((editor, index) => {
    for (const name of editor.clear) {
      const original = window[name];
      if (typeof original === 'function') window[name] = function (...args) {
        const result = original.apply(this, args);
        dirty.delete(index);
        return result;
      };
    }
  });
  function lock(on) {
    document.querySelector('.app').inert = on;
    document.querySelectorAll('.modal, #romvosInAppAlert, #simpleReminderPopup, #orderAlertPopup, #romvosWorkCardAlert')
      .forEach(element => { element.inert = on; });
  }
  // A previous version backed up only scheduling when entering shared mode.
  // Preserve the additional local lists before the first expanded cloud load.
  const originalKey = 'romvos_local_schedule_before_cloud_v1';
  if (localStorage.getItem('romvos_shared_schedule_v1') === 'true' && localStorage.getItem(originalKey)) {
    const original = JSON.parse(localStorage.getItem(originalKey));
    for (const field of ['clients', 'reminders', 'todos', 'todoArchive', 'orders', 'incoming', 'returns']) {
      if (!Object.hasOwn(original, field)) original[field] = list(window.romvosServiceStorage.startupValues[fields[field]]);
    }
    localStorage.setItem(originalKey, JSON.stringify(original));
  }
  window.romvosScheduleBridge = Object.freeze({ capture, apply, editorOpen, lock, isApplying: () => applying });
})();
