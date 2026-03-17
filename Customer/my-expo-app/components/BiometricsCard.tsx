import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { useTheme } from "../context/ThemeContext";

export default function BiometricsCard({ navigation }: any) {
  const { theme } = useTheme(); // ✅ GLOBAL THEME
  const [bioType, setBioType] = useState<"fingerprint" | "face">("fingerprint");
  const [available, setAvailable] = useState(false);

  // ✅ THEME COLORS
  const cardBg = theme === "female" ? "bg-[#FF2E75]" : "bg-blue-600";
  const activeText = theme === "female" ? "text-pink-600" : "text-blue-600";
  const shadowColor =
    theme === "female" ? "rgba(255,100,160,1)" : "rgba(150,180,255,1)";

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    if (!hasHardware || !enrolled) {
      setAvailable(false);
      return;
    }

    if (
      types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
    ) {
      setBioType("face");
    } else if (
      types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
    ) {
      setBioType("fingerprint");
    }

    setAvailable(true);
  };

  const handleBiometricLogin = async () => {
    if (!available) {
      Alert.alert("Biometrics not available");
      return;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage:
          bioType === "face"
            ? "Unlock with Face ID"
            : "Unlock with Fingerprint",
        fallbackLabel: "Use MPIN",
        disableDeviceFallback: false,
      });

      if (result.success) {
        await SecureStore.setItemAsync("BIO_UNLOCKED", "true");
        navigation.replace("CompleteProfile");
      } else {
        Alert.alert("Authentication Failed");
      }
    } catch (err) {
      console.log("Biometric error:", err);
      Alert.alert("Something went wrong");
    }
  };

  return (
    <View
      className={`mx-4 mt-14 p-8 w-11/12 rounded-[32px] ${cardBg}`}
      style={{
        shadowColor,
        shadowOpacity: 0.9,
        shadowRadius: 35,
        shadowOffset: { width: 0, height: 0 },
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.35)",
      }}
    >
      {/* ✅ SWITCH */}
      <View className="flex-row rounded-full p-1 mb-12 bg-white/30">
        <TouchableOpacity
          className={`flex-1 py-3 rounded-full items-center ${
            bioType === "fingerprint" ? "bg-white" : ""
          }`}
          onPress={() => setBioType("fingerprint")}
        >
          <Text
            className={`text-[16px] font-semibold ${
              bioType === "fingerprint" ? activeText : "text-white"
            }`}
          >
            Fingerprint
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 py-3 rounded-full items-center ${
            bioType === "face" ? "bg-white" : ""
          }`}
          onPress={() => setBioType("face")}
        >
          <Text
            className={`text-[16px] font-semibold ${
              bioType === "face" ? activeText : "text-white"
            }`}
          >
            Face
          </Text>
        </TouchableOpacity>
      </View>

      {/* ✅ TITLE */}
      <Text className="text-white text-[22px] font-semibold text-center mb-1">
        Unlock to use MyStayInn
      </Text>

      <Text className="text-white/90 text-center text-[14px] mb-8">
        {bioType === "fingerprint"
          ? "Scan your fingerprint"
          : "Scan your face"}
      </Text>

      {/* ✅ LOGIN BUTTON */}
      <TouchableOpacity
        onPress={handleBiometricLogin}
        className="bg-white py-4 rounded-full items-center"
      >
        <Text className={`font-bold text-[16px] ${activeText}`}>
          Authenticate
        </Text>
      </TouchableOpacity>
    </View>
  );
}
