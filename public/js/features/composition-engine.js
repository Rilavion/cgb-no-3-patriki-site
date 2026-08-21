window.CGB_COMP=(function(){
  /* Категории (ранги) — полностью кастомные, хранятся в state.ranks.
     Дефолтного списка больше нет: администратор добавляет свои категории
     через кнопку «🗂 Категории» на странице состава. */

  /* Легаси-маппинг старых захардкоженных ключей — только для одноразовой
     миграции text-меток существующих участников (rank_label), чтобы
     карточки не «слетели» после включения кастомных категорий. */
  const LEGACY_RANK_LABELS={
    gen_maj:"Гл-Врач",gen_lt:"Зам. Гл-Врача",col:"Зав-Отделением",
    lt_col:"Ст-Врач",maj:"Врач",capt:"Интерн",lt:"Фельдшер"
  };

  const DEFAULT_HQ_SLOTS=[
    {key:"cmd_brigade",label:"Главный врач",badge:"",tier:1,locked:true},
    {key:"first_deputy",label:"Первый заместитель главврача",badge:"",tier:2},
    {key:"chief_staff",label:"Зам. по медицинской части",badge:"",tier:2},
    {key:"deputy_vp_vk",label:"Зам. по кадрам",badge:"",tier:2},
    {key:"deputy_sso_roio",label:"Зам. по клинико-экспертной работе",badge:"",tier:2},
    {key:"deputy_mch",label:"Зам. по адм.-хоз. части",badge:"",tier:2},
    {key:"assistant",label:"Помощник главврача",badge:"",tier:3}
  ];

  const SUB_PRESETS={
    vp:{color:"#c94b4b",icon:"🏛"},
    vk:{color:"#4b6dc9",icon:"📋"},
    sso:{color:"#2f7a52",icon:"🚑"},
    roio:{color:"#c78a2a",icon:"🛡"},
    mch:{color:"#a34a8e",icon:"⚕"},
    default:{color:"#7a8a4a",icon:"★"}
  };

  const DEFAULT_STATE={
    ranks:[],
    hq_slots:JSON.parse(JSON.stringify(DEFAULT_HQ_SLOTS)),
    hq:{},
    subs:[],
    updated_at:null
  };

  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

  /* Поиск категории по ключу в списке state.ranks.
     tier = позиция в списке (чем выше в списке, тем старше категория). */
  function rankInfo(k,ranks){
    const list=Array.isArray(ranks)?ranks:[];
    const i=list.findIndex(r=>r&&r.key===k);
    if(i>=0) return {key:k,label:list[i].label||k,short:list[i].short||list[i].label||k,tier:i+1,found:true};
    return {key:k,label:k,short:k,tier:999,found:false};
  }

  function waitReady(){
    if(window.CGB_AUTH&&window.CGB_AUTH.whenReady) return window.CGB_AUTH.whenReady(10000);
    return new Promise(resolve=>{
      const s=window.CGB_AUTH&&window.CGB_AUTH.state;
      if(!s||s.ready) return resolve();
      let off=()=>{};
      off=window.CGB_AUTH.onChange(st=>{if(st.ready){off();resolve()}});
      setTimeout(()=>resolve(),10000);
    });
  }

  function readLocal(){try{return JSON.parse(localStorage.getItem("cgb-composition")||"null")}catch(e){return null}}
  function writeLocal(state){localStorage.setItem("cgb-composition",JSON.stringify(state))}

  function migrate(st){
    if(!st) st={};
    if(!st.hq_slots||!Array.isArray(st.hq_slots)||!st.hq_slots.length){
      st.hq_slots=JSON.parse(JSON.stringify(DEFAULT_HQ_SLOTS));
    }
    if(!st.hq) st.hq={};
    if(!st.subs) st.subs=[];
    if(!Array.isArray(st.ranks)) st.ranks=[];
    // нормализация категорий
    st.ranks=st.ranks.filter(r=>r&&r.key&&r.label).map(r=>({key:String(r.key),label:String(r.label),short:String(r.short||r.label)}));
    // миграция легаси-рангов: ставим участникам текстовую метку,
    // если её категория не существует в кастомном списке
    (st.subs||[]).forEach(sub=>{
      sub.grid_cols=Math.max(1,Math.min(10,parseInt(sub.grid_cols)||3));
      const rawRows=Array.isArray(sub.row_cols)?sub.row_cols:(typeof sub.row_cols==="string"?sub.row_cols.split(/[,;\s]+/):[]);
      sub.row_cols=rawRows.map(value=>Math.max(1,Math.min(10,parseInt(value)||sub.grid_cols))).slice(0,30);
      (sub.members||[]).forEach(m=>{
        if(!m) return;
        const found=st.ranks.some(r=>r.key===m.rank);
        if(!found){
          if(!m.rank_label){
            m.rank_label=LEGACY_RANK_LABELS[m.rank]||(m.rank&&m.rank!=="none"?m.rank:"");
          }
        }else{
          // категория есть — следом подтянем актуальный label при показе
        }
      });
    });
    return st;
  }
  async function load(){
    await waitReady();
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    if(s&&s.available&&s.client){
      for(let attempt=1;attempt<=3;attempt++){
        try{
          const {data,error}=await s.client.from("composition").select("*").eq("id",1).maybeSingle();
          if(error) throw error;
          if(data&&data.state){
            const st=typeof data.state==="string"?JSON.parse(data.state):data.state;
            return migrate(Object.assign({},DEFAULT_STATE,st));
          }
        }catch(e){console.warn(`[CGB_COMP] attempt ${attempt}/3`,e.message)}
        if(attempt<3) await new Promise(r=>setTimeout(r,700*attempt));
      }
    }
    const cached=readLocal();
    return migrate(cached||JSON.parse(JSON.stringify(DEFAULT_STATE)));
  }

  async function save(state){
    state.updated_at=new Date().toISOString();
    writeLocal(state);
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    if(s&&s.available&&s.client){
      try{
        const {error}=await s.client.from("composition").upsert({id:1,state:state,updated_at:state.updated_at},{onConflict:"id"});
        if(error) throw error;
        return {ok:true,remote:true};
      }catch(e){console.warn("[CGB_COMP] save err:",e.message);return {ok:true,remote:false,error:e.message}}
    }
    return {ok:true,remote:false};
  }

  async function uploadPhoto(file){
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    if(!s||!s.client) return {ok:false,error:"Нет связи с хранилищем. Обновите страницу."};
    if(!s.user) return {ok:false,error:"Для загрузки фото нужно войти на сайт."};
    if(!file) return {ok:false,error:"Файл не выбран."};

    const extByType={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif"};
    const typeByExt={jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",gif:"image/gif"};
    const nameExt=((file.name||"").match(/\.([a-z0-9]+)$/i)||[])[1];
    const normalizedExt=nameExt&&nameExt.toLowerCase()==="jpeg"?"jpg":nameExt&&nameExt.toLowerCase();
    const contentType=extByType[file.type]?file.type:typeByExt[normalizedExt];
    const ext=extByType[contentType];

    if(!contentType||!ext) return {ok:false,error:"Поддерживаются JPG, PNG, WebP или GIF."};
    if(file.size>15*1024*1024) return {ok:false,error:"Файл больше 15 МБ."};

    // Оригинал отправляется сразу в Supabase Storage.
    // Не меняем размер, формат и качество и не требуем копию на VPS.
    const path="comp_"+Date.now()+"_"+Math.random().toString(36).slice(2,8)+"."+ext;
    try{
      const {error}=await s.client.storage.from("composition-photos").upload(path,file,{contentType,cacheControl:"31536000",upsert:false});
      if(error) return {ok:false,error:error.message};
      const {data:pub}=s.client.storage.from("composition-photos").getPublicUrl(path);
      if(!pub||!pub.publicUrl) return {ok:false,error:"Хранилище не вернуло ссылку на фото."};
      return {ok:true,url:pub.publicUrl,path};
    }catch(e){return {ok:false,error:e.message}}
  }

  function uid(){return "s_"+Math.random().toString(36).slice(2,9)}
  function rankUid(){return "rk_"+Math.random().toString(36).slice(2,9)}

  return {DEFAULT_HQ_SLOTS,DEFAULT_STATE,SUB_PRESETS,LEGACY_RANK_LABELS,load,save,migrate,uploadPhoto,esc,rankInfo,uid,rankUid};
})();
