import React from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, NavigationProp } from "@react-navigation/native";

export default function BottomNav() {
  const navigation = useNavigation<NavigationProp<any>>();

  return (
    <View className="absolute bottom-12 w-full items-center">
      <View className="flex-row justify-around items-center bg-white rounded-full w-[90%] py-3 shadow-lg">
        
        {/* Home */}
        <TouchableOpacity onPress={() => navigation.navigate("Home")}>
          <Ionicons name="home-outline" size={26} color="#C1C1C1" />
        </TouchableOpacity>

        {/* Customers */}
        <TouchableOpacity onPress={() => navigation.navigate("SearchScreen")}>
          <Ionicons name="person-outline" size={26} color="#C1C1C1" />
        </TouchableOpacity>

        {/* ₹ Center Button */}
        <TouchableOpacity 
          className="bg-[#2F3CFF] w-14 h-14 rounded-full justify-center items-center shadow-lg"
          onPress={() => navigation.navigate("PaymentManagementScreen")}
        >
          <Text className="text-white text-3xl">
            ₹
          </Text>
        </TouchableOpacity>

        {/* Expenses */}
        <TouchableOpacity  onPress={() => navigation.navigate("ReportsHubScreen")}>
          <Ionicons name="document-text-outline" size={26} color="#C1C1C1" />
          
        </TouchableOpacity>

        {/* Tickets */}
        <TouchableOpacity onPress={() => navigation.navigate("TicketsScreen")}>
          <Ionicons name="ticket-outline" size={26} color="#C1C1C1" />
        </TouchableOpacity>

      </View>
    </View>
  );
}
