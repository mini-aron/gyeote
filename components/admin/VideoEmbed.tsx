const VIDEO_ID = /^[\w-]{11}$/;

export function VideoEmbed({
  videoId,
  embeddable,
}: {
  videoId: string | null;
  embeddable: boolean | null;
}) {
  if (!videoId || !VIDEO_ID.test(videoId)) {
    return (
      <div className="flex aspect-video min-h-[200px] w-full items-center justify-center rounded-xl border border-dashed border-white/20 text-sm text-[#f4f1ff]/50">
        연결된 영상이 없어요
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
        title="YouTube 영상 미리보기"
        loading="lazy"
        allow="encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="aspect-video min-h-[200px] w-full rounded-xl border border-white/10 bg-black"
      />
      <div className="flex flex-wrap items-center gap-3 text-xs text-[#f4f1ff]/60">
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-[#f4f1ff]"
        >
          유튜브에서 열기
        </a>
        {embeddable === false && (
          <span className="rounded-full border border-red-300/40 bg-red-400/10 px-2 py-0.5 text-red-200">
            퍼가기 불가 영상 — 승인할 수 없어요
          </span>
        )}
      </div>
    </div>
  );
}
