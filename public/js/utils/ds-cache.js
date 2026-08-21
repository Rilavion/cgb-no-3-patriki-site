window.CGB_DS_CACHE=(function(){
  const TTL_MS=15*60000;
  function key(name){return "cgb-dscache-"+name}
  function get(name){
    try{
      const raw=localStorage.getItem(key(name));if(!raw) return null;
      const j=JSON.parse(raw);
      if(!j||!j.ts||Date.now()-j.ts>TTL_MS) return null;
      return j.data;
    }catch(e){return null}
  }
  function set(name,data){
    try{localStorage.setItem(key(name),JSON.stringify({ts:Date.now(),data}))}catch(e){}
  }
  function invalidate(name){try{localStorage.removeItem(key(name))}catch(e){}}
  async function fetchCached(name,loader){
    const cached=get(name);
    if(cached) return cached;
    const fresh=await loader();
    if(fresh) set(name,fresh);
    return fresh;
  }
  return {get,set,invalidate,fetchCached,TTL_MS};
})();
