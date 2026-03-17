import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MPINBoxes from "./MPINBoxes";
import { api } from "../utils/api";

export default function CreateMPINScreen({ navigation }: any) {
  const [mpin, setMpin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showMpin, setShowMpin] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [mpinError, setMpinError] = useState("");
  const [loading, setLoading] = useState(false);

  const isValid =
    mpin.length === 4 &&
    confirm.length === 4 &&
    mpin === confirm &&
    isChecked;

  const handleSaveMPIN = async () => {
    try {
      setLoading(true);

      // Get the auth token from AsyncStorage (primary: USER_TOKEN, fallback: authToken)
      let token = await AsyncStorage.getItem("USER_TOKEN");
      if (!token) {
        token = await AsyncStorage.getItem("authToken");
      }
      
      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please register again.");
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
      Alert.alert("Error", errorMessage);
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
                <Text className="font-semibold text-purple-600">
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
      </View>
    </SafeAreaView>
  );
}
