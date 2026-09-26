export type MoodKey = "dawn" | "day" | "dusk" | "night";

export interface MoodPreset {
  skyTop: number;
  skyMid: number;
  skyBottom: number;
  sunColor: number;
  sunDir: [number, number, number];
  fog: number;
  fogNear: number;
  fogFar: number;
  hemiSky: number;
  hemiGround: number;
  hemiInt: number;
  dirColor: number;
  dirInt: number;
  ambInt: number;
  grassBase: number;
  grassTip: number;
  grassSun: number;
  stone: number;
  roof: number;
  shaft: number;
  star: number;
  window: number;
  mist: number;
  dust: number;
  dustColor: number;
  label: string;
}

export const MOODS: Record<MoodKey, MoodPreset> = {
  dawn: {
    skyTop: 0x1d2350,
    skyMid: 0x7b6ea8,
    skyBottom: 0xf0b9a6,
    sunColor: 0xffd0a4,
    sunDir: [0.18, 0.1, -1],
    fog: 0xb8a6bd,
    fogNear: 22,
    fogFar: 128,
    hemiSky: 0xa9b0e8,
    hemiGround: 0x3d4a33,
    hemiInt: 0.62,
    dirColor: 0xffc79a,
    dirInt: 0.95,
    ambInt: 0.34,
    grassBase: 0x2a4335,
    grassTip: 0x7c9c6d,
    grassSun: 0.42,
    stone: 0xcfc3cc,
    roof: 0x5d5570,
    shaft: 0.55,
    star: 0.22,
    window: 0.72,
    mist: 0.6,
    dust: 0.55,
    dustColor: 0xffe3c4,
    label: "새벽",
  },
  day: {
    skyTop: 0x3f73c4,
    skyMid: 0x95c0e8,
    skyBottom: 0xe6eef2,
    sunColor: 0xfff3d4,
    sunDir: [0.42, 0.46, -1],
    fog: 0xd6e2e8,
    fogNear: 30,
    fogFar: 175,
    hemiSky: 0xcfe2f5,
    hemiGround: 0x54683f,
    hemiInt: 0.88,
    dirColor: 0xfff1d0,
    dirInt: 1.25,
    ambInt: 0.5,
    grassBase: 0x37613c,
    grassTip: 0xa9c97a,
    grassSun: 0.5,
    stone: 0xf0e8e0,
    roof: 0x6f6a80,
    shaft: 0.16,
    star: 0,
    window: 0.34,
    mist: 0.22,
    dust: 0.4,
    dustColor: 0xffffff,
    label: "아침",
  },
  dusk: {
    skyTop: 0x2a2352,
    skyMid: 0x9a5f8c,
    skyBottom: 0xf0a06a,
    sunColor: 0xffb877,
    sunDir: [-0.5, 0.07, -1],
    fog: 0xc08a84,
    fogNear: 20,
    fogFar: 120,
    hemiSky: 0xc099c8,
    hemiGround: 0x3a3a2c,
    hemiInt: 0.55,
    dirColor: 0xffa86a,
    dirInt: 1.0,
    ambInt: 0.3,
    grassBase: 0x2c3c30,
    grassTip: 0x8d8a5c,
    grassSun: 0.58,
    stone: 0xdcc0b4,
    roof: 0x4e4460,
    shaft: 0.85,
    star: 0.12,
    window: 0.92,
    mist: 0.5,
    dust: 0.7,
    dustColor: 0xffcd99,
    label: "노을",
  },
  night: {
    skyTop: 0x060a20,
    skyMid: 0x161c44,
    skyBottom: 0x3b3a62,
    sunColor: 0xc9d6ff,
    sunDir: [0.3, 0.55, -1],
    fog: 0x272c4e,
    fogNear: 16,
    fogFar: 108,
    hemiSky: 0x6675b8,
    hemiGround: 0x1c2426,
    hemiInt: 0.38,
    dirColor: 0x9fb2e8,
    dirInt: 0.42,
    ambInt: 0.22,
    grassBase: 0x16261f,
    grassTip: 0x3e5748,
    grassSun: 0.18,
    stone: 0x8e94b4,
    roof: 0x2c2c44,
    shaft: 0.3,
    star: 1,
    window: 1.15,
    mist: 0.75,
    dust: 0.85,
    dustColor: 0xffd9a0,
    label: "밤",
  },
};

export const COLOR_KEYS = [
  "skyTop",
  "skyMid",
  "skyBottom",
  "sunColor",
  "fog",
  "hemiSky",
  "hemiGround",
  "dirColor",
  "grassBase",
  "grassTip",
  "stone",
  "roof",
  "dustColor",
] as const;

export const NUM_KEYS = [
  "fogNear",
  "fogFar",
  "hemiInt",
  "dirInt",
  "ambInt",
  "grassSun",
  "shaft",
  "star",
  "window",
  "mist",
  "dust",
] as const;
