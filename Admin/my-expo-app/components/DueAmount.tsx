import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function DueAmount() {
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

          {/* Data Row */}
          <View className="flex-row items-center mb-5">
            <Text className="flex-[1.1] text-center text-white font-semibold text-[16px]">
              April
            </Text>
            <Text className="flex-[0.9] text-center text-white font-semibold text-[16px]">
              ₹5,000
            </Text>
            <Text className="flex-[0.9] text-center text-white font-semibold text-[16px]">
              ₹0
            </Text>

            <View className="flex-[1.3] items-center">
              <TouchableOpacity className="border border-white rounded-lg px-4 py-[5px]">
                <Text className="text-white font-semibold text-[13px]">
                  Pay Now
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}
