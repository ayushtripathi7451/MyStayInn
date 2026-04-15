import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { userApi, transactionApi } from "../utils/api";
import { refreshCurrentStay } from "../src/store/actions";
import { resetStackToPaymentComplete } from "../utils/navigationRef";

type Props = {
  navigation: any;
  route: any;
};

type PaymentType = "security_deposit" | "rent_online";

function normalizeHttpUrl(url: string): string {
  const u = String(url || "").trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}

/**
 * Must match transaction-service `PAYMENT_RETURN_URL` / Cashfree link `return_url`
 * (default in code: mystay://payment-success).
 */
const PAYMENT_RETURN_URL = "mystay://payment-success";

type PaymentOpenResult = "success" | "cancel" | "error";

/**
 * Resolve which stay row from `/current-stay` this checkout belongs to.
 * Never fall back to `list[0]` when the user tapped a specific booking/property — that
 * mis-attributes rent/deposit to another PG and clears due links for everyone after refresh.
 */
function stayMatchesBookingId(stay: any, bookingId: string): boolean {
  const bid = stay?.booking?.id;
  return bid != null && String(bid).trim() === String(bookingId).trim();
}

function stayMatchesPropertyId(stay: any, propertyId: string): boolean {
  const pid = String(propertyId ?? "").trim();
  if (!pid) return false;
  const b = stay?.booking;
  const r = b?.room && typeof b.room === "object" ? b.room : null;
  const candidates = [
    stay?.property?.id,
    stay?.property?.uniqueId,
    b?.propertyId,
    b?.propertyUniqueId,
    r?.propertyId,
    r?.propertyUniqueId,
  ]
    .filter((v) => v != null && String(v).trim() !== "")
    .map((v) => String(v));
  return candidates.some((c) => c === pid);
}

function resolveCheckoutStay(
  list: any[],
  opts: { bookingId?: string; propertyId?: string }
): any | null {
  if (!Array.isArray(list) || list.length === 0) return null;
  const bidRaw = opts.bookingId != null ? String(opts.bookingId).trim() : "";
  const propRaw = opts.propertyId != null ? String(opts.propertyId).trim() : "";

  if (bidRaw) {
    const byBooking = list.find((s) => stayMatchesBookingId(s, bidRaw));
    if (byBooking) return byBooking;
    return null;
  }

  if (propRaw) {
    const matches = list.filter((s) => stayMatchesPropertyId(s, propRaw));
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      // Same property id on multiple bookings — cannot disambiguate without bookingId
      return null;
    }
    return null;
  }

  return list[0] ?? null;
}

/**
 * Opens Cashfree in an auth session so when the gateway redirects to our app scheme,
 * the browser closes and we can show the success screen.
 */
async function openPaymentLink(url: string): Promise<PaymentOpenResult> {
  const safeUrl = normalizeHttpUrl(url).replace(/\s/g, "");
  if (!safeUrl) return "error";

  WebBrowser.maybeCompleteAuthSession();

  try {
    const result = await WebBrowser.openAuthSessionAsync(safeUrl, PAYMENT_RETURN_URL);
    if (result.type === "success") {
      return "success";
    }
    if (result.type === "cancel" || result.type === "dismiss") {
      return "cancel";
    }
    return "cancel";
  } catch {
    try {
      const wb = await WebBrowser.openBrowserAsync(safeUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        showTitle: true,
        enableBarCollapsing: true,
      });
      return wb.type === "cancel" ? "cancel" : "cancel";
    } catch {
      return "error";
    }
  }
}

export default function DepositCheckoutScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const dispatch = useDispatch();

  const paymentType: PaymentType =
    route?.params?.type === "rent_online"
      ? "rent_online"
      : "security_deposit";

  const paramAmount =
    route?.params?.amount != null ? Number(route.params.amount) : undefined;
  
  const monthKey = route?.params?.monthKey; // e.g., "2026-04"
  const yearMonth = route?.params?.yearMonth; // e.g., "2026-04" (consistent naming)
  const paymentId = route?.params?.paymentId; // daily payment record id
  const paymentDateParam = route?.params?.paymentDate as string | undefined;
  const bookingIdParam = route?.params?.bookingId as string | undefined;
  const propertyIdParam = route?.params?.propertyId as string | undefined;
  const finalYearMonth = yearMonth || monthKey; // Support both param names
  const defaultYearMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  /** Rent links must always include YYYY-MM so the webhook can mark the correct month */
  const effectiveYearMonth =
    paymentType === "rent_online" ? finalYearMonth || defaultYearMonth : finalYearMonth;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [details, setDetails] = useState<any>(null);

  const isFemale = theme === "female";
  const accent = isFemale ? "#EC4899" : "#1E33FF";

  const fetchCurrentStay = useCallback(async () => {
    try {
      const d0 = new Date();
      const clientNow = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, "0")}-${String(d0.getDate()).padStart(2, "0")}`;
      const res = await userApi.get("/api/users/me/current-stay", {
        params: { now: clientNow },
      });
      const list: any[] =
        Array.isArray(res.data?.currentStays) && res.data.currentStays.length > 0
          ? res.data.currentStays
          : res.data?.currentStay
            ? [res.data.currentStay]
            : [];

      const currentStay = resolveCheckoutStay(list, {
        bookingId: bookingIdParam,
        propertyId: propertyIdParam,
      });

      if (!currentStay?.booking || !currentStay?.property) {
        setDetails(null);
        return;
      }

      const isRent = paymentType === "rent_online";
      const rentPeriod = String(currentStay.booking.rentPeriod || "").toLowerCase();
      const isDayRent = rentPeriod === "day";
      let rentAmount = 0;
      if (isRent) {
        if (paramAmount != null && !Number.isNaN(Number(paramAmount)) && Number(paramAmount) > 0) {
          rentAmount = Number(paramAmount);
        } else if (isDayRent && paymentId) {
          const dps = Array.isArray(currentStay.booking.dailyPayments)
            ? currentStay.booking.dailyPayments
            : [];
          const row = dps.find((x: { id?: string }) => String(x?.id) === String(paymentId));
          rentAmount = row ? Number((row as { onlineAmount?: number }).onlineAmount || 0) : 0;
          if (rentAmount <= 0) {
            rentAmount = Number(currentStay.booking.onlinePaymentRecv || 0);
          }
        } else {
          const b = currentStay.booking;
          const schedOn = Number(b.scheduledOnlineRent ?? 0);
          const schedCash = Number(b.scheduledCashRent ?? 0);
          const rentAmt = Number(b.rentAmount ?? 0);
          if (schedOn > 0) rentAmount = schedOn;
          else if (schedCash > 0) rentAmount = 0;
          else rentAmount = rentAmt;
        }
      }
      const amount = isRent ? rentAmount : Number(currentStay.booking.securityDeposit || 0);

      if (amount <= 0) {
        setDetails(null);
        return;
      }

      const address = [
        currentStay.property.address,
        currentStay.property.city,
        currentStay.property.state,
        currentStay.property.pincode,
      ]
        .filter(Boolean)
        .join(", ");

      const resolvedBookingId =
        currentStay.booking.id != null ? String(currentStay.booking.id).trim() : "";

      setDetails({
        propertyName: currentStay.property.name,
        propertyAddress: address,
        moveInDate: currentStay.booking.moveInDate,
        amount,
        paymentType,
        propertyId: currentStay.property.id,
        ownerId: currentStay.property.ownerId,
        yearMonth: effectiveYearMonth,
        paymentId,
        bookingId: resolvedBookingId,
      });
    } catch {
      setDetails(null);
    } finally {
      setLoading(false);
    }
  }, [paymentType, paramAmount, paymentId, effectiveYearMonth, bookingIdParam, propertyIdParam]);

  useEffect(() => {
    fetchCurrentStay();
  }, [fetchCurrentStay, paymentType, paramAmount, paymentId, paymentDateParam]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatAmount = (n: number) =>
    n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

  const handleConfirmPay = async () => {
    if (!details?.propertyId) return;

    setSubmitting(true);

    try {
      const profileRes = await userApi.get("/api/users/me");
      const p = profileRes.data?.user || profileRes.data;

      const customerName =
        [p.firstName, p.lastName].filter(Boolean).join(" ") || "Customer";
      const customerPhone = String(p.phone || "").replace(/\D/g, "").slice(-10);

      if (!customerPhone || customerPhone.length < 10) {
        Alert.alert("Profile needed", "Please add phone number.");
        setSubmitting(false);
        return;
      }

      const rawBid =
        details.bookingId != null ? String(details.bookingId).trim() : "";
      const numericBookingId = /^\d+$/.test(rawBid) ? rawBid : "";

      const resp = await transactionApi.post("/create-payment-link", {
        amount: details.amount,
        customerName,
        customerPhone,
        propertyId: details.propertyId,
        ownerId: details.ownerId,
        // transaction-service / Cashfree link type (not "first month only" — means online rent payment)
        type:
          details.paymentType === "rent_online"
            ? "first_rent"
            : "security_deposit",
        ...(numericBookingId ? { bookingId: numericBookingId } : {}),
        ...(details.paymentType === "rent_online" && {
          yearMonth: details.yearMonth,
        }),
        ...(details.paymentType === "rent_online" && details.paymentId && {
          dailyPaymentId: details.paymentId,
          paymentDate:
            paymentDateParam && /^\d{4}-\d{2}-\d{2}$/.test(String(paymentDateParam))
              ? String(paymentDateParam).slice(0, 10)
              : new Date().toISOString().split("T")[0],
        }),
      });
      
      console.log('[DepositCheckoutScreen] Payment link created:', {
        type: details.paymentType,
        yearMonth: details.yearMonth,
        amount: details.amount,
      });

      const url = normalizeHttpUrl(resp.data?.link_url);
      const outcome = await openPaymentLink(url);

      setSubmitting(false);
      dispatch(refreshCurrentStay({ force: true }));

      if (outcome === "success") {
        // WebBrowser dismiss can leave `navigation` without context briefly — use root ref.
        resetStackToPaymentComplete();
        return;
      }
      if (outcome === "error") {
        Alert.alert("Error", "Could not open the payment page. Please try again.");
        return;
      }
      Alert.alert(
        "Payment",
        "Complete the payment in the browser. When finished, return here — your status updates automatically.",
        [{ text: "OK" }]
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Payment failed");
    } finally {
      setSubmitting(false);
    }
  };

  const bg = theme === "female" ? "#FFF5FF" : "#F4F6FF";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <View className="flex-row items-center px-6 py-4 bg-white">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} />
        </TouchableOpacity>
        <Text className="ml-4 text-xl font-semibold">
          {paymentType === "rent_online" ? "Rent" : "Security Deposit"}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : !details ? (
        <Text style={{ textAlign: "center", marginTop: 20 }}>
          No payment due
        </Text>
      ) : (
        <ScrollView style={{ padding: 20 }}>
          <View className="bg-white p-5 rounded-xl mb-4">
            <Text className="font-bold text-lg">
              {details.propertyName}
            </Text>
            <Text>{details.propertyAddress}</Text>

            <Text className="mt-3">
              Move-in: {formatDate(details.moveInDate)}
            </Text>

            <Text className="mt-2 font-bold text-xl" style={{ color: accent }}>
              ₹ {formatAmount(details.amount)}
            </Text>
          </View>

          {/* PAYMENT SUMMARY */}
          <View className="bg-white p-5 rounded-xl mb-4">
            <Text className="font-semibold mb-3">Payment Summary</Text>

            <View className="flex-row justify-between mb-2">
              <Text>
                {details.paymentType === "rent_online"
                  ? "Rent"
                  : "Security deposit"}
              </Text>
              <Text>₹ {formatAmount(details.amount)}</Text>
            </View>

            <View className="flex-row justify-between mb-2">
              <Text>Platform fee</Text>
              <Text>₹ 5</Text>
            </View>

            <View className="flex-row justify-between mb-2">
              <Text>Discount</Text>
              <Text style={{ color: "green" }}>- ₹ 5</Text>
            </View>

            <View style={{ height: 1, backgroundColor: "#ccc", marginVertical: 10 }} />

            <View className="flex-row justify-between">
              <Text className="font-bold">Total</Text>
              <Text className="font-bold" style={{ color: accent }}>
                ₹ {formatAmount(details.amount)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleConfirmPay}
            disabled={submitting}
            style={{
              backgroundColor: accent,
              padding: 15,
              borderRadius: 10,
              alignItems: "center",
            }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                Pay Now
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}