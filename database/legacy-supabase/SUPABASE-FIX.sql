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
