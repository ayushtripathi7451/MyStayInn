type MaybeString = string | null | undefined;

const norm = (value: MaybeString) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const parseDateOnly = (value: MaybeString): string | null => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const parts = raw.match(/\d+/g);
  if (!parts || parts.length < 3) {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
  }

  let year: string | undefined;
  const rest: string[] = [];

  for (const p of parts) {
    if (!year && p.length === 4) year = p;
    else rest.push(p);
  }

  if (!year || rest.length < 2) {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
  }

  const a = parseInt(rest[0], 10);
  const b = parseInt(rest[1], 10);

  let day = a;
  let month = b;
  if (a >= 1 && a <= 12 && !(b >= 1 && b <= 12)) {
    month = a;
    day = b;
  } else if (b >= 1 && b <= 12 && !(a >= 1 && a <= 12)) {
    month = b;
    day = a;
  }

  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
};

const normalizeGender = (value: MaybeString) => {
  const g = norm(value);
  if (!g) return "";
  if (g === "m" || g === "male") return "male";
  if (g === "f" || g === "female") return "female";
  if (g === "o" || g === "other") return "other";
  return g;
};

const isExplicitKycVerified = (value: unknown): boolean | null => {
  if (typeof value !== "string") return null;
  const status = value.trim().toLowerCase();
  if (!status) return null;
  if (["verified", "kyc_verified", "approved"].includes(status)) return true;
  if (["unverified", "rejected", "pending", "kyc_unverified"].includes(status)) return false;
  return null;
};

export const resolveFinalKycVerified = (profile: any, aadhaarDataOverride?: any): boolean => {
  if (typeof profile?.kycVerified === "boolean") {
    return profile.kycVerified;
  }
  if (typeof profile?.profileExtras?.kycVerified === "boolean") {
    return profile.profileExtras.kycVerified;
  }

  const explicit =
    isExplicitKycVerified(profile?.kycStatus) ??
    isExplicitKycVerified(profile?.profileExtras?.kycStatus);
  if (explicit != null) return explicit;

  const aadhaarData = aadhaarDataOverride || profile?.profileExtras?.aadhaarData;
  if (!aadhaarData) return false;

  const profileName = norm([profile?.firstName, profile?.lastName].filter(Boolean).join(" "));
  const aadhaarName = norm(aadhaarData?.name);
  const nameMatch = Boolean(profileName && aadhaarName && profileName === aadhaarName);

  const profileDob = parseDateOnly(profile?.profileExtras?.dob);
  const aadhaarDob = parseDateOnly(aadhaarData?.dob);
  const dobMatch = Boolean(profileDob && aadhaarDob && profileDob === aadhaarDob);

  const profileGender = normalizeGender(profile?.sex);
  const aadhaarGender = normalizeGender(aadhaarData?.gender);
  const genderMatch = Boolean(profileGender && aadhaarGender && profileGender === aadhaarGender);

  return Boolean(nameMatch && dobMatch && genderMatch);
};

export const finalKycLabel = (profile: any): "Verified" | "Unverified" =>
  resolveFinalKycVerified(profile) ? "Verified" : "Unverified";
