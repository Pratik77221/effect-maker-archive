// Read only our bounded release ZIP format, using the browser's native inflater.
// All bytes and paths are checked before the installer receives any files.
import { compareVersions } from './update-api.js';

export const validUpdatePath = path => typeof path === 'string' && (
  /^(?:[a-z][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:js|json|html|css)|INSTALL\.md|PRIVACY\.md)$/.test(path) ||
  /^icons\/[a-z][a-z0-9-]*\.(?:png|svg)$/.test(path)
);
const fail = () => { throw new Error('Unsupported or damaged update ZIP. Download the release and install it manually.'); };
const hash = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2, '0')).join('');
const crc32 = bytes => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
};

export async function readUpdatePackage(bytes, release, installedManifest) {
  if (!(bytes instanceof Uint8Array) || bytes.length !== release.zipSize || bytes.length < 22 || bytes.length > 20 * 1024 * 1024 ||
      !/^[a-f0-9]{64}$/.test(release.sha256 || '') || await hash(bytes) !== release.sha256) {
    throw new Error('Update checksum or size mismatch. No files were changed.');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = at => view.getUint16(at, true), u32 = at => view.getUint32(at, true);
  const end = bytes.length - 22;
  if (u32(end) !== 0x06054b50 || u16(end + 4) || u16(end + 6) || u16(end + 20)) fail();
  const count = u16(end + 10), central = u32(end + 16);
  if (!count || count > 64 || u16(end + 8) !== count || central + u32(end + 12) !== end) fail();
  let cursor = central, total = 0;
  const files = new Map(), names = new Set(), regions = [];
  const decoder = new TextDecoder('utf-8', { fatal: true });
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > end || u32(cursor) !== 0x02014b50) fail();
    const flags = u16(cursor + 8), method = u16(cursor + 10), crc = u32(cursor + 16);
    const compressed = u32(cursor + 20), size = u32(cursor + 24), nameLength = u16(cursor + 28);
    const extraLength = u16(cursor + 30), commentLength = u16(cursor + 32), offset = u32(cursor + 42);
    const mode = (u32(cursor + 38) >>> 16) & 0xf000;
    if ((flags & ~0x800) || ![0, 8].includes(method) || u16(cursor + 34) || (mode && mode !== 0x8000) ||
        size > 2 * 1024 * 1024 || (total += size) > 12 * 1024 * 1024 || cursor + 46 + nameLength + extraLength + commentLength > end) fail();
    const path = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    if (!validUpdatePath(path) || names.has(path.toLowerCase())) fail();
    names.add(path.toLowerCase());
    if (offset + 30 > central || u32(offset) !== 0x04034b50 || u16(offset + 6) !== flags || u16(offset + 8) !== method ||
        u32(offset + 14) !== crc || u32(offset + 18) !== compressed || u32(offset + 22) !== size || u16(offset + 26) !== nameLength) fail();
    const start = offset + 30 + nameLength + u16(offset + 28), finish = start + compressed;
    if (start > central || finish > central || decoder.decode(bytes.subarray(offset + 30, offset + 30 + nameLength)) !== path ||
        regions.some(([from, to]) => offset < to && finish > from)) fail();
    regions.push([offset, finish]);
    let data = bytes.slice(start, finish);
    if (method === 8) {
      let inflater;
      try { inflater = new DecompressionStream('deflate-raw'); }
      catch { throw new Error('This browser cannot unpack updates. Download the ZIP and install it manually.'); }
      const reader = new Blob([data]).stream().pipeThrough(inflater).getReader();
      const output = new Uint8Array(size);
      let written = 0;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (written + value.length > size) { await reader.cancel(); fail(); }
          output.set(value, written); written += value.length;
        }
      } finally { reader.releaseLock(); }
      if (written !== size) fail();
      data = output;
    }
    if (data.length !== size || crc32(data) !== crc) fail();
    files.set(path, data);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  if (cursor !== end) fail();
  let manifest;
  try { manifest = JSON.parse(decoder.decode(files.get('manifest.json'))); }
  catch { fail(); }
  if (manifest.manifest_version !== 3 || manifest.name !== 'Effect Maker Archive' || manifest.name !== installedManifest.name ||
      manifest.homepage_url !== 'https://github.com/Pratik77221/effect-maker-archive' || manifest.version !== release.version ||
      compareVersions(manifest.version, installedManifest.version) <= 0) fail();
  // A changed permission/security contract needs Chrome's normal manual install review.
  for (const key of ['permissions', 'host_permissions', 'optional_permissions', 'optional_host_permissions', 'content_security_policy', 'key', 'update_url', 'externally_connectable', 'content_scripts', 'web_accessible_resources', 'minimum_chrome_version']) {
    if (JSON.stringify(manifest[key] ?? null) !== JSON.stringify(installedManifest[key] ?? null)) {
      throw new Error('This release changes browser requirements or permissions. Download its ZIP and install it manually.');
    }
  }
  for (const path of [manifest.background?.service_worker, ...Object.values(manifest.icons || {}), ...Object.values(manifest.action?.default_icon || {}), 'panel.html', 'panel-page.js', 'editor-job.bundle.js']) {
    if (!validUpdatePath(path) || !files.has(path)) fail();
  }
  return { manifest, files };
}

export async function downloadUpdate(release, { fetcher = fetch, signal } = {}) {
  if (!release.available || !/^[a-f0-9]{64}$/.test(release.sha256 || '') || !Number.isSafeInteger(release.zipSize) || release.zipSize <= 0 || release.zipSize > 20 * 1024 * 1024) throw new Error('No verified update package is available. Use the release download instead.');
  const expected = 'https://github.com/Pratik77221/effect-maker-archive/releases/download/' + release.tag + '/' + release.zipName;
  if (release.zipUrl !== expected || !/^v\d+\.\d+\.\d+(?:\.\d+)?$/.test(release.tag) || release.zipName !== 'effect-maker-archive-' + release.tag + '.zip') fail();
  const timeout = AbortSignal.timeout(90000);
  const response = await fetcher(expected, { credentials: 'omit', cache: 'no-store', redirect: 'follow', signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
  if (!response.ok || !response.body) throw new Error('Update download failed. Try again or download the ZIP from the release page.');
  if (response.url) {
    const final = new URL(response.url);
    if (final.protocol !== 'https:' || !['github.com', 'release-assets.githubusercontent.com'].includes(final.hostname) || final.username || final.password || final.port) fail();
  }
  const reader = response.body.getReader();
  const output = new Uint8Array(release.zipSize);
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (size + value.length > output.length) { await reader.cancel(); throw new Error('Update download exceeded its expected size.'); }
      output.set(value, size); size += value.length;
    }
  } finally { reader.releaseLock(); }
  if (size !== output.length) throw new Error('Update download is incomplete. No files were changed.');
  return output;
}
