import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function SearchCustomerForm() {
  return (
    <View className="px-6">

      {/* ✅ UNIQUE ID */}
      <Text className="text-[14px] text-gray-600 mb-1 mt-6">
        Unique ID or Phone
      </Text>

      <TextInput
        placeholder="MS25A123456 or 9876543210"
        placeholderTextColor="#9CA3AF"
        style={{ color: "#000000" }}
        className="h-[48px] bg-white rounded-xl px-4 border border-gray-200"
      />

      <Text className="text-[12px] text-gray-400 mt-1 mb-4">
        Search by Unique ID (MYSyyXnnnnnn) or phone
      </Text>

      {/* ✅ SEARCH BUTTON */}
      <TouchableOpacity className="bg-[#2F3CFF] rounded-xl h-[45px] justify-center items-center mb-6">
        <Text className="text-white font-semibold text-[16px]">Search</Text>
      </TouchableOpacity>

      {/* ✅ FIRST NAME */}
      <Text className="text-[14px] text-gray-700 mb-1">First name</Text>
      <TextInput
        placeholder="John"
        placeholderTextColor="#A0A0A0"
        style={{ color: "#000000" }}
        className="h-[48px] bg-white rounded-xl px-4 border border-gray-200 mb-4"
      />

      {/* ✅ LAST NAME */}
      <Text className="text-[14px] text-gray-700 mb-1">Last name</Text>
      <TextInput
        placeholder="Doe"
        placeholderTextColor="#A0A0A0"
        style={{ color: "#000000" }}
        className="h-[48px] bg-white rounded-xl px-4 border border-gray-200 mb-4"
      />

      {/* ✅ PHONE */}
      <Text className="text-[14px] text-gray-700 mb-1">Phone</Text>
      <TextInput
        placeholder="9876543210"
        placeholderTextColor="#A0A0A0"
        keyboardType="number-pad"
        style={{ color: "#000000" }}
        className="h-[48px] bg-white rounded-xl px-4 border border-gray-200 mb-4"
      />

      {/* ✅ EMAIL */}
      <Text className="text-[14px] text-gray-700 mb-1">Email</Text>
      <TextInput
        placeholder="john@example.com"
        placeholderTextColor="#A0A0A0"
        keyboardType="email-address"
        style={{ color: "#000000" }}
        className="h-[48px] bg-white rounded-xl px-4 border border-gray-200 mb-4"
      />

      {/* ✅ IMAGE URL */}
      <Text className="text-[14px] mb-1 text-gray-700">
        Customer Image URL
      </Text>
      <TextInput
        placeholder="https://..."
        placeholderTextColor="#A0A0A0"
        style={{ color: "#000000" }}
        className="h-[48px] bg-white rounded-xl px-4 border border-gray-200 mb-4"
      />

      {/* ✅ IMAGE PREVIEW */}
      <Text className="text-[14px] mb-1 text-gray-700">
        Verify customer&apos;s image
      </Text>
      <View className="bg-white rounded-xl h-[120px] border border-gray-200 mb-6 justify-center items-center">
        <Text className="text-gray-400">Image preview</Text>
      </View>

      {/* ✅ ADVANCE */}
      <Text className="text-[14px] mb-1 text-gray-700">
        Advance Amount
      </Text>
      <TextInput
        placeholder="0"
        placeholderTextColor="#A0A0A0"
        keyboardType="number-pad"
        style={{ color: "#000000" }}
        className="h-[48px] bg-white rounded-xl px-4 border border-gray-200 mb-4"
      />

      {/* ✅ PAYMENT MODE */}
      <Text className="text-[14px] mb-1 text-gray-700">
        Payment Mode
      </Text>
      <TextInput
        placeholder="Online"
        placeholderTextColor="#A0A0A0"
        style={{ color: "#000000" }}
        className="h-[48px] bg-white rounded-xl px-4 border border-gray-200 mb-4"
      />

      {/* ✅ CHECK-IN */}
      <Text className="text-[14px] mb-1 text-gray-700">
        Check-in Date
      </Text>
      <TextInput
        placeholder="07/12/2025"
        placeholderTextColor="#A0A0A0"
        style={{ color: "#000000" }}
        className="h-[48px] bg-white rounded-xl px-4 border border-gray-200 mb-4"
      />

      {/* ✅ CHECK-OUT */}
      <Text className="text-[14px] mb-1 text-gray-700">
        Check-out Date
      </Text>
      <TextInput
        placeholder="03/02/2026"
        placeholderTextColor="#A0A0A0"
        style={{ color: "#000000" }}
        className="h-[48px] bg-white rounded-xl px-4 border border-gray-200 mb-4"
      />

      {/* ✅ ROOM TYPE */}
      <Text className="text-[14px] mb-1 text-gray-700">Room Type</Text>
      <TextInput
        placeholder="Single"
        placeholderTextColor="#A0A0A0"
        style={{ color: "#000000" }}
        className="h-[48px] bg-white rounded-xl px-4 border border-gray-200 mb-4"
      />

      {/* ✅ ROOM ALLOCATION */}
      <Text className="text-[14px] mb-1 text-gray-700">
        Allocate Room/Bed
      </Text>
      <TextInput
        placeholder="101 (single)"
        placeholderTextColor="#A0A0A0"
        style={{ color: "#000000" }}
        className="h-[48px] bg-white rounded-xl px-4 border border-gray-200 mb-4"
      />

      {/* ✅ BILLING */}
      <Text className="text-[14px] mb-1 text-gray-700">
        Billing Cycle
      </Text>
      <TextInput
        placeholder="Monthly"
        placeholderTextColor="#A0A0A0"
        style={{ color: "#000000" }}
        className="h-[48px] bg-white rounded-xl px-4 border border-gray-200 mb-4"
      />

      {/* ✅ PRICE */}
      <Text className="text-[14px] mb-1 text-gray-700">
        Price (monthly)
      </Text>
      <TextInput
        placeholder="12000"
        placeholderTextColor="#A0A0A0"
        keyboardType="number-pad"
        style={{ color: "#000000" }}
        className="h-[48px] bg-white rounded-xl px-4 border border-gray-200 mb-8"
      />

      {/* ✅ MARK DUE PAID */}
      <View className="bg-white rounded-2xl px-4 py-4 flex-row items-start border border-gray-200 mb-8">
        <TouchableOpacity className="mr-3 mt-1">
          <Ionicons name="square-outline" size={22} color="#555" />
        </TouchableOpacity>

        <View className="flex-1">
          <Text className="text-[16px] font-medium text-gray-800">
            Mark due as paid
          </Text>
          <Text className="text-[12px] text-gray-500 mt-1">
            Optional: mark any remaining due as paid with a date.
          </Text>
        </View>
      </View>

      {/* ✅ BUTTONS */}
      <View className="flex-row justify-between items-center mb-16 px-2">
        <TouchableOpacity className="px-6 py-3 bg-white border border-gray-300 rounded-xl">
          <Text className="text-gray-700 text-[16px]">‹ Back</Text>
        </TouchableOpacity>

        <TouchableOpacity className="px-6 py-3 bg-[#3B4BFF] rounded-xl">
          <Text className="text-white text-[16px] font-semibold">
            Next ›
          </Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}
