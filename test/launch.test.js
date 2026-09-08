import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createControlsLauncher } from '../extension/launch.js';
import { createPanelTargetHandler } from '../extension/panel-target.js';

const editor = { id: 42, url: 'https://effects.youtube.com/edit/destination' };
const base = 'chrome-extension://test-extension/panel.html';
function browser({ contexts = true } = {}) {
  let id = 100, busy = false, oldBusy = false;
  const windows = new Map(), calls = [];
  const api = {
    scripting: { executeScript: async input => { calls.push(['script', input]); return [{ result: { busy: oldBusy } }]; } },
    runtime: {
      getURL: () => base,
      ...(contexts ? { getContexts: async () => [...windows.values()].map(window => ({ windowId: window.id, tabId: window.tabs[0].id, documentUrl: window.tabs[0].url })) } : {}),
      sendMessage: async message => {
        calls.push(['message', message]);
        if (busy) return { status: 'busy' };
        const tab = [...windows.values()].flatMap(window => window.tabs).find(tab => tab.url === message.targetUrl);
        tab.url = base + '?tab=' + message.tabId + '&project=' + message.projectId;
        return { status: 'selected' };
      }
    },
    windows: {
      getAll: async () => [...windows.values()],
      get: async id => { if (!windows.has(id)) throw new Error('Closed'); return windows.get(id); },
      update: async (id, value) => { calls.push(['focus', id, value]); return api.windows.get(id); },
      create: async options => {
        calls.push(['create', options]);
        const window = { id: id++, tabs: [{ id: id++, url: options.url }] };
        windows.set(window.id, window);
        return window;
      }
    }
  };
  return { api, windows, calls, setBusy: value => { busy = value; }, setOldBusy: value => { oldBusy = value; } };
}

test('without a sidePanel API, concurrent toolbar clicks create exactly one archive window', async () => {
  const mock = browser();
  const launch = createControlsLauncher(mock.api);
  await Promise.all([launch(editor), launch(editor), launch(editor)]);
  assert.equal(mock.api.sidePanel, undefined);
  assert.equal(mock.windows.size, 1);
  assert.equal(mock.calls.filter(([name]) => name === 'create').length, 1);
  assert.equal(mock.calls.filter(([name]) => name === 'focus').length, 2);
  const options = mock.calls.find(([name]) => name === 'create')[1];
  assert.equal(options.url, base + '?tab=42&project=destination');
  assert.equal(options.type, 'popup');
  assert.equal(mock.calls.find(([name]) => name === 'script')[1].world, 'ISOLATED');
});

test('a fresh worker recovers its existing window, while a closed window can be reopened', async () => {
  const mock = browser();
  await createControlsLauncher(mock.api)(editor);
  const restarted = createControlsLauncher(mock.api);
  await restarted(editor);
  assert.equal(mock.windows.size, 1);
  assert.equal(mock.calls.filter(([name]) => name === 'create').length, 1);
  mock.windows.clear();
  await restarted(editor);
  assert.equal(mock.calls.filter(([name]) => name === 'create').length, 2);
});

test('reopening while the newly created window still has a blank document does not duplicate it', async () => {
  const mock = browser(), launch = createControlsLauncher(mock.api);
  await launch(editor);
  const tab = [...mock.windows.values()][0].tabs[0];
  tab.url = 'about:blank';
  await launch(editor);
  assert.equal(mock.calls.filter(([name]) => name === 'create').length, 1);
});

test('the compatibility window lookup leaves unrelated browser windows untouched', async () => {
  const mock = browser({ contexts: false });
  mock.windows.set(99, { id: 99, tabs: [{ id: 98, url: 'https://example.com/' }] });
  await createControlsLauncher(mock.api)(editor);
  await createControlsLauncher(mock.api)(editor);
  assert.equal(mock.windows.size, 2);
  assert.equal(mock.calls.filter(([name]) => name === 'create').length, 1);
  assert.equal(mock.calls.some(([name, id]) => name === 'focus' && id === 99), false);
});

test('switching projects reuses the window and refuses to interrupt a running operation', async () => {
  const mock = browser(), launch = createControlsLauncher(mock.api);
  await launch(editor);
  mock.setBusy(true);
  const other = { id: 43, url: 'https://effects.youtube.com/edit/another-project' };
  await assert.rejects(launch(other), /Finish or cancel/);
  assert.equal([...mock.windows.values()][0].tabs[0].url, base + '?tab=42&project=destination');
  mock.setBusy(false);
  await launch(other);
  assert.equal([...mock.windows.values()][0].tabs[0].url, base + '?tab=43&project=another-project');
  assert.equal(mock.windows.size, 1);
});

test('invalid tabs and busy legacy imports cannot open another controls window', async () => {
  const mock = browser(), launch = createControlsLauncher(mock.api);
  await assert.rejects(launch({ id: 42, url: 'https://example.com/' }), /Open an Effect Maker project/);
  assert.equal(mock.calls.length, 0);
  mock.setOldBusy(true);
  await assert.rejects(launch(editor), /older operation/);
  assert.equal(mock.windows.size, 0);
});

test('only an internal launcher can switch an idle panel to a valid project', () => {
  const selected = [], replies = [], ui = { host: { dataset: { busy: 'false' } } };
  const url = base + '?tab=42&project=destination';
  const handler = createPanelTargetHandler({ extensionId: 'test-extension', url, ui, select: value => selected.push(value) });
  const message = { type: 'ema:select-project', targetUrl: url, tabId: 43, projectId: 'another-project' };
  const sender = { id: 'test-extension' }, reply = value => replies.push(value);
  handler(message, { id: 'another-extension' }, reply);
  handler(message, { ...sender, tab: { id: 42 } }, reply);
  handler({ ...message, projectId: '../invalid' }, sender, reply);
  handler({ ...message, targetUrl: 'unrelated' }, sender, reply);
  assert.deepEqual(replies, []);
  ui.host.dataset.busy = 'true';
  handler(message, sender, reply);
  assert.deepEqual(replies, [{ status: 'busy' }]);
  assert.deepEqual(selected, []);
  ui.host.dataset.busy = 'false';
  handler(message, sender, reply);
  assert.deepEqual(selected, [{ tabId: 43, projectId: 'another-project' }]);
});

test('the toolbar handler has no popup or side-panel dependency and reports opening errors', async () => {
  const manifest = JSON.parse(await readFile(new URL('../extension/manifest.json', import.meta.url)));
  assert.equal(manifest.action.default_popup, undefined);
  assert.equal(manifest.side_panel, undefined);
  assert.equal(manifest.permissions.includes('sidePanel'), false);
  assert.equal(manifest.externally_connectable, undefined);
  assert.equal(manifest.web_accessible_resources, undefined);
  const mock = browser(), badges = [];
  let onClick;
  globalThis.chrome = { ...mock.api, action: { onClicked: { addListener: listener => { onClick = listener; } }, setBadgeText: async value => badges.push(value), setTitle: async () => {} } };
  await import('../extension/background.js');
  await onClick(editor);
  assert.equal(mock.windows.size, 1);
  await onClick({ id: 43, url: 'https://example.com/' });
  assert.deepEqual(badges.at(-1), { tabId: 43, text: '!' });
});
