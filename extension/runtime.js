// Included in the static editor bundle. No requests, editor access or credentials.
export function createOperationRuntime(options = {}) {
  // Limit individual steps, not the sum of all asset transfers in a project.
  const defaults = { validation: 30000, download: 30000, upload: 90000, apply: 20000, save: 60000, file: 15000, auth: 180000 };
  const limits = Object.fromEntries(Object.entries(defaults).map(([name, value]) => {
    const override = options.limits?.[name];
    return [name, Number.isFinite(override) && override > 0 ? Math.min(value, override) : value];
  }));
  const controller = new AbortController();
  const started = Date.now();
  let finished = false;
  let writesStarted = false;
  let current = { stage: 'prepare', message: 'Preparing…', startedAt: started, limitMs: null };
  const events = [];
  const snapshot = () => ({
    extensionVersion: '0.4.4', operation: options.operation ?? 'project operation',
    startedAt: new Date(started).toISOString(), elapsedMs: Date.now() - started,
    stage: current.stage, message: current.message, stageElapsedMs: Date.now() - current.startedAt,
    stageLimitMs: current.limitMs, totalLimitMs: null, writesStarted,
    events: events.map(event => ({ ...event }))
  });
  const notify = () => { try { options.onProgress?.({ ...snapshot(), ...current }); } catch {} };
  function makeError(message, code) {
    const error = new Error(message);
    error.code = code;
    return error;
  }
  function stop(error) {
    if (!controller.signal.aborted && !finished) controller.abort(error);
  }
  const check = () => {
    if (controller.signal.aborted) throw controller.signal.reason;
    if (finished) throw makeError('This operation has already ended.', 'OPERATION_ENDED');
  };
  async function guard(work) {
    check();
    let onAbort;
    const interrupted = new Promise((resolve, reject) => {
      onAbort = () => reject(controller.signal.reason);
      controller.signal.addEventListener('abort', onAbort, { once: true });
      if (controller.signal.aborted) onAbort();
    });
    try {
      const value = await Promise.race([Promise.resolve().then(() => { check(); return work(); }), interrupted]);
      check();
      return value;
    } finally { controller.signal.removeEventListener('abort', onAbort); }
  }
  async function wait(stage, message, work, metadata = {}) {
    check();
    const limitMs = limits[stage] ?? limits.validation;
    current = { ...metadata, stage, message, startedAt: Date.now(), limitMs };
    events.push({ stage, message, atMs: Date.now() - started, ...metadata });
    if (events.length > 100) events.shift();
    notify();
    let timer;
    let onAbort;
    const workPromise = Promise.resolve().then(() => { check(); return work(); });
    const interrupted = new Promise((resolve, reject) => {
      onAbort = () => reject(controller.signal.reason);
      controller.signal.addEventListener('abort', onAbort, { once: true });
      if (controller.signal.aborted) onAbort();
      timer = setTimeout(() => stop(makeError(message.replace(/[…\s]+$/, '') + ' timed out after ' + Math.ceil(limitMs / 1000) + ' seconds.', 'TIMEOUT')), limitMs);
    });
    try {
      const value = await Promise.race([workPromise, interrupted]);
      check();
      return value;
    } finally {
      clearTimeout(timer);
      controller.signal.removeEventListener('abort', onAbort);
    }
  }
  function error(reason) {
    if (reason?.effectMakerOperationError) return reason;
    const original = reason instanceof Error ? reason : new Error(String(reason));
    const failure = new Error(original.message + (writesStarted ? ' Reload the editor before another import; uploaded files or project changes may remain.' : ''));
    failure.name = original.name;
    failure.code = original.code ?? (original.name === 'AbortError' ? 'CANCELLED' : 'OPERATION_FAILED');
    failure.stage = current.stage;
    failure.reloadRequired = writesStarted || !!original.reloadRequired;
    failure.details = snapshot();
    failure.effectMakerOperationError = true;
    return failure;
  }
  return {
    signal: controller.signal, wait, guard, check, error, snapshot,
    report(progress) {
      check();
      if (!progress || typeof progress.message !== 'string') return;
      current = { stage: progress.stage, message: progress.message, startedAt: Date.now() - (progress.stageElapsedMs || 0), limitMs: progress.stageLimitMs ?? null };
      writesStarted ||= !!progress.writesStarted;
      if (Array.isArray(progress.events)) events.splice(0, events.length, ...progress.events.slice(-100));
      notify();
    },
    get writesStarted() { return writesStarted; },
    markWrite() { check(); writesStarted = true; notify(); },
    cancel() { stop(makeError('Operation cancelled.', 'CANCELLED')); },
    finish() { finished = true; }
  };
}
