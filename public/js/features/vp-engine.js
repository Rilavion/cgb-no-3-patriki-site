window.CGB_VP=(function(){

  function waitReady(){
    if(window.CGB_AUTH&&window.CGB_AUTH.whenReady) return window.CGB_AUTH.whenReady(8000);
    return new Promise(resolve=>{
    const deadline=Date.now()+5000;
    function ck(){const s=window.CGB_AUTH&&window.CGB_AUTH.state;if(s&&s.ready){resolve(s);return true}return false}
    if(ck()) return;
    const t=setInterval(()=>{if(ck()){clearInterval(t)}else if(Date.now()>deadline){clearInterval(t);resolve(null)}},80);
    });
  }

  async function client(){
    await waitReady();
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    return s&&s.client?s.client:null;
  }

  async function fetchMembers(){
    const c=await client();if(!c) return [];
    const {data,error}=await c.from("ds_members").select("*").eq("active",true).order("parsed_fio",{ascending:true});
    if(error){console.warn("[VP fetchMembers]",error.message);return []}
    return data||[];
  }

  async function fetchRoles(){
    const c=await client();if(!c) return [];
    const {data,error}=await c.from("ds_roles").select("*").order("position",{ascending:false});
    if(error){console.warn("[VP fetchRoles]",error.message);return []}
    return data||[];
  }

  async function fetchMapping(){
    const c=await client();if(!c) return [];
    const {data,error}=await c.from("vp_role_mapping").select("*");
    if(error){console.warn("[VP fetchMapping]",error.message);return []}
    return data||[];
  }

  async function saveMappingBatch(rows,toRemoveIds){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    if(toRemoveIds&&toRemoveIds.length){
      const {error}=await c.from("vp_role_mapping").delete().in("role_id",toRemoveIds);
      if(error) return {ok:false,error:error.message};
    }
    if(rows&&rows.length){
      const {error}=await c.from("vp_role_mapping").upsert(rows,{onConflict:"role_id"});
      if(error) return {ok:false,error:error.message};
    }
    return {ok:true};
  }

  async function fetchChecks(){
    const c=await client();if(!c) return [];
    const {data,error}=await c.from("vp_checks").select("*");
    if(error){console.warn("[VP fetchChecks]",error.message);return []}
    return data||[];
  }

  async function saveCheck(discordId,patch,checkerName){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    const name=(checkerName&&String(checkerName).trim())||null;
    if(!name) return {ok:false,error:"empty_checker"};
    const row={
      discord_id:discordId,
      ...patch,
      checked_by:s&&s.user?s.user.id:null,
      checked_by_name:name,
      checked_at:new Date().toISOString(),
      updated_at:new Date().toISOString()
    };
    const {error}=await c.from("vp_checks").upsert(row,{onConflict:"discord_id"});
    if(error) return {ok:false,error:error.message};
    return {ok:true,checker:name};
  }

  async function saveEvidence(discordId,url,checkerName){
    return saveCheck(discordId,{evidence_url:url||null},checkerName);
  }

  async function resetCheck(discordId){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const {error}=await c.from("vp_checks").delete().eq("discord_id",discordId);
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }

  async function resetChecksBulk(discordIds){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    if(!discordIds||!discordIds.length) return {ok:true,count:0};
    const {error}=await c.from("vp_checks").delete().in("discord_id",discordIds);
    if(error) return {ok:false,error:error.message};
    return {ok:true,count:discordIds.length};
  }

  async function requestSync(){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    const name=(function(){try{return localStorage.getItem("cgb-my-display-name")||(s&&s.user&&s.user.email)||"admin"}catch(e){return "admin"}})();
    const {data,error}=await c.from("ds_sync_requests").insert({requested_by:s&&s.user?s.user.id:null,requested_by_name:name}).select().single();
    if(error) return {ok:false,error:error.message};
    return {ok:true,id:data.id};
  }

  async function pollSyncStatus(id,timeoutMs){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const deadline=Date.now()+(timeoutMs||90000);
    while(Date.now()<deadline){
      const {data}=await c.from("ds_sync_requests").select("*").eq("id",id).maybeSingle();
      if(data&&(data.status==="done"||data.status==="error")) return {ok:data.status==="done",status:data.status,message:data.message,members_scanned:data.members_scanned};
      await new Promise(r=>setTimeout(r,1500));
    }
    return {ok:false,error:"timeout"};
  }

  async function fetchBotStatus(){
    const c=await client();if(!c) return null;
    const {data}=await c.from("bot_status").select("*").eq("id",1).maybeSingle();
    return data||null;
  }

  async function fetchSettings(){
    const c=await client();if(!c) return null;
    const {data}=await c.from("vp_settings").select("*").eq("id",1).maybeSingle();
    return data||null;
  }

  async function saveSettings(patch){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    const row=Object.assign({id:1,updated_at:new Date().toISOString(),updated_by:s&&s.user?s.user.id:null},patch);
    const {error}=await c.from("vp_settings").upsert(row,{onConflict:"id"});
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }

  async function fetchArchives(limit){
    const c=await client();if(!c) return [];
    const {data,error}=await c.from("vp_archive").select("id,title,period_from,period_to,saved_at,saved_by_name,members_total,members_checked,members_partial,report_message_id,report_sent_at,report_sent_by_name,notes,stats").order("saved_at",{ascending:false}).limit(limit||50);
    if(error){console.warn("[VP archives]",error.message);return []}
    return data||[];
  }

  async function fetchArchiveFull(id){
    const c=await client();if(!c) return null;
    const {data,error}=await c.from("vp_archive").select("*").eq("id",id).maybeSingle();
    if(error){console.warn("[VP archive full]",error.message);return null}
    return data||null;
  }

  function buildSnapshot(members,checks,mapping,hideNoDept){
    const groups=groupByDept(members,mapping,{hideNoDept:!!hideNoDept});
    const out={groups:[],saved_at:new Date().toISOString()};
    for(const g of groups){
      const list=[];
      for(const m of g.list){
        const c=checks[m.discord_id]||{};
        const set=["medbook","narko","driver","passport","personal_file","weapon_license","attestation"].filter(k=>c[k]!=null).length;
        if(set===0) continue;
        list.push({
          discord_id:m.discord_id,
          parsed_fio:m.parsed_fio||m.display_name||"",
          parsed_static:m.parsed_static||"",
          display_name:m.display_name||"",
          raw_nick:m.raw_nick||"",
          position:positionFor(m,mapping),
          medbook:c.medbook||null,
          narko:c.narko||null,
          driver:c.driver||null,
          passport:c.passport||null,
          personal_file:c.personal_file||null,
          weapon_license:c.weapon_license||null,
          attestation:c.attestation||null,
          evidence_url:c.evidence_url||null,
          checked_by_name:c.checked_by_name||null,
          checked_at:c.checked_at||null
        });
      }
      if(list.length) out.groups.push({name:g.name,list});
    }
    return out;
  }

  function calcSnapshotStats(snapshot){
    const KEYS=["medbook","narko","driver","passport","personal_file","weapon_license","attestation"];
    function normalize(m){
      const hasNo=KEYS.some(k=>m[k]==="no");
      const hasProof=!!(m.evidence_url && String(m.evidence_url).trim());
      if(hasNo && !hasProof){
        const out=Object.assign({},m);
        for(const k of KEYS){ if(out[k]==="no") out[k]=null; }
        return out;
      }
      return m;
    }
    const totals={};for(const k of KEYS) totals[k]={yes:0,no:0,absent:0,none:0};
    let checked=0,partial=0,unchecked=0,total=0;
    for(const g of snapshot.groups||[]){
      for(const raw of (g.list||[])){
        const m=normalize(raw);
        total++;
        let set=0;
        for(const k of KEYS){
          const v=m[k]||null;
          if(v==="yes"){totals[k].yes++;set++}
          else if(v==="no"){totals[k].no++;set++}
          else if(v==="absent"){totals[k].absent++;set++}
          else totals[k].none++;
        }
        if(set===KEYS.length) checked++;
        else if(set>0) partial++;
        else unchecked++;
      }
    }
    return {totals,checked,partial,unchecked,total};
  }

  async function saveArchive(payload){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    const name=(function(){try{return localStorage.getItem("cgb-my-display-name")||(s&&s.user&&s.user.email)||"ss"}catch(e){return "ss"}})();
    const stats=calcSnapshotStats(payload.snapshot);
    const row={
      title:payload.title||("Проверка от "+new Date().toLocaleDateString("ru-RU",{timeZone:"Europe/Moscow"})),
      period_from:payload.period_from||null,
      period_to:payload.period_to||new Date().toISOString(),
      saved_by:s&&s.user?s.user.id:null,
      saved_by_name:name,
      snapshot:payload.snapshot,
      stats:stats,
      members_total:stats.total,
      members_checked:stats.checked,
      members_partial:stats.partial,
      notes:payload.notes||null
    };
    const {data,error}=await c.from("vp_archive").insert(row).select().single();
    if(error) return {ok:false,error:error.message};
    return {ok:true,id:data.id,stats};
  }

  async function deleteArchive(id){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const {error}=await c.from("vp_archive").delete().eq("id",id);
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }

  async function updateArchive(id,patch){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const row=Object.assign({},patch,{updated_at:new Date().toISOString()});
    const {error}=await c.from("vp_archive").update(row).eq("id",id);
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }

  async function requestReport(archiveId,channelId){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    const name=(function(){try{return localStorage.getItem("cgb-my-display-name")||(s&&s.user&&s.user.email)||"ss"}catch(e){return "ss"}})();
    const {data,error}=await c.from("vp_report_requests").insert({archive_id:archiveId,channel_id:channelId,requested_by:s&&s.user?s.user.id:null,requested_by_name:name}).select().single();
    if(error) return {ok:false,error:error.message};
    return {ok:true,id:data.id};
  }

  async function pollReportStatus(id,timeoutMs){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const deadline=Date.now()+(timeoutMs||60000);
    while(Date.now()<deadline){
      const {data}=await c.from("vp_report_requests").select("*").eq("id",id).maybeSingle();
      if(data&&(data.status==="sent"||data.status==="error")) return {ok:data.status==="sent",status:data.status,error:data.message,sent_message_id:data.sent_message_id};
      await new Promise(r=>setTimeout(r,1200));
    }
    return {ok:false,error:"timeout"};
  }

  async function fetchDsChannels(){
    const c=await client();if(!c) return [];
    const {data,error}=await c.from("ds_channels").select("*").order("parent_name",{ascending:true,nullsFirst:true}).order("position",{ascending:true});
    if(error){return []}
    return data||[];
  }

  function filterMembers(members,mapping){
    const excludeIds=new Set(mapping.filter(m=>m.show==="exclude").map(m=>m.role_id));
    const includeIds=new Set(mapping.filter(m=>m.show==="include").map(m=>m.role_id));
    const useInclude=includeIds.size>0;
    const out=[];
    for(const m of members){
      const ids=m.role_ids||[];
      let excluded=false;
      for(const id of ids){if(excludeIds.has(id)){excluded=true;break}}
      if(excluded) continue;
      if(useInclude){
        let ok=false;
        for(const id of ids){if(includeIds.has(id)){ok=true;break}}
        if(!ok) continue;
      }
      out.push(m);
    }
    return out;
  }

  function groupByDept(members,mapping,opts){
    const filtered=filterMembers(members,mapping);
    const deptMap=new Map();
    for(const m of mapping){ if(m.role_kind==="department") deptMap.set(m.role_id, m.label||m.role_name||m.role_id); }
    if(!deptMap.size) return [];
    const groups=new Map();
    for(const [rid,label] of deptMap) groups.set(label,[]);
    for(const mem of filtered){
      const ids=mem.role_ids||[];
      for(const id of ids){
        if(deptMap.has(id)){
          const label=deptMap.get(id);
          groups.get(label).push(mem);
          break;
        }
      }
    }
    return Array.from(groups.entries())
      .filter(([,list])=>list.length>0)
      .map(([name,list])=>({name,list}))
      .sort((a,b)=>a.name.localeCompare(b.name,"ru"));
  }

  function positionFor(member,mapping){
    const posRoleIds=new Set(mapping.filter(m=>m.role_kind==="position").map(m=>m.role_id));
    const labels={};
    for(const m of mapping){if(m.label) labels[m.role_id]=m.label}
    const ids=member.role_ids||[];
    const names=member.role_names||[];
    for(let i=0;i<ids.length;i++){
      if(posRoleIds.has(ids[i])) return labels[ids[i]]||names[i]||ids[i];
    }
    return "—";
  }

  function staticFor(member){
    return (member.parsed_static||"").trim()||"—";
  }

  return {fetchMembers,fetchRoles,fetchMapping,saveMappingBatch,fetchChecks,saveCheck,saveEvidence,resetCheck,resetChecksBulk,requestSync,pollSyncStatus,fetchBotStatus,fetchSettings,saveSettings,fetchArchives,fetchArchiveFull,buildSnapshot,calcSnapshotStats,saveArchive,deleteArchive,updateArchive,requestReport,pollReportStatus,fetchDsChannels,filterMembers,groupByDept,positionFor,staticFor};
})();
