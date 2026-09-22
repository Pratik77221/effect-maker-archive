import test from 'node:test';
import assert from 'node:assert/strict';
import { createOperationRuntime } from '../extension/runtime.js';

test('multiple uploads can exceed three minutes and each keeps its full stage window', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'] });
  const task = createOperationRuntime({ operation: 'import' });
  try {
    for (let asset = 1; asset <= 4; asset++) {
      const pending = task.wait('upload', 'Uploading asset ' + asset + ' of 4…', () => {
        task.markWrite();
        return new Promise(resolve => setTimeout(() => resolve(asset), 80000));
      });
      await Promise.resolve();
      t.mock.timers.tick(80000);
      assert.equal(await pending, asset);
      assert.equal(task.snapshot().stageLimitMs, 90000);
      assert.equal(task.signal.aborted, false);
    }
    assert.equal(task.snapshot().elapsedMs, 320000);
    assert.equal(task.snapshot().totalLimitMs, null);
    assert.equal(await task.wait('apply', 'Applying…', () => 'applied'), 'applied');
    assert.equal(await task.wait('save', 'Saving…', () => 'saved'), 'saved');
  } finally { task.finish(); }
});

test('a long operation without a stage deadline remains cancellable', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'] });
  const task = createOperationRuntime();
  try {
    const pending = task.guard(() => new Promise(() => {}));
    const rejected = assert.rejects(pending, error => error.code === 'CANCELLED');
    await Promise.resolve();
    t.mock.timers.tick(600000);
    assert.equal(task.signal.aborted, false);
    task.cancel();
    await rejected;
    assert.equal(task.signal.aborted, true);
    assert.equal(task.error(task.signal.reason).reloadRequired, false);
  } finally { task.finish(); }
});

test('a later upload still times out at its own deadline after a long operation', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'] });
  const task = createOperationRuntime();
  try {
    t.mock.timers.tick(300000);
    const pending = task.wait('upload', 'Uploading…', () => { task.markWrite(); return new Promise(() => {}); });
    const rejected = assert.rejects(pending, error => error.code === 'TIMEOUT');
    await Promise.resolve();
    t.mock.timers.tick(89999);
    assert.equal(task.signal.aborted, false);
    t.mock.timers.tick(1);
    await rejected;
    const error = task.error(task.signal.reason);
    assert.equal(error.stage, 'upload');
    assert.equal(error.reloadRequired, true);
    assert.equal(error.details.elapsedMs, 390000);
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

test('completed stages clear deadlines and a progress callback cannot break the operation', async () => {
  const task = createOperationRuntime({ limits: { validation: 10 }, onProgress: () => { throw new Error('detached UI'); } });
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
