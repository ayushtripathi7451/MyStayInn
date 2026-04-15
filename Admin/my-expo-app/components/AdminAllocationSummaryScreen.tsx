import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { bookingApi } from "../utils/api";

export default function AdminAllocationSummaryScreen({ navigation, route }: any) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isAllocating, setIsAllocating] = useState(false);
  const [allocationError, setAllocationError] = useState<string | null>(null);

  // Get data from route params (propertyId = current property so tenant is assigned only to it)
  const allocationData = route?.params?.data;
  const customer = route?.params?.customer;
  const propertyId = route?.params?.propertyId;
  const enrollmentRequestId = route?.params?.enrollmentRequestId;

  // Format dates
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    return new Date(date).toLocaleDateString('en-GB', options);
  };

  // Get floor label
  const getFloorLabel = (floor: number): string => {
    if (floor === 0) return "Ground Floor";
    if (floor === 1) return "1st Floor";
    if (floor === 2) return "2nd Floor";
    if (floor === 3) return "3rd Floor";
    return `${floor}th Floor`;
  };

  // Build summary from real data
  const FINAL_SUMMARY = {
    customer: {
      name: customer?.name || "Unknown Customer",
      mystayId: customer?.mystayId || "N/A",
      photo: customer?.photo || "https://ui-avatars.com/api/?name=" + encodeURIComponent(customer?.name || "User") + "&size=300&background=3B82F6&color=fff&bold=true",
      phone: customer?.displayPhone || customer?.phone || "N/A",
      email: customer?.email || "N/A",
      kycStatus: customer?.kycStatus || "Unverified",
    },
    allocation: {
      floor: allocationData?.selectedRoom ? getFloorLabel(allocationData.selectedRoom.floor) : "N/A",
      room: allocationData?.selectedRoom && allocationData?.selectedBeds 
        ? `Room ${allocationData.selectedRoom.roomNumber}-${allocationData.selectedBeds.sort().join(',')}`
        : "N/A",
      isSingleOccupancy: allocationData?.isSingleOccupancy || false,
      moveIn: allocationData?.moveIn ? formatDate(allocationData.moveIn) : "N/A",
      moveOut: allocationData?.moveOut ? formatDate(allocationData.moveOut) : "N/A",
      roomPreference: allocationData?.roomPreference || "—",
      comments: allocationData?.comments || "—",
    },
    payment: {
      securityDeposit: allocationData?.securityDeposit || "0",
      isSecurityPaid: allocationData?.isSecurityPaid || false,
      monthlyRent: allocationData?.selectedRoom?.pricePerMonth || "0",
      rentPeriod: allocationData?.rentPeriod || "month",
      onlineReceived: allocationData?.onlinePayment || "0",
      cashReceived: allocationData?.cashPayment || "0",
    },
  };

  const handleConfirmAllocation = async () => {
    try {
      setIsAllocating(true);
      setAllocationError(null);

      const customerName = FINAL_SUMMARY.customer.name;
      const roomNumber = FINAL_SUMMARY.allocation.room;
      
      // Extract room and bed numbers from format "Room 204-A,B,C"
      const roomMatch = roomNumber.match(/Room\s+(\d+)-([A-Z,]+)/);
      const room = roomMatch ? roomMatch[1] : roomNumber;
      const beds = roomMatch ? roomMatch[2].split(',') : [];

      // Prepare booking data (enrollmentRequestId so backend removes that request from the list)
      const bookingPayload = {
        customerId: customer?.customerId ?? customer?.id,
        ...(propertyId != null && { propertyId }),
        ...(enrollmentRequestId != null && enrollmentRequestId !== "" && { enrollmentRequestId }),
        roomId: allocationData?.selectedRoom?.id,
        bedNumbers: beds.length > 0 ? beds : null, // Array of bed numbers
        isSingleOccupancy: allocationData?.isSingleOccupancy || false,
        moveInDate: allocationData?.moveIn instanceof Date ? allocationData.moveIn.toISOString() : allocationData?.moveIn,
        moveOutDate: allocationData?.moveOut ? (allocationData.moveOut instanceof Date ? allocationData.moveOut.toISOString() : allocationData.moveOut) : undefined,
        securityDeposit: allocationData?.securityDeposit || 0,
        isSecurityPaid: allocationData?.isSecurityPaid || false,
        rentAmount: allocationData?.selectedRoom?.pricePerMonth || 0,
        rentPeriod: allocationData?.rentPeriod || "month",
        onlinePaymentRecv: allocationData?.onlinePayment || 0,
        cashPaymentRecv: allocationData?.cashPayment || 0,
        notes: `Allocated to ${customerName}${allocationData?.isSingleOccupancy ? ' (Single Occupancy)' : ''} | Room preference: ${allocationData?.roomPreference || '—'} | Comments: ${allocationData?.comments || '—'}`,
      };

      console.log("[AdminAllocationSummary] Allocating room with payload:", bookingPayload);

      // Call booking service API
      const response = await bookingApi.post("/api/bookings/allocate-room", bookingPayload);

      if (response.data.success) {
        if (response.data.payPendingOnly) {
          setSuccessMessage(
            response.data.message ||
              "Marked as pay pending. Collect security deposit, then confirm with deposit marked paid."
          );
          setShowSuccessMessage(true);
          setTimeout(() => {
            setShowSuccessMessage(false);
            setIsAllocating(false);
            navigation.navigate("CustomersScreen", { initialTab: "enrollment", refreshEnrollmentList: true });
          }, 2200);
          return;
        }

        const bedText = beds.length > 1 
          ? `Beds ${beds.join(', ')}` 
          : beds.length === 1 
            ? `Bed ${beds[0]}` 
            : '';
        
        const occupancyText = allocationData?.isSingleOccupancy ? ' (Single Occupancy)' : '';
        
        const message = bedText 
          ? `${customerName} allocated with Room ${room} ${bedText}${occupancyText}`
          : `${customerName} allocated with ${roomNumber}${occupancyText}`;
        
        // Show custom success message
        setSuccessMessage(message);
        setShowSuccessMessage(true);
        
        console.log("[AdminAllocationSummary] Booking created successfully:", response.data.booking);
        
        // Navigate after 2 seconds; pass flag so CustomersScreen refetches enrollment list and the accepted request disappears
        setTimeout(() => {
          setShowSuccessMessage(false);
          setIsAllocating(false);
          navigation.navigate("CustomersScreen", { initialTab: "enrollment", refreshEnrollmentList: true });
        }, 2000);
      } else {
        throw new Error(response.data.message || "Failed to allocate room");
      }
    } catch (error: any) {
      console.error("[AdminAllocationSummary] Error allocating room:", error);
      setIsAllocating(false);
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to allocate room. Please try again.";
      setAllocationError(msg);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">
      <StatusBar barStyle="dark-content" />

      {/* ================= CUSTOM SUCCESS MESSAGE ================= */}
      {showSuccessMessage && (
        <View className="absolute top-0 left-0 right-0 z-50 px-6 pt-4">
          <View className="bg-green-500 rounded-2xl p-4 shadow-lg flex-row items-center">
            <View className="bg-white/20 p-2 rounded-full mr-3">
              <Ionicons name="checkmark-circle" size={24} color="white" />
            </View>
            <Text className="text-white font-bold text-base flex-1">
              {successMessage}
            </Text>
          </View>
        </View>
      )}

      {/* ================= IMAGE PREVIEW MODAL ================= */}
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
            <Image
              source={{ uri: previewImage }}
              className="w-full h-[70%]"
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* ================= HEADER ================= */}
      <View className="bg-white px-6 py-5 flex-row items-center border-b border-slate-200 shadow-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1 -ml-1">
          <Ionicons name="arrow-back" size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-4 text-2xl font-black text-slate-900 tracking-tight">
          Review & Confirm
        </Text>
      </View>

      {allocationError ? (
        <View className="mx-5 mt-3 bg-rose-50 border border-rose-200 rounded-xl p-3">
          <Text className="text-rose-800 text-sm">{allocationError}</Text>
        </View>
      ) : null}

      <ScrollView showsVerticalScrollIndicator={false} className="px-5">

        {/* ================= CUSTOMER DETAILS ================= */}
        <View className="bg-white rounded-[32px] p-6 mt-6 shadow-sm border border-white">
          <Text className="text-[12px] font-black text-[#1E33FF] uppercase tracking-[2px] mb-5">
            Customer Details
          </Text>

          <View className="flex-row items-center">
            {/* IMAGE WITH PREVIEW */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setPreviewImage(FINAL_SUMMARY.customer.photo)}
            >
              <View>
                <Image
                  source={{ uri: FINAL_SUMMARY.customer.photo }}
                  className="w-20 h-20 rounded-[24px] bg-slate-100"
                />
                <View className="absolute bottom-0 right-0 bg-[#1E33FF] p-1 rounded-lg border-2 border-white">
                  <Ionicons name="expand" size={12} color="white" />
                </View>
              </View>
            </TouchableOpacity>

            <View className="ml-5 flex-1">
              <Text className="text-xl font-black text-slate-900">
                {FINAL_SUMMARY.customer.name}
              </Text>
              
              {/* MyStayInnID - Bold Display */}
              <Text className="text-base font-black text-[#1E33FF] mt-1">
                {FINAL_SUMMARY.customer.mystayId}
              </Text>
              
              <Text className="text-slate-500 font-bold mt-1">
                {FINAL_SUMMARY.customer.phone}
              </Text>
              
              {/* Email */}
              {FINAL_SUMMARY.customer.email !== "N/A" && (
                <Text className="text-slate-400 text-sm mt-1">
                  {FINAL_SUMMARY.customer.email}
                </Text>
              )}
              
              {/* KYC Status */}
              <View className="flex-row items-center mt-2">
                <Text className={`text-[11px] font-black uppercase ${
                  FINAL_SUMMARY.customer.kycStatus === 'Verified' ? 'text-green-600' : 'text-orange-600'
                }`}>
                  KYC: {FINAL_SUMMARY.customer.kycStatus}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ================= ROOM ALLOCATION ================= */}
        <View className="bg-white rounded-[32px] p-6 mt-4 shadow-sm border border-white">
          <Text className="text-[12px] font-black text-[#1E33FF] uppercase tracking-[2px] mb-5">
            Room Allocated
          </Text>

          <View className="flex-row justify-between mb-6">
            <SummaryItem label="Floor" value={FINAL_SUMMARY.allocation.floor} />
            <View className="flex-1 items-end">
              <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Room & Bed
              </Text>
              <Text className="text-base font-bold text-slate-900">{FINAL_SUMMARY.allocation.room}</Text>
              {FINAL_SUMMARY.allocation.isSingleOccupancy && (
                <View className="mt-1 bg-green-100 px-2 py-0.5 rounded-md">
                  <Text className="text-[9px] font-bold text-green-700 uppercase">Single Occupancy</Text>
                </View>
              )}
            </View>
          </View>

          <View className="flex-row justify-between pt-5 border-t border-slate-50">
            <SummaryItem label="Move In" value={FINAL_SUMMARY.allocation.moveIn} />
            <SummaryItem label="Move Out" value={FINAL_SUMMARY.allocation.moveOut} align="items-end" />
          </View>
          <View className="pt-4 mt-4 border-t border-slate-50">
            <SummaryItem label="Room Preference" value={FINAL_SUMMARY.allocation.roomPreference} />
            <View className="mt-3">
              <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Comments
              </Text>
              <Text className="text-base font-bold text-slate-900">{FINAL_SUMMARY.allocation.comments}</Text>
            </View>
          </View>
        </View>

        {/* ================= FINANCIAL SUMMARY ================= */}
        <View className="bg-white rounded-[32px] p-6 mt-4 shadow-sm border border-white">
          <Text className="text-[12px] font-black text-[#1E33FF] uppercase tracking-[2px] mb-5">
            Financial Summary
          </Text>

          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-slate-500 font-bold">Security Deposit</Text>
              {FINAL_SUMMARY.payment.isSecurityPaid && (
                <Text className="text-[10px] font-black text-green-600 uppercase">
                  Paid
                </Text>
              )}
            </View>
            <Text className="text-lg font-black text-slate-900">
              ₹{FINAL_SUMMARY.payment.securityDeposit}
            </Text>
          </View>

          <View className="flex-row justify-between items-center mb-4 py-4 border-y border-slate-50">
            <View>
              <Text className="text-slate-500 font-bold">Rent Amount</Text>
              <Text className="text-[10px] font-medium text-slate-400 uppercase mt-0.5">
                per {FINAL_SUMMARY.payment.rentPeriod}
              </Text>
            </View>
            <Text className="text-lg font-black text-slate-900">
              ₹{FINAL_SUMMARY.payment.monthlyRent}
            </Text>
          </View>

          <View className="bg-slate-50 rounded-2xl p-4 mt-2">
            <View className="flex-row justify-between mb-2">
              <Text className="text-slate-500 font-medium">Online Received</Text>
              <Text className="font-bold text-slate-900">
                ₹{FINAL_SUMMARY.payment.onlineReceived}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Cash Received</Text>
              <Text className="font-bold text-slate-900">
                ₹{FINAL_SUMMARY.payment.cashReceived}
              </Text>
            </View>
          </View>
        </View>

        <View className="h-40" />
      </ScrollView>

      {/* ================= CONFIRM BUTTON ================= */}
      <View className="absolute bottom-0 left-0 right-0 bg-white/90 px-6 pt-4 pb-10 border-t border-slate-200">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleConfirmAllocation}
          disabled={isAllocating}
          className={`h-16 ${isAllocating ? "bg-slate-400" : "bg-[#1E33FF]"} rounded-[22px] justify-center items-center shadow-xl shadow-blue-300`}
        >
          {isAllocating ? (
            <ActivityIndicator size="large" color="white" />
          ) : (
            <Text className="text-white font-black text-lg tracking-tight">
              Confirm Allocation
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* ================= HELPER ================= */
const SummaryItem = ({ label, value, align = "items-start" }: any) => (
  <View className={`flex-1 ${align}`}>
    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
      {label}
    </Text>
    <Text className="text-base font-bold text-slate-900">{value}</Text>
  </View>
);
