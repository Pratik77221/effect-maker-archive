import { createOperationRuntime } from './runtime.js';
import { panelStyles } from './panel-styles.js';

// Bundled with the adapter and runtime for an on-demand script injection.
export function mountEditorPanel(invoke) {
  if (location.origin !== 'https://effects.youtube.com' || !/^\/edit\/[\w-]+$/.test(location.pathname)) {
    throw new Error('Open an Effect Maker project, then click the extension.');
  }
  return { status: renderEditorPanel(invoke).status };
}

// The view also runs in a local UI preview with a simulated operation handler.
// Production activation still goes through mountEditorPanel's origin check.
export function renderEditorPanel(invoke, options = {}) {
  const id = 'em-local-archive-controls';
  const previous = document.getElementById(id);
  if (previous?.dataset.busy === 'true') {
    if (previous.dataset.version !== '0.4.4' && !previous.querySelector?.('[data-upgrade-notice]')) {
      const notice = document.createElement('p');
      notice.dataset.upgradeNotice = 'true';
      notice.textContent = 'An older import is still running. Reload this editor before testing version 0.4.4.';
      previous.append(notice);
      const reload = document.createElement('button');
      reload.type = 'button';
      reload.textContent = 'Reload editor';
      reload.addEventListener('click', () => location.reload());
      previous.append(reload);
    }
    previous.focus();
    return { status: 'editor-controls-ready' };
  }
  previous?.remove();
  const host = document.createElement('section');
  host.id = id;
  host.dataset.version = '0.4.4';
  if (options.sidePanel) host.dataset.surface = 'side-panel';
  host.tabIndex = -1;
  host.setAttribute('role', 'dialog');
  host.setAttribute('aria-labelledby', id + '-title');
  host.setAttribute('aria-describedby', id + '-subtitle');
  // Typing in this panel should not trigger the editor's object shortcuts.
  host.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.key === 'Escape' && !busy && !options.sidePanel) host.remove();
  });
  const add = (tag, text, parent = host, className) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    parent.append(element);
    return element;
  };
  const icon = (name, parent) => {
    const paths = {
      archive: ['M7 7V4h13v13h-3', 'M4 7h13v13H4z', 'M10.5 10v7m-3-3 3 3 3-3'],
      export: ['M12 3v12m-4-4 4 4 4-4', 'M5 16v4h14v-4'],
      import: ['M12 15V3m-4 4 4-4 4 4', 'M5 16v4h14v-4'],
      file: ['M14 3H5v18h14V8z', 'M14 3v5h5', 'M8 13h8m-8 4h5'],
      close: ['m6 6 12 12M6 18 18 6'],
      computer: ['M3 4h18v13H3z', 'M8 21h8m-4-4v4']
    };
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    for (const d of paths[name]) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      svg.append(path);
    }
    parent.append(svg);
    return svg;
  };
  add('style', panelStyles);
  const heading = add('header', undefined, host, 'ema-header');
  icon('archive', add('span', undefined, heading, 'ema-brand'));
  const headingCopy = add('div', undefined, heading, 'ema-heading');
  add('h2', 'Effect Maker Archive', headingCopy).id = id + '-title';
  add('p', 'Import and export your projects', headingCopy, 'ema-subtitle').id = id + '-subtitle';
  let archive;
  let busy = false;
  let activeTask;
  let reloadRequired = false;
  let log;
  const button = (text, onClick, parent, className = 'ema-button') => {
    const element = add('button', text, parent, className);
    element.type = 'button';
    element.addEventListener('click', onClick);
    return element;
  };
  const close = button('', () => { if (!busy) options.onClose ? options.onClose() : host.remove(); }, heading, 'ema-close');
  if (options.sidePanel) close.hidden = true; // Chrome provides the panel's close control.
  close.setAttribute('aria-label', 'Close project archive');
  close.title = 'Close';
  icon('close', close);
  const body = add('div', undefined, host, 'ema-body');
  const listeners = new Set();
  const tabListeners = new Set();
  let activeTab = 'files';
  let filesTab, githubTab, tabs;
  if (options.github) {
    tabs = add('div', undefined, body, 'ema-tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Archive tools');
    filesTab = button('Project files', () => showTab('files'), tabs, 'ema-tab');
    githubTab = button('GitHub backup', () => showTab('github'), tabs, 'ema-tab');
    for (const [tab, name] of [[filesTab, 'files'], [githubTab, 'github']]) {
      tab.setAttribute('role', 'tab');
      tab.id = id + '-tab-' + name;
      tab.setAttribute('aria-controls', id + '-' + name);
    }
  }
  const filesArea = add('div', undefined, body);
  filesArea.id = id + '-files';
  const githubArea = options.github ? add('div', undefined, body) : undefined;
  if (githubArea) {
    githubArea.id = id + '-github';
    for (const [area, name] of [[filesArea, 'files'], [githubArea, 'github']]) {
      area.setAttribute('role', 'tabpanel');
      area.setAttribute('aria-labelledby', id + '-tab-' + name);
    }
  }
  function showTab(name) {
    if (!githubArea) return;
    activeTab = name;
    filesArea.hidden = name !== 'files';
    githubArea.hidden = name !== 'github';
    filesTab.setAttribute('aria-selected', String(name === 'files'));
    githubTab.setAttribute('aria-selected', String(name === 'github'));
    for (const listener of tabListeners) listener(name);
  }
  const section = (name, title, description) => {
    const area = add('section', undefined, filesArea, 'ema-section');
    const row = add('div', undefined, area, 'ema-section-heading');
    icon(name, add('span', undefined, row, 'ema-section-icon'));
    const copy = add('div', undefined, row, 'ema-section-copy');
    add('h3', title, copy);
    add('p', description, copy, 'ema-description');
    return area;
  };
  const exportArea = section('export', 'Export a copy', 'Save this project and its assets to your computer.');
  const exportButton = button('Export project', () => run('export', 'Exporting project…', async task => {
    const exported = await task.guard(() => invoke('export', {}, task));
    task.check();
    const url = URL.createObjectURL(new Blob([JSON.stringify(exported, null, 2) + '\n'], { type: 'application/json' }));
    const link = add('a');
    link.href = url;
    link.download = 'effect-' + exported.project.id + '.json';
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    showDetails({ project: exported.project, summary: exported.summary, assets: exported.assets.length, sourceSha256: exported.sourceSha256 });
    return 'Export ready. Your project file download has started.';
  }), exportArea);
  icon('export', exportButton);
  add('hr', undefined, filesArea, 'ema-divider');
  const importArea = section('import', 'Import from a file', 'Bring a saved project into this empty project.');
  const picker = add('label', undefined, importArea, 'ema-picker');
  picker.htmlFor = id + '-file';
  icon('file', picker);
  const pickerCopy = add('span', undefined, picker, 'ema-picker-copy');
  const fileName = add('span', 'Choose project file', pickerCopy, 'ema-file-name');
  const fileHint = add('span', '.json project archive · up to 60 MB', pickerCopy, 'ema-file-hint');
  const file = add('input', undefined, picker, 'ema-file-input');
  file.id = picker.htmlFor;
  file.type = 'file';
  file.accept = '.json,application/json';
  file.setAttribute('aria-label', 'Project file to import');
  const resetPicker = () => {
    picker.dataset.state = 'empty';
    fileName.textContent = 'Choose project file';
    fileHint.textContent = '.json project archive · up to 60 MB';
  };
  file.addEventListener('change', () => {
    archive = undefined;
    resetPicker();
    return run('file', 'Reading project file…', async task => {
      const selected = file.files[0];
      if (!selected) return 'Choose a project file to import.';
      fileName.textContent = selected.name;
      fileHint.textContent = 'Reading file…';
      if (selected.size > 60 * 1024 * 1024) throw new Error('Choose a project file smaller than 60 MB.');
      let parsed;
      const text = await task.wait('file', 'Reading project file…', () => selected.text());
      try { parsed = JSON.parse(text); }
      catch { throw new Error('This file is not valid JSON. Choose a file created by Export project.'); }
      if (parsed?.format !== 'effect-maker-source-archive' || !parsed.project || !Array.isArray(parsed.source) || !Array.isArray(parsed.assets)) {
        throw new Error('Choose a project file created by Export project.');
      }
      archive = parsed;
      picker.dataset.state = 'selected';
      const size = selected.size < 1024 * 1024 ? Math.max(1, Math.ceil(selected.size / 1024)) + ' KB' : (selected.size / (1024 * 1024)).toFixed(1) + ' MB';
      fileHint.textContent = size + ' · ' + parsed.assets.length + (parsed.assets.length === 1 ? ' asset' : ' assets') + ' · Ready to import';
      return 'Selected ' + selected.name + '. Click Import project to continue.';
    });
  });
  const importButton = button('Import project', () => run('import', 'Checking project file…', async task => {
    // Validation and destination checks are automatic; the user has one action.
    const plan = await task.guard(() => invoke('preview-import', { archive }, task));
    task.check();
    result.textContent = 'Importing project… Keep this editor tab open.';
    const imported = await task.guard(() => invoke('import', { archive, destinationId: plan.destination.id, expectedSourceSha256: archive.sourceSha256, expectedDestinationSha256: plan.destinationSourceSha256 }, task));
    task.check();
    if (imported?.status !== 'saved-reload-required') throw new Error('The editor did not confirm that the project was saved.');
    showDetails(imported);
    log = { ...task.snapshot(), result: imported };
    archive = undefined;
    file.value = '';
    resetPicker();
    reloadRequired = true;
    return 'Project imported and saved. Reload the editor to check it.';
  }), importArea);
  icon('import', importButton);
  add('p', 'Use an empty project. Any project name works.', importArea, 'ema-note');
  const status = add('div', undefined, body, 'ema-status');
  status.dataset.state = 'ready';
  const statusHeading = add('div', undefined, status, 'ema-status-heading');
  const statusMark = add('span', 'i', statusHeading, 'ema-status-mark');
  statusMark.setAttribute('aria-hidden', 'true');
  const statusTitle = add('span', 'Ready', statusHeading);
  const result = add('p', 'Choose an action to get started.', status, 'ema-result');
  result.setAttribute('role', 'status');
  result.setAttribute('aria-live', 'polite');
  const elapsed = add('p', '', status, 'ema-time');
  const cancel = button('Cancel', () => activeTask?.cancel(), status, 'ema-button ema-button-secondary');
  cancel.hidden = true;
  const reload = button('Reload editor', () => options.onReload ? options.onReload() : location.reload(), status);
  reload.hidden = true;
  const details = add('details', undefined, body, 'ema-details');
  details.hidden = true;
  add('summary', 'Activity details', details);
  const detailText = add('pre', '', details);
  const saveLog = button('Download test log', () => {
    if (!log) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(log, null, 2) + '\n'], { type: 'application/json' }));
    const link = add('a');
    link.href = url;
    link.download = 'effect-maker-test-log.json';
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }, details, 'ema-log');
  saveLog.hidden = true;
  const footer = add('footer', undefined, host, 'ema-footer');
  const local = add('span', undefined, footer);
  icon('computer', local);
  add('span', 'For YouTube Effect Maker', local);
  add('span', 'Version 0.4.4', footer);
  function setStatus(state, title) {
    status.dataset.state = state;
    statusTitle.textContent = title;
    statusMark.textContent = { ready: 'i', working: '', success: '✓', error: '!', cancelled: '–' }[state];
  }
  function showDetails(value) {
    detailText.textContent = JSON.stringify(value, null, 2);
    details.hidden = false;
  }
  function refresh() {
    host.dataset.busy = String(busy);
    close.disabled = busy;
    for (const control of [exportButton, file]) control.disabled = busy || reloadRequired;
    picker.dataset.disabled = String(file.disabled);
    importButton.disabled = busy || reloadRequired || !archive;
    cancel.hidden = !busy;
    reload.hidden = !reloadRequired;
    reload.disabled = busy;
    saveLog.hidden = !log || busy;
    for (const control of [cancel, reload, saveLog]) control.style.display = control.hidden ? 'none' : 'flex';
    for (const listener of listeners) listener({ busy, reloadRequired });
  }
  async function run(kind, message, operation) {
    if (busy || reloadRequired) return false;
    busy = true;
    log = undefined;
    refresh();
    result.textContent = message;
    setStatus('working', { file: 'Reading file', export: 'Exporting project', import: 'Checking project', connect: 'Connecting GitHub', push: 'Backing up project', pull: 'Loading backup', github: 'Loading GitHub' }[kind] || 'Working');
    details.hidden = true;
    details.open = false;
    if (['export', 'import', 'push', 'pull', 'connect'].includes(kind)) status.scrollIntoView?.({ block: 'nearest' });
    activeTask = createOperationRuntime({ operation: kind, onProgress: progress => {
      result.textContent = progress.message;
      statusTitle.textContent = { file: 'Reading file', validation: 'Checking project', download: kind === 'pull' ? 'Pulling backup' : 'Downloading assets', upload: kind === 'push' ? 'Pushing backup' : 'Uploading assets', apply: 'Applying project', save: 'Saving project', auth: 'Waiting for GitHub' }[progress.stage] ?? 'Working';
    } });
    const task = activeTask;
    const updateElapsed = () => {
      const info = task.snapshot();
      const stepLimit = Number.isFinite(info.stageLimitMs) && info.stageLimitMs > 0 ? ' / ' + Math.ceil(info.stageLimitMs / 1000) + 's max' : '';
      elapsed.textContent = Math.floor(info.elapsedMs / 1000) + 's elapsed · this step: ' + Math.floor(info.stageElapsedMs / 1000) + 's' + stepLimit;
    };
    updateElapsed();
    const ticker = setInterval(updateElapsed, 1000);
    try {
      result.textContent = await task.guard(() => operation(task));
      setStatus(kind === 'file' && !archive ? 'ready' : 'success', { file: archive ? 'File ready' : 'Ready', export: 'Export complete', import: 'Import complete', connect: 'GitHub connected', push: 'Backup complete', pull: 'Backup ready', github: 'GitHub ready' }[kind] || 'Complete');
      log ??= task.snapshot();
      return true;
    } catch (reason) {
      const error = task.error(reason);
      reloadRequired = !!error.reloadRequired;
      result.textContent = error.code === 'CANCELLED' ? error.message : 'Error: ' + error.message;
      setStatus(error.code === 'CANCELLED' ? 'cancelled' : 'error', error.code === 'CANCELLED' ? 'Cancelled' : { file: 'Check your file', export: 'Export stopped', import: 'Import stopped' }[kind] || 'GitHub action stopped');
      if (kind === 'file') {
        picker.dataset.state = 'error';
        fileHint.textContent = 'Choose a valid project archive to continue';
      }
      log = { ...error.details, error: { code: error.code, stage: error.stage, message: error.message, reloadRequired } };
      showDetails(log);
      return false;
    } finally {
      clearInterval(ticker);
      elapsed.textContent = 'Finished after ' + Math.ceil(task.snapshot().elapsedMs / 1000) + 's';
      if (details.hidden && log) showDetails(log);
      task.finish();
      activeTask = undefined;
      busy = false;
      refresh();
    }
  }
  refresh();
  showTab('files');
  document.body.append(host);
  host.focus();
  return {
    status: 'editor-controls-ready', host, githubArea, run, showDetails,
    showFiles: () => showTab('files'),
    activeTab: () => activeTab,
    onTabChange(listener) { tabListeners.add(listener); return () => tabListeners.delete(listener); },
    subscribe(listener) { listeners.add(listener); listener({ busy, reloadRequired }); return () => listeners.delete(listener); },
    setArchive(value, name) {
      if (value?.format !== 'effect-maker-source-archive' || !value.project || !Array.isArray(value.source) || !Array.isArray(value.assets)) throw new Error('Choose a valid project archive.');
      archive = value;
      file.value = '';
      fileName.textContent = name;
      fileHint.textContent = value.assets.length + (value.assets.length === 1 ? ' asset' : ' assets') + ' · Ready to import';
      picker.dataset.state = 'selected';
      refresh();
    }
  };
}
