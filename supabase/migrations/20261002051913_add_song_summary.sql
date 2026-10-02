-- 찬양이 전달하려는 주제·흐름을 요약한 텍스트 컬럼 추가.
-- lyrics_keywords(단어 나열)와 별개로, 결과 화면 문구 생성(lib/church/generateResultLine.ts)이
-- 곡 제목/아티스트만으로는 내용을 알 수 없어 참고할 문맥이 필요해서 추가한다.
alter table songs add column summary text;
