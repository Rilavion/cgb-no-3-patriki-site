(function(){
  const root=document.documentElement;
  const saved=localStorage.getItem("cgb-theme");
  if(saved==="light") root.setAttribute("data-theme","light");

  function navPage(value){
    const page=String(value||"").toLowerCase().split("/").pop().split(/[?#]/)[0].replace(/\.html?$/,"");
    const aliases={team:"composition"};
    return aliases[page]||page||"index";
  }

  document.addEventListener("DOMContentLoaded",init);

  function init(){
    // каждый блок независим: сбой одного не ломает остальные (в т.ч. поиск)
    [setupThemeToggle,setupBurger,setupReveal,setupBackground,setupSiteSettings,setupRoleWorklog,
     setupTransitions,setupActiveNav,setupFab,setupSearch].forEach(fn=>{
      try{fn()}catch(e){console.warn("[main] init step failed:",e&&e.message)}
    });
  }

  /* Постоянный журнал событий роли. Сам решает, показываться ли после авторизации. */
  function setupRoleWorklog(){
    if(document.getElementById("cgbRoleWorklogScript")||window.CGB_WORKLOG) return;
    const script=document.createElement("script");
    script.id="cgbRoleWorklogScript";
    script.src="assets/js/ui/audit-feed.js?v=2";
    document.head.appendChild(script);
  }

  function applyTheme(next){
    if(next==="light") root.setAttribute("data-theme","light");
    else root.removeAttribute("data-theme");
    localStorage.setItem("cgb-theme",next);
  }
  window.CGB_THEME={apply:applyTheme,get:()=>root.getAttribute("data-theme")==="light"?"light":"dark"};

  function setupThemeToggle(){
    let btn=document.getElementById("themeToggle");
    if(!btn){
      // Автосоздание кнопки темы на страницах, где её нет в разметке
      const host=document.querySelector(".header-actions");
      if(host){
        btn=document.createElement("button");
        btn.className="icon-btn theme-toggle";
        btn.id="themeToggle";
        btn.setAttribute("aria-label","Сменить тему");
        btn.setAttribute("title","Сменить тему");
        btn.innerHTML='<svg class="moon" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'+
          '<svg class="sun" viewBox="0 0 24 24"><path d="M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66l1.42-1.42M4.92 19.08l1.42-1.42m0-11.32L4.92 4.92m14.16 14.16l-1.42-1.42M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
        const burger=document.getElementById("burger");
        host.insertBefore(btn,burger||null);
      }
    }
    if(!btn) return;
    btn.addEventListener("click",()=>{
      const cur=root.getAttribute("data-theme")==="light"?"light":"dark";
      applyTheme(cur==="light"?"dark":"light");
      document.dispatchEvent(new CustomEvent("cgb-theme-change"));
    });
  }

  /* ===== Глобальная панель «Настройки сайта» (доступна на каждой странице) ===== */
  function setupSiteSettings(){
    // Создаём плавающую кнопку и панель настроек
    if(document.getElementById("siteSetBtn")) return;
    const btn=document.createElement("button");
    btn.id="siteSetBtn";btn.className="site-set-btn";
    btn.setAttribute("aria-label","Настройки сайта");
    btn.title="Настройки сайта";
    btn.innerHTML='<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>';
    document.body.appendChild(btn);

    const panel=document.createElement("div");
    panel.id="siteSetPanel";panel.className="site-set-panel";
    panel.innerHTML=
      '<div class="ssp-head">Настройки сайта</div>'+
      '<div class="ssp-row"><span class="ssp-label">Тема</span>'+
        '<div class="ssp-seg" id="sspTheme">'+
          '<button data-theme-val="dark">Тёмная</button>'+
          '<button data-theme-val="light">Светлая</button>'+
        '</div>'+
      '</div>'+
      '<div class="ssp-row"><span class="ssp-label">Анимации фона</span>'+
        '<label class="ssp-switch"><input type="checkbox" id="sspAnim" checked><span class="ssp-switch-track"><span class="ssp-switch-thumb"></span></span></label>'+
      '</div>'+
      '<div class="ssp-row ssp-row-col"><span class="ssp-label">Фон</span>'+
        '<div class="ssp-modes" id="sspModes">'+
          '<button data-bg="falling">Атмосфера</button>'+
          '<button data-bg="grid">Сеть</button>'+
          '<button data-bg="dots">Точки</button>'+
          '<button data-bg="waves">Волны</button>'+
          '<button data-bg="stars">Звёзды</button>'+
          '<button data-bg="radar">Радар</button>'+
        '</div>'+
      '</div>'+
      '<div class="ssp-note">Сохраняется в браузере</div>';
    document.body.appendChild(panel);

    const close=()=>{panel.classList.remove("open");btn.classList.remove("active")};
    btn.addEventListener("click",e=>{
      e.stopPropagation();
      const willOpen=!panel.classList.contains("open");
      close();
      if(willOpen){sync();panel.classList.add("open");btn.classList.add("active")}
    });
    panel.addEventListener("click",e=>e.stopPropagation());
    document.addEventListener("click",close);
    document.addEventListener("keydown",e=>{if(e.key==="Escape") close()});

    const themeSeg=panel.querySelector("#sspTheme");
    themeSeg.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{
      applyTheme(b.dataset.themeVal);
      document.dispatchEvent(new CustomEvent("cgb-theme-change"));
      sync();
    }));
    const animChk=panel.querySelector("#sspAnim");
    animChk.addEventListener("change",()=>{
      if(window.CGB_BG) window.CGB_BG.setEnabled(animChk.checked);
      const fsAnim=document.getElementById("fsAnim");if(fsAnim) fsAnim.checked=animChk.checked;
      sync();
    });
    const modesBox=panel.querySelector("#sspModes");
    modesBox.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{
      if(window.CGB_BG) window.CGB_BG.setMode(b.dataset.bg);
      sync();
    }));

    function sync(){
      const theme=root.getAttribute("data-theme")==="light"?"light":"dark";
      themeSeg.querySelectorAll("button").forEach(b=>b.classList.toggle("active",b.dataset.themeVal===theme));
      const themeBtnIcon=document.getElementById("themeToggle");
      if(window.CGB_BG){
        animChk.checked=window.CGB_BG.isEnabled();
        const m=window.CGB_BG.getMode();
        modesBox.querySelectorAll("button").forEach(b=>b.classList.toggle("active",b.dataset.bg===m));
        modesBox.querySelectorAll("button").forEach(b=>b.disabled=!animChk.checked);
      }
    }
    document.addEventListener("cgb-theme-change",sync);
  }

  function setupBurger(){
    const b=document.getElementById("burger");
    const nav=document.getElementById("mainNav");
    if(!b||!nav) return;
    if(nav.parentElement!==document.body) document.body.appendChild(nav);

    if(!nav.querySelector(".nav-header")){
      const links=Array.from(nav.querySelectorAll("a"));
      if(!links.some(a=>(a.dataset.page||"").toLowerCase()==="telegram-settings.html")){
        const tg=document.createElement("a");
        tg.href="telegram-settings.html";
        tg.setAttribute("data-page","telegram-settings.html");
        tg.setAttribute("data-transition","");
        tg.setAttribute("data-perm","telegram:settings");
        tg.textContent="Telegram-уведомления";
        links.push(tg);
      }
      const currentPage=navPage(location.pathname);
      links.forEach(a=>{
        if(!a.dataset.page && a.getAttribute("href")) a.setAttribute("data-page",a.getAttribute("href").toLowerCase());
        const isCurrent=navPage(a.dataset.page)===currentPage;
        a.classList.toggle("active",isCurrent);
        if(isCurrent) a.setAttribute("aria-current","page");
        else a.removeAttribute("aria-current");
      });

      const PAGE_PERM={
        "apps.html":"apps:view",
        "vp.html":"vp:view",
        "supply.html":"supply:view",
        "supply-stats.html":"supply:stats",
        "apps-stats.html":"apps:view",
        "requests-review.html":"requests:review,requests:view",
        "requests-stats.html":"requests:review,requests:view",
        "requests-settings.html":"requests:settings",
        "supply-admin.html":"supply:admin",
        "docs.html":"docs:view",
        "complaints-review.html":"complaints:review,complaints:view",
        "complaints-stats.html":"complaints:review,complaints:view",
        "complaints-form.html":"complaints:form_edit,complaints:settings",
        "complaints-settings.html":"complaints:settings",
        "payroll.html":"payroll:view",
        "restoration.html":"requests:review,requests:view,complaints:review",
                "report-settings.html":"report:settings",
        "vp-request.html":"vp_request:submit",
        "vp-request-settings.html":"vp_request:settings",
        "telegram-settings.html":"telegram:settings"
      };
      links.forEach(a=>{
        const page=(a.dataset.page||"").toLowerCase();
        if(PAGE_PERM[page] && !a.hasAttribute("data-perm")) a.setAttribute("data-perm",PAGE_PERM[page]);
        a.removeAttribute("data-admin");
        a.removeAttribute("data-staff");
      });

      const publicPages=["index.html","info.html","services.html","meds.html","ustav.html","learn.html","composition.html","news.html","autopark.html","map.html","faq.html","complaints.html","appointment.html"];
      const loggedInPages=["tests.html","leave.html","vacation-ic.html","vacation-ooc.html","dismissal.html","promotion.html","restoration.html","report.html","vp-request.html"];
      const staffPages=["apps.html","apps-stats.html","vp.html","complaints-review.html","complaints-stats.html","requests-review.html","requests-stats.html","requests-settings.html","payroll.html","supply.html","supply-stats.html","docs.html","lk.html","report-settings.html","vp-request-settings.html","telegram-settings.html"];
      const alwaysVisibleForLogged=["lk.html"];


      const publicLinks=links.filter(a=>publicPages.includes((a.dataset.page||"").toLowerCase()));
      const loggedInLinks=links.filter(a=>loggedInPages.includes((a.dataset.page||"").toLowerCase()));
      const staffLinks=links.filter(a=>staffPages.includes((a.dataset.page||"").toLowerCase()));
      loggedInLinks.forEach(a=>a.setAttribute("data-loggedin",""));
      staffLinks.forEach(a=>{
        if(alwaysVisibleForLogged.includes((a.dataset.page||"").toLowerCase())){
          a.setAttribute("data-loggedin","");
          a.removeAttribute("data-perm");
        }
      });

      nav.innerHTML="";
      const header=document.createElement("div");
      header.className="nav-header";
      header.innerHTML=`<div class="nav-header-emblem"><img src="assets/images/brand/logo.png" alt=""></div>
        <div class="nav-header-label">ЦГБ №3</div>
        <div class="nav-header-unit">ЦГБ №3</div>`;
      nav.appendChild(header);

      const scroll=document.createElement("div");
      scroll.className="nav-scroll";

      const sec1=document.createElement("div");
      sec1.className="nav-section";
      sec1.innerHTML='<div class="nav-section-title">Разделы</div>';
      const g1=document.createElement("div");
      g1.className="nav-links";
      publicLinks.forEach(a=>g1.appendChild(a));
      sec1.appendChild(g1);
      scroll.appendChild(sec1);

      if(loggedInLinks.length){
        const secL=document.createElement("div");
        secL.className="nav-section";
        secL.setAttribute("data-loggedin","");
        secL.innerHTML='<div class="nav-section-title">Мои заявки</div>';
        const gL=document.createElement("div");
        gL.className="nav-links";
        loggedInLinks.forEach(a=>gL.appendChild(a));
        secL.appendChild(gL);
        scroll.appendChild(secL);
      }
      if(staffLinks.length){
        const sec2=document.createElement("div");
        sec2.className="nav-section";
        sec2.setAttribute("data-loggedin","");
        sec2.innerHTML='<div class="nav-section-title">Служебное</div>';
        const g2=document.createElement("div");
        g2.className="nav-links";
        staffLinks.forEach(a=>g2.appendChild(a));
        sec2.appendChild(g2);
        scroll.appendChild(sec2);
      }

      nav.appendChild(scroll);

      const footer=document.createElement("div");
      footer.className="nav-footer";
      footer.innerHTML='<div class="nav-footer-motto">Забота · Профессионализм · Жизнь</div><div class="nav-footer-sub">Работаем 24/7</div>';
      nav.appendChild(footer);

      if(window.CGB_ROLES&&window.CGB_ROLES.applyPermGates) window.CGB_ROLES.applyPermGates();
    }

    let backdrop=document.querySelector(".nav-backdrop");
    if(!backdrop){
      backdrop=document.createElement("div");
      backdrop.className="nav-backdrop";
      document.body.appendChild(backdrop);
    }
    function open(){b.classList.add("open");nav.classList.add("open");backdrop.classList.add("visible");document.body.style.overflow="hidden"}
    function close(){b.classList.remove("open");nav.classList.remove("open");backdrop.classList.remove("visible");document.body.style.overflow=""}
    b.addEventListener("click",()=>{
      if(nav.classList.contains("open")) close();else open();
    });
    backdrop.addEventListener("click",close);
    document.addEventListener("keydown",e=>{if(e.key==="Escape") close()});
    nav.querySelectorAll("a").forEach(a=>{
      a.addEventListener("click",close);
    });
  }

  function setupReveal(){
    const io=new IntersectionObserver(entries=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          e.target.classList.add("visible");
          io.unobserve(e.target);
        }
      });
    },{threshold:.12,rootMargin:"0px 0px -60px 0px"});
    document.querySelectorAll(".reveal,.reveal-l,.reveal-r").forEach(el=>io.observe(el));
  }

  function setupTransitions(){
    const ov=document.getElementById("overlay");
    if(!ov) return;
    document.querySelectorAll("a[data-transition]").forEach(a=>{
      a.addEventListener("click",e=>{
        const href=a.getAttribute("href");
        if(!href||href.startsWith("#")||href.startsWith("http")) return;
        e.preventDefault();
        ov.classList.add("active");
        setTimeout(()=>{location.href=href},380);
      });
    });
    window.addEventListener("pageshow",()=>ov.classList.remove("active"));
  }

  function setupActiveNav(){
    const p=navPage(location.pathname);
    document.querySelectorAll(".nav a[data-page]").forEach(a=>{
      const isCurrent=navPage(a.dataset.page)===p;
      a.classList.toggle("active",isCurrent);
      if(isCurrent) a.setAttribute("aria-current","page");
      else a.removeAttribute("aria-current");
    });
    hideAdminNav();
    if(window.CGB_AUTH) window.CGB_AUTH.onChange(hideAdminNav);
    if(window.CGB_ROLES) window.CGB_ROLES.onChange(hideAdminNav);
  }

  function hideAdminNav(){
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    if(!s||!s.ready) return;
    document.body.classList.add("auth-ready");
    const isAdmin=!!(window.CGB_ROLES&&window.CGB_ROLES.isAdmin());
    document.body.classList.toggle("is-admin",isAdmin);
  }

  function setupFab(){
    const stack=document.getElementById("fabStack");
    if(!stack) return;
    const upBtn=document.getElementById("fabUp");
    const printBtn=document.getElementById("fabPrint");
    if(upBtn){
      upBtn.addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
    }
    if(printBtn){
      printBtn.addEventListener("click",()=>window.print());
    }
    const upd=()=>{
      if(window.scrollY>500) stack.classList.add("visible");
      else stack.classList.remove("visible");
    };
    window.addEventListener("scroll",upd,{passive:true});
    upd();
  }

  function setupSearch(){
    // Если на странице нет разметки окна поиска — создаём её сами,
    // чтобы поиск работал на КАЖДОЙ странице, а не только там, где модалка вставлена вручную.
    let modal=document.getElementById("searchModal");
    if(!modal){
      modal=document.createElement("div");
      modal.className="search-modal";
      modal.id="searchModal";
      modal.innerHTML='<div class="search-box">'+
        '<div class="search-input-wrap">'+
          '<svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 5 1.49-1.49-5-5zM9.5 14A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"/></svg>'+
          '<input class="search-input" placeholder="Поиск по сайту..." spellcheck="false">'+
          '<button class="search-close-kbd">Esc</button>'+
        '</div>'+
        '<div class="search-results"></div>'+
      '</div>';
      document.body.appendChild(modal);
    }
    const input=modal.querySelector(".search-input");
    const results=modal.querySelector(".search-results");
    // Если в шапке страницы нет кнопки поиска — добавляем её сами
    let openers=document.querySelectorAll("[data-open-search]");
    if(!openers.length){
      const host=document.querySelector(".header-actions");
      if(host){
        const b=document.createElement("button");
        b.className="search-btn";
        b.setAttribute("data-open-search","");
        b.title="Поиск (Ctrl+K)";
        b.innerHTML='<svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 5 1.49-1.49-5-5zM9.5 14A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"/></svg><span>Поиск</span>';
        const burger=document.getElementById("burger");
        host.insertBefore(b,burger||null);
      }
      openers=document.querySelectorAll("[data-open-search]");
    }
    const closer=modal.querySelector(".search-close-kbd");

    // Стартовый набор — список страниц. Полный индекс (новости, устав,
    // сотрудники, услуги, медикаменты...) подгрузит search-engine.js.
    let DATASET=(window.CGB_SEARCH&&window.CGB_SEARCH.STATIC)?window.CGB_SEARCH.STATIC.slice():[
      {group:"Страницы",title:"Главная",hint:"Общая информация о больнице",href:"index.html",kw:"главная home стартовая"},
      {group:"Страницы",title:"Услуги",hint:"Платные медицинские услуги и цены",href:"services.html",kw:"услуги прайс цены запись платно"},
      {group:"Страницы",title:"Медикаменты",hint:"Справочник препаратов",href:"meds.html",kw:"медикаменты лекарства препараты таблетки"},
      {group:"Страницы",title:"Устав",hint:"Единый устав больницы",href:"ustav.html",kw:"устав правила регламент"},
      {group:"Страницы",title:"Новости",hint:"Оперативная сводка",href:"news.html",kw:"новости"},
      {group:"Страницы",title:"Автопарк",hint:"Фотогалерея транспорта",href:"autopark.html",kw:"автопарк техника фото"},
      {group:"Страницы",title:"Карта",hint:"Схема территории",href:"map.html",kw:"карта"},
      {group:"Страницы",title:"FAQ",hint:"Частые вопросы",href:"faq.html",kw:"faq вопросы"}
    ];

    if(window.CGB_SEARCH){
      window.CGB_SEARCH.build().then(d=>{DATASET=d;if(modal.classList.contains("active")) render(input.value)}).catch(()=>{});
      // вход/выход или смена ролей — пересобрать выдачу (закрытые разделы могли открыться/скрыться)
      const hookAuth=()=>{
        if(window.CGB_AUTH&&window.CGB_AUTH.onChange){window.CGB_AUTH.onChange(()=>{if(modal.classList.contains("active")) render(input.value)});return true}
        return false;
      };
      const hookRoles=()=>{
        if(window.CGB_ROLES&&window.CGB_ROLES.onChange){window.CGB_ROLES.onChange(()=>{if(modal.classList.contains("active")) render(input.value)});return true}
        return false;
      };
      let hookedA=hookAuth(),hookedR=hookRoles(),hookTries=0;
        const hookTimer=setInterval(()=>{
          if(!hookedA) hookedA=hookAuth();
          if(!hookedR) hookedR=hookRoles();
          if((hookedA&&hookedR)||++hookTries>40) clearInterval(hookTimer);
        },250);
    }

    const iconFor=g=>({
      "Страницы":`<svg viewBox="0 0 24 24"><path d="M3 3h18v18H3zm2 4v12h14V7z"/></svg>`,
      "Устав":`<svg viewBox="0 0 24 24"><path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-1 15H7v-2h10zm0-4H7v-2h10zm0-4H7V7h10z"/></svg>`,
      "Разделы устава":`<svg viewBox="0 0 24 24"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>`,
      "Статьи устава":`<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm4 18V9h-5V4H6v16zM8 12h8v2H8zm0 4h8v2H8z"/></svg>`,
      "Новости":`<svg viewBox="0 0 24 24"><path d="M20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM8 17H5v-2h3zm0-4H5v-2h3zm0-4H5V7h3zm5 8h-3v-2h3zm0-4h-3v-2h3zm0-4h-3V7h3zm6 8h-4v-2h4zm0-4h-4v-2h4zm0-4h-4V7h4z"/></svg>`,
      "Автопарк":`<svg viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`,
      "Обучение":`<svg viewBox="0 0 24 24"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>`,
      "Состав":`<svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>`,
      "Сотрудники":`<svg viewBox="0 0 24 24"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z"/></svg>`,
      "Услуги":`<svg viewBox="0 0 24 24"><path d="M18 8h-1V6a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-6 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM9 8V6a3 3 0 0 1 6 0v2z"/></svg>`,
      "Медикаменты":`<svg viewBox="0 0 24 24"><path d="M4.22 11.29l5.66-5.66a5.003 5.003 0 0 1 7.07 0l2.83 2.83a5.003 5.003 0 0 1 0 7.07l-5.66 5.66a5.003 5.003 0 0 1-7.07 0l-2.83-2.83a5.003 5.003 0 0 1 0-7.07zm8.49 2.83l-4.95-4.95" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
      "Заявления и формы":`<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9z"/></svg>`,
      "Администрирование":`<svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5zm-2 16h4v-2h-4zm0-8h4v6h-4z" opacity=".9"/></svg>`,
      "FAQ":`<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>`
    }[g]||`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>`);

    let selectedIdx=0;let visible=[];

    function render(q){
      q=(q||"").trim().toLowerCase();
      // многословный запрос: все слова должны встречаться (в любом месте)
      const words=q?q.split(/\s+/).filter(Boolean):[];
      const match=d=>{
        const hay=(d.title+" "+(d.hint||"")+" "+(d.kw||"")).toLowerCase();
        return words.every(w=>hay.includes(w));
      };
      // скрываем закрытые разделы: без входа/прав они не показываются в выдаче
      const canSee=d=>!(window.CGB_SEARCH&&window.CGB_SEARCH.allowed)||window.CGB_SEARCH.allowed(d);
      const list=(words.length?DATASET.filter(match):DATASET).filter(canSee).slice(0,120);
      visible=list;selectedIdx=0;
      if(!list.length){
        results.innerHTML=`<div class="search-empty">Ничего не найдено по запросу «${q}»</div>`;
        return;
      }
      const groups={};
      list.forEach(d=>{(groups[d.group]=groups[d.group]||[]).push(d)});
      let idx=0;
      results.innerHTML=Object.keys(groups).map(g=>
        `<div class="search-group">${g}</div>`+
        groups[g].map(d=>`<div class="search-result" data-idx="${idx++}" data-href="${d.href}">
          <div class="search-result-icon">${iconFor(g)}</div>
          <div class="search-result-body">
            <div class="search-result-title">${d.title}</div>
            <div class="search-result-hint">${d.hint}</div>
          </div>
          <div class="search-result-arrow">↵</div>
        </div>`).join("")
      ).join("");
      highlight();
    }

    function highlight(){
      results.querySelectorAll(".search-result").forEach(r=>{
        if(+r.dataset.idx===selectedIdx){r.classList.add("active");r.scrollIntoView({block:"nearest"})}
        else r.classList.remove("active");
      });
    }

    function open(){modal.classList.add("active");setTimeout(()=>{input.focus();input.select()},50);render("")}
    function close(){modal.classList.remove("active");input.value=""}
    function go(href){
      close();
      if(href.includes("|")){
        const [page,anchor]=href.split("|");
        const cur=(location.pathname.split("/").pop()||"index.html").replace(/\.html?$/,"");
        if(page.split("#")[0].replace(/\.html?$/,"")===cur){
          location.hash=page.split("#")[1];
          setTimeout(()=>{const e=document.getElementById(anchor);if(e) e.scrollIntoView({behavior:"smooth"})},400);
        }else{
          sessionStorage.setItem("cgb-scroll-to",anchor);
          location.href=page;
        }
      }else{
        location.href=href;
      }
    }

    openers.forEach(b=>b.addEventListener("click",e=>{e.preventDefault();open()}));
    if(closer) closer.addEventListener("click",close);
    modal.addEventListener("click",e=>{if(e.target===modal) close()});
    input.addEventListener("input",()=>render(input.value));
    results.addEventListener("click",e=>{
      const r=e.target.closest(".search-result");
      if(r) go(r.dataset.href);
    });
    document.addEventListener("keydown",e=>{
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();open();return}
      if(!modal.classList.contains("active")) return;
      if(e.key==="Escape") close();
      else if(e.key==="ArrowDown"){e.preventDefault();if(selectedIdx<visible.length-1) selectedIdx++;highlight()}
      else if(e.key==="ArrowUp"){e.preventDefault();if(selectedIdx>0) selectedIdx--;highlight()}
      else if(e.key==="Enter"){
        e.preventDefault();
        const r=results.querySelector(`.search-result[data-idx="${selectedIdx}"]`);
        if(r) go(r.dataset.href);
      }
    });

    const pending=sessionStorage.getItem("cgb-scroll-to");
    if(pending){
      sessionStorage.removeItem("cgb-scroll-to");
      setTimeout(()=>{const e=document.getElementById(pending);if(e) e.scrollIntoView({behavior:"smooth"})},600);
    }
  }

  function setupBackground(){
    const c=document.getElementById("bgCanvas");
    if(!c) return;
    const ctx=c.getContext("2d");
    let W=0,H=0,raf=null;
    let FALL_TYPES=["plus","heart","pill","tablet","syringe","drop","star","pulse"];
    let mode=localStorage.getItem("cgb-bg-mode")||"falling";
    if(["grid","dots","waves","stars","radar","falling"].indexOf(mode)<0) mode="falling";
    let enabled=localStorage.getItem("cgb-bg-enabled")!=="0";
    let parts=[],stars=[],falls=[],radarAngle=0,waveT=0;

    function resize(){
      W=c.width=window.innerWidth*devicePixelRatio;
      H=c.height=window.innerHeight*devicePixelRatio;
      c.style.width=window.innerWidth+"px";
      c.style.height=window.innerHeight+"px";
    }
    function rand(a,b){return a+Math.random()*(b-a)}
    function getColor(){return root.getAttribute("data-theme")==="light"?"43,106,133":"74,142,165"}
    function getBg(){return root.getAttribute("data-theme")==="light"?"rgba(242,246,250,":"rgba(7,13,21,"}

    function buildParts(){
      const N=Math.min(70,Math.max(30,Math.floor(window.innerWidth/24)));
      parts=[];
      for(let i=0;i<N;i++){
        parts.push({x:rand(0,W),y:rand(0,H),vx:rand(-.15,.15)*devicePixelRatio,vy:rand(-.15,.15)*devicePixelRatio,r:rand(.8,2.4)*devicePixelRatio,a:rand(.15,.55)});
      }
    }
    function buildStars(){
      const N=Math.min(180,Math.max(80,Math.floor(window.innerWidth/10)));
      stars=[];
      for(let i=0;i<N;i++){
        const isBig=Math.random()<.05;
        stars.push({
          x:rand(0,W),y:rand(0,H),
          r:isBig?rand(1.8,3.2)*devicePixelRatio:rand(.4,1.4)*devicePixelRatio,
          a:rand(.1,.75),
          tw:rand(.005,.02),
          phase:rand(0,Math.PI*2),
          isBig
        });
      }
    }

    /* ---------- «Атмосфера»: падающие медицинские элементы ---------- */
    function fallPalettes(){
      const light=root.getAttribute("data-theme")==="light";
      return light
        ?[[8,145,178],[14,116,144],[16,150,135],[2,132,199],[6,182,212]]
        :[[103,232,249],[74,142,165],[52,211,153],[165,243,252],[96,190,220]];
    }
    function newFall(anyY){
      const dpr=devicePixelRatio;
      const depth=rand(.35,1); // глубина слоя: ближе = крупнее/быстрее
      return {
        x:rand(0,W),
        y:anyY?rand(-H,H):rand(-H*.25,-50*dpr),
        s:rand(9,30)*dpr*depth+8*dpr*0.4,
        vy:rand(.22,.75)*dpr*(0.55+depth),
        sway:rand(10,34)*dpr,
        swaySp:rand(.4,1.1),
        phase:rand(0,Math.PI*2),
        rot:rand(0,Math.PI*2),
        vr:rand(-.0045,.0045),
        a:rand(.08,.22)+depth*.08,
        col:(Math.random()*5)|0,
        type:FALL_TYPES[(Math.random()*FALL_TYPES.length)|0]
      };
    }
    function buildFalls(){
      const N=Math.min(52,Math.max(20,Math.floor(window.innerWidth/30)));
      falls=[];
      for(let i=0;i<N;i++) falls.push(newFall(true));
    }
    function drawFallShape(f,pal){
      const c=pal[f.col%pal.length];
      const s=f.s;
      ctx.save();
      ctx.translate(f.x+Math.sin(f.phase+f.y/220*f.swaySp)*f.sway,f.y);
      ctx.rotate(f.rot);
      ctx.strokeStyle=`rgba(${c[0]},${c[1]},${c[2]},${Math.min(f.a*1.35,.5)})`;
      ctx.fillStyle=`rgba(${c[0]},${c[1]},${c[2]},${Math.min(f.a,.4)})`;
      ctx.lineWidth=Math.max(1.4,s*.14);
      ctx.lineCap="round";ctx.lineJoin="round";
      switch(f.type){
        case "plus": // медицинский крест
          ctx.beginPath();
          const a=s*.32;
          ctx.moveTo(-a,-s);ctx.lineTo(a,-s);ctx.lineTo(a,-a);ctx.lineTo(s,-a);ctx.lineTo(s,a);ctx.lineTo(a,a);ctx.lineTo(a,s);ctx.lineTo(-a,s);ctx.lineTo(-a,a);ctx.lineTo(-s,a);ctx.lineTo(-s,-a);ctx.lineTo(-a,-a);ctx.closePath();
          ctx.fill();ctx.stroke();
          break;
        case "heart":
          ctx.beginPath();
          ctx.moveTo(0,s*.8);
          ctx.bezierCurveTo(-s*1.25,-s*.15,-s*.65,-s*1.05,0,-s*.35);
          ctx.bezierCurveTo(s*.65,-s*1.05,s*1.25,-s*.15,0,s*.8);
          ctx.fill();ctx.stroke();
          break;
        case "pill": // капсула
          ctx.save();ctx.rotate(-.6);
          ctx.beginPath();
          if(ctx.roundRect) ctx.roundRect(-s*1.05,-s*.42,s*2.1,s*.84,s*.42);
          else ctx.rect(-s*1.05,-s*.42,s*2.1,s*.84);
          ctx.fill();ctx.stroke();
          ctx.beginPath();ctx.moveTo(0,-s*.42);ctx.lineTo(0,s*.42);ctx.stroke();
          ctx.restore();
          break;
        case "tablet": // круглая таблетка с риской
          ctx.beginPath();ctx.arc(0,0,s*.72,0,Math.PI*2);ctx.fill();ctx.stroke();
          ctx.beginPath();ctx.moveTo(-s*.5,0);ctx.lineTo(s*.5,0);ctx.stroke();
          break;
        case "syringe":
          ctx.save();ctx.rotate(.7);
          ctx.beginPath();ctx.rect(-s*.9,-s*.22,s*1.5,s*.44);ctx.fill();ctx.stroke();
          ctx.beginPath();ctx.moveTo(s*.55,0);ctx.lineTo(s*1.25,0);ctx.stroke();
          ctx.beginPath();ctx.moveTo(-s*1.15,-s*.34);ctx.lineTo(-s*1.15,s*.34);ctx.moveTo(-s*1.15,0);ctx.lineTo(-s*.9,0);ctx.stroke();
          ctx.restore();
          break;
        case "drop": // капля
          ctx.beginPath();
          ctx.moveTo(0,-s*.95);
          ctx.bezierCurveTo(s*.75,-s*.05,s*.55,s*.8,0,s*.8);
          ctx.bezierCurveTo(-s*.55,s*.8,-s*.75,-s*.05,0,-s*.95);
          ctx.fill();ctx.stroke();
          break;
        case "star": // звезда жизни (6 лучей)
          ctx.beginPath();
          for(let k=0;k<6;k++){
            const ang=k*Math.PI/3;
            ctx.moveTo(0,0);
            ctx.lineTo(Math.cos(ang)*s,Math.sin(ang)*s);
          }
          ctx.lineWidth=Math.max(2,s*.22);ctx.stroke();
          break;
        case "pulse": // отрезок ЭКГ
          ctx.beginPath();
          ctx.moveTo(-s*1.2,0);ctx.lineTo(-s*.6,0);ctx.lineTo(-s*.35,-s*.55);ctx.lineTo(-s*.08,s*.6);ctx.lineTo(s*.18,-s*.12);ctx.lineTo(s*.4,0);ctx.lineTo(s*1.2,0);
          ctx.stroke();
          break;
      }
      ctx.restore();
    }
    function renderFalling(){
      const pal=fallPalettes();
      // лёгкая медицинская сетка-решётка из крестов, почти незаметная
      const dpr=devicePixelRatio;
      const step=170*dpr;
      const light=root.getAttribute("data-theme")==="light";
      ctx.strokeStyle=light?"rgba(8,145,178,.05)":"rgba(103,232,249,.045)";
      ctx.lineWidth=1.2*dpr;
      const cr=7*dpr;
      for(let x=step/2;x<W;x+=step){
        for(let y=step/2;y<H;y+=step){
          ctx.beginPath();
          ctx.moveTo(x-cr,y);ctx.lineTo(x+cr,y);
          ctx.moveTo(x,y-cr);ctx.lineTo(x,y+cr);
          ctx.stroke();
        }
      }
      for(let i=0;i<falls.length;i++){
        const f=falls[i];
        f.y+=f.vy;f.rot+=f.vr;f.phase+=.006*f.swaySp;
        if(f.y-f.s*2>H){falls[i]=newFall(false);continue}
        drawFallShape(f,pal);
      }
    }

    /* ---------- Точки ---------- */
    function renderDots(){
      const dpr=devicePixelRatio;
      const step=44*dpr;
      const light=root.getAttribute("data-theme")==="light";
      const t=Date.now()/1000;
      for(let x=step/2;x<W;x+=step){
        for(let y=step/2;y<H;y+=step){
          const pulse=.5+.5*Math.sin(t*.8+(x+y)/240);
          const r=(1.1+pulse*1.3)*dpr;
          ctx.beginPath();
          ctx.fillStyle=light?`rgba(8,145,178,${.07+pulse*.08})`:`rgba(103,232,249,${.06+pulse*.09})`;
          ctx.arc(x,y,r,0,Math.PI*2);
          ctx.fill();
        }
      }
      // дрейфующие крупные точки-«молекулы»
      const color=getColor();
      for(let i=0;i<parts.length;i++){
        const p=parts[i];
        p.x+=p.vx*.6;p.y+=p.vy*.6;
        if(p.x<0) p.x=W;if(p.x>W) p.x=0;
        if(p.y<0) p.y=H;if(p.y>H) p.y=0;
        ctx.beginPath();
        ctx.fillStyle=`rgba(${color},${p.a*.7})`;
        ctx.arc(p.x,p.y,p.r*1.4,0,Math.PI*2);
        ctx.fill();
      }
    }

    /* ---------- Волны ---------- */
    function renderWaves(){
      waveT+=.006;
      const light=root.getAttribute("data-theme")==="light";
      const dpr=devicePixelRatio;
      const layers=[
        {amp:26*dpr,len:.004/dpr*800,sp:1,al:light?.05:.055,off:.18},
        {amp:40*dpr,len:.003/dpr*800,sp:-.7,al:light?.045:.05,off:.38},
        {amp:58*dpr,len:.0022/dpr*800,sp:.45,al:light?.04:.045,off:.62}
      ];
      const color=getColor();
      for(const L of layers){
        ctx.beginPath();
        const baseY=H*L.off;
        for(let x=0;x<=W;x+=8*dpr){
          const y=baseY+Math.sin(x*L.len/2+waveT*L.sp*2)*L.amp+Math.sin(x*L.len/3.7-waveT*L.sp)*L.amp*.5;
          if(x===0) ctx.moveTo(x,y);else ctx.lineTo(x,y);
        }
        ctx.strokeStyle=`rgba(${color},${L.al*2})`;
        ctx.lineWidth=1.4*dpr;
        ctx.stroke();
      }
      // плавающие блики
      for(let i=0;i<parts.length;i++){
        const p=parts[i];
        p.x+=p.vx*.4;p.y+=p.vy*.4;
        if(p.x<0) p.x=W;if(p.x>W) p.x=0;
        if(p.y<0) p.y=H;if(p.y>H) p.y=0;
        ctx.beginPath();
        ctx.fillStyle=`rgba(${color},${p.a*.5})`;
        ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fill();
      }
    }

    function renderGrid(){
      const light=root.getAttribute("data-theme")==="light";
      const step=80*devicePixelRatio;
      ctx.strokeStyle=light?"rgba(8,145,178,.06)":"rgba(34,211,238,.045)";
      ctx.lineWidth=1;
      for(let x=0;x<W;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
      for(let y=0;y<H;y+=step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
      ctx.strokeStyle=light?"rgba(8,145,178,.11)":"rgba(34,211,238,.08)";
      for(let x=0;x<W;x+=step*4){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
      for(let y=0;y<H;y+=step*4){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
      const color=getColor();
      for(let i=0;i<parts.length;i++){
        const p=parts[i];
        p.x+=p.vx;p.y+=p.vy;
        if(p.x<0) p.x=W;if(p.x>W) p.x=0;
        if(p.y<0) p.y=H;if(p.y>H) p.y=0;
        for(let j=i+1;j<parts.length;j++){
          const q=parts[j];
          const dx=p.x-q.x,dy=p.y-q.y;
          const d2=dx*dx+dy*dy;
          const max=140*devicePixelRatio;
          if(d2<max*max){
            const a=(1-Math.sqrt(d2)/max)*.18;
            ctx.strokeStyle=`rgba(${color},${a})`;
            ctx.lineWidth=1;
            ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
          }
        }
        ctx.beginPath();
        ctx.fillStyle=`rgba(${color},${p.a})`;
        ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fill();
      }
    }

    function renderStars(){
      const color=getColor();
      const light=root.getAttribute("data-theme")==="light";
      for(let i=0;i<stars.length;i++){
        const s=stars[i];
        s.phase+=s.tw;
        const alpha=s.a*(.55+Math.sin(s.phase)*.45);
        ctx.beginPath();
        ctx.fillStyle=`rgba(${color},${alpha})`;
        ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
        ctx.fill();
        if(s.isBig){
          ctx.strokeStyle=`rgba(${color},${alpha*.5})`;
          ctx.lineWidth=1;
          ctx.beginPath();
          ctx.moveTo(s.x-s.r*3,s.y);ctx.lineTo(s.x+s.r*3,s.y);
          ctx.moveTo(s.x,s.y-s.r*3);ctx.lineTo(s.x,s.y+s.r*3);
          ctx.stroke();
        }
      }
      const step=200*devicePixelRatio;
      ctx.strokeStyle=`rgba(${color},.03)`;
      ctx.lineWidth=1;
      for(let x=0;x<W;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
      for(let y=0;y<H;y+=step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
    }

    function renderRadar(){
      const color=getColor();
      const cx=W/2,cy=H/2;
      const R=Math.max(W,H)*.75;
      ctx.strokeStyle=`rgba(${color},.06)`;
      ctx.lineWidth=1*devicePixelRatio;
      for(let i=1;i<=6;i++){
        ctx.beginPath();
        ctx.arc(cx,cy,R*i/6,0,Math.PI*2);
        ctx.stroke();
      }
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4;
        ctx.beginPath();
        ctx.moveTo(cx,cy);
        ctx.lineTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R);
        ctx.stroke();
      }
      radarAngle+=.008;
      const sweepWidth=Math.PI/3;
      const grad=ctx.createLinearGradient(
        cx,cy,
        cx+Math.cos(radarAngle)*R,cy+Math.sin(radarAngle)*R
      );
      grad.addColorStop(0,`rgba(${color},.18)`);
      grad.addColorStop(1,`rgba(${color},0)`);
      ctx.fillStyle=grad;
      ctx.beginPath();
      ctx.moveTo(cx,cy);
      ctx.arc(cx,cy,R,radarAngle-sweepWidth,radarAngle);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle=`rgba(${color},.4)`;
      ctx.lineWidth=1.5*devicePixelRatio;
      ctx.beginPath();
      ctx.moveTo(cx,cy);
      ctx.lineTo(cx+Math.cos(radarAngle)*R,cy+Math.sin(radarAngle)*R);
      ctx.stroke();
      for(let i=0;i<parts.length;i++){
        const p=parts[i];
        p.x+=p.vx*.3;p.y+=p.vy*.3;
        if(p.x<0) p.x=W;if(p.x>W) p.x=0;
        if(p.y<0) p.y=H;if(p.y>H) p.y=0;
        const dx=p.x-cx,dy=p.y-cy;
        const ang=Math.atan2(dy,dx);
        const diff=((radarAngle-ang)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
        const glow=diff<sweepWidth?(1-diff/sweepWidth):0;
        ctx.beginPath();
        ctx.fillStyle=`rgba(${color},${.18+glow*.7})`;
        ctx.arc(p.x,p.y,p.r*(1+glow),0,Math.PI*2);
        ctx.fill();
      }
    }

    function tick(){
      ctx.clearRect(0,0,W,H);
      if(mode==="grid") renderGrid();
      else if(mode==="stars") renderStars();
      else if(mode==="radar") renderRadar();
      else if(mode==="dots") renderDots();
      else if(mode==="waves") renderWaves();
      else if(mode==="falling") renderFalling();
      raf=requestAnimationFrame(tick);
    }

    function start(){
      if(!enabled){stop();c.style.opacity="0";return}
      c.style.opacity="1";
      if(mode==="stars"&&!stars.length) buildStars();
      if((mode==="grid"||mode==="radar"||mode==="dots"||mode==="waves")&&!parts.length) buildParts();
      if(mode==="falling"&&!falls.length) buildFalls();
      if(!raf) tick();
    }
    function stop(){if(raf){cancelAnimationFrame(raf);raf=null}}

    function applyMode(m){
      mode=m;localStorage.setItem("cgb-bg-mode",m);
      parts=[];stars=[];falls=[];
      start();
    }
    function toggleEnabled(v){
      enabled=v;localStorage.setItem("cgb-bg-enabled",v?"1":"0");
      if(v) start();else{stop();c.style.opacity="0"}
    }

    resize();
    start();

    let rt;
    window.addEventListener("resize",()=>{
      clearTimeout(rt);
      rt=setTimeout(()=>{resize();parts=[];stars=[];falls=[];start()},200);
    });
    document.addEventListener("visibilitychange",()=>{
      if(document.hidden) stop();else if(enabled) start();
    });

    window.CGB_BG={
      setMode:applyMode,
      setEnabled:toggleEnabled,
      getMode:()=>mode,
      isEnabled:()=>enabled
    };

    document.dispatchEvent(new CustomEvent("cgb-bg-ready"));
    /* Настройки в подвале главной страницы ЦГБ */
    const animT=document.getElementById("fsAnim");
    const modeBtns=document.querySelectorAll(".fs-mode");
    if(animT){
      animT.checked=enabled;
      animT.addEventListener("change",()=>{toggleEnabled(animT.checked);modeBtns.forEach(b=>b.disabled=!enabled)});
    }
    if(modeBtns.length){
      const sync=()=>modeBtns.forEach(b=>b.classList.toggle("active",b.dataset.bg===mode));
      modeBtns.forEach(b=>b.addEventListener("click",()=>{applyMode(b.dataset.bg);sync()}));
      sync();
    }
  }
})();
function compactMobileBrand(){
  const small=window.matchMedia('(max-width:420px)').matches;
  document.querySelectorAll('.brand-name').forEach(el=>{
    if(el.dataset.brandCompact!=='1' && el.textContent.includes('ЦГБ №3 · Центральная Городская')){
      el.innerHTML='<span>ЦГБ №3</span><span class="brand-name-full"> · Центральная Городская</span>';
      el.dataset.brandCompact='1';
    }
    const full=el.querySelector('.brand-name-full');
    if(full) full.style.display=small?'none':'';
  });
}
compactMobileBrand();
window.addEventListener('resize',compactMobileBrand);
