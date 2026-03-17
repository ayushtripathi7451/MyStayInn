import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ProfileHeader from "./SetupHeader";
import BottomNav from "./BottomNav";
import { Ionicons } from "@expo/vector-icons";

export default function RoomsScreen({ navigation }: any) {
  const [activeFloor, setActiveFloor] = useState("Ground");

  const roomTypes = ["Single", "Double", "Triple", "Dorm"];
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  const [rooms, setRooms] = useState([
    { number: "001", type: "Single", price: "0", perMonth: "0" },
  ]);

  const updateRoom = (index: number, key: string, value: string) => {
    setRooms((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [key]: value } : r))
    );
  };

  const addRoom = () => {
    setRooms((prev) => [
      ...prev,
      { number: "000", type: "Single", price: "0", perMonth: "0" },
    ]);
  };

  const deleteRoom = (index: number) => {
    setRooms((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* HEADER */}
      <ProfileHeader activeTab="Rooms" />

      <ScrollView
        className="px-6 mt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 180 }}
      >
        <Text className="text-[20px] font-semibold">
          Step 4 - Setup rooms and price
        </Text>

        {/* Floor Tabs */}
        <View className="bg-gray-100 rounded-xl mt-4 p-1 flex-row">
          {["Ground", "First"].map((floor) => (
            <TouchableOpacity
              key={floor}
              onPress={() => setActiveFloor(floor)}
              className={`flex-1 py-2 rounded-lg ${
                activeFloor === floor ? "bg-white" : ""
              }`}
            >
              <Text
                className={`text-center font-medium ${
                  activeFloor === floor ? "text-[#2F3CFF]" : "text-gray-600"
                }`}
              >
                {floor}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Main Card */}
        <View className="mt-4 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">

          {/* --- Room Number + Type Row (Aligned) --- */}
          <View className="flex-row justify-between">

            {/* Left Column */}
            <View className="w-[48%]">
              <Text className="text-gray-600 mb-1">Room Number</Text>
              <TextInput
                value={rooms[0].number}
                onChangeText={(t) => updateRoom(0, "number", t)}
                className="border border-gray-200 bg-gray-50 rounded-lg px-4 py-3"
              />
            </View>

            {/* Right Column */}
            <View className="w-[48%]">
              <Text className="text-gray-600 mb-1">Type</Text>

              <TouchableOpacity
                onPress={() => setShowTypeDropdown(!showTypeDropdown)}
                className="border border-gray-200 bg-gray-50 rounded-lg px-4 py-3 flex-row justify-between items-center"
              >
                <Text>{rooms[0].type}</Text>
                <Ionicons name="chevron-down" size={18} color="gray" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Dropdown under both columns */}
          {showTypeDropdown && (
            <View className="border border-gray-200 bg-white rounded-lg p-2 mt-3 w-full">
              {roomTypes.map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => {
                    updateRoom(0, "type", item);
                    setShowTypeDropdown(false);
                  }}
                  className="py-2"
                >
                  <Text className="text-gray-700">{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Price & Per Month Row */}
          <View className="flex-row justify-between mt-4">
            <View className="w-[48%]">
              <Text className="text-gray-600 mb-1">Price / person</Text>
              <TextInput
                value={rooms[0].price}
                onChangeText={(t) => updateRoom(0, "price", t)}
                keyboardType="numeric"
                className="border border-gray-200 bg-gray-50 rounded-lg px-4 py-3"
              />
            </View>

            <View className="w-[48%]">
              <Text className="text-gray-600 mb-1">Per month / Day</Text>
              <TextInput
                value={rooms[0].perMonth}
                onChangeText={(t) => updateRoom(0, "perMonth", t)}
                keyboardType="numeric"
                className="border border-gray-200 bg-gray-50 rounded-lg px-4 py-3"
              />
            </View>
          </View>

          {/* Delete Button */}
          <View className="items-end mt-4">
            <TouchableOpacity className="w-10 h-10 rounded-full bg-[#2F3CFF] justify-center items-center">
              <Ionicons name="trash-outline" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Buttons Inside Card */}
          <View className="flex-row justify-between mt-6">
            <TouchableOpacity className="px-6 py-3 rounded-lg bg-gray-100">
              <Text className="text-gray-600">Add Room</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="px-6 py-3 rounded-lg bg-gray-100"
            >
              <Text className="text-gray-600">‹ Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate("Verify")}
              className="px-6 py-3 rounded-lg bg-[#2F3CFF]"
            >
              <Text className="text-white font-semibold">Next ›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}
