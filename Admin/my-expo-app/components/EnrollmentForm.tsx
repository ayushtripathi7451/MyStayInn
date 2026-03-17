// components/EnrollmentForm.tsx
import React from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";

export default function EnrollmentForm({ onNext }: any) {
  return (
    <View>
      <Text className="text-[14px] text-gray-600 mb-3">
        Verify details received from enrollment request.
      </Text>

      {/* ✅ NAME ROW */}
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text className="text-[14px] mb-1 text-gray-700">First name</Text>
          <TextInput
            placeholder="John"
            placeholderTextColor="#9CA3AF"
            style={{ color: "#000" }}   // ✅ HARD FIX
            className="h-[48px] bg-white rounded-xl px-4 border border-gray-200 mb-3"
          />
        </View>

        <View className="flex-1">
          <Text className="text-[14px] mb-1 text-gray-700">Last name</Text>
          <TextInput
            placeholder="Doe"
            placeholderTextColor="#9CA3AF"
            style={{ color: "#000" }}   // ✅ HARD FIX
            className="h-[48px] bg-white rounded-xl px-4 border border-gray-200 mb-3"
          />
        </View>
      </View>

      {/* ✅ PHONE + EMAIL */}
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text className="text-[14px] mb-1 text-gray-700">Phone</Text>
          <TextInput
            placeholder="9876543210"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            style={{ color: "#000" }}   // ✅ HARD FIX
            className="h-[48px] bg-white rounded-xl px-4 border border-gray-200 mb-3"
          />
        </View>

        <View className="flex-1">
          <Text className="text-[14px] mb-1 text-gray-700">Email</Text>
          <TextInput
            placeholder="john@example.com"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            style={{ color: "#000" }}   // ✅ HARD FIX
            className="h-[48px] bg-white rounded-xl px-4 border border-gray-200 mb-3"
          />
        </View>
      </View>

      {/* ✅ IMAGE URL */}
      <Text className="text-[14px] mb-1 text-gray-700">
        Customer Image URL
      </Text>
      <TextInput
        placeholder="https://..."
        placeholderTextColor="#9CA3AF"
        style={{ color: "#000" }}   // ✅ HARD FIX
        className="h-[48px] bg-white rounded-xl px-4 border border-gray-200 mb-4"
      />

      {/* ✅ BUTTONS */}
      <View className="flex-row justify-between items-center mt-8 mb-10 px-2">
        <TouchableOpacity className="px-6 py-3 bg-white border border-gray-300 rounded-xl">
          <Text className="text-gray-700 text-[16px]">‹ Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onNext}
          className="px-6 py-3 bg-[#3B4BFF] rounded-xl"
        >
          <Text className="text-white text-[16px] font-semibold">
            Next ›
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 30 }} />
    </View>
  );
}
