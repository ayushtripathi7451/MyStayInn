/**
 * Structured address shape (same as admin property address).
 * Used in Complete your profile and displayed everywhere.
 */
export type StructuredAddress = {
  line1: string;
  line2?: string;
  state: string;
  stateCode?: string;
  city: string;
  pincode: string;
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

export function emptyStructuredAddress(): StructuredAddress {
  return {
    line1: "",
    line2: "",
    state: "",
    stateCode: "",
    city: "",
    pincode: "",
  };
}

/**
 * Map Cashfree / DigiLocker Aadhaar address (string or addressObject) to StructuredAddress.
 */
export function cashfreeAddressToStructured(details: any): StructuredAddress {
  const base = emptyStructuredAddress();
  if (!details) return base;
  const raw = details.addressObject ?? details.address;

  if (typeof raw === "string" && raw.trim()) {
    const addr = raw.trim();
    const pinMatch = addr.match(/(\d{6})\s*$/);
    const pincode = pinMatch ? pinMatch[1] : "";
    const withoutPin = pinMatch ? addr.slice(0, pinMatch.index).trim().replace(/[, ]+$/, "") : addr;
    const parts = withoutPin.split(",").map((p) => p.trim()).filter(Boolean);

    if (parts.length >= 3) {
      const cityPart = parts[parts.length - 3];
      const statePart = parts[parts.length - 2];
      const line1Raw = parts.slice(0, -3).join(", ");
      const line1Chunks = line1Raw.split(",").map((p) => p.trim()).filter(Boolean);
      const line1Head = line1Chunks.slice(0, 3).join(", ");
      const line1Tail = line1Chunks.slice(3).join(", ");
      base.line1 = line1Head || `${cityPart}, ${statePart}`.trim();
      base.line2 = line1Tail || base.line2;
      base.city = cityPart;
      base.state = statePart;
      base.pincode = pincode;
    } else if (parts.length === 2) {
      const statePart = parts[1];
      const cityPart = parts[0];
      base.line1 = cityPart;
      base.city = cityPart;
      base.state = statePart;
      base.pincode = pincode;
    } else {
      const chunks = withoutPin.split(",").map((p) => p.trim()).filter(Boolean);
      if (chunks.length > 0) {
        base.line1 = chunks.slice(0, 3).join(", ");
        base.line2 = chunks.slice(3).join(", ");
      } else {
        base.line1 = addr;
      }
      base.pincode = pincode;
    }
    return base;
  }

  const addrObj = raw;
  if (addrObj && typeof addrObj === "object") {
    const line1Parts = [addrObj.house, addrObj.street].filter(Boolean).map(String);
    const line2Parts = [addrObj.landmark, addrObj.locality].filter(Boolean).map(String);
    base.line1 = line1Parts.join(", ").trim() || "";
    base.line2 = line2Parts.join(", ").trim() || "";
    base.city = String(addrObj.city || "").trim();
    base.state = String(addrObj.state || "").trim();
    base.pincode = String(addrObj.pincode || "").trim().slice(0, 6);
  }
  return base;
}
