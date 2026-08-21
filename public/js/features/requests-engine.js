window.CGB_REQUESTS=(function(){
  function client(){return window.CGB_AUTH&&window.CGB_AUTH.state&&window.CGB_AUTH.state.client}
  async function clientReady(){
    if(window.CGB_AUTH&&window.CGB_AUTH.requireClient) return window.CGB_AUTH.requireClient(8000);
    return client();
  }

  const KIND_META={
    leave:{label:"Отгул",icon:"🕒",color:"#38bdf8"},
    vacation_ic:{label:"Отпуск (IC)",icon:"🏖",color:"#8fd97a"},
    vacation_ooc:{label:"Отпуск (OOC)",icon:"💤",color:"#a2d8ff"},
    dismissal:{label:"Увольнение",icon:"⛔",color:"#e97a7a"},
    promotion:{label:"Повышение",icon:"⭐",color:"#a5f3fc"},
    restoration:{label:"Восстановление",icon:"🔄",color:"#7ac3f0"},
    appointment:{label:"Запись к врачу",icon:"🩺",color:"#34d399"}
  };

  async function getForm(kind){
    const c=await clientReady();
    if(!c){console.warn("[REQ] getForm("+kind+"): нет client (auth не готов)");return null}
    const {data,error}=await c.from("request_forms").select("*").eq("id",kind).maybeSingle();
    if(error) console.warn("[REQ] getForm error:",error.message);
    console.log("[REQ] getForm("+kind+") →",data);
    return data;
  }
  async function saveForm(row){
    const c=await clientReady();if(!c) return {ok:false,error:"no client"};
    row.updated_at=new Date().toISOString();
    const s=window.CGB_AUTH.state;
    if(s.user) row.updated_by=s.user.id;
    console.log("[REQ] saveForm payload:",JSON.parse(JSON.stringify(row)));
    const {data,error}=await c.from("request_forms").upsert(row).select().maybeSingle();
    if(error){
      console.warn("[REQ] saveForm error:",error);
      return {ok:false,error:error.message};
    }
    console.log("[REQ] saveForm → back:",data);
    if(row.rank_matrix && data && !data.rank_matrix){
      return {ok:false,error:"Колонка rank_matrix не найдена в таблице request_forms. Выполните SQL/SUPABASE-REQUESTS-V113.sql в Supabase."};
    }
    return {ok:true,data};
  }

  const DEFAULT_RANKS=["Интерн","Фельдшер","Лаборант","Врач","Хирург","Заведующий отделением","Заместитель главного врача","Главный врач"];

  function getRankList(promoForm){
    if(promoForm && promoForm.rank_matrix && Array.isArray(promoForm.rank_matrix.ranks) && promoForm.rank_matrix.ranks.length) return promoForm.rank_matrix.ranks;
    return DEFAULT_RANKS.slice();
  }
  function getDeptList(promoForm){
    if(!promoForm||!promoForm.rank_matrix) return [];
    const d=promoForm.rank_matrix.departments;
    return Array.isArray(d)?d:[];
  }
  function getDeptByKey(promoForm,deptKey){
    return getDeptList(promoForm).find(d=>d.key===deptKey)||null;
  }
  function getRankFields(promoForm,targetRank,deptKey){
    if(!promoForm || !promoForm.rank_matrix) return [];
    const rm=promoForm.rank_matrix;
    if(deptKey){
      const dept=(rm.dept_fields||{})[deptKey];
      if(dept && Array.isArray(dept[targetRank]) && dept[targetRank].length) return dept[targetRank];
    }
    const map=rm.fields||{};
    return Array.isArray(map[targetRank])?map[targetRank]:[];
  }

  async function getSettings(){
    const c=await clientReady();if(!c) return null;
    const {data}=await c.from("requests_settings").select("*").eq("id",1).maybeSingle();
    return data;
  }
  async function saveSettings(row){
    const c=await clientReady();if(!c) return {ok:false,error:"no client"};
    row.id=1;row.updated_at=new Date().toISOString();
    const s=window.CGB_AUTH.state;
    if(s.user) row.updated_by=s.user.id;
    const {error}=await c.from("requests_settings").upsert(row);
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }

  async function submit(kind,values,fio,stat,discord){
    const c=await clientReady();if(!c) return {ok:false,error:"no client"};
    try{
      const {data,error}=await c.rpc("submit_request",{
        p_kind:kind,p_values:values||{},p_fio:fio||null,p_static:stat||null,p_discord:discord||null
      });
      if(error) return {ok:false,error:error.message};
      const row=Array.isArray(data)?data[0]:data;
      return {ok:true,id:row.id,code:row.code};
    }catch(e){return {ok:false,error:e.message}}
  }

  async function fetchAll(filter){
    const c=await clientReady();if(!c) return [];
    let q=c.from("requests").select("*").order("created_at",{ascending:false});
    if(filter&&filter.kind) q=q.eq("kind",filter.kind);
    if(filter&&filter.status) q=q.eq("status",filter.status);
    if(filter&&filter.limit) q=q.limit(filter.limit); else q=q.limit(500);
    const {data,error}=await q;
    if(error){console.warn("[REQ] fetchAll:",error.message);return []}
    return data||[];
  }

  async function fetchOne(id){
    const c=await clientReady();if(!c) return null;
    const {data}=await c.from("requests").select("*").eq("id",id).maybeSingle();
    return data;
  }

  async function decide(id,status,comment,verdictByName){
    const c=await clientReady();if(!c) return {ok:false,error:"no client"};
    const s=window.CGB_AUTH.state;
    if(!s||!s.user) return {ok:false,error:"Требуется вход"};
    const row={
      status,verdict_comment:comment||null,
      verdict_by_uid:s.user.id,verdict_by_name:verdictByName||s.user.email,
      verdict_at:new Date().toISOString()
    };
    const {error}=await c.from("requests").update(row).eq("id",id);
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }

  async function remove(id){
    const c=await clientReady();if(!c) return {ok:false,error:"no client"};
    const {error}=await c.from("requests").delete().eq("id",id);
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }

  async function checkActiveViolations(stat){
    const c=await clientReady();if(!c || !stat) return 0;
    const norm=String(stat).replace(/\D/g,"");
    if(!norm) return 0;
    try{
      const {data,error}=await c.from("violations_registry")
        .select("id,target_static,removed_at,expires_at")
        .is("removed_at",null)
        .limit(500);
      if(error){console.warn("[REQ] checkActiveViolations err:",error.message);return 0}
      if(!data) return 0;
      const now=Date.now();
      const matched=data.filter(v=>{
        if(String(v.target_static||"").replace(/\D/g,"")!==norm) return false;
        if(v.expires_at){const t=new Date(v.expires_at).getTime();if(!isNaN(t)&&t<now) return false}
        return true;
      });
      console.log("[REQ] checkActiveViolations("+stat+")="+matched.length,"total in reg:",data.length);
      return matched.length;
    }catch(e){console.warn("[REQ] checkActiveViolations exc:",e.message);return 0}
  }

  function timeToMinutes(t){
    if(!t) return 0;
    const p=String(t).split(":");
    return (parseInt(p[0])||0)*60+(parseInt(p[1])||0);
  }

  function validateLeaveTime(startStr,durationMin,settings,dateStr){
    if(!settings) return {ok:true};
    const start=timeToMinutes(startStr);
    if(!start) return {ok:false,error:"Укажите время начала"};
    if(!durationMin||durationMin<=0) return {ok:false,error:"Укажите длительность"};
    if(durationMin>(settings.max_leave_minutes||60)) return {ok:false,error:"Максимум "+(settings.max_leave_minutes||60)+" минут"};
    const end=start+durationMin;
    const dayStart=timeToMinutes(settings.weekday_start||"09:00");
    let dayEnd=timeToMinutes(settings.weekday_end||"22:00");
    if(dateStr){
      const dt=new Date(dateStr);
      const dow=dt.getDay();
      if(dow===0||dow===6) dayEnd=timeToMinutes(settings.weekend_end||"21:00");
    }
    if(start<dayStart) return {ok:false,error:"Время до начала распорядка ("+((settings.weekday_start||"09:00"))+")"};
    if(end>dayEnd) return {ok:false,error:"Время выходит за конец распорядка ("+minutesToTime(dayEnd)+")"};
    const lunchS=timeToMinutes(settings.lunch_start||"14:00");
    const lunchE=timeToMinutes(settings.lunch_end||"15:00");
    if(start<lunchE&&end>lunchS) return {ok:false,error:"Время пересекается с обедом ("+minutesToTime(lunchS)+"–"+minutesToTime(lunchE)+")"};
    const pov=timeToMinutes(settings.poverka_time||"21:00");
    const w=settings.poverka_window_min||30;
    if(start<pov+w&&end>pov-w) return {ok:false,error:"Время пересекается с поверкой ("+minutesToTime(pov-w)+"–"+minutesToTime(pov+w)+")"};
    return {ok:true};
  }
  function minutesToTime(m){
    const h=Math.floor(m/60);const mm=m%60;
    return String(h).padStart(2,"0")+":"+String(mm).padStart(2,"0");
  }

  return {KIND_META,DEFAULT_RANKS,getForm,saveForm,getSettings,saveSettings,submit,fetchAll,fetchOne,decide,remove,checkActiveViolations,validateLeaveTime,minutesToTime,timeToMinutes,getRankList,getRankFields,getDeptList,getDeptByKey};
})();
