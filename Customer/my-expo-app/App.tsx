import './global.css';
import React, { useEffect, useCallback, useState, useRef } from 'react';
import { ScrollView, View, ActivityIndicator, TouchableOpacity, Text, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Provider, useDispatch, useSelector } from 'react-redux';
import type { RootState } from './src/store/redux';
import { refreshCurrentStay } from './src/store/actions';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { navigationRef } from './utils/navigationRef';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme, ThemeProvider } from './context/ThemeContext';
import { store } from './src/store';

import Header from './components/Header';
import InfoCards from './components/InfoCards';
import DueAmount from './components/DueAmount';
import Tickets from './components/Tickets';
import BottomNav from './components/BottomNav';
import AnnouncementsSection from './components/AnnouncementsSection';
import HomeRecentAnnouncements from './components/HomeRecentAnnouncements';
import InboxDetailScreen from './components/InboxDetailScreen';
import SettingsScreen from './components/SettingsScreen';
import PrivacyPolicyScreen from './components/PrivacyPolicyScreen';
import TermsScreen from './components/TermsScreen';
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
import PropertyRulesViewScreen from './components/PropertyRulesViewScreen';
import PropertyFoodMenuViewScreen from './components/PropertyFoodMenuViewScreen';
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
import { bookingApi } from './utils/api';

const Stack = createNativeStackNavigator();

function HomeScreen({ navigation }: any) {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const currentStay = useSelector((state: RootState) => state.currentStay.data);
  const currentStays = useSelector((state: RootState) => state.currentStay.stays);
  const currentStayLoading = useSelector((state: RootState) => state.currentStay.loading);
  const [refreshing, setRefreshing] = useState(false);
  const lastAutoSignedBookingRef = useRef<string>("");
  
  const getLocalYMD = () => {
    const d0 = new Date();
    const yyyy = d0.getFullYear();
    const mm = String(d0.getMonth() + 1).padStart(2, '0');
    const dd = String(d0.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  
  const lastLocalDayRef = useRef<string>(getLocalYMD());

  // If user changes device date while app stays open, update dues immediately with force refresh
  useEffect(() => {
    const t = setInterval(() => {
      const today = getLocalYMD();
      if (today !== lastLocalDayRef.current) {
        console.log('[HomeScreen] Date changed from', lastLocalDayRef.current, 'to', today);
        lastLocalDayRef.current = today;
        // Send as object with force: true to bypass cache
        dispatch(refreshCurrentStay({ force: true }));
      }
    }, 5000); // Check every 5 seconds for better responsiveness

    return () => clearInterval(t);
  }, [dispatch]);

  // Single trigger when Home is focused (including first open)
  useFocusEffect(
    useCallback(() => {
      dispatch(refreshCurrentStay({ force: false }));
    }, [dispatch])
  );

  useEffect(() => {
    if (!currentStayLoading && refreshing) setRefreshing(false);
  }, [currentStayLoading, refreshing]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Send as object with force: true to bypass cache
    dispatch(refreshCurrentStay({ force: true }));
  }, [dispatch]);

  // Register for push every time Home is focused
  useFocusEffect(
    useCallback(() => {
      registerPushNotifications().catch(() => {});
    }, [])
  );

  // Auto-submit enrollment form for current stay
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const autoSignEnrollmentForm = async () => {
        if (!currentStay) return;
        try {
          const res = await bookingApi.get('/api/bookings/guest-enrollment-form');
          const form = res.data?.form;
          if (!res.data?.success || !form) return;

          const status = String(form.status || '').toLowerCase();
          if (status === 'signed') return;

          const bookingKey = String(form.bookingId || form.id || '');
          if (bookingKey && bookingKey === lastAutoSignedBookingRef.current) return;

          const parsedPrefilledData =
            typeof form.prefilledData === 'string'
              ? (() => {
                  try {
                    return JSON.parse(form.prefilledData);
                  } catch {
                    return null;
                  }
                })()
              : form.prefilledData || null;

          const candidateName = String(
            parsedPrefilledData?.guestPersonal?.name || form.signatureName || 'Customer'
          ).trim();
          const signatureName = candidateName.length >= 2 ? candidateName : 'Customer';

          await bookingApi.post('/api/bookings/guest-enrollment-form/sign', { signatureName });
          if (isActive) {
            lastAutoSignedBookingRef.current = bookingKey || 'signed';
          }
        } catch (e: any) {
          if (e?.response?.status !== 404) {
            console.warn('[Home] auto-sign enrollment failed:', e?.response?.data?.message || e?.message);
          }
        }
      };

      autoSignEnrollmentForm();
      return () => {
        isActive = false;
      };
    }, [currentStay])
  );

  // Dynamic background based on theme
  const bgColor = theme === 'female' ? 'bg-[#FFF5FF]' : 'bg-[#F6F8FF]';

  // Prevent blank UI: show loading only on initial load when we have no cached data
  if (currentStayLoading && currentStays.length === 0) {
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
        <HomeRecentAnnouncements />
        <InfoCards />
        <DueAmount />
        <AnnouncementsSection />
        <Tickets navigation={navigation} />
        <TicketPanel navigation={navigation} />
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
          <NavigationContainer ref={navigationRef}>
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
              <Stack.Screen name="InboxDetail" component={InboxDetailScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="Profile2" component={ProfileScreen2} />
              <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
              <Stack.Screen name="CompleteProfileDocs" component={CompleteProfileDocsScreen} />
              <Stack.Screen name="SearchAdmin" component={SearchAdminScreen} />
              <Stack.Screen name="AdminDetails" component={AdminDetailsScreen} />
              <Stack.Screen name="PropertyRulesViewScreen" component={PropertyRulesViewScreen} />
              <Stack.Screen name="PropertyFoodMenuViewScreen" component={PropertyFoodMenuViewScreen} />
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