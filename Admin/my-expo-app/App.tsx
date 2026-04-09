import "./global.css";
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { NavigationContainer, useFocusEffect } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { propertyApi } from "./utils/api";
import {
  MaterialIcons,
  MaterialCommunityIcons,
  Ionicons,
} from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Provider } from 'react-redux';
import { PropertyProvider, useProperty } from "./contexts/PropertyContext";
import { store } from "./src/store";
import { useProperties, useDashboardStats, usePropertyHomeStats, useHomeFinancialStats } from "./src/hooks";

/* -------------------- COMPONENT IMPORTS -------------------- */
import Header from "./components/Header";
import BottomNav from "./components/BottomNav";
import AnnouncementCard from "./components/AnnouncementCard";

/* AUTH / FLOWS */
import SplashScreen from "./components/SplashScreen";
import WelcomeScreen from "./components/WelcomeScreen";
import LoginPinScreen from "./components/LoginPinScreen";
import SignupScreen from "./components/SignupScreen";
import BasicInfoScreen from "./components/BasicInfoScreen";
import EmailScreen from "./components/EmailScreen";
import VerifyEmailScreen from "./components/VerifyEmailScreen";
import CreatePasswordScreen from "./components/CreatePasswordScreen";
import SuccessScreen from "./components/SuccessScreen";
import ReactivateScreen from "./components/ReactivateScreen";
import ResetPasswordScreen from "./components/ResetPasswordScreen";
import ResetPasswordSentScreen from "./components/ResetPasswordSentScreen";

/* PROPERTY SETUP */
import ProfileSetupScreen from "./components/ProfileSetupScreen";
import FacilitiesScreen from "./components/FacilitiesScreen";
import FloorsScreen from "./components/FloorsScreen";
import RoomsScreen from "./components/RoomsScreen";
import PropertyPreviewScreen from "./components/PropertyPreviewScreen";
import VerifyScreen from "./components/VerifyScreen";
import RulesScreen from "./components/RulesScreen";
import FoodScreen from "./components/FoodScreen";
import PropertySuccess from "./components/PropertySucceess";

/* DASHBOARD / ADMIN */
import PaymentDueScreen from "./components/PaymentDueScreen";
import DepositCheckoutScreen from "./components/DepositCheckoutScreen";
import PaymentManagementScreen from "./components/PaymentManagementScreen";
import ExpenseScreen from "./components/ExpenseScreen";
import ExpenseAddForm from "./components/ExpenseAddForm";
import CustomersScreen from "./components/CustomersScreen";
import AllocationScreen from "./components/AllocationScreen";
import AdminCustomerDetailScreen from "./components/AdminCustomerDetailScreen";
import AdminRoomAllocationScreen from "./components/AdminRoomAllocationScreen";
import AdminAllocationSummaryScreen from "./components/AdminAllocationSummaryScreen";
import CustomerDetailScreen from "./components/CustomerDetailScreen";

/* TENANT MANAGEMENT */
import TenantManagementScreen from "./components/TenantManagementScreen";
import AddTenantScreen from "./components/AddTenantScreen";
import TenantDetailScreen from "./components/TenantDetailScreen";
import AdminGuestEnrollmentFormScreen from "./components/AdminGuestEnrollmentFormScreen";

/* OTHERS */
import NotificationScreen from "./components/NotificationScreen";
import ProfileScreen from "./components/ProfileScreen";
import SearchScreen from "./components/SearchScreen";
import TicketsScreen from "./components/TicketsScreen";
import TicketChat from "./components/TicketChat";
import OTPVerifyScreen from "./components/OTPVerifyScreen";
import ReloginMobileScreen from "./components/ReloginMobileScreen";
import CustomersEnterScreen from "./components/CustomersEnterScreen";
import ReportsHubScreen from "./components/ReportsHubScreen";
import SettingsScreen from "./components/SettingsScreen";
import PrivacyPolicyScreen from "./components/PrivacyPolicyScreen";
import TermsScreen from "./components/TermsScreen";
import SendNotificationScreen from "./components/SendNotificationScreen";
import NotificationHistoryScreen from "./components/NotificationHistoryScreen";
import {
  registerPushNotifications,
  setupForegroundNotificationHandler,
} from "./utils/pushNotifications";

/* MOVE-OUT MANAGEMENT */
import MoveOutManagementScreen from "./components/MoveOutManagementScreen";
import MoveOutRequestDetailScreen from "./components/MoveOutRequestDetailScreen";
import InitiateMoveOutScreen from "./components/InitiateMoveOutScreen";
import AdminInitiateMoveOutScreen from "./components/AdminInitiateMoveOutScreen";
import ProcessMoveOutScreen from "./components/ProcessMoveOutScreen";
import MoveOutAnalyticsScreen from "./components/MoveOutAnalyticsScreen";
import CreateMPINScreen from "./components/CreateMPINScreen";

const Stack = createNativeStackNavigator();
const { width } = Dimensions.get("window");

/* ============================================================
   HOME SCREEN – CURRENT MONTH ONLY (SWR: cache first, background refresh)
============================================================ */
function hasRulesFilled(rules: any): boolean {
  if (!rules || typeof rules !== "object") return false;
  if (Array.isArray(rules.items) && rules.items.length > 0) return true;
  if (rules.checked && typeof rules.checked === "object" && Object.keys(rules.checked).length > 0) return true;
  if (Array.isArray(rules.customRules) && rules.customRules.some((x: any) => typeof x === "string" && x.trim().length > 0)) return true;
  if (rules.noticePeriodDays != null || rules.exitFeeEnabled === true) return true;
  return false;
}

function hasFoodMenuFilled(foodMenu: any): boolean {
  if (!foodMenu?.days || typeof foodMenu.days !== "object") return false;
  const days = foodMenu.days;
  for (const dayKey of Object.keys(days)) {
    const day = days[dayKey];
    if (day && typeof day === "object") {
      for (const sectionKey of Object.keys(day)) {
        const s = day[sectionKey];
        if (s && typeof s === "object" && s.enabled === true) return true;
      }
    }
  }
  return false;
}

function HomeScreen({ navigation }: any) {
  const { currentProperty, setCurrentProperty } = useProperty();
  const { list: propertiesList, firstProperty: firstFromApi, loading: propertiesLoading } = useProperties();
  const { emptyBeds, occupancyRate, enrollmentCount, refresh: refreshDashboard } = useDashboardStats(currentProperty?.id);
  const matchedListProperty = useMemo(
    () =>
      propertiesList?.find(
        (p: any) =>
          p.uniqueId === currentProperty?.id ||
          String(p.id) === currentProperty?.id ||
          (currentProperty?.name && p.name === currentProperty?.name)
      ),
    [propertiesList, currentProperty?.id, currentProperty?.name]
  );
  const propertyUniqueId = matchedListProperty?.uniqueId ?? currentProperty?.id;
  const { moveOutCount, openTicketCount, refresh: refreshPropertyStats } = usePropertyHomeStats(currentProperty?.id, currentProperty?.name, propertyUniqueId);
  const { collected, pendingDues, expense, profit, online, cash, moveOutPL, loading: financialLoading, refresh: refreshFinancial } = useHomeFinancialStats(currentProperty?.id);
  const currentMonth = new Date().toLocaleString("default", { month: "long" });
  const [setupStatus, setSetupStatus] = useState<{ rulesFilled: boolean; foodFilled: boolean } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshDashboard(),
        refreshPropertyStats(),
        refreshFinancial(),
        currentProperty?.id
          ? propertyApi.get(`/api/properties/${currentProperty.id}`).then((res) => {
              const rules = res?.data?.property?.rules;
              setSetupStatus({
                rulesFilled: hasRulesFilled(rules),
                foodFilled: hasFoodMenuFilled(rules?.foodMenu),
              });
            }).catch(() => setSetupStatus({ rulesFilled: false, foodFilled: false }))
          : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [currentProperty?.id, refreshDashboard, refreshPropertyStats, refreshFinancial]);

  useFocusEffect(
    React.useCallback(() => {
      if (!currentProperty?.id) {
        setSetupStatus(null);
        return;
      }
      let cancelled = false;
      propertyApi.get(`/api/properties/${currentProperty.id}`).then((res) => {
        if (cancelled) return;
        const rules = res?.data?.property?.rules;
        setSetupStatus({
          rulesFilled: hasRulesFilled(rules),
          foodFilled: hasFoodMenuFilled(rules?.foodMenu),
        });
      }).catch(() => {
        if (!cancelled) setSetupStatus({ rulesFilled: false, foodFilled: false });
      });
      refreshPropertyStats();
      return () => { cancelled = true; };
    }, [currentProperty?.id, refreshPropertyStats])
  );

  // Retry push registration on every Home focus so missed first-time permission/token can recover.
  useFocusEffect(
    React.useCallback(() => {
      registerPushNotifications().catch(() => {});
    }, [])
  );

  const propertiesListSignature = useMemo(
    () =>
      propertiesList
        ?.map(
          (p: any) =>
            `${p.uniqueId ?? p.id}:${p.monthlyRevenue ?? ""}:${p.pendingDues ?? ""}:${p.totalRooms ?? ""}`
        )
        .join("|") ?? "",
    [propertiesList]
  );

  const lastMergedPropertySigRef = useRef<string>("");

  // Merge live stats from Redux property list into the *selected* property (not always list[0]).
  useEffect(() => {
    if (!propertiesList?.length) return;

    const match = currentProperty
      ? propertiesList.find(
          (p: any) =>
            p.uniqueId === currentProperty.id ||
            String(p.id) === currentProperty.id ||
            (currentProperty.name && p.name === currentProperty.name)
        )
      : null;

    if (currentProperty && !match) {
      return;
    }

    const source = match ?? (!currentProperty ? firstFromApi : null);
    if (!source) return;

    const newId = source.uniqueId || (source.id != null ? String(source.id) : currentProperty?.id ?? "");
    const updatedProperty = {
      ...(currentProperty || {}),
      id: newId,
      uniqueId: source.uniqueId ?? (currentProperty as { uniqueId?: string })?.uniqueId,
      name: source.name || currentProperty?.name || "",
      address:
        [source.address, source.city, source.state].filter(Boolean).join(", ") ||
        `${source.city || ""}, ${source.state || ""}`.trim() ||
        currentProperty?.address ||
        "",
      totalRooms: source.totalRooms ?? currentProperty?.totalRooms,
      occupiedRooms: source.occupiedRooms ?? currentProperty?.occupiedRooms,
      monthlyRevenue: source.monthlyRevenue ?? currentProperty?.monthlyRevenue,
      monthlyExpenses: source.monthlyExpenses ?? currentProperty?.monthlyExpenses,
      pendingDues: source.pendingDues ?? currentProperty?.pendingDues,
      bookingRequests: source.bookingRequests ?? currentProperty?.bookingRequests,
      moveOutRequests: source.moveOutRequests ?? currentProperty?.moveOutRequests,
      openTickets: source.openTickets ?? currentProperty?.openTickets,
    };
    const sig = `${updatedProperty.id}|${updatedProperty.monthlyRevenue ?? ""}|${updatedProperty.pendingDues ?? ""}|${propertiesListSignature}`;
    if (lastMergedPropertySigRef.current === sig) return;
    lastMergedPropertySigRef.current = sig;
    setCurrentProperty(updatedProperty);
    AsyncStorage.setItem("currentProperty", JSON.stringify(updatedProperty));
  }, [
    currentProperty?.id,
    currentProperty?.name,
    firstFromApi?.uniqueId,
    firstFromApi?.id,
    propertiesListSignature,
  ]);

  const statCollected = !financialLoading && currentProperty?.id ? collected : (currentProperty?.monthlyRevenue ?? 0);
  const statDues = !financialLoading && currentProperty?.id ? pendingDues : (currentProperty?.pendingDues ?? 0);
  const statExpense = !financialLoading && currentProperty?.id ? expense : (currentProperty?.monthlyExpenses ?? 0);
  const statProfit = !financialLoading && currentProperty?.id ? profit : 0;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="bg-white pb-1">
        <Header navigation={navigation} />
      </View>

      <ScrollView
        className="flex-1 bg-[#F6F8FF]"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Month Header */}
        <View className="px-5 py-4 flex-row justify-between items-center">
          <Text className="text-xl font-bold text-slate-800">
            {currentMonth} Statistics
          </Text>
          <View className="bg-amber-100 px-3 py-1 rounded-full">
            <Text className="text-amber-700 text-xs font-bold">
              Current Month
            </Text>
          </View>
        </View>

        {/* ===== FINANCIAL STATS (HORIZONTAL SCROLL) ===== */}
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={{
    paddingHorizontal: 16,
    paddingBottom: 8,
  }}
>
  <View className="flex-row gap-2">
    <StatBox
      label="Collected"
      value={`₹${Number(statCollected).toLocaleString()}`}
      icon={
        <MaterialIcons
          name="currency-rupee"
          size={22}
          color="#059669"
        />
      }
      onPress={() =>
        navigation.navigate("PaymentManagementScreen", { initialTab: "transactions" })
      }
      color="bg-emerald-50"
    />

    <StatBox
      label="Dues"
      value={`₹${Number(statDues).toLocaleString()}`}
      icon={
        <MaterialCommunityIcons
          name="trending-down"
          size={22}
          color="#DC2626"
        />
      }
      onPress={() => navigation.navigate("PaymentManagementScreen", { initialTab: "dues" })}
      color="bg-rose-50"
    />

    <StatBox
      label="Expense"
      value={`₹${Number(statExpense).toLocaleString()}`}
      icon={
        <MaterialCommunityIcons
          name="swap-horizontal"
          size={22}
          color="#2563EB"
        />
      }
      onPress={() => navigation.navigate("ExpenseScreen")}
      color="bg-blue-50"
    />

    <StatBox
      label="Profit / Loss"
      value={`${statProfit >= 0 ? '+' : ''}₹${Number(statProfit).toLocaleString()}`}
      icon={
        <MaterialCommunityIcons
          name={statProfit >= 0 ? "trending-up" : "trending-down"}
          size={22}
          color={statProfit >= 0 ? "#059669" : "#DC2626"}
        />
      }
      onPress={() =>
        navigation.navigate("ReportsHubScreen")
      }
      color={statProfit >= 0 ? "bg-emerald-50" : "bg-rose-50"}
    />

    {moveOutPL > 0 && (
      <StatBox
        label="MoveOut P/L"
        value={`₹${Number(moveOutPL).toLocaleString()}`}
        icon={
          <MaterialCommunityIcons
            name="exit-to-app"
            size={22}
            color="#10B981"
          />
        }
        onPress={() =>
          navigation.navigate("ReportsHubScreen")
        }
        color="bg-green-50"
      />
    )}
  </View>
</ScrollView>

       
       

        {/* ===== OCCUPANCY ===== */}
        <View className="mx-4 mt-4 p-5 bg-white rounded-3xl border border-slate-100">
          <Text className="text-slate-500 font-bold uppercase text-[10px] mb-4">
            Occupancy Overview
          </Text>

          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-3xl font-bold text-slate-800">{occupancyRate ?? 0}%</Text>
              <Text className="text-slate-500 text-xs">Occupancy Rate</Text>
            </View>

            <View className="h-10 w-[1px] bg-slate-100" />

            <View className="items-center">
              <View className="flex-row items-center gap-1">
                <MaterialCommunityIcons name="bed-outline" size={18} color="#64748b" />
                <Text className="text-xl font-bold text-slate-800">{emptyBeds ?? 0}</Text>
              </View>
              <Text className="text-slate-500 text-xs">Empty Beds</Text>
            </View>
          </View>
        </View>

        {/* ===== COMPLETE PROPERTY SETUP (show only when Rules or Food menu are pending; hide entirely when both are done) ===== */}
        {setupStatus !== null && !(setupStatus.rulesFilled && setupStatus.foodFilled) && (
          <View className="px-4 mt-4">
            <View className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <View className="p-4 border-b border-slate-50 flex-row items-center">
                <View className="bg-violet-100 p-2 rounded-xl">
                  <MaterialCommunityIcons name="file-document-edit-outline" size={22} color="#6D28D9" />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="font-bold text-slate-800">Complete property setup</Text>
                  <Text className="text-slate-500 text-sm mt-0.5">Add rules & food menu — optional, anytime</Text>
                </View>
              </View>
              <View className="flex-col">
                {!setupStatus.rulesFilled && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() =>
                      currentProperty?.id &&
                      navigation.navigate("RulesScreen", { propertyId: currentProperty.id })
                    }
                    className="flex-row p-4 items-center border-b border-slate-50"
                  >
                    <Ionicons name="document-text-outline" size={20} color="#64748b" />
                    <View className="ml-3 flex-1">
                      <Text className="font-semibold text-slate-700">Rules</Text>
                      <Text className="text-xs text-amber-600">Pending — tap to add</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
                {!setupStatus.foodFilled && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() =>
                      currentProperty?.id &&
                      navigation.navigate("FoodScreen", { propertyId: currentProperty.id })
                    }
                    className="flex-row p-4 items-center"
                  >
                    <MaterialCommunityIcons name="food-apple-outline" size={20} color="#64748b" />
                    <View className="ml-3 flex-1">
                      <Text className="font-semibold text-slate-700">Food menu</Text>
                      <Text className="text-xs text-amber-600">Pending — tap to add</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* ===== REQUESTS ===== */}
        <View className="px-4 mt-4 gap-3">
          <TouchableOpacity
            onPress={() => navigation.navigate("CustomersScreen", { initialTab: "enrollment" })}
            className="flex-row items-center justify-between bg-white p-4 rounded-2xl border border-slate-100"
          >
            <View className="flex-row items-center gap-3">
              <View className="bg-amber-100 p-2 rounded-xl">
                <MaterialCommunityIcons name="clipboard-check-outline" size={22} color="#b45309" />
              </View>
              <Text className="font-bold text-slate-700">
                Booking Requests
              </Text>
            </View>
            <Text className="text-lg font-black text-amber-700">
              {enrollmentCount ?? currentProperty?.bookingRequests ?? 0}
            </Text>
          </TouchableOpacity>

           <TouchableOpacity
            onPress={() => navigation.navigate("MoveOutManagementScreen")}
            className="flex-row items-center justify-between bg-white p-4 rounded-2xl border border-slate-100"
          >
            <View className="flex-row items-center gap-3">
              <View className="bg-slate-100 p-2 rounded-xl">
                <MaterialCommunityIcons name="logout" size={22} color="#475569" />
              </View>
              <Text className="font-bold text-slate-700">
                Move Out Requests
              </Text>
            </View>
            <Text className="text-lg font-black text-slate-600">{(moveOutCount ?? 0).toString().padStart(2, '0')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("TicketsScreen")}
            className="flex-row items-center justify-between bg-white p-4 rounded-2xl border border-slate-100"
          >
            <View className="flex-row items-center gap-3">
              <View className="bg-orange-100 p-2 rounded-xl">
                <MaterialCommunityIcons name="ticket-outline" size={22} color="#EA580C" />
              </View>
              <View>
                <Text className="font-bold text-slate-700">Open Tickets</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              <Text className="text-lg font-black text-slate-500">{(openTicketCount ?? 0).toString().padStart(2, "0")}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("SendNotificationScreen")}
            className="flex-row items-center justify-between bg-white p-4 rounded-2xl border border-slate-100"
          >
            <View className="flex-row items-center gap-3">
              <View className="bg-blue-100 p-2 rounded-xl">
                <Ionicons name="megaphone" size={22} color="#2563EB" />
              </View>
              <Text className="font-bold text-slate-700">
                Announcement
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("Notifications")}
            className="flex-row items-center justify-between bg-white p-4 rounded-2xl border border-slate-100"
          >
            <View className="flex-row items-center gap-3">
              <View className="bg-blue-100 p-2 rounded-xl">
                <MaterialCommunityIcons name="bell-outline" size={22} color="#2563EB" />
              </View>
              <Text className="font-bold text-slate-700">
                Notifications
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
          </TouchableOpacity>

          {/* <TouchableOpacity
            onPress={() => navigation.navigate("TenantManagementScreen")}
            className="flex-row items-center justify-between bg-white p-4 rounded-2xl border border-slate-100"
          >
            <View className="flex-row items-center gap-3">
              <View className="bg-blue-100 p-2 rounded-xl">
                <MaterialCommunityIcons name="account-group" size={22} color="#2563EB" />
              </View>
              <Text className="font-bold text-slate-700">
                Tenant Management
              </Text>
            </View>
            <Text className="text-lg font-black text-blue-600">New</Text>
          </TouchableOpacity> */}
         
          <TouchableOpacity
            onPress={() => navigation.navigate("ExpenseScreen")}
            className="flex-row items-center justify-between bg-white p-4 rounded-2xl border border-slate-100"
          >
            <View className="flex-row items-center gap-3">
              <View className="bg-purple-100 p-2 rounded-xl">
                <MaterialCommunityIcons name="cash-multiple" size={22} color="#7C3AED" />
              </View>
              <Text className="font-bold text-slate-700">
                Expense Management
              </Text>
            </View>
            <Text className="text-lg font-black text-purple-600">Manage</Text>
          </TouchableOpacity>
        </View>

        {/* ===== ANNOUNCEMENT ===== */}
        {/* <View className="px-4 mt-4">
          <AnnouncementCard />
        </View> */}
      </ScrollView>

      {/* Floating Notification Button */}
      {/* <TouchableOpacity
        onPress={() => navigation.navigate("SendNotificationScreen")}
        className="absolute bottom-40 right-5 w-14 h-14 bg-blue-500 rounded-full items-center justify-center shadow-lg"
        style={{ elevation: 8 }}
      >
        <Ionicons name="notifications" size={24} color="white" />
      </TouchableOpacity> */}

      <BottomNav />
    </SafeAreaView>
  );
}

/* -------------------- STAT BOX -------------------- */
function StatBox({ label, value, icon, onPress, color }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ width: width / 2 - 24 }}
      className={`${color} p-4 rounded-3xl mb-4`}
    >
      <View className="mb-2">{icon}</View>
      <Text className="text-xl font-black text-slate-800" numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text className="text-slate-500 text-[10px] font-bold uppercase">
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* ============================================================
   APP ROOT
============================================================ */
export default function App() {
  useEffect(() => {
    setupForegroundNotificationHandler();
  }, []);

  return (
    <Provider store={store}>
      <PropertyProvider>
        <SafeAreaProvider>
          <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="LoginPin" component={LoginPinScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Terms" component={TermsScreen} options={{ headerShown: false }} />

            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="BasicInfo" component={BasicInfoScreen} />
            <Stack.Screen name="Email" component={EmailScreen} />
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
            <Stack.Screen name="CreatePassword" component={CreatePasswordScreen} />
            <Stack.Screen name="Success" component={SuccessScreen} />
            <Stack.Screen name="Reactivate" component={ReactivateScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="ResetPasswordSent" component={ResetPasswordSentScreen} />

            <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
            <Stack.Screen name="Facilities" component={FacilitiesScreen} />
            <Stack.Screen name="Floors" component={FloorsScreen} />
            <Stack.Screen name="Rooms" component={RoomsScreen} />
            <Stack.Screen name="PropertyPreview" component={PropertyPreviewScreen} />
            <Stack.Screen name="Verify" component={VerifyScreen} />
            <Stack.Screen name="RulesScreen" component={RulesScreen} />
            <Stack.Screen name="FoodScreen" component={FoodScreen} />
            <Stack.Screen name="PropertySuccess" component={PropertySuccess} />

            <Stack.Screen name="PaymentDueScreen" component={PaymentDueScreen} />
            <Stack.Screen name="DepositCheckoutScreen" component={DepositCheckoutScreen} options={{ headerShown: false }} />
            <Stack.Screen name="PaymentManagementScreen" component={PaymentManagementScreen} />
            <Stack.Screen name="ExpenseScreen" component={ExpenseScreen} />
            <Stack.Screen name="ExpenseAddForm" component={ExpenseAddForm} />
            <Stack.Screen name="CustomersScreen" component={CustomersScreen} />
            <Stack.Screen name="AllocateScreen" component={AllocationScreen} />
            <Stack.Screen name="AdminCustomerDetailScreen" component={AdminCustomerDetailScreen} />
            <Stack.Screen name="AdminRoomAllocationScreen" component={AdminRoomAllocationScreen} />
            <Stack.Screen name="AdminAllocationSummaryScreen" component={AdminAllocationSummaryScreen} />
            <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />

            {/* Tenant Management Screens */}
            <Stack.Screen name="TenantManagementScreen" component={TenantManagementScreen} />
            <Stack.Screen name="AddTenantScreen" component={AddTenantScreen} />
            <Stack.Screen name="TenantDetailScreen" component={TenantDetailScreen} />
            <Stack.Screen name="AdminGuestEnrollmentFormScreen" component={AdminGuestEnrollmentFormScreen} />
            <Stack.Screen name="SendNotificationScreen" component={SendNotificationScreen} />
            <Stack.Screen name="NotificationHistoryScreen" component={NotificationHistoryScreen} />

            <Stack.Screen name="Notifications" component={NotificationScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="SearchScreen" component={SearchScreen} />
            <Stack.Screen name="TicketsScreen" component={TicketsScreen} />
            <Stack.Screen name="TicketChat" component={TicketChat} />
            <Stack.Screen name="OTPVerify" component={OTPVerifyScreen} />
            <Stack.Screen name="ReloginMobileScreen" component={ReloginMobileScreen} />
            <Stack.Screen name="CustomersEnterScreen" component={CustomersEnterScreen} />
            <Stack.Screen name="ReportsHubScreen" component={ReportsHubScreen} />

            {/* Move-Out Management Screens */}
            <Stack.Screen name="MoveOutManagementScreen" component={MoveOutManagementScreen} />
            <Stack.Screen name="MoveOutRequestDetail" component={MoveOutRequestDetailScreen} />
            <Stack.Screen name="InitiateMoveOut" component={InitiateMoveOutScreen} />
            <Stack.Screen name="AdminInitiateMoveOut" component={AdminInitiateMoveOutScreen} />
            <Stack.Screen name="ProcessMoveOut" component={ProcessMoveOutScreen} />
            <Stack.Screen name="MoveOutAnalytics" component={MoveOutAnalyticsScreen} />
            <Stack.Screen name="CreateMPINScreen" component={CreateMPINScreen} />
            
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </PropertyProvider>
    </Provider>
  );
}
