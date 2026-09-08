import test from 'node:test';
import assert from 'node:assert/strict';
import { createOperationRuntime } from '../extension/runtime.js';

test('total deadline interrupts a promise that never resolves', async () => {
  const task = createOperationRuntime({ limits: { total: 20 } });
  try {
    await assert.rejects(task.guard(() => new Promise(() => {})), error => error.code === 'TIMEOUT');
    assert.equal(task.signal.aborted, true);
    assert.equal(task.error(task.signal.reason).reloadRequired, false);
  } finally { task.finish(); }
});

test('apply deadline carries the failing stage and prevents later work', async () => {
  const progress = [];
  const task = createOperationRuntime({ limits: { apply: 20 }, onProgress: value => progress.push(value) });
  try {
    await assert.rejects(task.wait('apply', 'Applying objects and scripts…', () => {
      task.markWrite();
      return new Promise(() => {});
    }), error => error.code === 'TIMEOUT');
    const error = task.error(task.signal.reason);
    assert.equal(error.stage, 'apply');
    assert.equal(error.reloadRequired, true);
    assert.equal(progress[0].message, 'Applying objects and scripts…');
    let called = false;
    await assert.rejects(task.guard(() => { called = true; }));
    assert.equal(called, false);
  } finally { task.finish(); }
});

test('finishing clears deadlines and a progress callback cannot break the operation', async () => {
  const task = createOperationRuntime({ limits: { total: 25, validation: 10 }, onProgress: () => { throw new Error('detached UI'); } });
  assert.equal(await task.wait('validation', 'Checking…', () => 42), 42);
  task.finish();
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal(task.signal.aborted, false);
});

test('cancellation is immediate and preserves the pending-operation diagnostic', async () => {
  const task = createOperationRuntime();
  try {
    const entered = Promise.withResolvers();
    const pending = task.wait('upload', 'Uploading asset 2 of 3…', () => {
      task.markWrite(); entered.resolve(); return new Promise(() => {});
    }, { completed: 1, total: 3, assetId: 'local-test-asset', bytes: 82 });
    const rejected = assert.rejects(pending, error => error.code === 'CANCELLED');
    await entered.promise;
    task.cancel();
    await rejected;
    const diagnostic = task.error(task.signal.reason);
    assert.equal(diagnostic.details.events[0].completed, 1);
    assert.equal(diagnostic.details.events[0].total, 3);
    assert.equal(diagnostic.reloadRequired, true);
  } finally { task.finish(); }
});
