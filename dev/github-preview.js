import { renderEditorPanel } from '../extension/editor-panel.js';
import { mountGitHubPanel } from '../extension/github-panel.js';
import { digest } from '../extension/github-api.js';
const archive = { format:'effect-maker-source-archive',version:1,project:{id:'demo-source',title:'Summer glow',build:'demo-build'},source:[],sourceSha256:await digest(new TextEncoder().encode('[]')),assets:[] };
let activeUi, approve;
const tick = () => new Promise(resolve=>setTimeout(resolve,20));
async function mount(mode) {
  const old = document.getElementById('em-local-archive-controls');
  if(old?.dataset.busy==='true') {
    Array.from(old.querySelectorAll('button')).find(button=>button.textContent==='Cancel')?.click();
    while(old.dataset.busy==='true') await tick();
  }
  document.getElementById('approval-note').textContent='';
  let session=mode==='disconnected'?null:{token:'demo-token-only',profile:{id:1,login:'demo-creator'}};
  const settings={'ema.github.clientId':'0123456789abcdef0123'};
  const storage={local:{get:async key=>({[key]:settings[key]}),set:async values=>Object.assign(settings,values)}};
  let backups=[{name:'summer-glow',path:'effect-maker/summer-glow.json',sha:'a'.repeat(40)}];
  const client={
    profile:async()=>({id:1,login:'demo-creator'}),
    repositories:async()=>[{full_name:'demo/effect-backups',private:true},{full_name:'demo/public-backups',private:false}],
    repository:async name=>({full_name:name,private:!name.includes('public'),default_branch:'main',size:1}),
    branches:async()=>[{name:'main'},{name:'experiments'}],
    backups:async()=>backups,
    history:async()=>[{sha:'b'.repeat(40),message:'Adjust glow intensity',date:'2026-09-08'},{sha:'c'.repeat(40),message:'Initial effect backup',date:'2026-09-07'}],
    pull:async(repository,path,ref)=>({archive:{...archive,project:{...archive.project,title:ref.startsWith('c')?'Summer glow — first version':'Summer glow'}},path,sha:'a'.repeat(40)}),
    push:async(repository,branch,path,value,expected,message,options)=>{
      if(mode==='conflict') throw new Error('This backup changed on GitHub. Refresh the backup list and review it before pushing again.');
      if(repository.includes('public')&&!options.allowPublic) throw new Error('Public backup needs confirmation.');
      options.onWrite();
      backups=[...backups.filter(item=>item.path!==path),{name:path.split('/').at(-1).replace('.json',''),path,sha:'d'.repeat(40)}];
      return {path,sha:'d'.repeat(40),commit:'e'.repeat(40),url:'https://github.com/demo/effect-backups/commit/'+ 'e'.repeat(40)};
    }
  };
  const invoke=async(operation,input,task)=>{
    if(operation==='export') return archive;
    if(operation==='preview-import') return {destination:{id:'demo-destination'},destinationSourceSha256:'demo-empty'};
    task.markWrite();return {status:'saved-reload-required'};
  };
  activeUi=renderEditorPanel(invoke,{github:true});
  const github=mountGitHubPanel(activeUi,{
    invoke,projectId:'demo-destination',storage,requestAccess:async()=>true,clientFactory:()=>client,copyText:async()=>{},
    openAuthPage:()=>{document.getElementById('approval-note').textContent='Simulated GitHub approval completed.';approve?.();},
    authStore:{get:async()=>session,save:async(token,profile)=>session={token,profile},disconnect:async()=>{session=null;}},
    deviceLogin:async({onCode,signal})=>{
      onCode({userCode:'DEMO-1234',verificationUrl:'https://github.com/login/device'});
      await new Promise((resolve,reject)=>{approve=resolve;signal.addEventListener('abort',()=>reject(signal.reason),{once:true});});
      return {token:'demo-token-only',profile:{id:1,login:'demo-creator'}};
    }
  });
  await github.ready;
  Array.from(activeUi.host.querySelectorAll('button')).find(button=>button.textContent==='GitHub backup').click();
}
document.querySelectorAll('[data-state]').forEach(button=>button.addEventListener('click',()=>mount(button.dataset.state)));
mount('disconnected');
