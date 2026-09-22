import { renderEditorPanel } from './editor-panel.js';
import { createEditorBridge } from './editor-bridge.js';
import { mountGitHubPanel } from './github-panel.js';
import { prepareStorage } from './github-auth.js';
import { createPanelTargetHandler } from './panel-target.js';
import { mountUpdatePanel } from './update-panel.js';

try {
  await prepareStorage();
  const params = new URLSearchParams(location.search);
  const tabId = Number(params.get('tab'));
  const projectId = params.get('project');
  if (!params.has('tab')) throw new Error('Open an Effect Maker project and click the extension icon to connect this panel.');
  const bridge = createEditorBridge({ tabId, projectId });
  const ui = renderEditorPanel(bridge.invoke, { sidePanel: true, github: true, updates: true, onReload: async () => {
    await bridge.reload(); location.reload();
  } });
  mountUpdatePanel(ui, {
    manifest: chrome.runtime.getManifest(),
    requestAccess: action => chrome.permissions.request({ origins: action === 'install' ? ['https://github.com/*', 'https://release-assets.githubusercontent.com/*'] : ['https://api.github.com/*'] }),
    reloadExtension: () => chrome.runtime.reload(),
    installedFile: async path => {
      const response = await fetch(chrome.runtime.getURL(path), { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not read the running extension. Download and install the release ZIP.');
      return new Uint8Array(await response.arrayBuffer());
    }
  });
  document.getElementById('panel-start').hidden = true;
  chrome.runtime.onMessage.addListener(createPanelTargetHandler({ extensionId: chrome.runtime.id, url: location.href, ui, select: ({ tabId, projectId }) => {
    location.replace(chrome.runtime.getURL('panel.html') + '?tab=' + tabId + '&project=' + encodeURIComponent(projectId));
  } }));
  let authWindowId, authWindowCode;
  mountGitHubPanel(ui, {
    invoke: bridge.invoke, projectId,
    requestAccess: () => chrome.permissions.request({ origins: ['https://api.github.com/*', 'https://github.com/*'] }),
    openAuthPage: async (url, code) => {
      if (authWindowId !== undefined) {
        try {
          const window = await chrome.windows.get(authWindowId, { populate: true });
          if (authWindowCode !== code && window.tabs?.[0]) await chrome.tabs.update(window.tabs[0].id, { url });
          await chrome.windows.update(authWindowId, { focused: true });
          authWindowCode = code; return;
        }
        catch { authWindowId = undefined; }
      }
      authWindowId = (await chrome.windows.create({ url, type: 'popup', width: 680, height: 760 })).id;
      authWindowCode = code;
    }
  });
  window.addEventListener('pagehide', () => { bridge.cancel().catch(() => {}); });
} catch (error) {
  document.getElementById('panel-message').textContent = error.message;
}
