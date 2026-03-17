import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function StatsCards() {
  return (
    <View className="w-[200px] p-4 items-center">

      {/* Monthly Due */}
      <View className="bg-[#EEF0FF] rounded-2xl p-4 mb-4 ">
        <Text className="text-[15px] text-gray-700">Monthly Due</Text>

        <View className="flex-row items-center mt-2">
          <Text className="text-[26px] font-bold text-[#0A1A3F]">$6527</Text>

          <Text className="text-green-600 ml-2 text-[13px]">+11.01%</Text>
          <Ionicons name="trending-up" size={14} color="green" style={{ marginLeft: 2 }} />
        </View>
      </View>

      {/* Active Admins */}
      <View className="bg-[#EEF0FF] rounded-2xl p-4">
        <Text className="text-[15px] text-gray-700">Active Admins</Text>

        <View className="flex-row items-center mt-2">
          <Text className="text-[26px] font-bold text-[#0A1A3F]">7,265</Text>

          <Text className="text-green-600 ml-2 text-[13px]">+11.01%</Text>
          <Ionicons name="trending-up" size={14} color="green" style={{ marginLeft: 2 }} />
        </View>
      </View>

    </View>
  );
}
