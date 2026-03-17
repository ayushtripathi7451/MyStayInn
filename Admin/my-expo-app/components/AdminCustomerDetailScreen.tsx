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
import { userApi, bookingApi, propertyApi } from "../utils/api";
import { formatAddress } from "../utils/address";

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
  profileExtras?: {
    dob?: string;
    addressAsPerAadhaar?: string;
    currentAddress?: string;
    profileImage?: string;
    aadhaar?: string;
    aadhaarStatus?: string;
    kycStatus?: string;
    photo?: string;
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

export default function AdminCustomerDetailScreen({ navigation, route }: any) {
  const [isVerified, setIsVerified] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [activeStay, setActiveStay] = useState<ActiveStay | null>(null);
  void activeStay;

  // Get customer from route params (customer.id is often uniqueId from list)
  const customer = route?.params?.customer;

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
        console.log("ADMIN PROFILE DATA:", JSON.stringify(user, null, 2));
        setProfile(user);
        const numericId = user.id;
        if (numericId) {
          try {
            const bookRes = await bookingApi.get(`/api/bookings/customer/${numericId}`);
            const bookings = bookRes.data?.bookings || [];
            const active = bookings.find((b: any) => b.status === "active");
            if (active) {
              try {
                const roomRes = await propertyApi.get(`/api/properties/rooms/${active.roomId}`);
                const room = roomRes.data?.room;
                setActiveStay({
                  bookingId: active.uniqueId || active.id,
                  roomId: String(active.roomId),
                  propertyId: room?.propertyId,
                  propertyName: room?.propertyName,
                  roomNumber: room?.roomNumber,
                  securityDeposit: parseFloat(active.securityDeposit || "0"),
                  moveInDate: active.moveInDate,
                });
              } catch {
                setActiveStay({
                  bookingId: active.uniqueId || active.id,
                  roomId: String(active.roomId),
                  securityDeposit: parseFloat(active.securityDeposit || "0"),
                  moveInDate: active.moveInDate,
                });
              }
            } else {
              setActiveStay(null);
            }
          } catch {
            setActiveStay(null);
          }
        }
      }
    } catch (error: any) {
      console.error("Failed to fetch customer profile:", error);
      Alert.alert("Error", "Failed to load customer profile");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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

const documents =
  typeof profileExtras.documents === "object" && profileExtras.documents !== null
    ? profileExtras.documents
    : {};
  const fullName = `${profile.firstName} ${profile.lastName}`;

  // Use backend profile image first, then card photo, then default avatar
  const profileImage =
    profileExtras.profileImage ||
    customer?.photo ||
    "https://ui-avatars.com/api/?name=" +
      encodeURIComponent(fullName) +
      "&size=300&background=3B82F6&color=fff&bold=true";

  const status = (profile.aadhaarStatus || "").toLowerCase();
  const isKycVerified =
    status === "verified" ||
    status === "approved" ||
    status === "success" ||
    status === "completed";
  const kycStatus = isKycVerified ? "Verified" : "Unverified";

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
      aadharFront:
        documents.aadharFront ||
        documents.aadhaarFront ||
        "https://via.placeholder.com/600x400?text=No+Document",
      aadharBack:
        documents.aadharBack ||
        documents.aadhaarBack ||
        "https://via.placeholder.com/600x400?text=No+Document",
      idFront:
        documents.idFront ||
        documents.extraIdFront ||
        "https://via.placeholder.com/600x400?text=No+Document",
      idBack:
        documents.idBack ||
        documents.extraIdBack ||
        "https://via.placeholder.com/600x400?text=No+Document",
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
              <View className="bg-green-100 self-start px-2 py-0.5 rounded-md mt-2">
                <Text className="text-[10px] font-black text-green-700 uppercase tracking-widest">
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

const Doc = ({ label, uri, half, onPreview }: any) => {
  const [hasError, setHasError] = useState(false);
  const hasUri = typeof uri === "string" && uri.trim().length > 0;
  const isLoadable = hasUri && !hasError;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      disabled={!isLoadable}
      onPress={() => isLoadable && onPreview(uri)}
      className={`mb-5 ${half ? "w-[48%]" : "w-full"}`}
    >
      <Text className="text-[10px] font-bold text-slate-500 mb-2 uppercase">{label}</Text>
      {isLoadable ? (
        <Image
          source={{ uri }}
          onError={() => setHasError(true)}
          className="w-full h-28 rounded-2xl bg-slate-50 border border-slate-100"
          resizeMode="cover"
        />
      ) : (
        <View className="w-full h-28 rounded-2xl bg-slate-100 border border-slate-200 items-center justify-center">
          <Ionicons name="image-outline" size={22} color="#94A3B8" />
          <Text className="text-[11px] font-semibold text-slate-500 mt-1">Not available</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};