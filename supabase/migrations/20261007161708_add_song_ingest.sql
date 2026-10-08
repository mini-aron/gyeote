-- 찬양 자동 수집 파이프라인 스키마: 수집 채널, 후보 큐, 곡 영상 연결, 승인 함수.
-- 후보는 서버(service role)만 다루므로 두 테이블 모두 RLS만 켜고 정책은 두지 않는다.

create table ingest_channels (
  id uuid primary key default gen_random_uuid(),
  youtube_channel_id text not null unique,
  uploads_playlist_id text not null,
  name text not null,
  kind text not null check (kind in ('artist', 'label', 'topic')),
  default_artist text,
  status text not null default 'tracking' check (status in ('tracking', 'ignored')),
  last_checked_at timestamptz,
  last_seen_published_at timestamptz,
  backfill_page_token text,
  fail_count int not null default 0,
  last_error text,
  created_at timestamptz not null default now()
);

create table song_candidates (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in (
    'new', 'needs_video', 'parsed', 'tagged', 'approved', 'rejected', 'duplicate', 'unavailable'
  )),
  source text not null check (source in ('youtube', 'manual')),
  -- 부분 unique는 supabase-js upsert onConflict와 충돌해서 일반 unique를 쓴다 (NULL은 여러 개 허용)
  youtube_video_id text unique,
  channel_id uuid references ingest_channels(id) on delete set null,
  raw_title text,
  api_fetched_at timestamptz,
  published_at timestamptz,
  embeddable boolean,
  video_kind text check (video_kind in ('mv', 'audio', 'lyric', 'live', 'unknown')),
  title text,
  artist text,
  parse_method text check (parse_method in ('rule', 'ai', 'manual')),
  -- 중복 판정은 앱 코드에서 하므로 unique가 아닌 일반 인덱스
  dedupe_key text,
  suggested_tags jsonb,
  summary text,
  admin_memo text,
  possible_duplicate_song_id uuid references songs(id) on delete set null,
  song_id uuid references songs(id) on delete set null,
  ai_attempts int not null default 0,
  last_error text,
  reject_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index song_candidates_status_idx on song_candidates (status);
create index song_candidates_dedupe_key_idx on song_candidates (dedupe_key);

alter table ingest_channels enable row level security;
alter table song_candidates enable row level security;
-- RLS는 TRUNCATE/REFERENCES에 적용되지 않아 테이블 권한도 함께 회수한다
revoke all on ingest_channels, song_candidates from anon, authenticated;

-- songs에 영상 연결 (listen_url은 벅스 링크로 그대로 유지)
alter table songs add column youtube_video_id text unique;
alter table songs add column video_checked_at timestamptz;
alter table songs add column video_unavailable_at timestamptz;

-- 승인: 후보 검증 + songs/태그 연결 생성을 한 트랜잭션으로 처리. 서버 전용 (service role 경유)
create or replace function public.promote_song_candidate(
  p_candidate_id uuid,
  p_reviewer uuid
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_candidate song_candidates;
  v_song_id uuid;
  v_theme_names text[];
  v_situation_names text[];
  v_mood_names text[];
begin
  if not exists (select 1 from admins where user_id = p_reviewer) then
    raise exception 'reviewer % is not an admin', p_reviewer;
  end if;

  -- 조건부 UPDATE로 동시 승인을 막는다
  update song_candidates
  set status = 'approved',
      reviewed_by = p_reviewer,
      reviewed_at = now(),
      updated_at = now()
  where id = p_candidate_id
    and status = 'tagged'
    and youtube_video_id is not null
    and embeddable
    and possible_duplicate_song_id is null
  returning * into v_candidate;

  if not found then
    raise exception 'candidate % is not approvable', p_candidate_id;
  end if;

  if coalesce(btrim(v_candidate.title), '') = '' or coalesce(btrim(v_candidate.artist), '') = '' then
    raise exception 'candidate % has empty title or artist', p_candidate_id;
  end if;

  if jsonb_typeof(v_candidate.suggested_tags -> 'situations') not in ('array', 'null')
     and v_candidate.suggested_tags -> 'situations' is not null then
    raise exception 'candidate % has invalid situations', p_candidate_id;
  end if;

  if jsonb_typeof(v_candidate.suggested_tags -> 'themes') is distinct from 'array'
     or jsonb_typeof(v_candidate.suggested_tags -> 'moods') is distinct from 'array'
     or jsonb_array_length(v_candidate.suggested_tags -> 'themes') < 1
     or jsonb_array_length(v_candidate.suggested_tags -> 'moods') < 1 then
    raise exception 'candidate % needs at least one theme and one mood', p_candidate_id;
  end if;

  select array(select distinct jsonb_array_elements_text(v_candidate.suggested_tags -> 'themes'))
    into v_theme_names;
  select array(select distinct jsonb_array_elements_text(v_candidate.suggested_tags -> 'moods'))
    into v_mood_names;
  select array(select distinct jsonb_array_elements_text(
           case when jsonb_typeof(v_candidate.suggested_tags -> 'situations') = 'array'
                then v_candidate.suggested_tags -> 'situations'
                else '[]'::jsonb end))
    into v_situation_names;

  -- 이름 수와 매칭된 태그 수가 다르면 조용히 누락하지 않고 멈춘다
  if (select count(*) from themes where name = any(v_theme_names)) <> cardinality(v_theme_names)
     or (select count(*) from moods where name = any(v_mood_names)) <> cardinality(v_mood_names)
     or (select count(*) from situations where name = any(v_situation_names)) <> cardinality(v_situation_names) then
    raise exception 'candidate % has unknown tag names', p_candidate_id;
  end if;

  insert into songs (title, artist, summary, youtube_video_id, is_reviewed, is_active)
  values (v_candidate.title, v_candidate.artist, v_candidate.summary, v_candidate.youtube_video_id, true, true)
  returning id into v_song_id;

  insert into song_themes (song_id, theme_id)
  select v_song_id, id from themes where name = any(v_theme_names);
  insert into song_moods (song_id, mood_id)
  select v_song_id, id from moods where name = any(v_mood_names);
  insert into song_situations (song_id, situation_id)
  select v_song_id, id from situations where name = any(v_situation_names);

  update song_candidates set song_id = v_song_id where id = p_candidate_id;

  return v_song_id;
end;
$$;

revoke execute on function public.promote_song_candidate(uuid, uuid) from public, anon, authenticated;
