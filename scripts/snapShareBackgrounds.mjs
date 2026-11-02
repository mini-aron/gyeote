import { mkdir } from "node:fs/promises";
import { parseArgs } from "node:util";
import { chromium } from "playwright";

// 360×640 @3x = 1080×1920
const CONTEXT = { viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
// 무드는 서울 시각으로 정해지므로 시각을 고정해서 재현한다 (lib/greeting.ts의 시간대 구간 기준)
const MOOD_SEOUL_HOUR = { dawn: 6, day: 10, dusk: 20, night: 1 };
const SETTLE_MS = 3500;
const FLY_SETTLE_MS = 12000;
const JPEG_QUALITY = 80;
const SCREENSHOT_TIMEOUT_MS = 300000;
const HIDE_OVERLAY_CSS = `
  body * { visibility: hidden !important; }
  canvas { visibility: visible !important; }
  nextjs-portal { display: none !important; }
`;

const { values } = parseArgs({
  options: {
    url: { type: "string", default: "http://localhost:3000" },
    out: { type: "string", default: "public/share" },
    moods: { type: "string", default: Object.keys(MOOD_SEOUL_HOUR).join(",") },
  },
});

const moods = values.moods.split(",");
for (const m of moods) if (MOOD_SEOUL_HOUR[m] === undefined) throw new Error("알 수 없는 mood: " + m);

try {
  await fetch(values.url);
} catch {
  console.error(values.url + "에 연결할 수 없습니다 — npm run dev를 먼저 실행하세요");
  process.exit(1);
}

await mkdir(values.out, { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

try {
  for (const mood of moods) {
    const context = await browser.newContext(CONTEXT);
    const page = await context.newPage();
    await page.clock.setFixedTime(new Date(Date.UTC(2026, 0, 1, MOOD_SEOUL_HOUR[mood] - 9)));
    // 시작 화면(/)은 무드를 직접 설정하지 않으므로 /church에서 무드를 정한 뒤 클라이언트 이동으로 하늘로 돌아온다
    await page.goto(values.url + "/church", { waitUntil: "networkidle" });
    await page.waitForSelector("canvas");
    await page.waitForTimeout(SETTLE_MS);
    await page.evaluate(() => document.querySelector('a[href="/"]').click());
    await page.waitForURL(values.url + "/");
    await page.addStyleTag({ content: HIDE_OVERLAY_CSS });
    await page.waitForTimeout(FLY_SETTLE_MS);
    const file = values.out + "/bg-" + mood + ".jpg";
    await page.screenshot({ path: file, type: "jpeg", quality: JPEG_QUALITY, timeout: SCREENSHOT_TIMEOUT_MS });
    console.log(file);
    await context.close();
  }
} finally {
  await browser.close();
}
