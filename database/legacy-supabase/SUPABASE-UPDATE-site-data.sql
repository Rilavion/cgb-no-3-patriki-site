-- =====================================================================
-- ОБНОВЛЕНИЕ: таблица site_data (контент страниц «Услуги» и «Медикаменты»)
-- Запускать ТОЛЬКО если база уже развёрнута старым SUPABASE-SETUP.sql.
-- В свежем SUPABASE-SETUP.sql этот блок уже включён.
-- Выполни целиком в: Supabase Dashboard → SQL Editor → New query → Run.
-- =====================================================================

-- 0. Спасательные колонки (если роли создавались старым скриптом и функция
--    ниже падала с "column cr.id does not exist" — этот блок чинит причину).
--    Ещё проще: выполнить один файл SUPABASE-FIX.sql — он чинит всё сразу.
create extension if not exists pgcrypto;
alter table public.custom_roles add column if not exists id uuid;
alter table public.custom_roles add column if not exists key text;
alter table public.custom_roles add column if not exists permissions jsonb not null default '{}'::jsonb;
alter table public.custom_roles add column if not exists updated_at timestamptz not null default now();
update public.custom_roles set id = gen_random_uuid() where id is null;
alter table public.custom_roles alter column id set default gen_random_uuid();
create unique index if not exists custom_roles_id_uidx on public.custom_roles(id);
create unique index if not exists custom_roles_key_uidx on public.custom_roles(key);
alter table public.user_roles add column if not exists custom_role_id uuid;
alter table public.user_roles add column if not exists updated_at timestamptz not null default now();

-- 1. Таблица. Строки специально НЕ создаём: страницы берут встроенный
--    дефолтный контент, пока кто-то с правами не нажмёт «Сохранить».
create table if not exists public.site_data (
  key text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- 2. Права на уровне грантов (как у остальных таблиц проекта)
grant select on public.site_data to anon;
grant select, insert, update, delete on public.site_data to authenticated;

-- 3. Функция проверки права записи:
--    admin — всегда; иначе — кастомная роль с правом site:edit
--    или <раздел>:edit (services_page → services:edit, meds_page → meds:edit)
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

-- 4. RLS: читают все, пишут только с правом
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
-- ГОТОВО. Проверка: Table Editor → site_data должна появиться.
-- Без этой таблицы страницы «Услуги»/«Медикаменты» работают, но правки
-- сохраняются только локально в браузере (уведомление об этом есть в UI).
-- =====================================================================
