window.CGB_TESTS=(function(){
  function waitReady(){return new Promise(resolve=>{
    const deadline=Date.now()+5000;
    function ck(){const s=window.CGB_AUTH&&window.CGB_AUTH.state;if(s&&s.ready){resolve(s);return true}return false}
    if(ck()) return;
    const t=setInterval(()=>{if(ck()){clearInterval(t)}else if(Date.now()>deadline){clearInterval(t);resolve(null)}},80);
  })}
  async function client(){
    await waitReady();
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    return s&&s.client?s.client:null;
  }
  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function slugify(s){return String(s||"").toLowerCase().replace(/[^a-zа-я0-9-\s]/gi,"").trim().replace(/\s+/g,"-").slice(0,50)+"-"+Math.random().toString(36).slice(2,7)}
  function validStatic(v){return /^\d{3}-\d{3}$/.test(String(v||"").trim())}

  async function fetchCategories(){
    const c=await client();if(!c) return [];
    const {data}=await c.from("test_categories").select("*").order("sort",{ascending:true});
    return data||[];
  }
  async function saveCategory(row){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const {data,error}=await c.from("test_categories").upsert(row).select().single();
    if(error) return {ok:false,error:error.message};
    return {ok:true,row:data};
  }
  async function removeCategory(id){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const {error}=await c.from("test_categories").delete().eq("id",id);
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }

  async function fetchTests(onlyPublished){
    const c=await client();if(!c) return [];
    let q=c.from("tests").select("*").order("sort",{ascending:true}).order("created_at",{ascending:false});
    if(onlyPublished) q=q.eq("published",true);
    const {data}=await q;
    return data||[];
  }
  async function fetchTest(idOrSlug){
    const c=await client();if(!c) return null;
    const isUuid=/^[0-9a-f-]{36}$/i.test(idOrSlug);
    const {data}=await c.from("tests").select("*").eq(isUuid?"id":"slug",idOrSlug).maybeSingle();
    return data;
  }
  async function saveTest(row){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    const name=(function(){try{return localStorage.getItem("cgb-my-display-name")||(s&&s.user&&s.user.email)||"admin"}catch(e){return "admin"}})();
    if(!row.id){
      row.created_by=s&&s.user?s.user.id:null;
      row.created_by_name=name;
      if(!row.slug) row.slug=slugify(row.title||"test");
    }
    row.updated_at=new Date().toISOString();
    const {data,error}=await c.from("tests").upsert(row).select().single();
    if(error) return {ok:false,error:error.message};
    return {ok:true,row:data};
  }
  async function removeTest(id){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const {error}=await c.from("tests").delete().eq("id",id);
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }

  async function fetchQuestions(testId){
    const c=await client();if(!c) return [];
    const {data}=await c.from("test_questions").select("*").eq("test_id",testId).order("sort",{ascending:true});
    return data||[];
  }
  async function saveQuestion(row){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    let res=await c.from("test_questions").upsert(row).select().single();
    let droppedOptImgs=false;
    // Страховка: если в базе ещё нет колонки option_images (не выполнен
    // SUPABASE-FIX.sql), сохраняем вопрос без картинок вариантов, а не роняем форму.
    if(res.error&&/Could not find the 'option_images' column/i.test(res.error.message||"")){
      const row2=Object.assign({},row);delete row2.option_images;droppedOptImgs=true;
      res=await c.from("test_questions").upsert(row2).select().single();
    }
    const {data,error}=res;
    if(error) return {ok:false,error:error.message};
    return {ok:true,row:data,droppedOptImgs};
  }
  async function removeQuestion(id){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const {error}=await c.from("test_questions").delete().eq("id",id);
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }
  async function reorderQuestions(list){
    const c=await client();if(!c) return {ok:false};
    for(let i=0;i<list.length;i++){
      await c.from("test_questions").update({sort:(i+1)*10}).eq("id",list[i].id);
    }
    return {ok:true};
  }

  async function fetchPingLines(testId){
    const c=await client();if(!c) return [];
    const {data}=await c.from("test_ping_lines").select("*").eq("test_id",testId).order("sort",{ascending:true});
    return data||[];
  }
  async function savePingLine(row){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const {data,error}=await c.from("test_ping_lines").upsert(row).select().single();
    if(error) return {ok:false,error:error.message};
    return {ok:true,row:data};
  }
  async function removePingLine(id){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const {error}=await c.from("test_ping_lines").delete().eq("id",id);
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }

  async function fetchBlocks(testId){
    const c=await client();if(!c) return [];
    const {data}=await c.from("test_blocks").select("*").eq("test_id",testId);
    return data||[];
  }
  async function addBlock(testId,kind,value,reason){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    const name=(function(){try{return localStorage.getItem("cgb-my-display-name")||(s&&s.user&&s.user.email)||"admin"}catch(e){return "admin"}})();
    const {error}=await c.from("test_blocks").upsert({test_id:testId,kind,value:String(value||"").trim(),reason:reason||null,blocked_by:s&&s.user?s.user.id:null,blocked_by_name:name},{onConflict:"test_id,kind,value"});
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }
  async function removeBlock(id){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const {error}=await c.from("test_blocks").delete().eq("id",id);
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }

  async function attemptsFor(testId,staticId,discord){
    const c=await client();if(!c) return {ok:true,count:0};
    const {data,error}=await c.rpc("count_test_attempts",{
      p_test_id:testId,
      p_static:staticId||null,
      p_discord:discord||null
    });
    if(error){console.warn("[VP attemptsFor]",error.message);return {ok:false,count:0,error:error.message}}
    return {ok:true,count:data||0};
  }

  async function checkBlocked(testId,staticId,discord){
    const c=await client();if(!c) return {blocked:false};
    const {data,error}=await c.rpc("check_test_blocked",{
      p_test_id:testId,
      p_static:staticId||null,
      p_discord:discord||null
    });
    if(error) return {blocked:false};
    if(data==null) return {blocked:false};
    return {blocked:true,reason:data};
  }

  async function fetchAttempts(testId,limit){
    const c=await client();if(!c) return [];
    let q=c.from("test_attempts").select("*").order("finished_at",{ascending:false}).limit(limit||200);
    if(testId) q=q.eq("test_id",testId);
    const {data}=await q;
    return data||[];
  }
  async function updateAttempt(id,patch){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    const name=(function(){try{return localStorage.getItem("cgb-my-display-name")||(s&&s.user&&s.user.email)||"ss"}catch(e){return "ss"}})();
    const {data:orig}=await c.from("test_attempts").select("review_history").eq("id",id).maybeSingle();
    const history=(orig&&orig.review_history)||[];
    history.push({at:new Date().toISOString(),by:name,patch});
    const row=Object.assign({},patch,{reviewed_by:s&&s.user?s.user.id:null,reviewed_by_name:name,reviewed_at:new Date().toISOString(),review_history:history});
    const {error}=await c.from("test_attempts").update(row).eq("id",id);
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }
  async function resetAttempts(testId,staticId,discord){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    let q=c.from("test_attempts").delete().eq("test_id",testId);
    if(staticId&&discord) q=q.or(`static_id.eq.${staticId},discord.eq.${discord}`);
    else if(staticId) q=q.eq("static_id",staticId);
    else if(discord) q=q.eq("discord",discord);
    else return {ok:false,error:"no key"};
    const {error}=await q;
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }

  function grade(questions,answers){
    let score=0,max=0;
    const details=[];
    for(const q of questions){
      if(q.kind==="prefilled") continue;
      const pts=q.points||1;
      max+=pts;
      const user=answers[q.id];
      const correct=q.correct||[];
      let ok=false;
      if(q.kind==="single"){
        ok=(user!=null)&&correct.length===1&&correct[0]===user;
      } else if(q.kind==="order"){
        const uArr=Array.isArray(user)?user:[];
        ok=uArr.length===correct.length&&uArr.every((v,i)=>v===correct[i]);
      } else if(q.kind==="multi"){
        const uArr=Array.isArray(user)?user:[];
        const uSet=new Set(uArr);
        const cSet=new Set(correct);
        if(uSet.size===cSet.size){
          ok=true;
          for(const v of cSet) if(!uSet.has(v)){ok=false;break}
        }
      }
      if(ok) score+=pts;
      details.push({qid:q.id,ok,points:ok?pts:0,max:pts});
    }
    const percent=max?Math.round(score*100/max):0;
    return {score,max_score:max,percent,details};
  }

  function shuffleArray(arr){
    const a=arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  function pickQuestionsForRun(all,test){
    const prefilled=all.filter(q=>q.kind==="prefilled");
    const regular=all.filter(q=>q.kind!=="prefilled");
    let picked=regular;
    if(test.shuffle_questions) picked=shuffleArray(picked);
    if(test.questions_per_run&&test.questions_per_run>0&&test.questions_per_run<picked.length){
      picked=picked.slice(0,test.questions_per_run);
    }
    return [...prefilled,...picked];
  }

  function makeUuid(){
    if(crypto&&crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{
      const r=Math.random()*16|0;const v=c==="x"?r:(r&0x3|0x8);return v.toString(16);
    });
  }

  async function submitAttempt(payload){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    if(!validStatic(payload.static_id)) return {ok:false,error:"Некорректный статик, ожидается 000-000"};
    const {data,error}=await c.rpc("submit_test_attempt",{
      p_test_id:payload.test_id,
      p_fio:String(payload.fio||"").trim(),
      p_static:String(payload.static_id||"").trim(),
      p_discord:payload.discord?String(payload.discord).trim():null,
      p_answers:payload.answers||{},
      p_score:payload.score,
      p_max:payload.max_score,
      p_percent:payload.percent,
      p_passed:payload.passed,
      p_started:payload.started_at||new Date().toISOString()
    });
    if(error) return {ok:false,error:error.message};
    return {ok:true,attempt:{id:data}};
  }

  async function requestResult(attemptId,channelId,pingDiscord,isRepeat){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    const name=(function(){try{return localStorage.getItem("cgb-my-display-name")||(s&&s.user&&s.user.email)||"system"}catch(e){return "system"}})();
    if(s&&s.user){
      const row={attempt_id:attemptId,channel_id:channelId||null,ping_discord:pingDiscord||null,is_repeat:!!isRepeat,requested_by:s.user.id,requested_by_name:name};
      const {data,error}=await c.from("test_result_requests").insert(row).select().single();
      if(error) return {ok:false,error:error.message};
      return {ok:true,id:data.id};
    } else {
      const {data,error}=await c.rpc("request_test_result",{
        p_attempt_id:attemptId,
        p_channel_id:channelId||null,
        p_ping_discord:pingDiscord||null
      });
      if(error) return {ok:false,error:error.message};
      return {ok:true,id:data};
    }
  }

  async function pollResult(id,timeoutMs){
    if(!id) return {ok:true,skipped:true};
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    if(!s||!s.user) return {ok:true,skipped:true};
    const deadline=Date.now()+(timeoutMs||30000);
    while(Date.now()<deadline){
      const {data}=await c.from("test_result_requests").select("*").eq("id",id).maybeSingle();
      if(data&&(data.status==="sent"||data.status==="error")) return {ok:data.status==="sent",status:data.status,error:data.message};
      await new Promise(r=>setTimeout(r,900));
    }
    return {ok:false,error:"timeout"};
  }

  async function fetchDsChannels(){
    const c=await client();if(!c) return [];
    const {data}=await c.from("ds_channels").select("*").order("parent_name",{ascending:true,nullsFirst:true}).order("position",{ascending:true});
    return data||[];
  }

  return {esc,validStatic,slugify,fetchCategories,saveCategory,removeCategory,fetchTests,fetchTest,saveTest,removeTest,fetchQuestions,saveQuestion,removeQuestion,reorderQuestions,fetchPingLines,savePingLine,removePingLine,fetchBlocks,addBlock,removeBlock,attemptsFor,checkBlocked,fetchAttempts,updateAttempt,resetAttempts,grade,pickQuestionsForRun,submitAttempt,requestResult,pollResult,fetchDsChannels};
})();
