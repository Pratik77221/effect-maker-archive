import { validUpdatePath } from './update-package.js';

const BACKUP_NAME = '.effect-maker-archive-update-backup.json';
const equal = (a, b) => a?.length === b?.length && a.every((value, index) => value === b[index]);
async function fileAt(folder, path, create = false) {
  if (!validUpdatePath(path)) throw new Error('Invalid extension update path.');
  const parts = path.split('/');
  let parent = folder;
  for (const part of parts.slice(0, -1)) parent = await parent.getDirectoryHandle(part, { create });
  return { parent, name: parts.at(-1), file: await parent.getFileHandle(parts.at(-1), { create }) };
}
async function readFile(folder, path) {
  try {
    const { file } = await fileAt(folder, path);
    const value = await file.getFile();
    if (value.size > 2 * 1024 * 1024) throw new Error('An installed file is too large to update safely. Use the release ZIP.');
    return new Uint8Array(await value.arrayBuffer());
  } catch (error) { if (error.name === 'NotFoundError') return null; throw error; }
}
async function writeFile(file, bytes) {
  const writable = await file.createWritable();
  try { await writable.write(bytes); await writable.close(); }
  catch (error) { await writable.abort().catch(() => {}); throw error; }
}

export async function validateUpdateFolder(folder, installedManifest, installedFile) {
  if (folder?.kind !== 'directory') throw new Error('Choose the folder you selected in Chrome’s Load unpacked dialog.');
  const raw = await readFile(folder, 'manifest.json');
  let manifest;
  try { manifest = JSON.parse(new TextDecoder().decode(raw ?? new Uint8Array())); } catch {}
  if (manifest?.name !== 'Effect Maker Archive' || manifest.manifest_version !== 3 || manifest.version !== installedManifest.version ||
      manifest.homepage_url !== 'https://github.com/Pratik77221/effect-maker-archive') {
    throw new Error('Choose the installed Effect Maker Archive ' + installedManifest.version + ' folder containing manifest.json.');
  }
  // Also compare the installed runtime, so an unrelated or edited folder is refused.
  if (installedFile && !equal(await readFile(folder, 'runtime.js'), await installedFile('runtime.js'))) {
    throw new Error('This folder does not match the running extension. Select the folder used by Load unpacked.');
  }
  return folder;
}

export async function installUpdateFiles(folder, update, installedManifest, { installedFile, onProgress = () => {} } = {}) {
  if (await folder.queryPermission({ mode: 'readwrite' }) !== 'granted') throw new Error('Choose the extension folder again to allow this update.');
  await validateUpdateFolder(folder, installedManifest, installedFile);
  const plan = [];
  let backupSize = 0;
  for (const [path, bytes] of update.files) {
    const previous = await readFile(folder, path);
    if ((backupSize += previous?.length ?? 0) > 12 * 1024 * 1024) throw new Error('The existing extension is too large to back up. Use the release ZIP.');
    if (!equal(previous, bytes)) plan.push({ path, bytes, previous });
  }
  if (!plan.some(item => item.path === 'manifest.json')) throw new Error('The update does not change the installed version.');
  plan.sort((a, b) => Number(a.path === 'manifest.json') - Number(b.path === 'manifest.json'));
  const encode = bytes => {
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 16384) binary += String.fromCharCode(...bytes.subarray(offset, offset + 16384));
    return btoa(binary);
  };
  // Back up packaged files only; Chrome storage and project backups are excluded.
  const backup = { format: 'effect-maker-archive-update-backup', fromVersion: installedManifest.version, toVersion: update.manifest.version,
    files: plan.map(({ path, previous }) => ({ path, base64: previous ? encode(previous) : null })) };
  try {
    const existing = await folder.getFileHandle(BACKUP_NAME);
    const file = await existing.getFile();
    if (file.size > 18 * 1024 * 1024 || JSON.parse(await file.text()).format !== backup.format) throw new Error('Unrecognized update backup file. Use the release ZIP.');
  } catch (error) { if (error.name !== 'NotFoundError') throw error; }
  await writeFile(await folder.getFileHandle(BACKUP_NAME, { create: true }), JSON.stringify(backup));
  const attempted = [];
  try {
    for (const item of plan) {
      onProgress('Installing file ' + (attempted.length + 1) + ' of ' + plan.length + '… Keep this window open.');
      // Include the current file in rollback even if creating or closing it fails.
      attempted.push(item);
      const { file } = await fileAt(folder, item.path, true);
      await writeFile(file, item.bytes);
    }
    for (const item of plan) if (!equal(await readFile(folder, item.path), item.bytes)) throw new Error('Written update verification failed.');
  } catch (error) {
    let recovered = true;
    for (const item of attempted.reverse()) {
      try {
        if (item.previous) await writeFile((await fileAt(folder, item.path, true)).file, item.previous);
        else {
          try { const { parent, name } = await fileAt(folder, item.path); await parent.removeEntry(name); }
          catch (missing) { if (missing.name !== 'NotFoundError') throw missing; }
        }
      } catch { recovered = false; }
    }
    throw new Error(recovered ? 'Update failed; the previous files were restored. Try again or install the release ZIP manually.' : 'Update was interrupted and could not fully restore the previous files. Install the release ZIP manually before reloading the extension. The previous files are in ' + BACKUP_NAME + '.');
  }
  return { version: update.manifest.version, filesWritten: plan.length, backupName: BACKUP_NAME };
}

export function createUpdateFolderStore(database = indexedDB) {
  async function transact(mode, operation) {
    const db = await new Promise((resolve, reject) => {
      const request = database.open('effect-maker-archive-updates', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('settings');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    try {
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction('settings', mode);
        const request = operation(transaction.objectStore('settings'));
        let result;
        request.onsuccess = () => { result = request.result; };
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error || new Error('Folder preference could not be saved.'));
      });
    } finally { db.close(); }
  }
  return { get: () => transact('readonly', store => store.get('folder')), set: folder => transact('readwrite', store => store.put(folder, 'folder')),
    clear: () => transact('readwrite', store => store.delete('folder')) };
}
