import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SuccessIcon from "./SuccessIcon";

export default function SuccessScreen({ navigation }: any) {
  return (
    <SafeAreaView className="flex-1 bg-white px-6">

      {/* SPLIT TOP + BOTTOM */}
      <View className="flex-1 justify-between">

        {/* ✅ TOP CONTENT */}
        <View className="mt-20 px-4 items-center">

          {/* SVG ICON */}
          <View className="mb-10">
            <SuccessIcon />
          </View>

          {/* TITLE */}
          <Text className="text-center text-2xl font-semibold leading-snug">
            Your account{"\n"}was successfully created!
          </Text>

          {/* UNIQUE ID */}
          <Text className="text-center font-semibold text-gray-500 mt-3 text-lg">
            Now your unique ID is{" "}
            <Text className="font-bold text-gray-700">MYS25A000001</Text>
          </Text>

          {/* ✅✅ FULL WIDTH BUTTON FIX */}
          <View className="w-full mt-10">
            <TouchableOpacity
              onPress={() => navigation.navigate("CompleteProfile")}
              className="bg-purple-600 py-4 rounded-xl items-center w-full"
            >
              <Text className="text-white font-semibold text-md">
                Continue
              </Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* ✅ FOOTER FIXED AT BOTTOM */}
        <View className="items-center mb-6">
          <Text className="text-center text-gray-600 text-sm px-8 w-[300px]">
            By using MyStayInn, you agree to the{" "}
            <Text className="font-semibold text-gray-700">Terms</Text> and{" "}
            <Text className="font-semibold text-gray-700">Privacy Policy</Text>.
          </Text>
        </View>

      </View>
    </SafeAreaView>
  );
}
