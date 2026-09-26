import Link from "next/link";

// 교회·뒤뜰처럼 시작화면(S-01)이 아닌 스테이션에서 메인으로 돌아갈 수 있게 하는
// 공용 링크. StartScreen의 EntryCard와 동일한 톤(테두리+반투명 배경)을 쓴다.
export function BackToStartLink() {
  return (
    <Link
      href="/"
      className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-[#f4f1ff]/80 backdrop-blur-md transition-colors hover:bg-white/[0.1] hover:text-[#f4f1ff]"
    >
      ← 처음으로
    </Link>
  );
}
