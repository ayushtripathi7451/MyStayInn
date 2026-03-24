import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useCurrentStay } from "../src/hooks";

const toBool = (v: any) => v === true || v === "true" || v === 1;

// Helper function for year-month formatting
function yearMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

type DueItem = {
  id: string;
  monthLabel: string;
  dueAmount: number;
  paidAmount: number;
  yearMonth: string;
};

function getDueItemsFromBooking(raw: any): DueItem[] {
  const items: DueItem[] = [];
  if (!raw?.booking) return items;

  const booking = raw.booking;
  const monthlyRent = Number(booking.scheduledOnlineRent) || Number(booking.rentAmount) || 0;
  
  // Parse paid months from comma-separated string
  const paidMonthsStr = booking.rentOnlinePaidYearMonth || '';
  const paidMonths = new Set(paidMonthsStr.split(',').map((m: string) => m.trim()).filter(Boolean));
  
  // Calculate first due month based on move-in date
  const moveInDate = booking.moveInDate ? new Date(booking.moveInDate) : null;
  let firstDueYm = null;
  if (moveInDate) {
    const moveInDay = moveInDate.getDate();
    const moveInYm = yearMonth(moveInDate);
    const nextMonthYm = yearMonth(new Date(moveInDate.getFullYear(), moveInDate.getMonth() + 1, 1));
    firstDueYm = moveInDay <= 10 ? moveInYm : nextMonthYm;
  }
  
  if (!firstDueYm || monthlyRent <= 0) return items;
  
  const current = new Date();
  const currentYm = yearMonth(current);
  
  // Parse dates
  const [firstYear, firstMonth] = firstDueYm.split('-').map(Number);
  const [currentYear, currentMonth] = currentYm.split('-').map(Number);
  
  // Start from first due month
  let year = firstYear;
  let month = firstMonth;
  
  // Generate months until current month
  while (year < currentYear || (year === currentYear && month <= currentMonth)) {
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric",
    });
    
    const isPaid = paidMonths.has(monthKey);
    
    items.push({
      id: monthKey,
      monthLabel,
      dueAmount: isPaid ? 0 : monthlyRent,
      paidAmount: isPaid ? monthlyRent : 0,
      yearMonth: monthKey,
    });
    
    // Move to next month
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }
  
  return items;
}

export default function DueAmount({ navigation }: any) {
  const { raw, loading, refresh } = useCurrentStay();
  
  const dueItems = useMemo(() => getDueItemsFromBooking(raw), [raw]);
  
  const handlePayNow = (yearMonth: string, amount: number) => {
    const monthLabel = new Date(
      parseInt(yearMonth.split('-')[0]), 
      parseInt(yearMonth.split('-')[1]) - 1, 
      1
    ).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
    
    navigation.navigate("DepositCheckoutScreen", {
      type: "rent_online",
      amount: amount,
      monthLabel: monthLabel,
      yearMonth: yearMonth,
      returnTo: "Home",
    });
  };
  
  if (loading) {
    return (
      <View className="px-4 -mt-5">
        <Text className="text-4xl font-medium text-black mb-3">
          Due Amount Details
        </Text>
        <View className="rounded-[25px] overflow-hidden shadow-md bg-gray-100 p-8 items-center">
          <ActivityIndicator size="small" color="#646DFF" />
          <Text className="text-gray-500 mt-2">Loading dues...</Text>
        </View>
      </View>
    );
  }
  
  if (dueItems.length === 0) {
    return (
      <View className="px-4 -mt-5">
        <Text className="text-4xl font-medium text-black mb-3">
          Due Amount Details
        </Text>
        <View className="rounded-[25px] overflow-hidden shadow-md">
          <LinearGradient
            colors={["#646DFF", "#0815FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="p-6"
          >
            <Text className="text-white text-center text-base">
              No pending dues 🎉
            </Text>
            {!!raw?.booking?.rentInfoMessage && (
              <Text className="text-white/80 text-center text-sm mt-2">
                {String(raw.booking.rentInfoMessage)}
              </Text>
            )}
          </LinearGradient>
        </View>
      </View>
    );
  }
  
  return (
    <View className="px-4 -mt-5">
      {/* Section Title */}
      <Text className="text-4xl font-medium text-black mb-3">
        Due Amount Details
      </Text>

      {/* Rounded Gradient Card */}
      <View className="rounded-[25px] overflow-hidden shadow-md">
        <LinearGradient
          colors={["#646DFF", "#0815FF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="p-4"
        >
          {/* Header Row */}
          <View className="flex-row items-center border-b border-white/30 pb-3 mb-3 mt-5">
            <Text className="flex-[1.1] text-center text-white font-semibold text-[16px] opacity-90">
              Month
            </Text>
            <Text className="flex-[0.9] text-center text-white font-semibold text-[16px] opacity-90">
              Due
            </Text>
            <Text className="flex-[0.9] text-center text-white font-semibold text-[16px] opacity-90">
              Paid
            </Text>
            <Text className="flex-[1.3] text-center text-white font-semibold text-[16px] opacity-90">
              Payment Link
            </Text>
          </View>

          {/* Data Rows */}
          {dueItems.map((item) => (
            <View key={item.id} className="flex-row items-center mb-5">
              <Text className="flex-[1.1] text-center text-white font-semibold text-[16px]">
                {item.monthLabel}
              </Text>
              <Text className="flex-[0.9] text-center text-white font-semibold text-[16px]">
                ₹{item.dueAmount.toLocaleString()}
              </Text>
              <Text className="flex-[0.9] text-center text-white font-semibold text-[16px]">
                ₹{item.paidAmount.toLocaleString()}
              </Text>
              <View className="flex-[1.3] items-center">
                {item.dueAmount > 0 ? (
                  <TouchableOpacity
                    onPress={() => handlePayNow(item.yearMonth, item.dueAmount)}
                    className="border border-white rounded-lg px-4 py-[5px]"
                  >
                    <Text className="text-white font-semibold text-[13px]">
                      Pay Now
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View className="border border-white/30 rounded-lg px-4 py-[5px]">
                    <Text className="text-white/70 font-semibold text-[13px]">
                      Paid
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </LinearGradient>
      </View>
    </View>
  );
}