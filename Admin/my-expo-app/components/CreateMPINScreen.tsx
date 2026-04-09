import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MPINBoxes from "./MPINBoxes";
import { api } from "../utils/api";

const TERMS_SECTIONS = [
  {
    title: "Platform Role",
    body: 'MyStayInn is a technology-based intermediary platform operated by TechMudita Pvt Ltd, connecting Property owners ("Admins") with customers ("Users"). MyStayInn does not own, manage, or operate any properties listed in its platforms.',
  },
  {
    title: "Eligibility",
    body: "Users must be 18 years or above and provide accurate and lawful information during registration and use of the platform.",
  },
  {
    title: "Listings & Bookings",
    body: "All property details, pricing, availability, and rules are provided by the respective Property owners. MyStayInn is not responsible for inaccuracies, service quality, or changes made by owners.",
  },
  {
    title: "Payments & Refunds",
    body: "Payments, if enabled, are processed through RBI-approved third-party payment gateways.",
  },
  {
    title: "User Conduct",
    body: "Users must comply with property rules, local laws, and safety regulations.",
  },
  {
    title: "Limitation of Liability",
    body: "MyStayInn and TechMudita Pvt Ltd shall not be liable for disputes or damages between Users and Property owners.",
  },
  {
    title: "Governing Law",
    body: "Terms are governed by the laws of India, and the courts at Bengaluru, Karnataka shall have exclusive jurisdiction.",
  },
];

export default function CreateMPINScreen({ navigation }: any) {
  const [mpin, setMpin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showMpin, setShowMpin] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [mpinError, setMpinError] = useState("");
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const isValid =
    mpin.length === 4 &&
    confirm.length === 4 &&
    mpin === confirm &&
    isChecked;

  const handleSaveMPIN = async () => {
    try {
      setLoading(true);
      setApiError("");

      // Get the auth token from AsyncStorage (primary: USER_TOKEN, fallback: authToken)
      let token = await AsyncStorage.getItem("USER_TOKEN");
      if (!token) {
        token = await AsyncStorage.getItem("authToken");
      }
      
      if (!token) {
        setApiError("Session expired. Please register again from the start.");
        navigation.navigate("Success");
        return;
      }

      // Call backend API to set MPIN
      // Note: Token is automatically added by api.interceptors
      const response = await api.post(
        "/api/auth/set-mpin",
        { mpin }
      );

      if (response.data.success) {
        // Only store attempts counter, NOT the raw MPIN (security best practice)
        await SecureStore.setItemAsync("MPIN_ATTEMPTS", "0");
        
        // Get user data to pass uniqueId to success screen
        const userData = await AsyncStorage.getItem("userData");
        const user = userData ? JSON.parse(userData) : null;
        
        // Navigate to success screen
        navigation.reset({
          index: 0,
          routes: [{ name: "Success", params: { uniqueId: user?.uniqueId } }],
        });
      }
    } catch (error: any) {
      console.error("MPIN Save Error:", error);
      const errorMessage = error.response?.data?.message || "Failed to save MPIN. Please try again.";
      setApiError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      <View className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 140 }}
          >
            {/* HEADER */}
            <View className="flex-row items-center mt-4">
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={26} color="black" />
              </TouchableOpacity>
              <View className="flex-1 items-center">
                <Text className="text-xl font-semibold">
                  Create MPIN 3 / 3
                </Text>
              </View>
              <View style={{ width: 26 }} />
            </View>

            {/* PROGRESS */}
            <View className="flex-row justify-center mt-3 mb-8">
              <View className="w-6 h-1.5 bg-purple-500 rounded-full mx-1" />
              <View className="w-6 h-1.5 bg-purple-500 rounded-full mx-1" />
              <View className="w-10 h-1.5 bg-purple-500 rounded-full mx-1" />
            </View>

            {/* ENTER MPIN */}
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-gray-700">Enter MPIN</Text>
              <TouchableOpacity onPress={() => setShowMpin(!showMpin)}>
                <Ionicons
                  name={showMpin ? "eye" : "eye-off"}
                  size={20}
                  color="gray"
                />
              </TouchableOpacity>
            </View>

            <MPINBoxes
              value={mpin}
              secure={!showMpin}
              onChange={(v) => {
                setMpin(v);
                setApiError("");
                if (confirm && v !== confirm)
                  setMpinError("MPINs do not match");
                else setMpinError("");
              }}
            />

            {/* CONFIRM MPIN */}
            <View className="flex-row justify-between items-center mt-6 mb-2">
              <Text className="text-gray-700">Confirm MPIN</Text>
              <TouchableOpacity
                onPress={() => setShowConfirm(!showConfirm)}
              >
                <Ionicons
                  name={showConfirm ? "eye" : "eye-off"}
                  size={20}
                  color="gray"
                />
              </TouchableOpacity>
            </View>

            <MPINBoxes
              value={confirm}
              secure={!showConfirm}
              onChange={(v) => {
                setConfirm(v);
                setApiError("");
                if (v !== mpin)
                  setMpinError("MPINs do not match");
                else setMpinError("");
              }}
            />

            {mpinError ? (
              <Text className="text-red-500 text-xs mt-2">
                {mpinError}
              </Text>
            ) : null}
            {apiError ? (
              <Text className="text-red-600 text-sm mt-2" accessibilityLiveRegion="polite">
                {apiError}
              </Text>
            ) : null}

            {/* AGREEMENT */}
            <TouchableOpacity
              onPress={() => setIsChecked(!isChecked)}
              className="flex-row items-center mt-6"
            >
              <View
                className={`w-5 h-5 rounded border mr-3 ${
                  isChecked
                    ? "bg-purple-600 border-purple-600"
                    : "border-gray-400"
                } items-center justify-center`}
              >
                {isChecked && (
                  <Ionicons name="checkmark" size={14} color="white" />
                )}
              </View>
              <Text className="text-gray-700">
                I agree to the{" "}
                <Text
                  className="font-semibold text-purple-600"
                  onPress={() => setShowTerms(true)}
                >
                  Terms & Conditions
                </Text>
              </Text>
            </TouchableOpacity>

            {/* CONTINUE */}
            <TouchableOpacity
              disabled={!isValid || loading}
              onPress={handleSaveMPIN}
              className={`w-full py-4 rounded-xl mt-10 flex-row justify-center items-center ${
                isValid && !loading ? "bg-purple-600" : "bg-purple-300"
              }`}
            >
              {loading && <ActivityIndicator color="white" className="mr-2" />}
              <Text className="text-center text-white font-semibold text-lg">
                {loading ? "Creating MPIN..." : "Continue"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* FOOTER */}
        <View className="absolute bottom-4 left-0 right-0 items-center">
          <Text className="text-center text-gray-600 text-sm px-8 w-[300px]">
            By using MyStayInn, you agree to the{" "}
            <Text className="font-semibold">Terms</Text> and{" "}
            <Text className="font-semibold">Privacy Policy</Text>.
          </Text>
        </View>

        {/* TERMS MODAL */}
        <Modal visible={showTerms} animationType="slide" transparent>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
            <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "85%", padding: 24 }}>
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-xl font-bold text-gray-900">Terms & Conditions</Text>
                <TouchableOpacity onPress={() => setShowTerms(false)}>
                  <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>
              <Text className="text-xs text-gray-500 mb-4">MyStayInn – Operated by TechMudita Pvt Ltd</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {TERMS_SECTIONS.map((s) => (
                  <View key={s.title} className="mb-5">
                    <Text className="text-sm font-bold text-gray-800 mb-1">{s.title}</Text>
                    <Text className="text-sm text-gray-600 leading-5">{s.body}</Text>
                  </View>
                ))}
                <View style={{ height: 20 }} />
              </ScrollView>
              <TouchableOpacity
                onPress={() => { setIsChecked(true); setShowTerms(false); }}
                className="bg-purple-600 py-4 rounded-xl mt-4 items-center"
              >
                <Text className="text-white font-semibold text-base">I Agree</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
