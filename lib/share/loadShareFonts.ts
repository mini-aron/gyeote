import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pickFontSubsets, removeUncoveredChars } from "@/lib/share/pickFontSubsets";

const FONT_FAMILY_PREFIX = "GowunBatang";
const FONT_DIR = path.join(process.cwd(), "node_modules", "@fontsource", "gowun-batang");

type FontWeight = 400 | 700;

export interface ShareFont {
  name: string;
  data: Buffer;
  weight: FontWeight;
  style: "normal";
}

const cssByWeight = new Map<FontWeight, Promise<string>>();
const dataByFile = new Map<string, Promise<Buffer>>();

function readCss(weight: FontWeight): Promise<string> {
  let css = cssByWeight.get(weight);
  if (!css) {
    css = readFile(path.join(FONT_DIR, `${weight}.css`), "utf8");
    cssByWeight.set(weight, css);
  }
  return css;
}

function readFontFile(file: string): Promise<Buffer> {
  let data = dataByFile.get(file);
  if (!data) {
    data = readFile(path.join(FONT_DIR, "files", file));
    dataByFile.set(file, data);
  }
  return data;
}

export interface ShareFonts {
  fonts: ShareFont[];
  fontFamily: string;
  boldFontFamily: string;
}

export async function removeUnrenderableChars(text: string): Promise<string> {
  return removeUncoveredChars(await readCss(400), text);
}

// 같은 name의 조각을 여러 개 넘기면 Satori가 글리프 폴백을 하지 않고 나머지 글자를 외부 폰트로 대체하므로,
// 조각마다 고유한 name을 주고 fontFamily에 쉼표로 나열해 폴백 순서를 직접 지정한다.
export async function loadShareFonts(texts: Record<FontWeight, string>): Promise<ShareFonts> {
  const weights: FontWeight[] = [400, 700];
  const perWeight = await Promise.all(
    weights.map(async (weight) => {
      const files = pickFontSubsets(await readCss(weight), texts[weight]);
      const fonts = await Promise.all(
        files.map(
          async (file): Promise<ShareFont> => ({
            name: `${FONT_FAMILY_PREFIX}-${file.replace(/^gowun-batang-|-normal\.woff$/g, "")}`,
            data: await readFontFile(file),
            weight,
            style: "normal",
          }),
        ),
      );
      return { fonts, family: fonts.map((font) => font.name).join(",") };
    }),
  );
  return {
    fonts: perWeight.flatMap((entry) => entry.fonts),
    fontFamily: perWeight[0].family,
    boldFontFamily: perWeight[1].family,
  };
}
