import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Animated } from "react-native";


export default function CreatePasswordScreen({ navigation }: any) {
  const [show, setShow] = useState(false);
  const [password, setPassword] = useState("");
  const progress = useState(new Animated.Value(0))[0];

  // Password Validation Rules
  const isMin = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  // Strength Score
  const score = [isMin, hasNumber, hasSymbol].filter(Boolean).length;

  const getStrengthColor = () => {
    if (score === 0) return "bg-red-500";
    if (score === 1) return "bg-red-500";
    if (score === 2) return "bg-yellow-500";
    if (score === 3) return "bg-green-500";
    return "bg-gray-300";
  };

  const isValid = score === 3;

  React.useEffect(() => {
  const percent = (score / 3) * 100;

  Animated.timing(progress, {
    toValue: percent,
    duration: 350,
    useNativeDriver: false,
  }).start();
}, [score]);

const width = progress.interpolate({
  inputRange: [0, 100],
  outputRange: ["0%", "100%"],
});


  return (
    <SafeAreaView className="flex-1 bg-white px-6">

      {/* SPLIT TOP + BOTTOM */}
      <View className="flex-1 justify-between">

        {/* TOP */}
        <View>

          {/* HEADER WITH CENTERED TITLE */}
          <View className="flex-row items-center mt-4">
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={26} color="black" />
            </TouchableOpacity>

            <View className="flex-1 items-center">
              <Text className="text-xl font-semibold">
                Create your password 3 / 3
              </Text>
            </View>

            {/* Spacer for centering */}
            <View style={{ width: 26 }} />
          </View>

          {/* PROGRESS BAR */}
          <View className="flex-row justify-center mt-3 mb-8">
            <View className="w-6 h-1.5 bg-purple-500 rounded-full mx-1" />
            <View className="w-6 h-1.5 bg-purple-500 rounded-full mx-1" />
            <View className="w-10 h-1.5 bg-purple-500 rounded-full mx-1" />
          </View>

          {/* PASSWORD LABEL */}
          <Text className="text-gray-700 mb-2">Password</Text>

          {/* INPUT FIELD */}
          <View className="border border-gray-300 w-full rounded-lg flex-row items-center px-3">
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!show}
              placeholder="Enter password"
              className="flex-1 py-3"
            />

            <TouchableOpacity onPress={() => setShow(!show)} className="p-2">
              <Ionicons
                name={show ? "eye" : "eye-off"}
                size={22}
                color="gray"
              />
            </TouchableOpacity>
          </View>

          {/* PASSWORD STRENGTH BAR */}
          <View className="w-full h-[7px] bg-gray-200 rounded-full mt-3 overflow-hidden">
  <Animated.View
    style={{
      width: width,
      height: 7,
      borderRadius: 4,
      backgroundColor:
        score === 0 ? "transparent" :
        score === 1 ? "red" :
        score === 2 ? "orange" :
        "green",
    }}
  />
</View>

          {/* REQUIREMENTS */}
          <View className="mt-4 space-y-3">

            <View className="flex-row items-center">
              <Ionicons
                name={isMin ? "checkmark-circle" : "ellipse-outline"}
                size={18}
                color={isMin ? "green" : "gray"}
                style={{ marginRight: 10 }}
              />
              <Text className={isMin ? "text-green-600" : "text-gray-700"}>
                8 characters minimum
              </Text>
            </View>

            <View className="flex-row items-center">
              <Ionicons
                name={hasNumber ? "checkmark-circle" : "ellipse-outline"}
                size={18}
                color={hasNumber ? "green" : "gray"}
                style={{ marginRight: 10 }}
              />
              <Text className={hasNumber ? "text-green-600" : "text-gray-700"}>
                a number
              </Text>
            </View>

            <View className="flex-row items-center">
              <Ionicons
                name={hasSymbol ? "checkmark-circle" : "ellipse-outline"}
                size={18}
                color={hasSymbol ? "green" : "gray"}
                style={{ marginRight: 10 }}
              />
              <Text className={hasSymbol ? "text-green-600" : "text-gray-700"}>
                a symbol
              </Text>
            </View>

          </View>

          {/* CONTINUE BUTTON */}
          <TouchableOpacity
            disabled={!isValid}
            onPress={() => navigation.navigate("Success")}
            className={`w-full py-4 rounded-xl mt-10 ${
              isValid ? "bg-purple-500" : "bg-purple-300"
            }`}
          >
            <Text className="text-center text-white font-semibold text-lg">
              Continue
            </Text>
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
