"use client";

import { useState } from "react";

// 상세에 들어오자마자 플레이어를 띄우면 유튜브 스크립트·쿠키가 바로 로드되므로, 누를 때만 iframe을 붙인다.
export function YoutubePreview({ videoId, title }: { videoId: string; title: string }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="aspect-video overflow-hidden rounded-xl bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0`}
          title={`${title} 유튜브 미리보기`}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`${title} 유튜브로 미리 보기`}
      style={{ backgroundImage: `url(https://i.ytimg.com/vi/${videoId}/hqdefault.jpg)` }}
      className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-black bg-cover bg-center"
    >
      <span className="absolute inset-0 bg-black/30" aria-hidden="true" />
      <span className="relative flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm text-white backdrop-blur-sm">
        <span aria-hidden="true">▶</span> 유튜브로 미리 보기
      </span>
    </button>
  );
}
