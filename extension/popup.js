// Compatibility launcher for an installation whose old manifest is still loaded.
import { openEditorControls } from './launch.js';

try {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await openEditorControls(tab);
  window.close();
} catch (error) {
  document.getElementById('result').textContent = error.message;
}
