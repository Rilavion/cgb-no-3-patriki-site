import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root=path.resolve(import.meta.dirname,"..");
const publicDir=path.join(root,"public");
const errors=[];
const warnings=[];

function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const full=path.join(dir,entry.name);
    return entry.isDirectory()?walk(full):[full];
  });
}

function localTarget(value,sourceFile){
  const clean=String(value||"").trim().split("#")[0].split("?")[0];
  if(!clean||clean.includes("$")||/^(?:[a-z]+:|#|\/\/)/i.test(clean)||clean.startsWith("/api/")||clean.startsWith("/media/")) return null;
  return clean.startsWith("/")?path.join(publicDir,clean.slice(1)):path.resolve(path.dirname(sourceFile),clean);
}

const files=walk(publicDir);
const htmlFiles=files.filter(file=>file.endsWith(".html"));
const jsFiles=files.filter(file=>file.endsWith(".js")&&!file.includes(`${path.sep}vendor${path.sep}`));

for(const file of htmlFiles){
  const source=fs.readFileSync(file,"utf8");
  const seen=new Set();
  for(const match of source.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)){
    const target=localTarget(match[1],file);
    if(target&&!fs.existsSync(target)){
      const cleanUrl=String(match[1]).split("#")[0].split("?")[0];
      const cleanRoute=!path.extname(cleanUrl)&&fs.existsSync(`${target}.html`);
      if(!cleanRoute) errors.push(`${path.relative(root,file)}: отсутствует ${match[1]}`);
    }
    if(/^assets\/js\//.test(match[1])){
      if(seen.has(match[1])) warnings.push(`${path.relative(root,file)}: скрипт подключён дважды: ${match[1]}`);
      seen.add(match[1]);
    }
  }
  let inlineIndex=0;
  for(const match of source.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi)){
    inlineIndex++;
    if(/type\s*=\s*["']application\/(?:json|ld\+json)["']/i.test(match[1])) continue;
    try{new vm.Script(match[2],{filename:`${file}:inline-${inlineIndex}`})}
    catch(error){errors.push(`${path.relative(root,file)}: ошибка inline-JS #${inlineIndex}: ${error.message}`)}
  }
}

for(const file of jsFiles){
  try{new vm.Script(fs.readFileSync(file,"utf8"),{filename:file})}
  catch(error){errors.push(`${path.relative(root,file)}: ошибка JavaScript: ${error.message}`)}
}

if(htmlFiles.length!==45) warnings.push(`ожидалось 45 рабочих HTML-страниц, найдено ${htmlFiles.length}`);

for(const warning of warnings) console.warn(`WARN ${warning}`);
if(errors.length){
  for(const error of errors) console.error(`ERROR ${error}`);
  console.error(`\nПроверка не пройдена: ошибок ${errors.length}, предупреждений ${warnings.length}.`);
  process.exit(1);
}
console.log(`Проверка пройдена: HTML ${htmlFiles.length}, JavaScript ${jsFiles.length}, предупреждений ${warnings.length}.`);
