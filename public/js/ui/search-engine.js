/* Глобальный поиск по сайту ЦГБ №3 (Ctrl+K).
   Строит индекс из: списка страниц, новостей, устава (главы и статьи),
   уроков, состава, сотрудников (Discord-ник: «Должность | ФИО | Статик»),
   услуг, медикаментов и FAQ. Каждый источник изолирован: падение одного
   не ломает остальные. */
window.CGB_SEARCH=(function(){
  const CACHE_KEY="cgb-search-cache-v2";
  const TTL=5*60*1000;
  let cache=null;

  function readCache(){
    try{
      const c=JSON.parse(sessionStorage.getItem(CACHE_KEY)||"null");
      if(c&&c.at&&Date.now()-c.at<TTL) return c.data;
    }catch(e){}
    return null;
  }
  function writeCache(data){
    try{sessionStorage.setItem(CACHE_KEY,JSON.stringify({at:Date.now(),data}))}catch(e){}
  }
  function low(s){return String(s==null?"":s).toLowerCase()}

  /* --- парсер ника Discord «Должность | ФИО | Статик» (копия логики бота) --- */
  const POS_ROOTS=["замзав","орд2г","орд1г","згв","ввк","в1к","в2к","фарм","всп","асс","зав","орд","фел","сан","гв",
    "заместитель","заведующ","главврач","ассистент","ординатор","фельдшер","санитар","фармацевт"];
  function looksLikePosition(p){
    const t=String(p||"").toLowerCase().replace(/[\s.]+/g,"");
    if(!t) return false;
    return POS_ROOTS.some(r=>t.startsWith(r));
  }
  function staticOf(p){
    const d=String(p||"").replace(/\D/g,"");
    return (d.length>=4&&d.length<=7)?p.trim().replace(/^[\s№#]+/,""):null;
  }
  function parseNick(raw){
    const s=String(raw||"").trim();
    if(!s) return {pos:null,fio:null,stat:null};
    const parts=s.split("|").map(p=>p.trim()).filter(Boolean);
    if(parts.length===1){
      return {pos:null,fio:s,stat:staticOf(s)};
    }
    let stat=null,rest=parts;
    const si=parts.findIndex(p=>staticOf(p));
    if(si>=0){stat=staticOf(parts[si]);rest=parts.filter((_,i)=>i!==si);}
    let pos=null,fio=null;
    if(rest.length>=2){
      if(looksLikePosition(rest[0])||!looksLikePosition(rest[1])){
        pos=rest[0];fio=rest.slice(1).join(" | ");
      }else{
        fio=rest[0];pos=rest.slice(1).join(" | ");
      }
    }else if(rest.length===1){
      if(looksLikePosition(rest[0])){pos=rest[0];}
      else fio=rest[0];
    }
    return {pos,fio:fio||null,stat};
  }

  const STATIC=[
    {group:"Страницы",title:"Главная",hint:"Общая информация о больнице",href:"index.html",kw:"главная home стартовая о больнице"},
    {group:"Страницы",title:"Информация",hint:"Сведения о ЦГБ №3",href:"info.html",kw:"информация сведения контакты режим работы реквизиты"},
    {group:"Страницы",title:"Услуги",hint:"Платные медицинские услуги и цены",href:"services.html",kw:"услуги прайс цены стоимость запись платно калькулятор скидка"},
    {group:"Страницы",title:"Медикаменты",hint:"Справочник препаратов и лекарств",href:"meds.html",kw:"медикаменты лекарства препараты таблетки мази уколы капли справочник фарма"},
    {group:"Страницы",title:"Устав",hint:"Единый устав ЦГБ №3",href:"ustav.html",kw:"устав правила регламент документ главы статьи"},
    {group:"Страницы",title:"Учебные материалы",hint:"Курсы и уроки для сотрудников",href:"learn.html",kw:"обучение курсы уроки тренировка материалы учёба",auth:true},
    {group:"Страницы",title:"Состав",hint:"Личный состав и руководство",href:"composition.html",kw:"состав персонал сотрудники врачи штат должности"},
    {group:"Страницы",title:"Новости",hint:"Оперативная сводка",href:"news.html",kw:"новости объявления события"},
    {group:"Страницы",title:"Автопарк",hint:"Фотогалерея транспорта больницы",href:"autopark.html",kw:"автопарк техника машины скорая фото галерея"},
    {group:"Страницы",title:"Карта",hint:"Схема территории",href:"map.html",kw:"карта территория схема расположение"},
    {group:"Страницы",title:"FAQ",hint:"Частые вопросы",href:"faq.html",kw:"faq вопросы частые ответы помощь"},
    {group:"Страницы",title:"Жалобы и предложения",hint:"Обращения пациентов",href:"complaints-form.html",kw:"жалоба предложение обращение пациент форма"},
    {group:"Заявления и формы",title:"Тесты",hint:"Проверка знаний сотрудников",href:"tests.html",kw:"тесты экзамен аттестация проверка знаний",auth:true},
    {group:"Заявления и формы",title:"Заявление на отпуск",hint:"Подача заявления на отпуск",href:"leave.html",kw:"отпуск заявление отгул отдых",auth:true},
    {group:"Заявления и формы",title:"Отпуск IC",hint:"Заявление на отпуск (IC)",href:"vacation-ic.html",kw:"отпуск ic заявление",auth:true},
    {group:"Заявления и формы",title:"Отпуск OOC",hint:"Заявление на отпуск (OOC)",href:"vacation-ooc.html",kw:"отпуск ooc заявление",auth:true},
    {group:"Заявления и формы",title:"Увольнение",hint:"Заявление на увольнение",href:"dismissal.html",kw:"увольнение заявление уволиться сокращение",auth:true},
    {group:"Заявления и формы",title:"Повышение",hint:"Заявление на повышение",href:"promotion.html",kw:"повышение разжалование карьера должность",auth:true},
    {group:"Заявления и формы",title:"Восстановление",hint:"Заявление на восстановление",href:"restoration.html",kw:"восстановление заявление возврат"},
    {group:"Заявления и формы",title:"Запись к врачу",hint:"Общедоступная запись на приём в ЦГБ №3",href:"appointment.html",kw:"запись врач приём прием пациент консультация осмотр доктор доктора"},
    {group:"Заявления и формы",title:"Отчёт",hint:"Еженедельный отчёт сотрудника",href:"report.html",kw:"отчёт отчет еженедельный работа",auth:true},
    {group:"Заявления и формы",title:"Запрос проверки АБ",hint:"Заявка на проверку Администрации Больницы",href:"vp-request.html",kw:"проверка аб запрос вп заявка",perm:"vp_request:submit"},
    {group:"Администрирование",title:"Личный кабинет",hint:"Профиль и настройки",href:"lk.html",kw:"личный кабинет профиль настройки роль",auth:true},
    {group:"Администрирование",title:"Входящие заявления",hint:"Обработка заявлений с Discord",href:"apps.html",kw:"заявления входящие обработка бот",perm:"apps:view"},
    {group:"Администрирование",title:"Статистика заявлений",hint:"Цифры по заявлениям",href:"apps-stats.html",kw:"статистика заявления цифры",perm:"apps:view"},
    {group:"Администрирование",title:"Конструктор документов",hint:"Приказы и рапорта",href:"docs.html",kw:"документы конструктор приказ рапорт шаблон",perm:"docs:view"},
    {group:"Администрирование",title:"Реестр нарушений",hint:"Выговоры и взыскания",href:"complaints.html",kw:"реестр нарушения выговор взыскание"},
    {group:"Администрирование",title:"Проверки АБ",hint:"Проверки Администрации Больницы",href:"vp.html",kw:"проверки аб администрация контроль",perm:"vp:view"},
    {group:"Администрирование",title:"Роли и доступы",hint:"Управление ролями",href:"roles.html",kw:"роли доступы права админ",perm:"lk:roles"},
    {group:"Администрирование",title:"Зарплатная ведомость",hint:"Выплаты сотрудникам",href:"payroll.html",kw:"зарплата ведомость выплаты деньги",perm:"payroll:view"},
    {group:"Администрирование",title:"Поставки",hint:"Заявки на поставки",href:"supply.html",kw:"поставки заявки склад медикаменты",perm:"supply:view"}
  ];

  async function build(force){
    if(!force){
      const c=cache||readCache();
      if(c){cache=c;return c}
    }
    const data=STATIC.slice();
    const auth=window.CGB_AUTH;
    const client=auth&&auth.state&&auth.state.client;

    if(client){
      await Promise.all([
        // Новости
        (async()=>{try{
          const {data:rows}=await client.from("news").select("id,title,body,dept,tag,created_at").order("created_at",{ascending:false}).limit(100);
          if(rows) rows.forEach(r=>data.push({group:"Новости",title:String(r.title||"Без заголовка"),hint:String(r.body||"").slice(0,90),href:"news.html#n="+r.id,kw:low(r.title+" "+(r.body||"")+" "+(r.dept||"")+" "+(r.tag||""))}));
        }catch(e){}})(),
        // Устав: документ + главы + статьи (новый формат chapters/articles)
        (async()=>{try{
          const {data:rows}=await client.from("ustavy").select("slug,title,code,content").limit(50);
          if(rows) rows.forEach(r=>{
            const slug=r.slug==="svod-ustavov"?"ustav":r.slug; // переезд на единственный устав
            let c=r.content; if(typeof c==="string"){try{c=JSON.parse(c)}catch(e){c={}}}
            c=c||{};
            const title=(r.title==="Свод уставов"?"Устав":r.title)||"Устав";
            data.push({group:"Устав",title:title,hint:r.code||"Устав ЦГБ №3",href:"ustav.html#doc/"+slug,kw:low(title+" "+(r.code||"")+" "+(c.full||""))});
            (c.chapters||[]).forEach(ch=>{
              if(ch.title&&ch.id){
                data.push({group:"Разделы устава",title:String(ch.title),hint:title,href:"ustav.html#doc/"+slug+"--"+ch.id,kw:low(ch.title+" глава устав").slice(0,400)});
                (ch.articles||[]).forEach(a=>{
                  const num=String(a.num||"");
                  const anch=slug+"--"+ch.id+"--"+num.replace(/\./g,"_");
                  data.push({group:"Статьи устава",title:"Статья "+num,hint:String(a.text||"").slice(0,90),href:"ustav.html#doc/"+anch,kw:low(num+" "+(a.text||"")+" "+(a.notes||[]).join(" ")).slice(0,500)});
                });
              }
            });
            // старый формат (sections) — если вдруг осталась строка от прошлого проекта
            if(Array.isArray(c.sections)) c.sections.forEach(s=>{
              if(s.title&&s.id) data.push({group:"Разделы устава",title:String(s.title),hint:title,href:"ustav.html#doc/"+slug+"--"+s.id,kw:low(s.title+" "+(s.text||s.body||"")).slice(0,400)});
            });
          });
        }catch(e){}})(),
        // Уроки / учебные материалы
        (async()=>{try{
          const {data:rows}=await client.from("train_lessons").select("id,title,excerpt,content").limit(80);
          if(rows) rows.forEach(r=>data.push({group:"Обучение",title:String(r.title||"Урок"),hint:String(r.excerpt||"").slice(0,90),href:"learn.html#l="+r.id,kw:low(r.title+" "+(r.excerpt||"")+" "+(r.content||"")).slice(0,400)}));
        }catch(e){}})(),
        // Состав (дерево из таблицы composition)
        (async()=>{try{
          const {data:rows}=await client.from("composition").select("state").eq("id",1).maybeSingle();
          const state=rows&&rows.state;
          if(state){
            const walk=(node,path)=>{
              if(!node) return;
              if(node.name||node.rank||node.role){
                data.push({group:"Состав",title:String(node.name||node.role||"Позиция"),hint:[node.rank,node.role,path].filter(Boolean).join(" · "),href:"composition.html",kw:low((node.name||"")+" "+(node.rank||"")+" "+(node.role||""))});
              }
              if(Array.isArray(node.children)) node.children.forEach(ch=>walk(ch,(path?path+" / ":"")+(node.name||node.role||"")));
              if(Array.isArray(node.slots)) node.slots.forEach(ch=>walk(ch,(path?path+" / ":"")+(node.name||node.role||"")));
            };
            if(Array.isArray(state)) state.forEach(n=>walk(n,""));
            else walk(state,"");
          }
        }catch(e){}})(),
        // Сотрудники (Discord-состав; ник «Должность | ФИО | Статик»)
        (async()=>{try{
          const {data:rows}=await client.from("ds_members").select("discord_id,username,display_name,raw_nick,parsed_fio,parsed_static,parsed_dept").eq("active",true).limit(2000);
          if(rows) rows.forEach(m=>{
            const p=parseNick(m.raw_nick);
            const fio=(p.fio||m.parsed_fio||m.display_name||"").trim();
            if(!fio) return;
            const stat=p.stat||m.parsed_static||"";
            const pos=p.pos||m.parsed_dept||"";
            const hint=[pos,stat?("Статик "+stat):null].filter(Boolean).join(" · ")||(m.raw_nick||"").trim();
            data.push({group:"Сотрудники",title:fio,hint:hint,href:"composition.html",kw:low(fio+" "+stat+" "+String(stat).replace(/\D/g,"")+" "+pos+" "+(m.raw_nick||"")+" "+(m.username||""))});
          });
        }catch(e){}})(),
        // Услуги и медикаменты (контент страниц из site_data)
        (async()=>{try{
          const {data:rows}=await client.from("site_data").select("key,data").in("key",["services_page","meds_page"]);
          (rows||[]).forEach(r=>{
            const d=r.data||{};
            if(r.key==="services_page"){
              (d.categories||[]).forEach(cat=>{
                (cat.items||[]).forEach(it=>{
                  if(!it.name) return;
                  data.push({group:"Услуги",title:String(it.name),hint:(cat.title||"Услуги")+(it.price?" · "+it.price:""),href:"services.html",kw:low(it.name+" "+(it.desc||"")+" "+(it.tag||"")+" "+(cat.title||"")).slice(0,400)});
                });
              });
            }
            if(r.key==="meds_page"){
              (d.meds||[]).forEach(m=>{
                if(!m.name) return;
                data.push({group:"Медикаменты",title:String(m.name),hint:String(m.desc||"").slice(0,90),href:"meds.html",kw:low(m.name+" "+(m.desc||"")+" "+(m.form||"")).slice(0,400)});
              });
            }
          });
        }catch(e){}})()
      ]);
    }

    // FAQ через движок страницы (если подключён)
    if(window.CGB_FAQ){
      try{
        const rows=await window.CGB_FAQ.loadAll();
        rows.forEach(r=>data.push({group:"FAQ",title:String(r.q||"Вопрос"),hint:String(r.a||"").slice(0,90),href:"faq.html#"+r.id,kw:low(r.q+" "+r.a+" "+(r.cat||""))}));
      }catch(e){}
    }

    // Оглавление устава текущей страницы (если открыт ustav.html)
    if(window.CGB_USTAV_TOC){
      window.CGB_USTAV_TOC.forEach(t=>data.push({group:"Разделы устава",title:t.label,hint:"Устав ЦГБ №3",href:"ustav.html#doc/ustav--"+t.id,kw:low(t.label)}));
    }

    cache=data;writeCache(data);
    return data;
  }
  function invalidate(){cache=null;try{sessionStorage.removeItem(CACHE_KEY)}catch(e){}}

  /* Доступ к пункту поиска по правам/авторизации.
     auth:true — только вошедшим; perm:"sec:act[,sec2:act2]" — по CGB_ROLES. */
  function allowed(it){
    if(!it||(!it.auth&&!it.perm)) return true;
    const st=window.CGB_AUTH&&window.CGB_AUTH.state;
    const user=st&&st.user;
    if(it.auth&&!user) return false;
    if(it.perm){
      if(!user) return false;
      const R=window.CGB_ROLES;
      if(!R||!R.can) return false;
      return it.perm.split(",").some(p=>{
        const pr=p.trim().split(":");
        return R.can(pr[0],pr[1]||"view");
      });
    }
    return true;
  }

  return {build,invalidate,STATIC,parseNick,allowed};
})();
