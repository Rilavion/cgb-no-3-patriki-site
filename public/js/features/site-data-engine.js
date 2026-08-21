/* CGB_SITE_DATA — гибкое хранение контента страниц (Услуги, Медикаменты и др.)
   Таблица Supabase: site_data (key text PK, data jsonb, updated_at timestamptz, updated_by uuid)
   Чтение: все. Запись: admin / старший состав.                                   */
window.CGB_SITE_DATA=(function(){
  function lsGet(key){try{return JSON.parse(localStorage.getItem("cgb-site-"+key)||"null")}catch(e){return null}}
  function lsSet(key,data){try{localStorage.setItem("cgb-site-"+key,JSON.stringify(data))}catch(e){}}

  function canEdit(section){
    const R=window.CGB_ROLES;
    if(!R) return false;
    if(R.isAdmin&&R.isAdmin()) return true;
    if(R.can){
      if(R.can(section,"edit")) return true;
      if(R.can("site","edit")) return true;
    }
    return false;
  }

  async function load(key,fallback){
    if(window.CGB_AUTH&&window.CGB_AUTH.whenReady) await window.CGB_AUTH.whenReady(8000);
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    if(s&&s.ready&&s.available&&s.client){
      try{
        const {data,error}=await s.client.from("site_data").select("data").eq("key",key).maybeSingle();
        if(error) throw error;
        if(data&&data.data!=null){lsSet(key,data.data);return data.data}
      }catch(e){console.warn("[site_data] load:",e.message)}
    }
    const local=lsGet(key);
    if(local!=null) return local;
    return JSON.parse(JSON.stringify(fallback));
  }

  async function save(key,data){
    lsSet(key,data); // локальный кэш — мгновенно
    if(window.CGB_AUTH&&window.CGB_AUTH.whenReady) await window.CGB_AUTH.whenReady(8000);
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    if(s&&s.ready&&s.available&&s.client&&s.user){
      try{
        const row={key:key,data:data,updated_at:new Date().toISOString(),updated_by:s.user.id};
        const {error}=await s.client.from("site_data").upsert(row,{onConflict:"key"});
        if(error) throw error;
        return {ok:true,remote:true};
      }catch(e){return {ok:true,remote:false,error:e.message}}
    }
    return {ok:true,remote:false,error:"Нет подключения к базе (сохранено локально в этом браузере)"};
  }

  return {load,save,canEdit};
})();
