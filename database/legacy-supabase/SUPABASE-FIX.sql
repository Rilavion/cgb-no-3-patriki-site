-- =====================================================================
-- SUPABASE-FIX.sql — ЕДИНЫЙ РЕМОНТНЫЙ СКРИПТ ЦГБ №3
-- Запуск: Supabase Dashboard → SQL Editor → New query → вставить → Run.
-- Безопасен для повторного запуска (всё через IF NOT EXISTS / OR REPLACE).
--
-- Чинит сразу всё:
--  • custom_roles:   добавляет недостающие колонки, включая id и updated_at
--                    (ошибки "column cr.id does not exist" и
--                     "column updated_at of relation custom_roles...")
--  • site_data:      таблица + функция can_edit_site_data + политики
--  • системные роли: Старший состав / Оператор АБ / Оператор ОРП
--  • ds_members / ds_roles / ds_sync_requests — колонки для Discord-бота
--                    (ошибки "Could not find the 'global_name' column
--                     of ds_members", 'updated_at' of ds_roles и т.п.)
--  • чтение ds_members/ds_roles анонимным ключом (нужно автоподстановке
--    ФИО в формах и поиску по сотрудникам)
-- =====================================================================

create extension if not exists pgcrypto;

-- =====================================================================
-- 1. РОЛИ: таблицы user_roles / custom_roles
-- =====================================================================

-- Проверка «вызывающий — админ» (security definer — не рекурсирует в RLS).
-- Создаём первой: ниже на неё завязаны политики.
create or replace function public.is_admin()
returns boolean
language sql security definer stable set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id = auth.uid() and role = 'admin');
$$;
grant execute on function public.is_admin() to anon, authenticated;

create table if not exists public.user_roles (
  user_id uuid primary key,
  role text,
  display_name text,
  custom_role_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_roles add column if not exists display_name text;
alter table public.user_roles add column if not exists custom_role_id uuid;
alter table public.user_roles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.custom_roles (
  id uuid primary key default gen_random_uuid(),
  key text unique,
  base_role text,
  name text,
  description text,
  color text,
  permissions jsonb not null default '{}'::jsonb,
  default_perms jsonb not null default '{}'::jsonb,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- если таблица уже существовала со старым набором полей — достраиваем
alter table public.custom_roles add column if not exists id uuid;
alter table public.custom_roles add column if not exists key text;
alter table public.custom_roles add column if not exists base_role text;
alter table public.custom_roles add column if not exists name text;
alter table public.custom_roles add column if not exists description text;
alter table public.custom_roles add column if not exists color text;
alter table public.custom_roles add column if not exists permissions jsonb not null default '{}'::jsonb;
alter table public.custom_roles add column if not exists default_perms jsonb not null default '{}'::jsonb;
alter table public.custom_roles add column if not exists sort integer not null default 0;
alter table public.custom_roles add column if not exists updated_at timestamptz not null default now();
-- id нужен заполненным и уникальным (на него ссылается user_roles.custom_role_id)
update public.custom_roles set id = gen_random_uuid() where id is null;
alter table public.custom_roles alter column id set default gen_random_uuid();
create unique index if not exists custom_roles_id_uidx on public.custom_roles(id);
create unique index if not exists custom_roles_key_uidx on public.custom_roles(key);

alter table public.user_roles enable row level security;
drop policy if exists ur_select on public.user_roles;
create policy ur_select on public.user_roles
  for select to authenticated using (true);
drop policy if exists ur_admin_delete on public.user_roles;
create policy ur_admin_delete on public.user_roles
  for delete to authenticated using (public.is_admin());

alter table public.custom_roles enable row level security;
drop policy if exists cr_select on public.custom_roles;
create policy cr_select on public.custom_roles
  for select to authenticated using (true);
drop policy if exists cr_admin_write on public.custom_roles;
create policy cr_admin_write on public.custom_roles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- 2. СИСТЕМНЫЕ РОЛИ (создаются/обновляются; удалить нельзя)
-- =====================================================================

insert into public.custom_roles (key, base_role, name, description, color, permissions, default_perms, sort)
values
('ss','ss','Старший состав',
 'Доступ ко всем служебным разделам без настроек',
 '#0891b2',
 '{
   "apps":{"view":true,"edit":true},
   "vp":{"view":true,"edit":true},
   "vp_archive":{"view":true,"edit":true,"send":true},
   "tests":{"view":true,"edit":true,"create":true,"stats":true,"reset_attempts":true},
   "supply":{"view":true,"stats":true,"replace":true},
   "docs":{"view":true},
   "info":{"edit":true},
   "composition":{"view":true},
   "autopark":{"edit":true},
   "faq":{"edit":true},
   "training":{"edit":true},
   "learn":{"view":true,"edit":true},
   "news":{"view":true,"edit":true,"create":true}
 }'::jsonb,'{}'::jsonb,10),
('ab_operator','ss','Оператор АБ',
 'Оператор Администрации Больницы. Проверки АБ и архив проверок',
 '#7c3aed',
 '{
   "vp":{"view":true,"edit":true},
   "vp_archive":{"view":true,"edit":true,"send":true},
   "docs":{"view":true},
   "learn":{"view":true},
   "news":{"view":true}
 }'::jsonb,'{}'::jsonb,20),
('orp_operator','ss','Оператор ОРП',
 'Оператор Отдела по Работе с Персоналом. Заявления, тесты, FAQ и обучение',
 '#2563eb',
 '{
   "apps":{"view":true,"edit":true},
   "tests":{"view":true,"edit":true,"create":true,"stats":true,"reset_attempts":true},
   "docs":{"view":true},
   "faq":{"edit":true},
   "training":{"edit":true},
   "learn":{"view":true},
   "news":{"view":true}
 }'::jsonb,'{}'::jsonb,30)
on conflict (key) do update set
  name=excluded.name, description=excluded.description, color=excluded.color,
  base_role=excluded.base_role, permissions=excluded.permissions,
  sort=excluded.sort, updated_at=now();

-- =====================================================================
-- 3. site_data (контент страниц «Услуги» / «Медикаменты»)
-- =====================================================================

create table if not exists public.site_data (
  key text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
grant select on public.site_data to anon;
grant select, insert, update, delete on public.site_data to authenticated;

create or replace function public.can_edit_site_data(row_key text)
returns boolean
language sql security definer stable set search_path = public as $$
  select exists(
    select 1
    from public.user_roles ur
    left join public.custom_roles cr
      on cr.id = ur.custom_role_id or cr.key = ur.role
    where ur.user_id = auth.uid()
      and (
        ur.role = 'admin'
        or coalesce(cr.permissions->'site'->>'edit', 'false') = 'true'
        or coalesce(cr.permissions->replace(row_key, '_page', '')->>'edit', 'false') = 'true'
        or coalesce(cr.permissions->row_key->>'edit', 'false') = 'true'
      )
  );
$$;
grant execute on function public.can_edit_site_data(text) to authenticated;

alter table public.site_data enable row level security;
drop policy if exists sd_select on public.site_data;
create policy sd_select on public.site_data
  for select to anon, authenticated using (true);
drop policy if exists sd_write on public.site_data;
create policy sd_write on public.site_data
  for all to authenticated
  using (public.can_edit_site_data(key))
  with check (public.can_edit_site_data(key));

-- =====================================================================
-- 4. DISCORD-БОТ: ds_roles / ds_members / ds_sync_requests
--    Достраиваем колонки, которые пишет бот (бот и сам умеет пропускать
--    отсутствующие, но для полных данных лучше выполнить этот блок).
-- =====================================================================

create table if not exists public.ds_roles (
  role_id text primary key,
  name text,
  color integer,
  position integer,
  synced_at timestamptz not null default now()
);
alter table public.ds_roles add column if not exists name text;
alter table public.ds_roles add column if not exists color integer;
alter table public.ds_roles add column if not exists position integer;
alter table public.ds_roles add column if not exists synced_at timestamptz not null default now();
alter table public.ds_roles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.ds_members (
  discord_id text primary key,
  display_name text,
  raw_nick text,
  parsed_fio text,
  parsed_static text,
  parsed_dept text,
  role_ids jsonb not null default '[]'::jsonb,
  role_names jsonb not null default '[]'::jsonb,
  avatar_url text,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.ds_members add column if not exists username text;
alter table public.ds_members add column if not exists global_name text;
alter table public.ds_members add column if not exists display_name text;
alter table public.ds_members add column if not exists raw_nick text;
alter table public.ds_members add column if not exists parsed_fio text;
alter table public.ds_members add column if not exists parsed_static text;
alter table public.ds_members add column if not exists parsed_dept text;
alter table public.ds_members add column if not exists avatar_url text;
alter table public.ds_members add column if not exists role_ids jsonb not null default '[]'::jsonb;
alter table public.ds_members add column if not exists role_names jsonb not null default '[]'::jsonb;
alter table public.ds_members add column if not exists is_bot boolean not null default false;
alter table public.ds_members add column if not exists joined_at timestamptz;
alter table public.ds_members add column if not exists last_seen timestamptz;
alter table public.ds_members add column if not exists active boolean not null default true;
alter table public.ds_members add column if not exists updated_at timestamptz not null default now();
alter table public.ds_members add column if not exists created_at timestamptz not null default now();
create index if not exists ds_members_fio_idx on public.ds_members (parsed_fio);

create table if not exists public.ds_sync_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid,
  requested_by_name text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
alter table public.ds_sync_requests add column if not exists requested_by uuid;
alter table public.ds_sync_requests add column if not exists requested_by_name text;
alter table public.ds_sync_requests add column if not exists status text not null default 'pending';
alter table public.ds_sync_requests add column if not exists message text;
alter table public.ds_sync_requests add column if not exists members_scanned integer;
alter table public.ds_sync_requests add column if not exists finished_at timestamptz;
alter table public.ds_sync_requests add column if not exists processed_at timestamptz;

-- realtime для таблицы запросов синхронизации (сайт → бот).
-- Ошибка «уже в публикации» игнорируется.
do $$
begin
  alter publication supabase_realtime add table public.ds_sync_requests;
exception when others then null;
end $$;

-- Чтение состава доступно сайту даже без входа (автоподстановка ФИО,
-- поиск по сотрудникам). Запись — только бот (service role, минуя RLS).
grant select on public.ds_members to anon, authenticated;
grant select on public.ds_roles to anon, authenticated;
grant select, insert, update on public.ds_sync_requests to authenticated;

alter table public.ds_members enable row level security;
drop policy if exists ds_members_read on public.ds_members;
create policy ds_members_read on public.ds_members
  for select to anon, authenticated using (true);

alter table public.ds_roles enable row level security;
drop policy if exists ds_roles_read on public.ds_roles;
create policy ds_roles_read on public.ds_roles
  for select to anon, authenticated using (true);

alter table public.ds_sync_requests enable row level security;
drop policy if exists dsr_insert on public.ds_sync_requests;
create policy dsr_insert on public.ds_sync_requests
  for insert to authenticated with check (true);
drop policy if exists dsr_select on public.ds_sync_requests;
create policy dsr_select on public.ds_sync_requests
  for select to authenticated using (true);

-- =====================================================================
-- ГОТОВО. Что дальше:
--  1) Перезапусти бота (Ctrl+C → npm start) — в логе VP-SYNC должно
--     появиться «done, N members upserted» без ошибок.
--  2) Нажми кнопку синхронизации состава на сайте (Проверки АБ) или
--     просто подожди 5 минут — состав перезальётся в новом формате.
--  3) Открой любую форму (отпуск и т.п.) и начни вводить фамилию —
--     появится подсказка «Должность | ФИО | Статик».
-- =====================================================================

begin;

revoke create on schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon;
alter default privileges in schema public revoke all on sequences from public, anon;

alter table public.test_questions add column if not exists kind text;
alter table public.test_questions add column if not exists text text;
alter table public.test_questions add column if not exists images jsonb not null default '[]'::jsonb;
alter table public.test_questions add column if not exists option_images jsonb not null default '[]'::jsonb;
alter table public.test_questions add column if not exists prefilled_value text;
update public.test_questions set kind=coalesce(to_jsonb(test_questions)->>'type','single') where kind is null;
update public.test_questions set text=coalesce(to_jsonb(test_questions)->>'prompt','') where text is null;
update public.test_questions set images=jsonb_build_array(to_jsonb(test_questions)->>'image_url')
  where images='[]'::jsonb and nullif(to_jsonb(test_questions)->>'image_url','') is not null;
alter table public.test_categories add column if not exists name text;
update public.test_categories set name=coalesce(to_jsonb(test_categories)->>'title','') where name is null;
alter table public.test_blocks add column if not exists kind text;
update public.test_blocks set kind=case when value ~ '^[0-9]{3}-[0-9]{3}$' then 'static' else 'discord' end where kind is null;

do $$
declare r record;
begin
  for r in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('v','m','f') loop
    execute format('revoke all on public.%I from public, anon, authenticated',r.relname);
  end loop;
end;
$$;

create or replace function public.cgb_security_can(p_section text, p_action text)
returns boolean language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select auth.uid() is not null and exists (
    select 1 from public.user_roles ur
    left join public.custom_roles cr on
      (ur.custom_role_id is not null and cr.id = ur.custom_role_id)
      or (ur.custom_role_id is null and cr.key = ur.role)
    where ur.user_id = auth.uid() and
      (ur.role = 'admin' or cr.permissions #> array[p_section, p_action] = 'true'::jsonb)
  );
$$;

create or replace function public.can_edit_site_data(row_key text)
returns boolean language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select public.cgb_security_can('site', 'edit')
    or public.cgb_security_can(regexp_replace(row_key, '_page$', ''), 'edit');
$$;

create or replace function public.cgb_security_access(p_table text, p_operation text)
returns boolean language plpgsql stable security definer set search_path = pg_catalog, public, pg_temp as $$
declare
  v_section text;
  v_action text;
begin
  if p_operation = 'select' and p_table = any(array[
    'news','faq','info_page','site_data','ustavy','composition','vehicles','holiday_state',
    'train_categories','train_lessons','test_categories','test_ping_lines',
    'request_forms','complaint_form','supply_form'
  ]) then return true; end if;
  if public.cgb_security_can('lk','roles') and p_table = 'custom_roles' and p_operation = 'select' then return true; end if;
  if public.is_admin() then
    return p_table <> 'cgb_test_runs' and p_table <> 'cgb_submission_limits';
  end if;
  case
    when p_table = 'applications' then v_section := 'apps';
    when p_table = 'apps_settings' then v_section := 'apps'; v_action := 'edit';
    when p_table in ('complaints','complaint_history') then v_section := 'complaints'; v_action := 'review';
    when p_table = 'complaint_form' then v_section := 'complaints'; v_action := 'form_edit';
    when p_table in ('violations_registry','violations_history') then v_section := 'registry';
    when p_table = 'violations_settings' then v_section := 'complaints'; v_action := 'settings';
    when p_table = 'requests' then v_section := 'requests'; v_action := 'review';
    when p_table in ('request_forms','requests_settings') then v_section := 'requests'; v_action := 'settings';
    when p_table in ('vp_checks','vp_reports') then v_section := 'vp';
    when p_table in ('vp_settings','vp_role_mapping') then v_section := 'vp'; v_action := 'settings';
    when p_table = 'vp_archive' then v_section := 'vp_archive';
    when p_table = 'vp_report_requests' then v_section := 'vp_archive'; v_action := 'send';
    when p_table = 'vp_request_forms' then v_section := 'vp_request'; v_action := 'settings';
    when p_table = 'report_forms' then v_section := 'report'; v_action := 'settings';
    when p_table = 'report_send_requests' then v_section := 'report'; v_action := 'submit';
    when p_table in ('payroll_drafts','payroll_archive') then v_section := 'payroll';
    when p_table = 'payroll_settings' then v_section := 'payroll'; v_action := 'settings';
    when p_table = 'payroll_send_requests' then v_section := 'payroll'; v_action := 'send';
    when p_table = 'supply_form' then v_section := 'supply'; v_action := 'admin';
    when p_table in ('supply_entries','supply_requests') then v_section := 'supply'; v_action := 'replace';
    when p_table = 'supply_rescan_requests' then v_section := 'supply'; v_action := 'admin';
    when p_table in ('tests','test_questions','test_categories','test_ping_lines') then v_section := 'tests';
    when p_table = 'test_attempts' then v_section := 'tests'; v_action := 'edit';
    when p_table = 'test_blocks' then v_section := 'tests'; v_action := 'reset_attempts';
    when p_table = 'test_result_requests' then v_section := 'tests'; v_action := 'edit';
    when p_table = 'news' then v_section := 'news';
    when p_table = 'faq' then v_section := 'faq';
    when p_table = 'info_page' then v_section := 'info';
    when p_table = 'ustavy' then v_section := 'ustav';
    when p_table = 'composition' then v_section := 'composition';
    when p_table = 'vehicles' then v_section := 'autopark';
    when p_table = 'learn_materials' then v_section := 'learn';
    when p_table in ('train_categories','train_lessons') then v_section := 'training';
    when p_table = 'ds_sync_requests' then v_section := 'vp'; v_action := 'edit';
    when p_table in ('ds_members','ds_roles','ds_channels','ds_guild_roles','bot_status','raids_events') then
      if p_operation <> 'select' then return false; end if;
      return public.cgb_security_can('vp','view') or public.cgb_security_can('apps','view')
        or public.cgb_security_can('complaints','review') or public.cgb_security_can('requests','review')
        or public.cgb_security_can('payroll','view') or public.cgb_security_can('supply','view')
        or public.cgb_security_can('tests','stats') or public.cgb_security_can('report','submit')
        or public.cgb_security_can('vp_request','submit');
    else return false;
  end case;
  if p_operation = 'select' then
    return public.cgb_security_can(v_section,'view')
      or (v_action is not null and public.cgb_security_can(v_section,v_action))
      or (v_section = 'tests' and public.cgb_security_can('tests','stats'));
  end if;
  if p_table = 'test_attempts' and p_operation = 'insert' then return false; end if;
  if p_table = 'test_attempts' and p_operation = 'delete' then v_action := 'reset_attempts'; end if;
  if p_table in ('complaint_history','violations_history') and p_operation <> 'insert' then return false; end if;
  if v_action is null then
    v_action := case p_operation when 'insert' then 'edit' when 'delete' then 'delete' else 'edit' end;
    if p_table in ('tests','news') and p_operation = 'insert' then v_action := 'create'; end if;
    if p_table = 'violations_registry' then
      v_action := case p_operation when 'insert' then 'add' when 'delete' then 'remove' else 'edit' end;
    end if;
  end if;
  return public.cgb_security_can(v_section,v_action);
end;
$$;

do $$
declare t record; p record; op text; expr text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
    execute format('revoke all on public.%I from public, anon, authenticated', t.tablename);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t.tablename loop
      execute format('drop policy %I on public.%I', p.policyname, t.tablename);
    end loop;
    execute format('grant select on public.%I to anon, authenticated', t.tablename);
    execute format('grant insert, update, delete on public.%I to authenticated', t.tablename);
    foreach op in array array['select','insert','update','delete'] loop
      expr := format('public.cgb_security_access(%L,%L)', t.tablename, op);
      if t.tablename = 'user_roles' then
        expr := case when op = 'select' then '(user_id = auth.uid() or public.is_admin())' else 'public.is_admin()' end;
      elsif t.tablename = 'custom_roles' then
        expr := case when op = 'select' then '(auth.uid() is not null)' else 'public.is_admin()' end;
      elsif t.tablename = 'site_data' and op <> 'select' then
        expr := 'public.can_edit_site_data(key)';
      elsif t.tablename = 'tests' and op = 'select' then
        expr := '(published or public.cgb_security_can(''tests'',''edit'') or public.cgb_security_can(''tests'',''create'') or public.cgb_security_can(''tests'',''stats''))';
      elsif t.tablename = 'test_questions' and op = 'select' then
        expr := '(public.cgb_security_can(''tests'',''edit'') or public.cgb_security_can(''tests'',''create'') or public.cgb_security_can(''tests'',''stats''))';
      elsif t.tablename = 'test_attempts' and op = 'select' then
        expr := '(public.cgb_security_can(''tests'',''edit'') or public.cgb_security_can(''tests'',''stats''))';
      elsif t.tablename = 'vp_request_forms' and op = 'select' then
        expr := '(public.cgb_security_can(''vp_request'',''submit'') or public.cgb_security_can(''vp_request'',''settings''))';
      elsif t.tablename = 'violations_registry' then
        if op = 'select' then
          expr := format('(%s or public.cgb_security_can(''vp_request'',''review'') or (public.cgb_security_can(''vp_request'',''submit'') and requested_by_uid=auth.uid()))',expr);
        elsif op = 'insert' then
          expr := format('(%s or (public.cgb_security_can(''vp_request'',''submit'') and status=''pending'' and requested_by_uid=auth.uid() and issued_by_uid=auth.uid() and reviewed_at is null and reviewed_by_uid is null and removed_at is null and removed_by_uid is null and complaint_id is null and expires_at is null))',expr);
        elsif op = 'update' then
          expr := format('(%s or public.cgb_security_can(''vp_request'',''review''))',expr);
        end if;
      end if;
      if op = 'insert' then
        execute format('create policy cgb_allow_%s on public.%I for insert to authenticated with check (%s)',op,t.tablename,expr);
        execute format('create policy cgb_guard_%s on public.%I as restrictive for insert to authenticated with check (%s)',op,t.tablename,expr);
      elsif op = 'update' then
        execute format('create policy cgb_allow_%s on public.%I for update to authenticated using (%s) with check (%s)',op,t.tablename,expr,expr);
        execute format('create policy cgb_guard_%s on public.%I as restrictive for update to authenticated using (%s) with check (%s)',op,t.tablename,expr,expr);
      else
        execute format('create policy cgb_allow_%s on public.%I for %s to anon, authenticated using (%s)',op,t.tablename,op,expr);
        execute format('create policy cgb_guard_%s on public.%I as restrictive for %s to anon, authenticated using (%s)',op,t.tablename,op,expr);
      end if;
    end loop;
  end loop;
end;
$$;

create or replace function public.cgb_stamp_actor()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare payload jsonb; previous jsonb; field text; label text; actor_name text;
begin
  if auth.uid() is null or current_user='service_role' or coalesce(current_setting('request.jwt.claim.role',true),'')='service_role' then return new; end if;
  payload:=to_jsonb(new);
  previous:=case when tg_op='UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  select coalesce(display_name,'') into actor_name from public.user_roles where user_id=auth.uid();
  foreach field in array array['created_by','updated_by','requested_by','sent_by','reviewed_by','blocked_by','responded_by',
    'issued_by_uid','requested_by_uid','reviewed_by_uid','removed_by_uid','verdict_by_uid','changed_by_uid','checked_by_uid'] loop
    label:=regexp_replace(field,'_uid$','')||'_name';
    if payload ? field and ((tg_op='INSERT' and payload->field<>'null'::jsonb)
      or (tg_op='UPDATE' and (payload->field is distinct from previous->field
        or (payload ? label and payload->label is distinct from previous->label)))) then
      payload:=jsonb_set(payload,array[field],to_jsonb(auth.uid()));
      if payload ? label then payload:=jsonb_set(payload,array[label],to_jsonb(coalesce(actor_name,''))); end if;
    end if;
  end loop;
  if payload ? 'updated_at' then payload:=jsonb_set(payload,'{updated_at}',to_jsonb(now())); end if;
  if tg_op='INSERT' and payload ? 'created_at' then payload:=jsonb_set(payload,'{created_at}',to_jsonb(now())); end if;
  new:=jsonb_populate_record(new,payload);
  return new;
end;
$$;

do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname='public'
    and tablename not in ('user_roles','custom_roles','cgb_test_runs','cgb_submission_limits') loop
    execute format('drop trigger if exists cgb_stamp_actor on public.%I',t.tablename);
    execute format('create trigger cgb_stamp_actor before insert or update on public.%I for each row execute function public.cgb_stamp_actor()',t.tablename);
  end loop;
end;
$$;

create table if not exists public.cgb_test_runs (
  token uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  user_id uuid,
  fio text not null,
  static_id text not null,
  discord text not null,
  questions jsonb not null,
  pass_score integer not null,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  attempt_id uuid references public.test_attempts(id) on delete cascade
);
alter table public.cgb_test_runs enable row level security;
revoke all on public.cgb_test_runs from public, anon, authenticated;
create index if not exists cgb_test_runs_identity_idx on public.cgb_test_runs(test_id,lower(static_id),lower(discord));

create table if not exists public.cgb_submission_limits (
  key text primary key,
  last_at timestamptz not null,
  day date not null,
  count integer not null
);
alter table public.cgb_submission_limits enable row level security;
revoke all on public.cgb_submission_limits from public, anon, authenticated;

create or replace function public.cgb_validate_submission(p_scope text,p_values jsonb,p_fio text,p_static text,p_discord text)
returns void language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_key text; v_last timestamptz; v_day date; v_count integer;
begin
  if p_values is null or jsonb_typeof(p_values)<>'object' or octet_length(p_values::text)>65536
    or nullif(btrim(p_fio),'') is null or length(p_fio)>200
    or p_static is null or p_static !~ '^[0-9]{3}-[0-9]{3}$' or coalesce(length(p_discord),0)>100 then
    raise exception 'invalid submission' using errcode='22023';
  end if;
  v_key:=md5(p_scope||':'||lower(p_static));
  perform pg_advisory_xact_lock(hashtextextended(v_key,0));
  select last_at,day,count into v_last,v_day,v_count from public.cgb_submission_limits where key=v_key;
  if v_last>now()-interval '15 seconds' or (v_day=current_date and v_count>=20) then
    raise exception 'submission limit reached' using errcode='54000';
  end if;
  insert into public.cgb_submission_limits(key,last_at,day,count) values(v_key,now(),current_date,1)
    on conflict(key) do update set last_at=now(),day=current_date,
      count=case when cgb_submission_limits.day=current_date then cgb_submission_limits.count+1 else 1 end;
end;
$$;

create or replace function public.cgb_public_question(q jsonb)
returns jsonb language sql volatile set search_path = pg_catalog, public, pg_temp as $$
  select (q - 'correct') || jsonb_build_object('options',case when coalesce(q->>'kind',q->>'type') = 'order'
    then coalesce((select jsonb_agg(x order by random()) from jsonb_array_elements(coalesce(q->'correct','[]'::jsonb)) x),'[]'::jsonb)
    else coalesce(q->'options','[]'::jsonb) end,
    'kind',coalesce(q->>'kind',q->>'type'),'text',coalesce(q->>'text',q->>'prompt'));
$$;

create or replace function public.cgb_test_preview(p_test_id uuid)
returns jsonb language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select coalesce(jsonb_agg(public.cgb_public_question(to_jsonb(q)) order by q.sort),'[]'::jsonb)
  from public.test_questions q where q.test_id = p_test_id
    and exists(select 1 from public.tests t where t.id = p_test_id and (t.published or public.cgb_security_can('tests','edit')));
$$;

create or replace function public.cgb_start_test(p_test_id uuid,p_fio text,p_static text,p_discord text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare t public.tests; r public.cgb_test_runs; qs jsonb; n integer;
begin
  if p_static !~ '^[0-9]{3}-[0-9]{3}$' or nullif(btrim(p_fio),'') is null
    or nullif(btrim(p_discord),'') is null or length(p_fio)>200 or length(p_discord)>100 then
    raise exception 'invalid participant' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_test_id::text,0));
  select * into t from public.tests where id=p_test_id and published;
  if not found then raise exception 'test unavailable'; end if;
  if public.check_test_blocked(p_test_id,p_static,p_discord) is not null then raise exception 'participant blocked'; end if;
  select * into r from public.cgb_test_runs where test_id=p_test_id and attempt_id is null
    and expires_at>now() and lower(static_id)=lower(p_static) and lower(discord)=lower(p_discord)
    and user_id is not distinct from auth.uid() order by started_at desc limit 1;
  if found then raise exception 'test already started'; end if;
  select count(*) into n from public.cgb_test_runs where test_id=p_test_id
    and (lower(static_id)=lower(p_static) or lower(discord)=lower(p_discord));
  if t.max_attempts>0 and greatest(n,public.count_test_attempts(p_test_id,p_static,p_discord))>=t.max_attempts then
    raise exception 'max attempts reached';
  end if;
  select coalesce(jsonb_agg(s.q order by s.position),'[]'::jsonb) into qs from (
    select to_jsonb(q) q, row_number() over(order by case when t.shuffle_questions then random() else q.sort::float end,q.id) position
    from public.test_questions q where q.test_id=p_test_id
      and coalesce(to_jsonb(q)->>'kind',to_jsonb(q)->>'type')<>'prefilled'
  ) s where t.questions_per_run is null or t.questions_per_run<=0 or s.position<=t.questions_per_run;
  if jsonb_array_length(qs)=0 then raise exception 'test has no questions'; end if;
  select qs || coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into qs from public.test_questions q
    where q.test_id=p_test_id and coalesce(to_jsonb(q)->>'kind',to_jsonb(q)->>'type')='prefilled';
  insert into public.cgb_test_runs(test_id,user_id,fio,static_id,discord,questions,pass_score,expires_at)
    values(p_test_id,auth.uid(),btrim(p_fio),p_static,btrim(p_discord),qs,t.pass_score,
      now()+make_interval(mins=>case when t.time_limit_minutes>0 then t.time_limit_minutes else 1440 end)) returning * into r;
  return jsonb_build_object('token',r.token,'started_at',r.started_at,'expires_at',r.expires_at,
    'questions',(select jsonb_agg(public.cgb_public_question(q)) from jsonb_array_elements(qs) q));
end;
$$;

create or replace function public.cgb_finish_test(p_token uuid,p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare r public.cgb_test_runs; q jsonb; a jsonb; c jsonb; k text; pts integer;
  score integer:=0; total integer:=0; pct integer; aid uuid; ok boolean; result public.test_attempts;
begin
  select * into r from public.cgb_test_runs where token=p_token for update;
  if not found or r.user_id is distinct from auth.uid() then raise exception 'invalid test session' using errcode='42501'; end if;
  if r.attempt_id is not null then
    select * into result from public.test_attempts where id=r.attempt_id;
    return jsonb_build_object('id',result.id,'score',result.score,'max_score',result.total,'percent',result.percent,'passed',result.passed);
  end if;
  if now()>r.expires_at+interval '30 seconds' then raise exception 'test session expired'; end if;
  if jsonb_typeof(p_answers)<>'object' or p_answers is null or octet_length(p_answers::text)>262144 then raise exception 'invalid answers'; end if;
  for q in select value from jsonb_array_elements(r.questions) loop
    k:=coalesce(q->>'kind',q->>'type');
    if k='prefilled' then continue; end if;
    pts:=greatest(coalesce((q->>'points')::integer,1),1);
    total:=total+pts; a:=p_answers->(q->>'id'); c:=coalesce(q->'correct','[]'::jsonb); ok:=false;
    if k='single' then ok:=jsonb_array_length(c)=1 and a=c->0;
    elsif k='order' then ok:=a=c;
    elsif k='multi' and jsonb_typeof(a)='array' then
      ok:=a @> c and c @> a and jsonb_array_length(a)=jsonb_array_length(c);
    end if;
    if coalesce(ok,false) then score:=score+pts; end if;
  end loop;
  pct:=case when total>0 then round(score*100.0/total)::integer else 0 end;
  insert into public.test_attempts(test_id,fio,static_id,discord,answers,score,total,percent,passed,started_at,finished_at,review_status)
    values(r.test_id,r.fio,r.static_id,r.discord,p_answers,score,total,pct,pct>=r.pass_score,r.started_at,now(),'pending') returning id into aid;
  update public.cgb_test_runs set attempt_id=aid where token=p_token;
  insert into public.test_result_requests(attempt_id,channel_id,ping_discord,status)
    select aid,coalesce(nullif(result_channel_id,''),'1536476626034884739'),r.discord,'pending' from public.tests where id=r.test_id;
  return jsonb_build_object('id',aid,'score',score,'max_score',total,'percent',pct,'passed',pct>=r.pass_score);
end;
$$;

do $$
declare f record; def text; guard text;
begin
  for f in select p.oid,p.proname,p.prosrc from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('staff_upsert_role','ensure_payroll_draft','archive_payroll_draft','request_test_result','submit_request','submit_complaint','submit_supply_request') loop
    guard:=case f.proname
      when 'staff_upsert_role' then 'if not public.is_admin() then raise exception ''only admin can assign roles'' using errcode=''42501''; end if;'
      when 'request_test_result' then 'if not public.cgb_security_can(''tests'',''edit'') then raise exception ''permission denied'' using errcode=''42501''; end if;'
      when 'archive_payroll_draft' then 'if not public.cgb_security_can(''payroll'',''send'') then raise exception ''permission denied'' using errcode=''42501''; end if;'
      when 'submit_request' then 'perform public.cgb_validate_submission(''request'',p_values,p_fio,p_static,p_discord); if p_kind is null or p_kind not in (''leave'',''vacation_ic'',''vacation_ooc'',''dismissal'',''promotion'',''restoration'',''appointment'') or not exists(select 1 from public.request_forms where id=p_kind) then raise exception ''request form unavailable''; end if;'
      when 'submit_complaint' then 'perform public.cgb_validate_submission(''complaint'',p_values,p_submitter_fio,p_submitter_static,p_submitter_discord); if not exists(select 1 from public.complaint_form where id=1 and enabled) then raise exception ''complaint form unavailable''; end if; if p_evidence_url is not null and p_evidence_url !~* ''^https?://'' then raise exception ''invalid evidence URL''; end if;'
      when 'submit_supply_request' then 'perform public.cgb_validate_submission(''supply'',p_values,p_fio,p_static,p_discord); if not exists(select 1 from public.supply_form where id=1 and enabled) then raise exception ''supply form unavailable''; end if;'
      else 'if not public.cgb_security_can(''payroll'',''edit'') then raise exception ''permission denied'' using errcode=''42501''; end if;' end;
    if position(guard in f.prosrc)=0 then
      def:=pg_get_functiondef(f.oid);
      execute replace(def,f.prosrc,regexp_replace(f.prosrc,'\mbegin\M','begin '||guard,'i'));
    end if;
  end loop;
  for f in select p.oid,p.proname,p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prokind='f' loop
    execute format('revoke execute on function %s from public, anon, authenticated',f.oid::regprocedure);
    if f.prosecdef then execute format('alter function %s set search_path = pg_catalog, public, pg_temp',f.oid::regprocedure); end if;
    if f.proname = any(array['is_admin','cgb_security_can','cgb_security_access','can_edit_site_data',
      'get_complaint_form','get_supply_form','submit_complaint','submit_request','submit_supply_request',
      'count_test_attempts','check_test_blocked','cgb_test_preview','cgb_start_test','cgb_finish_test']) then
      execute format('grant execute on function %s to anon, authenticated',f.oid::regprocedure);
    elsif f.proname = any(array['staff_upsert_role','ensure_payroll_draft','archive_payroll_draft','request_test_result']) then
      execute format('grant execute on function %s to authenticated',f.oid::regprocedure);
    end if;
  end loop;
end;
$$;

do $$
declare p record; op text; expr text;
begin
  if to_regclass('storage.objects') is null then return; end if;
  for p in select policyname from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'cgb_security_%' loop
    execute format('drop policy %I on storage.objects',p.policyname);
  end loop;
  foreach op in array array['insert','update','delete'] loop
    expr:='(bucket_id not in (''composition-photos'',''autopark-photos'') or (bucket_id=''composition-photos'' and public.cgb_security_can(''composition'',''edit'')) or (bucket_id=''autopark-photos'' and public.cgb_security_can(''autopark'',''edit'')))';
    if op='insert' then
      execute format('create policy cgb_security_%s on storage.objects as restrictive for insert to anon, authenticated with check (%s)',op,expr);
    elsif op='update' then
      execute format('create policy cgb_security_%s on storage.objects as restrictive for update to anon, authenticated using (%s) with check (%s)',op,expr,expr);
    else
      execute format('create policy cgb_security_%s on storage.objects as restrictive for delete to anon, authenticated using (%s)',op,expr);
    end if;
  end loop;
  if to_regclass('storage.buckets') is not null then
    update storage.buckets set file_size_limit=15728640,allowed_mime_types=array['image/jpeg','image/png','image/webp','image/gif']
    where id in ('composition-photos','autopark-photos');
  end if;
end;
$$;

notify pgrst, 'reload schema';
commit;
