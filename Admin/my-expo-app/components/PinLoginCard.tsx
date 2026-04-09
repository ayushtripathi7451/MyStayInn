import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, propertyApi, getAuthBearerToken } from '../utils/api';

export default function PinLoginCard({ navigation, globalPinFocus, setGlobalPinFocus }: any) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);
  const [showCaret, setShowCaret] = useState(true);

  useEffect(() => {
    // Caret Blinking Logic
    const interval = setInterval(() => { setShowCaret((prev) => !prev); }, 500);

    // Add Keyboard Listeners to remove indicator when keyboard closes
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setGlobalPinFocus(false);
    });

    return () => {
      clearInterval(interval);
      hideSubscription.remove();
    };
  }, []);

  const handleFocus = () => {
    setGlobalPinFocus(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleBlur = () => { setGlobalPinFocus(false); };

  const handleVerifyMPIN = async () => {
    try {
      setLoading(true);
      setError('');

      // Check if user token exists (required for API call)
      // The actual token is automatically added by api.interceptors
      const token = await getAuthBearerToken();
      if (!token) {
        setError('Session expired. Please sign in again.');
        navigation.replace('Register');
        return;
      }

      // Call backend API to verify MPIN
      // Note: Token is automatically added by api.interceptors
      const response = await api.post(
        '/api/auth/verify-mpin',
        { mpin: pin }
      );

      if (response.data.success) {
        setPin('');
        setError('');
        Keyboard.dismiss();
        setGlobalPinFocus(false);
        
        // Check if user has properties
        try {
          const propertiesResponse = await propertyApi.get('/api/properties');
          
          if (propertiesResponse.data.success && propertiesResponse.data.properties.length > 0) {
            // User has properties - store first property and navigate to Home
            const firstProperty = propertiesResponse.data.properties[0];
            await AsyncStorage.setItem('currentProperty', JSON.stringify(firstProperty));
            navigation.replace('Home');
          } else {
            // No properties - navigate to ProfileSetup to add first property
            navigation.replace('ProfileSetup');
          }
        } catch (propertyError) {
          console.error('Error fetching properties:', propertyError);
          // If property fetch fails, navigate to ProfileSetup as fallback
          navigation.replace('ProfileSetup');
        }
      }
    } catch (error: any) {
      console.error('MPIN Verification Error:', error);
      
      // Handle specific error cases
      if (error.response?.status === 423) {
        // Account locked (HTTP 423 Locked)
        const remainingMinutes = error.response?.data?.remainingMinutes;
        const message = remainingMinutes 
          ? `Account locked. Please try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`
          : error.response?.data?.message || 'Account temporarily locked. Please try again later.';
        
        setError(message);
        setPin('');
      } else if (error.response?.status === 401) {
        // Wrong MPIN
        const attemptsLeft = error.response?.data?.attemptsLeft;
        setPin('');
        if (attemptsLeft !== undefined) {
          setError(`Incorrect MPIN. Attempts left: ${attemptsLeft}.`);
        } else {
          setError('Incorrect MPIN. Please try again.');
        }
      } else if (error.response?.status === 404) {
        setError('No MPIN set yet. Opening MPIN setup…');
        navigation.replace('CreateMPIN');
      } else {
        const errorMessage = error.response?.data?.message || 'Failed to verify MPIN. Please try again.';
        setError(errorMessage);
        setPin('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      className="mx-4 mb-10 w-11/12 overflow-hidden rounded-[32px] p-8"
      style={{
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.55)',
      }}>
      <LinearGradient
        colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.05)', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%' }}
      />

      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.18)', 'rgba(255,255,255,0.28)']}
        style={{ position: 'absolute', bottom: -10, left: 0, right: 0, height: 90, opacity: 0.7 }}
      />

      <Text className="mb-1 text-center text-[22px] font-semibold text-white">
        Unlock to use MyStayInn
      </Text>
      <Text className="mb-4 text-center text-[14px] text-white/80">Enter your current MPIN</Text>

      <TextInput
        ref={inputRef}
        value={pin}
        onChangeText={(t) => {
          setPin(t.replace(/[^0-9]/g, '').slice(0, 4));
          setError('');
        }}
        keyboardType="number-pad"
        maxLength={4}
        caretHidden={true}
        onBlur={handleBlur}
        editable={!loading}
        // Positioned over the PIN dots so KeyboardAvoidingView knows what to keep visible
        style={{ position: 'absolute', bottom: 80, left: 0, right: 0, height: 50, opacity: 0 }}
      />

      <TouchableOpacity activeOpacity={1} onPress={handleFocus} disabled={loading}>
        <View className="mb-6 flex-row justify-center gap-6">
          {[0, 1, 2, 3].map((i) => {
            const digits = pin.split('');
            const isActive = i === digits.length;
            return (
              <View key={i} className="h-12 w-10 items-center justify-center border-b-2 border-white/60">
                <Text className="text-[28px] text-white">
                  {digits[i] ? '•' : globalPinFocus && isActive && showCaret ? '|' : ''}
                </Text>
              </View>
            );
          })}
        </View>
      </TouchableOpacity>

      {error ? (
        <Text
          className="text-center text-amber-100 text-sm mb-3 px-1"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      ) : null}

      <View className="flex-row justify-between items-center">
        <TouchableOpacity 
          onPress={() => { 
            setPin('');
            setError('');
            Keyboard.dismiss();
            setGlobalPinFocus(false); 
          }}
          disabled={loading}
        >
          <Text className={`text-[18px] ${loading ? 'text-white/40' : 'text-white/90'}`}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          disabled={pin.length < 4 || loading} 
          onPress={handleVerifyMPIN}
          className="flex-row items-center"
        >
          {loading && <ActivityIndicator color="white" size="small" className="mr-2" />}
          <Text className={`text-[18px] font-semibold ${pin.length < 4 || loading ? 'text-white/40' : 'text-white'}`}>
            {loading ? 'Verifying...' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>

    
    </View>
  );
}