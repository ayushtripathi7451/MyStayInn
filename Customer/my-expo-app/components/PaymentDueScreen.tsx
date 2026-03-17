import React, { useMemo } from "react";
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

type DueItem = {
  id: string;
  label: string;
  monthLabel: string;
  amount: number;
  type: "security_deposit" | "rent_online" | "rent_cash";
};

function deriveDueItemsFromRaw(raw: any): DueItem[] {
  const items: DueItem[] = [];
  if (!raw?.booking || !raw?.property) return items;

  const moveInDate = raw.booking.moveInDate;
  const monthLabel = moveInDate
    ? new Date(moveInDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
    : "Due";

  const securityAmount = Number(raw.booking.securityDeposit) || 0;
  if (securityAmount > 0 && !toBool(raw.booking.isSecurityPaid)) {
    items.push({
      id: "security_deposit",
      label: "Security deposit",
      monthLabel,
      amount: securityAmount,
      type: "security_deposit",
    });
  }

  const onlineRecv = Number(raw.booking.onlinePaymentRecv) || 0;
  if (onlineRecv > 0 && !toBool(raw.booking.isRentOnlinePaid)) {
    items.push({
      id: "rent_online",
      label: "Rent (online)",
      monthLabel,
      amount: onlineRecv,
      type: "rent_online",
    });
  }

  const cashRecv = Number(raw.booking.cashPaymentRecv) || 0;
  if (cashRecv > 0 && !toBool(raw.booking.isRentCashPaid)) {
    items.push({
      id: "rent_cash",
      label: "Rent (cash)",
      monthLabel,
      amount: cashRecv,
      type: "rent_cash",
    });
  }

  return items;
}

export default function PaymentDueScreen({ navigation }: any) {
  const { raw, loading, refresh } = useCurrentStay();
  const { data: userData } = useUser();
  // Only the logged-in customer's payment history (use profile id, not booking)
  const loggedInCustomerId = userData?.id ?? undefined;
  const { paidItems: paymentHistory, loading: historyLoading, refresh: refreshHistory } = usePaymentHistory(loggedInCustomerId);

  useFocusEffect(
    React.useCallback(() => {
      refresh();
      refreshHistory();
    }, [refresh, refreshHistory])
  );

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
    });
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
        <Text className="text-lg font-semibold text-slate-800 mb-3">
          Due Amount
        </Text>
        {loading ? (
          <View className="py-6 items-center">
            <ActivityIndicator size="small" color="#64748b" />
          </View>
        ) : dueItems.length === 0 ? (
          <View className="bg-white rounded-2xl py-5 px-5 mb-4 border border-slate-200 shadow-sm">
            <Text className="text-slate-600 text-base">
              No pending dues.
            </Text>
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
