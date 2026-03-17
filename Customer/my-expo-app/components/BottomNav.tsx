import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";

export default function BottomNav() {
  const navigation = useNavigation<any>(); // Hook inside the component
  const { theme } = useTheme();
  const primaryBg = theme === "female" ? "#EC4899" : "#2F3CFF";

  // Safety helper
  const navigateTo = (screen: string) => {
    if (navigation && navigation.navigate) {
      navigation.navigate(screen);
    } else {
      console.log("Navigation not available yet");
    }
  };

  return (
    <View className="absolute bottom-12 w-full items-center">
      <View className="flex-row justify-around items-center bg-white rounded-full w-[90%] py-3 shadow-lg">
        <TouchableOpacity onPress={() => navigateTo("Home")}>
          <Ionicons name="home-outline" size={26} color="#C1C1C1" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigateTo("SearchAdmin")}>
          <Ionicons name="search" size={26} color="#C1C1C1" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigateTo("PaymentDueScreen")}
          className="w-14 h-14 rounded-full justify-center items-center shadow-lg"
          style={{ backgroundColor: primaryBg }}
        >
          <Ionicons name="wallet-outline" size={30} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigateTo("Notifications")}>
          <Ionicons name="notifications-outline" size={26} color="#C1C1C1" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigateTo("Profile2")}>
          <Ionicons name="ellipsis-horizontal" size={26} color="#C1C1C1" />
        </TouchableOpacity>
      </View>
    </View>
  );
}