window.CGB_NEWS=(function(){
  const DEMO=[];

  const TAGS={
    news:{label:"Новость",cls:"tag-news"},
    announce:{label:"Объявление",cls:"tag-announce"},
    event:{label:"Мероприятие",cls:"tag-event"},
    vaccine:{label:"Вакцинация",cls:"tag-vaccine"},
    equipment:{label:"Оборудование",cls:"tag-equipment"},
    staff:{label:"Кадры",cls:"tag-staff"},
    alert:{label:"Внимание",cls:"tag-alert"},
    schedule:{label:"График",cls:"tag-schedule"}
  };

  const DEPTS={
    general:{label:"Общее",cls:"dept-general"},
    admin:{label:"Администрация",cls:"dept-administration"},
    therapy:{label:"Терапия",cls:"dept-therapy"},
    surgery:{label:"Хирургия",cls:"dept-surgery"},
    cardiology:{label:"Кардиология",cls:"dept-cardiology"},
    pediatrics:{label:"Педиатрия",cls:"dept-pediatrics"},
    diagnostics:{label:"Диагностика",cls:"dept-diagnostics"},
    emergency:{label:"Скорая помощь",cls:"dept-emergency"}
  };

  function waitReady(){
    if(window.CGB_AUTH&&window.CGB_AUTH.whenReady) return window.CGB_AUTH.whenReady(8000);
    return new Promise(resolve=>{
      const s=window.CGB_AUTH&&window.CGB_AUTH.state;
      if(!s||s.ready) return resolve();
      let off=()=>{};
      off=window.CGB_AUTH.onChange(st=>{if(st.ready){off();resolve()}});
      setTimeout(()=>resolve(),1200);
    });
  }

  async function fetchNews(limit){
    await waitReady();
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    if(s&&s.available&&s.client){
      try{
        let q=s.client.from("news").select("*").order("date",{ascending:false});
        if(limit) q=q.limit(limit);
        const {data,error}=await q;
        if(error) throw error;
        return data||[];
      }catch(e){console.warn("[CGB_NEWS]",e.message);return []}
    }
    return limit?DEMO.slice(0,limit):DEMO.slice();
  }

  function fmt(d){
    try{return new Date(d).toLocaleDateString("ru-RU",{timeZone:"Europe/Moscow",day:"numeric",month:"long",year:"numeric"})}catch(e){return d}
  }

  function daysBetween(d1,d2){
    try{return Math.abs((new Date(d1)-new Date(d2))/86400000)}catch(e){return 999}
  }

  function esc(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function tagInfo(t){return TAGS[t]||TAGS.news}
  function tagsList(){return Object.keys(TAGS).map(k=>({key:k,label:TAGS[k].label}))}
  function deptInfo(d){return DEPTS[d]||DEPTS.general}
  function deptsList(){return Object.keys(DEPTS).map(k=>({key:k,label:DEPTS[k].label}))}

  function firstImage(n){
    if(n.image) return n.image;
    if(n.images){
      if(Array.isArray(n.images)&&n.images.length) return n.images[0];
      if(typeof n.images==="string"&&n.images.trim()) return n.images.split(/[\s,]+/).filter(Boolean)[0];
    }
    return "";
  }

  function allImages(n){
    const arr=[];
    if(n.image) arr.push(n.image);
    if(n.images){
      if(Array.isArray(n.images)) n.images.forEach(x=>{if(x&&arr.indexOf(x)<0) arr.push(x)});
      else if(typeof n.images==="string") n.images.split(/[\s,]+/).filter(Boolean).forEach(x=>{if(arr.indexOf(x)<0) arr.push(x)});
    }
    return arr;
  }

  function cardHtml(n){
    const img=firstImage(n);
    const imgHtml=img?`<img src="${esc(img)}" alt="${esc(n.title)}" loading="lazy">`:"";
    const t=tagInfo(n.tag);
    const d=deptInfo(n.dept);
    return `<div class="news-card" data-news-id="${n.id}">
      <div class="news-thumb">
        <div class="news-thumb-badges">
          <span class="news-thumb-tag ${t.cls}">${t.label}</span>
          <span class="news-thumb-dept ${d.cls}">${d.label}</span>
        </div>
        ${imgHtml}
      </div>
      <div class="news-body">
        <div class="news-date">${fmt(n.date)}</div>
        <div class="news-title">${esc(n.title)}</div>
        <div class="news-excerpt">${esc(n.excerpt||"")}</div>
        <div class="news-more">Читать материал</div>
      </div>
    </div>`;
  }

  return {fetchNews,cardHtml,fmt,esc,tagInfo,tagsList,deptInfo,deptsList,firstImage,allImages,daysBetween,DEMO};
})();
