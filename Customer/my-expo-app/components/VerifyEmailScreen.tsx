import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
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

export default function VerifyEmailScreen({ navigation, route }) {
  // Get user data from route params
  const { mobile, first, last, gender, email } = route.params || {};
  
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [missingSession, setMissingSession] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");

  // Clean up when navigating back
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', async (e) => {
      // Prevent default back behavior if we want to redirect
      if (e.data.action.type === 'GO_BACK') {
        e.preventDefault();
        
        // Navigate directly to Signup screen
        navigation.reset({
          index: 0,
          routes: [{ name: "Signup" }],
        });
      }
      
      // Clear confirmation when going back
      clearConfirmation();
      
      // Sign out any anonymous user
      const currentUser = auth().currentUser;
      if (currentUser && (!currentUser.email || currentUser.isAnonymous)) {
        await auth().signOut();
      }
    });
    
    return unsubscribe;
  }, [navigation]);

  // Check if confirmation exists on mount
  useEffect(() => {
    if (!getConfirmation()) {
      setMissingSession(true);
    }
  }, []);

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
  const handleChange = (text, index) => {
    setOtpError("");
    setResendMessage("");
    const newOtp = [...otp];
    newOtp[index] = String(text).replace(/[^0-9]/g, "").slice(0, 1);
    setOtp(newOtp);

    // Auto focus next input
    if (newOtp[index] && index < 5) {
      inputs[index + 1].current?.focus();
    }
  };

  // Handle backspace navigation
  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && otp[index] === "" && index > 0) {
      inputs[index - 1].current?.focus();
    }
  };

  const isValid = otp.every((digit) => digit !== "");
  const buttonFilled = isValid || loading;

  // Timer logic for Resend OTP
  useEffect(() => {
    let interval;
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

  const verifyOTP = async () => {
    setOtpError("");
    setResendMessage("");
    if (!isValid) {
      setOtpError("Please enter the full 6-digit code.");
      return;
    }

    const liveConfirmation = getConfirmation();
    if (!liveConfirmation) {
      setOtpError("Session expired. Go back and request a new OTP.");
      return;
    }

    try {
      setLoading(true);
      const otpString = otp.join("");

      // 1. Confirm OTP with Firebase
      const userCredential = await liveConfirmation.confirm(otpString);

      // 2. Get the secure ID Token
      const firebaseIdToken = await userCredential.user.getIdToken();

      // 3. Register on Customer Backend
      const response = await api.post("/api/auth/register/customer", {
        firstName: first,
        lastName: last,
        phone: mobile,
        email,
        gender,
        firebaseIdToken,
      });

      const data = response.data;

      // 4. Store JWT token (clear previous account first — avoids stale Redux / AsyncStorage)
      const { resetClientStateBeforeNewSession } = await import("../utils/sessionStorage");
      await resetClientStateBeforeNewSession();
      await AsyncStorage.setItem("USER_TOKEN", data.token);
      await AsyncStorage.setItem("userData", JSON.stringify(data.user));
      await AsyncStorage.setItem(
        "userProfile",
        JSON.stringify({ first, last, mobile, email })
      );

      // Clear confirmation after successful verification
      clearConfirmation();

      navigation.reset({
        index: 0,
        routes: [{ name: "CreateMPINScreen" }],
      });
    } catch (error: any) {
      console.error("Verification Error:", error);
      
      // Log validation errors array from backend if present
      const resData = error.response?.data;
      if (resData?.errors) {
        console.error("Backend validation errors:", JSON.stringify(resData.errors, null, 2));
      }
      
      let errorMessage = "Invalid OTP or registration failed.";
      
      // Handle Firebase specific errors
      if (error?.code === 'auth/invalid-verification-code') {
        errorMessage = "Invalid OTP. Check the code and try again.";
      } else if (error?.code === 'auth/session-expired') {
        errorMessage = "OTP session expired. Request a new code from the previous screen.";
        clearConfirmation();
      } else {
        errorMessage = resData?.message ||
                      (resData?.errors?.[0]?.msg) ||
                      error.message ||
                      "Invalid OTP or registration failed.";
      }
      
      setOtpError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    setResendError("");
    setResendMessage("");
    try {
      setLoading(true);
      
      // Clear old confirmation
      clearConfirmation();
      
      // Sign out any existing user
      const currentUser = auth().currentUser;
      if (currentUser) {
        await auth().signOut();
      }
      
      // Small delay to ensure clean state
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Send new OTP
      const newConfirmation = await auth().signInWithPhoneNumber(mobile, true);
      
      // Store new confirmation
      const { setConfirmation } = require("../utils/firebaseConfirmation");
      setConfirmation(newConfirmation);
      
      // Reset UI
      setTimer(30);
      setCanResend(false);
      setOtp(["", "", "", "", "", ""]);
      inputs[0].current?.focus();
      
      setResendMessage("A new OTP has been sent to your phone.");
    } catch (error: any) {
      console.error("Resend OTP Error:", error);
      
      let friendlyMessage = "Failed to resend OTP. Please try again.";
      
      if (error?.code === 'auth/too-many-requests') {
        friendlyMessage = "Too many attempts. Please wait a few minutes and try again.";
      } else if (error?.code === 'auth/invalid-phone-number') {
        friendlyMessage = "Invalid phone number. Please go back and check.";
      } else if (error?.code === 'auth/quota-exceeded') {
        friendlyMessage = "SMS quota exceeded. Please try again later.";
      }
      
      setResendError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  if (missingSession) {
    return (
      <SafeAreaView className="flex-1 bg-white px-6 justify-center">
        <Text className="text-lg font-semibold text-gray-900 text-center mb-2">
          Session expired
        </Text>
        <Text className="text-gray-600 text-center mb-6">
          Request OTP again from the sign-up screen.
        </Text>
        <TouchableOpacity
          onPress={() =>
            navigation.reset({ index: 0, routes: [{ name: "Signup" }] })
          }
          className="bg-indigo-600 py-4 rounded-xl"
        >
          <Text className="text-center text-white font-semibold">Back to sign up</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

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
              <TouchableOpacity 
                onPress={() => {
                  // Navigate directly to Signup when back button is pressed
                  navigation.reset({
                    index: 0,
                    routes: [{ name: "Signup" }],
                  });
                }}
              >
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
              <View className="w-6 h-1.5 bg-indigo-500 rounded-full mx-1" />
              <View className="w-10 h-1.5 bg-indigo-500 rounded-full mx-1" />
              <View className="w-6 h-1.5 bg-gray-300 rounded-full mx-1" />
            </View>

            {/* INFO TEXT */}
            <Text className="text-gray-700 mt-8 mb-4">
            Enter 6-digit code sent to{" "}
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
                  className="w-12 h-14 border border-gray-300 rounded-lg text-center text-xl font-semibold focus:border-indigo-600"
                />
              ))}
            </View>

            {otpError ? (
              <Text className="text-red-600 text-sm mb-3" accessibilityLiveRegion="polite">
                {otpError}
              </Text>
            ) : null}
            {resendMessage ? (
              <Text className="text-emerald-700 text-sm mb-3">{resendMessage}</Text>
            ) : null}
            {resendError ? (
              <Text className="text-red-600 text-sm mb-3">{resendError}</Text>
            ) : null}

            {/* TIMER */}
            <View className="items-center mb-6">
              {!canResend ? (
                <Text className="text-gray-500">
                  Resend OTP in{" "}
                  <Text className="font-semibold text-indigo-700">
                    00:{timer < 10 ? `0${timer}` : timer}
                  </Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={resendOTP} disabled={loading}>
                  <Text className="text-indigo-700 font-semibold">
                    Resend OTP
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* VERIFY BUTTON */}
            <TouchableOpacity
              disabled={!isValid || loading}
              onPress={verifyOTP}
              className={`py-4 rounded-xl flex-row justify-center items-center border-2 ${
                buttonFilled
                  ? "bg-indigo-600 border-indigo-600"
                  : "bg-indigo-100 border-indigo-200"
              }`}
              accessibilityState={{ disabled: !isValid || loading }}
            >
              {loading && <ActivityIndicator color="#FFFFFF" className="mr-2" />}
              <Text
                className={`text-center font-semibold text-lg ${
                  buttonFilled ? "text-white" : "text-indigo-800"
                }`}
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </Text>
            </TouchableOpacity>

            {/* CHANGE NUMBER */}
            {/* <Text className="text-center text-base mt-4">
              To update Mobile Number.{" "}
              <Text
                className="font-semibold text-indigo-700"
                onPress={() => {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: "Signup" }],
                  });
                }}
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