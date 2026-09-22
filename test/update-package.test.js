import test from 'node:test';
import assert from 'node:assert/strict';
import { readUpdatePackage, downloadUpdate } from '../extension/update-package.js';
import { installedManifest, updateFixture } from '../fixtures/update.js';

test('a verified ZIP preserves every packaged byte including bundled scripts', async () => {
  const fixture = updateFixture();
  const result = await readUpdatePackage(fixture.bytes, fixture.release, installedManifest);
  assert.equal(result.manifest.version, fixture.manifest.version);
  for (const entry of fixture.entries) assert.deepEqual(result.files.get(entry.path), entry.data);
});

test('checksum and size failures reject the package before installation', async () => {
  const fixture = updateFixture();
  for (const release of [{ ...fixture.release, sha256: '0'.repeat(64) }, { ...fixture.release, sha256: null }, { ...fixture.release, zipSize: fixture.bytes.length + 1 }]) {
    await assert.rejects(readUpdatePackage(fixture.bytes, release, installedManifest), /checksum or size mismatch/);
  }
});

test('traversal, symlinks, duplicate paths and oversized entries are rejected', async () => {
  for (const entry of [
    { path: '../escape.js', data: new Uint8Array() }, { path: '/absolute.js', data: new Uint8Array() },
    { path: 'icons/../../escape.js', data: new Uint8Array() }, { path: 'evil.js', data: new Uint8Array(), mode: 0xa1ff0000 },
    { path: 'runtime.js', data: new Uint8Array() }, { path: 'large.js', data: new Uint8Array(), declaredSize: 3 * 1024 * 1024 }
  ]) {
    const fixture = updateFixture({ changeEntries: entries => [...entries, entry] });
    await assert.rejects(readUpdatePackage(fixture.bytes, fixture.release, installedManifest), /Unsupported or damaged/);
  }
});

test('identity, downgrades, missing entry points and permission changes require manual installation', async () => {
  for (const change of [{ name: 'Other extension' }, { version: installedManifest.version }, { permissions: [...installedManifest.permissions, 'debugger'] }, { minimum_chrome_version: '999' }]) {
    const fixture = updateFixture({ manifest: { ...installedManifest, version: '0.5.0', ...change } });
    await assert.rejects(readUpdatePackage(fixture.bytes, fixture.release, installedManifest));
  }
  const fixture = updateFixture({ changeEntries: entries => entries.filter(entry => entry.path !== 'panel.html') });
  await assert.rejects(readUpdatePackage(fixture.bytes, fixture.release, installedManifest), /Unsupported or damaged/);
});

test('release download omits credentials and bounds the streamed archive size', async () => {
  const fixture = updateFixture();
  const result = await downloadUpdate(fixture.release, { fetcher: async (url, options) => {
    assert.equal(url, fixture.release.zipUrl); assert.equal(options.credentials, 'omit');
    assert.equal(options.headers, undefined); assert.equal(options.signal.aborted, false);
    return new Response(fixture.bytes);
  } });
  assert.deepEqual(result, fixture.bytes);
  await assert.rejects(downloadUpdate(fixture.release, { fetcher: async () => new Response(new Uint8Array(fixture.bytes.length + 1)) }), /exceeded/);
  await assert.rejects(downloadUpdate(fixture.release, { fetcher: async () => new Response(fixture.bytes.slice(1)) }), /incomplete/);
  await assert.rejects(downloadUpdate({ ...fixture.release, zipUrl: 'https://example.com/update.zip' }), /Unsupported or damaged/);
});
