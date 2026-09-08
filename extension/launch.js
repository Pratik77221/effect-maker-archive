const launchers = new WeakMap();
const isEditor = tab => Number.isInteger(tab?.id) && /^https:\/\/effects\.youtube\.com\/edit\/[\w-]+(?:[?#].*)?$/.test(tab.url ?? '');

// One extension-owned window also works in browsers without chrome.sidePanel.
// The queue prevents rapid toolbar clicks from creating duplicate windows.
export function createControlsLauncher(api) {
  let pending = Promise.resolve(), cached;
  const base = () => api.runtime.getURL('panel.html');
  const isPanel = url => typeof url === 'string' && url.startsWith(base() + '?');
  async function findPanel() {
    if (cached) {
      try {
        const window = await api.windows.get(cached.windowId, { populate: true });
        const tab = window.tabs?.find(tab => isPanel(tab.url) || isPanel(tab.pendingUrl) || (tab.id === cached.tabId && (!tab.url || tab.url === 'about:blank')));
        if (tab) return { windowId: window.id, tabId: tab.id, url: isPanel(tab.pendingUrl) ? tab.pendingUrl : isPanel(tab.url) ? tab.url : cached.url };
      } catch {}
      cached = undefined;
    }
    if (typeof api.runtime.getContexts === 'function') {
      const contexts = await api.runtime.getContexts({ contextTypes: ['TAB'] });
      const context = contexts.find(context => isPanel(context.documentUrl) && context.windowId >= 0);
      if (context) return { windowId: context.windowId, tabId: context.tabId, url: context.documentUrl };
    } else {
      const windows = await api.windows.getAll({ populate: true, windowTypes: ['popup'] });
      for (const window of windows) {
        const tab = window.tabs?.find(tab => isPanel(tab.url));
        if (tab) return { windowId: window.id, tabId: tab.id, url: tab.url };
      }
    }
  }
  async function launch(tab) {
    if (typeof api.windows?.create !== 'function') throw new Error('This browser cannot open the extension window. Reload Effect Maker Archive in the browser’s Extensions page.');
    const old = await api.scripting.executeScript({ target: { tabId: tab.id }, world: 'ISOLATED', func: () => {
      const panel = document.getElementById('em-local-archive-controls');
      if (panel?.dataset.busy === 'true') return { busy: true };
      panel?.remove();
      return { busy: false };
    } });
    if (old[0]?.result?.busy) throw new Error('An older operation is still running. Wait for it to finish or reload the editor before reopening the extension.');
    const projectId = new URL(tab.url).pathname.split('/').at(-1);
    const url = base() + '?tab=' + tab.id + '&project=' + encodeURIComponent(projectId);
    const existing = await findPanel();
    if (existing) {
      cached = existing;
      await api.windows.update(existing.windowId, { focused: true });
      if (existing.url !== url) {
        let response;
        try { response = await api.runtime.sendMessage({ type: 'ema:select-project', targetUrl: existing.url, tabId: tab.id, projectId }); }
        catch { throw new Error('The archive window is still opening. Wait a moment and click the extension again.'); }
        if (response?.status === 'busy') throw new Error('Finish or cancel the operation in the archive window before switching projects.');
        if (response?.status !== 'selected') throw new Error('Close the archive window and click the extension on the project you want to use.');
        cached.url = url;
      }
      return { surface: 'window', reused: true };
    }
    const window = await api.windows.create({ url, type: 'popup', width: 440, height: 800, focused: true });
    cached = { windowId: window.id, tabId: window.tabs?.[0]?.id, url };
    return { surface: 'window', reused: false };
  }
  return tab => {
    if (!isEditor(tab)) return Promise.reject(new Error('Open an Effect Maker project, then click the extension.'));
    const next = pending.then(() => launch(tab));
    pending = next.catch(() => {});
    return next;
  };
}
export function openEditorControls(tab, api = chrome) {
  if (!launchers.has(api)) launchers.set(api, createControlsLauncher(api));
  return launchers.get(api)(tab);
}
