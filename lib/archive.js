import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, lstat } from 'node:fs/promises';
import path from 'node:path';

export const FORMAT = 'effect-maker-source-archive';
export const MAX_BYTES = 40 * 1024 * 1024;
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export const sourceDigest = source => digest(JSON.stringify(source));
const fail = message => { throw new Error(message); };
const extensions = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'model/gltf-binary': 'glb' };

export function validateArchive(archive) {
  if (!archive || archive.format !== FORMAT || archive.version !== 1) fail('Unsupported archive format/version.');
  if (!archive.project || typeof archive.project.id !== 'string' || typeof archive.project.title !== 'string' || typeof archive.project.build !== 'string') fail('Invalid project metadata.');
  if (!Array.isArray(archive.source) || sourceDigest(archive.source) !== archive.sourceSha256) fail('Source checksum mismatch.');
  if (!Array.isArray(archive.assets)) fail('Invalid asset list.');
  const ids = new Set();
  let size = 0;
  const assets = archive.assets.map(asset => {
    if (typeof asset.id !== 'string' || !asset.id || ids.has(asset.id)) fail('Invalid/duplicate asset ID.');
    ids.add(asset.id);
    if (!/^[a-f0-9]{64}$/.test(asset.sha256) || typeof asset.base64 !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(asset.base64)) fail('Invalid asset encoding.');
    if (asset.base64.length > MAX_BYTES * 1.34 + 8) fail('Asset too large.');
    const bytes = Buffer.from(asset.base64, 'base64');
    size += bytes.length;
    if (bytes.length !== asset.size || digest(bytes) !== asset.sha256) fail('Asset checksum/size mismatch.');
    if (size > MAX_BYTES) fail('Archive exceeds 40 MB.');
    return { ...asset, bytes, filename: asset.sha256 + '.' + (extensions[asset.mime] || 'bin') };
  });
  return { archive, assets, bytes: size, contentHash: digest(JSON.stringify({ title: archive.project.title, build: archive.project.build, source: archive.source, assets: assets.map(a => [a.id, a.sha256, a.mime, a.record]).sort((a, b) => a[0].localeCompare(b[0])) })) };
}

export async function readArchive(filename) {
  const stat = await lstat(filename);
  if (!stat.isFile() || stat.size > 60 * 1024 * 1024) fail('Archive must be a regular file under 60 MB.');
  const archive = JSON.parse(await readFile(filename, 'utf8'));
  validateArchive(archive);
  return archive;
}

export async function unpack(archive, destination) {
  const checked = validateArchive(archive);
  // Never overlay an existing directory or follow an existing final-path symlink.
  await mkdir(destination);
  await mkdir(path.join(destination, 'assets'));
  const manifest = { ...archive, assets: checked.assets.map(({ base64, bytes, filename, ...asset }) => ({ ...asset, file: 'assets/' + filename })), contentHash: checked.contentHash };
  delete manifest.source;
  await writeFile(path.join(destination, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  await writeFile(path.join(destination, 'source.jspb.json'), JSON.stringify(archive.source, null, 2) + '\n', { flag: 'wx' });
  const written = new Set();
  for (const asset of checked.assets) if (!written.has(asset.filename)) {
    written.add(asset.filename);
    await writeFile(path.join(destination, 'assets', asset.filename), asset.bytes, { flag: 'wx' });
  }
  return { destination, contentHash: checked.contentHash, assets: checked.assets.length, bytes: checked.bytes };
}

export async function pack(directory) {
  for (const item of ['', 'assets', 'manifest.json', 'source.jspb.json']) {
    const stat = await lstat(path.join(directory, item));
    if (stat.isSymbolicLink()) fail('Archive paths must not be symbolic links.');
  }
  const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'));
  const source = JSON.parse(await readFile(path.join(directory, 'source.jspb.json'), 'utf8'));
  const assets = [];
  let total = 0;
  for (const asset of manifest.assets) {
    if (!/^assets\/[a-f0-9]{64}\.(png|jpg|webp|glb|bin)$/.test(asset.file) || !asset.file.startsWith('assets/' + asset.sha256 + '.')) fail('Invalid asset path.');
    const filename = path.join(directory, asset.file);
    const stat = await lstat(filename);
    total += stat.size;
    if (!stat.isFile() || stat.isSymbolicLink() || total > MAX_BYTES) fail('Invalid asset file/size.');
    const bytes = await readFile(filename);
    const { file, ...rest } = asset;
    assets.push({ ...rest, base64: bytes.toString('base64') });
  }
  const { contentHash, ...rest } = manifest;
  const archive = { ...rest, source, assets };
  const checked = validateArchive(archive);
  if (contentHash !== checked.contentHash) fail('Archive manifest content hash mismatch.');
  return archive;
}

export function diffArchives(before, after) {
  validateArchive(before); validateArchive(after);
  const changes = [];
  function walk(a, b, pointer) {
    if (JSON.stringify(a) === JSON.stringify(b)) return;
    if (Array.isArray(a) && Array.isArray(b)) {
      for (let i = 0; i < Math.max(a.length, b.length); i++) walk(a[i], b[i], pointer + '/' + i);
    } else changes.push({ path: pointer || '/', before: a, after: b });
  }
  walk(before.source, after.source, '/source');
  const a = new Map(before.assets.map(x => [x.id, x.sha256]));
  const b = new Map(after.assets.map(x => [x.id, x.sha256]));
  const assets = [...new Set([...a.keys(), ...b.keys()])].filter(id => a.get(id) !== b.get(id)).map(id => ({ id, before: a.get(id), after: b.get(id) }));
  return { sourceChanges: changes, assetChanges: assets };
}
