import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Modal,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getTenantById } from "../data/dummyTenants";

export default function CustomerDetailScreen({ navigation, route }: any) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const customerId = route?.params?.customerId || "MYS001";

  // Get customer data from centralized source
  const customerData = getTenantById(customerId);

  const handleCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  if (!customerData) {
    return (
      <SafeAreaView className="flex-1 bg-[#F1F5F9] justify-center items-center">
        <Text className="text-slate-500 font-medium">Customer not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">
      <StatusBar barStyle="dark-content" />

      {/* IMAGE PREVIEW MODAL */}
      <Modal visible={!!previewImage} transparent animationType="fade">
        <View className="flex-1 bg-black/95 justify-center items-center">
          <TouchableOpacity 
            activeOpacity={1}
            onPress={() => setPreviewImage(null)}
            className="absolute top-12 right-6 z-10 bg-white/20 p-2 rounded-full"
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          {previewImage && (
            <Image source={{ uri: previewImage }} className="w-full h-[70%]" resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* HEADER */}
      <View className="bg-white px-6 py-5 flex-row items-center border-b border-slate-200 shadow-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1 -ml-1">
          <Ionicons name="arrow-back" size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-4 text-2xl font-black text-slate-900 tracking-tight">
          Customer Details
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="px-5">
        
        {/* CUSTOMER SUMMARY CARD */}
        <View className="bg-white rounded-[32px] p-6 mt-6 shadow-xl shadow-slate-200 border border-white">
          <View className="flex-row items-center">
            <TouchableOpacity activeOpacity={0.9} onPress={() => setPreviewImage(customerData.photo)}>
              <View>
                <Image source={{ uri: customerData.photo }} className="w-20 h-20 rounded-[24px] bg-slate-200 border-4 border-slate-50" />
                <View className="absolute bottom-0 right-0 bg-[#1E33FF] p-1 rounded-lg border-2 border-white">
                  <Ionicons name="expand" size={12} color="white" />
                </View>
              </View>
            </TouchableOpacity>

            <View className="ml-5 flex-1">
              <Text className="text-2xl font-black text-slate-900 leading-7">
                {customerData.firstName}{"\n"}{customerData.lastName}
              </Text>
              <View className="bg-slate-100 self-start px-2 py-0.5 rounded-md mt-2">
                <Text className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                  ID: {customerData.mystayId}
                </Text>
              </View>
            </View>
          </View>

          {/* CONTACT & DOB SECTION */}
          <View className="mt-8 pt-6 border-t border-slate-100">
            <View className="flex-row justify-between items-start">
              <View className="flex-1">
                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Number</Text>
                <Text className="text-[17px] font-bold text-slate-900 mt-1">{customerData.displayPhone}</Text>
              </View>
              <TouchableOpacity 
                onPress={() => handleCall(customerData.phone)}
                className="bg-green-50 p-2.5 rounded-full border border-green-100"
              >
                <Ionicons name="call" size={18} color="#10B981" />
              </TouchableOpacity>
            </View>
            
            <View className="mt-6">
              <Info label="Email Address" value={customerData.email} />
            </View>

            <View className="mt-4">
               <Info label="Date of Birth" value={customerData.dob} />
            </View>
          </View>

          {/* AADHAAR DETAILS */}
          <View className="mt-6 pt-6 border-t border-slate-100">
            <Info label="Aadhaar Number" value={customerData.aadhar} />
          </View>

          {/* EMERGENCY CONTACT */}
          <View className="mt-6 pt-6 border-t border-slate-100">
            <Text className="text-[11px] font-black text-slate-400 uppercase tracking-[1.5px] mb-2">Emergency Contact</Text>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-bold text-slate-800">{customerData.emergencyContactName}</Text>
                <Text className="text-base font-medium text-slate-500">{customerData.emergencyContactPhone}</Text>
              </View>
              <TouchableOpacity 
                onPress={() => handleCall(customerData.emergencyContactPhone)}
                className="bg-blue-50 p-3 rounded-full border border-blue-100"
              >
                <Ionicons name="call" size={20} color="#1E33FF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* DOCUMENTS */}
        <Section title="Uploaded Documents">
          <View className="flex-row flex-wrap justify-between">
            <Doc label="Aadhaar Front" uri={customerData.documents.aadharFront} half onPreview={setPreviewImage} />
            <Doc label="Aadhaar Back" uri={customerData.documents.aadharBack} half onPreview={setPreviewImage} />
          </View>
        </Section>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

const Section = ({ title, children }: any) => (
  <View className="bg-white rounded-[32px] p-6 mt-6 shadow-sm border border-white">
    <Text className="text-[12px] font-black text-slate-900 uppercase tracking-[2px] mb-5">{title}</Text>
    {children}
  </View>
);

const Info = ({ label, value }: any) => (
  <View className="flex-1">
    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</Text>
    <Text className="text-[15px] font-bold text-slate-900 mt-1">{value}</Text>
  </View>
);

const Doc = ({ label, uri, half, onPreview }: any) => (
  <TouchableOpacity activeOpacity={0.9} onPress={() => onPreview(uri)} className={`mb-5 ${half ? 'w-[48%]' : 'w-full'}`}>
    <Text className="text-[10px] font-bold text-slate-500 mb-2 uppercase">{label}</Text>
    <Image source={{ uri }} className="w-full h-28 rounded-2xl bg-slate-50 border border-slate-100" resizeMode="cover" />
  </TouchableOpacity>
);
