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
