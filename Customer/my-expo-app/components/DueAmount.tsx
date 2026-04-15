import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../context/ThemeContext";
import { useCurrentStay } from "../src/hooks";

/** JSON/axios may serialize booleans as strings; Boolean("false") === true in JS. */
const toBool = (v: unknown) => v === true || v === "true" || v === 1;

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
  /** YYYY-MM-DD for day-rent ledger row (online checkout + webhook) */
  paymentDate?: string;
};

/** One property / stay: dues + pay links stay under that property only. */
export type DueGroup = {
  key: string;
  propertyName: string;
  propertyId?: string;
  /** Enrollment flow vs allocated active booking (rent due after move-in). */
  dueContext: "booking_requested" | "enrollment" | "active_booking";
  items: DueItem[];
  total: number;
};

function yearMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Property for Pay Now + tagging. Uses `raw.property`, then booking + room property ids
 * (multi-stay often only has room.propertyId).
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

/** Ensures deriveDueItems can run: synthetic `property.id` when only room/booking ids exist. */
function ensureStayForDueDerivation(stay: any): any {
  if (!stay?.booking) return stay;
  const mergedBooking = bookingShapeForDueDerivation(stay.booking);
  const next = { ...stay, booking: mergedBooking };
  if (propertyForDue(next)) return next;
  const b = mergedBooking;
  const anchor =
    b.room?.propertyId ??
    b.room?.propertyUniqueId ??
    b.propertyId ??
    b.propertyUniqueId ??
    (b.roomId != null ? `room:${b.roomId}` : null) ??
    (b.id != null ? `booking:${b.id}` : null);
  if (anchor == null) return next;
  return { ...next, property: { ...(next.property || {}), id: String(anchor) } };
}

export function stayListFromRaw(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw.currentStays) && raw.currentStays.length > 0) {
    return raw.currentStays.map((s: any) => ensureStayForDueDerivation(s));
  }
  if (raw.booking) return [ensureStayForDueDerivation(raw)];
  return [];
}

/** Any booking status that represents an enrollment / pre-allocation flow (case-insensitive). */
export function isEnrollmentBookingStatus(status: string): boolean {
  const s = String(status || "").toLowerCase().trim();
  return s.startsWith("enrollment");
}

export function dueContextForBookingStatus(status: string): DueGroup["dueContext"] {
  const s = String(status || "").toLowerCase().trim();
  if (s === "enrollment_requested") return "booking_requested";
  if (s.startsWith("enrollment")) return "enrollment";
  return "active_booking";
}

/** Dues grouped per property/stay — use for Home + Payments UI (no cross-property mixing). */
export function deriveDueItemsGrouped(raw: any): DueGroup[] {
  const stays = stayListFromRaw(raw);
  const groups: DueGroup[] = [];
  for (let idx = 0; idx < stays.length; idx++) {
    const stay = stays[idx];
    const b = stay?.booking;
    if (!b) continue;
    const statusStr = String(b.status || "");
    const propertyName = stay.property?.name || stay.room?.propertyName || "Property";
    const prop = propertyForDue(stay);
    const ctx = dueContextForBookingStatus(statusStr);

    if (ctx === "booking_requested") {
      groups.push({
        key: `${String(b.id ?? idx)}-${propertyName}-${idx}`,
        propertyName,
        propertyId: prop?.id,
        dueContext: "booking_requested",
        items: [],
        total: 0,
      });
      continue;
    }

    const items = deriveDueItemsForOneStay(stay, `${b.id ?? idx}_`);
    if (items.length === 0) continue;

    groups.push({
      key: `${String(b.id ?? idx)}-${propertyName}-${idx}`,
      propertyName,
      propertyId: prop?.id,
      dueContext: ctx === "enrollment" ? "enrollment" : "active_booking",
      items,
      total: items.reduce((s, i) => s + (Number(i.amount) || 0), 0),
    });
  }
  return groups;
}

export function deriveDueItemsFromRaw(raw: any): DueItem[] {
  return deriveDueItemsGrouped(raw).flatMap((g) => g.items);
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

  if (String(bookingStatus).toLowerCase().trim() === "enrollment_requested") {
    return [];
  }

  console.log(`[deriveDueItemsForOneStay] Processing stay:`, {
    bookingId,
    status: bookingStatus,
    rentPeriod,
    isDailyRent
  });

  const isEnrollmentStatus = isEnrollmentBookingStatus(bookingStatus);

  // Monthly enrollment only — day-rent enrollments are handled below with daily ledger / virtual rows.
  if (
    !isDailyRent &&
    isEnrollmentStatus
  ) {
    const securityAmount = Number(booking.securityDeposit) || 0;
    const isSecurityPaid = toBool(booking.isSecurityPaid);
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
    {
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
      const isRentCashPaid = toBool(booking.isRentCashPaid);
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

  // Handle daily rent (amounts must match booking-service dailyDue / customerDueDisplay fallbacks)
  if (isDailyRent) {
    if (isEnrollmentStatus) {
      const securityAmountEnr = Number(booking.securityDeposit) || 0;
      const isSecurityPaidEnr = toBool(booking.isSecurityPaid);
      if (securityAmountEnr > 0 && !isSecurityPaidEnr) {
        items.push({
          id: `${idPrefix}security_deposit`,
          label: "Security deposit",
          monthLabel: booking.moveInDate
            ? new Date(booking.moveInDate).toLocaleDateString("en-GB", {
                month: "short",
                year: "numeric",
              })
            : "—",
          amount: securityAmountEnr,
          paid: false,
          type: "security_deposit",
          propertyId: prop.id,
          ownerId: prop.ownerId ?? undefined,
          bookingId,
        });
      }
    }

    // Match booking-service defaultOnlinePerDay / defaultCashPerDay (do not use merged
    // onlinePaymentRecv/cashPaymentRecv — those are aggregate dues after effective-dues merge).
    const defaultOnlinePerDay = () => {
      const s = Number(booking.scheduledOnlineRent || 0);
      if (s > 0) return s;
      return Number(booking.rentAmount || 0);
    };
    const defaultCashPerDay = () => Number(booking.scheduledCashRent || 0);

    let paymentsToShow: any[] = [...(booking.dailyPayments || [])];
    // Synthetic enrollment rows have no DB ledger yet — show today’s split using scheduled amounts.
    if (paymentsToShow.length === 0 && isEnrollmentStatus) {
      const today = new Date();
      paymentsToShow = [
        {
          id: "virtual_enrollment_day",
          paymentDate: today,
          paidOnline: false,
          paidCash: false,
          onlineAmount: defaultOnlinePerDay(),
          cashAmount: defaultCashPerDay(),
        },
      ];
    }

    const sortedPayments = [...paymentsToShow]
      .map((p: any) => ({
        ...p,
        paymentDate: new Date(p.paymentDate || p.date)
      }))
      .sort((a: any, b: any) => b.paymentDate.getTime() - a.paymentDate.getTime());

    sortedPayments.forEach((p: any) => {
      const pdRaw = p.paymentDate instanceof Date && !Number.isNaN(p.paymentDate.getTime())
        ? p.paymentDate
        : new Date(p.paymentDate || p.date);
      const monthLabel = !Number.isNaN(pdRaw.getTime())
        ? pdRaw.toLocaleDateString("en-GB", {
            month: "short",
            year: "numeric",
            day: "numeric"
          })
        : "—";

      const rowOnline = Number(p.onlineAmount || 0);
      const rowCash = Number(p.cashAmount || 0);
      const effectiveOnline = rowOnline > 0 ? rowOnline : defaultOnlinePerDay();
      const effectiveCash = rowCash > 0 ? rowCash : defaultCashPerDay();
      const pid =
        p.id != null && String(p.id) !== "virtual_enrollment_day" ? String(p.id) : undefined;
      const pd =
        pdRaw instanceof Date && !Number.isNaN(pdRaw.getTime())
          ? `${pdRaw.getFullYear()}-${String(pdRaw.getMonth() + 1).padStart(2, "0")}-${String(pdRaw.getDate()).padStart(2, "0")}`
          : String(p.paymentDate || "").slice(0, 10);

      if (!p.paidOnline && effectiveOnline > 0) {
        items.push({
          id: `${idPrefix}daily_online_${pid ?? monthLabel}`,
          label: "Daily Rent (online)",
          monthLabel,
          amount: effectiveOnline,
          paid: false,
          type: "rent_online",
          propertyId: prop.id,
          ownerId: prop.ownerId ?? undefined,
          paymentId: pid,
          bookingId,
          paymentDate: /^\d{4}-\d{2}-\d{2}$/.test(pd) ? pd : undefined,
        });
      }

      if (!p.paidCash && effectiveCash > 0) {
        items.push({
          id: `${idPrefix}daily_cash_${pid ?? monthLabel}`,
          label: "Daily Rent (cash)",
          monthLabel,
          amount: effectiveCash,
          paid: false,
          type: "rent_cash",
          propertyId: prop.id,
          ownerId: prop.ownerId ?? undefined,
          paymentId: pid,
          bookingId,
          paymentDate: /^\d{4}-\d{2}-\d{2}$/.test(pd) ? pd : undefined,
        });
      }
    });

    // Ledger missing client-side but effective-dues merged aggregate (co/cc) > 0
    const hasDailyLine = items.some(
      (i) =>
        (i.id.includes("daily_online_") && !i.id.includes("daily_online_agg")) ||
        (i.id.includes("daily_cash_") && !i.id.includes("daily_cash_agg"))
    );
    if (!hasDailyLine && sortedPayments.length === 0) {
      const onlineDueAgg = Number(booking.onlinePaymentRecv || 0);
      const cashDueAgg = Number(booking.cashPaymentRecv || 0);
      const ym = yearMonth(new Date());
      if (onlineDueAgg > 0) {
        items.push({
          id: `${idPrefix}dailyrent_agg_online_${ym}`,
          label: "Daily Rent (online)",
          monthLabel: new Date().toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
          amount: onlineDueAgg,
          paid: false,
          type: "rent_online",
          propertyId: prop.id,
          ownerId: prop.ownerId ?? undefined,
          bookingId,
        });
      }
      if (cashDueAgg > 0) {
        items.push({
          id: `${idPrefix}dailyrent_agg_cash_${ym}`,
          label: "Daily Rent (cash)",
          monthLabel: new Date().toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
          amount: cashDueAgg,
          paid: false,
          type: "rent_cash",
          propertyId: prop.id,
          ownerId: prop.ownerId ?? undefined,
          bookingId,
        });
      }
    }

    if (isEnrollmentStatus) {
      return items;
    }
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
  const isSecurityPaid = toBool(booking.isSecurityPaid);
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
    const isRentCashPaid = toBool(booking.isRentCashPaid);
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

export default function DueAmount() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const { raw, loading, refresh } = useCurrentStay();
  const [payingId, setPayingId] = useState<string | null>(null);

  /** Per-property groups — payment links stay scoped to that property’s booking. */
  const dueGroups = useMemo(() => deriveDueItemsGrouped(raw), [raw]);

  /** Home: hide dues UI while waiting on admin — no payment rows yet. */
  const displayGroups = useMemo(
    () => dueGroups.filter((g) => g.dueContext !== "booking_requested"),
    [dueGroups]
  );

  const totalDue = useMemo(
    () => displayGroups.reduce((sum, g) => sum + g.total, 0),
    [displayGroups]
  );

  const hideDueAmountSection =
    !loading && dueGroups.length > 0 && displayGroups.length === 0;

  const isFemale = theme === "female";
  const gradientColors: [string, string] = isFemale ? ["#FF5CA8", "#FF1E7A"] : ["#646DFF", "#0815FF"];

  const handlePayNow = async (item: DueItem) => {
    if (item.paid || !item.propertyId) return;
    if (item.type === "rent_cash") return;
    if (!String(item.bookingId ?? "").trim()) {
      Alert.alert(
        "Cannot start payment",
        "Missing booking reference for this due. Pull to refresh on Home, then try again."
      );
      return;
    }

    setPayingId(item.id);
    try {
      let paymentId: string | undefined;
      let yearMonthValue: string | undefined;

      const todayYm = () => {
        const t = new Date();
        return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`;
      };
      if (item.id.includes("dailyrent_agg_online")) {
        paymentId = item.paymentId;
        yearMonthValue = todayYm();
      } else if (item.id.includes("rent_online_") && !item.id.includes("daily_online_")) {
        const rentMatch = item.id.match(/rent_online_(\d{4}-\d{2})/);
        yearMonthValue = rentMatch ? rentMatch[1] : undefined;
      } else if (item.id.includes("daily_online_")) {
        paymentId = item.paymentId || item.id.replace(/^.*daily_online_/, "");
        yearMonthValue = todayYm();
      }

      navigation.navigate("DepositCheckoutScreen", {
        type: item.type,
        amount: item.amount,
        propertyId: item.propertyId,
        ownerId: item.ownerId,
        monthLabel: item.monthLabel,
        yearMonth: yearMonthValue,
        paymentId,
        paymentDate: item.paymentDate,
        bookingId: item.bookingId,
        returnTo: "Home",
      });
    } finally {
      setPayingId(null);
    }
  };

  const formatAmount = (n: number | undefined) =>
    (n != null && !Number.isNaN(n) ? n : 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

  if (hideDueAmountSection) return null;

  return (
    <View className="px-4 mt-6">
      <View className="flex-row justify-between items-end mb-4">
        <Text className="text-xl font-bold text-slate-800">Due Amount</Text>
        {displayGroups.length > 0 && (
          <Text className="text-sm text-slate-600">
            Total: ₹{formatAmount(totalDue)}
          </Text>
        )}
      </View>

      {loading ? (
        <View className="rounded-[30px] overflow-hidden shadow-xl shadow-black/20">
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="py-8 px-2"
          >
            <View className="items-center">
              <ActivityIndicator size="small" color="#fff" />
              <Text className="text-white/80 mt-2 text-sm">Loading dues...</Text>
            </View>
          </LinearGradient>
        </View>
      ) : displayGroups.length === 0 ? (
        <View className="rounded-[30px] overflow-hidden shadow-xl shadow-black/20">
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="py-6 px-6"
          >
            <Text className="text-white/80 text-center leading-5 text-[14px]">
              You have no pending dues.
            </Text>
            <TouchableOpacity
              onPress={() => refresh(true)}
              className="mt-6 px-6 py-2 bg-white/10 rounded-full border border-white/20 self-center"
            >
              <Text className="text-white font-semibold text-xs uppercase tracking-widest">
                Refresh Status
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      ) : (
        <View className="gap-4">
          {displayGroups.map((group) => (
            <View
              key={group.key}
              className="rounded-[30px] overflow-hidden shadow-xl shadow-black/20"
            >
              <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="pt-5 pb-2 px-2"
              >
                <View className="px-3 pb-3 border-b border-white/15">
                  <Text className="text-white font-black text-[17px]" numberOfLines={2}>
                    {group.propertyName}
                  </Text>
                  <View className="flex-row items-center mt-2 gap-2 flex-wrap">
                    <View
                      className={`px-2.5 py-1 rounded-full ${
                        group.dueContext === "enrollment" || group.dueContext === "booking_requested"
                          ? "bg-amber-400/25"
                          : "bg-white/15"
                      }`}
                    >
                      <Text className="text-white text-[11px] font-bold uppercase tracking-wide">
                        {group.dueContext === "booking_requested"
                          ? "Booking requested"
                          : group.dueContext === "enrollment"
                            ? "Pending enrollment"
                            : "Rent & deposit"}
                      </Text>
                    </View>
                    <Text className="text-white/90 text-sm font-semibold">
                      Due: ₹{formatAmount(group.total)}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center bg-white/10 rounded-full py-3 mb-3 mt-3 mx-2">
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

                {group.items.map((item, index) => (
                  <View
                    key={`${group.key}-due-${item.id}-${index}`}
                    className={`flex-row items-center py-4 px-2 ${
                      index !== group.items.length - 1 ? "border-b border-white/10" : ""
                    }`}
                  >
                    <Text className="flex-[1.2] text-left pl-4 text-white font-bold text-[16px]">
                      {item.monthLabel}
                    </Text>
                    <Text className="flex-[1] text-center text-white font-medium text-[15px]">
                      ₹{formatAmount(item.amount)}
                    </Text>
                    <Text className="flex-[1] text-center text-white/70 font-medium text-[15px]">
                      {item.paid ? `₹${formatAmount(item.amount)}` : "—"}
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

                <View className="flex-row items-center py-3 px-2 mt-1 border-t border-white/20">
                  <Text className="flex-[1.2] text-left pl-4 text-white font-bold text-[15px]">
                    Subtotal
                  </Text>
                  <Text className="flex-[1] text-center text-white font-bold text-[15px]">
                    ₹{formatAmount(group.total)}
                  </Text>
                  <Text className="flex-[1]" />
                  <View className="flex-[1.5]" />
                </View>
              </LinearGradient>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}