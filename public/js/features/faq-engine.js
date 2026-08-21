window.CGB_FAQ=(function(){
  "use strict";
  const KEY="cgb-faq-local";
  const DEFAULTS=[];

  function errorText(error,fallback){return error&&error.message?error.message:fallback}
  function readLocal(){
    try{
      const raw=localStorage.getItem(KEY);
      if(raw===null) return [];
      const parsed=JSON.parse(raw);
      return Array.isArray(parsed)?parsed:[];
    }catch(_){return []}
  }
  function writeLocal(list){
    try{localStorage.setItem(KEY,JSON.stringify(list||[]));return {ok:true,remote:false}}
    catch(error){return {ok:false,remote:false,error:errorText(error,"Не удалось сохранить данные в браузере")}}
  }

  let mode="local";

  async function loadAll(){
    const auth=window.CGB_AUTH;
    if(auth&&auth.state&&auth.state.client){
      mode="supabase";
      try{
        const {data,error}=await auth.state.client.from("faq").select("*").order("sort",{ascending:true});
        if(error) throw error;
        return (data||[]).map(row=>({id:row.id,cat:row.cat||"Общее",q:row.q||"",a:row.a||"",sort:row.sort||0}));
      }catch(error){
        console.warn("[CGB_FAQ] Не удалось загрузить FAQ из Supabase:",errorText(error,"неизвестная ошибка"));
        return readLocal();
      }
    }
    mode="local";
    return readLocal();
  }

  async function save(item){
    if(mode==="supabase"){
      const client=window.CGB_AUTH&&window.CGB_AUTH.state&&window.CGB_AUTH.state.client;
      if(!client) return {ok:false,remote:true,error:"Соединение с Supabase недоступно"};
      try{
        const {error}=await client.from("faq").upsert(item);
        if(error) throw error;
        return {ok:true,remote:true};
      }catch(error){
        return {ok:false,remote:true,error:errorText(error,"Ошибка сохранения в Supabase")};
      }
    }
    const list=readLocal();
    const index=list.findIndex(value=>String(value.id)===String(item.id));
    if(index>=0) list[index]=item;else list.push(item);
    return writeLocal(list);
  }

  async function remove(id){
    if(mode==="supabase"){
      const client=window.CGB_AUTH&&window.CGB_AUTH.state&&window.CGB_AUTH.state.client;
      if(!client) return {ok:false,remote:true,error:"Соединение с Supabase недоступно"};
      try{
        const {error}=await client.from("faq").delete().eq("id",id);
        if(error) throw error;
        return {ok:true,remote:true};
      }catch(error){
        return {ok:false,remote:true,error:errorText(error,"Ошибка удаления из Supabase")};
      }
    }
    return writeLocal(readLocal().filter(value=>String(value.id)!==String(id)));
  }

  function getMode(){return mode}
  function resetDefaults(){return writeLocal(DEFAULTS.slice())}
  function clearAll(){return writeLocal([])}
  function makeId(){return "faq_"+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}

  return {DEFAULTS,loadAll,save,remove,makeId,readLocal,writeLocal,getMode,resetDefaults,clearAll};
})();
