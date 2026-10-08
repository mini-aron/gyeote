import { requireAdmin } from "@/lib/admin/requireAdmin";
import {
  getCandidateList,
  getRecommendableSongCount,
  getTabCounts,
} from "@/lib/admin/getAdminData";
import { ADMIN_TABS, parsePageNumber, parseTabKey } from "@/lib/admin/tabs";
import { CandidateList } from "@/components/admin/CandidateList";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const [counts, recommendableSongs] = await Promise.all([getTabCounts(), getRecommendableSongCount()]);

  const tab =
    parseTabKey(params.tab) ?? ADMIN_TABS.find((item) => counts[item.key] > 0)?.key ?? ADMIN_TABS[0].key;
  const page = parsePageNumber(params.page);
  const items = await getCandidateList(tab, page);

  return (
    <CandidateList
      tab={tab}
      page={page}
      counts={counts}
      items={items}
      recommendableSongs={recommendableSongs}
    />
  );
}
