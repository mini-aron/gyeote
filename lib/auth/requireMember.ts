import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/lib/auth";
import { hasRequiredConsents } from "@/lib/auth/consentStatus";

export async function requireMember(menu: string, nextPath?: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/?login=${encodeURIComponent(menu)}`);
  if (!(await hasRequiredConsents(user.id))) {
    redirect(`/welcome?next=${encodeURIComponent(nextPath ?? `/${menu}`)}`);
  }
  return user;
}
