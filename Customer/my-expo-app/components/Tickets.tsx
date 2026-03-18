import React from "react";
import { View, Text, TouchableOpacity, Platform, ActivityIndicator } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useTickets } from "../src/hooks";

export default function Tickets({ navigation }: { navigation?: any }) {
  const { theme } = useTheme();
  const { openCount, closedCount, counts, loading } = useTickets();
  const showLoading = counts === null && loading;

  const isFemale = theme === "female";
  const accentColor = isFemale ? "#FF2E75" : "#0040FF";

  const content = (
    <View className="mt-4 mb-6 px-4">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-xl font-bold text-slate-800">My Tickets</Text>
      </View>

      <View
        className="bg-white rounded-[32px] border border-gray-100 px-6 py-2"
        style={{
          ...Platform.select({
            ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12 },
            android: { elevation: 3 },
          }),
        }}
      >
        <View className="flex-row items-center justify-between py-4">
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-[#0A8A2A] mr-3" />
            <Text className="text-[17px] text-gray-800 font-semibold">Open Tickets</Text>
          </View>
          <View className="bg-[#ECFDF3] px-5 py-1.5 rounded-2xl">
            {showLoading ? (
              <ActivityIndicator size="small" color="#0A8A2A" />
            ) : (
              <Text className="text-[20px] font-black text-[#0A8A2A]">{openCount}</Text>
            )}
          </View>
        </View>

        <View className="h-[1px] bg-gray-50 mx-2" />

        <View className="flex-row items-center justify-between py-4">
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-[#C0392B] mr-3" />
            <Text className="text-[17px] text-gray-800 font-semibold">Closed Tickets</Text>
          </View>
          <View className="bg-[#FDF2F2] px-5 py-1.5 rounded-2xl">
            {showLoading ? (
              <ActivityIndicator size="small" color="#C0392B" />
            ) : (
              <Text className="text-[20px] font-black text-[#C0392B]">{closedCount}</Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );

  if (navigation) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate("TicketsScreen")}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}
