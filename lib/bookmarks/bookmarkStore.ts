import "server-only";
import { getCurrentUser } from "@/shared/lib/auth";
import { createSupabaseServerClient } from "@/shared/lib/supabase-server";
import { supabaseAdmin } from "@/shared/lib/supabase-client";
import { hasRequiredConsents } from "@/lib/auth/consentStatus";
import { isUuid } from "@/shared/lib/uuid";
import type { BookmarkKind, BookmarkResult } from "@/lib/bookmarks/types";

const TABLES = {
  verse: { bookmarks: "verse_bookmarks", column: "verse_id", content: "verses" },
  song: { bookmarks: "song_bookmarks", column: "song_id", content: "songs" },
} as const;

export type BookmarkMode = "toggle" | "ensure" | "remove";

export async function changeBookmark(
  kind: BookmarkKind,
  id: unknown,
  mode: BookmarkMode,
): Promise<BookmarkResult> {
  if (!isUuid(id)) return { bookmarked: false, error: "invalid" };

  const user = await getCurrentUser();
  if (!user) return { bookmarked: false, error: "unauthorized" };

  const table = TABLES[kind];
  const supabase = await createSupabaseServerClient();

  const { data: existing, error: readError } = await supabase
    .from(table.bookmarks)
    .select(table.column)
    .eq("user_id", user.id)
    .eq(table.column, id)
    .maybeSingle();
  if (readError) return { bookmarked: false, error: "failed" };

  const remove = async (): Promise<BookmarkResult> => {
    const { error } = await supabase
      .from(table.bookmarks)
      .delete()
      .eq("user_id", user.id)
      .eq(table.column, id);
    return error ? { bookmarked: true, error: "failed" } : { bookmarked: false };
  };

  if (mode === "remove") return existing ? remove() : { bookmarked: false };
  if (existing) return mode === "toggle" ? remove() : { bookmarked: true };

  if (!(await hasRequiredConsents(user.id))) return { bookmarked: false, error: "consent" };

  const { data: content, error: contentError } = await supabaseAdmin
    .from(table.content)
    .select("id")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  if (contentError) return { bookmarked: false, error: "failed" };
  if (!content) return { bookmarked: false, error: "invalid" };

  const { error: insertError } = await supabaseAdmin
    .from(table.bookmarks)
    .upsert({ user_id: user.id, [table.column]: id }, { onConflict: `user_id,${table.column}`, ignoreDuplicates: true });
  return insertError ? { bookmarked: false, error: "failed" } : { bookmarked: true };
}

export async function readBookmarkedIds(kind: BookmarkKind): Promise<string[] | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const table = TABLES[kind];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from(table.bookmarks)
    .select(table.column)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as unknown as Record<string, string>[]).map((row) => row[table.column]);
}

export async function isBookmarkedBy(userId: string, kind: BookmarkKind, id: unknown): Promise<boolean> {
  if (!isUuid(id)) return false;
  const table = TABLES[kind];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from(table.bookmarks)
    .select(table.column)
    .eq("user_id", userId)
    .eq(table.column, id)
    .maybeSingle();
  return Boolean(data);
}
