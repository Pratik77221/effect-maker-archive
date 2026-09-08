#!/usr/bin/env node
import { writeFile, mkdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { readArchive, unpack, pack, validateArchive, diffArchives } from './lib/archive.js';

const [command, ...args] = process.argv.slice(2);
const git = (cwd, ...params) => execFileSync('git', params, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

async function checkpoint(file, repository) {
  const archive = await readArchive(file);
  const checked = validateArchive(archive);
  await mkdir(repository, { recursive: true });
  if ((await lstat(repository)).isSymbolicLink()) throw new Error('Repository path must not be a symlink.');
  try { git(repository, 'rev-parse', '--is-inside-work-tree'); }
  catch { git(repository, 'init', '--initial-branch=main'); }
  const root = git(repository, 'rev-parse', '--show-toplevel');
  if (path.resolve(root) !== path.resolve(repository)) throw new Error('Choose a repository root, not a subdirectory.');
  if (git(repository, 'status', '--porcelain')) throw new Error('Repository has uncommitted changes. Commit or move them first.');
  const name = 'snapshot-' + checked.contentHash;
  const destination = path.join(repository, name);
  try {
    await lstat(destination);
    const prior = await pack(destination);
    if (validateArchive(prior).contentHash !== checked.contentHash) throw new Error('Existing snapshot differs.');
    return { status: 'unchanged', contentHash: checked.contentHash };
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await unpack(archive, destination);
  git(repository, 'add', '--', name);
  git(repository, '-c', 'user.name=Effect Maker Archive', '-c', 'user.email=effect-maker-archive@localhost', 'commit', '-m', 'Archive ' + archive.project.title);
  return { status: 'committed', commit: git(repository, 'rev-parse', 'HEAD'), snapshot: name, contentHash: checked.contentHash };
}

try {
  let result;
  if (command === 'inspect' && args.length === 1) {
    const archive = await readArchive(args[0]); const check = validateArchive(archive);
    result = { project: archive.project, summary: archive.summary, assets: check.assets.length, bytes: check.bytes, contentHash: check.contentHash, coverage: archive.coverage };
  } else if (command === 'unpack' && args.length === 2) result = await unpack(await readArchive(args[0]), args[1]);
  else if (command === 'pack' && args.length === 2) {
    const archive = await pack(args[0]); await writeFile(args[1], JSON.stringify(archive, null, 2) + '\n', { flag: 'wx' }); result = { output: args[1] };
  } else if (command === 'diff' && args.length === 2) result = diffArchives(await readArchive(args[0]), await readArchive(args[1]));
  else if (command === 'checkpoint' && args.length === 2) result = await checkpoint(args[0], path.resolve(args[1]));
  else throw new Error('Usage: node cli.js inspect <archive> | unpack <archive> <new-dir> | pack <dir> <new-archive> | diff <before> <after> | checkpoint <archive> <git-repository>');
  console.log(JSON.stringify(result, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
