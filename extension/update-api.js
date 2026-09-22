// Public release metadata only. GitHub backup credentials never enter this client.
export const UPDATE_REPOSITORY = 'Pratik77221/effect-maker-archive';
export const RELEASES_URL = 'https://github.com/' + UPDATE_REPOSITORY + '/releases';
const API_URL = 'https://api.github.com/repos/' + UPDATE_REPOSITORY;

export function compareVersions(left, right) {
  const parts = value => {
    if (typeof value !== 'string' || !/^\d+(?:\.\d+){0,3}$/.test(value)) throw new Error('Invalid extension version.');
    const raw = value.split('.'), values = raw.map(Number);
    if (values.some((value, index) => value > 65535 || String(value) !== raw[index])) throw new Error('Invalid extension version.');
    return Array.from({ length: 4 }, (_, index) => values[index] ?? 0);
  };
  const a = parts(left), b = parts(right);
  for (let index = 0; index < 4; index++) if (a[index] !== b[index]) return Math.sign(a[index] - b[index]);
  return 0;
}

export function parseRelease(release, installedVersion) {
  const tag = release?.tag_name;
  if (release?.draft !== false || release?.prerelease !== false || typeof tag !== 'string' || !/^v\d+\.\d+\.\d+(?:\.\d+)?$/.test(tag)) {
    throw new Error('GitHub did not return a supported stable release.');
  }
  const version = tag.slice(1);
  const available = compareVersions(version, installedVersion) > 0;
  const releaseUrl = RELEASES_URL + '/tag/' + tag;
  const name = 'effect-maker-archive-v' + version + '.zip';
  const zipUrl = RELEASES_URL + '/download/' + tag + '/' + name;
  const assets = Array.isArray(release.assets) ? release.assets.filter(asset => asset?.name === name) : [];
  const asset = assets[0];
  if (release.html_url !== releaseUrl || assets.length !== 1 || asset.state !== 'uploaded' || asset.browser_download_url !== zipUrl ||
      !Number.isSafeInteger(asset.size) || asset.size <= 0 || asset.size > 20 * 1024 * 1024) {
    throw new Error('This release has no valid extension ZIP. Open the releases page and try again later.');
  }
  return { available, installedVersion, version, tag, releaseUrl, zipUrl, zipName: name, zipSize: asset.size,
    sha256: typeof asset.digest === 'string' && /^sha256:[a-f0-9]{64}$/.test(asset.digest) ? asset.digest.slice(7) : null };
}

export async function checkForUpdate(installedVersion, { fetcher = fetch, signal } = {}) {
  compareVersions(installedVersion, installedVersion);
  const deadline = AbortSignal.timeout(15000);
  const response = await fetcher(API_URL + '/releases/latest', {
    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    credentials: 'omit', cache: 'no-store', redirect: 'error',
    signal: signal ? AbortSignal.any([signal, deadline]) : deadline
  });
  if (!response.ok) {
    if (response.status === 403 || response.status === 429) throw new Error('GitHub limited update checks. Try again later or open the releases page.');
    if (response.status === 404) throw new Error('No published release is available yet.');
    throw new Error('Could not check GitHub for updates (' + response.status + '). Try again.');
  }
  const maxBytes = 1024 * 1024;
  if (Number(response.headers.get('content-length') || 0) > maxBytes || !response.body) throw new Error('Invalid release response.');
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) { await reader.cancel(); throw new Error('Release response is too large.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let release;
  try { release = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new Error('GitHub returned invalid release information. Try again.'); }
  return parseRelease(release, installedVersion);
}
