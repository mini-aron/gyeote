interface FontFace {
  file: string;
  ranges: [number, number][];
}

const FACE_PATTERN = /@font-face\s*{[^}]*}/g;
const FILE_PATTERN = /\/files\/([^)]+?\.woff)\)/;
const RANGE_PATTERN = /unicode-range:\s*([^;]+);/;

function parseFontFaces(css: string): FontFace[] {
  const faces: FontFace[] = [];
  for (const block of css.match(FACE_PATTERN) ?? []) {
    const file = block.match(FILE_PATTERN)?.[1];
    const rangeText = block.match(RANGE_PATTERN)?.[1];
    if (!file || !rangeText) continue;
    const ranges = rangeText.split(",").map((token): [number, number] => {
      const [start, end] = token.trim().replace(/^U\+/i, "").split("-");
      const low = parseInt(start, 16);
      return [low, end ? parseInt(end, 16) : low];
    });
    faces.push({ file, ranges });
  }
  return faces;
}

function findFace(faces: FontFace[], char: string): FontFace | undefined {
  const codePoint = char.codePointAt(0)!;
  return faces.find(({ ranges }) => ranges.some(([low, high]) => codePoint >= low && codePoint <= high));
}

export function pickFontSubsets(css: string, text: string): string[] {
  const faces = parseFontFaces(css);
  const picked = new Set<string>();
  for (const char of new Set(text)) {
    const face = findFace(faces, char);
    if (face) picked.add(face.file);
  }
  return [...picked];
}

// 폰트에 없는 글자(이모지·일본어 등)가 남아 있으면 next/og가 런타임에 외부 폰트·twemoji를 받으러 간다.
export function removeUncoveredChars(css: string, text: string): string {
  const faces = parseFontFaces(css);
  return [...text].filter((char) => /\s/.test(char) || findFace(faces, char)).join("");
}
