import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import SetupHeader from "./SetupHeader";
import BottomNav from "./BottomNav";

export default function FoodScreen({ navigation }: any) {
  return (
    <SafeAreaView className="flex-1 bg-white">

      {/* Header */}
      <SetupHeader activeTab="Food" />

      {/* Scrollable Section */}
      <ScrollView
        className="px-6 mt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        <Text className="text-[20px] font-semibold">Food Menu & Timings</Text>

        {/* Section Blocks */}
        {[
          { label: "Breakfast start", placeholder: "08:54 AM" },
          { label: "Breakfast end", placeholder: "10:00 AM" },
          { label: "Breakfast menu", placeholder: "Poha, Upma, Idli" },

          { label: "Lunch start", placeholder: "01:00 PM" },
          { label: "Lunch end", placeholder: "03:00 PM" },
          { label: "Lunch menu", placeholder: "Veg thali" },

          { label: "Dinner start", placeholder: "08:00 PM" },
          { label: "Dinner end", placeholder: "10:00 PM" },
          { label: "Dinner menu", placeholder: "Dal, Roti, Sabzi" },
        ].map((item, index) => (
          <View key={index} className="mt-3">
            <Text className="text-gray-600 mb-1">{item.label}</Text>

            {/* Input Box */}
            <View className="flex-row items-center border border-gray-300 bg-gray-50 rounded-lg px-4 ">
              <TextInput
                placeholder={item.placeholder}
                className="flex-1 text-gray-700"
                editable={false}
              />
              {/* Only show icon for time fields */}
              {item.label.includes("start") || item.label.includes("end") ? (
                <Ionicons name="time-outline" size={18} color="gray" />
              ) : null}
            </View>
          </View>
        ))}

        {/* Bottom Buttons */}
      <View className="flex-row justify-between px-6 absolute bottom-24 w-full">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="px-6  rounded-lg bg-gray-100"
        >
          <Text className="text-gray-600 text-[16px]">‹ Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("Success")}
          className="px-6 py-3 rounded-lg bg-[#2F3CFF] flex-row items-center"
        >
          <Ionicons name="save-outline" size={18} color="white" style={{ marginRight: 6 }} />
          <Text className="text-white font-semibold text-[16px]">
            Save & Generate ID
          </Text>
        </TouchableOpacity>
      </View>
      </ScrollView>

      

      {/* Bottom Nav */}
      <BottomNav />
    </SafeAreaView>
  );
}
