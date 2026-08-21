window.CGB_NEWS_READER=(function(){
  var reader,progressBar,contentEl,mainEl,thumbsEl,counterEl,btnPrev,btnNext;
  var lb,lbImg,lbCounter,lbBtnPrev,lbBtnNext;
  var current=null,currentImgs=[],idx=0,lbIdx=0;

  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function fmt(d){try{return new Date(d).toLocaleDateString("ru-RU",{timeZone:"Europe/Moscow",day:"numeric",month:"long",year:"numeric"})}catch(e){return d}}

  function build(){
    if(reader) return;
    reader=document.createElement("div");
    reader.className="news-reader";
    reader.innerHTML=`
      <div class="news-reader-topbar">
        <button class="news-reader-back" type="button">
          <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          <span>Назад к новостям</span>
        </button>
        <div class="news-reader-actions"></div>
        <div class="news-reader-progress"></div>
      </div>
      <div class="news-reader-content"></div>
    `;
    document.body.appendChild(reader);
    progressBar=reader.querySelector(".news-reader-progress");
    contentEl=reader.querySelector(".news-reader-content");
    reader.querySelector(".news-reader-back").addEventListener("click",close);
    reader.addEventListener("scroll",updateProgress);

    lb=document.createElement("div");
    lb.className="news-lightbox";
    lb.innerHTML=`
      <button class="news-lightbox-close">✕</button>
      <button class="news-lightbox-nav prev">‹</button>
      <div class="news-lightbox-content"><img alt=""></div>
      <button class="news-lightbox-nav next">›</button>
      <div class="news-lightbox-counter"></div>
    `;
    document.body.appendChild(lb);
    lbImg=lb.querySelector("img");
    lbCounter=lb.querySelector(".news-lightbox-counter");
    lbBtnPrev=lb.querySelector(".news-lightbox-nav.prev");
    lbBtnNext=lb.querySelector(".news-lightbox-nav.next");
    lb.querySelector(".news-lightbox-close").addEventListener("click",closeLb);
    lb.addEventListener("click",e=>{if(e.target===lb) closeLb()});
    lbBtnPrev.addEventListener("click",()=>navLb(-1));
    lbBtnNext.addEventListener("click",()=>navLb(1));

    document.addEventListener("keydown",e=>{
      if(lb.classList.contains("active")){
        if(e.key==="Escape") closeLb();
        else if(e.key==="ArrowLeft") navLb(-1);
        else if(e.key==="ArrowRight") navLb(1);
        return;
      }
      if(reader.classList.contains("active")){
        if(e.key==="Escape") close();
        else if(e.key==="ArrowLeft") nav(-1);
        else if(e.key==="ArrowRight") nav(1);
      }
    });
  }

  function updateProgress(){
    if(!reader.classList.contains("active")) return;
    var h=reader.scrollHeight-reader.clientHeight;
    var s=reader.scrollTop;
    progressBar.style.width=h>0?Math.min(s/h*100,100)+"%":"0";
  }

  function autoFormat(text){
    if(!text) return "";
    var parts=String(text).split(/\n{2,}/).map(p=>p.trim()).filter(Boolean);
    if(!parts.length) parts=[String(text).trim()];
    return parts.map(p=>"<p>"+esc(p).replace(/\n/g,"<br>")+"</p>").join("");
  }

  function open(n,opts){
    build();
    current=n;
    opts=opts||{};
    var T=window.CGB_NEWS;
    var tag=T&&T.tagInfo?T.tagInfo(n.tag):{label:"Новость",cls:"tag-news"};
    var dept=T&&T.deptInfo?T.deptInfo(n.dept):{label:"Общее",cls:"dept-general"};
    currentImgs=T&&T.allImages?T.allImages(n):(n.image?[n.image]:[]);
    idx=0;

    var galleryHtml="";
    if(currentImgs.length){
      var slides=currentImgs.map((u,i)=>`<div class="news-gallery-slide${i===0?" active":""}" data-i="${i}"><img src="${esc(u)}" alt="" loading="${i===0?"eager":"lazy"}"></div>`).join("");
      var thumbs=currentImgs.length>1?`<div class="news-gallery-thumbs">${currentImgs.map((u,i)=>`<div class="news-gallery-thumb${i===0?" active":""}" data-i="${i}"><img src="${esc(u)}" alt="" loading="lazy"></div>`).join("")}</div>`:"";
      var navBtns=currentImgs.length>1?`
        <button class="news-gallery-nav prev" type="button">‹</button>
        <button class="news-gallery-nav next" type="button">›</button>
        <div class="news-gallery-counter"><span class="gc-cur">1</span> / ${currentImgs.length}</div>
      `:"";
      galleryHtml=`<div class="news-gallery">
        <div class="news-gallery-main">${slides}${navBtns}</div>
        ${thumbs}
      </div>`;
    }

    var edit=(opts.canEdit?`<button class="btn btn-ghost btn-sm" data-reader-edit>✎ Редактировать</button>`:"")+
      (opts.canDelete?`<button class="btn btn-ghost btn-sm btn-danger" data-reader-del>Удалить</button>`:"");

    contentEl.innerHTML=`
      <div class="news-reader-header">
        <div class="news-reader-badges">
          <span class="news-thumb-tag ${tag.cls}">${esc(tag.label)}</span>
          <span class="news-thumb-dept ${dept.cls}">${esc(dept.label)}</span>
        </div>
        <h1 class="news-reader-title">${esc(n.title)}</h1>
        <div class="news-reader-meta">
          <span class="news-reader-meta-item"><svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>${fmt(n.date)}</span>
          <span class="news-reader-meta-sep"></span>
          <span class="news-reader-meta-item"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>Редакция ЦГБ №3</span>
          ${currentImgs.length?`<span class="news-reader-meta-sep"></span><span class="news-reader-meta-item"><svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>${currentImgs.length} фото</span>`:""}
        </div>
      </div>
      ${galleryHtml}
      <article class="news-reader-body">${autoFormat(n.body||n.excerpt||"")}</article>
      <div class="news-reader-footer">Материал Центральной городской больницы №3 · ${fmt(n.date)}</div>
    `;

    var actions=reader.querySelector(".news-reader-actions");
    actions.innerHTML=edit;
    var eb=actions.querySelector("[data-reader-edit]");
    var db=actions.querySelector("[data-reader-del]");
    if(eb&&opts.onEdit) eb.addEventListener("click",()=>{close();opts.onEdit(n)});
    if(db&&opts.onDelete) db.addEventListener("click",()=>opts.onDelete(n));

    mainEl=contentEl.querySelector(".news-gallery-main");
    thumbsEl=contentEl.querySelector(".news-gallery-thumbs");
    counterEl=contentEl.querySelector(".gc-cur");
    btnPrev=contentEl.querySelector(".news-gallery-nav.prev");
    btnNext=contentEl.querySelector(".news-gallery-nav.next");

    if(mainEl){
      mainEl.addEventListener("click",e=>{if(!e.target.closest(".news-gallery-nav")) openLb(idx)});
    }
    if(btnPrev) btnPrev.addEventListener("click",e=>{e.stopPropagation();nav(-1)});
    if(btnNext) btnNext.addEventListener("click",e=>{e.stopPropagation();nav(1)});
    if(thumbsEl){
      thumbsEl.addEventListener("click",e=>{
        var t=e.target.closest(".news-gallery-thumb");if(!t) return;
        setIdx(parseInt(t.dataset.i));
      });
    }
    updateNavBtns();

    reader.classList.add("active");
    document.body.style.overflow="hidden";
    reader.scrollTop=0;
    progressBar.style.width="0";
    var hashId=n.id?"#news-"+n.id:"";
    if(hashId) history.replaceState(null,"",location.pathname+hashId);
  }

  function setIdx(i){
    if(!currentImgs.length) return;
    idx=Math.max(0,Math.min(currentImgs.length-1,i));
    var slides=mainEl.querySelectorAll(".news-gallery-slide");
    slides.forEach(s=>s.classList.toggle("active",parseInt(s.dataset.i)===idx));
    if(thumbsEl){
      thumbsEl.querySelectorAll(".news-gallery-thumb").forEach(t=>t.classList.toggle("active",parseInt(t.dataset.i)===idx));
      var active=thumbsEl.querySelector(".news-gallery-thumb.active");
      if(active) active.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"});
    }
    if(counterEl) counterEl.textContent=idx+1;
    updateNavBtns();
  }
  function nav(dir){setIdx(idx+dir)}
  function updateNavBtns(){
    if(btnPrev) btnPrev.disabled=idx<=0;
    if(btnNext) btnNext.disabled=idx>=currentImgs.length-1;
  }

  function close(){
    reader.classList.remove("active");
    document.body.style.overflow="";
    if(location.hash&&location.hash.indexOf("#news-")===0){
      history.replaceState(null,"",location.pathname);
    }
  }

  function openLb(i){
    lbIdx=i;
    renderLb();
    lb.classList.add("active");
  }
  function renderLb(){
    lbImg.src=currentImgs[lbIdx]||"";
    lbCounter.textContent=(lbIdx+1)+" / "+currentImgs.length;
    lbBtnPrev.style.display=currentImgs.length>1?"":"none";
    lbBtnNext.style.display=currentImgs.length>1?"":"none";
    lbCounter.style.display=currentImgs.length>1?"":"none";
  }
  function navLb(dir){
    lbIdx=(lbIdx+dir+currentImgs.length)%currentImgs.length;
    renderLb();
  }
  function closeLb(){lb.classList.remove("active")}

  return {open:open,close:close};
})();
