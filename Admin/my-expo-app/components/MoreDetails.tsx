import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function MoreDetails() {
  return (
    <View className=" mb-6 px-4">
      <Text className="text-4xl font-medium mb-3 text-black">
        More Details
      </Text>

      {/* Advance Paid Card */}
      <View className="bg-white rounded-3xl px-5 py-4 mb-4 shadow-sm border border-gray-100">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-gray-500 text-xl">Advance Paid</Text>
            <Text className="text-gray-500 text-[17.5px]  mt-1">
              ₹5,000
            </Text>
          </View>

          <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center">
            <Ionicons name="checkmark" size={24} color="#0A8A2A" />
          </View>
        </View>
      </View>

      {/* Admitted Date Card */}
      <View className="bg-white rounded-3xl px-5 py-4 mb-4 shadow-sm border border-gray-100">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-gray-500 text-xl">Admitted Date</Text>
            <Text className="text-gray-500 text-[17.5px]  mt-1">
              10 March 2025
            </Text>
          </View>

          <Ionicons name="calendar-outline" size={30} color="#8A8A8A" />
        </View>
      </View>

      {/* Discharge Date Card */}
      <View className="bg-white rounded-3xl px-5 py-4 shadow-sm border border-gray-100">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-gray-500 text-xl">Discharge Date</Text>
            <Text className="text-gray-500 text-[17.5px]  mt-1">
              10 March 2025
            </Text>
          </View>

          <Ionicons name="calendar-outline" size={30} color="#8A8A8A" />
        </View>
      </View>

    </View>
  );
}
