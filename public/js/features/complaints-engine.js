window.CGB_COMPLAINTS=(function(){
  function client(){return window.CGB_AUTH&&window.CGB_AUTH.state&&window.CGB_AUTH.state.client}

  async function getForm(){
    const c=client();if(!c) return null;
    try{
      const {data,error}=await c.rpc("get_complaint_form");
      if(error){console.warn("[COMPLAINTS] getForm rpc:",error.message);return null}
      return data;
    }catch(e){return null}
  }

  async function saveForm(row){
    const c=client();if(!c) return {ok:false,error:"no client"};
    row.id=1;row.updated_at=new Date().toISOString();
    const s=window.CGB_AUTH.state;
    if(s.user) row.updated_by=s.user.id;
    const {error}=await c.from("complaint_form").upsert(row);
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }

  async function submit(values,submitter,target,evidenceUrl){
    const c=client();if(!c) return {ok:false,error:"no client"};
    try{
      const {data,error}=await c.rpc("submit_complaint",{
        p_values:values||{},
        p_submitter_fio:submitter.fio||null,
        p_submitter_static:submitter.static||null,
        p_submitter_discord:submitter.discord||null,
        p_target_fio:target.fio||null,
        p_target_static:target.static||null,
        p_target_discord_id:target.discord_id||null,
        p_evidence_url:evidenceUrl||null
      });
      if(error) return {ok:false,error:error.message};
      const row=Array.isArray(data)?data[0]:data;
      return {ok:true,id:row.id,code:row.code};
    }catch(e){return {ok:false,error:e.message}}
  }

  async function fetchAll(filter){
    const c=client();if(!c) return [];
    let q=c.from("complaints").select("*").order("created_at",{ascending:false});
    if(filter&&filter.status) q=q.eq("status",filter.status);
    if(filter&&filter.target_static) q=q.eq("target_static",filter.target_static);
    const {data,error}=await q;
    if(error){console.warn("[COMPLAINTS] fetchAll:",error.message);return []}
    return data||[];
  }

  async function fetchOne(id){
    const c=client();if(!c) return null;
    const {data,error}=await c.from("complaints").select("*").eq("id",id).maybeSingle();
    if(error) return null;
    return data;
  }

  async function decide(id,verdict,comment,verdictByName){
    const c=client();if(!c) return {ok:false,error:"no client"};
    const s=window.CGB_AUTH.state;
    if(!s||!s.user) return {ok:false,error:"Требуется вход"};
    const row={
      status:"decided",
      verdict,
      verdict_comment:comment||null,
      verdict_by_uid:s.user.id,
      verdict_by_name:verdictByName||s.user.email,
      verdict_at:new Date().toISOString()
    };
    const {data,error}=await c.from("complaints").update(row).eq("id",id).select().single();
    if(error) return {ok:false,error:error.message};
    return {ok:true,row:data};
  }

  async function remove(id){
    const c=client();if(!c) return {ok:false,error:"no client"};
    const {error}=await c.from("complaints").delete().eq("id",id);
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }

  async function editComplaint(id,changes,changedByName){
    const c=client();if(!c) return {ok:false,error:"no client"};
    const s=window.CGB_AUTH.state;
    if(!s||!s.user) return {ok:false,error:"Требуется вход"};
    const before=await fetchOne(id);
    if(!before) return {ok:false,error:"Жалоба не найдена"};
    const patch={};
    const diff={};
    const trackable=["submitter_fio","submitter_static","submitter_discord","target_fio","target_static","target_discord_id","evidence_url"];
    for(const k of trackable){
      if(changes[k]!==undefined&&changes[k]!==before[k]){
        patch[k]=changes[k];
        diff[k]={from:before[k]||null,to:changes[k]||null};
      }
    }
    if(changes.values){
      const bv=before.values||{};
      const nv=Object.assign({},bv,changes.values);
      const vdiff={};
      for(const k of Object.keys(nv)){
        if(String(bv[k]||"")!==String(nv[k]||"")){
          vdiff[k]={from:bv[k]||null,to:nv[k]||null};
        }
      }
      if(Object.keys(vdiff).length){
        patch.values=nv;
        diff.values=vdiff;
      }
    }
    if(!Object.keys(patch).length) return {ok:true,noop:true};
    patch.edited_at=new Date().toISOString();
    patch.edited_by_uid=s.user.id;
    patch.edited_by_name=changedByName||s.user.email;
    const {error}=await c.from("complaints").update(patch).eq("id",id);
    if(error) return {ok:false,error:error.message};
    await c.from("complaint_history").insert({
      complaint_id:id,
      action:"edit",
      changed_by_uid:s.user.id,
      changed_by_name:changedByName||s.user.email,
      changes:diff,
      note:changes.note||null
    });
    return {ok:true};
  }

  async function changeVerdict(id,verdict,comment,changedByName){
    const c=client();if(!c) return {ok:false,error:"no client"};
    const s=window.CGB_AUTH.state;
    if(!s||!s.user) return {ok:false,error:"Требуется вход"};
    const before=await fetchOne(id);
    if(!before) return {ok:false,error:"Жалоба не найдена"};
    const diff={
      verdict:{from:before.verdict,to:verdict},
      verdict_comment:{from:before.verdict_comment||null,to:comment||null}
    };
    const patch={
      verdict,
      verdict_comment:comment||null,
      verdict_by_uid:s.user.id,
      verdict_by_name:changedByName||s.user.email,
      verdict_at:new Date().toISOString(),
      status:"decided",
      edited_at:new Date().toISOString(),
      edited_by_uid:s.user.id,
      edited_by_name:changedByName||s.user.email
    };
    const {error}=await c.from("complaints").update(patch).eq("id",id);
    if(error) return {ok:false,error:error.message};
    await c.from("complaint_history").insert({
      complaint_id:id,
      action:"verdict_change",
      changed_by_uid:s.user.id,
      changed_by_name:changedByName||s.user.email,
      changes:diff
    });
    return {ok:true};
  }

  async function getHistory(id){
    const c=client();if(!c) return [];
    const {data}=await c.from("complaint_history").select("*").eq("complaint_id",id).order("created_at",{ascending:false});
    return data||[];
  }

  return {getForm,saveForm,submit,fetchAll,fetchOne,decide,remove,editComplaint,changeVerdict,getHistory};
})();
