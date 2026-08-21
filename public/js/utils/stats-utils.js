window.CGB_STATS=(function(){
  function pad(s,n,align){
    s=String(s==null?"":s);
    if(s.length>=n) return s;
    const pad=" ".repeat(n-s.length);
    return align==="right"?pad+s:s+pad;
  }
  function toClipboard(text){
    if(!text) return Promise.resolve({ok:false,error:"пусто"});
    if(navigator.clipboard&&navigator.clipboard.writeText){
      return navigator.clipboard.writeText(text).then(()=>({ok:true})).catch(e=>({ok:false,error:e.message}));
    }
    try{
      const ta=document.createElement("textarea");
      ta.value=text;ta.style.position="fixed";ta.style.left="-9999px";
      document.body.appendChild(ta);ta.select();
      const ok=document.execCommand("copy");
      document.body.removeChild(ta);
      return Promise.resolve({ok});
    }catch(e){ return Promise.resolve({ok:false,error:e.message}); }
  }
  function ruDT(d){try{return new Date(d).toLocaleString("ru-RU",{timeZone:"Europe/Moscow",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}catch(e){return String(d||"")}}
  function ruDate(d){try{return new Date(d).toLocaleDateString("ru-RU",{timeZone:"Europe/Moscow",day:"2-digit",month:"2-digit",year:"numeric"})}catch(e){return String(d||"")}}
  function nowStamp(){
    const d=new Date();
    return d.toLocaleString("ru-RU",{timeZone:"Europe/Moscow",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
  }
  function pct(a,b){if(!b) return "0%"; return Math.round(a*100/b)+"%";}

  function buildDiscordText(sections){
    const parts=[];
    for(const s of sections){
      if(s.title) parts.push("**"+s.title+"**");
      if(s.subtitle) parts.push("_"+s.subtitle+"_");
      if(Array.isArray(s.rows)){
        const maxK=Math.max(...s.rows.map(r=>String(r[0]||"").length),8);
        const maxV=Math.max(...s.rows.map(r=>String(r[1]||"").length),4);
        const lines=["```"];
        for(const r of s.rows){
          lines.push(pad(r[0],maxK)+"  "+pad(r[1],maxV,"right"));
        }
        lines.push("```");
        parts.push(lines.join("\n"));
      }
      if(s.text) parts.push(s.text);
      parts.push("");
    }
    parts.push("_Сгенерировано: "+nowStamp()+" МСК · ЦГБ №3 ЦГБ №3_");
    return parts.join("\n").trim();
  }

  function buildMarkdown(sections){
    const parts=[];
    for(const s of sections){
      if(s.title) parts.push("## "+s.title);
      if(s.subtitle) parts.push("*"+s.subtitle+"*\n");
      if(Array.isArray(s.rows)){
        parts.push("| Показатель | Значение |");
        parts.push("|---|---:|");
        for(const r of s.rows) parts.push("| "+r[0]+" | "+r[1]+" |");
        parts.push("");
      }
      if(s.text) parts.push(s.text+"\n");
    }
    parts.push("");
    parts.push("---");
    parts.push("*Сгенерировано: "+nowStamp()+" МСК · ЦГБ №3 ЦГБ №3*");
    return parts.join("\n").trim();
  }

  async function withVisibleNode(node, fn){
    if(!node) return await fn(node);
    const prev={
      position:node.style.position, left:node.style.left, top:node.style.top,
      opacity:node.style.opacity, zIndex:node.style.zIndex,
      pointerEvents:node.style.pointerEvents, visibility:node.style.visibility
    };
    node.style.position="fixed";
    node.style.left="0px";
    node.style.top="0px";
    node.style.opacity="0.01";
    node.style.zIndex="-1";
    node.style.pointerEvents="none";
    node.style.visibility="visible";
    await new Promise(r=>setTimeout(r,50));
    try{
      return await fn(node);
    } finally {
      node.style.position=prev.position||"";
      node.style.left=prev.left||"";
      node.style.top=prev.top||"";
      node.style.opacity=prev.opacity||"";
      node.style.zIndex=prev.zIndex||"";
      node.style.pointerEvents=prev.pointerEvents||"";
      node.style.visibility=prev.visibility||"";
    }
  }

  function inlineHTML(sections, title, subtitle){
    const CSS_INLINE=`
      background:#07242e;padding:32px 40px 24px;border:2px solid #22d3ee;border-radius:20px;
      width:1100px;color:#eaf6fa;font-family:Arial,sans-serif;box-sizing:border-box;
    `;
    let html=`<div style="${CSS_INLINE}">`;
    html+=`<div style="height:6px;border-radius:6px;background:linear-gradient(90deg,#06b6d4,#34d399,#22d3ee);margin-bottom:18px"></div>`;
    html+=`<div style="text-align:center;padding-bottom:16px;border-bottom:1px solid rgba(34,211,238,.35);margin-bottom:20px;position:relative">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:14px;background:linear-gradient(135deg,#06b6d4,#10b981);color:#05202b;font-size:26px;font-weight:800;margin-bottom:10px;box-shadow:0 8px 24px rgba(6,182,212,.35)">✚</div>
      <div style="font-family:Georgia,serif;font-size:36px;font-weight:700;color:#a5f3fc;line-height:1.1">${esc(title)}</div>
      ${subtitle?`<div style="color:#a9ccd6;font-size:13px;margin-top:8px">${esc(subtitle)}</div>`:""}
    </div>`;
    for(const s of sections){
      if(s.title && !s.rows && !s.cards) html+=`<div style="color:#22d3ee;font:600 12px Arial;letter-spacing:.2em;text-transform:uppercase;margin:16px 0 10px">${esc(s.title)}</div>`;
      if(Array.isArray(s.cards)){
        html+=`<div style="display:grid;grid-template-columns:repeat(${Math.min(s.cards.length,6)},1fr);gap:12px;margin-bottom:16px">`;
        for(const c of s.cards){
          const col=c[2]==="ok"?"#34d399":c[2]==="err"?"#e97a7a":c[2]==="pend"?"#e6b800":c[2]==="info"?"#38bdf8":"#a5f3fc";
          html+=`<div style="background:#0b3542;border:1px solid rgba(34,211,238,.35);border-radius:8px;padding:14px;text-align:center">
            <div style="color:#8fb6c2;font:600 10px Arial;letter-spacing:.2em;text-transform:uppercase;margin-bottom:6px">${esc(c[0])}</div>
            <div style="color:${col};font-family:Georgia,serif;font-size:32px;font-weight:700;line-height:1">${esc(String(c[1]))}</div>
          </div>`;
        }
        html+=`</div>`;
      }
      if(Array.isArray(s.rows)){
        if(s.title && (s.cards===undefined)) html+=`<div style="color:#22d3ee;font:600 12px Arial;letter-spacing:.2em;text-transform:uppercase;margin:16px 0 10px">${esc(s.title)}</div>`;
        html+=`<div style="background:#0b3542;border:1px solid rgba(34,211,238,.25);border-radius:8px;padding:14px;margin-bottom:12px">
          <table style="width:100%;border-collapse:collapse;font-size:13px">`;
        for(const r of s.rows){
          html+=`<tr>
            <td style="padding:6px 10px;color:#eaf6fa;border-bottom:1px solid rgba(34,211,238,.12)">${esc(r[0])}</td>
            <td style="padding:6px 10px;text-align:right;color:#a5f3fc;font-weight:600;border-bottom:1px solid rgba(34,211,238,.12);font-variant-numeric:tabular-nums">${esc(r[1])}</td>
          </tr>`;
        }
        html+=`</table></div>`;
      }
      if(Array.isArray(s.bars)){
        if(s.title) html+=`<div style="color:#22d3ee;font:600 12px Arial;letter-spacing:.2em;text-transform:uppercase;margin:16px 0 10px">${esc(s.title)}</div>`;
        html+=`<div style="background:#0b3542;border:1px solid rgba(34,211,238,.25);border-radius:8px;padding:14px;margin-bottom:12px">`;
        const max=Math.max(...s.bars.map(b=>b[1]),1);
        for(const b of s.bars){
          const w=Math.max(2,b[1]*100/max);
          html+=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;font-size:13px">
            <div style="min-width:180px;color:#eaf6fa">${esc(b[0])}</div>
            <div style="flex:1;height:16px;background:#05202b;border-radius:4px;overflow:hidden"><div style="height:100%;width:${w}%;background:linear-gradient(90deg,#22d3ee,#a5f3fc)"></div></div>
            <div style="min-width:50px;text-align:right;color:#a5f3fc;font-weight:600;font-size:12px">${b[1]}</div>
          </div>`;
        }
        html+=`</div>`;
      }
    }
    html+=`<div style="margin-top:16px;padding-top:12px;border-top:1px solid rgba(34,211,238,.3);text-align:center;color:#8fb6c2;font-size:11px;letter-spacing:.1em">ЦГБ №3 · Центральная Городская · ${nowStamp()} МСК</div>`;
    html+=`</div>`;
    return html;
  }

  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c])}

  async function renderPngFromSections(sections, title, subtitle, opts){
    if(!window.html2canvas) return {ok:false,error:"html2canvas не подключён"};
    opts=opts||{};
    const wrap=document.createElement("div");
    wrap.style.cssText="position:fixed;left:0;top:0;z-index:-1;opacity:0.01;pointer-events:none";
    wrap.innerHTML=inlineHTML(sections, title, subtitle);
    document.body.appendChild(wrap);
    await new Promise(r=>setTimeout(r,60));
    try{
      const canvas=await window.html2canvas(wrap.firstElementChild,{
        scale:opts.scale||2,
        backgroundColor:"#07242e",
        useCORS:true,
        logging:false,
        imageTimeout:15000,
        ignoreElements:function(el){
          if(el.tagName==="CANVAS"&&el.id==="bgCanvas") return true;
          if(el.classList&&el.classList.contains("bg-noise")) return true;
          return false;
        }
      });
      return {ok:true, canvas};
    }catch(e){
      return {ok:false, error:e.message||String(e)};
    } finally {
      document.body.removeChild(wrap);
    }
  }

  async function copyPNG(_node, filename, scale, sectionsAndTitle){
    if(!navigator.clipboard||!window.ClipboardItem) return {ok:false,error:"буфер обмена недоступен в этом браузере"};
    if(!sectionsAndTitle) return {ok:false,error:"нет данных для PNG (getSections вернул null)"};
    const r=await renderPngFromSections(sectionsAndTitle.sections, sectionsAndTitle.title, sectionsAndTitle.subtitle, {scale});
    if(!r.ok) return r;
    return new Promise(res=>{
      r.canvas.toBlob(async blob=>{
        try{
          await navigator.clipboard.write([new ClipboardItem({"image/png":blob})]);
          res({ok:true});
        }catch(e){ res({ok:false,error:e.message}); }
      },"image/png");
    });
  }
  async function downloadPNG(_node, filename, scale, sectionsAndTitle){
    if(!sectionsAndTitle) return {ok:false,error:"нет данных для PNG"};
    const r=await renderPngFromSections(sectionsAndTitle.sections, sectionsAndTitle.title, sectionsAndTitle.subtitle, {scale});
    if(!r.ok) return r;
    return new Promise(res=>{
      r.canvas.toBlob(blob=>{
        const url=URL.createObjectURL(blob);
        const a=document.createElement("a");
        a.href=url; a.download=filename||"stats.png";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(()=>URL.revokeObjectURL(url),1000);
        res({ok:true});
      },"image/png");
    });
  }

  function bindCopyButtons(cfg){
    const btnText=document.getElementById(cfg.textBtnId);
    const btnMd=document.getElementById(cfg.mdBtnId);
    const btnPng=document.getElementById(cfg.pngBtnId);
    const btnPngDl=cfg.pngDownloadBtnId?document.getElementById(cfg.pngDownloadBtnId):null;
    const msg=cfg.msgId?document.getElementById(cfg.msgId):null;
    function say(t,cls){
      if(cls==="err") console.warn("[CGB_STATS]",t);
      if(!msg) return;
      msg.textContent=t;
      msg.className="stats-copy-msg "+(cls||"");
      const hideAfter=cls==="err"?7000:2500;
      setTimeout(()=>{if(msg.textContent===t){msg.textContent="";msg.className="stats-copy-msg"}},hideAfter);
    }
    if(btnText) btnText.addEventListener("click",async()=>{
      const secs=cfg.getSections();
      const r=await toClipboard(buildDiscordText(secs));
      say(r.ok?"✓ Скопировано для Discord":"✗ Ошибка: "+(r.error||""),r.ok?"ok":"err");
    });
    if(btnMd) btnMd.addEventListener("click",async()=>{
      const secs=cfg.getSections();
      const r=await toClipboard(buildMarkdown(secs));
      say(r.ok?"✓ Скопировано в Markdown":"✗ Ошибка: "+(r.error||""),r.ok?"ok":"err");
    });
    function pngData(){
      if(cfg.getPngData) return cfg.getPngData();
      const secs=cfg.getSections()||[];
      const first=secs[0]||{};
      const isHeaderOnly=first.title && !first.rows && !first.cards && !first.bars;
      const title=first.title||"Статистика";
      const subtitle=first.subtitle||"";
      const rest=isHeaderOnly?secs.slice(1):secs;
      const sections=rest.map(s=>{
        if(s.rows && s.rows.length){
          if(!s.title && s.rows.length<=8){
            return { cards: s.rows.map(r=>[r[0], r[1], ""]) };
          }
        }
        return s;
      });
      return { title, subtitle, sections };
    }
    if(btnPng) btnPng.addEventListener("click",async()=>{
      say("⏳ Готовим PNG…","info");
      const r=await copyPNG(null,cfg.pngFilename,cfg.pngScale,pngData());
      say(r.ok?"✓ PNG в буфере":"✗ "+(r.error||"ошибка"),r.ok?"ok":"err");
    });
    if(btnPngDl) btnPngDl.addEventListener("click",async()=>{
      say("⏳ Готовим PNG…","info");
      const r=await downloadPNG(null,cfg.pngFilename,cfg.pngScale,pngData());
      say(r.ok?"✓ Скачано":"✗ "+(r.error||"ошибка"),r.ok?"ok":"err");
    });
  }

  function parseDate(v){
    if(!v) return null;
    const d=new Date(v);
    return isNaN(d.getTime())?null:d;
  }
  function inRange(dt,from,to){
    if(!dt) return false;
    const d=dt instanceof Date?dt:new Date(dt);
    if(from && d<from) return false;
    if(to){
      const toEnd=new Date(to.getTime()); toEnd.setHours(23,59,59,999);
      if(d>toEnd) return false;
    }
    return true;
  }
  function groupCount(list,keyFn){
    const m={};
    for(const x of list){
      const k=keyFn(x);
      if(k==null||k==="") continue;
      m[k]=(m[k]||0)+1;
    }
    return m;
  }
  function topN(mapObj,n){
    return Object.entries(mapObj).sort((a,b)=>b[1]-a[1]).slice(0,n||10);
  }

  return { toClipboard, buildDiscordText, buildMarkdown, copyPNG, downloadPNG, bindCopyButtons, ruDT, ruDate, nowStamp, pct, pad, parseDate, inRange, groupCount, topN };
})();
