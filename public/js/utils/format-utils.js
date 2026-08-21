window.CGB_FMT=(function(){
  function formatStatic(v){
    const digits=String(v||"").replace(/\D/g,"").slice(0,6);
    if(digits.length<=3) return digits;
    return digits.slice(0,3)+"-"+digits.slice(3);
  }
  function attachStaticInput(el){
    if(!el||el.__cgbStatic) return;
    el.__cgbStatic=true;
    el.setAttribute("inputmode","numeric");
    el.setAttribute("maxlength","7");
    el.setAttribute("placeholder",el.getAttribute("placeholder")||"000-000");
    el.addEventListener("input",e=>{
      const start=el.selectionStart||0;
      const before=el.value;
      const digitsBeforeCursor=before.slice(0,start).replace(/\D/g,"").length;
      el.value=formatStatic(el.value);
      let pos=0,seen=0;
      while(pos<el.value.length&&seen<digitsBeforeCursor){
        if(/\d/.test(el.value[pos])) seen++;
        pos++;
      }
      try{el.setSelectionRange(pos,pos)}catch(e){}
    });
    el.addEventListener("blur",()=>{el.value=formatStatic(el.value)});
  }
  function autoAttachAll(root){
    (root||document).querySelectorAll('[data-static-input], input[name$="static"], input[id*="Static"], input[id*="static"]').forEach(attachStaticInput);
  }
  function validStatic(v){
    return /^\d{3}-\d{3}$/.test(String(v||""));
  }
  return {formatStatic,attachStaticInput,autoAttachAll,validStatic};
})();

document.addEventListener("DOMContentLoaded",()=>{
  if(window.CGB_FMT) window.CGB_FMT.autoAttachAll();
  const mo=new MutationObserver(muts=>{
    for(const m of muts){
      for(const n of m.addedNodes){
        if(n.nodeType===1&&window.CGB_FMT) window.CGB_FMT.autoAttachAll(n);
      }
    }
  });
  mo.observe(document.body,{childList:true,subtree:true});
});
