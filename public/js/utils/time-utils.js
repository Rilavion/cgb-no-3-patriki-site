window.CGB_TIME=(function(){
  const TZ="Europe/Moscow";
  const RU="ru-RU";

  function parse(v){
    if(!v) return null;
    if(v instanceof Date) return isNaN(v)?null:v;
    const d=new Date(v);
    return isNaN(d)?null:d;
  }

  function mskDateTime(v){
    const d=parse(v);if(!d) return "";
    try{return d.toLocaleString(RU,{timeZone:TZ,day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}
    catch(e){return d.toLocaleString(RU)}
  }
  function mskDate(v){
    const d=parse(v);if(!d) return "";
    try{return d.toLocaleDateString(RU,{timeZone:TZ,day:"2-digit",month:"2-digit",year:"numeric"})}
    catch(e){return d.toLocaleDateString(RU)}
  }
  function mskTime(v){
    const d=parse(v);if(!d) return "";
    try{return d.toLocaleTimeString(RU,{timeZone:TZ,hour:"2-digit",minute:"2-digit"})}
    catch(e){return d.toLocaleTimeString(RU)}
  }
  function mskShort(v){
    const d=parse(v);if(!d) return "";
    try{return d.toLocaleString(RU,{timeZone:TZ,day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}
    catch(e){return d.toLocaleString(RU)}
  }
  function mskFull(v){
    const d=parse(v);if(!d) return "";
    try{return d.toLocaleString(RU,{timeZone:TZ,day:"2-digit",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"})}
    catch(e){return d.toLocaleString(RU)}
  }

  function nowMskDate(){
    const parts=new Date().toLocaleString("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"});
    return parts;
  }
  function nowMskIsoLike(){
    const d=new Date();
    const p=new Intl.DateTimeFormat("en-GB",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).formatToParts(d);
    const g=k=>p.find(x=>x.type===k).value;
    return g("year")+"-"+g("month")+"-"+g("day")+"T"+g("hour")+":"+g("minute")+":"+g("second")+"+03:00";
  }
  function relative(v){
    const d=parse(v);if(!d) return "";
    const diff=(Date.now()-d.getTime())/1000;
    if(diff<60) return "только что";
    if(diff<3600) return Math.floor(diff/60)+" мин назад";
    if(diff<86400) return Math.floor(diff/3600)+" ч назад";
    if(diff<2592000) return Math.floor(diff/86400)+" дн назад";
    return mskDate(d);
  }

  return {mskDateTime,mskDate,mskTime,mskShort,mskFull,nowMskDate,nowMskIsoLike,relative,TZ};
})();
