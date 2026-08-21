(function(){
  "use strict";

  const byId=id=>document.getElementById(id);
  const templates=window.CGB_DOC_TEMPLATES;
  if(!templates) return;

  const els={
    main:byId("mainWrap"), prompt:byId("loginPrompt"), tabs:byId("docsTabs"),
    form:byId("docs2Form"), preview:byId("docsPreview"), pageActions:byId("docs2PageActions"),
    editorTitle:byId("docs2EditorTitle"), editorDescription:byId("docs2EditorDescription"),
    statusText:byId("docs2StatusText"), toast:byId("toast"), zoomText:byId("docs2ZoomText")
  };

  const templateIds=Object.keys(templates.TEMPLATES);
  let currentTemplate=localStorage.getItem("cgb-doc-current-v2")||templateIds[0];
  if(!templates.TEMPLATES[currentTemplate]) currentTemplate=templateIds[0];
  let values=loadValues(currentTemplate)||templates.defaults(currentTemplate);
  let zoom=Number(localStorage.getItem("cgb-doc-zoom-v2")||.78);
  if(!Number.isFinite(zoom)) zoom=.78;
  zoom=Math.min(1.05,Math.max(.45,zoom));
  let renderTimer=0;
  let statusTimer=0;

  function showToast(message,type=""){
    if(!els.toast) return;
    els.toast.textContent=message;
    els.toast.className="toast show "+type;
    clearTimeout(els.toast._timer);
    els.toast._timer=setTimeout(()=>els.toast.classList.remove("show"),2600);
  }

  function storageKey(id){return "cgb-doc-v2-"+id}
  function loadValues(id){
    try{
      const raw=localStorage.getItem(storageKey(id));
      if(!raw) return null;
      const saved=JSON.parse(raw)||{};
      if(id==="inspection_conclusion"&&!saved.body) saved.body=[saved.body1,saved.body2].filter(Boolean).join("\n\n");
      if(id==="event_report"&&!saved.body) saved.body=[saved.body1,saved.body2].filter(Boolean).join("\n\n");
      return {...templates.defaults(id),...saved};
    }catch(_){return null}
  }
  function saveValues(){
    try{
      localStorage.setItem(storageKey(currentTemplate),JSON.stringify(values));
      els.statusText.textContent="Сохранено в этом браузере";
    }catch(_){
      els.statusText.textContent="Изменения сохранены до закрытия страницы";
    }
    clearTimeout(statusTimer);
    statusTimer=setTimeout(()=>els.statusText.textContent="Автосохранение включено",1800);
  }

  function renderTabs(){
    els.tabs.className="docs2-templates";
    els.tabs.innerHTML=templateIds.map(id=>{
      const item=templates.TEMPLATES[id];
      return `<button type="button" class="docs2-template ${id===currentTemplate?"active":""}" data-tpl="${id}">
        <span class="docs2-template-top"><span class="docs2-template-icon">${item.icon}</span><span class="docs2-template-pages">Авто</span></span>
        <strong>${templates.esc(item.name)}</strong><small>${templates.esc(item.short)}</small>
      </button>`;
    }).join("");
  }

  function fieldMarkup(field){
    const value=values[field.key]??"";
    const help=field.help?`<small class="docs2-help">${templates.esc(field.help)}</small>`:"";
    if(field.type==="image"){
      return `<div class="docs2-field" data-image-field="${field.key}"><label>${templates.esc(field.label)}</label>
        <div class="docs2-image">
          <label class="docs2-file-btn">Выбрать файл<input type="file" accept="image/png,image/jpeg,image/webp" data-image-input="${field.key}" hidden></label>
          <button type="button" class="docs2-clear-btn" data-image-clear="${field.key}" title="Удалить изображение">×</button>
          <div class="docs2-image-preview">${value?`<img src="${templates.esc(value)}" alt=""><span>Используется загруженное изображение</span>`:`<span>Сейчас используется встроенное оформление</span>`}</div>
        </div>${help}</div>`;
    }
    const control=field.type==="textarea"
      ?`<textarea name="${field.key}" rows="${Math.min(9,Math.max(3,String(value).split("\n").length+1))}">${templates.esc(value)}</textarea>`
      :field.type==="select"
        ?`<select name="${field.key}">${(field.options||[]).map(option=>`<option value="${templates.esc(option.value)}" ${String(value)===String(option.value)?"selected":""}>${templates.esc(option.label)}</option>`).join("")}</select>`
        :`<input type="text" name="${field.key}" value="${templates.esc(value)}">`;
    return `<div class="docs2-field"><label for="doc-field-${field.key}">${templates.esc(field.label)}</label>${control}${help}</div>`;
  }

  function renderForm(){
    const item=templates.TEMPLATES[currentTemplate];
    els.editorTitle.textContent=item.name;
    els.editorDescription.textContent=item.description;
    const groups={};
    item.fields.forEach(field=>{(groups[field.group||"content"]||(groups[field.group||"content"]=[])).push(field)});
    els.form.innerHTML=Object.entries(groups).map(([group,fields],index)=>`<details class="docs2-group" ${index<2?"open":""}>
      <summary>${templates.esc(templates.GROUPS[group]||group)}</summary>
      <div class="docs2-group-fields">${fields.map(fieldMarkup).join("")}</div>
    </details>`).join("");

    els.form.querySelectorAll("input[name],textarea[name],select[name]").forEach(input=>{
      input.id="doc-field-"+input.name;
      input.addEventListener(input.tagName==="SELECT"?"change":"input",()=>{
        values[input.name]=input.value;
        scheduleRender();saveValues();
      });
    });
    els.form.querySelectorAll("[data-image-input]").forEach(input=>input.addEventListener("change",()=>readImage(input)));
    els.form.querySelectorAll("[data-image-clear]").forEach(button=>button.addEventListener("click",()=>{
      values[button.dataset.imageClear]="";saveValues();renderForm();renderDoc();showToast("Изображение удалено","success");
    }));
  }

  function readImage(input){
    const file=input.files&&input.files[0];
    if(!file) return;
    if(file.size>8*1024*1024){showToast("Файл слишком большой. Выберите изображение до 8 МБ.","error");return}
    const reader=new FileReader();
    reader.onload=()=>{
      values[input.dataset.imageInput]=reader.result;
      saveValues();renderForm();renderDoc();showToast("Изображение добавлено","success");
    };
    reader.onerror=()=>showToast("Не удалось прочитать изображение","error");
    reader.readAsDataURL(file);
  }

  function createPage(documentModel,pageNumber){
    const page=document.createElement("article");
    page.className=`docx-page a4 ${documentModel.pageClass||""}`;
    if(pageNumber===1) page.insertAdjacentHTML("beforeend",documentModel.firstHtml||"");
    else page.insertAdjacentHTML("beforeend",`<div class="docx-page-number-flow">${pageNumber}</div>`);
    const flow=document.createElement("div");flow.className="docx-flow";page.appendChild(flow);els.preview.appendChild(page);
    return {page,flow};
  }

  function blockOverflows(page,block){
    const paddingBottom=Number.parseFloat(getComputedStyle(page).paddingBottom)||0;
    const pageRect=page.getBoundingClientRect();
    const blockRect=block.getBoundingClientRect();
    return blockRect.bottom>pageRect.bottom-paddingBottom+1;
  }

  function collectInlineTokens(node,bold=false,out=[]){
    if(node.nodeType===Node.TEXT_NODE){
      String(node.nodeValue||"").split(/(\s+)/).filter(Boolean).forEach(text=>out.push({text,bold}));
      return out;
    }
    if(node.nodeType!==Node.ELEMENT_NODE) return out;
    if(node.tagName==="BR"){out.push({br:true});return out}
    const nextBold=bold||node.tagName==="STRONG"||node.tagName==="B";
    Array.from(node.childNodes).forEach(child=>collectInlineTokens(child,nextBold,out));
    return out;
  }

  function splitOversizedParagraph(sourceBlock,current,documentModel,pageNumber){
    const sourceParagraph=sourceBlock.children.length===1&&sourceBlock.firstElementChild&&sourceBlock.firstElementChild.tagName==="P"?sourceBlock.firstElementChild:null;
    if(!sourceParagraph) return {current,pageNumber,split:false};
    const tokens=collectInlineTokens(sourceParagraph);
    if(tokens.length<2) return {current,pageNumber,split:false};
    sourceBlock.remove();
    let paragraph;
    const startSegment=()=>{
      const wrapper=document.createElement("div");wrapper.className="docx-block";
      paragraph=document.createElement("p");paragraph.className=sourceParagraph.className;
      wrapper.appendChild(paragraph);current.flow.appendChild(wrapper);return wrapper;
    };
    let wrapper=startSegment();
    tokens.forEach(token=>{
      if(!paragraph.textContent&&!paragraph.children.length&&token.text&&/^\s+$/.test(token.text)) return;
      let added;
      if(token.br){added=document.createElement("br")}
      else if(token.bold){added=document.createElement("strong");added.textContent=token.text}
      else added=document.createTextNode(token.text);
      paragraph.appendChild(added);
      if(blockOverflows(current.page,wrapper)){
        added.remove();
        current=createPage(documentModel,++pageNumber);
        wrapper=startSegment();
        if(token.br) paragraph.appendChild(document.createElement("br"));
        else if(token.bold){const strong=document.createElement("strong");strong.textContent=token.text;paragraph.appendChild(strong)}
        else paragraph.appendChild(document.createTextNode(token.text));
      }
    });
    return {current,pageNumber,split:true};
  }

  function renderDoc(){
    els.preview.style.zoom="1";
    els.preview.innerHTML="";
    const documentModel=templates.compose(currentTemplate,values);
    let pageNumber=1;
    let current=createPage(documentModel,pageNumber);
    (documentModel.blocks||[]).forEach(html=>{
      current.flow.insertAdjacentHTML("beforeend",html);
      let added=current.flow.lastElementChild;
      if(blockOverflows(current.page,added)){
        const splitResult=splitOversizedParagraph(added,current,documentModel,pageNumber);
        if(splitResult.split){current=splitResult.current;pageNumber=splitResult.pageNumber;return}
        added.remove();
        current=createPage(documentModel,++pageNumber);
        current.flow.appendChild(added);
      }
    });
    const pages=Array.from(els.preview.querySelectorAll(".docx-page"));
    els.pageActions.innerHTML=pages.map((_,index)=>`<button type="button" data-copy-page="${index}">📄 Копировать стр. ${index+1}</button>`).join("");
    const activePageLabel=els.tabs.querySelector(`[data-tpl="${currentTemplate}"] .docs2-template-pages`);
    if(activePageLabel) activePageLabel.textContent=pages.length+" "+(pages.length===1?"стр.":"стр.");
    applyZoom();
  }
  function scheduleRender(){clearTimeout(renderTimer);renderTimer=setTimeout(renderDoc,90)}

  function applyZoom(){
    els.preview.style.zoom=String(zoom);
    els.zoomText.textContent=Math.round(zoom*100)+"%";
    localStorage.setItem("cgb-doc-zoom-v2",String(zoom));
  }

  async function waitImages(node){
    const images=Array.from(node.querySelectorAll("img"));
    await Promise.all(images.map(img=>new Promise(resolve=>{
      if(img.complete){resolve();return}
      img.onload=img.onerror=resolve;
    })));
  }

  async function renderPage(node){
    if(!window.html2canvas) throw new Error("Модуль экспорта не загружен");
    const holder=document.createElement("div");
    holder.style.cssText="position:fixed;left:-10000px;top:0;background:#fff;z-index:-1;";
    const clone=node.cloneNode(true);
    clone.style.margin="0";clone.style.boxShadow="none";clone.style.zoom="1";
    holder.appendChild(clone);document.body.appendChild(holder);
    try{
      await waitImages(clone);
      return await html2canvas(clone,{backgroundColor:"#ffffff",scale:2,useCORS:true,allowTaint:true,logging:false,imageTimeout:12000});
    }finally{holder.remove()}
  }

  async function renderAll(){
    const pages=Array.from(els.preview.querySelectorAll(".docx-page"));
    const rendered=[];
    for(const page of pages) rendered.push(await renderPage(page));
    if(rendered.length===1) return rendered[0];
    const gap=48,width=Math.max(...rendered.map(c=>c.width));
    const height=rendered.reduce((sum,c)=>sum+c.height,0)+gap*(rendered.length-1);
    const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,width,height);
    let y=0;rendered.forEach(c=>{ctx.drawImage(c,(width-c.width)/2,y);y+=c.height+gap});
    return canvas;
  }

  const canvasBlob=canvas=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("PNG не создан")),"image/png"));
  function downloadBlob(blob,name){
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function fileName(){
    const clean=templates.TEMPLATES[currentTemplate].name.toLowerCase().replace(/[^a-zа-яё0-9]+/gi,"-").replace(/^-|-$/g,"");
    return clean+".png";
  }
  async function copyCanvas(canvas){
    const blob=await canvasBlob(canvas);
    if(navigator.clipboard&&window.ClipboardItem){
      await navigator.clipboard.write([new ClipboardItem({"image/png":blob})]);
      return true;
    }
    downloadBlob(blob,fileName());return false;
  }
  async function withBusy(button,job){
    if(button.disabled) return;
    const old=button.textContent;button.disabled=true;button.textContent="Подготовка…";
    try{await job()}catch(error){console.error(error);showToast("Не удалось подготовить документ: "+error.message,"error")}
    finally{button.disabled=false;button.textContent=old}
  }

  els.tabs.addEventListener("click",event=>{
    const button=event.target.closest("[data-tpl]");if(!button) return;
    currentTemplate=button.dataset.tpl;localStorage.setItem("cgb-doc-current-v2",currentTemplate);
    values=loadValues(currentTemplate)||templates.defaults(currentTemplate);
    renderTabs();renderForm();renderDoc();
  });
  els.pageActions.addEventListener("click",event=>{
    const button=event.target.closest("[data-copy-page]");if(!button) return;
    withBusy(button,async()=>{
      const page=els.preview.querySelectorAll(".docx-page")[Number(button.dataset.copyPage)];
      const copied=await copyCanvas(await renderPage(page));
      showToast(copied?"Страница скопирована в буфер":"Страница скачана как PNG","success");
    });
  });
  byId("docs2CopyAll").addEventListener("click",event=>withBusy(event.currentTarget,async()=>{
    const copied=await copyCanvas(await renderAll());showToast(copied?"Документ скопирован в буфер":"Документ скачан как PNG","success");
  }));
  byId("docs2Download").addEventListener("click",event=>withBusy(event.currentTarget,async()=>{
    downloadBlob(await canvasBlob(await renderAll()),fileName());showToast("Документ скачан","success");
  }));
  byId("docs2Print").addEventListener("click",()=>window.print());
  byId("docs2Reset").addEventListener("click",()=>{
    if(!confirm("Вернуть исходный текст этого шаблона?")) return;
    values=templates.defaults(currentTemplate);saveValues();renderForm();renderDoc();showToast("Шаблон сброшен","success");
  });
  byId("docs2ZoomIn").addEventListener("click",()=>{zoom=Math.min(1.05,zoom+.1);applyZoom()});
  byId("docs2ZoomOut").addEventListener("click",()=>{zoom=Math.max(.45,zoom-.1);applyZoom()});

  function updateAccess(){
    const localPreview=location.hostname==="127.0.0.1"||location.hostname==="localhost";
    const allowed=localPreview||!!(window.CGB_ROLES&&window.CGB_ROLES.can("docs","view"));
    els.main.style.display=allowed?"":"none";
    els.prompt.style.display=allowed?"none":"";
  }
  if(window.CGB_ROLES&&window.CGB_ROLES.onChange) window.CGB_ROLES.onChange(updateAccess);
  if(window.CGB_AUTH&&window.CGB_AUTH.onChange) window.CGB_AUTH.onChange(updateAccess);

  renderTabs();renderForm();renderDoc();updateAccess();
})();
