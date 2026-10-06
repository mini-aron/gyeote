-- 성경 66권 참조 테이블. 이 파일은 "데이터 SQL은 커밋하지 않는다"는 원칙의 예외다 — 고정 참조 데이터라
-- 스키마 성립에 필요하고(verses.book_id not null 백필), 새 환경의 db reset도 이 파일만으로 통과해야 한다.

create table bible_books (
  id smallint primary key check (id between 1 and 66),
  name text not null unique,
  testament text not null check (testament in ('old', 'new')),
  category text not null,
  check (
    (testament = 'old' and category in ('모세오경', '역사서', '시가서', '대선지서', '소선지서'))
    or (testament = 'new' and category in ('복음서', '역사서', '바울서신', '일반서신', '예언서'))
  )
);

alter table bible_books enable row level security;

insert into bible_books (id, name, testament, category) values
  (1, '창세기', 'old', '모세오경'),
  (2, '출애굽기', 'old', '모세오경'),
  (3, '레위기', 'old', '모세오경'),
  (4, '민수기', 'old', '모세오경'),
  (5, '신명기', 'old', '모세오경'),
  (6, '여호수아', 'old', '역사서'),
  (7, '사사기', 'old', '역사서'),
  (8, '룻기', 'old', '역사서'),
  (9, '사무엘상', 'old', '역사서'),
  (10, '사무엘하', 'old', '역사서'),
  (11, '열왕기상', 'old', '역사서'),
  (12, '열왕기하', 'old', '역사서'),
  (13, '역대상', 'old', '역사서'),
  (14, '역대하', 'old', '역사서'),
  (15, '에스라', 'old', '역사서'),
  (16, '느헤미야', 'old', '역사서'),
  (17, '에스더', 'old', '역사서'),
  (18, '욥기', 'old', '시가서'),
  (19, '시편', 'old', '시가서'),
  (20, '잠언', 'old', '시가서'),
  (21, '전도서', 'old', '시가서'),
  (22, '아가', 'old', '시가서'),
  (23, '이사야', 'old', '대선지서'),
  (24, '예레미야', 'old', '대선지서'),
  (25, '예레미야애가', 'old', '대선지서'),
  (26, '에스겔', 'old', '대선지서'),
  (27, '다니엘', 'old', '대선지서'),
  (28, '호세아', 'old', '소선지서'),
  (29, '요엘', 'old', '소선지서'),
  (30, '아모스', 'old', '소선지서'),
  (31, '오바댜', 'old', '소선지서'),
  (32, '요나', 'old', '소선지서'),
  (33, '미가', 'old', '소선지서'),
  (34, '나훔', 'old', '소선지서'),
  (35, '하박국', 'old', '소선지서'),
  (36, '스바냐', 'old', '소선지서'),
  (37, '학개', 'old', '소선지서'),
  (38, '스가랴', 'old', '소선지서'),
  (39, '말라기', 'old', '소선지서'),
  (40, '마태복음', 'new', '복음서'),
  (41, '마가복음', 'new', '복음서'),
  (42, '누가복음', 'new', '복음서'),
  (43, '요한복음', 'new', '복음서'),
  (44, '사도행전', 'new', '역사서'),
  (45, '로마서', 'new', '바울서신'),
  (46, '고린도전서', 'new', '바울서신'),
  (47, '고린도후서', 'new', '바울서신'),
  (48, '갈라디아서', 'new', '바울서신'),
  (49, '에베소서', 'new', '바울서신'),
  (50, '빌립보서', 'new', '바울서신'),
  (51, '골로새서', 'new', '바울서신'),
  (52, '데살로니가전서', 'new', '바울서신'),
  (53, '데살로니가후서', 'new', '바울서신'),
  (54, '디모데전서', 'new', '바울서신'),
  (55, '디모데후서', 'new', '바울서신'),
  (56, '디도서', 'new', '바울서신'),
  (57, '빌레몬서', 'new', '바울서신'),
  (58, '히브리서', 'new', '일반서신'),
  (59, '야고보서', 'new', '일반서신'),
  (60, '베드로전서', 'new', '일반서신'),
  (61, '베드로후서', 'new', '일반서신'),
  (62, '요한일서', 'new', '일반서신'),
  (63, '요한이서', 'new', '일반서신'),
  (64, '요한삼서', 'new', '일반서신'),
  (65, '유다서', 'new', '일반서신'),
  (66, '요한계시록', 'new', '예언서');

-- ---------------------------------------------------------------------------
-- verses: reference 문자열을 책/장/절로 분해해 검색·분류에 쓴다
-- ---------------------------------------------------------------------------

alter table verses add column book_id smallint references bible_books(id);
alter table verses add column chapter smallint;
alter table verses add column verse_start smallint;
alter table verses add column verse_end smallint;

update verses v
set book_id = b.id,
    chapter = m[2]::smallint,
    verse_start = m[3]::smallint,
    verse_end = m[4]::smallint
from (
  select id, regexp_match(reference, '^(.+?) (\d+):(\d+)(?:-(\d+))?$') as m
  from verses
) p
join bible_books b on b.name = p.m[1]
where v.id = p.id;

do $$
begin
  if exists (select 1 from verses where book_id is null) then
    raise exception 'verses.reference를 책/장/절로 분해하지 못한 행이 있습니다';
  end if;
end $$;

alter table verses alter column book_id set not null;
alter table verses alter column chapter set not null;
alter table verses alter column verse_start set not null;
alter table verses add constraint verses_verse_end_check check (verse_end is null or verse_end > verse_start);

create index verses_book_id_chapter_idx on verses (book_id, chapter);
