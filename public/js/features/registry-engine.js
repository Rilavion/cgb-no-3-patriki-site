window.CGB_REGISTRY=(function(){
  function client(){return window.CGB_AUTH&&window.CGB_AUTH.state&&window.CGB_AUTH.state.client}
  async function clientReady(){
    if(window.CGB_AUTH&&window.CGB_AUTH.requireClient) return window.CGB_AUTH.requireClient(8000);
    return client();
  }

  const KIND_LABELS={warn:"Предупреждение",reproach:"Выговор",talk:"Беседа с АБ",confinement:"Дисциплинарное заключение",uval:"Отстранение"};
  const KIND_COLORS={warn:"#e6b800",reproach:"#e67e22",talk:"#38bdf8",confinement:"#9b59b6",uval:"#e74c3c"};
  const KIND_ICONS={warn:"⚠",reproach:"‼",talk:"💬",confinement:"🔒",uval:"⛔"};

  async function fetchSettings(){
    const c=await clientReady();if(!c) return null;
    const {data}=await c.from("violations_settings").select("*").eq("id",1).maybeSingle();
    return data||null;
  }

  async function saveSettings(row){
    const c=await clientReady();if(!c) return {ok:false,error:"no client"};
    row.id=1;row.updated_at=new Date().toISOString();
    const s=window.CGB_AUTH.state;
    if(s.user) row.updated_by=s.user.id;
    const {error}=await c.from("violations_settings").upsert(row);
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }

  async function fetchAll(opts){
    const c=await clientReady();if(!c) return [];
    let q=c.from("violations_registry").select("*").order("created_at",{ascending:false});
    if(opts&&opts.activeOnly) q=q.is("removed_at",null);
    if(opts&&opts.target_static) q=q.eq("target_static",opts.target_static);
    if(opts&&opts.limit) q=q.limit(opts.limit);
    const {data,error}=await q;
    if(error){console.warn("[REG] fetchAll:",error.message);return []}
    return data||[];
  }

  function msFor(settings,kind,confinementMinutes){
    if(!settings) return null;
    if(kind==="warn") return (settings.expire_warn_days||0)*86400000;
    if(kind==="reproach") return (settings.expire_reproach_days||0)*86400000;
    if(kind==="talk") return (settings.expire_talk_days||0)*86400000;
    if(kind==="confinement") return (confinementMinutes||(settings.expire_confinement_minutes||((settings.expire_confinement_hours||24)*60)))*60000;
    return null;
  }

  async function add(row,notifyMode,fromComplaint){
    const c=await clientReady();if(!c) return {ok:false,error:"no client"};
    if(notifyMode==null||(notifyMode!=="notify"&&notifyMode!=="silent")) notifyMode="notify";
    const s=window.CGB_AUTH.state;
    if(!s||!s.user) return {ok:false,error:"Требуется вход"};
    if(row.kind==="confinement"&&(!row.confinement_minutes||row.confinement_minutes<=0)){
      return {ok:false,error:"Для «Дисциплинарного заключения» укажите срок"};
    }
    const settings=await fetchSettings();
    const ms=msFor(settings,row.kind,row.confinement_minutes);
    const nowIso=new Date();
    const expiresAt=ms?new Date(nowIso.getTime()+ms).toISOString():null;
    const confMin=row.kind==="confinement"?parseInt(row.confinement_minutes)||0:null;
    const insert={
      target_fio:row.target_fio,
      target_static:row.target_static,
      target_discord_id:row.target_discord_id||null,
      target_position:row.target_position||null,
      kind:row.kind,
      reason:row.reason,
      evidence_url:row.evidence_url||null,
      complaint_id:fromComplaint||null,
      issued_by_uid:s.user.id,
      issued_by_name:row.issued_by_name||s.user.email,
      issued_by_discord_id:row.issued_by_discord_id||null,
      notify_mode:notifyMode,
      expires_at:expiresAt,
      confinement_minutes:confMin
    };
    const {data,error}=await c.from("violations_registry").insert(insert).select().single();
    if(error) return {ok:false,error:error.message};
    return {ok:true,row:data};
  }

  async function removeViolation(id,reason){
    const c=await clientReady();if(!c) return {ok:false,error:"no client"};
    const s=window.CGB_AUTH.state;
    if(!s||!s.user) return {ok:false,error:"Требуется вход"};
    const nm=(function(){try{return localStorage.getItem("cgb-my-display-name")||s.user.email}catch(e){return s.user.email}})();
    const {error}=await c.from("violations_registry").update({
      removed_at:new Date().toISOString(),
      removed_reason:reason||"Снято вручную",
      removed_by_uid:s.user.id,
      removed_by_name:nm
    }).eq("id",id);
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }

  async function hardDelete(id){
    const c=await clientReady();if(!c) return {ok:false,error:"no client"};
    const {error}=await c.from("violations_registry").delete().eq("id",id);
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }

  function groupByPerson(rows){
    const m=new Map();
    for(const r of rows){
      const key=r.target_static||r.target_fio;
      if(!m.has(key)) m.set(key,{fio:r.target_fio,static:r.target_static,discord_id:r.target_discord_id,items:[]});
      m.get(key).items.push(r);
    }
    return Array.from(m.values()).sort((a,b)=>{
      const ac=a.items.filter(x=>!x.removed_at).length;
      const bc=b.items.filter(x=>!x.removed_at).length;
      return bc-ac;
    });
  }

  function activeCount(items,kind){
    return items.filter(x=>!x.removed_at&&(!kind||x.kind===kind)).length;
  }

  return {fetchSettings,saveSettings,fetchAll,add,removeViolation,hardDelete,
          groupByPerson,activeCount,msFor,KIND_LABELS,KIND_COLORS,KIND_ICONS};
})();
