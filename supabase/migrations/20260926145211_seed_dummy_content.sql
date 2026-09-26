-- 교회 흐름(F-05~F-08) 개발/테스트용 더미 콘텐츠 시드.
-- 실제 검수된 찬양·말씀은 Notion DB에서 별도로 옮겨질 예정이며(기술 아키텍처 · ERD 6번 체크리스트),
-- 이 시드는 그전까지 추천 로직(F-08)을 태그 조합별로 테스트하기 위한 것.
-- 찬양 제목/아티스트는 전부 가상의 이름이다. 말씀은 실제 성경 구절(개역개정)을 사용한다.

do $$
declare
  theme_comfort uuid; theme_gratitude uuid; theme_hope uuid; theme_love uuid;
  theme_peace uuid; theme_devotion uuid; theme_joy uuid;

  situation_morning uuid; situation_noon uuid; situation_evening uuid;
  situation_drive uuid; situation_before_sleep uuid; situation_want_comfort uuid;

  mood_calm uuid; mood_upbeat uuid; mood_grand uuid; mood_warm uuid; mood_quiet uuid;

  song_id uuid;
  verse_id uuid;
begin
  select id into theme_comfort from themes where name = '위로';
  select id into theme_gratitude from themes where name = '감사';
  select id into theme_hope from themes where name = '소망';
  select id into theme_love from themes where name = '사랑';
  select id into theme_peace from themes where name = '평안';
  select id into theme_devotion from themes where name = '헌신';
  select id into theme_joy from themes where name = '기쁨';

  select id into situation_morning from situations where name = '아침';
  select id into situation_noon from situations where name = '점심';
  select id into situation_evening from situations where name = '저녁';
  select id into situation_drive from situations where name = '드라이브';
  select id into situation_before_sleep from situations where name = '자기 전';
  select id into situation_want_comfort from situations where name = '위로받고 싶을 때';

  select id into mood_calm from moods where name = '잔잔함';
  select id into mood_upbeat from moods where name = '신남';
  select id into mood_grand from moods where name = '웅장함';
  select id into mood_warm from moods where name = '따뜻함';
  select id into mood_quiet from moods where name = '고요함';

  -- ---------------------------------------------------------------------
  -- 말씀 12개
  -- ---------------------------------------------------------------------

  insert into verses (reference, body, translation, is_reviewed, is_active)
    values ('시편 23:1', '여호와는 나의 목자시니 내게 부족함이 없으리로다', '개역개정', true, true)
    returning id into verse_id;
  insert into verse_themes (verse_id, theme_id) values (verse_id, theme_comfort), (verse_id, theme_peace);
  insert into verse_situations (verse_id, situation_id) values (verse_id, situation_before_sleep), (verse_id, situation_want_comfort);

  insert into verses (reference, body, translation, is_reviewed, is_active)
    values ('빌립보서 4:6', '아무것도 염려하지 말고 다만 모든 일에 기도와 간구로, 너희 구할 것을 감사함으로 하나님께 아뢰라', '개역개정', true, true)
    returning id into verse_id;
  insert into verse_themes (verse_id, theme_id) values (verse_id, theme_peace), (verse_id, theme_hope);
  insert into verse_situations (verse_id, situation_id) values (verse_id, situation_evening), (verse_id, situation_want_comfort);

  insert into verses (reference, body, translation, is_reviewed, is_active)
    values ('요한복음 3:16', '하나님이 세상을 이처럼 사랑하사 독생자를 주셨으니 이는 그를 믿는 자마다 멸망하지 않고 영생을 얻게 하려 하심이라', '개역개정', true, true)
    returning id into verse_id;
  insert into verse_themes (verse_id, theme_id) values (verse_id, theme_love), (verse_id, theme_hope);
  insert into verse_situations (verse_id, situation_id) values (verse_id, situation_morning), (verse_id, situation_evening);

  insert into verses (reference, body, translation, is_reviewed, is_active)
    values ('마태복음 11:28', '수고하고 무거운 짐 진 자들아 다 내게로 오라 내가 너희를 쉬게 하리라', '개역개정', true, true)
    returning id into verse_id;
  insert into verse_themes (verse_id, theme_id) values (verse_id, theme_comfort), (verse_id, theme_peace);
  insert into verse_situations (verse_id, situation_id) values (verse_id, situation_evening), (verse_id, situation_want_comfort);

  insert into verses (reference, body, translation, is_reviewed, is_active)
    values ('이사야 41:10', '두려워하지 말라 내가 너와 함께 함이라 놀라지 말라 나는 네 하나님이 됨이라 내가 너를 굳세게 하리라 참으로 너를 도와 주리라 참으로 나의 의로운 오른손으로 너를 붙들리라', '개역개정', true, true)
    returning id into verse_id;
  insert into verse_themes (verse_id, theme_id) values (verse_id, theme_hope), (verse_id, theme_devotion);
  insert into verse_situations (verse_id, situation_id) values (verse_id, situation_morning), (verse_id, situation_drive);

  insert into verses (reference, body, translation, is_reviewed, is_active)
    values ('시편 46:1', '하나님은 우리의 피난처시요 힘이시니 환난 중에 만날 큰 도움이시라', '개역개정', true, true)
    returning id into verse_id;
  insert into verse_themes (verse_id, theme_id) values (verse_id, theme_comfort), (verse_id, theme_peace);
  insert into verse_situations (verse_id, situation_id) values (verse_id, situation_want_comfort), (verse_id, situation_before_sleep);

  insert into verses (reference, body, translation, is_reviewed, is_active)
    values ('잠언 3:5-6', '너는 마음을 다하여 여호와를 신뢰하고 네 명철을 의지하지 말라 너는 범사에 그를 인정하라 그리하면 네 길을 지도하시리라', '개역개정', true, true)
    returning id into verse_id;
  insert into verse_themes (verse_id, theme_id) values (verse_id, theme_devotion), (verse_id, theme_hope);
  insert into verse_situations (verse_id, situation_id) values (verse_id, situation_morning), (verse_id, situation_drive);

  insert into verses (reference, body, translation, is_reviewed, is_active)
    values ('로마서 8:28', '우리가 알거니와 하나님을 사랑하는 자 곧 그의 뜻대로 부르심을 입은 자들에게는 모든 것이 합력하여 선을 이루느니라', '개역개정', true, true)
    returning id into verse_id;
  insert into verse_themes (verse_id, theme_id) values (verse_id, theme_hope), (verse_id, theme_gratitude);
  insert into verse_situations (verse_id, situation_id) values (verse_id, situation_morning), (verse_id, situation_noon);

  insert into verses (reference, body, translation, is_reviewed, is_active)
    values ('빌립보서 4:13', '내게 능력 주시는 자 안에서 내가 모든 것을 할 수 있느니라', '개역개정', true, true)
    returning id into verse_id;
  insert into verse_themes (verse_id, theme_id) values (verse_id, theme_devotion), (verse_id, theme_joy);
  insert into verse_situations (verse_id, situation_id) values (verse_id, situation_morning), (verse_id, situation_drive);

  insert into verses (reference, body, translation, is_reviewed, is_active)
    values ('데살로니가전서 5:16-18', '항상 기뻐하라 쉬지 말고 기도하라 범사에 감사하라 이것이 그리스도 예수 안에서 너희를 향하신 하나님의 뜻이니라', '개역개정', true, true)
    returning id into verse_id;
  insert into verse_themes (verse_id, theme_id) values (verse_id, theme_gratitude), (verse_id, theme_joy);
  insert into verse_situations (verse_id, situation_id) values (verse_id, situation_noon), (verse_id, situation_evening);

  insert into verses (reference, body, translation, is_reviewed, is_active)
    values ('시편 118:24', '이 날은 여호와께서 정하신 것이라 이 날에 우리가 즐거워하고 기뻐하리로다', '개역개정', true, true)
    returning id into verse_id;
  insert into verse_themes (verse_id, theme_id) values (verse_id, theme_joy), (verse_id, theme_gratitude);
  insert into verse_situations (verse_id, situation_id) values (verse_id, situation_morning), (verse_id, situation_noon);

  insert into verses (reference, body, translation, is_reviewed, is_active)
    values ('요한복음 14:27', '평안을 너희에게 끼치노니 곧 나의 평안을 너희에게 주노라 내가 너희에게 주는 것은 세상이 주는 것과 같지 아니하니라 너희는 마음에 근심하지도 말고 두려워하지도 말라', '개역개정', true, true)
    returning id into verse_id;
  insert into verse_themes (verse_id, theme_id) values (verse_id, theme_peace), (verse_id, theme_comfort);
  insert into verse_situations (verse_id, situation_id) values (verse_id, situation_before_sleep), (verse_id, situation_evening);

  -- ---------------------------------------------------------------------
  -- 찬양 12개 (전부 가상의 제목·아티스트)
  -- ---------------------------------------------------------------------

  insert into songs (title, artist, is_reviewed, is_active)
    values ('내 삶의 이유', '라온워십', true, true) returning id into song_id;
  insert into song_themes (song_id, theme_id) values (song_id, theme_love), (song_id, theme_hope);
  insert into song_situations (song_id, situation_id) values (song_id, situation_morning), (song_id, situation_drive);
  insert into song_moods (song_id, mood_id) values (song_id, mood_warm), (song_id, mood_grand);

  insert into songs (title, artist, is_reviewed, is_active)
    values ('다시 부르네', '은혜의노래팀', true, true) returning id into song_id;
  insert into song_themes (song_id, theme_id) values (song_id, theme_devotion), (song_id, theme_joy);
  insert into song_situations (song_id, situation_id) values (song_id, situation_morning), (song_id, situation_noon);
  insert into song_moods (song_id, mood_id) values (song_id, mood_upbeat);

  insert into songs (title, artist, is_reviewed, is_active)
    values ('주 안에 쉼', '하늘빛찬양단', true, true) returning id into song_id;
  insert into song_themes (song_id, theme_id) values (song_id, theme_comfort), (song_id, theme_peace);
  insert into song_situations (song_id, situation_id) values (song_id, situation_before_sleep), (song_id, situation_want_comfort);
  insert into song_moods (song_id, mood_id) values (song_id, mood_calm), (song_id, mood_quiet);

  insert into songs (title, artist, is_reviewed, is_active)
    values ('감사해요 오늘도', '새벽이슬', true, true) returning id into song_id;
  insert into song_themes (song_id, theme_id) values (song_id, theme_gratitude), (song_id, theme_joy);
  insert into song_situations (song_id, situation_id) values (song_id, situation_noon), (song_id, situation_evening);
  insert into song_moods (song_id, mood_id) values (song_id, mood_warm);

  insert into songs (title, artist, is_reviewed, is_active)
    values ('당신은 사랑입니다', '소망의노래', true, true) returning id into song_id;
  insert into song_themes (song_id, theme_id) values (song_id, theme_love), (song_id, theme_comfort);
  insert into song_situations (song_id, situation_id) values (song_id, situation_evening), (song_id, situation_want_comfort);
  insert into song_moods (song_id, mood_id) values (song_id, mood_warm), (song_id, mood_calm);

  insert into songs (title, artist, is_reviewed, is_active)
    values ('일어나 걸어가', '빛나는아침', true, true) returning id into song_id;
  insert into song_themes (song_id, theme_id) values (song_id, theme_hope), (song_id, theme_devotion);
  insert into song_situations (song_id, situation_id) values (song_id, situation_morning), (song_id, situation_drive);
  insert into song_moods (song_id, mood_id) values (song_id, mood_upbeat), (song_id, mood_grand);

  insert into songs (title, artist, is_reviewed, is_active)
    values ('곁에 계신 주님', '잔잔한숨결', true, true) returning id into song_id;
  insert into song_themes (song_id, theme_id) values (song_id, theme_comfort), (song_id, theme_peace);
  insert into song_situations (song_id, situation_id) values (song_id, situation_before_sleep), (song_id, situation_want_comfort);
  insert into song_moods (song_id, mood_id) values (song_id, mood_calm);

  insert into songs (title, artist, is_reviewed, is_active)
    values ('새 힘 주시네', '다시서다워십', true, true) returning id into song_id;
  insert into song_themes (song_id, theme_id) values (song_id, theme_devotion), (song_id, theme_hope);
  insert into song_situations (song_id, situation_id) values (song_id, situation_morning), (song_id, situation_drive);
  insert into song_moods (song_id, mood_id) values (song_id, mood_grand), (song_id, mood_upbeat);

  insert into songs (title, artist, is_reviewed, is_active)
    values ('말씀이 등불 되어', '고요한밤찬양', true, true) returning id into song_id;
  insert into song_themes (song_id, theme_id) values (song_id, theme_peace), (song_id, theme_hope);
  insert into song_situations (song_id, situation_id) values (song_id, situation_evening), (song_id, situation_before_sleep);
  insert into song_moods (song_id, mood_id) values (song_id, mood_quiet), (song_id, mood_calm);

  insert into songs (title, artist, is_reviewed, is_active)
    values ('평안을 너에게', '마음의쉼', true, true) returning id into song_id;
  insert into song_themes (song_id, theme_id) values (song_id, theme_peace), (song_id, theme_comfort);
  insert into song_situations (song_id, situation_id) values (song_id, situation_before_sleep), (song_id, situation_want_comfort);
  insert into song_moods (song_id, mood_id) values (song_id, mood_calm), (song_id, mood_quiet);

  insert into songs (title, artist, is_reviewed, is_active)
    values ('찬양으로 나아가', '기쁨의동산', true, true) returning id into song_id;
  insert into song_themes (song_id, theme_id) values (song_id, theme_joy), (song_id, theme_gratitude);
  insert into song_situations (song_id, situation_id) values (song_id, situation_noon), (song_id, situation_drive);
  insert into song_moods (song_id, mood_id) values (song_id, mood_upbeat), (song_id, mood_grand);

  insert into songs (title, artist, is_reviewed, is_active)
    values ('주와 함께 걷는 길', '은혜로운걸음', true, true) returning id into song_id;
  insert into song_themes (song_id, theme_id) values (song_id, theme_love), (song_id, theme_devotion);
  insert into song_situations (song_id, situation_id) values (song_id, situation_drive), (song_id, situation_evening);
  insert into song_moods (song_id, mood_id) values (song_id, mood_warm), (song_id, mood_calm);
end $$;
