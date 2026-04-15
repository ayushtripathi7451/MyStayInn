import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CommonActions } from "@react-navigation/native";
import SuccessBrandMark from "./SuccessBrandMark";
import { useProperty } from "../contexts/PropertyContext";

export default function PropertySuccess({ navigation, route }: any) {
  const { id } = route.params || {};
  const propertyId = id ?? "—";
  const { refresh } = useProperty();
  const [continuing, setContinuing] = useState(false);

  const goToHome = async () => {
    if (continuing) return;
    setContinuing(true);
    try {
      const selectId =
        id != null && String(id).trim() !== "" && propertyId !== "—" ? String(id).trim() : undefined;
      await refresh(selectId ? { selectPropertyId: selectId } : undefined);
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Home" }],
        })
      );
    } finally {
      setContinuing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white px-6">

      {/* SPLIT TOP + BOTTOM */}
      <View className="flex-1 justify-between items-center">

        {/* TOP CONTENT */}
        <View className="items-center mt-20 px-4">

          {/* Splash-style logo on blue gradient */}
          <View className="mb-10">
            <SuccessBrandMark />
          </View>

          {/* TITLE */}
          <Text className="text-center text-2xl font-semibold leading-snug">
            Your property Id{"\n"}was successfully created!
          </Text>

          {/* UNIQUE ID */}
          <Text className="text-center font-semibold text-gray-500 mt-3 text-lg">
            Now your Property ID is{" "}
            <Text className="font-bold text-gray-700">{propertyId}</Text>
          </Text>

          {/* PENDING SETUP MESSAGE */}
          <View className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-6 self-stretch">
            <Text className="text-amber-800 text-sm text-center">
              Rules & food menu are pending. You can add them anytime from <Text className="font-semibold">Home → Complete property setup</Text>.
            </Text>
          </View>

          {/* BUTTON */}
          <TouchableOpacity
            onPress={goToHome}
            disabled={continuing}
            className="bg-indigo-600 w-80 py-4 rounded-xl mt-10 items-center justify-center min-h-[52px]"
          >
            {continuing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">Continue</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* FOOTER FIXED AT BOTTOM */}
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