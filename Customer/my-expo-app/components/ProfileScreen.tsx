import React from "react";
import { View, Text, Image, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext"; 
import BottomNav from "./BottomNav";

export default function ProfileScreen({ navigation }: any) {
    const { theme } = useTheme();
  
    const bgColor = theme === "female" ? "bg-[#FFF5FF]" : "bg-[#F6F8FF]";
  return (
    <SafeAreaView className={`flex-1 ${bgColor} `}> 

      {/* FULL WHITE HEADER SECTION */}
      <View className="bg-white px-4 pb-6 pt-4 rounded-b-3xl shadow-sm">
        
        {/* Top Row */}
        <View className="flex-row items-center justify-between">
          <Text className="text-[28px] font-extrabold text-black">
            Your Profile
          </Text>

          <TouchableOpacity className="w-11 h-11 bg-white rounded-2xl justify-center items-center shadow-sm border border-gray-200">
            <Ionicons name="settings-outline" size={22} color="black" />
          </TouchableOpacity>
        </View>

        {/* Profile Row */}
        <View className="mt-6 px-2">
          <View className="flex-row items-center">
            <Image
              source={{ uri: "https://i.pravatar.cc/150?img=12" }}
              className="w-16 h-16 rounded-full"
            />

            <View className="ml-4">
              <Text className="text-[20px] font-semibold text-black">
                Prateek Sharma
              </Text>

              <View className="bg-yellow-100 px-3 py-[4px] self-start rounded-full mt-1">
                <Text className="text-yellow-700 font-semibold text-[13px]">
                  MYS25A000001
                </Text>
              </View>
            </View>
          </View>

          {/* Tab */}
          <View className="mt-6 bg-[#E8EAEE] py-3 rounded-2xl w-full">
            <Text className="text-center text-gray-600 font-semibold text-[15px]">
              General Details
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className= {`px-4 ${bgColor} `}  
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150, paddingTop: 20 }}
      >

        {/* DETAIL CARDS */}
        <View className="space-y-4">

          {/* First Name */}
          <View className="bg-white flex-row justify-between items-center mb-3 px-5 py-4 rounded-2xl border border-gray-100 shadow-sm">
            <View>
              <Text className=" text-[17px] font-semibold mt-[2px]">First Name</Text>
              <Text className="text-gray-500 text-[13px]">Prateek</Text>
            </View>
            <View className="bg-gray-100 p-2 rounded-full">
              <Ionicons name="pencil-outline" size={18} color="#555" />
            </View>
          </View>

          {/* Last Name */}
          <View className="bg-white flex-row justify-between items-center mb-3 px-5 py-4 rounded-2xl border border-gray-100 shadow-sm">
            <View>
              <Text className=" text-[17px] font-semibold mt-[2px]">Last Name</Text>
              <Text className=" text-gray-500 text-[13px]">Sharma</Text>
            </View>
            <View className="bg-gray-100 p-2 rounded-full">
              <Ionicons name="pencil-outline" size={18} color="#555" />
            </View>
          </View>

          {/* Mobile Number */}
          <View className="bg-white flex-row justify-between items-center px-5 py-4 rounded-2xl border border-gray-100 shadow-sm">
            <View>
              <Text className="text-[17px] font-semibold mt-[2px]">Mobile Number</Text>
              <Text className=" text-gray-500 text-[13px]">
                9413477263
              </Text>
            </View>
            <View className="bg-gray-100 p-2 rounded-full">
              <Ionicons name="pencil-outline" size={18} color="#555" />
            </View>
          </View>

        </View>

      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}
