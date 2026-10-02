import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {inspectPostgres} from './check-postgres.mjs';

const root=path.resolve(import.meta.dirname,'..');
const source=fs.readFileSync(path.join(root,'public/js/core/roles-engine.js'),'utf8');
const ownId='00000000-0000-0000-0000-000000000001';
const otherId='00000000-0000-0000-0000-000000000002';
let checks=0;
function check(actual,expected,label){assert.deepEqual(actual,expected,label);checks++}
async function setup({role='admin',status=204,payload=null,token='test-token',fetchError=null}={}){
  const calls=[];
  const state={ready:true,user:{id:ownId},client:{
    from(table){const builder={select(){return builder},eq(){return builder},async maybeSingle(){return {data:table==='user_roles'?{role}:null}}};return builder},
    auth:{async getSession(){return {data:{session:token?{access_token:token}:null}}}}
  }};
  const context={window:{CGB_AUTH:{state,async whenReady(){return state}}},
    document:{addEventListener(){},body:{classList:{toggle(){}}},querySelectorAll(){return []}},
    console,localStorage:{getItem(){return null},setItem(){}},
    fetch:async(url,options)=>{
      calls.push({url,options});
      if(fetchError) throw new Error(fetchError);
      return {ok:status>=200&&status<300,status,async json(){if(payload===null)throw new Error('no response body');return payload}};
    }
  };
  vm.runInNewContext(source,context);
  await context.window.CGB_ROLES.loadMyRole();
  return {roles:context.window.CGB_ROLES,calls};
}

const noContent=await setup();
check((await noContent.roles.removeUser(otherId)).ok,true,'successful DELETE 204 accepted');
check(noContent.calls[0].url,'/api/v1/auth/admin/users/'+otherId,'documented endpoint used');
check(noContent.calls[0].options.method,'DELETE','documented method used');
check(noContent.calls[0].options.headers.Authorization,'Bearer test-token','session token forwarded');
check('body' in noContent.calls[0].options,false,'no legacy POST payload');
const success=await setup({status:200,payload:{ok:true}});
check((await success.roles.removeUser(otherId)).ok,true,'JSON success accepted');
const forbidden=await setup({status:403,payload:{error:'forbidden'}});
check((await forbidden.roles.removeUser(otherId)).ok,false,'API permission denial preserved');
const applicationError=await setup({status:200,payload:{ok:false,error:'refused'}});
check((await applicationError.roles.removeUser(otherId)).ok,false,'explicit API refusal preserved');
const ordinary=await setup({role:'user'});
check((await ordinary.roles.removeUser(otherId)).ok,false,'ordinary user denied before request');
check(ordinary.calls.length,0,'ordinary user makes no destructive request');
const self=await setup();
check((await self.roles.removeUser(ownId)).ok,false,'self deletion denied');
check(self.calls.length,0,'self deletion makes no request');
const invalid=await setup();
check((await invalid.roles.removeUser('../auth/users')).ok,false,'invalid user identifier denied');
check(invalid.calls.length,0,'invalid identifier makes no request');
const expired=await setup({token:null});
check((await expired.roles.removeUser(otherId)).ok,false,'expired session denied');
check(expired.calls.length,0,'expired session makes no request');
const unavailable=await setup({fetchError:'offline'});
check((await unavailable.roles.removeUser(otherId)).ok,false,'network error is not success');
const result=inspectPostgres(root);
if(!result.schema){
  check(result.ready,false,'missing target schema prevents readiness success');
  check(result.findings.some(item=>item.code==='PG_RPC_UNVERIFIED'&&item.evidence.includes('cgb_finish_test')),true,'new secure test RPC must be checked against target schema');
}
console.log(`PostgreSQL frontend contract checks passed: ${checks}`);
