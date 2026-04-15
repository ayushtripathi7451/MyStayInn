import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import { setConfirmation, clearConfirmation } from "../utils/firebaseConfirmation";

export default function BasicInfoScreen({ navigation }: any) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [gender, setGender] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [formError, setFormError] = useState("");
  const [sendError, setSendError] = useState("");

  // Clear any stale confirmation when component mounts
  useEffect(() => {
    clearConfirmation();
    
    // Sign out any existing user silently (without triggering errors)
    const signOutSilently = async () => {
      try {
        const currentUser = auth().currentUser;
        if (currentUser) {
          await auth().signOut();
        }
      } catch (error) {
        // Silently ignore sign-out errors on mount
        console.log("Silent sign-out on mount:", error);
      }
    };
    
    signOutSilently();
  }, []);

  // Clear confirmation when screen is focused (but don't sign out aggressively)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      clearConfirmation();
    });
    return unsubscribe;
  }, [navigation]);

  // Handle back button press - go to Signup without trying to sign out
  const handleBackPress = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Signup" }],
    });
  };

  const validate = (): boolean => {
    if (!first.trim()) {
      setFormError("First name is required.");
      return false;
    }
    if (!last.trim()) {
      setFormError("Last name is required.");
      return false;
    }
    if (!gender.trim()) {
      setFormError("Please select gender.");
      return false;
    }
    if (!/^[0-9]{10}$/.test(mobile)) {
      setFormError("Enter a valid 10-digit mobile number.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError("Enter a valid email address.");
      return false;
    }
    setFormError("");
    return true;
  };

  const isValid =
    first.trim() &&
    last.trim() &&
    gender.trim() &&
    /^[0-9]{10}$/.test(mobile) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  /** Primary fill while form is complete or OTP is sending (avoid flashing to “disabled” look during load). */
  const buttonFilled = isValid || loading;

  const sendOTP = async () => {
    setSendError("");
    if (!validate()) return;

    try {
      setLoading(true);
      const fullPhoneNumber = `${countryCode}${mobile}`;

      // Clear any existing confirmation first
      clearConfirmation();

      // Check if user already exists in Firebase (optional)
      try {
        const currentUser = auth().currentUser;
        if (currentUser) {
          // If there's a user already signed in, sign them out silently
          await auth().signOut();
        }
      } catch (signOutError) {
        // Ignore sign-out errors
        console.log("Sign-out before OTP:", signOutError);
      }

      // Wait a moment for Firebase to settle
      await new Promise(resolve => setTimeout(resolve, 500));

      const confirmation = await auth().signInWithPhoneNumber(fullPhoneNumber);
      setConfirmation(confirmation);

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
      } else if (error.code === 'auth/user-disabled') {
        friendlyMessage = "This phone number has been disabled.";
      }

      setSendError(friendlyMessage);
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
                <TouchableOpacity onPress={handleBackPress}>
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
                <View className="w-10 h-1.5 bg-indigo-500 rounded-full mx-1" />
                <View className="w-6 h-1.5 bg-gray-300 mx-1 rounded-full" />
                <View className="w-6 h-1.5 bg-gray-300 mx-1 rounded-full" />
              </View>

              {/* First Name */}
              <Text className="text-gray-700 mb-1">First Name</Text>
              <TextInput
                placeholder="Enter your first name"
                placeholderTextColor="#9CA3AF"
                value={first}
                onChangeText={(t) => {
                  setFirst(t);
                  setFormError("");
                  setSendError("");
                }}
                className="border border-gray-300 rounded-lg px-4 py-3"
                style={{ color: '#000000' }}
              />

              {/* Last Name */}
              <Text className="text-gray-700 mb-1 mt-3">Last Name</Text>
              <TextInput
                placeholder="Enter your last name"
                placeholderTextColor="#9CA3AF"
                value={last}
                onChangeText={(t) => {
                  setLast(t);
                  setFormError("");
                  setSendError("");
                }}
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
                          setFormError("");
                          setSendError("");
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
                  onChangeText={(t) => {
                    setCountryCode(t.replace(/[^+0-9]/g, "").slice(0, 4));
                    setFormError("");
                    setSendError("");
                  }}
                  keyboardType="phone-pad"
                  className="px-4 py-3 border-r border-gray-300 text-center"
                  style={{ minWidth: 70, color: '#000000' }}
                />
                <TextInput
                  placeholder="Enter mobile number"
                  placeholderTextColor="#9CA3AF"
                  value={mobile}
                  onChangeText={(t) => {
                    setMobile(t.replace(/[^0-9]/g, "").slice(0, 10));
                    setFormError("");
                    setSendError("");
                  }}
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
                onChangeText={(t) => {
                  setEmail(t);
                  setFormError("");
                  setSendError("");
                }}
                className="border border-gray-300 rounded-lg px-4 py-3"
                keyboardType="email-address"
                autoCapitalize="none"
                style={{ color: '#000000' }}
              />

              {(formError || sendError) ? (
                <Text className="text-red-600 text-sm mt-4" accessibilityLiveRegion="polite">
                  {formError || sendError}
                </Text>
              ) : null}

              {/* BUTTON — disabled state uses dark text on light fill so it stays visible before fields are complete */}
              <TouchableOpacity
                onPress={sendOTP}
                disabled={!isValid || loading}
                className={`w-full py-4 rounded-xl mt-8 flex-row justify-center items-center border-2 ${
                  buttonFilled
                    ? "bg-indigo-600 border-indigo-600"
                    : "bg-indigo-100 border-indigo-200"
                }`}
                accessibilityState={{ disabled: !isValid || loading }}
              >
                {loading && (
                  <ActivityIndicator color="#FFFFFF" className="mr-2" />
                )}
                <Text
                  className={`text-center font-semibold text-lg ${
                    buttonFilled ? "text-white" : "text-indigo-800"
                  }`}
                >
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