import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Keyboard,
  Linking,
  Modal,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import BottomNav from "./BottomNav";
import { useTheme } from "../context/ThemeContext";
import { api, userApi } from "../utils/api";
import { clearAadhaarKycOnAuthService } from "../utils/authKycSync";
import { resetToWelcome } from "../utils/navigationRef";
import { formatAddress, cashfreeAddressToStructured } from "../utils/address";
import {
  computeKycIdentityMatch,
  parseDateOnly,
  resolveFinalKycVerified,
} from "../utils/kyc";
import { formatLocalYMD } from "../utils/dateCalendar";
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

/**
 * Keep profile photo payload small to avoid 413 (Payload Too Large).
 * Mirrors the compression approach used in Upload Documents flow.
 */
const compressProfileImageToDataUri = async (uri: string): Promise<string> => {
  const maxEdge = 600;
  const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(
      uri,
      (w, h) => resolve({ width: w, height: h }),
      (e) => reject(e)
    );
  });

  const actions: ImageManipulator.Action[] = [];
  if (width > maxEdge || height > maxEdge) {
    if (width >= height) actions.push({ resize: { width: maxEdge } });
    else actions.push({ resize: { height: maxEdge } });
  }

  let current = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: 0.35,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  const MAX_BASE64_CHARS = 300_000;
  let base64 = await FileSystem.readAsStringAsync(current.uri, { encoding: "base64" });

  for (const q of [0.3, 0.26, 0.22]) {
    if (base64.length <= MAX_BASE64_CHARS) break;
    current = await ImageManipulator.manipulateAsync(current.uri, [], {
      compress: q,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    base64 = await FileSystem.readAsStringAsync(current.uri, { encoding: "base64" });
  }

  if (base64.length > MAX_BASE64_CHARS) {
    current = await ImageManipulator.manipulateAsync(
      current.uri,
      [{ resize: { width: 480 } }],
      { compress: 0.22, format: ImageManipulator.SaveFormat.JPEG }
    );
    base64 = await FileSystem.readAsStringAsync(current.uri, { encoding: "base64" });
  }

  return `data:image/jpeg;base64,${base64}`;
};

interface UserProfile {
  uniqueId: string;
  firstName: string;
  lastName: string;
  sex: string;
  phone: string;
  email: string;
  aadhaarStatus: string;
  emergencyName?: string;
  emergencyPhone?: string;
  profession?: string;
  profileExtras?: {
    dob?: string;
    addressAsPerAadhaar?: string | { line1?: string; line2?: string; state?: string; city?: string; pincode?: string };
    currentAddress?: string | { line1?: string; line2?: string; state?: string; city?: string; pincode?: string };
    profileImage?: string;
    aadhaar?: string;
    aadhaarLast4?: string;
    aadhaarData?: {
      name?: string;
      dob?: string;
      gender?: string;
      address?: string;
      validUntil?: string; // Add this
      verifiedAt?: string; // Add this
    };
    documents?: {
      aadharFront?: string;
      aadharBack?: string;
      idFront?: string;
      idBack?: string;
    };
    profileCompleted?: boolean;
    /** Backend-stored KYC status: "verified" | "unverified". Used for label. */
    kycStatus?: string;
    kycVerified?: boolean;
    aadhaarVerifiedAt?: string;
    aadhaarExpiresAt?: string;
    aadhaarValidUntil?: string; // Add this field
  };
}

export default function ProfileScreen2({ navigation }: any) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [aadhaarVerifiedByKycService, setAadhaarVerifiedByKycService] = useState(false);
  const [aadhaarDetailsFromKycService, setAadhaarDetailsFromKycService] = useState<any>(null);
  const [aadhaarCheckoutVisible, setAadhaarCheckoutVisible] = useState(false);
  const [verifyingAadhaar, setVerifyingAadhaar] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [kycResetModalVisible, setKycResetModalVisible] = useState(false);
  const kycResetResolveRef = useRef<((ok: boolean) => void) | null>(null);

  /* 🎨 THEME COLORS */
  const isFemale = theme === "female";

  const gradientColors: [string, string] = isFemale
    ? ["#EC4899", "#F472B6"]
    : ["#3B4BFF", "#5F6BFF"];

  const primaryColor = isFemale ? "#EC4899" : "#3B4BFF";
  const softBg = isFemale ? "bg-[#FFE4F2]" : "bg-[#EEF2FF]";

  useEffect(() => {
  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch profile first
      const loadedUser = await fetchProfile();
      const hasStoredAadhaar =
        loadedUser?.profileExtras?.aadhaarData &&
        typeof loadedUser.profileExtras.aadhaarData === "object" &&
        Object.keys(loadedUser.profileExtras.aadhaarData as object).length > 0;

      // Then fetch KYC status (auth DB). Trust DigiLocker "verified" only if user profile still has Aadhaar payload (or verification in progress).
      try {
        const res = await api.get("/api/kyc/digilocker/status");
        console.log("KYC Status Response:", JSON.stringify(res.data, null, 2));

        const digilockerVerified = Boolean(res?.data?.verified);
        const trustDigilocker = digilockerVerified && (Boolean(hasStoredAadhaar) || verifyingAadhaar);

        if (trustDigilocker) {
          setAadhaarVerifiedByKycService(true);
          if (res?.data?.aadhaarDetails) {
            console.log("Aadhaar Details from KYC service:", JSON.stringify(res.data.aadhaarDetails, null, 2));
            setAadhaarDetailsFromKycService({
              ...res.data.aadhaarDetails,
              validUntil: res.data.validUntil || res.data.aadhaarDetails.validUntil,
              verifiedAt: res.data.verifiedAt || res.data.aadhaarDetails.verifiedAt,
            });
          }
        } else {
          setAadhaarVerifiedByKycService(false);
          if (!hasStoredAadhaar) {
            setAadhaarDetailsFromKycService(null);
          }
        }
      } catch (error) {
        console.error("Error fetching KYC status:", error);
        setAadhaarVerifiedByKycService(false);
        setAadhaarDetailsFromKycService(null);
      }
    } catch (error) {
      console.error("Error loading profile data:", error);
    } finally {
      setLoading(false);
    }
  };

  loadData();
}, []); // Empty dependency array - runs once on mount

  const normalizeAddrCompare = (s: string) =>
    s.toLowerCase().replace(/\s+/g, " ").replace(/,/g, " ").trim();

  /**
   * If backend already stores KYC `aadhaarData` (Cashfree/DigiLocker) with address fields,
   * keep `addressAsPerAadhaar` in sync with that response (same mapping as Complete Profile).
   */
  const syncAddressFromBackendAadhaarData = async (user: UserProfile): Promise<void> => {
    const extras = user.profileExtras || {};
    const ad = extras.aadhaarData as Record<string, unknown> | undefined;
    if (!ad || typeof ad !== "object") return;
    if (!ad.address && !ad.addressObject) return;
    const fromKyc = cashfreeAddressToStructured(ad);
    const kycFmt = formatAddress(fromKyc);
    if (kycFmt === "Not provided") return;
    const cur = extras.addressAsPerAadhaar;
    const curFmt =
      cur == null || cur === ""
        ? ""
        : typeof cur === "string"
          ? cur.trim()
          : formatAddress(cur as any);
    if (normalizeAddrCompare(curFmt || "") === normalizeAddrCompare(kycFmt)) return;
    try {
      await userApi.put("/api/users/profile-info", { addressAsPerAadhaar: fromKyc });
      const res = await userApi.get("/api/users/me");
      if (res.data?.success) setProfile(res.data.user);
    } catch (e) {
      console.warn("[ProfileScreen2] syncAddressFromBackendAadhaarData", e);
    }
  };

  /**
   * After Aadhaar data is stored, align `kycStatus` / `kycVerified` with Complete Profile rules
   * (name + DOB + gender match Aadhaar).
   */
  const syncKycStatusFromMatch = async (user: UserProfile) => {
    const extras = user.profileExtras || {};
    const ad = extras.aadhaarData;
    if (!ad || typeof ad !== "object") return;

    const matched = computeKycIdentityMatch(user, ad, true);
    const nextStatus = matched ? "verified" : "unverified";
    const nextVerified = matched;

    const curStatus = (extras.kycStatus || "").toLowerCase();
    const curVerified = extras.kycVerified === true;

    if (curStatus === nextStatus && curVerified === nextVerified) return;

    try {
      await userApi.put("/api/users/profile-info", {
        kycStatus: nextStatus,
        kycVerified: nextVerified,
      });
      const res = await userApi.get("/api/users/me");
      if (res.data?.success) setProfile(res.data.user);
    } catch (e) {
      console.warn("[ProfileScreen2] syncKycStatusFromMatch", e);
    }
  };

  const fetchProfile = async (): Promise<UserProfile | null> => {
  try {
    const response = await userApi.get("/api/users/me");

    if (response.data.success) {
      const u = response.data.user as UserProfile;
      setProfile(u);
      console.log("Profile data:", JSON.stringify(response.data.user, null, 2));
      const hasStoredAadhaar =
        u.profileExtras?.aadhaarData &&
        typeof u.profileExtras.aadhaarData === "object" &&
        Object.keys(u.profileExtras.aadhaarData as object).length > 0;
      // Avoid showing Cashfree as "verified" from stale local state after KYC was cleared on user profile.
      if (!hasStoredAadhaar && !verifyingAadhaar) {
        setAadhaarDetailsFromKycService(null);
        setAadhaarVerifiedByKycService(false);
      }
      await syncAddressFromBackendAadhaarData(u);
      await syncKycStatusFromMatch(u);
      return u;
    }
    return null;
  } catch (error: any) {
    console.error("Failed to fetch profile:", error);
    
    if (error.response?.status === 401) {
      Alert.alert(
        "Session Expired",
        "Please login again to continue.",
        [
          {
            text: "OK",
            onPress: () => navigation.replace("LoginPin"),
          },
        ]
      );
    } else {
      Alert.alert("Error", "Failed to load profile data");
    }
    throw error; // Re-throw to be caught by the main useEffect
  }
};

// Add this function to refresh data when returning from KYC
const refreshData = async () => {
  setLoading(true);
  try {
    const u = await fetchProfile();
    const hasStoredAadhaar =
      u?.profileExtras?.aadhaarData &&
      typeof u.profileExtras.aadhaarData === "object" &&
      Object.keys(u.profileExtras.aadhaarData as object).length > 0;

    const res = await api.get("/api/kyc/digilocker/status");
    const digilockerVerified = Boolean(res?.data?.verified);
    const trustDigilocker = digilockerVerified && (Boolean(hasStoredAadhaar) || verifyingAadhaar);

    if (trustDigilocker) {
      setAadhaarVerifiedByKycService(true);
      if (res?.data?.aadhaarDetails) {
        console.log("Aadhaar Details from KYC service:", JSON.stringify(res.data.aadhaarDetails, null, 2));
        setAadhaarDetailsFromKycService({
          ...res.data.aadhaarDetails,
          validUntil: res.data.validUntil || res.data.aadhaarDetails.validUntil,
          verifiedAt: res.data.verifiedAt || res.data.aadhaarDetails.verifiedAt,
          _rawResponse: res.data,
        });
      }
    } else {
      setAadhaarVerifiedByKycService(false);
      if (!hasStoredAadhaar) {
        setAadhaarDetailsFromKycService(null);
      }
    }
  } catch (error) {
    console.error("Error refreshing data:", error);
  } finally {
    setLoading(false);
  }
};

  const splitFullName = (full: string) => {
    const t = full.trim();
    if (!t) return { firstName: "", lastName: "" };
    const i = t.indexOf(" ");
    if (i === -1) return { firstName: t, lastName: "" };
    return { firstName: t.slice(0, i).trim(), lastName: t.slice(i + 1).trim() };
  };

  const normIdentity = (s: string) =>
    String(s || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const hasKycDataToLose = (p: UserProfile) => {
    const ex = p.profileExtras || {};
    const ad = ex.aadhaarData;
    if (ad && typeof ad === "object" && Object.keys(ad as object).length > 0) return true;
    if (ex.kycVerified === true) return true;
    const ks = String(ex.kycStatus || "")
      .trim()
      .toLowerCase();
    return ks === "verified" || ks === "kyc_verified" || ks === "approved";
  };

  const identityFieldChanged = {
    fullName: (cur: string, next: string) => normIdentity(cur) !== normIdentity(next),
    dob: (cur: string, next: string) => parseDateOnly(cur) !== parseDateOnly(next),
    gender: (cur: string, next: string) => normIdentity(cur) !== normIdentity(next),
  };

  const saveIdentityFieldWithKycWarning = async (payload: Record<string, unknown>) => {
    const p = profile;
    if (!p) throw new Error("No profile");
    const warn = hasKycDataToLose(p);
    const run = async () => {
      const body = warn ? { ...payload, clearAadhaarKyc: true } : payload;
      const res = await userApi.put("/api/users/profile-info", body);
      if (!res.data?.success) throw new Error(res.data?.message || "Update failed");
      // Auth DB: user-service also calls auth internal/clear-aadhaar-kyc; that often fails in prod if
      // AUTH_SERVICE_URL / networking is wrong. Always run JWT-based clear too (idempotent).
      if (warn) {
        await clearAadhaarKycOnAuthService();
      }
      setAadhaarVerifiedByKycService(false);
      setAadhaarDetailsFromKycService(null);
      await fetchProfile();
    };
    if (!warn) {
      await run();
      return;
    }
    const ok = await new Promise<boolean>((resolve) => {
      kycResetResolveRef.current = resolve;
      setKycResetModalVisible(true);
    });
    if (!ok) throw new Error("CANCELLED");
    await run();
  };

  const onKycResetModalConfirm = async () => {
    setKycResetModalVisible(false);
    const r = kycResetResolveRef.current;
    kycResetResolveRef.current = null;
    r?.(true);
  };

  const onKycResetModalCancel = () => {
    setKycResetModalVisible(false);
    const r = kycResetResolveRef.current;
    kycResetResolveRef.current = null;
    r?.(false);
  };

  const mergeKycDetails = (data: any) => ({
    ...(data?.aadhaarDetails || {}),
    validUntil: data?.validUntil || data?.aadhaarDetails?.validUntil,
    verifiedAt: data?.verifiedAt || data?.aadhaarDetails?.verifiedAt,
  });

  /** Save Cashfree/DigiLocker address + aadhaar payload to profile (same shape as Complete Profile). */
  const persistKycAndAddressFromStatus = async (statusData: any) => {
    const details = mergeKycDetails(statusData);
    const structured = cashfreeAddressToStructured(details);
    const aadhaarDataPayload: Record<string, unknown> = {
      name: details.name,
      dob: details.dob,
      gender: details.gender,
      aadhaarMasked: details.aadhaarMasked,
      address: details.address,
      addressObject: details.addressObject,
      care_of: details.care_of,
      year_of_birth: details.year_of_birth,
      validUntil: details.validUntil,
      verifiedAt: details.verifiedAt,
    };
    const cleaned = Object.fromEntries(
      Object.entries(aadhaarDataPayload).filter(([, v]) => v != null && v !== "")
    );
    const body: Record<string, unknown> = {
      addressAsPerAadhaar: structured,
    };
    if (Object.keys(cleaned).length) body.aadhaarData = cleaned;
    const exp = details.validUntil || statusData?.validUntil;
    if (exp) body.aadhaarExpiresAt = exp;
    await userApi.put("/api/users/profile-info", body);
    const me = await userApi.get("/api/users/me");
    if (me.data?.success) {
      await syncKycStatusFromMatch(me.data.user as UserProfile);
    }
  };

  const pollKycStatus = () => {
    let attempts = 0;
    const maxAttempts = 20;
    const interval = setInterval(async () => {
      attempts += 1;
      try {
        const response = await api.get("/api/kyc/digilocker/status");
        if (response.data.verified) {
          clearInterval(interval);
          try {
            await persistKycAndAddressFromStatus(response.data);
          } catch (pe) {
            console.error(pe);
            Alert.alert(
              "Partial save",
              "Aadhaar verified, but saving your address failed. You can edit it manually below."
            );
          }
          setAadhaarVerifiedByKycService(true);
          setAadhaarDetailsFromKycService(mergeKycDetails(response.data));
          await fetchProfile();
          Alert.alert("Success", "Aadhaar verified. Your address has been updated from Aadhaar.");
          setVerifyingAadhaar(false);
          return;
        }
        if (response.data.status === "CONSENT_DENIED") {
          clearInterval(interval);
          Alert.alert(
            "Consent Denied",
            "You denied document access. Please try again if you want to verify."
          );
          setVerifyingAadhaar(false);
          return;
        }
        if (response.data.status === "EXPIRED") {
          clearInterval(interval);
          Alert.alert("Expired", "Verification link expired. Please start verification again.");
          setVerifyingAadhaar(false);
          return;
        }
      } catch (e) {
        console.error(e);
      }
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        Alert.alert(
          "Verification Pending",
          "Verification is taking longer than expected. Pull down to refresh your profile shortly."
        );
        setVerifyingAadhaar(false);
      }
    }, 6000);
  };

  const handleAadhaarVerification = async () => {
    if (verifyingAadhaar) return;
    try {
      setVerifyingAadhaar(true);
      const response = await api.post("/api/kyc/digilocker/start");

      if (!response.data.success) {
        if (response.data.shouldCheckStatus) {
          Alert.alert(
            "Verification In Progress",
            "A verification is already in progress. Checking status…",
            [{ text: "OK" }]
          );
          setVerifyingAadhaar(false);
          return;
        }
        if (response.data.message?.includes?.("already verified")) {
          const statusRes = await api.get("/api/kyc/digilocker/status").catch(() => null);
          if (statusRes?.data?.verified) {
            try {
              await persistKycAndAddressFromStatus(statusRes.data);
            } catch (pe) {
              console.error(pe);
            }
            setAadhaarVerifiedByKycService(true);
            setAadhaarDetailsFromKycService(mergeKycDetails(statusRes.data));
            await fetchProfile();
            Alert.alert("Already verified", "Your Aadhaar is already verified. Address updated from Aadhaar.");
          }
          setVerifyingAadhaar(false);
          return;
        }
        Alert.alert("Error", response.data.message || "Failed to start verification");
        setVerifyingAadhaar(false);
        return;
      }

      const consentUrl = response.data.consentUrl;
      if (!consentUrl) {
        Alert.alert("Error", "Verification URL not received");
        setVerifyingAadhaar(false);
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(consentUrl, "mystay://kyc-success");
      if (result.type === "success" || result.type === "cancel" || result.type === "dismiss") {
        pollKycStatus();
      } else {
        setVerifyingAadhaar(false);
      }
    } catch (error: any) {
      console.error("KYC ERROR:", error?.response?.data || error.message);
      const msg = error?.response?.data?.message ?? "";
      if (msg.includes("already verified")) {
        const statusRes = await api.get("/api/kyc/digilocker/status").catch(() => null);
        if (statusRes?.data?.verified) {
          try {
            await persistKycAndAddressFromStatus(statusRes.data);
          } catch (pe) {
            console.error(pe);
          }
          setAadhaarVerifiedByKycService(true);
          setAadhaarDetailsFromKycService(mergeKycDetails(statusRes.data));
          await fetchProfile();
          Alert.alert("Already verified", "Your Aadhaar is already verified.");
        }
        setVerifyingAadhaar(false);
        return;
      }
      if (msg.includes("ack id")) {
        Alert.alert(
          "Link Already Used",
          "This verification link was already used. Tap Verify Aadhaar again for a new link."
        );
      } else {
        Alert.alert("Error", msg || "Failed to start verification");
      }
      setVerifyingAadhaar(false);
    }
  };

// Add focus listener to refresh when returning to this screen
useEffect(() => {
  const unsubscribe = navigation.addListener('focus', () => {
    refreshData();
  });

  return unsubscribe;
}, [navigation]);

  useEffect(() => {
    const subscription = Linking.addEventListener("url", async ({ url }) => {
      if (!url.includes("kyc-success")) return;
      try {
        const response = await api.get("/api/kyc/digilocker/status");
        if (response.data.verified) {
          try {
            await persistKycAndAddressFromStatus(response.data);
          } catch (pe) {
            console.error(pe);
          }
          setAadhaarVerifiedByKycService(true);
          setAadhaarDetailsFromKycService(mergeKycDetails(response.data));
          await fetchProfile();
          setVerifyingAadhaar(false);
          Alert.alert("Success", "Aadhaar verified. Your address has been updated from Aadhaar.");
        }
      } catch (e) {
        console.error(e);
      }
    });
    return () => subscription.remove();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            const { logoutClearClientSession } = await import("../utils/sessionStorage");
            await logoutClearClientSession();
            resetToWelcome();
          },
        },
      ]
    );
  };

  const handlePhotoUpload = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to upload a profile photo."
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) {
        return;
      }

      const imageUri = result.assets[0].uri;
      
      setUploadingPhoto(true);

      const compressedDataUri = await compressProfileImageToDataUri(imageUri);

      console.log("[ProfileScreen2] Compressed profile image");
      console.log("[ProfileScreen2] Payload length:", compressedDataUri.length);

      // Update profile with compressed photo payload
      const updateRes = await userApi.put("/api/users/profile-info", {
        profileImage: compressedDataUri,
      });

      console.log("[ProfileScreen2] Upload response:", updateRes.data);

      if (updateRes.data.success) {
        Alert.alert("Success", "Profile photo updated successfully!");
        await refreshData(); // Refresh profile data
      } else {
        throw new Error(updateRes.data.message || "Failed to update photo");
      }
    } catch (error: any) {
      console.error("Photo upload/selection error:", error);
      Alert.alert(
        "Upload Failed",
        error?.response?.data?.message || error?.message || "Failed to upload photo. Please try again."
      );
      setUploadingPhoto(false);
      return;
    }
    setUploadingPhoto(false);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#F4F6FF] items-center justify-center">
        <ActivityIndicator size="large" color={primaryColor} />
        <Text className="text-gray-500 mt-4">Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1 bg-[#F4F6FF] items-center justify-center px-6">
        <Ionicons name="person-outline" size={64} color="#94A3B8" />
        <Text className="text-slate-500 font-bold text-center mt-4 text-lg">
          Profile Not Found
        </Text>
        <TouchableOpacity
          className="mt-6 bg-indigo-600 px-6 py-3 rounded-xl"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const profileExtras = profile.profileExtras || {};
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() || "Not provided";
  const hasProfileImage = Boolean(profileExtras.profileImage?.trim());

  const isValidPhone = profile.phone && (profile.phone.startsWith("+") || /^\d{10,}$/.test(profile.phone));
  const displayPhone = isValidPhone ? profile.phone : "Not provided";

  const maskedAadhaar = profileExtras.aadhaar
    ? `XXXX-XXXX-${profileExtras.aadhaar.slice(-4)}`
    : profileExtras.aadhaarLast4
      ? `XXXX XXXX ${profileExtras.aadhaarLast4}`
      : "Not provided";

  /** Prefer user-service `aadhaarData`; use DigiLocker poll details only while verification UI is active. */
  const aadhaarDataForKyc =
    profileExtras.aadhaarData ||
    (verifyingAadhaar ? aadhaarDetailsFromKycService : null);
  // Prefer backend-stored kycStatus for label; fallback to computed from profile + Aadhaar match.
  const storedKycStatus = (profileExtras.kycStatus ?? "").toString().trim().toLowerCase();
  const isKycVerified =
    storedKycStatus === "verified"
      ? true
      : storedKycStatus === "unverified"
        ? false
        : resolveFinalKycVerified(profile, aadhaarDataForKyc);
  const kycStatusLabel = isKycVerified ? "KYC Verified" : "KYC Unverified";
  const hasBackendAadhaarData = Boolean(aadhaarDataForKyc);
  const aadhaarStatusNorm = String(profile.aadhaarStatus || "").trim().toLowerCase();
  const aadhaarAlreadyVerifiedInBackend =
    aadhaarStatusNorm === "verified" ||
    aadhaarStatusNorm === "approved" ||
    aadhaarStatusNorm === "success" ||
    aadhaarStatusNorm === "completed" ||
    aadhaarStatusNorm === "true";
    const aadhaarExpiry = 
  // First check profileExtras from user profile
  (profileExtras as any)?.aadhaarExpiresAt ?? 
  (profileExtras as any)?.aadhaarValidUntil ?? 
  // Then check KYC service data
  aadhaarDetailsFromKycService?.validUntil ??
  aadhaarDetailsFromKycService?.aadhaarExpiresAt ??
  // Finally check if there's any validUntil in aadhaarData
  (aadhaarDataForKyc as any)?.validUntil ??
  null;

console.log("🔍 aadhaarExpiry value:", aadhaarExpiry);
console.log("🔍 aadhaarDetailsFromKycService:", aadhaarDetailsFromKycService);
console.log("🔍 profileExtras:", profileExtras);

console.log("Final aadhaarExpiry value:", aadhaarExpiry);

// Add these missing variables
const aadhaarVerificationExpired = isAadhaarVerificationExpired(aadhaarExpiry);
const aadhaarValidityMessage = aadhaarExpiry 
  ? `KYC will be valid until ${formatExpiryDate(aadhaarExpiry)}`
  : null;

console.log("🔍 aadhaarValidityMessage:", aadhaarValidityMessage)

const shouldShowVerifyButton =
  aadhaarVerificationExpired || (!hasBackendAadhaarData && !aadhaarAlreadyVerifiedInBackend);
const shouldHideVerifyButton = aadhaarVerifiedByKycService || !shouldShowVerifyButton;

  return (
    <View className="flex-1 bg-[#F4F6FF]">
      {/* 🌈 GRADIENT HEADER */}
      <LinearGradient
        colors={gradientColors}
        className="pt-14 pb-28 px-6 rounded-b-[40px]"
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-10 h-10 bg-white/20 rounded-full justify-center items-center"
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>

            <Text className="ml-4 text-2xl text-white font-semibold">
              My Profile
            </Text>
          </View>

          {/* ⚙️ SETTINGS ICON */}
          <TouchableOpacity
            onPress={() => navigation.navigate("Settings")}
            className="w-10 h-10 bg-white/20 rounded-full justify-center items-center"
          >
            <Ionicons name="settings-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* 👤 PROFILE CARD */}
      <View className="-mt-20 px-4">
        <View className="bg-white rounded-3xl p-6 items-center shadow shadow-black/10">
          <View className="relative">
            {hasProfileImage ? (
              <Image
                source={{ uri: profileExtras.profileImage }}
                className="w-28 h-28 rounded-full"
                resizeMode="cover"
              />
            ) : (
              <View className="w-28 h-28 rounded-full bg-gray-200 items-center justify-center">
                <Ionicons name="person-circle-outline" size={88} color="#9CA3AF" />
              </View>
            )}
            <TouchableOpacity
              className="absolute bottom-0 right-0 p-2 rounded-full"
              style={{ backgroundColor: primaryColor }}
              onPress={handlePhotoUpload}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera-outline" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          <Text className="mt-4 text-xl font-semibold text-center">
            {fullName}
          </Text>

          <View className={`mt-2 px-4 py-1 rounded-full ${softBg}`}>
            <Text
              className="font-semibold"
              style={{ color: primaryColor }}
            >
              ID: {profile.uniqueId}
            </Text>
          </View>
        </View>
      </View>

      {/* 📄 CONTENT */}
      <ScrollView
        className="px-4 mt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {/* PHONE (read-only — tied to login) */}
        <View className="bg-white rounded-2xl p-5 mb-4 shadow shadow-black/10">
          <Text className="text-gray-500 text-sm">Phone Number</Text>
          <Text className="text-lg font-semibold mt-1">{displayPhone}</Text>
          
        </View>

        {/* EMAIL (read-only) */}
        <View className="bg-white rounded-2xl p-5 mb-4 shadow shadow-black/10 flex-row justify-between items-center">
          <View className="flex-1">
            <Text className="text-gray-500 text-sm">Email Address</Text>
            <Text className="text-lg font-semibold mt-1">{profile.email || "Not provided"}</Text>
          </View>
        </View>

        {/* PERSONAL DETAILS — inline editable */}
        <View className="bg-white rounded-2xl p-5 mb-4 shadow shadow-black/10">
          <Text className="text-lg font-bold mb-3">Personal Details</Text>

          <InlineEditableRow
            label="Full name"
            value={[profile.firstName, profile.lastName].filter(Boolean).join(" ").trim()}
            placeholder="Full name as per ID"
            accentColor={primaryColor}
            onSave={async (v) => {
              try {
                const next = v.trim();
                const current = [profile.firstName, profile.lastName]
                  .filter(Boolean)
                  .join(" ")
                  .trim();
                if (!identityFieldChanged.fullName(current, next)) return;
                const { firstName, lastName } = splitFullName(next);
                await saveIdentityFieldWithKycWarning({ firstName, lastName });
              } catch (e: any) {
                if (e?.message === "CANCELLED") return;
                Alert.alert("Error", e?.response?.data?.message || e?.message || "Could not save");
                throw e;
              }
            }}
          />
          <InlineEditableRow
            label="Date of Birth"
            value={profileExtras.dob || ""}
            placeholder="e.g. DD/MM/YYYY"
            accentColor={primaryColor}
            fieldType="date"
            onSave={async (v) => {
              try {
                const next = v.trim();
                const current = profileExtras.dob || "";
                if (!identityFieldChanged.dob(current, next)) return;
                await saveIdentityFieldWithKycWarning({ dob: next });
              } catch (e: any) {
                if (e?.message === "CANCELLED") return;
                Alert.alert("Error", e?.response?.data?.message || e?.message || "Could not save");
                throw e;
              }
            }}
          />
          <InlineEditableRow
            label="Gender"
            value={
              profile.sex
                ? profile.sex.charAt(0).toUpperCase() + profile.sex.slice(1).toLowerCase()
                : ""
            }
            placeholder="e.g. Male, Female"
            accentColor={primaryColor}
            fieldType="gender"
            onSave={async (v) => {
              try {
                const next = v.trim();
                const current = profile.sex
                  ? profile.sex.charAt(0).toUpperCase() + profile.sex.slice(1).toLowerCase()
                  : "";
                if (!identityFieldChanged.gender(current, next)) return;
                await saveIdentityFieldWithKycWarning({ gender: next });
              } catch (e: any) {
                if (e?.message === "CANCELLED") return;
                Alert.alert("Error", e?.response?.data?.message || e?.message || "Could not save");
                throw e;
              }
            }}
          />
          <InlineEditableRow
            label="Profession"
            value={profile.profession || ""}
            placeholder="Your profession"
            accentColor={primaryColor}
            onSave={async (v) => {
              try {
                const res = await userApi.put(
                  `/api/users/${encodeURIComponent(profile.uniqueId)}/profile`,
                  { profession: v }
                );
                if (!res.data?.success) throw new Error(res.data?.message || "Update failed");
                await fetchProfile();
              } catch (e: any) {
                Alert.alert("Error", e?.response?.data?.message || e?.message || "Could not save");
                throw e;
              }
            }}
          />
        </View>

        {/* ADDRESS DETAILS — inline editable */}
        <View className="bg-white rounded-2xl p-5 mb-4 shadow shadow-black/10">
          <Text className="text-lg font-bold mb-3">Address Details</Text>

          <InlineEditableRow
            label="Address as per Aadhaar"
            value={
              typeof profileExtras.addressAsPerAadhaar === "string"
                ? profileExtras.addressAsPerAadhaar
                : formatAddress(profileExtras.addressAsPerAadhaar as any) === "Not provided"
                  ? ""
                  : formatAddress(profileExtras.addressAsPerAadhaar as any)
            }
            placeholder="Full address"
            multiline
            accentColor={primaryColor}
            onSave={async (v) => {
              try {
                const res = await userApi.put("/api/users/profile-info", {
                  addressAsPerAadhaar: v,
                });
                if (!res.data?.success) throw new Error(res.data?.message || "Update failed");
                await fetchProfile();
              } catch (e: any) {
                Alert.alert("Error", e?.response?.data?.message || e?.message || "Could not save");
                throw e;
              }
            }}
          />

          <InlineEditableRow
            label="Current Address"
            value={
              typeof profileExtras.currentAddress === "string"
                ? profileExtras.currentAddress
                : formatAddress(profileExtras.currentAddress as any) === "Not provided"
                  ? ""
                  : formatAddress(profileExtras.currentAddress as any)
            }
            placeholder="Where you stay now"
            multiline
            accentColor={primaryColor}
            onSave={async (v) => {
              try {
                const res = await userApi.put("/api/users/profile-info", {
                  currentAddress: v,
                });
                if (!res.data?.success) throw new Error(res.data?.message || "Update failed");
                await fetchProfile();
              } catch (e: any) {
                Alert.alert("Error", e?.response?.data?.message || e?.message || "Could not save");
                throw e;
              }
            }}
          />
        </View>

        {/* EMERGENCY CONTACT — inline editable */}
        <View className="bg-white rounded-2xl p-5 mb-4 shadow shadow-black/10">
          <Text className="text-lg font-bold mb-3">Emergency Contact</Text>

          <InlineEditableRow
            label="Contact Name"
            value={profile.emergencyName || ""}
            placeholder="Name"
            accentColor={primaryColor}
            onSave={async (v) => {
              try {
                const res = await userApi.put(
                  `/api/users/${encodeURIComponent(profile.uniqueId)}/profile`,
                  { emergencyName: v }
                );
                if (!res.data?.success) throw new Error(res.data?.message || "Update failed");
                await fetchProfile();
              } catch (e: any) {
                Alert.alert("Error", e?.response?.data?.message || e?.message || "Could not save");
                throw e;
              }
            }}
          />
          <InlineEditableRow
            label="Contact Number"
            value={profile.emergencyPhone || ""}
            placeholder="Phone with country code if needed"
            keyboardType="phone-pad"
            accentColor={primaryColor}
            onSave={async (v) => {
              try {
                const res = await userApi.put(
                  `/api/users/${encodeURIComponent(profile.uniqueId)}/profile`,
                  { emergencyPhone: v }
                );
                if (!res.data?.success) throw new Error(res.data?.message || "Update failed");
                await fetchProfile();
              } catch (e: any) {
                Alert.alert("Error", e?.response?.data?.message || e?.message || "Could not save");
                throw e;
              }
            }}
          />
        </View>

        {/* 🪪 KYC DETAILS (from Complete your profile) */}
        <View className="bg-white rounded-2xl p-5 mb-4 shadow shadow-black/10">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-lg font-bold">KYC Details</Text>
            {isKycVerified && (
              <View className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                <Text className="text-[11px] font-semibold text-emerald-700">
                  {kycStatusLabel}
                </Text>
              </View>
            )}
          </View>

          <KycRow label="Aadhaar (last 4 digits)" value={maskedAadhaar} />
          <KycRow
            label="KYC Status"
            value={kycStatusLabel}
            success={isKycVerified}
          />

          {aadhaarValidityMessage && (
            <View className="mt-3 p-3 rounded-2xl bg-indigo-50 border border-indigo-100">
              <Text className="text-[11px] font-semibold text-indigo-700">
                {aadhaarValidityMessage}
              </Text>
            </View>
          )}

         

          {!isKycVerified && (
            <View className="mt-4 p-3 rounded-2xl bg-amber-50 border border-amber-200">
              
              
              {!shouldHideVerifyButton ? (
                <>
                  <Text className="text-[12px] text-amber-900 mb-3 leading-5">
                    Note: Keep your Aadhaar number ready, then tap Verify Aadhaar with DigiLocker.
                  </Text>
                <TouchableOpacity
                  className="self-start px-4 py-2 rounded-xl bg-indigo-600 flex-row items-center gap-2"
                  activeOpacity={0.85}
                  disabled={verifyingAadhaar}
                  onPress={() => setAadhaarCheckoutVisible(true)}
                >
                  {verifyingAadhaar ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : null}
                  <Text className="text-white text-xs font-semibold">
                    {verifyingAadhaar ? "Opening verification…" : "Verify Aadhaar "}
                  </Text>
                </TouchableOpacity>
                </>
              ) : (
                <Text className="text-[11px] text-amber-700">
                  Aadhaar is already verified. KYC remains unverified because profile details do not match.
                </Text>
              )}
            </View>
          )}
        </View>

        <AadhaarKycCheckoutModal
          visible={aadhaarCheckoutVisible}
          onClose={() => setAadhaarCheckoutVisible(false)}
          onProceed={() => {
            setAadhaarCheckoutVisible(false);
            handleAadhaarVerification();
          }}
          title="Aadhaar KYC"
          subtitle="Review charges before verification"
        />

        {/* 📄 UPLOADED DOCUMENTS (from Upload documents screen) */}
        <View className="bg-white rounded-2xl p-5 mb-4 shadow shadow-black/10">
          <Text className="text-lg font-bold mb-3">Uploaded Documents</Text>

          {profileExtras.documents && (profileExtras.documents.aadharFront || profileExtras.documents.aadharBack || profileExtras.documents.idFront || profileExtras.documents.idBack) ? (
            <View className="flex-row flex-wrap gap-3">
              {profileExtras.documents.aadharFront && (
                <DocumentThumbnail label="Aadhaar Front" uri={profileExtras.documents.aadharFront} />
              )}
              {profileExtras.documents.aadharBack && (
                <DocumentThumbnail label="Aadhaar Back" uri={profileExtras.documents.aadharBack} />
              )}
              {profileExtras.documents.idFront && (
                <DocumentThumbnail label="ID Front" uri={profileExtras.documents.idFront} />
              )}
              {profileExtras.documents.idBack && (
                <DocumentThumbnail label="ID Back" uri={profileExtras.documents.idBack} />
              )}
            </View>
          ) : (
            <Text className="text-gray-500 text-sm">
              {`No documents uploaded yet. Complete "Upload Documents" to add them here.`}
            </Text>
          )}
        </View>

        {/* 🚪 MOVE OUT */}
        <TouchableOpacity
          className="bg-white rounded-2xl p-5 mb-2 shadow shadow-black/10 flex-row justify-between items-center"
          onPress={() => navigation.navigate("MoveOutRequestScreen")}
        >
          <View className="flex-row items-center">
            <Ionicons name="exit-outline" size={22} color="#DC2626" />
            <Text className="ml-4 text-lg font-semibold text-red-600">
              Move Out Request
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        {/* 📊 MOVE OUT STATUS */}
        <TouchableOpacity
          className="bg-white rounded-2xl p-5 mb-4 shadow shadow-black/10 flex-row justify-between items-center"
          onPress={() => navigation.navigate("MoveOutStatusScreen")}
        >
          <View className="flex-row items-center">
            <Ionicons name="document-text-outline" size={22} color="#2563EB" />
            <Text className="ml-4 text-lg font-semibold text-blue-600">
              Move Out Status
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        {/* ⚙️ OPTIONS */}
        <View className="bg-white rounded-2xl shadow shadow-black/10">
          <ProfileOption
            icon="headset-outline"
            label="Support"
            color={primaryColor}
            onPress={() => Alert.alert("Support", "Contact support feature coming soon")}
          />
          <Divider />
          <ProfileOption
            icon="document-text-outline"
            label="Terms & Conditions"
            color={primaryColor}
            onPress={() => Alert.alert("Terms & Conditions", "Terms & Conditions coming soon")}
          />
          <Divider />
          <ProfileOption
            icon="log-out-outline"
            label="Logout"
            danger
            onPress={handleLogout}
          />
        </View>
      </ScrollView>

      <Modal visible={kycResetModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[24px] p-6 pb-8">
            <Text className="text-xl font-black text-slate-900 mb-4">KYC will be reset</Text>

            <View className="bg-amber-50 rounded-xl p-4 mb-4 border border-amber-100">
              <Text className="font-bold text-amber-900 mb-2">Summary</Text>
              <Text className="text-amber-900 text-sm leading-5">
                If you change your name, date of birth, or gender, your saved KYC data will be removed and you
                will need to verify your Aadhaar again.
              </Text>
            </View>

            <Text className="text-slate-600 text-sm mb-5">
              You can start verification again anytime from this profile screen.
            </Text>

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-slate-100 py-4 rounded-xl"
                onPress={onKycResetModalCancel}
              >
                <Text className="text-center font-bold text-slate-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-4 rounded-xl"
                style={{ backgroundColor: primaryColor }}
                onPress={onKycResetModalConfirm}
              >
                <Text className="text-center font-bold text-white">Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <BottomNav />
    </View>
  );
}

/* ===================== SMALL COMPONENTS ===================== */

function ProfileOption({
  icon,
  label,
  danger,
  color,
  onPress,
}: {
  icon: any;
  label: string;
  danger?: boolean;
  color?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      className="flex-row items-center justify-between px-5 py-4"
      onPress={onPress}
    >
      <View className="flex-row items-center">
        <Ionicons
          name={icon}
          size={22}
          color={danger ? "#DC2626" : color}
        />
        <Text
          className={`ml-4 text-lg font-semibold ${
            danger ? "text-red-600" : "text-black"
          }`}
        >
          {label}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );
}

function Divider() {
  return <View className="h-[1px] bg-gray-200 mx-5" />;
}

function dobStringToDate(s: string): Date {
  const iso = parseDateOnly(s);
  if (iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? new Date(2000, 0, 1) : d;
}

function formatDobForDisplay(s: string): string {
  if (!String(s).trim()) return "Not provided";
  const iso = parseDateOnly(s);
  if (!iso) return String(s).trim();
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const GENDER_OPTIONS = ["Male", "Female"] as const;

function InlineEditableRow({
  label,
  value,
  onSave,
  placeholder,
  multiline = false,
  keyboardType = "default",
  accentColor,
  fieldType = "default",
}: {
  label: string;
  value: string;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad" | "numeric";
  accentColor: string;
  fieldType?: "default" | "date" | "gender";
  onSave: (next: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [genderModalVisible, setGenderModalVisible] = useState(false);

  useEffect(() => {
    if (!editing && fieldType !== "gender") {
      setDraft(value);
    }
    if (!genderModalVisible && fieldType === "gender") {
      setDraft(value);
    }
  }, [value, editing, genderModalVisible, fieldType]);

  const displayValue =
    fieldType === "date"
      ? formatDobForDisplay(value)
      : value.trim()
        ? value
        : "Not provided";

  const handleSave = async () => {
    setSaving(true);
    try {
      Keyboard.dismiss();
      const out = fieldType === "date" ? (parseDateOnly(draft.trim()) || draft.trim()) : draft.trim();
      await onSave(out);
      setEditing(false);
    } catch {
      // Parent shows Alert
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    Keyboard.dismiss();
    setDraft(value);
    setEditing(false);
  };

  const startEdit = () => {
    if (fieldType === "gender") {
      setGenderModalVisible(true);
      return;
    }
    if (fieldType === "date") {
      const iso = parseDateOnly(value);
      setDraft(iso || value);
    } else {
      setDraft(value);
    }
    setEditing(true);
  };

  const pickGender = async (g: string) => {
    setGenderModalVisible(false);
    setSaving(true);
    try {
      await onSave(g);
    } catch {
      // Parent shows Alert
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="mb-4 pb-4 border-b border-gray-100 last:border-0 last:mb-0 last:pb-0">
      <View className="flex-row justify-between items-start">
        <Text className="text-gray-500 text-sm flex-1 pr-2">{label}</Text>
        {!editing && fieldType !== "gender" && (
          <TouchableOpacity
            onPress={startEdit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="create-outline" size={20} color={accentColor} />
          </TouchableOpacity>
        )}
        {fieldType === "gender" && (
          <TouchableOpacity
            onPress={() => setGenderModalVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="create-outline" size={20} color={accentColor} />
          </TouchableOpacity>
        )}
      </View>
      {fieldType === "gender" ? (
        <>
          <Text className="text-base font-medium text-gray-900 mt-1">{displayValue}</Text>
          <Modal visible={genderModalVisible} transparent animationType="slide">
            <View className="flex-1 bg-black/50 justify-end">
              <View className="bg-white rounded-t-[24px] p-6 pb-10">
                <Text className="text-lg font-black text-slate-900 mb-4">Select gender</Text>
                {GENDER_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    className="py-4 border-b border-gray-100 flex-row justify-between items-center"
                    disabled={saving}
                    onPress={() => pickGender(opt)}
                  >
                    <Text className="text-base font-semibold text-gray-900">{opt}</Text>
                    {value.trim().toLowerCase() === opt.toLowerCase() ? (
                      <Ionicons name="checkmark-circle" size={22} color={accentColor} />
                    ) : null}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  className="mt-4 bg-slate-100 py-4 rounded-xl"
                  onPress={() => setGenderModalVisible(false)}
                  disabled={saving}
                >
                  <Text className="text-center font-bold text-slate-700">Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      ) : editing ? (
        <View className="mt-2">
          {fieldType === "date" ? (
            <View>
              <ScrollableDatePicker
                selectedDate={dobStringToDate(draft || value)}
                onDateChange={(d) => setDraft(formatLocalYMD(d))}
                mode="date"
                maximumDate={new Date()}
                minimumDate={new Date(1930, 0, 1)}
                placeholder="Select date of birth"
              />
              <View className="flex-row mt-3 gap-3">
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl min-w-[72px] items-center justify-center"
                  style={{ backgroundColor: accentColor }}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text className="text-white font-semibold text-sm">Save</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCancel}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white"
                >
                  <Text className="text-gray-700 font-semibold text-sm">Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <TextInput
                className="border border-gray-200 rounded-xl px-3 py-2 text-base text-gray-900 bg-white"
                style={multiline ? { minHeight: 88, textAlignVertical: "top" } : undefined}
                value={draft}
                onChangeText={setDraft}
                placeholder={placeholder}
                placeholderTextColor="#9CA3AF"
                multiline={multiline}
                keyboardType={keyboardType}
              />
              <View className="flex-row mt-3 gap-3">
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl min-w-[72px] items-center justify-center"
                  style={{ backgroundColor: accentColor }}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text className="text-white font-semibold text-sm">Save</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCancel}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white"
                >
                  <Text className="text-gray-700 font-semibold text-sm">Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      ) : (
        <Text
          className="text-base font-medium text-gray-900 mt-1"
          numberOfLines={multiline ? 8 : undefined}
        >
          {displayValue}
        </Text>
      )}
    </View>
  );
}

function KycRow({
  label,
  value,
  success,
}: {
  label: string;
  value: string;
  success?: boolean;
}) {
  return (
    <View className="flex-row justify-between mb-2">
      <Text className="text-gray-500">{label}</Text>
      <Text
        className={`font-semibold ${
          success ? "text-green-600" : "text-black"
        }`}
      >
        {value}
      </Text>
    </View>
  );
}

function DocumentThumbnail({ label, uri }: { label: string; uri: string }) {
  return (
    <View className="w-[48%]">
      <Image
        source={{ uri }}
        className="w-full h-32 rounded-xl"
        resizeMode="cover"
      />
      <Text className="text-xs text-gray-600 font-medium mt-1 text-center">
        {label}
      </Text>
    </View>
  );
}
