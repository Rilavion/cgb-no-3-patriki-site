window.CGB_HOLIDAY=(function(){
  const PRESETS={
    none:{label:"Обычная",cls:"",banner:"",color:"#37b3a0",color2:"#8fe0d0",icon:"—",fx:"none"},
    new_year:{label:"Новый год",cls:"holiday-newyear",color:"#f0d060",color2:"#ffffff",icon:"❆",banner:"С НОВЫМ ГОДОМ!",fx:"snow"},
    defender:{label:"23 Февраля",cls:"holiday-defender",color:"#4fb977",color2:"#c8e6a0",icon:"🎖",banner:"23 ФЕВРАЛЯ · ДЕНЬ ЗАЩИТНИКА ОТЕЧЕСТВА",fx:"confetti"},
    march8:{label:"8 Марта",cls:"holiday-march8",color:"#f08fb5",color2:"#ffd3e3",icon:"🌷",banner:"8 МАРТА · МЕЖДУНАРОДНЫЙ ЖЕНСКИЙ ДЕНЬ",fx:"hearts"},
    victory:{label:"9 Мая · День Победы",cls:"holiday-victory",color:"#e04a4a",color2:"#ffb37a",icon:"★",banner:"9 МАЯ · ДЕНЬ ПОБЕДЫ",fx:"sparks"},
    medic_day:{label:"День медработника",cls:"holiday-medic",color:"#37b3a0",color2:"#8fe0d0",icon:"⚕",banner:"ДЕНЬ МЕДИЦИНСКОГО РАБОТНИКА · 3-Е ВОСКРЕСЕНЬЕ ИЮНЯ",fx:"confetti"},
    hospital_day:{label:"День больницы",cls:"holiday-hospital",color:"#4a8ea5",color2:"#a8d5e2",icon:"🏥",banner:"ДЕНЬ РОЖДЕНИЯ ЦГБ №3",fx:"fireworks"},
    custom:{label:"Свой праздник",cls:"holiday-custom",color:"#37b3a0",color2:"#8fe0d0",icon:"✦",banner:"МОЙ ПРАЗДНИК",fx:"sparks"}
  };

  const FX_LABELS={none:"Без эффекта",confetti:"Конфетти",snow:"Снег",rain:"Дождь",sparks:"Искры",leaves:"Листья",hearts:"Сердца",fireworks:"Салют"};

  const DEFAULT_CFG={preset:"none",customBanner:"",showBanner:true,custom:{color:"#37b3a0",color2:"#8fe0d0",icon:"✦",fx:"sparks",label:"Мой праздник"}};

  function readCfg(){
    try{
      const c=JSON.parse(localStorage.getItem("cgb-holiday")||"null");
      if(!c) return JSON.parse(JSON.stringify(DEFAULT_CFG));
      if(!c.custom) c.custom=JSON.parse(JSON.stringify(DEFAULT_CFG.custom));
      return c;
    }catch(e){return JSON.parse(JSON.stringify(DEFAULT_CFG))}
  }
  function writeCfg(cfg){try{localStorage.setItem("cgb-holiday",JSON.stringify(cfg))}catch(e){}}

  async function pullRemote(){
    const auth=window.CGB_AUTH;
    if(!auth||!auth.state||!auth.state.client) return null;
    try{
      const {data,error}=await auth.state.client.from("holiday_state").select("state").eq("id",1).maybeSingle();
      if(error||!data||!data.state) return null;
      const remote=data.state;
      if(!remote.custom) remote.custom=JSON.parse(JSON.stringify(DEFAULT_CFG.custom));
      const cur=readCfg();
      if(JSON.stringify(cur)!==JSON.stringify(remote)){
        writeCfg(remote);
        apply();
        maybeShowWelcome();
        document.dispatchEvent(new CustomEvent("cgb-holiday-updated",{detail:remote}));
      }
      return remote;
    }catch(e){return null}
  }
  async function pushRemote(cfg){
    const auth=window.CGB_AUTH;
    if(!auth||!auth.state||!auth.state.client||!auth.state.user) return false;
    try{
      const user=auth.state.user;
      const meta=user.user_metadata||{};
      const name=meta.display_name||user.email||"—";
      const row={id:1,state:cfg,updated_at:new Date().toISOString(),updated_by:user.id,updated_by_name:name};
      const {error}=await auth.state.client.from("holiday_state").upsert(row);
      if(error && (error.message||"").indexOf("updated_by")>=0){
        const {error:e2}=await auth.state.client.from("holiday_state").upsert({id:1,state:cfg,updated_at:new Date().toISOString()});
        return !e2;
      }
      return !error;
    }catch(e){return false}
  }

  function activePreset(cfg){
    const p=PRESETS[cfg.preset]||PRESETS.none;
    if(cfg.preset==="custom"){
      const c=cfg.custom||DEFAULT_CFG.custom;
      return {...p,color:c.color||p.color,color2:c.color2||p.color2,icon:c.icon||p.icon,fx:c.fx||p.fx,label:c.label||p.label,banner:cfg.customBanner||c.label||p.banner};
    }
    return p;
  }

  let bannerEl=null;
  let welcomeShown=false;
  let fxCanvas=null,fxCtx=null,fxParticles=[],fxRaf=0,fxMode="none",fxColors=["#22d3ee"];

  function apply(){
    const cfg=readCfg();
    const preset=activePreset(cfg);
    document.body.classList.remove(...Object.values(PRESETS).map(p=>p.cls).filter(Boolean));
    if(preset.cls) document.body.classList.add(preset.cls);
    document.body.style.setProperty("--holiday-color",preset.color);
    document.body.style.setProperty("--holiday-color2",preset.color2);
    renderBanner(cfg,preset);
    startFx(cfg.preset==="none"?"none":preset.fx,[preset.color,preset.color2]);
    return cfg;
  }

  function renderBanner(cfg,preset){
    const active=cfg.preset!=="none"&&cfg.showBanner;
    const text=(cfg.customBanner&&cfg.customBanner.trim())||preset.banner;
    if(!active||!text){
      if(bannerEl){bannerEl.remove();bannerEl=null}
      return;
    }
    if(!bannerEl){
      bannerEl=document.createElement("div");
      bannerEl.className="holiday-banner";
      bannerEl.innerHTML='<div class="holiday-banner-inner"><span class="holiday-banner-icon"></span><span class="holiday-banner-text"></span><span class="holiday-banner-icon holiday-banner-icon-r"></span><button class="holiday-banner-close" title="Скрыть до конца сессии">✕</button></div>';
      document.body.appendChild(bannerEl);
      bannerEl.querySelector(".holiday-banner-close").addEventListener("click",()=>{
        sessionStorage.setItem("cgb-holiday-hidden","1");
        bannerEl.classList.remove("visible");
        setTimeout(()=>{if(bannerEl){bannerEl.remove();bannerEl=null}},400);
      });
    }
    bannerEl.querySelectorAll(".holiday-banner-icon").forEach(el=>el.textContent=preset.icon);
    bannerEl.querySelector(".holiday-banner-text").textContent=text;
    bannerEl.style.setProperty("--holiday-color",preset.color);
    bannerEl.style.setProperty("--holiday-color2",preset.color2);
    if(sessionStorage.getItem("cgb-holiday-hidden")!=="1") requestAnimationFrame(()=>bannerEl.classList.add("visible"));
  }

  function ensureCanvas(){
    if(fxCanvas) return;
    fxCanvas=document.createElement("canvas");
    fxCanvas.className="holiday-fx-canvas";
    document.body.appendChild(fxCanvas);
    fxCtx=fxCanvas.getContext("2d");
    resizeCanvas();
    window.addEventListener("resize",resizeCanvas);
  }
  function resizeCanvas(){
    if(!fxCanvas) return;
    const dpr=Math.min(window.devicePixelRatio||1,2);
    fxCanvas.width=window.innerWidth*dpr;
    fxCanvas.height=window.innerHeight*dpr;
    fxCanvas.style.width=window.innerWidth+"px";
    fxCanvas.style.height=window.innerHeight+"px";
    fxCtx.setTransform(dpr,0,0,dpr,0,0);
  }
  function startFx(mode,colors){
    fxMode=mode;fxColors=colors&&colors.length?colors:["#22d3ee"];
    const bgOff=window.CGB_BG&&window.CGB_BG.isEnabled&&!window.CGB_BG.isEnabled();
    if(mode==="none"||!mode||bgOff){
      if(fxCanvas){fxCanvas.remove();fxCanvas=null;fxCtx=null;fxParticles=[]}
      if(fxRaf){cancelAnimationFrame(fxRaf);fxRaf=0}
      return;
    }
    if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches){
      if(fxCanvas){fxCanvas.remove();fxCanvas=null}
      return;
    }
    ensureCanvas();
    fxParticles=[];
    const W=window.innerWidth,H=window.innerHeight;
    const density=Math.min(120,Math.max(40,Math.round(W*H/18000)));
    for(let i=0;i<density;i++) fxParticles.push(spawn(mode,W,H,true));
    if(!fxRaf) loop();
  }
  function spawn(mode,W,H,initial){
    const c=fxColors[Math.floor(Math.random()*fxColors.length)];
    if(mode==="snow"){
      return {x:Math.random()*W,y:initial?Math.random()*H:-10,vx:(Math.random()-.5)*.4,vy:.5+Math.random()*1.2,r:1+Math.random()*3,c,a:.6+Math.random()*.4,rot:0,vr:0,life:1,t:"snow"};
    }
    if(mode==="rain"){
      return {x:Math.random()*W,y:initial?Math.random()*H:-20,vx:-1,vy:8+Math.random()*6,r:1,c,a:.35+Math.random()*.35,rot:0,vr:0,life:1,t:"rain",len:10+Math.random()*14};
    }
    if(mode==="confetti"){
      return {x:Math.random()*W,y:initial?Math.random()*H:-20,vx:(Math.random()-.5)*2,vy:1+Math.random()*2.5,r:3+Math.random()*4,c,a:.85,rot:Math.random()*Math.PI*2,vr:(Math.random()-.5)*.2,life:1,t:"confetti"};
    }
    if(mode==="leaves"){
      return {x:Math.random()*W,y:initial?Math.random()*H:-20,vx:(Math.random()-.5)*1.2,vy:.6+Math.random()*1.4,r:5+Math.random()*5,c,a:.75,rot:Math.random()*Math.PI*2,vr:(Math.random()-.5)*.05,life:1,t:"leaves",phase:Math.random()*Math.PI*2};
    }
    if(mode==="hearts"){
      return {x:Math.random()*W,y:initial?Math.random()*H:H+10,vx:(Math.random()-.5)*.3,vy:-.4-Math.random()*.8,r:6+Math.random()*6,c,a:.7,rot:0,vr:0,life:1,t:"hearts"};
    }
    if(mode==="fireworks"){
      return {x:Math.random()*W,y:Math.random()*H*.6,vx:0,vy:0,r:0,c,a:1,rot:0,vr:0,life:0,t:"fw",burst:false,children:[]};
    }
    return {x:Math.random()*W,y:initial?Math.random()*H:H+10,vx:(Math.random()-.5)*.3,vy:-.4-Math.random()*.9,r:1+Math.random()*2,c,a:.6+Math.random()*.4,rot:0,vr:0,life:1,t:"spark"};
  }
  function drawHeart(ctx,x,y,s,c,a){
    ctx.save();ctx.translate(x,y);ctx.scale(s/16,s/16);ctx.globalAlpha=a;ctx.fillStyle=c;
    ctx.beginPath();
    ctx.moveTo(0,4);
    ctx.bezierCurveTo(0,-4,-10,-4,-10,4);
    ctx.bezierCurveTo(-10,10,0,14,0,18);
    ctx.bezierCurveTo(0,14,10,10,10,4);
    ctx.bezierCurveTo(10,-4,0,-4,0,4);
    ctx.fill();ctx.restore();
  }
  function drawLeaf(ctx,x,y,s,rot,c,a){
    ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.globalAlpha=a;ctx.fillStyle=c;
    ctx.beginPath();ctx.ellipse(0,0,s,s*.5,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="rgba(0,0,0,.25)";ctx.lineWidth=.6;
    ctx.beginPath();ctx.moveTo(-s,0);ctx.lineTo(s,0);ctx.stroke();
    ctx.restore();
  }
  function loop(){
    fxRaf=requestAnimationFrame(loop);
    if(!fxCtx) return;
    const W=window.innerWidth,H=window.innerHeight;
    fxCtx.clearRect(0,0,W,H);
    for(let i=fxParticles.length-1;i>=0;i--){
      const p=fxParticles[i];
      if(p.t==="snow"){
        p.x+=p.vx+Math.sin((p.y+p.r*13)/40)*.3;p.y+=p.vy;
        fxCtx.globalAlpha=p.a;fxCtx.fillStyle=p.c;fxCtx.beginPath();fxCtx.arc(p.x,p.y,p.r,0,Math.PI*2);fxCtx.fill();
        fxCtx.shadowBlur=8;fxCtx.shadowColor=p.c;fxCtx.fill();fxCtx.shadowBlur=0;
      } else if(p.t==="rain"){
        p.x+=p.vx;p.y+=p.vy;
        fxCtx.globalAlpha=p.a;fxCtx.strokeStyle=p.c;fxCtx.lineWidth=1.2;
        fxCtx.beginPath();fxCtx.moveTo(p.x,p.y);fxCtx.lineTo(p.x-p.vx*p.len/8,p.y-p.len);fxCtx.stroke();
      } else if(p.t==="confetti"){
        p.x+=p.vx;p.y+=p.vy;p.rot+=p.vr;p.vy+=.01;
        fxCtx.save();fxCtx.translate(p.x,p.y);fxCtx.rotate(p.rot);fxCtx.globalAlpha=p.a;fxCtx.fillStyle=p.c;
        fxCtx.fillRect(-p.r,-p.r*.4,p.r*2,p.r*.8);fxCtx.restore();
      } else if(p.t==="leaves"){
        p.phase+=.03;p.x+=p.vx+Math.sin(p.phase)*.6;p.y+=p.vy;p.rot+=p.vr;
        drawLeaf(fxCtx,p.x,p.y,p.r,p.rot,p.c,p.a);
      } else if(p.t==="hearts"){
        p.x+=p.vx+Math.sin(p.y/30)*.3;p.y+=p.vy;
        drawHeart(fxCtx,p.x,p.y,p.r,p.c,p.a);
      } else if(p.t==="spark"){
        p.x+=p.vx;p.y+=p.vy;p.a-=.004;
        fxCtx.globalAlpha=Math.max(0,p.a);fxCtx.fillStyle=p.c;
        fxCtx.shadowBlur=10;fxCtx.shadowColor=p.c;
        fxCtx.beginPath();fxCtx.arc(p.x,p.y,p.r,0,Math.PI*2);fxCtx.fill();fxCtx.shadowBlur=0;
      } else if(p.t==="fw"){
        if(!p.burst){
          p.burst=true;
          const n=24+Math.floor(Math.random()*18);
          for(let k=0;k<n;k++){
            const ang=Math.PI*2*k/n,sp=1.2+Math.random()*2.4;
            p.children.push({x:p.x,y:p.y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,c:p.c,a:1,r:1.6+Math.random()*1.4});
          }
        }
        let alive=false;
        for(const ch of p.children){
          ch.x+=ch.vx;ch.y+=ch.vy;ch.vy+=.03;ch.a-=.012;
          if(ch.a>0){
            alive=true;
            fxCtx.globalAlpha=ch.a;fxCtx.fillStyle=ch.c;fxCtx.shadowBlur=12;fxCtx.shadowColor=ch.c;
            fxCtx.beginPath();fxCtx.arc(ch.x,ch.y,ch.r,0,Math.PI*2);fxCtx.fill();fxCtx.shadowBlur=0;
          }
        }
        if(!alive) fxParticles.splice(i,1);
        continue;
      }
      const off=(p.t==="hearts"?p.y<-20:p.y>H+30)||p.x<-40||p.x>W+40||p.a<=0;
      if(off){
        fxParticles.splice(i,1);
        fxParticles.push(spawn(fxMode,W,H,false));
      }
    }
    fxCtx.globalAlpha=1;
    if(fxMode==="fireworks"&&Math.random()<.03){
      fxParticles.push(spawn("fireworks",W,H,false));
    }
  }

  function maybeShowWelcome(){
    if(welcomeShown) return;
    welcomeShown=true;
    const cfg=readCfg();
    if(cfg.preset==="none") return;
    const preset=activePreset(cfg);if(!preset) return;
    const key="cgb-holiday-welcome-"+cfg.preset+"-"+(new Date().toISOString().slice(0,10));
    if(sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key,"1");
    const text=(cfg.customBanner&&cfg.customBanner.trim())||preset.banner;
    if(!text) return;
    const overlay=document.createElement("div");
    overlay.className="holiday-welcome";
    overlay.innerHTML=`<div class="holiday-welcome-card">
      <div class="holiday-welcome-icon">${preset.icon}</div>
      <div class="holiday-welcome-label">Сегодня</div>
      <div class="holiday-welcome-text"></div>
      <button class="holiday-welcome-btn">Продолжить</button>
    </div>`;
    overlay.style.setProperty("--holiday-color",preset.color);
    overlay.style.setProperty("--holiday-color2",preset.color2);
    overlay.querySelector(".holiday-welcome-text").textContent=text;
    document.body.appendChild(overlay);
    requestAnimationFrame(()=>overlay.classList.add("visible"));
    const close=()=>{overlay.classList.remove("visible");setTimeout(()=>overlay.remove(),500)};
    overlay.querySelector(".holiday-welcome-btn").addEventListener("click",close);
    overlay.addEventListener("click",e=>{if(e.target===overlay) close()});
    setTimeout(close,7000);
  }

  function setPreset(id){
    const cfg=readCfg();cfg.preset=id;
    sessionStorage.removeItem("cgb-holiday-hidden");
    Object.keys(sessionStorage).forEach(k=>{if(k.indexOf("cgb-holiday-welcome-")===0) sessionStorage.removeItem(k)});
    writeCfg(cfg);apply();pushRemote(cfg);
  }
  function setBanner(text){
    const cfg=readCfg();cfg.customBanner=text||"";
    sessionStorage.removeItem("cgb-holiday-hidden");
    writeCfg(cfg);apply();pushRemote(cfg);
  }
  function toggleBanner(v){
    const cfg=readCfg();cfg.showBanner=!!v;
    sessionStorage.removeItem("cgb-holiday-hidden");
    writeCfg(cfg);apply();pushRemote(cfg);
  }
  function setCustom(patch){
    const cfg=readCfg();
    cfg.custom={...DEFAULT_CFG.custom,...(cfg.custom||{}),...(patch||{})};
    writeCfg(cfg);apply();pushRemote(cfg);
  }

  return {PRESETS,FX_LABELS,readCfg,writeCfg,apply,setPreset,setBanner,toggleBanner,setCustom,maybeShowWelcome,activePreset,pullRemote,pushRemote};
})();

document.addEventListener("DOMContentLoaded",function(){
  window.CGB_HOLIDAY.apply();
  setTimeout(()=>window.CGB_HOLIDAY.maybeShowWelcome(),600);
  function tryPull(){
    if(window.CGB_AUTH&&window.CGB_AUTH.state&&window.CGB_AUTH.state.client){
      window.CGB_HOLIDAY.pullRemote();
    }
  }
  if(window.CGB_AUTH&&window.CGB_AUTH.onChange) window.CGB_AUTH.onChange(tryPull);
  setTimeout(tryPull,300);
  setInterval(()=>{if(!document.hidden) tryPull()},15*60000);
});
