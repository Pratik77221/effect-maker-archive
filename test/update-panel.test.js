import test from 'node:test';
import assert from 'node:assert/strict';
import { panelDOM } from '../fixtures/panel-dom.js';
import { installedManifest, updateFixture } from '../fixtures/update.js';
import { renderEditorPanel } from '../extension/editor-panel.js';
import { mountUpdatePanel } from '../extension/update-panel.js';

async function setup({ allowed = true, folder = null, failInstall = false, reloadFails = false } = {}) {
  const dom = panelDOM(), calls = [], settings = {}, fixture = updateFixture();
  const selected = { kind: 'directory', name: 'extension', queryPermission: async () => 'granted' };
  const ui = renderEditorPanel(() => { throw new Error('Updater must not access the editor.'); }, { updates: true });
  const component = mountUpdatePanel(ui, { manifest: installedManifest, requestAccess: action => { calls.push(['access', action]); return allowed; },
    pickFolder: async () => selected,
    folderStore: { get: async () => folder, set: async value => { calls.push('remember folder'); folder = value; }, clear: async () => { folder = null; } },
    settings: { get: async key => ({ [key]: settings[key] }), set: async values => Object.assign(settings, values), remove: async key => { delete settings[key]; } },
    checker: async () => { calls.push('check'); return fixture.release; },
    validateFolder: async value => { assert.equal(value, selected); calls.push('validate folder'); },
    downloader: async () => { calls.push('download'); return fixture.bytes; },
    unpacker: async () => { calls.push('verify'); return { manifest: fixture.manifest }; },
    installer: async () => {
      calls.push('install'); assert.equal(dom.button('Cancel').disabled, true);
      if (failInstall) throw new Error('Disk error; previous files restored.');
      return { version: fixture.manifest.version };
    },
    reloadExtension: async () => { calls.push('reload'); if (reloadFails) throw new Error('Reload unavailable'); }
  });
  await component.ready;
  return { dom, ui, calls, settings, fixture, selected };
}

test('updates are checked only on click without GitHub sign-in or editor access', async () => {
  const mock = await setup();
  assert.deepEqual(mock.calls, []);
  await mock.dom.button('Update from GitHub').click();
  assert.deepEqual(mock.calls, [['access', 'check'], 'check']);
  assert.match(mock.dom.status(), /is available/);
  assert.equal(mock.dom.button('Install update').disabled, true);
  assert.equal(mock.dom.all().find(node => node.textContent === 'Download ZIP').href, mock.fixture.release.zipUrl);
});

test('folder setup then installation verifies before writes and reloads only after success', async () => {
  const mock = await setup();
  await mock.dom.button('Update from GitHub').click();
  await mock.dom.button('Choose extension folder').click();
  assert.equal(mock.dom.button('Install update').disabled, false);
  await mock.dom.button('Install update').click();
  assert.deepEqual(mock.calls.slice(-5), [['access', 'install'], 'download', 'verify', 'install', 'reload']);
  assert.equal(mock.settings['ema.update.expectedVersion'], mock.fixture.manifest.version);
  assert.equal(mock.dom.button('Install update').disabled, true);
});

test('permission denial and active project operations prevent update activity', async () => {
  const denied = await setup({ allowed: false });
  await denied.dom.button('Update from GitHub').click();
  assert.deepEqual(denied.calls, [['access', 'check']]);
  assert.match(denied.dom.status(), /Allow access/);
  const mock = await setup(), pending = Promise.withResolvers();
  const running = mock.ui.run('import', 'Importing…', () => pending.promise);
  assert.equal(mock.dom.button('Update from GitHub').disabled, true);
  await mock.dom.button('Update from GitHub').click();
  assert.deepEqual(mock.calls, []);
  pending.resolve('Done'); await running;
});

test('failed installation does not reload and a failed reload offers manual recovery', async () => {
  for (const options of [{ failInstall: true }, { reloadFails: true }]) {
    const mock = await setup(options);
    await mock.dom.button('Update from GitHub').click();
    await mock.dom.button('Choose extension folder').click();
    await mock.dom.button('Install update').click();
    if (options.failInstall) { assert.equal(mock.calls.includes('reload'), false); assert.match(mock.dom.status(), /Disk error/); }
    else assert.equal(mock.dom.all().some(node => /Files installed.*chrome:\/\/extensions/.test(node.textContent)), true);
  }
});
