import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";


import BottomNav from "./BottomNav";

export default function CustomersEnterScreen() {
  const [tab, setTab] = useState<"customer" | "enrollment">("customer");
  const [step, setStep] = useState<"enrollment" | "allocation">("enrollment");
  const navigation = useNavigation<NavigationProp<any>>();

  return (
    <SafeAreaView className="flex-1 bg-white">

      {/* 🔹 HEADER */}
      <View className="bg-white pt-4 pb-6 px-6">
        <View className="flex-row justify-between items-center">
          <Text className="text-black text-3xl font-bold">
            Customers
          </Text>

          <TouchableOpacity
            onPress={() => navigation.navigate("Settings")}
            className="w-12 h-12 rounded-full bg-gray-100 justify-center items-center"
          >
            <Ionicons name="settings-outline" size={22} color="#000" />
          </TouchableOpacity>
        </View>

        <Text className="text-[15px] text-gray-600 mt-2">
          Search & manage current and past occupants
        </Text>
      </View>

      {/* 🔹 BODY */}
      <View className="flex-1 bg-[#F6F8FF] rounded-t-[30px] -mt-4 px-4 pt-5">

        {/* 🔹 CURRENT OCCUPANTS */}
        <View className="bg-white rounded-2xl p-4 mb-5 shadow-sm">
          <Text className="text-xl font-semibold mb-3">
            Current Occupants
          </Text>

          {/* Table Header */}
          <View className="flex-row border-b border-gray-200 pb-2 mb-2">
            <Text className="flex-1 text-gray-500 text-sm">Customer</Text>
            <Text className="flex-1 text-gray-500 text-sm">Room/Bed</Text>
            <Text className="flex-1 text-gray-500 text-sm">Status</Text>
            <Text className="flex-1 text-gray-500 text-sm text-right">
              Due Amount
            </Text>
          </View>

          {/* Row 1 */}
          <View className="flex-row py-2">
            <Text className="flex-1 text-gray-800">prateek</Text>
            <Text className="flex-1 text-gray-800">002</Text>
            <Text className="flex-1 text-red-500 font-medium">unpaid</Text>
            <Text className="flex-1 text-gray-800 text-right">
              ₹ 6600
            </Text>
          </View>

          {/* Row 2 */}
          <View className="flex-row py-2">
            <Text className="flex-1 text-gray-800">Sumit</Text>
            <Text className="flex-1 text-gray-800">003</Text>
            <Text className="flex-1 text-green-600 font-medium">paid</Text>
            <Text className="flex-1 text-gray-800 text-right">
              ₹ 8956
            </Text>
          </View>
        </View>

        

        {/* 🔹 CONTENT */}
      </View>

      {/* 🔹 FLOATING + BUTTON */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate("CustomersScreen")}
        className="absolute bottom-36 right-6 w-16 h-16 rounded-full bg-[#3B4BFF] justify-center items-center"
        style={{
          shadowColor: "#3B4BFF",
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 8,
        }}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* 🔹 BOTTOM NAV */}
      <BottomNav />
    </SafeAreaView>
  );
}
