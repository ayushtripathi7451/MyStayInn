import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { userApi, bookingApi, propertyApi } from "../utils/api";
import { formatAddress } from "../utils/address";

interface TenantDetailScreenProps {
  navigation: any;
  route?: any;
}

interface ProfileUser {
  id?: string;
  uniqueId?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  sex?: string;
  profession?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  aadhaarStatus?: string;
  profileExtras?: {
    dob?: string;
    addressAsPerAadhaar?: string;
    currentAddress?: string;
    profileImage?: string;
    aadhaar?: string;
    documents?: { aadharFront?: string; aadharBack?: string; idFront?: string; idBack?: string };
  };
}

// Normalise customer/customerData from different screens (SearchScreen passes customerId + customerData with mystayId/name; TenantManagementScreen passes tenantId + customer + booking; PaymentManagementScreen passes tenantId only)
function normaliseCustomerFromParams(params: any): { tenantId: string; uniqueId?: string; customer?: any; booking?: any } {
  const customer = params?.customer;
  const customerData = params?.customerData;
  const booking = params?.booking;
  const uniqueId = params?.uniqueId ?? customer?.uniqueId ?? customerData?.mystayId;
  let passedCustomer = customer;
  if (!passedCustomer && customerData) {
    const name = (customerData.name || "").trim().split(/\s+/);
    passedCustomer = {
      id: customerData.id,
      uniqueId: customerData.mystayId ?? customerData.uniqueId ?? uniqueId,
      firstName: name[0] ?? "",
      lastName: name.slice(1).join(" ") ?? "",
      phone: customerData.phone,
      email: customerData.email,
    };
  }
  const tenantId = params?.tenantId ?? params?.customerId ?? passedCustomer?.id ?? customerData?.id;
  return { tenantId: tenantId != null ? String(tenantId) : "", uniqueId, customer: passedCustomer, booking };
}

export default function TenantDetailScreen({ navigation, route }: TenantDetailScreenProps) {
  const params = route?.params ?? {};
  const { tenantId, uniqueId, customer: passedCustomer, booking: passedBooking } = normaliseCustomerFromParams(params);
  const initialTab = params?.initialTab || "details";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [booking, setBooking] = useState<any>(passedBooking || null);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!tenantId) {
      setError("Tenant ID missing");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 1) Get customer by numeric id (works for all tenants). Use for fallback profile and to get uniqueId.
      let customerById: any = null;
      try {
        const byIdRes = await userApi.get(`/api/users/${tenantId}`);
        if (byIdRes.data?.success && byIdRes.data?.customer) {
          customerById = byIdRes.data.customer;
        }
      } catch (_) {}

      const uid = uniqueId || passedCustomer?.uniqueId || customerById?.uniqueId || null;

      // 2) Prefer full profile by uniqueId (more fields than customer-by-id)
      if (uid) {
        try {
          const profileRes = await userApi.get(`/api/users/${uid}/profile`);
          if (profileRes.data?.success && profileRes.data?.user) {
            setProfile(profileRes.data.user);
          }
        } catch (_) {}
      }

      // 3) If no profile yet, use passedCustomer or customer from step 1 so we never show "Tenant not found" when API succeeded
      setProfile((prev) => {
        if (prev) return prev;
        if (passedCustomer) {
          return {
            id: passedCustomer.id,
            uniqueId: passedCustomer.uniqueId,
            firstName: passedCustomer.firstName,
            lastName: passedCustomer.lastName,
            phone: passedCustomer.phone,
            email: passedCustomer.email,
          };
        }
        if (customerById) {
          return {
            id: customerById.id,
            uniqueId: customerById.uniqueId,
            firstName: customerById.firstName,
            lastName: customerById.lastName,
            phone: customerById.phone,
            email: customerById.email,
            sex: customerById.sex,
            profileExtras: customerById.profileExtras || undefined,
          };
        }
        return null;
      });

      // 4) Booking (if not passed from list)
      if (!passedBooking) {
        try {
          const bookRes = await bookingApi.get(`/api/bookings/customer/${tenantId}`);
          const bookings = bookRes.data?.bookings ?? [];
          const active = bookings.find((b: any) => b.status === "active");
          if (active) {
            let roomNumber: string | undefined = undefined;
            let propertyName: string | undefined = undefined;
            try {
              const roomRes = await propertyApi.get(`/api/properties/rooms/${active.roomId}`);
              if (roomRes.data?.success && roomRes.data?.room) {
                roomNumber = roomRes.data.room.roomNumber != null ? String(roomRes.data.room.roomNumber) : undefined;
                propertyName = roomRes.data.room.propertyName;
              }
            } catch (_) {}

            setBooking({
              id: active.id,
              roomId: active.roomId,
              roomNumber,
              moveInDate: active.moveInDate,
              rentAmount: active.rentAmount,
              securityDeposit: Number(active.securityDeposit ?? 0),
              isSecurityPaid: Boolean(active.isSecurityPaid),
              propertyName,
            });
          }
        } catch (_) {}
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load tenant");
    } finally {
      setLoading(false);
    }
  }, [tenantId, uniqueId, passedCustomer, passedBooking]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
      case "Paid":
      case "Verified":
        return "text-green-600 bg-green-50";
      case "Moved Out":
      case "Pending":
        return "text-slate-600 bg-slate-50";
      default:
        return "text-slate-600 bg-slate-50";
    }
  };

  const handleAction = (action: string) => {
    const phone = profile?.phone;
    switch (action) {
      case "payment":
        navigation.navigate("PaymentManagementScreen", { initialTab: "dues" });
        break;
      case "moveout":
        navigation.navigate("AdminInitiateMoveOut", {
          customerId: tenantId,
          customerName: profile ? [profile.firstName, profile.lastName].filter(Boolean).join(" ") : "Tenant",
          customerUniqueId: profile?.uniqueId || passedCustomer?.uniqueId || uniqueId || undefined,
          mystayId: profile?.uniqueId || passedCustomer?.uniqueId || uniqueId || undefined,
          bookingId: booking?.id,
          roomId: booking?.roomId,
          roomNumber: booking?.roomNumber,
          propertyName: booking?.propertyName,
          securityDeposit: booking?.securityDeposit,
        });
        break;
      case "call":
        if (phone) Linking.openURL(`tel:${phone}`);
        else Alert.alert("No phone", "Phone number not available");
        break;
      default:
        break;
    }
  };

  if (loading && !profile && !passedCustomer) {
    return (
      <SafeAreaView className="flex-1 bg-[#F1F5F9] items-center justify-center">
        <ActivityIndicator size="large" color="#1E33FF" />
        <Text className="text-slate-500 mt-4">Loading tenant details...</Text>
      </SafeAreaView>
    );
  }

  const displayName = profile ? [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() || "Tenant" : passedCustomer ? [passedCustomer.firstName, passedCustomer.lastName].filter(Boolean).join(" ").trim() || "Tenant" : "Tenant";
  const profileExtras = profile?.profileExtras || {};
  const documents = profileExtras.documents || {};
  const hasAnyDocument = !!(documents.aadharFront || documents.aadharBack || documents.idFront || documents.idBack);
  const dueAmount = booking && !booking.isSecurityPaid && booking.securityDeposit > 0 ? booking.securityDeposit : 0;

  const hasAddress = (formatAddress(profileExtras.addressAsPerAadhaar) !== "Not provided" || formatAddress(profileExtras.currentAddress) !== "Not provided");
  const hasDetails = !!(profile?.phone || profile?.email || profileExtras.dob || profile?.profession || hasAddress || profile?.emergencyName || profile?.emergencyPhone || booking);
  const hasPayments = !!booking;
  const hasDocuments = hasAnyDocument;

  const tabs = [
    { key: "details", label: "Details", show: hasDetails },
    { key: "payments", label: "Payments", show: hasPayments },
    { key: "documents", label: "Documents", show: hasDocuments },
  ].filter((t) => t.show);

  const hasAnyData = !!(profile || passedCustomer || booking);
  if (!hasAnyData) {
    return (
      <SafeAreaView className="flex-1 bg-[#F1F5F9] justify-center px-6">
        <Text className="text-slate-500 text-center">Tenant not found. The user may not exist or you may not have access.</Text>
        <TouchableOpacity className="mt-6 bg-indigo-600 px-6 py-3 rounded-xl self-center" onPress={() => navigation.goBack()}>
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const defaultTab = tabs.some((t) => t.key === initialTab) ? initialTab : tabs[0]?.key ?? "details";
  const currentTab = tabs.some((t) => t.key === activeTab) ? activeTab : defaultTab;

  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">
      <View className="bg-white px-6 py-5 flex-row items-center border-b border-slate-200 shadow-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1 -ml-1">
          <Ionicons name="arrow-back" size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-4 text-2xl font-black text-slate-900 tracking-tight">Tenant Details</Text>
      </View>

      {error ? (
        <View className="mx-5 mt-4 bg-amber-50 rounded-xl p-3 border border-amber-200">
          <Text className="text-amber-800 text-sm">{error}</Text>
        </View>
      ) : null}

      <ScrollView showsVerticalScrollIndicator={false} className="px-5">
        <View className="bg-white rounded-[24px] p-6 mt-6 shadow-sm border border-white">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View className="w-16 h-16 bg-blue-100 rounded-xl items-center justify-center">
                <Text className="text-blue-600 font-bold text-2xl">{displayName.charAt(0)}</Text>
              </View>
              <View className="ml-4">
                <Text className="text-xl font-black text-slate-900">{displayName}</Text>
                <Text className="text-slate-500">
                  {booking?.roomNumber ? `Room ${booking.roomNumber}` : "—"} • {profile?.uniqueId || tenantId || "—"}
                </Text>
              </View>
            </View>
            <View className="px-3 py-1 rounded-full bg-green-50">
              <Text className="text-green-600 font-bold text-xs uppercase">Active</Text>
            </View>
          </View>

          <View className="flex-row gap-2 mt-2">
            <TouchableOpacity className="flex-1 bg-green-500 py-3 rounded-xl" onPress={() => handleAction("call")}>
              <Text className="text-center font-bold text-white text-sm">Call</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="flex-1 bg-orange-500 py-3 rounded-xl" onPress={() => handleAction("moveout")}>
              <Text className="text-center font-bold text-white text-sm">Move Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {tabs.length > 0 && (
          <View className="flex-row bg-white rounded-[24px] p-2 mt-4 shadow-sm border border-white">
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                className={`flex-1 py-3 rounded-xl ${currentTab === tab.key ? "bg-blue-500" : ""}`}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text className={`text-center font-bold ${currentTab === tab.key ? "text-white" : "text-slate-600"}`}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {currentTab === "details" && (
          <View className="space-y-4 mt-4">
            {(profile?.phone || profile?.email || profileExtras.dob || profile?.profession) && (
              <View className="bg-white rounded-[24px] p-6 mb-4 shadow-sm border border-white">
                <Text className="text-lg font-black text-slate-900 mb-4">Personal Information</Text>
                <View className="space-y-3">
                  {profile?.phone != null && profile.phone !== "" && (
                    <View className="flex-row justify-between">
                      <Text className="text-slate-500 font-medium">Phone</Text>
                      <Text className="font-bold text-slate-900">{profile.phone}</Text>
                    </View>
                  )}
                  {profile?.email != null && profile.email !== "" && (
                    <View className="flex-row justify-between">
                      <Text className="text-slate-500 font-medium">Email</Text>
                      <Text className="font-bold text-slate-900">{profile.email}</Text>
                    </View>
                  )}
                  {profileExtras.dob != null && profileExtras.dob !== "" && (
                    <View className="flex-row justify-between">
                      <Text className="text-slate-500 font-medium">Date of Birth</Text>
                      <Text className="font-bold text-slate-900">{formatDate(profileExtras.dob)}</Text>
                    </View>
                  )}
                  {profile?.profession != null && profile.profession !== "" && (
                    <View className="flex-row justify-between">
                      <Text className="text-slate-500 font-medium">Profession</Text>
                      <Text className="font-bold text-slate-900">{profile.profession}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {(hasAddress) && (
              <View className="bg-white rounded-[24px] p-6 mb-4 shadow-sm border border-white">
                <Text className="text-lg font-black text-slate-900 mb-4">Address</Text>
                <View className="space-y-3">
                  {formatAddress(profileExtras.addressAsPerAadhaar) !== "Not provided" && (
                    <View>
                      <Text className="text-slate-500 font-medium mb-1">Address as per Aadhaar</Text>
                      <Text className="font-bold text-slate-900">{formatAddress(profileExtras.addressAsPerAadhaar)}</Text>
                    </View>
                  )}
                  {formatAddress(profileExtras.currentAddress) !== "Not provided" && (
                    <View>
                      <Text className="text-slate-500 font-medium mb-1">Current Address</Text>
                      <Text className="font-bold text-slate-900">{formatAddress(profileExtras.currentAddress)}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {booking && (
              <View className="bg-white rounded-[24px] p-6 mb-4 shadow-sm border border-white">
                <Text className="text-lg font-black text-slate-900 mb-4">Room & Rent</Text>
                <View className="space-y-3">
                  {booking.roomNumber != null && (
                    <View className="flex-row justify-between">
                      <Text className="text-slate-500 font-medium">Room</Text>
                      <Text className="font-bold text-slate-900">{booking.roomNumber}</Text>
                    </View>
                  )}
                  {booking.moveInDate != null && (
                    <View className="flex-row justify-between">
                      <Text className="text-slate-500 font-medium">Move-in Date</Text>
                      <Text className="font-bold text-slate-900">{formatDate(booking.moveInDate)}</Text>
                    </View>
                  )}
                  {booking.rentAmount != null && (
                    <View className="flex-row justify-between">
                      <Text className="text-slate-500 font-medium">Rent</Text>
                      <Text className="font-bold text-slate-900">₹{Number(booking.rentAmount).toLocaleString()}</Text>
                    </View>
                  )}
                  {booking.securityDeposit != null && (
                    <View className="flex-row justify-between">
                      <Text className="text-slate-500 font-medium">Security Deposit</Text>
                      <Text className="font-bold text-slate-900">₹{Number(booking.securityDeposit).toLocaleString()}</Text>
                    </View>
                  )}
                  <View className="flex-row justify-between">
                    <Text className="text-slate-500 font-medium">Due Amount</Text>
                    <Text className={`font-bold ${dueAmount > 0 ? "text-red-600" : "text-green-600"}`}>₹{dueAmount.toLocaleString()}</Text>
                  </View>
                </View>
              </View>
            )}

            {(profile?.emergencyName || profile?.emergencyPhone) && (
              <View className="bg-white rounded-[24px] p-6 mb-4 shadow-sm border border-white">
                <Text className="text-lg font-black text-slate-900 mb-4">Emergency Contact</Text>
                <View className="space-y-3">
                  {profile?.emergencyName != null && profile.emergencyName !== "" && (
                    <View className="flex-row justify-between">
                      <Text className="text-slate-500 font-medium">Name</Text>
                      <Text className="font-bold text-slate-900">{profile.emergencyName}</Text>
                    </View>
                  )}
                  {profile?.emergencyPhone != null && profile.emergencyPhone !== "" && (
                    <View className="flex-row justify-between">
                      <Text className="text-slate-500 font-medium">Phone</Text>
                      <Text className="font-bold text-slate-900">{profile.emergencyPhone}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {!hasDetails && (
              <View className="bg-white rounded-[24px] p-6 mb-4 shadow-sm border border-white">
                <Text className="text-slate-500 text-center">No details available</Text>
              </View>
            )}
          </View>
        )}

        {currentTab === "payments" && (
          <View className="mt-4">
            <View className="bg-white rounded-[24px] p-6 shadow-sm border border-white">
              <Text className="text-lg font-black text-slate-900 mb-4">Payments</Text>
              {booking ? (
                <View className="space-y-3">
                  <View className="flex-row items-center justify-between py-3 border-b border-slate-100">
                    <View>
                      <Text className="font-bold text-slate-900">Security Deposit</Text>
                      <Text className="text-slate-500 text-sm">{booking.moveInDate ? formatDate(booking.moveInDate) : "—"}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-bold text-slate-900">₹{Number(booking.securityDeposit || 0).toLocaleString()}</Text>
                      <View className={`px-2 py-1 rounded-full mt-1 ${booking.isSecurityPaid ? "bg-green-100" : "bg-amber-100"}`}>
                        <Text className={`text-xs font-bold ${booking.isSecurityPaid ? "text-green-700" : "text-amber-700"}`}>{booking.isSecurityPaid ? "Paid" : "Pending"}</Text>
                      </View>
                    </View>
                  </View>
                  <View className="flex-row items-center justify-between py-3">
                    <Text className="font-bold text-slate-900">Current due</Text>
                    <Text className={`font-bold ${dueAmount > 0 ? "text-red-600" : "text-green-600"}`}>₹{dueAmount.toLocaleString()}</Text>
                  </View>
                </View>
              ) : (
                <Text className="text-slate-500">No payment data available</Text>
              )}
            </View>
          </View>
        )}

        {currentTab === "documents" && hasDocuments && (
          <View className="mt-4 space-y-4">
            {(documents.aadharFront || documents.aadharBack) && (
              <View className="bg-white rounded-[24px] p-6 shadow-sm border border-white">
                <Text className="text-lg font-black text-slate-900 mb-4">Aadhaar</Text>
                <View className="space-y-3">
                  {documents.aadharFront && (
                    <View>
                      <Text className="text-slate-600 font-medium mb-2">Front</Text>
                      <Image source={{ uri: documents.aadharFront }} className="w-full h-48 rounded-xl bg-slate-100" resizeMode="cover" />
                    </View>
                  )}
                  {documents.aadharBack && (
                    <View>
                      <Text className="text-slate-600 font-medium mb-2">Back</Text>
                      <Image source={{ uri: documents.aadharBack }} className="w-full h-48 rounded-xl bg-slate-100" resizeMode="cover" />
                    </View>
                  )}
                </View>
              </View>
            )}
            {(documents.idFront || documents.idBack) && (
              <View className="bg-white rounded-[24px] p-6 shadow-sm border border-white">
                <Text className="text-lg font-black text-slate-900 mb-4">ID Card</Text>
                <View className="space-y-3">
                  {documents.idFront && (
                    <View>
                      <Text className="text-slate-600 font-medium mb-2">Front</Text>
                      <Image source={{ uri: documents.idFront }} className="w-full h-48 rounded-xl bg-slate-100" resizeMode="cover" />
                    </View>
                  )}
                  {documents.idBack && (
                    <View>
                      <Text className="text-slate-600 font-medium mb-2">Back</Text>
                      <Image source={{ uri: documents.idBack }} className="w-full h-48 rounded-xl bg-slate-100" resizeMode="cover" />
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
