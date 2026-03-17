import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect, NavigationProp } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import BottomNav from "./BottomNav";
import { bookingApi } from "../utils/api";
import { useProperty } from "../contexts/PropertyContext";

interface BookingWithDetails {
  id: string;
  uniqueId: string;
  customerId: string;
  customer: { firstName?: string; lastName?: string; uniqueId?: string } | null;
  room: { roomNumber?: string; propertyName?: string } | null;
  moveInDate: string;
  moveOutDate?: string | null;
  securityDeposit: number;
  isSecurityPaid: boolean;
  isSecurityPaidOnline?: boolean;
  rentAmount: string;
  onlinePaymentRecv?: number;
  cashPaymentRecv?: number;
  isRentOnlinePaid?: boolean;
  isRentCashPaid?: boolean;
  status?: 'active' | 'completed' | 'cancelled';
}

type DueKind = 'security_deposit' | 'rent_online' | 'rent_cash';

interface DueItem {
  id: string;
  bookingId: string;
  customerId: string;
  name: string;
  roomNumber: string;
  propertyName: string;
  amount: number;
  dueType: string;
  dueKind: DueKind;
  date: string;
  isMovedOut?: boolean;
}

interface TransactionItem {
  id: string;
  bookingId: string;
  customerId: string;
  name: string;
  roomNumber: string;
  propertyName: string;
  amount: number;
  type: string;
  date: string;
  isMovedOut?: boolean;
}

export default function PaymentManagementScreen({ route }: any) {
  const navigation = useNavigation<NavigationProp<any>>();
  const { currentProperty } = useProperty();
  const propertyId = currentProperty?.id;

  const initialTab = route?.params?.initialTab || "transactions";
  const [activeTab, setActiveTab] = useState<"transactions" | "dues">(initialTab);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingPaidBookingId, setMarkingPaidBookingId] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    try {
      setError(null);
      const params: Record<string, string> = { includeCompleted: "true" };
      if (propertyId) params.propertyId = propertyId;
      const res = await bookingApi.get("/api/bookings/list/active-with-details", { params, timeout: 15000 });
      if (res.data?.success && Array.isArray(res.data.bookings)) {
        const toBool = (v: any) => v === true || v === "true" || v === 1;
        setBookings(
          res.data.bookings.map((b: any) => ({
            ...b,
            securityDeposit: b.securityDeposit != null ? Number(b.securityDeposit) : 0,
            isSecurityPaid: toBool(b.isSecurityPaid),
            isSecurityPaidOnline: toBool(b.isSecurityPaidOnline),
            onlinePaymentRecv: b.onlinePaymentRecv != null ? Number(b.onlinePaymentRecv) : 0,
            cashPaymentRecv: b.cashPaymentRecv != null ? Number(b.cashPaymentRecv) : 0,
            isRentOnlinePaid: toBool(b.isRentOnlinePaid),
            isRentCashPaid: toBool(b.isRentCashPaid),
            moveInDate: b.moveInDate != null ? (typeof b.moveInDate === "string" ? b.moveInDate : new Date(b.moveInDate).toISOString?.() ?? String(b.moveInDate)) : "",
            status: b.status ?? "active",
          }))
        );
      } else {
        setBookings([]);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load payments");
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [fetchBookings])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const formatDate = (d: string) => {
    if (!d) return "—";
    const date = new Date(d);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const customerName = (b: BookingWithDetails) =>
    b.customer
      ? [b.customer.firstName, b.customer.lastName].filter(Boolean).join(" ").trim() || "Tenant"
      : "Tenant";
  const roomNumber = (b: BookingWithDetails) => b.room?.roomNumber ?? "—";
  const propertyName = (b: BookingWithDetails) => b.room?.propertyName ?? "—";

  const dueCustomers: DueItem[] = [];
  const isMovedOutBooking = (b: BookingWithDetails) => b.status === "completed";
  bookings.forEach((b) => {
    if (!b.isSecurityPaid && (b.securityDeposit ?? 0) > 0) {
      dueCustomers.push({
        id: `${b.id}-security`,
        bookingId: b.id,
        customerId: b.customerId,
        name: customerName(b),
        roomNumber: roomNumber(b),
        propertyName: propertyName(b),
        amount: b.securityDeposit ?? 0,
        dueType: "Security deposit",
        dueKind: "security_deposit",
        date: b.moveInDate,
        isMovedOut: isMovedOutBooking(b),
      });
    }
    const onlineRecv = b.onlinePaymentRecv ?? 0;
    const cashRecv = b.cashPaymentRecv ?? 0;
    if (onlineRecv > 0 && !b.isRentOnlinePaid) {
      dueCustomers.push({
        id: `${b.id}-rent-online`,
        bookingId: b.id,
        customerId: b.customerId,
        name: customerName(b),
        roomNumber: roomNumber(b),
        propertyName: propertyName(b),
        amount: onlineRecv,
        dueType: "Rent (online)",
        dueKind: "rent_online",
        date: b.moveInDate,
        isMovedOut: isMovedOutBooking(b),
      });
    }
    if (cashRecv > 0 && !b.isRentCashPaid) {
      dueCustomers.push({
        id: `${b.id}-rent-cash`,
        bookingId: b.id,
        customerId: b.customerId,
        name: customerName(b),
        roomNumber: roomNumber(b),
        propertyName: propertyName(b),
        amount: cashRecv,
        dueType: "Rent (cash)",
        dueKind: "rent_cash",
        date: b.moveInDate,
        isMovedOut: isMovedOutBooking(b),
      });
    }
  });

  const transactions: TransactionItem[] = [];
  const isMovedOut = (b: BookingWithDetails) => b.status === "completed";
  bookings.forEach((b) => {
    if (b.isSecurityPaid && (b.securityDeposit ?? 0) > 0) {
      transactions.push({
        id: `${b.id}-security`,
        bookingId: b.id,
        customerId: b.customerId,
        name: customerName(b),
        roomNumber: roomNumber(b),
        propertyName: propertyName(b),
        amount: b.securityDeposit ?? 0,
        type: "Security deposit (online)", // Security deposit is always paid online (Cashfree) by user
        date: b.moveInDate,
        isMovedOut: isMovedOut(b),
      });
    }
    const onlineRecv = b.onlinePaymentRecv ?? 0;
    const cashRecv = b.cashPaymentRecv ?? 0;
    if (onlineRecv > 0 && b.isRentOnlinePaid) {
      transactions.push({
        id: `${b.id}-rent-online`,
        bookingId: b.id,
        customerId: b.customerId,
        name: customerName(b),
        roomNumber: roomNumber(b),
        propertyName: propertyName(b),
        amount: onlineRecv,
        type: "Rent (online)",
        date: b.moveInDate,
        isMovedOut: isMovedOut(b),
      });
    }
    if (cashRecv > 0 && b.isRentCashPaid) {
      transactions.push({
        id: `${b.id}-rent-cash`,
        bookingId: b.id,
        customerId: b.customerId,
        name: customerName(b),
        roomNumber: roomNumber(b),
        propertyName: propertyName(b),
        amount: cashRecv,
        type: "Rent (cash)",
        date: b.moveInDate,
        isMovedOut: isMovedOut(b),
      });
    }
  });

  const handleCustomerSelect = (id: string) => {
    setSelectedCustomers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedCustomers.length === dueCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(dueCustomers.map((c) => c.id));
    }
  };

  const handleNotifySelected = () => {
    if (selectedCustomers.length === 0) {
      Alert.alert("No Selection", "Please select customers to notify");
      return;
    }
    
    Alert.alert(
      "Notification Sent", 
      `Payment reminder sent to ${selectedCustomers.length} customer(s)`,
      [{ text: "OK", onPress: () => setSelectedCustomers([]) }]
    );
  };

  const handleMarkRentCashPaid = async (bookingId: string) => {
    try {
      setMarkingPaidBookingId(bookingId);
      await bookingApi.patch(`/api/bookings/${bookingId}/mark-rent-cash-paid`);
      await fetchBookings();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || e?.message || "Failed to mark as paid");
    } finally {
      setMarkingPaidBookingId(null);
    }
  };

  const handleMarkSecurityPaid = async (bookingId: string) => {
    try {
      setMarkingPaidBookingId(bookingId);
      await bookingApi.patch(`/api/bookings/${bookingId}/mark-security-paid`);
      await fetchBookings();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || e?.message || "Failed to mark as paid");
    } finally {
      setMarkingPaidBookingId(null);
    }
  };

  const renderTransactionItem = (item: TransactionItem) => (
    <TouchableOpacity
      key={item.id}
      className="bg-white p-4 rounded-2xl mb-3 border border-gray-100"
      onPress={() =>
        navigation.navigate("TenantDetailScreen", {
          tenantId: item.customerId,
          initialTab: "payments",
        })
      }
      activeOpacity={0.7}
    >
      <View className="flex-row justify-between items-center">
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-800">{item.name}</Text>
          <Text className="text-sm text-gray-500 mt-1">
            Room {item.roomNumber} • {item.propertyName}
          </Text>
          <Text className="text-xs text-gray-400 mt-1">{item.type} • {formatDate(item.date)}</Text>
        </View>
        <View className="items-end">
          <Text className="text-lg font-bold text-green-600">₹{item.amount.toLocaleString()}</Text>
          <View className="bg-green-100 px-2 py-1 rounded-full mt-1">
            <Text className="text-green-700 text-xs font-medium">Paid</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderDueItem = (item: DueItem) => {
    const isRentCash = item.dueKind === "rent_cash";
    const isSecurityDeposit = item.dueKind === "security_deposit";
    const isMarking = markingPaidBookingId === item.bookingId;
    return (
      <TouchableOpacity
        key={item.id}
        className="bg-white p-4 rounded-2xl mb-3 border border-gray-100"
        onPress={() =>
          navigation.navigate("TenantDetailScreen", {
            tenantId: item.customerId,
            initialTab: "payments",
          })
        }
        activeOpacity={0.7}
      >
        <View className="flex-row items-center">
          {!isRentCash && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleCustomerSelect(item.id);
              }}
              className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center ${
                selectedCustomers.includes(item.id) ? "bg-blue-500 border-blue-500" : "border-gray-300"
              }`}
            >
              {selectedCustomers.includes(item.id) && (
                <Ionicons name="checkmark" size={12} color="white" />
              )}
            </TouchableOpacity>
          )}
          {isRentCash && <View className="w-5 mr-3" />}

          <View className="flex-1">
            <View className="flex-row items-center gap-2 flex-wrap">
              <Text className="text-base font-semibold text-gray-800">{item.name}</Text>
              {item.isMovedOut && (
                <View className="bg-slate-100 px-2 py-0.5 rounded">
                  <Text className="text-slate-600 text-xs font-medium">Moved out</Text>
                </View>
              )}
            </View>
            <Text className="text-sm text-gray-500 mt-1">
              Room {item.roomNumber} • {item.propertyName}
            </Text>
            <Text className="text-xs text-gray-400 mt-1">{item.dueType} • Allocated {formatDate(item.date)}</Text>
          </View>

          <View className="items-end">
            <Text className="text-lg font-bold text-red-600">₹{item.amount.toLocaleString()}</Text>
            {(isRentCash || isSecurityDeposit) && !item.isMovedOut ? (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  if (isSecurityDeposit) {
                    handleMarkSecurityPaid(item.bookingId);
                  } else {
                    handleMarkRentCashPaid(item.bookingId);
                  }
                }}
                disabled={isMarking}
                className="mt-2 bg-green-500 px-3 py-1.5 rounded-lg"
              >
                {isMarking ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white text-xs font-bold">Mark as paid</Text>
                )}
              </TouchableOpacity>
            ) : (
              <View className={`px-2 py-1 rounded-full mt-1 ${item.isMovedOut ? "bg-slate-100" : "bg-amber-100"}`}>
                <Text className={`text-xs font-medium ${item.isMovedOut ? "text-slate-600" : "text-amber-700"}`}>
                  {item.isMovedOut ? "Moved out" : "Not paid"}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <SafeAreaView className="bg-[#f9f9f9]">
        <View className="bg-[#f7f8fb] pt-4 pb-8 px-6 flex-row justify-between items-center">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="mr-4"
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text className="text-black text-3xl font-bold">Payments</Text>
          </View>

          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => navigation.navigate("ExpenseScreen")}
              className="bg-blue-500 px-3 py-2 rounded-xl flex-row items-center mr-3"
            >
              <Ionicons name="receipt-outline" size={16} color="white" />
              <Text className="text-white font-bold ml-1 text-sm">Expense</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => navigation.navigate("Settings")}
              className="w-9 h-9 rounded-full justify-center items-center"
            >
              <Ionicons name="menu" size={24} color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        <Text className="text-[15px] px-6 text-gray-600 mb-4">
          Manage customer payments and dues
        </Text>
      </SafeAreaView>

      {/* Body */}
      <View className="flex-1 bg-[#F6F8FF] rounded-t-[40px] -mt-10 px-4 pt-6 overflow-hidden">
        
        {/* Tab Switch */}
        <View className="bg-[#1E33FF] rounded-full mb-6 overflow-hidden">
          <View className="flex-row justify-between p-1">
            <TouchableOpacity
              onPress={() => {
                setActiveTab("transactions");
                setSelectedCustomers([]);
              }}
              className={`flex-1 py-2 rounded-full ${
                activeTab === "transactions" ? "bg-white" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-center text-lg font-semibold ${
                  activeTab === "transactions" ? "text-[#1E33FF]" : "text-white"
                }`}
              >
                Transactions 
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setActiveTab("dues");
                setSelectedCustomers([]);
              }}
              className={`flex-1 py-2 rounded-full ${
                activeTab === "dues" ? "bg-white" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-center text-lg font-semibold ${
                  activeTab === "dues" ? "text-[#1E33FF]" : "text-white"
                }`}
              >
                Dues ({dueCustomers.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Due Actions Bar */}
        {activeTab === "dues" && (
          <View className="bg-white p-4 rounded-2xl mb-4 border border-gray-100">
            <View className="flex-row justify-between items-center">
              <TouchableOpacity
                onPress={handleSelectAll}
                className="flex-row items-center"
              >
                <View className={`w-5 h-5 rounded border-2 mr-2 items-center justify-center ${
                  selectedCustomers.length === dueCustomers.length 
                    ? 'bg-blue-500 border-blue-500' 
                    : 'border-gray-300'
                }`}>
                  {selectedCustomers.length === dueCustomers.length && (
                    <Ionicons name="checkmark" size={12} color="white" />
                  )}
                </View>
                <Text className="text-gray-700 font-medium">
                  {selectedCustomers.length === dueCustomers.length ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleNotifySelected}
                className="bg-blue-500 px-4 py-2 rounded-full flex-row items-center"
              >
                <MaterialCommunityIcons name="bell-outline" size={16} color="white" />
                <Text className="text-white font-medium ml-1">
                  Notify {selectedCustomers.length > 0 ? `(${selectedCustomers.length})` : 'All'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#1E33FF"]} />
          }
        >
          {loading ? (
            <View className="py-12 items-center">
              <ActivityIndicator size="large" color="#1E33FF" />
              <Text className="text-gray-500 mt-3">Loading payments...</Text>
            </View>
          ) : error ? (
            <View className="py-8 px-4 bg-amber-50 rounded-2xl border border-amber-200 mx-2">
              <Text className="text-amber-800 text-center">{error}</Text>
              <TouchableOpacity
                onPress={() => fetchBookings()}
                className="mt-4 bg-[#1E33FF] py-2 rounded-xl"
              >
                <Text className="text-white text-center font-semibold">Retry</Text>
              </TouchableOpacity>
            </View>
          ) : activeTab === "transactions" ? (
            <View>
              <Text className="text-gray-600 text-sm mb-4 px-2">
                Paid — security deposit & rent ({transactions.length})
              </Text>
              {transactions.length === 0 ? (
                <View className="bg-white p-6 rounded-2xl border border-gray-100">
                  <Text className="text-gray-500 text-center">No transactions yet. When tenants pay security deposit or rent, they will appear here.</Text>
                </View>
              ) : (
                transactions.map(renderTransactionItem)
              )}
            </View>
          ) : (
            <View>
              <Text className="text-gray-600 text-sm mb-4 px-2">
                Dues — security deposit & rent ({dueCustomers.length})
              </Text>
              {dueCustomers.length === 0 ? (
                <View className="bg-white p-6 rounded-2xl border border-gray-100">
                  <Text className="text-gray-500 text-center">No dues. When you allocate someone with unpaid security deposit or rent, they will appear here. For rent (cash), use Mark as paid when the tenant pays.</Text>
                </View>
              ) : (
                dueCustomers.map(renderDueItem)
              )}
            </View>
          )}
        </ScrollView>
      </View>

      <BottomNav />
    </View>
  );
}