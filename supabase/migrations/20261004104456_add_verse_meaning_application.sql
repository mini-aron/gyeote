-- 결과 화면에서 말씀 본문 아래에 보여줄 풀이. 개역개정 문체가 낯선 사용자도 본문의
-- 뜻(meaning)을 이해하고, 오늘 자기 삶에 어떻게 붙들지(application)까지 볼 수 있게 한다.
alter table verses add column meaning text;
alter table verses add column application text;
