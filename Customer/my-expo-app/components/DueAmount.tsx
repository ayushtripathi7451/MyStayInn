import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
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
};

/** Derives all unpaid dues: security deposit, rent (online), rent (cash). Any payment left to be completed is a due; when paid it is removed from this list and from current due. */
function deriveDueItemsFromRaw(raw: any): DueItem[] {
  const items: DueItem[] = [];
  if (!raw?.booking || !raw?.property) return items;

  const moveInDate = raw.booking.moveInDate;
  const monthLabel =
    moveInDate ?
      new Date(moveInDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
    : "Due";

  const securityAmount = Number(raw.booking.securityDeposit) || 0;
  const isSecurityPaid = Boolean(raw.booking.isSecurityPaid);
  if (securityAmount > 0 && !isSecurityPaid) {
    items.push({
      id: "security_deposit",
      label: "Security deposit",
      monthLabel,
      amount: securityAmount,
      paid: false,
      type: "security_deposit",
      propertyId: raw.property.id,
      ownerId: raw.property.ownerId ?? undefined,
    });
  }

  const onlineRecv = Number(raw.booking.onlinePaymentRecv) || 0;
  const isRentOnlinePaid = Boolean(raw.booking.isRentOnlinePaid);
  if (onlineRecv > 0 && !isRentOnlinePaid) {
    items.push({
      id: "rent_online",
      label: "Rent (online)",
      monthLabel,
      amount: onlineRecv,
      paid: false,
      type: "rent_online",
      propertyId: raw.property.id,
      ownerId: raw.property.ownerId ?? undefined,
    });
  }

  const cashRecv = Number(raw.booking.cashPaymentRecv) || 0;
  const isRentCashPaid = Boolean(raw.booking.isRentCashPaid);
  if (cashRecv > 0 && !isRentCashPaid) {
    items.push({
      id: "rent_cash",
      label: "Rent (cash)",
      monthLabel,
      amount: cashRecv,
      paid: false,
      type: "rent_cash",
      propertyId: raw.property.id,
      ownerId: raw.property.ownerId ?? undefined,
    });
  }

  return items;
}

export default function DueAmount() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const { raw, loading, refresh } = useCurrentStay();
  const [payingId, setPayingId] = useState<string | null>(null);
  const dueItems = useMemo(() => deriveDueItemsFromRaw(raw), [raw]);
  const totalDue = useMemo(() => dueItems.reduce((sum, i) => sum + (Number(i.amount) || 0), 0), [dueItems]);

  const isFemale = theme === "female";
  const gradientColors = isFemale ? ["#FF5CA8", "#FF1E7A"] : ["#646DFF", "#0815FF"];

  const handlePayNow = (item: DueItem) => {
    if (item.paid || !item.propertyId) return;
    if (item.type === "rent_cash") return;
    navigation.navigate("DepositCheckoutScreen", {
      type: item.type,
      amount: item.amount,
    });
  };

  const formatAmount = (n: number | undefined) =>
    (n != null && !Number.isNaN(n) ? n : 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

  return (
    <View className="px-4 mt-6">
      <View className="flex-row justify-between items-end mb-4">
        <Text className="text-xl font-bold text-slate-800">Due Amount</Text>
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
                onPress={refresh}
                className="mt-6 px-6 py-2 bg-white/10 rounded-full border border-white/20"
              >
                <Text className="text-white font-semibold text-xs uppercase tracking-widest">
                  Refresh Status
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
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
                        Pay ₹{formatAmount(item.amount)} via cash
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
              {dueItems.length > 0 ? (
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
              ) : null}
            </>
          )}
        </LinearGradient>
      </View>
    </View>
  );
}
