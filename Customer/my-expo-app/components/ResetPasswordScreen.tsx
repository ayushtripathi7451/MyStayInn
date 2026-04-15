import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function ResetPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const validate = () => {
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Enter a valid email");
      return false;
    }
    setError("");
    return true;
  };

  const onSend = () => {
    if (validate()) {
      // Navigate to next screen or show message
      alert("Reset link sent ✔");
    }
  };

  const isValid = /\S+@\S+\.\S+/.test(email);
  const buttonFilled = isValid;

  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      
      <View className="flex-1 justify-between">

        {/* ---------- HEADER ---------- */}
        <View>
          <View className="flex-row items-center mt-4">
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={26} color="black" />
            </TouchableOpacity>

            {/* Centered title */}
            <View className="flex-1 items-center -ml-6">
              <Text className="text-xl font-semibold">Reset password</Text>
            </View>

            <View style={{ width: 26 }} />
          </View>

          {/* ---------- MESSAGE ---------- */}
          <Text className="text-center text-gray-600 mt-6">
            We will email you{"\n"}a link to reset your PIN.
          </Text>

          {/* ---------- EMAIL INPUT ---------- */}
          <View className="mt-10">
            <Text className="text-gray-700 mb-1">Email</Text>

            <TextInput
              placeholder="example@example"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              className="border border-gray-300 rounded-lg px-4 py-3"
              keyboardType="email-address"
              style={{ color: "#000000" }}
            />

            {error ? (
              <Text className="text-red-500 text-xs mt-1">{error}</Text>
            ) : null}
          </View>

          {/* ---------- SEND BUTTON ---------- */}
          <TouchableOpacity
            onPress={() => navigation.navigate("ResetPasswordSent")}
            disabled={!isValid}
            className={`w-full py-4 rounded-xl mt-6 border-2 ${
              buttonFilled
                ? "bg-indigo-600 border-indigo-600"
                : "bg-indigo-100 border-indigo-200"
            }`}
            accessibilityState={{ disabled: !isValid }}
          >
            <Text
              className={`text-center font-semibold text-lg ${
                buttonFilled ? "text-white" : "text-indigo-800"
              }`}
            >
              Send
            </Text>
          </TouchableOpacity>
        </View>

        {/* ---------- FOOTER ---------- */}
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
