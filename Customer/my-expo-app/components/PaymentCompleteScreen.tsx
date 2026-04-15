import React, { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useDispatch } from "react-redux";
import { refreshCurrentStay } from "../src/store/actions";
import { resetStackToHome } from "../utils/navigationRef";

/**
 * Shown after Cashfree redirects to mystay://payment-success (see DepositCheckoutScreen + PAYMENT_RETURN_URL).
 */
export default function PaymentCompleteScreen() {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const accent = theme === "female" ? "#EC4899" : "#1E33FF";
  const bg = theme === "female" ? "#FFF5FF" : "#F6F8FF";

  useEffect(() => {
    dispatch(refreshCurrentStay({ force: true }));
    const t = setTimeout(() => {
      // Root ref: returning from the browser can unmount this screen before reset runs.
      resetStackToHome();
    }, 2200);
    return () => clearTimeout(t);
  }, [dispatch]);

  return (
    <SafeAreaView className="flex-1 justify-center items-center px-8" style={{ backgroundColor: bg }}>
      <View className="items-center">
        <View className="rounded-full p-5 mb-6" style={{ backgroundColor: `${accent}22` }}>
          <Ionicons name="checkmark-circle" size={96} color={accent} />
        </View>
        <Text className="text-2xl font-bold text-center text-gray-900 mb-2">Payment complete</Text>
        <Text className="text-center text-gray-600 text-base mb-6 px-2">
          Your payment was received. Taking you home…
        </Text>
        <ActivityIndicator size="large" color={accent} />
      </View>
    </SafeAreaView>
  );
}
