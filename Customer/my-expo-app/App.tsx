import './global.css';
import React, { useEffect, useCallback, useState } from 'react';
import { ScrollView, View, ActivityIndicator, TouchableOpacity, Text, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Provider, useDispatch, useSelector } from 'react-redux';
import type { RootState } from './src/store/redux';
import { refreshCurrentStay } from './src/store/actions';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme, ThemeProvider } from './context/ThemeContext';
import { store } from './src/store';

import Header from './components/Header';
import InfoCards from './components/InfoCards';
import DueAmount from './components/DueAmount';
import Tickets from './components/Tickets';
import BottomNav from './components/BottomNav';
import AnnouncementsSection from './components/AnnouncementsSection';
import SettingsScreen from './components/SettingsScreen';
import WelcomeScreen from './components/WelcomeScreen';
import SplashScreen from './components/SplashScreen';
import SignupScreen from './components/SignupScreen';
import BasicInfoScreen from './components/BasicInfoScreen';
import EmailScreen from './components/EmailScreen';
import VerifyEmailScreen from './components/VerifyEmailScreen';
import CreatePasswordScreen from './components/CreatePasswordScreen';
import SuccessScreen from './components/SuccessScreen';
import LoginPinScreen from './components/LoginPinScreen';
import ReactivateScreen from './components/ReactivateScreen';
import ResetPasswordScreen from './components/ResetPasswordScreen';
import ResetPasswordSentScreen from './components/ResetPasswordSentScreen';
import ProfileSetupScreen from './components/ProfileSetupScreen';
import FacilitiesScreen from './components/FacilitiesScreen';
import FloorsScreen from './components/FloorsScreen';
import RoomsScreen from './components/RoomsScreen';
import VerifyScreen from './components/VerifyScreen';
import RulesScreen from './components/RulesScreen';
import FoodScreen from './components/FoodScreen';
import CreateMPINScreen from './components/CreateMPINScreen';
import TicketPanel from './components/TicketPanel';
import NotificationScreen from './components/NotificationScreen';
import ProfileScreen from './components/ProfileScreen';
import ProfileScreen2 from './components/ProfileScreen2';
import MoreDetails from './components/MoreDetails';
import AdmissionDetails from './components/AdmissionDetails';
import PaymentHistory from './components/PaymentHistory';
import CompleteProfileScreen from './components/CompleteProfileScreen';
import CompleteProfileDocsScreen from './components/CompleteProfileDocsScreen';
import TicketDetailsScreen from './components/TicketDetailsScreen';
import SearchAdminScreen from './components/SearchAdminScreen';
import AdminDetailsScreen from './components/AdminDetails';
import LocationResultsScreen from 'components/LocationResultsScreen';
import SearchResultDetailsScreen from 'components/SearchResultDetailsScreen';
import TicketsScreen from 'components/TicketsScreen';
import TicketChat from 'components/TicketChat';
import CreateRequestScreen from 'components/CreateRequestScreen';
import ReloginMobileScreen from './components/ReloginMobileScreen';
import CreateNewMPIN from 'components/CreateNewMPIN';
import PaymentDueScreen from 'components/PaymentDueScreen';
import DepositCheckoutScreen from 'components/DepositCheckoutScreen';
import PropertyDetailsScreen from 'components/PropertyDetailsScreen';
import PropertyListScreen from 'components/PropertyListScreen';

/* MOVE-OUT MANAGEMENT */
import MoveOutRequestScreen from './components/MoveOutRequestScreen';
import MoveOutStatusScreen from './components/MoveOutStatusScreen';
import GuestEnrollmentFormScreen from './components/GuestEnrollmentFormScreen';
import { setupForegroundNotificationHandler, registerPushNotifications } from './utils/pushNotifications';

const Stack = createNativeStackNavigator(); // untyped stack (remove generic to avoid missing route key errors)

function HomeScreen({ navigation }: any) {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const currentStay = useSelector((state: RootState) => state.currentStay.data);
  const currentStayLoading = useSelector((state: RootState) => state.currentStay.loading);
  const [refreshing, setRefreshing] = useState(false);

  // Single trigger when Home is focused (including first open); saga skips if cache is fresh
  useFocusEffect(
    useCallback(() => {
      dispatch(refreshCurrentStay());
    }, [dispatch])
  );

  useEffect(() => {
    if (!currentStayLoading && refreshing) setRefreshing(false);
  }, [currentStayLoading, refreshing]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(refreshCurrentStay(true));
  }, [dispatch]);

  // Register for push every time Home is focused (backend uses JWT to resolve user; retries if first attempt failed)
  useFocusEffect(
    useCallback(() => {
      registerPushNotifications().catch(() => {});
    }, [])
  );

  // ✅ Dynamic background
  const bgColor = theme === 'female' ? 'bg-[#FFF5FF]' : 'bg-[#F6F8FF]';

  // Prevent blank UI: show loading only on initial load when we have no cached data
  if (currentStayLoading && !currentStay) {
    return (
      <SafeAreaView className={`flex-1 ${bgColor} justify-center items-center`}>
        <ActivityIndicator size="large" color={theme === 'female' ? '#EC4899' : '#1E33FF'} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`}>
      <ScrollView
        className="px-1 pt-2"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        <Header />
        <InfoCards />
        <DueAmount />
        {currentStay && (
          <TouchableOpacity
            onPress={() => navigation.navigate('GuestEnrollmentFormScreen')}
            className="mx-4 mt-4 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex-row items-center"
          >
            <View className="w-10 h-10 rounded-full bg-indigo-100 items-center justify-center">
              <Text className="text-indigo-600 text-lg">✍</Text>
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-bold text-slate-900">Sign enrollment agreement</Text>
              <Text className="text-sm text-slate-500">Review and sign your PG guest form</Text>
            </View>
            <Text className="text-slate-400">›</Text>
          </TouchableOpacity>
        )}
        <Tickets navigation={navigation} />
        <TicketPanel navigation={navigation} />
        <AnnouncementsSection />
        {/* <TicketDetailsScreen /> */}
        {/* <MoreDetails />
        <AdmissionDetails />
        <PaymentHistory /> */}
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}

export default function App() {
  useEffect(() => {
    setupForegroundNotificationHandler();
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <ThemeProvider>
          <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="LoginPin" component={LoginPinScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="BasicInfo" component={BasicInfoScreen} />
            <Stack.Screen name="Email" component={EmailScreen} />
            <Stack.Screen name="VerifyEmailScreen" component={VerifyEmailScreen} />
            <Stack.Screen name="CreatePassword" component={CreatePasswordScreen} />
            <Stack.Screen name="Success" component={SuccessScreen} />
            <Stack.Screen name="Reactivate" component={ReactivateScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="ResetPasswordSent" component={ResetPasswordSentScreen} />
            <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
            <Stack.Screen name="Facilities" component={FacilitiesScreen} />
            <Stack.Screen name="Floors" component={FloorsScreen} />
            <Stack.Screen name="Rooms" component={RoomsScreen} />
            <Stack.Screen name="Verify" component={VerifyScreen} />
            <Stack.Screen name="RulesScreen" component={RulesScreen} />
            <Stack.Screen name="FoodScreen" component={FoodScreen} />
            <Stack.Screen name="CreateMPINScreen" component={CreateMPINScreen} />
            <Stack.Screen name="Notifications" component={NotificationScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Profile2" component={ProfileScreen2} />
            <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
            <Stack.Screen name="CompleteProfileDocs" component={CompleteProfileDocsScreen} />
            <Stack.Screen name="SearchAdmin" component={SearchAdminScreen} />
            <Stack.Screen name="AdminDetails" component={AdminDetailsScreen} />
            <Stack.Screen name="LocationResults" component={LocationResultsScreen} />
            <Stack.Screen name="SearchResultDetails" component={SearchResultDetailsScreen} />
            <Stack.Screen name="TicketsScreen" component={TicketsScreen} />
            <Stack.Screen name="TicketChat" component={TicketChat} />
            <Stack.Screen name="CreateRequest" component={CreateRequestScreen} />
            <Stack.Screen name="ReloginMobileScreen" component={ReloginMobileScreen} />
            <Stack.Screen name="PaymentDueScreen" component={PaymentDueScreen} />
            <Stack.Screen name="DepositCheckoutScreen" component={DepositCheckoutScreen} />
            <Stack.Screen name="CreateNewMPIN" component={CreateNewMPIN} />
            <Stack.Screen name="PropertyDetailsScreen" component={PropertyDetailsScreen} />
            <Stack.Screen name="PropertyListScreen" component={PropertyListScreen} />
            
            {/* Move-Out Management Screens */}
            <Stack.Screen name="MoveOutRequestScreen" component={MoveOutRequestScreen} />
            <Stack.Screen name="MoveOutStatusScreen" component={MoveOutStatusScreen} />
            {/* Guest Enrollment Form (PG agreement) – sign after allocation */}
            <Stack.Screen name="GuestEnrollmentFormScreen" component={GuestEnrollmentFormScreen} />
          </Stack.Navigator>
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>
    </Provider>
  );
}
