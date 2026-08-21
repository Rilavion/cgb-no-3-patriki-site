window.CGB_IMG=(function(){
  const MAX_W=800;
  const MAX_H=800;
  const QUALITY=0.82;

  async function compress(file,opts){
    if(!file||!file.type||file.type.indexOf("image/")!==0) return file;
    if(file.type==="image/svg+xml") return file;
    if(file.size<80*1024) return file;
    const maxW=(opts&&opts.maxW)||MAX_W;
    const maxH=(opts&&opts.maxH)||MAX_H;
    const q=(opts&&opts.quality)||QUALITY;
    try{
      const img=await loadImage(file);
      let {width:w,height:h}=img;
      const ratio=Math.min(maxW/w,maxH/h,1);
      w=Math.round(w*ratio);h=Math.round(h*ratio);
      const canvas=document.createElement("canvas");
      canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext("2d");
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
      ctx.drawImage(img,0,0,w,h);
      const blob=await new Promise(res=>canvas.toBlob(res,"image/webp",q));
      if(!blob) return file;
      if(blob.size>=file.size) return file;
      const name=(file.name||"image").replace(/\.[^.]+$/,"")+".webp";
      const compressed=new File([blob],name,{type:"image/webp",lastModified:Date.now()});
      console.log("[IMG] сжато:",file.name,"→",(file.size/1024).toFixed(0)+"KB → "+(compressed.size/1024).toFixed(0)+"KB");
      return compressed;
    }catch(e){console.warn("[IMG] compress err:",e.message);return file}
  }

  function loadImage(file){
    return new Promise((resolve,reject)=>{
      const img=new Image();
      const url=URL.createObjectURL(file);
      img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
      img.onerror=e=>{URL.revokeObjectURL(url);reject(e)};
      img.src=url;
    });
  }

  return {compress};
})();
