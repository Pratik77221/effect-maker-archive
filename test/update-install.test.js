import test from 'node:test';
import assert from 'node:assert/strict';
import { installUpdateFiles, validateUpdateFolder } from '../extension/update-install.js';
import { readUpdatePackage } from '../extension/update-package.js';
import { installedManifest, updateFixture, fakeFolder, textBytes } from '../fixtures/update.js';

const original = { 'manifest.json': JSON.stringify(installedManifest), 'runtime.js': 'old runtime', 'project.json': 'private effect backup' };
const installedFile = async () => textBytes('old runtime');
async function update() { const fixture = updateFixture(); return readUpdatePackage(fixture.bytes, fixture.release, installedManifest); }

test('installation backs up before writing, writes the manifest last and leaves other files alone', async () => {
  const mock = fakeFolder(original), incoming = await update();
  const result = await installUpdateFiles(mock.folder, incoming, installedManifest, { installedFile });
  assert.equal(result.version, incoming.manifest.version);
  assert.equal(mock.writes[0], '.effect-maker-archive-update-backup.json');
  assert.equal(mock.writes.at(-1), 'manifest.json');
  for (const [path, bytes] of incoming.files) assert.deepEqual(mock.files.get(path), bytes);
  assert.equal(new TextDecoder().decode(mock.files.get('project.json')), original['project.json']);
  const backup = JSON.parse(new TextDecoder().decode(mock.files.get(result.backupName)));
  assert.equal(backup.fromVersion, installedManifest.version);
  assert.equal(backup.files.some(file => file.path === 'project.json'), false);
  assert.equal(atob(backup.files.find(file => file.path === 'runtime.js').base64), 'old runtime');
});

test('write failure restores old files, removes newly created files and never reports installation', async () => {
  const mock = fakeFolder(original, { failOnce: 'panel-page.js' });
  await assert.rejects(installUpdateFiles(mock.folder, await update(), installedManifest, { installedFile }), /previous files were restored/);
  for (const [path, content] of Object.entries(original)) assert.equal(new TextDecoder().decode(mock.files.get(path)), content);
  assert.deepEqual([...mock.files.keys()].sort(), [...Object.keys(original), '.effect-maker-archive-update-backup.json'].sort());
});

test('wrong folder, modified runtime and denied permissions fail before any writes', async () => {
  const incoming = await update();
  for (const mock of [fakeFolder({ 'manifest.json': '{}' }), fakeFolder({ ...original, 'runtime.js': 'edited runtime' }), fakeFolder(original, { permission: 'denied' })]) {
    await assert.rejects(installUpdateFiles(mock.folder, incoming, installedManifest, { installedFile }));
    assert.deepEqual(mock.writes, []);
  }
  await assert.rejects(validateUpdateFolder({ kind: 'file' }, installedManifest), /Choose the folder/);
});

test('an unrelated file at the backup path is never overwritten', async () => {
  const mock = fakeFolder({ ...original, '.effect-maker-archive-update-backup.json': '{"personal":true}' });
  await assert.rejects(installUpdateFiles(mock.folder, await update(), installedManifest, { installedFile }), /Unrecognized/);
  assert.deepEqual(mock.writes, []);
});
