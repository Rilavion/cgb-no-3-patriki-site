import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const excluded=new Set(['upd','updv2','updv3','archive','node_modules','.git']);
function walk(directory){
  if(!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
    const target=path.join(directory,entry.name);
    if(entry.isSymbolicLink()) return [];
    return entry.isDirectory()?(excluded.has(entry.name)?[]:walk(target)):[target];
  });
}

export function inspectPostgres(root){
  const files=walk(root);
  const relative=file=>path.relative(root,file).replaceAll('\\','/');
  const findings=[];
  const add=(code,message,evidence=[])=>findings.push({code,message,evidence});
  const frontend=files.filter(file=>file.startsWith(path.join(root,'public')+path.sep)&&/\.(html|js)$/.test(file)&&!file.includes(`${path.sep}vendor${path.sep}`));
  const clientNames=['database-config.js','database-loader.js','database-client.js'];
  const missingClients=clientNames.filter(name=>!frontend.some(file=>path.basename(file)===name));
  if(missingClients.length) add('PG_CLIENT_MISSING','Нет клиентского слоя PostgreSQL, описанного в документации.',missingClients);
  const supabasePages=frontend.filter(file=>file.endsWith('.html')&&/<script[^>]+src\s*=\s*["'][^"']*supabase-loader\.js/i.test(fs.readFileSync(file,'utf8')));
  if(supabasePages.length) add('LEGACY_HTML_ACTIVE','Рабочие HTML-страницы подключают загрузчик Supabase.',supabasePages.map(relative));
  const supabaseAuth=frontend.filter(file=>file.endsWith('.js')&&/\b(?:window\.)?supabase\.createClient\s*\(/.test(fs.readFileSync(file,'utf8')));
  if(supabaseAuth.length) add('LEGACY_AUTH_ACTIVE','В рабочем клиенте осталась авторизация через Supabase.',supabaseAuth.map(relative));
  const configs=frontend.filter(file=>file.endsWith('.js')&&/https:\/\/[a-z0-9-]+\.supabase\.co/.test(fs.readFileSync(file,'utf8')));
  if(configs.length) add('LEGACY_CONFIG_ACTIVE','Рабочий конфиг содержит адрес Supabase вместо автономного API.',configs.map(relative));
  const schema=files.find(file=>path.basename(file)==='01-schema.sql'&&!file.includes(`${path.sep}legacy-supabase${path.sep}`));
  const grants=files.find(file=>path.basename(file)==='02-runtime-grants.sql'&&!file.includes(`${path.sep}legacy-supabase${path.sep}`));
  if(!schema) add('PG_SCHEMA_MISSING','Отсутствует целевая схема 01-schema.sql. Legacy SQL не заменяет её.');
  if(!grants) add('PG_GRANTS_MISSING','Отсутствует 02-runtime-grants.sql для runtime-ролей.');
  const apiPackages=files.filter(file=>path.basename(file)==='package.json').filter(file=>{
    try{const dependencies=JSON.parse(fs.readFileSync(file,'utf8')).dependencies||{};return dependencies.express&&dependencies.pg}catch(e){return false}
  });
  if(!apiPackages.length) add('PG_API_MISSING','Не найден пакет серверного API Express/pg, описанного в документации.');
  const rpcNames=new Set();
  for(const file of frontend){
    const source=fs.readFileSync(file,'utf8');
    for(const match of source.matchAll(/\.rpc\(\s*["']([a-z0-9_]+)["']/gi)) rpcNames.add(match[1]);
  }
  if(schema){
    const source=fs.readFileSync(schema,'utf8');
    const functions=new Set([...source.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?"?([a-z0-9_]+)"?\s*\(/gi)].map(match=>match[1].toLowerCase()));
    const missing=[...rpcNames].filter(name=>!functions.has(name.toLowerCase()));
    if(missing.length) add('PG_RPC_MISSING','В целевой схеме не найдены определения используемых клиентом RPC.',missing.sort());
  }else{
    add('PG_RPC_UNVERIFIED','Совместимость клиентских RPC с целевой схемой проверить невозможно.',[...rpcNames].sort());
  }
  const legacySecurity=path.join(root,'database','legacy-supabase','SECURITY-HARDENING.sql');
  if(fs.existsSync(legacySecurity)) add('LEGACY_SQL_NOT_PORTABLE','Предыдущая миграция безопасности зависит от Supabase и не предназначена для автономной базы.',['database/legacy-supabase/SECURITY-HARDENING.sql']);
  return {ready:findings.filter(item=>item.code!=='LEGACY_SQL_NOT_PORTABLE').length===0,findings,apiPackages:apiPackages.map(relative),schema:schema?relative(schema):null,grants:grants?relative(grants):null,clientRpc:[...rpcNames].sort()};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const root=path.resolve(process.argv[2]||path.join(import.meta.dirname,'..'));
  const result=inspectPostgres(root);
  console.log(JSON.stringify(result,null,2));
  if(!result.ready){console.error('Проверка PostgreSQL-комплекта не пройдена. Безопасность и работоспособность серверной части не подтверждены.');process.exitCode=1}
  else console.log('Проверка состава комплекта пройдена. Это не заменяет проверку серверной авторизации, SQL и работающего API.');
}
