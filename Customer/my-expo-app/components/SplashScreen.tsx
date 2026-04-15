import React, { useEffect, useRef } from "react";
import {
  View,
  Image,
  Animated,
  Dimensions,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { replaceSplashWithDestination } from "../utils/navigationRef";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

export default function SplashScreen() {

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ✅ DARK + FAST RIPPLE VALUES
  const pulse1 = useRef(new Animated.Value(0.15)).current;
  const pulse2 = useRef(new Animated.Value(0.15)).current;
  const pulse3 = useRef(new Animated.Value(0.15)).current;

  useEffect(() => {
    // ✅ LOGO FADE IN
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500, // faster
      useNativeDriver: true,
    }).start();

    // ✅ FAST CONTINUOUS RIPPLE LOOP
    const rippleLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse1, {
            toValue: 0.45,
            duration: 400,
            useNativeDriver: false,
          }),
          Animated.timing(pulse1, {
            toValue: 0.15,
            duration: 400,
            useNativeDriver: false,
          }),
        ]),

        Animated.sequence([
          Animated.delay(120),
          Animated.timing(pulse2, {
            toValue: 0.4,
            duration: 400,
            useNativeDriver: false,
          }),
          Animated.timing(pulse2, {
            toValue: 0.15,
            duration: 400,
            useNativeDriver: false,
          }),
        ]),

        Animated.sequence([
          Animated.delay(240),
          Animated.timing(pulse3, {
            toValue: 0.35,
            duration: 400,
            useNativeDriver: false,
          }),
          Animated.timing(pulse3, {
            toValue: 0.15,
            duration: 400,
            useNativeDriver: false,
          }),
        ]),
      ])
    );

    rippleLoop.start();

    // ✅ CHECK IF USER IS LOGGED IN
    const checkAuthAndNavigate = async () => {
      try {
        const token = await AsyncStorage.getItem("USER_TOKEN");
        
        // If user has a token, go directly to PIN screen
        // Otherwise, go to Welcome screen
        const destination = token ? "LoginPin" : "Welcome";
        
        setTimeout(() => {
          replaceSplashWithDestination(destination);
        }, 1800); // faster transition
      } catch (error) {
        console.error("Error checking auth:", error);
        // On error, default to Welcome screen
        setTimeout(() => {
          replaceSplashWithDestination("Welcome");
        }, 1800);
      }
    };

    checkAuthAndNavigate();

    return () => {
      rippleLoop.stop();
    };
  }, []);

  return (
    <LinearGradient
      colors={["#5A6BFF", "#002DCC"]} // ✅ darker background
      start={{ x: 0.1, y: 0.1 }}
      end={{ x: 1, y: 1 }}
      className="flex-1 justify-center items-center"
    >
      {/* ✅ DARK FAST RIPPLE */}
      <View style={StyleSheet.absoluteFill}>

        <Animated.View
          style={[circle(100), { opacity: pulse1, borderColor: "#FFFFFF" }]}
        />

        <Animated.View
          style={[circle(180), { opacity: pulse2, borderColor: "#FFFFFF" }]}
        />

        <Animated.View
          style={[circle(260), { opacity: pulse3, borderColor: "#FFFFFF" }]}
        />

      </View>

      {/* ✅ LOGO */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <Image
          source={require("../assets/my-stay-logo.png")}
          style={{ width: 160, height: 160, resizeMode: "contain" }}
        />
      </Animated.View>
    </LinearGradient>
  );
}

/* ✅ CIRCLE FACTORY */
const circle = (size: number) => ({
  position: "absolute" as const,
  top: SCREEN_H / 2 - size / 2,
  left: SCREEN_W / 2 - size / 2,
  width: size,
  height: size,
  borderWidth: 1,   // ✅ thicker for darker effect
  borderRadius: size / 2,
});
