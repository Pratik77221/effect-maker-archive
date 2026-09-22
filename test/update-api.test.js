import test from 'node:test';
import assert from 'node:assert/strict';
import { checkForUpdate, compareVersions, parseRelease, RELEASES_URL } from '../extension/update-api.js';

const release = (version = '0.4.10') => ({ tag_name: 'v' + version, draft: false, prerelease: false,
  html_url: RELEASES_URL + '/tag/v' + version,
  assets: [{ name: 'effect-maker-archive-v' + version + '.zip', state: 'uploaded', size: 80000,
    browser_download_url: RELEASES_URL + '/download/v' + version + '/effect-maker-archive-v' + version + '.zip',
    digest: 'sha256:' + 'a'.repeat(64) }] });

test('release versions compare numerically and do not offer downgrades', () => {
  assert.equal(compareVersions('0.4.10', '0.4.9'), 1);
  assert.equal(compareVersions('1.2', '1.2.0.0'), 0);
  assert.equal(parseRelease(release(), '0.4.9').available, true);
  assert.equal(parseRelease(release(), '0.4.10').available, false);
  assert.equal(parseRelease(release(), '0.5.0').available, false);
  for (const value of ['1.2-beta', '', '1.2.3.4.5', '65536.0', '1.02.0']) assert.throws(() => compareVersions(value, '1'), /Invalid/);
});

test('only the named repository stable release and exact extension asset are accepted', () => {
  const valid = release();
  for (const changed of [
    { ...valid, draft: true }, { ...valid, prerelease: true }, { ...valid, tag_name: 'main' },
    { ...valid, html_url: 'https://example.com' }, { ...valid, assets: [] },
    { ...valid, assets: [valid.assets[0], valid.assets[0]] },
    { ...valid, assets: [{ ...valid.assets[0], browser_download_url: 'https://example.com/update.zip' }] },
    { ...valid, assets: [{ ...valid.assets[0], state: 'new' }] },
    { ...valid, assets: [{ ...valid.assets[0], size: 21 * 1024 * 1024 }] }
  ]) assert.throws(() => parseRelease(changed, '0.4.4'));
  assert.equal(parseRelease(valid, '0.4.4').sha256, 'a'.repeat(64));
});

test('update checks use public metadata without credentials or backup tokens', async () => {
  const controller = new AbortController();
  const result = await checkForUpdate('0.4.4', { signal: controller.signal, fetcher: async (url, options) => {
    assert.equal(url, 'https://api.github.com/repos/Pratik77221/effect-maker-archive/releases/latest');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.cache, 'no-store');
    assert.equal(options.signal.aborted, false);
    return Response.json(release());
  } });
  assert.equal(result.available, true);
  assert.equal(result.version, '0.4.10');
});

test('rate limits, missing releases and malformed metadata give recoverable errors', async () => {
  for (const [status, message] of [[403, /limited/], [429, /limited/], [404, /No published/], [500, /Could not check/]]) {
    await assert.rejects(checkForUpdate('0.4.4', { fetcher: async () => new Response('', { status }) }), message);
  }
  await assert.rejects(checkForUpdate('0.4.4', { fetcher: async () => new Response('not json') }), /invalid release information/);
  await assert.rejects(checkForUpdate('0.4.4', { fetcher: async () => new Response('x'.repeat(1024 * 1024 + 1)) }), /too large/);
});

test('cancelling an update check aborts its fetch', async () => {
  const controller = new AbortController();
  const check = checkForUpdate('0.4.4', { signal: controller.signal, fetcher: (url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  }) });
  controller.abort(new Error('Cancelled test update'));
  await assert.rejects(check, /Cancelled test update/);
});
