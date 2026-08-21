window.CGB_INFO=(function(){
  const DEFAULT_DATA={
    title:"Центральная Городская Больница №3",
    subtitle:"История, структура, услуги и льготы",
    intro:"ЦГБ №3 — многопрофильное лечебно-профилактическое учреждение здравоохранения. Обеспечиваем полный спектр стационарной, амбулаторной и экстренной медицинской помощи. Работаем для жителей города и области с 1974 года. Наша миссия — сохранение и восстановление здоровья каждого пациента с использованием современных методов диагностики и лечения.",
    sections:[
      {
        id:"functions",
        icon:"✚",
        title:"Основные направления работы",
        subtitle:"Что мы делаем каждый день",
        items:[
          "Оказание квалифицированной медицинской помощи в стационаре и амбулаторно",
          "Круглосуточный приём экстренных пациентов и работа отделения реанимации",
          "Проведение плановых и экстренных хирургических операций",
          "Полный комплекс лабораторной и инструментальной диагностики (УЗИ, КТ, МРТ)",
          "Реабилитация после травм, операций и тяжёлых заболеваний",
          "Профилактические осмотры, диспансеризация и вакцинация населения"
        ]
      },
      {
        id:"forms",
        icon:"⚕",
        title:"Виды медицинской помощи",
        subtitle:"Как получить приём",
        cards:[
          {
            heading:"Обязательное медицинское страхование (ОМС)",
            text:"Бесплатное оказание всех видов медицинской помощи гражданам с полисом ОМС в рамках базовой программы. Приём по направлению из поликлиники или самозапись через портал."
          },
          {
            heading:"Платные услуги и ДМС",
            text:"Расширенный сервис, приём в удобное время без очередей, услуги врачей высшей категории. Полный прайс-лист доступен в разделе «Услуги» или в регистратуре."
          }
        ]
      },
      {
        id:"benefits",
        icon:"◈",
        title:"Что мы гарантируем пациентам",
        subtitle:"Пациентам ЦГБ №3 доступны следующие возможности",
        grid:[
          {label:"Круглосуточная помощь",text:"Приёмное отделение работает без выходных 24/7, экстренная госпитализация — в любое время"},
          {label:"Опытные врачи",text:"Специалисты высшей категории, кандидаты и доктора медицинских наук по 12 направлениям"},
          {label:"Современное оборудование",text:"КТ, МРТ, УЗИ экспертного класса, лапароскопия, эндоскопия, лабораторная автоматика"},
          {label:"Комфортный стационар",text:"Одноместные и двухместные палаты, палаты повышенной комфортности с санузлом"},
          {label:"Собственная лаборатория",text:"Клинические, биохимические, бактериологические, иммунологические анализы за 1-2 дня"},
          {label:"Реабилитация",text:"Физиотерапия, лечебная физкультура, массаж, работа с психологом"},
          {label:"Электронная запись",text:"Онлайн-запись через сайт, портал Госуслуг или мобильное приложение"}
        ]
      },
      {
        id:"steps",
        icon:"★",
        title:"Как записаться на приём",
        subtitle:"Простые шаги для получения консультации специалиста",
        steps:[
          {n:"01",title:"Выбор специалиста",text:"На странице «Врачи» или «Отделения» выберите нужного доктора или направление"},
          {n:"02",title:"Онлайн-запись",text:"Заполните форму на сайте либо позвоните в регистратуру: +7 (800) 200-01-03"},
          {n:"03",title:"Подготовка документов",text:"Возьмите паспорт, полис ОМС, СНИЛС, направление (при наличии) и результаты предыдущих обследований"},
          {n:"04",title:"Приход в клинику",text:"Прибудьте за 15 минут до приёма, зарегистрируйтесь в регистратуре на 1 этаже"},
          {n:"05",title:"Консультация врача",text:"Осмотр, сбор анамнеза, назначение дополнительных обследований при необходимости"},
          {n:"06",title:"Лечение и наблюдение",text:"Получение рекомендаций, рецептов, направлений; повторный визит для контроля"}
        ]
      },
      {
        id:"tasks",
        icon:"❖",
        title:"Наши приоритеты",
        subtitle:"На чём мы фокусируемся в работе",
        items:[
          "Спасение жизней в экстренных ситуациях — реанимация, хирургия, кардиология",
          "Раннее выявление онкологических и сердечно-сосудистых заболеваний",
          "Помощь женщинам во время беременности, родов и в послеродовой период",
          "Педиатрическая помощь детям от рождения до 18 лет",
          "Профилактика, вакцинация и диспансерное наблюдение"
        ]
      }
    ],
    footer:"Медицинская помощь в ЦГБ №3 доступна всем гражданам Российской Федерации в рамках программы ОМС, а также иностранным гражданам на платной основе. Работаем в соответствии с федеральными стандартами оказания медицинской помощи и постоянно повышаем квалификацию персонала. Ваше здоровье — наша главная забота."
  };

  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

  function waitReady(timeoutMs){
    if(window.CGB_AUTH&&window.CGB_AUTH.whenReady) return window.CGB_AUTH.whenReady(timeoutMs||8000);
    return new Promise(resolve=>{
      const current=window.CGB_AUTH&&window.CGB_AUTH.state;
      if(current&&current.ready){resolve(current);return}
      let done=false;
      let timer=0;
      let off=()=>{};
      const finish=state=>{
        if(done) return;
        done=true;clearTimeout(timer);off();
        resolve(state||window.CGB_AUTH&&window.CGB_AUTH.state||null);
      };
      if(window.CGB_AUTH&&window.CGB_AUTH.onChange){
        off=window.CGB_AUTH.onChange(state=>{if(state&&state.ready) finish(state)});
        if(done){off();return}
      }
      timer=setTimeout(()=>finish(null),timeoutMs||5000);
    });
  }

  function normalize(value){
    const result=JSON.parse(JSON.stringify(DEFAULT_DATA));
    if(!value||typeof value!=="object"||Array.isArray(value)) return result;
    ["title","subtitle","intro","footer"].forEach(key=>{
      if(typeof value[key]==="string"&&value[key].trim()) result[key]=value[key];
    });
    if(Array.isArray(value.sections)&&value.sections.length) result.sections=value.sections;
    return result;
  }

  async function load(){
    await waitReady(5000);
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    if(s&&s.available&&s.client){
      try{
        const {data,error}=await s.client.from("info_page").select("data").eq("id",1).maybeSingle();
        if(error) throw error;
        if(data&&data.data) return normalize(data.data);
      }catch(e){console.warn("[CGB_INFO]",e.message)}
    }
    try{
      const raw=localStorage.getItem("cgb-info-local");
      if(raw) return normalize(JSON.parse(raw));
    }catch(e){}
    return normalize(null);
  }

  function saveLocal(payload){
    try{localStorage.setItem("cgb-info-local",JSON.stringify(payload));return {ok:true,remote:false}}
    catch(error){return {ok:false,remote:false,error:error.message||"Не удалось сохранить данные в браузере"}}
  }

  async function save(payload){
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    if(s&&s.available&&s.client&&s.user){
      try{
        const {error}=await s.client.from("info_page").upsert({id:1,data:payload,updated_at:new Date().toISOString()});
        if(error) throw error;
        try{localStorage.setItem("cgb-info-local",JSON.stringify(payload))}catch(_){}
        return {ok:true,remote:true};
      }catch(error){
        return {ok:false,remote:true,error:error.message||"Ошибка сохранения в Supabase"};
      }
    }
    return saveLocal(payload);
  }

  function resetDefault(){
    try{localStorage.removeItem("cgb-info-local")}catch(e){}
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  return {DEFAULT_DATA,load,save,resetDefault,esc,waitReady};
})();
