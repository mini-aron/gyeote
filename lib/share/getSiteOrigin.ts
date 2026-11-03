const PRODUCTION_ORIGIN = "https://gyeote.site";
const LOCAL_ORIGIN = "http://localhost:3000";

export function getSiteOrigin(env: Record<string, string | undefined> = process.env): string {
  if (env.VERCEL_ENV === "production") return PRODUCTION_ORIGIN;
  if (env.VERCEL_ENV === "preview" && env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return LOCAL_ORIGIN;
}
