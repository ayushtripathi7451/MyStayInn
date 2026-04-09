/**
 * Map API room (roomType enum + capacity) to customer-facing "N sharing".
 * Prefer single/double/triple → 1/2/3; then capacity; else —.
 */
export function formatOccupancySharing(
  room: { roomType?: string; capacity?: number } | null | undefined
): string {
  if (!room) return "—";
  const rt = String(room.roomType ?? "")
    .toLowerCase()
    .trim();
  const byType: Record<string, number> = {
    single: 1,
    double: 2,
    triple: 3,
  };
  if (byType[rt] != null) return `${byType[rt]} sharing`;
  const cap = Number(room.capacity);
  if (Number.isFinite(cap) && cap > 0) return `${cap} sharing`;
  return "—";
}

/** Aggregate from all rooms: e.g. single+double+triple -> "1/2/3 sharing". */
export function formatOccupancySharingFromRooms(
  rooms: { roomType?: string; capacity?: number }[] | null | undefined
): string {
  if (!Array.isArray(rooms) || rooms.length === 0) return "—";
  const values = new Set<number>();
  for (const room of rooms) {
    const label = formatOccupancySharing(room);
    const m = label.match(/^(\d+)\s+sharing$/i);
    if (m) values.add(Number(m[1]));
  }
  const nums = Array.from(values).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (nums.length === 0) return "—";
  return `${nums.join("/")} sharing`;
}

/** Boys / Girls / Colive from rules.propertyFor or description ("PG for Boys") */
export function extractPropertyAudience(
  property: { description?: string | null; rules?: unknown; propertyFor?: string | null } | null | undefined
): string | null {
  if (!property) return null;
  if (typeof property.propertyFor === "string" && property.propertyFor.trim()) {
    const p = property.propertyFor.trim().toLowerCase();
    if (["boys", "men", "male"].includes(p)) return "Boys";
    if (["girls", "women", "female"].includes(p)) return "Girls";
    if (["colive", "co-live", "co live", "mixed", "unisex"].includes(p)) return "Colive";
    return property.propertyFor.trim();
  }
  const rules = property.rules as Record<string, unknown> | null | undefined;
  if (rules && typeof rules.propertyFor === "string" && rules.propertyFor.trim()) {
    const v = rules.propertyFor.trim().toLowerCase();
    if (["boys", "men", "male"].includes(v)) return "Boys";
    if (["girls", "women", "female"].includes(v)) return "Girls";
    if (["colive", "co-live", "co live", "mixed", "unisex"].includes(v)) return "Colive";
    if (v) return v.charAt(0).toUpperCase() + v.slice(1);
  }
  const desc = String(property.description ?? "");
  const m = desc.match(
    /\bfor\s+(Boys|Girls|Colive|Co[-\s]?live|Students|Men|Women|Mixed|Unisex)\b/i
  );
  if (m) {
    const w = m[1].toLowerCase();
    if (["boys", "men"].includes(w)) return "Boys";
    if (["girls", "women"].includes(w)) return "Girls";
    if (["colive", "co-live", "co live", "mixed", "unisex"].includes(w))
      return "Colive";
    return w.charAt(0).toUpperCase() + w.slice(1);
  }
  return null;
}
