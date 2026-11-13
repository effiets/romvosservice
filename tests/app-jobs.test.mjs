import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../assets/js/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('saving from a crew cell attaches the new draft to that exact board cell', () => {
  const start = source.indexOf("let draftEditorTargetKey='';");
  const end = source.indexOf('async function deleteDraftJob', start);
  assert(start >= 0 && end > start, 'draft editor implementation was not found');

  const elements = new Map([
    ['draftEditorModal', { classList: { add() {}, remove() {} } }],
    ['draftEditorText', { innerHTML: '', focus() {} }],
    ['draftEditorId', { value: '' }],
    ['draftEditorTitle', { textContent: '' }],
  ]);
  const drafts = [];
  const board = {};
  let saves = 0;
  const context = vm.createContext({
    D: drafts,
    B: board,
    $: id => elements.get(id),
    setRichEditor: (element, value) => { element.innerHTML = value?.title || ''; },
    setTimeout() {},
    placeCaretEnd() {},
    sanitizeRichHTML: value => String(value || ''),
    richToPlain: value => String(value || '').trim(),
    alert() {},
    uid: () => 'DRF-NEW',
    boardEntry: key => (board[key] ||= { jobs: [], drafts: [], emps: [], vehs: [] }),
    save: () => { saves++; },
    renderBoard() {},
  });
  vm.runInContext(source.slice(start, end), context);

  context.addDraftJob('2026-11-06#3');
  elements.get('draftEditorText').innerHTML = 'Έλεγχος ψυκτικού';
  context.saveDraftEditor();

  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].title, 'Έλεγχος ψυκτικού');
  assert.deepEqual(board['2026-11-06#3'].drafts, ['DRF-NEW']);
  assert.equal(saves, 1);
  assert.match(source, /addDraftJob\('\$\{key\}'\)/);
  assert.match(source, /const orphanDrafts=D\.filter/);
});

test('job description and notes render visibly and escape user text', () => {
  const start = source.indexOf('function jobDetailsHtml');
  const end = source.indexOf('\n\nfunction setBoardMode', start);
  assert(start >= 0 && end > start, 'job detail renderer was not found');
  const context = vm.createContext({
    esc: value => String(value || '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character]),
  });
  vm.runInContext(source.slice(start, end), context);
  const html = context.jobDetailsHtml({
    task: '<b>Έλεγχος</b>',
    notes: 'Καλέστε πριν την επίσκεψη',
  }, 'job-card-detail');

  assert.match(html, /job-card-detail/);
  assert.match(html, /Περιγραφή:/);
  assert.match(html, /&lt;b&gt;Έλεγχος&lt;\/b&gt;/);
  assert.match(html, /Σημειώσεις:/);
  assert.match(html, /Καλέστε πριν την επίσκεψη/);
  assert.match(source, /jobDetailsHtml\(obj,'job-card-detail'\)/);
  assert.match(source, /jobDetailsHtml\(j,'job-list-detail'\)/);
  assert.match(source, /jobDetailsHtml\(j,'job-dashboard-detail'\)/);
});

test('new candidate work selects an active contact and stores the requested work type', () => {
  const start = source.indexOf('function nextWorkday');
  const end = source.indexOf('async function deleteCandidateJob', start);
  assert(start >= 0 && end > start, 'candidate editor implementation was not found');

  const element = value => {
    const classes = new Set();
    return { value, innerHTML: '', textContent: '', focusCount: 0,
      focus() { this.focusCount++; },
      classList: {
        add: name => classes.add(name), remove: name => classes.delete(name),
        toggle(name, force) { const on = force === undefined ? !classes.has(name) : !!force; if (on) classes.add(name); else classes.delete(name); return on; },
        contains: name => classes.has(name),
      } };
  };
  const elements = new Map([
    ['candidateEditorModal', element('')],
    ['candidateEditorText', element('')],
    ['candidateEditorId', element('')],
    ['candidateEditorClient', element('')],
    ['candidateEditorClientButton', element('')],
    ['candidateEditorClientLabel', element('')],
    ['candidateEditorClientMeta', element('')],
    ['candidateEditorType', element('Βλάβη')],
    ['candidateEditorDate', element('')],
    ['candidateEditorPriority', element('Κανονική')],
    ['candidateEditorTitle', element('')],
    ['candidateContactPickerModal', element('')],
    ['candidateContactSearch', element('')],
    ['candidateContactPickerList', element('')],
  ]);
  const candidates = [];
  const drafts = [{ id: 'DRF-EXISTING', title: 'Παλιά περιγραφή', richTitle: '',
    clientId: 'CLI-1', client: 'Παλιό όνομα', type: 'Βλάβη', candidateOrigin: true,
    candidateDate: '2026-11-12', candidatePriority: 'Υψηλή' }];
  const alerts = [];
  let saves = 0;
  const context = vm.createContext({
    C: [
      { id: 'CLI-3', name: 'ΜΑΣΟΥΤΗΣ 101 - Θεσσαλονίκη', category: 'Μασούτης', storeNo: '101', city: 'Θεσσαλονίκη', active: true },
      { id: 'CLI-1', name: 'LIDL GR0001 - Σέρρες-Σιδ. Σταθμός', category: 'LIDL', storeNo: 'GR0001', city: 'Σέρρες', regionCode: '310', active: true },
      { id: 'CLI-2', name: 'Ανενεργό κατάστημα', active: 'false' },
    ],
    CAND: candidates,
    D: drafts,
    $: id => elements.get(id),
    clientKey: value => String(value || '').trim().toLowerCase(),
    esc: value => String(value || '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character]),
    today: () => '2026-11-09',
    setRichEditor: (target, candidate) => { target.innerHTML = candidate?.title || ''; },
    setTimeout: callback => callback(),
    placeCaretEnd: target => target.focus(),
    sanitizeRichHTML: value => String(value || ''),
    richToPlain: value => String(value || '').trim(),
    alert: message => alerts.push(message),
    uid: () => 'CAN-NEW',
    save: () => { saves++; },
    renderBoard() {},
  });
  vm.runInContext(source.slice(start, end), context);

  context.addCandidateJob();
  assert.equal(elements.get('candidateEditorTitle').textContent, 'Νέα εργασία');
  assert.equal(elements.get('candidateEditorClientButton').focusCount, 1);
  assert.match(elements.get('candidateEditorClientLabel').textContent, /Επαφές εφαρμογής/);
  context.openCandidateContactPicker();
  assert.match(elements.get('candidateContactPickerList').innerHTML, /LIDL GR0001/);
  assert.match(elements.get('candidateContactPickerList').innerHTML, /ΜΑΣΟΥΤΗΣ 101/);
  assert.doesNotMatch(elements.get('candidateContactPickerList').innerHTML, /Ανενεργό κατάστημα/);
  assert(elements.get('candidateContactPickerList').innerHTML.indexOf('LIDL GR0001') < elements.get('candidateContactPickerList').innerHTML.indexOf('ΜΑΣΟΥΤΗΣ 101'));
  elements.get('candidateContactSearch').value = 'gr0001';
  context.renderCandidateContactPicker();
  context.selectCandidateContactAt(0);

  assert.equal(elements.get('candidateEditorClient').value, 'CLI-1');
  assert.equal(elements.get('candidateEditorClientLabel').textContent, 'LIDL GR0001 - Σέρρες-Σιδ. Σταθμός');
  assert.match(elements.get('candidateEditorClientMeta').textContent, /Lidl • GR0001 • Σέρρες • WH 310/);
  elements.get('candidateEditorType').value = 'Συντήρηση';
  elements.get('candidateEditorText').innerHTML = 'Έλεγχος εγκατάστασης';
  context.saveCandidateEditor();

  assert.equal(saves, 1);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].clientId, 'CLI-1');
  assert.equal(candidates[0].client, 'LIDL GR0001 - Σέρρες-Σιδ. Σταθμός');
  assert.equal(candidates[0].type, 'Συντήρηση');
  assert.equal(candidates[0].title, 'Έλεγχος εγκατάστασης');

  context.openCandidateEditor('DRF-EXISTING', 'draft');
  assert.equal(elements.get('candidateEditorClient').value, 'CLI-1', 'clientId follows a renamed contact');
  assert.equal(elements.get('candidateEditorTitle').textContent, 'Επεξεργασία εργασίας συνεργείου');
  elements.get('candidateEditorType').value = 'Εγκατάσταση';
  elements.get('candidateEditorText').innerHTML = 'Νέα περιγραφή συνεργείου';
  context.saveCandidateEditor();
  assert.equal(drafts[0].client, 'LIDL GR0001 - Σέρρες-Σιδ. Σταθμός');
  assert.equal(drafts[0].type, 'Εγκατάσταση');
  assert.equal(drafts[0].title, 'Νέα περιγραφή συνεργείου');

  context.addCandidateJob();
  elements.get('candidateEditorClient').value = 'CLI-UNKNOWN';
  elements.get('candidateEditorText').innerHTML = 'Δεν πρέπει να αποθηκευτεί';
  context.saveCandidateEditor();
  assert.equal(candidates.length, 1);
  assert.match(alerts.at(-1), /Επαφές/);
  assert.equal(elements.get('candidateContactPickerModal').classList.contains('open'), true);

  assert.match(html, />\+ Νέα<\/button>/);
  assert.match(html, /<input type="hidden" id="candidateEditorClient">/);
  assert.match(html, /id="candidateEditorClientButton"/);
  assert.match(html, /id="candidateContactPickerModal"/);
  assert.doesNotMatch(html, /<select id="candidateEditorClient"|candidateClientNames|list="candidateClientNames"/);
  assert.match(html, /id="candidateEditorType"/);
  for (const type of ['Βλάβη', 'Συντήρηση', 'Εγκατάσταση', 'Άλλο']) {
    assert.match(html, new RegExp(`<option value="${type}">${type}<\\/option>`));
  }
  assert.match(source, /function editDraftJob\(id\).*openCandidateEditor\(id,'draft'\)/);
  assert.match(source, /candidateContactPickerModal[\s\S]*stopImmediatePropagation/);
  assert.equal(source.match(/plannedWorkDailyHtml\(d\)/g)?.length, 2);
});

test('candidate client and work type survive placement on and return from the board', () => {
  const moveStart = source.indexOf('function boardKey');
  const moveEnd = source.indexOf('function removeBoardItem', moveStart);
  assert(moveStart >= 0 && moveEnd > moveStart, 'board move implementation was not found');
  const board = {};
  const moveContext = vm.createContext({
    CAND: [{ id: 'CAN-1', title: 'Έλεγχος', richTitle: '', clientId: 'CLI-1',
      client: 'Πελάτης Α', type: 'Βλάβη', date: '2026-11-12', priority: 'Υψηλή' }],
    D: [], B: board, E: [], V: [], J: [], BOARD_CREW_COUNT: 5,
    uid: () => 'DRF-1', save() {}, renderBoard() {}, render() {}, alert() {},
    empLeaveInfo: () => null,
  });
  vm.runInContext(source.slice(moveStart, moveEnd), moveContext);
  moveContext.moveBoardItem({ kind: 'candidate', id: 'CAN-1' }, '2026-11-12#2');
  assert.equal(moveContext.D[0].clientId, 'CLI-1');
  assert.equal(moveContext.D[0].client, 'Πελάτης Α');
  assert.equal(moveContext.D[0].type, 'Βλάβη');
  assert.deepEqual(Array.from(board['2026-11-12#2'].drafts), ['DRF-1']);

  const returnStart = source.indexOf('function returnDraftToCandidates');
  const returnEnd = source.indexOf('function returnDraftToCandidatesFromMenu', returnStart);
  assert(returnStart >= 0 && returnEnd > returnStart, 'draft return implementation was not found');
  const returnContext = vm.createContext({
    D: [{ ...moveContext.D[0] }], CAND: [],
    uid: () => 'CAN-RETURNED', nextWorkday: () => '2026-11-13', today: () => '2026-11-12',
    removeFromAll() {}, save() {}, renderBoard() {}, render() {},
  });
  vm.runInContext(source.slice(returnStart, returnEnd), returnContext);
  returnContext.returnDraftToCandidates('DRF-1', '2026-11-12#2');
  assert.equal(returnContext.CAND[0].clientId, 'CLI-1');
  assert.equal(returnContext.CAND[0].client, 'Πελάτης Α');
  assert.equal(returnContext.CAND[0].type, 'Βλάβη');
});
