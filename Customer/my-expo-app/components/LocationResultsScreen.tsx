import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext"; // ✅ THEME CONTEXT

export default function LocationResultsScreen({ navigation }: any) {
  const { theme } = useTheme(); // ✅ get current theme

  // ✅ THEME COLORS
  const bgMain = theme === "female" ? "bg-[#FFF5FF]" : "bg-[#F6F8FF]";
  const cardBg = theme === "female" ? "bg-[#FFE4F2]" : "bg-[#F2F4FF]";
  const primaryText = theme === "female" ? "text-pink-600" : "text-[#1E33FF]";
  const toggleBg = theme === "female" ? "bg-[#FFD6EA]" : "bg-[#E8ECFF]";

  const dummyList = [
    { id: 1, name: "Prateek Sharma", distance: "1.8 km" },
    { id: 2, name: "Prateek Sharma", distance: "1.8 km" },
    { id: 3, name: "Prateek Sharma", distance: "1.8 km" },
    { id: 4, name: "Prateek Sharma", distance: "1.8 km" },
  ];

  return (
    <View className={`flex-1 bg-white`}>
      <SafeAreaView />

      {/* ✅ HEADER */}
      <View className="flex-row items-center px-7 mt-2">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 bg-white rounded-full justify-center items-center border border-gray-300"
        >
          <Ionicons name="chevron-back" size={22} />
        </TouchableOpacity>

        <Text className={`ml-4 text-[24px] font-bold ${primaryText}`}>
          Search
        </Text>
      </View>

      <ScrollView className="px-7 mt-4" showsVerticalScrollIndicator={false}>
        {/* ✅ LOCATION SEARCH BAR */}
        <View className="bg-white rounded-[14px] h-[50px] mb-4 px-4 flex-row items-center border border-[#E5E7EB] shadow-sm">
          <Ionicons name="search" size={20} color="#999" />
          <Text className="ml-2 text-[15px] text-gray-600">
            Search by location
          </Text>
        </View>

        {/* ✅ TOGGLE */}
        <View
          className={`flex-row justify-between items-center mt-2 mb-3 px-4 rounded-full ${toggleBg}`}
        >
          <Text className="text-[16px] text-gray-700">
            Use current location
          </Text>
          <Switch value={true} disabled />
        </View>

        {/* ✅ RESULTS LIST */}
        {dummyList.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() =>
              navigation.navigate("SearchResultDetails", { user: item })
            }
            className={`${cardBg} p-4 rounded-[16px] flex-row items-center mb-4`}
          >
            <Image
              source={{ uri: "https://i.pravatar.cc/150" }}
              className="w-16 h-16 rounded-full"
            />

            <View className="ml-4">
              <Text className="font-semibold text-[18px] text-black">
                {item.name}
              </Text>

              <View className="flex-row items-center mt-1">
                <Ionicons name="location" size={14} color="#444" />
                <Text className="ml-1 text-gray-600 text-[13px]">
                  {item.distance}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <View className="mb-20" />
      </ScrollView>
    </View>
  );
}
