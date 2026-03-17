import React from "react";
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../context/ThemeContext";

const data = [
  { month: "March", amount: "₹5,000", date: "10 Mar", mode: "UPI" },
  { month: "March", amount: "₹5,000", date: "10 Mar", mode: "UPI" },
];

export default function PaymentHistory() {
  const { theme } = useTheme();

  // 🎨 IMPROVED GRADIENT (MORE CONTRAST)
  const gradientColors =
    theme === "female"
      ? ["#EC4899", "#BE185D"]
      : ["#4A5AFF", "#1E3AFF"];

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="w-11/12 self-center rounded-[28px] p-5 mb-10"
      style={{
        borderRadius: 28,
        paddingVertical: 20,
        paddingHorizontal: 20,
      }}
    >
      {/* TITLE */}
      <Text className="text-white text-xl font-bold mb-4">
        Payment History
      </Text>

      {/* GLASS CONTAINER */}
      <View className="bg-white/20 rounded-2xl p-5">

        {/* TABLE HEADER */}
        <View className="flex-row justify-between mb-3 border-b border-white/30 pb-2">
          <Text className="text-white/90 text-[15px] font-semibold flex-1">
            Month
          </Text>
          <Text className="text-white/90 text-[15px] font-semibold flex-1 text-center">
            Amount
          </Text>
          <Text className="text-white/90 text-[15px] font-semibold flex-1 text-center">
            Date
          </Text>
          <Text className="text-white/90 text-[15px] font-semibold flex-1 text-right">
            Mode
          </Text>
        </View>

        {/* TABLE ROWS */}
        {data.map((item, idx) => (
          <View
            key={idx}
            className="flex-row justify-between py-3"
          >
            <Text className="text-white text-[14px] flex-1" numberOfLines={1}>
              {item.month}
            </Text>

            <Text className="text-white text-[14px] flex-1 text-center" numberOfLines={1}>
              {item.amount}
            </Text>

            <Text className="text-white text-[14px] flex-1 text-center" numberOfLines={1}>
              {item.date}
            </Text>

            <Text className="text-white text-[14px] flex-1 text-right" numberOfLines={1}>
              {item.mode}
            </Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}
