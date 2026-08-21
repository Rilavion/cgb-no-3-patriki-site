window.CGB_PAYROLL=(function(){
  function client(){return window.CGB_AUTH&&window.CGB_AUTH.state&&window.CGB_AUTH.state.client}
  async function clientReady(){
    if(window.CGB_AUTH&&window.CGB_AUTH.requireClient) return window.CGB_AUTH.requireClient(8000);
    return client();
  }

  async function fetchSettings(){
    const c=await clientReady();if(!c) return null;
    const {data}=await c.from("payroll_settings").select("*").eq("id",1).maybeSingle();
    return data;
  }
  async function saveSettings(row){
    const c=await clientReady();if(!c) return {ok:false,error:"no client"};
    row.id=1;row.updated_at=new Date().toISOString();
    const s=window.CGB_AUTH.state;
    if(s.user) row.updated_by=s.user.id;
    const {error}=await c.from("payroll_settings").upsert(row);
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }

  async function ensureDraft(){
    const c=await clientReady();if(!c) return null;
    const {data,error}=await c.rpc("ensure_payroll_draft");
    if(error){console.warn("[PAYROLL] ensureDraft:",error.message);return null}
    const {data:draft}=await c.from("payroll_drafts").select("*").eq("id",data).maybeSingle();
    return draft;
  }
  async function loadDraft(id){
    const c=await clientReady();if(!c) return null;
    const {data}=await c.from("payroll_drafts").select("*").eq("id",id).maybeSingle();
    return data;
  }
  async function saveDraft(id,patch){
    const c=await clientReady();if(!c) return {ok:false,error:"no client"};
    const s=window.CGB_AUTH.state;
    patch.updated_at=new Date().toISOString();
    if(s.user) patch.updated_by=s.user.id;
    const {error}=await c.from("payroll_drafts").update(patch).eq("id",id);
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }
  async function listArchive(limit){
    const c=await clientReady();if(!c) return [];
    const {data}=await c.from("payroll_drafts").select("*").eq("status","sent").order("sent_at",{ascending:false}).limit(limit||30);
    return data||[];
  }

  async function loadRoles(){
    const c=await clientReady();if(!c) return [];
    const {data}=await c.from("ds_guild_roles").select("*").order("position",{ascending:false});
    return data||[];
  }

  async function fetchMembersByRoleId(roleId){
    const c=await clientReady();if(!c) return [];
    const {data}=await c.from("ds_members").select("discord_id,parsed_fio,parsed_static,parsed_dept,display_name,raw_nick,role_ids,role_names").eq("active",true).limit(2000);
    if(!data) return [];
    const list=data.filter(m=>Array.isArray(m.role_ids)&&m.role_ids.includes(roleId));
    return list.map(m=>({
      discord_id:m.discord_id,
      fio:(m.parsed_fio||m.display_name||m.raw_nick||"—").trim(),
      static:m.parsed_static||"",
      dept:m.parsed_dept||"",
      raw_nick:m.raw_nick||""
    }));
  }

  async function markSent(id,dsMsgId,dsChId,sentByName){
    const c=await clientReady();if(!c) return {ok:false,error:"no client"};
    const {error}=await c.rpc("archive_payroll_draft",{p_id:id,p_ds_msg_id:dsMsgId||null,p_ds_ch_id:dsChId||null,p_sent_by_name:sentByName||null});
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }

  function fmtMoney(n){
    const v=Math.round((+n||0));
    return v.toLocaleString("ru-RU",{timeZone:"Europe/Moscow"})+" ₽";
  }

  function calc(draft){
    const data=(draft&&draft.data)||{departments:[]};
    const fund=Math.round(Number(draft&&draft.fund_amount)||0);
    const depts=(data.departments||[]).map(d=>Object.assign({},d,{members:(d.members||[]).slice()}));
    const manual=draft&&draft.pct_manual!==false;
    if(!manual&&depts.length){
      const equal=100/depts.length;
      for(const d of depts) d.pct=equal;
    }
    let totalPct=depts.reduce((s,d)=>s+(Number(d.pct)||0),0);
    for(const d of depts){
      const pct=Number(d.pct)||0;
      d.dept_amount=Math.round(fund*(pct/100));
      const active=d.members.filter(m=>!m.excluded);
      let overrideSum=0;
      let sharesSum=0;
      for(const m of active){
        if(m.override_amount!=null&&m.override_amount!==""){
          overrideSum+=Math.round(Number(m.override_amount)||0);
        } else {
          sharesSum+=Number(m.share||1)||1;
        }
      }
      const remaining=Math.max(0,d.dept_amount-overrideSum);
      const shareItems=[];
      for(const m of d.members){
        if(m.excluded){m.amount=0;continue}
        if(m.override_amount!=null&&m.override_amount!==""){
          m.amount=Math.round(Number(m.override_amount)||0);
        } else {
          const share=Number(m.share||1)||1;
          const raw=sharesSum>0?(remaining*share/sharesSum):0;
          m.amount=Math.floor(raw);
          shareItems.push(m);
        }
      }
      const distributed=shareItems.reduce((s,m)=>s+m.amount,0);
      let leftover=remaining-distributed;
      let i=0;
      while(leftover>0&&shareItems.length){
        shareItems[i%shareItems.length].amount+=1;
        leftover--;i++;
      }
      d.members_sum=d.members.reduce((s,m)=>s+(m.excluded?0:m.amount),0);
      d.overspend=d.members_sum>d.dept_amount+0.5;
    }
    const totalSpent=depts.reduce((s,d)=>s+d.members_sum,0);
    return {fund,total_pct:totalPct,total_spent:totalSpent,departments:depts,overspend:totalSpent>fund+0.5};
  }

  return {fetchSettings,saveSettings,ensureDraft,loadDraft,saveDraft,listArchive,
          loadRoles,fetchMembersByRoleId,markSent,fmtMoney,calc};
})();
