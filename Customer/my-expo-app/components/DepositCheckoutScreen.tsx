import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { userApi, transactionApi } from "../utils/api";
import { refreshCurrentStay } from "../src/store/actions";

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

async function openPaymentLink(url: string): Promise<boolean> {
  const u = String(url || "").trim();
  if (!u) return false;
  const safeUrl = u.replace(/\s/g, "");

  try {
    await Linking.openURL(safeUrl);
    return true;
  } catch {
    try {
      const wb = await WebBrowser.openBrowserAsync(safeUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        showTitle: true,
        enableBarCollapsing: true,
      });
      return wb.type !== "cancel";
    } catch {
      return false;
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
  const finalYearMonth = yearMonth || monthKey; // Support both param names

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
      const currentStay = res.data?.currentStay ?? null;

      if (!currentStay?.booking || !currentStay?.property) {
        setDetails(null);
        return;
      }

      const isRent = paymentType === "rent_online";
      const amount = isRent
        ? paramAmount ??
          Number(currentStay.booking.onlinePaymentRecv || 0)
        : Number(currentStay.booking.securityDeposit || 0);

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

      setDetails({
        propertyName: currentStay.property.name,
        propertyAddress: address,
        moveInDate: currentStay.booking.moveInDate,
        amount,
        paymentType,
        propertyId: currentStay.property.id,
        ownerId: currentStay.property.ownerId,
        yearMonth: finalYearMonth, // Use consistent yearMonth
        paymentId,
      });
    } catch {
      setDetails(null);
    } finally {
      setLoading(false);
    }
  }, [paymentType, paramAmount, paymentId, finalYearMonth]);

  useEffect(() => {
    fetchCurrentStay();
  }, [fetchCurrentStay, paymentType, paramAmount]);

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

      const resp = await transactionApi.post("/create-payment-link", {
        amount: details.amount,
        customerName,
        customerPhone,
        propertyId: details.propertyId,
        ownerId: details.ownerId,
        type:
          details.paymentType === "rent_online"
            ? "first_rent"
            : "security_deposit",
        // Pass the target month for rent payments
        ...(details.paymentType === "rent_online" && details.yearMonth && {
          yearMonth: details.yearMonth,
        }),
        ...(details.paymentType === "rent_online" && details.paymentId && {
          dailyPaymentId: details.paymentId,
          paymentDate: new Date().toISOString().split("T")[0],
        }),
      });
      
      console.log('[DepositCheckoutScreen] Payment link created:', {
        type: details.paymentType,
        yearMonth: details.yearMonth,
        amount: details.amount,
      });

      const url = normalizeHttpUrl(resp.data?.link_url);
      const opened = await openPaymentLink(url);

      setSubmitting(false);

      if (opened) {
        // ✅ Rely on webhook for all payments (recommended architecture)
        // Frontend just opens the link, webhook handles the rest
        dispatch(refreshCurrentStay({ force: true }));
        
        Alert.alert(
          "Payment Link Opened",
          "Complete the payment in your browser. Your payment status will update automatically.",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      }
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