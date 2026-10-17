// 동의 화면에서 같은 탭으로 이동하면 체크 상태가 사라지고, iOS 홈 화면 앱에는 뒤로 가기 버튼도 없어 새 탭으로 연다.
export function FullTextLink({ href }: { href: "/terms" | "/privacy" }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="self-start text-[#f4f1ff]/85 underline underline-offset-2"
    >
      전문 보기
    </a>
  );
}
