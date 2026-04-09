import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Image,
  Alert,
  ActivityIndicator,
  Linking,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import { State, City } from "country-state-city";
import { api, userApi } from "../utils/api";
import {
  type StructuredAddress,
  emptyStructuredAddress,
  cashfreeAddressToStructured,
} from "../utils/address";
import { AadhaarKycCheckoutModal } from "./AadhaarKycCheckoutModal";
import ScrollableDatePicker from "./ScrollableDatePicker";

const isAadhaarVerificationExpired = (expiresAt?: string | null) => {
  if (!expiresAt) return true;
  const timestamp = new Date(expiresAt).getTime();
  if (Number.isNaN(timestamp)) return true;
  return Date.now() >= timestamp;
};
const formatExpiryDate = (expiresAt?: string | null) => {
  if (!expiresAt) return "Not available";
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return "Not available";
  return d.toLocaleDateString();
};

// Using country-state-city library for state and city data

const emptyAddress = emptyStructuredAddress;

export default function CompleteProfileScreen({ navigation, route }: any) {
  /* ----------- STATES ----------- */
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [fullName, setFullName] = useState("");
  const [aadhaarLast4, setAadhaarLast4] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const [verifyingAadhaar, setVerifyingAadhaar] = useState(false);
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [aadhaarDetails, setAadhaarDetails] = useState<any>(null);
  const [fullKycResponse, setFullKycResponse] = useState<any>(null);
  const [aadhaarCheckoutVisible, setAadhaarCheckoutVisible] = useState(false);
  
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);

  const [addressAsPerAadhaar, setAddressAsPerAadhaar] = useState<StructuredAddress>(emptyAddress);
  const [sameAsAadhar, setSameAsAadhar] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<StructuredAddress>(emptyAddress);

  const [stateList, setStateList] = useState<any[]>([]);
  const [cityList, setCityList] = useState<any[]>([]);
  const [addressLoading, setAddressLoading] = useState({ states: false, cities: false });
  const [stateModalVisible, setStateModalVisible] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [editingAddressKey, setEditingAddressKey] = useState<"aadhaar" | "current">("aadhaar");

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const [errors, setErrors] = useState<any>({});
  const scrollRef = useRef<ScrollView>(null);

  const scrollToBottomOnFocus = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
  };

  /* Fetch Indian states using country-state-city library */
  useEffect(() => {
    setAddressLoading((p) => ({ ...p, states: true }));
    try {
      // Get all states of India (country code: IN)
      const indianStates = State.getStatesOfCountry("IN");
      const formattedStates = indianStates.map((state) => ({
        name: state.name,
        iso2: state.isoCode,
      })).sort((a, b) => a.name.localeCompare(b.name));
      setStateList(formattedStates);
    } catch (error) {
      console.error("Error loading states:", error);
    } finally {
      setAddressLoading((p) => ({ ...p, states: false }));
    }
  }, []);

  const fetchCities = (stateCode: string) => {
    if (!stateCode) return;
    setAddressLoading((p) => ({ ...p, cities: true }));
    try {
      // Get all cities of the selected state in India
      const cities = City.getCitiesOfState("IN", stateCode);
      const formattedCities = cities.map((city) => ({
        name: city.name,
      })).sort((a, b) => a.name.localeCompare(b.name));
      setCityList(formattedCities);
    } catch (error) {
      console.error("Error loading cities:", error);
      setCityList([]);
    } finally {
      setAddressLoading((p) => ({ ...p, cities: false }));
    }
  };

  useEffect(() => {
    if (cityModalVisible) {
      const stateCode = editingAddressKey === "aadhaar" ? addressAsPerAadhaar.stateCode : currentAddress.stateCode;
      if (stateCode) fetchCities(stateCode);
      else setCityList([]);
    }
  }, [cityModalVisible, editingAddressKey]);

  /* ---------------- PREFETCH PROFILE ---------------- */
  useEffect(() => {
    fetchProfile();
    checkKycStatus();
    // If user came from My Profile with an explicit request to verify KYC, auto-start the Aadhaar flow once.
    if (route?.params?.startKycImmediately) {
      // Small delay so UI mounts cleanly before opening browser
      setTimeout(() => {
        handleAadhaarVerification().catch(() => {});
      }, 600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- DEEP LINK LISTENER FOR DIGILOCKER CALLBACK ---------------- */
  useEffect(() => {
    // Listen for deep link from DigiLocker callback
    const subscription = Linking.addEventListener("url", async ({ url }) => {
      console.log("Deep link received:", url);
      
      if (url.includes("kyc-success")) {
        // Check verification status from backend
        try {
          const response = await api.get("/api/kyc/digilocker/status");
          if (response.data.verified) {
            setAadhaarVerified(true);
            // Merge top-level validUntil and verifiedAt into aadhaarDetails
            const details = {
              ...(response.data.aadhaarDetails || {}),
              validUntil: response.data.validUntil || response.data.aadhaarDetails?.validUntil,
              verifiedAt: response.data.verifiedAt || response.data.aadhaarDetails?.verifiedAt,
            };
            setAadhaarDetails(details);
            setFullKycResponse(response.data);
            Alert.alert("Success", "Aadhaar verified successfully via DigiLocker!");
          } else {
            Alert.alert("Verification Pending", "Please wait while we verify your Aadhaar.");
          }
        } catch (error) {
          console.error("Status check error:", error);
          Alert.alert("Error", "Failed to check verification status");
        }
      } else if (url.includes("kyc-failed")) {
        Alert.alert("Verification Failed", "Aadhaar verification failed. Please try again.");
      }
    });

    return () => subscription.remove();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoadingProfile(true);
      
      // Debug: Check token from storage
      const token = await AsyncStorage.getItem("USER_TOKEN");
      console.log("🔑 Token from AsyncStorage:", !!token);
      if (token) {
        console.log("🔑 Token preview:", token.substring(0, 50) + "...");
        console.log("🔑 Full token:", token); // Log full token for debugging
      } else {
        console.log("❌ NO TOKEN FOUND IN ASYNC STORAGE");
        console.log("All storage keys:", await AsyncStorage.getAllKeys());
      }
      
      // Debug: Log full URL
      console.log("📡 Calling API:", "http://192.168.29.227:3002/api/users/me");
      
      // Make request with explicit error handling
      let response;
      try {
        response = await userApi.get("/api/users/me");
        console.log("✅ Response status:", response.status);
        console.log("✅ Response data:", JSON.stringify(response.data, null, 2));
      } catch (apiError: any) {
        // if user not found, it's expected for freshly registered users
        if (apiError.response?.status === 404) {
          console.log("⚠️ User not found in user-service; will treat as new user and skip prefill");

          setLoadingProfile(false);
          return;
        }
        console.error("❌ API Error details:");
        console.error("- Status:", apiError.response?.status);
        console.error("- Message:", apiError.response?.data?.message);
        console.error("- Full error:", JSON.stringify(apiError.response?.data, null, 2));
        throw apiError;
      }

      let user = response.data.user;

      if (user) {
        console.log("👤 Fetched user data:", JSON.stringify(user, null, 2));
        
        // Check if profile is already completed
        const extras = user.profileExtras || {};
        if (extras.profileCompleted === true) {
          navigation.replace("Home");
          return;
        }

        // Intentionally do not auto-populate full name or gender from registration/auth profile.
        // User must enter these explicitly on this screen.
        
        // Prefill from profileExtras if available (DOB, addresses, Aadhaar last-4, etc.)
        if (extras.aadhaarLast4) {
          setAadhaarLast4(String(extras.aadhaarLast4));
        } else if (extras.aadhaar) {
          setAadhaarLast4(String(extras.aadhaar).slice(-4));
        }
        if (extras.dob) {
          setDob(extras.dob);
          setSelectedDate(new Date(extras.dob));
          console.log("Auto-populated DOB:", extras.dob);
        }
        if (extras.addressAsPerAadhaar) {
          const a = extras.addressAsPerAadhaar;
          if (typeof a === "object" && a !== null) {
            setAddressAsPerAadhaar({ ...emptyAddress(), ...a });
          } else {
            setAddressAsPerAadhaar({ ...emptyAddress(), line1: String(a) });
          }
        }
        if (extras.currentAddress) {
          const c = extras.currentAddress;
          if (typeof c === "object" && c !== null) {
            setCurrentAddress({ ...emptyAddress(), ...c });
          } else {
            setCurrentAddress({ ...emptyAddress(), line1: String(c) });
          }
          if (JSON.stringify(extras.addressAsPerAadhaar) === JSON.stringify(extras.currentAddress)) {
            setSameAsAadhar(true);
          }
        }
        if (extras.profileImage) {
          setProfileImage(extras.profileImage);
        }

        // Check if Aadhaar/KYC is already verified – multiple sources:
        // 1. backend aadhaarStatus
        // 2. stored kycStatus / kycVerified in profileExtras
        // 3. aadhaarData already stored in profileExtras (means DigiLocker succeeded before)
        const isAlreadyVerified =
          user.aadhaarStatus === "verified" ||
          user.aadhaarStatus === "approved" ||
          extras.kycStatus === "verified" ||
          extras.kycVerified === true ||
          (Boolean(extras.aadhaarData) && !isAadhaarVerificationExpired(extras.aadhaarExpiresAt));

        if (isAlreadyVerified) {
          setAadhaarVerified(true);
          // Restore aadhaarDetails from stored data so match ticks work without a new DigiLocker call
          if (extras.aadhaarData) {
            setAadhaarDetails(extras.aadhaarData);
          } else {
            // Try live KYC service as fallback
            checkKycStatus();
          }
        }
      }
    } catch (error: any) {
      console.error("Failed to fetch profile:", error);
      
      // Handle unauthorized - redirect to login
      if (error.response?.status === 401) {
        Alert.alert(
          "Session Expired",
          "Please login again to continue.",
          [
            {
              text: "OK",
              onPress: () => navigation.replace("BasicInfo"),
            },
          ]
        );
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  const checkKycStatus = async () => {
    try {
      const response = await api.get("/api/kyc/digilocker/status");
      console.log("KYC Status Response:", JSON.stringify(response.data, null, 2));
      
      if (response.data.verified) {
        setAadhaarVerified(true);
        // Merge top-level validUntil and verifiedAt into aadhaarDetails
        const details = {
          ...(response.data.aadhaarDetails || {}),
          validUntil: response.data.validUntil || response.data.aadhaarDetails?.validUntil,
          verifiedAt: response.data.verifiedAt || response.data.aadhaarDetails?.verifiedAt,
        };
        setAadhaarDetails(details);
        setFullKycResponse(response.data);
      }
    } catch (error) {
      // Silently fail - user may not have started KYC yet
      console.log("KYC status check:", error);
    }
  };

  /* Pre-fill from Cashfree response: full name, DOB, gender (show tick when verified), and Address as per Aadhaar only. Current address is not filled from Cashfree — user fills it manually. */
  useEffect(() => {
    if (!aadhaarVerified || !aadhaarDetails) return;
    const d = aadhaarDetails;
    // Do NOT auto-fill full name, DOB, or gender from Aadhaar response.
    // Only use Aadhaar details to help pre-fill the address fields.
    const addr = cashfreeAddressToStructured(d);
    setAddressAsPerAadhaar((prev) => ({
      ...prev,
      line1: addr.line1 || prev.line1,
      line2: addr.line2 || prev.line2,
      city: addr.city || prev.city,
      state: addr.state || prev.state,
      stateCode: addr.stateCode || prev.stateCode,
      pincode: addr.pincode || prev.pincode,
    }));
  }, [aadhaarVerified, aadhaarDetails]);

  /* ---------------- AADHAAR VERIFICATION ---------------- */
  const handleAadhaarVerification = async () => {
    // Prevent double-clicks
    if (verifyingAadhaar) {
      console.log("Verification already in progress, ignoring duplicate request");
      return;
    }

    try {
      setVerifyingAadhaar(true);

      // Start DigiLocker verification (no Aadhaar input needed)
      const response = await api.post("/api/kyc/digilocker/start");

      if (!response.data.success) {
        if (response.data.shouldCheckStatus) {
          Alert.alert(
            "Verification In Progress",
            "A verification is already in progress. Checking status...",
            [{ text: "OK", onPress: () => checkKycStatus() }]
          );
          return;
        }
        // Backend says Aadhaar is already verified – fetch status to get stored details
        if (response.data.message?.includes?.("already verified")) {
          const statusRes = await api.get("/api/kyc/digilocker/status").catch(() => null);
          if (statusRes?.data?.verified) {
            setAadhaarVerified(true);
            // Merge top-level validUntil and verifiedAt into aadhaarDetails
            const details = {
              ...(statusRes.data.aadhaarDetails || {}),
              validUntil: statusRes.data.validUntil || statusRes.data.aadhaarDetails?.validUntil,
              verifiedAt: statusRes.data.verifiedAt || statusRes.data.aadhaarDetails?.verifiedAt,
            };
            setAadhaarDetails(details);
            setFullKycResponse(statusRes.data);
          } else {
            setAadhaarVerified(true);
            setFullKycResponse(statusRes?.data || { success: true, verified: true, message: "Aadhaar already verified" });
          }
          Alert.alert("Already verified", "Your Aadhaar is already verified. Details are shown below.");
          return;
        }
        Alert.alert("Error", response.data.message || "Failed to start verification");
        return;
      }

      const consentUrl = response.data.consentUrl;

      if (!consentUrl) {
        Alert.alert("Error", "Verification URL not received");
        return;
      }

      console.log("Opening DigiLocker with NEW URL:", consentUrl);

      // Use WebBrowser for better UX and automatic redirect handling
      const result = await WebBrowser.openAuthSessionAsync(
        consentUrl,
        "mystay://kyc-success"
      );

      console.log("WebBrowser result:", result);

      // Start polling after browser closes
      if (result.type === "success" || result.type === "cancel") {
        pollKycStatus();
      }
    } catch (error: any) {
      console.error("KYC ERROR:", error?.response?.data || error.message);
      const msg = error?.response?.data?.message ?? "";

      if (msg.includes("already verified")) {
        const statusRes = await api.get("/api/kyc/digilocker/status").catch(() => null);
        if (statusRes?.data?.verified) {
          setAadhaarVerified(true);
          // Merge top-level validUntil and verifiedAt into aadhaarDetails
          const details = {
            ...(statusRes.data.aadhaarDetails || {}),
            validUntil: statusRes.data.validUntil || statusRes.data.aadhaarDetails?.validUntil,
            verifiedAt: statusRes.data.verifiedAt || statusRes.data.aadhaarDetails?.verifiedAt,
          };
          setAadhaarDetails(details);
          setFullKycResponse(statusRes.data);
        } else {
          setAadhaarVerified(true);
          setFullKycResponse(statusRes?.data || { success: true, verified: true, message: "Aadhaar already verified" });
        }
        Alert.alert("Already verified", "Your Aadhaar is already verified. Details are shown below.");
        return;
      }
      if (msg.includes("ack id")) {
        Alert.alert(
          "Link Already Used",
          "This verification link was already used. Please click 'Verify Aadhaar' again to get a new link.",
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("Error", msg || "Failed to start verification");
      }
    } finally {
      setVerifyingAadhaar(false);
    }
  };

  /* ---------------- POLL KYC STATUS ---------------- */
  const pollKycStatus = async () => {
    let attempts = 0;
    const maxAttempts = 20; // Poll for ~2 minutes (20 * 6 seconds)
    
    const checkStatus = async () => {
      try {
        const response = await api.get("/api/kyc/digilocker/status");
        console.log("Poll Status Response:", JSON.stringify(response.data, null, 2));
        
        if (response.data.verified) {
          setAadhaarVerified(true);
          // Merge top-level validUntil and verifiedAt into aadhaarDetails
          const details = {
            ...(response.data.aadhaarDetails || {}),
            validUntil: response.data.validUntil || response.data.aadhaarDetails?.validUntil,
            verifiedAt: response.data.verifiedAt || response.data.aadhaarDetails?.verifiedAt,
          };
          setAadhaarDetails(details);
          setFullKycResponse(response.data);
          Alert.alert("Success", "Aadhaar verified successfully! Check the response below and compare with your entered details.");
          return true;
        }
        
        // Handle different status codes from Cashfree
        if (response.data.status === "CONSENT_DENIED") {
          Alert.alert("Consent Denied", "You denied document access. Please try again if you want to verify.");
          return true;
        }
        
        if (response.data.status === "EXPIRED") {
          Alert.alert("Expired", "Verification link expired. Please start verification again.");
          return true;
        }
        
        return false;
      } catch (error) {
        console.error("Status check error:", error);
        return false;
      }
    };

    const interval = setInterval(async () => {
      attempts++;
      
      const completed = await checkStatus();
      
      if (completed || attempts >= maxAttempts) {
        clearInterval(interval);
        if (!completed && attempts >= maxAttempts) {
          Alert.alert(
            "Verification Pending",
            "Verification is taking longer than expected. Please check back later."
          );
        }
      }
    }, 6000); // Check every 6 seconds
  };

  /* ---------------- AADHAAR MATCH (tick marks) ---------------- */
  const norm = (s: string) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");
  const aadhaarName = (aadhaarDetails?.name || "").trim();
  const aadhaarDob = (aadhaarDetails?.dob || "").trim();
  const aadhaarGender = aadhaarDetails?.gender === "M" ? "Male" : aadhaarDetails?.gender === "F" ? "Female" : "";
  const aadhaarAddress = (aadhaarDetails?.address || "").trim();
  const aadhaarExpiry =
    fullKycResponse?.validUntil ||
    fullKycResponse?.aadhaarExpiresAt ||
    fullKycResponse?.aadhaarDetails?.validUntil ||
    fullKycResponse?.aadhaarDetails?.aadhaarExpiresAt ||
    aadhaarDetails?.validUntil ||
    aadhaarDetails?.aadhaarExpiresAt ||
    null;
  const aadhaarValidityMessage = aadhaarDetails
    ? `KYC will be valid until ${formatExpiryDate(aadhaarExpiry)}`
    : null;
  const ourAddressStr = [addressAsPerAadhaar.line1, addressAsPerAadhaar.line2, addressAsPerAadhaar.city, addressAsPerAadhaar.state, addressAsPerAadhaar.pincode].filter(Boolean).join(", ");
  const matchFullName = Boolean(
    aadhaarVerified && aadhaarName && norm(fullName) === norm(aadhaarName)
  );
  // Compare DOBs by actual calendar date (ignore formatting like YYYY-MM-DD vs DD/MM/YYYY vs strings with extra text)
  const parseDateOnly = (value: string): string | null => {
    const v = (value || "").trim();
    if (!v) return null;

    // Extract all number groups
    const nums = v.match(/\d+/g);
    if (!nums || nums.length < 3) {
      // Fallback to Date parse (in case it's a plain ISO string)
      const dIso = new Date(v);
      if (!Number.isNaN(dIso.getTime())) {
        return dIso.toISOString().slice(0, 10);
      }
      return null;
    }

    // Identify year as the 4-digit group; remaining two are day & month
    let year: string | undefined;
    const rest: string[] = [];
    for (const n of nums) {
      if (!year && n.length === 4) {
        year = n;
      } else {
        rest.push(n);
      }
    }
    if (!year || rest.length < 2) {
      const dIso = new Date(v);
      if (!Number.isNaN(dIso.getTime())) {
        return dIso.toISOString().slice(0, 10);
      }
      return null;
    }

    const [a, b] = rest;
    // Heuristic: month is between 1 and 12; day is the other
    const n1 = parseInt(a, 10);
    const n2 = parseInt(b, 10);
    let day: number;
    let month: number;
    if (n1 >= 1 && n1 <= 12 && !(n2 >= 1 && n2 <= 12)) {
      month = n1;
      day = n2;
    } else if (n2 >= 1 && n2 <= 12 && !(n1 >= 1 && n1 <= 12)) {
      month = n2;
      day = n1;
    } else {
      // Ambiguous, assume first is day, second is month (DD/MM)
      day = n1;
      month = n2;
    }

    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const isoCandidate = `${year}-${mm}-${dd}`;
    const d = new Date(isoCandidate);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
    return null;
  };

  const userDobKey = parseDateOnly(dob);
  const aadhaarDobKey = parseDateOnly(aadhaarDob);

  const matchDob = Boolean(
    aadhaarVerified && userDobKey && aadhaarDobKey && userDobKey === aadhaarDobKey
  );
  const matchGender = Boolean(
    aadhaarVerified && aadhaarGender && norm(gender) === norm(aadhaarGender)
  );
  const matchAddress = Boolean(
    aadhaarVerified &&
      aadhaarAddress &&
      ourAddressStr &&
      (norm(ourAddressStr).includes(norm(aadhaarAddress)) ||
        norm(aadhaarAddress).includes(norm(ourAddressStr)))
  );

  // Overall KYC match: only require personal identity fields (name, DOB, gender) to match.
  // Address can still differ without blocking "KYC Verified".
  const kycAllMatch = Boolean(aadhaarVerified && matchFullName && matchDob && matchGender);
  const kycStatusLabel = kycAllMatch ? "KYC Verified" : "KYC Unverified";

  const MatchTick = ({ show }: { show: boolean }) =>
    show ? (
      <Ionicons
        name="checkmark-circle"
        size={20}
        color="#16a34a"
        style={{ marginLeft: 6 }}
      />
    ) : null;

  const formatKycValue = (value: any): string => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  const labelFromKey = (key: string) =>
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  /* ---------------- VALIDATION ---------------- */
  const validate = () => {
    const e: any = {};

    if (!fullName.trim()) e.fullName = "Full name is required";
    const last4 = aadhaarLast4.replace(/\D/g, "");
    if (last4.length !== 4) e.aadhaarLast4 = "Enter last 4 digits of Aadhaar";

    if (!dob.trim()) e.dob = "Date of birth is required";
    if (!gender.trim()) e.gender = "Gender is required";
    if (!addressAsPerAadhaar.line1?.trim()) e.addressAadhaar = "Address line 1 is required";
    if (!addressAsPerAadhaar.state) e.addressAadhaarState = "State is required";
    if (!addressAsPerAadhaar.city) e.addressAadhaarCity = "City is required";
    if (!addressAsPerAadhaar.pincode?.trim() || addressAsPerAadhaar.pincode.length !== 6) e.addressAadhaarPincode = "Valid 6-digit pincode required";
    if (!sameAsAadhar) {
      if (!currentAddress.line1?.trim()) e.currentAddress = "Current address line 1 is required";
      if (!currentAddress.state) e.currentAddressState = "State is required";
      if (!currentAddress.city) e.currentAddressCity = "City is required";
      if (!currentAddress.pincode?.trim() || currentAddress.pincode.length !== 6) e.currentAddressPincode = "Valid 6-digit pincode required";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const isValid =
    fullName.trim() &&
    dob.trim() &&
    gender.trim() &&
    addressAsPerAadhaar.line1?.trim() &&
    addressAsPerAadhaar.state &&
    addressAsPerAadhaar.city &&
    addressAsPerAadhaar.pincode?.trim().length === 6 &&
    (sameAsAadhar || (currentAddress.line1?.trim() && currentAddress.state && currentAddress.city && currentAddress.pincode?.trim().length === 6));

  /* ---------------- IMAGE PICKER WITH CROPPER ---------------- */
  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant camera roll permissions to upload a photo."
        );
        return;
      }

      // Launch image picker with cropping
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        // Convert to base64 immediately
        try {
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const reader = new FileReader();
          
          reader.onloadend = () => {
            const base64data = reader.result as string;
            console.log('[CompleteProfileScreen] Image converted to base64');
            console.log('[CompleteProfileScreen] Base64 length:', base64data.length);
            console.log('[CompleteProfileScreen] Base64 preview:', base64data.substring(0, 50));
            setProfileImage(base64data);
          };
          
          reader.readAsDataURL(blob);
        } catch (conversionError) {
          console.error("Error converting image to base64:", conversionError);
          Alert.alert("Error", "Failed to process image. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  /* ---------------- SUBMIT ---------------- */
  const onNext = () => {
    if (!validate()) return;

    const normalizedFullName = fullName.trim().replace(/\s+/g, " ");
    const [derivedFirst, ...rest] = normalizedFullName.split(" ");
    const derivedLast = rest.join(" ");

    // Include aadhaarData from DigiLocker so user-service can store and expose it
    // for My Profile and Admin Verify Details screens (KYC match ticks, Aadhaar detail display).
    const aadhaarDataPayload = aadhaarDetails
      ? {
          name: aadhaarDetails.name,
          dob: aadhaarDetails.dob,
          gender: aadhaarDetails.gender,
          aadhaarMasked: aadhaarDetails.aadhaarMasked,
          address: aadhaarDetails.address,
          addressObject: aadhaarDetails.addressObject,
          care_of: aadhaarDetails.care_of,
          year_of_birth: aadhaarDetails.year_of_birth,
        }
      : undefined;

    navigation.navigate("CompleteProfileDocs", {
      profileData: {
        firstName: derivedFirst,
        lastName: derivedLast,
        aadhaarLast4: aadhaarLast4.replace(/\D/g, ""),
        dob,
        gender,
        addressAsPerAadhaar: { ...addressAsPerAadhaar },
        currentAddress: sameAsAadhar ? { ...addressAsPerAadhaar } : { ...currentAddress },
        profileImage,
        aadhaarVerified,
        kycStatus: kycAllMatch ? "verified" : "unverified",
        kycVerified: kycAllMatch,
        ...(aadhaarDataPayload && { aadhaarData: aadhaarDataPayload }),
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]">
      <KeyboardAvoidingView
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {loadingProfile ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text className="text-gray-500 mt-4">Loading profile...</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              padding: 24,
              paddingBottom: Platform.OS === "ios" ? 120 : 60,
              flexGrow: 1,
            }}
          >
            {/* HEADER */}
            <View className="flex-row items-center mb-6 mt-6">
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={26} color="black" />
              </TouchableOpacity>

              <View className="flex-1 items-center -ml-6">
                <Text className="text-2xl font-extrabold text-slate-900">
                  Complete your Profile
                </Text>
              </View>

              <View style={{ width: 26 }} />
            </View>

            {/* PHOTO */}
            <View className="flex-row items-center gap-5 mb-8">
            <View className="w-20 h-20 rounded-full border-2 border-gray-200 bg-white items-center justify-center overflow-hidden">
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={{ width: 80, height: 80 }}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={40} color="#777" />
              )}
            </View>

            <TouchableOpacity
              onPress={pickImage}
              className="px-5 py-3 rounded-xl bg-indigo-50 border-2 border-indigo-200 flex-row items-center"
            >
              <Ionicons name="camera" size={18} color="#4F46E5" />
              <Text className="ml-2 font-bold text-[14px] text-indigo-700">
                Upload Photo
              </Text>
            </TouchableOpacity>
          </View>

          {/* FORM CARD */}
          <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            {/* Full Name (as per Aadhaar) */}
            <View className="flex-row items-center mb-2">
              <Text className="text-gray-700 font-semibold">Full Name (as per Aadhaar)</Text>
              <MatchTick show={matchFullName} />
            </View>
            <TextInput
              placeholder="Enter full name"
              placeholderTextColor="#9CA3AF"
              className="border border-gray-300 rounded-xl px-4 py-3 mb-1 bg-white"
              value={fullName}
              onChangeText={setFullName}
            />
            {errors.fullName && (
              <Text className="text-red-500 text-xs mb-3">
                {errors.fullName}
              </Text>
            )}

            {/* Last 4 digits of Aadhaar - 3 blocks: XXXX XXXX [input] */}
            <Text className="text-gray-700 font-semibold mb-2 mt-3">Last 4 digits of Aadhaar</Text>
            <View className="flex-row items-center gap-2 mb-1">
              <View className="flex-1 border bg-gray-100 border-gray-300 rounded-xl px-4 py-3 items-center justify-center">
                <Text className="text-gray-500 font-mono text-lg">XXXX</Text>
              </View>
              <View className="flex-1 border border-gray-300 rounded-xl px-4 py-3 bg-gray-100 items-center justify-center">
                <Text className="text-gray-500 font-mono text-lg">XXXX</Text>
              </View>
              <TextInput
                placeholder="XXXX"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={4}
                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 bg-white text-center font-mono text-lg"
                value={aadhaarLast4}
                onChangeText={(t) => setAadhaarLast4(t.replace(/\D/g, "").slice(0, 4))}
              />
            </View>
            {errors.aadhaarLast4 && (
              <Text className="text-red-500 text-xs mb-3">
                {errors.aadhaarLast4}
              </Text>
            )}

            

            {/* DOB + Gender */}
            <View className="flex-row justify-between mb-3 mt-2">
              <View style={{ width: "48%" }}>
                <View className="flex-row items-center mb-2">
                  <Text className="text-gray-700 font-semibold">Date of Birth</Text>
                  <MatchTick show={matchDob} />
                </View>
                <ScrollableDatePicker
                  selectedDate={selectedDate || null}
                  onDateChange={(date) => {
                    setSelectedDate(date || undefined);
                    if (date) {
                      setDob(date.toISOString().split("T")[0]);
                    }
                  }}
                  maximumDate={new Date()}
                />
              </View>

              <View style={{ width: "48%" }}>
                <View className="flex-row items-center mb-2">
                  <Text className="text-gray-700 font-semibold">Gender</Text>
                  <MatchTick show={matchGender} />
                </View>
                <Pressable
                  onPress={() => setShowGenderDropdown(!showGenderDropdown)}
                  className="border border-gray-300 rounded-xl px-4 py-3 flex-row justify-between items-center bg-white"
                >
                  <Text className={gender ? "text-black" : "text-gray-400"}>
                    {gender || "Select"}
                  </Text>
                  <Ionicons
                    name={showGenderDropdown ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="gray"
                  />
                </Pressable>

                {showGenderDropdown && (
                  <View className="absolute top-[67px] w-full bg-white rounded-xl shadow-lg z-20 border border-gray-200">
                    {["Male", "Female"].map((item) => (
                      <TouchableOpacity
                        key={item}
                        className="px-4 py-3 border-b border-gray-100"
                        onPress={() => {
                          setGender(item);
                          setShowGenderDropdown(false);
                        }}
                      >
                        <Text className="text-gray-800">{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Aadhaar Verification */}
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-gray-700 font-semibold">Aadhaar Verification</Text>
              <Text className={`text-xs font-semibold ${kycAllMatch ? "text-green-700" : "text-amber-700"}`}>
                {kycStatusLabel}
              </Text>
            </View>
            {aadhaarValidityMessage && (
              <View className="mb-3 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                <Text className="text-[11px] font-semibold text-indigo-700">
                  {aadhaarValidityMessage}
                </Text>
              </View>
            )}
            {!aadhaarVerified ? (
              <TouchableOpacity
                onPress={() => setAadhaarCheckoutVisible(true)}
                disabled={verifyingAadhaar}
                className={`px-4 py-4 rounded-xl flex-row items-center justify-center ${verifyingAadhaar ? 'bg-gray-300' : 'bg-indigo-600'}`}
              >
                {verifyingAadhaar ? (
                  <>
                    <ActivityIndicator size="small" color="white" />
                    <Text className="text-white font-bold ml-2">Verifying...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={20} color="white" />
                    <Text className="text-white font-bold ml-2">Verify Aadhaar via DigiLocker</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View className={`px-4 py-4 rounded-xl flex-row items-center justify-center ${kycAllMatch ? "bg-green-600" : "bg-amber-600"}`}>
                <Ionicons name="shield-checkmark" size={20} color="white" />
                <Text className="text-white font-bold ml-2">{kycStatusLabel}</Text>
              </View>
            )}

            {/* Address as per Aadhaar - same structure as admin property address */}
            <View className="flex-row items-center mb-2 mt-3">
              <Text className="text-gray-700 font-semibold">Address as per Aadhaar</Text>
              <MatchTick show={matchAddress} />
            </View>
            <View className="mb-2">
              <Text className="text-gray-500 text-xs mb-1">Address Line 1</Text>
              <TextInput
                placeholder="House no, Street name"
                placeholderTextColor="#9CA3AF"
                value={addressAsPerAadhaar.line1}
                onChangeText={(t) => setAddressAsPerAadhaar((a) => ({ ...a, line1: t }))}
                className="border border-gray-300 rounded-xl px-4 py-3 bg-white"
                style={{ color: "#000000" }}
              />
            </View>
            <View className="mb-2">
              <Text className="text-gray-500 text-xs mb-1">Address Line 2 (optional)</Text>
              <TextInput
                placeholder="Landmark, Area name"
                placeholderTextColor="#9CA3AF"
                value={addressAsPerAadhaar.line2 || ""}
                onChangeText={(t) => setAddressAsPerAadhaar((a) => ({ ...a, line2: t }))}
                className="border border-gray-300 rounded-xl px-4 py-3 bg-white"
                style={{ color: "#000000" }}
              />
            </View>
            <View className="flex-row gap-3 mb-2">
              <View className="flex-1">
                <Text className="text-gray-500 text-xs mb-1">State</Text>
                <TouchableOpacity
                  onPress={() => { setEditingAddressKey("aadhaar"); setStateModalVisible(true); }}
                  className="border border-gray-300 rounded-xl px-4 py-3 bg-white flex-row justify-between items-center"
                >
                  <Text numberOfLines={1} className={addressAsPerAadhaar.state ? "text-black" : "text-gray-400"}>
                    {addressAsPerAadhaar.state || "Select"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="gray" />
                </TouchableOpacity>
              </View>
              <View className="flex-1">
                <Text className="text-gray-500 text-xs mb-1">City</Text>
                <TouchableOpacity
                  onPress={() => { setEditingAddressKey("aadhaar"); setCityModalVisible(true); }}
                  className="border border-gray-300 rounded-xl px-4 py-3 bg-white flex-row justify-between items-center"
                >
                  <Text numberOfLines={1} className={addressAsPerAadhaar.city ? "text-black" : "text-gray-400"}>
                    {addressAsPerAadhaar.city || "Select"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="gray" />
                </TouchableOpacity>
              </View>
            </View>
            <View className="mb-4">
              <Text className="text-gray-500 text-xs mb-1">Pin Code</Text>
              <TextInput
                placeholder="6-digit PIN"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={6}
                value={addressAsPerAadhaar.pincode}
                onChangeText={(t) => setAddressAsPerAadhaar((a) => ({ ...a, pincode: t.replace(/\D/g, "").slice(0, 6) }))}
                className="border border-gray-300 rounded-xl px-4 py-3 bg-white"
                style={{ color: "#000000" }}
              />
            </View>

            {/* Same as Aadhaar */}
            <TouchableOpacity
              className="flex-row items-center mb-4"
              onPress={() => {
                setSameAsAadhar(!sameAsAadhar);
                if (!sameAsAadhar) setCurrentAddress({ ...addressAsPerAadhaar });
                else setCurrentAddress(emptyAddress());
              }}
            >
              <View
                className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                  sameAsAadhar ? "border-indigo-600" : "border-gray-400"
                }`}
              >
                {sameAsAadhar && (
                  <View className="w-3 h-3 bg-indigo-600 rounded-full" />
                )}
              </View>
              <Text className="text-gray-700 font-medium">Same as Aadhaar</Text>
            </TouchableOpacity>

            {/* Current Address - user fills manually; not pre-filled from Cashfree/Aadhaar */}
            <Text className="text-gray-700 font-semibold mb-2">Current Address</Text>
            <Text className="text-gray-500 text-xs mb-2">Enter your current residence manually</Text>
            <View className="mb-2">
              <Text className="text-gray-500 text-xs mb-1">Address Line 1</Text>
              <TextInput
                placeholder="House no, Street name"
                placeholderTextColor="#9CA3AF"
                editable={!sameAsAadhar}
                value={currentAddress.line1}
                onChangeText={(t) => setCurrentAddress((a) => ({ ...a, line1: t }))}
                className="border border-gray-300 rounded-xl px-4 py-3 bg-white"
              />
            </View>
            <View className="mb-2">
              <Text className="text-gray-500 text-xs mb-1">Address Line 2 (optional)</Text>
              <TextInput
                placeholder="Landmark, Area name"
                placeholderTextColor="#9CA3AF"
                editable={!sameAsAadhar}
                value={currentAddress.line2 || ""}
                onChangeText={(t) => setCurrentAddress((a) => ({ ...a, line2: t }))}
                className="border border-gray-300 rounded-xl px-4 py-3 bg-white"
              />
            </View>
            <View className="flex-row gap-3 mb-2">
              <View className="flex-1">
                <Text className="text-gray-500 text-xs mb-1">State</Text>
                <TouchableOpacity
                  onPress={() => { if (!sameAsAadhar) { setEditingAddressKey("current"); setStateModalVisible(true); } }}
                  disabled={sameAsAadhar}
                  className={`border border-gray-300 rounded-xl px-4 py-3 flex-row justify-between items-center bg-white ${sameAsAadhar ? "border-dashed opacity-80" : ""}`}
                >
                  <Text numberOfLines={1} className={currentAddress.state ? "text-black" : "text-gray-400"}>
                    {currentAddress.state || "Select"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="gray" />
                </TouchableOpacity>
              </View>
              <View className="flex-1">
                <Text className="text-gray-500 text-xs mb-1">City</Text>
                <TouchableOpacity
                  onPress={() => { if (!sameAsAadhar) { setEditingAddressKey("current"); setCityModalVisible(true); } }}
                  disabled={sameAsAadhar}
                  className={`border border-gray-300 rounded-xl px-4 py-3 flex-row justify-between items-center bg-white ${sameAsAadhar ? "border-dashed opacity-80" : ""}`}
                >
                  <Text numberOfLines={1} className={currentAddress.city ? "text-black" : "text-gray-400"}>
                    {currentAddress.city || "Select"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="gray" />
                </TouchableOpacity>
              </View>
            </View>
            <View className="mb-3">
              <Text className="text-gray-500 text-xs mb-1">Pin Code</Text>
              <TextInput
                placeholder="6-digit PIN"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={6}
                editable={!sameAsAadhar}
                value={currentAddress.pincode}
                onChangeText={(t) => setCurrentAddress((a) => ({ ...a, pincode: t.replace(/\D/g, "").slice(0, 6) }))}
                onFocus={() => {
                  setTimeout(() => {
                    scrollRef.current?.scrollToEnd({ });
                  }, 300);
                }}
                className={`border border-gray-300 rounded-xl px-4 py-3 bg-white ${sameAsAadhar ? "border-dashed opacity-80" : ""}`}
              />
            </View>
          </View>

          <AadhaarKycCheckoutModal
            visible={aadhaarCheckoutVisible}
            onClose={() => setAadhaarCheckoutVisible(false)}
            onProceed={() => {
              setAadhaarCheckoutVisible(false);
              handleAadhaarVerification().catch(() => {});
            }}
            title="Aadhaar KYC"
            subtitle="Review charges before verification"
          />

          {/* State / City modals */}
          <Modal visible={stateModalVisible} animationType="slide" transparent>
            <View className="flex-1 justify-end bg-black/50">
              <View className="bg-white h-[60%] rounded-t-3xl p-6">
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-xl font-bold">Select State</Text>
                  <TouchableOpacity onPress={() => setStateModalVisible(false)}>
                    <Ionicons name="close" size={24} color="black" />
                  </TouchableOpacity>
                </View>
                {addressLoading.states ? (
                  <ActivityIndicator size="large" color="#4F46E5" className="mt-10" />
                ) : (
                  <FlatList
                    data={stateList}
                    keyExtractor={(item, idx) => String(item?.iso2 || item?.name || idx)}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        className="py-4 border-b border-gray-100"
                        onPress={() => {
                          const upd = { state: item.name, stateCode: item.iso2, city: "" };
                          if (editingAddressKey === "aadhaar") {
                            setAddressAsPerAadhaar((a) => ({ ...a, ...upd }));
                            fetchCities(item.iso2);
                          } else {
                            setCurrentAddress((a) => ({ ...a, ...upd }));
                            fetchCities(item.iso2);
                          }
                          setStateModalVisible(false);
                        }}
                      >
                        <Text className="text-gray-700">{item.name}</Text>
                      </TouchableOpacity>
                    )}
                  />
                )}
              </View>
            </View>
          </Modal>
          <Modal visible={cityModalVisible} animationType="slide" transparent>
            <View className="flex-1 justify-end bg-black/50">
              <View className="bg-white h-[60%] rounded-t-3xl p-6">
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-xl font-bold">Select City</Text>
                  <TouchableOpacity onPress={() => setCityModalVisible(false)}>
                    <Ionicons name="close" size={24} color="black" />
                  </TouchableOpacity>
                </View>
                {addressLoading.cities ? (
                  <ActivityIndicator size="large" color="#4F46E5" className="mt-10" />
                ) : (
                  <FlatList
                    data={cityList}
                    keyExtractor={(item, i) => `city-${i}-${item.name || i}`}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        className="py-4 border-b border-gray-100"
                        onPress={() => {
                          if (editingAddressKey === "aadhaar") {
                            setAddressAsPerAadhaar((a) => ({ ...a, city: item.name }));
                          } else {
                            setCurrentAddress((a) => ({ ...a, city: item.name }));
                          }
                          setCityModalVisible(false);
                        }}
                      >
                        <Text className="text-gray-700">{item.name}</Text>
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={<Text className="text-center text-gray-400 mt-10">Select state first</Text>}
                  />
                )}
              </View>
            </View>
          </Modal>

          {/* BUTTONS */}
          <View className="flex-row justify-between mt-8">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="flex-1 py-4 rounded-2xl mr-3 bg-white border border-gray-300"
            >
              <Text className="text-center text-gray-700 font-bold text-base">
                Back
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={!isValid}
              onPress={onNext}
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
                Next
              </Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
