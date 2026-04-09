import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, NavigationProp, useRoute, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AllocationScreen from "./AllocationScreen";
import BottomNav from "./BottomNav";
import { DUMMY_TENANTS } from "../data/dummyTenants";
import { userApi, bookingApi } from "../utils/api";
import { useProperty } from "../contexts/PropertyContext";
import { resolveFinalKycVerified } from "../utils/kyc";

/* =========================
   AVATAR WITH FALLBACK
========================= */
const Avatar = ({ uri }: { uri: string }) => {
  const [error, setError] = useState(false);

  return (
    <Image
      source={
        error || !uri
          ? require("../assets/image2.png")
          : { uri }
      }
      onError={() => setError(true)}
      className="w-16 h-16 rounded-full mr-4 bg-gray-200"
    />
  );
};

/* =========================
   CUSTOMER DATABASE - Fetched from backend
========================= */
let CUSTOMER_DB: any[] = [];

/* =========================
   ENROLLMENT DATABASE - Using centralized data
========================= */
const ENROLLMENT_DB = DUMMY_TENANTS.filter(t => t.status === "active").map(tenant => ({
  mystayId: tenant.mystayId,
  name: tenant.name,
  phone: tenant.phone.replace('+91', ''),
  photo: tenant.photo,
  kycStatus: tenant.kycStatus,
  roomPreference: "Single",
  status: tenant.kycStatus === "Verified" ? "Approved" : "Requested",
}));

export default function CustomersScreen() {
  const navigation = useNavigation<NavigationProp<any>>();
  const route = useRoute();
  const { currentProperty } = useProperty();
  const propertyId = currentProperty?.id;

  // Get initialTab from route params, default to "customer"
  const initialTab = (route.params as any)?.initialTab || "customer";
  const [tab, setTab] = useState<"customer" | "enrollment">(initialTab);
  const [step, setStep] = useState<"enrollment" | "allocation">("enrollment");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searching, setSearching] = useState(false);

  const [enrollmentQuery, setEnrollmentQuery] = useState("");
  const [enrollmentResults, setEnrollmentResults] =
    useState<any[]>(ENROLLMENT_DB);
  const [enrollmentList, setEnrollmentList] = useState<any[]>([]);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);

  // Fetch enrollment requests for the current property only (so customer enrolled in A doesn't show in B)
  useEffect(() => {
    if (tab !== "enrollment" || step !== "enrollment") return;
    let cancelled = false;
    (async () => {
      setEnrollmentLoading(true);
      try {
        const params = propertyId ? { propertyId } : {};
        const res = await bookingApi.get("/api/enrollment-requests", { params });
        if (cancelled) return;
        if (res.data?.success && Array.isArray(res.data.requests)) {
          const list = res.data.requests.map((r: any) => {
            const st = String(r.status || "");
            const statusLabel =
              st === "pay_pending" ? "Pay pending" : st === "requested" ? "Requested" : st;
            return {
              mystayId: r.mystayId || r.uniqueId || r.id,
              name: r.name || "Customer",
              phone: r.phone || "—",
              photo: "https://ui-avatars.com/api/?name=" + encodeURIComponent(r.name || "C") + "&size=150&background=3B82F6&color=fff",
              kycStatus: "Requested",
              roomPreference: r.roomPreference || "—",
              moveInDate: r.moveInDate,
              moveOutDate: r.moveOutDate,
              securityDeposit: r.securityDeposit,
              comments: r.comments || "",
              status: statusLabel,
              statusRaw: st,
              uniqueId: r.uniqueId,
              enrollmentRequestId: r.id,
              customerId: r.customerId,
              pendingAllocation: r.pendingAllocation ?? null,
            };
          });
          setEnrollmentList(list);
          setEnrollmentResults(list);
        } else {
          setEnrollmentList([]);
          setEnrollmentResults(ENROLLMENT_DB);
        }
      } catch (_) {
        if (!cancelled) {
          setEnrollmentList([]);
          setEnrollmentResults(ENROLLMENT_DB);
        }
      } finally {
        if (!cancelled) setEnrollmentLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tab, step, propertyId]);

  // Refetch enrollment list when screen gains focus (e.g. after allocating a room so accepted request disappears)
  const fetchEnrollmentList = React.useCallback(async () => {
    if (tab !== "enrollment" || step !== "enrollment") return;
    setEnrollmentLoading(true);
    try {
      const params = propertyId ? { propertyId } : {};
      const res = await bookingApi.get("/api/enrollment-requests", { params });
      if (res.data?.success && Array.isArray(res.data.requests)) {
        const list = res.data.requests.map((r: any) => {
          const st = String(r.status || "");
          const statusLabel =
            st === "pay_pending" ? "Pay pending" : st === "requested" ? "Requested" : st;
          return {
            mystayId: r.mystayId || r.uniqueId || r.id,
            name: r.name || "Customer",
            phone: r.phone || "—",
            photo: "https://ui-avatars.com/api/?name=" + encodeURIComponent(r.name || "C") + "&size=150&background=3B82F6&color=fff",
            kycStatus: "Requested",
            roomPreference: r.roomPreference || "—",
            moveInDate: r.moveInDate,
            moveOutDate: r.moveOutDate,
            securityDeposit: r.securityDeposit,
            comments: r.comments || "",
            status: statusLabel,
            statusRaw: st,
            uniqueId: r.uniqueId,
            enrollmentRequestId: r.id,
            customerId: r.customerId,
            pendingAllocation: r.pendingAllocation ?? null,
          };
        });
        setEnrollmentList(list);
        setEnrollmentResults(list);
      } else {
        setEnrollmentList([]);
        setEnrollmentResults(ENROLLMENT_DB);
      }
    } catch (_) {
      setEnrollmentList([]);
      setEnrollmentResults(ENROLLMENT_DB);
    } finally {
      setEnrollmentLoading(false);
    }
  }, [tab, step, propertyId]);

  useFocusEffect(
    React.useCallback(() => {
      fetchEnrollmentList();
    }, [fetchEnrollmentList])
  );

  // When returning from allocation success, refetch enrollment list so the accepted request disappears
  const refreshEnrollmentList = (route.params as any)?.refreshEnrollmentList;
  useEffect(() => {
    if (!refreshEnrollmentList || tab !== "enrollment" || step !== "enrollment") return;
    const t = setTimeout(() => {
      fetchEnrollmentList();
      navigation.setParams({ refreshEnrollmentList: undefined });
    }, 400);
    return () => clearTimeout(t);
  }, [refreshEnrollmentList, tab, step, fetchEnrollmentList, navigation]);

  // Auto-search effect with debounce
  useEffect(() => {
    const q = searchQuery.trim();
    
    // Check if input matches valid format
    const isPhone = /^\+?\d{10,}$/.test(q);
    const isId = /^MYS\d{2}[A-Z]\d{6}$/i.test(q);
    
    if (isPhone || isId) {
      // Debounce the search
      const timer = setTimeout(() => {
        handleCustomerSearch();
      }, 500); // Wait 500ms after user stops typing
      
      return () => clearTimeout(timer);
    } else if (q.length > 0) {
      // Clear results if input doesn't match valid format
      setSearchResults([]);
      setHasSearched(false);
    }
  }, [searchQuery]);

  /* =========================
     CUSTOMER SEARCH - Fetch from Backend with WhatsApp Invite
  ========================= */
  const handleCustomerSearch = async () => {
    const q = searchQuery.trim();
    setHasSearched(true);

    if (!q) {
      setSearchResults([]);
      return;
    }

    const isPhone = /^\+?\d{10,}$/.test(q);
    const isId = /^MYS\d{2}[A-Z]\d{6}$/i.test(q);

    if (!isPhone && !isId) {
      Alert.alert("Invalid Input", "Please enter a valid 10-digit phone number or MyStayInn ID (e.g., MYS25A000001)");
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      
      // Use the search endpoint with the query parameter
      const searchQueryParam = isPhone ? (q.startsWith('+') ? q : `+91${q}`) : q.toUpperCase();
      const response = await userApi.get(`/api/users/search/customers?query=${encodeURIComponent(searchQueryParam)}`);

      if (response?.data?.success && response.data.customers?.length > 0) {
        const formattedUsers = response.data.customers.map((user: any) => {
          const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown';
          return {
            ...user,
            id: user.id ?? user.uniqueId,
            uniqueId: user.uniqueId,
            name,
            phone: user.phone?.replace('+91', '') || user.phone || 'N/A',
            kycStatus: resolveFinalKycVerified(user) ? "Verified" : "Unverified",
            photo: user.profileExtras?.profileImage || "https://ui-avatars.com/api/?name=" + encodeURIComponent(name || 'User') + "&size=150&background=3B82F6&color=fff&bold=true",
            email: user.email,
            aadhaarStatus: user.aadhaarStatus,
          };
        });
        setSearchResults(formattedUsers);
        
        if (formattedUsers.length === 0) {
          // No customer found - show WhatsApp invite option
          if (isPhone) {
            // Show WhatsApp invite for phone searches
            return;
          }
          Alert.alert("Not Found", "No customer found with this ID");
        }
      } else {
        setSearchResults([]);
        // Customer not found - for phone searches, show WhatsApp option
        if (!isPhone) {
          Alert.alert("Not Found", "No customer found with this ID");
        }
      }
    } catch (error: any) {
      console.error('Search error:', error);
      setSearchResults([]);
      
      if (error.response?.status === 404) {
        // Customer not found - for phone searches, show WhatsApp option
        if (!isPhone) {
          Alert.alert("Not Found", "No customer found with this ID");
        }
      } else {
        Alert.alert("Error", "Failed to search customer. Please try again.");
      }
    } finally {
      setSearching(false);
    }
  };

  // Send WhatsApp invite (Twilio via booking-service → notification-service; fallback: wa.me)
  const sendWhatsAppInvite = async () => {
    const cleanPhone = searchQuery.replace(/\D/g, "").slice(-10);
    const phoneWithCode = "+91" + cleanPhone;

    try {
      const res = await bookingApi.post("/api/bookings/admin/whatsapp-invite", {
        phone: phoneWithCode,
      });
      if (res.data?.success) {
        Alert.alert("Sent", "WhatsApp invitation was sent to this number.");
        setSearchQuery("");
        setSearchResults([]);
        setHasSearched(false);
        return;
      }
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = String(e?.response?.data?.message || e?.message || "");
      if (status === 503 || /not configured/i.test(msg)) {
        const message = encodeURIComponent(
          `Hi! I'd like to invite you to use the MyStay Customer App. Download it to manage your PG bookings and payments easily.`
        );
        const url = `https://wa.me/${cleanPhone}?text=${message}`;
        try {
          await Linking.openURL(url);
          setSearchQuery("");
          setSearchResults([]);
          setHasSearched(false);
        } catch {
          Alert.alert("Error", "Unable to open WhatsApp");
        }
        return;
      }
      Alert.alert("Error", msg || "Failed to send WhatsApp invite");
    }
  };

  /* =========================
     ENROLLMENT SEARCH (filter fetched list or fallback to dummy)
  ========================= */
  const handleEnrollmentSearch = (text: string) => {
    setEnrollmentQuery(text);
    const q = text.toLowerCase().trim();
    const source = enrollmentList.length > 0 ? enrollmentList : ENROLLMENT_DB;
    if (!q) {
      setEnrollmentResults(source);
      return;
    }
    setEnrollmentResults(
      source.filter(
        (e: any) =>
          (e.mystayId || "").toLowerCase().includes(q) ||
          (e.name || "").toLowerCase().includes(q) ||
          (e.phone || "").includes(q)
      )
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* HEADER */}
      <View className="bg-[#f7f8fb] pt-4 pb-8 px-6">
        <View className="flex-row justify-between items-center">
          <Text className="text-black text-3xl font-extrabold">
            Customers
          </Text>
          
        </View>
        <Text className="text-base text-gray-700 mt-2">
          Search & manage current and past occupants
        </Text>
      </View>

      {/* BODY */}
      <View className="flex-1 bg-[#F6F8FF] rounded-t-[40px] -mt-6 px-4 pt-6">
        {/* TAB SWITCH */}
        <View className="flex-row bg-[#1E33FF] rounded-full p-1 mb-6">
          {["customer", "enrollment"].map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => {
                setTab(t as any);
                setStep("enrollment");
              }}
              className={`flex-1 py-3 rounded-full ${
                tab === t ? "bg-white" : ""
              }`}
            >
              <Text
                className={`text-center text-base font-bold ${
                  tab === t ? "text-[#1E33FF]" : "text-white"
                }`}
              >
                {t === "customer" ? "Search" : "Enrollment"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>

              {/* CUSTOMER TAB */}
              {tab === "customer" && (
                <>
                  <View className="bg-white rounded-2xl flex-row items-center px-4 h-14 mb-4 shadow-sm">
                    <Ionicons name="search" size={22} color="#666" />
                    <TextInput
                      placeholder="MyStayInnID or Phone"
                      placeholderTextColor="#999"
                      value={searchQuery}
                      onChangeText={(txt) => {
                        setSearchQuery(txt);
                        setHasSearched(false);
                        setSearchResults([]);
                      }}
                      className="flex-1 ml-3 text-base text-gray-900"
                      editable={!searching}
                      keyboardType="default"
                      autoCapitalize="characters"
                    />
                    {searching && (
                      <ActivityIndicator size="small" color="#1E33FF" />
                    )}
                  </View>

                  {/* Helper text */}
                  {searchQuery.length > 0 && searchQuery.length < 10 && (
                    <Text className="text-xs text-gray-400 mb-3 px-2">
                      Enter 10-digit phone or MyStayInn ID (e.g., MYS26A000001)
                    </Text>
                  )}

                  {searching && (
                    <View className="items-center justify-center py-8">
                      <ActivityIndicator size="large" color="#1E33FF" />
                      <Text className="text-gray-500 mt-4">Searching...</Text>
                    </View>
                  )}

                  {/* WhatsApp Invite - Show when phone search returns no results */}
                  {!searching && hasSearched && searchResults.length === 0 && /^\+?\d{10,}$/.test(searchQuery.trim()) && (
                    <View className="bg-blue-50 p-5 rounded-2xl mb-4 border border-blue-200">
                      <View className="flex-row items-center mb-3">
                        <Ionicons name="alert-circle" size={24} color="#3B82F6" />
                        <Text className="text-gray-800 font-bold text-base ml-2">
                          Customer Not Found
                        </Text>
                      </View>
                      <Text className="text-gray-600 text-sm mb-4">
                        No customer found with this phone number. Would you like to send them an invitation to join MyStay?
                      </Text>
                      <TouchableOpacity
                        onPress={sendWhatsAppInvite}
                        className="bg-green-500 px-4 py-3 rounded-xl flex-row items-center justify-center"
                      >
                        <Ionicons name="logo-whatsapp" size={20} color="white" />
                        <Text className="text-white font-bold ml-2 text-base">Send WhatsApp Invite</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {!searching && searchResults.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => navigation.navigate("AdminCustomerDetailScreen", { customer: c })}
                      className="bg-white p-4 rounded-2xl mb-3 flex-row items-center shadow-sm"
                    >
                      <Avatar uri={c.photo} />
                      <View className="flex-1 ml-3">
                        <Text className="text-lg font-bold text-gray-900">
                          {c.name}
                        </Text>
                        <Text className="text-base text-gray-700">
                          {c.phone}
                        </Text>
                        <Text className="text-sm text-gray-500">
                          ID: {c.id}
                        </Text>
                        {c.email && (
                          <Text className="text-sm text-gray-500">
                            Email: {c.email}
                          </Text>
                        )}
                        <Text className={`text-sm font-semibold mt-1 ${
                          c.kycStatus === 'Verified' ? 'text-green-700' : 'text-orange-600'
                        }`}>
                          KYC: {c.kycStatus}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={24} color="#94A3B8" />
                    </TouchableOpacity>
                  ))}

                  {hasSearched && searchResults.length === 0 && !/^\+?\d{10,}$/.test(searchQuery.trim()) && (
                    <Text className="text-center text-base text-gray-500 mt-6">
                      No customer found
                    </Text>
                  )}
                </>
              )}

              {/* ENROLLMENT TAB */}
              {tab === "enrollment" && step === "enrollment" && (
                <>
                  <View className="bg-white rounded-2xl flex-row items-center px-4 h-14 mb-4 shadow-sm">
                    <Ionicons name="search" size={22} color="#666" />
                    <TextInput
                      placeholder="MyStayInnID / Name / Phone"
                      placeholderTextColor="#999"
                      value={enrollmentQuery}
                      onChangeText={handleEnrollmentSearch}
                      className="flex-1 ml-3 text-base text-gray-900"
                    />
                  </View>

                  {enrollmentLoading ? (
                    <View className="py-8 items-center">
                      <ActivityIndicator size="large" color="#4F46E5" />
                      <Text className="text-gray-500 mt-2">Loading enrollment requests...</Text>
                    </View>
                  ) : enrollmentResults.length === 0 ? (
                    <View className="py-8 items-center">
                      <Text className="text-gray-500">No enrollment requests yet.</Text>
                      <Text className="text-gray-400 text-sm mt-1">When customers choose &quot;Pay later&quot; and reserve, they appear here.</Text>
                    </View>
                  ) : (
                  enrollmentResults.map((e) => (
                    <TouchableOpacity
                      key={e.uniqueId || e.mystayId}
                      onPress={() => {
                        if (e.statusRaw === "pay_pending") {
                          const pa = e.pendingAllocation && typeof e.pendingAllocation === "object" ? e.pendingAllocation : null;
                          const paBeds = Array.isArray((pa as any)?.bedNumbers)
                            ? (pa as any).bedNumbers.map((x: any) => String(x)).join(",")
                            : typeof (pa as any)?.bedNumbers === "string"
                            ? String((pa as any).bedNumbers)
                            : null;
                          navigation.navigate("TenantDetailScreen", {
                            tenantId: e.customerId,
                            uniqueId: e.mystayId || undefined,
                            customer: {
                              id: e.customerId,
                              uniqueId: e.mystayId,
                              firstName: String(e.name || "").split(" ")[0] || "Customer",
                              lastName: String(e.name || "").split(" ").slice(1).join(" "),
                              phone: e.phone,
                              status: "active",
                            },
                            booking: {
                              id: `enrollment:${e.enrollmentRequestId}`,
                              roomId: (pa as any)?.roomId ?? null,
                              roomNumber: (pa as any)?.roomNumber || "Pending",
                              floor: (pa as any)?.floor ?? null,
                              propertyName: (pa as any)?.propertyName || "Property",
                              moveInDate: e.moveInDate,
                              moveOutDate: e.moveOutDate,
                              rentAmount: (pa as any)?.rentAmount || 0,
                              securityDeposit: e.securityDeposit,
                              isSecurityPaid: false,
                              status: "pay_pending",
                              bedNumbers: paBeds,
                            },
                          });
                          return;
                        }
                        navigation.navigate("AdminCustomerDetailScreen", {
                          customer: {
                            id: e.mystayId || e.uniqueId,
                            name: e.name,
                            phone: e.phone,
                            photo: e.photo,
                            roomPreference: e.roomPreference,
                            moveInDate: e.moveInDate,
                            moveOutDate: e.moveOutDate,
                            comments: e.comments,
                            securityDeposit: e.securityDeposit,
                            enrollmentRequestId: e.enrollmentRequestId,
                            customerId: e.customerId,
                            pendingAllocation: e.pendingAllocation,
                            statusRaw: e.statusRaw,
                          },
                          fromEnrollment: true,
                        });
                      }}
                      className="bg-white p-4 rounded-2xl mb-3 shadow-sm"
                    >
                      <View className="flex-row items-center">
                        <Avatar uri={e.photo} />
                        <View className="flex-1">
                          <Text className="text-lg font-bold text-gray-900">
                            {e.name}
                          </Text>
                          <Text className="text-base text-gray-700">
                            {e.phone}
                          </Text>
                          <Text className="text-sm text-gray-500">
                            MyStayInnID: {e.mystayId}
                          </Text>
                        </View>
                        <Text
                          className={`text-sm font-bold ${
                            e.status === "Approved"
                              ? "text-green-700"
                              : e.status === "Rejected"
                              ? "text-red-700"
                              : e.status === "Pay pending"
                              ? "text-amber-700"
                              : "text-orange-600"
                          }`}
                        >
                          {e.status}
                        </Text>
                      </View>

                      <View className="flex-row justify-between mt-3">
                        <Text className="text-sm text-gray-600">
                          KYC: {e.kycStatus}
                        </Text>
                        <Text className="text-sm text-gray-600">
                          Room: {e.roomPreference}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                  )}
                </>
              )}

              {/* ALLOCATION */}
              {tab === "enrollment" && step === "allocation" && (
                <AllocationScreen onBack={() => setStep("enrollment")} />
              )}
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </View>

      <BottomNav />
    </SafeAreaView>
  );
}
