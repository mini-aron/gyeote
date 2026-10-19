-- 가사 원문은 저작권 때문에 관리자가 지정한 열람자(와 관리자)에게만 서버를 거쳐 보여준다.
-- status가 found가 아닌 행도 남겨서 수집 크론이 같은 곡을 매번 다시 찾지 않게 한다.
create table song_lyrics (
  song_id uuid primary key references songs(id) on delete cascade,
  status text not null check (status in ('found', 'not_found', 'ambiguous')),
  lyrics text,
  source text not null check (source in ('gasazip', 'manual')),
  source_ref text,
  fetched_at timestamptz not null default now(),
  check ((status = 'found') = (lyrics is not null))
);

create table lyrics_viewers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table song_lyrics enable row level security;
alter table lyrics_viewers enable row level security;

-- 관리자가 이메일로 열람자를 지정할 때만 쓴다. auth 스키마를 읽으므로 서버 전용.
create function public.find_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from auth.users where lower(email) = lower(btrim(p_email)) limit 1;
$$;

revoke execute on function public.find_user_id_by_email(text) from public, anon, authenticated;
