import React from "react";
import { View, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function SearchBar() {
  return (
    <View className="flex-row items-center bg-white rounded-xl h-12 px-3 mb-6">
      <Ionicons name="search" size={18} color="#aaa" />
      <TextInput
        placeholder="Search Admin"
        placeholderTextColor="#aaa"
        className="flex-1 ml-2 text-gray-700"
      />
    </View>
  );
}
