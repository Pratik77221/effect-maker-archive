import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { crc32, deflateRawSync } from 'node:zlib';
export const installedManifest = JSON.parse(readFileSync(new URL('../extension/manifest.json', import.meta.url), 'utf8'));
export const nextVersion = '0.5.0';
export const textBytes = value => new TextEncoder().encode(value);
export const sameBytes = value => new Uint8Array(value);
export function zipFixture(entries) {
  const local = [], central = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.path), data = Buffer.from(entry.data), compressed = deflateRawSync(data), crc = crc32(data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt16LE(8, 8);
    header.writeUInt32LE(crc, 14); header.writeUInt32LE(compressed.length, 18); header.writeUInt32LE(data.length, 22); header.writeUInt16LE(name.length, 26);
    local.push(header, name, compressed);
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50); record.writeUInt16LE(0x314, 4); record.writeUInt16LE(20, 6); record.writeUInt16LE(8, 10);
    record.writeUInt32LE(crc, 16); record.writeUInt32LE(compressed.length, 20); record.writeUInt32LE(entry.declaredSize ?? data.length, 24);
    record.writeUInt16LE(name.length, 28); record.writeUInt32LE(entry.mode ?? 0x81a40000, 38); record.writeUInt32LE(offset, 42);
    central.push(record, name); offset += header.length + name.length + compressed.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...local, directory, end]));
}
export function updateFixture({ manifest = { ...installedManifest, version: nextVersion }, changeEntries = entries => entries } = {}) {
  const paths = new Set(['manifest.json', 'runtime.js', 'panel.html', 'panel-page.js', 'editor-job.bundle.js', 'editor-panel.bundle.js', manifest.background.service_worker, ...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon), 'INSTALL.md', 'PRIVACY.md']);
  const entries = changeEntries([...paths].map(path => ({ path, data: textBytes(path === 'manifest.json' ? JSON.stringify(manifest) : 'new contents of ' + path) })));
  const bytes = zipFixture(entries);
  const tag = 'v' + manifest.version, zipName = 'effect-maker-archive-' + tag + '.zip';
  return { bytes, entries, manifest, release: { available: true, version: manifest.version, tag, zipName, zipSize: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'), zipUrl: 'https://github.com/Pratik77221/effect-maker-archive/releases/download/' + tag + '/' + zipName,
    releaseUrl: 'https://github.com/Pratik77221/effect-maker-archive/releases/tag/' + tag } };
}
export function fakeFolder(initial = {}, { failOnce, permission = 'granted' } = {}) {
  const files = new Map(Object.entries(initial).map(([name, value]) => [name, typeof value === 'string' ? textBytes(value) : sameBytes(value)]));
  const writes = [], directories = new Set();
  let failed = false;
  const missing = () => { throw new DOMException('Missing test file', 'NotFoundError'); };
  const directory = (prefix = '') => ({ kind: 'directory', name: prefix || 'installed-extension',
    queryPermission: async () => permission,
    getDirectoryHandle: async (name, { create = false } = {}) => {
      const path = prefix + name + '/';
      if (!create && !directories.has(path) && ![...files.keys()].some(key => key.startsWith(path))) missing();
      directories.add(path); return directory(path);
    },
    removeEntry: async name => { files.delete(prefix + name); },
    getFileHandle: async (name, { create = false } = {}) => {
      const path = prefix + name;
      if (!files.has(path)) { if (!create) missing(); files.set(path, new Uint8Array()); }
      return { getFile: async () => new File([files.get(path)], name), createWritable: async () => {
        let next;
        return { write: async data => { next = typeof data === 'string' ? textBytes(data) : sameBytes(data); }, abort: async () => {},
          close: async () => { files.set(path, next); writes.push(path); if (!failed && path === failOnce) { failed = true; throw new Error('Simulated disk failure'); } } };
      } };
    }
  });
  return { folder: directory(), files, writes };
}
