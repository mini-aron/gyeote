import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/lib/auth";
import { hasRequiredConsents } from "@/lib/auth/consentStatus";
import { sanitizeNextPath } from "@/lib/auth/nextPath";
import { ConsentForm } from "@/components/auth/ConsentForm";

export default async function WelcomePage({ searchParams }: PageProps<"/welcome">) {
  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = sanitizeNextPath(rawNext);

  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (await hasRequiredConsents(user.id)) redirect(next);

  return <ConsentForm next={next} />;
}
