import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext"; // ✅ THEME

export default function SearchResultDetailsScreen({ navigation }: any) {
  const { theme } = useTheme(); // ✅ get theme

  // ✅ THEME COLORS
  const bgMain = theme === "female" ? "bg-white" : "bg-white";
  const searchBg = theme === "female" ? "bg-[#FFE4F2]" : "bg-[#F7F7F9]";
  const profileBg = theme === "female" ? "bg-[#FFD6EA]" : "bg-[#EEF2FF]";
  const primaryText = theme === "female" ? "text-black" : "text-black";
  const pendingBtnBg = theme === "female" ? "bg-[#FFD6EA]" : "bg-[#E6EBFF]";
  const pendingTextColor =
    theme === "female" ? "text-pink-600" : "text-[#4A5AFF]";

  return (
    <SafeAreaView className={`flex-1 ${bgMain}`}>
      {/* ✅ HEADER */}
      <View className="flex-row items-center px-6 mt-2">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full border border-gray-300 justify-center items-center bg-white"
        >
          <Ionicons name="chevron-back" size={22} />
        </TouchableOpacity>

        <Text className={`ml-4 text-[22px] font-bold ${primaryText}`}>
          Search
        </Text>
      </View>

      <ScrollView className="px-6 mt-4" showsVerticalScrollIndicator={false}>
        {/* ✅ SEARCH BAR */}
        <View
          className={`flex-row items-center h-[50px] rounded-[16px] px-4 border border-gray-200 ${searchBg}`}
        >
          <Ionicons name="search" size={20} color="#777" />
          <Text className="ml-2 text-gray-500 text-[15px]">
            MYS25A000001
          </Text>
        </View>

        {/* ✅ PROFILE CARD */}
        <View
          className={`mt-5 p-4 rounded-2xl flex-row items-center ${profileBg}`}
        >
          <Image
            source={{ uri: "https://i.pravatar.cc/100" }}
            className="w-14 h-14 rounded-full"
          />

          <View className="ml-4">
            <Text className="text-[18px] font-semibold text-black">
              Prateek Sharma
            </Text>
            <Text className="text-gray-600 text-[13px]">
              MYS25A000001
            </Text>
          </View>
        </View>

        {/* ✅ DETAILS SECTION */}
        <View className="mt-5">
          <Text className="text-gray-500 text-[14px]">Advance paid</Text>
          <Text className="text-[16px] font-semibold mb-4">₹5,000</Text>

          <Text className="text-gray-500 text-[14px]">Checkin date</Text>
          <Text className="text-[16px] font-semibold mb-4">
            22 Apr, 2025
          </Text>

          <Text className="text-gray-500 text-[14px]">Checkout date</Text>
          <Text className="text-[16px] font-semibold mb-4">
            22 Sep, 2025
          </Text>
        </View>

        {/* ✅ PENDING REQUEST BUTTON */}
        <TouchableOpacity
          className={`${pendingBtnBg} py-3 rounded-xl mt-4 items-center`}
        >
          <Text className={`font-semibold ${pendingTextColor}`}>
            Pending request
          </Text>
        </TouchableOpacity>

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
