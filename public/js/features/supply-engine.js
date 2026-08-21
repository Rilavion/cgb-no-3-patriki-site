window.CGB_SUPPLY=(function(){
  function waitReady(){
    if(window.CGB_AUTH&&window.CGB_AUTH.whenReady) return window.CGB_AUTH.whenReady(8000);
    return new Promise(resolve=>{
    const deadline=Date.now()+5000;
    function ck(){const s=window.CGB_AUTH&&window.CGB_AUTH.state;if(s&&s.ready){resolve(s);return true}return false}
    if(ck()) return;
    const t=setInterval(()=>{if(ck()){clearInterval(t)}else if(Date.now()>deadline){clearInterval(t);resolve(null)}},80);
    });
  }
  async function client(){await waitReady();const s=window.CGB_AUTH&&window.CGB_AUTH.state;return s&&s.client?s.client:null}
  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function validStatic(v){return /^\d{3}-\d{3}$/.test(String(v||"").trim())}

  async function fetchForm(){
    const c=await client();if(!c) return null;
    const {data}=await c.rpc("get_supply_form");
    return data&&data.length?data[0]:null;
  }

  async function saveForm(patch){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    const row=Object.assign({id:1,updated_at:new Date().toISOString(),updated_by:s&&s.user?s.user.id:null},patch);
    const {error}=await c.from("supply_form").upsert(row,{onConflict:"id"});
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }

  async function submit(payload){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    if(!validStatic(payload.static_id)) return {ok:false,error:"Статик в формате 000-000"};
    const {data,error}=await c.rpc("submit_supply_request",{
      p_fio:String(payload.fio||"").trim(),
      p_static:String(payload.static_id||"").trim(),
      p_discord:payload.discord?String(payload.discord).trim():null,
      p_values:payload.values||{}
    });
    if(error) return {ok:false,error:error.message};
    return {ok:true,id:data};
  }

  async function fetchRequests(fromISO,toISO,limit){
    const c=await client();if(!c) return [];
    let q=c.from("supply_requests").select("*").order("created_at",{ascending:false}).limit(limit||500);
    if(fromISO) q=q.gte("created_at",fromISO);
    if(toISO) q=q.lte("created_at",toISO);
    const {data,error}=await q;
    if(error){console.warn("[SUPPLY]",error.message);return []}
    return data||[];
  }

  async function updateRequest(id,patch){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    const name=(function(){try{return localStorage.getItem("cgb-my-display-name")||(s&&s.user&&s.user.email)||"ss"}catch(e){return "ss"}})();
    const row=Object.assign({},patch,{resolved_by:s&&s.user?s.user.id:null,resolved_by_name:name,resolved_at:new Date().toISOString()});
    const {error}=await c.from("supply_requests").update(row).eq("id",id);
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }

  async function deleteRequest(id){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const {error}=await c.from("supply_requests").delete().eq("id",id);
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }

  async function replaceRequest(oldId, editedValues, editedFio, editedStatic, editedDiscord){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const {data:old}=await c.from("supply_requests").select("*").eq("id",oldId).maybeSingle();
    if(!old) return {ok:false,error:"старая заявка не найдена"};
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    const editorName=(function(){try{return localStorage.getItem("cgb-my-display-name")||(s&&s.user&&s.user.email)||"admin"}catch(e){return "admin"}})();
    const patch={
      dispute_resolution:"Заменено · "+editorName+" · "+new Date().toISOString(),
      replaced_at:new Date().toISOString(),
      replaced_by:s&&s.user?s.user.id:null,
      replaced_by_name:editorName
    };
    if(editedFio!=null) patch.fio=String(editedFio).trim();
    if(editedStatic!=null) patch.static_id=String(editedStatic).trim();
    if(editedDiscord!=null) patch.discord=String(editedDiscord).trim()||null;
    if(editedValues!=null) patch.values=editedValues;
    const {error}=await c.from("supply_requests").update(patch).eq("id",oldId);
    if(error) return {ok:false,error:error.message};
    return {ok:true,new_id:oldId,replaced_in_place:true};
  }

  async function deleteAll(fromISO,toISO){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    let q=c.from("supply_requests").delete();
    if(fromISO) q=q.gte("created_at",fromISO);
    if(toISO) q=q.lte("created_at",toISO);
    const {error}=await q;
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }

  async function requestRescan(fromISO,toISO){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    const name=(function(){try{return localStorage.getItem("cgb-my-display-name")||(s&&s.user&&s.user.email)||"ss"}catch(e){return "ss"}})();
    const {data,error}=await c.from("supply_rescan_requests").insert({from_date:fromISO||null,to_date:toISO||null,requested_by:s&&s.user?s.user.id:null,requested_by_name:name}).select().single();
    if(error) return {ok:false,error:error.message};
    return {ok:true,id:data.id};
  }
  async function pollRescan(id,timeoutMs){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const deadline=Date.now()+(timeoutMs||60000);
    while(Date.now()<deadline){
      const {data}=await c.from("supply_rescan_requests").select("*").eq("id",id).maybeSingle();
      if(data&&(data.status==="done"||data.status==="error")) return {ok:data.status==="done",scanned:data.scanned,error:data.message};
      await new Promise(r=>setTimeout(r,1200));
    }
    return {ok:false,error:"timeout"};
  }

  async function fetchDsChannels(){
    const c=await client();if(!c) return [];
    const {data}=await c.from("ds_channels").select("*").order("parent_name",{ascending:true,nullsFirst:true}).order("position",{ascending:true});
    return data||[];
  }
  async function fetchDsRoles(){
    const c=await client();if(!c) return [];
    const {data}=await c.from("ds_roles").select("*").order("position",{ascending:false});
    return data||[];
  }

  return {esc,validStatic,fetchForm,saveForm,submit,fetchRequests,updateRequest,deleteRequest,replaceRequest,deleteAll,requestRescan,pollRescan,fetchDsChannels,fetchDsRoles};
})();
