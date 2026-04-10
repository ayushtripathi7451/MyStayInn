/**
 * Keep home badge and Move Out → Requested tab aligned with the selected property.
 * Handles API responses that include propertyId, propertyUniqueId, or propertyName.
 */
export function moveOutRequestMatchesProperty(
  r: {
    propertyId?: string;
    propertyUniqueId?: string;
    propertyName?: string;
  },
  opts: { propertyId?: string; propertyName?: string; propertyUniqueId?: string }
): boolean {
  const { propertyId, propertyName, propertyUniqueId } = opts;
  if (!propertyId && !propertyName && !propertyUniqueId) return true;

  const rp = String(r.propertyId ?? r.propertyUniqueId ?? "").trim();
  const ids = [propertyId, propertyUniqueId].filter(
    (x): x is string => typeof x === "string" && x.length > 0
  );
  if (ids.some((id) => rp === id.trim())) return true;

  const rname = String(r.propertyName ?? "")
    .trim()
    .toLowerCase();
  const cname = propertyName ? propertyName.trim().toLowerCase() : "";
  if (cname && rname && rname === cname) return true;

  return false;
}
