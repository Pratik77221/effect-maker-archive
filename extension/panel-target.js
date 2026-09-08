// Only the extension's own launcher can retarget its existing controls window.
export function createPanelTargetHandler({ extensionId, url, ui, select }) {
  return (message, sender, respond) => {
    if (sender.id !== extensionId || sender.tab || message?.type !== 'ema:select-project' || message.targetUrl !== url) return;
    if (!Number.isInteger(message.tabId) || message.tabId < 0 || !/^[\w-]+$/.test(message.projectId || '')) return;
    if (ui.host.dataset.busy === 'true') { respond({ status: 'busy' }); return; }
    respond({ status: 'selected' });
    select({ tabId: message.tabId, projectId: message.projectId });
  };
}
