import { createOperationRuntime } from './runtime.js';
import { effectMakerOperation } from './adapter.js';

// These functions execute in the selected editor only. Their registry contains
// project operations and progress, never GitHub credentials or commands.
export function startEditorJob(operation, input, jobId, projectId) {
  if (location.origin !== 'https://effects.youtube.com' || location.pathname !== '/edit/' + projectId || !/^[\w-]+$/.test(projectId)) throw new Error('The selected editor changed. Open the extension again on the destination project.');
  if (!['inspect', 'export', 'preview-import', 'import'].includes(operation) || !/^[a-f0-9-]{36}$/.test(jobId)) throw new Error('Invalid editor operation.');
  const oldPanel = document.getElementById('em-local-archive-controls');
  if (oldPanel?.dataset.busy === 'true') throw new Error('An older operation is still running. Reload the editor before using this version.');
  const jobs = window[Symbol.for('effect-maker-archive.jobs')] ??= new Map();
  if ([...jobs.values()].some(job => !job.done)) throw new Error('An editor operation is already running. Wait for it to finish, or reload the editor after an interrupted import.');
  // A completed result is retained briefly so a missed poll can retry.
  for (const [id, job] of jobs) if (job.done) jobs.delete(id);
  const task = createOperationRuntime({ operation });
  const job = { projectId, task, done: false };
  jobs.set(jobId, job);
  Promise.resolve().then(() => effectMakerOperation(operation, input, task)).then(result => {
    job.result = result;
  }).catch(reason => {
    const error = task.error(reason);
    job.error = { message: error.message, code: error.code, stage: error.stage, reloadRequired: error.reloadRequired, details: error.details };
  }).finally(() => {
    job.progress = task.snapshot();
    job.done = true;
    task.finish();
    setTimeout(() => { if (jobs.get(jobId) === job) jobs.delete(jobId); }, 120000);
  });
  return { jobId };
}
export function readEditorJob(jobId, projectId) {
  if (location.origin !== 'https://effects.youtube.com' || location.pathname !== '/edit/' + projectId) throw new Error('The editor navigated away. Open the extension again on your project.');
  const job = window[Symbol.for('effect-maker-archive.jobs')]?.get(jobId);
  if (!job || job.projectId !== projectId) throw new Error('The editor operation is no longer available. Reload after an interrupted import.');
  return { done: job.done, progress: job.progress ?? job.task.snapshot(), ...(job.done ? { result: job.result, error: job.error } : {}) };
}
export function cancelEditorJob(jobId, projectId) {
  if (location.origin !== 'https://effects.youtube.com' || location.pathname !== '/edit/' + projectId) return;
  const job = window[Symbol.for('effect-maker-archive.jobs')]?.get(jobId);
  if (job?.projectId === projectId && !job.done) job.task.cancel();
}
export function releaseEditorJob(jobId, projectId) {
  if (location.origin !== 'https://effects.youtube.com' || location.pathname !== '/edit/' + projectId) return;
  const jobs = window[Symbol.for('effect-maker-archive.jobs')];
  const job = jobs?.get(jobId);
  if (job?.projectId === projectId && job.done) jobs.delete(jobId);
}
