(function(){
  "use strict";

  const POLL_ACTIVE=60000;
  const POLL_HIDDEN=5*60000;
  const MAX_PER_SOURCE=18;
  const STATUS_LABELS={
    new:["Новая","new",true],pending:["Ожидает","new",true],processing:["В работе","warn",true],
    draft:["Черновик","warn",true],partial:["Частично","warn",true],
    approved:["Одобрено","ok",false],active:["Одобрено","ok",false],done:["Готово","ok",false],
    sent:["Отправлено","ok",false],decided:["Рассмотрено","ok",false],reviewed:["Проверено","ok",false],
    passed:["Пройдено","ok",false],ready:["Готово","ok",false],archived:["Архив","muted",false],
    rejected:["Отклонено","bad",false],refused:["Отказано","bad",false],failed:["Не пройдено","bad",false],
    error:["Ошибка","bad",false],withdrawn:["Отозвано","muted",false],removed:["Снято","muted",false]
  };
  const REQUEST_KINDS={
    leave:"Отгул",vacation_ic:"Отпуск IC",vacation_ooc:"Отпуск OOC",promotion:"Повышение",
    dismissal:"Увольнение",restoration:"Восстановление",appointment:"Запись ко врачу"
  };
  const VIOLATION_KINDS={warn:"Предупреждение",reproach:"Выговор",talk:"Беседа",confinement:"Дисц. заключение",uval:"Отстранение"};
  const CHECK_FIELDS=["medbook","narko","driver","passport","personal_file","weapon_license","attestation"];

  let shell=null;
  let items=[];
  let errors=[];
  let loading=false;
  let timer=null;
  let loadGeneration=0;
  let currentUserId=null;
  let authUnsub=null;
  let roleUnsub=null;

  function esc(value){
    return String(value==null?"":value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  }
  function compact(value,max){
    const s=String(value==null?"":value).replace(/\s+/g," ").trim();
    return s.length>(max||100)?s.slice(0,(max||100)-1)+"…":s;
  }
  function when(value){
    const ms=value?new Date(value).getTime():0;
    return Number.isFinite(ms)?ms:0;
  }
  function formatTime(ms){
    if(!ms) return "";
    const diff=Math.max(0,Date.now()-ms);
    if(diff<60000) return "только что";
    if(diff<3600000) return Math.floor(diff/60000)+" мин назад";
    if(diff<86400000) return Math.floor(diff/3600000)+" ч назад";
    const d=new Date(ms);
    return d.toLocaleDateString("ru-RU",{day:"2-digit",month:"short",year:d.getFullYear()===new Date().getFullYear()?undefined:"numeric"})+
      " · "+d.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"});
  }
  function getStatus(key,fallback){
    const raw=String(key||"").toLowerCase();
    const row=STATUS_LABELS[raw]||[fallback||raw||"Запись","info",false];
    return {key:raw||"info",label:row[0],tone:row[1],active:!!row[2]};
  }
  function can(section,actions){
    const roles=window.CGB_ROLES;
    if(!roles||typeof roles.can!=="function") return false;
    return (Array.isArray(actions)?actions:[actions||"view"]).some(action=>roles.can(section,action));
  }
  function hasSourceAccess(source){
    return source.access.some(rule=>can(rule[0],rule.slice(1)));
  }
  function prefKey(name){return "cgb-worklog-v1:"+(currentUserId||"guest")+":"+name}
  function readPref(name,fallback){
    try{const v=localStorage.getItem(prefKey(name));return v==null?fallback:JSON.parse(v)}catch(e){return fallback}
  }
  function savePref(name,value){try{localStorage.setItem(prefKey(name),JSON.stringify(value))}catch(e){}}
  function readAt(){return Number(readPref("read-at",0))||0}
  function isUnread(item){const at=readAt();return at?item.time>at:item.active}

  const SOURCES=[
    {
      key:"applications",label:"Заявления",icon:"📋",href:"apps.html",table:"applications",
      access:[["apps","view","edit"]],fields:"id,app_type,submitter_name,submitter_discord,status,responded_by_name,responded_at,created_at",order:"created_at",
      make:r=>({
        title:"Заявление"+(r.app_type?" · "+r.app_type:""),
        detail:[r.submitter_name,r.submitter_discord,r.responded_by_name&&r.status!=="new"?"Решение: "+r.responded_by_name:""] .filter(Boolean).join(" · "),
        status:getStatus(r.status,"Заявление"),time:when(r.responded_at||r.created_at)
      })
    },
    {
      key:"complaints",label:"Жалобы",icon:"⚠️",href:"complaints-review.html",table:"complaints",
      access:[["complaints","review","view"]],fields:"id,code,submitter_fio,target_fio,target_static,status,verdict_kind,verdict_by_name,created_at,updated_at",order:"updated_at",
      make:r=>({
        title:"Жалоба "+(r.code||"")+(r.target_fio?" · "+r.target_fio:""),
        detail:[r.target_static?"Статик "+r.target_static:"",r.submitter_fio?"От: "+r.submitter_fio:"",r.verdict_by_name?"Решение: "+r.verdict_by_name:""].filter(Boolean).join(" · "),
        status:getStatus(r.status,"Жалоба"),time:when(r.updated_at||r.created_at)
      })
    },
    {
      key:"requests",label:"Заявки сотрудников",icon:"🗂️",href:"requests-review.html",table:"requests",
      access:[["requests","review","view"]],fields:"id,code,kind,submitter_fio,submitter_static,status,verdict_by_name,created_at,updated_at",order:"updated_at",
      make:r=>({
        title:(REQUEST_KINDS[r.kind]||r.kind||"Заявка")+(r.code?" · "+r.code:""),
        detail:[r.submitter_fio,r.submitter_static,r.verdict_by_name?"Решение: "+r.verdict_by_name:""].filter(Boolean).join(" · "),
        status:getStatus(r.status,"Заявка"),time:when(r.updated_at||r.created_at)
      })
    },
    {
      key:"vp_requests",label:"Запросы АБ",icon:"⚖️",href:"vp-request.html",table:"violations_registry",
      access:[["vp_request","review","submit"]],fields:"id,code,target_fio,target_static,kind,status,requested_by_uid,requested_by_name,reviewed_by_name,requested_at,created_at,updated_at",order:"updated_at",
      filter:(q,user)=>can("vp_request","review")?q:q.eq("requested_by_uid",user.id),
      make:r=>({
        title:(VIOLATION_KINDS[r.kind]||r.kind||"Запрос АБ")+(r.code?" · "+r.code:""),
        detail:[r.target_fio,r.target_static,r.requested_by_name?"От: "+r.requested_by_name:"",r.reviewed_by_name?"Решение: "+r.reviewed_by_name:""].filter(Boolean).join(" · "),
        status:getStatus(r.status,"Запрос"),time:when(r.updated_at||r.requested_at||r.created_at)
      })
    },
    {
      key:"vp_checks",label:"Проверки АБ",icon:"🩺",href:"vp.html",table:"vp_checks",
      access:[["vp","view","edit"]],fields:"discord_id,medbook,narko,driver,passport,personal_file,weapon_license,attestation,checked_by_name,checked_at,updated_at",order:"updated_at",pk:"discord_id",
      enrich:async(client,rows)=>{
        const ids=rows.map(r=>r.discord_id).filter(Boolean);
        if(!ids.length) return;
        const {data}=await client.from("ds_members").select("discord_id,parsed_fio,parsed_static,display_name").in("discord_id",ids);
        const map={};(data||[]).forEach(m=>{map[String(m.discord_id)]=m});
        rows.forEach(r=>{r._member=map[String(r.discord_id)]||null});
      },
      make:r=>{
        const count=CHECK_FIELDS.filter(k=>r[k]!=null&&r[k]!=="").length;
        const member=r._member||{};
        const st=count>=CHECK_FIELDS.length?getStatus("ready"):getStatus("partial");
        return {
          title:"Проверка · "+(member.parsed_fio||member.display_name||("ID "+r.discord_id)),
          detail:[member.parsed_static,count+" из "+CHECK_FIELDS.length+" документов",r.checked_by_name?"Проверил: "+r.checked_by_name:""].filter(Boolean).join(" · "),
          status:st,time:when(r.updated_at||r.checked_at)
        };
      }
    },
    {
      key:"vp_archive",label:"Архив проверок",icon:"🗄️",href:"vp.html",table:"vp_archive",
      access:[["vp_archive","view","edit"]],fields:"id,title,members_total,members_checked,members_partial,saved_by_name,saved_at,updated_at",order:"saved_at",
      make:r=>({
        title:r.title||"Архив проверки АБ",
        detail:[r.members_total!=null?r.members_total+" сотрудников":"",r.members_checked!=null?"Проверено: "+r.members_checked:"",r.saved_by_name?"Сохранил: "+r.saved_by_name:""].filter(Boolean).join(" · "),
        status:getStatus("archived"),time:when(r.updated_at||r.saved_at)
      })
    },
    {
      key:"supply",label:"Поставки",icon:"📦",href:"supply.html",table:"supply_requests",
      access:[["supply","view","admin"]],fields:"id,code,fio,static_id,status,reviewed_by_name,resolved_by_name,created_at,updated_at",order:"updated_at",
      make:r=>({
        title:"Поставка"+(r.code?" · "+r.code:"")+(r.fio?" · "+r.fio:""),
        detail:[r.static_id,r.reviewed_by_name||r.resolved_by_name?"Обработал: "+(r.reviewed_by_name||r.resolved_by_name):""].filter(Boolean).join(" · "),
        status:getStatus(r.status,"Поставка"),time:when(r.updated_at||r.created_at)
      })
    },
    {
      key:"tests",label:"Результаты тестов",icon:"📊",href:"tests.html",table:"test_attempts",
      access:[["tests","stats"]],fields:"id,fio,static_id,percent,passed,review_status,reviewed_by_name,finished_at,reviewed_at",order:"finished_at",
      make:r=>({
        title:"Результат теста · "+(r.fio||"Без имени"),
        detail:[r.static_id,r.percent!=null?Math.round(Number(r.percent))+"%":"",r.reviewed_by_name?"Проверил: "+r.reviewed_by_name:""].filter(Boolean).join(" · "),
        status:getStatus(r.passed===true?"passed":r.passed===false?"failed":"reviewed"),time:when(r.reviewed_at||r.finished_at)
      })
    },
    {
      key:"reports",label:"Отчёты",icon:"📝",href:"report.html",table:"report_send_requests",
      access:[["report","view","submit","settings"]],fields:"id,form_id,submitter_uid,submitter_fio,submitter_static,submitter_position,status,processed_at,finished_at,created_at",order:"created_at",
      filter:(q,user)=>can("report","settings")?q:q.eq("submitter_uid",user.id),
      make:r=>({
        title:"Отчёт"+(r.form_id?" · "+r.form_id:"")+(r.submitter_fio?" · "+r.submitter_fio:""),
        detail:[r.submitter_static,r.submitter_position].filter(Boolean).join(" · "),
        status:getStatus(r.status,"Отчёт"),time:when(r.finished_at||r.processed_at||r.created_at)
      })
    },
    {
      key:"payroll",label:"Премирование",icon:"💳",href:"payroll.html",table:"payroll_drafts",
      access:[["payroll","view","edit"]],fields:"id,title,status,fund_amount,sent_by_name,sent_at,created_at,updated_at",order:"updated_at",
      make:r=>({
        title:r.title||"Ведомость премирования",
        detail:[r.fund_amount!=null?Math.round(Number(r.fund_amount)).toLocaleString("ru-RU")+" ₽":"",r.sent_by_name?"Отправил: "+r.sent_by_name:""].filter(Boolean).join(" · "),
        status:getStatus(r.status,"Ведомость"),time:when(r.sent_at||r.updated_at||r.created_at)
      })
    }
  ];

  function roleLabel(){
    const roles=window.CGB_ROLES;
    if(!roles) return "Личный доступ";
    const custom=roles.getMyCustomRole&&roles.getMyCustomRole();
    if(custom&&custom.name) return custom.name;
    const key=roles.getMyRole&&roles.getMyRole();
    return ({admin:"Администратор",ss:"Старший состав",user:"Пользователь"}[key])||"Личный доступ";
  }
  function availableSources(){return SOURCES.filter(hasSourceAccess)}

  function ensureShell(){
    if(shell) return shell;
    const btn=document.createElement("button");
    btn.id="cgbWorklogBtn";
    btn.className="cgb-worklog-btn";
    btn.type="button";
    btn.setAttribute("aria-label","Открыть журнал уведомлений");
    btn.setAttribute("aria-expanded","false");
    btn.title="Журнал уведомлений";
    btn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 5h8M8 12h8M8 16h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span class="cgb-worklog-count" aria-hidden="true"></span>';

    const panel=document.createElement("section");
    panel.id="cgbWorklogPanel";
    panel.className="cgb-worklog-panel";
    panel.setAttribute("aria-label","Журнал уведомлений роли");
    panel.innerHTML='<div class="cgb-worklog-head">'+
      '<div class="cgb-worklog-heading"><span class="cgb-worklog-head-icon">☷</span><div><div class="cgb-worklog-title">Журнал уведомлений</div><div class="cgb-worklog-role"></div></div></div>'+
      '<div class="cgb-worklog-actions"><button type="button" data-worklog-read title="Отметить всё прочитанным" aria-label="Отметить всё прочитанным">✓</button><button type="button" data-worklog-close title="Свернуть" aria-label="Свернуть журнал">—</button></div></div>'+
      '<div class="cgb-worklog-filters" role="tablist" aria-label="Фильтр журнала">'+
        '<button type="button" data-worklog-filter="active" role="tab">Актуальные</button><button type="button" data-worklog-filter="history" role="tab">История</button><button type="button" data-worklog-filter="all" role="tab">Все</button></div>'+
      '<div class="cgb-worklog-tools"><label><span>Раздел</span><select data-worklog-source aria-label="Раздел журнала"><option value="all">Все разделы</option></select></label><button type="button" data-worklog-refresh title="Обновить журнал" aria-label="Обновить журнал">↻</button></div>'+
      '<div class="cgb-worklog-summary" aria-live="polite"></div><div class="cgb-worklog-list"></div>'+
      '<div class="cgb-worklog-foot"><span class="cgb-worklog-updated"></span><span>Обновляется автоматически</span></div>';

    document.body.appendChild(btn);
    document.body.appendChild(panel);
    shell={btn,panel};
    btn.addEventListener("click",()=>setOpen(!panel.classList.contains("open")));
    panel.querySelector("[data-worklog-close]").addEventListener("click",()=>setOpen(false));
    panel.querySelector("[data-worklog-read]").addEventListener("click",markRead);
    panel.querySelector("[data-worklog-refresh]").addEventListener("click",()=>loadFeed(true));
    panel.querySelector("[data-worklog-source]").addEventListener("change",e=>{savePref("source",e.target.value);render()});
    panel.querySelectorAll("[data-worklog-filter]").forEach(b=>b.addEventListener("click",()=>{savePref("filter",b.dataset.worklogFilter);render()}));
    document.addEventListener("keydown",onKeydown);
    document.addEventListener("click",onGlobalClick,true);
    setOpen(!!readPref("open",false),false);
    return shell;
  }
  function onKeydown(e){if(e.key==="Escape"&&shell&&shell.panel.classList.contains("open")) setOpen(false)}
  function onGlobalClick(e){
    if(shell&&e.target&&e.target.closest&&e.target.closest("#siteSetBtn")) setOpen(false);
  }
  function setOpen(open,save){
    if(!shell) return;
    shell.panel.classList.toggle("open",!!open);
    shell.btn.classList.toggle("active",!!open);
    shell.btn.setAttribute("aria-expanded",open?"true":"false");
    if(save!==false) savePref("open",!!open);
  }
  function teardown(){
    loadGeneration++;
    currentUserId=null;items=[];errors=[];
    if(timer){clearTimeout(timer);timer=null}
    if(shell){
      document.removeEventListener("keydown",onKeydown);
      document.removeEventListener("click",onGlobalClick,true);
      shell.btn.remove();shell.panel.remove();shell=null;
    }
  }
  function markRead(){
    savePref("read-at",Date.now());
    render();
  }
  function schedule(){
    if(timer) clearTimeout(timer);
    timer=setTimeout(async()=>{if(!document.hidden) await loadFeed(false);schedule()},document.hidden?POLL_HIDDEN:POLL_ACTIVE);
  }

  async function loadSource(client,user,source){
    let q=client.from(source.table).select(source.fields).order(source.order,{ascending:false}).limit(MAX_PER_SOURCE);
    if(source.filter) q=source.filter(q,user);
    const {data,error}=await q;
    if(error) throw error;
    const rows=data||[];
    if(source.enrich&&rows.length){try{await source.enrich(client,rows)}catch(e){}}
    return rows.map(row=>{
      const value=source.make(row)||{};
      const status=value.status||getStatus(row.status);
      return {
        id:source.key+":"+String(row[source.pk||"id"]||row.code||Math.random()),source:source.key,
        sourceLabel:source.label,icon:source.icon,href:source.href,title:compact(value.title||source.label,130),
        detail:compact(value.detail||"",170),status,time:value.time||when(row.updated_at||row.created_at),active:!!status.active
      };
    });
  }
  async function loadFeed(manual){
    const state=window.CGB_AUTH&&window.CGB_AUTH.state;
    if(!state||!state.ready||!state.user||!state.client) return;
    const generation=++loadGeneration;
    loading=true;render();
    const sources=availableSources();
    const settled=await Promise.allSettled(sources.map(source=>loadSource(state.client,state.user,source)));
    if(generation!==loadGeneration) return;
    const merged=[];const failed=[];
    settled.forEach((result,index)=>{
      if(result.status==="fulfilled") merged.push(...result.value);
      else failed.push(sources[index].label);
    });
    merged.sort((a,b)=>b.time-a.time);
    items=merged.slice(0,160);errors=failed;loading=false;
    if(shell) shell.panel.dataset.loadedAt=String(Date.now());
    render();schedule();
    if(manual&&window.CGB_SOUND&&typeof window.CGB_SOUND.play==="function"){
      try{window.CGB_SOUND.play("click")}catch(e){}
    }
  }

  function render(){
    if(!shell) return;
    const panel=shell.panel;
    panel.querySelector(".cgb-worklog-role").textContent=roleLabel();
    const sources=availableSources();
    const sourceSelect=panel.querySelector("[data-worklog-source]");
    const savedSource=readPref("source","all");
    sourceSelect.innerHTML='<option value="all">Все разделы</option>'+sources.map(s=>'<option value="'+esc(s.key)+'">'+esc(s.icon+" "+s.label)+'</option>').join("");
    sourceSelect.value=sources.some(s=>s.key===savedSource)?savedSource:"all";
    const filter=["active","history","all"].includes(readPref("filter","active"))?readPref("filter","active"):"active";
    panel.querySelectorAll("[data-worklog-filter]").forEach(b=>{
      const on=b.dataset.worklogFilter===filter;b.classList.toggle("active",on);b.setAttribute("aria-selected",on?"true":"false");
    });
    let shown=items;
    if(sourceSelect.value!=="all") shown=shown.filter(i=>i.source===sourceSelect.value);
    if(filter==="active") shown=shown.filter(i=>i.active);
    else if(filter==="history") shown=shown.filter(i=>!i.active);
    const unread=items.filter(isUnread).length;
    const active=items.filter(i=>i.active).length;
    const count=shell.btn.querySelector(".cgb-worklog-count");
    count.textContent=unread?(unread>99?"99+":String(unread)):"";
    count.classList.toggle("visible",unread>0);
    shell.btn.classList.toggle("has-new",unread>0);
    panel.querySelector(".cgb-worklog-summary").innerHTML=loading?'<span class="cgb-worklog-loading"><i></i> Обновление журнала…</span>':
      '<span><b>'+active+'</b> актуальных · <b>'+items.length+'</b> записей'+(unread?' · <b>'+unread+'</b> непрочитано':'')+'</span>'+(errors.length?'<span class="cgb-worklog-warning" title="Некоторые разделы временно недоступны">Часть данных недоступна</span>':'');
    const list=panel.querySelector(".cgb-worklog-list");
    if(loading&&!items.length){
      list.innerHTML='<div class="cgb-worklog-empty"><span>⌛</span><b>Загружаю события роли</b><small>Это займёт несколько секунд</small></div>';
    }else if(!sources.length){
      list.innerHTML='<div class="cgb-worklog-empty"><span>🔒</span><b>Нет служебных разделов</b><small>Для вашей роли пока не назначены разделы журнала</small></div>';
    }else if(!shown.length){
      list.innerHTML='<div class="cgb-worklog-empty"><span>✓</span><b>Здесь пока пусто</b><small>'+(filter==="active"?'Новых заявок и событий нет':'Записей по выбранному фильтру нет')+'</small></div>';
    }else{
      list.innerHTML=shown.map(item=>{
        const unreadItem=isUnread(item);
        return '<a class="cgb-worklog-item'+(unreadItem?' unread':'')+'" href="'+esc(item.href)+'">'+
          '<span class="cgb-worklog-item-icon">'+esc(item.icon)+'</span><span class="cgb-worklog-item-main">'+
          '<span class="cgb-worklog-item-top"><span>'+esc(item.sourceLabel)+'</span><time datetime="'+esc(new Date(item.time).toISOString())+'">'+esc(formatTime(item.time))+'</time></span>'+
          '<span class="cgb-worklog-item-title">'+esc(item.title)+'</span>'+(item.detail?'<span class="cgb-worklog-item-detail">'+esc(item.detail)+'</span>':'')+
          '<span class="cgb-worklog-status '+esc(item.status.tone)+'">'+esc(item.status.label)+'</span></span></a>';
      }).join("");
    }
    const loadedAt=Number(panel.dataset.loadedAt)||0;
    panel.querySelector(".cgb-worklog-updated").textContent=loadedAt?"Обновлено "+formatTime(loadedAt):"";
  }

  function syncAuth(state){
    if(!state||!state.ready) return;
    if(!state.user||!state.client){teardown();return}
    if(currentUserId!==state.user.id){
      teardown();currentUserId=state.user.id;ensureShell();
    }
    loadFeed(false);
  }
  function init(){
    const auth=window.CGB_AUTH;
    if(!auth||typeof auth.onChange!=="function") return;
    authUnsub=auth.onChange(syncAuth);
    if(window.CGB_ROLES&&typeof window.CGB_ROLES.onChange==="function"){
      roleUnsub=window.CGB_ROLES.onChange(()=>{
        const state=window.CGB_AUTH&&window.CGB_AUTH.state;
        if(state&&state.user){ensureShell();loadFeed(false)}
      });
    }
    document.addEventListener("visibilitychange",()=>{if(!document.hidden&&currentUserId) loadFeed(false)});
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
  window.CGB_WORKLOG={refresh:()=>loadFeed(true),open:()=>setOpen(true),close:()=>setOpen(false)};
})();
