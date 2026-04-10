import AsyncStorage from "@react-native-async-storage/async-storage";
import { userApi } from "./api";

export const INBOX_PREVIEW_MAX_CHARS = 100;
/** Exported so session reset can clear inbox when switching accounts */
export const CUSTOMER_PUSH_INBOX_KEY = "customer_push_inbox_v1";
const PUSH_INBOX_KEY = CUSTOMER_PUSH_INBOX_KEY;
const MAX_PUSH_ITEMS = 40;

/** Cleared with session reset (see sessionStorage.ts) */
export const CUSTOMER_ANNOUNCEMENTS_CACHE_KEY = "customer_announcements_inbox_cache_v1";
const ANNOUNCEMENTS_CACHE_KEY = CUSTOMER_ANNOUNCEMENTS_CACHE_KEY;
const ANNOUNCEMENTS_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function truncateInboxPreview(text: string, max = INBOX_PREVIEW_MAX_CHARS): string {
  const s = String(text || "").trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max).trim()}…`;
}

/**
 * Parse backend sentAt values reliably (ISO with T, space-separated, epoch string).
 */
export function parseFlexibleDate(raw: string): number {
  const s = String(raw || "").trim();
  if (!s) return NaN;
  if (/^\d{10,13}$/.test(s)) {
    const n = Number(s);
    return s.length === 10 ? n * 1000 : n;
  }
  const normalized = s.includes("T") ? s : s.replace(" ", "T");
  const tryIso = /Z$|[+-]\d{2}:\d{2}$/.test(normalized) ? normalized : `${normalized}Z`;
  return new Date(tryIso).getTime();
}

export function isWithinLastHours(isoDate: string, hours: number): boolean {
  const t = parseFlexibleDate(isoDate);
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= hours * 60 * 60 * 1000;
}

export type InboxRow = {
  kind: "announcement" | "push";
  id: string;
  title: string;
  body: string;
  sentAt: string;
};

/** True if a push row is worth showing (skip silent/data-only pings and legacy “Notification” + empty body). */
export function hasDisplayablePushContent(title: unknown, body: unknown): boolean {
  const t = String(title ?? "").trim();
  const b = String(body ?? "").trim();
  if (!t && !b) return false;
  if (t === "Notification" && !b) return false;
  return true;
}

function mapApiAnnouncementsToRows(
  list: { id?: string; title?: string; body?: string; sentAt?: string }[]
): InboxRow[] {
  const seen = new Set<string>();
  const out: InboxRow[] = [];
  for (const a of list) {
    const id = String(a.id ?? "").trim() || `a-${out.length}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const title = (a.title || "").trim();
    const body = String(a.body ?? "").trim();

    if (!title && !body) {
      console.warn("[fetchAnnouncementRows] Skipping announcement with empty title and body:", id);
      continue;
    }

    out.push({
      kind: "announcement",
      id: `ann-${id}`,
      title: title || "Announcement",
      body,
      sentAt: a.sentAt || new Date().toISOString(),
    });
  }
  return out;
}

async function readCachedAnnouncementRows(): Promise<InboxRow[]> {
  try {
    const raw = await AsyncStorage.getItem(ANNOUNCEMENTS_CACHE_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as { ts?: number; rows?: InboxRow[] };
    if (!Array.isArray(p.rows) || typeof p.ts !== "number") return [];
    if (Date.now() - p.ts > ANNOUNCEMENTS_CACHE_MAX_AGE_MS) return [];
    return p.rows.filter((r) => r?.kind === "announcement" && r.id && r.sentAt);
  } catch {
    return [];
  }
}

async function writeCachedAnnouncementRows(rows: InboxRow[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      ANNOUNCEMENTS_CACHE_KEY,
      JSON.stringify({ ts: Date.now(), rows })
    );
  } catch (e) {
    console.warn("[customerInbox] writeCachedAnnouncementRows", e);
  }
}

export async function fetchAnnouncementRows(): Promise<InboxRow[]> {
  try {
    const res = await userApi.get<{
      success: boolean;
      announcements?: { id?: string; title?: string; body?: string; sentAt?: string }[];
    }>("/api/users/me/announcements", {
      params: { allProperties: "1" },
    });
    const list = res.data?.success && Array.isArray(res.data.announcements) ? res.data.announcements : [];
    const out = mapApiAnnouncementsToRows(list);
    await writeCachedAnnouncementRows(out);
    return out;
  } catch (e) {
    console.warn("[fetchAnnouncementRows] request failed, using cache if available:", e);
    return readCachedAnnouncementRows();
  }
}

export async function appendCustomerPushInbox(title: string, body: string): Promise<void> {
  if (!hasDisplayablePushContent(title, body)) {
    return;
  }
  try {
    const raw = await AsyncStorage.getItem(PUSH_INBOX_KEY);
    let list: InboxRow[] = [];
    if (raw) {
      try {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) list = p;
      } catch {
        list = [];
      }
    }
    const titleTrim = String(title ?? "").trim();
    const bodyTrim = String(body ?? "").trim();
    list.unshift({
      kind: "push",
      id: `push-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title: titleTrim || "Notification",
      body: bodyTrim,
      sentAt: new Date().toISOString(),
    });
    await AsyncStorage.setItem(PUSH_INBOX_KEY, JSON.stringify(list.slice(0, MAX_PUSH_ITEMS)));
  } catch (e) {
    console.warn("[customerInbox] appendCustomerPushInbox", e);
  }
}

export async function getCustomerPushRows(): Promise<InboxRow[]> {
  try {
    const raw = await AsyncStorage.getItem(PUSH_INBOX_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw);
    if (!Array.isArray(p)) return [];
    return p
      .filter((x: any) => {
        if (!x?.id || !x?.sentAt) return false;
        if (!hasDisplayablePushContent(x.title, x.body)) {
          return false;
        }
        return true;
      })
      .map((x: any) => ({
        kind: "push" as const,
        id: String(x.id),
        title: String(x.title ?? "Notification").trim() || "Notification",
        body: String(x.body ?? "").trim(),
        sentAt: String(x.sentAt),
      }));
  } catch {
    return [];
  }
}

export function mergeInboxRows(announcements: InboxRow[], pushes: InboxRow[]): InboxRow[] {
  const merged = [...announcements, ...pushes];
  merged.sort((a, b) => {
    const ta = parseFlexibleDate(a.sentAt);
    const tb = parseFlexibleDate(b.sentAt);
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
  });
  return merged;
}
