// Runs only in the extension origin. Never imported by the editor's MAIN bundle.
export const MAX_ARCHIVE_BYTES = 60 * 1024 * 1024;
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const fail = message => { throw new Error(message); };
export const digest = async (bytes, algorithm = 'SHA-256') => Array.from(new Uint8Array(await crypto.subtle.digest(algorithm, bytes)), x => x.toString(16).padStart(2, '0')).join('');
export function toBase64(bytes) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 16384) binary += String.fromCharCode(...bytes.subarray(offset, offset + 16384));
  return btoa(binary);
}
export function parseRepository(value) {
  const match = String(value).match(/^([a-zA-Z0-9][a-zA-Z0-9-]{0,38})\/([a-zA-Z0-9_.-]{1,100})$/);
  if (!match || ['.', '..'].includes(match[2])) fail('Choose a GitHub repository in owner/repository format.');
  return { owner: match[1], name: match[2], fullName: match[1] + '/' + match[2] };
}
export function backupPath(name) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(name)) fail('Use letters, numbers, hyphens or underscores for the backup name (up to 100 characters).');
  return 'effect-maker/' + name + '.json';
}
function checkPath(path) {
  if (!/^effect-maker\/[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}\.json$/.test(path)) fail('Choose a project backup in the effect-maker folder.');
  return path.split('/').map(encodeURIComponent).join('/');
}
function checkRef(ref) {
  if (typeof ref !== 'string' || !ref || ref.length > 250 || /[\x00-\x20\x7f~^:?*\[\\]/.test(ref) || ref.includes('..') || ref.includes('@{') || ref.startsWith('/') || ref.endsWith('/')) fail('Choose a valid branch or commit.');
  return ref;
}
function sha(value) {
  if (!/^[a-f0-9]{40}$/.test(value)) fail('GitHub returned an invalid revision. Refresh the backup list.');
  return value;
}
export async function validateBackup(archive) {
  if (archive?.format !== 'effect-maker-source-archive' || archive.version !== 1 || !Array.isArray(archive.source) || !Array.isArray(archive.assets)) fail('Choose a file exported by Effect Maker Archive.');
  if (!archive.project || !['id', 'title', 'build'].every(key => typeof archive.project[key] === 'string') || !archive.project.id) fail('The backup has invalid project information.');
  if (encoder.encode(JSON.stringify(archive)).length > MAX_ARCHIVE_BYTES) fail('The project backup exceeds 60 MB.');
  if (await digest(encoder.encode(JSON.stringify(archive.source))) !== archive.sourceSha256) fail('The backup source checksum does not match.');
  const ids = new Set();
  let total = 0;
  for (const asset of archive.assets) {
    if (typeof asset.id !== 'string' || !asset.id || ids.has(asset.id)) fail('The backup contains invalid or duplicate asset IDs.');
    ids.add(asset.id);
    if (typeof asset.base64 !== 'string' || asset.base64.length > 14 * 1024 * 1024 || asset.base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(asset.base64)) fail('The backup contains an invalid or oversized asset.');
    const binary = atob(asset.base64);
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    total += bytes.length;
    if (bytes.length > 10 * 1024 * 1024 || total > 40 * 1024 * 1024) fail('The backup exceeds the asset size limit.');
    if (bytes.length !== asset.size || await digest(bytes) !== asset.sha256) fail('A backup asset checksum does not match.');
  }
  return archive;
}
export async function readBounded(response, limit = MAX_ARCHIVE_BYTES) {
  if (Number(response.headers.get('content-length') || 0) > limit) fail('The GitHub response exceeds the backup size limit.');
  if (!response.body) fail('GitHub returned an empty response.');
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) fail('The GitHub response exceeds the backup size limit.');
      chunks.push(value);
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}
export function createGitHubClient(token, { fetcher = fetch, signal, timeoutMs = 30000, onUnauthorized } = {}) {
  if (typeof token !== 'string' || token.length < 10 || /\s/.test(token)) fail('Your GitHub session is unavailable. Choose Sign in with GitHub.');
  async function request(path, { method = 'GET', body, raw = false, allowMissing = false } = {}) {
    const url = new URL(path, 'https://api.github.com');
    if (url.origin !== 'https://api.github.com' || !path.startsWith('/') || path.startsWith('//')) fail('Invalid GitHub API destination.');
    signal?.throwIfAborted();
    const timeout = AbortSignal.timeout(timeoutMs);
    const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
    let response;
    try {
      response = await fetcher(url.href, {
        method, credentials: 'omit', redirect: 'error', cache: 'no-store', signal: requestSignal,
        headers: { Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json', Authorization: 'Bearer ' + token, 'X-GitHub-Api-Version': '2026-03-10', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
    } catch (error) {
      if (signal?.aborted) throw signal.reason;
      fail(method === 'PUT' ? 'The backup request was interrupted. It may have reached GitHub. Refresh the backup list before retrying.' : 'GitHub could not be reached. Check your connection and try again.');
    }
    if (response.status === 404 && allowMissing) return null;
    if (!response.ok) {
      if (response.status === 401) await onUnauthorized?.();
      // Classify known GitHub errors without displaying an untrusted response body.
      let reason = '';
      try {
        const body = JSON.parse(decoder.decode(await readBounded(response, 16384)));
        if (typeof body.message === 'string') reason = body.message;
      } catch {}
      const limited = response.status === 429 || response.headers.get('x-ratelimit-remaining') === '0' || response.headers.has('retry-after') || /secondary rate limit|rate limit exceeded|abuse detection/i.test(reason);
      let forbidden = method === 'PUT'
        ? 'GitHub did not allow this backup to be saved. Choose a repository and branch you can write to, or sign in again with GitHub.'
        : path.startsWith('/user/repos')
          ? 'GitHub did not allow the repository list to load. Use Sign in again with GitHub to approve repository access.'
          : path === '/user'
            ? 'GitHub did not allow this account to connect. Try Sign in with GitHub again.'
            : 'GitHub did not allow this repository to be read. Choose another repository or sign in again with GitHub.';
      let code = 'GITHUB_HTTP_' + response.status;
      if (limited) { forbidden = 'GitHub is limiting requests. Wait a little before trying again.'; code = 'GITHUB_RATE_LIMIT'; }
      else if (/required/i.test(response.headers.get('x-github-sso') || '') || /oauth app access restrictions|third-party application restrictions|organization.*approval/i.test(reason)) {
        forbidden = 'Your organisation requires approval for this GitHub app. Approve its access in GitHub or choose a personal repository.'; code = 'GITHUB_ORG_APPROVAL';
      } else if (/protected branch|repository rule|GH006|GH013|changes must be made through a pull request/i.test(reason)) {
        forbidden = 'This branch requires changes through a pull request or another branch rule. Choose a branch that accepts backup commits.'; code = 'GITHUB_BRANCH_RULE';
      } else if (/resource not accessible by personal access token/i.test(reason)) {
        forbidden = 'The previous token does not have access. Use Sign in again with GitHub to connect through your account.'; code = 'GITHUB_TOKEN_ACCESS';
      }
      const messages = {
        401: 'Your GitHub session has expired. Choose Sign in with GitHub to reconnect.',
        403: forbidden,
        404: 'This repository, branch or backup is unavailable to your GitHub account.',
        409: 'The GitHub backup changed or the branch is not ready. Refresh the backup list before pushing again.',
        422: 'GitHub could not save this backup. Refresh the backup list and check branch rules and write permissions.',
        429: 'GitHub is limiting requests. Wait a little, then try again.'
      };
      const error = new Error(messages[response.status] || 'GitHub request failed (' + response.status + ').');
      error.status = response.status;
      error.code = code;
      throw error;
    }
    const bytes = await readBounded(response, raw ? MAX_ARCHIVE_BYTES : 8 * 1024 * 1024);
    if (raw) return bytes;
    try { return JSON.parse(decoder.decode(bytes)); } catch { fail('GitHub returned an unreadable response.'); }
  }
  const prefix = repository => '/repos/' + parseRepository(repository).fullName.split('/').map(encodeURIComponent).join('/');
  async function list(path) {
    const items = [];
    for (let page = 1; page <= 10; page++) {
      const result = await request(path + (path.includes('?') ? '&' : '?') + 'per_page=100&page=' + page);
      if (!Array.isArray(result)) fail('GitHub returned an unreadable list.');
      items.push(...result);
      if (result.length < 100) return items;
    }
    fail('GitHub returned more than 1,000 results. This version cannot list that many entries.');
  }
  const metadata = async (repository, path, ref) => {
    const result = await request(prefix(repository) + '/contents/' + checkPath(path) + '?ref=' + encodeURIComponent(checkRef(ref)), { allowMissing: true });
    if (result && (result.type !== 'file' || result.path !== path || result.size > MAX_ARCHIVE_BYTES)) fail('The selected backup is not a supported project file.');
    if (result) sha(result.sha);
    return result;
  };
  async function pull(repository, path, ref) {
    const file = await metadata(repository, path, ref);
    if (!file) fail('The selected backup no longer exists on this branch.');
    const bytes = await request(prefix(repository) + '/git/blobs/' + sha(file.sha), { raw: true });
    const header = encoder.encode('blob ' + bytes.length + '\0');
    const blob = new Uint8Array(header.length + bytes.length);
    blob.set(header); blob.set(bytes, header.length);
    if (await digest(blob, 'SHA-1') !== file.sha) fail('The downloaded GitHub file does not match its revision.');
    let archive;
    try { archive = JSON.parse(decoder.decode(bytes)); } catch { fail('This GitHub file is not a valid project archive.'); }
    await validateBackup(archive);
    return { archive, sha: file.sha, path };
  }
  return {
    async profile() {
      const result = await request('/user');
      if (!Number.isInteger(result.id) || typeof result.login !== 'string') fail('GitHub could not verify this account.');
      return { id: result.id, login: result.login };
    },
    repositories: () => list('/user/repos?sort=updated&affiliation=owner,collaborator,organization_member'),
    repository: repository => request(prefix(repository)),
    branches: repository => list(prefix(repository) + '/branches'),
    async backups(repository, branch) {
      const result = await request(prefix(repository) + '/contents/effect-maker?ref=' + encodeURIComponent(checkRef(branch)), { allowMissing: true });
      if (!result) return [];
      if (!Array.isArray(result)) fail('The effect-maker path must be a folder.');
      if (result.length >= 1000) fail('This folder contains too many backups. Use another repository.');
      return result.filter(file => file.type === 'file' && /^effect-maker\/[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}\.json$/.test(file.path)).map(file => ({ name: file.name.replace(/\.json$/, ''), path: file.path, sha: sha(file.sha) }));
    },
    async history(repository, path, branch) {
      const result = await request(prefix(repository) + '/commits?path=' + encodeURIComponent(checkPath(path)) + '&sha=' + encodeURIComponent(checkRef(branch)) + '&per_page=20');
      if (!Array.isArray(result)) fail('GitHub returned unreadable version history.');
      return result.map(commit => ({ sha: sha(commit.sha), date: commit.commit?.committer?.date || '', message: String(commit.commit?.message || '').split('\n')[0].slice(0,160) }));
    },
    pull,
    async push(repository, branch, path, archive, expectedSha, message, options = {}) {
      checkPath(path); checkRef(branch);
      if (expectedSha !== null) sha(expectedSha);
      await validateBackup(archive);
      const repo = await request(prefix(repository));
      if (repo.archived || repo.disabled) fail('Choose a repository that accepts changes.');
      if (repo.permissions?.push === false) fail('You cannot push to this repository. Choose a repository you can write to.');
      if (repo.private !== true && options.allowPublic !== true) fail('This repository is public. Confirm that this backup can be public before pushing.');
      const current = await metadata(repository, path, branch);
      if ((current?.sha ?? null) !== expectedSha) fail('This backup changed on GitHub. Refresh the backup list and review it before pushing again.');
      if (current) {
        const previous = await pull(repository, path, branch);
        if (previous.sha !== expectedSha) fail('This backup changed while it was being checked. Refresh the backup list before pushing.');
        const stable = value => JSON.stringify({ project:value.project, source:value.source, assets:value.assets, coverage:value.coverage });
        if (stable(previous.archive) === stable(archive)) return { unchanged: true, sha: current.sha, path };
      }
      signal?.throwIfAborted();
      const bytes = encoder.encode(JSON.stringify(archive, null, 2) + '\n');
      if (bytes.length > MAX_ARCHIVE_BYTES) fail('The formatted backup exceeds 60 MB.');
      options.onWrite?.();
      const result = await request(prefix(repository) + '/contents/' + checkPath(path), { method: 'PUT', body: {
        message: String(message || 'Back up ' + archive.project.title).slice(0,200), branch,
        content: toBase64(bytes), ...(expectedSha ? { sha: expectedSha } : {})
      } });
      return { unchanged: false, sha: sha(result.content?.sha), commit: sha(result.commit?.sha), path, url: 'https://github.com/' + parseRepository(repository).fullName + '/commit/' + sha(result.commit?.sha) };
    }
  };
}
