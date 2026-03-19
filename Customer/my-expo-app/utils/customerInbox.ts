import AsyncStorage from "@react-native-async-storage/async-storage";
import { userApi } from "./api";

export const INBOX_PREVIEW_MAX_CHARS = 100;
const PUSH_INBOX_KEY = "customer_push_inbox_v1";
const MAX_PUSH_ITEMS = 40;

export function truncateInboxPreview(text: string, max = INBOX_PREVIEW_MAX_CHARS): string {
  const s = String(text || "").trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max).trim()}…`;
}

export function isWithinLastHours(isoDate: string, hours: number): boolean {
  const raw = String(isoDate || "").trim();
  if (!raw) return false;

  // Accept epoch milliseconds/seconds as string
  if (/^\d{10,13}$/.test(raw)) {
    const n = Number(raw);
    const tEpoch = raw.length === 10 ? n * 1000 : n;
    return Date.now() - tEpoch <= hours * 60 * 60 * 1000;
  }

  // Accept ISO-like values without timezone by assuming UTC.
  // Example from some services: "2026-03-18 10:35:03" or "2026-03-18T10:35:03"
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const tryIso = /Z$|[+-]\d{2}:\d{2}$/.test(normalized) ? normalized : `${normalized}Z`;

  const t = new Date(tryIso).getTime();
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

export async function fetchAnnouncementRows(): Promise<InboxRow[]> {
  try {
    const res = await userApi.get<{
      success: boolean;
      announcements?: { id?: string; title?: string; body?: string; sentAt?: string }[];
    }>("/api/users/me/announcements");
    const list = res.data?.success && Array.isArray(res.data.announcements) ? res.data.announcements : [];
    const seen = new Set<string>();
    const out: InboxRow[] = [];
    for (const a of list) {
      const id = String(a.id ?? "").trim() || `a-${out.length}`;
      if (seen.has(id)) continue;
      seen.add(id);
      
      const title = (a.title || "").trim();
      const body = String(a.body ?? "").trim();
      
      // Skip announcements with empty title AND empty body
      if (!title && !body) {
        console.warn('[fetchAnnouncementRows] Skipping announcement with empty title and body:', id);
        continue;
      }
      
      out.push({
        kind: "announcement",
        id: `ann-${id}`,
        title: title || "Announcement",
        body: body,
        sentAt: a.sentAt || new Date().toISOString(),
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function appendCustomerPushInbox(title: string, body: string): Promise<void> {
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
    list.unshift({
      kind: "push",
      id: `push-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title: title?.trim() || "Notification",
      body: String(body ?? ""),
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
        // Filter out notifications with empty title AND empty body
        const title = String(x.title ?? "").trim();
        const body = String(x.body ?? "").trim();
        if (!title && !body) {
          console.warn('[getCustomerPushRows] Skipping push notification with empty title and body:', x.id);
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
    const ta = new Date(a.sentAt).getTime();
    const tb = new Date(b.sentAt).getTime();
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
  });
  return merged;
}
