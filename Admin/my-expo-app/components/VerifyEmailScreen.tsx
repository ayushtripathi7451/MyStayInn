import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../utils/api";
import { getConfirmation, clearConfirmation } from "../utils/firebaseConfirmation";
import auth from "@react-native-firebase/auth";

export default function VerifyEmailScreen({ navigation, route }: any) {
  // Get user data from route params (confirmation comes from helper)
  const { mobile, first, last, gender, email } = route.params || {};
  
  // Get confirmation from helper
  const confirmation = getConfirmation();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);

  // Refs for focusing next/previous input
  const inputs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  // Handle individual digit change
  const handleChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto focus next input
    if (text && index < 5) {
      inputs[index + 1].current?.focus();
    }
  };

  // Handle backspace navigation
  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && otp[index] === "" && index > 0) {
      inputs[index - 1].current?.focus();
    }
  };

  const isValid = otp.every((digit) => digit !== "");

  // Timer logic for Resend OTP
  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((t) => t - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Focus first input on mount
  useEffect(() => {
    setTimeout(() => inputs[0].current?.focus(), 100);
  }, []);

  // Check if confirmation exists on mount
  useEffect(() => {
    if (!confirmation) {
      Alert.alert(
        "Session Expired",
        "Please go back and request OTP again.",
        [
          { 
            text: "OK", 
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: "Signup" }],
              });
            }
          }
        ]
      );
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (!cleaningUp) {
        clearConfirmation();
      }
    };
  }, []);

  const verifyOTP = async () => {
    if (!isValid) {
      return Alert.alert("Wait", "Please enter the full 6-digit code.");
    }

    if (!confirmation) {
      Alert.alert("Error", "Session expired. Please request OTP again.");
      navigation.reset({
        index: 0,
        routes: [{ name: "Signup" }],
      });
      return;
    }

    try {
      setLoading(true);
      const otpString = otp.join("");

      // 1. Confirm OTP with Firebase
      const userCredential = await confirmation.confirm(otpString);

      // 2. Get the secure ID Token
      const firebaseIdToken = await userCredential.user.getIdToken();

      // 3. Register on your Admin Backend using api.ts
      const response = await api.post("/api/auth/register/admin", {
        firstName: first,
        lastName: last,
        phone: mobile,
        email,
        gender,
        firebaseIdToken,
      });

      const data = response.data;

      // 4. Store your JWT token (both keys for compatibility)
      await AsyncStorage.setItem("USER_TOKEN", data.token);
      await AsyncStorage.setItem("authToken", data.token);
      await AsyncStorage.setItem("userData", JSON.stringify(data.user));
      await AsyncStorage.setItem(
        "userProfile",
        JSON.stringify({ first, last, mobile, email })
      );

      // Clear confirmation after successful verification
      clearConfirmation();

      Alert.alert("Success", "Welcome to My-Stay! 🎉");

      navigation.reset({
        index: 0,
        routes: [{ name: "CreateMPINScreen" }],
      });
    } catch (error: any) {
      console.error("Verification Error:", error);
      
      let errorMessage = "Invalid OTP or registration failed.";
      
      if (error.code === 'auth/invalid-verification-code') {
        errorMessage = "Invalid OTP. Please check and try again.";
      } else if (error.code === 'auth/session-expired') {
        errorMessage = "OTP session expired. Please request a new code.";
        clearConfirmation();
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: "Signup" }],
          });
        }, 1500);
      } else {
        errorMessage = error.response?.data?.message || error.message || "Invalid OTP or registration failed.";
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    try {
      setLoading(true);
      
      // Clear old confirmation
      clearConfirmation();
      
      // Sign out any existing user
      const currentUser = auth().currentUser;
      if (currentUser) {
        await auth().signOut();
      }
      
      // Wait a moment for Firebase to settle
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Send new OTP
      const newConfirmation = await auth().signInWithPhoneNumber(mobile);
      
      // Store new confirmation
      const { setConfirmation } = require("../utils/firebaseConfirmation");
      setConfirmation(newConfirmation);
      
      // Reset UI
      setTimer(30);
      setCanResend(false);
      setOtp(["", "", "", "", "", ""]);
      inputs[0].current?.focus();
      
      Alert.alert("OTP Resent", "A new OTP has been sent to your phone");
    } catch (error: any) {
      console.error("Resend OTP Error:", error);
      
      let friendlyMessage = "Failed to resend OTP. Please try again.";
      
      if (error.code === 'auth/too-many-requests') {
        friendlyMessage = "Too many attempts. Please wait a few minutes and try again.";
      } else if (error.code === 'auth/invalid-phone-number') {
        friendlyMessage = "Invalid phone number. Please go back and check.";
      } else if (error.code === 'auth/quota-exceeded') {
        friendlyMessage = "SMS quota exceeded. Please try again later.";
      }
      
      Alert.alert("Error", friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle back button press - go directly to Signup
  const handleBackPress = () => {
    setCleaningUp(true);
    clearConfirmation();
    navigation.reset({
      index: 0,
      routes: [{ name: "Signup" }],
    });
  };

  // Handle change number - go directly to Signup
  const handleChangeNumber = () => {
    setCleaningUp(true);
    clearConfirmation();
    navigation.reset({
      index: 0,
      routes: [{ name: "Signup" }],
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView 
             showsVerticalScrollIndicator={false}
             contentContainerStyle={{ paddingBottom: 140 }}
          >
            {/* HEADER */}
            <View className="flex-row items-center mt-4">
              <TouchableOpacity onPress={handleBackPress}>
                <Ionicons name="chevron-back" size={26} color="black" />
              </TouchableOpacity>

              <View className="flex-1 items-center">
                <Text className="text-xl font-semibold">
                  Verify your Mobile Number 2 / 3
                </Text>
              </View>

              <View style={{ width: 26 }} />
            </View>

            {/* PROGRESS BAR */}
            <View className="flex-row justify-center mt-3">
              <View className="w-6 h-1.5 bg-purple-500 rounded-full mx-1" />
              <View className="w-10 h-1.5 bg-purple-500 rounded-full mx-1" />
              <View className="w-6 h-1.5 bg-gray-300 rounded-full mx-1" />
            </View>

            {/* INFO TEXT */}
            <Text className="text-gray-700 mt-8 mb-4">
              We have sent a 6-digit code to{" "}
              <Text className="font-semibold">{mobile}</Text>, enter it below:
            </Text>

            {/* OTP INPUTS */}
            <View className="flex-row justify-between mb-6">
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={inputs[i]}
                  value={digit}
                  keyboardType="number-pad"
                  maxLength={1}
                  onChangeText={(t) => handleChange(t, i)}
                  onKeyPress={(e) => handleKeyPress(e, i)}
                  className="w-12 h-14 border border-gray-300 rounded-lg text-center text-xl font-semibold focus:border-purple-600"
                />
              ))}
            </View>

            {/* TIMER */}
            <View className="items-center mb-6">
              {!canResend ? (
                <Text className="text-gray-500">
                  Resend OTP in{" "}
                  <Text className="font-semibold text-purple-700">
                    00:{timer < 10 ? `0${timer}` : timer}
                  </Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={resendOTP} disabled={loading}>
                  <Text className="text-purple-700 font-semibold">
                    Resend OTP
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* VERIFY BUTTON */}
            <TouchableOpacity
              disabled={!isValid || loading}
              onPress={verifyOTP}
              className={`py-4 rounded-xl flex-row justify-center items-center ${
                isValid && !loading ? "bg-purple-600" : "bg-purple-300"
              }`}
            >
              {loading && <ActivityIndicator color="white" className="mr-2" />}
              <Text className="text-center text-white font-semibold text-lg">
                {loading ? "Verifying..." : "Verify OTP"}
              </Text>
            </TouchableOpacity>

            {/* CHANGE NUMBER */}
            {/* <Text className="text-center text-base mt-4">
              To update Mobile Number.{" "}
              <Text
                className="font-semibold text-purple-700"
                onPress={handleChangeNumber}
              >
                Click here
              </Text>
            </Text> */}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* FOOTER */}
        <View className="absolute bottom-4 left-0 right-0 items-center">
          <Text className="text-center text-gray-600 text-sm w-[300px]">
            By using MyStayInn, you agree to the{" "}
            <Text className="font-semibold text-gray-700">Terms</Text> and{" "}
            <Text className="font-semibold text-gray-700">
              Privacy Policy
            </Text>.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}