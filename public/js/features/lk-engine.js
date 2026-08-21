window.CGB_LK=(function(){
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

  async function count(table){
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    if(!(s&&s.available&&s.client)) return null;
    try{
      const {count:c,error}=await s.client.from(table).select("*",{count:"exact",head:true});
      if(error) throw error;
      return c||0;
    }catch(e){return null}
  }

  async function stats(){
    await waitReady();
    const [news,vehicles,ustavy,tCats,tLessons,comp]=await Promise.all([
      count("news"),count("vehicles"),count("ustavy"),
      count("train_categories"),count("train_lessons"),count("composition")
    ]);
    return {news,vehicles,ustavy,tCats,tLessons,comp};
  }

  async function recent(opts){
    const limit=(opts&&opts.limit)||30;
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    if(!(s&&s.available&&s.client)) return [];
    const c=s.client;
    const activity=[];

    async function safe(fn){try{return await fn()}catch(e){return null}}

    await Promise.all([
      safe(async()=>{
        const {data}=await c.from("news").select("id,title,updated_at,date,author_name,author_email").order("updated_at",{ascending:false}).limit(10);
        (data||[]).forEach(x=>activity.push({type:"news",title:"📰 Новость · "+(x.title||"—"),who:x.author_name||x.author_email||"—",at:x.updated_at||x.date,icon:"📰",href:"news.html#news-"+x.id}));
      }),
      safe(async()=>{
        const {data}=await c.from("vehicles").select("id,title,created_at,updated_at,updated_by_name").order("updated_at",{ascending:false}).limit(10);
        (data||[]).forEach(x=>activity.push({type:"vehicle",title:"🚙 Автопарк · "+(x.title||"—"),who:x.updated_by_name||"—",at:x.updated_at||x.created_at,icon:"🚙",href:"autopark.html"}));
      }),
      safe(async()=>{
        const {data}=await c.from("ustavy").select("slug,title,updated_at,updated_by_name").order("updated_at",{ascending:false}).limit(10);
        (data||[]).forEach(x=>activity.push({type:"ustav",title:"📖 Устав · "+(x.title||"—"),who:x.updated_by_name||"—",at:x.updated_at,icon:"📖",href:"ustav.html#doc/"+x.slug}));
      }),
      safe(async()=>{
        const {data}=await c.from("train_lessons").select("id,title,created_at,author_name").order("created_at",{ascending:false}).limit(10);
        (data||[]).forEach(x=>activity.push({type:"lesson",title:"🎓 Урок · "+(x.title||"—"),who:x.author_name||"—",at:x.created_at,icon:"🎓",href:"learn.html#l-"+x.id}));
      }),
      safe(async()=>{
        const {data}=await c.from("applications").select("id,app_type,submitter_name,submitter_discord,status,responded_by_name,responded_at,created_at").order("created_at",{ascending:false}).limit(20);
        (data||[]).forEach(x=>{
          activity.push({type:"app",title:"📋 Заявление · "+(x.app_type||"—"),who:x.submitter_name||x.submitter_discord||"—",at:x.created_at,icon:"📋",href:"apps.html#app-"+x.id});
          if(x.responded_at&&x.status!=="new"){
            const st=x.status==="approved"?"✅ Одобрено":x.status==="rejected"?"❌ Отказано":"↩ "+x.status;
            activity.push({type:"app-verdict",title:st+" · "+(x.app_type||"—"),who:x.responded_by_name||"—",at:x.responded_at,icon:"⚖",href:"apps.html#app-"+x.id});
          }
        });
      }),
      safe(async()=>{
        const {data}=await c.from("complaints").select("id,code,target_fio,submitter_fio,status,verdict_by_name,verdict_at,created_at").order("created_at",{ascending:false}).limit(20);
        (data||[]).forEach(x=>{
          activity.push({type:"complaint",title:"⚠ Жалоба · "+(x.code||"—"),who:x.submitter_fio||"—",at:x.created_at,icon:"⚠",href:"complaints-review.html#c-"+x.id});
          if(x.verdict_at){
            activity.push({type:"complaint-verdict",title:"⚖ Вердикт по жалобе · "+(x.code||""),who:x.verdict_by_name||"—",at:x.verdict_at,icon:"⚖",href:"complaints-review.html#c-"+x.id});
          }
        });
      }),
      safe(async()=>{
        const {data}=await c.from("requests").select("id,code,kind,submitter_fio,status,verdict_by_name,verdict_at,created_at").order("created_at",{ascending:false}).limit(30);
        const kMeta={leave:{i:"🕒",l:"Отгул"},vacation_ic:{i:"🏖",l:"Отпуск IC"},vacation_ooc:{i:"💤",l:"Отпуск OOC"},promotion:{i:"⭐",l:"Повышение"},dismissal:{i:"⛔",l:"Увольнение"}};
        (data||[]).forEach(x=>{
          const m=kMeta[x.kind]||{i:"📄",l:x.kind||""};
          activity.push({type:"request-"+x.kind,title:m.i+" "+m.l+" · "+(x.code||""),who:x.submitter_fio||"—",at:x.created_at,icon:m.i,href:"requests-review.html#r-"+x.id});
          if(x.verdict_at){
            const st=x.status==="approved"?"✅ Одобрено":x.status==="rejected"?"❌ Отказано":"↩ "+x.status;
            activity.push({type:"request-verdict",title:st+" · "+m.l+" · "+(x.code||""),who:x.verdict_by_name||"—",at:x.verdict_at,icon:"⚖",href:"requests-review.html#r-"+x.id});
          }
        });
      }),
      safe(async()=>{
        const {data}=await c.from("violations_registry").select("id,code,target_fio,kind,issued_by_name,removed_by_name,removed_at,created_at").order("created_at",{ascending:false}).limit(15);
        (data||[]).forEach(x=>{
          activity.push({type:"violation",title:"⚠ Нарушение · "+(x.code||x.kind||""),who:x.issued_by_name||"—",at:x.created_at,icon:"⚠",href:"complaints-review.html"});
          if(x.removed_at) activity.push({type:"violation-removed",title:"✓ Снято нарушение · "+(x.code||""),who:x.removed_by_name||"—",at:x.removed_at,icon:"↩",href:"complaints-review.html"});
        });
      }),
      safe(async()=>{
        const {data}=await c.from("vp_reports").select("id,fio,static_id,checked_by_name,checked_at,created_at").order("created_at",{ascending:false}).limit(15);
        (data||[]).forEach(x=>{
          activity.push({type:"vp",title:"🎖 Проверка АБ · "+(x.fio||x.static_id||""),who:"—",at:x.created_at,icon:"🎖",href:"vp.html"});
          if(x.checked_at) activity.push({type:"vp-check",title:"✓ Проверено АБ · "+(x.fio||""),who:x.checked_by_name||"—",at:x.checked_at,icon:"✓",href:"vp.html"});
        });
      }),
      safe(async()=>{
        const {data}=await c.from("supply_entries").select("id,static_id,fio,kind,created_at,rejected_at,rejected_by_name").order("created_at",{ascending:false}).limit(15);
        (data||[]).forEach(x=>{
          activity.push({type:"supply",title:"📦 Поставка · "+(x.kind||""),who:x.fio||x.static_id||"—",at:x.created_at,icon:"📦",href:"supply.html"});
        });
      }),
      safe(async()=>{
        const {data}=await c.from("payroll_archive").select("id,title,sent_at,sent_by_name,created_at").order("created_at",{ascending:false}).limit(10);
        (data||[]).forEach(x=>{
          activity.push({type:"payroll",title:"💰 Реестр премирования · "+(x.title||""),who:x.sent_by_name||"—",at:x.sent_at||x.created_at,icon:"💰",href:"payroll.html"});
        });
      }),
      safe(async()=>{
        const {data}=await c.from("user_roles").select("user_id,role,display_name,updated_at,created_at").order("updated_at",{ascending:false}).limit(10);
        (data||[]).forEach(x=>{
          activity.push({type:"role",title:"👤 Роль · "+(x.role||"—"),who:x.display_name||"—",at:x.updated_at||x.created_at,icon:"👤",href:"lk.html"});
        });
      }),
      safe(async()=>{
        const {data}=await c.from("tests").select("id,title,slug,created_at,updated_at,author_name").order("updated_at",{ascending:false,nullsFirst:false}).limit(15);
        (data||[]).forEach(x=>activity.push({type:"test",title:"📝 Тест · "+(x.title||x.slug||"—"),who:x.author_name||"—",at:x.updated_at||x.created_at,icon:"📝",href:"tests.html"}));
      }),
      safe(async()=>{
        const {data}=await c.from("test_attempts").select("id,test_id,fio,static_id,score,total,percent,started_at,finished_at,review_status,reviewed_by_name,reviewed_at").order("finished_at",{ascending:false}).limit(30);
        (data||[]).forEach(x=>{
          const pct=x.percent!=null?x.percent+"%":(x.total?Math.round(x.score/x.total*100)+"%":"—");
          activity.push({type:"test-attempt",title:"📝 Экзамен пройден · "+pct,who:x.fio||x.static_id||"—",at:x.finished_at||x.started_at,icon:"📝",href:"tests.html"});
          if(x.reviewed_at){
            const st=x.review_status==="passed"?"✅ Зачёт":x.review_status==="failed"?"❌ Незачёт":"⚖ Проверено";
            activity.push({type:"test-review",title:st+" · тест",who:x.reviewed_by_name||"—",at:x.reviewed_at,icon:"⚖",href:"tests.html"});
          }
        });
      }),
      safe(async()=>{
        const {data}=await c.from("train_categories").select("id,title,created_at,updated_at").order("updated_at",{ascending:false,nullsFirst:false}).limit(10);
        (data||[]).forEach(x=>activity.push({type:"lesson-cat",title:"📚 Категория · "+(x.title||"—"),who:"—",at:x.updated_at||x.created_at,icon:"📚",href:"learn.html"}));
      }),
      safe(async()=>{
        const {data}=await c.from("holiday_state").select("state,updated_at,updated_by_name").eq("id",1).maybeSingle();
        if(data&&data.updated_at){
          const st=data.state||{};
          const themeName=st.label||st.key||(st.enabled?"Тема":"Без темы");
          activity.push({type:"holiday",title:"🎨 Праздничная тема · "+themeName,who:data.updated_by_name||"—",at:data.updated_at,icon:"🎨",href:"lk.html"});
        }
      }),
      safe(async()=>{
        const {data}=await c.from("composition").select("id,updated_at,updated_by_name").eq("id",1).maybeSingle();
        if(data&&data.updated_at){
          activity.push({type:"composition",title:"👥 Изменение состава",who:data.updated_by_name||"—",at:data.updated_at,icon:"👥",href:"composition.html"});
        }
      }),
      safe(async()=>{
        const {data}=await c.from("raids_events").select("id,kind,ds_author_name,created_at").order("created_at",{ascending:false}).limit(20);
        (data||[]).forEach(x=>{
          const t=x.kind==="success"?"✅ Успешный налёт":"❌ Неудачный налёт";
          activity.push({type:"raid-"+x.kind,title:"💥 "+t,who:x.ds_author_name||"—",at:x.created_at,icon:"💥",href:"raids.html"});
        });
      })
    ]);

    activity.sort((a,b)=>new Date(b.at||0)-new Date(a.at||0));
    return activity.slice(0,limit);
  }

  async function updatePassword(newPassword){
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    if(!(s&&s.available&&s.client)) return {ok:false,error:"Supabase недоступен"};
    try{
      const {error}=await s.client.auth.updateUser({password:newPassword});
      if(error) throw error;
      return {ok:true};
    }catch(e){return {ok:false,error:e.message}}
  }

  async function updateProfile(data){
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    if(!(s&&s.available&&s.client)) return {ok:false,error:"Supabase недоступен"};
    try{
      const {error}=await s.client.auth.updateUser({data:data});
      if(error) throw error;
      return {ok:true};
    }catch(e){return {ok:false,error:e.message}}
  }

  return {stats,recent,updatePassword,updateProfile,waitReady};
})();
