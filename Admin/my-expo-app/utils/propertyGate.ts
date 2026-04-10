/** True when API returned at least one non-empty property row. */
export function hasUsableProperties(properties: unknown): boolean {
  if (!Array.isArray(properties) || properties.length === 0) return false;
  return properties.some((p) => {
    if (p == null || typeof p !== "object") return false;
    const o = p as Record<string, unknown>;
    if (o.id != null && String(o.id).length > 0) return true;
    if (o.uniqueId != null && String(o.uniqueId).length > 0) return true;
    if (typeof o.name === "string" && o.name.trim().length > 0) return true;
    return false;
  });
}
