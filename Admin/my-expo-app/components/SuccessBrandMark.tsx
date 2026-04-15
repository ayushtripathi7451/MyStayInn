import React from "react";
import { View, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

/** Same logo + blue treatment as {@link SplashScreen} (compact for success flows). */
export default function SuccessBrandMark() {
  return (
    <View className="items-center justify-center">
      <LinearGradient
        colors={["#5A6BFF", "#002DCC"]}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: 152,
          height: 152,
          borderRadius: 28,
          alignItems: "center",
          justifyContent: "center",
          padding: 14,
        }}
      >
        <Image
          source={require("../assets/my-stay-logo.png")}
          style={{ width: 120, height: 120, resizeMode: "contain" }}
          accessibilityLabel="MyStayInn logo"
        />
      </LinearGradient>
    </View>
  );
}
