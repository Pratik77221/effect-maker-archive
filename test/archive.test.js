import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { digest, sourceDigest, validateArchive, unpack, pack, diffArchives } from '../lib/archive.js';

function fixture() {
  const bytes = Buffer.from('fixture asset bytes');
  const source = [null, ['scene-root', [['text-1', ['Text', 'héllo 🌍', 37]]]], [], [null, [['start', [1]], ['set', [2]]], [['start', 'set']]]];
  return { format: 'effect-maker-source-archive', version: 1, createdAt: '2026-09-07T00:00:00.000Z', project: { id: 'fixture', title: 'Fixture', build: 'fixture-build' }, source, sourceSha256: sourceDigest(source), assets: [{ id: 'asset-1', mime: 'image/png', size: bytes.length, sha256: digest(bytes), base64: bytes.toString('base64'), record: ['asset-1'] }] };
}

test('archive unpack/pack preserves source, Unicode, ordering and binary bytes', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'em-archive-'));
  try {
    const archive = fixture();
    await unpack(archive, path.join(dir, 'snapshot'));
    const rebuilt = await pack(path.join(dir, 'snapshot'));
    assert.deepEqual(rebuilt, archive);
    assert.equal(validateArchive(rebuilt).contentHash, validateArchive(archive).contentHash);
    await assert.rejects(unpack(archive, path.join(dir, 'snapshot')), { code: 'EEXIST' });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('modified source or asset bytes are rejected', () => {
  const a = fixture(); a.source[0] = 'corrupt';
  assert.throws(() => validateArchive(a), /Source checksum/);
  const b = fixture(); b.assets[0].base64 = Buffer.from('different').toString('base64');
  assert.throws(() => validateArchive(b), /checksum/);
  const c = fixture(); c.assets.push(c.assets[0]);
  assert.throws(() => validateArchive(c), /duplicate/);
});

test('tampered manifest paths and symlink assets are rejected', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'em-path-'));
  try {
    const snapshot = path.join(dir, 'snapshot'); await unpack(fixture(), snapshot);
    const filename = path.join(snapshot, 'manifest.json');
    const manifest = JSON.parse(await readFile(filename));
    const validPath = manifest.assets[0].file;
    manifest.assets[0].file = '../../outside'; await writeFile(filename, JSON.stringify(manifest));
    await assert.rejects(pack(snapshot), /Invalid asset path/);
    manifest.assets[0].file = validPath; await writeFile(filename, JSON.stringify(manifest));
    const assetPath = path.join(snapshot, validPath);
    await rm(assetPath); await symlink(filename, assetPath);
    await assert.rejects(pack(snapshot), /Invalid asset file/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('diff retains meaningful array order and skips capture timestamps', () => {
  const a = fixture(); const b = fixture(); b.createdAt = 'later';
  assert.deepEqual(diffArchives(a, b), { sourceChanges: [], assetChanges: [] });
  b.source[1][1][0][1][2] = 99; b.sourceSha256 = sourceDigest(b.source);
  assert.deepEqual(diffArchives(a, b).sourceChanges, [{ path: '/source/1/1/0/1/2', before: 37, after: 99 }]);
});

test('Git checkpoint is recoverable, deduplicated, and refuses a dirty repository', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'em-git-'));
  try {
    const file = path.join(dir, 'input.json'); const repo = path.join(dir, 'repo');
    await writeFile(file, JSON.stringify(fixture()));
    const cli = path.resolve('cli.js');
    const run = () => JSON.parse(execFileSync(process.execPath, [cli, 'checkpoint', file, repo], { encoding: 'utf8' }));
    const first = run(); assert.equal(first.status, 'committed');
    assert.deepEqual(await pack(path.join(repo, first.snapshot)), fixture());
    assert.equal(run().status, 'unchanged');
    await writeFile(path.join(repo, 'user-work.txt'), 'keep this');
    assert.throws(run, /uncommitted changes/);
    assert.equal(await readFile(path.join(repo, 'user-work.txt'), 'utf8'), 'keep this');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
