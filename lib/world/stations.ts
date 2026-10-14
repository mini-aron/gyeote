export type StationKey = "sky" | "church" | "backyard";

export interface CameraStation {
  position: [number, number, number];
  lookAt: [number, number, number];
}

// One shared 3D world; each "screen" is just a camera vantage point in it.
export const STATIONS: Record<StationKey, CameraStation> = {
  // 시작화면 — steep upward tilt so the frame is mostly night sky/stars,
  // with the church a small silhouette far below to hint at where you're headed.
  sky: { position: [0, 1.8, 26], lookAt: [0, 30, -10] },
  // 교회 — the original front-of-church vantage point.
  church: { position: [0, 1.75, 7], lookAt: [0, 3.6, -14] },
  // 뒤뜰 — behind the church, facing back toward its rear wall with the well/trees in front.
  // ~14 units from the well — closer than this, the well fills a portrait mobile frame.
  backyard: { position: [0, 2.0, -43], lookAt: [0, 4, -20] },
};
