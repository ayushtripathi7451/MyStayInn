function normalizeProfileExtras(extras: unknown): Record<string, unknown> {
  if (extras == null) return {};
  if (typeof extras === "string") {
    try {
      const p = JSON.parse(extras);
      return typeof p === "object" && p !== null ? (p as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  if (typeof extras === "object") return extras as Record<string, unknown>;
  return {};
}

/**
 * Profile is considered complete for Home only when backend marked it complete
 * and document uploads exist (same conditions as complete-profile with documents).
 */
export function isCustomerProfileCompleteForHome(extras: unknown): boolean {
  const e = normalizeProfileExtras(extras);
  if (e.profileCompleted !== true) return false;
  const d = e.documents;
  if (!d || typeof d !== "object") return false;
  const doc = d as Record<string, unknown>;
  const front = doc.aadharFront;
  const back = doc.aadharBack;
  return (
    typeof front === "string" &&
    front.trim().length > 0 &&
    typeof back === "string" &&
    back.trim().length > 0
  );
}
