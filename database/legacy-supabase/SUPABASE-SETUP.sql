-- =====================================================================
--  ЦГБ №3 — ПОЛНАЯ НАСТРОЙКА БАЗЫ ДАННЫХ SUPABASE
--  Выполнить целиком в Supabase → SQL Editor → New query → Run.
--  Скрипт идемпотентный: повторный запуск ничего не сломает.
--
--  Уже существующие таблицы (faq, info_page, news, user_roles,
--  custom_roles) НЕ пересоздаются — создаются только недостающие.
--
--  ВНИМАНИЕ: при запуске Supabase покажет «Potential issues detected»
--  (из-за команд drop policy/revoke). Это нормально — жми «Run without RLS»:
--  RLS и политики доступа настраиваются в блоке 3 этого же скрипта.
-- =====================================================================

create extension if not exists pgcrypto;

-- =====================================================================
-- 1. ТАБЛИЦЫ
-- =====================================================================

-- ---------- Пользователи и роли (обычно уже есть — на всякий случай) ----------
create table if not exists public.user_roles (
  user_id uuid primary key,
  role text,
  display_name text,
  custom_role_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.custom_roles (
  id uuid primary key default gen_random_uuid(),
  key text unique,
  name text,
  description text,
  color text,
  permissions jsonb not null default '{}'::jsonb,
  default_perms jsonb not null default '{}'::jsonb,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Спасательные колонки (если таблицы уже созданы раньше с другим набором полей)
alter table public.user_roles add column if not exists display_name text;
alter table public.user_roles add column if not exists custom_role_id uuid;
alter table public.user_roles add column if not exists updated_at timestamptz not null default now();
alter table public.custom_roles add column if not exists id uuid;
alter table public.custom_roles add column if not exists key text;
alter table public.custom_roles add column if not exists base_role text;   -- admin / ss / user
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

-- ---------- Контентные страницы ----------
create table if not exists public.news (
  id bigint generated always as identity primary key,
  title text,
  excerpt text,
  body text,
  tag text,
  dept text,
  image text,
  images jsonb default '[]'::jsonb,
  date date default current_date,
  author_name text,
  author_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.faq (
  id bigint generated always as identity primary key,
  title text,
  "desc" text,
  image text,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.info_page (
  id integer primary key default 1,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.ustavy (
  id bigint generated always as identity primary key,
  slug text unique,
  title text,
  code text,
  content jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by_name text
);

create table if not exists public.composition (
  id integer primary key default 1,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  updated_by_name text
);

create table if not exists public.vehicles (
  id bigint generated always as identity primary key,
  title text,
  tag text,
  image text,
  crew text,
  speed text,
  price text,
  rank text,
  purpose text,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by_name text
);

create table if not exists public.learn_materials (
  id uuid primary key default gen_random_uuid(),
  title text,
  url text,
  description text,
  category text,
  kind text,
  cover_url text,
  sort integer not null default 0,
  created_by uuid,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.train_categories (
  id uuid primary key default gen_random_uuid(),
  title text,
  parent uuid,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.train_lessons (
  id uuid primary key default gen_random_uuid(),
  title text,
  excerpt text,
  content text,
  category uuid,
  sort integer not null default 0,
  author_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.holiday_state (
  id integer primary key default 1,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  updated_by_name text
);

-- ---------- Электронные заявления (Discord-бот → сайт) ----------
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'discord',
  external_id text unique,              -- id сообщения Discord
  message_link text,
  app_type text,
  fields jsonb not null default '{}'::jsonb,
  raw_text text,
  submitter_name text,
  submitter_discord text,
  submitter_avatar text,
  status text not null default 'new',   -- new / approved / rejected / archived
  reject_reason text,
  responded_by uuid,
  responded_by_name text,
  responded_at timestamptz,
  result_message_id text,
  result_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists applications_status_idx on public.applications (status);
create index if not exists applications_created_idx on public.applications (created_at desc);

create table if not exists public.apps_settings (
  id integer primary key default 1,
  guild_id text,
  incoming_channel_id text,
  results_channel_id text,
  ping_role_id text,
  reviewer_role_id text,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.bot_status (
  id integer primary key default 1,
  online boolean not null default false,
  tag text,
  guilds jsonb not null default '[]'::jsonb,
  last_seen timestamptz,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- Жалобы ----------
create sequence if not exists public.complaints_code_seq start 1;

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  values jsonb not null default '{}'::jsonb,
  submitter_fio text,
  submitter_static text,
  submitter_discord text,
  target_fio text,
  target_static text,
  target_discord_id text,
  evidence_url text,
  status text not null default 'new',   -- new / verdict / refused / closed
  verdict_kind text,
  verdict_comment text,
  verdict_at timestamptz,
  verdict_by_uid uuid,
  verdict_by_name text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists complaints_status_idx on public.complaints (status);
create index if not exists complaints_created_idx on public.complaints (created_at desc);

create table if not exists public.complaint_history (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid references public.complaints(id) on delete cascade,
  action text,
  changed_by_uid uuid,
  changed_by_name text,
  changes jsonb not null default '{}'::jsonb,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.complaint_form (
  id integer primary key default 1,
  title text,
  intro text,
  fields jsonb not null default '[]'::jsonb,
  channels jsonb not null default '{}'::jsonb,
  ping_role_id text,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- ---------- Заявки (отгулы, отпуска, повышения и т.д.) ----------
create sequence if not exists public.requests_code_seq start 1;

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  kind text,
  values jsonb not null default '{}'::jsonb,
  submitter_uid uuid,
  submitter_fio text,
  submitter_static text,
  submitter_discord text,
  status text not null default 'pending',  -- pending / approved / rejected
  verdict_comment text,
  verdict_at timestamptz,
  verdict_by_uid uuid,
  verdict_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists requests_kind_idx on public.requests (kind);
create index if not exists requests_status_idx on public.requests (status);
create index if not exists requests_created_idx on public.requests (created_at desc);

create table if not exists public.request_forms (
  id text primary key,                   -- leave / vacation_ic / dismissal / ...
  title text,
  description text,
  fields jsonb not null default '[]'::jsonb,
  rank_matrix jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.requests_settings (
  id integer primary key default 1,
  max_leave_minutes integer not null default 60,
  min_leave_rank text,
  min_vac_rank text,
  channels jsonb not null default '{}'::jsonb,
  ping_roles jsonb not null default '{}'::jsonb,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- ---------- Нарушения / наказания (реестр + запросы АБ) ----------
create table if not exists public.violations_registry (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  target_fio text,
  target_static text,
  target_discord_id text,
  target_position text,
  kind text,                             -- warn / reproach / talk / confinement / uval
  reason text,
  evidence_url text,
  complaint_id uuid,
  status text not null default 'active', -- active / pending / refused / removed
  notify_mode text,
  expires_at timestamptz,
  confinement_minutes integer,
  issued_by_uid uuid,
  issued_by_name text,
  issued_by_discord_id text,
  requested_by_uid uuid,
  requested_by_name text,
  requested_by_static text,
  requested_by_discord_id text,
  reviewed_by_uid uuid,
  reviewed_by_name text,
  reviewed_at timestamptz,
  reviewer_comment text,
  removed_at timestamptz,
  removed_by_uid uuid,
  removed_by_name text,
  removed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists violations_status_idx on public.violations_registry (status);

create table if not exists public.violations_history (
  id uuid primary key default gen_random_uuid(),
  violation_id uuid references public.violations_registry(id) on delete cascade,
  action text,
  status text,
  before_data jsonb,
  after_data jsonb,
  comment text,
  changed_by_uid uuid,
  changed_by_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.violations_settings (
  id integer primary key default 1,
  verdict_channel_id text,
  orders_channel_id text,
  ping_role_id text,
  confinement_default_minutes integer,
  data jsonb not null default '{}'::jsonb,
  active_kinds jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- ---------- Проверки АБ ----------
create table if not exists public.vp_checks (
  discord_id text primary key,
  medbook text,
  narko text,
  driver text,
  passport text,
  personal_file text,
  weapon_license text,
  attestation text,
  evidence_url text,
  notes text,
  checked_by uuid,
  checked_by_name text,
  checked_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.vp_settings (
  id integer primary key default 1,
  guild_id text,
  report_channel_id text,
  ping_role_id text,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.vp_role_mapping (
  role_id text primary key,
  dept text,
  rank text,
  updated_at timestamptz not null default now()
);

create table if not exists public.vp_reports (
  id uuid primary key default gen_random_uuid(),
  archive_id uuid,
  fio text,
  static_id text,
  discord_id text,
  dept text,
  status text,
  notes text,
  checked_at timestamptz,
  checked_by_name text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.vp_archive (
  id uuid primary key default gen_random_uuid(),
  title text,
  period_from timestamptz,
  period_to timestamptz,
  saved_by uuid,
  saved_by_name text,
  saved_at timestamptz not null default now(),
  snapshot jsonb,
  stats jsonb not null default '{}'::jsonb,
  members_total integer,
  members_checked integer,
  members_partial integer,
  report_message_id text,
  report_sent_at timestamptz,
  report_sent_by_name text,
  notes text
);

create table if not exists public.vp_report_requests (
  id uuid primary key default gen_random_uuid(),
  archive_id uuid,
  channel_id text,
  requested_by uuid,
  requested_by_name text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.vp_request_forms (
  id text primary key,
  label text,
  icon text,
  color integer,
  fields jsonb not null default '[]'::jsonb,
  channel_id text,
  ping_role_id text,
  active boolean not null default true,
  sort_order integer not null default 0
);

-- ---------- Еженедельные отчёты ----------
create table if not exists public.report_forms (
  id text primary key,
  label text,
  icon text,
  color integer,
  fields jsonb not null default '[]'::jsonb,
  channel_id text,
  ping_role_id text,
  active boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists public.report_send_requests (
  id uuid primary key default gen_random_uuid(),
  form_id text,
  submitter_uid uuid,
  submitter_email text,
  submitter_fio text,
  submitter_static text,
  submitter_position text,
  values jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  message text,
  ds_message_id text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

-- ---------- Поставки ----------
create table if not exists public.supply_form (
  id integer primary key default 1,
  title text,
  intro text,
  fields jsonb not null default '[]'::jsonb,
  channel_id text,
  ping_role_id text,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.supply_requests (
  id uuid primary key default gen_random_uuid(),
  code text,
  fio text,
  static_id text,
  discord text,
  values jsonb not null default '{}'::jsonb,
  photo_url text,
  status text not null default 'pending',
  reviewed_by uuid,
  reviewed_by_name text,
  reviewed_at timestamptz,
  reject_reason text,
  merged_into uuid,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists supply_requests_created_idx on public.supply_requests (created_at desc);

create table if not exists public.supply_entries (
  id uuid primary key default gen_random_uuid(),
  request_id uuid,
  static_id text,
  fio text,
  kind text,
  amount numeric,
  data jsonb not null default '{}'::jsonb,
  rejected_at timestamptz,
  rejected_by_name text,
  created_at timestamptz not null default now()
);
create index if not exists supply_entries_static_idx on public.supply_entries (static_id);

create table if not exists public.supply_rescan_requests (
  id uuid primary key default gen_random_uuid(),
  from_date date,
  to_date date,
  requested_by uuid,
  requested_by_name text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

-- ---------- Тестирование ----------
create table if not exists public.test_categories (
  id uuid primary key default gen_random_uuid(),
  title text,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title text,
  description text,
  intro text,
  icon text,
  category_id uuid references public.test_categories(id) on delete set null,
  pass_score integer not null default 70,
  max_attempts integer not null default 0,
  time_limit_minutes integer,
  result_channel_id text,
  published boolean not null default false,
  show_answers_after boolean not null default false,
  shuffle_questions boolean not null default false,
  questions_per_run integer,
  sort integer not null default 0,
  created_by uuid,
  created_by_name text,
  author_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.test_questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid references public.tests(id) on delete cascade,
  prompt text,
  type text not null default 'single',
  options jsonb not null default '[]'::jsonb,
  correct jsonb not null default '[]'::jsonb,
  points integer not null default 1,
  image_url text,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists test_questions_test_idx on public.test_questions (test_id);

create table if not exists public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid references public.tests(id) on delete cascade,
  fio text,
  static_id text,
  discord text,
  answers jsonb not null default '{}'::jsonb,
  score integer,
  total integer,
  percent numeric,
  passed boolean,
  started_at timestamptz,
  finished_at timestamptz not null default now(),
  review_status text not null default 'pending',
  reviewed_by uuid,
  reviewed_by_name text,
  reviewed_at timestamptz,
  review_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists test_attempts_test_idx on public.test_attempts (test_id, finished_at desc);

create table if not exists public.test_blocks (
  id uuid primary key default gen_random_uuid(),
  test_id uuid references public.tests(id) on delete cascade,
  value text,                            -- статик или discord
  reason text,
  blocked_by uuid,
  blocked_by_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.test_ping_lines (
  id uuid primary key default gen_random_uuid(),
  test_id uuid references public.tests(id) on delete cascade,
  text text,
  sort integer not null default 0
);

create table if not exists public.test_result_requests (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references public.test_attempts(id) on delete cascade,
  channel_id text,
  ping_discord text,
  is_repeat boolean not null default false,
  requested_by uuid,
  requested_by_name text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

-- ---------- Премирование (бухгалтерия) ----------
create table if not exists public.payroll_drafts (
  id uuid primary key default gen_random_uuid(),
  title text,
  fund_amount numeric not null default 0,
  pct_manual boolean not null default true,
  data jsonb not null default '{"departments":[]}'::jsonb,
  status text not null default 'draft',  -- draft / sent
  sent_at timestamptz,
  sent_by uuid,
  sent_by_name text,
  ds_message_id text,
  ds_channel_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.payroll_archive (
  id uuid primary key default gen_random_uuid(),
  title text,
  fund_amount numeric not null default 0,
  pct_manual boolean,
  data jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  sent_by uuid,
  sent_by_name text,
  ds_message_id text,
  ds_channel_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.payroll_settings (
  id integer primary key default 1,
  channel_id text,
  ping_role_id text,
  header_text text default 'ПРИКАЗ О ПРЕМИРОВАНИИ',
  footer_text text,
  output_mode text not null default 'both',
  split_by_dept boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.payroll_send_requests (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid,
  channel_id text,
  payload jsonb,
  status text not null default 'pending',
  requested_by uuid,
  requested_by_name text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

-- ---------- Discord-синхронизация (заполняет бот) ----------
create table if not exists public.ds_channels (
  channel_id text primary key,
  name text,
  parent_id text,
  parent_name text,
  position integer,
  kind text,
  synced_at timestamptz not null default now()
);

create table if not exists public.ds_roles (
  role_id text primary key,
  name text,
  color integer,
  position integer,
  synced_at timestamptz not null default now()
);

create table if not exists public.ds_guild_roles (
  role_id text primary key,
  name text,
  color integer,
  position integer,
  synced_at timestamptz not null default now()
);

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
create index if not exists ds_members_fio_idx on public.ds_members (parsed_fio);

create table if not exists public.ds_sync_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid,
  requested_by_name text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

-- Спасательные колонки для таблиц бота (если они созданы старым скриптом).
-- Бот (bot/vp.js) умеет пропускать отсутствующие колонки сам, но для полных
-- данных (аватарки, global_name, даты) лучше иметь весь набор.
alter table public.ds_roles add column if not exists updated_at timestamptz not null default now();
alter table public.ds_members add column if not exists username text;
alter table public.ds_members add column if not exists global_name text;
alter table public.ds_members add column if not exists is_bot boolean not null default false;
alter table public.ds_members add column if not exists joined_at timestamptz;
alter table public.ds_members add column if not exists last_seen timestamptz;
alter table public.ds_sync_requests add column if not exists message text;
alter table public.ds_sync_requests add column if not exists members_scanned integer;
alter table public.ds_sync_requests add column if not exists finished_at timestamptz;

-- ---------- Прочее ----------
create table if not exists public.raids_events (
  id uuid primary key default gen_random_uuid(),
  kind text,
  title text,
  ds_author_name text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 2. RPC-ФУНКЦИИ (вызываются сайтом)
-- =====================================================================

-- 2.1 Назначение роли пользователю (со страницы «Личный кабинет»).
-- Разрешено: админам; а также ЛЮБОМУ авторизованному, пока в базе
-- нет ни одного админа (первичная настройка проекта).
create or replace function public.staff_upsert_role(
  p_user_id uuid, p_role text, p_display_name text default null, p_custom_role_id uuid default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin')
     and exists (select 1 from public.user_roles where role = 'admin') then
    raise exception 'only admin can assign roles';
  end if;
  insert into public.user_roles (user_id, role, display_name, custom_role_id, updated_at)
  values (p_user_id, p_role, p_display_name, p_custom_role_id, now())
  on conflict (user_id) do update
    set role = excluded.role,
        display_name = excluded.display_name,
        custom_role_id = excluded.custom_role_id,
        updated_at = now();
end $$;

-- 2.2 Форма жалобы (публичное чтение одной строки)
create or replace function public.get_complaint_form()
returns setof public.complaint_form
language sql security definer set search_path = public stable as $$
  select * from public.complaint_form where id = 1 limit 1;
$$;

-- 2.3 Подача жалобы (анонимно)
create or replace function public.submit_complaint(
  p_values jsonb default '{}'::jsonb,
  p_submitter_fio text default null,
  p_submitter_static text default null,
  p_submitter_discord text default null,
  p_target_fio text default null,
  p_target_static text default null,
  p_target_discord_id text default null,
  p_evidence_url text default null
) returns setof public.complaints
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
begin
  v_code := 'Ж' || lpad(nextval('public.complaints_code_seq')::text, 5, '0');
  return query
    insert into public.complaints (code, values, submitter_fio, submitter_static, submitter_discord,
                                   target_fio, target_static, target_discord_id, evidence_url, status)
    values (v_code, coalesce(p_values,'{}'::jsonb), p_submitter_fio, p_submitter_static, p_submitter_discord,
            p_target_fio, p_target_static, p_target_discord_id, p_evidence_url, 'new')
    returning *;
end $$;

-- 2.4 Подача заявки (отгул/отпуск/увольнение/повышение/восстановление)
create or replace function public.submit_request(
  p_kind text, p_values jsonb default '{}'::jsonb,
  p_fio text default null, p_static text default null, p_discord text default null
) returns setof public.requests
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
begin
  v_code := 'З' || lpad(nextval('public.requests_code_seq')::text, 5, '0');
  return query
    insert into public.requests (code, kind, values, submitter_fio, submitter_static, submitter_discord,
                                 submitter_uid, status)
    values (v_code, p_kind, coalesce(p_values,'{}'::jsonb), p_fio, p_static, p_discord, auth.uid(), 'pending')
    returning *;
end $$;

-- 2.5 Форма поставки
create or replace function public.get_supply_form()
returns setof public.supply_form
language sql security definer set search_path = public stable as $$
  select * from public.supply_form where id = 1 limit 1;
$$;

-- 2.6 Подача заявки на поставку
create or replace function public.submit_supply_request(
  p_fio text, p_static text, p_discord text default null, p_values jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  insert into public.supply_requests (fio, static_id, discord, values, status)
  values (p_fio, p_static, p_discord, coalesce(p_values,'{}'::jsonb), 'pending')
  returning id into v_id;
  return v_id;
end $$;

-- 2.7 Количество попыток теста
create or replace function public.count_test_attempts(
  p_test_id uuid, p_static text default null, p_discord text default null
) returns integer
language sql security definer set search_path = public stable as $$
  select count(*)::integer from public.test_attempts a
  where a.test_id = p_test_id
    and ((p_static is not null and lower(a.static_id) = lower(p_static))
      or (p_discord is not null and lower(a.discord) = lower(p_discord)));
$$;

-- 2.8 Проверка блокировки
create or replace function public.check_test_blocked(
  p_test_id uuid, p_static text default null, p_discord text default null
) returns text
language sql security definer set search_path = public stable as $$
  select b.reason from public.test_blocks b
  where (b.test_id = p_test_id or b.test_id is null)
    and ((p_static is not null and lower(b.value) = lower(p_static))
      or (p_discord is not null and lower(b.value) = lower(p_discord)))
  order by b.created_at desc limit 1;
$$;

-- 2.9 Отправка результата прохождения теста
create or replace function public.submit_test_attempt(
  p_test_id uuid, p_fio text, p_static text, p_discord text default null,
  p_answers jsonb default '{}'::jsonb, p_score integer default null,
  p_max integer default null, p_percent numeric default null,
  p_passed boolean default null, p_started timestamptz default now()
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_blocked text;
  v_max int;
  v_count int;
begin
  select public.check_test_blocked(p_test_id, p_static, p_discord) into v_blocked;
  if v_blocked is not null then
    raise exception 'blocked: %', v_blocked;
  end if;
  select t.max_attempts into v_max from public.tests t where t.id = p_test_id;
  if v_max is not null and v_max > 0 then
    select public.count_test_attempts(p_test_id, p_static, p_discord) into v_count;
    if v_count >= v_max then
      raise exception 'max attempts reached';
    end if;
  end if;
  insert into public.test_attempts (test_id, fio, static_id, discord, answers, score, total,
                                    percent, passed, started_at, finished_at, review_status)
  values (p_test_id, p_fio, p_static, p_discord, coalesce(p_answers,'{}'::jsonb), p_score, p_max,
          p_percent, p_passed, coalesce(p_started, now()), now(), 'pending')
  returning id into v_id;
  return v_id;
end $$;

-- 2.10 Запрос результата теста в Discord (обрабатывает бот)
create or replace function public.request_test_result(
  p_attempt_id uuid, p_channel_id text default null, p_ping_discord text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  insert into public.test_result_requests (attempt_id, channel_id, ping_discord, status)
  values (p_attempt_id, p_channel_id, p_ping_discord, 'pending')
  returning id into v_id;
  return v_id;
end $$;

-- 2.11 Получить (или создать) черновик премирования
create or replace function public.ensure_payroll_draft()
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  select d.id into v_id from public.payroll_drafts d
  where d.status = 'draft' order by d.created_at desc limit 1;
  if v_id is null then
    insert into public.payroll_drafts (title, status, data, pct_manual, updated_at)
    values ('Реестр премирования от ' || to_char(now(), 'DD.MM.YYYY'), 'draft',
            '{"departments":[]}'::jsonb, true, now())
    returning id into v_id;
  end if;
  return v_id;
end $$;

-- 2.12 Архивировать черновик премирования после отправки
create or replace function public.archive_payroll_draft(
  p_id uuid, p_ds_msg_id text default null, p_ds_ch_id text default null, p_sent_by_name text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.payroll_drafts
     set status = 'sent', sent_at = now(),
         sent_by = auth.uid(), sent_by_name = p_sent_by_name,
         ds_message_id = p_ds_msg_id, ds_channel_id = p_ds_ch_id,
         updated_at = now()
   where id = p_id;
  insert into public.payroll_archive (title, fund_amount, pct_manual, data, sent_at,
                                      sent_by, sent_by_name, ds_message_id, ds_channel_id)
  select d.title, d.fund_amount, d.pct_manual, d.data, now(),
         auth.uid(), p_sent_by_name, p_ds_msg_id, p_ds_ch_id
    from public.payroll_drafts d where d.id = p_id;
end $$;

-- Контент страниц сайта (Услуги, Медикаменты и др.): читают все,
-- запись — админ или делегированное право (site:edit / services:edit / meds:edit).
-- Строки НЕ сидим: страницы берут встроенный дефолт, если записи нет.
create table if not exists public.site_data (
  key text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- 2.0 Проверка «вызывающий — админ» (security definer — не рекурсирует в RLS)
create or replace function public.is_admin()
returns boolean
language sql security definer stable set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id = auth.uid() and role = 'admin');
$$;

-- Права на выполнение RPC
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.staff_upsert_role(uuid, text, text, uuid) to authenticated;
grant execute on function public.get_complaint_form() to anon, authenticated;
grant execute on function public.submit_complaint(jsonb, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.submit_request(text, jsonb, text, text, text) to anon, authenticated;
grant execute on function public.get_supply_form() to anon, authenticated;
grant execute on function public.submit_supply_request(text, text, text, jsonb) to anon, authenticated;
grant execute on function public.count_test_attempts(uuid, text, text) to anon, authenticated;
grant execute on function public.check_test_blocked(uuid, text, text) to anon, authenticated;
grant execute on function public.submit_test_attempt(uuid, text, text, text, jsonb, integer, integer, numeric, boolean, timestamptz) to anon, authenticated;
grant execute on function public.request_test_result(uuid, text, text) to anon, authenticated;
grant execute on function public.ensure_payroll_draft() to authenticated;
grant execute on function public.archive_payroll_draft(uuid, text, text, text) to authenticated;

-- =====================================================================
-- 3. ПРАВА ДОСТУПА И RLS
--    Чтение — все (anon), запись — авторизованные (authenticated),
--    бот ходит через service_role и RLS обходит автоматически.
-- =====================================================================

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;

-- user_roles: читают только авторизованные, назначение — через RPC,
-- удаление роли (кнопка 🗑 в ЛК) — админам напрямую
revoke select on public.user_roles from anon;
revoke insert, update on public.user_roles from authenticated;
grant delete on public.user_roles to authenticated;

-- custom_roles: читают авторизованные; запись — только админам (через политику)
revoke select on public.custom_roles from anon;

alter table public.user_roles enable row level security;
alter table public.custom_roles enable row level security;

drop policy if exists ur_select on public.user_roles;
create policy ur_select on public.user_roles
  for select to authenticated using (true);

drop policy if exists ur_admin_delete on public.user_roles;
create policy ur_admin_delete on public.user_roles
  for delete to authenticated using (public.is_admin());

drop policy if exists cr_select on public.custom_roles;
create policy cr_select on public.custom_roles
  for select to authenticated using (true);

drop policy if exists cr_admin_write on public.custom_roles;
create policy cr_admin_write on public.custom_roles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- site_data: право записи = admin ИЛИ делегированное право в кастомной роли
-- (site:edit либо <раздел>:edit, где раздел — ключ без суффикса "_page").
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

-- Остальные таблицы: чтение всем, запись авторизованным
do $$
declare
  t text;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public'
      and tablename not in ('user_roles', 'custom_roles', 'site_data')
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists read_all on public.%I', t);
    execute format('create policy read_all on public.%I for select to anon, authenticated using (true)', t);
    execute format('drop policy if exists write_auth on public.%I', t);
    execute format('create policy write_auth on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- =====================================================================
-- 4. REALTIME (нужно Discord-боту: мгновенные уведомления)
-- =====================================================================

do $$
begin
  alter publication supabase_realtime add table public.applications;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.ds_sync_requests;
exception when duplicate_object then null;
end $$;

-- =====================================================================
-- 4.1 СИСТЕМНЫЕ РОЛИ (пресеты прав). key = системный идентификатор.
--     Старший состав (ключ ss) применяется автоматически всем, у кого
--     базовая роль в user_roles = 'ss'. Операторы назначаются админом
--     через ЛК → панель ролей.
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
-- 5. ПЕРВЫЙ АДМИНИСТРАТОР (раскомментируй и подставь свой UUID)
--    UUID смотри: Authentication → Users → твой email → колонка UID.
--    Без этого шага служебные разделы на сайте будут скрыты!
-- =====================================================================
-- insert into public.user_roles (user_id, role, display_name)
-- values ('00000000-0000-0000-0000-000000000000', 'admin', 'Главный врач')
-- on conflict (user_id) do update set role = 'admin';

-- =====================================================================
-- ГОТОВО. Проверка: в Table Editor должны появиться все таблицы выше.
-- =====================================================================
