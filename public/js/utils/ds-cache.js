window.CGB_DS_CACHE=(function(){
  const TTL_MS=15*60000;
  function userId(){const s=window.CGB_AUTH&&window.CGB_AUTH.state;return s&&s.user&&s.user.id||""}
  function key(name){return "cgb-dscache-v3-"+userId()+"-"+name}
  function get(name){
    if(!userId()) return null;
    try{
      const raw=sessionStorage.getItem(key(name));if(!raw) return null;
      const j=JSON.parse(raw);
      if(!j||!j.ts||Date.now()-j.ts>TTL_MS) return null;
      return j.data;
    }catch(e){return null}
  }
  function set(name,data){
    if(!userId()) return;
    try{sessionStorage.setItem(key(name),JSON.stringify({ts:Date.now(),data}))}catch(e){}
  }
  function invalidate(name){try{sessionStorage.removeItem(key(name))}catch(e){}}
  async function fetchCached(name,loader){
    const cached=get(name);
    if(cached) return cached;
    const fresh=await loader();
    if(fresh) set(name,fresh);
    return fresh;
  }
  return {get,set,invalidate,fetchCached,TTL_MS};
})();
