import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "./BottomNav";

export default function PaymentDueScreen({ navigation }: any) {
  return (
    <SafeAreaView className="flex-1 bg-slate-50">

      {/* HEADER */}
      <View className="flex-row items-center px-6 py-4">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 bg-white rounded-full border border-gray-300 justify-center items-center"
        >
          <Ionicons name="chevron-back" size={22} color="#000" />
        </TouchableOpacity>

        <Text className="ml-4 text-2xl font-semibold">
          Payments
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        className="px-4"
      >

        {/* 🔴 PENDING DUE CARD */}
        <View className="bg-[#FFECEC] border border-[#FFB3B3] rounded-3xl p-6 mb-6">
          <Text className="text-red-600 text-lg font-semibold">
            Pending Due Amount
          </Text>

          <Text className="text-4xl font-bold text-red-700 mt-3">
            ₹ 12,500
          </Text>

          <Text className="text-gray-600 mt-2">
            Due for September 2024
          </Text>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              // later attach payment link
            }}
            className="mt-6 bg-red-600 py-4 rounded-full"
          >
            <Text className="text-white text-center text-lg font-semibold">
              Pay Now
            </Text>
          </TouchableOpacity>
        </View>

        {/* 🟢 PAYMENT HISTORY */}
        <Text className="text-xl font-semibold mb-4">
          Payment History
        </Text>

        {/* HISTORY ITEM */}
        <PaymentHistoryCard
          month="August 2024"
          amount="₹ 12,500"
          date="28 Aug 2024"
          status="Paid"
        />

        <PaymentHistoryCard
          month="July 2024"
          amount="₹ 12,500"
          date="29 Jul 2024"
          status="Paid"
        />

        <PaymentHistoryCard
          month="June 2024"
          amount="₹ 12,500"
          date="30 Jun 2024"
          status="Paid"
        />

      </ScrollView>

      {/* BOTTOM NAV */}
      <BottomNav />
    </SafeAreaView>
  );
}

/* =========================
   PAYMENT HISTORY CARD
========================= */
function PaymentHistoryCard({
  month,
  amount,
  date,
  status,
}: {
  month: string;
  amount: string;
  date: string;
  status: string;
}) {
  return (
    <View className="bg-white rounded-2xl p-5 mb-4 shadow shadow-black/10">
      <View className="flex-row justify-between items-center">
        <Text className="text-lg font-semibold">
          {month}
        </Text>

        <View className="bg-green-100 px-3 py-1 rounded-full">
          <Text className="text-green-700 text-sm font-semibold">
            {status}
          </Text>
        </View>
      </View>

      <Text className="text-gray-700 mt-3 text-lg">
        {amount}
      </Text>

      <View className="flex-row items-center mt-3">
        <Ionicons name="calendar-outline" size={16} color="#6B6B6B" />
        <Text className="ml-2 text-gray-600">
          {date}
        </Text>
      </View>
    </View>
  );
}
