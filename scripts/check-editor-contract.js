// Offline integration check using separately downloaded, reviewed Google clients.
// No Google code is distributed with this repository or the extension package.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { digest } from '../lib/archive.js';
import { effectMakerOperation } from '../extension/adapter.js';

const clients = [
  { build: 'effectmaker.effectmaker.en_GB.k9eBOpQ9YWc.2020.O', sha256: 'f5ce71f0d7c60850b458033b069b6642798c8014acfd67a4f75b54f571ebd611',
    Model: 'hC', Project: 'NC', Source: 'XC', Record: 'GL', Apply: 'SZa', dispatch: 'FQ', AssetService: 'zA', upload: 'tS', uploadProject: 'Td', dependencies: 'Vwa',
    injector: 'I', Command: 'Vs', config: 'cn', handlers: 'ea', message: 'Ho' },
  { build: 'effectmaker.effectmaker.en_GB.gfHrZWkok9A.2020.O', sha256: 'ff8ee50a8ca67647f3b99049b9247852b13b1a29e54d280f96d91111bb7c706c',
    Model: 'gC', Project: 'MC', Source: 'WC', Record: 'EL', Apply: 'QZa', dispatch: 'CQ', AssetService: 'yA', upload: 'qS', uploadProject: 'Ud', dependencies: 'Wwa',
    injector: 'I', Command: 'Vs', config: 'cn', handlers: 'ea', message: 'Ho' },
  { build: 'effectmaker.effectmaker.en_GB.JjyImd5Sung.2020.O', sha256: '767c7f62dcb557060c2907a320496ef16f864548c16076f6d6820dc7ea4260ce',
    Model: 'lC', Project: 'RC', Source: 'aD', Record: 'GL', Apply: 'RZa', dispatch: 'EQ', AssetService: 'DA', upload: 'tS', uploadProject: 'Vd', dependencies: 'bxa',
    injector: 'K', Command: 'Ws', config: 'en', handlers: 'ga', message: 'Jo' }
];
if (process.argv.length !== clients.length + 2) throw new Error('Usage: node scripts/check-editor-contract.js <k9eBOpQ9YWc-client.js> <gfHrZWkok9A-client.js> <JjyImd5Sung-client.js>');

async function loadClient(filename, profile) {
  const code = await readFile(filename, 'utf8');
  assert.equal(digest(code), profile.sha256, 'Only use the independently reviewed client bytes.');
  const noop = () => {};
  const element = tag => ({ tagName: tag.toUpperCase(), style: {}, children: [], dataset: {},
    setAttribute: noop, getAttribute: () => null, removeAttribute: noop, addEventListener: noop,
    appendChild: child => child, querySelectorAll: () => [], querySelector: () => null,
    getContext: () => ({ fillRect: noop, clearRect: noop, getImageData: () => ({ data: new Uint8Array(4) }) }) });
  const document = { createElement: element, createElementNS: (_, tag) => element(tag),
    documentElement: element('html'), head: element('head'), body: element('body'),
    querySelectorAll: () => [], querySelector: () => null, getElementById: () => null,
    getElementsByTagName: () => [], addEventListener: noop, readyState: 'loading', cookie: '' };
  // Browser bootstrap is expected to stop: this context has no authenticated
  // session, fetch, XHR, real timers, DOM or network implementation.
  const context = vm.createContext({ document, navigator: { userAgent: 'Offline contract check', language: 'en-GB', languages: ['en-GB'] },
    location: { href: 'https://effects.youtube.com/home', protocol: 'https:', hostname: 'effects.youtube.com', pathname: '/home' },
    URL, TextEncoder, TextDecoder, atob, btoa, setTimeout: () => 1, clearTimeout: noop,
    setInterval: () => 1, clearInterval: noop, queueMicrotask: noop, addEventListener: noop,
    console: { log: noop, warn: noop, error: noop, info: noop, debug: noop },
    requestAnimationFrame: () => 1, cancelAnimationFrame: noop, performance: { now: () => 0 }, _DumpException: noop });
  const end = '\n}).call(this,this.default_effectmaker);';
  assert.equal(code.split(end).length, 2);
  vm.runInContext(code.replace(end, '\n_.archiveContractApply = ' + profile.Apply + ';' + end), context, { timeout: 5000 });
  const ns = context.default_effectmaker;
  assert.equal(typeof ns.archiveContractApply, 'function');
  assert.match(ns[profile.upload].toString(), new RegExp('c\\.' + profile.uploadProject));
  assert.match(ns[profile.upload].toString(), /c\.channelId/);
  assert.match(ns[profile.upload].toString(), /asset\/upload\/channel/);
  assert.match(ns[profile.Model].prototype.save.toString(), /async save/);
  return { profile, ns };
}

// Schema-shaped synthetic authoring source; no user project data.
const fields = values => {
  const result = [];
  for (const [field, value] of Object.entries(values)) result[Number(field) - 1] = value;
  return JSON.parse(JSON.stringify(result));
};
function sourceFixture() {
  const asset = (id, type, value) => fields({ 1: id, 2: id, [type]: value });
  const assets = [
    asset('image-object', 4, fields({ 6: 'old-image' })),
    asset('sequence-object', 6, [['old-image', 'old-frame']]),
    asset('model-object', 8, fields({ 7: 'old-model' })),
    asset('prompt-object', 10, [fields({ 1: 'Watercolour portrait of old-image', 5: [['image-object']] })]),
    asset('canvas-object', 11, [])
  ];
  const root = fields({ 1: 'asset-root', 2: 'Assets', 7: assets.map(a => a[0]) });
  const input = ['start-in', [['tap-node', 'on-tap-out']]];
  const output = ['on-tap-out', [['image-node', 'start-in']]];
  const graphNodes = [
    ['tap-node', fields({ 1: 'tap-node', 2: 1, 5: [['on-tap-out', output]] })],
    ['image-node', fields({ 1: 'image-node', 2: 58, 4: [['start-in', input]] })]
  ];
  return fields({
    2: fields({ 2: 'scene-root', 3: [
      ['scene-root', fields({ 1: 'scene-root', 2: 'Root', 10: ['object-one'] })],
      ['object-one', ['object-one', 'Named object']]
    ] }),
    3: fields({ 2: 'asset-root', 3: [root, ...assets].map(a => [a[0], a]) }),
    4: fields({ 2: graphNodes, 4: [['subgraph-one', fields({ 1: 'subgraph-one', 2: 'Subgraph', 5: [['sub-node', ['sub-node', 1]]] })]] })
  });
}

function install({ profile, ns }, projectId, source = []) {
  const parse = (Type, value) => { const data = JSON.parse(JSON.stringify(value)); ns.id(data, 32); return new Type(data); };
  const model = new ns[profile.Model]({}, {}, {});
  model.v = parse(ns[profile.Project], fields({ 1: 'channel-' + projectId, 2: projectId, 4: source, 9: 'Any project name' }));
  const trace = [];
  // Native source application and dispatcher, with cloud save/transfer mocked.
  model.save = async () => { trace.push('saved'); model.ha.next(0); };
  const apply = new ns.archiveContractApply(model);
  const handler = { ha: true, [profile.handlers]: [], ba: { applyEffectSourceCommand: () => ({ resolve: command => apply.resolveCommand(command) }) },
    resolveCommand: command => ns[profile.dispatch](handler, command).handled };
  const service = { channelId: 'channel-' + projectId, [profile.uploadProject]: projectId };
  ns[profile.injector] = () => ({ resolve: token => token === ns[profile.Model] ? model : token === ns[profile.Command] ? handler : token === ns[profile.AssetService] ? service : undefined });
  ns[profile.config] = (_, fallback) => fallback;
  ns[profile.upload] = async (_, file, options) => {
    assert.equal(options.channelId, 'channel-' + projectId);
    assert.equal(options[profile.uploadProject], projectId);
    for (const other of clients) if (other.uploadProject !== profile.uploadProject) assert.equal(Object.hasOwn(options, other.uploadProject), false);
    const id = 'new-binary-' + trace.length;
    const bytes = Buffer.from(await file.arrayBuffer());
    trace.push({ id, bytes });
    return parse(ns[profile.Record], [id, [id, options.channelId, null, options.fileName], null, [file.type, file.size]]);
  };
  globalThis.document = { scripts: [{ src: 'https://www.youtube.com/s/_/effectmaker/_/js/k=' + profile.build + '/m=base' }] };
  globalThis.location = { hostname: 'effects.youtube.com', pathname: '/edit/' + projectId };
  globalThis.window = { default_effectmaker: ns };
  return { model, trace, parse };
}

const loaded = await Promise.all(clients.map((profile, index) => loadClient(process.argv[index + 2], profile)));
const originalFetch = globalThis.fetch;
try {
  const roundTrips = clients.flatMap((_, from) => clients.slice(from).map((_, offset) => [from, from + offset]));
  for (const [from, to] of roundTrips) {
    const source = install(loaded[from], 'origin', sourceFixture());
    const binaries = new Map([['old-image', 'image/png'], ['old-frame', 'image/png'], ['old-model', 'model/gltf-binary']].map(([id, mime]) => [id, { mime, bytes: Buffer.from(id + '-bytes') }]));
    for (const [id, { mime, bytes }] of binaries) source.model.ba.value.set(id, source.parse(loaded[from].ns[clients[from].Record], [id, [id, 'channel-origin'], null, [mime, bytes.length]]));
    globalThis.fetch = async (url, options) => {
      assert.equal(new URL(url).hostname, 'effects.usercontent.youtube.com');
      assert.match(new URL(url).pathname, /\/blueprint\/origin\/asset\//);
      assert.equal(options.credentials, 'include');
      const binary = binaries.get(new URL(url).pathname.split('/').at(-1));
      return new Response(binary.bytes, { headers: { 'content-type': binary.mime } });
    };
    const archive = await effectMakerOperation('export');
    assert.equal(archive.project.build, clients[from].build);
    assert.equal(archive.summary.objects[0].name, 'Named object');
    assert.equal(archive.summary.graphNodes, 3);
    assert.equal(archive.summary.graphEdges, 1);
    assert.equal(archive.assets.length, 3);
    const destination = install(loaded[to], 'destination');
    const plan = await effectMakerOperation('preview-import', { archive });
    assert.equal(plan.assetUploads, 3);
    const result = await effectMakerOperation('import', { archive, destinationId: 'destination', expectedSourceSha256: archive.sourceSha256, expectedDestinationSha256: plan.destinationSourceSha256 });
    assert.equal(result.status, 'saved-reload-required');
    assert.equal(destination.trace.at(-1), 'saved');
    assert.equal(destination.trace.filter(item => item.bytes).length, 3);
    const restored = await effectMakerOperation('inspect');
    assert.deepEqual(restored.objects, archive.summary.objects);
    assert.equal(restored.graphNodes, 3);
    assert.equal(restored.graphEdges, 1);
    const restoredSource = loaded[to].ns[clients[to].message](destination.model.v, loaded[to].ns[clients[to].Source], 4);
    const actual = JSON.parse(JSON.stringify(restoredSource.toJSON()));
    const expected = structuredClone(archive.source);
    const remapped = new Map(result.remappedAssets.map(({ oldId, newId }) => [oldId, newId]));
    const assets = new Map(expected[2][2]);
    assets.get('image-object')[3][5] = remapped.get('old-image');
    assets.get('sequence-object')[5][0] = ['old-image', 'old-frame'].map(id => remapped.get(id));
    assets.get('model-object')[7][6] = remapped.get('old-model');
    assert.deepEqual(actual, expected, 'Only binary references change; graph, AI prompts, object IDs and fields survive.');
    assert.equal(JSON.stringify(Array.from(destination.model.ba.value.values(), record => record.toJSON())).includes('channel-origin'), false);
    console.log('PASS native client export/import:', clients[from].build, '→', clients[to].build);
  }
} finally { globalThis.fetch = originalFetch; }
console.log('Offline contract checks passed. Cloud transfer/save and AI execution were not exercised.');
