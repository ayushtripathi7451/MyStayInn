import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

export default function MoreDetails() {
  const { theme } = useTheme();

  const accentColor = theme === "female" ? "#EC4899" : "#4A5AFF";
  const lightBg = theme === "female" ? "bg-pink-50" : "bg-indigo-50";

  const items = [
    {
      label: "Advance Paid",
      value: "₹5,000",
      icon: "checkmark-circle",
      bg: "bg-green-100",
      iconColor: "#16A34A",
    },
    {
      label: "Admitted Date",
      value: "10 March 2025",
      icon: "calendar-outline",
      bg: lightBg,
      iconColor: accentColor,
    },
    {
      label: "Discharge Date",
      value: "10 Sept 2025",
      icon: "calendar-outline",
      bg: lightBg,
      iconColor: accentColor,
    },
  ];

  return (
    <View className="mb-8 px-4 mt-2">
      {/* SECTION TITLE */}
      <Text className="text-xl font-bold mb-4 text-black">
        More Details
      </Text>

      {items.map((item, index) => (
        <View
          key={index}
          className="bg-white rounded-2xl px-5 py-4 mb-4 shadow-sm"
        >
          <View className="flex-row justify-between items-center">
            {/* LEFT */}
            <View>
              {/* LABEL */}
              <Text className="text-gray-500 text-[15px] font-medium">
                {item.label}
              </Text>

              {/* VALUE */}
              <Text className="text-black text-lg font-semibold mt-1">
                {item.value}
              </Text>
            </View>

            {/* RIGHT ICON */}
            <View
              className={`w-11 h-11 rounded-full items-center justify-center ${item.bg}`}
            >
              <Ionicons
                name={item.icon as any}
                size={24}
                color={item.iconColor}
              />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
