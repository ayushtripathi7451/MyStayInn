import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function AnnouncementCard() {
  return (
    <View className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100">

      {/* Announcement Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="bg-red-500 px-3 py-1.5 rounded-full flex-row items-center">
          <Ionicons name="megaphone" size={14} color="white" />
          <Text className="text-white font-bold text-xs ml-1.5 uppercase tracking-wider">
            Announcement
          </Text>
        </View>
        <Text className="text-slate-400 text-xs font-medium">
          April 20, 2026
        </Text>
      </View>

      {/* Title */}
      <Text className="text-lg font-black text-slate-900 leading-6 mb-2">
        Scheduled Maintenance on{"\n"}April 25th
      </Text>

      {/* Description */}
      <Text className="text-slate-600 text-sm leading-5 mb-4">
        The system will be unavailable from 12AM to 2AM IST for backend upgrades. Please plan accordingly.
      </Text>

    </View>
  );
}
