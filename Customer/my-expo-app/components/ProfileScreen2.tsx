import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BottomNav from "./BottomNav";
import { useTheme } from "../context/ThemeContext";
import { api, userApi } from "../utils/api";
import { formatAddress } from "../utils/address";

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
    documents?: {
      aadharFront?: string;
      aadharBack?: string;
      idFront?: string;
      idBack?: string;
    };
    profileCompleted?: boolean;
  };
}

export default function ProfileScreen2({ navigation }: any) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [kycVerifiedFromKycService, setKycVerifiedFromKycService] = useState(false);

  /* 🎨 THEME COLORS */
  const isFemale = theme === "female";

  const gradientColors: [string, string] = isFemale
    ? ["#EC4899", "#F472B6"]
    : ["#3B4BFF", "#5F6BFF"];

  const primaryColor = isFemale ? "#EC4899" : "#3B4BFF";
  const softBg = isFemale ? "bg-[#FFE4F2]" : "bg-[#EEF2FF]";

  useEffect(() => {
    fetchProfile();
    // Also ask KYC service directly, like CompleteProfileScreen does, and just map to a simple flag.
    (async () => {
      try {
        const res = await api.get("/api/kyc/digilocker/status");
        if (res.data?.verified) {
          setKycVerifiedFromKycService(true);
        }
      } catch {
        // If this fails, we silently ignore – fall back to profile.aadhaarStatus only.
      }
    })();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await userApi.get("/api/users/me");

      if (response.data.success) {
        setProfile(response.data.user);
        console.log("Profile data:", JSON.stringify(response.data.user, null, 2));
      }
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
    } finally {
      setLoading(false);
    }
  };

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
            await AsyncStorage.removeItem("USER_TOKEN");
            await AsyncStorage.removeItem("authToken");
            navigation.reset({
              index: 0,
              routes: [{ name: "Welcome" }],
            });
          },
        },
      ]
    );
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

  // Normalized Aadhaar/KYC status from backend (treat 'verified', 'approved', 'success' etc. as verified)
  const aadhaarStatusRaw = (profile.aadhaarStatus || "").trim();
  const aadhaarStatusNorm = aadhaarStatusRaw.toLowerCase();
  const isKycVerified =
    kycVerifiedFromKycService ||
    aadhaarStatusNorm === "verified" ||
    aadhaarStatusNorm === "approved" ||
    aadhaarStatusNorm === "success" ||
    aadhaarStatusNorm === "completed";

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
              onPress={() => navigation.navigate("CompleteProfile")}
            >
              <Ionicons name="camera-outline" size={16} color="#fff" />
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
        {/* � PHONE */}
        <View className="bg-white rounded-2xl p-5 mb-4 shadow shadow-black/10">
          <Text className="text-gray-500 text-sm">Phone Number</Text>
          <Text className="text-lg font-semibold mt-1">{displayPhone}</Text>
        </View>

        {/* 📧 EMAIL */}
        <View className="bg-white rounded-2xl p-5 mb-4 shadow shadow-black/10 flex-row justify-between items-center">
          <View>
            <Text className="text-gray-500 text-sm">Email Address</Text>
            <Text className="text-lg font-semibold mt-1">{profile.email || "Not provided"}</Text>
          </View>

          
        </View>

        {/* 👤 PERSONAL DETAILS (from Complete your profile) */}
        <View className="bg-white rounded-2xl p-5 mb-4 shadow shadow-black/10">
          <Text className="text-lg font-bold mb-3">Personal Details</Text>

          <DetailRow label="Full Name" value={fullName} />
          <DetailRow label="Date of Birth" value={profileExtras.dob || "Not provided"} />
          <DetailRow label="Gender" value={profile.sex ? profile.sex.charAt(0).toUpperCase() + profile.sex.slice(1).toLowerCase() : "Not provided"} />
          <DetailRow label="Profession" value={profile.profession || "Not provided"} />
        </View>

        {/* 📍 ADDRESS DETAILS (from Complete your profile) */}
        <View className="bg-white rounded-2xl p-5 mb-4 shadow shadow-black/10">
          <Text className="text-lg font-bold mb-3">Address Details</Text>

          <View className="mb-3">
            <Text className="text-gray-500 text-sm mb-1">Address as per Aadhaar</Text>
            <Text className="text-base font-medium text-gray-900">
              {formatAddress(profileExtras.addressAsPerAadhaar)}
            </Text>
          </View>

          <View>
            <Text className="text-gray-500 text-sm mb-1">Current Address</Text>
            <Text className="text-base font-medium text-gray-900">
              {formatAddress(profileExtras.currentAddress)}
            </Text>
          </View>
        </View>

        {/* 🚨 EMERGENCY CONTACT (from Upload documents) */}
        <View className="bg-white rounded-2xl p-5 mb-4 shadow shadow-black/10">
          <Text className="text-lg font-bold mb-3">Emergency Contact</Text>

          <DetailRow label="Contact Name" value={profile.emergencyName || "Not provided"} />
          <DetailRow label="Contact Number" value={profile.emergencyPhone || "Not provided"} />
        </View>

        {/* 🪪 KYC DETAILS (from Complete your profile) */}
        <View className="bg-white rounded-2xl p-5 mb-4 shadow shadow-black/10">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-lg font-bold">KYC Details</Text>
            {isKycVerified && (
              <View className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                <Text className="text-[11px] font-semibold text-emerald-700">
                  Verified
                </Text>
              </View>
            )}
          </View>

          <KycRow label="Aadhaar (last 4 digits)" value={maskedAadhaar} />
          <KycRow
            label="Aadhaar Status"
            value={isKycVerified ? "Verified" : "Unverified"}
            success={isKycVerified}
          />

          {!isKycVerified && (
            <View className="mt-4 p-3 rounded-2xl bg-amber-50 border border-amber-200">
              <Text className="text-xs font-semibold text-amber-700 mb-1">
                KYC Pending
              </Text>
              <Text className="text-[11px] text-amber-700 mb-3">
                Your Aadhaar / KYC is not approved yet. Please complete verification to keep your stay records up to date.
              </Text>
              <TouchableOpacity
                className="self-start px-4 py-2 rounded-xl bg-indigo-600"
                activeOpacity={0.85}
                onPress={() => navigation.navigate("CompleteProfile", { startKycImmediately: true })}
              >
                <Text className="text-white text-xs font-semibold">
                  Verify Aadhaar / Complete KYC
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between mb-2">
      <Text className="text-gray-500">{label}</Text>
      <Text className="font-semibold text-black">{value}</Text>
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
