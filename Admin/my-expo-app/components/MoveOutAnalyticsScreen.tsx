import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

interface MoveOutAnalyticsScreenProps {
  navigation: any;
}

export default function MoveOutAnalyticsScreen({ navigation }: MoveOutAnalyticsScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="bg-white px-6 py-5 flex-row items-center border-b border-slate-200 shadow-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1 -ml-1">
          <Ionicons name="arrow-back" size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-4 text-2xl font-black text-slate-900 tracking-tight">
          Move-Out Analytics
        </Text>
      </View>

      <View className="flex-1 justify-center items-center px-6">
        <View className="bg-white rounded-[24px] p-8 items-center shadow-sm">
          <Ionicons name="analytics-outline" size={64} color="#94A3B8" />
          <Text className="text-xl font-bold text-slate-900 mt-4 text-center">
            Analytics Dashboard
          </Text>
          <Text className="text-slate-400 text-center mt-4">
            This screen is under development
          </Text>
          
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="bg-[#1E33FF] px-6 py-3 rounded-xl mt-6"
          >
            <Text className="text-white font-bold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}