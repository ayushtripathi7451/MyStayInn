/**
 * Admin contact from GET /api/users/me/current-stay:
 * - `property.adminPhone` when property payload exists
 * - `booking.propertyAdminPhone` when property is null or phone only on booking
 * Detail screen may also receive a nested `booking` on the param object.
 */
export function pickAdminPhoneFromStay(
  property: { adminPhone?: unknown; propertyAdminPhone?: unknown } | null | undefined,
  booking: { propertyAdminPhone?: unknown } | null | undefined
): string | undefined {
  for (const v of [property?.adminPhone, property?.propertyAdminPhone, booking?.propertyAdminPhone]) {
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return undefined;
}

/** Route param can be the flat card OR an object that still has `booking` attached. */
export function pickAdminPhoneFromDetailParam(routeProperty: Record<string, unknown>): string | undefined {
  const booking = routeProperty.booking as { propertyAdminPhone?: unknown } | undefined;
  return pickAdminPhoneFromStay(
    routeProperty as { adminPhone?: unknown; propertyAdminPhone?: unknown },
    booking ?? null
  );
}
