import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ProfileHeader from "./SetupHeader";
import BottomNav from "./BottomNav";

export default function FloorsScreen({ navigation }: any) {
  const [floors, setFloors] = useState(1);
  const [roomsPerFloor, setRoomsPerFloor] = useState("4");

  const increase = () => setFloors((n) => n + 1);
  const decrease = () => setFloors((n) => (n > 1 ? n - 1 : 1));

  return (
    <SafeAreaView className="flex-1 bg-white">

      {/* FIXED HEADER */}
      <ProfileHeader activeTab="Floors" />

      {/* MAIN SCROLL CONTENT */}
      <ScrollView
        className="px-6 mt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 180 }}
      >
        {/* TITLE */}
        <Text className="text-[20px] font-semibold">Step 3 - Floors</Text>

        {/* NUMBER OF FLOORS */}
        <Text className="text-gray-700 mt-5 mb-2">Number of floors</Text>

        <View className="flex-row items-center space-x-6">

          {/* MINUS BUTTON */}
          <TouchableOpacity
            onPress={decrease}
            className="w-10 h-10 rounded-lg bg-gray-100 mr-6 justify-center items-center"
          >
            <Text className="text-2xl text-gray-700">−</Text>
          </TouchableOpacity>

          {/* COUNT */}
          <Text className="text-xl font-semibold ">{floors}</Text>

          {/* PLUS BUTTON */}
          <TouchableOpacity
            onPress={increase}
            className="w-10 h-10 rounded-lg bg-gray-100 ml-6 justify-center items-center"
          >
            <Text className="text-2xl text-gray-700">+</Text>
          </TouchableOpacity>
        </View>

        {/* AVERAGE ROOMS */}
        <Text className="text-gray-700 mt-5 mb-2">Average rooms / floor</Text>

        <TextInput
          value={roomsPerFloor}
          onChangeText={setRoomsPerFloor}
          keyboardType="numeric"
          className="border border-gray-200 rounded-lg px-4 py-3 bg-gray-50"
        />

        {/* QUICK CREATE ROOMS */}
        <Text className="text-gray-700 mt-5 mb-2">Quick create rooms</Text>

        <TouchableOpacity className="px-4 py-3 bg-gray-100 rounded-lg">
          <Text className="text-center text-gray-600 font-medium">
            Auto-populate
          </Text>
        </TouchableOpacity>

        <View className="flex-row justify-between px-14 absolute bottom-24 w-full">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="px-6 py-3 rounded-lg bg-gray-100"
        >
          <Text className="text-gray-500">‹ Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("Rooms")}
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
