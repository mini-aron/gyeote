export const ADMIN_TABS = [
  { key: "ready", label: "승인 대기" },
  { key: "tagging", label: "태그 필요" },
  { key: "parsing", label: "파싱 필요" },
  { key: "video", label: "영상 필요" },
  { key: "link", label: "영상 연결" },
  { key: "rejected", label: "거절됨" },
] as const;

export type AdminTabKey = (typeof ADMIN_TABS)[number]["key"];

export const LIST_PAGE_SIZE = 50;

export function parseTabKey(value: unknown): AdminTabKey | null {
  return ADMIN_TABS.find((tab) => tab.key === value)?.key ?? null;
}

export function parsePageNumber(value: unknown): number {
  const page = typeof value === "string" ? Number.parseInt(value, 10) : 1;
  return Number.isInteger(page) && page >= 1 && page <= 10_000 ? page : 1;
}

export function listHref(tab: AdminTabKey | null, page = 1): string {
  const params = new URLSearchParams();
  if (tab) params.set("tab", tab);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin?${query}` : "/admin";
}

export function candidateHref(id: string, tab: AdminTabKey | null): string {
  return tab ? `/admin/candidates/${id}?tab=${tab}` : `/admin/candidates/${id}`;
}
