import React from "react";
import { View, Text } from "react-native";

export default function EnrollmentOverview() {
  return (
    <View className="bg-white rounded-3xl p-5 mx-4 mt-4 shadow shadow-black/5">

      {/* Heading */}
      <Text className="text-[18px] font-semibold text-black mb-4">
        Enrollment Status Overview
      </Text>

      {/* Row */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-[15px] text-gray-700">Pending Requests</Text>
        <Text className="text-[15px] font-semibold text-gray-800">421</Text>
      </View>

      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-[15px] text-gray-700">Accepted</Text>
        <Text className="text-[15px] font-semibold text-gray-800">1089</Text>
      </View>

      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-[15px] text-gray-700">Rejected</Text>
        <Text className="text-[15px] font-semibold text-gray-800">124</Text>
      </View>

      <View className="flex-row justify-between items-center">
        <Text className="text-[15px] text-gray-700">Completed</Text>
        <Text className="text-[15px] font-semibold text-gray-800">178</Text>
      </View>

    </View>
  );
}
