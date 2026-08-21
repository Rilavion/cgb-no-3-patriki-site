window.CGB_SETTINGS_PANEL=(function(){
  let panel=null;

  function build(){
    if(panel) return panel;
    panel=document.createElement("div");
    panel.className="cgb-sp-back";
    panel.innerHTML=`<div class="cgb-sp">
      <div class="cgb-sp-head">
        <div class="cgb-sp-title"><svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 15.6 12 3.6 3.6 0 0 1 12 15.6z"/></svg>Панель сайта</div>
        <button class="cgb-sp-close" title="Закрыть">✕</button>
      </div>
      <div class="cgb-sp-body">

        <div class="cgb-sp-section">
          <div class="cgb-sp-section-title">Разделы сайта</div>
          <div class="cgb-sp-links">
            <a href="index.html">Главная</a>
            <a href="ustav.html">Уставы</a>
            <a href="learn.html">Обучение</a>
            <a href="composition.html">Состав</a>
            <a href="news.html">Новости</a>
            <a href="autopark.html">Автопарк</a>
            <a href="map.html">Карта</a>
            <a href="faq.html">FAQ</a>
            <a href="lk.html">Личный кабинет</a>
            <a href="docs.html" data-admin>Документы</a>
          </div>
        </div>

        <div class="cgb-sp-section">
          <div class="cgb-sp-section-title">Оформление</div>
          <div class="cgb-sp-row">
            <span class="cgb-sp-lbl"><svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M13 3l-1.5 6H15l-3.5 12v-8H9l1.5-10H13z"/></svg>Анимации фона</span>
            <label class="fs-switch"><input type="checkbox" id="spAnim"><span class="fs-switch-track"><span class="fs-switch-thumb"></span></span></label>
          </div>
          <div class="cgb-sp-bg-modes" id="spBgModes">
            <button class="cgb-sp-bg-btn" data-bg="grid">Сеть</button>
            <button class="cgb-sp-bg-btn" data-bg="stars">Звёзды</button>
            <button class="cgb-sp-bg-btn" data-bg="radar">Радар</button>
          </div>
        </div>

        <div class="cgb-sp-section">
          <div class="cgb-sp-section-title">Звук</div>
          <div class="cgb-sp-row">
            <span class="cgb-sp-lbl"><svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4z"/></svg>Звуки интерфейса</span>
            <label class="fs-switch"><input type="checkbox" id="spSound"><span class="fs-switch-track"><span class="fs-switch-thumb"></span></span></label>
          </div>
          <div class="cgb-sp-vol"><span>тише</span><input type="range" id="spSoundVol" min="0" max="1" step="0.05"><span id="spSoundVolVal">35%</span></div>
        </div>

        <div class="cgb-sp-section">
          <div class="cgb-sp-section-title">О сайте</div>
          <div class="cgb-sp-info">
            <div>ЦГБ №3 · Центральная Городская</div>
            <div>Министерство Здравоохранения</div>
            <div class="cgb-sp-copy">© <span id="spYear"></span> · Все права защищены</div>
          </div>
        </div>

      </div>
    </div>`;
    document.body.appendChild(panel);
    panel.querySelector(".cgb-sp-close").addEventListener("click",close);
    panel.addEventListener("click",e=>{if(e.target===panel) close()});
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&panel.classList.contains("visible")) close()});

    const y=panel.querySelector("#spYear");if(y) y.textContent=new Date().getFullYear();

    const anim=panel.querySelector("#spAnim");
    const bgBtns=panel.querySelectorAll("#spBgModes .cgb-sp-bg-btn");
    function syncBg(){
      if(!window.CGB_BG) return;
      anim.checked=window.CGB_BG.isEnabled();
      const cur=window.CGB_BG.getMode();
      bgBtns.forEach(b=>{b.classList.toggle("active",b.dataset.bg===cur);b.disabled=!window.CGB_BG.isEnabled()});
    }
    anim.addEventListener("change",()=>{if(window.CGB_BG){window.CGB_BG.setEnabled(anim.checked);syncBg()}});
    bgBtns.forEach(b=>b.addEventListener("click",()=>{if(window.CGB_BG&&window.CGB_BG.isEnabled()){window.CGB_BG.setMode(b.dataset.bg);syncBg()}}));
    if(window.CGB_BG) syncBg();else document.addEventListener("cgb-bg-ready",syncBg);

    const s=panel.querySelector("#spSound");
    const v=panel.querySelector("#spSoundVol");
    const vv=panel.querySelector("#spSoundVolVal");
    function syncSnd(){
      if(!window.CGB_SOUND) return;
      s.checked=window.CGB_SOUND.isEnabled();
      v.value=window.CGB_SOUND.getVolume();
      vv.textContent=Math.round(window.CGB_SOUND.getVolume()*100)+"%";
    }
    s.addEventListener("change",()=>{if(window.CGB_SOUND) window.CGB_SOUND.setEnabled(s.checked)});
    v.addEventListener("input",()=>{if(window.CGB_SOUND){window.CGB_SOUND.setVolume(v.value);vv.textContent=Math.round(v.value*100)+"%"}});
    syncSnd();

    return panel;
  }

  function open(){const p=build();requestAnimationFrame(()=>p.classList.add("visible"))}
  function close(){if(panel){panel.classList.remove("visible")}}

  document.addEventListener("click",e=>{
    const t=e.target.closest("[data-open-settings]");
    if(t){e.preventDefault();open()}
  });

  return {open,close};
})();
