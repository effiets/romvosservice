// Adapter for the existing global application. Cloud code does not replace the UI.
(function () {
  const copy = value => JSON.parse(JSON.stringify(value));
  const fields = { employees: K.e, vehicles: K.v, jobs: K.j, drafts: K.d, candidates: K.p, board: K.b };
  function capture() { return copy({ employees: E, vehicles: V, jobs: J, drafts: D, candidates: CAND, board: B }); }
  function apply(state) {
    const next = copy(state);
    E = next.employees; V = next.vehicles; J = next.jobs; D = next.drafts; CAND = next.candidates; B = next.board;
    for (const [field, key] of Object.entries(fields)) localStorage.setItem(key, JSON.stringify(next[field]));
    render(); renderBoard();
  }
  function editorOpen() {
    return Boolean(document.querySelector('.modal.open'))
      || Boolean(document.getElementById('empName')?.value.trim())
      || Boolean(document.getElementById('vehPlate')?.value.trim());
  }
  function lock(on) {
    document.querySelector('.app').inert = on;
    document.querySelectorAll('.modal').forEach(element => { element.inert = on; });
  }
  window.romvosScheduleBridge = Object.freeze({ capture, apply, editorOpen, lock });
})();
