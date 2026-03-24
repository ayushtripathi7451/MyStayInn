import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ProfileHeader from "./SetupHeader";
import { Ionicons } from "@expo/vector-icons";

export default function FloorsScreen({ navigation, route }: any) {
  // Get data from previous screens
  const { 
    propertyData = {}, 
    facilitiesData = {},
    returnToPreview = false,
    floorsData: existingFloorsData,
    allRooms: existingAllRooms,
    usedFloors: existingUsedFloors,
    fromVerify: existingFromVerify
  } = route.params || {};
  
  const [floors, setFloors] = useState(existingFloorsData?.floors || 1);
  const [roomsPerFloor, setRoomsPerFloor] = useState(String(existingFloorsData?.avgRooms || 4));

  // New fields for notice period and security deposit
  const [noticePeriod, setNoticePeriod] = useState(String(existingFloorsData?.noticePeriod || 30));
  const [securityDeposit, setSecurityDeposit] = useState(String(existingFloorsData?.securityDeposit || ""));
  
  // Toggle for per month pricing (removed daily option)
  const pricingMode = "month";

  // Initialize sharing configs from existing data if available
  const initializeSharingConfigs = () => {
    const defaultConfigs = {
      Single: { enabled: true, price: "" },
      Double: { enabled: true, price: "" },
      Triple: { enabled: true, price: "" },
      Quadruple: { enabled: false, price: "" },
      Five: { enabled: false, price: "" },
      ">6": { enabled: false, price: "" },
    };

    if (existingFloorsData?.defaultPrices) {
      Object.keys(defaultConfigs).forEach((type) => {
        if (existingFloorsData.defaultPrices[type]) {
          defaultConfigs[type as keyof typeof defaultConfigs] = {
            enabled: true,
            price: String(existingFloorsData.defaultPrices[type])
          };
        }
      });
    }

    return defaultConfigs;
  };

  // State expanded to include all requested sharing types
  const [sharingConfigs, setSharingConfigs] = useState(initializeSharingConfigs());

  const toggleSharing = (type: keyof typeof sharingConfigs) => {
    setSharingConfigs((prev) => ({
      ...prev,
      [type]: { ...prev[type], enabled: !prev[type].enabled },
    }));
  };

  const handlePriceChange = (type: keyof typeof sharingConfigs, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    setSharingConfigs((prev) => ({
      ...prev,
      [type]: { ...prev[type], price: numericValue },
    }));
  };

  const increase = () => setFloors((n) => n + 1);
  const decrease = () => setFloors((n) => (n > 1 ? n - 1 : 1));

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ProfileHeader activeTab="Floors" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView className="px-6" showsVerticalScrollIndicator={false}>
        
        <Text className="text-2xl font-bold text-gray-900 mt-6 tracking-tight">Floor Configuration</Text>
        <Text className="text-gray-500 mb-6">Set up your property layout and base pricing</Text>

        {/* TOP CONFIG CARDS */}
        <View className="flex-row justify-between mb-6">
          <View className="bg-gray-50 p-4 rounded-3xl border border-gray-100 w-[48%] items-center">
            <Text className="text-gray-500 text-xs font-bold uppercase mb-2">Total Floors</Text>
            <View className="flex-row items-center justify-between w-full">
              <TouchableOpacity onPress={decrease} className="bg-white p-2 rounded-full shadow-sm border border-gray-100">
                <Ionicons name="remove" size={20} color="black" />
              </TouchableOpacity>
              <Text className="text-xl font-bold">{floors}</Text>
              <TouchableOpacity onPress={increase} className="bg-white p-2 rounded-full shadow-sm border border-gray-100">
                <Ionicons name="add" size={20} color="black" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="bg-gray-50 p-4 rounded-3xl border border-gray-100 w-[48%] items-center">
            <Text className="text-gray-500 text-xs font-bold uppercase mb-2">Avg Rooms/Floor</Text>
            <TextInput
              value={roomsPerFloor}
              onChangeText={setRoomsPerFloor}
              keyboardType="numeric"
              className="text-xl font-bold text-center w-full p-0"
              style={{ paddingBottom: Platform.OS === 'ios' ? 0 : 4 }}
            />
          </View>
        </View>

        {/* ADDITIONAL PROPERTY DETAILS */}
        <View className="bg-blue-50 p-5 rounded-3xl border border-blue-100 mb-6">
          <Text className="text-lg font-bold text-blue-900 mb-4">Property Terms</Text>
          
          <View className="flex-row justify-between mb-4">
            <View className="w-[48%]">
              <Text className="text-blue-700 text-xs font-bold uppercase mb-2">Notice Period (Days)</Text>
              <TextInput
                value={noticePeriod}
                onChangeText={setNoticePeriod}
                keyboardType="numeric"
                placeholder="30"
                className="bg-white rounded-xl px-4 py-3 border border-blue-200 text-blue-900 font-semibold"
              />
            </View>

            <View className="w-[48%]">
              <Text className="text-blue-700 text-xs font-bold uppercase mb-2">Security Deposit (₹)</Text>
              <TextInput
                value={securityDeposit}
                onChangeText={setSecurityDeposit}
                keyboardType="numeric"
                placeholder="Security Deposit"
                placeholderTextColor="#9CA3AF"
                className="bg-white rounded-xl px-4 py-3 border border-blue-200 text-blue-900 font-semibold"
              />
            </View>
          </View>
        </View>

        {/* SHARING OPTIONS SECTION */}
        <Text className="text-lg font-bold text-gray-900 mb-4">Sharing Options & Prices</Text>
        
        {Object.entries(sharingConfigs).map(([type, config]) => (
          <View 
            key={type} 
            className={`mb-4 p-4 rounded-3xl border ${config.enabled ? 'bg-indigo-50 border-indigo-100' : 'bg-gray-50 border-gray-100 opacity-60'}`}
          >
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center">
                <View className={`p-2 rounded-xl mr-3 ${config.enabled ? 'bg-indigo-600' : 'bg-gray-400'}`}>
                  <Ionicons name="people" size={18} color="white" />
                </View>
                <Text className={`text-base font-bold ${config.enabled ? 'text-indigo-900' : 'text-gray-600'}`}>{type} Sharing</Text>
              </View>
              <Switch
                value={config.enabled}
                onValueChange={() => toggleSharing(type as keyof typeof sharingConfigs)}
                trackColor={{ false: "#D1D5DB", true: "#A5B4FC" }}
                thumbColor={config.enabled ? "#4F46E5" : "#F3F4F6"}
              />
            </View>
            
            {config.enabled && (
              <View className="bg-white rounded-2xl px-4 py-3 flex-row items-center border border-indigo-100">
                <Text className="text-gray-400 font-bold mr-2">₹</Text>
                <TextInput
                  value={config.price}
                  onChangeText={(v) => handlePriceChange(type as keyof typeof sharingConfigs, v)}
                  keyboardType="numeric"
                  placeholder="Enter price"
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 text-indigo-600 font-bold text-lg"
                />
                <Text className="text-gray-400 text-xs font-bold">
                  / MONTH
                </Text>
              </View>
            )}
          </View>
        ))}

        {/* NAV BUTTONS */}
        <View className="flex-row justify-between mt-10 mb-10">
          <TouchableOpacity onPress={() => navigation.goBack()} className="px-8 py-4 rounded-2xl bg-gray-100">
            <Text className="text-gray-500 font-bold">Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              // Create an object containing only the types the user enabled
              const activePrices = Object.fromEntries(
                Object.entries(sharingConfigs)
                  .filter(([_, cfg]) => cfg.enabled)
                  .map(([type, cfg]) => [type, cfg.price])
              );

              const floorsData = {
                floors,
                avgRooms: Number(roomsPerFloor),
                defaultPrices: activePrices,
                noticePeriod: Number(noticePeriod),
                securityDeposit: Number(securityDeposit),
                pricingMode,
              };

              if (returnToPreview) {
                // Return to preview with updated data
                navigation.navigate("PropertyPreview", {
                  propertyData,
                  facilitiesData,
                  floorsData,
                  allRooms: existingAllRooms,
                  usedFloors: existingUsedFloors,
                  fromVerify: existingFromVerify
                });
              } else {
                // Normal flow - go to Rooms
                navigation.navigate("Rooms", {
                  propertyData,
                  facilitiesData,
                  ...floorsData
                });
              }
            }}
            disabled={Object.entries(sharingConfigs).some(([_, cfg]) => cfg.enabled && (!cfg.price || cfg.price.trim() === "")) || !securityDeposit.trim()}
            className={`px-12 py-4 rounded-2xl shadow-lg ${
              Object.entries(sharingConfigs).some(([_, cfg]) => cfg.enabled && (!cfg.price || cfg.price.trim() === "")) || !securityDeposit.trim()
                ? "bg-gray-300"
                : "bg-[#2F3CFF] shadow-blue-300"
            }`}
          >
            <Text className={`font-bold text-lg ${
              Object.entries(sharingConfigs).some(([_, cfg]) => cfg.enabled && (!cfg.price || cfg.price.trim() === "")) || !securityDeposit.trim()
                ? "text-gray-500"
                : "text-white"
            }`}>{returnToPreview ? "Save & Return" : "Next Step"}</Text>
          </TouchableOpacity>
        </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}