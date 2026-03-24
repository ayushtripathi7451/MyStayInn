import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../context/ThemeContext";
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
};

// Helper function for year-month formatting
function yearMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Derives all unpaid dues: security deposit, rent (online), rent (cash).
 * Shows each unpaid month as a separate line item for monthly rent,
 * or daily unpaid amounts for daily rent */
function deriveDueItemsFromRaw(raw: any): DueItem[] {
  console.log('[deriveDueItemsFromRaw] Input raw:', raw);

  const items: DueItem[] = [];
  if (!raw?.booking || !raw?.property) {
    console.log('[deriveDueItemsFromRaw] Missing booking or property data');
    return items;
  }

  const booking = raw.booking;
  const rentPeriod = String(booking.rentPeriod || 'month').toLowerCase();
  const isDailyRent = rentPeriod === 'day';

  console.log('[deriveDueItemsFromRaw] Rent period:', rentPeriod, 'isDaily:', isDailyRent);

  if (isDailyRent) {
    // Handle daily rent periods
    console.log('[deriveDueItemsFromRaw] Processing daily rent');

    // Get daily payments from booking (should be included in API response)
    const dailyPayments = booking.dailyPayments || [];
    console.log('[deriveDueItemsFromRaw] Daily payments:', dailyPayments);

    // Sort payments by date (most recent first) and show ALL unpaid rows
    const sortedPayments = dailyPayments
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

      const rawAmount = Number(p.amount || 0);
      const cashAmount = Number(p.cashAmount || 0);
      const onlineAmount = Number(
        p.onlineAmount != null
          ? p.onlineAmount
          : rawAmount > 0
            ? Math.max(0, rawAmount - cashAmount)
            : (Number(booking.scheduledOnlineRent) || 0)
      );
      const pid = p.id != null ? String(p.id) : undefined;

      if (!p.paidOnline && onlineAmount > 0) {
        items.push({
          id: `daily_online_${pid ?? monthLabel}`,
          label: "Daily Rent (online)",
          monthLabel,
          amount: onlineAmount,
          paid: false,
          type: "rent_online",
          propertyId: raw.property.id,
          ownerId: raw.property.ownerId ?? undefined,
          paymentId: pid,
        });
      }

      if (!p.paidCash && cashAmount > 0) {
        items.push({
          id: `daily_cash_${pid ?? monthLabel}`,
          label: "Daily Rent (cash)",
          monthLabel,
          amount: cashAmount,
          paid: false,
          type: "rent_cash",
          propertyId: raw.property.id,
          ownerId: raw.property.ownerId ?? undefined,
          paymentId: pid,
        });
      }
    });

    // Fallback: if daily payments are not present or this day payment isn't found, derive from booking flags
    const isRentOnlinePaid = Boolean(booking.isRentOnlinePaid);
    const isRentCashPaid = Boolean(booking.isRentCashPaid);
    const onlineAmount = Number(booking.scheduledOnlineRent) || Number(booking.rentAmount) || 0;
    const cashAmount = Number(booking.scheduledCashRent) || 0;

    if (sortedPayments.length === 0 && !isRentOnlinePaid && onlineAmount > 0) {
      const today = new Date();
      const monthLabel = today.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      items.push({
        id: `daily_online_fallback_${booking.id}`,
        label: "Daily Rent (online)",
        monthLabel,
        amount: onlineAmount,
        paid: false,
        type: "rent_online",
        propertyId: raw.property.id,
        ownerId: raw.property.ownerId ?? undefined,
      });
    }

    if (sortedPayments.length === 0 && !isRentCashPaid && cashAmount > 0) {
      const today = new Date();
      const monthLabel = today.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      items.push({
        id: `daily_cash_fallback_${booking.id}`,
        label: "Daily Rent (cash)",
        monthLabel,
        amount: cashAmount,
        paid: false,
        type: "rent_cash",
        propertyId: raw.property.id,
        ownerId: raw.property.ownerId ?? undefined,
      });
    }

  } else {
    // Handle monthly rent periods (existing logic)
    console.log('[deriveDueItemsFromRaw] Processing monthly rent');

    const moveInDate = booking.moveInDate;
    const monthlyRent = Number(booking.scheduledOnlineRent) || Number(booking.rentAmount) || 0;
    const paidMonthsStr = booking.rentOnlinePaidYearMonth || '';

    // Parse comma-separated list of paid months into a Set for fast lookup
    const paidMonths = new Set(paidMonthsStr.split(',').map((m: string) => m.trim()).filter(Boolean));
    console.log('[deriveDueItemsFromRaw] Paid months:', Array.from(paidMonths));

    // Calculate first due month based on move-in date
    const moveIn = moveInDate ? new Date(moveInDate) : null;
    let firstDueYm = null;
    if (moveIn) {
      const moveInDay = moveIn.getDate();
      const moveInYm = yearMonth(moveIn);
      const nextMonthYm = yearMonth(new Date(moveIn.getFullYear(), moveIn.getMonth() + 1, 1));
      firstDueYm = moveInDay <= 10 ? moveInYm : nextMonthYm;
      console.log('[deriveDueItemsFromRaw] First due month:', firstDueYm);
    }

    // Generate items for each unpaid month
    if (firstDueYm && monthlyRent > 0) {
      const current = new Date();
      const currentYm = yearMonth(current);

      // Parse dates for comparison
      const [firstYear, firstMonth] = firstDueYm.split('-').map(Number);
      const [currentYear, currentMonth] = currentYm.split('-').map(Number);

      console.log('[deriveDueItemsFromRaw] Date ranges:', {
        firstDue: `${firstYear}-${firstMonth}`,
        paidMonths: Array.from(paidMonths),
        current: `${currentYear}-${currentMonth}`,
      });

      // Start from first due month
      let year = firstYear;
      let month = firstMonth;

      // Generate months until current month
      while (year < currentYear || (year === currentYear && month <= currentMonth)) {
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;

        // Skip if already paid
        if (paidMonths.has(monthKey)) {
          console.log(`[deriveDueItemsFromRaw] Skipping paid month: ${monthKey}`);
          month++;
          if (month > 12) {
            month = 1;
            year++;
          }
          continue;
        }

        const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
          month: "short",
          year: "numeric",
        });

        console.log(`[deriveDueItemsFromRaw] Adding unpaid month: ${monthKey}`);

        items.push({
          id: `rent_online_${monthKey}`,
          label: "Rent (online)",
          monthLabel,
          amount: monthlyRent,
          paid: false,
          type: "rent_online",
          propertyId: raw.property.id,
          ownerId: raw.property.ownerId ?? undefined,
        });

        // Move to next month
        month++;
        if (month > 12) {
          month = 1;
          year++;
        }
      }
    }
  }

  // Add security deposit if not paid (only once, same for both rent periods)
  const securityAmount = Number(booking.securityDeposit) || 0;
  const isSecurityPaid = Boolean(booking.isSecurityPaid);
  console.log('[deriveDueItemsFromRaw] security:', { securityAmount, isSecurityPaid });

  if (securityAmount > 0 && !isSecurityPaid) {
    items.push({
      id: "security_deposit",
      label: "Security deposit",
      monthLabel: new Date(booking.moveInDate).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      }),
      amount: securityAmount,
      paid: false,
      type: "security_deposit",
      propertyId: raw.property.id,
      ownerId: raw.property.ownerId ?? undefined,
    });
  }

  // Add cash rent if configured (only for monthly rent - daily cash is handled above)
  if (!isDailyRent) {
    const cashRecv = Number(booking.cashPaymentRecv) || 0;
    const isRentCashPaid = Boolean(booking.isRentCashPaid);
    console.log('[deriveDueItemsFromRaw] cash rent:', { cashRecv, isRentCashPaid });

    if (cashRecv > 0 && !isRentCashPaid) {
      items.push({
        id: "rent_cash",
        label: "Rent (cash)",
        monthLabel: new Date().toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
        amount: cashRecv,
        paid: false,
        type: "rent_cash",
        propertyId: raw.property.id,
        ownerId: raw.property.ownerId ?? undefined,
      });
    }
  }

  console.log('[deriveDueItemsFromRaw] Final items:', items);
  return items;
}

export default function DueAmount() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const { raw, loading, refresh } = useCurrentStay();
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    console.log('========== DUE AMOUNT DEBUG ==========');
    console.log('1. Raw data from useCurrentStay:', raw);
    console.log('2. Booking object:', raw?.booking);
    console.log('3. onlinePaymentRecv:', raw?.booking?.onlinePaymentRecv);
    console.log('4. isRentOnlinePaid:', raw?.booking?.isRentOnlinePaid);
    console.log('5. rentPeriod:', raw?.booking?.rentPeriod);
    console.log('6. moveInDate:', raw?.booking?.moveInDate);
    console.log('7. scheduledOnlineRent:', raw?.booking?.scheduledOnlineRent);
    console.log('8. rentOnlinePaidYearMonth:', raw?.booking?.rentOnlinePaidYearMonth);
    console.log('9. rentInfoMessage:', raw?.booking?.rentInfoMessage);
    console.log('======================================');
  }, [raw]);

  const dueItems = useMemo(() => deriveDueItemsFromRaw(raw), [raw]);
  const totalDue = useMemo(
    () => dueItems.reduce((sum, i) => sum + (Number(i.amount) || 0), 0),
    [dueItems]
  );

  const isFemale = theme === "female";
  const gradientColors: [string, string] = isFemale ? ["#FF5CA8", "#FF1E7A"] : ["#646DFF", "#0815FF"];

  const handlePayNow = async (item: DueItem) => {
    if (item.paid || !item.propertyId) return;
    if (item.type === "rent_cash") return;

    setPayingId(item.id);
    try {
      // Check if this is a daily payment
      const isDailyPayment = item.id.startsWith("daily_online_");
      let paymentId: string | undefined;
      let yearMonth: string | undefined;

      if (isDailyPayment) {
        // Extract payment ID from daily payment item (format: "daily_online_{paymentId}")
        paymentId = item.paymentId || item.id.replace("daily_online_", "");
        console.log('[DueAmount] Paying daily rent for payment ID:', paymentId);
      } else {
        // Extract monthKey from monthly payment item (format: "rent_online_2026-04")
        yearMonth = item.id.startsWith("rent_online_")
          ? item.id.replace("rent_online_", "")
          : undefined;
        console.log('[DueAmount] Paying monthly rent for month:', yearMonth);
      }

      console.log('[DueAmount] Navigation params:', {
        type: item.type,
        amount: item.amount,
        propertyId: item.propertyId,
        ownerId: item.ownerId,
        monthLabel: item.monthLabel,
        yearMonth,
        paymentId,
      });

      navigation.navigate("DepositCheckoutScreen", {
        type: item.type,
        amount: item.amount,
        propertyId: item.propertyId,
        ownerId: item.ownerId, // ✅ Pass ownerId
        monthLabel: item.monthLabel,
        yearMonth, // For monthly payments
        paymentId, // For daily payments
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
              {!!raw?.booking?.rentInfoMessage && (
                <Text className="text-white/90 text-center text-[13px] mt-3 leading-5 px-2">
                  {String(raw.booking.rentInfoMessage)}
                </Text>
              )}
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