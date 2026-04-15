import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SuccessBrandMark from "./SuccessBrandMark";

export default function SuccessScreen({ navigation, route }: any) {
  const uniqueId = route?.params?.uniqueId || "—";
  return (
    <SafeAreaView className="flex-1 bg-white px-6">

      {/* SPLIT TOP + BOTTOM */}
      <View className="flex-1 justify-between">

        {/* ✅ TOP CONTENT */}
        <View className="mt-20 px-4 items-center">

          {/* Splash-style logo on blue gradient */}
          <View className="mb-10">
            <SuccessBrandMark />
          </View>

          {/* TITLE */}
          <Text className="text-center text-2xl font-semibold leading-snug">
            Your account{"\n"}was successfully created!
          </Text>

          {/* UNIQUE ID */}
          <Text className="text-center font-semibold text-gray-500 mt-3 text-lg">
            Now your unique ID is{" "}
            <Text className="font-bold text-gray-700">{uniqueId}</Text>
          </Text>

          <TouchableOpacity
            onPress={() => navigation.replace("CompleteProfile")}
            className="bg-indigo-600 py-4 rounded-xl items-center w-80 mt-10"
          >
            <Text className="text-white font-semibold text-md">
              Continue
            </Text>
          </TouchableOpacity>

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
