import "server-only";
import { createClient } from "@supabase/supabase-js";

const REQUEST_TIMEOUT_MS = 15_000;

// 크론은 DB 호출이 멈추면 함수 한도(300초)까지 걸려 있으므로 요청마다 타임아웃을 건다
export function createCronDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase 환경변수(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)가 설정되지 않았습니다.",
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }),
    },
  });
}
