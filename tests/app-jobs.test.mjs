import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../assets/js/app.js', import.meta.url), 'utf8');

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
