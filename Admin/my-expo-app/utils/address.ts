/**
 * Structured address shape (same as property address & customer complete profile).
 */
export type StructuredAddress = {
  line1?: string;
  line2?: string;
  state?: string;
  stateCode?: string;
  city?: string;
  pincode?: string;
};

/**
 * Format address for display. Supports legacy string or structured object.
 */
export function formatAddress(addr: string | StructuredAddress | null | undefined): string {
  if (addr == null || addr === "") return "Not provided";
  if (typeof addr === "string") return addr.trim() || "Not provided";
  const parts = [
    addr.line1,
    addr.line2,
    addr.city,
    addr.state,
    addr.pincode,
  ].filter(Boolean) as string[];
  return parts.length ? parts.join(", ") : "Not provided";
}
