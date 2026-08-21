-- ЦГБ №3: идемпотентная схема Supabase для сайта.
-- Запускайте целиком в Supabase SQL Editor от имени владельца проекта.

begin;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.news (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  date date not null default current_date,
  tag text not null default 'news',
  dept text not null default 'general',
  image text,
  images jsonb not null default '[]'::jsonb,
  excerpt text not null default '',
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.faq (
  id text primary key,
  cat text not null default 'Общее',
  q text not null,
  a text not null,
  sort bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.info_page (
  id bigint primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.custom_roles (
  key text primary key,
  name text not null,
  permissions jsonb not null default '{}'::jsonb,
  sort integer not null default 0
);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user',
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Дополняем ранее созданные таблицы без удаления существующих данных.
alter table public.news add column if not exists id text;
alter table public.news add column if not exists title text;
alter table public.news add column if not exists date date default current_date;
alter table public.news add column if not exists tag text default 'news';
alter table public.news add column if not exists dept text default 'general';
alter table public.news add column if not exists image text;
alter table public.news add column if not exists images jsonb default '[]'::jsonb;
alter table public.news add column if not exists excerpt text default '';
alter table public.news add column if not exists body text default '';
alter table public.news add column if not exists created_at timestamptz default now();
alter table public.news add column if not exists updated_at timestamptz default now();

alter table public.faq add column if not exists id text;
alter table public.faq add column if not exists cat text default 'Общее';
alter table public.faq add column if not exists q text;
alter table public.faq add column if not exists a text;
alter table public.faq add column if not exists sort bigint default 0;
alter table public.faq add column if not exists created_at timestamptz default now();
alter table public.faq add column if not exists updated_at timestamptz default now();

alter table public.info_page add column if not exists id bigint;
alter table public.info_page add column if not exists data jsonb default '{}'::jsonb;
alter table public.info_page add column if not exists updated_at timestamptz default now();

alter table public.custom_roles add column if not exists key text;
alter table public.custom_roles add column if not exists name text;
alter table public.custom_roles add column if not exists permissions jsonb default '{}'::jsonb;
alter table public.custom_roles add column if not exists sort integer default 0;

alter table public.user_roles add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.user_roles add column if not exists role text default 'user';
alter table public.user_roles add column if not exists display_name text;
alter table public.user_roles add column if not exists created_at timestamptz default now();
alter table public.user_roles add column if not exists updated_at timestamptz default now();

-- Клиент создаёт новость без id. Настраиваем значение по умолчанию с учётом
-- возможного типа id в уже существующей таблице.
do $$
declare
  id_type text;
  id_default text;
  id_identity text;
begin
  select udt_name, column_default, is_identity
    into id_type, id_default, id_identity
  from information_schema.columns
  where table_schema='public' and table_name='news' and column_name='id';

  if id_default is null and coalesce(id_identity,'NO')='NO' then
    if id_type='uuid' then
      execute 'alter table public.news alter column id set default gen_random_uuid()';
    elsif id_type in ('text','varchar','bpchar') then
      execute 'alter table public.news alter column id set default gen_random_uuid()::text';
    elsif id_type in ('int2','int4','int8') then
      execute 'create sequence if not exists public.cgb_news_id_seq';
      execute 'select setval(''public.cgb_news_id_seq'', greatest(coalesce((select max(id)::bigint from public.news),0)+1,1), false)';
      execute 'alter table public.news alter column id set default nextval(''public.cgb_news_id_seq''::regclass)';
      execute 'alter sequence public.cgb_news_id_seq owned by public.news.id';
    else
      raise exception 'Неподдерживаемый тип public.news.id: %', id_type;
    end if;
  end if;
end
$$;

-- Уникальные ключи нужны для upsert и безопасного назначения ролей.
create unique index if not exists cgb_news_id_uidx on public.news(id);
create unique index if not exists cgb_faq_id_uidx on public.faq(id);
create unique index if not exists cgb_info_page_id_uidx on public.info_page(id);
create unique index if not exists cgb_custom_roles_key_uidx on public.custom_roles(key);
create unique index if not exists cgb_user_roles_user_id_uidx on public.user_roles(user_id);

insert into public.custom_roles(key,name,permissions,sort) values
  ('admin','Администратор','{"*":{"*":true}}'::jsonb,10),
  ('staff','Сотрудник','{"news":{"create":true,"edit":true},"faq":{"edit":true},"info":{"edit":false}}'::jsonb,20),
  ('user','Пользователь','{}'::jsonb,30)
on conflict (key) do update set
  name=excluded.name,
  permissions=excluded.permissions,
  sort=excluded.sort;

insert into public.info_page(id,data)
values (1,'{}'::jsonb)
on conflict (id) do nothing;

-- Для каждого существующего и нового пользователя создаётся безопасная роль user.
insert into public.user_roles(user_id,role,display_name)
select id,'user',coalesce(raw_user_meta_data->>'full_name',raw_user_meta_data->>'name')
from auth.users
on conflict (user_id) do nothing;

create or replace function public.cgb_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  insert into public.user_roles(user_id,role,display_name)
  values (new.id,'user',coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name'))
  on conflict (user_id) do nothing;
  return new;
end
$$;

drop trigger if exists cgb_on_auth_user_created on auth.users;
create trigger cgb_on_auth_user_created
after insert on auth.users
for each row execute function public.cgb_handle_new_user();

create or replace function public.cgb_touch_updated_at()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
begin
  new.updated_at=now();
  return new;
end
$$;

drop trigger if exists cgb_news_touch_updated_at on public.news;
create trigger cgb_news_touch_updated_at
before update on public.news
for each row execute function public.cgb_touch_updated_at();

drop trigger if exists cgb_faq_touch_updated_at on public.faq;
create trigger cgb_faq_touch_updated_at
before update on public.faq
for each row execute function public.cgb_touch_updated_at();

drop trigger if exists cgb_user_roles_touch_updated_at on public.user_roles;
create trigger cgb_user_roles_touch_updated_at
before update on public.user_roles
for each row execute function public.cgb_touch_updated_at();

create or replace function public.cgb_current_role()
returns text
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select coalesce((select role from public.user_roles where user_id=auth.uid()),'user')
$$;

create or replace function public.cgb_is_admin()
returns boolean
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select auth.uid() is not null and public.cgb_current_role()='admin'
$$;

create or replace function public.cgb_is_staff()
returns boolean
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select auth.uid() is not null and public.cgb_current_role() in ('admin','staff')
$$;

-- Проверка разрешений повторяет модель roles-engine.js. Так произвольные роли из
-- custom_roles получают на сервере ровно те права, которые показаны в интерфейсе.
create or replace function public.cgb_can(p_section text,p_action text)
returns boolean
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select auth.uid() is not null and (
    public.cgb_current_role()='admin'
    or exists(
      select 1
      from public.custom_roles role_definition
      where role_definition.key=public.cgb_current_role()
        and (
          role_definition.permissions #> array[p_section,p_action] = 'true'::jsonb
          or role_definition.permissions #> array[p_section,'*'] = 'true'::jsonb
          or role_definition.permissions #> array['*',p_action] = 'true'::jsonb
          or role_definition.permissions #> array['*','*'] = 'true'::jsonb
        )
    )
  )
$$;

create or replace function public.staff_upsert_role(
  p_user_id uuid,
  p_role text,
  p_display_name text default null
)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if not public.cgb_is_admin() then
    raise exception 'Недостаточно прав' using errcode='42501';
  end if;
  if p_user_id is null or not exists(select 1 from auth.users where id=p_user_id) then
    raise exception 'Пользователь не найден' using errcode='22023';
  end if;
  if not exists(select 1 from public.custom_roles where key=p_role) then
    raise exception 'Неизвестная роль' using errcode='22023';
  end if;
  if exists(select 1 from public.user_roles where user_id=p_user_id and role='admin')
     and p_role<>'admin'
     and not exists(select 1 from public.user_roles where role='admin' and user_id<>p_user_id) then
    raise exception 'Нельзя снять роль у единственного администратора' using errcode='22023';
  end if;

  insert into public.user_roles(user_id,role,display_name)
  values (p_user_id,p_role,nullif(btrim(p_display_name),''))
  on conflict (user_id) do update set
    role=excluded.role,
    display_name=excluded.display_name,
    updated_at=now();
end
$$;

alter table public.news enable row level security;
alter table public.faq enable row level security;
alter table public.info_page enable row level security;
alter table public.custom_roles enable row level security;
alter table public.user_roles enable row level security;

-- Удаляем старые политики только у таблиц этого сайта и создаём строгий набор заново.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname,tablename,policyname
    from pg_policies
    where schemaname='public'
      and tablename in ('news','faq','info_page','custom_roles','user_roles')
  loop
    execute format('drop policy if exists %I on %I.%I',policy_row.policyname,policy_row.schemaname,policy_row.tablename);
  end loop;
end
$$;

create policy cgb_news_read on public.news
for select to anon,authenticated using (true);
create policy cgb_news_insert on public.news
for insert to authenticated with check (public.cgb_can('news','create'));
create policy cgb_news_update on public.news
for update to authenticated
using (public.cgb_can('news','edit'))
with check (public.cgb_can('news','edit'));
create policy cgb_news_delete on public.news
for delete to authenticated using (public.cgb_can('news','delete'));

create policy cgb_faq_read on public.faq
for select to anon,authenticated using (true);
create policy cgb_faq_insert on public.faq
for insert to authenticated with check (public.cgb_can('faq','edit'));
create policy cgb_faq_update on public.faq
for update to authenticated
using (public.cgb_can('faq','edit'))
with check (public.cgb_can('faq','edit'));
create policy cgb_faq_delete on public.faq
for delete to authenticated using (public.cgb_can('faq','edit'));

create policy cgb_info_read on public.info_page
for select to anon,authenticated using (true);
create policy cgb_info_insert on public.info_page
for insert to authenticated with check (public.cgb_can('info','edit'));
create policy cgb_info_update on public.info_page
for update to authenticated
using (public.cgb_can('info','edit'))
with check (public.cgb_can('info','edit'));

create policy cgb_custom_roles_read on public.custom_roles
for select to authenticated using (true);
create policy cgb_custom_roles_insert on public.custom_roles
for insert to authenticated with check (public.cgb_is_admin());
create policy cgb_custom_roles_update on public.custom_roles
for update to authenticated using (public.cgb_is_admin()) with check (public.cgb_is_admin());
create policy cgb_custom_roles_delete on public.custom_roles
for delete to authenticated using (public.cgb_is_admin());

create policy cgb_user_roles_read on public.user_roles
for select to authenticated
using (user_id=auth.uid() or public.cgb_can('staff','view'));

revoke all on table public.news,public.faq,public.info_page,public.custom_roles,public.user_roles from anon,authenticated;
grant select on table public.news,public.faq,public.info_page to anon,authenticated;
grant insert,update,delete on table public.news,public.faq to authenticated;
grant insert,update on table public.info_page to authenticated;
grant select,insert,update,delete on table public.custom_roles to authenticated;
grant select on table public.user_roles to authenticated;
grant usage,select on all sequences in schema public to authenticated;

revoke all on function public.cgb_handle_new_user() from public,anon,authenticated;
revoke all on function public.cgb_current_role() from public,anon;
revoke all on function public.cgb_is_admin() from public,anon;
revoke all on function public.cgb_is_staff() from public,anon;
revoke all on function public.cgb_can(text,text) from public,anon;
revoke all on function public.staff_upsert_role(uuid,text,text) from public,anon;
grant execute on function public.cgb_current_role() to authenticated;
grant execute on function public.cgb_is_admin() to authenticated;
grant execute on function public.cgb_is_staff() to authenticated;
grant execute on function public.cgb_can(text,text) to authenticated;
grant execute on function public.staff_upsert_role(uuid,text,text) to authenticated;

commit;

-- После первого запуска назначьте администратора отдельным запросом из SUPABASE.md.
