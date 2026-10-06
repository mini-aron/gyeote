-- 회원 기능 테이블. 콘텐츠와 달리 사용자 개인 데이터라 RLS를 켜고 본인 행 조회/삭제 정책만 둔다.
-- INSERT/UPDATE는 정책 없이 서버(service role)를 경유한다.

create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 20),
  avatar_url text,
  keep_history boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- append-only 동의 이력 — 철회도 새 행(agreed=false)으로 남긴다
create table user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null check (consent_type in ('terms', 'privacy', 'sensitive', 'age14', 'marketing')),
  version text not null,
  agreed boolean not null,
  created_at timestamptz not null default now()
);

create index user_consents_user_type_created_idx on user_consents (user_id, consent_type, created_at desc);

create table counsel_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_request_id uuid not null,
  mode text not null check (mode in ('church', 'backyard')),
  verse_id uuid references verses(id) on delete restrict,
  song_id uuid references songs(id) on delete restrict,
  previous_song_ids uuid[] not null default '{}',
  result_line text,
  analysis jsonb,
  transcript jsonb,
  local_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_request_id),
  check (cardinality(previous_song_ids) <= 3),
  check (transcript is null or pg_column_size(transcript) <= 16384),
  check (analysis is null or pg_column_size(analysis) <= 4096)
);

create index counsel_records_user_local_date_idx on counsel_records (user_id, local_date);
create index counsel_records_user_created_idx on counsel_records (user_id, created_at desc);

create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_date date not null,
  event_time time,
  title text not null check (char_length(title) between 1 and 50),
  memo text check (char_length(memo) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index calendar_events_user_date_idx on calendar_events (user_id, event_date);

create table verse_bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  verse_id uuid not null references verses(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (user_id, verse_id)
);

create index verse_bookmarks_user_created_idx on verse_bookmarks (user_id, created_at desc);

create table song_bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id uuid not null references songs(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (user_id, song_id)
);

create index song_bookmarks_user_created_idx on song_bookmarks (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS — 본인 행만 조회, 삭제는 사용자 데이터 테이블에 한해 허용
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;
alter table user_consents enable row level security;
alter table counsel_records enable row level security;
alter table calendar_events enable row level security;
alter table verse_bookmarks enable row level security;
alter table song_bookmarks enable row level security;

create policy profiles_select_own on profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy user_consents_select_own on user_consents
  for select to authenticated using (user_id = (select auth.uid()));
create policy counsel_records_select_own on counsel_records
  for select to authenticated using (user_id = (select auth.uid()));
create policy calendar_events_select_own on calendar_events
  for select to authenticated using (user_id = (select auth.uid()));
create policy verse_bookmarks_select_own on verse_bookmarks
  for select to authenticated using (user_id = (select auth.uid()));
create policy song_bookmarks_select_own on song_bookmarks
  for select to authenticated using (user_id = (select auth.uid()));

create policy counsel_records_delete_own on counsel_records
  for delete to authenticated using (user_id = (select auth.uid()));
create policy calendar_events_delete_own on calendar_events
  for delete to authenticated using (user_id = (select auth.uid()));
create policy verse_bookmarks_delete_own on verse_bookmarks
  for delete to authenticated using (user_id = (select auth.uid()));
create policy song_bookmarks_delete_own on song_bookmarks
  for delete to authenticated using (user_id = (select auth.uid()));
