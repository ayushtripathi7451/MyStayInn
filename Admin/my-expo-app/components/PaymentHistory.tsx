import React from "react";
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const data = [
  { month: "March", amount: "₹5,000", date: "10 Mar", mode: "UPI" },
  { month: "March", amount: "₹5,000", date: "10 Mar", mode: "UPI" },
];

export default function PaymentHistory() {
  return (
    <LinearGradient
      colors={["#A9B8FF", "#6D7BFF"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 28,
        paddingVertical: 20,
        paddingHorizontal: 20,
        marginBottom: 40,
      }} className="w-11/12 self-center"
    >
      <Text className="text-white text-3xl font-semibold mb-5">
        Payment History
      </Text>

      {/* Table Header */}
      <View className="flex-row justify-between px-1 mb-4">
        <Text className="text-white text-xl w-[25%]">Month</Text>
        <Text className="text-white text-xl w-[28%]">Amount Paid</Text>
        <Text className="text-white text-xl w-[20%]">Date</Text>
        <Text className="text-white text-xl w-[15%]">Mode</Text>
      </View>

      {/* Table Rows */}
      {data.map((item, idx) => (
        <View
          key={idx}
          className="flex-row justify-between px-1 mb-3"
        >
          <Text className="text-white text-xl w-[25%]">{item.month}</Text>
          <Text className="text-white text-xl w-[28%]">{item.amount}</Text>
          <Text className="text-white text-xl w-[20%]">{item.date}</Text>
          <Text className="text-white text-xl w-[15%]">{item.mode}</Text>
        </View>
      ))}
    </LinearGradient>
  );
}
