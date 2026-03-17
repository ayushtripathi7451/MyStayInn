import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// 🔹 responsive scale helper
const scale = (size: number) => (SCREEN_W / 375) * size;

export default function WelcomeScreen({ navigation }: any) {
  return (
    <ImageBackground
      source={require('../assets/hello.png')}
      resizeMode="cover"
      style={{ width: SCREEN_W, height: SCREEN_H }}
    >
      {/* 🔵 BLUE GRADIENT OVERLAY */}
      <LinearGradient
        colors={[
          'rgba(109,123,255,0.25)',
          'rgba(0,64,255,0.85)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: 'absolute', inset: 0 }}
      />

      {/* LOGO (CENTERED – SAME POSITION) */}
      <View
        style={{
          position: 'absolute',
          top: SCREEN_H / 2 - 76,
          left: SCREEN_W / 2 - 76,
        }}
      >
        <Image
          source={require('../assets/my-stay-logo.png')}
          style={{ width: scale(160), height: scale(160) }}
          resizeMode="contain"
        />
      </View>

      {/* 🔽 GLASS CARD — BOTTOM */}
      <View className="absolute bottom-[140px] w-full items-center px-4">
        <View className="relative w-full max-w-[420px] rounded-[32px] bg-white/10 border border-white/40 p-6 overflow-hidden">

          {/* Gloss gradients */}
          <LinearGradient
            colors={[
              'rgba(255,255,255,0.35)',
              'rgba(255,255,255,0.05)',
              'transparent',
            ]}
            className="absolute top-0 left-0 right-0 h-[40%]"
          />

          <LinearGradient
            colors={[
              'transparent',
              'rgba(255,255,255,0.18)',
              'rgba(255,255,255,0.28)',
            ]}
            className="absolute -bottom-2 left-0 right-0 h-[90px] opacity-70"
          />

          {/* TITLE */}
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            style={{
              fontSize: scale(28),
              fontWeight: '700',
              color: '#fff',
              textAlign: 'center',
              marginBottom: 10,
            }}
          >
            Welcome to Admin
          </Text>

          {/* SUBTITLE */}
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            style={{
              fontSize: scale(15),
              color: 'rgba(255,255,255,0.85)',
              textAlign: 'center',
            }}
          >
            Don’t have an account?{' '}
            <Text
              onPress={() => navigation.navigate('Signup')}
              style={{
                fontWeight: '700',
                textDecorationLine: 'underline',
                color: '#fff',
              }}
            >
              Sign Up
            </Text>
          </Text>

          {/* BUTTON */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ReloginMobileScreen')}
            className="mt-6 bg-white py-3 rounded-2xl shadow-md"
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.9}
              style={{
                fontSize: scale(17),
                fontWeight: '600',
                color: '#000',
                textAlign: 'center',
              }}
            >
              Log In
            </Text>
          </TouchableOpacity>

        </View>
      </View>
    </ImageBackground>
  );
}
