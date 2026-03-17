import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ProfileHeader from "./SetupHeader";
import BottomNav from "./BottomNav";

export default function VerifyScreen({ navigation }: any) {
  const roomData = [
    { floor: "Ground", room: "001", type: "Single", amount: "₹ 0.00" },
    { floor: "Ground", room: "002", type: "Single", amount: "₹ 0.00" },
    { floor: "Ground", room: "003", type: "Single", amount: "₹ 0.00" },
    { floor: "Ground", room: "004", type: "Single", amount: "₹ 0.00" },
    { floor: "First", room: "001", type: "Single", amount: "₹ 0.00" },
    { floor: "First", room: "002", type: "Single", amount: "₹ 0.00" },
    { floor: "First", room: "003", type: "Single", amount: "₹ 0.00" },
    { floor: "First", room: "004", type: "Single", amount: "₹ 0.00" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white">

      {/* Header Tabs */}
      <ProfileHeader activeTab="Verify" />

      {/* MAIN CONTENT */}
      <ScrollView
        className="px-6 mt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 180 }}
      >
        <Text className="text-[20px] font-semibold">Step 5 - Verify Floor/Room</Text>

        {/* TABLE CARD */}
        <View className="mt-5 bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">

          {/* TABLE HEADER */}
          <View className="flex-row justify-between pb-2 border-b border-gray-300">
            <Text className="w-[25%] font-semibold text-gray-700">Floor</Text>
            <Text className="w-[20%] font-semibold text-gray-700">Room #</Text>
            <Text className="w-[25%] font-semibold text-gray-700">Type</Text>
            <Text className="w-[25%] font-semibold text-gray-700">Amount</Text>
          </View>

          {/* ROWS */}
          {roomData.map((item, index) => (
            <View
              key={index}
              className="flex-row justify-between py-3 border-b border-gray-100"
            >
              <Text className="w-[25%] text-gray-700">{item.floor}</Text>
              <Text className="w-[20%] text-gray-700">{item.room}</Text>
              <Text className="w-[25%] text-gray-700">{item.type}</Text>
              <Text className="w-[25%] text-gray-700">{item.amount}</Text>
            </View>
          ))}
        </View>

        {/* BUTTONS */}
        <View className="flex-row justify-between mt-6 px-1">
          <TouchableOpacity className="px-6 py-3 rounded-lg bg-gray-100">
            <Text className="text-gray-600 font-medium">Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("RulesScreen")}
            className="px-6 py-3 rounded-lg bg-[#2F3CFF]"
          >
            <Text className="text-white font-semibold">Confirm ›</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}
