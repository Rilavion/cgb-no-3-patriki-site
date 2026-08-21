window.CGB_AUTOPARK=(function(){
  function client(){return window.CGB_AUTH&&window.CGB_AUTH.state&&window.CGB_AUTH.state.client}
  async function uploadPhoto(file){
    const c=client();if(!c) return {ok:false,error:"no client"};
    if(!file) return {ok:false,error:"no file"};
    if(file.size>10*1024*1024) return {ok:false,error:"Файл больше 10 МБ."};
    if(window.CGB_IMG&&window.CGB_IMG.compress){
      file=await window.CGB_IMG.compress(file,{maxW:1200,maxH:900,quality:0.82});
    }
    const ext=(file.name.match(/\.([a-z0-9]+)$/i)||[])[1]||"webp";
    const path="veh_"+Date.now()+"_"+Math.random().toString(36).slice(2,8)+"."+ext.toLowerCase();
    try{
      const {error}=await c.storage.from("autopark-photos").upload(path,file,{contentType:file.type||undefined,upsert:false});
      if(error) return {ok:false,error:error.message};
      const {data:pub}=c.storage.from("autopark-photos").getPublicUrl(path);
      return {ok:true,url:pub.publicUrl,path};
    }catch(e){return {ok:false,error:e.message}}
  }
  function imageStyle(v){
    if(!v) return "";
    const z=Number(v.image_zoom)||1;
    const x=Number(v.image_x!=null?v.image_x:50);
    const y=Number(v.image_y!=null?v.image_y:50);
    const size=(100*z).toFixed(2);
    const leftShift=((100-100*z)*(x/100)).toFixed(2);
    const topShift=((100-100*z)*(y/100)).toFixed(2);
    return `position:absolute;width:${size}%;height:${size}%;left:${leftShift}%;top:${topShift}%;object-fit:cover`;
  }
  return {uploadPhoto,imageStyle};
})();
