window.CGB_SELECT=(function(){
  function enhance(select){
    if(!select||select.__enhanced) return;
    select.__enhanced=1;
    const wrap=document.createElement("div");
    wrap.className="dropdown dropdown-form";
    const btn=document.createElement("button");
    btn.type="button";btn.className="dropdown-btn";
    const label=document.createElement("span");label.className="dropdown-btn-label";
    const arrow=document.createElement("span");arrow.className="dropdown-arrow";arrow.textContent="▾";
    btn.appendChild(label);btn.appendChild(arrow);
    const menu=document.createElement("div");menu.className="dropdown-menu";
    wrap.appendChild(btn);wrap.appendChild(menu);
    select.style.display="none";
    select.parentNode.insertBefore(wrap,select);
    wrap.appendChild(select);

    function build(){
      menu.innerHTML="";
      Array.from(select.options).forEach(opt=>{
        if(!opt.value&&!opt.textContent.trim()) return;
        const item=document.createElement("div");
        item.className="dropdown-item";
        item.dataset.value=opt.value;
        item.textContent=opt.textContent;
        if(opt.selected) item.classList.add("active");
        item.addEventListener("click",()=>{
          select.value=opt.value;
          select.dispatchEvent(new Event("change",{bubbles:true}));
          sync();close();
        });
        menu.appendChild(item);
      });
    }
    function sync(){
      const cur=select.options[select.selectedIndex];
      label.textContent=cur?cur.textContent:"—";
      menu.querySelectorAll(".dropdown-item").forEach(it=>{
        it.classList.toggle("active",it.dataset.value===select.value);
      });
    }
    function open(){wrap.classList.add("open");document.addEventListener("click",outsideClose)}
    function close(){wrap.classList.remove("open");document.removeEventListener("click",outsideClose)}
    function outsideClose(e){if(!wrap.contains(e.target)) close()}
    btn.addEventListener("click",e=>{e.preventDefault();wrap.classList.contains("open")?close():open()});
    select.addEventListener("__cgb_refresh",()=>{build();sync()});
    build();sync();
  }
  function enhanceAll(root){
    (root||document).querySelectorAll("select.form-select-custom").forEach(enhance);
  }
  document.addEventListener("DOMContentLoaded",()=>enhanceAll());
  return {enhance,enhanceAll};
})();
