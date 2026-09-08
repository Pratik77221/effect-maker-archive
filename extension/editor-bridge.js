import { startEditorJob } from './editor-job.bundle.js';
import { readEditorJob, cancelEditorJob, releaseEditorJob } from './editor-job.js';
import { abortableDelay } from './github-auth.js';

export function createEditorBridge({ tabId, projectId }, api = chrome) {
  if (!Number.isInteger(tabId) || !/^[\w-]+$/.test(projectId)) throw new Error('Open this panel using the extension icon on an Effect Maker project.');
  const execute = async (func, args) => {
    const results = await api.scripting.executeScript({ target: { tabId }, world: 'MAIN', func, args });
    if (!results.length || results[0].error) throw new Error('The editor could not finish this operation. Reopen the extension on the project tab.');
    return results[0].result;
  };
  let activeJob;
  async function invoke(operation, input, task) {
    const tab = await api.tabs.get(tabId);
    if (!new RegExp('^https://effects\\.youtube\\.com/edit/' + projectId + '(?:[?#].*)?$').test(tab.url || '')) throw new Error('The selected project tab changed. Reopen the extension on your project.');
    task.check();
    const jobId = crypto.randomUUID();
    activeJob = jobId;
    const cancel = () => { execute(cancelEditorJob, [jobId, projectId]).catch(() => {}); };
    task.signal.addEventListener('abort', cancel, { once: true });
    try {
      if (new TextEncoder().encode(JSON.stringify(input)).length > 60 * 1024 * 1024) throw new Error('The project file exceeds the extension’s transfer limit.');
      // Once import is dispatched it may write before the next progress poll.
      // Cancellation during that interval therefore requires an editor reload.
      if (operation === 'import') task.markWrite();
      await execute(startEditorJob, [operation, input, jobId, projectId]);
      if (task.signal.aborted) cancel();
      while (true) {
        task.check();
        const state = await execute(readEditorJob, [jobId, projectId]);
        task.check();
        task.report?.(state.progress);
        if (state.done) {
          if (state.error) {
            const error = Object.assign(new Error(state.error.message), state.error, { effectMakerOperationError: true });
            throw error;
          }
          return state.result;
        }
        await abortableDelay(600, task.signal);
      }
    } finally {
      task.signal.removeEventListener('abort', cancel);
      execute(releaseEditorJob, [jobId, projectId]).catch(() => {});
      if (activeJob === jobId) activeJob = undefined;
    }
  }
  return {
    invoke,
    cancel: () => activeJob ? execute(cancelEditorJob, [activeJob, projectId]) : Promise.resolve(),
    reload: () => api.tabs.reload(tabId)
  };
}
