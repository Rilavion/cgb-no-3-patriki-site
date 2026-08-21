window.CGB_NOTIFY_LIVE=(function(){
  const POLL_MS_ACTIVE=90000;
  const POLL_MS_IDLE=5*60000;
  const SEEN_KEY="cgb-nlive-seen";
  const PREFS_KEY="cgb-nlive-prefs";
  const INIT_KEY="cgb-nlive-inited";
  let timer=null,started=false;
  const listeners=[];

  const DEFAULTS={enabled:true,sound:true,events:{}};

  function readPrefs(){
    try{return Object.assign({},DEFAULTS,JSON.parse(localStorage.getItem(PREFS_KEY)||"{}"))}
    catch(e){return Object.assign({},DEFAULTS)}
  }
  function savePrefs(p){
    try{localStorage.setItem(PREFS_KEY,JSON.stringify(p))}catch(e){}
    listeners.forEach(fn=>{try{fn(p)}catch(e){}});
  }
  function readSeen(){try{return JSON.parse(localStorage.getItem(SEEN_KEY)||"{}")}catch(e){return {}}}
  function saveSeen(s){try{localStorage.setItem(SEEN_KEY,JSON.stringify(s))}catch(e){}}

  const EVENTS={
    "apps.new":{
      label:"📋 Новые заявления",
      table:"applications",fields:"id,submitter_name,submitter_discord,app_type,status,created_at",
      filter:q=>q.eq("status","new"),
      title:r=>"📋 Новое заявление · "+(r.app_type||""),
      body:r=>`${r.submitter_name||"—"}${r.submitter_discord?" · "+r.submitter_discord:""}`,
      url:()=>"apps.html",perm:{sec:"apps",act:"view"}
    },
    "complaints.new":{
      label:"⚠ Новые жалобы",
      table:"complaints",fields:"id,code,target_fio,target_static,created_at",
      filter:q=>q.is("verdict_by_uid",null),
      title:r=>"⚠ Новая жалоба · "+(r.code||""),
      body:r=>`Нарушитель: ${r.target_fio||"—"} · ${r.target_static||""}`,
      url:()=>"complaints-review.html",perm:{sec:"complaints",act:"review"}
    },
    "vp_request.new":{
      label:"⚖ Запросы от АБ",
      table:"violations_registry",fields:"id,kind,target_fio,target_static,requested_by_name,requested_at,created_at,status",
      filter:q=>q.eq("status","pending"),
      title:r=>`⚖ Запрос АБ · ${({warn:"Предупреждение",reproach:"Выговор",talk:"Беседа",confinement:"Дисц.закл.",uval:"Отстранение"}[r.kind])||r.kind||""}`,
      body:r=>`На: ${r.target_fio||"—"}${r.target_static?" · "+r.target_static:""}${r.requested_by_name?" · от "+r.requested_by_name:""}`,
      url:()=>"complaints-review.html",perm:{sec:"vp_request",act:"review"}
    }
  };
  const KINDS={leave:{i:"🕒",l:"отгул"},vacation_ic:{i:"🏖",l:"отпуск IC"},vacation_ooc:{i:"💤",l:"отпуск OOC"},promotion:{i:"⭐",l:"повышение"},dismissal:{i:"⛔",l:"увольнение"},restoration:{i:"🔄",l:"восстановление"}};
  for(const k of Object.keys(KINDS)){
    EVENTS["requests."+k+".new"]={
      label:`${KINDS[k].i} Заявки: ${KINDS[k].l}`,
      table:"requests",fields:"id,code,kind,submitter_fio,submitter_static,created_at,status",
      filter:q=>q.eq("kind",k).eq("status","pending"),
      title:r=>`${KINDS[k].i} Новая заявка · ${KINDS[k].l} · ${r.code||""}`,
      body:r=>`${r.submitter_fio||"—"}${r.submitter_static?" · "+r.submitter_static:""}`,
      url:()=>"requests-review.html",perm:{sec:"requests",act:"review"}
    };
  }

  function canSee(perm){
    if(!perm) return true;
    return window.CGB_ROLES&&window.CGB_ROLES.can(perm.sec,perm.act);
  }
  function isEventOn(key){
    const p=readPrefs();
    if(p.events&&key in p.events) return !!p.events[key];
    return true;
  }

  async function poll(){
    const prefs=readPrefs();
    if(!prefs.enabled) return;
    const auth=window.CGB_AUTH&&window.CGB_AUTH.state;
    if(!auth||!auth.ready||!auth.client||!auth.user) return;
    const client=auth.client;
    const seen=readSeen();
    const newItems=[];
    for(const key of Object.keys(EVENTS)){
      const ev=EVENTS[key];
      if(!canSee(ev.perm)) continue;
      if(!isEventOn(key)) continue;
      try{
        let q=client.from(ev.table).select(ev.fields).order("created_at",{ascending:false}).limit(10);
        if(ev.filter) q=ev.filter(q);
        const {data}=await q;
        if(!data) continue;
        const seenList=seen[key]||[];
        for(const row of data){
          const id=String(row.id||row.code);
          if(seenList.indexOf(id)>=0) continue;
          newItems.push({key,row,title:ev.title(row),body:ev.body(row),url:ev.url(row)});
        }
        seen[key]=Array.from(new Set([...(data||[]).map(r=>String(r.id||r.code)),...seenList])).slice(0,50);
      }catch(e){}
    }
    saveSeen(seen);
    const firstRun=!localStorage.getItem(INIT_KEY);
    if(firstRun){localStorage.setItem(INIT_KEY,"1");return}
    if(!newItems.length) return;
    for(const it of newItems){
      showToast(it);
      if(prefs.sound) playSound();
    }
  }

  function showToast(it){
    let box=document.getElementById("cgbLiveToasts");
    if(!box){
      box=document.createElement("div");
      box.id="cgbLiveToasts";
      box.style.cssText="position:fixed;top:80px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:10px;max-width:360px;pointer-events:none";
      document.body.appendChild(box);
    }
    const el=document.createElement("a");
    el.href=it.url;
    el.style.cssText="pointer-events:auto;background:linear-gradient(160deg,#2a4838,#07242e);border:1px solid #22d3ee;border-radius:12px;padding:12px 14px;color:#eaf6fa;text-decoration:none;box-shadow:0 12px 30px rgba(0,0,0,.5),0 0 20px rgba(34,211,238,.25);animation:cgbToastIn .35s cubic-bezier(.2,.9,.2,1);cursor:pointer;font-family:Inter,sans-serif";
    const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
    el.innerHTML=`<div style="font:700 13px/1.2 Inter;color:#a5f3fc;margin-bottom:4px">${esc(it.title)}</div><div style="font:400 12px/1.3 Inter;color:#a9ccd6">${esc(it.body||"")}</div>`;
    box.appendChild(el);
    setTimeout(()=>{el.style.transition=".4s ease";el.style.opacity="0";el.style.transform="translateX(20px)";setTimeout(()=>el.remove(),450)},8000);
  }

  function playSound(){
    try{
      const ctx=new (window.AudioContext||window.webkitAudioContext)();
      const o=ctx.createOscillator();const g=ctx.createGain();
      o.connect(g);g.connect(ctx.destination);
      o.type="sine";
      o.frequency.setValueAtTime(880,ctx.currentTime);
      o.frequency.setValueAtTime(1108,ctx.currentTime+0.11);
      g.gain.setValueAtTime(0.001,ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.18,ctx.currentTime+0.02);
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.45);
      o.start();o.stop(ctx.currentTime+0.5);
    }catch(e){}
  }

  function currentInterval(){
    if(document.hidden) return POLL_MS_IDLE;
    return POLL_MS_ACTIVE;
  }
  function scheduleNext(){
    if(timer){clearTimeout(timer);timer=null}
    timer=setTimeout(async()=>{
      if(!document.hidden){
        try{await poll()}catch(e){}
      }
      scheduleNext();
    },currentInterval());
  }
  function start(){
    if(started) return;started=true;
    if(!document.getElementById("cgbToastKeyframes")){
      const s=document.createElement("style");s.id="cgbToastKeyframes";
      s.textContent="@keyframes cgbToastIn{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}";
      document.head.appendChild(s);
    }
    setTimeout(async()=>{
      if(!document.hidden){try{await poll()}catch(e){}}
      scheduleNext();
    },5000);
    document.addEventListener("visibilitychange",()=>{
      if(!document.hidden){
        try{poll()}catch(e){}
        scheduleNext();
      }
    });
  }
  function stop(){if(timer){clearTimeout(timer);timer=null;started=false}}

  function onChange(fn){listeners.push(fn);fn(readPrefs());return()=>{const i=listeners.indexOf(fn);if(i>=0) listeners.splice(i,1)}}

  document.addEventListener("DOMContentLoaded",()=>setTimeout(start,2000));

  return {start,stop,poll,readPrefs,savePrefs,onChange,EVENTS,playTestSound:playSound,showTest:()=>showToast({title:"🎯 Тест",body:"Уведомления работают",url:"lk.html"})};
})();
