import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createGitHubClient, validateBackup, readBounded, backupPath, parseRepository } from '../extension/github-api.js';
import { createAuthStore, prepareStorage, signInWithDevice, validClientId, GITHUB_CLIENT_ID } from '../extension/github-auth.js';

const token = 'unit-test-token-not-a-real-credential';
const source = ['Unicode 🌻', 12];
const archive = { format:'effect-maker-source-archive', version:1, createdAt:'2026-09-08T00:00:00Z', project:{id:'source',title:'Summer glow',build:'test-build'}, source, sourceSha256:createHash('sha256').update(JSON.stringify(source)).digest('hex'), assets:[], coverage:{authoringSource:true} };
const bytesOf = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const blobSha = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), {status,headers});
function fakeGitHub({ initial = null, privateRepo = true, putStatus = 200 } = {}) {
  let contents = initial && bytesOf(initial);
  const calls = [];
  const fetcher = async (url, request) => {
    assert.equal(new URL(url).origin, 'https://api.github.com');
    assert.equal(request.headers.Authorization, 'Bearer ' + token);
    assert.equal(request.credentials, 'omit');
    assert.equal(request.redirect, 'error');
    calls.push({url, ...request});
    const path = new URL(url).pathname;
    if (path === '/repos/test/backups') return json({private:privateRepo});
    if (request.method === 'PUT') {
      if (putStatus !== 200) return json({message:'should never be reflected with credentials'}, putStatus);
      const body = JSON.parse(request.body);
      assert.equal(body.branch, 'main');
      assert.equal(body.sha ?? null, contents ? blobSha(contents) : null);
      contents = Buffer.from(body.content, 'base64');
      return json({content:{sha:blobSha(contents)},commit:{sha:'c'.repeat(40)}});
    }
    if (path.includes('/git/blobs/')) {
      assert.equal(request.headers.Accept, 'application/vnd.github.raw+json');
      assert.equal(path.split('/').at(-1), blobSha(contents));
      return new Response(contents);
    }
    if (path.includes('/contents/')) return contents ? json({type:'file',path:'effect-maker/demo.json',size:contents.length,sha:blobSha(contents)}) : json({},404);
    throw new Error('Unexpected test request: ' + path);
  };
  return {calls,fetcher,get contents() { return contents; }};
}

test('push creates a UTF-8 archive commit and pull verifies the Git blob and archive checksums', async () => {
  const github = fakeGitHub();
  const client = createGitHubClient(token, {fetcher:github.fetcher});
  const saved = await client.push('test/backups','main','effect-maker/demo.json',archive,null,'First backup');
  assert.equal(saved.commit, 'c'.repeat(40));
  assert.deepEqual(JSON.parse(github.contents),archive);
  const pulled = await client.pull('test/backups','effect-maker/demo.json','main');
  assert.deepEqual(pulled.archive,archive);
  assert.equal(pulled.sha,saved.sha);
  assert.equal(github.calls.filter(call=>call.method==='PUT').length,1);
});

test('an identical project with a newer export timestamp does not create another commit', async () => {
  const github = fakeGitHub({initial:archive});
  const client = createGitHubClient(token,{fetcher:github.fetcher});
  const result = await client.push('test/backups','main','effect-maker/demo.json',{...archive,createdAt:'2026-09-09'},blobSha(github.contents),'Again');
  assert.equal(result.unchanged,true);
  assert.equal(github.calls.some(call=>call.method==='PUT'),false);
});

test('a changed remote backup prevents any write, and server conflicts are never retried', async () => {
  const github = fakeGitHub({initial:archive});
  const client = createGitHubClient(token,{fetcher:github.fetcher});
  await assert.rejects(client.push('test/backups','main','effect-maker/demo.json',archive,'d'.repeat(40),'Backup'),/changed on GitHub/);
  assert.equal(github.calls.some(call=>call.method==='PUT'),false);
  const conflict = fakeGitHub({putStatus:409});
  await assert.rejects(createGitHubClient(token,{fetcher:conflict.fetcher}).push('test/backups','main','effect-maker/demo.json',archive,null,'Backup'),/changed or the branch/);
  assert.equal(conflict.calls.filter(call=>call.method==='PUT').length,1);
});

test('public repositories require explicit consent even if visibility changed after selection', async () => {
  const github = fakeGitHub({privateRepo:false});
  const client = createGitHubClient(token,{fetcher:github.fetcher});
  await assert.rejects(client.push('test/backups','main','effect-maker/demo.json',archive,null,'Backup'),/repository is public/);
  assert.equal(github.calls.some(call=>call.method==='PUT'),false);
  await client.push('test/backups','main','effect-maker/demo.json',archive,null,'Backup',{allowPublic:true});
  assert.equal(github.calls.filter(call=>call.method==='PUT').length,1);
});

test('invalid paths and corrupted archives fail before any GitHub request', async () => {
  let requests = 0;
  const client = createGitHubClient(token,{fetcher:()=>{ requests++; throw new Error('Unexpected request'); }});
  assert.throws(()=>backupPath('../secrets'),/backup name/);
  assert.throws(()=>parseRepository('https://attacker.example/repo'),/owner\/repository/);
  await assert.rejects(client.push('test/backups','main','.github/workflows/overwrite.json',archive,null),/backup in/);
  await assert.rejects(client.push('test/backups','main','effect-maker/demo.json',{...archive,source:['changed']},null),/checksum/);
  assert.equal(requests,0);
});

test('archives larger than 1 MB pull through the authenticated raw Git blob endpoint', async () => {
  const binary = Buffer.alloc(2 * 1024 * 1024, 17);
  const large = {...archive,assets:[{id:'asset',mime:'image/png',record:[],size:binary.length,base64:binary.toString('base64'),sha256:createHash('sha256').update(binary).digest('hex')}]};
  const github = fakeGitHub({initial:large});
  const result = await createGitHubClient(token,{fetcher:github.fetcher}).pull('test/backups','effect-maker/demo.json','main');
  assert.deepEqual(result.archive,large);
  await assert.rejects(validateBackup({...large,assets:[{...large.assets[0],sha256:'0'.repeat(64)}]}),/asset checksum/);
});

test('oversized streamed responses are cancelled and tokens never enter error messages', async () => {
  let cancelled = false;
  const stream = new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(20)); }, cancel() { cancelled=true; } });
  await assert.rejects(readBounded(new Response(stream),10),/size limit/);
  assert.equal(cancelled,true);
  const client = createGitHubClient(token,{fetcher:async()=>json({message:token},401)});
  await assert.rejects(client.profile(),error=>error.status===401 && !error.message.includes(token));
  let disconnected=false;
  await assert.rejects(createGitHubClient(token,{fetcher:async()=>json({},401),onUnauthorized:async()=>{disconnected=true;}}).profile());
  assert.equal(disconnected,true);
});

test('device sign-in obeys polling and slow_down, and keeps the token out of the displayed code', async () => {
  let time=0, polls=0;
  const waits=[], displayed=[], requests=[];
  const result = await signInWithDevice({
    clientId:'0123456789abcdef0123', now:()=>time, delay:async ms=>{waits.push(ms);time+=ms;}, onCode:value=>displayed.push(value),
    fetcher:async(url,request)=>{
      requests.push({url,request});
      if(url.endsWith('/login/device/code')) return json({device_code:'private-device-code',user_code:'ABCD-EFGH',verification_uri:'https://github.com/login/device',expires_in:900,interval:5});
      if(url.endsWith('/user')) return json({id:1,login:'tester'});
      polls++;
      return json(polls===1?{error:'authorization_pending'}:polls===2?{error:'slow_down',interval:10}:{access_token:token,expires_in:28800});
    }
  });
  assert.deepEqual(waits,[5000,5000,10000]);
  assert.equal(result.token,token);
  assert.deepEqual(result.profile,{id:1,login:'tester'});
  assert.equal(displayed[0].device_code,undefined);
  assert.equal(JSON.stringify(displayed).includes(token),false);
  assert.equal(requests.some(({request})=>request.body?.includes('client_secret')),false);
});

test('denied or cancelled device login stops polling without saving or returning a token', async () => {
  assert.equal(validClientId('a'.repeat(40)),false);
  assert.equal(validClientId('github_pat_' + 'x'.repeat(30)),false);
  let calls=0;
  const initial = {device_code:'device-code',user_code:'ABCD-EFGH',verification_uri:'https://github.com/login/device',expires_in:900,interval:5};
  await assert.rejects(signInWithDevice({clientId:'0123456789abcdef0123',delay:async()=>{},fetcher:async()=>json(++calls===1?initial:{error:'access_denied'})}),/cancelled/);
  assert.equal(calls,2);
  const controller=new AbortController();
  calls=0;
  await assert.rejects(signInWithDevice({clientId:'0123456789abcdef0123',signal:controller.signal,delay:async()=>{controller.abort(new Error('Test cancelled'));},fetcher:async()=>{calls++;return json(initial);}}),/Test cancelled/);
  assert.equal(calls,1);
});

test('GitHub credentials are stored only in trusted in-memory session storage and disconnect clears them', async () => {
  const data={}, writes=[], levels=[];
  const storage={local:{setAccessLevel:async value=>levels.push(value)},session:{setAccessLevel:async value=>levels.push(value),get:async()=>data,set:async value=>{writes.push(value);Object.assign(data,value);},remove:async key=>{delete data[key];}}};
  const store=createAuthStore(storage);
  await store.save(token,{id:1,login:'tester'});
  assert.equal((await store.get()).token,token);
  assert.equal(writes.length,1);
  assert.equal(levels.every(value=>value.accessLevel==='TRUSTED_CONTEXTS'),true);
  await store.disconnect();
  assert.equal(await store.get(),null);
});

test('the shipped login uses a public app ID and missing extension permissions have a readable recovery', async () => {
  assert.equal(validClientId(GITHUB_CLIENT_ID), true);
  await assert.rejects(prepareStorage({}), /Reload Effect Maker Archive.*updated permissions/);
});

test('access failures distinguish account permissions, organisation approval and rate limits without echoing server messages', async () => {
  const check = async (body, headers, method, code, pattern) => {
    const client = createGitHubClient(token, { fetcher: async () => json(body, 403, headers) });
    await assert.rejects(client[method](), error => {
      assert.equal(error.code, code);
      assert.match(error.message, pattern);
      assert.equal(error.message.includes(token), false);
      return true;
    });
  };
  await check({ message: token }, {}, 'repositories', 'GITHUB_HTTP_403', /repository list.*Sign in again/);
  await check({ message: token }, { 'x-github-sso': 'required; url=https://github.com/' }, 'repositories', 'GITHUB_ORG_APPROVAL', /organisation requires approval/);
  await check({ message: 'Resource not accessible by personal access token ' + token }, {}, 'repositories', 'GITHUB_TOKEN_ACCESS', /previous token.*Sign in again/);
  await check({ message: 'secondary rate limit ' + token }, {}, 'profile', 'GITHUB_RATE_LIMIT', /limiting requests/);
  await check({ message: token }, { 'x-ratelimit-remaining': '0' }, 'profile', 'GITHUB_RATE_LIMIT', /limiting requests/);
});

test('a disabled OAuth app returns a setup diagnosis even when GitHub uses HTTP 400', async () => {
  await assert.rejects(signInWithDevice({ clientId: GITHUB_CLIENT_ID, fetcher: async () => json({ error: 'device_flow_disabled' }, 400) }), /app owner needs to enable Device Flow/);
});
