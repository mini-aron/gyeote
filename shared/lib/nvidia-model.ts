/**
 * 지금 NVIDIA NIM으로 호출하는 모델 한 곳에 모아둔 설정.
 * NVIDIA API 카탈로그에서 모델이 deprecated되거나 삭제되면(실제로 두 번 겪었음)
 * nvidia-client.ts를 건드릴 필요 없이 이 파일만 바꾸면 된다.
 *
 * modelOptions는 모델별로 다른 요청 옵션을 담는다 — 예: deepseek-v4.1-flash는
 * 기본적으로 reasoning(thinking) 모드가 켜져 있어 끄지 않으면 <think> 같은
 * 텍스트가 JSON 응답 앞에 붙어 analyzeText.ts의 파싱이 깨진다.
 */
export const NVIDIA_MODEL = "deepseek-ai/deepseek-v4.1-flash";

export const NVIDIA_MODEL_OPTIONS: Record<string, unknown> = {
  reasoning_effort: "none",
};
