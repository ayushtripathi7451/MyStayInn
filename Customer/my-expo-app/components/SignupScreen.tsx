import React from "react";
import { View, Text, TouchableOpacity, Image, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

/* ===================== BUBBLE ===================== */

const Bubble = ({ image, reverse = false, small = false }: any) => {
  const avatarSize = small ? "w-32 h-32" : "w-24 h-24";
  const bubbleOffset = small ? "-ml-6 left-24" : "-ml-6 left-24";

  return (
    <View className={`flex-row items-center ${reverse ? "flex-row-reverse" : ""}`}>
      <Image
        source={image}
        className={`${avatarSize} rounded-full bg-[#ABB0FB]`}
      />

      <View
        className={`
          bg-white rounded-full flex-row items-center shadow-md absolute -top-2
          ${reverse ? "right-24 -mr-10 -top-6" : bubbleOffset}
          px-5 py-3
        `}
      >
        <View className="w-6 h-6 bg-blue-600 rounded-full justify-center items-center mr-3">
          <Text className="text-white text-xs font-bold">✔</Text>
        </View>

        <View>
          <View className="w-12 h-[4px] bg-blue-400 rounded-full mb-1" />
          <View className="w-8 h-[4px] bg-blue-400 rounded-full" />
        </View>
      </View>
    </View>
  );
};

/* ===================== SCREEN ===================== */

export default function SignupScreen({ navigation }: any) {
  return (
    <LinearGradient
      colors={["#6D7BFF", "#0040FF"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }} // ✅ iOS SAFE
    >
      {/* ⬇️ THIS VIEW KEEPS YOUR EXACT DESIGN */}
      <View className="flex-1 px-6">

        {/* ===================== DECORATION ===================== */}
        <View className="absolute inset-0">

          {/* DOTS + HEXAGON */}
          <View className="absolute top-28 left-20 w-3 h-3 bg-white/70 rounded-full" />

          <View className="absolute top-20 left-36">
            <View className="w-3.5 h-3.5 bg-white/80 rotate-45 rounded-[2px]" />
          </View>

          <View className="absolute top-40 left-36 w-2 h-2 bg-white/60 rounded-full" />

          {/* BUBBLES */}
          <View className="absolute top-24 left-80">
            <Bubble image={require("../assets/image1.png")} reverse />
          </View>

          <View className="absolute top-52 left-6">
            <Bubble image={require("../assets/image3.png")} />
          </View>

          <View className="absolute top-80 right-40">
            <Bubble image={require("../assets/image2.png")} small />
          </View>

          {/* CIRCLES */}
          <View style={circle(260)} />
          <View style={circle(180)} />
          <View style={circle(100)} />
        </View>

        {/* ===================== CONTENT ===================== */}
        <View className="flex-1 justify-end pb-28">

          <Text className="text-white text-5xl font-bold mb-2">
            Connect
          </Text>
          <Text className="text-white text-5xl font-bold -mt-1 mb-4">
            with Us
          </Text>

          <Text className="text-white/80 text-[13px]">
            Change your life by slowly adding
          </Text>

          {/* DOT INDICATOR */}
          <View className="flex-row mt-8 mb-4">
            <View className="w-2 h-2 bg-white rounded-full mr-2 opacity-90" />
            <View className="w-2 h-2 bg-white/40 rounded-full ml-2" />
          </View>

          {/* BUTTON */}
          <TouchableOpacity
            onPress={() => navigation.navigate("BasicInfo")}
            className="bg-white w-full py-4 rounded-full mt-8 flex-row justify-center items-center shadow-md"
          >
            <Text className="text-black font-semibold text-lg">
              Create your account
            </Text>
          </TouchableOpacity>

          <Text className="text-white/60 text-sm text-center mt-4 px-4">
            By continuing you agree Terms of Services & Privacy Policy
          </Text>
        </View>

      </View>
    </LinearGradient>
  );
}

/* ===================== CIRCLE ===================== */

const circle = (size: number) => ({
  position: "absolute" as const,
  top: SCREEN_H / 2 - size / 2,
  left: SCREEN_W / 2 - size / 2,
  width: size,
  height: size,
  borderWidth: 1,
  opacity: 0.07,
  borderColor: "white",
  borderRadius: size / 2,
});
