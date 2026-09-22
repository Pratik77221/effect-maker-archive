import { createOperationRuntime } from './runtime.js';

// Runs inside the static editor bundle after a deliberate extension action.
// No cookie reads, traffic hooks, broad host permissions, or arbitrary endpoint URLs.
export async function effectMakerOperation(operation, input = {}, runtime) {
  const ownsRuntime = !runtime;
  runtime ??= createOperationRuntime({ operation });
  let importLock;
  let locks;
  let projectId;
  try {
    runtime.check();
    // Reviewed against the actual served clients; minified names are build-specific.
    // Keep reviewed profiles for older backups and tabs still open during a rollout.
    const previousBuild = 'effectmaker.effectmaker.en_GB.k9eBOpQ9YWc.2020.O';
    const september11Build = 'effectmaker.effectmaker.en_GB.gfHrZWkok9A.2020.O';
    const currentBuild = 'effectmaker.effectmaker.en_GB.JjyImd5Sung.2020.O';
    const profiles = {
      [previousBuild]: {
        symbols: {
          injector: 'I', Model: 'hC', Source: 'XC', message: 'Ho', Scene: 'LC', objects: 'kM',
          assetTree: 'tM', assets: 'wy', graph: 'uM', subgraphs: 'Hx', dependencies: 'Vwa',
          AssetService: 'zA', assetUrl: 'BA', markJson: 'id', Command: 'Vs', dispatch: 'FQ', upload: 'tS',
          imageId: 'zy', setImageId: 'ixa', glb: 'Dy', glbId: 'Cy', setGlbId: 'nxa',
          sequence: 'yy', setStrings: 'nG', frameIds: 'xy', nodeInputs: 'ky', inputLinks: 'lM'
        },
        projectId: 'sb', title: 'yf', channelId: 'Ke', children: 'Cb', uploadProject: 'Td',
        accepts: [previousBuild]
      },
      [september11Build]: {
        symbols: {
          injector: 'I', Model: 'gC', Source: 'WC', message: 'Ho', Scene: 'KC', objects: 'iM',
          assetTree: 'rM', assets: 'uy', graph: 'sM', subgraphs: 'Fx', dependencies: 'Wwa',
          AssetService: 'yA', assetUrl: 'AA', markJson: 'id', Command: 'Vs', dispatch: 'CQ', upload: 'qS',
          imageId: 'xy', setImageId: 'jxa', glb: 'By', glbId: 'Ay', setGlbId: 'oxa',
          sequence: 'wy', setStrings: 'jG', frameIds: 'vy', nodeInputs: 'iy', inputLinks: 'jM'
        },
        projectId: 'mb', title: 'xf', channelId: 'Kd', children: 'Db', uploadProject: 'Ud',
        accepts: [previousBuild, september11Build]
      },
      [currentBuild]: {
        symbols: {
          injector: 'K', Model: 'lC', Source: 'aD', message: 'Jo', Scene: 'PC', objects: 'kM',
          assetTree: 'tM', assets: 'yy', graph: 'uM', subgraphs: 'Jx', dependencies: 'bxa',
          AssetService: 'DA', assetUrl: 'FA', markJson: 'id', Command: 'Ws', dispatch: 'EQ', upload: 'tS',
          imageId: 'By', setImageId: 'pxa', glb: 'Fy', glbId: 'Ey', setGlbId: 'uxa',
          sequence: 'Ay', setStrings: 'nG', frameIds: 'zy', nodeInputs: 'my', inputLinks: 'lM'
        },
        projectId: 'nb', title: 'wf', channelId: 'Ld', children: 'Ab', uploadProject: 'Vd',
        accepts: [previousBuild, september11Build, currentBuild]
      }
    };
    const FORMAT = 'effect-maker-source-archive';
    const MAX_ASSET = 10 * 1024 * 1024;
    const MAX_TOTAL = 40 * 1024 * 1024;
    const fail = message => { throw new Error(message); };
    const clone = value => JSON.parse(JSON.stringify(value));
    const hash = async bytes => Array.from(new Uint8Array(await runtime.guard(() => crypto.subtle.digest('SHA-256', bytes))), v => v.toString(16).padStart(2, '0')).join('');
    const textHash = value => hash(new TextEncoder().encode(JSON.stringify(value)));
    const route = location.hostname === 'effects.youtube.com' && location.pathname.match(/^\/edit\/([a-zA-Z0-9_-]+)$/);
    if (!route) fail('Open an Effect Maker editor project first.');
    const BUILD = Array.from(document.scripts, script => script.src.match(/\/k=(effectmaker\.effectmaker\.[^/]+)\//)?.[1]).find(Boolean);
    const profile = profiles[BUILD];
    if (!profile) fail('Unsupported editor build: ' + (BUILD || 'not detected') + '. Update Effect Maker Archive to the latest release. This build must be reviewed before use.');
    const api = Object.fromEntries(Object.entries(profile.symbols).map(([name, symbol]) => [name, window.default_effectmaker?.[symbol]]));
    const requireFunctions = names => {
      for (const name of names) if (typeof api[name] !== 'function') fail('Editor adapter unavailable: ' + name + ' (' + profile.symbols[name] + ') in ' + BUILD + '.');
    };
    requireFunctions(['injector', 'Model', 'Source', 'message', 'Scene', 'objects', 'assetTree', 'assets', 'graph', 'subgraphs', 'dependencies', 'nodeInputs', 'inputLinks']);
    const model = api.injector().resolve(api.Model);
    if (typeof model?.v?.[profile.projectId] !== 'function' || model.v[profile.projectId]() !== route[1]) fail('Project is still loading or the editor model does not match this tab.');
    if (typeof model.v[profile.title] !== 'function' || !model.ha || typeof model.ba?.value?.get !== 'function') fail('The editor model does not match this adapter. Reload the editor and update the extension.');
    projectId = route[1];
    const lockKey = Symbol.for('effect-maker-local-archive.imports');
    locks = window[lockKey] ??= new Map();
    if (operation !== 'inspect' && locks.has(projectId)) {
      const error = new Error(locks.get(projectId).reloadRequired ? 'A previous import has an uncertain result. Reload the editor before importing again.' : 'An import is already running in this project.');
      error.reloadRequired = !!locks.get(projectId).reloadRequired;
      throw error;
    }
    if (operation === 'import') { importLock = { reloadRequired: false }; locks.set(projectId, importLock); }
    const sourceOf = () => api.message(model.v, api.Source, 4);
    const serializeSource = () => clone(sourceOf()?.toJSON() ?? []);
    const assetMap = () => model.ba.value;
    const stillThisProject = () => location.hostname === 'effects.youtube.com' && location.pathname === '/edit/' + route[1] && model.v?.[profile.projectId]?.() === route[1];
    const summary = source => {
      const scene = api.message(source, api.Scene, 2);
      const tree = api.assetTree(source);
      const graph = api.graph(source);
      const objects = scene ? Array.from(api.objects(scene).values()) : [];
      const assets = tree ? Array.from(api.assets(tree).values()) : [];
      const graphs = graph ? [graph, ...api.subgraphs(graph).values()] : [];
      return {
        objects: objects.filter(o => o.getId() !== 'scene-root').map(o => ({ id: o.getId(), name: o.getName?.() ?? '', children: Array.from(o[profile.children]?.() ?? []) })),
        assets: assets.filter(a => a.pa() !== 0).map(a => ({ id: a.getId(), name: a.Qa(), type: a.pa() })),
        graphNodes: graphs.reduce((n, g) => n + g.Lb().size, 0),
        graphEdges: graphs.reduce((n, g) => n + Array.from(g.Lb().values()).reduce((count, node) => count + Array.from(api.nodeInputs(node).values()).reduce((total, port) => total + api.inputLinks(port).length, 0), 0), 0),
        graphVariables: graphs.reduce((n, g) => n + g.v().length, 0),
        subgraphs: graph ? api.subgraphs(graph).size : 0
      };
    };
    const identity = () => ({ id: route[1], title: model.v[profile.title](), build: BUILD, ...summary(sourceOf()) });
    if (operation === 'inspect') return { ...identity(), saveState: model.ha.value, binaryAssetRecords: assetMap().size, adapter: 'available' };

    if (operation === 'export') {
      requireFunctions(['AssetService', 'assetUrl']);
      if (model.ha.value !== 0) fail('Wait until the editor has finished saving, then export again.');
      const source = serializeSource();
      const assetService = api.injector().resolve(api.AssetService);
      const dependencies = api.dependencies(sourceOf());
      const assets = [];
      let total = 0;
      for (const [id] of dependencies) {
        const record = assetMap().get(id);
        if (!record) fail('Missing binary asset record: ' + id);
        const url = new URL(api.assetUrl(assetService, id));
        if (url.protocol !== 'https:' || url.hostname !== 'effects.usercontent.youtube.com' || !url.pathname.includes('/blueprint/' + route[1] + '/asset/')) fail('Asset URL outside this project.');
        const { bytes, response } = await runtime.wait('download', 'Downloading asset ' + (assets.length + 1) + ' of ' + dependencies.size + '…', async () => {
          const response = await fetch(url.href, { credentials: 'include', redirect: 'error', signal: runtime.signal });
          if (!response.ok) fail('Asset download failed (' + response.status + '): ' + id);
          if (Number(response.headers.get('content-length') || 0) > MAX_ASSET) fail('Asset too large: ' + id);
          if (!response.body) fail('Asset download returned no data: ' + id);
          const reader = response.body.getReader();
          const chunks = [];
          let size = 0;
          while (true) {
            runtime.check();
            const { value, done } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > MAX_ASSET || total + size > MAX_TOTAL) { await reader.cancel(); fail('Archive exceeds the prototype size limit.'); }
            chunks.push(value);
          }
          const bytes = new Uint8Array(size);
          let offset = 0;
          for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
          return { bytes, response };
        }, { completed: assets.length, total: dependencies.size, assetId: id });
        const size = bytes.length;
        total += size;
        let binary = '';
        for (let i = 0; i < size; i += 16384) binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
        const metadata = clone(record.toJSON());
        const mime = record.getMetadata()?.toJSON()?.[0] || response.headers.get('content-type')?.split(';')[0] || 'application/octet-stream';
        assets.push({ id, mime, size, sha256: await hash(bytes), base64: btoa(binary), record: metadata });
      }
      runtime.check();
      if (!stillThisProject() || JSON.stringify(source) !== JSON.stringify(serializeSource()) || model.ha.value !== 0) fail('Project changed during export; retry.');
      return {
        format: FORMAT, version: 1, createdAt: new Date().toISOString(),
        project: { id: route[1], title: model.v[profile.title](), build: BUILD },
        source, sourceSha256: await textHash(source), assets, summary: summary(sourceOf()),
        coverage: { authoringSource: true, referencedBinaryAssets: true, publishingMetadata: false, editorPreferences: false }
      };
    }

    if (!['preview-import', 'import'].includes(operation)) fail('Unknown operation.');
    const archive = input.archive;
    const checked = await runtime.wait('validation', 'Checking project file…', async () => {
      if (archive?.format !== FORMAT || archive.version !== 1 || !Array.isArray(archive.source) || !Array.isArray(archive.assets)) fail('Invalid or incompatible archive.');
      if (!profile.accepts.includes(archive.project?.build)) fail('This archive was made with an incompatible editor build (' + (archive.project?.build || 'unknown') + '). Update the extension and reload the editor.');
      if (JSON.stringify(archive).length > 60 * 1024 * 1024) fail('Archive too large.');
      if (await textHash(archive.source) !== archive.sourceSha256) fail('Source checksum mismatch.');
      if (typeof archive.project.id !== 'string' || !archive.project.id || typeof archive.project.title !== 'string') fail('Invalid project information in the file.');
      if (archive.project.id === route[1]) fail('Import requires a different, empty project.');
      const destination = identity();
      if (destination.objects.length || destination.assets.length || destination.graphNodes || destination.graphEdges || destination.graphVariables || destination.subgraphs) fail('Destination is not empty.');
      if (model.ha.value !== 0) fail('Destination is still saving.');
      requireFunctions(['markJson', 'dispatch']);
      // Match the editor's native JSON parser: mark JSON arrays before parsing.
      const sourceData = clone(archive.source);
      api.markJson(sourceData, 32);
      const source = new api.Source(sourceData);
      const dependencies = api.dependencies(source);
      // Check all import support before any upload, including its remapping functions.
      const tree = api.assetTree(source);
      const contentAssets = tree ? Array.from(api.assets(tree).values()) : [];
      if (!api.Command) fail('Editor command-handler token is unavailable.');
      const commandHandler = api.injector().resolve(api.Command);
      if (typeof commandHandler?.resolveCommand !== 'function') fail('Editor command handler is unavailable.');
      if (typeof model.save !== 'function') fail('Editor save service is unavailable.');
      if (dependencies.size) requireFunctions(['upload', 'AssetService']);
      for (const asset of contentAssets) {
        if (asset.pa() === 4) requireFunctions(['imageId', 'setImageId']);
        else if (asset.pa() === 8) requireFunctions(['glb', 'glbId', 'setGlbId']);
        else if (asset.pa() === 6) requireFunctions(['sequence', 'setStrings', 'frameIds']);
        else if (asset.pa() === 5) fail('LUT restoration is not implemented in this prototype.');
      }
      const decoded = new Map();
      let total = 0;
      for (const asset of archive.assets) {
        if (!asset || typeof asset !== 'object') fail('Invalid asset information.');
        if (!dependencies.has(asset.id) || decoded.has(asset.id)) fail('Unexpected or duplicate asset.');
        runtime.check();
        if (typeof asset.id !== 'string' || !asset.id || !Number.isSafeInteger(asset.size) || asset.size < 0 || !/^[a-f0-9]{64}$/.test(asset.sha256)) fail('Invalid asset information.');
        if (typeof asset.base64 !== 'string' || asset.base64.length > MAX_ASSET * 1.34 + 8 || !/^(image\/(png|jpeg|webp)|model\/gltf-binary)$/.test(asset.mime)) fail('This prototype imports PNG, JPEG, WebP, and GLB binaries only.');
        if (asset.base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(asset.base64)) fail('Invalid asset encoding.');
        const bytes = Uint8Array.from(atob(asset.base64), c => c.charCodeAt(0));
        if (bytes.length !== asset.size || bytes.length > MAX_ASSET || await hash(bytes) !== asset.sha256) fail('Asset checksum/size mismatch.');
        total += bytes.length;
        if (total > MAX_TOTAL) fail('Archive exceeds size limit.');
        decoded.set(asset.id, { asset, bytes });
      }
      if (decoded.size !== dependencies.size) fail('Archive is missing a referenced asset.');
      const destinationSourceSha256 = await textHash(serializeSource());
      const plan = { sourceProject: archive.project, destination, destinationSourceSha256, incoming: summary(source), bytes: total, assetUploads: decoded.size };
      return { source, contentAssets, commandHandler, decoded, destinationSourceSha256, plan };
    });
    const { source, contentAssets, commandHandler, decoded, destinationSourceSha256, plan } = checked;
    if (operation === 'preview-import') return plan;
    if (input.destinationId !== route[1] || input.expectedSourceSha256 !== archive.sourceSha256 || input.expectedDestinationSha256 !== destinationSourceSha256) fail('Import preview is stale.');
    const baseline = JSON.stringify(serializeSource());
    const uploaded = new Map();
    const channelId = model.v[profile.channelId]?.();
    if (decoded.size && (typeof channelId !== 'string' || !channelId)) fail('The destination channel is not ready. Reload the editor and try again.');
    const assetService = decoded.size ? api.injector().resolve(api.AssetService) : undefined;
    for (const [oldId, { asset, bytes }] of decoded) {
      runtime.check();
      if (JSON.stringify(serializeSource()) !== baseline || !stillThisProject() || model.ha.value !== 0) fail('Destination changed while uploading.');
      const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'model/gltf-binary': 'glb' }[asset.mime];
      const filename = 'asset-' + asset.sha256.slice(0, 16) + '.' + extension;
      const result = await runtime.wait('upload', 'Uploading asset ' + (uploaded.size + 1) + ' of ' + decoded.size + '…', () => {
        runtime.markWrite();
        return api.upload(assetService, new File([bytes], filename, { type: asset.mime }), { fileName: filename, channelId, [profile.uploadProject]: projectId });
      }, { completed: uploaded.size, total: decoded.size, assetId: oldId, bytes: bytes.length });
      if (!result?.Ba()) fail('Upload did not return a usable asset record.');
      uploaded.set(oldId, result);
    }
    // Backend asset IDs change; authoring object IDs and graph links remain untouched.
    for (const asset of contentAssets) {
      if (asset.pa() === 4) {
        const image = asset.Ta();
        const old = api.imageId(image) || asset.getId();
        if (uploaded.has(old)) api.setImageId(image, uploaded.get(old).Ba());
      } else if (asset.pa() === 8) {
        const modelAsset = api.glb(asset);
        const old = api.glbId(modelAsset) || asset.getId();
        if (uploaded.has(old)) api.setGlbId(modelAsset, uploaded.get(old).Ba());
      } else if (asset.pa() === 6) {
        const sequence = api.sequence(asset);
        api.setStrings(sequence, 1, api.frameIds(sequence).map(id => uploaded.get(id)?.Ba() ?? id));
      }
    }
    const newIds = new Set(Array.from(uploaded.values(), r => r.Ba()));
    if (Array.from(api.dependencies(source).keys()).some(id => !newIds.has(id))) fail('An asset reference could not be remapped. Uploaded files remain only in the test destination.');
    runtime.check();
    if (JSON.stringify(serializeSource()) !== baseline || model.ha.value !== 0 || !stillThisProject()) fail('Destination changed before applying source.');
    const expectedSource = JSON.stringify(clone(source.toJSON()));
    const command = { applyEffectSourceCommand: { effectSourceJspb: source.serialize(), assetsJspb: Array.from(uploaded.values(), r => r.serialize()) } };
    await runtime.wait('apply', 'Applying objects and scripts…', async () => {
      runtime.markWrite();
      // resolveCommand() returns a boolean; the dispatcher exposes completion.
      const dispatched = api.dispatch(commandHandler, command);
      if (!dispatched?.handled || !dispatched.completion || typeof dispatched.completion.then !== 'function') fail('The editor did not accept the import command.');
      await dispatched.completion;
      runtime.check();
    });
    if (!stillThisProject() || JSON.stringify(serializeSource()) !== expectedSource) fail('The editor did not apply the expected source. Import is not verified; inspect the test destination.');
    await runtime.wait('save', 'Saving project to Effect Maker…', () => {
      runtime.check();
      if (!stillThisProject() || JSON.stringify(serializeSource()) !== expectedSource) fail('Project changed before saving.');
      runtime.markWrite();
      return model.save();
    });
    if (!stillThisProject() || model.ha.value !== 0 || JSON.stringify(serializeSource()) !== expectedSource) fail('The expected imported source was not confirmed saved. Inspect the test destination.');
    return { status: 'saved-reload-required', destinationId: route[1], summary: summary(sourceOf()), remappedAssets: Array.from(uploaded, ([oldId, record]) => ({ oldId, newId: record.Ba() })) };
  } catch (reason) {
    if (importLock && runtime.writesStarted) importLock.reloadRequired = true;
    throw runtime.error(reason);
  } finally {
    if (importLock && !importLock.reloadRequired && locks?.get(projectId) === importLock) locks.delete(projectId);
    if (ownsRuntime) runtime.finish();
  }
}
