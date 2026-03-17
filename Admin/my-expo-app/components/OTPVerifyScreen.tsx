import React, { useRef, useState, useEffect } from "react";
import { View, Text, TextInput, Image, TouchableOpacity, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";


export default function OTPVerifyScreen({ navigation, route }: any) {
  const { mobile } = route.params;

  const [otp, setOtp] = useState("");
  const inputRef = useRef<TextInput>(null);

  // ✅ TIMER STATES
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // ✅ VERIFY HANDLER
  const handleVerify = () => {
    if (otp.length !== 6) {
      Alert.alert("Invalid OTP", "Enter 6 digit OTP");
      return;
    }

    // ✅ VERIFY OTP API HERE

    navigation.replace("LoginPin"); // SUCCESS LOGIN
  };

  // ✅ TIMER LOGIC
  useEffect(() => {
    let interval: any;

    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }

    return () => clearInterval(interval);
  }, [timer]);

  // ✅ RESET TIMER ON SCREEN LOAD
  useEffect(() => {
    setTimer(30);
    setCanResend(false);
  }, []);

  return (
    <LinearGradient
      colors={["#6D7BFF", "#0040FF"]}
      className="flex-1"
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView className="flex-1 pt-10">

        {/* TOP CARD */}
        <View className="mx-6 rounded-[32px] p-6 mt-20 bg-white">
          <Text className="text-[26px] font-semibold mb-2">Verify OTP</Text>
          <Text className="text-gray-500 text-[14px]">
            OTP sent to +91 {mobile}
          </Text>
        </View>

        <View className="flex-1 justify-start items-center w-full mt-10">

          {/* OTP CARD */}
          <View
            className="mx-4 mb-60 p-8 w-11/12 rounded-[32px] overflow-hidden"
            style={{
              backgroundColor: "rgba(255,255,255,0.12)",
              borderWidth: 1.5,
              borderColor: "rgba(255,255,255,0.55)",
            }}
          >
            <Text className="text-white text-[22px] font-semibold text-center mb-1">
              Enter OTP
            </Text>

            <Text className="text-white/80 text-center text-[14px] mb-6">
              6-digit verification code
            </Text>

            {/* ✅ HIDDEN INPUT */}
            <TextInput
              ref={inputRef}
              value={otp}
              onChangeText={(t) =>
                setOtp(t.replace(/[^0-9]/g, "").slice(0, 6))
              }
              keyboardType="number-pad"
              maxLength={6}
              caretHidden
              style={{ opacity: 0, position: "absolute", top: -100 }}
            />

            {/* OTP DOT VIEW */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => inputRef.current?.focus()}
            >
              <View className="border-b-[2.5px] border-white/80 pb-2 mb-6">
                <Text className="text-white tracking-[10px] text-[30px] text-center">
                  {otp.replace(/./g, "•")}
                </Text>
              </View>
            </TouchableOpacity>

            {/* ✅ RESEND OTP TIMER */}
            <View className="items-center mb-6">
              {!canResend ? (
                <Text className="text-white/80 text-sm">
                  Resend OTP in{" "}
                  <Text className="font-semibold text-white">
                    00:{timer < 10 ? `0${timer}` : timer}
                  </Text>
                </Text>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    setTimer(30);
                    setCanResend(false);
                    setOtp("");
                    inputRef.current?.focus();

                    // ✅ RESEND OTP API HERE
                    console.log("OTP Resent");
                  }}
                >
                  <Text className="text-white font-semibold text-base">
                    Resend OTP
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* VERIFY BUTTON */}
            <TouchableOpacity
              disabled={otp.length < 6}
              onPress={handleVerify}
              className={`py-3 rounded-full ${
                otp.length === 6 ? "bg-white" : "bg-white/60"
              }`}
            >
              <Text className="text-blue-600 text-center font-semibold text-[18px]">
                Verify OTP
              </Text>
            </TouchableOpacity>

          </View>

          {/* ✅ BACKGROUND TEXT + IMAGE */}
          <View
            className="absolute"
            style={{ zIndex: -1, top: 280 }}
          >
            <Text className="text-white text-[40px] mr-40 -mt-2 font-bold leading-tight drop-shadow-lg">
              Manage Everything{"\n"}Digitally
            </Text>

            <Image
              source={require("../assets/Group 918.png")}
              className="w-80 h-56 ml-14"
              resizeMode="contain"
            />
          </View>

        </View>

      </SafeAreaView>
    </LinearGradient>
  );
}
