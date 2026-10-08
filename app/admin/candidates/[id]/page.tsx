import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { TAG_GROUPS, parseId } from "@/lib/admin/candidateInput";
import { getCandidateDetail, getTagCatalog } from "@/lib/admin/getAdminData";
import { candidateHref, listHref, parseTabKey } from "@/lib/admin/tabs";
import type { CandidateTags } from "@/lib/admin/types";
import { CandidateEditor } from "@/components/admin/CandidateEditor";
import { AttachVideoForm } from "@/components/admin/AttachVideoForm";
import { CandidateNotices } from "@/components/admin/CandidateNotices";
import { VideoEmbed } from "@/components/admin/VideoEmbed";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const id = parseId((await params).id);
  if (!id) notFound();

  const requestedTab = parseTabKey((await searchParams).tab);
  const [result, catalog] = await Promise.all([getCandidateDetail(id, requestedTab), getTagCatalog()]);
  if (!result) notFound();

  const { detail, tab, nextId } = result;
  const knownTags = {} as CandidateTags;
  for (const group of TAG_GROUPS) {
    knownTags[group] = detail.tags[group].filter((name) => catalog[group].includes(name));
  }
  const nextHref = nextId ? candidateHref(nextId, tab) : listHref(tab);

  return (
    <div className="space-y-4">
      <Link href={listHref(tab)} prefetch={false} className="inline-block text-sm text-[#f4f1ff]/60 hover:text-[#f4f1ff]">
        ← 후보 큐
      </Link>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <VideoEmbed videoId={detail.youtubeVideoId} embeddable={detail.embeddable} />
          <AttachVideoForm key={`attach-${detail.id}`} id={detail.id} visible={detail.status === "needs_video"} />
          <CandidateNotices key={detail.id} detail={detail} tab={tab} nextHref={nextHref} />
        </div>
        <CandidateEditor
          key={detail.id}
          detail={{ ...detail, tags: knownTags }}
          catalog={catalog}
          nextHref={nextHref}
          hasNext={nextId !== null}
        />
      </div>
    </div>
  );
}
