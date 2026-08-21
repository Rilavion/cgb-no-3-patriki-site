/* Лента последних публикаций на главной странице (hero).
   Данные берутся из Supabase через CGB_NEWS (news.js) —
   то же хранилище, что и на странице news.html. */
window.CGB_HOME_NEWS=(function(){
  "use strict";

  /* Показываем не больше трёх последних: лента всегда делит ширину
     поровну между карточками (1 — на всю строку, 2 — пополам, 3 — по третям),
     более старые публикации остаются на странице news.html. */
  const MAX_ITEMS=3;

  function track(){return document.getElementById("heroNewsTrack")}

  function hint(text){
    const el=track();if(!el) return;
    el.dataset.count="0";
    el.innerHTML='<span class="hvn-hint">'+text+"</span>";
  }

  function cardHtml(n){
    const N=window.CGB_NEWS;
    const tag=N&&N.tagInfo?N.tagInfo(n.tag):{label:"Новость",cls:"tag-news"};
    const dept=N&&N.deptInfo?N.deptInfo(n.dept):{label:"Общее",cls:"dept-general"};
    const date=N&&N.fmt?N.fmt(n.date):String(n.date||"");
    const esc=N&&N.esc?N.esc:function(s){return String(s==null?"":s)};
    const title=esc(n.title);
    const excerpt=n.excerpt?'<span class="hvn-card-excerpt">'+esc(n.excerpt)+'</span>':"";
    const img=N&&N.firstImage?N.firstImage(n):(n.image||"");
    const media=img
      ?'<span class="hvn-card-media"><img src="'+esc(img)+'" alt="" loading="lazy"></span>'
      :"";
    return '<button type="button" class="hvn-card" data-news-id="'+esc(String(n.id))+'">'
      +media
      +'<span class="hvn-card-main">'
      +'<span class="hvn-card-top"><span class="hvn-tag '+tag.cls+'">'+tag.label+'</span>'
      +'<span class="hvn-dept">'+dept.label+'</span></span>'
      +'<span class="hvn-card-title">'+title+'</span>'
      +excerpt
      +'<span class="hvn-card-foot"><span class="hvn-date">'+date+'</span>'
      +'<span class="hvn-arrow" aria-hidden="true">→</span></span>'
      +'</span>'
      +'</button>';
  }

  function render(items){
    const el=track();if(!el) return;
    if(!items||!items.length){
      hint("Публикаций пока нет · загляните позже");
      return;
    }
    const shown=items.slice(0,MAX_ITEMS);
    el.dataset.count=String(shown.length);
    el.innerHTML=shown.map(cardHtml).join("");
    el.querySelectorAll(".hvn-card").forEach(card=>{
      card.addEventListener("click",()=>{
        const item=items.find(x=>String(x.id)===card.dataset.newsId);
        if(!item) return;
        if(window.CGB_NEWS_READER&&window.CGB_NEWS_READER.open){
          window.CGB_NEWS_READER.open(item,{});
        }else{
          location.href="news.html#news-"+encodeURIComponent(item.id);
        }
      });
    });
    /* обновляем поисковый индекс, чтобы новости с главной находились и через поиск */
    if(window.CGB_SEARCH&&window.CGB_SEARCH.invalidate) window.CGB_SEARCH.invalidate();
  }

  async function load(){
    if(!track()) return;
    hint("Загружаем публикации…");
    try{
      const items=await window.CGB_NEWS.fetchNews(MAX_ITEMS);
      render(items);
    }catch(e){
      console.warn("[CGB_HOME_NEWS]",e&&e.message?e.message:e);
      hint("Не удалось загрузить новости · попробуйте позже");
    }
  }

  function init(){
    if(!track()) return;
    load();
    /* Страховка от медленной инициализации Supabase:
       если при первой попытке записей не получили, а клиент появился позже — пробуем ещё раз. */
    if(window.CGB_AUTH&&window.CGB_AUTH.onChange){
      window.CGB_AUTH.onChange(state=>{
        if(state&&state.ready&&state.available&&state.client&&lastEmpty) load();
      });
    }
  }

  let lastEmpty=false;
  const _render=render;
  render=function(items){
    lastEmpty=!items||!items.length;
    _render(items);
  };

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init);
  else init();

  return {reload:load};
})();
