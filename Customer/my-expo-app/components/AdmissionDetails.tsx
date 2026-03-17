import React from "react";
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../context/ThemeContext";

export default function AdmissionDetails() {
  const { theme } = useTheme();

  // 🎨 DEEPER, CLEANER GRADIENT
  const gradientColors =
    theme === "female"
      ? ["#EC4899", "#BE185D"]   // 💖 Deep Pink
      : ["#4A5AFF", "#1E3AFF"];  // 💙 Deep Blue

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="w-11/12 self-center rounded-[28px] p-5 mt-3 mb-5"
      style={{
        borderRadius: 28,
        paddingVertical: 20,
        paddingHorizontal: 20,
      }}
    >
      {/* TITLE */}
      <Text className="text-white text-xl font-bold mb-4">
        Admission Details
      </Text>

      {/* GLASS CONTENT */}
      <View className="bg-white/20 rounded-2xl p-5 space-y-3">
        <Text
          className="text-white text-[15px] font-semibold tracking-wide"
          numberOfLines={1}
        >
          Room Type – Deluxe
        </Text>

        <Text
          className="text-white text-[15px] font-semibold tracking-wide"
          numberOfLines={1}
        >
          Floor – 2nd Floor
        </Text>

        <Text
          className="text-white text-[15px] font-semibold tracking-wide"
          numberOfLines={1}
        >
          Duration – 6 Months
        </Text>

        <Text
          className="text-white text-[15px] font-semibold tracking-wide"
          numberOfLines={1}
        >
          Admin Name – Rahul Mehta
        </Text>
      </View>
    </LinearGradient>
  );
}
