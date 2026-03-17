import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Keyboard,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import auth from "@react-native-firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../utils/api";
import { setConfirmation } from "../utils/firebaseConfirmation";

export default function MobileOTPLoginScreen({ navigation }: any) {
  const mobileRef = useRef<TextInput>(null);
  const otpRef = useRef<TextInput>(null);

  const [countryCode, setCountryCode] = useState("+91");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmationState] = useState<any>(null);
  const [firstName, setFirstName] = useState("User");

  useEffect(() => {
    // Fetch user's first name from AsyncStorage
    const getUserName = async () => {
      try {
        const userData = await AsyncStorage.getItem("userData");
        if (userData) {
          const user = JSON.parse(userData);
          setFirstName(user.firstName || "User");
        }
      } catch (error) {
        console.error("Error fetching user name:", error);
      }
    };

    getUserName();
  }, []);

  useEffect(() => {
    let interval: any;
    if (step === "otp" && timer > 0) {
      interval = setInterval(() => {
        setTimer((p) => p - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer, step]);

  const sendOTP = async () => {
    if (mobile.length !== 10) {
      Alert.alert("Invalid Number", "Enter valid 10-digit mobile number");
      return;
    }

    try {
      setLoading(true);
      const fullPhoneNumber = `${countryCode}${mobile}`;

      // Send OTP via Firebase
      const confirmationResult = await auth().signInWithPhoneNumber(fullPhoneNumber);
      setConfirmationState(confirmationResult);
      setConfirmation(confirmationResult);

      Alert.alert("OTP Sent!", `OTP sent to ${fullPhoneNumber}`);
      
      Keyboard.dismiss();
      setStep("otp");
      setTimer(30);
      setCanResend(false);
      setTimeout(() => otpRef.current?.focus(), 500);
    } catch (error: any) {
      console.log("OTP ERROR:", error);
      
      let friendlyMessage = "Failed to send OTP. Please try again.";
      
      if (error.code === 'auth/captcha-check-failed') {
        friendlyMessage = "Safety check failed. Please try again.";
      } else if (error.code === 'auth/invalid-phone-number') {
        friendlyMessage = "The phone number format is incorrect.";
      } else if (error.code === 'auth/too-many-requests') {
        friendlyMessage = "Too many attempts. Please try again later.";
      }

      Alert.alert("Error", friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert("Invalid OTP", "Enter 6 digit OTP");
      return;
    }

    try {
      setLoading(true);

      // 1. Verify OTP with Firebase
      const userCredential = await confirmation.confirm(otp);

      // 2. Get Firebase ID Token
      const firebaseIdToken = await userCredential.user.getIdToken();

      // 3. Login to backend
      const response = await api.post("/api/auth/login/firebase", {
        firebaseIdToken,
        appType: "customer",
      });

      const data = response.data;

      // 4. Store JWT token and user data
      await AsyncStorage.setItem("USER_TOKEN", data.token);
      await AsyncStorage.setItem("userData", JSON.stringify(data.user));

      // 5. Register for push notifications (FCM token to backend)
      const { registerPushNotifications } = await import("../utils/pushNotifications");
      const user = data.user;
      if (user?.id != null || user?.uniqueId) {
        registerPushNotifications().catch(() => {});
      }

      // 6. Navigate to MPIN login screen
      navigation.reset({
        index: 0,
        routes: [{ name: "LoginPin" }],
      });
    } catch (error: any) {
      console.error("Login Error:", error);
      
      // Handle specific error cases
      if (error.response?.status === 403) {
        // Wrong app type or inactive account
        const correctAppType = error.response?.data?.correctAppType;
        if (correctAppType) {
          const correctApp = correctAppType === 'admin' ? 'Admin' : 'Customer';
          Alert.alert(
            'Wrong App', 
            `This account is registered for ${correctApp} app. Please use the correct app to login.`
          );
        } else {
          Alert.alert('Error', error.response?.data?.message || 'Access denied.');
        }
      } else if (error.response?.status === 404) {
        Alert.alert('Account Not Found', 'No account found with this phone number. Please register first.');
      } else {
        const errorMessage = error.response?.data?.message || error.message || "Invalid OTP or login failed.";
        Alert.alert("Error", errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    try {
      setLoading(true);
      const fullPhoneNumber = `${countryCode}${mobile}`;
      
      const confirmationResult = await auth().signInWithPhoneNumber(fullPhoneNumber);
      setConfirmationState(confirmationResult);
      setConfirmation(confirmationResult);
      
      setTimer(30);
      setCanResend(false);
      setOtp("");
      Alert.alert("OTP Resent", "A new OTP has been sent to your phone");
    } catch (error: any) {
      console.error("Resend OTP Error:", error);
      Alert.alert("Error", "Failed to resend OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#6D7BFF", "#0040FF"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* ✅ KeyboardAvoidingView is essential for iPhone */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={{ flexGrow: 1 }} 
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ✅ TITLE CARD */}
            <View className="mx-6 rounded-[30px] p-6 mt-10 bg-white shadow-lg">
              <Text className="text-[26px] font-semibold mb-2 text-black">
                {step === "mobile" ? `Welcome Back, ${firstName} 👋` : "Verify OTP"}
              </Text>
              <Text className="text-gray-500 text-[14px]">
                {step === "mobile"
                  ? "Login using your Mobile Number"
                  : `OTP sent to ${countryCode} ${mobile}`}
              </Text>
            </View>

            {/* ✅ MAIN CONTAINER */}
            <View className="flex-1 items-center w-full mt-8 px-4">
              
              {/* ✅ GLASS CARD */}
              <View
                className="p-8 w-full rounded-[32px]"
                style={{
                  backgroundColor: "rgba(255,255,255,0.15)",
                  borderWidth: 1.5,
                  borderColor: "rgba(255,255,255,0.5)",
                  zIndex: 10, // Ensure card is above background
                }}
              >
                {step === "mobile" ? (
                  <>
                    {/* ✅ MOBILE INPUT CONTAINER */}
<View 
  className="flex-row items-center border-2 border-white rounded-2xl mb-6 overflow-hidden bg-white/10"
  style={{ height: 60 }} // Explicit height helps iOS vertical centering
>

  {/* COUNTRY CODE */}
  <View className="h-full justify-center border-r border-white">
    <TextInput
      value={countryCode}
      onChangeText={(t) => setCountryCode(t.replace(/[^+0-9]/g, ""))}
      keyboardType="phone-pad"
      className="px-4 text-white text-xl font-bold"
      style={{
        textAlign: "center",
        minWidth: 70,
        paddingTop: 0,    // Removes default iOS padding
        paddingBottom: 0  // Removes default iOS padding
      }}
    />
  </View>

  {/* MOBILE NUMBER */}
  <TextInput
    ref={mobileRef}
    value={mobile}
    onChangeText={(t) => setMobile(t.replace(/[^0-9]/g, "").slice(0, 10))}
    keyboardType="number-pad"
    maxLength={10}
    placeholder="Mobile number"
    placeholderTextColor="rgba(255,255,255,0.6)"
    className="flex-1 px-4 text-white text-xl font-medium"
    style={{ 
      textAlignVertical: "center", 
      paddingTop: 0,               
      paddingBottom: 0,            
      height: '100%'               
    }}
  />
</View>
                    <TouchableOpacity 
                      onPress={sendOTP} 
                      disabled={loading}
                      className={`py-4 rounded-full shadow-md ${loading ? "bg-white/60" : "bg-white"}`}
                    >
                      {loading ? (
                        <ActivityIndicator color="#0040FF" />
                      ) : (
                        <Text className="text-blue-600 text-center font-bold text-[18px]">Send OTP</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text className="text-white text-center mb-4 font-medium">Enter 6-digit OTP</Text>
                    <TextInput
                      ref={otpRef}
                      value={otp}
                      onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, "").slice(0, 6))}
                      keyboardType="number-pad"
                      maxLength={6}
                      className="bg-white/10 border-2 border-white text-white text-2xl rounded-xl px-4 py-3 mb-5 text-center tracking-[10px]"
                      placeholder="••••••"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                    />
                    <View className="items-center mb-6">
                      {!canResend ? (
                        <Text className="text-white/80 text-sm">
                          Resend OTP in <Text className="font-bold text-white">00:{timer < 10 ? `0${timer}` : timer}</Text>
                        </Text>
                      ) : (
                        <TouchableOpacity onPress={resendOTP} disabled={loading}>
                          <Text className="text-white font-bold text-base underline">Resend OTP</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <TouchableOpacity 
                      onPress={handleVerifyOTP} 
                      disabled={otp.length < 6 || loading}
                      className={`py-4 rounded-full flex-row justify-center items-center ${otp.length === 6 && !loading ? "bg-white" : "bg-white/40"}`}
                    >
                      {loading && <ActivityIndicator color="#0040FF" className="mr-2" />}
                      <Text className="text-blue-600 text-center font-bold text-[18px]">
                        {loading ? "Verifying..." : "Verify & Login"}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {/* ✅ BACKGROUND TEXT + IMAGE (Repositioned for iOS) */}
              <View className="w-full mt-10 items-center">
                <View className="w-full px-4">
                  <Text className="text-white text-[38px] font-bold leading-tight">
                    My Stay{"\n"}My Life
                  </Text>
                </View>
                <Image
                  source={require("../assets/Group 918.png")}
                  style={{ width: 300, height: 200, marginTop: 10 }}
                  resizeMode="contain"
                />
              </View>

            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}