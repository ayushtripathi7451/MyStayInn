import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ProfileHeader from "./SetupHeader";
import BottomNav from "./BottomNav";
import { Ionicons } from "@expo/vector-icons";

export default function FacilitiesScreen({ navigation }: any) {
  const [facilityState, setFacilityState] = useState([
    [true, false],
    [false, false],
    [true, false],
    [false, false],
    [false, false],
  ]);

  const toggleSelect = (rowIndex: number, side: "left" | "right") => {
    setFacilityState((prev) =>
      prev.map((row, i) => {
        if (i !== rowIndex) return row;
        return side === "left" ? [!row[0], row[1]] : [row[0], !row[1]];
      })
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">

      {/* HEADER */}
      <ProfileHeader activeTab="Facilities" />

      {/* SCROLLABLE CONTENT */}
      <ScrollView
        className="px-6 mt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 180 }}  // <— EXTRA SPACE FOR BUTTONS
      >
        <Text className="text-[20px] -mb-4 font-semibold">Step 2 - Facilities</Text>

        <View className="mt-5 space-y-6"> 
          {/* Increased vertical spacing */}
          {facilityState.map((row, index) => (
            <View key={index} className="flex-row justify-between">

              {/* LEFT CARD */}
              <TouchableOpacity
                onPress={() => toggleSelect(index, "left")}
                className={`w-[48%] p-4 mt-4 rounded-xl ${
                  row[0] ? "bg-indigo-200" : "bg-gray-100"
                }`} 
              >
                <Ionicons
                  name="tv-outline"
                  size={22}
                  color={row[0] ? "#5A09E8" : "#7F7F7F"}
                />
                <Text
                  className={`mt-2 font-semibold ${
                    row[0] ? "text-indigo-900" : "text-gray-700"
                  }`}
                >
                  Smart TV
                </Text>
                <Text className="text-gray-500 text-xs">2 Active</Text>
              </TouchableOpacity>

              {/* RIGHT CARD */}
              <TouchableOpacity
                onPress={() => toggleSelect(index, "right")}
                className={`w-[48%] p-4 mt-4 rounded-xl ${
                  row[1] ? "bg-indigo-200" : "bg-gray-100"
                }`}
              >
                <Ionicons
                  name="leaf-outline"
                  size={22}
                  color={row[1] ? "#5A09E8" : "#7F7F7F"}
                />
                <Text
                  className={`mt-2 font-semibold ${
                    row[1] ? "text-indigo-900" : "text-gray-700"
                  }`}
                >
                  Air Purifier
                </Text>
                <Text className="text-gray-500 text-xs">1 On</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View className="flex-row justify-between px-12  absolute bottom-24 w-full">
        <TouchableOpacity className="px-6 py-3 rounded-lg bg-gray-100">
          <Text className="text-gray-500">‹ Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("Floors")}
          className="px-6 py-3 rounded-lg bg-[#2F3CFF]"
        >
          <Text className="text-white font-semibold">Next ›</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>

      {/* FIXED BUTTONS */}
      

      <BottomNav />
    </SafeAreaView>
  );
}
