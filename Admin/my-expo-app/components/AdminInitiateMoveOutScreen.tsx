import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { moveOutApi } from "../utils/api";

interface AdminInitiateMoveOutScreenProps {
  navigation: any;
  route: any;
}

export default function AdminInitiateMoveOutScreen({ navigation, route }: AdminInitiateMoveOutScreenProps) {
  const params = route?.params || {};
  const customerId = params.customerId;
  const customerUniqueId = params.customerUniqueId || params.mystayId || undefined;
  const customerName = params.customerName || "Tenant";
  const bookingId = params.bookingId;
  const roomId = params.roomId;
  const propertyId = params.propertyId;
  const propertyName = params.propertyName || "";
  const roomNumber = params.roomNumber || "";
  const securityDeposit = params.securityDeposit != null ? Number(params.securityDeposit) : 0;

  const [moveOutDate, setMoveOutDate] = useState(() => {
    const d = params.moveOutDate ? new Date(params.moveOutDate) : new Date();
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [adminComments, setAdminComments] = useState("");
  const [securityDepositReturned, setSecurityDepositReturned] = useState("");
  const [loading, setLoading] = useState(false);

  const onDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) setMoveOutDate(selectedDate);
  };

  const submit = async () => {
    if (!customerId || !bookingId || !roomId) {
      Alert.alert("Error", "Missing customer or booking details.");
      return;
    }
    if (!adminComments.trim()) {
      Alert.alert("Validation", "Admin comments are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await moveOutApi.post("/api/move-out/initiate", {
        customerId: String(customerId),
        customerUniqueId: customerUniqueId ? String(customerUniqueId) : undefined,
        bookingId: String(bookingId),
        roomId: String(roomId),
        propertyId: propertyId != null ? String(propertyId) : undefined,
        propertyName: propertyName || undefined,
        roomNumber: roomNumber || undefined,
        moveOutDate: moveOutDate.toISOString().split("T")[0],
        adminComments: adminComments.trim(),
        securityDepositReturned:
          securityDepositReturned.trim() !== "" ? parseFloat(securityDepositReturned) : undefined,
      });
      if (res.data?.success) {
        Alert.alert("Success", "Move-out initiated. It will appear in the Accepted tab.", [
          {
            text: "OK",
            onPress: () => navigation.navigate("MoveOutManagementScreen", { openTab: "accepted" }),
          },
        ]);
      } else {
        Alert.alert("Error", res.data?.message || "Failed to initiate move-out");
      }
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || err?.message || "Failed to initiate move-out"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">
      <StatusBar barStyle="dark-content" />
      <View className="bg-white px-6 py-5 flex-row items-center border-b border-slate-200 shadow-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1 -ml-1">
          <Ionicons name="arrow-back" size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-4 text-xl font-black text-slate-900 tracking-tight">
          Initiate Move-Out (Owner)
        </Text>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <View className="bg-white rounded-[24px] p-6 mt-6 shadow-sm border border-white">
          <Text className="text-slate-500 font-medium mb-1">Tenant</Text>
          <Text className="text-lg font-bold text-slate-900">{customerName}</Text>
          <Text className="text-slate-500 font-medium mt-3 mb-1">Room</Text>
          <Text className="text-lg font-bold text-slate-900">
            {roomNumber} {propertyName ? `• ${propertyName}` : ""}
          </Text>
        </View>

        <View className="bg-white rounded-[24px] p-6 mt-4 shadow-sm border border-white">
          <Text className="text-slate-700 font-bold mb-2">Move-out date</Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            className="border border-slate-200 rounded-xl px-4 py-3 flex-row items-center justify-between"
          >
            <Text className="text-slate-900 font-medium">
              {moveOutDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </Text>
            <Ionicons name="calendar-outline" size={22} color="#64748B" />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={moveOutDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>

        <View className="bg-white rounded-[24px] p-6 mt-4 shadow-sm border border-white">
          <Text className="text-slate-700 font-bold mb-2">Admin comments *</Text>
          <TextInput
            value={adminComments}
            onChangeText={setAdminComments}
            placeholder="Add comments (required, e.g. reason/notes)"
            placeholderTextColor="#94A3B8"
            className="border border-slate-200 rounded-xl px-4 py-3 text-slate-900 min-h-[80px]"
            multiline
            numberOfLines={3}
          />
        </View>

        <View className="bg-white rounded-[24px] p-6 mt-4 shadow-sm border border-white">
          <Text className="text-slate-700 font-bold mb-2">Security deposit returned (optional)</Text>
          <TextInput
            value={securityDepositReturned}
            onChangeText={setSecurityDepositReturned}
            placeholder={securityDeposit > 0 ? `e.g. ${securityDeposit}` : "Amount"}
            placeholderTextColor="#94A3B8"
            keyboardType="decimal-pad"
            className="border border-slate-200 rounded-xl px-4 py-3 text-slate-900"
          />
          {securityDeposit > 0 && (
            <Text className="text-slate-500 text-sm mt-1">Collected: ₹{securityDeposit.toLocaleString()}</Text>
          )}
        </View>

        <TouchableOpacity
          onPress={submit}
          disabled={loading}
          className="bg-[#1E33FF] rounded-[22px] py-4 mt-8 mb-10 items-center shadow-lg"
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white font-black text-lg">Initiate Move-Out</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
