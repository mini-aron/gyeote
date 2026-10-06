import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/shared/lib/supabase-server";
import { ensureProfile } from "@/lib/auth/profile";
import { hasRequiredConsents } from "@/lib/auth/consentStatus";
import { sanitizeNextPath } from "@/lib/auth/nextPath";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = sanitizeNextPath(searchParams.get("next"));
  const failure = NextResponse.redirect(new URL("/?loginError=1", origin));

  if (!code) return failure;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return failure;

  try {
    await ensureProfile(data.user);
    if (!(await hasRequiredConsents(data.user.id))) {
      return NextResponse.redirect(
        new URL(`/welcome?next=${encodeURIComponent(next)}`, origin),
      );
    }
  } catch {
    return failure;
  }
  return NextResponse.redirect(new URL(next, origin));
}
