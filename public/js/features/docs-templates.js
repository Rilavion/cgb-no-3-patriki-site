window.CGB_DOC_TEMPLATES=(function(){
  "use strict";

  const EMBLEM="assets/images/brand/logo.png";
  const GROUPS={
    requisites:"Реквизиты документа",
    addressee:"Адресат",
    content:"Содержание",
    patient:"Врач и пациент",
    sign:"Подписи и печати"
  };
  const richHelp="Чтобы выделить часть текста жирным, заключите её в двойные звёздочки: **важный текст**.";
  const f=(key,label,type,defaultValue,group,extra={})=>({key,label,type,default:defaultValue,group,...extra});
  const signImages=(second=false)=>[
    f(second?"seal2_url":"seal_url",second?"Печать главного врача":"Изображение печати","image","","sign",{help:"PNG или WebP с прозрачным фоном. Без файла используется встроенная печать."}),
    f(second?"sig2_url":"sig_url",second?"Подпись главного врача":"Изображение подписи","image","","sign",{help:"PNG или WebP с прозрачным фоном. Без файла используется встроенная подпись."})
  ];

  const TEMPLATES={
    response_letter:{
      name:"Официальный ответ",short:"Ответ на официальный запрос",icon:"✉️",pages:"auto",
      description:"Официальное письмо с динамическим числом страниц и выбором способа заверения.",
      fields:[
        f("date","Дата","text","19.05.2026","requisites"),
        f("number","Исходящий номер","text","№12","requisites"),
        f("address","Адрес учреждения","text","г. Москва, ул. Моховая, д. 85, лит. А","requisites"),
        f("recipient_org","Организация адресата","textarea","Следователю следственного отдела\nГСУ СК России по Патриаршему\nфедеральному округу\nлейтенанту юстиции","addressee"),
        f("recipient_name","ФИО адресата","text","Юденичу Р.В.","addressee"),
        f("greeting","Обращение","text","Уважаемый Роберт Вильгельмович!","content"),
        f("request_line","Основание ответа","textarea","На Ваш запрос от 19.05.2026 №261-905-1 о предоставлении сведений в рамках уголовного дела № 03-СК-122 сообщаю следующее.","content",{help:richHelp}),
        f("person_line","Сведения о гражданине","textarea","Гражданин Энзо Морте Фельдшеров (паспорт гражданина Российской Федерации № 646-844) в ГБУЗ «ЦГБ №3» г. Москвы **на учёте не состоит и не состоял, за какой-либо медицинской помощью не обращался.**","content",{help:richHelp}),
        f("records_line","Сведения о документах","textarea","В связи с отсутствием фактов обращения медицинская документация в отношении указанного лица не оформлялась, диагноз и дата постановки на учёт **отсутствуют.**","content",{help:richHelp}),
        f("conclusion_line","Итог ответа","textarea","Таким образом, на дату подготовки настоящего ответа предоставить запрашиваемые сведения **не представляется возможным** ввиду их отсутствия в ГБУЗ «ЦГБ №3» г. Москвы.","content",{help:richHelp}),
        f("signature_variant","Способ заверения","select","electronic","sign",{options:[{value:"electronic",label:"Электронная подпись"},{value:"seal",label:"Печать и рукописная подпись"}]}),
        f("sign_role","Должность подписанта","textarea","Главный врач\nЦГБ№3","sign"),
        f("sign_name","ФИО подписанта","text","Я.В. Милонов","sign"),
        f("cert_owner","Владелец сертификата","text","Милонов Ян Витальевич","sign"),
        f("cert_org","Организация","text","ГБУЗ Центральная городская больница №3","sign"),
        f("cert_until","Сертификат действителен","text","с 12.05.2026 по 12.05.2027","sign"),
        ...signImages()
      ]
    },

    inspection_conclusion:{
      name:"Заключение о проверке",short:"Результаты медицинской проверки",icon:"✅",pages:"auto",
      description:"Заключение автоматически переносится на новые страницы по фактическому объёму текста.",
      fields:[
        f("date","Дата документа","text","«22» апреля 2026 г.","requisites"),
        f("number","Номер документа","text","№ 93","requisites"),
        f("city","Город","text","г. Москва","requisites"),
        f("order_number","Номер приказа","text","№189","requisites"),
        f("order_date","Дата приказа","text","21 апреля 2026 г.","requisites"),
        f("body","Текст заключения","textarea","В соответствии с приказом Министерства Социальной политики и труда №189 от 21 апреля 2026 г. «О назначении медицинской проверки», предоставляю следующие сведения:\n\nРезультаты медицинской проверки показали общую высокую готовность сотрудников Управления Внутренних Дел (УВД) к исполнению трудовых обязанностей. Все 8 сотрудников, включённых в список, прошли полное медицинское обследование. У всех явившихся сотрудников документы были в наличии и действительны. Все медицинские книжки и справки были обновлены до актуальной даты. По итогам осмотра ни у одного сотрудника не выявлено медицинских противопоказаний к работе. Все прошедшие проверку признаны годными к исполнению профессиональных обязанностей.\n\nКонтроль за исполнением приказа был делегирован Заведующего Администрации Больницы Анну Милонову, она обеспечила чёткую организацию и соблюдение сроков. Заключение направлено на электронную почту Заместителя Министра Социальной Политики и Труда в установленный 24-часовой срок.\n\nПо итогам проведённого мероприятия констатируется безупречное выполнение всех поставленных задач. Проверка организации, документооборота и рабочих процессов подтвердила их полное соответствие установленным требованиям. Все необходимые документы, включая медицинские книжки персонала, актуальны и действительны. Мероприятие прошло в штатном режиме, без каких-либо замечаний и нештатных ситуаций. Рекомендуется поддерживать достигнутый уровень стандартов работы.","content",{help:richHelp}),
        f("sign_role","Должность подписанта","textarea","Главный врач\nЦГБ №3","sign"),
        f("sign_name","ФИО подписанта","text","Я.В. Милонов","sign"),
        ...signImages()
      ]
    },

    event_report:{
      name:"Отчёт о мероприятии",short:"Культурно-массовое мероприятие",icon:"📋",pages:"auto",
      description:"Отчёт и заверение размещаются последовательно, без искусственного разрыва страниц.",
      fields:[
        f("date","Дата документа","text","«29» марта 2026 г.","requisites"),
        f("number","Номер документа","text","№ 79","requisites"),
        f("city","Город","text","г. Москва","requisites"),
        f("order_number","Номер приказа","text","№173","requisites"),
        f("order_date","Дата приказа","text","26 марта 2026 г.","requisites"),
        f("event_name","Название мероприятия","text","День донора","content"),
        f("body","Текст отчёта","textarea","В соответствии с приказом Министерства Социальной политики и труда №173 от 26 марта 2026 г. «Об утверждении проведения культурно-массового мероприятия», предоставляю следующие сведения:\n\n28 марта 2026 года в соответствии с Приказом Министерства социальной политики и труда Российской Федерации состоялось глобальное благотворительное мероприятие «День донора». Мероприятие проводилось на двух площадках: на территории Московского Кремля и на территории парка на Чистых Прудах.\n\nОрганизация и проведение осуществлялись сотрудниками ГБУЗ ЦГБ № 3 и ГБУЗ ЦГБ № 7. Помощь в проведении мероприятия оказывали ВГТРК «Москва-Live», обеспечившие прямую трансляцию и рекламу, а также сотрудники ФСВНГ и ФСО, осуществлявшие охрану правопорядка и безопасность.\n\nВ ходе проведения Дня донора медицинским персоналом ГБУЗ ЦГБ № 3 было собрано 51 контейнер с донорской кровью. Забор крови производился с соблюдением всех необходимых санитарных норм и правил.\n\nНарушений в ходе мероприятия не зафиксировано. Донорский материал передан для дальнейшей переработки и хранения в установленном порядке.","content",{help:richHelp}),
        f("sign_role","Должность подписанта","textarea","Главный врач\nЦГБ №3","sign"),
        f("sign_name","ФИО подписанта","text","Я.В. Милонов","sign"),
        ...signImages()
      ]
    },

    medical_conclusion:{
      name:"Медицинское заключение",short:"Заключение по результатам осмотра",icon:"🩺",pages:"auto",
      description:"Разделы осмотра автоматически распределяются по необходимому количеству страниц.",
      fields:[
        f("date","Дата документа","text","«23» апреля 2026 г.","requisites"),
        f("number","Номер документа","text","№ 94","requisites"),
        f("city","Город","text","г. Москва","requisites"),
        f("doctor_intro","Врач, проводивший осмотр","text","ВВК Дмитрий Тёмный","patient"),
        f("patient_name","ФИО пациента","text","Николас Скандал","patient"),
        f("passport","Номер паспорта","text","936-905","patient"),
        f("complaint","Причина обращения","textarea","пациент поступил с жалобой на боль в правой ноге по причине вывиха.","patient",{help:richHelp}),
        f("status_intro","Вводная часть статуса","textarea","В ходе медицинского осмотра, а также проведённого на месте рентгенологического исследования установлено:","content",{help:richHelp}),
        f("status_items","Объективный статус — пункт в каждой строке","textarea","общее состояние пациента удовлетворительное, передвигается самостоятельно (после вправления);\nпри первичном осмотре до вправления отмечались: вынужденное положение правой нижней конечности, отёк и резкая локальная болезненность в области сустава;\nактивно-пассивные движения в поражённом суставе были резко ограничены из-за боли;\nцелостность кожных покровов не нарушена, признаков кровотечения нет;\nпо результатам рентгенологического исследования, проведённого на месте: подтверждён вывих правой нижней конечности без сопутствующего перелома;\nна месте выполнено закрытое вправление вывиха под местной анестезией;\nпосле вправления: объём движений в суставе восстановлен, отёк уменьшается, пациент активен, болевой синдром купирован.","content",{help:richHelp}),
        f("clinical","Клиническое заключение","textarea","Вывих правой нижней конечности без сопутствующего перелома.\nПроведено закрытое вправление вывиха на месте — эффективно.\nОсложнений не выявлено.","content",{help:richHelp}),
        f("recommendations","Рекомендации — пункт в каждой строке","textarea","Иммобилизация (фиксация) правой нижней конечности на срок 5–7 дней (тугая повязка или ортез).\nОбезболивающая терапия (при необходимости): ибупрофен 400 мг — не более 2 таблеток в сутки.\nСоблюдение щадящего режима с ограничением нагрузки на правую ногу в течение 5–7 дней.\nОформление листа временной нетрудоспособности сроком на 5 дней.\nПри возобновлении болей, усилении отёка или нестабильности сустава — повторное обращение.","content",{help:richHelp}),
        f("doctor_final","Заключение врача","textarea","Общее состояние пациента на момент осмотра стабильное.\nВправление вывиха выполнено успешно. Жизненно опасных повреждений нет.\nПсихоэмоциональное состояние стабильное.\nОснований для госпитализации или дополнительного оперативного вмешательства не имеется.\nПациент может продолжить лечение амбулаторно.","content",{help:richHelp}),
        f("sign_role","Должность врача","textarea","Врач Высшей Категории\nЦГБ №3","sign"),
        f("sign_name","ФИО врача","text","Д.А. Тёмный","sign"),
        f("sign2_role","Должность подтверждающего","textarea","Главный врач\nЦГБ №3","sign"),
        f("sign2_name","ФИО главного врача","text","Я.В. Милонов","sign"),
        ...signImages(),...signImages(true)
      ]
    }
  };

  const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
  const inline=value=>esc(value).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\n/g,"<br>");
  const lines=value=>String(value??"").split("\n").map(x=>x.trim()).filter(Boolean);
  const paragraphTexts=value=>String(value??"").split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
  const block=html=>`<div class="docx-block">${html}</div>`;
  const paragraphBlocks=(value,cls="")=>paragraphTexts(value).map(text=>block(`<p class="${cls}">${inline(text)}</p>`));
  const headingSection=(title,value)=>{
    const parts=paragraphTexts(value); if(!parts.length) return [block(`<h3>${title}</h3>`)];
    return [block(`<h3>${title}</h3><p>${inline(parts.shift())}</p>`),...parts.map(text=>block(`<p>${inline(text)}</p>`))];
  };
  const listSection=(title,value,type)=>{
    const items=lines(value); if(!items.length) return [block(`<h3>${title}</h3>`)];
    const rows=items.map((text,index)=>`<div class="docx-list-row ${type}"><span>${type==="number"?(index+1)+".":"•"}</span><span>${inline(text)}</span></div>`);
    return [block(`${title?`<h3>${title}</h3>`:""}${rows.shift()}`),...rows.map(block)];
  };

  function orgSide(){return `<div class="docx-org-side"><b>МИНИСТЕРСТВО<br>СОЦИАЛЬНОЙ ПОЛИТИКИ<br>И ТРУДА<br>(МСПТ РОССИИ)</b><strong>Государственное бюджетное<br>учреждение здравоохранения<br>«Центральная городская<br>больница №3» г. Москвы<br>(ГБУЗ «ЦГБ №3» г. Москвы)</strong><span>г. Москва, ул. Моховая, д. 85, лит. А</span></div>`}
  function masthead(){return `<div class="docx-masthead">${orgSide()}<img class="docx-emblem" src="${EMBLEM}" alt="Герб">${orgSide()}</div>`}
  function reqs(v){return `<div class="docx-reqs"><span>${esc(v.date)}</span><span>${esc(v.city)}</span><span>${esc(v.number)}</span></div>`}
  function docTitle(title,subtitle){return `<div class="docx-title"><h1>${title}</h1><h2>${subtitle}</h2></div>`}

  function signatureSvg(){return `<svg viewBox="0 0 260 95" aria-hidden="true"><path d="M11 66c30 22 50-58 51-39 2 29-36 66-23 46 20-29 24-60 29-48 7 17-18 59-9 46 13-19 25-51 28-35 4 24-14 48-3 35 16-19 31-47 32-27 1 19-8 34 2 25 16-15 31-39 34-23 3 13-8 27 2 19 17-13 34-31 36-17 2 12-11 21-2 17 13-6 25-18 33-17 8 2 4 15-2 22-8 10-7 14 12 4" fill="none" stroke="#111" stroke-width="2.3" stroke-linecap="round"/></svg>`}
  function sealSvg(){return `<svg viewBox="0 0 220 220" aria-hidden="true"><circle cx="110" cy="110" r="96" fill="rgba(255,255,255,.72)" stroke="#6788c3" stroke-width="4"/><circle cx="110" cy="110" r="84" fill="none" stroke="#6788c3" stroke-width="2"/><circle cx="110" cy="110" r="55" fill="none" stroke="#86a1d1" stroke-width="2"/><text x="110" y="47" text-anchor="middle">МИНИСТЕРСТВО СОЦИАЛЬНОЙ ПОЛИТИКИ</text><text x="110" y="63" text-anchor="middle">ГОРОД МОСКВА · РОССИЙСКАЯ ФЕДЕРАЦИЯ</text><text x="110" y="98" text-anchor="middle" class="seal-big">ЦЕНТРАЛЬНАЯ</text><text x="110" y="119" text-anchor="middle" class="seal-big">ГОРОДСКАЯ</text><text x="110" y="140" text-anchor="middle" class="seal-big">БОЛЬНИЦА № 3</text><text x="110" y="160" text-anchor="middle">ДЛЯ ДОКУМЕНТОВ</text></svg>`}
  const visual=(url,kind)=>url?`<img src="${esc(url)}" alt="${kind==="seal"?"Печать":"Подпись"}">`:(kind==="seal"?sealSvg():signatureSvg());
  function signRow(role,name,sealUrl,sigUrl){return `<div class="docx-sign-row"><div class="docx-sign-role">${inline(role)}</div><div class="docx-sign-visuals"><div class="docx-seal">${visual(sealUrl,"seal")}</div><div class="docx-signature">${visual(sigUrl,"signature")}</div></div><div class="docx-sign-name">${esc(name)}</div></div>`}
  function electronicSignature(v){return `<div class="docx-e-sign"><div class="docx-e-sign-top"><img src="${EMBLEM}" alt=""><b>ДОКУМЕНТ ПОДПИСАН<br>ЭЛЕКТРОННОЙ ПОДПИСЬЮ</b></div><div class="docx-e-sign-title">СВЕДЕНИЯ О СЕРТИФИКАТЕ ЭП</div><div class="docx-e-sign-data">Владелец: ${esc(v.cert_owner)}<br>${esc(v.cert_org)}<br>Действителен: ${esc(v.cert_until)}</div></div>`}

  function formalFirst(title,subtitle,v){return `${masthead()}${docTitle(title,subtitle)}${reqs(v)}`}

  function composeResponse(v){
    const firstHtml=`<div class="docx-letter-head"><div class="docx-letter-org"><img src="${EMBLEM}" alt="Герб"><b>МИНИСТЕРСТВО СОЦИАЛЬНОЙ<br>ПОЛИТИКИ И ТРУДА<br>(МСПТ РОССИИ)</b><strong>Государственное бюджетное учреждение<br>здравоохранения «Центральная городская<br>больница №3» г. Москвы<br>(ГБУЗ «ЦГБ №3» г. Москвы)</strong><span>${esc(v.address)}</span><em>${esc(v.date)} ${esc(v.number)}</em></div><div class="docx-addressee">${inline(v.recipient_org)}<b>${esc(v.recipient_name)}</b></div></div>`;
    const blocks=[block(`<h3 class="docx-greeting">${esc(v.greeting)}</h3>`),...paragraphBlocks(v.request_line),...paragraphBlocks(v.person_line),...paragraphBlocks(v.records_line),...paragraphBlocks(v.conclusion_line)];
    const sign=v.signature_variant==="seal"?signRow(v.sign_role,v.sign_name,v.seal_url,v.sig_url):`<div class="docx-letter-sign-flow"><div class="docx-sign-role">${inline(v.sign_role)}</div>${electronicSignature(v)}<div class="docx-sign-name">${esc(v.sign_name)}</div></div>`;
    blocks.push(block(sign));
    return {pageClass:"docx-letter-page",firstHtml,blocks};
  }

  function composeInspection(v){return {pageClass:"docx-formal-page",firstHtml:formalFirst("З А К Л Ю Ч Е Н И Е","о проведённой медицинской проверке",v),blocks:[...paragraphBlocks(v.body),block(signRow(v.sign_role,v.sign_name,v.seal_url,v.sig_url))]}}
  function composeEvent(v){return {pageClass:"docx-formal-page",firstHtml:formalFirst("О Т Ч Ё Т","о проведённом культурно-массовом мероприятии",v),blocks:[...paragraphBlocks(v.body),block(signRow(v.sign_role,v.sign_name,v.seal_url,v.sig_url))]}}
  function composeMedical(v){
    const patient=block(`<div class="docx-medical-patient"><p><b>Врач:</b> ${inline(v.doctor_intro)}</p><p><b>Пациент:</b></p><div class="docx-list-row bullet"><span>•</span><span><b>ФИО пациента:</b> ${inline(v.patient_name)}</span></div><div class="docx-list-row bullet"><span>•</span><span><b>Номер паспорта:</b> ${inline(v.passport)}</span></div><div class="docx-list-row bullet"><span>•</span><span><b>Причина обращения:</b> ${inline(v.complaint)}</span></div></div>`);
    const signs=block(`<div class="docx-medical-sign-stack">${signRow(v.sign_role,v.sign_name,v.seal_url,v.sig_url)}<div class="docx-approved">Подтверждено Главным Врачом ЦГБ №3</div>${signRow(v.sign2_role,v.sign2_name,v.seal2_url,v.sig2_url)}</div>`);
    return {pageClass:"docx-formal-page",firstHtml:formalFirst("М Е Д И Ц И Н С К О Е &nbsp; З А К Л Ю Ч Е Н И Е","по результатам проведённого осмотра",v),blocks:[patient,...headingSection("Объективный статус",v.status_intro),...listSection("",v.status_items,"bullet"),...headingSection("Клиническое заключение",v.clinical),...listSection("Рекомендации",v.recommendations,"number"),...headingSection("Заключение врача",v.doctor_final),signs]};
  }

  function defaults(id){const template=TEMPLATES[id]||TEMPLATES.response_letter;return Object.fromEntries(template.fields.map(field=>[field.key,field.default??""]))}
  function compose(id,values){const v={...defaults(id),...(values||{})};if(id==="response_letter")return composeResponse(v);if(id==="inspection_conclusion")return composeInspection(v);if(id==="event_report")return composeEvent(v);if(id==="medical_conclusion")return composeMedical(v);return composeResponse(v)}
  function render(id,values){const doc=compose(id,values);return `<article class="docx-page a4 ${doc.pageClass}">${doc.firstHtml}<div class="docx-flow">${doc.blocks.join("")}</div></article>`}

  return {TEMPLATES,GROUPS,compose,render,defaults,esc};
})();
