import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { useUser } from "../src/hooks";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Home">;

export default function Header() {
  const navigation = useNavigation<NavigationProp>();
  const { name, uniqueId, data, loading } = useUser();
  const showLoading = !data && loading;

  return (
    <View className="bg-white rounded-2xl p-5 mt-3 -mb-2 shadow shadow-black/10 mx-2">
      <View className="flex-row justify-between items-center">
      </View>

      <View className="flex-row items-center mt-4">
        <View className="w-[45px] h-[45px] rounded-full bg-[#EAF1FF] justify-center items-center">
          <Text className="text-[22px]">😇</Text>
        </View>
        <View className="flex-1 ml-2">
          <Text className="text-2xl font-medium text-black">
            Hi, {showLoading ? "..." : name || "Guest"} 👋
          </Text>
          <Text className="text-gray-400 text-[14px] mt-1">
            My ID is {" "}
            <Text className="font-semibold text-gray-600">
              {showLoading ? <ActivityIndicator size="small" /> : uniqueId || "-"}
            </Text>
          </Text>
        </View>

        <TouchableOpacity
          className="w-[45px] h-[45px] bg-white border font-bold border-gray-300 rounded-xl justify-center items-center relative"
          onPress={() => navigation.navigate("Notifications")}
        >
          <Ionicons name="notifications-outline" size={24} color="#000" />
          <View className="w-[8px] h-[8px] rounded-full bg-red-500 absolute top-[6px] right-[6px]" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => navigation.navigate("SearchAdmin")}
        className="flex-row items-center bg-[#F7F8FA] rounded-xl h-[42px] px-3 mt-4"
      >
        <Ionicons name="search" size={18} color="#aaa" />
        <Text className="text-gray-400 ml-2 text-[14px]">Search Property</Text>
      </TouchableOpacity>
    </View>
  );
}
