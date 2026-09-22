import { renderEditorPanel } from '../extension/editor-panel.js';
import { mountUpdatePanel } from '../extension/update-panel.js';
const ui = renderEditorPanel(() => { throw new Error('This preview never opens projects.'); }, { updates: true });
let folder;
const values = {};
let inflater = false;
try { new DecompressionStream('deflate-raw'); inflater = true; } catch {}
document.getElementById('capabilities').textContent = 'Browser APIs: folder picker ' + (typeof showDirectoryPicker === 'function' ? 'available' : 'unavailable') + '; ZIP decompression ' + (inflater ? 'available' : 'unavailable') + '.';
const version = '0.4.6';
const release = { available: true, version, tag: 'v' + version, sha256: 'a'.repeat(64),
  releaseUrl: 'https://github.com/Pratik77221/effect-maker-archive/releases/latest', zipUrl: 'https://github.com/Pratik77221/effect-maker-archive/releases/latest' };
mountUpdatePanel(ui, {
  manifest: { name: 'Effect Maker Archive', version: '0.4.5' },
  requestAccess: async () => true,
  checker: async () => release,
  pickFolder: async () => ({ name: 'effect-maker-archive', kind: 'directory', queryPermission: async () => 'granted' }),
  folderStore: { get: async () => folder, set: async value => { folder = value; }, clear: async () => { folder = undefined; } },
  settings: { get: async key => ({ [key]: values[key] }), set: async data => Object.assign(values, data), remove: async key => { delete values[key]; } },
  validateFolder: async () => {}, downloader: async () => new Uint8Array(), unpacker: async () => ({ manifest: { version } }),
  installer: async (folder, update, manifest, { onProgress }) => {
    onProgress('Installing verified files…');
    await new Promise(resolve => setTimeout(resolve, 1200));
    return { version };
  },
  reloadExtension: async () => { document.getElementById('reload-result').textContent = 'Simulated installation succeeded and requested an extension reload.'; }
});
