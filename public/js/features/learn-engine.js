window.CGB_LEARN=(function(){
  function waitReady(){
    if(window.CGB_AUTH&&window.CGB_AUTH.whenReady) return window.CGB_AUTH.whenReady(8000);
    return new Promise(resolve=>{
    const deadline=Date.now()+5000;
    function ck(){const s=window.CGB_AUTH&&window.CGB_AUTH.state;if(s&&s.ready){resolve(s);return true}return false}
    if(ck()) return;
    const t=setInterval(()=>{if(ck()){clearInterval(t)}else if(Date.now()>deadline){clearInterval(t);resolve(null)}},80);
    });
  }
  async function client(){
    await waitReady();
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    return s&&s.client?s.client:null;
  }

  async function fetchAll(){
    const c=await client();if(!c) return [];
    const {data,error}=await c.from("learn_materials").select("*").order("category",{ascending:true,nullsFirst:true}).order("sort",{ascending:true}).order("created_at",{ascending:false});
    if(error){console.warn("[LEARN]",error.message);return []}
    return data||[];
  }
  async function save(row){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const s=window.CGB_AUTH&&window.CGB_AUTH.state;
    const name=(function(){try{return localStorage.getItem("cgb-my-display-name")||(s&&s.user&&s.user.email)||"admin"}catch(e){return "admin"}})();
    if(!row.id){
      row.created_by=s&&s.user?s.user.id:null;
      row.created_by_name=name;
    }
    row.updated_at=new Date().toISOString();
    const {data,error}=await c.from("learn_materials").upsert(row).select().single();
    if(error) return {ok:false,error:error.message};
    return {ok:true,row:data};
  }
  async function remove(id){
    const c=await client();if(!c) return {ok:false,error:"no client"};
    const {error}=await c.from("learn_materials").delete().eq("id",id);
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }

  function detectKind(url){
    const s=String(url||"").toLowerCase();
    if(/\.(jpg|jpeg|png|webp|gif|svg)($|\?)/.test(s)) return "image";
    if(/youtube\.com|youtu\.be|rutube\.ru|vimeo\.com|\.mp4($|\?)|\.webm($|\?)/.test(s)) return "video";
    if(/docs\.google\.com\/presentation|\.pptx?($|\?)/.test(s)) return "presentation";
    if(/\.(pdf|docx?|xlsx?|txt)($|\?)/.test(s)||/docs\.google\.com\/document/.test(s)) return "document";
    return "link";
  }
  function embedUrl(url,kind){
    const s=String(url||"");
    const ytM=s.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,20})/);
    if(ytM) return "https://www.youtube.com/embed/"+ytM[1];
    const rtM=s.match(/rutube\.ru\/(?:video|play\/embed)\/([\w-]+)/);
    if(rtM) return "https://rutube.ru/play/embed/"+rtM[1];
    const gpM=s.match(/docs\.google\.com\/presentation\/d\/([\w-]+)/);
    if(gpM) return "https://docs.google.com/presentation/d/"+gpM[1]+"/embed?start=false";
    const gdM=s.match(/docs\.google\.com\/document\/d\/([\w-]+)/);
    if(gdM) return "https://docs.google.com/document/d/"+gdM[1]+"/preview";
    const gdrM=s.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
    if(gdrM) return "https://drive.google.com/file/d/"+gdrM[1]+"/preview";
    const ydM=s.match(/disk\.yandex\.[a-z]+\/i\/([\w-]+)/);
    if(ydM) return "https://disk.yandex.ru/i/"+ydM[1]+"?embed=1";
    return url;
  }

  return {fetchAll,save,remove,detectKind,embedUrl};
})();
