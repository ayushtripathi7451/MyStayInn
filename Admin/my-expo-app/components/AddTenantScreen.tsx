import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ScrollableDatePicker from "./ScrollableDatePicker";
import { userApi, propertyApi, bookingApi } from "../utils/api";

interface AddTenantScreenProps {
  navigation: any;
}

export default function AddTenantScreen({ navigation }: AddTenantScreenProps) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    roomNumber: "",
    monthlyRent: "",
    securityDeposit: "",
    checkInDate: new Date(),
    advanceAmount: "",
    paymentMode: "Cash",
  });

  const [loading, setLoading] = useState(false);
  const [formBanner, setFormBanner] = useState<{ text: string; variant: "error" | "success" } | null>(
    null
  );

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const { name, phone, roomNumber, monthlyRent } = formData;
    
    if (!name.trim()) {
      setFormBanner({ variant: "error", text: "Please enter tenant name" });
      return false;
    }

    if (!phone.trim() || phone.length !== 10) {
      setFormBanner({ variant: "error", text: "Please enter a valid 10-digit phone number" });
      return false;
    }

    if (!roomNumber.trim()) {
      setFormBanner({ variant: "error", text: "Please enter room number" });
      return false;
    }

    if (!monthlyRent.trim() || isNaN(Number(monthlyRent))) {
      setFormBanner({ variant: "error", text: "Please enter a valid monthly rent amount" });
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      // 1. Find existing customer by phone number
      const searchRes = await userApi.get(`/api/users/search/customers?query=${formData.phone}`);
      
      if (!searchRes.data.success || !searchRes.data.customers || searchRes.data.customers.length === 0) {
        setFormBanner({
          variant: "error",
          text: "Customer not found. Please ensure the customer has registered with this phone number.",
        });
        return;
      }
      
      const customer = searchRes.data.customers[0];
      const customerId = customer.id;
      
      // 2. Find room by room number
      const roomsRes = await propertyApi.get('/api/properties/rooms/all');
      
      if (!roomsRes.data.success || !Array.isArray(roomsRes.data.rooms)) {
        setFormBanner({ variant: "error", text: "Failed to fetch rooms. Please try again." });
        return;
      }

      const room = roomsRes.data.rooms.find((r: any) => r.roomNumber === formData.roomNumber);

      if (!room) {
        setFormBanner({
          variant: "error",
          text: `Room ${formData.roomNumber} not found. Please check the room number.`,
        });
        return;
      }
      
      const roomId = room.id;
      
      // 3. Create booking
      const bookingRes = await bookingApi.post('/api/bookings/allocate-room', {
        customerId,
        roomId,
        moveInDate: formData.checkInDate.toISOString().split('T')[0], // YYYY-MM-DD format
        rentAmount: parseFloat(formData.monthlyRent),
        securityDeposit: parseFloat(formData.securityDeposit || '0'),
        isSecurityPaid: false, // Assume not paid during allocation
        onlinePaymentRecv: parseFloat(formData.advanceAmount || '0'),
        cashPaymentRecv: 0,
        notes: `Tenant added via admin panel. Payment mode: ${formData.paymentMode}`,
      });
      
      if (!bookingRes.data.success) {
        setFormBanner({
          variant: "error",
          text: bookingRes.data.message || "Failed to allocate room. Please try again.",
        });
        return;
      }

      setFormBanner({
        variant: "success",
        text: `Tenant ${formData.name} assigned to Room ${formData.roomNumber}.`,
      });
      setTimeout(() => navigation.goBack(), 900);
    } catch (error: any) {
      console.error("Error adding tenant:", error);
      const message = error.response?.data?.message || "Failed to add tenant. Please try again.";
      setFormBanner({ variant: "error", text: message });
    } finally {
      setLoading(false);
    }
  };

  const availableRooms = [
    "101", "102", "103", "201", "202", "203", "301", "302", "303"
  ];

  const paymentModes = ["Cash", "Online", "Card", "UPI", "Bank Transfer"];

  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">
      {/* Header */}
      <View className="bg-white px-6 py-5 flex-row items-center border-b border-slate-200 shadow-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1 -ml-1">
          <Ionicons name="arrow-back" size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-4 text-2xl font-black text-slate-900 tracking-tight">
          Add New Tenant
        </Text>
      </View>

      {formBanner ? (
        <View
          className={`mx-5 mt-3 rounded-xl p-3 border ${
            formBanner.variant === "error"
              ? "bg-rose-50 border-rose-200"
              : "bg-emerald-50 border-emerald-200"
          }`}
        >
          <Text
            className={`text-sm ${formBanner.variant === "error" ? "text-rose-800" : "text-emerald-800"}`}
          >
            {formBanner.text}
          </Text>
        </View>
      ) : null}

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          className="px-5"
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Personal Information */}
          <View className="bg-white rounded-[24px] p-6 mt-6 shadow-sm border border-white">
            <Text className="text-lg font-black text-slate-900 mb-4">
              Personal Information
            </Text>

            <View className="space-y-4">
              <View>
                <Text className="text-slate-700 font-medium mb-2">Full Name *</Text>
                <TextInput
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900"
                  placeholder="Enter tenant's full name"
                  value={formData.name}
                  onChangeText={(text) => updateFormData("name", text)}
                />
              </View>

              <View>
                <Text className="text-slate-700 font-medium mb-2">Phone Number *</Text>
                <TextInput
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900"
                  placeholder="Enter 10-digit phone number"
                  value={formData.phone}
                  onChangeText={(text) => updateFormData("phone", text)}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>

              <View>
                <Text className="text-slate-700 font-medium mb-2">Email (Optional)</Text>
                <TextInput
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChangeText={(text) => updateFormData("email", text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>

          {/* Room & Rent Details */}
          <View className="bg-white rounded-[24px] p-6 mt-4 shadow-sm border border-white">
            <Text className="text-lg font-black text-slate-900 mb-4">
              Room & Rent Details
            </Text>

            <View className="space-y-4">
              <View>
                <Text className="text-slate-700 font-medium mb-2">Room Number *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row space-x-2">
                    {availableRooms.map((room) => (
                      <TouchableOpacity
                        key={room}
                        className={`px-4 py-2 rounded-xl ${
                          formData.roomNumber === room 
                            ? 'bg-blue-500' 
                            : 'bg-slate-100'
                        }`}
                        onPress={() => updateFormData("roomNumber", room)}
                      >
                        <Text className={`font-bold ${
                          formData.roomNumber === room 
                            ? 'text-white' 
                            : 'text-slate-600'
                        }`}>
                          {room}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View className="flex-row space-x-3">
                <View className="flex-1">
                  <Text className="text-slate-700 font-medium mb-2">Monthly Rent *</Text>
                  <TextInput
                    className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900"
                    placeholder="₹ 15000"
                    value={formData.monthlyRent}
                    onChangeText={(text) => updateFormData("monthlyRent", text)}
                    keyboardType="numeric"
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-slate-700 font-medium mb-2">Security Deposit</Text>
                  <TextInput
                    className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900"
                    placeholder="₹ 25000"
                    value={formData.securityDeposit}
                    onChangeText={(text) => updateFormData("securityDeposit", text)}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View>
                <Text className="text-slate-700 font-medium mb-2">Check-in Date</Text>
                <ScrollableDatePicker
                  selectedDate={formData.checkInDate}
                  onDateChange={(date) => updateFormData("checkInDate", date)}
                  mode="date"
                  placeholder="Select check-in date"
                  containerStyle="h-[48px]"
                />
              </View>
            </View>
          </View>

          {/* Payment Details */}
          <View className="bg-white rounded-[24px] p-6 mt-4 shadow-sm border border-white">
            <Text className="text-lg font-black text-slate-900 mb-4">
              Payment Details
            </Text>

            <View className="space-y-4">
              <View className="flex-row space-x-3">
                <View className="flex-1">
                  <Text className="text-slate-700 font-medium mb-2">Advance Amount</Text>
                  <TextInput
                    className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900"
                    placeholder="₹ 0"
                    value={formData.advanceAmount}
                    onChangeText={(text) => updateFormData("advanceAmount", text)}
                    keyboardType="numeric"
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-slate-700 font-medium mb-2">Payment Mode</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row space-x-2">
                      {paymentModes.map((mode) => (
                        <TouchableOpacity
                          key={mode}
                          className={`px-3 py-2 rounded-xl ${
                            formData.paymentMode === mode 
                              ? 'bg-green-500' 
                              : 'bg-slate-100'
                          }`}
                          onPress={() => updateFormData("paymentMode", mode)}
                        >
                          <Text className={`font-bold text-sm ${
                            formData.paymentMode === mode 
                              ? 'text-white' 
                              : 'text-slate-600'
                          }`}>
                            {mode}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>
            </View>
          </View>

          {/* Summary */}
          <View className="bg-blue-50 rounded-[24px] p-6 mt-4">
            <View className="flex-row items-center mb-3">
              <Ionicons name="information-circle-outline" size={24} color="#1E33FF" />
              <Text className="ml-2 text-lg font-black text-blue-900">
                Summary
              </Text>
            </View>
            
            <View className="space-y-2">
              <Text className="text-blue-800 text-sm">
                • Tenant will be assigned to Room {formData.roomNumber || "___"}
              </Text>
              <Text className="text-blue-800 text-sm">
                • Monthly rent: ₹{formData.monthlyRent || "0"}
              </Text>
              <Text className="text-blue-800 text-sm">
                • Check-in date: {formData.checkInDate.toLocaleDateString('en-GB')}
              </Text>
              <Text className="text-blue-800 text-sm">
                • Advance received: ₹{formData.advanceAmount || "0"} via {formData.paymentMode}
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            className={`py-4 rounded-xl mt-6 ${loading ? 'bg-slate-400' : 'bg-[#1E33FF]'}`}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text className="text-center font-bold text-white text-lg">
              {loading ? 'Adding Tenant...' : 'Add Tenant'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}