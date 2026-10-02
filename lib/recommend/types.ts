export interface VerseResult {
  id: string;
  reference: string;
  body: string;
  translation: string;
}

export interface SongResult {
  id: string;
  title: string;
  artist: string;
  listenUrl: string | null;
  // 이 곡이 전달하려는 주제·흐름 요약 — generateResultLine이 결과 문구를 쓸 때 참고한다.
  // 가사 없이 임포트된 곡은 null.
  summary: string | null;
}

export interface RecommendationRecord {
  songId: string | null;
  verseId: string | null;
  date: string;
}

export interface RecommendResult {
  verse: VerseResult | null;
  song: SongResult | null;
  // F-07 결과 글 — 곡만 다시 뽑는 재시도 호출(include.verse === false)에서는
  // 생성하지 않는다. 그 경우 undefined이고, 클라이언트는 기존 값을 유지한다.
  resultLine?: string;
}
