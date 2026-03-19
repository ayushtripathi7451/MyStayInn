import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Modal,
  Linking,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { userApi, bookingApi, propertyApi, USER_SERVICE_URL } from "../utils/api";
import { formatAddress } from "../utils/address";
import { resolveFinalKycVerified, resolveKycFieldMatches } from "../utils/kyc";

interface CustomerProfile {
  id?: string; // numeric user id (from DB), required for booking API
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
  kycStatus?: string;
  verificationStatus?: string;
  profileImage?: string;
  aadhaarData?: {
    name?: string;
    dob?: string;
    gender?: string;
  };
  aadhaarDetails?: {
    name?: string;
    dob?: string;
    gender?: string;
  };
  profileExtras?: {
    dob?: string;
    addressAsPerAadhaar?: string;
    currentAddress?: string;
    profileImage?: string;
    aadhaar?: string;
    aadhaarStatus?: string;
    kycStatus?: string;
    photo?: string;
    aadhaarData?: {
      name?: string;
      dob?: string;
      gender?: string;
    };
    aadhaarDetails?: {
      name?: string;
      dob?: string;
      gender?: string;
    };
    documents?: {
      aadharFront?: string;
      aadharBack?: string;
      aadhaarFront?: string;
      aadhaarBack?: string;
      idFront?: string;
      idBack?: string;
      extraIdFront?: string;
      extraIdBack?: string;
    };
  };
}

interface ActiveStay {
  bookingId: string;
  roomId: string;
  propertyId?: string;
  propertyName?: string;
  roomNumber?: string;
  securityDeposit?: number;
  moveInDate?: string;
}

const normalizeImageUri = (uri?: string | null): string | null => {
  if (!uri || typeof uri !== "string") return null;

  const trimmed = uri.trim();
  if (!trimmed) return null;

  // ✅ DO NOT TOUCH http/https
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    const base = USER_SERVICE_URL.replace(/\/$/, "");
    return `${base}${trimmed}`;
  }

  return trimmed;
};

export default function AdminCustomerDetailScreen({ navigation, route }: any) {
  const [isVerified, setIsVerified] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [activeStay, setActiveStay] = useState<ActiveStay | null>(null);
  void activeStay;

  // Get customer from route params (customer.id is often uniqueId from list)
  const customer = route?.params?.customer || route?.params?.customerData;

  const profileLookupId = customer?.uniqueId || customer?.id || customer?.mystayId;

  useEffect(() => {
    if (profileLookupId) {
      fetchCustomerProfile(profileLookupId);
    } else {
      setLoading(false);
      Alert.alert("Error", "Customer ID not found");
    }
  }, [profileLookupId]);

  const fetchCustomerProfile = async (uniqueId: string) => {
    try {
      setLoading(true);
      const response = await userApi.get(`/api/users/${uniqueId}/profile`);

      if (response.data.success) {
        const user = response.data.user;
        const fromRoute = route?.params?.customer;
        const mergedProfile: CustomerProfile = {
          ...user,
          profileExtras: {
            // Merge order matters:
            // - Start with any route-provided extras (often stale/raw URLs from list screen)
            // - Then overlay the freshly-fetched user-service extras (includes signed S3 URLs)
            ...(fromRoute?.profileExtras && typeof fromRoute.profileExtras === "object"
              ? fromRoute.profileExtras
              : {}),
            ...(user.profileExtras || {}),
            ...(fromRoute?.aadhaarData && { aadhaarData: fromRoute.aadhaarData }),
            ...(fromRoute?.aadhaarDetails && { aadhaarDetails: fromRoute.aadhaarDetails }),
          },
        };
        if (typeof fromRoute?.kycVerified === "boolean") {
          (mergedProfile.profileExtras as any).kycVerified = fromRoute.kycVerified;
        }
        if (fromRoute?.kycStatus) {
          (mergedProfile.profileExtras as any).kycStatus = fromRoute.kycStatus;
        }
        console.log("ADMIN PROFILE DATA:", JSON.stringify(mergedProfile, null, 2));
        setProfile(mergedProfile);
        const numericId = user.id;
        if (numericId) {
          const bookRes = await bookingApi.get(`/api/bookings/customer/${numericId}`).catch(() => null);
          const bookings = bookRes?.data?.bookings || [];
          const active = bookings.find((b: any) => b.status === "active");
          if (active) {
            const roomRes = await propertyApi.get(`/api/properties/rooms/${active.roomId}`).catch(() => null);
            const room = roomRes?.data?.room;
            setActiveStay({
              bookingId: active.uniqueId || active.id,
              roomId: String(active.roomId),
              propertyId: room?.propertyId,
              propertyName: room?.propertyName,
              roomNumber: room?.roomNumber,
              securityDeposit: parseFloat(active.securityDeposit || "0"),
              moveInDate: active.moveInDate,
            });
          } else {
            setActiveStay(null);
          }
        }
      }
    } catch (error: any) {
      console.error("Failed to fetch customer profile:", error);
      const fromRoute = route?.params?.customer;
      if (fromRoute?.uniqueId && (fromRoute?.firstName != null || fromRoute?.name)) {
        const nameParts = (fromRoute.name || `${fromRoute.firstName || ''} ${fromRoute.lastName || ''}`.trim()).split(/\s+/);
        setProfile({
          uniqueId: fromRoute.uniqueId,
          id: fromRoute.id,
          firstName: fromRoute.firstName ?? nameParts[0] ?? "",
          lastName: fromRoute.lastName ?? nameParts.slice(1).join(" ") ?? "",
          sex: fromRoute.sex ?? "",
          phone: fromRoute.phone ?? "",
          email: fromRoute.email ?? "",
          aadhaarStatus: fromRoute.aadhaarStatus ?? "",
          profileExtras: (fromRoute.profileExtras || {}) as any,
        } as CustomerProfile);
      } else {
        Alert.alert("Error", "Failed to load customer profile");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profile) {
    return (
      <SafeAreaView className="flex-1 bg-[#F1F5F9] items-center justify-center">
        <ActivityIndicator size="large" color="#1E33FF" />
        <Text className="text-gray-500 mt-4">Loading customer profile...</Text>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-[#F1F5F9] items-center justify-center px-6">
        <Ionicons name="person-outline" size={64} color="#94A3B8" />
        <Text className="text-slate-500 font-bold text-center mt-4 text-lg">
          Customer Profile Not Found
        </Text>
        <TouchableOpacity
          className="mt-6 bg-indigo-600 px-6 py-3 rounded-xl"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Transform profile data to display format
  const profileExtras =
  typeof profile.profileExtras === "object" && profile.profileExtras !== null
    ? profile.profileExtras
    : {};

  const documentsRaw =
    typeof profileExtras.documents === "object" && profileExtras.documents !== null
      ? profileExtras.documents
      : {};
  const documents = {
    aadharFront: normalizeImageUri(documentsRaw.aadharFront || documentsRaw.aadhaarFront || null),
    aadharBack: normalizeImageUri(documentsRaw.aadharBack || documentsRaw.aadhaarBack || null),
    idFront: normalizeImageUri(documentsRaw.idFront || documentsRaw.extraIdFront || null),
    idBack: normalizeImageUri(documentsRaw.idBack || documentsRaw.extraIdBack || null),
  };
  const fullName = `${profile.firstName} ${profile.lastName}`;

  // Use backend profile image first, then card photo, then default avatar
  const profileImage =
    normalizeImageUri(profileExtras.profileImage) ||
    normalizeImageUri(customer?.photo) ||
    "https://ui-avatars.com/api/?name=" +
      encodeURIComponent(fullName) +
      "&size=300&background=3B82F6&color=fff&bold=true";

  const aadhaarDataForKyc =
    profileExtras.aadhaarData ||
    profileExtras.aadhaarDetails ||
    profile.aadhaarData ||
    profile.aadhaarDetails;

  // Prefer backend-stored kycStatus for display; fallback to computed from profile + Aadhaar match.
  const storedKycStatus = (profileExtras.kycStatus ?? "").toString().trim().toLowerCase();
  const isKycVerified =
    storedKycStatus === "verified"
      ? true
      : storedKycStatus === "unverified"
        ? false
        : resolveFinalKycVerified(profile, aadhaarDataForKyc);
  const kycStatus = isKycVerified ? "Verified" : "Unverified";

  const kycMatches = resolveKycFieldMatches(profile, aadhaarDataForKyc);
  const profileFullName = `${profile.firstName} ${profile.lastName}`.trim();
  const profileGenderDisplay = profile.sex
    ? profile.sex.charAt(0).toUpperCase() + profile.sex.slice(1).toLowerCase()
    : "Not provided";
  const profileDobDisplay = profileExtras.dob || "Not provided";

  if (__DEV__) {
    console.log("ADMIN DOCS RAW:", documentsRaw);
    console.log("ADMIN DOCS NORMALIZED:", documents);
  }

  // Validate phone number
  const isValidPhone = profile.phone && (profile.phone.startsWith('+') || /^\d{10,}$/.test(profile.phone));
  const displayPhone = isValidPhone 
    ? (profile.phone.startsWith('+') ? profile.phone : `+91 ${profile.phone}`)
    : "Not provided";

  const maskedAadhaar = profileExtras.aadhaar
    ? `XXXX XXXX ${profileExtras.aadhaar.slice(-4)}`
    : "Not provided";

  const CUSTOMER = {
    photo: profileImage,
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email || "Not provided",
    phone: isValidPhone ? profile.phone : "",
    displayPhone: displayPhone,
    dob: profileExtras.dob || "Not provided",
    mystayId: profile.uniqueId,
    aadhar: maskedAadhaar,
    kycStatus: kycStatus,
    emergencyContactName: profile.emergencyName || "Not provided",
    emergencyContactPhone: profile.emergencyPhone || "Not provided",
    documents: {
      aadharFront: documents.aadharFront,
      aadharBack: documents.aadharBack,
      idFront: documents.idFront,
      idBack: documents.idBack,
      photo: profileImage,
    },
  };

  const handleCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">
      <StatusBar barStyle="dark-content" />

      {/* IMAGE PREVIEW MODAL */}
      <Modal visible={!!previewImage} transparent animationType="fade">
        <View className="flex-1 bg-black/95 justify-center items-center">
          <TouchableOpacity 
            activeOpacity={1}
            onPress={() => setPreviewImage(null)}
            className="absolute top-12 right-6 z-10 bg-white/20 p-2 rounded-full"
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          {previewImage && (
            <Image source={{ uri: previewImage }} className="w-full h-[70%]" resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* HEADER */}
      <View className="bg-white px-6 py-5 flex-row items-center border-b border-slate-200 shadow-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1 -ml-1">
          <Ionicons name="arrow-back" size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-4 text-2xl font-black text-slate-900 tracking-tight">
          Verify Details
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="px-5">
        
        {/* CUSTOMER SUMMARY CARD */}
        <View className="bg-white rounded-[32px] p-6 mt-6 shadow-xl shadow-slate-200 border border-white">
          <View className="flex-row items-center">
            <TouchableOpacity activeOpacity={0.9} onPress={() => setPreviewImage(CUSTOMER.photo)}>
              <View>
                <Image source={{ uri: CUSTOMER.photo }} className="w-20 h-20 rounded-[24px] bg-slate-200 border-4 border-slate-50" />
                <View className="absolute bottom-0 right-0 bg-[#1E33FF] p-1 rounded-lg border-2 border-white">
                  <Ionicons name="expand" size={12} color="white" />
                </View>
              </View>
            </TouchableOpacity>

            <View className="ml-5 flex-1">
              <Text className="text-2xl font-black text-slate-900 leading-7">
                {CUSTOMER.firstName}{"\n"}{CUSTOMER.lastName}
              </Text>
              <View className={`self-start px-2 py-0.5 rounded-md mt-2 ${isKycVerified ? "bg-green-100" : "bg-orange-100"}`}>
                <Text className={`text-[10px] font-black uppercase tracking-widest ${isKycVerified ? "text-green-700" : "text-orange-600"}`}>
                  KYC {CUSTOMER.kycStatus}
                </Text>
              </View>
            </View>
          </View>

          {/* CONTACT & DOB SECTION */}
          <View className="mt-8 pt-6 border-t border-slate-100">
            <View className="flex-row justify-between items-start mb-4">
              <View className="flex-1">
                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Contact</Text>
                <Text className="text-[17px] font-bold text-slate-900 mt-1">{CUSTOMER.displayPhone}</Text>
              </View>
              {CUSTOMER.phone && (
                <TouchableOpacity 
                  onPress={() => handleCall(CUSTOMER.phone)}
                  className="bg-green-50 p-2.5 rounded-full border border-green-100"
                >
                  <Ionicons name="call" size={18} color="#10B981" />
                </TouchableOpacity>
              )}
            </View>
            
            <View className="mb-4">
              <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</Text>
              <Text className="text-[15px] font-bold text-slate-900 mt-1">{CUSTOMER.email}</Text>
            </View>

            <View>
               <Info label="Date of Birth" value={CUSTOMER.dob} />
            </View>
          </View>

          {/* ID DETAILS */}
          <View className="flex-row mt-6 pt-6 border-t border-slate-100">
            <Info label="MyStayInnID" value={CUSTOMER.mystayId} />
            {/* <Info label="Aadhaar" value={CUSTOMER.aadhar} /> */}
          </View>

          {/* EMERGENCY CONTACT */}
          <View className="mt-6 pt-6 border-t border-slate-100">
            <Text className="text-[11px] font-black text-slate-400 uppercase tracking-[1.5px] mb-2">Emergency Contact</Text>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-bold text-slate-800">{CUSTOMER.emergencyContactName}</Text>
                <Text className="text-base font-medium text-slate-500">{CUSTOMER.emergencyContactPhone}</Text>
              </View>
              {CUSTOMER.emergencyContactPhone !== "Not provided" && (
                <TouchableOpacity 
                  onPress={() => handleCall(CUSTOMER.emergencyContactPhone)}
                  className="bg-blue-50 p-3 rounded-full border border-blue-100"
                >
                  <Ionicons name="call" size={20} color="#1E33FF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* PERSONAL DETAILS */}
        <Section title="Personal Details">
          <View className="space-y-3">
            <DetailRow label="Gender" value={profile.sex ? profile.sex.charAt(0).toUpperCase() + profile.sex.slice(1) : "Not provided"} />
            <DetailRow label="Profession" value={profile.profession || "Not provided"} />
          </View>
        </Section>

        {/* ADDRESS DETAILS */}
        <Section title="Address Details">
          <View className="mb-4">
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Address as per Aadhaar</Text>
            <Text className="text-[15px] font-medium text-slate-900">
              {formatAddress(profileExtras.addressAsPerAadhaar)}
            </Text>
          </View>

          <View>
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Address</Text>
            <Text className="text-[15px] font-medium text-slate-900">
              {formatAddress(profileExtras.currentAddress)}
            </Text>
          </View>
        </Section>

         {/* KYC VERIFICATION DETAILS */}
        <Section title="KYC Verification">
          {/* Overall KYC status badge */}
          {!kycMatches.hasAadhaarData ? (
            // No Aadhaar data - KYC not initiated
            <View className="flex-row items-center px-4 py-3 rounded-2xl mb-5 bg-red-50 border border-red-200">
              <Ionicons name="alert-circle" size={22} color="#DC2626" />
              <Text className="ml-3 font-black text-base text-red-600">
                KYC Pending
              </Text>
            </View>
          ) : isKycVerified ? (
            // Aadhaar verified
            <View className="flex-row items-center px-4 py-3 rounded-2xl mb-5 bg-emerald-50 border border-emerald-200">
              <Ionicons name="shield-checkmark" size={22} color="#059669" />
              <View className="ml-3 flex-1">
                <Text className="font-black text-base text-emerald-700">
                  KYC Completed
                </Text>
                <Text className="text-xs font-semibold text-emerald-600 mt-0.5">
                  Aadhaar authenticated
                </Text>
              </View>
            </View>
          ) : (
            // Aadhaar unverified
            <View className="flex-row items-center px-4 py-3 rounded-2xl mb-5 bg-orange-50 border border-orange-200">
              <Ionicons name="shield-outline" size={22} color="#EA580C" />
              <View className="ml-3 flex-1">
                <Text className="font-black text-base text-orange-600">
                  KYC Completed
                </Text>
                <Text className="text-xs font-semibold text-orange-500 mt-0.5">
                  Aadhaar authentication failed
                </Text>
              </View>
            </View>
          )}

          {/* Field-by-field comparison */}
          {kycMatches.hasAadhaarData ? (
            <View className="space-y-3">
              {/* Name */}
              <KycMatchRow
                label="Full Name"
                profileValue={profileFullName || "Not provided"}
                aadhaarValue={kycMatches.aadhaarName || "Not provided"}
                matched={kycMatches.nameMatch}
              />
              {/* Date of Birth */}
              <KycMatchRow
                label="Date of Birth"
                profileValue={profileDobDisplay}
                aadhaarValue={kycMatches.aadhaarDob || "Not provided"}
                matched={kycMatches.dobMatch}
              />
              {/* Gender */}
              <KycMatchRow
                label="Gender"
                profileValue={profileGenderDisplay}
                aadhaarValue={kycMatches.aadhaarGender
                  ? kycMatches.aadhaarGender.charAt(0).toUpperCase() + kycMatches.aadhaarGender.slice(1).toLowerCase()
                  : "Not provided"}
                matched={kycMatches.genderMatch}
              />
            </View>
          ) : (
            <View className="items-center py-4">
              <Ionicons name="information-circle-outline" size={28} color="#94A3B8" />
              <Text className="text-slate-400 font-semibold text-sm mt-2 text-center">
                No Aadhaar data available.{"\n"}Customer has not completed Digilocker verification.
              </Text>
            </View>
          )}
        </Section>

        {/* DOCUMENTS */}
        <Section title="Customer Documents">
          <View className="flex-row flex-wrap justify-between">
            <Doc label="Aadhaar Front" uri={CUSTOMER.documents.aadharFront} half onPreview={setPreviewImage} />
            <Doc label="Aadhaar Back" uri={CUSTOMER.documents.aadharBack} half onPreview={setPreviewImage} />
            <Doc label="ID Front" uri={CUSTOMER.documents.idFront} half onPreview={setPreviewImage} />
            <Doc label="ID Back" uri={CUSTOMER.documents.idBack} half onPreview={setPreviewImage} />
          </View>
        </Section>

       

        {/* VERIFICATION */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setIsVerified(!isVerified)}
          className={`flex-row items-center p-6 mt-6 rounded-[28px] border-2 shadow-sm ${
            isVerified ? "bg-blue-50 border-blue-200" : "bg-white border-slate-100"
          }`}
        >
          <View className={`w-8 h-8 rounded-xl border-2 items-center justify-center ${isVerified ? "bg-[#1E33FF] border-[#1E33FF]" : "border-slate-300 bg-white"}`}>
            {isVerified && <Ionicons name="checkmark-sharp" size={20} color="white" />}
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-lg font-black text-slate-900">Verified Details</Text>
            <Text className="text-sm font-medium text-slate-500">Documents match the customer.</Text>
          </View>
        </TouchableOpacity>

        <View className="h-44" />
      </ScrollView>

      {/* FOOTER ACTIONS */}
      <View className="absolute bottom-0 left-0 right-0 bg-white/90 px-6 pt-4 pb-10 border-t border-slate-200">
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("AdminRoomAllocationScreen", {
              customer: {
                id: profile.id ?? profile.uniqueId,
                name: `${profile.firstName} ${profile.lastName}`,
                firstName: profile.firstName,
                lastName: profile.lastName,
                phone: profile.phone,
                displayPhone: displayPhone,
                email: profile.email,
                photo: profileImage,
                mystayId: profile.uniqueId,
                kycStatus: kycStatus,
                roomPreference: (route?.params as any)?.customer?.roomPreference,
                moveInDate: (route?.params as any)?.customer?.moveInDate,
                moveOutDate: (route?.params as any)?.customer?.moveOutDate,
                comments: (route?.params as any)?.customer?.comments,
                securityDeposit: (route?.params as any)?.customer?.securityDeposit,
                enrollmentRequestId: (route?.params as any)?.customer?.enrollmentRequestId,
              },
            })
          }
          activeOpacity={0.8}
          disabled={!isVerified}
          className={`h-16 rounded-[22px] justify-center items-center shadow-lg ${isVerified ? "bg-[#1E33FF] shadow-blue-300" : "bg-slate-300"}`}
        >
          <Text className={`font-black text-lg ${isVerified ? "text-white" : "text-slate-500"}`}>Allocate Room</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const Section = ({ title, children }: any) => (
  <View className="bg-white rounded-[32px] p-6 mt-6 shadow-sm border border-white">
    <Text className="text-[12px] font-black text-slate-900 uppercase tracking-[2px] mb-5">{title}</Text>
    {children}
  </View>
);

const Info = ({ label, value }: any) => (
  <View className="flex-1">
    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</Text>
    <Text className="text-[15px] font-bold text-slate-900 mt-1">{value}</Text>
  </View>
);

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View className="flex-row justify-between mb-3">
    <Text className="text-slate-500 font-medium">{label}</Text>
    <Text className="font-bold text-slate-900">{value}</Text>
  </View>
);

const KycMatchRow = ({
  label,
  profileValue,
  aadhaarValue,
  matched,
}: {
  label: string;
  profileValue: string;
  aadhaarValue: string;
  matched: boolean;
}) => (
  <View className={`rounded-2xl p-4 mb-3 border ${matched ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-200"}`}>
    <View className="flex-row items-center justify-between mb-2">
      <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</Text>
      <Ionicons
        name={matched ? "checkmark-circle" : "ellipse-outline"}
        size={18}
        color={matched ? "#059669" : "#94A3B8"}
      />
    </View>
    <View className="flex-row justify-between">
      <View className="flex-1 mr-3">
        <Text className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Profile</Text>
        <Text className="text-[13px] font-bold text-slate-800" numberOfLines={2}>{profileValue}</Text>
      </View>
      <View className="w-px bg-slate-200 mx-2" />
      <View className="flex-1 ml-3">
        <Text className="text-[9px] font-bold text-indigo-400 uppercase mb-0.5">Aadhaar</Text>
        <Text className="text-[13px] font-bold text-slate-800" numberOfLines={2}>{aadhaarValue}</Text>
      </View>
    </View>
  </View>
);

const Doc = ({ label, uri, half, onPreview }: any) => {
  const [hasError, setHasError] = useState(false);
  const hasUri = typeof uri === "string" && uri.trim().length > 0;
  const isLoadable = hasUri && !hasError;

  if (__DEV__ && hasUri) {
    console.log("FINAL DOC URL:", label, uri);
  }

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      disabled={!isLoadable}
      onPress={() => isLoadable && onPreview(uri)}
      className={`mb-5 ${half ? "w-[48%]" : "w-full"}`}
    >
      <Text className="text-[10px] font-bold text-slate-500 mb-2 uppercase">{label}</Text>
      {isLoadable ? (
        <View className="w-full h-28 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden">
          <Image
            source={{ uri }}
            onError={() => {
              if (__DEV__) {
                console.log("ADMIN DOC IMAGE FAILED:", label, uri);
              }
              setHasError(true);
            }}
            className="w-full h-full"
            resizeMode="cover"
          />
          {/* Expand affordance (same as profile pic) */}
          <View className="absolute bottom-2 right-2 bg-[#1E33FF] p-1 rounded-lg border-2 border-white">
            <Ionicons name="expand" size={12} color="white" />
          </View>
        </View>
      ) : (
        <View className="w-full h-28 rounded-2xl bg-slate-100 border border-slate-200 items-center justify-center">
          <Ionicons name="image-outline" size={22} color="#94A3B8" />
          <Text className="text-[11px] font-semibold text-slate-500 mt-1">Not available</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};