import { mkdir } from "node:fs/promises";
import { parseArgs } from "node:util";
import { chromium } from "playwright";

const ROUTES = { sky: "/", church: "/church", backyard: "/backyard" };
const VIEWPORTS = {
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
// 무드는 서울 시각으로 정해지므로 시각을 고정해서 재현한다 (lib/greeting.ts의 시간대 구간 기준)
const MOOD_SEOUL_HOUR = { dawn: 6, day: 10, dusk: 20, night: 1 };
// flyTo 기본 2200ms + 씬 dynamic import 여유
const SETTLE_MS = 3500;

const { values } = parseArgs({
  options: {
    url: { type: "string", default: "http://localhost:3000" },
    out: { type: "string", default: ".snaps" },
    stations: { type: "string", default: Object.keys(ROUTES).join(",") },
    viewports: { type: "string", default: Object.keys(VIEWPORTS).join(",") },
    mood: { type: "string" },
  },
});

const stations = values.stations.split(",");
const viewports = values.viewports.split(",");
for (const s of stations) if (!ROUTES[s]) throw new Error(`알 수 없는 station: ${s}`);
for (const v of viewports) if (!VIEWPORTS[v]) throw new Error(`알 수 없는 viewport: ${v}`);
if (values.mood && MOOD_SEOUL_HOUR[values.mood] === undefined) {
  throw new Error(`알 수 없는 mood: ${values.mood} (dawn|day|dusk|night)`);
}

try {
  await fetch(values.url);
} catch {
  console.error(`${values.url}에 연결할 수 없습니다 — npm run dev를 먼저 실행하세요`);
  process.exit(1);
}

await mkdir(values.out, { recursive: true });
// headless 셸은 GPU가 없어 SwiftShader로 WebGL을 그린다
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

try {
  for (const v of viewports) {
    const context = await browser.newContext(VIEWPORTS[v]);
    const page = await context.newPage();
    if (values.mood) {
      const time = new Date(Date.UTC(2026, 0, 1, MOOD_SEOUL_HOUR[values.mood] - 9));
      await page.clock.setFixedTime(time);
    }
    for (const s of stations) {
      await page.goto(values.url + ROUTES[s], { waitUntil: "networkidle" });
      await page.waitForSelector("canvas");
      await page.waitForTimeout(SETTLE_MS);
      const file = `${values.out}/${s}-${v}${values.mood ? `-${values.mood}` : ""}.png`;
      await page.screenshot({ path: file });
      console.log(file);
    }
    await context.close();
  }
} finally {
  await browser.close();
}
