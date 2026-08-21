window.CGB_DRAFT=(function(){
  const KEY_PREFIX="cgb-draft-";
  const SAVE_DELAY=1200;
  const timers={};
  const badges={};

  function key(scope){return KEY_PREFIX+scope}

  function save(scope,data){
    try{
      localStorage.setItem(key(scope),JSON.stringify({data:data,at:Date.now()}));
      return true;
    }catch(e){return false}
  }

  function load(scope){
    try{
      const raw=localStorage.getItem(key(scope));
      if(!raw) return null;
      return JSON.parse(raw);
    }catch(e){return null}
  }

  function clear(scope){try{localStorage.removeItem(key(scope))}catch(e){}}

  function ageStr(ts){
    if(!ts) return "";
    const diff=(Date.now()-ts)/1000;
    if(diff<60) return "только что";
    if(diff<3600) return Math.floor(diff/60)+" мин. назад";
    if(diff<86400) return Math.floor(diff/3600)+" ч. назад";
    return Math.floor(diff/86400)+" дн. назад";
  }

  function attach(form,scope,opts){
    opts=opts||{};
    const getFn=opts.get||function(){
      const o={};
      form.querySelectorAll("input,textarea,select").forEach(el=>{
        if(!el.name||el.type==="file"||el.type==="hidden"&&opts.skipHidden) return;
        o[el.name]=el.value;
      });
      return o;
    };
    const setFn=opts.set||function(d){
      Object.keys(d||{}).forEach(k=>{
        const el=form.elements[k];
        if(el&&el.type!=="file") el.value=d[k];
      });
    };
    const badge=ensureBadge(form,scope);
    const onInput=()=>{
      clearTimeout(timers[scope]);
      badge.textContent="Сохранение…";badge.classList.add("saving");
      timers[scope]=setTimeout(()=>{
        const ok=save(scope,getFn());
        badge.classList.remove("saving");
        badge.textContent=ok?"Сохранено · "+ageStr(Date.now()):"Ошибка";
        setTimeout(()=>{if(!timers[scope]||Date.now()-(load(scope)||{}).at>SAVE_DELAY) refreshBadge(scope,badge)},2000);
      },SAVE_DELAY);
    };
    form.addEventListener("input",onInput);
    form.addEventListener("change",onInput);
    refreshBadge(scope,badge);
    return {
      get:getFn,set:setFn,save:()=>save(scope,getFn()),clear:()=>{clear(scope);refreshBadge(scope,badge)},
      restorePrompt:()=>{
        const d=load(scope);
        if(!d) return null;
        return {data:d.data,at:d.at,age:ageStr(d.at)};
      }
    };
  }

  function ensureBadge(form,scope){
    if(badges[scope]) return badges[scope];
    let b=form.querySelector(".draft-badge");
    if(!b){
      b=document.createElement("span");
      b.className="draft-badge";
      const submitBtn=form.querySelector("button[type=submit]");
      if(submitBtn&&submitBtn.parentNode) submitBtn.parentNode.insertBefore(b,submitBtn);
      else form.appendChild(b);
    }
    badges[scope]=b;
    return b;
  }

  function refreshBadge(scope,badge){
    const d=load(scope);
    if(d&&d.at){badge.textContent="Черновик · "+ageStr(d.at);badge.classList.add("has-draft")}
    else{badge.textContent="";badge.classList.remove("has-draft")}
  }

  function offerRestore(scope,onRestore){
    const d=load(scope);
    if(!d||!d.data) return false;
    const age=ageStr(d.at);
    if(confirm(`У вас есть несохранённый черновик (${age}). Восстановить?`)){
      onRestore(d.data);
      return true;
    }
    return false;
  }

  return {attach,save,load,clear,ageStr,offerRestore};
})();
