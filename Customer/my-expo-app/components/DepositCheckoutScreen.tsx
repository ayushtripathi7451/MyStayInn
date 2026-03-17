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
import { setCurrentStay } from "../src/store/redux/slices/currentStaySlice";
import { mapCurrentStayToProperty } from "../src/store/sagas/currentStaySaga";

type Props = {
  navigation: any;
  route: any;
};

type PaymentType = "security_deposit" | "rent_online";

export default function DepositCheckoutScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const paymentType: PaymentType = (route?.params?.type === "rent_online" ? "rent_online" : "security_deposit") as PaymentType;
  const paramAmount = route?.params?.amount != null ? Number(route.params.amount) : undefined;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [details, setDetails] = useState<{
    propertyName: string;
    propertyAddress: string;
    moveInDate?: string;
    amount: number;
    paymentType: PaymentType;
    propertyId?: string;
    ownerId?: string;
  } | null>(null);

  const isFemale = theme === "female";
  const accent = isFemale ? "#EC4899" : "#1E33FF";

  const fetchCurrentStay = useCallback(async () => {
    try {
      const res = await userApi.get<{
        success: boolean;
        currentStay: {
          booking?: {
            securityDeposit?: string | number;
            isSecurityPaid?: boolean;
            moveInDate?: string;
          };
          room?: {
            pricePerMonth?: number;
          } | null;
          property?: {
            id: string;
            ownerId?: string;
            name: string;
            address?: string;
            city?: string;
            state?: string;
            pincode?: string;
          } | null;
        } | null;
      }>("/api/users/me/current-stay");

      const currentStay = res.data?.currentStay ?? null;
      if (!currentStay?.booking || !currentStay?.property) {
        setDetails(null);
        return;
      }

      const isRent = paymentType === "rent_online";
      const amount = isRent
        ? (paramAmount ?? (Number((currentStay.booking as any).onlinePaymentRecv) || 0))
        : (Number(currentStay.booking.securityDeposit) || 0);

      if (amount <= 0) {
        setDetails(null);
        return;
      }

      const address =
        [
          currentStay.property.address,
          currentStay.property.city,
          currentStay.property.state,
          currentStay.property.pincode,
        ]
          .filter(Boolean)
          .join(", ") || "—";

      setDetails({
        propertyName: currentStay.property.name || "Property",
        propertyAddress: address,
        moveInDate: currentStay.booking.moveInDate,
        amount,
        paymentType,
        propertyId: currentStay.property.id,
        ownerId: currentStay.property.ownerId ?? undefined,
      });
    } catch (e) {
      setDetails(null);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const formatAmount = (n: number | undefined) =>
    (n != null && !Number.isNaN(n) ? n : 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

  const handleConfirmPay = async () => {
    if (!details?.propertyId) return;
    setSubmitting(true);
    try {
      // Fetch customer profile for name/phone/email
      let customerName = "Customer";
      let customerPhone = "";
      let customerEmail: string | undefined;
      try {
        const profileRes = await userApi.get("/api/users/me");
        const p =
          profileRes.data?.user ?? profileRes.data?.data ?? profileRes.data;
        if (p?.firstName)
          customerName =
            [p.firstName, p.lastName].filter(Boolean).join(" ").trim() ||
            customerName;
        if (p?.phone)
          customerPhone = String(p.phone).replace(/\D/g, "").slice(-10);
        if (p?.email) customerEmail = p.email;
      } catch (_) {}

      if (!customerPhone || customerPhone.length < 10) {
        Alert.alert(
          "Profile needed",
          "Please add your phone number in Profile to pay."
        );
        setSubmitting(false);
        return;
      }

      const isRent = details.paymentType === "rent_online";
      const resp = await transactionApi.post<{
        success: boolean;
        link_url?: string;
        message?: string;
      }>("/create-payment-link", {
        amount: details.amount,
        customerName,
        customerPhone,
        customerEmail,
        propertyId: details.propertyId,
        ownerId: details.ownerId || undefined,
        type: isRent ? "first_rent" : "security_deposit",
      });

      const data = resp.data || {};
      if (!data.success || !data.link_url) {
        Alert.alert(
          "Error",
          data?.message || "Could not create payment link."
        );
        setSubmitting(false);
        return;
      }

      const returnUrl = "mystay://payment-success";
      const result = await WebBrowser.openAuthSessionAsync(
        data.link_url,
        returnUrl
      );

      setSubmitting(false);

      if (result.type === "success" && result.url) {
        dispatch(refreshCurrentStay(true));
        
        const checkPaid = async () => {
          await new Promise((r) => setTimeout(r, 1500));
          try {
            const res = await userApi.get<{
              success?: boolean;
              currentStay?: {
                booking?: { isSecurityPaid?: boolean; currentDue?: number; securityDeposit?: number; [k: string]: any };
                room?: any;
                property?: any;
              } | null;
            }>("/api/users/me/current-stay");
            const currentStay = res.data?.currentStay ?? null;
            const booking = currentStay?.booking as any;
            const paid = details.paymentType === "rent_online"
              ? booking?.isRentOnlinePaid
              : booking?.isSecurityPaid;
            if (currentStay) {
              const mapped = mapCurrentStayToProperty(currentStay);
              if (mapped) dispatch(setCurrentStay({ data: mapped, raw: currentStay }));
            }
            if (paid) {
              Alert.alert(
                "Payment successful",
                details.paymentType === "rent_online"
                  ? "Your rent payment has been recorded. Thank you!"
                  : "Your security deposit has been recorded. Thank you!",
                [{ text: "OK", onPress: () => navigation.goBack() }]
              );
            } else {
              Alert.alert(
                "Payment submitted",
                "If you completed payment, it will reflect shortly. You can check your current stay on the home screen.",
                [{ text: "OK", onPress: () => navigation.goBack() }]
              );
            }
          } catch {
            Alert.alert(
              "Payment submitted",
              "If you completed payment, it will reflect shortly. Check your current stay on the home screen.",
              [{ text: "OK", onPress: () => navigation.goBack() }]
            );
          }
        };
        await checkPaid();
      } else if (result.type === "cancel" || result.type === "dismiss") {
        dispatch(refreshCurrentStay(true));
      }
    } catch (e: any) {
      const status = e?.response?.status;
      const msg =
        status === 401
          ? "Session expired. Please log in again."
          : e?.response?.data?.message ||
            e?.message ||
            "Failed to create payment link.";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const bg = theme === "female" ? "#FFF5FF" : "#F4F6FF";

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: bg }}>
      {/* HEADER */}
      <View className="flex-row items-center px-6 py-4 bg-white shadow-sm">
        <TouchableOpacity
          onPress={() => {
            dispatch(refreshCurrentStay(true));
            navigation.goBack();
          }}
          className="w-10 h-10 bg-white rounded-full border border-gray-300 justify-center items-center"
        >
          <Ionicons name="chevron-back" size={22} color="#000" />
        </TouchableOpacity>
        <Text className="ml-4 text-2xl font-semibold">
          {paymentType === "rent_online" ? "Rent (online)" : "Security Deposit"}
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color={accent} />
          <Text className="mt-2 text-gray-500">Loading details...</Text>
        </View>
      ) : !details ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-gray-600 text-center">
            {paymentType === "rent_online"
              ? "No pending rent (online) found for your current stay."
              : "No pending security deposit found for your current stay."}
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5 pt-5"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Property summary card */}
          <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
            <Text className="text-[18px] font-semibold text-gray-900">
              {details.propertyName}
            </Text>
            <View className="flex-row items-center mt-2">
              <Ionicons name="location-outline" size={16} color="#6B7280" />
              <Text className="ml-1 text-gray-600 text-[14px] flex-1">
                {details.propertyAddress}
              </Text>
            </View>

            <View className="flex-row items-center justify-between mt-4">
              <View>
                <Text className="text-gray-500 text-[13px]">Move-in date</Text>
                <Text className="text-[15px] font-semibold text-gray-900 mt-1">
                  {formatDate(details.moveInDate)}
                </Text>
              </View>

              <View className="items-end">
                <Text className="text-gray-500 text-[13px]">
                  Security deposit
                </Text>
                <Text
                  className="text-[22px] font-bold mt-1"
                  style={{ color: accent }}
                >
                  ₹ {formatAmount(details.amount)}
                </Text>
              </View>
            </View>
          </View>

          {/* Breakdown / info */}
          <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
            <Text className="text-[18px] font-semibold text-gray-900 mb-3">
              Payment summary
            </Text>

            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-600">
                {details.paymentType === "rent_online" ? "Rent (online)" : "Security deposit"}
              </Text>
              <Text className="font-semibold text-gray-900">
                ₹ {formatAmount(details.amount)}
              </Text>
            </View>

            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-600">Convenience fee</Text>
              <Text className="font-semibold text-gray-900">Included</Text>
            </View>

            <View className="h-[1px] bg-gray-200 my-3" />

            <View className="flex-row justify-between items-center">
              <Text className="text-gray-700 font-semibold text-[15px]">
                Total payable
              </Text>
              <Text
                className="text-[20px] font-bold"
                style={{ color: accent }}
              >
                ₹ {formatAmount(details.amount)}
              </Text>
            </View>
          </View>

          {/* Info note */}
          <View className="bg-blue-50 rounded-2xl p-4 mb-4 border border-blue-100">
            <Text className="text-blue-900 text-[13px]">
              {details.paymentType === "rent_online"
                ? "This rent amount is collected by My-Stay on behalf of the property."
                : "This security deposit is collected by My-Stay on behalf of the property. After move-out, the admin will process your refund as per property rules."}
            </Text>
          </View>

          {/* Pay button */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleConfirmPay}
            disabled={submitting}
            className="mt-2 h-[52px] rounded-xl items-center justify-center"
            style={{ backgroundColor: accent, opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white text-[16px] font-semibold">
                Pay Now
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

