import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch, // Use Switch for the toggle
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScrollableDatePicker from "./ScrollableDatePicker";
import { Ionicons } from "@expo/vector-icons";

export default function AllocationScreen({ onBack }: any) {
  const [markPaid, setMarkPaid] = useState(false);

  const [dates, setDates] = useState({
    checkin: new Date(),
    checkout: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  });

  const formatDisplayDate = (date: Date) => {
    // Correct format: DD/MM/YYYY
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <SafeAreaView className="flex-1 ">
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="px-4 -mt-14"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <Text className="text-[15px] text-gray-600 mb-4">
          Verify details received from enrollment request.
        </Text>

        {/* Advance + Payment Mode */}
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="text-gray-700 mb-1">Advance Amount</Text>
            <TextInput
              placeholder="0"
              placeholderTextColor="#9CA3AF" // Explicit Placeholder Color
              keyboardType="numeric"
              className="h-[48px] bg-white border border-gray-300 rounded-xl px-4 text-black" // Explicit Text Color
            />
          </View>

          <View className="flex-1">
            <Text className="text-gray-700 mb-1">Payment Mode</Text>
            <TextInput
              placeholder="Online"
              placeholderTextColor="#9CA3AF" // Explicit Placeholder Color
              className="h-[48px] bg-white border border-gray-300 rounded-xl px-4 text-black" // Explicit Text Color
            />
          </View>
        </View>

        {/* Check-in / Check-out */}
        <View className="flex-row gap-3 mt-3">
          <View className="flex-1">
            <Text className="text-gray-700 mb-1">Check-in Date</Text>
            <ScrollableDatePicker
              selectedDate={dates.checkin}
              onDateChange={(date) => setDates({ ...dates, checkin: date })}
              mode="date"
              placeholder="Select check-in date"
              containerStyle="h-[48px]"
            />
          </View>

          <View className="flex-1">
            <Text className="text-gray-700 mb-1">Check-out Date</Text>
            <ScrollableDatePicker
              selectedDate={dates.checkout}
              onDateChange={(date) => setDates({ ...dates, checkout: date })}
              mode="date"
              placeholder="Select check-out date"
              minimumDate={dates.checkin}
              containerStyle="h-[48px]"
            />
          </View>
        </View>

        {/* Room Type + Allocate Room */}
        <View className="flex-row gap-3 mt-3">
          <View className="flex-1">
            <Text className="text-gray-700 mb-1">Room Type</Text>
            <TextInput
              placeholder="Single"
              placeholderTextColor="#9CA3AF" // Explicit Placeholder Color
              className="h-[48px] bg-white border border-gray-300 rounded-xl px-4 text-black" // Explicit Text Color
            />
          </View>

          <View className="flex-1">
            <Text className="text-gray-700 mb-1">Allocate Room/Bed</Text>
            <TextInput
              placeholder="101 (single)"
              placeholderTextColor="#9CA3AF" // Explicit Placeholder Color
              className="h-[48px] bg-white border border-gray-300 rounded-xl px-4 text-black" // Explicit Text Color
            />
          </View>
        </View>

        {/* Billing Cycle + Price */}
        <View className="flex-row gap-3 mt-3">
          <View className="flex-1">
            <Text className="text-gray-700 mb-1">Billing Cycle</Text>
            <TextInput
              placeholder="Monthly"
              placeholderTextColor="#9CA3AF" // Explicit Placeholder Color
              className="h-[48px] bg-white border border-gray-300 rounded-xl px-4 text-black" // Explicit Text Color
            />
          </View>

          <View className="flex-1">
            <Text className="text-gray-700 mb-1">Price (monthly)</Text>
            <TextInput
              placeholder="120000"
              placeholderTextColor="#9CA3AF" // Explicit Placeholder Color
              keyboardType="numeric"
              className="h-[48px] bg-white border border-gray-300 rounded-xl px-4 text-black" // Explicit Text Color
            />
          </View>
        </View>

        {/* Mark Due as Paid - FIXED SWITCH LOGIC */}
        <View className="bg-white rounded-2xl px-4 py-4 mt-8 flex-row items-center justify-between border border-gray-200">
          <View className="flex-1 mr-3">
            <Text className="text-[16px] font-medium text-gray-800">
              Mark due as paid
            </Text>
            <Text className="text-[12px] text-gray-500 mt-1">
              Optional: mark any remaining due as paid with a date.
            </Text>
          </View>
          <Switch
            onValueChange={setMarkPaid}
            value={markPaid}
            trackColor={{ false: "#E5E7EB", true: "#3B4BFF" }}
            thumbColor={markPaid ? "#FFFFFF" : "#F3F4F6"}
            ios_backgroundColor="#E5E7EB"
          />
        </View>

        {/* Removed duplicate descriptive text */}

        {/* Buttons */}
        <View className="flex-row justify-between mt-10 mb-6">
          <TouchableOpacity
            onPress={onBack}
            className="px-6 py-3 bg-white border border-gray-300 rounded-xl"
          >
            <Text className="text-gray-700 text-[16px]">‹ Back</Text>
          </TouchableOpacity>

          <TouchableOpacity className="px-6 py-3 bg-[#3B4BFF] rounded-xl">
            <Text className="text-white text-[16px] font-semibold">
              Allocate ›
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}