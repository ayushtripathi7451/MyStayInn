// PaymentManagementScreen.tsx - Updated with proper daily rent tracking

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
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
  scheduledOnlineRent?: number;
  scheduledCashRent?: number;
  onlinePaymentRecv?: number;
  cashPaymentRecv?: number;
  isRentOnlinePaid?: boolean;
  isRentCashPaid?: boolean;
  rentOnlinePaidYearMonth?: string | null;
  rentCashPaidYearMonth?: string | null;
  rentPeriod?: string;
  dailyPayments?: {
    id: string;
    paymentDate: string;
    amount: number;
    paidOnline: boolean;
    paidCash: boolean;
    onlineAmount: number;
    cashAmount: number;
    isOverdue?: boolean;
    overdueDays?: number;
  }[];
  status?: "active" | "completed" | "cancelled";
}

type DueKind = "security_deposit" | "rent_online" | "rent_cash" | "daily_rent_online" | "daily_rent_cash";

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
  monthLabel?: string;
  isMovedOut?: boolean;
  paymentDate?: string; // For daily payments
  isOverdue?: boolean;
  overdueDays?: number;
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
  monthLabel?: string;
  isMovedOut?: boolean;
}

// Helper function for year-month formatting
function yearMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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
      const res = await bookingApi.get("/api/bookings/list/active-with-details", {
        params,
        timeout: 15000,
      });
      if (res.data?.success && Array.isArray(res.data.bookings)) {
        const toBool = (v: any) => v === true || v === "true" || v === 1;
        setBookings(
          res.data.bookings.map((b: any) => ({
            ...b,
            securityDeposit: b.securityDeposit != null ? Number(b.securityDeposit) : 0,
            isSecurityPaid: toBool(b.isSecurityPaid),
            isSecurityPaidOnline: toBool(b.isSecurityPaidOnline),
            scheduledOnlineRent: b.scheduledOnlineRent != null ? Number(b.scheduledOnlineRent) : 0,
            scheduledCashRent: b.scheduledCashRent != null ? Number(b.scheduledCashRent) : 0,
            onlinePaymentRecv: b.onlinePaymentRecv != null ? Number(b.onlinePaymentRecv) : 0,
            cashPaymentRecv: b.cashPaymentRecv != null ? Number(b.cashPaymentRecv) : 0,
            isRentOnlinePaid: toBool(b.isRentOnlinePaid),
            isRentCashPaid: toBool(b.isRentCashPaid),
            rentOnlinePaidYearMonth: b.rentOnlinePaidYearMonth || null,
            rentCashPaidYearMonth: b.rentCashPaidYearMonth || null,
            dailyPayments: Array.isArray(b.dailyPayments)
              ? b.dailyPayments.map((dp: any) => ({
                  id: dp.id.toString(),
                  paymentDate: dp.paymentDate,
                  amount: Number(dp.amount),
                  paidOnline: toBool(dp.paidOnline),
                  paidCash: toBool(dp.paidCash),
                  onlineAmount: Number(dp.onlineAmount || 0),
                  cashAmount: Number(dp.cashAmount || 0),
                  isOverdue: toBool(dp.isOverdue),
                  overdueDays: Number(dp.overdueDays || 0),
                }))
              : [],
            moveInDate:
              b.moveInDate != null
                ? typeof b.moveInDate === "string"
                  ? b.moveInDate
                  : new Date(b.moveInDate).toISOString?.() ?? String(b.moveInDate)
                : "",
            moveOutDate:
              b.moveOutDate != null
                ? typeof b.moveOutDate === "string"
                  ? b.moveOutDate
                  : new Date(b.moveOutDate).toISOString?.() ?? String(b.moveOutDate)
                : null,
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
    return Number.isNaN(date.getTime())
      ? "—"
      : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const customerName = (b: BookingWithDetails) =>
    b.customer
      ? [b.customer.firstName, b.customer.lastName].filter(Boolean).join(" ").trim() || "Tenant"
      : "Tenant";
  const roomNumber = (b: BookingWithDetails) => b.room?.roomNumber ?? "—";
  const propertyName = (b: BookingWithDetails) => b.room?.propertyName ?? "—";

  // Generate daily rent due items
  const generateDailyDueItems = (b: BookingWithDetails): DueItem[] => {
    const items: DueItem[] = [];
    const rentPeriod = String(b.rentPeriod || "month").toLowerCase();

    // Only for daily rent bookings
    if (rentPeriod !== "day") {
      return items;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    // Get daily payments for this booking
    const dailyPayments = b.dailyPayments || [];

    // If no daily payments, create one for today (this should be handled by cron)
    if (dailyPayments.length === 0) {
      const onlineAmount = b.scheduledOnlineRent || 0;
      const cashAmount = b.scheduledCashRent || 0;

      if (onlineAmount > 0) {
        items.push({
          id: `${b.id}-daily-online-${todayStr}`,
          bookingId: b.id,
          customerId: b.customerId,
          name: customerName(b),
          roomNumber: roomNumber(b),
          propertyName: propertyName(b),
          amount: onlineAmount,
          dueType: "Daily Rent (Online)",
          dueKind: "daily_rent_online",
          date: b.moveInDate,
          monthLabel: today.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
          isMovedOut: b.status === "completed",
          paymentDate: todayStr,
          isOverdue: false,
          overdueDays: 0,
        });
      }

      if (cashAmount > 0) {
        items.push({
          id: `${b.id}-daily-cash-${todayStr}`,
          bookingId: b.id,
          customerId: b.customerId,
          name: customerName(b),
          roomNumber: roomNumber(b),
          propertyName: propertyName(b),
          amount: cashAmount,
          dueType: "Daily Rent (Cash)",
          dueKind: "daily_rent_cash",
          date: b.moveInDate,
          monthLabel: today.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
          isMovedOut: b.status === "completed",
          paymentDate: todayStr,
          isOverdue: false,
          overdueDays: 0,
        });
      }
      return items;
    }

    // Process existing daily payments
    for (const payment of dailyPayments) {
      const paymentDate = new Date(payment.paymentDate);
      paymentDate.setHours(0, 0, 0, 0);
      const paymentStr = paymentDate.toISOString().split("T")[0];
      const dateLabel = paymentDate.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      // Check online portion
      if (!payment.paidOnline && payment.onlineAmount > 0) {
        items.push({
          id: `${b.id}-daily-online-${payment.id}`,
          bookingId: b.id,
          customerId: b.customerId,
          name: customerName(b),
          roomNumber: roomNumber(b),
          propertyName: propertyName(b),
          amount: payment.onlineAmount,
          dueType: "Daily Rent (Online)",
          dueKind: "daily_rent_online",
          date: b.moveInDate,
          monthLabel: dateLabel,
          isMovedOut: b.status === "completed",
          paymentDate: paymentStr,
          isOverdue: payment.isOverdue || false,
          overdueDays: payment.overdueDays || 0,
        });
      }

      // Check cash portion
      if (!payment.paidCash && payment.cashAmount > 0) {
        items.push({
          id: `${b.id}-daily-cash-${payment.id}`,
          bookingId: b.id,
          customerId: b.customerId,
          name: customerName(b),
          roomNumber: roomNumber(b),
          propertyName: propertyName(b),
          amount: payment.cashAmount,
          dueType: "Daily Rent (Cash)",
          dueKind: "daily_rent_cash",
          date: b.moveInDate,
          monthLabel: dateLabel,
          isMovedOut: b.status === "completed",
          paymentDate: paymentStr,
          isOverdue: payment.isOverdue || false,
          overdueDays: payment.overdueDays || 0,
        });
      }
    }

    return items;
  };

  // Calculate first due month based on move-in date
  const getFirstDueMonth = (moveInDate: string): string | null => {
    if (!moveInDate) return null;
    const moveIn = new Date(moveInDate);
    if (isNaN(moveIn.getTime())) return null;

    const moveInDay = moveIn.getDate();
    const moveInYm = yearMonth(moveIn);
    const nextMonthYm = yearMonth(new Date(moveIn.getFullYear(), moveIn.getMonth() + 1, 1));
    return moveInDay <= 10 ? moveInYm : nextMonthYm;
  };

  // Get the last month to show dues for (either current month or move-out month)
  const getLastDueMonth = (b: BookingWithDetails): string => {
    const current = new Date();
    const currentYm = yearMonth(current);

    // If moved out, use move-out month as the last due month
    if (b.moveOutDate && b.status === "completed") {
      const moveOutDate = new Date(b.moveOutDate);
      if (!isNaN(moveOutDate.getTime())) {
        return yearMonth(moveOutDate);
      }
    }

    return currentYm;
  };

  // Generate all unpaid months for a booking (only up to move-out date)
  const generateUnpaidMonths = (b: BookingWithDetails): DueItem[] => {
    const items: DueItem[] = [];
    const monthlyRent = b.scheduledOnlineRent || Number(b.rentAmount) || 0;
    const paidMonthsStr = b.rentOnlinePaidYearMonth || "";

    // ✅ Parse comma-separated list of paid months into a Set for fast lookup
    const paidMonths = new Set(
      paidMonthsStr.split(",").map((m: string) => m.trim()).filter(Boolean)
    );

    if (monthlyRent <= 0) return items;

    const firstDueYm = getFirstDueMonth(b.moveInDate);
    if (!firstDueYm) return items;

    const lastDueYm = getLastDueMonth(b);

    // Parse dates
    const [firstYear, firstMonth] = firstDueYm.split("-").map(Number);
    const [lastDueYear, lastDueMonth] = lastDueYm.split("-").map(Number);

    // Start from first due month
    let year = firstYear;
    let month = firstMonth;

    // Generate months until last due month (move-out or current)
    while (year < lastDueYear || (year === lastDueYear && month <= lastDueMonth)) {
      const monthKey = `${year}-${String(month).padStart(2, "0")}`;

      // ✅ Skip if already paid
      if (paidMonths.has(monthKey)) {
        month++;
        if (month > 12) {
          month = 1;
          year++;
        }
        continue;
      }

      const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      });

      items.push({
        id: `${b.id}-rent-${monthKey}`,
        bookingId: b.id,
        customerId: b.customerId,
        name: customerName(b),
        roomNumber: roomNumber(b),
        propertyName: propertyName(b),
        amount: monthlyRent,
        dueType: "Rent (online)",
        dueKind: "rent_online",
        date: b.moveInDate,
        monthLabel,
        isMovedOut: b.status === "completed",
      });

      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }

    return items;
  };

  // Generate all unpaid cash rent months for a booking (same logic as online rent)
  const generateUnpaidCashMonths = (b: BookingWithDetails): DueItem[] => {
    const items: DueItem[] = [];
    const monthlyCashRent = b.scheduledCashRent || 0;
    const paidMonthsStr = b.rentCashPaidYearMonth || "";

    // ✅ Parse comma-separated list of paid months into a Set for fast lookup
    const paidMonths = new Set(
      paidMonthsStr.split(",").map((m: string) => m.trim()).filter(Boolean)
    );

    if (monthlyCashRent <= 0) return items;

    const firstDueYm = getFirstDueMonth(b.moveInDate);
    if (!firstDueYm) return items;

    const lastDueYm = getLastDueMonth(b);

    // Parse dates
    const [firstYear, firstMonth] = firstDueYm.split("-").map(Number);
    const [lastDueYear, lastDueMonth] = lastDueYm.split("-").map(Number);

    // Start from first due month
    let year = firstYear;
    let month = firstMonth;

    // Generate months until last due month (move-out or current)
    while (year < lastDueYear || (year === lastDueYear && month <= lastDueMonth)) {
      const monthKey = `${year}-${String(month).padStart(2, "0")}`;

      // ✅ Skip if already paid
      if (paidMonths.has(monthKey)) {
        month++;
        if (month > 12) {
          month = 1;
          year++;
        }
        continue;
      }

      const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      });

      items.push({
        id: `${b.id}-rent-cash-${monthKey}`,
        bookingId: b.id,
        customerId: b.customerId,
        name: customerName(b),
        roomNumber: roomNumber(b),
        propertyName: propertyName(b),
        amount: monthlyCashRent,
        dueType: "Rent (cash)",
        dueKind: "rent_cash",
        date: b.moveInDate,
        monthLabel,
        isMovedOut: b.status === "completed",
      });

      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }

    return items;
  };

  // Generate due items (unpaid) - only up to move-out date
  const dueCustomers: DueItem[] = [];
  bookings.forEach((b) => {
    // Security deposit (only once, always show if not paid regardless of move-out)
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
        monthLabel: formatDate(b.moveInDate),
        isMovedOut: b.status === "completed",
      });
    }

    // Check if daily rent
    if (String(b.rentPeriod || "month").toLowerCase() === "day") {
      // Add daily rent dues
      const dailyDue = generateDailyDueItems(b);
      dueCustomers.push(...dailyDue);
    } else {
      // Monthly rent - online
      const unpaidRentMonths = generateUnpaidMonths(b);
      dueCustomers.push(...unpaidRentMonths);

      // Monthly rent - cash
      const unpaidCashMonths = generateUnpaidCashMonths(b);
      dueCustomers.push(...unpaidCashMonths);
    }
  });

  // Generate transaction items (paid) - only up to move-out date
  const transactions: TransactionItem[] = [];
  bookings.forEach((b) => {
    // Paid security deposit
    if (b.isSecurityPaid && (b.securityDeposit ?? 0) > 0) {
      transactions.push({
        id: `${b.id}-security`,
        bookingId: b.id,
        customerId: b.customerId,
        name: customerName(b),
        roomNumber: roomNumber(b),
        propertyName: propertyName(b),
        amount: b.securityDeposit ?? 0,
        type: "Security deposit",
        date: b.moveInDate,
        monthLabel: formatDate(b.moveInDate),
        isMovedOut: b.status === "completed",
      });
    }

    // ✅ Paid rent online (tracked by comma-separated paid year-months)
    if (b.rentOnlinePaidYearMonth && (b.scheduledOnlineRent || Number(b.rentAmount) > 0)) {
      const paidMonths = b.rentOnlinePaidYearMonth.split(",").map((m: string) => m.trim()).filter(Boolean);
      const monthlyRent = b.scheduledOnlineRent || Number(b.rentAmount) || 0;

      paidMonths.forEach((monthKey) => {
        const [year, month] = monthKey.split("-").map(Number);
        if (!year || !month) return;

        const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
          month: "short",
          year: "numeric",
        });

        transactions.push({
          id: `${b.id}-rent-${monthKey}`,
          bookingId: b.id,
          customerId: b.customerId,
          name: customerName(b),
          roomNumber: roomNumber(b),
          propertyName: propertyName(b),
          amount: monthlyRent,
          type: `Rent (online) - ${monthLabel}`,
          date: b.moveInDate,
          monthLabel,
          isMovedOut: b.status === "completed",
        });
      });
    }

    // ✅ Paid daily rent records (online/cash)
    if (Array.isArray(b.dailyPayments)) {
      b.dailyPayments.forEach((dp) => {
        const dayLabel = new Date(dp.paymentDate).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

        if (dp.paidOnline && Number(dp.onlineAmount) > 0) {
          transactions.push({
            id: `${b.id}-daily-online-${dp.id}`,
            bookingId: b.id,
            customerId: b.customerId,
            name: customerName(b),
            roomNumber: roomNumber(b),
            propertyName: propertyName(b),
            amount: Number(dp.onlineAmount),
            type: `Rent (online) - ${dayLabel}`,
            date: dp.paymentDate,
            monthLabel: dayLabel,
            isMovedOut: b.status === "completed",
          });
        }

        if (dp.paidCash && Number(dp.cashAmount) > 0) {
          transactions.push({
            id: `${b.id}-daily-cash-${dp.id}`,
            bookingId: b.id,
            customerId: b.customerId,
            name: customerName(b),
            roomNumber: roomNumber(b),
            propertyName: propertyName(b),
            amount: Number(dp.cashAmount),
            type: `Rent (cash) - ${dayLabel}`,
            date: dp.paymentDate,
            monthLabel: dayLabel,
            isMovedOut: b.status === "completed",
          });
        }
      });
    }

    // ✅ Paid rent cash (tracked by comma-separated paid year-months)
    if (b.rentCashPaidYearMonth && (b.scheduledCashRent ?? 0) > 0) {
      const paidMonths = b.rentCashPaidYearMonth.split(",").map((m: string) => m.trim()).filter(Boolean);
      const monthlyCashRent = b.scheduledCashRent ?? 0;

      paidMonths.forEach((monthKey) => {
        const [year, month] = monthKey.split("-").map(Number);
        if (!year || !month) return;

        const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
          month: "short",
          year: "numeric",
        });

        transactions.push({
          id: `${b.id}-rent-cash-${monthKey}`,
          bookingId: b.id,
          customerId: b.customerId,
          name: customerName(b),
          roomNumber: roomNumber(b),
          propertyName: propertyName(b),
          amount: monthlyCashRent,
          type: `Rent (cash) - ${monthLabel}`,
          date: b.moveInDate,
          monthLabel,
          isMovedOut: b.status === "completed",
        });
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

  const handleMarkDailyRentPaid = async (
  bookingId: string,
  paymentDate?: string,
  type?: "online" | "cash"
) => {
  try {
    setMarkingPaidBookingId(bookingId);

    // Only allow cash payments to be marked manually
    if (type !== "cash") {
      Alert.alert("Info", "Online payments are processed automatically via payment gateway.");
      return;
    }

    await bookingApi.patch(`/api/bookings/${bookingId}/mark-daily-rent-paid`, {
      date: paymentDate,
      type,
    });
    await fetchBookings();
    Alert.alert("Success", "Daily rent marked as paid");
  } catch (e: any) {
    Alert.alert("Error", e?.response?.data?.message || e?.message || "Failed to mark as paid");
  } finally {
    setMarkingPaidBookingId(null);
  }
};

  const handleMarkRentCashPaid = async (bookingId: string, monthLabel?: string) => {
  try {
    setMarkingPaidBookingId(bookingId);

    // Extract year-month from monthLabel (e.g., "Mar 2026" -> "2026-03")
    let yearMonth: string | undefined;
    if (monthLabel) {
      const match = monthLabel.match(/(\w+)\s+(\d{4})/);
      if (match) {
        const [, monthName, year] = match;
        const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth() + 1;
        yearMonth = `${year}-${String(monthIndex).padStart(2, "0")}`;
      }
    }

    await bookingApi.patch(`/api/bookings/${bookingId}/mark-rent-cash-paid`, {
      yearMonth,
    });
    await fetchBookings();
    Alert.alert("Success", "Cash rent marked as paid");
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
          <View className="flex-row items-center gap-2">
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
          <Text className="text-xs text-gray-400 mt-1">
            {item.type} • {item.monthLabel || formatDate(item.date)}
          </Text>
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
  const isDailyRentOnline = item.dueKind === "daily_rent_online";
  const isDailyRentCash = item.dueKind === "daily_rent_cash";
  const isRentCash = item.dueKind === "rent_cash";
  const isMarking = markingPaidBookingId === item.bookingId;

  return (
    <TouchableOpacity
      key={item.id}
      className="bg-white p-4 rounded-2xl mb-3 border border-gray-100 opacity-100"
      onPress={() =>
        navigation.navigate("TenantDetailScreen", {
          tenantId: item.customerId,
          initialTab: "payments",
        })
      }
      activeOpacity={0.7}
    >
      <View className="flex-row items-start">
        {/* Only show checkbox for non-cash items (security deposit, monthly online, daily online) */}
        {!isRentCash && !isDailyRentCash && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleCustomerSelect(item.id);
            }}
            className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center mt-1 ${
              selectedCustomers.includes(item.id) ? "bg-blue-500 border-blue-500" : "border-gray-300"
            }`}
          >
            {selectedCustomers.includes(item.id) && (
              <Ionicons name="checkmark" size={12} color="white" />
            )}
          </TouchableOpacity>
        )}
        {/* Cash items get empty space to maintain alignment */}
        {(isRentCash || isDailyRentCash) && <View className="w-5 mr-3" />}

        <View className="flex-1">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text className="text-base font-semibold text-gray-800">{item.name}</Text>
            {item.isMovedOut && (
              <View className="bg-slate-100 px-2 py-0.5 rounded">
                <Text className="text-slate-600 text-xs font-medium">Moved out</Text>
              </View>
            )}
            {(item.isOverdue || (item.overdueDays && item.overdueDays > 0)) && (
              <View className="bg-red-100 px-2 py-0.5 rounded">
                <Text className="text-red-600 text-xs font-medium">Overdue {item.overdueDays}d</Text>
              </View>
            )}
          </View>
          <Text className="text-sm text-gray-500 mt-1">
            Room {item.roomNumber} • {item.propertyName}
          </Text>
          <Text className="text-xs text-gray-400 mt-1">
            {item.dueType} • {item.monthLabel || `Allocated ${formatDate(item.date)}`}
            {item.paymentDate && ` • ${item.paymentDate}`}
          </Text>
        </View>

        <View className="items-end">
          <Text className="text-lg font-bold text-red-600">₹{item.amount.toLocaleString()}</Text>
          {/* Only show "Mark Paid" button for cash payments (both monthly and daily cash) */}
          {(isDailyRentCash || isRentCash) && !item.isMovedOut ? (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                if (isDailyRentCash) {
                  handleMarkDailyRentPaid(
                    item.bookingId,
                    item.paymentDate,
                    "cash"
                  );
                } else if (isRentCash) {
                  handleMarkRentCashPaid(item.bookingId, item.monthLabel);
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
            // For online payments, just show "Not paid" status without button
            <View
              className={`px-2 py-1 rounded-full mt-1 ${
                item.isMovedOut ? "bg-slate-100" : "bg-amber-100"
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  item.isMovedOut ? "text-slate-600" : "text-amber-700"
                }`}
              >
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
            <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
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
              <TouchableOpacity onPress={handleSelectAll} className="flex-row items-center">
                <View
                  className={`w-5 h-5 rounded border-2 mr-2 items-center justify-center ${
                    selectedCustomers.length === dueCustomers.length
                      ? "bg-blue-500 border-blue-500"
                      : "border-gray-300"
                  }`}
                >
                  {selectedCustomers.length === dueCustomers.length && (
                    <Ionicons name="checkmark" size={12} color="white" />
                  )}
                </View>
                <Text className="text-gray-700 font-medium">
                  {selectedCustomers.length === dueCustomers.length ? "Deselect All" : "Select All"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleNotifySelected}
                className="bg-blue-500 px-4 py-2 rounded-full flex-row items-center"
              >
                <MaterialCommunityIcons name="bell-outline" size={16} color="white" />
                <Text className="text-white font-medium ml-1">
                  Notify {selectedCustomers.length > 0 ? `(${selectedCustomers.length})` : "All"}
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
                  <Text className="text-gray-500 text-center">
                    No transactions yet. When tenants pay security deposit or rent, they will appear here.
                  </Text>
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
                  <Text className="text-gray-500 text-center">
                    No dues. When you allocate someone with unpaid security deposit or rent, they will appear
                    here. For rent (cash), use Mark as paid when the tenant pays.
                  </Text>
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