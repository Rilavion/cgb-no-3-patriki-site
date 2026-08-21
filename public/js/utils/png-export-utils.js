window.CGB_PNG=(function(){
  function parseColorToRgba(str){
    if(!str) return null;
    str=String(str).trim();
    const m1=str.match(/^#([0-9a-f]{3,8})$/i);
    if(m1){
      let h=m1[1];
      if(h.length===3) h=h.split("").map(c=>c+c).join("");
      if(h.length===4) h=h.split("").map(c=>c+c).join("");
      const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
      const a=h.length===8?parseInt(h.slice(6,8),16)/255:1;
      return {r,g,b,a};
    }
    const m2=str.match(/^rgba?\s*\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,\/]+([\d.]+%?))?\s*\)$/i);
    if(m2){
      let a=1;
      if(m2[4]!=null){ a=m2[4].endsWith("%")?parseFloat(m2[4])/100:parseFloat(m2[4]); }
      return {r:parseFloat(m2[1])|0,g:parseFloat(m2[2])|0,b:parseFloat(m2[3])|0,a};
    }
    if(str==="transparent") return {r:0,g:0,b:0,a:0};
    if(str==="currentcolor"||str==="inherit"||str==="initial"||str==="unset") return null;
    const named={black:"#000",white:"#fff",red:"#f00",green:"#080",blue:"#00f",gold:"#22d3ee"};
    if(named[str.toLowerCase()]) return parseColorToRgba(named[str.toLowerCase()]);
    return null;
  }
  function rgbaStr(c){return "rgba("+c.r+","+c.g+","+c.b+","+(Math.round(c.a*1000)/1000)+")"}
  function mixColors(c1,c2,p){
    return {
      r:Math.round(c1.r*p+c2.r*(1-p)),
      g:Math.round(c1.g*p+c2.g*(1-p)),
      b:Math.round(c1.b*p+c2.b*(1-p)),
      a:c1.a*p+c2.a*(1-p)
    };
  }
  function splitTopLevel(s,sep){
    const out=[];let depth=0,buf="";
    for(let i=0;i<s.length;i++){
      const c=s[i];
      if(c==="(") depth++;
      else if(c===")") depth--;
      if(c===sep&&depth===0){out.push(buf);buf="";continue}
      buf+=c;
    }
    if(buf.length) out.push(buf);
    return out;
  }
  function resolveColor(str,el){
    str=str.trim();
    const varMatch=str.match(/^var\(\s*(--[a-z0-9-]+)\s*(?:,\s*(.+))?\)$/i);
    if(varMatch){
      const name=varMatch[1];
      const cs=el?getComputedStyle(el).getPropertyValue(name).trim():"";
      if(cs) return resolveColor(cs,el);
      if(varMatch[2]) return resolveColor(varMatch[2],el);
      return null;
    }
    return parseColorToRgba(str);
  }
  function replaceColorMix(cssStr,el){
    if(!cssStr||typeof cssStr!=="string") return cssStr;
    if(cssStr.indexOf("color-mix")===-1 && cssStr.indexOf("color(")===-1) return cssStr;
    let out=cssStr;
    let guard=0;
    while(out.indexOf("color-mix(")!==-1 && guard<50){
      guard++;
      const start=out.indexOf("color-mix(");
      let depth=0,end=-1;
      for(let i=start;i<out.length;i++){
        if(out[i]==="(") depth++;
        else if(out[i]===")"){depth--;if(depth===0){end=i;break}}
      }
      if(end===-1) break;
      const inner=out.slice(start+"color-mix(".length,end);
      const parts=splitTopLevel(inner,",");
      let fallback="rgba(128,128,128,.5)";
      if(parts.length>=3){
        const cAstr=parts[1].trim();
        const cBstr=parts[2].trim();
        const pctMatch=cAstr.match(/\s+(\d+(?:\.\d+)?)%\s*$/);
        let p=0.5;
        let cAclean=cAstr;
        if(pctMatch){p=parseFloat(pctMatch[1])/100;cAclean=cAstr.slice(0,pctMatch.index).trim()}
        const cA=resolveColor(cAclean,el);
        const cB=resolveColor(cBstr,el);
        if(cA&&cB){fallback=rgbaStr(mixColors(cA,cB,p))}
        else if(cA){fallback=rgbaStr(cA)}
        else if(cB){fallback=rgbaStr(cB)}
      }
      out=out.slice(0,start)+fallback+out.slice(end+1);
    }
    guard=0;
    while(out.indexOf("color(")!==-1 && guard<50){
      guard++;
      const start=out.indexOf("color(");
      let depth=0,end=-1;
      for(let i=start;i<out.length;i++){
        if(out[i]==="(") depth++;
        else if(out[i]===")"){depth--;if(depth===0){end=i;break}}
      }
      if(end===-1) break;
      out=out.slice(0,start)+"rgba(128,128,128,.6)"+out.slice(end+1);
    }
    return out;
  }
  function sanitizeColors(root){
    const props=["color","background","background-color","background-image","border-color","border-top-color","border-right-color","border-bottom-color","border-left-color","box-shadow","text-shadow","outline-color","fill","stroke","filter"];
    const all=[root].concat(Array.from(root.querySelectorAll("*")));
    for(const el of all){
      for(const p of props){
        const cur=el.style&&el.style.getPropertyValue(p);
        if(cur&&(cur.indexOf("color-mix")!==-1||cur.indexOf("color(")!==-1)){
          el.style.setProperty(p,replaceColorMix(cur,el),el.style.getPropertyPriority(p));
        }
      }
      try{
        const cs=getComputedStyle(el);
        for(const p of props){
          const v=cs.getPropertyValue(p);
          if(v&&(v.indexOf("color-mix")!==-1||v.indexOf("color(")!==-1)){
            el.style.setProperty(p,replaceColorMix(v,el),"important");
          }
        }
      }catch(e){}
    }
  }
  function stripZeroSizeBackgrounds(root){
    const all=[root].concat(Array.from(root.querySelectorAll("*")));
    let removed=0;
    for(const el of all){
      if(!el.getBoundingClientRect) continue;
      const r=el.getBoundingClientRect();
      const cs=(function(){try{return getComputedStyle(el)}catch(e){return null}})();
      if(!cs) continue;
      const hasBgImg=cs.backgroundImage&&cs.backgroundImage!=="none";
      const hidden=cs.display==="none"||cs.visibility==="hidden";
      if(hidden){
        el.style.setProperty("background-image","none","important");
        el.style.setProperty("background","none","important");
        continue;
      }
      if(hasBgImg && (r.width<1 || r.height<1)){
        el.style.setProperty("background-image","none","important");
        el.style.setProperty("background","none","important");
        removed++;
      }
      if(cs.backgroundImage && (cs.backgroundImage.indexOf("gradient")!==-1)){
        if(r.width<1||r.height<1){
          el.style.setProperty("background-image","none","important");
          removed++;
        }
      }
    }
    if(removed) console.log("[PNG] stripped zero-size bg from",removed,"els");
  }

  async function toCanvas(node,opts){
    if(!window.html2canvas) throw new Error("html2canvas не подключён");
    opts=opts||{};
    node.querySelectorAll("canvas,iframe").forEach(el=>{
      const r=el.getBoundingClientRect();
      if(!r.width||!r.height) el.remove();
    });
    sanitizeColors(node);
    stripZeroSizeBackgrounds(node);
    return await html2canvas(node,{
      backgroundColor:opts.backgroundColor==="transparent"?null:(opts.backgroundColor||null),
      scale:opts.scale||3,
      useCORS:true,
      allowTaint:true,
      logging:false,
      imageTimeout:15000,
      onclone:function(doc){
        const styleFix=doc.createElement("style");
        styleFix.textContent=`
          .hier-cmd-inner::after,.hier-cmd-inner::before,
          .hier-cmd::after,.hier-cmd::before,
          .hier-member::before,.hier-member::after,
          .hier-officer::before,.hier-officer::after,
          .auto-card::before,.auto-card::after,
          .hier-sub-head::before,.hier-sub-head::after{
            display:none !important;content:none !important;background:none !important;
            -webkit-mask:none !important;mask:none !important;animation:none !important;
            border:none !important;box-shadow:none !important;
          }
          .hier-cmd-inner{
            box-shadow:0 12px 28px rgba(0,0,0,.4) !important;
            border:2px solid #22d3ee !important;
            transform:none !important;
          }
          .hier-cmd-inner:hover{
            transform:none !important;
            box-shadow:0 12px 28px rgba(0,0,0,.4) !important;
          }
          .hier-cmd-photo img,.hier-officer-photo img,.hier-member-photo img{
            filter:none !important;
          }
          .hier-officer,.hier-member{
            box-shadow:0 8px 20px rgba(0,0,0,.35) !important;
            transform:none !important;
          }
          .exp-hier-wrap .hier-staff-grid{
            display:grid !important;
            grid-template-columns:repeat(4,minmax(0,1fr)) !important;
            gap:16px !important;
          }
          *{animation:none !important;transition:none !important;backdrop-filter:none !important}
          *:hover{transform:none !important}
        `;
        doc.head.appendChild(styleFix);
        const cn=doc.getElementById(node.id);
        if(cn){
          cn.querySelectorAll("canvas,iframe").forEach(el=>el.remove());
          cn.querySelectorAll("svg").forEach(el=>{const r=el.getBoundingClientRect();if(!r.width||!r.height) el.remove()});
          sanitizeColors(cn);
          stripZeroSizeBackgrounds(cn);
          if(typeof opts.onclone==="function") opts.onclone(cn,doc);
        }
      },
      ignoreElements:function(el){
        if(el.tagName==="CANVAS"||el.tagName==="IFRAME") return true;
        if(el.id==="bgCanvas") return true;
        if(el.classList&&el.classList.contains("bg-noise")) return true;
        if(el.tagName==="SVG"){
          const r=el.getBoundingClientRect();
          if(!r.width||!r.height) return true;
        }
        try{
          const r=el.getBoundingClientRect();
          if(r.width===0&&r.height===0){
            const cs=getComputedStyle(el);
            if(cs.backgroundImage&&cs.backgroundImage!=="none") return true;
          }
        }catch(e){}
        return false;
      }
    });
  }

  async function download(node,filename,opts){
    const canvas=await toCanvas(node,opts);
    return new Promise(res=>{
      canvas.toBlob(blob=>{
        const url=URL.createObjectURL(blob);
        const a=document.createElement("a");
        a.href=url;a.download=filename||"cgb-"+Date.now()+".png";
        document.body.appendChild(a);a.click();document.body.removeChild(a);
        setTimeout(()=>URL.revokeObjectURL(url),1000);
        res({ok:true});
      },"image/png");
    });
  }
  async function copyToClipboard(node,opts){
    if(!navigator.clipboard||!window.ClipboardItem) return {ok:false,error:"Буфер обмена недоступен"};
    const canvas=await toCanvas(node,opts);
    return new Promise(res=>{
      canvas.toBlob(async blob=>{
        try{
          await navigator.clipboard.write([new ClipboardItem({"image/png":blob})]);
          res({ok:true});
        }catch(e){res({ok:false,error:e.message})}
      },"image/png");
    });
  }

  return {toCanvas,download,copyToClipboard,sanitizeColors,stripZeroSizeBackgrounds};
})();
