-- =============================================
--  가격레이더 — Supabase 테이블 생성 SQL
--  Supabase > SQL Editor > New query 에 붙여넣고 Run 클릭
-- =============================================

create table if not exists settings (
  id              int primary key default 1,
  password_hash   text,
  naver_client_id text,
  naver_client_secret text,
  alert_email     text,
  cron_time       text default '09:00',
  is_active       boolean default true
);

create table if not exists groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  color      text default '#1D9E75',
  created_at timestamptz default now()
);

create table if not exists products (
  id               uuid primary key default gen_random_uuid(),
  group_id         uuid references groups(id) on delete set null,
  name             text not null,
  my_price         int,
  is_tracking      boolean default true,
  last_checked_at  timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create table if not exists price_history (
  id                  uuid primary key default gen_random_uuid(),
  product_id          uuid references products(id) on delete cascade,
  checked_at          timestamptz default now(),
  naver_lowest_price  int,
  mall_name           text,
  shipping            int default 0,
  total               int,
  link                text,
  match_type          text
);

create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  sent_at    timestamptz default now(),
  channel    text,
  message    text,
  status     text default 'sent'
);

-- 기본 설정 행 삽입 (없으면)
insert into settings (id) values (1) on conflict (id) do nothing;

-- RLS (Row Level Security) — 외부 직접 접근 차단
alter table settings       enable row level security;
alter table groups         enable row level security;
alter table products       enable row level security;
alter table price_history  enable row level security;
alter table notifications  enable row level security;

-- 서버(service role)에서만 접근 허용
create policy "server only" on settings       for all using (false);
create policy "server only" on groups         for all using (false);
create policy "server only" on products       for all using (false);
create policy "server only" on price_history  for all using (false);
create policy "server only" on notifications  for all using (false);
