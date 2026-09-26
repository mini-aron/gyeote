const LAST_VISIT_KEY = "gyeote:lastVisit";
const LAST_ENTRY_KEY = "gyeote:lastEntry";

export type EntryChoice = "backyard" | "church";

/**
 * Returns true if a previous visit was recorded, then stamps the current visit.
 * Falls back to "first visit" when storage is unavailable (private browsing, etc).
 */
export function checkAndRecordVisit(now: Date = new Date()): boolean {
  if (typeof window === "undefined") return false;
  try {
    const last = window.localStorage.getItem(LAST_VISIT_KEY);
    window.localStorage.setItem(LAST_VISIT_KEY, now.toISOString());
    return last !== null;
  } catch {
    return false;
  }
}

export function recordEntry(entry: EntryChoice): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_ENTRY_KEY, entry);
  } catch {
    // storage unavailable — entry choice is a nice-to-have context, not required
  }
}
