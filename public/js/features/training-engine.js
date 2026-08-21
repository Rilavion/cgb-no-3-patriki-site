window.CGB_TRAIN=(function(){
  const DEMO_CATS=[
    {id:"kmb",name:"КМБ · Курс молодого бойца",color:"#8fd97a",parent:null,sort:1},
    {id:"kmb-basic",name:"Основы",color:"#8fd97a",parent:"kmb",sort:1},
    {id:"kmb-service",name:"Служба",color:"#8fd97a",parent:"kmb",sort:2},
    {id:"va",name:"ВА · Военная академия",color:"#7ac3f0",parent:null,sort:2},
    {id:"tactics",name:"Тактическая подготовка",color:"#e8b56a",parent:null,sort:3},
    {id:"comm",name:"Связь и радиообмен",color:"#c99af7",parent:null,sort:4}
  ];

  const DEMO_LESSONS=[];

  function esc(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

  function waitReady(){
    if(window.CGB_AUTH&&window.CGB_AUTH.whenReady) return window.CGB_AUTH.whenReady(8000);
    return new Promise(resolve=>{
      const s=window.CGB_AUTH&&window.CGB_AUTH.state;
      if(!s||s.ready) return resolve();
      let off=()=>{};
      off=window.CGB_AUTH.onChange(st=>{if(st.ready){off();resolve()}});
      setTimeout(()=>resolve(),1500);
    });
  }

  function extractFormEmbed(url){
    if(!url) return null;
    url=url.trim();
    if(url.includes("/forms.gle/")||url.includes("/forms/d/e/")){
      let embedUrl=url;
      if(url.includes("/viewform")) embedUrl=url.replace("/viewform","/viewform?embedded=true");
      else if(!url.includes("?embedded=true")) embedUrl=url+(url.includes("?")?"&":"?")+"embedded=true";
      return embedUrl;
    }
    return url;
  }

  async function loadCats(){
    await waitReady();
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    if(s&&s.available&&s.client){
      try{
        const {data,error}=await s.client.from("train_categories").select("*").order("sort");
        if(error) throw error;
        return data||[];
      }catch(e){console.warn("[CGB_TRAIN] loadCats:",e.message);return []}
    }
    const local=readLocalCats();
    return local.length?local:DEMO_CATS.slice();
  }
  async function loadLessons(){
    await waitReady();
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    if(s&&s.available&&s.client){
      try{
        const {data,error}=await s.client.from("train_lessons").select("*").order("sort");
        if(error) throw error;
        return data||[];
      }catch(e){console.warn("[CGB_TRAIN] loadLessons:",e.message);return []}
    }
    const local=readLocalLessons();
    return local.length?local:DEMO_LESSONS.slice();
  }

  function readLocalCats(){try{return JSON.parse(localStorage.getItem("cgb-train-cats")||"[]")}catch(e){return []}}
  function writeLocalCats(list){localStorage.setItem("cgb-train-cats",JSON.stringify(list))}
  function readLocalLessons(){try{return JSON.parse(localStorage.getItem("cgb-train-lessons")||"[]")}catch(e){return []}}
  function writeLocalLessons(list){localStorage.setItem("cgb-train-lessons",JSON.stringify(list))}

  async function saveCat(cat){
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    if(s&&s.available&&s.client){
      try{
        const {error}=await s.client.from("train_categories").upsert(cat,{onConflict:"id"});
        if(error) throw error;
        return {ok:true,remote:true};
      }catch(e){return {ok:false,error:e.message}}
    }
    const list=readLocalCats();
    const i=list.findIndex(x=>x.id===cat.id);
    if(i>=0) list[i]=cat;else list.push(cat);
    writeLocalCats(list);
    return {ok:true,remote:false};
  }
  async function removeCat(id){
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    if(s&&s.available&&s.client){
      try{
        await s.client.from("train_lessons").delete().eq("category",id);
        await s.client.from("train_categories").delete().eq("parent",id);
        await s.client.from("train_categories").delete().eq("id",id);
        return {ok:true,remote:true};
      }catch(e){return {ok:false,error:e.message}}
    }
    let cats=readLocalCats().filter(c=>c.id!==id&&c.parent!==id);
    writeLocalCats(cats);
    let lessons=readLocalLessons().filter(l=>l.category!==id);
    writeLocalLessons(lessons);
    return {ok:true,remote:false};
  }
  async function saveLesson(lesson){
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    if(s&&s.available&&s.client){
      try{
        if(lesson.category){
          const {data:cat,error:e0}=await s.client.from("train_categories").select("id").eq("id",lesson.category).maybeSingle();
          if(e0) throw e0;
          if(!cat) return {ok:false,error:"Категория «"+lesson.category+"» отсутствует в базе. Создайте её через «⚙ Категории» или обновите страницу."};
        }
        const {error}=await s.client.from("train_lessons").upsert(lesson,{onConflict:"id"});
        if(error) throw error;
        const {data:saved,error:e2}=await s.client.from("train_lessons").select("*").eq("id",lesson.id).maybeSingle();
        if(e2) throw e2;
        if(lesson.test_url&&saved&&!("test_url" in saved)) return {ok:false,error:"MISSING_COL_TEST_URL"};
        return {ok:true,remote:true,saved:saved||lesson};
      }catch(e){return {ok:false,error:e.message}}
    }
    const list=readLocalLessons();
    const i=list.findIndex(x=>x.id===lesson.id);
    if(i>=0) list[i]=lesson;else list.push(lesson);
    writeLocalLessons(list);
    return {ok:true,remote:false,saved:lesson};
  }
  async function removeLesson(id){
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    if(s&&s.available&&s.client){
      try{await s.client.from("train_lessons").delete().eq("id",id);return {ok:true,remote:true}}
      catch(e){return {ok:false,error:e.message}}
    }
    writeLocalLessons(readLocalLessons().filter(l=>l.id!==id));
    return {ok:true,remote:false};
  }

  async function seedDemoCats(){
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    if(!(s&&s.available&&s.client)) return {ok:false,error:"Supabase недоступен"};
    try{
      const {data:existing,error:e1}=await s.client.from("train_categories").select("id");
      if(e1) throw e1;
      const existingIds=new Set((existing||[]).map(r=>r.id));
      const toInsert=DEMO_CATS.filter(c=>!existingIds.has(c.id));
      if(!toInsert.length) return {ok:true,count:0};
      const {error}=await s.client.from("train_categories").insert(toInsert);
      if(error) throw error;
      return {ok:true,count:toInsert.length};
    }catch(e){return {ok:false,error:e.message}}
  }

  function uid(prefix){return (prefix||"id")+"_"+Math.random().toString(36).slice(2,9)}

  return {DEMO_CATS,DEMO_LESSONS,loadCats,loadLessons,saveCat,removeCat,saveLesson,removeLesson,seedDemoCats,esc,extractFormEmbed,uid};
})();
