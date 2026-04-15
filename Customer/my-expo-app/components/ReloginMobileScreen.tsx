import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
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
import { getConfirmation, setConfirmation } from "../utils/firebaseConfirmation";
import * as Clipboard from "expo-clipboard";
import { useUser } from "../src/hooks";

export default function MobileOTPLoginScreen({ navigation }: any) {
  const mobileRef = useRef<TextInput>(null);
  const otpRef = useRef<TextInput>(null);
  const { name } = useUser();
  const displayName = name || "User";

  const [countryCode, setCountryCode] = useState("+91");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmationState] = useState<any>(null);
  const lastOtpRef = useRef("");
  const [mobileError, setMobileError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [sendError, setSendError] = useState("");
  const [resendHint, setResendHint] = useState("");

useEffect(() => {
  if (step !== "otp") return;

  const interval = setInterval(async () => {
    try {
      const text = await Clipboard.getStringAsync();
      const match = text.match(/\b\d{6}\b/);
      const code = match?.[0];

      if (!code) return;
      if (code === otp || code === lastOtpRef.current) return;

      lastOtpRef.current = code;
      setOtp(code);
    } catch (e) {}
  }, 1200);

  return () => clearInterval(interval);
}, [step, otp]);

useEffect(() => {
  if (otp.length === 6) {
    handleVerifyOTP();
  }
}, [otp]);

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
    setMobileError("");
    setSendError("");
    setResendHint("");
    if (mobile.length !== 10) {
      setMobileError("Enter a valid 10-digit mobile number.");
      return;
    }

    try {
      setLoading(true);
      const fullPhoneNumber = `${countryCode}${mobile}`;

      // Send OTP via Firebase
      const confirmationResult = await auth().signInWithPhoneNumber(fullPhoneNumber);
      setConfirmationState(confirmationResult);
      setConfirmation(confirmationResult);

      Keyboard.dismiss();
      setStep("otp");
      setResendHint("OTP sent. Enter the code below.");
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

      setSendError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setOtpError("");
    if (otp.length !== 6) {
      setOtpError("Enter the full 6-digit OTP.");
      return;
    }
    const phoneConfirmation = confirmation ?? getConfirmation();
    if (!phoneConfirmation) {
      setOtpError("Session expired. Request OTP again.");
      return;
    }

    try {
      setLoading(true);

      // 1. Verify OTP with Firebase
      const userCredential = await phoneConfirmation.confirm(otp);

      // 2. Get Firebase ID Token
      const firebaseIdToken = await userCredential.user.getIdToken();

      // 3. Login to backend
      const response = await api.post("/api/auth/login/firebase", {
        firebaseIdToken,
        appType: "customer",
      });

      const data = response.data;
      const hasMpinSet = data?.hasMpinSet === true;

      // 4. Store JWT token and user data (clear previous account first)
      const { resetClientStateBeforeNewSession } = await import("../utils/sessionStorage");
      await resetClientStateBeforeNewSession();
      await AsyncStorage.setItem("USER_TOKEN", data.token);
      await AsyncStorage.setItem("userData", JSON.stringify(data.user));

      // 5. Register for push notifications (FCM token to backend)
      const { registerPushNotifications } = await import("../utils/pushNotifications");
      const user = data.user;
      if (user?.id != null || user?.uniqueId) {
        registerPushNotifications().catch(() => {});
      }

      // 6. If MPIN not set, force MPIN creation first
      if (!hasMpinSet) {
        navigation.reset({ index: 0, routes: [{ name: "CreateMPINScreen" }] });
        return;
      }

      // 7. MPIN exists, continue to app
      navigation.reset({ index: 0, routes: [{ name: "CompleteProfile" }] });
    } catch (error: any) {
      console.error("Login Error:", error);

      if (error?.code === "auth/invalid-verification-code") {
        setOtpError("Invalid OTP. Check the code and try again.");
        return;
      }
      if (error?.code === "auth/session-expired") {
        setOtpError("OTP expired. Request a new code.");
        return;
      }
      
      // Handle specific error cases
      if (error.response?.status === 403) {
        const correctAppType = error.response?.data?.correctAppType;
        if (correctAppType) {
          const correctApp = correctAppType === 'admin' ? 'Admin' : 'Customer';
          setOtpError(
            `This account is for the ${correctApp} app. Use the correct app to sign in.`
          );
        } else {
          setOtpError(error.response?.data?.message || 'Access denied.');
        }
      } else if (error.response?.status === 404) {
        setOtpError('No account with this number. Please register first.');
      } else {
        const errorMessage = error.response?.data?.message || error.message || "Invalid OTP or login failed.";
        setOtpError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    setOtpError("");
    setSendError("");
    if (mobile.length !== 10) {
      setSendError("Enter a valid 10-digit mobile number from the previous step.");
      return;
    }
    try {
      setLoading(true);
      const fullPhoneNumber = `${countryCode}${mobile}`;

      // Second arg `true` = forceResend — required or the 2nd call can hang / never send SMS again
      const confirmationResult = await auth().signInWithPhoneNumber(fullPhoneNumber, true);
      setConfirmationState(confirmationResult);
      setConfirmation(confirmationResult);

      Keyboard.dismiss();
      setTimer(30);
      setCanResend(false);
      setOtp("");
      lastOtpRef.current = "";
      setResendHint("A new OTP has been sent.");
    } catch (error: any) {
      console.error("Resend OTP Error:", error);
      let friendlyMessage = "Failed to resend OTP. Please try again.";
      if (error.code === "auth/captcha-check-failed") {
        friendlyMessage = "Safety check failed. Please try again.";
      } else if (error.code === "auth/invalid-phone-number") {
        friendlyMessage = "The phone number format is incorrect.";
      } else if (error.code === "auth/too-many-requests") {
        friendlyMessage = "Too many attempts. Please try again later.";
      }
      setSendError(friendlyMessage);
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
                {step === "mobile" ? `Welcome Back👋` : "Verify OTP"}
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
      onChangeText={(t) => {
                      setCountryCode(t.replace(/[^+0-9]/g, ""));
                      setMobileError("");
                      setSendError("");
                    }}
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
    onChangeText={(t) => {
                    setMobile(t.replace(/[^0-9]/g, "").slice(0, 10));
                    setMobileError("");
                    setSendError("");
                  }}
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
                    {mobileError || sendError ? (
                      <Text className="text-amber-200 text-sm mb-3 text-center" accessibilityLiveRegion="polite">
                        {mobileError || sendError}
                      </Text>
                    ) : null}
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
  onChangeText={(t) => {
    setOtp(t.replace(/[^0-9]/g, "").slice(0, 6));
    setOtpError("");
    setSendError("");
    setResendHint("");
  }}
  keyboardType="number-pad"
  maxLength={6}
  textContentType="oneTimeCode"
  autoComplete="sms-otp"
  importantForAutofill="yes"
  className="bg-white/10 border-2 border-white text-white text-2xl rounded-xl px-4 py-3 mb-5 text-center tracking-[10px]"
  placeholder="••••••"
  placeholderTextColor="rgba(255,255,255,0.5)"
/>
                    {otpError ? (
                      <Text className="text-amber-200 text-sm mb-3 text-center" accessibilityLiveRegion="polite">
                        {otpError}
                      </Text>
                    ) : null}
                    {sendError ? (
                      <Text className="text-amber-200 text-sm mb-3 text-center" accessibilityLiveRegion="polite">
                        {sendError}
                      </Text>
                    ) : null}
                    {resendHint ? (
                      <Text className="text-emerald-200 text-sm mb-3 text-center">{resendHint}</Text>
                    ) : null}
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

              <Text className="text-center mt-6 px-6 text-white/90 text-[14px]">
                Don&apos;t have an account?{" "}
                <Text
                  className="font-bold text-white underline"
                  onPress={() => navigation.navigate("Signup")}
                >
                  Sign up
                </Text>
              </Text>

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