import test from 'node:test';
import assert from 'node:assert/strict';
import { runInThisContext } from 'node:vm';
import { setup, BUILD, CURRENT_BUILD } from '../fixtures/editor-model.js';
import { createOperationRuntime } from '../extension/runtime.js';
import { createEditorBridge } from '../extension/editor-bridge.js';

function environment(t, options) {
  const model = setup(options);
  globalThis.location.origin='https://effects.youtube.com';
  globalThis.document.getElementById=()=>null;
  const timeout=globalThis.setTimeout;
  t.mock.method(globalThis,'setTimeout',(callback,delay,...args)=>delay===120000?0:timeout(callback,delay,...args));
  const calls=[];
  const api={
    tabs:{get:async()=>({url:'https://effects.youtube.com/edit/destination'}),reload:async()=>{}},
    scripting:{executeScript:async request=>{
      calls.push(request);
      assert.equal(request.target.tabId,42);
      assert.equal(request.world,'MAIN');
      // Chrome serializes the function: it cannot inherit imported bindings.
      const fn=runInThisContext('('+request.func.toString()+')');
      return [{result:await fn(...structuredClone(request.args))}];
    }}
  };
  return {...model,calls,api,bridge:createEditorBridge({tabId:42,projectId:'destination'},api)};
}

for (const build of [BUILD, CURRENT_BUILD]) test('the serialized editor bridge exports, validates, applies and saves on ' + build,async t=>{
  const {bridge,calls,trace}=environment(t, { build });
  async function invoke(operation,input={}) {
    const task=createOperationRuntime({operation});
    try{return await bridge.invoke(operation,input,task);}finally{task.finish();}
  }
  const archive=await invoke('export');
  archive.project.id='source';
  const preview=await invoke('preview-import',{archive});
  const result=await invoke('import',{archive,destinationId:'destination',expectedSourceSha256:archive.sourceSha256,expectedDestinationSha256:preview.destinationSourceSha256});
  assert.equal(result.status,'saved-reload-required');
  assert.equal(trace.at(-1),'saved');
  assert.equal(calls.some(call=>JSON.stringify(call.args).includes('token')),false);
});

test('cancelling across the bridge stops a pending command from advancing to save',async t=>{
  const {bridge,ns,trace}=environment(t);
  const entered=Promise.withResolvers(),pending=Promise.withResolvers();
  const original=ns.FQ;
  ns.FQ=(handler,command)=>{const result=original(handler,command);entered.resolve();return {...result,completion:pending.promise};};
  const exportTask=createOperationRuntime();
  const archive=await bridge.invoke('export',{},exportTask);exportTask.finish();archive.project.id='source';
  const previewTask=createOperationRuntime();
  const preview=await bridge.invoke('preview-import',{archive},previewTask);previewTask.finish();
  const task=createOperationRuntime();
  const importing=bridge.invoke('import',{archive,destinationId:'destination',expectedSourceSha256:archive.sourceSha256,expectedDestinationSha256:preview.destinationSourceSha256},task);
  const rejected=assert.rejects(importing,error=>error.code==='CANCELLED');
  await entered.promise;task.cancel();await rejected;
  assert.equal(task.error(task.signal.reason).reloadRequired,true);
  pending.resolve();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(trace.includes('saved'),false);
  task.finish();
});

test('a navigated target is rejected before script injection',async t=>{
  const {bridge,api,calls}=environment(t);
  api.tabs.get=async()=>({url:'https://effects.youtube.com/edit/another-project'});
  const task=createOperationRuntime();
  await assert.rejects(bridge.invoke('export',{},task),/project tab changed/);
  assert.equal(calls.length,0);task.finish();
});
