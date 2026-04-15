import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { userApi, bookingApi, propertyApi } from "../utils/api";
import { useProperty } from "../contexts/PropertyContext";
import { formatAddress } from "../utils/address";
import { resolveFinalKycVerified } from "../utils/kyc";
import { adminDisplayDueAmount } from "./DueAmount";

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
  kycStatus?: string;
  status?: string;
  profileExtras?: {
    dob?: string;
    addressAsPerAadhaar?: string;
    currentAddress?: string;
    profileImage?: string;
    aadhaar?: string;
    kycStatus?: string;
    aadhaarData?: {
      name?: string;
      dob?: string;
      gender?: string;
    };
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
  const isInactiveRoute = String(params?.customer?.status || params?.customerData?.status || passedCustomer?.status || "").toLowerCase() === "inactive";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileUser | null>(
    passedCustomer
      ? {
          id: passedCustomer.id,
          uniqueId: passedCustomer.uniqueId,
          firstName: passedCustomer.firstName,
          lastName: passedCustomer.lastName,
          phone: passedCustomer.phone,
          email: passedCustomer.email,
        }
      : null
  );
  const [booking, setBooking] = useState<any>(passedBooking || null);
  const [bookingHistory, setBookingHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const { currentProperty } = useProperty();

  useEffect(() => {
    if (!hintMessage) return;
    const t = setTimeout(() => setHintMessage(null), 3500);
    return () => clearTimeout(t);
  }, [hintMessage]);

  const fetchDetails = useCallback(async () => {
    if (!tenantId) {
      setError("Tenant ID missing");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const hintedUid = uniqueId || passedCustomer?.uniqueId || null;

      const [byIdRes, profileByHintRes, bookRes] = await Promise.all([
        userApi.get(`/api/users/${tenantId}`).catch(() => null),
        hintedUid ? userApi.get(`/api/users/${hintedUid}/profile`).catch(() => null) : Promise.resolve(null),
        bookingApi.get(`/api/bookings/customer/${tenantId}`).catch(() => null),
      ]);

      const customerById = byIdRes?.data?.success && byIdRes?.data?.customer ? byIdRes.data.customer : null;
      const resolvedUid = hintedUid || customerById?.uniqueId || null;

      const profileRes =
        profileByHintRes ||
        (resolvedUid ? await userApi.get(`/api/users/${resolvedUid}/profile`).catch(() => null) : null);

      const nextProfile: ProfileUser | null =
        profileRes?.data?.success && profileRes?.data?.user
          ? profileRes.data.user
          : passedCustomer
          ? {
              id: passedCustomer.id,
              uniqueId: passedCustomer.uniqueId,
              firstName: passedCustomer.firstName,
              lastName: passedCustomer.lastName,
              phone: passedCustomer.phone,
              email: passedCustomer.email,
            }
          : customerById
          ? {
              id: customerById.id,
              uniqueId: customerById.uniqueId,
              firstName: customerById.firstName,
              lastName: customerById.lastName,
              phone: customerById.phone,
              email: customerById.email,
              sex: customerById.sex,
              profileExtras: customerById.profileExtras || undefined,
            }
          : null;

      const bookings = bookRes?.data?.bookings ?? [];
      setBookingHistory(bookings);

      let nextBooking = isInactiveRoute ? null : passedBooking || null;
      if (!isInactiveRoute && (!passedBooking || passedBooking.status === "inactive") && bookings.length > 0) {
        const active = bookings.find((b: any) => b.status === "active");
        if (active) {
          const roomRes = await propertyApi.get(`/api/properties/rooms/${active.roomId}`).catch(() => null);
          const room = roomRes?.data?.success && roomRes?.data?.room ? roomRes.data.room : null;
          nextBooking = {
            ...active,
            id: active.id,
            roomId: active.roomId,
            roomNumber: room?.roomNumber != null ? String(room.roomNumber) : undefined,
            moveInDate: active.moveInDate,
            rentAmount: active.rentAmount,
            securityDeposit: Number(active.securityDeposit ?? 0),
            isSecurityPaid: Boolean(active.isSecurityPaid),
            propertyName: room?.propertyName,
            room: room
              ? {
                  propertyId: room.propertyId != null ? String(room.propertyId) : undefined,
                  propertyUniqueId: room.propertyUniqueId != null ? String(room.propertyUniqueId) : undefined,
                  propertyName: room.propertyName,
                }
              : undefined,
          };
        }
      }

      setProfile(nextProfile);
      setBooking(nextBooking);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load tenant");
    } finally {
      setLoading(false);
    }
  }, [tenantId, uniqueId, isInactiveRoute]);

  useFocusEffect(
    useCallback(() => {
      fetchDetails();
    }, [fetchDetails])
  );

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const handleAction = (action: string) => {
    const phone = profile?.phone;
    switch (action) {
      case "payment":
        navigation.navigate("PaymentManagementScreen", { initialTab: "dues" });
        break;
      case "moveout": {
        const fromRoom = booking?.room;
        const resolvedPropertyId =
          fromRoom?.propertyId ??
          booking?.propertyId ??
          currentProperty?.id ??
          currentProperty?.uniqueId;
        const resolvedPropertyUniqueId =
          fromRoom?.propertyUniqueId ?? currentProperty?.uniqueId ?? undefined;
        navigation.navigate("AdminInitiateMoveOut", {
          customerId: tenantId,
          customerName: profile ? [profile.firstName, profile.lastName].filter(Boolean).join(" ") : "Tenant",
          customerUniqueId: profile?.uniqueId || passedCustomer?.uniqueId || uniqueId || undefined,
          mystayId: profile?.uniqueId || passedCustomer?.uniqueId || uniqueId || undefined,
          bookingId: booking?.id,
          roomId: booking?.roomId,
          roomNumber: booking?.roomNumber,
          propertyId: resolvedPropertyId != null ? String(resolvedPropertyId) : undefined,
          propertyUniqueId: resolvedPropertyUniqueId,
          propertyName: booking?.propertyName ?? currentProperty?.name ?? "",
          securityDeposit: booking?.securityDeposit,
        });
        break;
      }
      case "call":
        if (phone) Linking.openURL(`tel:${phone}`);
        else setHintMessage("Phone number not available");
        break;
      default:
        break;
    }
  };

  if (loading && !passedCustomer) {
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
  const dueAmount = adminDisplayDueAmount(booking);
  const isKycVerified = resolveFinalKycVerified(profile);
  const kycStatusLabel = isKycVerified ? "Verified" : "Unverified";

  const hasAddress = (formatAddress(profileExtras.addressAsPerAadhaar) !== "Not provided" || formatAddress(profileExtras.currentAddress) !== "Not provided");
  const hasDetails = !!(profile?.phone || profile?.email || profileExtras.dob || profile?.profession || hasAddress || profile?.emergencyName || profile?.emergencyPhone || booking);
  const hasPayments = !!bookingHistory.length || !!booking;
  const hasDocuments = hasAnyDocument;

  const tabs = [
    { key: "details", label: "Details", show: hasDetails },
    { key: "payments", label: "Payments", show: hasPayments },
    { key: "documents", label: "Documents", show: hasDocuments },
  ].filter((t) => t.show);

  const hasAnyData = !!(profile || passedCustomer || booking);
  const isInactiveTenant = (() => {
    if (isInactiveRoute) return true;
    if (profile?.status === "inactive" || passedCustomer?.status === "inactive") return true;
    if (booking?.status === "active") return false;
    if (bookingHistory.some((b) => b.status === "active")) return false;
    if (bookingHistory.length === 0 && !booking) return false;
    return true;
  })();
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

      {hintMessage ? (
        <View className="mx-5 mt-3 bg-rose-50 rounded-xl p-3 border border-rose-200">
          <Text className="text-rose-800 text-sm">{hintMessage}</Text>
        </View>
      ) : null}

      <ScrollView showsVerticalScrollIndicator={false} className="px-5">
        <View className="bg-white rounded-[24px] p-6 mt-6 shadow-sm border border-white">
  <View className="flex-row items-center justify-between mb-4">
    <View className="flex-row items-center">
      {/* Profile Image with proper access and fallback */}
      <View className="w-16 h-16 bg-blue-100 rounded-xl items-center justify-center overflow-hidden">
        {profileExtras?.profileImage ? (
          <Image 
            source={{ uri: profileExtras.profileImage }} 
            className="w-full h-full"
            resizeMode="cover"
            onError={(e) => {
              console.log('Profile image failed to load:', profileExtras.profileImage);
            }}
          />
        ) : (
          <Text className="text-blue-600 font-bold text-2xl">
            {displayName.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      <View className="ml-4">
        <Text className="text-xl font-black text-slate-900">{displayName}</Text>
        <Text className="text-slate-500">
          {booking?.roomNumber ? `Room ${booking.roomNumber}` : "—"} • {profile?.uniqueId || tenantId || "—"}
        </Text>
        <Text className={`mt-1 text-xs font-bold uppercase ${isKycVerified ? "text-green-600" : "text-amber-600"}`}>
          KYC {kycStatusLabel}
        </Text>
      </View>
    </View>
    <View className={`px-3 py-1 rounded-full ${isInactiveTenant ? "bg-slate-100" : "bg-green-50"}`}>
      <Text className={`font-bold text-xs uppercase ${isInactiveTenant ? "text-slate-600" : "text-green-600"}`}>
        {isInactiveTenant ? "Inactive" : "Active"}
      </Text>
    </View>
  </View>

  <View className="flex-row gap-2 mt-2">
    <TouchableOpacity className="flex-1 bg-green-500 py-3 rounded-xl" onPress={() => handleAction("call")}>
      <Text className="text-center font-bold text-white text-sm">Call</Text>
    </TouchableOpacity>
    {!isInactiveTenant && (
      <TouchableOpacity className="flex-1 bg-orange-500 py-3 rounded-xl" onPress={() => handleAction("moveout")}>
        <Text className="text-center font-bold text-white text-sm">Move Out</Text>
      </TouchableOpacity>
    )}
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
            {booking?.id && (
              <View className="bg-white rounded-[24px] p-6 mb-4 shadow-sm border border-white">
                <Text className="text-lg font-black text-slate-900 mb-3">Enrollment Form</Text>
                <Text className="text-slate-600 mb-4">
                  View the tenant enrollment agreement submitted for this booking.
                </Text>
                <TouchableOpacity
                  className="bg-blue-500 py-3 rounded-xl"
                  onPress={() =>
                    navigation.navigate("AdminGuestEnrollmentFormScreen", {
                      bookingId: booking.id,
                    })
                  }
                >
                  <Text className="text-center text-white font-bold text-sm">View Enrollment Form</Text>
                </TouchableOpacity>
              </View>
            )}

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
                  <View className="flex-row justify-between">
                    <Text className="text-slate-500 font-medium">KYC Status</Text>
                    <Text className={`font-bold ${isKycVerified ? "text-green-600" : "text-amber-600"}`}>{kycStatusLabel}</Text>
                  </View>
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
          <View className="mt-4 space-y-4">
            {bookingHistory.length === 0 ? (
              <View className="bg-white rounded-[24px] p-6 shadow-sm border border-white">
                <Text className="text-slate-500 text-center">No payment data available</Text>
              </View>
            ) : (
              bookingHistory.map((item: any, index: number) => {
                const roomLabel = item.roomNumber || item.room?.roomNumber || "—";
                const deposit = Number(item.securityDeposit || 0);
                const rp = String(item.rentPeriod || "month").toLowerCase();
                const isDay = rp === "day";
                const schedOnline = Number(item.scheduledOnlineRent || 0);
                const schedCash = Number(item.scheduledCashRent || 0);
                const paidOnlineMonths = (item.rentOnlinePaidYearMonth || "").split(",").map((m: string) => m.trim()).filter(Boolean);
                const paidCashMonths = (item.rentCashPaidYearMonth || "").split(",").map((m: string) => m.trim()).filter(Boolean);
                const dailyPayments: any[] = Array.isArray(item.dailyPayments) ? item.dailyPayments : [];

                // Generate expected months from move-in to today (same rules as customerDueDisplay)
                const toYm = (d: Date) =>
                  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                const now = new Date();
                const nowYm = toYm(now);

                const buildExpectedMonths = (): string[] => {
                  if (!item.moveInDate) return [];
                  const mi = new Date(item.moveInDate);
                  if (isNaN(mi.getTime())) return [];
                  const miDay = mi.getDate();
                  // first due: same month if move-in ≤ 10, else next month
                  const firstDue =
                    miDay <= 10
                      ? toYm(mi)
                      : toYm(new Date(mi.getFullYear(), mi.getMonth() + 1, 1));
                  // end: today's month (active) or move-out month (inactive)
                  let endYm = nowYm;
                  if (item.moveOutDate) {
                    const mo = new Date(item.moveOutDate);
                    if (!isNaN(mo.getTime())) endYm = toYm(mo);
                  }
                  if (firstDue > endYm) return [];
                  const months: string[] = [];
                  let cur = firstDue;
                  while (cur <= endYm) {
                    months.push(cur);
                    const [y, m] = cur.split("-").map(Number);
                    const next = new Date(y, m, 1);
                    cur = toYm(next);
                  }
                  return months;
                };

                const allMonths = !isDay ? buildExpectedMonths() : [];

                return (
                  <View key={item.id || index} className="bg-white rounded-[24px] p-6 shadow-sm border border-white mb-4">
                    <View className="flex-row items-center justify-between mb-4">
                      <View>
                        <Text className="text-base font-black text-slate-900">
                          {item.status === "active" ? "Active Stay" : "Past Stay"} — Room {roomLabel}
                        </Text>
                        <Text className="text-slate-500 text-xs mt-0.5">
                          Move-in: {item.moveInDate ? formatDate(item.moveInDate) : "—"}
                          {item.moveOutDate ? `  •  Move-out: ${formatDate(item.moveOutDate)}` : ""}
                        </Text>
                      </View>
                      <View className={`px-2 py-1 rounded-full ${item.status === "active" ? "bg-green-50" : "bg-slate-100"}`}>
                        <Text className={`text-xs font-bold uppercase ${item.status === "active" ? "text-green-600" : "text-slate-500"}`}>
                          {item.status === "active" ? "Active" : "Inactive"}
                        </Text>
                      </View>
                    </View>

                    {/* Security Deposit */}
                    {deposit > 0 && (
                      <View className="flex-row items-center justify-between py-3 border-b border-slate-100">
                        <View>
                          <Text className="font-semibold text-slate-800">Security Deposit</Text>
                          <Text className="text-slate-400 text-xs">One-time</Text>
                        </View>
                        <View className="items-end">
                          <Text className="font-bold text-slate-900">₹{deposit.toLocaleString()}</Text>
                          <View className={`px-2 py-0.5 rounded-full mt-1 ${item.isSecurityPaid ? "bg-green-100" : "bg-red-100"}`}>
                            <Text className={`text-xs font-bold ${item.isSecurityPaid ? "text-green-700" : "text-red-700"}`}>
                              {item.isSecurityPaid ? "Paid" : "Due"}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Monthly Rent Rows */}
                    {!isDay && (schedOnline > 0 || schedCash > 0) && (
                      <>
                        {allMonths.length > 0 ? (
                          allMonths.map((ym: string) => {
                            const onlinePaid = paidOnlineMonths.includes(ym);
                            const cashPaid = paidCashMonths.includes(ym);
                            const [yr, mo] = ym.split("-");
                            const label = new Date(Number(yr), Number(mo) - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
                            return (
                              <View key={ym} className="py-3 border-b border-slate-100">
                                <Text className="font-semibold text-slate-800 mb-2">Rent — {label}</Text>
                                {schedOnline > 0 && (
                                  <View className="flex-row items-center justify-between mb-1">
                                    <Text className="text-slate-500 text-sm">💳 Online</Text>
                                    <View className="flex-row items-center gap-2">
                                      <Text className="font-semibold text-slate-800">₹{schedOnline.toLocaleString()}</Text>
                                      <View className={`px-2 py-0.5 rounded-full ${onlinePaid ? "bg-green-100" : "bg-red-100"}`}>
                                        <Text className={`text-xs font-bold ${onlinePaid ? "text-green-700" : "text-red-700"}`}>{onlinePaid ? "Paid" : "Due"}</Text>
                                      </View>
                                    </View>
                                  </View>
                                )}
                                {schedCash > 0 && (
                                  <View className="flex-row items-center justify-between">
                                    <Text className="text-slate-500 text-sm">💰 Cash</Text>
                                    <View className="flex-row items-center gap-2">
                                      <Text className="font-semibold text-slate-800">₹{schedCash.toLocaleString()}</Text>
                                      <View className={`px-2 py-0.5 rounded-full ${cashPaid ? "bg-green-100" : "bg-red-100"}`}>
                                        <Text className={`text-xs font-bold ${cashPaid ? "text-green-700" : "text-red-700"}`}>{cashPaid ? "Paid" : "Due"}</Text>
                                      </View>
                                    </View>
                                  </View>
                                )}
                              </View>
                            );
                          })
                        ) : (
                          <View className="py-3 border-b border-slate-100">
                            <Text className="text-slate-400 text-sm">Rent not due yet — starts next month</Text>
                          </View>
                        )}
                      </>
                    )}

                    {/* Daily Rent Rows */}
                    {isDay && (
                      <>
                        {dailyPayments.length === 0 ? (
                          // No records yet — show today as due if booking is active
                          item.status === "active" ? (
                            <View className="py-3 border-b border-slate-100">
                              <View className="flex-row items-center justify-between mb-1">
                                <Text className="font-semibold text-slate-800">
                                  {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                </Text>
                                <View className="px-2 py-0.5 rounded-full bg-red-100">
                                  <Text className="text-xs font-bold text-red-700">Due</Text>
                                </View>
                              </View>
                              {schedOnline > 0 && (
                                <View className="flex-row items-center justify-between mt-1">
                                  <Text className="text-slate-500 text-sm">💳 Online</Text>
                                  <Text className="text-slate-700 text-sm">₹{schedOnline.toLocaleString()}</Text>
                                </View>
                              )}
                              {schedCash > 0 && (
                                <View className="flex-row items-center justify-between mt-1">
                                  <Text className="text-slate-500 text-sm">💰 Cash</Text>
                                  <Text className="text-slate-700 text-sm">₹{schedCash.toLocaleString()}</Text>
                                </View>
                              )}
                            </View>
                          ) : (
                            <View className="py-3 border-b border-slate-100">
                              <Text className="text-slate-400 text-sm">No daily payment records</Text>
                            </View>
                          )
                        ) : (
                          dailyPayments.map((dp: any) => {
                            const dpDate = dp.paymentDate ? new Date(dp.paymentDate) : null;
                            const dpLabel = dpDate ? dpDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
                            const fullyPaid = dp.paidOnline && dp.paidCash;
                            const partiallyPaid = dp.paidOnline || dp.paidCash;
                            return (
                              <View key={dp.id} className="py-3 border-b border-slate-100">
                                <View className="flex-row items-center justify-between mb-1">
                                  <Text className="font-semibold text-slate-800">{dpLabel}</Text>
                                  
                                </View>
                                {dp.onlineAmount > 0 && (
                                  <View className="flex-row items-center justify-between mt-1">
                                    <Text className="text-slate-500 text-sm">💳 Online</Text>
                                    <View className="flex-row items-center gap-2">
                                      <Text className="text-slate-700 text-sm">₹{Number(dp.onlineAmount).toLocaleString()}</Text>
                                      <View className={`px-2 py-0.5 rounded-full ${dp.paidOnline ? "bg-green-100" : "bg-red-100"}`}>
                                        <Text className={`text-xs font-bold ${dp.paidOnline ? "text-green-700" : "text-red-700"}`}>{dp.paidOnline ? "Paid" : "Due"}</Text>
                                      </View>
                                    </View>
                                  </View>
                                )}
                                {dp.cashAmount > 0 && (
                                  <View className="flex-row items-center justify-between mt-1">
                                    <Text className="text-slate-500 text-sm">💰 Cash</Text>
                                    <View className="flex-row items-center gap-2">
                                      <Text className="text-slate-700 text-sm">₹{Number(dp.cashAmount).toLocaleString()}</Text>
                                      <View className={`px-2 py-0.5 rounded-full ${dp.paidCash ? "bg-green-100" : "bg-red-100"}`}>
                                        <Text className={`text-xs font-bold ${dp.paidCash ? "text-green-700" : "text-red-700"}`}>{dp.paidCash ? "Paid" : "Due"}</Text>
                                      </View>
                                    </View>
                                  </View>
                                )}
                              </View>
                            );
                          })
                        )}
                      </>
                    )}
                  </View>
                );
              })
            )}
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
