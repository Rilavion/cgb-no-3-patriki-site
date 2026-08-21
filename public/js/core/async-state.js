window.CGB_ASYNC=(function(){
  const inflight=new Map();
  const revisions=new Map();
  const queues=new Map();

  function single(key,task){
    if(inflight.has(key)) return inflight.get(key);
    const promise=Promise.resolve().then(task).finally(()=>{
      if(inflight.get(key)===promise) inflight.delete(key);
    });
    inflight.set(key,promise);
    return promise;
  }

  function latest(key,task,commit){
    const revision=(revisions.get(key)||0)+1;
    revisions.set(key,revision);
    return Promise.resolve().then(task).then(value=>{
      if(revisions.get(key)!==revision) return {current:false,value};
      return Promise.resolve(commit?commit(value):value).then(result=>({current:true,value,result}));
    });
  }

  function invalidate(key){
    revisions.set(key,(revisions.get(key)||0)+1);
    inflight.delete(key);
  }

  function serial(key,task){
    const previous=queues.get(key)||Promise.resolve();
    const next=previous.catch(()=>{}).then(task).finally(()=>{
      if(queues.get(key)===next) queues.delete(key);
    });
    queues.set(key,next);
    return next;
  }

  function waitFor(check,options){
    const opts=options||{};
    const timeoutMs=Number(opts.timeoutMs)||8000;
    const intervalMs=Number(opts.intervalMs)||50;
    return new Promise(resolve=>{
      let finished=false;
      let interval=0;
      let timer=0;
      let removeEvent=()=>{};
      const finish=value=>{
        if(finished) return;
        finished=true;
        clearInterval(interval);
        clearTimeout(timer);
        removeEvent();
        resolve(value);
      };
      const inspect=()=>{
        try{
          const value=check();
          if(value) finish(value);
        }catch(error){
          if(opts.rejectOnError) finish(null);
        }
      };
      inspect();
      if(finished) return;
      interval=setInterval(inspect,intervalMs);
      timer=setTimeout(()=>finish(null),timeoutMs);
      if(opts.target&&opts.event){
        const handler=()=>inspect();
        opts.target.addEventListener(opts.event,handler);
        removeEvent=()=>opts.target.removeEventListener(opts.event,handler);
      }
    });
  }

  return {single,latest,invalidate,serial,waitFor};
})();
