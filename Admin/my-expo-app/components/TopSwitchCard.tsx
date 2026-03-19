import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

export default function TopSwitchCard({ mode, setMode, navigation, firstName = "User" }: any) {
  return (
    <View
      className="mx-6 rounded-[32px] p-6 mt-8"
      style={{
        backgroundColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
      }}
    >
      <Text className="text-[26px] font-semibold mb-6">Login to MyStayInn</Text>

      {/* mode buttons */}
      <View className="flex-row bg-[#F2F2F2] rounded-full p-1">

        {/* PIN BUTTON */}
        <TouchableOpacity
          className={`flex-1 py-3 items-center rounded-full ${
            mode === "pin" ? "bg-blue-600" : ""
          }`}
          onPress={() => setMode("pin")}
        >
          <Text
            className={`text-[14px] font-semibold ${
              mode === "pin" ? "text-white" : "text-gray-600"
            }`}
          >
            Enter 4-digit PIN
          </Text>
        </TouchableOpacity>

        {/* BIOMETRICS BUTTON */}
        <TouchableOpacity
          className={`flex-1 py-3 items-center rounded-full ${
            mode === "biometric" ? "bg-blue-600" : "bg-white"
          }`}
          onPress={() => setMode("biometric")}
        >
          <Text
            className={`text-[14px] font-semibold ${
              mode === "biometric" ? "text-white" : "text-gray-600"
            }`}
          >
            Biometrics
          </Text>
        </TouchableOpacity>
      </View>

     <View className="mt-5">
  <Text className="text-gray-500 text-right text-[13px]">
    
    <Text
      className="font-semibold text-blue-600"
      onPress={() => navigation.navigate("Reactivate")}
    >
      Forgot PIN?
    </Text>
    
  </Text>
  <Text className="text-gray-500 text-right mt-2 text-[13px]">
        Not {firstName}?{" "}
        <Text
          className="font-semibold text-blue-600"
          onPress={() => navigation.navigate("Welcome")}
        >
          Login
        </Text>
      </Text>
</View>
    </View>
  );
}
