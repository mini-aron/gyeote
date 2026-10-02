import { ImageResponse } from "next/og";

// 3D 월드에서 반복되는 모티프(어두운 밤하늘 + 교회 창문의 따뜻한 아치형 불빛,
// lib/world/WorldScene.ts의 skyUniforms.uTop / glassMat 색을 그대로 가져옴)를
// 브라우저 탭 파비콘으로 축약했다.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 7,
        }}
      >
        <div
          style={{
            width: 13,
            height: 18,
            background: "#ffc27a",
            borderTopLeftRadius: 7,
            borderTopRightRadius: 7,
          }}
        />
      </div>
    ),
    { ...size },
  );
}
