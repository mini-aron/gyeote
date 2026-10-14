-- p_match_any 추가: 태그를 그룹끼리 AND로 거르지 않고, 맞는 태그가 많은 순으로 정렬한다("마음으로 찾기").
-- 기본값이 있는 오버로드가 남으면 PostgREST가 함수를 고르지 못하므로(PGRST203) 옛 시그니처를 먼저 지운다.
drop function if exists public.search_verses(text, smallint[], smallint, smallint, uuid[], uuid[], uuid[], text, int, int);
drop function if exists public.search_songs(text, uuid[], uuid[], uuid[], uuid[], text, int, int);

-- 배열 인자 규칙: null = 조건 없음, 빈 배열 = 아무것도 매칭 안 함(fail-closed). 정렬 모드(시드 랜덤 여부)는 호출자가 p_seed로 정한다.
create function public.search_verses(
  p_q text default null,
  p_book_ids smallint[] default null,
  p_chapter smallint default null,
  p_verse smallint default null,
  p_theme_ids uuid[] default null,
  p_situation_ids uuid[] default null,
  p_only_ids uuid[] default null,
  p_seed text default null,
  p_limit int default 50,
  p_offset int default 0,
  p_match_any boolean default false
) returns table (
  id uuid,
  reference text,
  body text,
  translation text,
  meaning text,
  application text,
  total bigint
)
language sql
stable
set search_path = public
as $$
  with kw as (
    -- ilike 와일드카드(\ % _)는 여기서만 이스케이프한다. 호출자는 원문을 넘긴다.
    select
      '%' || regexp_replace(s.q, '([\\%_])', '\\\1', 'g') || '%' as phrase,
      array(
        select '%' || regexp_replace(t, '([\\%_])', '\\\1', 'g') || '%'
        from regexp_split_to_table(s.q, '\s+') as t
        where t <> ''
      ) as tokens
    from (select nullif(btrim(p_q), '') as q) as s
  )
  select
    v.id, v.reference, v.body, v.translation, v.meaning, v.application,
    count(*) over () as total
  from verses as v
  cross join kw
  cross join lateral (
    select
      (select count(*) from verse_themes as vt where vt.verse_id = v.id and vt.theme_id = any (p_theme_ids))
      + (select count(*) from verse_situations as vs where vs.verse_id = v.id and vs.situation_id = any (p_situation_ids))
      as score
  ) as tag
  where v.is_reviewed
    and v.is_active
    and (p_book_ids is null or v.book_id = any (p_book_ids))
    and (p_chapter is null or v.chapter = p_chapter)
    and (p_only_ids is null or v.id = any (p_only_ids))
    and (p_match_any or p_theme_ids is null or exists (
      select 1 from verse_themes as vt where vt.verse_id = v.id and vt.theme_id = any (p_theme_ids)))
    and (p_match_any or p_situation_ids is null or exists (
      select 1 from verse_situations as vs where vs.verse_id = v.id and vs.situation_id = any (p_situation_ids)))
    and (not p_match_any or (p_theme_ids is null and p_situation_ids is null) or tag.score > 0)
    -- meaning은 null일 수 있어 coalesce가 없으면 not (... or null)이 null이 되어 토큰 불일치가 통과된다.
    and not exists (
      select 1 from unnest(kw.tokens) as tk(pattern)
      where not (
        v.reference ilike tk.pattern
        or v.body ilike tk.pattern
        or coalesce(v.meaning, '') ilike tk.pattern))
  order by
    case when p_match_any then tag.score end desc nulls last,
    case
      when kw.phrase is null then 0
      when v.reference ilike kw.phrase then 1
      when v.body ilike kw.phrase then 2
      when coalesce(v.meaning, '') ilike kw.phrase then 3
      else 4
    end,
    case when p_verse between v.verse_start and coalesce(v.verse_end, v.verse_start) then 0 else 1 end,
    case when p_seed is not null then md5(v.id::text || p_seed) end,
    v.book_id, v.chapter, v.verse_start, v.id
  limit least(greatest(coalesce(p_limit, 50), 1), 500)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke execute on function public.search_verses(text, smallint[], smallint, smallint, uuid[], uuid[], uuid[], text, int, int, boolean)
  from public, anon, authenticated;

create function public.search_songs(
  p_q text default null,
  p_theme_ids uuid[] default null,
  p_situation_ids uuid[] default null,
  p_mood_ids uuid[] default null,
  p_only_ids uuid[] default null,
  p_seed text default null,
  p_limit int default 50,
  p_offset int default 0,
  p_match_any boolean default false
) returns table (
  id uuid,
  title text,
  artist text,
  listen_url text,
  summary text,
  total bigint
)
language sql
stable
set search_path = public
as $$
  with kw as (
    select
      s.q,
      regexp_replace(s.q, '([\\%_])', '\\\1', 'g') as escaped,
      array(
        select '%' || regexp_replace(t, '([\\%_])', '\\\1', 'g') || '%'
        from regexp_split_to_table(s.q, '\s+') as t
        where t <> ''
      ) as tokens
    from (select nullif(btrim(p_q), '') as q) as s
  )
  select
    so.id, so.title, so.artist, so.listen_url, so.summary,
    count(*) over () as total
  from songs as so
  cross join kw
  cross join lateral (
    select
      (select count(*) from song_themes as st where st.song_id = so.id and st.theme_id = any (p_theme_ids))
      + (select count(*) from song_situations as ss where ss.song_id = so.id and ss.situation_id = any (p_situation_ids))
      + (select count(*) from song_moods as sm where sm.song_id = so.id and sm.mood_id = any (p_mood_ids))
      as score
  ) as tag
  where so.is_reviewed
    and so.is_active
    and (p_only_ids is null or so.id = any (p_only_ids))
    and (p_match_any or p_theme_ids is null or exists (
      select 1 from song_themes as st where st.song_id = so.id and st.theme_id = any (p_theme_ids)))
    and (p_match_any or p_situation_ids is null or exists (
      select 1 from song_situations as ss where ss.song_id = so.id and ss.situation_id = any (p_situation_ids)))
    and (p_match_any or p_mood_ids is null or exists (
      select 1 from song_moods as sm where sm.song_id = so.id and sm.mood_id = any (p_mood_ids)))
    and (not p_match_any or (p_theme_ids is null and p_situation_ids is null and p_mood_ids is null) or tag.score > 0)
    and not exists (
      select 1 from unnest(kw.tokens) as tk(pattern)
      where not (
        so.title ilike tk.pattern
        or so.artist ilike tk.pattern
        or coalesce(so.summary, '') ilike tk.pattern
        or coalesce(so.lyrics_keywords, '') ilike tk.pattern))
  order by
    case when p_match_any then tag.score end desc nulls last,
    case
      when kw.q is null then 0
      when lower(so.title) = lower(kw.q) then 1
      when so.title ilike kw.escaped || '%' then 2
      when so.title ilike '%' || kw.escaped || '%' then 3
      when so.artist ilike '%' || kw.escaped || '%' then 4
      else 5
    end,
    case when p_seed is not null then md5(so.id::text || p_seed) end,
    so.title, so.id
  limit least(greatest(coalesce(p_limit, 50), 1), 500)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke execute on function public.search_songs(text, uuid[], uuid[], uuid[], uuid[], text, int, int, boolean)
  from public, anon, authenticated;
