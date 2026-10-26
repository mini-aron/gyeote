import { requireAdmin } from "@/lib/admin/requireAdmin";
import { getLyricsStats, getLyricsViewers } from "@/lib/admin/getLyricsAdminData";
import { ADMIN_CARD } from "@/components/admin/adminStyles";
import { LyricsViewerForm } from "@/components/admin/LyricsViewerForm";
import { RemoveLyricsViewerButton } from "@/components/admin/RemoveLyricsViewerButton";

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="px-4 py-3">
      <p className="text-xs text-[#f4f1ff]/75">{label}</p>
      <p className={`mt-0.5 text-xl font-medium tabular-nums ${tone ?? "text-[#f4f1ff]"}`}>{value}</p>
    </div>
  );
}

export default async function Page() {
  await requireAdmin();
  const [stats, viewers] = await Promise.all([getLyricsStats(), getLyricsViewers()]);

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-medium">가사</h1>
      <div className={`${ADMIN_CARD} grid grid-cols-2 divide-x divide-white/10 sm:grid-cols-4`}>
        <Stat label="찾음" value={stats.found} tone="text-emerald-200" />
        <Stat label="동명이곡 보류" value={stats.ambiguous} tone="text-[#ffd9a8]" />
        <Stat label="못 찾음" value={stats.notFound} />
        <Stat label="수집 대기" value={stats.pending} />
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-medium">가사 열람자</h2>
          <p className="mt-1 text-sm text-[#f4f1ff]/65">
            여기 지정한 회원과 관리자만 찬양 상세에서 가사를 볼 수 있어요.
          </p>
        </div>
        <LyricsViewerForm />
        {viewers.length === 0 ? (
          <p className={`${ADMIN_CARD} p-8 text-center text-sm text-[#f4f1ff]/80`}>지정한 열람자가 없어요.</p>
        ) : (
          <ul className={`${ADMIN_CARD} divide-y divide-white/10`}>
            {viewers.map((viewer) => (
              <li key={viewer.userId} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm">{viewer.nickname ?? "닉네임 없음"}</p>
                  <p className="truncate text-xs text-[#f4f1ff]/60">{viewer.email ?? viewer.userId}</p>
                </div>
                <RemoveLyricsViewerButton userId={viewer.userId} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
