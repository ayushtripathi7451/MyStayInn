import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import PropertyDropdown from "./PropertyDropdown";

export default function Header({ navigation }: any) {
  return (
    <SafeAreaView className="bg-white rounded-2xl pt-2 px-5 -mt-8 shadow shadow-black/5 mx-2">

      {/* TOP ROW */}
      <View className="flex-row justify-between items-center">

        

        {/* TITLE */}
        <PropertyDropdown navigation={navigation} />

        {/* RIGHT BUTTONS */}
        <View className="flex-row items-center">

          

          {/* USER */}
          <TouchableOpacity
            onPress={() => navigation.navigate("CustomersScreen", { initialTab: "enrollment" })}
            className="w-[42px] h-[42px] bg-white border border-gray-200 rounded-full justify-center items-center mr-3 relative"
          >
            <Ionicons name="person-outline" size={22} color="#000" />
            <View className="bg-red-500 w-[18px] h-[18px] rounded-full absolute -top-[2px] right-0 justify-center items-center">
              <Text className="text-[10px] text-white font-semibold">5</Text>
            </View>
          </TouchableOpacity>

             {/* 🔔 NOTIFICATION BUTTON */}
          <TouchableOpacity
            onPress={() => navigation.navigate("Notifications")}
            className="w-[42px] h-[42px] bg-white  rounded-full justify-center items-center  mr-3"
          >
           <Image
                         source={require("../assets/bell-icon.png")}
                         style={{ width : 45, height: 45 }}
                       />
          </TouchableOpacity>

          <TouchableOpacity
          onPress={() => navigation.navigate("Settings")}
          className="w-[42px] h-[42px] bg-white border border-gray-200 rounded-full justify-center items-center relative"
          >
            <Ionicons name="menu" size={20} color="#000" />
          </TouchableOpacity>

       

        </View>
      </View>

      {/* SEARCH BAR */}
      <TouchableOpacity onPress={ () => navigation.navigate("SearchScreen")} className="flex-row items-center -mb-6 bg-[#F7F8FA] rounded-xl h-[44px] px-3 mt-5">
        <Ionicons name="search" size={18} color="#aaa" />
        <Text className="text-gray-400 ml-2 text-[14px]">Search</Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
}
