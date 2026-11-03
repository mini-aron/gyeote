export function buildShareFileName(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `gyeote-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}.png`;
}
