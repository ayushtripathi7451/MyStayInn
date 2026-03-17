import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { moveOutApi } from "../utils/api";

interface MoveOutRequestScreenProps {
  navigation: any;
  route?: any;
}

interface BookingDetails {
  bookingId: string;
  propertyName: string;
  roomNumber: string;
  checkInDate: string;
  monthlyRent: number;
  securityDeposit: number;
  noticePeriodDays: number;
  currentDue?: number;
}

export default function MoveOutRequestScreen({ navigation, route }: MoveOutRequestScreenProps) {
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [moveOutDate, setMoveOutDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isWithinNotice, setIsWithinNotice] = useState(false);
  const [penaltyAmount, setPenaltyAmount] = useState(0);

  useEffect(() => {
    loadBookingDetails();
  }, []);

  useEffect(() => {
    validateNoticeRequirement();
  }, [moveOutDate, bookingDetails]);

  const loadBookingDetails = async () => {
    setLoading(true);
    try {
      const res = await moveOutApi.get("/api/move-out/booking-details", {
        timeout: 15000,
      });
      if (!res.data?.success || !res.data.data) {
        Alert.alert("Error", res.data?.message || "Failed to load booking details");
        setBookingDetails(null);
        return;
      }
      const d = res.data.data;
      const details: BookingDetails = {
        bookingId: d.bookingId,
        propertyName: d.propertyName,
        roomNumber: d.roomNumber,
        checkInDate: d.checkInDate,
        monthlyRent: Number(d.monthlyRent) || 0,
        securityDeposit: Number(d.securityDeposit) || 0,
        noticePeriodDays: d.noticePeriodDays ?? 30,
        currentDue: d.currentDue != null ? Number(d.currentDue) : undefined,
      };
      setBookingDetails(details);
    } catch (error: any) {
      console.error("Error loading booking details:", error);
      const msg =
        error?.response?.data?.message ||
        error.message ||
        "Failed to load booking details";
      Alert.alert("Error", msg);
      setBookingDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const validateNoticeRequirement = async () => {
    if (!bookingDetails) return;
    try {
      const res = await moveOutApi.post("/api/move-out/validate-date", {
        moveOutDate: moveOutDate.toISOString(),
        bookingId: bookingDetails.bookingId,
      });
      if (!res.data?.success || !res.data.data) {
        return;
      }
      const data = res.data.data;
      setIsWithinNotice(data.isWithinNotice);
      setPenaltyAmount(
        data.penaltyAmount != null ? Number(data.penaltyAmount) : 0
      );
    } catch (error) {
      console.error("Error validating move-out date:", error);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setMoveOutDate(selectedDate);
    }
  };

  const validateForm = () => {
    if (!comments.trim()) {
      Alert.alert('Error', 'Please provide additional comments');
      return false;
    }

    const today = new Date();
    if (moveOutDate <= today) {
      Alert.alert('Error', 'Move-out date must be in the future');
      return false;
    }

    return true;
  };

  const submitMoveOutRequest = async () => {
    if (!validateForm() || !bookingDetails) return;

    setSubmitting(true);
    try {
      const res = await moveOutApi.post("/api/move-out/request", {
        bookingId: bookingDetails.bookingId,
        requestedDate: moveOutDate.toISOString(),
        customerComments: comments.trim(),
      });

      if (!res.data?.success || !res.data.data) {
        const msg =
          res.data?.message || "Failed to submit move-out request";
        throw new Error(msg);
      }

      const requestId = res.data.data.requestId;

      Alert.alert(
        "Success",
        "Your move-out request has been submitted successfully. You will be notified once the admin reviews your request.",
        [
          {
            text: "OK",
            onPress: () =>
              navigation.navigate("MoveOutStatusScreen", {
                requestId,
                property: bookingDetails,
              }),
          },
        ]
      );
      setSubmitting(false);
      setShowConfirmModal(false);
    } catch (error: any) {
      console.error("Error submitting move-out request:", error);
      const msg =
        error?.response?.data?.message ||
        error.message ||
        "Failed to submit move-out request";
      Alert.alert("Error", msg);
      setSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  const formatDate = (value: Date | string | null | undefined) => {
    if (!value) return "—";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const calculateNoticeDays = () => {
    if (!bookingDetails) return 0;
    const today = new Date();
    const diffTime = moveOutDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getTenancyDuration = () => {
    if (!bookingDetails) return 0;
    const today = new Date();
    const checkInDate = new Date(bookingDetails.checkInDate);
    const diffTime = today.getTime() - checkInDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F1F5F9] justify-center items-center">
        <Text className="text-slate-500 font-medium">Loading booking details...</Text>
      </SafeAreaView>
    );
  }

  if (!bookingDetails) {
    return (
      <SafeAreaView className="flex-1 bg-[#F1F5F9] justify-center items-center px-6">
        <Ionicons name="home-outline" size={64} color="#94A3B8" />
        <Text className="text-slate-500 font-bold text-center mt-4 text-lg">
          No Active Booking
        </Text>
        <Text className="text-slate-400 text-center mt-2">
          You don't have an active booking to request move-out
        </Text>
        <TouchableOpacity
          className="mt-6 bg-[#1E33FF] px-6 py-3 rounded-xl"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="bg-white px-6 py-5 flex-row items-center border-b border-slate-200 shadow-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1 -ml-1">
          <Ionicons name="arrow-back" size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-4 text-2xl font-black text-slate-900 tracking-tight">
          Move-Out Request
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="px-5">
        {/* Current Booking Info */}
        <View className="bg-white rounded-[24px] p-6 mt-6 shadow-sm border border-white">
          <Text className="text-lg font-black text-slate-900 mb-4">
            Current Booking Details
          </Text>

          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Property</Text>
              <Text className="font-bold text-slate-900">{bookingDetails.propertyName}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Room</Text>
              <Text className="font-bold text-slate-900">{bookingDetails.roomNumber}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Check-In Date</Text>
              <Text className="font-bold text-slate-900">{formatDate(bookingDetails.checkInDate)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Tenancy Duration</Text>
              <Text className="font-bold text-slate-900">{getTenancyDuration()} days</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Monthly Rent</Text>
              <Text className="font-bold text-slate-900">₹{bookingDetails.monthlyRent.toLocaleString()}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Security Deposit</Text>
              <Text className="font-bold text-slate-900">₹{bookingDetails.securityDeposit.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Move-Out Date Selection */}
        <View className="bg-white rounded-[24px] p-6 mt-4 shadow-sm border border-white">
          <Text className="text-lg font-black text-slate-900 mb-4">
            Preferred Move-Out Date
          </Text>

          <TouchableOpacity
            className="flex-row items-center justify-between bg-slate-50 rounded-xl p-4 mb-4"
            onPress={() => setShowDatePicker(true)}
          >
            <Text className="text-slate-900 font-medium">{formatDate(moveOutDate)}</Text>
            <Ionicons name="calendar-outline" size={20} color="#64748B" />
          </TouchableOpacity>

          {/* Notice Period Warning */}
          <View className={`p-4 rounded-xl ${isWithinNotice ? 'bg-orange-50' : 'bg-green-50'}`}>
            <View className="flex-row items-center mb-2">
              <Ionicons 
                name={isWithinNotice ? "warning-outline" : "checkmark-circle-outline"} 
                size={20} 
                color={isWithinNotice ? "#EA580C" : "#059669"} 
              />
              <Text className={`ml-2 font-bold ${isWithinNotice ? 'text-orange-600' : 'text-green-600'}`}>
                Notice Period: {calculateNoticeDays()} days
              </Text>
            </View>
            <Text className={`text-sm ${isWithinNotice ? 'text-orange-700' : 'text-green-700'}`}>
              {isWithinNotice 
                ? `Short notice! Required: ${bookingDetails.noticePeriodDays} days. Additional charges may apply.`
                : `Good! You're providing sufficient notice period.`
              }
            </Text>
            {isWithinNotice && penaltyAmount > 0 && (
              <Text className="text-orange-700 font-bold text-sm mt-1">
                Potential penalty: ₹{penaltyAmount.toLocaleString()}
              </Text>
            )}
          </View>
        </View>

        {/* Additional Comments */}
        <View className="bg-white rounded-[24px] p-6 mt-4 shadow-sm border border-white">
          <Text className="text-lg font-black text-slate-900 mb-4">
            Additional Comments <Text className="text-red-500">*</Text>
          </Text>

          <TextInput
            className="border border-slate-200 rounded-xl p-4 text-slate-900"
            placeholder="Please provide additional information for the admin (required)..."
            value={comments}
            onChangeText={setComments}
            multiline
            numberOfLines={3}
          />
        </View>

        
        {/* Submit Button */}
        <TouchableOpacity
          className="bg-[#1E33FF] py-4 rounded-xl mt-6"
          onPress={() => setShowConfirmModal(true)}
          disabled={!comments.trim()}
        >
          <Text className="text-center font-bold text-white text-lg">
            Submit Move-Out Request
          </Text>
        </TouchableOpacity>

        <View className="h-20" />
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={moveOutDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Confirmation Modal */}
      <Modal visible={showConfirmModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[24px] p-6">
            <Text className="text-xl font-black text-slate-900 mb-4">
              Confirm Move-Out Request
            </Text>
            
            <View className="bg-slate-50 rounded-xl p-4 mb-4">
              <Text className="font-bold text-slate-900 mb-2">Request Summary</Text>
              <Text className="text-slate-600 mb-1">
                <Text className="font-medium">Move-Out Date:</Text> {formatDate(moveOutDate)}
              </Text>
              <Text className="text-slate-600 mb-1">
                <Text className="font-medium">Notice Period:</Text> {calculateNoticeDays()} days
              </Text>
              <Text className="text-slate-600 mb-1">
                <Text className="font-medium">Comments:</Text> {comments.trim()}
              </Text>
              {isWithinNotice && (
                <Text className="text-orange-600 font-bold text-sm mt-2">
                  ⚠️ Short notice period - additional charges may apply
                </Text>
              )}
            </View>

            <Text className="text-slate-600 text-sm mb-4">
              Once submitted, your request will be sent to the admin for review. 
              You cannot modify the request after submission.
            </Text>

            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 bg-slate-100 py-4 rounded-xl"
                onPress={() => setShowConfirmModal(false)}
              >
                <Text className="text-center font-bold text-slate-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-[#1E33FF] py-4 rounded-xl"
                onPress={submitMoveOutRequest}
                disabled={submitting}
              >
                <Text className="text-center font-bold text-white">
                  {submitting ? 'Submitting...' : 'Confirm & Submit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}