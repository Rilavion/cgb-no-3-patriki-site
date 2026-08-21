/* Автоподстановка данных сотрудников в формы (ФИО/Статик/Discord ID/Должность).
   Источник — таблица ds_members, которую наполняет Discord-бот.
   Ник на сервере: «Должность | ФИО | Статик» (например: «Фел | Иванов И.И. | 355-221»).
   parseNick работает и на сайте, поэтому даже старые строки (до ресинхронизации
   бота) отображаются корректно. Результаты кэшируются в localStorage на 10 минут. */
window.CGB_DSAC=(function(){
  let DS_LIST=null;
  let loading=null;
  const LS_KEY="cgb-dsac-members-v2";
  const LS_TTL=10*60*1000;

  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

  /* --- парсер ника «Должность | ФИО | Статик» (та же логика, что у бота) --- */
  const POS_ROOTS=["замзав","орд2г","орд1г","згв","ввк","в1к","в2к","фарм","всп","асс","зав","орд","фел","сан","гв",
    "заместитель","заведующ","главврач","ассистент","ординатор","фельдшер","санитар","фармацевт"];
  function looksLikePosition(p){
    const t=String(p||"").toLowerCase().replace(/[\s.]+/g,"");
    if(!t) return false;
    return POS_ROOTS.some(r=>t.startsWith(r));
  }
  function staticOf(p){
    const d=String(p||"").replace(/\D/g,"");
    return (d.length>=4&&d.length<=7)?p.trim().replace(/^[\s№#]+/,""):null;
  }
  function parseNick(raw){
    const s=String(raw||"").trim();
    if(!s) return {pos:null,fio:null,stat:null};
    const parts=s.split("|").map(p=>p.trim()).filter(Boolean);
    if(parts.length===1) return {pos:null,fio:s,stat:staticOf(s)};
    let stat=null,rest=parts;
    const si=parts.findIndex(p=>staticOf(p));
    if(si>=0){stat=staticOf(parts[si]);rest=parts.filter((_,i)=>i!==si);}
    let pos=null,fio=null;
    if(rest.length>=2){
      if(looksLikePosition(rest[0])||!looksLikePosition(rest[1])){ pos=rest[0];fio=rest.slice(1).join(" | "); }
      else{ fio=rest[0];pos=rest.slice(1).join(" | "); }
    }else if(rest.length===1){
      if(looksLikePosition(rest[0])) pos=rest[0]; else fio=rest[0];
    }
    return {pos,fio:fio||null,stat};
  }

  function readLS(){
    try{
      const j=JSON.parse(localStorage.getItem(LS_KEY)||"null");
      if(j&&j.at&&Date.now()-j.at<LS_TTL&&Array.isArray(j.data)) return j.data;
    }catch(e){}
    return null;
  }
  function writeLS(list){try{localStorage.setItem(LS_KEY,JSON.stringify({at:Date.now(),data:list}))}catch(e){}}

  async function waitForClient(timeoutMs){
    const deadline=Date.now()+(timeoutMs||10000);
    while(Date.now()<deadline){
      const c=window.CGB_AUTH&&window.CGB_AUTH.state&&window.CGB_AUTH.state.client;
      if(c) return c;
      await new Promise(r=>setTimeout(r,200));
    }
    return null;
  }

  async function load(force){
    if(DS_LIST && DS_LIST.length && !force) return DS_LIST;
    if(loading) return loading;
    loading=(async()=>{
      try{
        const c=await waitForClient(10000);
        if(!c){
          console.warn("[dsac] no client after 10s");
          return readLS()||[];
        }
        const {data,error}=await c.from("ds_members").select("parsed_fio,parsed_static,parsed_dept,discord_id,raw_nick,display_name,username").eq("active",true).limit(2000);
        if(error){
          console.warn("[dsac] load:",error.message);
          return readLS()||[];
        }
        const seen=new Set();
        const list=(data||[]).map(m=>{
          // raw_nick — источник правды: сами парсим «Должность | ФИО | Статик»
          const p=parseNick(m.raw_nick);
          return {
            fio:(p.fio||m.parsed_fio||m.display_name||m.raw_nick||"").trim(),
            static:p.stat||m.parsed_static||"",
            did:m.discord_id||"",
            position:p.pos||m.parsed_dept||"",
            username:m.username||"",
            nick:m.raw_nick||""
          };
        }).filter(m=>{
          if(!m.fio) return false;
          const k=m.fio+"|"+m.static;
          if(seen.has(k)) return false; seen.add(k); return true;
        });
        if(list.length){ DS_LIST=list; writeLS(list); }
        console.log("[dsac] loaded",list.length);
        return list.length?list:(readLS()||[]);
      }catch(e){
        console.warn("[dsac]:",e.message);
        return readLS()||[];
      }
      finally { loading=null; }
    })();
    return loading;
  }

  function formatStatic(s){
    if(window.CGB_FMT&&window.CGB_FMT.formatStatic) return window.CGB_FMT.formatStatic(s);
    const d=String(s||"").replace(/\D/g,"");
    if(d.length===6) return d.slice(0,3)+"-"+d.slice(3);
    return s;
  }

  function ensureDropdown(input){
    let dd=input._cgbDsacDd;
    if(!dd){
      dd=document.createElement("div");
      dd.className="cgb-dsac-dd cr-dropdown";
      dd.style.position="fixed";
      dd.style.display="none";
      dd.style.left="0";
      dd.style.right="auto";
      dd.style.top="0";
      dd.style.zIndex="99999";
      document.body.appendChild(dd);
      input._cgbDsacDd=dd;
    }
    return dd;
  }

  function positionDropdown(input, dd){
    if(!input || !dd) return;
    const r=input.getBoundingClientRect();
    const vw=window.innerWidth || document.documentElement.clientWidth;
    const vh=window.innerHeight || document.documentElement.clientHeight;
    let width=Math.max(r.width, 260);
    if(width > vw - 20) width = vw - 20;
    let left=r.left;
    if(left + width > vw - 8) left = Math.max(8, vw - width - 8);
    if(left < 8) left = 8;
    let top=r.bottom + 4;
    dd.style.width=width+"px";
    dd.style.left=left+"px";
    const ddH=dd.offsetHeight || 280;
    if(top + ddH > vh - 8 && r.top - 4 - ddH > 8){
      top = r.top - 4 - ddH;
    }
    dd.style.top=top+"px";
  }

  function bind(inputSel, targets){
    const input=typeof inputSel==="string"?document.querySelector(inputSel):inputSel;
    if(!input || input.dataset.dsacBound==="1") return;
    input.dataset.dsacBound="1";
    input.setAttribute("autocomplete","off");
    const dd=ensureDropdown(input);
    if(!dd) return;

    function resolveT(sel){
      if(!sel) return null;
      if(typeof sel==="string"){
        const form=input.closest("form");
        if(form){ const el=form.querySelector(sel); if(el) return el; }
        return document.querySelector(sel);
      }
      if(Array.isArray(sel)){
        const form=input.closest("form");
        for(const s of sel){
          if(form){ const el=form.querySelector(s); if(el) return el; }
          const el2=document.querySelector(s);
          if(el2) return el2;
        }
        return null;
      }
      return sel;
    }

    async function render(q){
      q=(q||"").trim();
      if(q.length<2){ dd.style.display="none"; return; }
      const list=await load();
      const qLow=q.toLowerCase();
      const digits=q.replace(/\D/g,"");
      const matches=list.filter(m=>{
        const fioLow=(m.fio||"").toLowerCase();
        const posLow=(m.position||"").toLowerCase();
        const statNorm=(m.static||"").replace(/\D/g,"");
        return fioLow.includes(qLow)
          || posLow.includes(qLow)
          || (m.username||"").toLowerCase().includes(qLow)
          || (digits && digits.length>=2 && statNorm.includes(digits));
      }).slice(0,10);
      if(!matches.length){
        dd.innerHTML='<div class="cr-dd-empty">'+(list.length
          ? 'Ничего не найдено'
          : 'Список состава пуст — бот ещё не синхронизировал Discord (см. BOT-SETUP.md)')+'</div>';
        dd.style.display=""; positionDropdown(input,dd); return;
      }
      dd.innerHTML=matches.map(m=>{
        // строка метаданных: Должность | Статик (ФИО — крупно выше)
        let meta="";
        if(m.position) meta+=`<span class="cr-dd-pos">${esc(m.position)}</span>`;
        if(m.static) meta+=(m.position?'<span class="cr-dd-sep">|</span>':"")+`<span class="cr-dd-stat">Статик ${esc(m.static)}</span>`;
        return `<div class="cr-dd-item" data-fio="${esc(m.fio)}" data-static="${esc(m.static)}" data-did="${esc(m.did)}" data-pos="${esc(m.position)}">
          <div class="cr-dd-fio">${esc(m.fio)}</div>
          <div class="cr-dd-meta">${meta||`<span class="cr-dd-pos">${esc(m.nick||"")}</span>`}</div>
        </div>`;
      }).join("");
      dd.style.display="";
      positionDropdown(input,dd);
      dd.querySelectorAll(".cr-dd-item").forEach(el=>el.addEventListener("mousedown",e=>{
        e.preventDefault();
        input._cgbDsacSuppress=true;
        input.value=el.dataset.fio;
        const sT=resolveT(targets.stat);
        if(sT && el.dataset.static){ sT.value=formatStatic(el.dataset.static); sT.dispatchEvent(new Event("input",{bubbles:true})); sT.dispatchEvent(new Event("change",{bubbles:true})); }
        const dT=resolveT(targets.did);
        if(dT && el.dataset.did){ dT.value=el.dataset.did; dT.dispatchEvent(new Event("input",{bubbles:true})); dT.dispatchEvent(new Event("change",{bubbles:true})); }
        const pT=resolveT(targets.pos);
        if(pT && el.dataset.pos && !pT.value){ pT.value=el.dataset.pos; pT.dispatchEvent(new Event("input",{bubbles:true})); pT.dispatchEvent(new Event("change",{bubbles:true})); }
        dd.style.display="none";
        try{ input.blur(); }catch(err){}
        input.dispatchEvent(new Event("change",{bubbles:true}));
        setTimeout(()=>{ input._cgbDsacSuppress=false; },300);
      }));
    }
    input.addEventListener("input",e=>{ if(input._cgbDsacSuppress) return; render(e.target.value); });
    input.addEventListener("focus",e=>{ if(input._cgbDsacSuppress) return; if(e.target.value.trim().length>=2) render(e.target.value); });
    input.addEventListener("blur",()=>setTimeout(()=>dd.style.display="none",200));
    input.addEventListener("keydown",e=>{ if(e.key==="Escape") dd.style.display="none"; });
    const reposition=()=>{ if(dd.style.display!=="none") positionDropdown(input,dd); };
    window.addEventListener("scroll",reposition,true);
    window.addEventListener("resize",reposition);
    load();
  }

  function bindAll(){
    document.querySelectorAll("[data-dsac]").forEach(el=>{
      if(el.dataset.dsacBound==="1") return;
      const stat=el.getAttribute("data-dsac-stat")||null;
      const did=el.getAttribute("data-dsac-did")||null;
      const pos=el.getAttribute("data-dsac-pos")||null;
      bind(el,{stat,did,pos});
    });

    const rules=[
      { fioSel:'input[name="submitter_fio"], input#vpqFio, input#repFio',
        stat:['[name="submitter_static"]','#vpqStatic','#repStatic'],
        did:['[name="submitter_discord_id"]','[name="submitter_discord"]','#vpqDid','#vpqF_submitter_discord'],
        pos:['[name="submitter_position"]','#vpqPos','#repPos'] },
      { fioSel:'input[name="target_fio"], input#vpqTFio',
        stat:['[name="target_static"]','#vpqTStatic'],
        did:['[name="target_discord_id"]','[name="target_discord"]','#vpqTDid','#vpqF_target_discord'],
        pos:['[name="target_position"]','#vpqF_target_position'] }
    ];
    for(const r of rules){
      let fios;
      try{ fios=document.querySelectorAll(r.fioSel); }catch(e){ continue; }
      fios.forEach(inp=>{
        if(inp.dataset.dsacBound==="1") return;
        bind(inp,{ stat:r.stat, did:r.did, pos:r.pos });
      });
    }
  }

  const mo=new MutationObserver(muts=>{
    let need=false;
    for(const m of muts){
      for(const n of m.addedNodes){
        if(n.nodeType===1){ need=true; break; }
      }
      if(need) break;
    }
    if(need) bindAll();
  });

  let observerStarted=false;
  function startObserver(){
    if(observerStarted) return;
    if(!document.body){ setTimeout(startObserver,50); return; }
    try{
      mo.observe(document.body,{childList:true,subtree:true});
      observerStarted=true;
      console.log("[dsac] observer started");
    }catch(e){ console.warn("[dsac] observer:",e.message); }
  }

  startObserver();
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",()=>{
      startObserver(); bindAll();
      setTimeout(bindAll,500);
      setTimeout(bindAll,1500);
      setTimeout(bindAll,3000);
    });
  } else {
    bindAll();
    setTimeout(bindAll,500);
    setTimeout(bindAll,1500);
    setTimeout(bindAll,3000);
  }

  return { load, bind, bindAll, parseNick, invalidate(){ DS_LIST=null; try{localStorage.removeItem(LS_KEY)}catch(e){} } };
})();
