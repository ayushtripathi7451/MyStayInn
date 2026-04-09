import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNav from "./BottomNav";
import ProfileHeader from "./SetupHeader";

export default function ProfileSetupScreen({ navigation }: any) {
  const [propertyType, setPropertyType] = useState("Hostel");
  const [userType, setUserType] = useState("Owner");

  return (
    <SafeAreaView className="flex-1 bg-white">

      {/* 🔥 REUSABLE FIXED HEADER */}
      <ProfileHeader activeTab="Property" />

      {/* MAIN CONTENT */}
      <View className="px-6 mt-6 flex-1">

        {/* Step Title */}
        <Text className="text-[20px] font-semibold">Step 1- Property details</Text>

        {/* Property name */}
        <Text className="text-gray-700 mt-5 mb-1">Property name</Text>
        <TextInput
          placeholder="e.g , MyOnboard Residency"
          className="border border-gray-200 rounded-lg px-4 py-3 bg-white"
        />

        {/* Property type */}
        <Text className="text-gray-700 mt-5 mb-2">Property type</Text>

        {/* EXACT SIDE-BY-SIDE RADIO BUTTONS LIKE SCREENSHOT */}
        <View className="flex-row items-center  space-x-10">

          {/* Hostel */}
          <TouchableOpacity
            className="flex-row items-center mr-4"
            onPress={() => setPropertyType("Hostel")}
          >
            <View
              className={`w-3 h-3 rounded-full mr-2 border ${
                propertyType === "Hostel"
                  ? "border-blue-600 bg-blue-600"
                  : "border-gray-400"
              }`}
            />
            <Text
              className={
                propertyType === "Hostel"
                  ? "text-blue-700 font-medium"
                  : "text-gray-500"
              }
            >
              Hostel
            </Text>
          </TouchableOpacity>

          {/* PG */}
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() => setPropertyType("PG")}
          >
            <View
              className={`w-3 h-3 rounded-full mr-2 border ${
                propertyType === "PG"
                  ? "border-blue-600 bg-blue-600"
                  : "border-gray-400"
              }`}
            />
            <Text
              className={
                propertyType === "PG"
                  ? "text-blue-700 font-medium"
                  : "text-gray-500"
              }
            >
              PG
            </Text>
          </TouchableOpacity>

        </View>

        {/* User type */}
        <Text className="text-gray-700 mt-5 mb-2">User type</Text>

        <View className="flex-row space-x-3 ">
          {["Owner", "Manager", "Staff"].map((item) => {
            const active = userType === item;
            return (
              <TouchableOpacity
                key={item}
                onPress={() => setUserType(item)}
                className={`px-5 py-2 rounded-lg border ${
                  active
                    ? "bg-[#2F3CFF] border-[#2F3CFF]"
                    : "border-gray-300"
                }`}
              >
                <Text className={active ? "text-white" : "text-gray-700"}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Postal Address */}
        <Text className="text-gray-700 mt-5 mb-1">Postal address</Text>
        <TextInput
          placeholder="Street, City, State, ZIP"
          className="border border-gray-200 rounded-lg px-4 py-3 bg-white"
        />
        <Text className="text-gray-400 text-xs mt-1">
          Precise location coordinates can be captured later from the map.
        </Text>

        {/* Buttons */}
        <View className="flex-row justify-between mt-8 mb-8">
          <TouchableOpacity className="px-6 py-3 rounded-lg bg-white border border-gray-300">
            <Text className="text-gray-700">‹ Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("Facilities")}
            className="px-6 py-3 rounded-lg bg-[#2F3CFF]"
          >
            <Text className="text-white font-semibold">Next ›</Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* Bottom Navigation */}
      <BottomNav />
    </SafeAreaView>
  );
}
