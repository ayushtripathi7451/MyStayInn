import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuthBearerToken, propertyApi } from "../utils/api";
import { hasUsableProperties } from "../utils/propertyGate";

export default function BiometricsCard({ navigation }: any) {
  const [bioType, setBioType] = useState<"fingerprint" | "face">("fingerprint");
  const [available, setAvailable] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    console.log("Hardware:", hasHardware);
    console.log("Enrolled:", enrolled);
    console.log("Types:", types);

    if (!hasHardware || !enrolled) {
      setAvailable(false);
      return;
    }

    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      setBioType("face");
    } else if (
      types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
    ) {
      setBioType("fingerprint");
    }

    setAvailable(true);
  };

  /** Same post-auth routing as PinLoginCard: Home if user already has properties, else ProfileSetup. */
  const goHomeOrPropertySetup = async () => {
    const token = await getAuthBearerToken();
    if (!token) {
      setError("Session expired. Please sign in again.");
      navigation.replace("Register");
      return;
    }
    try {
      const propertiesResponse = await propertyApi.get("/api/properties");
      const list = propertiesResponse.data?.properties;
      if (propertiesResponse.data?.success && hasUsableProperties(list)) {
        const arr = list as unknown[];
        const firstProperty =
          arr.find((p) => p != null && typeof p === "object") ?? arr[0];
        await AsyncStorage.setItem("currentProperty", JSON.stringify(firstProperty));
        navigation.replace("Home");
      } else {
        navigation.replace("ProfileSetup");
      }
    } catch (e) {
      console.error("[BiometricsCard] Error fetching properties:", e);
      navigation.replace("ProfileSetup");
    }
  };

  const handleBiometricLogin = async () => {
    setError("");
    if (!available) {
      setError("Biometrics not available on this device.");
      return;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage:
          bioType === "face" ? "Unlock with Face ID" : "Unlock with Fingerprint",
        fallbackLabel: "Use MPIN",
        disableDeviceFallback: false,
      });

      if (result.success) {
        await SecureStore.setItemAsync("BIO_UNLOCKED", "true");
        setNavigating(true);
        try {
          await goHomeOrPropertySetup();
        } finally {
          setNavigating(false);
        }
      } else {
        setError("Biometric authentication failed. Try again or use MPIN.");
      }
    } catch (err) {
      console.log("Biometric error:", err);
      setError("Something went wrong. Try again.");
    }
  };

  return (
    <View
      className="mx-4 mt-14 p-8 w-11/12 rounded-[32px]"
      style={{
        backgroundColor: "blue",
        shadowColor: "rgba(150,180,255,1)",
        shadowOpacity: 0.9,
        shadowRadius: 35,
        shadowOffset: { width: 0, height: 0 },
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.35)",
      }}
    >
      {/* SWITCH */}
      <View className="flex-row rounded-full p-1 mb-12 bg-white/30">
        <TouchableOpacity
          className={`flex-1 py-3 rounded-full items-center ${
            bioType === "fingerprint" ? "bg-white" : ""
          }`}
          onPress={() => setBioType("fingerprint")}
        >
          <Text
            className={`text-[16px] font-semibold ${
              bioType === "fingerprint" ? "text-blue-600" : "text-white"
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
              bioType === "face" ? "text-blue-600" : "text-white"
            }`}
          >
            Face
          </Text>
        </TouchableOpacity>
      </View>

      <Text className="text-white text-[22px] font-semibold text-center mb-1">
        Unlock to use MyStayInn
      </Text>

      <Text className="text-white/90 text-center text-[14px] mb-8">
        {bioType === "fingerprint"
          ? "Scan your fingerprint"
          : "Scan your face"}
      </Text>

      {error ? (
        <Text className="text-amber-200 text-sm text-center mb-4 px-1" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      {/* LOGIN BUTTON */}
      <TouchableOpacity
        onPress={handleBiometricLogin}
        disabled={navigating}
        className="bg-white py-4 rounded-full items-center"
      >
        {navigating ? (
          <ActivityIndicator color="#2563eb" />
        ) : (
          <Text className="text-blue-600 font-bold text-[16px]">
            Authenticate
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
