import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, Keyboard } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, propertyApi, getAuthBearerToken } from "../utils/api";
import { hasUsableProperties } from "../utils/propertyGate";

export default function ChangeMPINScreen({ navigation }: any) {
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const otpRef = useRef<TextInput>(null);
  const [confirmation, setConfirmationState] = useState<any>(null);
  const [firebaseIdToken, setFirebaseIdToken] = useState<string | null>(null);
  const [otpError, setOtpError] = useState("");
  const [mobileError, setMobileError] = useState("");
  const [otpInfo, setOtpInfo] = useState("");
  const [mpinError, setMpinError] = useState("");

  /* ✅ OTP TIMER */
  useEffect(() => {
    let interval: any;

    if (otpSent && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }

    if (timer === 0) {
      setCanResend(true);
    }

    return () => clearInterval(interval);
  }, [otpSent, timer]);

  /* ✅ SEND OTP via Firebase */
  const sendOTP = async () => {
    setMobileError("");
    setOtpError("");
    if (mobile.length !== 10) {
      setMobileError("Enter a valid 10-digit mobile number.");
      return;
    }

    try {
      const fullPhoneNumber = `+91${mobile}`;
      const confirmationResult = await auth().signInWithPhoneNumber(fullPhoneNumber);
      setConfirmationState(confirmationResult);

      setOtpSent(true);
      setOtp("");
      setOtpError("");
      setOtpInfo("OTP sent. Enter the 6-digit code below.");
      setTimer(30);
      setCanResend(false);

      Keyboard.dismiss();
      setTimeout(() => otpRef.current?.focus(), 500);
    } catch (error: any) {
      console.error("Send OTP Error:", error);
      let friendlyMessage = "Failed to send OTP. Please try again.";
      if (error.code === "auth/invalid-phone-number") {
        friendlyMessage = "The phone number format is incorrect.";
      } else if (error.code === "auth/too-many-requests") {
        friendlyMessage = "Too many attempts. Please try again later.";
      }
      if (otpSent) {
        setOtpError(friendlyMessage);
      } else {
        setMobileError(friendlyMessage);
      }
    }
  };

  /* ✅ VERIFY OTP via Firebase (only verifies number & stores firebaseIdToken) */
  const verifyOTP = async () => {
    setOtpError("");
    if (otp.length !== 6) {
      setOtpError("Enter the full 6-digit OTP.");
      return;
    }

    if (!confirmation) {
      setOtpError("Session expired. Request OTP again.");
      return;
    }

    try {
      const userCredential = await confirmation.confirm(otp);
      const token = await userCredential.user.getIdToken();
      setFirebaseIdToken(token);
      setOtpVerified(true);
      setOtpInfo("");
    } catch (error: any) {
      console.error("Verify OTP Error:", error);
      const code = error?.code;
      if (code === "auth/invalid-verification-code") {
        setOtpError("Invalid OTP. Check the code and try again.");
      } else if (code === "auth/session-expired" || code === "auth/code-expired") {
        setOtpError("OTP expired. Request a new code.");
      } else {
        const msg =
          typeof error?.message === "string" && error.message.trim()
            ? error.message
            : "Invalid OTP. Please try again.";
        setOtpError(msg);
      }
    }
  };

  /* ✅ SAVE MPIN (calls backend reset now that OTP/Firebase is verified) */
  const verifyAndSaveMPIN = async () => {
    setMpinError("");
    if (newPin.length !== 4 || confirmPin.length !== 4) {
      setMpinError("MPIN must be exactly 4 digits.");
      return;
    }

    if (newPin !== confirmPin) {
      setMpinError("New MPIN and confirmation do not match.");
      return;
    }
    if (!firebaseIdToken) {
      setMpinError("Phone not verified. Complete the OTP step again.");
      return;
    }

    try {
      const response = await api.post("/api/auth/forgot-pin/firebase-reset", {
        firebaseIdToken,
        newPin,
      });
      if (response.data?.success) {
        const token = await getAuthBearerToken();
        if (!token) {
          navigation.replace("LoginPin");
          return;
        }
        try {
          const propertiesResponse = await propertyApi.get("/api/properties");
          const list = propertiesResponse.data?.properties;
          if (propertiesResponse.data?.success && hasUsableProperties(list)) {
            const arr = list as unknown[];
            const firstProperty =
              arr.find((p) => p != null && typeof p === "object") ?? arr[0];
            await AsyncStorage.setItem(
              "currentProperty",
              JSON.stringify(firstProperty)
            );
            navigation.reset({ index: 0, routes: [{ name: "Home" }] });
          } else {
            navigation.reset({ index: 0, routes: [{ name: "ProfileSetup" }] });
          }
        } catch {
          navigation.reset({ index: 0, routes: [{ name: "ProfileSetup" }] });
        }
      } else {
        setMpinError(response.data?.message || "Failed to change MPIN.");
      }
    } catch (error: any) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to change MPIN. Please try again.";
      setMpinError(msg);
    }
  };

  const isMismatch =
  confirmPin.length > 0 && newPin.slice(0, confirmPin.length) !== confirmPin;


  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      <View className="flex-1">

        {/* HEADER */}
        <View className="flex-row items-center mt-4 mb-10">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={26} color="#000" />
          </TouchableOpacity>

          <View className="flex-1 items-center -ml-6">
            <Text className="text-xl font-semibold">Change MPIN</Text>
          </View>

          <View style={{ width: 26 }} />
        </View>

        {/* ✅ MOBILE */}
        <Text className="text-gray-700 mb-1">Mobile Number</Text>
        <TextInput
          placeholder="Enter 10-digit number"
          placeholderTextColor="#9CA3AF"
          value={mobile}
          onChangeText={(t) => {
            setMobile(t.replace(/[^0-9]/g, "").slice(0, 10));
            setMobileError("");
          }}
          keyboardType="number-pad"
          className={`border border-gray-300 rounded-lg px-4 py-3 ${mobileError ? "mb-2" : "mb-5"}`}
          style={{ color: "#000" }}
        />
        {mobileError ? (
          <Text className="text-red-500 text-sm mb-4">{mobileError}</Text>
        ) : null}

        {/* ✅ SEND OTP */}
        {!otpSent && (
          <TouchableOpacity
            onPress={sendOTP}
            disabled={mobile.length !== 10}
            className="py-4 rounded-xl mb-6"
            style={{
              backgroundColor: "#4F46E5",
              opacity: mobile.length === 10 ? 1 : 0.5,
            }}
          >
            <Text className="text-center text-white font-semibold text-lg">
              Send OTP
            </Text>
          </TouchableOpacity>
        )}

        {/* ✅ OTP INPUT + RESEND */}
        {otpSent && !otpVerified && (
          <>
            <Text className="text-gray-700 mb-1">Enter OTP</Text>
            {otpInfo ? (
              <Text className="text-emerald-600 text-sm mb-2">{otpInfo}</Text>
            ) : null}
            <TextInput
              placeholder="6 digit OTP"
              placeholderTextColor="#9CA3AF"
              value={otp}
              onChangeText={(t) => {
                setOtp(t.replace(/[^0-9]/g, "").slice(0, 6));
                setOtpError("");
              }}
              keyboardType="number-pad"
              className="border border-gray-300 rounded-lg px-4 py-3 mb-3"
              style={{ color: "#000" }}
            />

            {otpError ? (
              <Text className="text-red-500 text-sm mb-3">{otpError}</Text>
            ) : null}

            {!canResend ? (
              <Text className="text-gray-500 mb-4">
                Resend OTP in 00:{timer < 10 ? `0${timer}` : timer}
              </Text>
            ) : (
              <TouchableOpacity onPress={sendOTP}>
                <Text className="text-indigo-600 font-semibold mb-4">
                  Resend OTP
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={verifyOTP}
              disabled={otp.length !== 6}
              className="py-4 rounded-xl"
              style={{
                backgroundColor: "#4F46E5",
                opacity: otp.length === 6 ? 1 : 0.5,
              }}
            >
              <Text className="text-center text-white font-semibold text-lg">
                Verify OTP
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ✅ MPIN INPUTS */}
        {otpVerified && (
          <>
            <Text className="text-emerald-600 text-sm mb-3">
              OTP verified. Enter your new MPIN below.
            </Text>
            <Text className="text-gray-700 mb-1 ">New MPIN</Text>
            <View className="flex-row border border-gray-300 rounded-lg px-4 mb-4 items-center">
              <TextInput
                placeholder="4 digit MPIN"
                placeholderTextColor="#9CA3AF"
                value={newPin}
                onChangeText={(t) => {
                  setNewPin(t.replace(/[^0-9]/g, "").slice(0, 4));
                  setMpinError("");
                }}
                keyboardType="number-pad"
                secureTextEntry={!showNew}
                className="flex-1"
                style={{ color: "#000" }}
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                <Ionicons
                  name={showNew ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color="#777"
                />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-700 mb-1">Confirm MPIN</Text>
            <View className="flex-row border border-gray-300 rounded-lg px-4 mb-2 items-center">
              <TextInput
                placeholder="Re-enter MPIN"
                placeholderTextColor="#9CA3AF"
                value={confirmPin}
                onChangeText={(t) => {
                  setConfirmPin(t.replace(/[^0-9]/g, "").slice(0, 4));
                  setMpinError("");
                }}
                keyboardType="number-pad"
                secureTextEntry={!showConfirm}
                className="flex-1"
                style={{ color: "#000" }}
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                <Ionicons
                  name={showConfirm ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color="#777"
                />
              </TouchableOpacity>
            </View>

            {/* ✅ LIVE MISMATCH WARNING */}
            {isMismatch && (
              <Text className="text-red-500 text-xs mb-4">
                MPIN is not matching
              </Text>
            )}

            {mpinError ? (
              <Text className="text-red-500 text-sm mb-3">{mpinError}</Text>
            ) : null}

            <TouchableOpacity
              onPress={verifyAndSaveMPIN}
              disabled={newPin.length !== 4 || confirmPin.length !== 4 || isMismatch}
              className="py-4 rounded-xl"
              style={{
                backgroundColor: "#4F46E5",
                opacity:
                  newPin.length === 4 &&
                  confirmPin.length === 4 &&
                  !isMismatch
                    ? 1
                    : 0.5,
              }}
            >
              <Text className="text-center text-white font-semibold text-lg">
                Update MPIN
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
