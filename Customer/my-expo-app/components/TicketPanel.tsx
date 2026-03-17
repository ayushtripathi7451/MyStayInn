import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

export default function TicketPanel({
  navigation,
}: {
  navigation?: any;
}) {
  const { theme } = useTheme();

  // 🎨 THEME COLORS
  const primaryBtn = theme === "female" ? "bg-pink-500" : "bg-[#2F3CFF]";
  const shadowColor = theme === "female" ? "#FF5FA2" : "#2F3CFF";

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View className="px-4 -mt-2 mb-6">

        {/* ✅ Raise New Ticket */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation?.navigate("CreateRequest")}
          className={`${primaryBtn} rounded-[32px] py-3 items-center justify-center`}
          style={{
            shadowColor,
            shadowOpacity: 0.3,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          }}
        >
          <View className="flex-row items-center justify-between w-full px-8">
            <Text className="text-white font-bold text-2xl tracking-tight">
              Raise New Ticket
            </Text>
            <View className="bg-white/20 rounded-full p-1.5">
              <Ionicons name="add" size={28} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>

        {/* ✅ Existing Tickets */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation?.navigate("TicketsScreen")}
          className={`${primaryBtn} rounded-[32px] py-3 items-center justify-center mt-5`}
          style={{
            shadowColor,
            shadowOpacity: 0.2,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        >
          <View className="flex-row items-center justify-between w-full px-8">
            <Text className="text-white font-bold text-2xl tracking-tight">
              Existing Tickets
            </Text>
            <View className="bg-white/20 rounded-full p-2">
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>

      </View>
    </TouchableWithoutFeedback>
  );
}