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
};

/** Derives all unpaid dues: security deposit, rent (online), rent (cash). 
 * Shows each unpaid month as a separate line item */
function deriveDueItemsFromRaw(raw: any): DueItem[] {
  console.log('[PaymentDue] deriveDueItemsFromRaw Input:', raw);
  
  const items: DueItem[] = [];
  if (!raw?.booking || !raw?.property) return items;

  const moveInDate = raw.booking.moveInDate;
  const monthlyRent = Number(raw.booking.scheduledOnlineRent) || Number(raw.booking.rentAmount) || 0;
  const lastPaidYm = raw.booking.rentOnlinePaidYearMonth;
  
  // Calculate first due month based on move-in date
  const moveIn = moveInDate ? new Date(moveInDate) : null;
  let firstDueYm = null;
  if (moveIn) {
    const moveInDay = moveIn.getDate();
    const moveInYm = yearMonth(moveIn);
    const nextMonthYm = yearMonth(new Date(moveIn.getFullYear(), moveIn.getMonth() + 1, 1));
    firstDueYm = moveInDay <= 10 ? moveInYm : nextMonthYm;
    console.log('[PaymentDue] First due month:', firstDueYm);
  }

  // Generate items for each unpaid month
  if (firstDueYm && monthlyRent > 0) {
    const current = new Date();
    const currentYm = yearMonth(current);
    
    // Parse dates for comparison
    const [firstYear, firstMonth] = firstDueYm.split('-').map(Number);
    const [lastPaidYear, lastPaidMonth] = lastPaidYm ? lastPaidYm.split('-').map(Number) : [firstYear, firstMonth - 1];
    const [currentYear, currentMonth] = currentYm.split('-').map(Number);
    
    console.log('[PaymentDue] Date ranges:', {
      firstDue: `${firstYear}-${firstMonth}`,
      lastPaid: lastPaidYm || 'none',
      current: `${currentYear}-${currentMonth}`
    });
    
    // Start from the month after last paid, or first due if nothing paid
    let year = firstYear;
    let month = firstMonth;
    
    // If we have a last paid month, start from the next month
    if (lastPaidYm) {
      if (year < lastPaidYear || (year === lastPaidYear && month <= lastPaidMonth)) {
        year = lastPaidYear;
        month = lastPaidMonth + 1;
        if (month > 12) {
          month = 1;
          year++;
        }
      }
    }
    
    // Generate months until current month
    while (year < currentYear || (year === currentYear && month <= currentMonth)) {
      const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-GB", { 
        month: "short", 
        year: "numeric" 
      });
      
      console.log(`[PaymentDue] Adding unpaid month: ${year}-${month}`);
      
      items.push({
        id: `rent_online_${year}-${month}`,
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
  const securityAmount = Number(raw.booking.securityDeposit) || 0;
  if (securityAmount > 0 && !toBool(raw.booking.isSecurityPaid)) {
    items.push({
      id: "security_deposit",
      label: "Security deposit",
      monthLabel: new Date(raw.booking.moveInDate).toLocaleDateString("en-GB", { 
        month: "short", 
        year: "numeric" 
      }),
      amount: securityAmount,
      type: "security_deposit",
    });
  }

  // Add cash rent if configured (simplified - assumes single amount)
  const cashRecv = Number(raw.booking.cashPaymentRecv) || 0;
  if (cashRecv > 0 && !toBool(raw.booking.isRentCashPaid)) {
    items.push({
      id: "rent_cash",
      label: "Rent (cash)",
      monthLabel: new Date().toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
      amount: cashRecv,
      type: "rent_cash",
    });
  }

  console.log('[PaymentDue] Final items:', items);
  return items;
}

export default function PaymentDueScreen({ navigation }: any) {
  const { raw, loading, refresh } = useCurrentStay();
  const { data: userData } = useUser();
  // Only the logged-in customer's payment history (use profile id, not booking)
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

  // If user changes device date while staying on this screen, refresh dues immediately.
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
    }, 5000); // Check every 5 seconds for better responsiveness
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
    navigation.navigate("DepositCheckoutScreen", {
      type: item.type,
      amount: item.amount,
      // For rent payments, include which month is being paid
      ...(item.type === "rent_online" && { 
        monthLabel: item.monthLabel,
        returnTo: "PaymentDue"
      }),
    });
  };

  const handleForceRefresh = () => {
    console.log('[PaymentDue] Force refresh triggered');
    refresh(true);
    refreshHistory();
  };

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
        {/* Due Amount – above payment history */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-lg font-semibold text-slate-800">
            Due Amount
          </Text>
          {dueItems.length > 0 && (
            <Text className="text-base text-slate-600">
              Total: ₹{formatAmount(totalDue)}
            </Text>
          )}
        </View>

        {loading ? (
          <View className="py-6 items-center">
            <ActivityIndicator size="small" color="#64748b" />
          </View>
        ) : dueItems.length === 0 ? (
          <View className="bg-white rounded-2xl py-5 px-5 mb-4 border border-slate-200 shadow-sm">
            <Text className="text-slate-600 text-base">
              No pending dues.
            </Text>
            {!!raw?.booking?.rentInfoMessage && (
              <Text className="text-slate-500 text-sm mt-3 leading-5">
                {String(raw.booking.rentInfoMessage)}
              </Text>
            )}
            {/* Force Refresh Button */}
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
                  <Text className="text-red-800 font-semibold text-base">
                    {item.label}
                  </Text>
                  <Text className="text-red-600/90 text-sm mt-1">
                    {item.monthLabel}
                  </Text>
                </View>
                <View className="flex-row items-center gap-3">
                  <Text className="text-red-700 font-bold text-lg">
                    ₹{formatAmount(item.amount)}
                  </Text>
                  {item.type === "rent_cash" ? (
                    <Text className="text-red-600/90 text-sm font-medium">Pay via cash</Text>
                  ) : (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handlePayNow(item)}
                      className="bg-red-600 px-4 py-2.5 rounded-xl"
                    >
                      <Text className="text-white text-sm font-semibold">
                        Pay Now
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
            <View className="bg-slate-200/70 rounded-2xl py-4 px-5 mt-3 flex-row justify-between items-center border border-slate-300">
              <Text className="text-slate-700 font-semibold text-base">
                Total due
              </Text>
              <Text className="text-slate-900 font-bold text-lg">
                ₹{formatAmount(totalDue)}
              </Text>
            </View>

          
          </>
        )}

        {/* Payment History – recent first, logged-in customer only */}
        <Text className="text-lg font-semibold text-slate-800 mt-6 mb-3">
          Payment History
        </Text>
        {loading || historyLoading ? (
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
                <Text className="text-slate-800 font-semibold text-base">
                  {item.label}
                </Text>
                <Text className="text-slate-500 text-sm mt-1">
                  {item.dateLabel}
                </Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Text className="text-slate-800 font-bold text-lg">
                  ₹{formatAmount(item.amount)}
                </Text>
                <View className="bg-green-100 px-3 py-1.5 rounded-full border border-green-200">
                  <Text className="text-green-700 text-sm font-semibold">
                    Paid
                  </Text>
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