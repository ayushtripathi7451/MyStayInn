import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  KeyboardAvoidingView,
  Pressable,
  Dimensions,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../context/ThemeContext";
import { api, userApi } from "../utils/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function CompleteProfileDocsScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { profileData } = route.params || {};

  const primaryBg = theme === "female" ? "bg-pink-500" : "bg-[#6400CD]";
  const disabledBg = theme === "female" ? "bg-pink-300" : "bg-[#A88DD5]";
  const iconColor = theme === "female" ? "#EC4899" : "#6400CD";

  /* ---------------- STATES ---------------- */
  const [contactName, setContactName] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [contactNumber, setContactNumber] = useState("");

  const [profession, setProfession] = useState("");
  const [showProfessionDropdown, setShowProfessionDropdown] = useState(false);

  const [aadharFront, setAadharFront] = useState<string | null>(null);
  const [aadharBack, setAadharBack] = useState<string | null>(null);
  const [idFront, setIdFront] = useState<string | null>(null);
  const [idBack, setIdBack] = useState<string | null>(null);

  const [errors, setErrors] = useState<any>({});

  /* Floating dropdown position */
  const [dropdownTop, setDropdownTop] = useState(0);

  /* ---------------- DERIVED LOGIC ---------------- */
  const requiresExtraId =
    profession === "Student" || profession === "Working Professional";

  const extraIdLabel =
    profession === "Student"
      ? "Student ID"
      : profession === "Working Professional"
      ? "Office ID"
      : "";

  /* ---------------- IMAGE PICKER ---------------- */
  const pickImage = async (setter: any, key: string) => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant camera roll permissions to upload documents."
        );
        return;
      }

      // Launch image picker with cropping
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3], // Good aspect ratio for documents
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setter(result.assets[0].uri);
        if (errors[key]) setErrors({ ...errors, [key]: "" });
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  /* ---------------- VALIDATION ---------------- */
  const validate = () => {
    const e: any = {};

    if (!contactName.trim()) e.contactName = "Contact name is required";
    if (!contactNumber.trim())
      e.contactNumber = "Contact number is required";
    else if (contactNumber.length !== 10)
      e.contactNumber = "Number must be 10 digits";

    if (!profession.trim()) e.profession = "Profession is required";

    if (!aadharFront) e.aadharFront = "Aadhaar front is required";
    if (!aadharBack) e.aadharBack = "Aadhaar back is required";

    if (requiresExtraId) {
      if (!idFront) e.idFront = `${extraIdLabel} front is required`;
      if (!idBack) e.idBack = `${extraIdLabel} back is required`;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const isValid =
    contactName.trim() &&
    contactNumber.length === 10 &&
    profession.trim() &&
    aadharFront &&
    aadharBack &&
    (!requiresExtraId || (idFront && idBack));

  /* ---------------- SUBMIT ---------------- */
  const onSubmit = async () => {
    if (!validate()) return;

    try {
      const token = await AsyncStorage.getItem("USER_TOKEN");
      
      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please login again.");
        return;
      }

      // Combine profile data with documents
      const payload = {
        ...profileData, // firstName, lastName, aadhaar, dob, gender, addresses, profileImage
        emergencyContactName: contactName,
        emergencyContactPhone: `${countryCode}${contactNumber}`,
        profession,
        documents: {
          aadharFront,
          aadharBack,
          ...(requiresExtraId && { idFront, idBack }),
        },
      };

      // Token is added automatically by interceptor
      const response = await userApi.post("/api/users/complete-profile", payload);

      if (response.data.success) {
        Alert.alert(
          "Success",
          "Profile completed successfully!",
          [
            {
              text: "OK",
              onPress: () => navigation.navigate("Home"),
            },
          ]
        );
      } else {
        Alert.alert("Error", response.data.message || "Failed to complete profile");
      }
    } catch (error: any) {
      console.error("Profile completion error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to complete profile. Please try again."
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* TAP OUTSIDE TO CLOSE DROPDOWN */}
        <Pressable
          className="flex-1"
          onPress={() => setShowProfessionDropdown(false)}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, flexGrow: 1 }}
          >
            {/* HEADER */}
            <View className="flex-row items-center mt-6 mb-6">
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={26} color="black" />
              </TouchableOpacity>

              <View className="flex-1 items-center -ml-6">
                <Text className="text-2xl font-extrabold text-slate-900">
                  Upload Documents
                </Text>
              </View>

              <View style={{ width: 26 }} />
            </View>

            {/* FORM CARD */}
            <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
              {/* CONTACT NAME */}
              <Text className="text-gray-700 font-semibold mb-2">
                Emergency Contact Name
              </Text>
              <TextInput
                placeholder="Enter contact name"
                placeholderTextColor="#9CA3AF"
                className="border border-gray-300 rounded-xl px-4 py-3 mb-1 bg-gray-50"
                value={contactName}
                onChangeText={setContactName}
              />
              {errors.contactName && (
                <Text className="text-red-500 text-xs mb-3">
                  {errors.contactName}
                </Text>
              )}

              {/* CONTACT NUMBER */}
              <Text className="text-gray-700 font-semibold mb-2 mt-3">
                Emergency Contact Number
              </Text>
              <View className="flex-row border border-gray-300 rounded-xl overflow-hidden mb-2 bg-gray-50">
                <TextInput
                  value={countryCode}
                  keyboardType="phone-pad"
                  maxLength={4}
                  className="w-[70px] text-center px-2 py-3 border-r border-gray-300"
                  onChangeText={(t) =>
                    setCountryCode(t.replace(/[^0-9+]/g, ""))
                  }
                />
                <TextInput
                  placeholder="10-digit number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  maxLength={10}
                  className="flex-1 px-4 py-3"
                  value={contactNumber}
                  onChangeText={(t) =>
                    setContactNumber(t.replace(/[^0-9]/g, ""))
                  }
                />
              </View>

              {/* PROFESSION */}
              <View
                onLayout={(e) =>
                  setDropdownTop(e.nativeEvent.layout.y + 55)
                }
              >
                <Text className="text-gray-700 font-semibold mb-2 mt-3">Profession</Text>
                <Pressable
                  onPress={() =>
                    setShowProfessionDropdown(!showProfessionDropdown)
                  }
                  className="border border-gray-300 rounded-xl px-4 py-3 flex-row justify-between items-center bg-gray-50"
                >
                  <Text
                    className={profession ? "text-black" : "text-gray-400"}
                  >
                    {profession || "Select profession"}
                  </Text>
                  <Ionicons
                    name={showProfessionDropdown ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="gray"
                  />
                </Pressable>
              </View>

              {errors.profession && (
                <Text className="text-red-500 text-xs mt-1 mb-2">
                  {errors.profession}
                </Text>
              )}
            </View>

            {/* DOCUMENTS CARD */}
            <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
              <Text className="text-lg font-bold text-gray-900 mb-4">Aadhaar Card</Text>
              
              {/* AADHAAR */}
              <View className="flex-row justify-between mb-4">
                {[
                  { label: "Aadhaar Front", setter: setAadharFront, value: aadharFront },
                  { label: "Aadhaar Back", setter: setAadharBack, value: aadharBack },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    className="w-[48%] h-32 border-2 border-dashed border-gray-300 rounded-xl items-center justify-center overflow-hidden bg-gray-50"
                    onPress={() => pickImage(item.setter, item.label)}
                  >
                    {item.value ? (
                      <Image source={{ uri: item.value }} className="w-full h-full" />
                    ) : (
                      <>
                        <Ionicons
                          name="cloud-upload-outline"
                          size={32}
                          color="#4F46E5"
                        />
                        <Text className="text-[12px] mt-2 font-semibold text-gray-600">
                          {item.label}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* EXTRA ID */}
              {requiresExtraId && (
                <>
                  <Text className="text-lg font-bold text-gray-900 mb-4 mt-6">{extraIdLabel}</Text>
                  <View className="flex-row justify-between">
                    {[
                      { label: `${extraIdLabel} Front`, setter: setIdFront, value: idFront },
                      { label: `${extraIdLabel} Back`, setter: setIdBack, value: idBack },
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.label}
                        className="w-[48%] h-32 border-2 border-dashed border-gray-300 rounded-xl items-center justify-center overflow-hidden bg-gray-50"
                        onPress={() => pickImage(item.setter, item.label)}
                      >
                        {item.value ? (
                          <Image source={{ uri: item.value }} className="w-full h-full" />
                        ) : (
                          <>
                            <Ionicons
                              name="cloud-upload-outline"
                              size={32}
                              color="#4F46E5"
                            />
                            <Text className="text-[12px] mt-2 font-semibold text-gray-600">
                              {item.label.replace(`${extraIdLabel} `, "")}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </View>

            {/* BUTTONS */}
            <View className="flex-row justify-between mt-2">
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                className="flex-1 py-4 rounded-2xl mr-3 bg-gray-100 border border-gray-200"
              >
                <Text className="text-center text-gray-600 font-bold text-base">
                  Back
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={!isValid}
                onPress={onSubmit}
                style={{
                  shadowColor: isValid ? "#4F46E5" : "transparent",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 5,
                }}
                className={`flex-1 py-4 rounded-2xl ml-3 ${
                  isValid ? "bg-indigo-600" : "bg-gray-300"
                }`}
              >
                <Text className="text-center text-white font-bold text-base">
                  Submit
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* FLOATING DROPDOWN */}
          {showProfessionDropdown && (
            <View
              style={{
                position: "absolute",
                top: dropdownTop + 20,
                left: 20,
                width: SCREEN_WIDTH - 40,
                backgroundColor: "white",
                borderRadius: 12,
                zIndex: 999,
                elevation: 10,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                borderWidth: 1,
                borderColor: "#E5E7EB",
              }}
            >
              {["Student", "Working Professional", "Homemaker", "Other"].map(
                (item, index, arr) => (
                  <TouchableOpacity
                    key={item}
                    style={{
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderBottomWidth: index === arr.length - 1 ? 0 : 1,
                      borderBottomColor: "#E5E7EB",
                    }}
                    onPress={() => {
                      setProfession(item);
                      setShowProfessionDropdown(false);
                      setIdFront(null);
                      setIdBack(null);
                    }}
                  >
                    <Text className="text-gray-800">{item}</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          )}
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
