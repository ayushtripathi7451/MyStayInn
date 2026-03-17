import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import { setConfirmation } from "../utils/firebaseConfirmation";

export default function BasicInfoScreen({ navigation }: any) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [gender, setGender] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!first.trim()) return Alert.alert("Error", "First name is required");
    if (!last.trim()) return Alert.alert("Error", "Last name is required");
    if (!gender.trim()) return Alert.alert("Error", "Select gender");
    if (!/^[0-9]{10}$/.test(mobile))
      return Alert.alert("Error", "Enter valid 10 digit mobile");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return Alert.alert("Error", "Enter valid email");
    return true;
  };

  const isValid =
    first.trim() &&
    last.trim() &&
    gender.trim() &&
    /^[0-9]{10}$/.test(mobile) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const sendOTP = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      const fullPhoneNumber = `${countryCode}${mobile}`;

      /**
       * Calling auth().signInWithPhoneNumber ensures the native module is used.
       * In a Dev Build, this triggers Play Integrity or reCAPTCHA automatically.
       */
      const confirmation = await auth().signInWithPhoneNumber(fullPhoneNumber);

      // Store confirmation in helper (avoid passing non-serializable object)
      setConfirmation(confirmation);

      Alert.alert("OTP Sent!", `OTP sent to ${fullPhoneNumber}`);

      // Navigate to VerifyEmail without passing confirmation
      navigation.navigate("VerifyEmail", {
        mobile: fullPhoneNumber,
        first,
        last,
        gender,
        email,
      });

    } catch (error: any) {
      console.log("OTP ERROR:", error);
      
      let friendlyMessage = "Failed to send OTP. Please try again.";
      
      if (error.code === 'auth/captcha-check-failed') {
        friendlyMessage = "Safety check failed. Please try again.";
      } else if (error.code === 'auth/invalid-phone-number') {
        friendlyMessage = "The phone number format is incorrect.";
      } else if (error.code === 'auth/too-many-requests') {
        friendlyMessage = "Too many attempts. Please try again later.";
      } else if (error.code === 'auth/missing-client-identifier') {
        friendlyMessage = "Configuration error: Ensure SHA-1 is added to Firebase.";
      }

      Alert.alert("Error", friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingBottom: 120,
            }}
          >
            <Pressable onPress={() => setShowDropdown(false)}>
            {/* HEADER */}
            <View className="flex-row items-center mt-4">
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={26} color="black" />
              </TouchableOpacity>

              <View className="flex-1 items-center -ml-6">
                <Text className="text-xl font-semibold">
                  Add your Basic Info 1 / 3
                </Text>
              </View>
              <View style={{ width: 26 }} />
            </View>

            {/* PROGRESS BAR */}
            <View className="flex-row justify-center mt-3 mb-8">
              <View className="w-10 h-1.5 bg-purple-500 rounded-full mx-1" />
              <View className="w-6 h-1.5 bg-gray-300 mx-1 rounded-full" />
              <View className="w-6 h-1.5 bg-gray-300 mx-1 rounded-full" />
            </View>

            {/* First Name */}
            <Text className="text-gray-700 mb-1">First Name</Text>
            <TextInput
              placeholder="Enter your first name"
              placeholderTextColor="#9CA3AF"
              value={first}
              onChangeText={setFirst}
              className="border border-gray-300 rounded-lg px-4 py-3"
              style={{ color: '#000000' }}
            />

            {/* Last Name */}
            <Text className="text-gray-700 mb-1 mt-3">Last Name</Text>
            <TextInput
              placeholder="Enter your last name"
              placeholderTextColor="#9CA3AF"
              value={last}
              onChangeText={setLast}
              className="border border-gray-300 rounded-lg px-4 py-3"
              style={{ color: '#000000' }}
            />

            {/* Gender */}
            <Text className="text-gray-700 mb-1 mt-3">Gender</Text>
            <View className="relative">
              <Pressable
                onPress={() => setShowDropdown(!showDropdown)}
                className="border border-gray-300 rounded-lg px-4 py-3 flex-row justify-between bg-white"
              >
                <Text className={gender ? "text-black" : "text-gray-400"}>
                  {gender || "Select your gender"}
                </Text>
                <Ionicons
                  name={showDropdown ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="gray"
                />
              </Pressable>

              {showDropdown && (
                <View className="absolute w-full bg-white rounded-lg shadow-xl border border-gray-200 mt-12 z-20">
                  {["Male", "Female"].map((item) => (
                    <TouchableOpacity
                      key={item}
                      onPress={() => {
                        setGender(item);
                        setShowDropdown(false);
                      }}
                      className="px-4 py-3 border-b border-gray-100"
                    >
                      <Text>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Mobile */}
            <Text className="text-gray-700 mb-1 mt-3">Mobile Number</Text>
            <View className="flex-row border border-gray-300 rounded-lg overflow-hidden">
              <TextInput
                value={countryCode}
                onChangeText={(t) =>
                  setCountryCode(t.replace(/[^+0-9]/g, "").slice(0, 4))
                }
                keyboardType="phone-pad"
                className="px-4 py-3 border-r border-gray-300 text-center"
                style={{ minWidth: 70, color: '#000000' }}
              />
              <TextInput
                placeholder="Enter mobile number"
                placeholderTextColor="#9CA3AF"
                value={mobile}
                onChangeText={(t) =>
                  setMobile(t.replace(/[^0-9]/g, "").slice(0, 10))
                }
                keyboardType="numeric"
                maxLength={10}
                className="flex-1 px-4 py-3"
                style={{ color: '#000000' }}
              />
            </View>

            {/* Email */}
            <Text className="text-gray-700 mb-1 mt-3">Email</Text>
            <TextInput
              placeholder="example@example.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              className="border border-gray-300 rounded-lg px-4 py-3"
              keyboardType="email-address"
              autoCapitalize="none"
              style={{ color: '#000000' }}
            />

            {/* BUTTON */}
            <TouchableOpacity
              onPress={sendOTP}
              disabled={!isValid || loading}
              className={`w-full py-4 rounded-xl mt-8 flex-row justify-center items-center ${
                isValid && !loading ? "bg-purple-500" : "bg-purple-300"
              }`}
            >
              {loading && <ActivityIndicator color="white" className="mr-2" />}
              <Text className="text-center text-white font-semibold text-lg">
                {loading ? "Sending OTP..." : "Send OTP"}
              </Text>
            </TouchableOpacity>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}