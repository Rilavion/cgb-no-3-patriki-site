-- =====================================================================
-- ОБНОВЛЕНИЕ: системные роли (Старший состав / Оператор АБ / Оператор ОРП)
-- Запускать, если база уже развёрнута старым SUPABASE-SETUP.sql.
-- В свежем SUPABASE-SETUP.sql этот блок уже включён (раздел 4.1).
-- Выполни целиком в: Supabase Dashboard → SQL Editor → New query → Run.
--
-- Как это работает:
-- • «Старший состав» (ключ ss) подхватывается АВТОМАТИЧЕСКИ всеми, у кого
--   в user_roles стоит базовая роль ss — ничего назначать не нужно.
-- • «Оператор АБ» и «Оператор ОРП» админ выдаёт людям вручную:
--   Личный кабинет → панель ролей → выбрать пользователя → роль.
-- • Системные роли видны на странице roles.html, удалить их нельзя,
--   при повторном запуске файла права просто обновятся (on conflict).
--
-- Если здесь (или ниже) падает "column ... does not exist" — ваша таблица
-- создана старым скриптом: сначала выполните SUPABASE-FIX.sql, он достроит
-- все колонки одним файлом. Спасательный блок ниже делает то же самое.
-- =====================================================================

create extension if not exists pgcrypto;

-- Спасательные колонки custom_roles (если таблица создавалась раньше без них)
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
update public.custom_roles set id = gen_random_uuid() where id is null;
alter table public.custom_roles alter column id set default gen_random_uuid();
create unique index if not exists custom_roles_id_uidx on public.custom_roles(id);
create unique index if not exists custom_roles_key_uidx on public.custom_roles(key);

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
-- ГОТОВО. Проверка: открой roles.html — должны появиться три роли
-- с плашкой «системная». Назначение: ЛК → панель ролей.
-- =====================================================================
