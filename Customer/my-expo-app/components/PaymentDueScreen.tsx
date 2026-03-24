import React, { useMemo, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "./BottomNav";
import { useCurrentStay, usePaymentHistory, useUser } from "../src/hooks";

const toBool = (v: any) => v === true || v === "true" || v === 1;

// Helper function for year-month formatting
function yearMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

type DueItem = {
  id: string;
  label: string;
  monthLabel: string;
  amount: number;
  type: "security_deposit" | "rent_online" | "rent_cash";
  paymentId?: string;
};

/** 
 * Derives all unpaid dues from the server response.
 * Shows each unpaid month as a separate line item
 */
function deriveDueItemsFromRaw(raw: any): DueItem[] {
  console.log('[PaymentDue] ========== deriveDueItemsFromRaw START ==========');
  const items: DueItem[] = [];
  if (!raw?.booking || !raw?.property) return items;

  const booking = raw.booking;
  const rentPeriod = String(booking.rentPeriod || 'month').toLowerCase();
  const isDailyRent = rentPeriod === 'day';

  const scheduledOnlineRent = Number(booking.scheduledOnlineRent) || 0;
  const scheduledCashRent = Number(booking.scheduledCashRent) || 0;

  console.log('[PaymentDue] rentPeriod:', rentPeriod);

  if (isDailyRent) {
    const dailyPayments = Array.isArray(booking.dailyPayments) ? booking.dailyPayments : [];
    const sortedPayments = dailyPayments
      .map((p: any) => ({
        ...p,
        paymentDateObj: new Date(p.paymentDate || p.date),
      }))
      .sort((a: any, b: any) => b.paymentDateObj.getTime() - a.paymentDateObj.getTime());

    sortedPayments.forEach((p: any) => {
      const monthLabel = p.paymentDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const rawAmount = Number(p.amount || 0);
      const cashAmount = Number(p.cashAmount || 0);
      const onlineAmount = Number(
        p.onlineAmount != null
          ? p.onlineAmount
          : rawAmount > 0
            ? Math.max(0, rawAmount - cashAmount)
            : scheduledOnlineRent
      );
      const pid = p.id != null ? String(p.id) : undefined;

      if (!toBool(p.paidOnline) && onlineAmount > 0) {
        items.push({
          id: `daily_online_${pid ?? monthLabel}`,
          label: 'Daily Rent (online)',
          monthLabel,
          amount: onlineAmount,
          type: 'rent_online',
          paymentId: pid,
        });
      }

      if (!toBool(p.paidCash) && cashAmount > 0) {
        items.push({
          id: `daily_cash_${pid ?? monthLabel}`,
          label: 'Daily Rent (cash)',
          monthLabel,
          amount: cashAmount,
          type: 'rent_cash',
          paymentId: pid,
        });
      }
    });

    // Fallback for setups where daily rows are not yet created.
    if (sortedPayments.length === 0) {
      const today = new Date();
      const monthLabel = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      if (scheduledOnlineRent > 0 && !toBool(booking.isRentOnlinePaid)) {
        items.push({
          id: `daily_online_fallback_${booking.id}`,
          label: 'Daily Rent (online)',
          monthLabel,
          amount: scheduledOnlineRent,
          type: 'rent_online',
        });
      }
      if (scheduledCashRent > 0 && !toBool(booking.isRentCashPaid)) {
        items.push({
          id: `daily_cash_fallback_${booking.id}`,
          label: 'Daily Rent (cash)',
          monthLabel,
          amount: scheduledCashRent,
          type: 'rent_cash',
        });
      }
    }

    // Security deposit if not paid
    const securityAmount = Number(booking.securityDeposit) || 0;
    if (securityAmount > 0 && !toBool(booking.isSecurityPaid)) {
      items.push({
        id: 'security_deposit',
        label: 'Security deposit',
        monthLabel: new Date(booking.moveInDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
        amount: securityAmount,
        type: 'security_deposit',
      });
    }

    return items;
  }

  const monthlyRent = Number(booking.scheduledOnlineRent) || Number(booking.rentAmount) || 0;
  
  // ✅ Parse paid months from comma-separated string into a Set
  const paidMonthsStr = booking.rentOnlinePaidYearMonth || '';
  const paidMonths = new Set(paidMonthsStr.split(',').map((m: string) => m.trim()).filter(Boolean));
  
  console.log('[PaymentDue] Paid months:', Array.from(paidMonths));
  console.log('[PaymentDue] Monthly rent:', monthlyRent);

  // Calculate first due month based on move-in date
  const moveInDate = booking.moveInDate ? new Date(booking.moveInDate) : null;
  let firstDueYm = null;
  if (moveInDate) {
    const moveInDay = moveInDate.getDate();
    const moveInYm = yearMonth(moveInDate);
    const nextMonthYm = yearMonth(new Date(moveInDate.getFullYear(), moveInDate.getMonth() + 1, 1));
    firstDueYm = moveInDay <= 10 ? moveInYm : nextMonthYm;
    console.log('[PaymentDue] First due month:', firstDueYm);
  }

  // ✅ Generate items for each unpaid month
  if (firstDueYm && monthlyRent > 0) {
    const current = new Date();
    const currentYm = yearMonth(current);

    // Parse dates
    const [firstYear, firstMonth] = firstDueYm.split('-').map(Number);
    const [currentYear, currentMonth] = currentYm.split('-').map(Number);

    console.log('[PaymentDue] Date ranges:', {
      firstDue: `${firstYear}-${firstMonth}`,
      current: `${currentYear}-${currentMonth}`,
      paidMonths: Array.from(paidMonths),
    });

    // Start from first due month
    let year = firstYear;
    let month = firstMonth;

    // ✅ Loop from first due month to current month
    while (year < currentYear || (year === currentYear && month <= currentMonth)) {
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;

      // ✅ Skip if already paid
      if (paidMonths.has(monthKey)) {
        console.log(`[PaymentDue] Skipping paid month: ${monthKey}`);
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

      console.log(`[PaymentDue] ✅ Adding unpaid month: ${monthKey} -> ${monthLabel}`);

      items.push({
        id: `rent_online_${monthKey}`,
        label: "Rent (online)",
        monthLabel,
        amount: monthlyRent,
        type: "rent_online",
      });

      // Move to next month
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }
  }

  // Add security deposit if not paid (only once)
  const securityAmount = Number(booking.securityDeposit) || 0;
  if (securityAmount > 0 && !toBool(booking.isSecurityPaid)) {
    items.push({
      id: "security_deposit",
      label: "Security deposit",
      monthLabel: new Date(booking.moveInDate).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      }),
      amount: securityAmount,
      type: "security_deposit",
    });
    console.log('[PaymentDue] ✅ Adding security deposit:', securityAmount);
  }

  // Add cash rent if configured (simplified - assumes single amount)
  const cashRecv = Number(booking.cashPaymentRecv) || 0;
  if (cashRecv > 0 && !toBool(booking.isRentCashPaid)) {
    items.push({
      id: "rent_cash",
      label: "Rent (cash)",
      monthLabel: new Date().toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
      amount: cashRecv,
      type: "rent_cash",
    });
    console.log('[PaymentDue] ✅ Adding cash rent:', cashRecv);
  }

  console.log('[PaymentDue] Final items count:', items.length);
  return items;
}

export default function PaymentDueScreen({ navigation }: any) {
  const { raw, loading, refresh } = useCurrentStay();
  const { data: userData } = useUser();
  const loggedInCustomerId = userData?.id ?? undefined;
  const { paidItems: paymentHistory, loading: historyLoading, refresh: refreshHistory } = usePaymentHistory(loggedInCustomerId);

  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshHistory();
    }, [refresh, refreshHistory])
  );

  const getLocalYMD = () => {
    const d0 = new Date();
    const yyyy = d0.getFullYear();
    const mm = String(d0.getMonth() + 1).padStart(2, '0');
    const dd = String(d0.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const lastLocalDayRef = useRef<string>(getLocalYMD());
  useEffect(() => {
    const t = setInterval(() => {
      const today = getLocalYMD();
      if (today !== lastLocalDayRef.current) {
        console.log('[PaymentDue] Date changed from', lastLocalDayRef.current, 'to', today);
        lastLocalDayRef.current = today;
        refresh(true);
        refreshHistory();
      }
    }, 5000);
    return () => clearInterval(t);
  }, [refresh, refreshHistory]);

  const dueItems = useMemo(() => deriveDueItemsFromRaw(raw), [raw]);
  const totalDue = useMemo(
    () => dueItems.reduce((sum, i) => sum + (Number(i.amount) || 0), 0),
    [dueItems]
  );

  const formatAmount = (n: number) =>
    (n != null && !Number.isNaN(n) ? n : 0).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    });

  const handlePayNow = (item: DueItem) => {
    if (item.type === "rent_cash") return;

    let yearMonthValue: string | undefined;

    if (item.id.startsWith("rent_online_")) {
      yearMonthValue = item.id.replace("rent_online_", "");
    } else if (item.id.startsWith("daily_online_")) {
      // Keep monthly marker for backwards compatibility; concrete daily row uses paymentId.
      const today = new Date();
      yearMonthValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    }

    console.log('[PaymentDue] Paying item:', item.id, 'yearMonthValue:', yearMonthValue);

    navigation.navigate("DepositCheckoutScreen", {
      type: item.type,
      amount: item.amount,
      monthLabel: item.monthLabel,
      yearMonth: yearMonthValue,
      paymentId: item.paymentId,
      returnTo: "PaymentDue"
    });
  };

  const handleForceRefresh = () => {
    console.log('[PaymentDue] Force refresh triggered');
    refresh(true);
    refreshHistory();
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <View className="flex-row items-center px-6 py-4">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 bg-white rounded-full border border-gray-300 justify-center items-center"
          >
            <Ionicons name="chevron-back" size={22} color="#000" />
          </TouchableOpacity>
          <Text className="ml-4 text-2xl font-semibold">Payments</Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#64748b" />
          <Text className="text-gray-500 mt-3">Loading your payments...</Text>
        </View>
        <BottomNav />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-row items-center px-6 py-4">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 bg-white rounded-full border border-gray-300 justify-center items-center"
        >
          <Ionicons name="chevron-back" size={22} color="#000" />
        </TouchableOpacity>
        <Text className="ml-4 text-2xl font-semibold">Payments</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        className="px-4"
      >
        {/* Due Amount Section */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-lg font-semibold text-slate-800">Due Amount</Text>
          {dueItems.length > 0 && (
            <Text className="text-base text-slate-600">Total: ₹{formatAmount(totalDue)}</Text>
          )}
        </View>

        {dueItems.length === 0 ? (
          <View className="bg-white rounded-2xl py-5 px-5 mb-4 border border-slate-200 shadow-sm">
            <Text className="text-slate-600 text-base">No pending dues.</Text>
            {!!raw?.booking?.rentInfoMessage && (
              <Text className="text-slate-500 text-sm mt-3 leading-5">
                {String(raw.booking.rentInfoMessage)}
              </Text>
            )}
            <TouchableOpacity
              onPress={handleForceRefresh}
              className="mt-4 px-6 py-2 bg-yellow-500/20 rounded-full border border-yellow-500/30 self-start"
            >
              <Text className="text-yellow-600 font-semibold text-xs uppercase tracking-widest">
                Force Refresh
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {dueItems.map((item, index) => (
              <View
                key={`due-${index}-${item.id}`}
                className="bg-[#FFECEC] border-2 border-[#FFB3B3] rounded-2xl py-4 px-5 mb-3 flex-row justify-between items-center shadow-sm"
              >
                <View className="flex-1">
                  <Text className="text-red-800 font-semibold text-base">{item.label}</Text>
                  <Text className="text-red-600/90 text-sm mt-1">{item.monthLabel}</Text>
                </View>
                <View className="flex-row items-center gap-3">
                  <Text className="text-red-700 font-bold text-lg">₹{formatAmount(item.amount)}</Text>
                  {item.type === "rent_cash" ? (
                    <Text className="text-red-600/90 text-sm font-medium">Pay via cash</Text>
                  ) : (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handlePayNow(item)}
                      className="bg-red-600 px-4 py-2.5 rounded-xl"
                    >
                      <Text className="text-white text-sm font-semibold">Pay Now</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
            <View className="bg-slate-200/70 rounded-2xl py-4 px-5 mt-3 flex-row justify-between items-center border border-slate-300">
              <Text className="text-slate-700 font-semibold text-base">Total due</Text>
              <Text className="text-slate-900 font-bold text-lg">₹{formatAmount(totalDue)}</Text>
            </View>
          </>
        )}

        {/* Payment History Section */}
        <Text className="text-lg font-semibold text-slate-800 mt-6 mb-3">Payment History</Text>
        {historyLoading ? (
          <View className="py-6 items-center">
            <ActivityIndicator size="small" color="#64748b" />
          </View>
        ) : paymentHistory.length === 0 ? (
          <View className="bg-white rounded-2xl py-5 px-5 mb-4 border border-slate-200 shadow-sm">
            <Text className="text-slate-500 text-base">No payments yet.</Text>
          </View>
        ) : (
          paymentHistory.map((item) => (
            <View
              key={item.id}
              className="bg-white rounded-2xl py-4 px-5 mb-3 border border-slate-200 flex-row justify-between items-center shadow-sm"
            >
              <View className="flex-1">
                <Text className="text-slate-800 font-semibold text-base">{item.label}</Text>
                <Text className="text-slate-500 text-sm mt-1">{item.dateLabel}</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Text className="text-slate-800 font-bold text-lg">₹{formatAmount(item.amount)}</Text>
                <View className="bg-green-100 px-3 py-1.5 rounded-full border border-green-200">
                  <Text className="text-green-700 text-sm font-semibold">Paid</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}