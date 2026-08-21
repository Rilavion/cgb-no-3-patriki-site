(function(){
  if(window.supabase){console.log("[CGB_SB_LOADER] supabase уже загружен");return}
  const sources=[
    "assets/vendor/supabase.js",
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.8/dist/umd/supabase.js",
    "https://unpkg.com/@supabase/supabase-js@2.110.8/dist/umd/supabase.js",
    "https://esm.sh/@supabase/supabase-js@2.110.8/dist/umd/supabase.js"
  ];
  let idx=0;
  function tryLoad(){
    if(idx>=sources.length){
      console.error("[CGB_SB_LOADER] Не удалось загрузить Supabase ни с одного источника (возможно блокирует AdBlocker). Приложение работает в offline-режиме.");
      window.dispatchEvent(new CustomEvent("cgb-supabase-loaded",{detail:{ok:false}}));
      return;
    }
    const src=sources[idx++];
    const s=document.createElement("script");
    s.src=src;
    s.async=false;
    s.onload=()=>{
      if(window.supabase){
        console.log("[CGB_SB_LOADER] Supabase загружен из:",src);
        window.dispatchEvent(new CustomEvent("cgb-supabase-loaded",{detail:{ok:true,src}}));
      }else{
        console.warn("[CGB_SB_LOADER] Загружен, но window.supabase не определён:",src);
        tryLoad();
      }
    };
    s.onerror=()=>{
      console.warn("[CGB_SB_LOADER] Не удалось загрузить:",src);
      s.remove();
      tryLoad();
    };
    document.head.appendChild(s);
  }
  tryLoad();
})();
