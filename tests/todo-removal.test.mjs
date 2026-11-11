import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('the retired To-Do feature has no navigation, screen, controller or alerts', () => {
  const html = read('index.html');
  assert.doesNotMatch(html, /data-tab=["']todo["']/i);
  assert.doesNotMatch(html, /id=["']todo/i);
  assert.doesNotMatch(html, /To[ -]?Do/i);
  assert.doesNotMatch(html, /legacy-(?:05|31)\.js/);
  assert.equal(existsSync(new URL('../assets/js/legacy-05.js', import.meta.url)), false);
  assert.equal(existsSync(new URL('../assets/js/legacy-31.js', import.meta.url)), false);

  const activeControllers = ['legacy-07.js', 'legacy-14.js', 'legacy-19.js', 'legacy-20.js', 'legacy-21.js']
    .map(file => read(`assets/js/${file}`)).join('\n');
  assert.doesNotMatch(activeControllers, /romvos_todo_v1|testTodoReminder|renderTodo|toggleTodo|['"]todo['"]/i);
});

test('retired To-Do data round-trips only as hidden schema compatibility data', () => {
  const bridge = read('assets/js/schedule-bridge.js');
  const model = read('assets/js/schedule-model.mjs');
  const inspector = read('assets/js/backup-inspector.mjs');

  assert.match(bridge, /todos:\s*'romvos_todo_v1'/);
  assert.match(bridge, /todoArchive:\s*'romvos_todo_archive_v1'/);
  assert.doesNotMatch(bridge, /field:\s*'todos'/);
  assert.doesNotMatch(bridge, /renderTodo/);
  assert.match(model, /'todos',\s*'todoArchive'/);
  assert.match(inspector, /key:\s*'todos'.*hidden:\s*true/);
  assert.match(inspector, /inventory\.filter\(module\s*=>\s*!module\.hidden\)/);
});
