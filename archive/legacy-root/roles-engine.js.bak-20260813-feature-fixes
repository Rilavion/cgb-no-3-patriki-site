window.CGB_ROLES=(function(){
  let myRole=null;
  let myPermissions={};
  let myCustomRole=null;
  const listeners=[];

  function waitReady(timeoutMs){
    return new Promise(resolve=>{
      const deadline=Date.now()+(timeoutMs||5000);
      function check(){
        const s=window.CGB_AUTH&&window.CGB_AUTH.state;
        if(s&&s.ready){resolve(s);return true}
        return false;
      }
      if(check()) return;
      const t=setInterval(()=>{
        if(check()){clearInterval(t);return}
        if(Date.now()>deadline){clearInterval(t);resolve(window.CGB_AUTH&&window.CGB_AUTH.state||null)}
      },80);
      if(window.CGB_AUTH&&window.CGB_AUTH.onChange){
        window.CGB_AUTH.onChange(st=>{if(st&&st.ready){clearInterval(t);resolve(st)}});
      }
    });
  }

  async function loadMyRole(){
    await waitReady(5000);
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    if(!s||!s.user||!s.client){
      myRole=null;
      console.log("[CGB_ROLES] Нет клиента/пользователя. auth.state =",s);
      emit();apply();return null;
    }
    console.log("[CGB_ROLES] Загружаем роль для user_id =",s.user.id,"email =",s.user.email);
    try{
      const {data,error}=await s.client.from("user_roles").select("role,display_name,custom_role_id").eq("user_id",s.user.id).maybeSingle();
      if(error){
        console.error("[CGB_ROLES] Ошибка запроса:",error.message,error);
        myRole=null;myPermissions={};myCustomRole=null;
      }else{
        myRole=data?data.role:null;
        const displayName=data?data.display_name:null;
        if(displayName) try{localStorage.setItem("cgb-my-display-name",displayName)}catch(e){}
        if(data&&data.custom_role_id){
          try{
            const {data:cr}=await s.client.from("custom_roles").select("*").eq("id",data.custom_role_id).maybeSingle();
            if(cr){myCustomRole=cr;myPermissions=cr.permissions||{}}
          }catch(e){}
        } else if(myRole){
          try{
            const {data:cr}=await s.client.from("custom_roles").select("*").eq("key",myRole).maybeSingle();
            if(cr){myCustomRole=cr;myPermissions=cr.permissions||{}}
          }catch(e){}
        } else {myCustomRole=null;myPermissions={}}
        console.log("[CGB_ROLES] ✓ Роль:",myRole,"custom:",myCustomRole&&myCustomRole.name);
      }
    }catch(e){
      console.error("[CGB_ROLES] Исключение:",e.message);
      myRole=null;myPermissions={};myCustomRole=null;
    }
    emit();
    apply();
    return myRole;
  }

  function apply(){
    document.body.classList.toggle("cgb-is-admin",myRole==="admin");
    document.body.classList.toggle("cgb-is-ss",myRole==="ss");
    document.body.classList.toggle("cgb-is-staff",myRole==="admin"||myRole==="ss");
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    document.body.classList.toggle("cgb-is-logged",!!(s&&s.user));
    applyPermGates();
  }

  function applyPermGates(){
    document.querySelectorAll("[data-perm]").forEach(el=>{
      const raw=el.getAttribute("data-perm");
      if(!raw){el.style.display="";return}
      const parts=raw.split(",").map(p=>p.trim()).filter(Boolean);
      let allowed=false;
      for(const p of parts){
        const [sec,act]=p.split(":").map(x=>x.trim());
        if(!sec) continue;
        if(can(sec,act||"view")){allowed=true;break}
      }
      if(!allowed){
        el.style.setProperty("display","none","important");
        el.setAttribute("aria-hidden","true");
      } else {
        el.style.removeProperty("display");
        el.removeAttribute("aria-hidden");
      }
    });
  }

  function getMyRole(){return myRole}
  function getMyCustomRole(){return myCustomRole}
  function getMyPermissions(){return myPermissions}
  function isAdmin(){return myRole==="admin"}
  function isSS(){return myRole==="ss"}
  function isStaff(){return myRole==="admin"||myRole==="ss"}
  function can(section,action){
    if(myRole==="admin") return true;
    const sec=myPermissions[section];
    if(!sec) return false;
    if(action==null) return !!sec.view;
    return !!sec[action];
  }

  async function listCustomRoles(){
    const s=window.CGB_AUTH.state;
    if(!s||!s.client) return [];
    const {data}=await s.client.from("custom_roles").select("*").order("sort",{ascending:true});
    return data||[];
  }
  function onChange(fn){listeners.push(fn);fn(myRole);return()=>{const i=listeners.indexOf(fn);if(i>=0) listeners.splice(i,1)}}
  function emit(){listeners.forEach(fn=>{try{fn(myRole)}catch(e){}})}

  // ==== Управление ролями (только для админа) ====
  async function listAllRoles(){
    const s=window.CGB_AUTH.state;
    if(!s.client) return [];
    const {data,error}=await s.client.from("user_roles").select("*").order("created_at",{ascending:false});
    if(error){console.warn("[CGB_ROLES] list:",error.message);return []}
    return data||[];
  }

  async function setRole(userId,role,displayName,customRoleId){
    const s=window.CGB_AUTH.state;
    if(!s.client) return {ok:false,error:"no client"};
    try{
      const {data,error}=await s.client.rpc("staff_upsert_role",{
        p_user_id:userId,
        p_role:role,
        p_display_name:displayName||null,
        p_custom_role_id:customRoleId||null
      });
      if(!error) return {ok:true,saved:(data&&typeof data==="object")?data:null};
      // старая версия RPC (returns void) — data придёт null, тоже считаем успехом
      if(String(error.message||"").includes("does not exist")||String(error.message||"").includes("staff_upsert_role")){
        return {ok:false,error:error.message+" — выполни заново весь SUPABASE-FIX.sql (блок 9 создаёт/обновляет RPC)."};
      }
      return {ok:false,error:error.message};
    }catch(e){return {ok:false,error:e.message}}
  }

  async function removeUser(userId){
    const s=window.CGB_AUTH.state;
    if(!s.client) return {ok:false,error:"no client"};
    const {error}=await s.client.from("user_roles").delete().eq("user_id",userId);
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }

  // ==== Создание нового пользователя ====
  // Через обычный signUp — новому юзеру приходит confirm-email, потом админ ему проставляет роль.
  // Второй вариант — админ вручную знает user_id (из auth.users) и вызывает setRole.
  async function inviteAndSetRole(email,password,role,displayName,customRoleId){
    const s=window.CGB_AUTH.state;
    if(!s.client) return {ok:false,error:"no client"};
    const cfg=window.SUPABASE_CONFIG;
    if(!cfg||!cfg.url||!cfg.anonKey||!window.supabase) return {ok:false,error:"no config"};
    let tempClient;
    try{
      tempClient=window.supabase.createClient(cfg.url,cfg.anonKey,{
        auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:"cgb-invite-tmp-"+Date.now()}
      });
    }catch(e){return {ok:false,error:"Не удалось создать временный клиент: "+e.message}}
    try{
      const {data,error}=await tempClient.auth.signUp({email,password,options:{data:{display_name:displayName||""}}});
      if(error){
        const m=(error.message||"").toLowerCase();
        if(m.includes("rate limit")||m.includes("email rate")||error.status===429){
          return {ok:false,code:"rate_limit",error:"Supabase ограничил отправку писем подтверждения (лимит ~4/час на встроенном SMTP). Решения: 1) Dashboard → Auth → Providers → Email → выключить «Confirm email» (рекомендуется для внутреннего сайта); 2) Подождать ~1 час; 3) Настроить свой SMTP в Auth → SMTP Settings."};
        }
        if(m.includes("already registered")||m.includes("user already")){
          return {ok:false,code:"exists",error:"Пользователь с таким email уже существует. Найди его в списке ниже и назначь роль вручную."};
        }
        return {ok:false,error:error.message};
      }
      const uid=data&&data.user?data.user.id:null;
      try{await tempClient.auth.signOut()}catch(e){}
      if(!uid) return {ok:true,warning:"Пользователь создан, но user_id не получен (возможно требуется подтверждение email). Проставь роль вручную после его первого входа."};
      await new Promise(res=>setTimeout(res,300));
      const r=await setRole(uid,role,displayName,customRoleId);
      if(!r.ok && String(r.error||"").indexOf("violates")>=0){
        // ретрай с устаревшей RPC: role мог уйти null = понятная подсказка
        r={ok:false,error:r.error+" — выполни заново весь SUPABASE-FIX.sql (блоки 1 и 9): "+(r.error||"")};
      }
      if(!r.ok) return {ok:false,error:"Юзер создан в auth.users (uid: "+uid+"), но не удалось создать запись в user_roles: "+r.error+". Выполни заново весь SUPABASE-FIX.sql (там чинится RPC staff_upsert_role и снимается старый check-констрейнт ролей) и проверь, что ты залогинен как admin."};
      return {ok:true,user_id:uid,saved:r.saved||null};
    }catch(e){
      try{await tempClient.auth.signOut()}catch(_){}
      return {ok:false,error:e.message};
    }
  }

  document.addEventListener("DOMContentLoaded",()=>{
    if(window.CGB_AUTH&&window.CGB_AUTH.onChange){
      window.CGB_AUTH.onChange(st=>{if(st&&st.ready) loadMyRole()});
    }
    setTimeout(loadMyRole,300);
  });

  return {loadMyRole,getMyRole,getMyCustomRole,getMyPermissions,can,isAdmin,isSS,isStaff,onChange,
          listAllRoles,setRole,removeUser,inviteAndSetRole,apply,applyPermGates,
          listCustomRoles};
})();
