window.CGB_APPS=(function(){

  function waitReady(){
    if(window.CGB_AUTH&&window.CGB_AUTH.whenReady) return window.CGB_AUTH.whenReady(8000);
    return new Promise(resolve=>{
    const deadline=Date.now()+5000;
    function ck(){const s=window.CGB_AUTH&&window.CGB_AUTH.state;if(s&&s.ready){resolve(s);return true}return false}
    if(ck()) return;
    const t=setInterval(()=>{if(ck()){clearInterval(t)}else if(Date.now()>deadline){clearInterval(t);resolve(null)}},80);
    });
  }

  async function fetchByStatus(status,limit){
    await waitReady();
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    if(!s||!s.client) return [];
    try{
      let q=s.client.from("applications").select("*").order("created_at",{ascending:true}).limit(limit||100);
      if(status&&status!=="all") q=q.eq("status",status);
      const {data,error}=await q;
      if(error){console.warn("[CGB_APPS]",error.message);return []}
      return data||[];
    }catch(e){console.warn("[CGB_APPS]",e.message);return []}
  }

  async function counts(){
    await waitReady();
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    if(!s||!s.client) return {new:0,approved:0,rejected:0,archived:0};
    const out={new:0,approved:0,rejected:0,archived:0};
    try{
      // Один запрос на все статусы через .head+count
      const stats=["new","approved","rejected","archived"];
      await Promise.all(stats.map(async st=>{
        const {count}=await s.client.from("applications").select("id",{count:"exact",head:true}).eq("status",st);
        if(count!=null) out[st]=count;
      }));
    }catch(e){}
    return out;
  }

  async function updateStatus(id,status,reason){
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    if(!s||!s.client||!s.user) return {ok:false,error:"Не авторизован"};
    const displayName=(function(){
      try{return localStorage.getItem("cgb-my-display-name")||s.user.email||"admin"}catch(e){return s.user.email||"admin"}
    })();
    const patch={
      status,
      responded_by:s.user.id,
      responded_by_name:displayName,
      responded_at:new Date().toISOString()
    };
    if(status==="rejected") patch.reject_reason=reason||"";
    if(status==="archived") patch.reject_reason=null;
    try{
      const {data,error}=await s.client.from("applications").update(patch).eq("id",id).select().maybeSingle();
      if(error) return {ok:false,error:error.message};
      return {ok:true,row:data};
    }catch(e){return {ok:false,error:e.message}}
  }

  async function createManual(payload){
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    if(!s||!s.client) return {ok:false,error:"Не авторизован"};
    try{
      const row={
        source:payload.source||"manual",
        external_id:payload.external_id||null,
        message_link:payload.message_link||null,
        app_type:payload.app_type||"",
        fields:payload.fields||{},
        raw_text:payload.raw_text||null,
        submitter_name:payload.submitter_name||"",
        submitter_discord:payload.submitter_discord||"",
        status:"new"
      };
      const {data,error}=await s.client.from("applications").insert(row).select().maybeSingle();
      if(error) return {ok:false,error:error.message};
      return {ok:true,row:data};
    }catch(e){return {ok:false,error:e.message}}
  }

  // ==== Парсер сообщения бота — вытаскивает поля из discord-сообщения ====
  function stripFormatting(s){
    // Убираем discord-разметку: **bold**, *italic*, __underline__, `code`, ~~strike~~, ++markers++
    return String(s||"")
      .replace(/\*\*\*(.+?)\*\*\*/g,"$1")
      .replace(/\*\*(.+?)\*\*/g,"$1")
      .replace(/__(.+?)__/g,"$1")
      .replace(/\+\+(.+?)\+\+/g,"$1")
      .replace(/~~(.+?)~~/g,"$1")
      .replace(/`([^`]+)`/g,"$1")
      .replace(/\*(.+?)\*/g,"$1")
      .trim();
  }

  function parseDiscordMessage(text){
    // Строки с ключом ищем как: строка полностью в виде "**ЧТО-ТО:**" (без значения на этой же строке)
    // Значение — все последующие непустые строки до следующего такого ключа.
    const raw=String(text||"").replace(/\r/g,"");
    const lines=raw.split("\n");
    const fields={};
    const order=[];
    let currentKey=null;
    let buffer=[];
    const keyRe=/^\s*\*\*(.+?):?\*\*\s*:?\s*$/;
    // Инлайновый вариант: **Ключ:** значение на одной строке
    const inlineRe=/^\s*\*\*(.+?):?\*\*\s*:?\s*(.+)$/;

    function commit(){
      if(currentKey){
        const val=stripFormatting(buffer.join("\n")).trim();
        // Пропускаем футер бота вроде "Вчера, в 23:36"
        if(!/^вчера|^сегодня|^\d{1,2}[.:/]\d{1,2}/i.test(currentKey.trim())){
          fields[currentKey]=val;
          order.push(currentKey);
        }
        buffer=[];
      }
    }
    for(let i=0;i<lines.length;i++){
      const line=lines[i];
      if(/^`{3,}/.test(line.trim())) continue; // ``` — разделитель кода
      // Пустые строки не сбрасывают ключ, но в буфер не идут
      if(!line.trim()) continue;
      // Сначала проверяем «только ключ на строке»
      let m=line.match(keyRe);
      if(m){
        commit();
        currentKey=stripFormatting(m[1]).replace(/:\s*$/,"").trim();
        continue;
      }
      // Иначе — инлайн: **Ключ:** значение
      m=line.match(inlineRe);
      if(m){
        commit();
        currentKey=stripFormatting(m[1]).replace(/:\s*$/,"").trim();
        buffer.push(m[2]);
        continue;
      }
      // Иначе — часть значения
      if(currentKey) buffer.push(line);
    }
    commit();

    let appType=null;
    for(const key of Object.keys(fields)){
      if(/выберите\s*тип|^\s*тип\s*$/i.test(key)){appType=fields[key];delete fields[key]}
    }
    let submitterName="",submitterDiscord="";
    for(const key of Object.keys(fields)){
      if(/имя\s*фамилия|фио|персонаж/i.test(key)&&!submitterName) submitterName=fields[key];
      if(/дискорд|discord/i.test(key)&&!submitterDiscord) submitterDiscord=fields[key];
    }
    return {
      app_type:appType||"Заявление",
      fields,
      submitter_name:submitterName,
      submitter_discord:submitterDiscord,
      raw_text:text
    };
  }

  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function niceDate(d){
    try{const dt=new Date(d);return dt.toLocaleString("ru-RU",{timeZone:"Europe/Moscow",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}
    catch(e){return String(d||"")}
  }

  return {fetchByStatus,counts,updateStatus,createManual,parseDiscordMessage,esc,niceDate};
})();
