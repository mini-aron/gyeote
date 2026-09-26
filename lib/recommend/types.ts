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
}
