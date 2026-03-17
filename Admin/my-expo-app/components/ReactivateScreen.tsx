import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, Keyboard } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../utils/api";

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
    if (mobile.length !== 10) {
      Alert.alert("Invalid Number", "Enter valid 10-digit number");
      return;
    }

    try {
      const fullPhoneNumber = `+91${mobile}`;
      const confirmationResult = await auth().signInWithPhoneNumber(fullPhoneNumber);
      setConfirmationState(confirmationResult);

      setOtpSent(true);
      setOtp("");
      setTimer(30);
      setCanResend(false);

      Alert.alert("OTP Sent", `OTP sent to ${fullPhoneNumber}`);
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
      Alert.alert("Error", friendlyMessage);
    }
  };

  /* ✅ VERIFY OTP via Firebase (only verifies number & stores firebaseIdToken) */
  const verifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert("Invalid OTP", "Enter 6-digit OTP");
      return;
    }

    if (!confirmation) {
      Alert.alert("Error", "Please request OTP again.");
      return;
    }

    try {
      const userCredential = await confirmation.confirm(otp);
      const token = await userCredential.user.getIdToken();
      setFirebaseIdToken(token);
      setOtpVerified(true);
      Alert.alert("OTP Verified", "You can now change MPIN");
    } catch (error: any) {
      console.error("Verify OTP Error:", error);
      const msg = error.response?.data?.message || error.message || "Invalid OTP or verification failed.";
      Alert.alert("Error", msg);
    }
  };

  /* ✅ SAVE MPIN (calls backend reset now that OTP/Firebase is verified) */
  const verifyAndSaveMPIN = async () => {
    if (newPin.length !== 4 || confirmPin.length !== 4) {
      Alert.alert("Invalid MPIN", "MPIN must be 4 digits");
      return;
    }

    if (newPin !== confirmPin) {
      Alert.alert("MPIN Mismatch", "MPIN does not match");
      return;
    }
    if (!firebaseIdToken) {
      Alert.alert("Error", "Phone not verified. Please complete OTP step again.");
      return;
    }

    try {
      const response = await api.post("/api/auth/forgot-pin/firebase-reset", {
        firebaseIdToken,
        newPin,
      });
      if (response.data?.success) {
        Alert.alert("Success", "MPIN changed successfully");
        navigation.replace("LoginPin");
      } else {
        Alert.alert("Error", response.data?.message || "Failed to change MPIN");
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Failed to change MPIN";
      Alert.alert("Error", msg);
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
          onChangeText={(t) =>
            setMobile(t.replace(/[^0-9]/g, "").slice(0, 10))
          }
          keyboardType="number-pad"
          className="border border-gray-300 rounded-lg px-4 py-3 mb-5"
          style={{ color: "#000" }}
        />

        {/* ✅ SEND OTP */}
        {!otpSent && (
          <TouchableOpacity
            onPress={sendOTP}
            disabled={mobile.length !== 10}
            className="py-4 rounded-xl mb-6"
            style={{
              backgroundColor: "#A855F7",
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
            <TextInput
              placeholder="6 digit OTP"
              placeholderTextColor="#9CA3AF"
              value={otp}
              onChangeText={(t) =>
                setOtp(t.replace(/[^0-9]/g, "").slice(0, 6))
              }
              keyboardType="number-pad"
              className="border border-gray-300 rounded-lg px-4 py-3 mb-3"
              style={{ color: "#000" }}
            />

            {!canResend ? (
              <Text className="text-gray-500 mb-4">
                Resend OTP in 00:{timer < 10 ? `0${timer}` : timer}
              </Text>
            ) : (
              <TouchableOpacity onPress={sendOTP}>
                <Text className="text-purple-600 font-semibold mb-4">
                  Resend OTP
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={verifyOTP}
              disabled={otp.length !== 6}
              className="py-4 rounded-xl"
              style={{
                backgroundColor: "#A855F7",
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
            <Text className="text-gray-700 mb-1 ">New MPIN</Text>
            <View className="flex-row border border-gray-300 rounded-lg px-4 mb-4 items-center">
              <TextInput
                placeholder="4 digit MPIN"
                placeholderTextColor="#9CA3AF"
                value={newPin}
                onChangeText={(t) =>
                  setNewPin(t.replace(/[^0-9]/g, "").slice(0, 4))
                }
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
                onChangeText={(t) =>
                  setConfirmPin(t.replace(/[^0-9]/g, "").slice(0, 4))
                }
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

            <TouchableOpacity
              onPress={verifyAndSaveMPIN}
              disabled={newPin.length !== 4 || confirmPin.length !== 4 || isMismatch}
              className="py-4 rounded-xl"
              style={{
                backgroundColor: "#A855F7",
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
