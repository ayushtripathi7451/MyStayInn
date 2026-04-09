/**
 * Enrollment pending rent for stats (Home financial card + Reports Hub),
 * aligned with PaymentManagementScreen `buildEnrollmentMonthlyRentDueItems` / ReportsHub booking due logic.
 */

function num(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function toBool(v: unknown): boolean {
  return v === true || v === "true" || v === 1;
}

export function parsePendingAllocation(r: Record<string, unknown>): Record<string, unknown> | null {
  const pa = r?.pendingAllocation;
  if (pa == null) return null;
  if (typeof pa === "object" && !Array.isArray(pa)) return pa as Record<string, unknown>;
  try {
    return JSON.parse(String(pa)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function rentStartYmFromMoveIn(moveInDate: string | undefined): string | null {
  try {
    if (!moveInDate) return null;
    const moveIn = new Date(moveInDate);
    if (Number.isNaN(moveIn.getTime())) return null;
    const start =
      moveIn.getDate() <= 10 ? moveIn : new Date(moveIn.getFullYear(), moveIn.getMonth() + 1, 1);
    return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
  } catch {
    return null;
  }
}

/** Same field shape as active-for-reports booking for admin monthly due helpers. */
export function buildSyntheticEnrollmentBooking(r: Record<string, unknown>): Record<string, unknown> | null {
  const st = String(r.status || "").trim().toLowerCase();
  if (st !== "requested" && st !== "pay_pending") return null;

  const pa = parsePendingAllocation(r);
  if (!pa) return null;

  const rp = String(pa.rentPeriod || "month").toLowerCase();
  if (rp === "day") return null;

  const rentAmtNum = num(pa.rentAmount);
  const onlineRecv = num(pa.onlinePaymentRecv);
  const cashRecv = num(pa.cashPaymentRecv);

  const schedOn =
    pa.scheduledOnlineRent != null && String(pa.scheduledOnlineRent).trim() !== ""
      ? num(pa.scheduledOnlineRent)
      : onlineRecv > 0
        ? onlineRecv
        : cashRecv > 0
          ? 0
          : rentAmtNum;

  const schedCash =
    pa.scheduledCashRent != null && String(pa.scheduledCashRent).trim() !== ""
      ? num(pa.scheduledCashRent)
      : cashRecv;

  const moveInRaw = (pa.moveInDate as unknown) ?? r.moveInDate;
  if (!moveInRaw) return null;

  const moveInDate =
    typeof moveInRaw === "string"
      ? moveInRaw
      : new Date(moveInRaw as Date).toISOString?.() ?? String(moveInRaw);

  const paidOnlineYm = String((r as any).rentOnlinePaidYearMonth || "").trim();
  const paidCashYm = String((r as any).rentCashPaidYearMonth || "").trim();

  return {
    rentPeriod: "month",
    moveInDate,
    scheduledOnlineRent: schedOn,
    scheduledCashRent: schedCash,
    rentOnlinePaidYearMonth: paidOnlineYm || null,
    rentCashPaidYearMonth: paidCashYm || null,
    onlinePaymentRecv: 0,
    cashPaymentRecv: 0,
    isRentOnlinePaid: false,
    isRentCashPaid: false,
    rentAmount: String(schedOn || schedCash || rentAmtNum || 0),
  };
}

/**
 * Mirrors ReportsHub `adminMonthlyOnlineDueForMonthKey` for monthly (non-day) bookings.
 */
export function enrollmentOnlineDueForMonthKey(synthetic: Record<string, unknown>, monthKey: string): number {
  const rp = String(synthetic?.rentPeriod || "month").toLowerCase();
  if (rp === "day") return 0;

  const schedOn = num(synthetic.scheduledOnlineRent);
  const legacyOn = num(synthetic.onlinePaymentRecv);
  const paidYm = String(synthetic.rentOnlinePaidYearMonth ?? "").trim();
  const startYm = rentStartYmFromMoveIn(String(synthetic.moveInDate ?? ""));
  if (startYm && monthKey < startYm) return 0;

  if (schedOn > 0) {
    const paidMonths = paidYm ? paidYm.split(",").map((m: string) => m.trim()) : [];
    if (paidMonths.includes(monthKey)) return 0;
    return schedOn;
  }
  if (toBool(synthetic.isRentOnlinePaid)) return 0;
  return legacyOn > 0 ? legacyOn : 0;
}

/**
 * Mirrors ReportsHub `adminMonthlyCashDueForMonthKey` for monthly (non-day) bookings.
 */
export function enrollmentCashDueForMonthKey(synthetic: Record<string, unknown>, monthKey: string): number {
  const rp = String(synthetic?.rentPeriod || "month").toLowerCase();
  if (rp === "day") return 0;

  const legacyCash = num(synthetic.cashPaymentRecv);
  const schedCash = num(synthetic.scheduledCashRent);
  const paidYm = String(synthetic.rentCashPaidYearMonth ?? "").trim();
  const startYm = rentStartYmFromMoveIn(String(synthetic.moveInDate ?? ""));
  if (startYm && monthKey < startYm) return 0;

  if (schedCash > 0) {
    const paidMonths = paidYm ? paidYm.split(",").map((m: string) => m.trim()) : [];
    if (paidMonths.includes(monthKey)) return 0;
    return schedCash;
  }
  if (toBool(synthetic.isRentCashPaid)) return 0;
  return legacyCash > 0 ? legacyCash : 0;
}

/** Local calendar month key for "today" (matches PaymentManagementScreen virtual daily row). */
export function getLocalTodayMonthKey(): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Day-rent enrollment pending for a month: virtual "today" row from pendingAllocation,
 * same amounts as PaymentManagementScreen `buildEnrollmentDailyRentDueItems`.
 */
function enrollmentDailyRentDueForMonthKey(r: Record<string, unknown>, pa: Record<string, unknown>, monthKey: string): number {
  if (monthKey !== getLocalTodayMonthKey()) return 0;

  const rentAmtNum = num(pa.rentAmount);
  const onlineRecv = num(pa.onlinePaymentRecv);
  const cashRecv = num(pa.cashPaymentRecv);

  const schedOn =
    pa.scheduledOnlineRent != null && String(pa.scheduledOnlineRent).trim() !== ""
      ? num(pa.scheduledOnlineRent)
      : onlineRecv > 0
        ? onlineRecv
        : cashRecv > 0
          ? 0
          : rentAmtNum;

  const schedCash =
    pa.scheduledCashRent != null && String(pa.scheduledCashRent).trim() !== ""
      ? num(pa.scheduledCashRent)
      : cashRecv;

  let total = 0;
  if (schedOn > 0) total += schedOn;
  if (schedCash > 0) total += schedCash;
  return total;
}

/** Total enrollment rent (online + cash) due for a calendar month across open enrollment requests. */
export function sumEnrollmentRentDueForMonthKey(requests: unknown[], monthKey: string): number {
  let total = 0;
  for (const raw of requests) {
    const r = raw as Record<string, unknown>;
    const st = String(r.status || "").trim().toLowerCase();
    if (st !== "requested" && st !== "pay_pending") continue;

    const pa = parsePendingAllocation(r);
    if (!pa) continue;
    const rp = String(pa.rentPeriod || "month").toLowerCase();

    if (rp === "day") {
      total += enrollmentDailyRentDueForMonthKey(r, pa, monthKey);
      continue;
    }

    const syn = buildSyntheticEnrollmentBooking(r);
    if (!syn) continue;
    total += enrollmentOnlineDueForMonthKey(syn, monthKey);
    total += enrollmentCashDueForMonthKey(syn, monthKey);
  }
  return total;
}
