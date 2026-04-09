import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCurrentStay } from "../src/hooks";

export type DueItem = {
  id: string;
  label: string;
  monthLabel: string;
  amount: number;
  paid: boolean;
  type: "security_deposit" | "rent_online" | "rent_cash";
  propertyId?: string;
  ownerId?: string;
  paymentId?: string;
  bookingId?: string;
};

function yearMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Property row for due derivation + Pay Now. Uses full `raw.property` when present;
 * otherwise falls back to `booking.propertyId` + `propertyOwnerId` from `/current-stay`
 * when the room/property HTTP calls failed (so Payments Due still matches Home totals).
 */
export function propertyForDue(raw: any): {
  id: string;
  ownerId?: string;
  uniqueId?: string;
} | null {
  if (!raw?.booking) return null;
  const full = raw.property;
  if (full?.id != null && String(full.id).trim() !== "") {
    return {
      id: String(full.id),
      ownerId: full.ownerId != null ? String(full.ownerId) : undefined,
      uniqueId: full.uniqueId != null ? String(full.uniqueId) : undefined,
    };
  }
  const b = raw.booking;
  const room = b.room && typeof b.room === "object" ? b.room : null;
  const pid =
    b.propertyId ??
    b.propertyUniqueId ??
    room?.propertyId ??
    room?.propertyUniqueId;
  const oid = b.propertyOwnerId ?? b.ownerId ?? room?.ownerId;
  if (pid != null && String(pid).trim() !== "") {
    return {
      id: String(pid),
      ownerId: oid != null ? String(oid) : undefined,
      uniqueId:
        b.propertyUniqueId != null
          ? String(b.propertyUniqueId)
          : room?.propertyUniqueId != null
            ? String(room.propertyUniqueId)
            : undefined,
    };
  }
  return null;
}

export function stayListFromRaw(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw.currentStays) && raw.currentStays.length > 0) return raw.currentStays;
  if (raw.booking && propertyForDue(raw)) return [raw];
  return [];
}

export function deriveDueItemsFromRaw(raw: any): DueItem[] {
  console.log('[deriveDueItemsFromRaw] ========== START ==========');
  console.log('[deriveDueItemsFromRaw] raw exists:', !!raw);
  console.log('[deriveDueItemsFromRaw] raw.currentStays:', raw?.currentStays?.length);
  
  const stays = stayListFromRaw(raw);
  console.log('[deriveDueItemsFromRaw] Number of stays:', stays.length);
  
  if (stays.length === 0) {
    console.log('[deriveDueItemsFromRaw] No stays found');
    return [];
  }
  
  if (stays.length > 1) {
    console.log('[deriveDueItemsFromRaw] Processing multiple stays');
    const results = stays.flatMap((stay, idx) => 
      deriveDueItemsForOneStay(stay, `${stay.booking?.id ?? idx}_`)
    );
    console.log('[deriveDueItemsFromRaw] Total items from multiple stays:', results.length);
    return results;
  }
  
  return deriveDueItemsForOneStay(stays[0], '');
}

function deriveDueItemsForOneStay(raw: any, idPrefix: string): DueItem[] {
  const items: DueItem[] = [];
  const prop = propertyForDue(raw);
  if (!raw?.booking || !prop) {
    return items;
  }

  const booking = raw.booking;
  const bookingStatus = String(booking.status || "");
  const bookingId = String(booking.id ?? '');
  const rentPeriod = String(booking.rentPeriod || 'month').toLowerCase();
  const isDailyRent = rentPeriod === 'day';

  console.log(`[deriveDueItemsForOneStay] Processing stay:`, {
    bookingId,
    status: bookingStatus,
    rentPeriod,
    isDailyRent
  });

  // Handle enrollment-only stays (dues visible on Home / Payments like active booking; enrollments tab until deposit paid)
  if (
    bookingStatus === "enrollment_pending" ||
    bookingStatus === "enrollment_pay_pending" ||
    bookingStatus === "enrollment_requested"
  ) {
    const securityAmount = Number(booking.securityDeposit) || 0;
    const isSecurityPaid = Boolean(booking.isSecurityPaid);
    if (securityAmount > 0 && !isSecurityPaid) {
      items.push({
        id: `${idPrefix}security_deposit`,
        label: "Security deposit",
        monthLabel: booking.moveInDate
          ? new Date(booking.moveInDate).toLocaleDateString("en-GB", {
              month: "short",
              year: "numeric",
            })
          : "—",
        amount: securityAmount,
        paid: false,
        type: "security_deposit",
        propertyId: prop.id,
        ownerId: prop.ownerId ?? undefined,
        bookingId,
      });
    }

    // Monthly rent: same rules as confirmed booking — move-in day 1–10 ⇒ first month due immediately (with security).
    if (!isDailyRent) {
      const monthlyRent = Number(booking.scheduledOnlineRent) || Number(booking.rentAmount) || 0;
      const paidMonthsStr = booking.rentOnlinePaidYearMonth || "";
      const paidMonths = new Set(paidMonthsStr.split(",").map((m: string) => m.trim()).filter(Boolean));
      const moveInDate = booking.moveInDate;
      const moveIn = moveInDate ? new Date(moveInDate) : null;
      let firstDueYm: string | null = null;
      if (moveIn) {
        const moveInDay = moveIn.getDate();
        const moveInYm = yearMonth(moveIn);
        const nextMonthYm = yearMonth(new Date(moveIn.getFullYear(), moveIn.getMonth() + 1, 1));
        firstDueYm = moveInDay <= 10 ? moveInYm : nextMonthYm;
      }
      if (firstDueYm && monthlyRent > 0) {
        const current = new Date();
        const currentYm = yearMonth(current);
        const [firstYear, firstMonth] = firstDueYm.split("-").map(Number);
        const [currentYear, currentMonth] = currentYm.split("-").map(Number);
        let year = firstYear;
        let month = firstMonth;
        while (year < currentYear || (year === currentYear && month <= currentMonth)) {
          const monthKey = `${year}-${String(month).padStart(2, "0")}`;
          if (!paidMonths.has(monthKey)) {
            const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
              month: "short",
              year: "numeric",
            });
            items.push({
              id: `${idPrefix}rent_online_${monthKey}`,
              label: "Rent (online)",
              monthLabel,
              amount: monthlyRent,
              paid: false,
              type: "rent_online",
              propertyId: prop.id,
              ownerId: prop.ownerId ?? undefined,
              bookingId,
            });
          }
          month++;
          if (month > 12) {
            month = 1;
            year++;
          }
        }
      }

      const cashRecv = Number(booking.scheduledCashRent) || Number(booking.cashPaymentRecv) || 0;
      const isRentCashPaid = Boolean(booking.isRentCashPaid);
      if (cashRecv > 0 && !isRentCashPaid) {
        items.push({
          id: `${idPrefix}rent_cash`,
          label: "Rent (cash)",
          monthLabel: new Date().toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
          amount: cashRecv,
          paid: false,
          type: "rent_cash",
          propertyId: prop.id,
          ownerId: prop.ownerId ?? undefined,
          bookingId,
        });
      }
    }

    return items;
  }

  // Handle daily rent
  if (isDailyRent) {
    const dailyPayments = booking.dailyPayments || [];
    const sortedPayments = [...dailyPayments]
      .map((p: any) => ({
        ...p,
        paymentDate: new Date(p.paymentDate || p.date)
      }))
      .sort((a: any, b: any) => b.paymentDate.getTime() - a.paymentDate.getTime());

    sortedPayments.forEach((p: any) => {
      const monthLabel = p.paymentDate.toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
        day: "numeric"
      });

      const cashAmount = Number(p.cashAmount || 0);
      const onlineAmount = Number(p.onlineAmount || 0);
      const pid = p.id != null ? String(p.id) : undefined;

      if (!p.paidOnline && onlineAmount > 0) {
        items.push({
          id: `${idPrefix}daily_online_${pid ?? monthLabel}`,
          label: "Daily Rent (online)",
          monthLabel,
          amount: onlineAmount,
          paid: false,
          type: "rent_online",
          propertyId: prop.id,
          ownerId: prop.ownerId ?? undefined,
          paymentId: pid,
          bookingId,
        });
      }

      if (!p.paidCash && cashAmount > 0) {
        items.push({
          id: `${idPrefix}daily_cash_${pid ?? monthLabel}`,
          label: "Daily Rent (cash)",
          monthLabel,
          amount: cashAmount,
          paid: false,
          type: "rent_cash",
          propertyId: prop.id,
          ownerId: prop.ownerId ?? undefined,
          paymentId: pid,
          bookingId,
        });
      }
    });
  }

  // Handle monthly rent
  if (!isDailyRent) {
    const moveInDate = booking.moveInDate;
    const monthlyRent = Number(booking.scheduledOnlineRent) || Number(booking.rentAmount) || 0;
    const paidMonthsStr = booking.rentOnlinePaidYearMonth || '';
    const paidMonths = new Set(paidMonthsStr.split(',').map((m: string) => m.trim()).filter(Boolean));

    const moveIn = moveInDate ? new Date(moveInDate) : null;
    let firstDueYm = null;
    if (moveIn) {
      const moveInDay = moveIn.getDate();
      const moveInYm = yearMonth(moveIn);
      const nextMonthYm = yearMonth(new Date(moveIn.getFullYear(), moveIn.getMonth() + 1, 1));
      firstDueYm = moveInDay <= 10 ? moveInYm : nextMonthYm;
    }

    if (firstDueYm && monthlyRent > 0) {
      const current = new Date();
      const currentYm = yearMonth(current);
      const [firstYear, firstMonth] = firstDueYm.split('-').map(Number);
      const [currentYear, currentMonth] = currentYm.split('-').map(Number);

      let year = firstYear;
      let month = firstMonth;

      while (year < currentYear || (year === currentYear && month <= currentMonth)) {
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;

        if (!paidMonths.has(monthKey)) {
          const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
            month: "short",
            year: "numeric",
          });

          items.push({
            id: `${idPrefix}rent_online_${monthKey}`,
            label: "Rent (online)",
            monthLabel,
            amount: monthlyRent,
            paid: false,
            type: "rent_online",
            propertyId: prop.id,
            ownerId: prop.ownerId ?? undefined,
            bookingId,
          });
        }

        month++;
        if (month > 12) {
          month = 1;
          year++;
        }
      }
    }
  }

  // Add security deposit (common for both rent types)
  const securityAmount = Number(booking.securityDeposit) || 0;
  const isSecurityPaid = Boolean(booking.isSecurityPaid);
  if (securityAmount > 0 && !isSecurityPaid) {
    items.push({
      id: `${idPrefix}security_deposit`,
      label: "Security deposit",
      monthLabel: booking.moveInDate
        ? new Date(booking.moveInDate).toLocaleDateString("en-GB", {
            month: "short",
            year: "numeric",
          })
        : "—",
      amount: securityAmount,
      paid: false,
      type: "security_deposit",
      propertyId: prop.id,
      ownerId: prop.ownerId ?? undefined,
      bookingId,
    });
  }

  // Add cash rent for monthly only
  if (!isDailyRent) {
    const cashRecv = Number(booking.scheduledCashRent) || Number(booking.cashPaymentRecv) || 0;
    const isRentCashPaid = Boolean(booking.isRentCashPaid);
    if (cashRecv > 0 && !isRentCashPaid) {
      items.push({
        id: `${idPrefix}rent_cash`,
        label: "Rent (cash)",
        monthLabel: new Date().toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
        amount: cashRecv,
        paid: false,
        type: "rent_cash",
        propertyId: prop.id,
        ownerId: prop.ownerId ?? undefined,
        bookingId,
      });
    }
  }

  console.log(`[deriveDueItemsForOneStay] Items for booking ${bookingId}:`, items.length);
  return items;
}

/** Room row from list APIs often carries propertyId; booking may not — needed for propertyForDue. */
function bookingShapeForDueDerivation(b: Record<string, any>): Record<string, any> {
  const merged = { ...b };
  const r = b?.room;
  if (r && typeof r === "object") {
    if (merged.propertyId == null && r.propertyId != null) merged.propertyId = String(r.propertyId);
    if (merged.propertyUniqueId == null && r.propertyUniqueId != null)
      merged.propertyUniqueId = String(r.propertyUniqueId);
  }
  return merged;
}

function normPropKey(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

/** True if a and b refer to the same property (numeric id, unique id, or loose string match). */
function propertyKeysMatch(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return false;
  const sa = String(a).trim();
  const sb = String(b).trim();
  if (!sa || !sb) return false;
  if (sa === sb) return true;
  if (normPropKey(sa) === normPropKey(sb)) return true;
  return sa.includes(sb) || sb.includes(sa);
}

/**
 * Optional guard: when the admin screen knows the selected property, drop dues that clearly belong to another property.
 * Does not hide dues when booking has no resolvable property (avoid false zeros).
 */
export function adminDueBelongsToSelectedProperty(
  b: Record<string, any>,
  selected: { propertyId?: string; propertyUniqueId?: string; propertyName?: string } | null | undefined
): boolean {
  if (!selected) return true;
  const wantId = selected.propertyId;
  const wantUid = selected.propertyUniqueId;
  const wantName = selected.propertyName;
  if (!wantId && !wantUid && !wantName) return true;

  const merged = bookingShapeForDueDerivation(b);
  const rawStay = { booking: merged };
  const prop = propertyForDue(rawStay);
  const candidates: string[] = [];
  if (prop?.id) candidates.push(prop.id);
  if (prop?.uniqueId) candidates.push(prop.uniqueId);
  if (merged.propertyId) candidates.push(String(merged.propertyId));
  if (merged.propertyUniqueId) candidates.push(String(merged.propertyUniqueId));
  const r = merged.room;
  if (r && typeof r === "object") {
    if (r.propertyId) candidates.push(String(r.propertyId));
    if (r.propertyUniqueId) candidates.push(String(r.propertyUniqueId));
    if (r.propertyName) candidates.push(String(r.propertyName));
  }

  const unique = [...new Set(candidates.map((x) => String(x).trim()).filter(Boolean))];
  if (unique.length === 0) return true;

  const checks: string[] = [];
  if (wantId) checks.push(wantId);
  if (wantUid) checks.push(wantUid);
  if (wantName) checks.push(wantName);

  const anyMatch = unique.some((c) => checks.some((w) => propertyKeysMatch(c, w)));
  return anyMatch;
}

/**
 * Build a minimal `raw` for deriveDueItems when booking has no property id on the booking object
 * but we can still anchor to room or booking (due math does not depend on property id — only tagging).
 */
function rawStayForAdminDue(merged: Record<string, any>): { booking: Record<string, any>; property?: { id: string } } {
  const base = { booking: merged };
  if (propertyForDue(base)) return base;
  const anchor =
    merged.room?.propertyId ??
    merged.room?.propertyUniqueId ??
    merged.propertyId ??
    merged.propertyUniqueId ??
    (merged.roomId != null ? `room:${merged.roomId}` : null) ??
    (merged.id != null ? `booking:${merged.id}` : null);
  if (anchor == null) return base;
  return { booking: merged, property: { id: String(anchor) } };
}

/**
 * Total due for a tenant booking row in the admin app: security deposit + unpaid rent (online/cash),
 * per property. Prefer `currentDue` from booking-service (same as customer Due Amount / effective-dues).
 */
export function adminDisplayDueAmount(
  b: Record<string, any> | null | undefined,
  selectedProperty?: { propertyId?: string; propertyUniqueId?: string; propertyName?: string } | null
): number {
  if (!b) return 0;
  if (selectedProperty && !adminDueBelongsToSelectedProperty(b, selectedProperty)) {
    return 0;
  }
  const raw = b.currentDue;
  if (raw != null && raw !== "") {
    const n = Number(raw);
    if (Number.isFinite(n)) return Math.max(0, n);
  }
  const merged = bookingShapeForDueDerivation(b);
  const rawStay = rawStayForAdminDue(merged);
  if (!propertyForDue(rawStay)) return 0;
  return deriveDueItemsForOneStay(rawStay, "").reduce((s, i) => s + (Number(i.amount) || 0), 0);
}

export default function DueAmount() {
  const navigation = useNavigation<any>();
  const { raw, loading, refresh } = useCurrentStay();
  const [payingId, setPayingId] = useState<string | null>(null);

  /** Redux `raw` is `{ currentStays: [...] }` from current-stay saga; legacy single-stay still supported in stayListFromRaw. */
  const dueItems = useMemo(() => {
    const items = deriveDueItemsFromRaw(raw);
    console.log('[DueAmount] Total due items:', items.length);
    return items;
  }, [raw]);
  
  const totalDue = useMemo(
    () => dueItems.reduce((sum, i) => sum + (Number(i.amount) || 0), 0),
    [dueItems]
  );

  const gradientColors: [string, string] = ["#646DFF", "#0815FF"];

  const handlePayNow = async (item: DueItem) => {
    if (item.paid || !item.propertyId) return;
    if (item.type === "rent_cash") return;

    setPayingId(item.id);
    try {
      const isDailyPayment = item.id.includes("daily_online_");
      let paymentId: string | undefined;
      let yearMonthValue: string | undefined;

      if (isDailyPayment) {
        paymentId = item.paymentId || item.id.replace(/^.*daily_online_/, "");
      } else {
        const rentMatch = item.id.match(/rent_online_(\d{4}-\d{2})/);
        yearMonthValue = rentMatch ? rentMatch[1] : undefined;
      }

      navigation.navigate("DepositCheckoutScreen", {
        type: item.type,
        amount: item.amount,
        propertyId: item.propertyId,
        ownerId: item.ownerId,
        monthLabel: item.monthLabel,
        yearMonth: yearMonthValue,
        paymentId,
        bookingId: item.bookingId,
        returnTo: "Home",
      });
    } finally {
      setPayingId(null);
    }
  };

  const formatAmount = (n: number | undefined) =>
    (n != null && !Number.isNaN(n) ? n : 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

  return (
    <View className="px-4 mt-6">
      <View className="flex-row justify-between items-end mb-4">
        <Text className="text-xl font-bold text-slate-800">Due Amount</Text>
        {dueItems.length > 0 && (
          <Text className="text-sm text-slate-600">
            Total: ₹{formatAmount(totalDue)}
          </Text>
        )}
      </View>

      <View className="rounded-[30px] overflow-hidden shadow-xl shadow-black/20">
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="pt-6 pb-2 px-2"
        >
          {loading ? (
            <View className="py-8 items-center">
              <ActivityIndicator size="small" color="#fff" />
              <Text className="text-white/80 mt-2 text-sm">Loading dues...</Text>
            </View>
          ) : dueItems.length === 0 ? (
            <View className="py-2 px-6 items-center justify-center">
              <Text className="text-white/80 text-center leading-5 text-[14px]">
                You have no pending dues.
              </Text>
              <TouchableOpacity
                onPress={() => refresh(true)}
                className="mt-6 px-6 py-2 bg-white/10 rounded-full border border-white/20"
              >
                <Text className="text-white font-semibold text-xs uppercase tracking-widest">
                  Refresh Status
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Table Header */}
              <View className="flex-row items-center bg-white/10 rounded-full py-3 mb-4 mx-2">
                <Text className="flex-[1.2] text-center text-white/80 font-bold text-[13px] uppercase tracking-wider">
                  Month
                </Text>
                <Text className="flex-[1] text-center text-white/80 font-bold text-[13px] uppercase tracking-wider">
                  Due
                </Text>
                <Text className="flex-[1] text-center text-white/80 font-bold text-[13px] uppercase tracking-wider">
                  Paid
                </Text>
                <Text className="flex-[1.5] text-center text-white/80 font-bold text-[13px] uppercase tracking-wider">
                  Action
                </Text>
              </View>

              {/* Due Items */}
              {dueItems.map((item, index) => (
                <View
                  key={`due-${index}-${item.id}`}
                  className={`flex-row items-center py-4 px-2 ${
                    index !== dueItems.length - 1 ? "border-b border-white/10" : ""
                  }`}
                >
                  <Text className="flex-[1.2] text-left pl-4 text-white font-bold text-[16px]">
                    {item.monthLabel}
                  </Text>
                  <Text className="flex-[1] text-center text-white font-medium text-[15px]">
                    ₹{formatAmount(item.amount)}
                  </Text>
                  <Text className="flex-[1] text-center text-white/70 font-medium text-[15px]">
                    {item.paid ? `₹{formatAmount(item.amount)}` : "—"}
                  </Text>

                  <View className="flex-[1.5] items-center">
                    {item.paid ? (
                      <View className="bg-green-400/30 rounded-full px-3 py-1 border border-green-300/50">
                        <Text className="text-green-100 font-bold text-[11px] uppercase">
                          Paid
                        </Text>
                      </View>
                    ) : item.type === "rent_cash" ? (
                      <Text className="text-white/90 text-[11px] font-medium text-center">
                        Pay via cash
                      </Text>
                    ) : payingId === item.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handlePayNow(item)}
                        className="bg-white rounded-xl px-4 py-2 shadow-sm"
                      >
                        <Text
                          style={{ color: gradientColors[1] }}
                          className="font-bold text-[12px] uppercase"
                        >
                          Pay Now
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}

              {/* Total Row */}
              {dueItems.length > 0 && (
                <View className="flex-row items-center py-4 px-2 mt-2 border-t-2 border-white/20">
                  <Text className="flex-[1.2] text-left pl-4 text-white font-bold text-[16px]">
                    Total due
                  </Text>
                  <Text className="flex-[1] text-center text-white font-bold text-[16px]">
                    ₹{formatAmount(totalDue)}
                  </Text>
                  <Text className="flex-[1] text-center text-white/70" />
                  <View className="flex-[1.5]" />
                </View>
              )}
            </>
          )}
        </LinearGradient>
      </View>
    </View>
  );
}