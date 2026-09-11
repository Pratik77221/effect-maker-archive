import { backupPath, createGitHubClient } from './github-api.js';
import { createAuthStore, GITHUB_CLIENT_ID, signInWithDevice } from './github-auth.js';

export function mountGitHubPanel(ui, { invoke, projectId, storage = chrome.storage, requestAccess, openAuthPage, copyText = text => navigator.clipboard.writeText(text), clientFactory = createGitHubClient, deviceLogin = signInWithDevice, clientId = GITHUB_CLIENT_ID, authStore = createAuthStore(storage), windowEvents = globalThis }) {
  const root = ui.githubArea;
  let session, signingIn = false, busy = false, locked = false, selectedRepo, backups = [], stale = true;
  const histories = new Map();
  let settingsReady = false, repositoriesLoaded = false, repositoriesAttempted = false;
  let refreshAfterCreate = false, refreshPending = false;
  const add = (tag, text, parent = root, className) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    parent.append(element);
    return element;
  };
  const button = (text, callback, parent = root, className = 'ema-button') => {
    const control = add('button', text, parent, className);
    control.type = 'button'; control.addEventListener('click', callback); return control;
  };
  const input = (label, type, parent, name) => {
    const container = add('label', undefined, parent, 'ema-gh-field');
    add('span', label, container);
    const control = add(type === 'select' ? 'select' : 'input', undefined, container);
    if (type !== 'select') control.type = type;
    control.setAttribute('aria-label', label);
    control.name = name;
    return control;
  };
  const link = (text, url, parent) => {
    const a = add('a', text, parent, 'ema-gh-link'); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a;
  };
  const option = (select, label, value) => { const entry = add('option', label, select); entry.value = value; };
  const replaceOptions = (select, placeholder, values) => {
    select.replaceChildren();
    option(select, placeholder, '');
    values.forEach(value => option(select, value.label, value.value));
  };
  add('h3', 'Back up with GitHub');
  add('p', 'Save a project backup, keep its history, and bring it back when you need it.', root, 'ema-description');
  const disconnected = add('div', undefined, root, 'ema-gh-connect');
  const signIn = button('Sign in with GitHub', connect, disconnected);
  add('p', 'Sign in on GitHub and approve a short verification code. No access token to create or paste.', disconnected, 'ema-description');
  add('p', 'GitHub will show the app as “effectmaker” and ask for repository access, including private repositories.', disconnected, 'ema-description');
  const device = add('div', undefined, root, 'ema-gh-device'); device.hidden = true;
  add('p', 'Your one-time sign-in code', device);
  const deviceCode = add('code', '', device);
  deviceCode.setAttribute('aria-label', 'GitHub sign-in code');
  const continueSignIn = button('Copy code & open GitHub', async () => {
    continueSignIn.disabled = true;
    try {
      try { await copyText(deviceCode.textContent); deviceHelp.textContent = 'Code copied. Paste it on GitHub, approve “effectmaker”, then return here.'; }
      catch { deviceHelp.textContent = 'Copy the code above manually, then paste it on GitHub to approve “effectmaker”.'; }
      if (!signingIn) return;
      await openAuthPage('https://github.com/login/device', deviceCode.textContent);
    } catch { deviceHelp.textContent = 'The GitHub window could not open. Try this button again.'; }
    finally { continueSignIn.disabled = false; }
  }, device);
  const deviceHelp = add('p', 'Approve in the next 3 minutes. Keep this panel open.', device, 'ema-description');
  const connected = add('div', undefined, root, 'ema-gh-connected'); connected.hidden = true;
  const accountRow = add('div', undefined, connected, 'ema-gh-account');
  const account = add('span', '', accountRow);
  const disconnect = button('Disconnect', () => ui.run('github', 'Disconnecting GitHub…', async () => {
    await authStore.disconnect(); session = undefined; selectedRepo = undefined; backups = []; stale = true;
    repositoriesLoaded = repositoriesAttempted = refreshAfterCreate = refreshPending = false;
    repo.value = ''; refresh(); return 'GitHub disconnected from this browser session.';
  }), accountRow, 'ema-gh-text-button');
  add('p', 'Sign-in lasts for this browser session.', connected, 'ema-description');
  const reconnect = button('Sign in again with GitHub', connect, connected, 'ema-gh-text-button');
  const repo = input('Repository', 'select', connected, 'repository');
  const repositoryActions = add('div', undefined, connected, 'ema-gh-repository-actions');
  const refreshButton = button('Refresh repositories', () => {
    refreshPending = false;
    return refreshRepositories();
  }, repositoryActions, 'ema-gh-text-button');
  const createRepository = link('Create a repository', 'https://github.com/new', repositoryActions);
  createRepository.addEventListener('click', () => {
    refreshAfterCreate = true;
    localMessage.textContent = 'Create the repository on GitHub, then return here. The list will refresh automatically.';
  });
  const repositoryHint = add('p', '', connected, 'ema-description');
  const advanced = document.createElement('details'); advanced.className = 'ema-details';
  add('summary', 'Backup options', advanced);
  const branch = input('Branch', 'select', advanced, 'branch');
  const publicLabel = add('label', undefined, connected, 'ema-gh-public'); publicLabel.hidden = true;
  const publicConsent = add('input', undefined, publicLabel); publicConsent.type = 'checkbox';
  add('span', 'Allow my project backup to be public', publicLabel);
  publicConsent.addEventListener('change', refresh);
  const backup = input('Project backup', 'select', connected, 'backup');
  const name = input('New backup name', 'text', connected, 'backup-name');
  name.value = 'project-' + projectId;
  name.maxLength = 100;
  const revision = input('Version to pull', 'select', connected, 'revision');
  connected.append(advanced);
  const commitMessage = input('Backup note (optional)', 'text', advanced, 'commit-message');
  commitMessage.maxLength = 200;
  commitMessage.placeholder = 'What changed?';
  const pathText = add('p', '', connected, 'ema-gh-path');
  const actions = add('div', undefined, connected, 'ema-gh-actions');
  const push = button('Push backup', () => ui.run('push', 'Exporting your project for GitHub…', async task => {
    if (!selectedRepo || stale) throw new Error('Refresh and choose a repository before pushing.');
    const repository = repo.value, branchName = branch.value;
    const selected = backups.find(item => item.path === backup.value);
    const path = selected?.path ?? backupPath(name.value.trim());
    const expectedSha = selected?.sha ?? null;
    const allowPublic = publicConsent.checked;
    const message = commitMessage.value.trim();
    const archive = await task.guard(() => invoke('export', {}, task));
    task.check();
    stale = true;
    const saved = await task.wait('upload', 'Pushing backup to ' + repository + '…', () => client(task).push(repository, branchName, path, archive, expectedSha, message, { allowPublic, onWrite: () => { stale = true; } }));
    task.check();
    const record = { name: path.split('/').at(-1).replace(/\.json$/, ''), path, sha: saved.sha };
    backups = [...backups.filter(item => item.path !== path), record];
    if (saved.commit) {
      const key = repository + '/' + branchName + '/' + path;
      histories.set(key, [{ sha:saved.commit, message:message || 'Back up ' + archive.project.title }, ...(histories.get(key) || [])].slice(0,20));
    }
    populateBackups(path);
    stale = false;
    ui.showDetails({ repository, branch: branchName, ...saved });
    commitMessage.value = '';
    await saveSelection().catch(() => { localMessage.textContent = 'Backup saved. This browser could not remember your repository selection.'; });
    return saved.unchanged ? 'This project already matches its GitHub backup. No extra commit was created.' : 'Backup pushed to ' + repository + '. Commit ' + saved.commit.slice(0,7) + '.';
  }), actions);
  const pull = button('Pull backup', () => ui.run('pull', 'Loading the GitHub backup…', async task => {
    if (!backup.value) throw new Error('Choose a project backup first.');
    const repository = repo.value, path = backup.value, ref = revision.value || branch.value;
    const downloaded = await task.wait('download', 'Downloading and checking the GitHub backup…', () => client(task).pull(repository, path, ref));
    task.check();
    ui.setArchive(downloaded.archive, path.split('/').at(-1));
    ui.showDetails({ repository, branch: branch.value, revision: ref, path, sha: downloaded.sha });
    ui.showFiles();
    return 'Backup pulled from GitHub. Click Import project to load it into this empty project.';
  }), actions, 'ema-button ema-button-secondary');
  add('p', 'Push creates a backup commit. Pull loads a file for Import project.', connected, 'ema-description');
  const localMessage = add('p', '', root, 'ema-description'); localMessage.setAttribute('role', 'status');
  const client = task => {
    if (!session?.token || (session.expiresAt && session.expiresAt <= Date.now())) throw new Error('Connect to GitHub again to continue.');
    return clientFactory(session.token, { signal: task.signal, timeoutMs: 90000, onUnauthorized: async () => {
      await authStore.disconnect(); session = undefined; selectedRepo = undefined; stale = true; refresh();
    } });
  };
  function populateBackups(selected = '') {
    replaceOptions(backup, 'Create a new backup', backups.map(item => ({ label: item.name, value: item.path })));
    backup.value = backups.some(item => item.path === selected) ? selected : '';
    replaceOptions(revision, 'Latest on selected branch', []);
    for (const version of histories.get(repo.value + '/' + branch.value + '/' + backup.value) || []) option(revision, version.sha.slice(0,7) + ' · ' + version.message, version.sha);
    name.parentElement.hidden = !!backup.value;
    revision.parentElement.hidden = !backup.value;
  }
  async function saveSelection() {
    await storage.local.set({ 'ema.github.selection': { repository: repo.value, branch: branch.value, path: backup.value } });
  }
  async function loadHistory(task) {
    replaceOptions(revision, 'Latest on selected branch', []);
    if (!backup.value) return;
    const versions = await client(task).history(repo.value, backup.value, branch.value);
    histories.set(repo.value + '/' + branch.value + '/' + backup.value, versions);
    for (const version of versions) option(revision, version.sha.slice(0,7) + ' · ' + version.message, version.sha);
  }
  async function loadBackups(task, wanted = '') {
    stale = true; backups = []; populateBackups();
    backups = await client(task).backups(repo.value, branch.value);
    task.check(); populateBackups(wanted); stale = false;
    await loadHistory(task); await saveSelection();
  }
  async function loadRepository(task, preferred = {}) {
    selectedRepo = undefined; stale = true; backups = []; populateBackups();
    repositoryHint.textContent = '';
    publicConsent.checked = false;
    replaceOptions(branch, 'Choose a branch', []);
    if (!repo.value) return;
    const api = client(task);
    selectedRepo = await api.repository(repo.value);
    repositoryHint.textContent = selectedRepo.permissions?.push === false ? 'You can pull backups here. Choose a repository you can write to for pushing.' : (selectedRepo.private ? 'Private backup repository.' : 'Public · anyone can read these backups.');
    let branches;
    try { branches = await api.branches(repo.value); }
    catch (error) { if (error.status === 409 && selectedRepo.size === 0) branches = []; else throw error; }
    const defaultBranch = selectedRepo.default_branch || 'main';
    replaceOptions(branch, 'Choose a branch', (branches.length ? branches : [{ name:defaultBranch }]).map(item => ({ label:item.name, value:item.name })));
    branch.value = branches.some(item => item.name === preferred.branch) ? preferred.branch : defaultBranch;
    await loadBackups(task, preferred.path);
  }
  async function loadRepositories(task) {
    repositoriesAttempted = true;
    const selection = { repository: repo.value, branch: branch.value, path: backup.value, revision: revision.value };
    const stored = (await storage.local.get('ema.github.selection'))['ema.github.selection'] || {};
    const repositories = await client(task).repositories();
    task.check();
    repositories.sort((a,b) => Number(b.private) - Number(a.private) || a.full_name.localeCompare(b.full_name));
    replaceOptions(repo, 'Choose a repository', repositories.map(item => ({ label:item.full_name + (item.private ? ' · Private' : ' · Public'), value:item.full_name })));
    const preferred = selection.repository ? selection : stored;
    const wanted = preferred.repository;
    repo.value = repositories.some(item => item.full_name === wanted) ? wanted : '';
    await loadRepository(task, preferred.repository === repo.value ? preferred : {});
    task.check();
    if (repo.value === selection.repository && branch.value === selection.branch && backup.value === selection.path &&
        Array.from(revision.children).some(option => option.value === selection.revision)) revision.value = selection.revision;
    repositoriesLoaded = true;
    localMessage.textContent = repositories.length ? repositories.length + ' repositories available. You can refresh this list without signing in again.' : 'No repositories found. Create one on GitHub, then return here or click Refresh repositories.';
  }
  function refreshRepositories() {
    if (!session || busy || locked) return;
    return ui.run('github', 'Refreshing GitHub repositories and backups…', async task => {
      await loadRepositories(task);
      return 'Repositories and backups refreshed. Choose a repository for your next push or pull.';
    });
  }
  async function connect() {
    if (busy || locked) return;
    let permission;
    try { permission = Promise.resolve(requestAccess('device')); } // Retain the button's user gesture.
    catch (error) { permission = Promise.reject(error); }
    permission.catch(() => {});
    signingIn = true;
    try { await ui.run('connect', 'Connecting to GitHub…', async task => {
      if (!await permission) throw new Error('Allow GitHub access to connect this extension.');
      const auth = await task.wait('auth', 'Waiting for approval on GitHub…', () => deviceLogin({ clientId, signal:task.signal, onCode: code => {
        task.check();
        deviceCode.textContent = code.userCode; deviceHelp.textContent = 'Approve in the next 3 minutes. Keep this panel open.'; device.hidden = false;
      } }));
      task.check();
      session = await authStore.save(auth.token, auth.profile, auth.expiresIn);
      selectedRepo = undefined; backups = []; histories.clear(); stale = true;
      repo.value = ''; populateBackups();
      device.hidden = true;
      refresh();
      await loadRepositories(task);
      localMessage.textContent = '';
      return 'Connected as ' + session.profile.login + '. Choose a repository for your backups.';
    }); } finally { signingIn = false; deviceCode.textContent = ''; device.hidden = true; refresh(); }
  }
  repo.addEventListener('change', () => ui.run('github', 'Opening repository…', async task => { await loadRepository(task); return 'Repository ready. Choose a backup or create a new one.'; }));
  branch.addEventListener('change', () => ui.run('github', 'Loading branch backups…', async task => { await loadBackups(task); return 'Branch backups loaded.'; }));
  backup.addEventListener('change', () => ui.run('github', 'Loading backup versions…', async task => {
    name.parentElement.hidden = !!backup.value; revision.parentElement.hidden = !backup.value;
    await loadHistory(task); await saveSelection(); return backup.value ? 'Backup selected. Pull its latest version or choose an earlier commit.' : 'Choose a name for your new backup.';
  }));
  name.addEventListener('input', refresh);
  function refresh() {
    disconnected.hidden = !!session || signingIn; connected.hidden = !session || signingIn;
    account.textContent = session ? 'Connected as ' + session.profile.login : '';
    const unavailable = busy || locked;
    for (const control of [signIn, reconnect, disconnect, repo, branch, backup, name, revision, commitMessage, refreshButton, publicConsent]) control.disabled = unavailable;
    publicLabel.hidden = !selectedRepo || selectedRepo.private === true;
    push.disabled = unavailable || !selectedRepo || selectedRepo.permissions?.push === false || !branch.value || stale || (!selectedRepo.private && !publicConsent.checked) || (!backup.value && !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(name.value.trim()));
    pull.disabled = unavailable || !backup.value || !branch.value || stale;
    pathText.textContent = stale && selectedRepo ? 'Refresh backups before the next push.' : (repo.value && branch.value ? repo.value + ' · ' + branch.value + '\n' + (backup.value || 'effect-maker/' + name.value.trim() + '.json') : '');
  }
  ui.subscribe(state => {
    busy = state.busy; locked = state.reloadRequired; refresh();
    if (!busy && !locked) queueMicrotask(loadWhenOpened);
  });
  function loadWhenOpened() {
    if (!settingsReady || !session || ui.activeTab() !== 'github' || busy || locked) return;
    if (refreshPending) { refreshPending = false; return refreshRepositories(); }
    if (repositoriesAttempted) return;
    repositoriesAttempted = true;
    return ui.run('github', 'Loading your GitHub repositories…', async task => {
      await loadRepositories(task); return 'GitHub connected. Choose Push backup or Pull backup.';
    });
  }
  ui.onTabChange(() => {
    if (!repositoriesLoaded) repositoriesAttempted = false;
    return loadWhenOpened();
  });
  windowEvents.addEventListener?.('focus', () => {
    if (!refreshAfterCreate) return;
    refreshAfterCreate = false;
    refreshPending = true;
    loadWhenOpened();
  });
  storage.onChanged?.addListener((changes, area) => {
    if (area !== 'session' || !changes['ema.github.session']) return;
    const updated = changes['ema.github.session'].newValue;
    if (updated?.profile?.id !== session?.profile?.id) {
      selectedRepo = undefined; backups = []; stale = true; repositoriesLoaded = repositoriesAttempted = false;
      repo.value = ''; populateBackups();
    }
    session = updated;
    refresh();
    loadWhenOpened();
  });
  const ready = (async () => {
    session = await authStore.get(); settingsReady = true; refresh();
    await loadWhenOpened();
  })().catch(() => { localMessage.textContent = 'GitHub settings could not load. Reopen the extension and connect again.'; });
  return { ready };
}
