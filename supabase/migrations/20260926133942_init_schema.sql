-- 초기 스키마 생성 (신설 — 기존 데이터 없음, 데이터 이관 아님)
-- Notion 찬양/말씀 DB 콘텐츠를 이 스키마로 옮기는 작업은 별도로 진행 (docs: 기술 아키텍처 · ERD, 6번 체크리스트)

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 태그 마스터 테이블 (관리자 UI에서 값 추가/편집 가능)
-- ---------------------------------------------------------------------------

create table themes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table situations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table moods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

-- ---------------------------------------------------------------------------
-- 콘텐츠 테이블
-- ---------------------------------------------------------------------------

create table songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null,
  listen_url text,
  lyrics_keywords text,
  is_reviewed boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table verses (
  id uuid primary key default gen_random_uuid(),
  reference text not null,
  body text not null,
  translation text not null check (translation in ('개역개정', '새번역', '쉬운성경')),
  is_reviewed boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 다대다 연결 테이블 (찬양은 주제·상황·분위기, 말씀은 주제·상황만 — 의도된 비대칭)
-- ---------------------------------------------------------------------------

create table song_themes (
  song_id uuid not null references songs(id) on delete cascade,
  theme_id uuid not null references themes(id) on delete cascade,
  primary key (song_id, theme_id)
);

create table song_situations (
  song_id uuid not null references songs(id) on delete cascade,
  situation_id uuid not null references situations(id) on delete cascade,
  primary key (song_id, situation_id)
);

create table song_moods (
  song_id uuid not null references songs(id) on delete cascade,
  mood_id uuid not null references moods(id) on delete cascade,
  primary key (song_id, mood_id)
);

create table verse_themes (
  verse_id uuid not null references verses(id) on delete cascade,
  theme_id uuid not null references themes(id) on delete cascade,
  primary key (verse_id, theme_id)
);

create table verse_situations (
  verse_id uuid not null references verses(id) on delete cascade,
  situation_id uuid not null references situations(id) on delete cascade,
  primary key (verse_id, situation_id)
);

-- ---------------------------------------------------------------------------
-- 관리자 권한 — "로그인했으면 admin"이 아니라 명시적 멤버십으로 관리
-- (2차에서 Anonymous Sign-In으로 방문자도 authenticated가 되는 것에 대비)
-- ---------------------------------------------------------------------------

create table admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- RLS: MVP는 전부 켜고 정책 0개 — 접근은 전부 서버(service role) 경유
-- 2차에서 브라우저가 Supabase를 직접 호출하게 되면 posts/comments에만 정책 추가
-- ---------------------------------------------------------------------------

alter table themes enable row level security;
alter table situations enable row level security;
alter table moods enable row level security;
alter table songs enable row level security;
alter table verses enable row level security;
alter table song_themes enable row level security;
alter table song_situations enable row level security;
alter table song_moods enable row level security;
alter table verse_themes enable row level security;
alter table verse_situations enable row level security;
alter table admins enable row level security;

-- ---------------------------------------------------------------------------
-- 초기 태그 값 (기획안 "태그 값" 기준)
-- ---------------------------------------------------------------------------

insert into themes (name) values
  ('위로'), ('감사'), ('회개'), ('소망'), ('사랑'), ('평안'), ('헌신'), ('기쁨');

insert into situations (name) values
  ('아침'), ('점심'), ('저녁'), ('드라이브'), ('자기 전'), ('위로받고 싶을 때');

insert into moods (name) values
  ('잔잔함'), ('신남'), ('웅장함'), ('따뜻함'), ('고요함');
