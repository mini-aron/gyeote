import { CARD_CONTENT_WIDTH, fitSongLine, fitVerseText, splitVerseLines } from "@/lib/share/fitVerseText";
import type { MoodKey } from "@/lib/world/moods";

export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1920;
export const SHARE_WORDMARK = "곁에";
export const SHARE_WORDMARK_LATIN = "GYEOTE";
export const SHARE_DOMAIN = "gyeote.site";

const TEXT_COLOR = "#f4f1ff";
const SUB_COLOR = "#c9bcff";
const ACCENT_COLOR = "#ffd9a8";
const BASE_COLOR = "#14102a";
const SAFE_AREA_Y = 270;
const SIDE_PADDING = 100;
const TEXT_SHADOW = "0 2px 20px rgba(20,16,42,0.6)";

// dawn/day는 배경의 교회·빛이 본문 높이까지 올라와 가운데를 더 진하게 깐다.
const BRIGHT_OVERLAYS = [
  "linear-gradient(180deg, rgba(20,16,42,0.4) 0%, rgba(20,16,42,0.55) 28%, rgba(20,16,42,0.74) 52%, rgba(20,16,42,0.72) 80%, rgba(20,16,42,0.6) 100%)",
  "linear-gradient(90deg, rgba(20,16,42,0) 30%, rgba(20,16,42,0.32) 100%)",
];

const OVERLAYS: Record<MoodKey, string[]> = {
  dawn: BRIGHT_OVERLAYS,
  day: BRIGHT_OVERLAYS,
  dusk: ["linear-gradient(180deg, rgba(20,16,42,0.3) 0%, rgba(20,16,42,0.42) 45%, rgba(20,16,42,0.62) 100%)"],
  night: ["linear-gradient(180deg, rgba(20,16,42,0.2) 0%, rgba(20,16,42,0.34) 45%, rgba(20,16,42,0.58) 100%)"],
};

export interface ShareCardProps {
  verse: { reference: string; body: string; translation: string };
  song: { title: string; artist: string } | null;
  mood: MoodKey;
  background: string | null;
  fontFamily: string;
  boldFontFamily: string;
}

export function ShareCard({ verse, song, mood, background, fontFamily, boldFontFamily }: ShareCardProps) {
  const lines = splitVerseLines(verse.reference, verse.body);
  const fit = fitVerseText(lines);
  const songLine = song ? fitSongLine(song.title, song.artist) : null;
  const hasNumbers = lines.some((line) => line.number !== null);
  const fill = { position: "absolute", top: 0, left: 0, width: SHARE_CARD_WIDTH, height: SHARE_CARD_HEIGHT } as const;

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
        backgroundColor: BASE_COLOR,
        backgroundImage: `linear-gradient(180deg, ${BASE_COLOR} 0%, #2a2150 55%, #14102a 100%)`,
        fontFamily,
        color: TEXT_COLOR,
      }}
    >
      {background && (
        // eslint-disable-next-line @next/next/no-img-element -- Satori(ImageResponse)는 next/image를 쓸 수 없다
        <img src={background} alt="" width={SHARE_CARD_WIDTH} height={SHARE_CARD_HEIGHT} style={fill} />
      )}
      {OVERLAYS[mood].map((backgroundImage) => (
        <div key={backgroundImage} style={{ ...fill, display: "flex", backgroundImage }} />
      ))}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: SHARE_CARD_WIDTH,
          height: SHARE_CARD_HEIGHT,
          padding: `${SAFE_AREA_Y}px ${SIDE_PADDING}px`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 64, fontFamily: boldFontFamily, fontWeight: 700, color: TEXT_COLOR }}>
            {SHARE_WORDMARK}
          </div>
          <div style={{ display: "flex", marginTop: 6, fontSize: 22, letterSpacing: 10, color: SUB_COLOR }}>
            {SHARE_WORDMARK_LATIN}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            justifyContent: "center",
            alignItems: "center",
            width: CARD_CONTENT_WIDTH,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: hasNumbers ? "flex-start" : "center",
              width: CARD_CONTENT_WIDTH,
              gap: Math.round(fit.fontSize * 0.3),
              textShadow: TEXT_SHADOW,
            }}
          >
            {lines.map((line, index) => (
              <div key={index} style={{ display: "flex", alignItems: "flex-start", width: CARD_CONTENT_WIDTH }}>
                {hasNumbers && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      width: 48,
                      marginRight: 16,
                      paddingTop: Math.round(fit.fontSize * 0.28),
                      fontSize: fit.numberFontSize,
                      color: SUB_COLOR,
                    }}
                  >
                    {line.number}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    ...(hasNumbers ? { flex: 1 } : { width: CARD_CONTENT_WIDTH, justifyContent: "center", textAlign: "center" }),
                    
                    fontSize: fit.fontSize,
                    lineHeight: fit.lineHeight,
                    color: TEXT_COLOR,
                    wordBreak: "keep-all",
                  }}
                >
                  {line.text}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 52,
              fontSize: 32,
              letterSpacing: 1,
              color: ACCENT_COLOR,
              textShadow: TEXT_SHADOW,
            }}
          >
            {verse.reference} · {verse.translation}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: CARD_CONTENT_WIDTH }}>
          {songLine && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: CARD_CONTENT_WIDTH }}>
              <div style={{ display: "flex", width: 72, height: 2, backgroundColor: "rgba(201,188,255,0.45)" }} />
              <div
                style={{ display: "flex", justifyContent: "center", alignItems: "center", width: CARD_CONTENT_WIDTH, marginTop: 36, textShadow: TEXT_SHADOW }}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill={SUB_COLOR} style={{ marginRight: 14 }}>
                  <path d="M9 3v11.3A3.5 3.5 0 1 0 11 17.5V7.6l8-1.6v6.3A3.5 3.5 0 1 0 21 15.5V3z" />
                </svg>
                <div style={{ display: "flex", fontSize: songLine.fontSize, color: SUB_COLOR, whiteSpace: "nowrap" }}>{songLine.text}</div>
              </div>
            </div>
          )}
          <div
            style={{ display: "flex", justifyContent: "center", width: CARD_CONTENT_WIDTH, marginTop: songLine ? 40 : 0, fontSize: 22, letterSpacing: 5, color: SUB_COLOR, opacity: 0.8 }}
          >
            {SHARE_DOMAIN}
          </div>
        </div>
      </div>
    </div>
  );
}
