window.CGB_SOUND=(function(){
  let ctx=null;
  let enabled=localStorage.getItem("cgb-sound-enabled")==="1";
  let volume=parseFloat(localStorage.getItem("cgb-sound-volume")||"0.35");
  if(!isFinite(volume)) volume=0.35;

  function ensure(){
    if(!enabled) return null;
    if(!ctx){
      try{ctx=new (window.AudioContext||window.webkitAudioContext)()}catch(e){return null}
    }
    if(ctx&&ctx.state==="suspended") ctx.resume().catch(()=>{});
    return ctx;
  }

  function envGain(t0,dur,peak){
    const g=ctx.createGain();
    g.gain.setValueAtTime(0,t0);
    g.gain.linearRampToValueAtTime(peak*volume,t0+.006);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    return g;
  }

  function tone(freq,dur,type,peak,slide){
    const c=ensure();if(!c) return;
    const t0=c.currentTime;
    const osc=c.createOscillator();
    osc.type=type||"sine";
    osc.frequency.setValueAtTime(freq,t0);
    if(slide) osc.frequency.exponentialRampToValueAtTime(slide,t0+dur);
    const g=envGain(t0,dur,peak||.5);
    osc.connect(g).connect(c.destination);
    osc.start(t0);osc.stop(t0+dur+.05);
  }

  function noise(dur,peak,bp){
    const c=ensure();if(!c) return;
    const t0=c.currentTime;
    const len=Math.max(1,Math.floor(c.sampleRate*dur));
    const buf=c.createBuffer(1,len,c.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len);
    const src=c.createBufferSource();src.buffer=buf;
    const bpf=c.createBiquadFilter();bpf.type="bandpass";bpf.frequency.value=bp||2000;bpf.Q.value=.9;
    const g=envGain(t0,dur,peak||.4);
    src.connect(bpf).connect(g).connect(c.destination);
    src.start(t0);
  }

  const SOUNDS={
    click(){tone(880,.06,"triangle",.28,660)},
    tap(){tone(1200,.04,"sine",.22,900)},
    hover(){tone(1500,.025,"sine",.1)},
    page(){noise(.35,.28,1200);setTimeout(()=>noise(.25,.18,1800),80)},
    stamp(){tone(180,.06,"square",.5,120);setTimeout(()=>noise(.14,.4,600),40)},
    open(){tone(520,.08,"sine",.28,760);setTimeout(()=>tone(760,.1,"sine",.24,980),60)},
    close(){tone(760,.08,"sine",.24,520);setTimeout(()=>tone(520,.1,"sine",.2,380),60)},
    success(){tone(660,.09,"triangle",.28,880);setTimeout(()=>tone(880,.11,"triangle",.28,1100),90)},
    error(){tone(280,.14,"sawtooth",.28,180)},
    notify(){tone(880,.09,"sine",.25,1100);setTimeout(()=>tone(1320,.14,"sine",.22,1100),110)}
  };

  function play(name){
    if(!enabled) return;
    const fn=SOUNDS[name];if(!fn) return;
    try{fn()}catch(e){}
  }

  function setEnabled(v){
    enabled=!!v;
    localStorage.setItem("cgb-sound-enabled",enabled?"1":"0");
    if(enabled) play("tap");
  }
  function setVolume(v){
    volume=Math.max(0,Math.min(1,parseFloat(v)||0));
    localStorage.setItem("cgb-sound-volume",String(volume));
  }
  function isEnabled(){return enabled}
  function getVolume(){return volume}

  document.addEventListener("DOMContentLoaded",()=>{
    document.addEventListener("click",e=>{
      if(!enabled) return;
      const t=e.target;
      if(!t||!t.closest) return;
      if(t.closest("[data-sound='stamp']")){play("stamp");return}
      if(t.closest("[data-sound='page']")){play("page");return}
      if(t.closest(".btn-primary,.hero-cta,.btn-cta")){play("click");return}
      if(t.closest("a.nav-link,.topbar a,.footer a")){play("page");return}
      if(t.closest("button,.btn,a.card,.card,.news-card,.vehicle-card,.doc-item,.ustav-card,.hf-preset,.hf-fx-btn,.hf-icon-btn,.fs-mode")){play("tap");return}
    },true);
    document.addEventListener("submit",()=>play("success"),true);
  });

  return {play,setEnabled,setVolume,isEnabled,getVolume,SOUNDS};
})();
