import test from 'node:test';
import assert from 'node:assert/strict';
import { effectMakerOperation } from '../extension/adapter.js';
import { digest, sourceDigest } from '../lib/archive.js';
import { createOperationRuntime } from '../extension/runtime.js';

import { BUILD, setup } from '../fixtures/editor-model.js';

test('incompatible build and non-editor pages fail before model operations', async () => {
  setup({ build: 'unknown' });
  await assert.rejects(effectMakerOperation('inspect'), /Unsupported editor build/);
  globalThis.location.hostname = 'example.com';
  await assert.rejects(effectMakerOperation('inspect'), /Open an Effect Maker/);
});

test('source capture, preview and apply/save work with an arbitrary destination name', async () => {
  const { trace } = setup();
  const archive = await effectMakerOperation('export');
  archive.project.id = 'origin';
  const preview = await effectMakerOperation('preview-import', { archive });
  assert.equal(preview.destination.id, 'destination');
  assert.equal(preview.destination.title, 'Summer effect');
  assert.deepEqual(trace, []);
  const result = await effectMakerOperation('import', { archive, destinationId: 'destination', expectedSourceSha256: archive.sourceSha256, expectedDestinationSha256: preview.destinationSourceSha256 });
  assert.equal(result.status, 'saved-reload-required');
  assert.deepEqual(trace, [{ applyEffectSourceCommand: { effectSourceJspb: '[]', assetsJspb: [] } }, 'saved']);
});

test('same-project, occupied destination and changed preview refuse writes', async () => {
  const { trace } = setup(); const archive = await effectMakerOperation('export');
  await assert.rejects(effectMakerOperation('preview-import', { archive }), /different, empty project/);
  archive.project.id = 'origin';
  await assert.rejects(effectMakerOperation('import', { archive, destinationId: 'wrong' }), /preview is stale/);
  assert.deepEqual(trace, []);
  const occupied = setup({ occupied: true });
  await assert.rejects(effectMakerOperation('preview-import', { archive }), /not empty/);
  assert.deepEqual(occupied.trace, []);
});

test('dirty model is not exported as a saved checkpoint', async () => {
  setup({ dirty: true });
  await assert.rejects(effectMakerOperation('export'), /finished saving/);
});

function setupBinaryImport() {
  const state = setup();
  const { ns, trace } = state;
  ns.tM = source => source.value[0];
  ns.wy = tree => new Map(tree.map(raw => [raw[0], {
    raw, getId: () => raw[0], pa: () => raw[1], Qa: () => raw[0], Ta: () => raw
  }]));
  ns.zy = raw => raw[2]; ns.ixa = (raw, id) => { raw[2] = id; };
  ns.Dy = asset => asset.raw; ns.Cy = raw => raw[2]; ns.nxa = (raw, id) => { raw[2] = id; };
  ns.yy = asset => asset.raw; ns.xy = raw => raw[2]; ns.nG = (raw, field, ids) => { assert.equal(field, 1); raw[2] = ids; };
  ns.Vwa = source => new Map((source.value[0] ?? []).flatMap(raw => (raw[1] === 6 ? raw[2] : [raw[2]]).map(id => [id, {}])));
  let uploadIndex = 0;
  ns.tS = async (service, file, options) => {
    const id = 'new-binary-' + ++uploadIndex;
    trace.push({ upload: id, mime: file.type, bytes: Buffer.from(await file.arrayBuffer()), name: options.fileName });
    return { Ba: () => id, serialize: () => JSON.stringify([id]) };
  };
  const source = [[['image-object', 4, 'old-image'], ['sequence-object', 6, ['old-image', 'old-frame']], ['model-object', 8, 'old-model']], { userText: 'old-image', graph: [['tap-node', 'set-node']] }];
  const assets = [['old-image', 'image/png'], ['old-frame', 'image/png'], ['old-model', 'model/gltf-binary']].map(([id, mime]) => {
    const bytes = Buffer.from(id + '-bytes');
    return { id, mime, size: bytes.length, sha256: digest(bytes), base64: bytes.toString('base64') };
  });
  const archive = { format: 'effect-maker-source-archive', version: 1, project: { id: 'origin', title: 'Source', build: BUILD }, source, sourceSha256: sourceDigest(source), assets };
  return { ...state, archive };
}

async function restoreArguments(archive) {
  const preview = await effectMakerOperation('preview-import', { archive });
  return { archive, destinationId: 'destination', expectedSourceSha256: archive.sourceSha256, expectedDestinationSha256: preview.destinationSourceSha256 };
}

test('PNG, sequence and GLB remap only binary references, preserving authoring IDs, text and links', async () => {
  const { trace, archive } = setupBinaryImport();
  const args = await restoreArguments(archive);
  assert.deepEqual(trace, []);
  const result = await effectMakerOperation('import', args);
  assert.equal(result.status, 'saved-reload-required');
  assert.equal(result.remappedAssets.length, 3);
  const uploads = trace.filter(t => t.upload);
  assert.deepEqual(uploads.map(t => t.bytes.toString()), ['old-image-bytes', 'old-frame-bytes', 'old-model-bytes']);
  const command = trace.find(t => t.applyEffectSourceCommand).applyEffectSourceCommand;
  const restored = JSON.parse(command.effectSourceJspb);
  assert.deepEqual(restored, [[['image-object', 4, 'new-binary-1'], ['sequence-object', 6, ['new-binary-1', 'new-binary-2']], ['model-object', 8, 'new-binary-3']], { userText: 'old-image', graph: [['tap-node', 'set-node']] }]);
  assert.equal(command.assetsJspb.length, 3);
  assert.equal(trace.at(-1), 'saved');
});

test('cross-account import uses destination upload records and preserves AI authoring references', async () => {
  const { ns, model, trace, archive } = setupBinaryImport();
  const oldChannel = 'source-channel';
  model.v.Ke = () => 'destination-channel';
  for (const asset of archive.assets) {
    asset.record = [asset.id, [asset.id, oldChannel, null, 'original-name'], null, [asset.mime, asset.size]];
  }
  const prompt = ['prompt-asset', 10, { text: 'Turn the subject into a watercolour portrait', referenceImages: ['image-object'] }];
  const canvas = ['result-canvas', 11, {}];
  archive.source[0].push(prompt, canvas);
  archive.source[1].ai = { input: 'image-object', prompt: 'prompt-asset', result: 'result-canvas' };
  archive.sourceSha256 = sourceDigest(archive.source);
  const dependencies = ns.Vwa;
  ns.Vwa = source => dependencies({ value: [(source.value[0] ?? []).filter(raw => [4, 6, 8].includes(raw[1]))] });
  const upload = ns.tS;
  const newRecords = [];
  ns.tS = async (service, file, options) => {
    assert.equal(options.channelId, 'destination-channel');
    assert.equal(options.Td, 'destination');
    const result = await upload(service, file, options);
    const record = [result.Ba(), [result.Ba(), options.channelId, null, options.fileName], null, [file.type, file.size]];
    newRecords.push(record);
    return { Ba: result.Ba, serialize: () => JSON.stringify(record) };
  };
  await effectMakerOperation('import', await restoreArguments(archive));
  const applied = trace.find(item => item.applyEffectSourceCommand).applyEffectSourceCommand;
  assert.equal(newRecords.length, archive.assets.length);
  assert.deepEqual(applied.assetsJspb.map(record => JSON.parse(record)), newRecords);
  assert.equal(JSON.stringify(applied).includes(oldChannel), false);
  const restored = JSON.parse(applied.effectSourceJspb);
  assert.deepEqual(restored[0].slice(-2), [prompt, canvas]);
  assert.deepEqual(restored[1].ai, archive.source[1].ai);
});

test('corrupt assets and unsupported remapping fail before uploads', async () => {
  const { ns, trace, archive } = setupBinaryImport();
  const validHash = archive.assets[0].sha256;
  archive.assets[0].sha256 = '0'.repeat(64);
  await assert.rejects(effectMakerOperation('preview-import', { archive }), /checksum/);
  assert.deepEqual(trace, []);
  archive.assets[0].sha256 = validHash;
  delete ns.nxa;
  await assert.rejects(effectMakerOperation('preview-import', { archive }), /nxa/);
  assert.deepEqual(trace, []);
});

test('navigation during upload prevents application and save', async () => {
  const { ns, trace, archive } = setupBinaryImport();
  const args = await restoreArguments(archive);
  const originalUpload = ns.tS;
  ns.tS = async (...params) => {
    const result = await originalUpload(...params);
    globalThis.location.pathname = '/edit/another-project';
    return result;
  };
  await assert.rejects(effectMakerOperation('import', args), /Destination changed/);
  assert.equal(trace.filter(t => t.upload).length, 1);
  assert.equal(trace.some(t => t.applyEffectSourceCommand || t === 'saved'), false);
});

test('a no-op command handler cannot be reported as a successful import', async () => {
  const { ns, trace, archive } = setupBinaryImport();
  const originalResolve = ns.I().resolve;
  ns.I = () => ({ resolve: token => token === ns.Vs ? { resolveCommand: async () => { trace.push('no-op'); } } : originalResolve(token) });
  const args = await restoreArguments(archive);
  await assert.rejects(effectMakerOperation('import', args), /did not apply the expected source/);
  assert.equal(trace.includes('saved'), false);
});

test('save failure is reported instead of returning saved status', async () => {
  const { model, archive } = setupBinaryImport();
  const args = await restoreArguments(archive);
  model.save = async () => { throw new Error('simulated revision conflict'); };
  await assert.rejects(effectMakerOperation('import', args), /simulated revision conflict/);
});

test('upload timeout exits and a late upload cannot apply or save the project', async () => {
  const { ns, trace, archive } = setupBinaryImport();
  const args = await restoreArguments(archive);
  const upload = Promise.withResolvers();
  const entered = Promise.withResolvers();
  ns.tS = (service, file, options) => {
    assert.equal(options.channelId, 'test-channel');
    assert.equal(options.Td, 'destination');
    entered.resolve();
    return upload.promise;
  };
  const runtime = createOperationRuntime({ limits: { upload: 20 } });
  try {
    const importing = effectMakerOperation('import', args, runtime);
    const rejected = assert.rejects(importing, error => error.code === 'TIMEOUT' && error.stage === 'upload' && error.reloadRequired);
    await entered.promise;
    await rejected;
    upload.resolve({ Ba: () => 'late-upload', serialize: () => '[]' });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(trace.some(item => item.applyEffectSourceCommand || item === 'saved'), false);
    await assert.rejects(effectMakerOperation('preview-import', { archive }), /Reload the editor/);
  } finally { runtime.finish(); }
});

test('native boolean dispatcher is not awaited instead of the actual completion promise', async () => {
  const { ns, trace, archive, model, setSource } = setupBinaryImport();
  const args = await restoreArguments(archive);
  const applied = Promise.withResolvers();
  const entered = Promise.withResolvers();
  ns.FQ = (handler, command) => {
    entered.resolve();
    return { handled: true, completion: applied.promise.then(() => {
      trace.push(command);
      setSource(JSON.parse(command.applyEffectSourceCommand.effectSourceJspb));
      model.ha.value = 1;
    }) };
  };
  const resolve = ns.I().resolve;
  ns.I = () => ({ resolve: token => token === ns.Vs ? { resolveCommand: () => { throw new Error('The boolean-only API must not be called.'); } } : resolve(token) });
  const importing = effectMakerOperation('import', args);
  await entered.promise;
  assert.equal(trace.includes('saved'), false);
  applied.resolve();
  assert.equal((await importing).status, 'saved-reload-required');
  assert.equal(trace.at(-1), 'saved');
});

test('asynchronous apply failure is caught and never followed by save', async () => {
  const { ns, trace, archive } = setupBinaryImport();
  const args = await restoreArguments(archive);
  ns.FQ = () => ({ handled: true, completion: Promise.reject(new Error('source application failed')) });
  await assert.rejects(effectMakerOperation('import', args), error => /source application failed/.test(error.message) && error.reloadRequired);
  assert.equal(trace.includes('saved'), false);
});

test('save timeout reports an uncertain result and blocks repeated imports', async () => {
  const { model, archive } = setupBinaryImport();
  const args = await restoreArguments(archive);
  model.save = () => new Promise(() => {});
  const runtime = createOperationRuntime({ limits: { save: 20 } });
  try {
    await assert.rejects(effectMakerOperation('import', args, runtime), error => error.code === 'TIMEOUT' && error.stage === 'save' && error.reloadRequired);
    await assert.rejects(effectMakerOperation('import', args), /Reload the editor/);
  } finally { runtime.finish(); }
});

test('cancelling during upload prevents subsequent commands and parallel imports', async () => {
  const { ns, trace, archive } = setupBinaryImport();
  const args = await restoreArguments(archive);
  const entered = Promise.withResolvers();
  const upload = Promise.withResolvers();
  ns.tS = () => { entered.resolve(); return upload.promise; };
  const runtime = createOperationRuntime();
  try {
    const importing = effectMakerOperation('import', args, runtime);
    const rejected = assert.rejects(importing, error => error.code === 'CANCELLED' && error.reloadRequired);
    await entered.promise;
    await assert.rejects(effectMakerOperation('import', args), /already running/);
    runtime.cancel();
    await rejected;
    upload.resolve({ Ba: () => 'late-upload', serialize: () => '[]' });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(trace.some(item => item.applyEffectSourceCommand || item === 'saved'), false);
  } finally { runtime.finish(); }
});

test('missing completion API or channel fails before asset upload', async () => {
  const { ns, trace, archive, model } = setupBinaryImport();
  const fq = ns.FQ;
  delete ns.FQ;
  await assert.rejects(effectMakerOperation('preview-import', { archive }), /FQ/);
  assert.deepEqual(trace, []);
  ns.FQ = fq;
  const args = await restoreArguments(archive);
  model.v.Ke = () => undefined;
  await assert.rejects(effectMakerOperation('import', args), /channel is not ready/);
  assert.deepEqual(trace, []);
});

function setupBinaryExport() {
  const state = setupBinaryImport();
  state.setSource(state.archive.source);
  for (const asset of state.archive.assets) state.model.ba.value.set(asset.id, {
    toJSON: () => [asset.id], getMetadata: () => ({ toJSON: () => [asset.mime] })
  });
  state.ns.BA = (service, id) => 'https://effects.usercontent.youtube.com/asset/download/channel/test-channel/blueprint/destination/asset/' + id;
  return state;
}

test('binary export preserves bytes and passes its abort signal to the download', async t => {
  const state = setupBinaryExport();
  const downloads = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    downloads.push({ url, options });
    const asset = state.archive.assets.find(item => url.endsWith('/' + item.id));
    return new Response(Buffer.from(asset.base64, 'base64'), { headers: { 'content-type': asset.mime } });
  });
  const exported = await effectMakerOperation('export');
  assert.equal(exported.assets.length, 3);
  assert.deepEqual(exported.assets.map(asset => [asset.id, asset.base64, asset.sha256]), state.archive.assets.map(asset => [asset.id, asset.base64, asset.sha256]));
  assert.equal(exported.sourceSha256, state.archive.sourceSha256);
  assert.equal(downloads.every(item => item.options.signal instanceof AbortSignal), true);
});

test('stalled asset download times out without returning a partial archive', async t => {
  setupBinaryExport();
  let signal;
  t.mock.method(globalThis, 'fetch', (url, options) => {
    signal = options.signal;
    return new Promise(() => {});
  });
  const runtime = createOperationRuntime({ limits: { download: 20 } });
  try {
    await assert.rejects(effectMakerOperation('export', {}, runtime), error => error.code === 'TIMEOUT' && error.stage === 'download' && !error.reloadRequired);
    assert.equal(signal.aborted, true);
  } finally { runtime.finish(); }
});
