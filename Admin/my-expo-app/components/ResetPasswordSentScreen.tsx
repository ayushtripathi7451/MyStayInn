import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ResetEmailIcon from "./ResetEmailIcon";

export default function ResetPasswordSentScreen({ navigation }: any) {
  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      
      {/* Split top + bottom */}
      <View className="flex-1 justify-between">

        {/* TOP CONTENT */}
        <View>

          {/* HEADER */}
          <View className="flex-row items-center mt-4">
            {/* Back Button */}
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={26} color="black" />
            </TouchableOpacity>

            {/* Centered Title */}
            <View className="flex-1 items-center -ml-6">
              <Text className="text-xl font-semibold">Reset password</Text>
            </View>

            {/* Right Spacer */}
            <View style={{ width: 26 }} />
          </View>

          {/* ICON */}
          <View className="items-center mt-12 mb-8">
            <ResetEmailIcon />
          </View>

          {/* MESSAGE TEXT */}
          <Text className="text-center text-gray-700 text-lg px-6">
            We have sent an email{"\n"}
            to <Text className="font-semibold text-black">sarah.jansen@gmail.com</Text>{" "}
            with instructions{"\n"}
            to reset your password.
          </Text>

          {/* BUTTON */}
          <TouchableOpacity
            onPress={() => navigation.navigate("LoginPin")}
            className="bg-indigo-600 py-4 rounded-xl mt-10"
          >
            <Text className="text-center text-white font-semibold text-lg">
              Back to login
            </Text>
          </TouchableOpacity>
        </View>

        {/* FOOTER */}
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
