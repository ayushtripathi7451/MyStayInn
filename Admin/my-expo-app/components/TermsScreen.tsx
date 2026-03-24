import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const sections = [
  {
    title: 'Platform Role',
    body: 'MyStayInn is a technology-based intermediary platform operated by TechMudita Pvt Ltd, connecting Property owners ("Admins") with customers ("Users"). MyStayInn does not own, manage, or operate any properties listed in its platforms.',
  },
  {
    title: 'Eligibility',
    body: 'Users must be 18 years or above and provide accurate and lawful information during registration and use of the platform.',
  },
  {
    title: 'Listings & Bookings',
    body: 'All property details, pricing, availability, and rules are provided by the respective Property owners. MyStayInn is not responsible for inaccuracies, service quality, or changes made by owners.',
  },
  {
    title: 'Payments & Refunds',
    body: 'Payments, if enabled, are processed through RBI-approved third-party payment gateways.',
  },
  {
    title: 'User Conduct',
    body: 'Users must comply with property rules, local laws, and safety regulations.',
  },
  {
    title: 'Limitation of Liability',
    body: 'MyStayInn and TechMudita Pvt Ltd shall not be liable for disputes or damages between Users and Property owners.',
  },
  {
    title: 'Governing Law',
    body: 'Terms are governed by the laws of India, and the courts at Bengaluru, Karnataka shall have exclusive jurisdiction.',
  },
];

export default function TermsScreen({ navigation }: any) {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 p-1">
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Terms & Conditions</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-bold text-gray-900 mb-1">MyStayInn</Text>
        <Text className="text-sm text-gray-500 mb-6">Operated by TechMudita Pvt Ltd</Text>

        {sections.map((s, i) => (
          <View key={i} className="mb-6">
            <Text className="text-base font-bold text-gray-900 mb-2">{s.title}</Text>
            <Text className="text-gray-600 leading-relaxed">{s.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
