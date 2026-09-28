/**
 * 로컬 Ollama로 호출하는 모델 설정. 다른 모델로 바꿀 때 이 파일만 고치면 된다.
 * 선정 근거: F-03/F-06 분석 프롬프트로 Qwen2.5-7B-Instruct와 직접 비교했을 때
 * EXAONE-3.5-7.8B가 허용 태그 목록 준수·한국어 자연스러움에서 더 안정적이었음.
 */
export const OLLAMA_MODEL = "exaone3.5:7.8b";
