import React, { useState, useEffect, useRef } from "react";
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
import { api } from "../utils/api";

export default function BasicInfoScreen({ navigation }) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [gender, setGender] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cleanupInProgress, setCleanupInProgress] = useState(false);
  const [formError, setFormError] = useState("");
  const [sendError, setSendError] = useState("");
  const [alreadyRegisteredField, setAlreadyRegisteredField] = useState<string | null>(null);
  
  // Store the current verification ID to cancel it
  const currentVerificationId = useRef(null);
  
  // Get Firebase auth instance
  const firebaseAuth = auth();

  // Function to cancel any ongoing verification
  const cancelCurrentVerification = async () => {
    try {
      console.log('Cancelling current verification...');
      
      // Clear stored confirmation
      clearConfirmation();
      
      // Sign out any existing user
      const currentUser = firebaseAuth.currentUser;
      if (currentUser) {
        console.log('Signing out user:', currentUser.uid);
        await firebaseAuth.signOut();
      }
      
      // Reset verification ID
      currentVerificationId.current = null;
      
      // Small delay to ensure Firebase state is reset
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Verification cancelled successfully');
    } catch (error) {
      console.error('Error cancelling verification:', error);
    }
  };

  // Comprehensive cleanup function
  const performCleanup = async () => {
    if (cleanupInProgress) return;
    
    try {
      setCleanupInProgress(true);
      console.log('Performing cleanup...');
      await cancelCurrentVerification();
    } catch (error) {
      console.error('Cleanup error:', error);
    } finally {
      setCleanupInProgress(false);
    }
  };

  // Clean up on component mount
  useEffect(() => {
    performCleanup();
  }, []);

  // Reset everything when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      console.log('Screen focused, performing cleanup...');
      await performCleanup();
    });
    
    return unsubscribe;
  }, [navigation]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      console.log('Component unmounting, cleaning up...');
      cancelCurrentVerification();
    };
  }, []);

  const validate = () => {
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
    setAlreadyRegisteredField(null);
    if (!validate()) return;
    
    // Prevent multiple rapid calls
    if (loading || cleanupInProgress) return;

    try {
      setLoading(true);
      const fullPhoneNumber = `${countryCode}${mobile}`;

      console.log('Checking if user exists...');
      
      // Check if user already exists in your backend
      const checkResponse = await api.post("/api/auth/check-user", {
        phone: fullPhoneNumber,
        email: email.trim(),
        desiredRole: "customer",
      });

      const shouldBlockForExistingCustomer =
        checkResponse.data?.existsForRole === true ||
        (checkResponse.data?.exists === true &&
          checkResponse.data?.existsForRole === undefined);

      if (shouldBlockForExistingCustomer) {
        setAlreadyRegisteredField(
          typeof checkResponse.data.field === "string" ? checkResponse.data.field : "phone or email"
        );
        setLoading(false);
        return;
      }

      console.log('Cleaning up before sending new OTP...');
      
      // IMPORTANT: Cancel any existing verification first
      await cancelCurrentVerification();
      
      // Additional delay to ensure complete cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('Sending OTP to:', fullPhoneNumber);
      
      // Send new OTP with a timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OTP request timeout')), 30000)
      );
      
      const sendOtpPromise = firebaseAuth.signInWithPhoneNumber(fullPhoneNumber);
      const confirmation = await Promise.race([sendOtpPromise, timeoutPromise]);
      
      // Store the verification ID for potential cancellation
      currentVerificationId.current = confirmation.verificationId;
      
      // Store confirmation for later use
      setConfirmation(confirmation);
      
      console.log('OTP sent successfully');

      // Navigate to verification screen
      navigation.navigate("VerifyEmailScreen", {
        mobile: fullPhoneNumber,
        first: first.trim(),
        last: last.trim(),
        gender,
        email: email.trim(),
      });

    } catch (error) {
      console.log("OTP ERROR:", error);
      console.log("Error code:", error.code);
      console.log("Error message:", error.message);
      
      let friendlyMessage = "Failed to send OTP. Please try again.";
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/captcha-check-failed') {
        friendlyMessage = "Safety check failed. Please try again.";
      } else if (error.code === 'auth/invalid-phone-number') {
        friendlyMessage = "The phone number format is incorrect.";
      } else if (error.code === 'auth/too-many-requests') {
        friendlyMessage = "Too many attempts. Please wait a few minutes and try again.";
      } else if (error.code === 'auth/missing-client-identifier') {
        friendlyMessage = "Configuration error: Ensure SHA-1 is added to Firebase.";
      } else if (error.code === 'auth/operation-not-allowed') {
        friendlyMessage = "Phone sign-in is not enabled. Please contact support.";
      } else if (error.code === 'auth/user-disabled') {
        friendlyMessage = "This phone number has been disabled. Contact support.";
      } else if (error.code === 'auth/quota-exceeded') {
        friendlyMessage = "SMS quota exceeded. Please try again later.";
      } else if (error.code === 'auth/network-request-failed') {
        friendlyMessage = "Network error. Please check your connection.";
      } else if (error.message === 'OTP request timeout') {
        friendlyMessage = "Request timed out. Please check your internet connection.";
      } else if (error.message?.includes('already in use')) {
        friendlyMessage = "This phone number is already in use. Please login instead.";
      } else if (error.response?.data?.message) {
        friendlyMessage = error.response.data.message;
      }
      
      setSendError(friendlyMessage);
      
      // If OTP sending fails, ensure cleanup
      await cancelCurrentVerification();
      
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
                <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
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
                  setAlreadyRegisteredField(null);
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
                  setAlreadyRegisteredField(null);
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
                          setAlreadyRegisteredField(null);
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
                    setAlreadyRegisteredField(null);
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
                    setAlreadyRegisteredField(null);
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
                  setAlreadyRegisteredField(null);
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
              {alreadyRegisteredField ? (
                <View className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <Text className="text-amber-900 text-sm mb-3">
                    This {alreadyRegisteredField} is already registered. Use login instead.
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("Login")}
                    className="bg-indigo-600 py-3 rounded-xl"
                  >
                    <Text className="text-center text-white font-semibold">Go to login</Text>
                  </TouchableOpacity>
                </View>
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