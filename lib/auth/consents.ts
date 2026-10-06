export const CONSENT_VERSION = "2026-10-v1";

export type ConsentType = "terms" | "privacy" | "sensitive" | "age14" | "marketing";

export interface ConsentItem {
  type: ConsentType;
  required: boolean;
  label: string;
  summary: string;
  body: string[];
}

// 문구는 전문가 검토 전 임시안
export const CONSENT_ITEMS: readonly ConsentItem[] = [
  {
    type: "terms",
    required: true,
    label: "이용약관 동의",
    summary: "곁에 서비스 이용 조건에 동의해요",
    body: [
      "곁에는 짧은 대화를 바탕으로 성경 말씀 1구절과 찬양 1곡을 추천하는 서비스예요.",
      "추천은 참고용이며, 전문적인 상담이나 진단을 대신하지 않아요.",
      "서비스 이용 중 타인의 권리를 침해하거나 서비스 운영을 방해하는 행위는 제한될 수 있어요.",
    ],
  },
  {
    type: "privacy",
    required: true,
    label: "개인정보 수집·이용 동의",
    summary: "카카오 닉네임·이메일·프로필 사진과 이용 기록을 수집해요",
    body: [
      "수집 항목: 카카오 닉네임, 카카오계정 이메일, 프로필 사진, 서비스 이용 기록(추천 받은 말씀·찬양, 북마크, 일정 등).",
      "이용 목적: 회원 식별, 계정 관련 문의 응대, 기록 보관 및 다시 보기, 서비스 개선.",
      "처리 위탁: Supabase(데이터 보관), Vercel(서비스 운영), AI 제공자(대화 분석·문구 생성).",
      "위탁 업체의 서버가 국외에 있을 수 있어 개인정보가 국외로 이전될 수 있어요.",
      "보유 기간: 탈퇴하거나 기록을 삭제할 때까지 보관해요.",
    ],
  },
  {
    type: "sensitive",
    required: true,
    label: "민감정보 수집·이용 동의",
    summary: "신앙과 관련된 대화 내용을 저장하고 보여드려요",
    body: [
      "상담 기록(대화 내용 등 신앙과 관련된 정보)을 저장하고 캘린더에서 다시 보여주기 위해 이용해요.",
      "내 정보에서 대화 기록 저장을 끄거나 기록을 삭제할 수 있어요.",
      "동의하지 않으면 회원 기능을 이용할 수 없어요.",
    ],
  },
  {
    type: "age14",
    required: true,
    label: "만 14세 이상이에요",
    summary: "만 14세 이상만 가입할 수 있어요",
    body: ["만 14세 미만은 법정대리인의 동의 없이 개인정보를 제공할 수 없어 가입이 제한돼요."],
  },
  {
    type: "marketing",
    required: false,
    label: "마케팅 정보 수신 동의 (선택)",
    summary: "새 소식과 이벤트를 받아볼 수 있어요",
    body: [
      "서비스 소식, 이벤트 등 안내를 받는 데 동의해요.",
      "동의하지 않아도 서비스를 이용할 수 있고, 언제든 내 정보에서 바꿀 수 있어요.",
    ],
  },
];

export const REQUIRED_CONSENT_TYPES: readonly ConsentType[] = CONSENT_ITEMS.filter(
  (item) => item.required,
).map((item) => item.type);
