import { ImageResponse } from "next/og";

// icon.tsx와 같은 모티프를 iOS 홈 화면/북마크 아이콘 크기로 확대한 버전.
// iOS가 자체적으로 모서리를 둥글게 마스킹하므로 배경은 꽉 찬 정사각형으로 둔다.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1d2350",
        }}
      >
        <div
          style={{
            width: 70,
            height: 100,
            background: "#ffc27a",
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
          }}
        />
      </div>
    ),
    { ...size },
  );
}
