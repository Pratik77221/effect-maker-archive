import { createGitHubClient, readBounded } from './github-api.js';

// Public application identifier. A maintainer can configure it once for releases.
// A client secret must never be added to an extension.
export const GITHUB_CLIENT_ID = 'Ov23liKvC1QBVzqZYycp';
const key = 'ema.github.session';
export function validClientId(value) {
  return /^[a-zA-Z0-9_.-]{10,100}$/.test(value || '') && !/^[a-f0-9]{40}$/i.test(value) && !/^(?:gh[pousr]_|github_pat_)/.test(value);
}
export async function prepareStorage(storage = chrome.storage) {
  if (!storage?.local?.setAccessLevel || !storage?.session?.setAccessLevel) throw new Error('Reload Effect Maker Archive from the browser’s Extensions page to apply the updated permissions, then reopen it.');
  await storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
  await storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
}
export function createAuthStore(storage = chrome.storage) {
  return {
    async get() {
      await prepareStorage(storage);
      const session = (await storage.session.get(key))[key];
      if (session?.expiresAt && session.expiresAt <= Date.now()) { await storage.session.remove(key); return null; }
      return session ?? null;
    },
    async save(token, profile, expiresIn) {
      await prepareStorage(storage);
      const session = { token, profile, ...(expiresIn ? { expiresAt: Date.now() + expiresIn * 1000 } : {}) };
      await storage.session.set({ [key]: session });
      return session;
    },
    async disconnect() { await storage.session.remove(key); }
  };
}
export const abortableDelay = (ms, signal) => new Promise((resolve, reject) => {
  signal?.throwIfAborted();
  const done = () => { signal?.removeEventListener('abort', abort); resolve(); };
  const timer = setTimeout(done, ms);
  const abort = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); reject(signal.reason); };
  signal?.addEventListener('abort', abort, { once: true });
});
export async function signInWithDevice({ clientId, signal, onCode, onStatus, fetcher = fetch, delay = abortableDelay, now = Date.now }) {
  if (!validClientId(clientId)) throw new Error('GitHub sign-in is not configured in this build. Install the latest Effect Maker Archive release.');
  const post = async (path, body) => {
    signal?.throwIfAborted();
    const response = await fetcher('https://github.com' + path, {
      method: 'POST', credentials: 'omit', redirect: 'error', cache: 'no-store',
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000),
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body).toString()
    });
    let result;
    try { result = JSON.parse(new TextDecoder().decode(await readBounded(response, 16384))); }
    catch { throw new Error('GitHub returned an unreadable sign-in response.'); }
    if (!response.ok && !result.error) throw new Error('GitHub sign-in could not continue (' + response.status + '). Try again.');
    return result;
  };
  const code = await post('/login/device/code', { client_id: clientId, scope: 'repo' });
  if (code.error) throw new Error(code.error === 'device_flow_disabled' ? 'Browser sign-in is disabled for this app on GitHub. The app owner needs to enable Device Flow.' : 'GitHub could not start sign-in for this app. Try again or install the latest release.');
  if (!/^[a-zA-Z0-9-]{6,20}$/.test(code.user_code || '') || typeof code.device_code !== 'string' || code.device_code.length > 200 || code.verification_uri !== 'https://github.com/login/device' || !Number.isFinite(code.expires_in) || code.expires_in <= 0) throw new Error('GitHub returned invalid sign-in details.');
  let interval = (Number.isFinite(code.interval) ? Math.min(60, Math.max(5, code.interval)) : 5) * 1000;
  const deadline = now() + Math.min(code.expires_in, 900) * 1000;
  onCode?.({ userCode: code.user_code, verificationUrl: code.verification_uri, expiresAt: deadline });
  while (now() < deadline) {
    await delay(Math.min(interval, deadline - now()), signal);
    signal?.throwIfAborted();
    if (now() >= deadline) break;
    const result = await post('/login/oauth/access_token', { client_id: clientId, device_code: code.device_code, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' });
    if (result.error === 'authorization_pending') continue;
    if (result.error === 'slow_down') { interval = Math.max(interval + 5000, (Number.isFinite(result.interval) ? result.interval : 0) * 1000); onStatus?.('Waiting for GitHub approval…'); continue; }
    if (result.error) throw new Error(({ access_denied: 'GitHub sign-in was cancelled.', expired_token: 'The sign-in code expired. Start again.', device_flow_disabled: 'Enable Device Flow in the GitHub app settings first.' })[result.error] || 'GitHub sign-in failed. Check the app settings and try again.');
    if (typeof result.access_token !== 'string' || result.access_token.length < 10) throw new Error('GitHub did not return a valid sign-in.');
    signal?.throwIfAborted();
    const profile = await createGitHubClient(result.access_token, { fetcher, signal }).profile();
    return { token: result.access_token, profile, expiresIn: result.expires_in };
  }
  throw new Error('The sign-in code expired. Start again.');
}
