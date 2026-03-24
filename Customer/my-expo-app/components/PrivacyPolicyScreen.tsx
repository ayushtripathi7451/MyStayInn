import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const sections = [
  {
    title: 'Information We Collect',
    body: 'We may collect personal information such as name, contact details, and usage data.',
  },
  {
    title: 'Use of Information',
    bullets: ['Account creation and management', 'Booking communication', 'Safety and verification'],
  },
  {
    title: 'Data Protection',
    body: 'TechMudita Pvt Ltd follows security practices under the IT Act 2000.',
  },
  {
    title: 'Data Sharing',
    bullets: ['Property owners for bookings', 'Legal authorities when required', 'Within TechMudita ecosystem'],
  },
  {
    title: 'User Consent',
    body: 'By using MyStayInn, you consent to this Privacy Policy.',
  },
];

export default function PrivacyPolicyScreen({ navigation }: any) {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 p-1">
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Privacy Policy</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-bold text-gray-900 mb-1">MyStayInn</Text>
        <Text className="text-sm text-gray-500 mb-6">TechMudita Pvt Ltd</Text>
        <Text className="text-gray-600 mb-6 leading-relaxed">
          Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your information.
        </Text>

        {sections.map((s, i) => (
          <View key={i} className="mb-6">
            <Text className="text-base font-bold text-gray-900 mb-2">{s.title}</Text>
            {s.body && <Text className="text-gray-600 leading-relaxed">{s.body}</Text>}
            {s.bullets && s.bullets.map((b, j) => (
              <View key={j} className="flex-row items-start mb-1">
                <Text className="text-gray-500 mr-2 mt-0.5">•</Text>
                <Text className="text-gray-600 flex-1 leading-relaxed">{b}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
