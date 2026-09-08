import { openEditorControls } from './launch.js';

// The sole worker event is a deliberate toolbar click. No automatic tab hooks.
chrome.action.onClicked.addListener(async tab => {
  try {
    await openEditorControls(tab);
    await chrome.action.setBadgeText({ tabId: tab.id, text: '' });
    await chrome.action.setTitle({ tabId: tab.id, title: 'Effect Maker Archive' });
  } catch (error) {
    if (Number.isInteger(tab?.id)) {
      // The tab may have closed while the injection was in flight.
      await Promise.allSettled([
        chrome.action.setBadgeText({ tabId: tab.id, text: '!' }),
        chrome.action.setTitle({ tabId: tab.id, title: error.message })
      ]);
    }
  }
});
