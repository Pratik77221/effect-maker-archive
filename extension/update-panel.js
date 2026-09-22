import { checkForUpdate, RELEASES_URL } from './update-api.js';
import { downloadUpdate, readUpdatePackage } from './update-package.js';
import { createUpdateFolderStore, installUpdateFiles, validateUpdateFolder } from './update-install.js';

export function mountUpdatePanel(ui, { manifest, requestAccess, reloadExtension, installedFile,
  pickFolder = globalThis.showDirectoryPicker?.bind(globalThis), folderStore = createUpdateFolderStore(),
  settings = chrome.storage.local, checker = checkForUpdate, downloader = downloadUpdate,
  unpacker = readUpdatePackage, installer = installUpdateFiles, validateFolder = validateUpdateFolder } = {}) {
  const root = ui.updateArea;
  let busy = false, locked = false, latest, folder, folderReady = false, folderChanged = false, installedInFolder = false;
  const add = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    root.append(node); return node;
  };
  const button = (text, callback) => {
    const node = add('button', text, 'ema-button ema-button-secondary');
    node.type = 'button'; node.addEventListener('click', callback); return node;
  };
  add('h3', 'Extension updates');
  const version = add('p', 'Installed: ' + manifest.version, 'ema-description');
  const help = add('p', 'Check the latest GitHub release. No GitHub sign-in needed.', 'ema-description');
  const checkButton = button('Check for updates', check);
  const download = add('a', 'Download ZIP', 'ema-gh-link');
  download.target = '_blank'; download.rel = 'noopener noreferrer'; download.hidden = true;
  const releaseLink = add('a', 'Release notes', 'ema-gh-link');
  releaseLink.href = RELEASES_URL + '/latest'; releaseLink.target = '_blank'; releaseLink.rel = 'noopener noreferrer';
  const folderHelp = add('p', 'For direct installation, choose the exact folder you loaded in Chrome. Chrome will ask for file access.', 'ema-description');
  const choose = button('Choose extension folder', chooseFolder);
  const forget = button('Forget folder', async () => {
    if (busy || locked) return;
    folderChanged = true;
    await ui.run('update', 'Forgetting update folder…', async () => {
      await folderStore.clear(); folder = undefined; folderReady = false; render();
      return 'Folder forgotten. Future updates will ask you to choose it again.';
    });
  });
  const install = button('Install update', installLatest);
  install.className = 'ema-button';
  const installHelp = add('p', 'Installation replaces extension files and reloads the extension. Keep this window open while files are written.', 'ema-description');
  const progress = message => ({ stage: 'update', message, stageLimitMs: null });
  function render() {
    checkButton.disabled = ui.updateButton.disabled = busy || locked || installedInFolder;
    choose.disabled = busy || locked || installedInFolder || !pickFolder;
    forget.hidden = !folder; forget.disabled = busy || locked || installedInFolder;
    install.hidden = !latest?.available;
    install.disabled = busy || locked || installedInFolder || !latest?.available || !latest.sha256 || !folderReady;
    download.hidden = !latest?.available;
    folderHelp.textContent = !pickFolder ? 'This browser does not support direct installation. Download the ZIP and update the extension manually.' :
      folder ? (folderReady ? 'Update folder: ' : 'Allow folder access again: ') + folder.name : 'Choose the exact folder you loaded with Load unpacked. Chrome will ask for file access.';
    choose.textContent = folder ? 'Choose / allow folder' : 'Choose extension folder';
    installHelp.hidden = !latest?.available || !pickFolder;
  }
  async function check() {
    if (busy || locked || installedInFolder) return;
    root.hidden = false; root.scrollIntoView?.({ block: 'nearest' });
    let access;
    try { access = Promise.resolve(requestAccess('check')); } catch (error) { access = Promise.reject(error); }
    access.catch(() => {});
    await ui.run('update', 'Checking GitHub for updates…', async task => {
      latest = undefined; render();
      if (!await access) throw new Error('Allow access to GitHub to check for extension updates.');
      latest = await task.guard(() => checker(manifest.version, { signal: task.signal }));
      task.check();
      version.textContent = 'Installed: ' + manifest.version + ' · Latest: ' + latest.version;
      releaseLink.href = latest.releaseUrl;
      download.href = latest.zipUrl;
      help.textContent = latest.available ? (latest.sha256 ? 'A new version is available. Choose Install update or download the ZIP.' : 'A new version is available. Use Download ZIP for this release.') : 'You already have this release or a newer version.';
      render();
      return latest.available ? 'Effect Maker Archive ' + latest.version + ' is available.' : 'Your extension is up to date.';
    });
  }
  async function chooseFolder() {
    if (busy || locked || installedInFolder || !pickFolder) return;
    folderChanged = true;
    let selection;
    try { selection = Promise.resolve(pickFolder({ id: 'effect-maker-archive-update', mode: 'readwrite', ...(folder ? { startIn: folder } : {}) })); }
    catch (error) { selection = Promise.reject(error); }
    selection.catch(() => {});
    await ui.run('update', 'Choosing the installed extension folder…', async task => {
      const chosen = await task.guard(() => selection);
      await task.guard(() => validateFolder(chosen, manifest, installedFile));
      task.check();
      if (await chosen.queryPermission({ mode: 'readwrite' }) !== 'granted') throw new Error('Allow write access to this extension folder to install updates.');
      await folderStore.set(chosen);
      task.check(); folder = chosen; folderReady = true; render();
      return 'Update folder selected. New releases can be installed from this panel.';
    });
  }
  async function installLatest() {
    if (busy || locked || installedInFolder || !latest?.available || !latest.sha256 || !folderReady) return;
    const release = latest, destination = folder;
    let access;
    try { access = Promise.resolve(requestAccess('install')); } catch (error) { access = Promise.reject(error); }
    access.catch(() => {});
    let installed = false;
    const success = await ui.run('update', 'Downloading extension update…', async task => {
      if (!await access) throw new Error('Allow GitHub release downloads to install this update.');
      if (await destination.queryPermission({ mode: 'readwrite' }) !== 'granted') {
        folderReady = false; render(); throw new Error('Choose / allow the extension folder again before installing.');
      }
      const bytes = await task.guard(() => downloader(release, { signal: task.signal }));
      task.check(); task.report(progress('Checking the update package…'));
      const update = await task.guard(() => unpacker(bytes, release, manifest));
      task.check();
      // Once replacement starts, finish or roll back before allowing another action.
      ui.setCancellable(false);
      const result = await installer(destination, update, manifest, { installedFile, onProgress: message => task.report(progress(message)) });
      installed = installedInFolder = true;
      await settings.set({ 'ema.update.expectedVersion': result.version }).catch(() => {});
      task.report(progress('Update installed. Reloading the extension…'));
      return 'Installed ' + result.version + '. Reloading the extension…';
    });
    if (success && installed) {
      try { await reloadExtension(); }
      catch { help.textContent = 'Files installed. Click Reload for Effect Maker Archive at chrome://extensions, then reopen it.'; render(); }
    }
  }
  ui.updateButton.addEventListener('click', check);
  ui.subscribe(state => { busy = state.busy; locked = state.reloadRequired; render(); });
  const ready = (async () => {
    try {
      const saved = await folderStore.get();
      const permitted = !!saved && await saved.queryPermission({ mode: 'readwrite' }) === 'granted';
      if (!folderChanged) { folder = saved; folderReady = permitted; }
    } catch { if (!folderChanged) folder = undefined; }
    try {
      const expected = (await settings.get('ema.update.expectedVersion'))['ema.update.expectedVersion'];
      if (expected) {
        root.hidden = false;
        help.textContent = expected === manifest.version ? 'Updated successfully to ' + manifest.version + '.' : 'The running version did not change. Choose the exact installed extension folder, or load the downloaded ZIP manually.';
        await settings.remove('ema.update.expectedVersion');
      }
    } catch {}
    render();
  })();
  render();
  return { ready };
}
