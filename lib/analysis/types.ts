// F-08 추천 로직이 쓰는 최소 형태. 교회(F-06)·뒤뜰(F-03) 공통.
export interface ConversationTags {
  situation: string;
  themes: string[];
  moods: string[];
}

// F-03/F-06 명세의 분석 출력 JSON 그대로. summary/efforts/reason은
// F-04/F-07(결과 글쓰기)·기도제목 정리에서 쓸 재료.
export interface AnalysisResult extends ConversationTags {
  direction: string;
  summary: string;
  efforts: string[];
  reason: string;
  crisis: boolean;
}

export type AnalysisSource = "church" | "backyard";
