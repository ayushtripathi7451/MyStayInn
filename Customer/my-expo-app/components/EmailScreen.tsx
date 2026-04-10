import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function EmailScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const validateEmail = () => {
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }

    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(email.trim())) {
      setError("Enter a valid email");
      return false;
    }

    setError("");
    return true;
  };

  const onNext = () => {
    if (validateEmail()) {
      navigation.navigate("VerifyEmail");
    }
  };

  const isValid = email.trim().length > 0;

  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      {/* SPLIT TOP + BOTTOM */}
      <View className="flex-1 justify-between">

        {/* TOP CONTENT */}
        <View>
          {/* HEADER WITH CENTERED TITLE */}
          <View className="flex-row items-center mt-4">

            {/* Back Button */}
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={26} color="black" />
            </TouchableOpacity>

            {/* Title center trick */}
            <View className="flex-1 items-center">
              <Text className="text-xl font-semibold">
                Add your email 1 / 3
              </Text>
            </View>

            {/* Right Spacer for perfect centering */}
            <View style={{ width: 26 }} />
          </View>

          {/* PROGRESS BAR */}
          <View className="flex-row justify-center mt-3 mb-10">
            <View className="w-10 h-1.5 bg-indigo-500 rounded-full mx-1" />
            <View className="w-6 h-1.5 bg-gray-300 rounded-full mx-1" />
            <View className="w-6 h-1.5 bg-gray-300 rounded-full mx-1" />
          </View>

          {/* EMAIL FIELD */}
          <Text className="text-gray-700 mb-1">Email</Text>

          <TextInput
            placeholder="example@example"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setError("");
            }}
            className="border border-gray-300 rounded-lg px-4 py-3"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* ERROR MESSAGE */}
          {error ? (
            <Text className="text-red-500 text-xs mt-1">{error}</Text>
          ) : null}

          {/* NEXT BUTTON */}
          <TouchableOpacity
            disabled={!isValid}
            onPress={onNext}
            className={`w-full py-4 rounded-xl mt-8 ${
              isValid ? "bg-indigo-500" : "bg-indigo-300"
            }`}
          >
            <Text className="text-center text-white font-semibold text-lg">
              Next
            </Text>
          </TouchableOpacity>
        </View>

        {/* FOOTER – FIXED AT BOTTOM */}
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
