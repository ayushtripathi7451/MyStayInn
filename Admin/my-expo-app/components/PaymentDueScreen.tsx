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
import { useCurrentStay, usePaymentHistory } from "../src/hooks";
import { useMeUserId } from "../src/hooks/useMeUserId";
import { deriveDueItemsFromRaw, stayListFromRaw, type DueItem } from "./DueAmount";

export default function PaymentDueScreen({ navigation }: any) {
  const { raw, loading, refresh } = useCurrentStay();
  const { userId: loggedInCustomerId } = useMeUserId();
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

    if (item.id.includes("rent_online_")) {
      const rentMatch = item.id.match(/rent_online_(\d{4}-\d{2})/);
      yearMonthValue = rentMatch ? rentMatch[1] : undefined;
    } else if (item.id.includes("daily_online_")) {
      const today = new Date();
      yearMonthValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    }

    console.log('[PaymentDue] Paying item:', item.id, 'yearMonthValue:', yearMonthValue);

    navigation.navigate("DepositCheckoutScreen", {
      type: item.type,
      amount: item.amount,
      propertyId: item.propertyId,
      ownerId: item.ownerId,
      bookingId: item.bookingId,
      monthLabel: item.monthLabel,
      yearMonth: yearMonthValue,
      paymentId: item.paymentId,
      returnTo: "PaymentDueScreen",
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
            {stayListFromRaw(raw)
              .map((s) => s?.booking?.rentInfoMessage)
              .filter(Boolean)
              .map((msg, idx) => (
                <Text key={idx} className="text-slate-500 text-sm mt-3 leading-5">
                  {String(msg)}
                </Text>
              ))}
            {/* <TouchableOpacity
              onPress={handleForceRefresh}
              className="mt-4 px-6 py-2 bg-yellow-500/20 rounded-full border border-yellow-500/30 self-start"
            >
              <Text className="text-yellow-600 font-semibold text-xs uppercase tracking-widest">
                Force Refresh
              </Text>
            </TouchableOpacity> */}
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