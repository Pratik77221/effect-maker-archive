import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInThisContext } from 'node:vm';
import { mountEditorPanel, renderEditorPanel } from '../extension/editor-panel.js';

// Minimal DOM event harness: exercises the real panel handlers without an editor.
function setupPanel(invoke) {
  const downloads = [];
  class Element {
    constructor(tag) {
      this.tag = tag; this.children = []; this.style = {}; this.dataset = {};
      this.attributes = {}; this.listeners = {}; this.textContent = ''; this.files = [];
    }
    append(child) { this.children.push(child); child.parent = this; }
    remove() { this.parent.children = this.parent.children.filter(child => child !== this); }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(type, callback) { this.listeners[type] = callback; }
    focus() { this.focused = true; }
    async click() {
      if (this.disabled) return;
      if (this.tag === 'a') downloads.push({ href: this.href, name: this.download });
      return this.listeners.click?.();
    }
  }
  const body = new Element('body');
  const all = () => { const visit = node => [node, ...node.children.flatMap(visit)]; return visit(body); };
  globalThis.location = { origin: 'https://effects.youtube.com', pathname: '/edit/destination' };
  globalThis.document = { body, createElement: tag => new Element(tag), createElementNS: (_, tag) => new Element(tag), getElementById: id => all().find(node => node.id === id) };
  mountEditorPanel(invoke);
  return {
    body, downloads, all,
    button: text => all().find(node => node.tag === 'button' && node.textContent === text),
    status: () => all().find(node => node.attributes.role === 'status').textContent,
    select: async value => {
      const input = all().find(node => node.tag === 'input');
      input.files = [{ name: 'project.json', size: 200, text: async () => typeof value === 'string' ? value : JSON.stringify(value) }];
      await input.listeners.change();
    }
  };
}

const archive = { format: 'effect-maker-source-archive', version: 1, project: { id: 'source', title: 'My source' }, source: [], sourceSha256: 'source-hash', assets: [] };
const plan = { destination: { id: 'destination', title: 'Any name' }, destinationSourceSha256: 'destination-hash' };

test('a pulled archive can be imported through the normal controls without a local file selection', async () => {
  const calls=[];
  const invoke=async(operation,input)=>{calls.push({operation,input});return operation==='preview-import'?plan:{status:'saved-reload-required'};};
  const ui=setupPanel(invoke);
  const panel=renderEditorPanel(invoke);
  panel.setArchive(archive,'github-backup.json');
  assert.equal(ui.all().find(node=>node.tag==='input').files.length,0);
  assert.equal(ui.button('Import project').disabled,false);
  assert.deepEqual(calls,[]);
  await ui.button('Import project').click();
  assert.equal(calls[0].operation,'preview-import');
  assert.deepEqual(calls[1].input.archive,archive);
  assert.match(ui.status(),/imported and saved/);
});

test('one Import project click validates then imports; reopening while busy preserves one panel', async () => {
  const calls = [];
  const validation = Promise.withResolvers();
  const ui = setupPanel(async (operation, input) => {
    calls.push({ operation, input });
    if (operation === 'preview-import') return validation.promise;
    return { status: 'saved-reload-required' };
  });
  assert.equal(ui.button('Import project').disabled, true);
  await ui.select(archive);
  assert.deepEqual(calls, []);
  const importing = ui.button('Import project').click();
  assert.equal(ui.button('Import project').disabled, true);
  assert.equal(ui.button('Export project').disabled, true);
  const originalPanel = ui.body.children[0];
  mountEditorPanel(() => { throw new Error('Duplicate panel handler must not run.'); });
  assert.deepEqual(ui.body.children, [originalPanel]);
  validation.resolve(plan);
  await importing;
  assert.deepEqual(calls, [
    { operation: 'preview-import', input: { archive } },
    { operation: 'import', input: { archive, destinationId: 'destination', expectedSourceSha256: 'source-hash', expectedDestinationSha256: 'destination-hash' } }
  ]);
  assert.match(ui.status(), /imported and saved/);
  assert.equal(ui.button('Import project').disabled, true);
  assert.equal(ui.button('Export project').disabled, true);
  assert.equal(ui.button('Reload editor').hidden, false);
});

test('failed validation prevents import and invalid file selection clears the previous file', async () => {
  const calls = [];
  const ui = setupPanel(async operation => { calls.push(operation); throw new Error('Destination is not empty.'); });
  await ui.select(archive);
  await ui.button('Import project').click();
  assert.deepEqual(calls, ['preview-import']);
  assert.equal(ui.status(), 'Error: Destination is not empty.');
  assert.equal(ui.button('Import project').disabled, false);
  await ui.select('{broken');
  assert.equal(ui.button('Import project').disabled, true);
  assert.match(ui.status(), /not valid JSON/);
  mountEditorPanel(async () => ({}));
  assert.equal(ui.body.children.length, 1);
});

test('Export project downloads the archive and reports a readable status', async t => {
  t.mock.method(globalThis, 'setTimeout', () => 0);
  const ui = setupPanel(async operation => { assert.equal(operation, 'export'); return archive; });
  await ui.button('Export project').click();
  assert.equal(ui.downloads.length, 1);
  assert.equal(ui.downloads[0].name, 'effect-source.json');
  const contents = await (await fetch(ui.downloads[0].href)).json();
  assert.deepEqual(contents, archive);
  URL.revokeObjectURL(ui.downloads[0].href);
  assert.match(ui.status(), /download has started/);
});

test('Cancel during validation stops waiting and a late result cannot start import', async () => {
  const calls = [];
  const entered = Promise.withResolvers();
  const pending = Promise.withResolvers();
  const ui = setupPanel(async operation => { calls.push(operation); entered.resolve(); return pending.promise; });
  await ui.select(archive);
  const importing = ui.button('Import project').click();
  await entered.promise;
  assert.equal(ui.button('Cancel').hidden, false);
  await ui.button('Cancel').click();
  await importing;
  assert.match(ui.status(), /cancelled/);
  assert.equal(ui.button('Import project').disabled, false);
  pending.resolve(plan);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls, ['preview-import']);
});

test('saving errors show progress, offer a reload and export a diagnostic without project contents', async t => {
  t.mock.method(globalThis, 'setTimeout', () => 0);
  const pending = Promise.withResolvers();
  const entered = Promise.withResolvers();
  const ui = setupPanel(async (operation, input, task) => {
    if (operation === 'preview-import') return plan;
    return task.wait('save', 'Saving project to Effect Maker…', () => {
      task.markWrite(); entered.resolve(); return pending.promise;
    });
  });
  assert.equal(ui.button('Reload editor').style.display, 'none');
  await ui.select(archive);
  const importing = ui.button('Import project').click();
  await entered.promise;
  assert.equal(ui.status(), 'Saving project to Effect Maker…');
  const failure = new Error('Saving timed out.');
  failure.code = 'TIMEOUT';
  pending.reject(failure);
  await importing;
  assert.match(ui.status(), /Saving timed out/);
  assert.equal(ui.button('Import project').disabled, true);
  assert.equal(ui.button('Reload editor').hidden, false);
  assert.equal(ui.button('Download test log').hidden, false);
  await ui.button('Download test log').click();
  const diagnostic = await (await fetch(ui.downloads[0].href)).json();
  URL.revokeObjectURL(ui.downloads[0].href);
  assert.equal(diagnostic.error.stage, 'save');
  assert.equal(diagnostic.extensionVersion, '0.4.1');
  assert.equal(diagnostic.source, undefined);
  assert.equal(diagnostic.assets, undefined);
});

test('an unexpected import response cannot show a saved-success message', async () => {
  const ui = setupPanel(async operation => operation === 'preview-import' ? plan : { status: 'not-saved' });
  await ui.select(archive);
  await ui.button('Import project').click();
  assert.match(ui.status(), /did not confirm/);
  assert.doesNotMatch(ui.status(), /imported and saved/);
});

test('the packaged classic script mounts and runs with all of its dependencies included', async () => {
  const ui = setupPanel(async () => ({}));
  globalThis.location.hostname = 'effects.youtube.com';
  globalThis.document.scripts = [];
  const bundle = await readFile(new URL('../extension/editor-panel.bundle.js', import.meta.url), 'utf8');
  assert.equal(runInThisContext(bundle).status, 'editor-controls-ready');
  assert.equal(ui.body.children.length, 1);
  await ui.button('Export project').click();
  assert.match(ui.status(), /Unsupported editor build/);
  assert.doesNotMatch(ui.status(), /not defined/);
});
