import test from 'node:test';
import assert from 'node:assert/strict';
import { panelDOM } from '../fixtures/panel-dom.js';
import { renderEditorPanel } from '../extension/editor-panel.js';
import { mountGitHubPanel } from '../extension/github-panel.js';
import { GITHUB_CLIENT_ID } from '../extension/github-auth.js';

const profile = { id: 1, login: 'test-creator' };
const code = { userCode: 'TEST-1234', verificationUrl: 'https://github.com/login/device' };
async function setup({ permission = true, initialSession = null, windowFails = false, copyFails = false, canPush = true } = {}) {
  const dom = panelDOM(), calls = [], approval = Promise.withResolvers(), codeReady = Promise.withResolvers();
  let session = initialSession;
  const invoke = async () => { throw new Error('This login must not touch an Effect Maker project.'); };
  const ui = renderEditorPanel(invoke, { github: true, sidePanel: true });
  const data = { 'ema.github.selection': { repository: 'test/backups' } };
  const storage = { local: { get: async key => ({ [key]: data[key] }), set: async value => Object.assign(data, value) } };
  const client = {
    repositories: async () => { calls.push('repositories'); return [{ full_name: 'test/backups', private: true }]; },
    repository: async () => ({ private: true, default_branch: 'main', permissions: { push: canPush } }),
    branches: async () => [{ name: 'main' }], backups: async () => [], history: async () => []
  };
  const component = mountGitHubPanel(ui, {
    invoke, projectId: 'destination', storage,
    requestAccess: method => { calls.push(['permission', method]); return Promise.resolve(permission); },
    copyText: async text => { calls.push(['copy', text]); if (copyFails) throw new Error('Clipboard unavailable'); },
    openAuthPage: async url => { calls.push(['open', url]); if (windowFails) throw new Error('Window failed'); },
    clientFactory: () => client,
    authStore: { get: async () => session, save: async (token, value) => { calls.push('save'); return session = { token, profile: value }; }, disconnect: async () => { session = null; } },
    deviceLogin: async options => {
      assert.equal(options.clientId, GITHUB_CLIENT_ID);
      calls.push('device'); options.onCode(code); codeReady.resolve();
      await approval.promise;
      return { token: 'test-token-only', profile };
    }
  });
  await component.ready;
  return { dom, ui, calls, approval, codeReady, get session() { return session; } };
}

test('browser login needs no token or app setup and stores an approved account before loading repositories', async () => {
  const mock = await setup();
  assert.equal(mock.dom.all().some(node => node.type === 'password' || node.name === 'client-id'), false);
  const connecting = mock.dom.button('Sign in with GitHub').click();
  await mock.codeReady.promise;
  assert.equal(mock.dom.button('Sign in with GitHub').disabled, true);
  await mock.dom.button('Copy code & open GitHub').click();
  assert.deepEqual(mock.calls.slice(0, 4), [['permission', 'device'], 'device', ['copy', 'TEST-1234'], ['open', 'https://github.com/login/device']]);
  mock.approval.resolve(); await connecting;
  assert.equal(mock.session.profile.login, profile.login);
  assert.ok(mock.calls.indexOf('save') < mock.calls.indexOf('repositories'));
  assert.match(mock.dom.status(), /Connected as test-creator/);
  assert.equal(mock.dom.all().find(node => node.tag === 'code').textContent, '');
});

test('denied GitHub host access never starts sign-in or stores a credential', async () => {
  const mock = await setup({ permission: false });
  await mock.dom.button('Sign in with GitHub').click();
  assert.equal(mock.calls.includes('device'), false);
  assert.equal(mock.calls.includes('save'), false);
  assert.match(mock.dom.status(), /Allow GitHub access/);
});

test('cancelled login ignores a late approval and clears the displayed code', async () => {
  const mock = await setup();
  const connecting = mock.dom.button('Sign in with GitHub').click();
  await mock.codeReady.promise;
  await mock.dom.button('Cancel').click(); await connecting;
  mock.approval.resolve();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(mock.session, null);
  assert.equal(mock.calls.includes('save'), false);
  assert.match(mock.dom.status(), /cancelled/);
  assert.equal(mock.dom.all().find(node => node.tag === 'code').textContent, '');
});

test('failed clipboard or window APIs keep the approval flow recoverable', async () => {
  const mock = await setup({ copyFails: true, windowFails: true });
  const connecting = mock.dom.button('Sign in with GitHub').click();
  await mock.codeReady.promise;
  await mock.dom.button('Copy code & open GitHub').click();
  assert.equal(mock.dom.button('Copy code & open GitHub').disabled, false);
  assert.equal(mock.dom.all().some(node => /window could not open/.test(node.textContent)), true);
  assert.equal(mock.calls.some(item => Array.isArray(item) && item[0] === 'open'), true);
  await mock.dom.button('Cancel').click(); await connecting;
  mock.approval.resolve();
});

test('an existing token session can reconnect using browser login without token entry', async () => {
  const mock = await setup({ initialSession: { token: 'old-test-token', profile } });
  const connecting = mock.dom.button('Sign in again with GitHub').click();
  await mock.codeReady.promise;
  mock.approval.resolve(); await connecting;
  assert.equal(mock.session.token, 'test-token-only');
});

test('a repository without push permission keeps the push button disabled', async () => {
  const mock = await setup({ canPush: false });
  const connecting = mock.dom.button('Sign in with GitHub').click();
  await mock.codeReady.promise;
  mock.approval.resolve(); await connecting;
  assert.equal(mock.dom.button('Push backup').disabled, true);
  assert.equal(mock.dom.all().some(node => /repository you can write to/.test(node.textContent)), true);
});
