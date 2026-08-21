window.CGB_AUTH=(function(){
  const state={client:null,user:null,ready:false,available:false,error:null};
  const listeners=[];
  let initPromise=null;
  let authRevision=0;

  function emit(){listeners.forEach(fn=>{try{fn(state)}catch(e){}})}
  function onChange(fn){listeners.push(fn);fn(state);return()=>{const i=listeners.indexOf(fn);if(i>=0) listeners.splice(i,1)}}

  async function hasActiveAccess(user){
    if(!user||!state.client) return false;
    try{
      const {data,error}=await state.client.from("user_roles").select("user_id").eq("user_id",user.id).maybeSingle();
      if(error){
        console.warn("[CGB_AUTH] Не удалось проверить доступ:",error.message);
        return false;
      }
      return !!data;
    }catch(e){
      console.warn("[CGB_AUTH] Ошибка проверки доступа:",e&&e.message||e);
      return false;
    }
  }

  async function rejectRevokedSession(){
    authRevision++;
    state.user=null;emit();updateUI();
    try{await state.client.auth.signOut()}catch(e){}
  }

  async function applySessionUser(candidate){
    const revision=++authRevision;
    if(!candidate){
      const changed=!!state.user;
      state.user=null;
      if(changed){emit();updateUI()}
      return false;
    }
    const allowed=await hasActiveAccess(candidate);
    if(revision!==authRevision) return false;
    if(!allowed){
      await rejectRevokedSession();
      return false;
    }
    const changed=!state.user||state.user.id!==candidate.id;
    state.user=candidate;
    state.error=null;
    if(changed){emit();updateUI()}
    return true;
  }

  function whenReady(timeoutMs){
    if(state.ready) return Promise.resolve(state);
    return new Promise(resolve=>{
      let done=false;
      let off=()=>{};
      const finish=()=>{
        if(done) return;
        done=true;
        clearTimeout(timer);
        off();
        resolve(state);
      };
      const timer=setTimeout(finish,Number(timeoutMs)||8000);
      off=onChange(current=>{if(current.ready) finish()});
      if(done) off();
    });
  }

  async function requireClient(timeoutMs){
    const current=await whenReady(timeoutMs);
    return current&&current.client?current.client:null;
  }

  function init(){
    if(state.available&&state.client&&state.ready) return Promise.resolve(state);
    if(initPromise) return initPromise;
    initPromise=(async()=>{
    const cfg=window.SUPABASE_CONFIG;
    if(!cfg||!cfg.url||!cfg.anonKey||!window.supabase){
      state.available=false;state.ready=true;state.error="Конфигурация базы данных недоступна";emit();
      wireButtons();updateUI();
      return state;
    }
    try{
      state.client=window.supabase.createClient(cfg.url,cfg.anonKey);
      state.available=true;
      const {data}=await state.client.auth.getSession();
      const initialUser=data&&data.session?data.session.user:null;
      if(initialUser) await applySessionUser(initialUser);
      else state.user=null;
      state.client.auth.onAuthStateChange((_ev,session)=>{
        setTimeout(()=>applySessionUser(session&&session.user||null),0);
      });
      state.ready=true;state.error=null;emit();
    }catch(e){
      state.available=false;state.ready=true;state.error=e&&e.message||String(e);emit();
    }
    wireButtons();updateUI();
    return state;
    })().finally(()=>{initPromise=null});
    return initPromise;
  }

  function wireButtons(){
    document.querySelectorAll("[data-open-login]").forEach(b=>{
      if(b.__cgbWired) return;b.__cgbWired=1;
      b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();
        if(state.user) return signOut();
        openModal();
      });
    });
    document.querySelectorAll(".login-btn").forEach(b=>{
      if(b.__cgbWired) return;b.__cgbWired=1;
      b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();
        if(state.user) return signOut();
        openModal();
      });
    });
  }

  async function signOut(){
    if(!state.available||!state.client) return;
    try{await state.client.auth.signOut()}catch(e){}
  }

  function updateUI(){
    document.querySelectorAll(".login-btn").forEach(b=>{
      const label=b.querySelector("span");
      if(state.user){
        if(label) label.textContent="Выйти";
        b.setAttribute("data-logged","1");
        b.title=state.user.email||"Выйти";
      }else{
        if(label) label.textContent="Войти";
        b.removeAttribute("data-logged");
        b.title="Войти";
      }
    });
    document.querySelectorAll(".admin-only").forEach(el=>{
      el.style.display=state.user?"":"none";
    });
  }

  function openModal(){
    const m=document.getElementById("loginModal");
    if(!m){alert("Форма входа недоступна на этой странице.");return}
    const msg=m.querySelector(".form-msg");
    if(msg){msg.className="form-msg";msg.textContent=""}
    if(!state.available){
      if(msg){msg.className="form-msg info";msg.textContent="Авторизация недоступна. Заполните config.js по инструкции в SUPABASE.md"}
    }
    m.classList.add("active");
  }
  function closeModal(){
    const m=document.getElementById("loginModal");
    if(m) m.classList.remove("active");
  }

  async function submitLogin(email,password){
    if(!state.available||!state.client) return {ok:false,error:"Авторизация недоступна"};
    try{
      const {data,error}=await state.client.auth.signInWithPassword({email,password});
      if(error) return {ok:false,error:error.message};
      if(!await hasActiveAccess(data.user)){
        await rejectRevokedSession();
        return {ok:false,error:"Доступ к сайту отозван. Обратитесь к администратору."};
      }
      await applySessionUser(data.user);
      return {ok:true};
    }catch(e){return {ok:false,error:e.message||"Ошибка входа"}}
  }

  function bootAuth(){
    if(window.supabase||!document.querySelector('script[src*="supabase-loader"]')){
      init();
    }else{
      window.addEventListener("cgb-supabase-loaded",()=>init(),{once:true});
      setTimeout(()=>{if(!state.ready) init()},4000);
    }
  }

  document.addEventListener("DOMContentLoaded",()=>{
    bootAuth();
    const m=document.getElementById("loginModal");
    if(m){
      m.addEventListener("click",e=>{if(e.target===m) closeModal()});
      const close=m.querySelector(".modal-close");
      if(close) close.addEventListener("click",closeModal);
      const form=m.querySelector("form");
      if(form){
        form.addEventListener("submit",async e=>{
          e.preventDefault();
          const msg=m.querySelector(".form-msg");
          const email=form.email.value.trim();
          const password=form.password.value;
          if(!state.available){
            msg.className="form-msg info";
            msg.textContent="Авторизация недоступна. Заполните config.js по инструкции в SUPABASE.md";
            return;
          }
          msg.className="form-msg info";msg.textContent="Проверка...";
          const r=await submitLogin(email,password);
          if(r.ok){msg.className="form-msg success";msg.textContent="Успешный вход";setTimeout(closeModal,500)}
          else{msg.className="form-msg error";msg.textContent=r.error}
        });
      }
    }
  });

  return {init,whenReady,requireClient,onChange,openModal,closeModal,submitLogin,signOut,state};
})();
