import React, { useState, useEffect, useCallback } from "react";
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
import { MoveOutService } from "../services/moveOutService";
import { bookingApi, userApi } from "../utils/api";
import { saveInactiveTenant } from "../utils/inactiveTenantsStore";

export default function ProcessMoveOutScreen(props: any) {
  const { navigation, route } = props;
  const requestId = route?.params?.processId || route?.params?.requestId;

  const [moveOutData, setMoveOutData] = useState<any>(null);
  const [currentDue, setCurrentDue] = useState("");
  const [securityDepositReturned, setSecurityDepositReturned] = useState("");
  const [deductions, setDeductions] = useState<any[]>([]);
  const [showAddDeductionModal, setShowAddDeductionModal] = useState(false);
  const [deductionType, setDeductionType] = useState("");
  const [deductionAmount, setDeductionAmount] = useState("");
  const [deductionDescription, setDeductionDescription] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadMoveOutData = useCallback(async () => {
    if (!requestId) {
      setLoadError("No request ID");
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await MoveOutService.getRequestById(requestId);
      if (!res.success || !res.data) {
        setLoadError(res.error || "Failed to load move-out");
        setMoveOutData(null);
        return;
      }
      const r = res.data;
      const isAccepted = r.status === "accepted" || r.status === "approved";
      if (!isAccepted) {
        setLoadError("Only accepted move-outs can be processed");
        setMoveOutData(null);
        return;
      }
      let customerName = r.customerUniqueId || r.customerId || "Tenant";
      let mystayId = r.customerUniqueId || r.customerId || "—";
      let profile: any = null;
      let booking: any = null;
      const hasAlphaInUnique = typeof r.customerUniqueId === "string" && /[A-Za-z]/.test(r.customerUniqueId);
      if (r.customerUniqueId && hasAlphaInUnique) {
        try {
          const profileRes = await userApi.get(
            `/api/users/${encodeURIComponent(r.customerUniqueId)}/profile`,
            { timeout: 8000 }
          );
          const user = profileRes.data?.user;
          if (user) {
            profile = user;
            customerName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || customerName;
            mystayId = user.uniqueId || mystayId;
          }
        } catch {
          // keep default
        }
      } else if (r.customerId) {
        // Fallback for old owner-initiated records where customerUniqueId was stored as numeric id.
        try {
          const byIdRes = await userApi.get(
            `/api/users/${encodeURIComponent(String(r.customerId))}`,
            { timeout: 8000 }
          );
          const customer = byIdRes.data?.customer;
          if (customer) {
            profile = customer;
            customerName = [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() || customerName;
            mystayId = customer.uniqueId || mystayId;
          }
        } catch {
          // keep default
        }
      }
      if (r.customerId) {
        const bookRes = await bookingApi.get(`/api/bookings/customer/${encodeURIComponent(String(r.customerId))}`).catch(() => null);
        const bookings = bookRes?.data?.bookings || [];
        booking = bookings.find((b: any) => b.status === "active") || bookings[0] || null;
      }
      const securityDeposit = Number(r.securityDepositAmount) ?? 0;
      let currentDueVal = Number(r.currentDue) ?? 0;
      
      // If currentDue is not provided in the move-out request, try to get it from booking
      if (currentDueVal === 0 && booking) {
        // Calculate from booking data: unpaid security + unpaid rent
        const unpaidSecurity = booking.isSecurityPaid ? 0 : (Number(booking.securityDeposit) || 0);
        const unpaidRent = booking.isRentPaid ? 0 : (Number(booking.rentAmount) || 0);
        currentDueVal = unpaidSecurity + unpaidRent;
      }
      
      const ownerFilledReturned = Number(r.securityDepositReturned) ?? null;
      
      setMoveOutData({
        processId: requestId,
        requestId,
        customerName,
        mystayId,
        customerId: r.customerId,
        profile,
        booking,
        roomNumber: r.roomNumber || "—",
        propertyName: r.propertyName || "—",
        propertyId: r.propertyId,
        roomId: r.roomId,
        moveInDate: r.submissionDate,
        moveOutDate: r.requestedDate,
        monthlyRent: 0,
        currentDue: currentDueVal,
        securityDeposit,
        ownerFilledReturned,
        type: "customer_initiated",
        status: "scheduled",
      });
      setCurrentDue(String(currentDueVal));
      // If owner already filled the returned amount, use that; otherwise auto-calculate
      if (ownerFilledReturned !== null && ownerFilledReturned >= 0) {
        setSecurityDepositReturned(String(ownerFilledReturned));
      } else {
        setSecurityDepositReturned(String(Math.max(0, securityDeposit - currentDueVal)));
      }
    } catch {
      setLoadError("Failed to load move-out");
      setMoveOutData(null);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    loadMoveOutData();
  }, [loadMoveOutData]);

  // Auto-calculate securityDepositReturned only if owner didn't fill it
  useEffect(() => {
    if (moveOutData && currentDue !== "") {
      // Only auto-calculate if owner didn't pre-fill it
      if (!moveOutData.ownerFilledReturned || moveOutData.ownerFilledReturned === null) {
        const due = parseFloat(currentDue) || 0;
        const returned = moveOutData.securityDeposit - due;
        setSecurityDepositReturned(Math.max(0, returned).toString());
      }
    }
  }, [currentDue, moveOutData]);

  const formatDate = (value: Date | string | null | undefined) => {
    if (value == null) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getTenancyDuration = () => {
    if (!moveOutData) return 0;
    const moveInDate = new Date(moveOutData.moveInDate);
    const moveOutDate = new Date(moveOutData.moveOutDate);
    const diffTime = moveOutDate.getTime() - moveInDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getTotalDeductions = () => {
    return deductions.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
  };

  const getFinalRefundAmount = () => {
    const returned = parseFloat(securityDepositReturned || "0");
    return returned;
  };

  const isAmountToBeCollected = () => {
    const due = parseFloat(currentDue || "0");
    const deposit = moveOutData?.securityDeposit || 0;
    return due > deposit;
  };

  const getFinalAmount = () => {
    const due = parseFloat(currentDue || "0");
    const deposit = moveOutData?.securityDeposit || 0;
    const deductions = getTotalDeductions();
    return Math.abs(deposit - due - deductions);
  };

  const addDeduction = () => {
    if (!deductionType || !deductionAmount || !deductionDescription) {
      Alert.alert('Error', 'Please fill all deduction fields');
      return;
    }

    const amount = parseFloat(deductionAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const newDeduction = {
      id: Date.now().toString(),
      type: deductionType,
      amount: amount,
      description: deductionDescription
    };

    setDeductions([...deductions, newDeduction]);
    setDeductionType("");
    setDeductionAmount("");
    setDeductionDescription("");
    setShowAddDeductionModal(false);
  };

  const removeDeduction = (id: string) => {
    setDeductions(deductions.filter(d => d.id !== id));
  };

  const validateForm = () => {
    if (!securityDepositReturned) {
      Alert.alert('Error', 'Please enter security deposit amount returned');
      return false;
    }

    const returned = parseFloat(securityDepositReturned);
    if (isNaN(returned) || returned < 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return false;
    }

    if (returned > moveOutData.securityDeposit) {
      Alert.alert('Error', 'Returned amount cannot exceed security deposit');
      return false;
    }

    return true;
  };

  const handleConfirmMoveOut = () => {
    if (!validateForm()) return;
    setShowConfirmModal(true);
  };

  const confirmMoveOut = async () => {
    if (!requestId || !moveOutData) return;
    setLoading(true);
    try {
      const res = await MoveOutService.approveRequest(requestId, {
        currentDue: parseFloat(currentDue || "0") || 0,
        securityDepositReturned: parseFloat(securityDepositReturned || "0"),
      });
      setShowConfirmModal(false);
      if (res.success) {
        const profile = moveOutData.profile || {};
        const booking = moveOutData.booking || {};
        await saveInactiveTenant({
          id: String(moveOutData.customerId || moveOutData.mystayId),
          uniqueId: String(moveOutData.mystayId || moveOutData.customerId),
          firstName: profile.firstName || moveOutData.customerName.split(" ")[0] || "Tenant",
          lastName: profile.lastName || moveOutData.customerName.split(" ").slice(1).join(" ") || "",
          name: moveOutData.customerName,
          phone: profile.phone || "Not provided",
          email: profile.email || "Not provided",
          sex: profile.sex,
          profession: profile.profession,
          emergencyName: profile.emergencyName,
          emergencyPhone: profile.emergencyPhone,
          aadhaarStatus: profile.aadhaarStatus,
          kycStatus: profile.kycStatus,
          profileImage: profile.profileExtras?.profileImage || profile.profileImage,
          profileExtras: profile.profileExtras || {},
          roomId: moveOutData.roomId || booking.roomId,
          roomNumber: moveOutData.roomNumber,
          floor: booking.room?.floor,
          propertyId: moveOutData.propertyId || booking.room?.propertyId,
          propertyName: moveOutData.propertyName || booking.room?.propertyName,
          moveInDate: booking.moveInDate || moveOutData.moveInDate,
          moveOutDate: moveOutData.moveOutDate,
          securityDeposit: moveOutData.securityDeposit,
          currentDue: moveOutData.currentDue,
          settlement: {
            securityDepositReturned: parseFloat(securityDepositReturned || "0"),
            deductions: getTotalDeductions(),
          },
          movedOutAt: new Date().toISOString(),
          moveOutRequestId: requestId,
          status: "inactive",
        });
        Alert.alert(
          "Success",
          "Move-out processed successfully. Tenant marked as moved out and notification sent.",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert("Error", res.error || "Failed to complete move-out");
      }
    } catch {
      Alert.alert("Error", "Failed to complete move-out");
    } finally {
      setLoading(false);
    }
  };

  if (loadError) {
    return (
      <SafeAreaView className="flex-1 bg-[#F1F5F9] justify-center items-center px-6">
        <Text className="text-slate-500 font-medium text-center">{loadError}</Text>
        <TouchableOpacity className="mt-4 bg-[#1E33FF] px-4 py-2 rounded-xl" onPress={() => navigation.goBack()}>
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  if (!moveOutData) {
    return (
      <SafeAreaView className="flex-1 bg-[#F1F5F9] justify-center items-center">
        <Text className="text-slate-500 font-medium">{loading ? "Loading..." : "No data"}</Text>
      </SafeAreaView>
    );
  }

  const daysUntilMoveOut = Math.ceil((new Date(moveOutData.moveOutDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="bg-white px-6 py-5 flex-row items-center border-b border-slate-200 shadow-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1 -ml-1">
          <Ionicons name="arrow-back" size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-4 text-2xl font-black text-slate-900 tracking-tight">
          Process Move-Out
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="px-5">
        {/* Move-Out Alert */}
        <View className={`rounded-[24px] p-6 mt-6 ${
          daysUntilMoveOut <= 0 ? 'bg-red-50' : daysUntilMoveOut === 1 ? 'bg-orange-50' : 'bg-blue-50'
        }`}>
          <View className="flex-row items-center">
            <Ionicons 
              name={daysUntilMoveOut <= 0 ? "alert-circle" : "calendar"} 
              size={24} 
              color={daysUntilMoveOut <= 0 ? "#DC2626" : daysUntilMoveOut === 1 ? "#EA580C" : "#1E33FF"} 
            />
            <Text className={`ml-3 font-black text-lg ${
              daysUntilMoveOut <= 0 ? 'text-red-900' : daysUntilMoveOut === 1 ? 'text-orange-900' : 'text-blue-900'
            }`}>
              {daysUntilMoveOut <= 0 ? 'Move-Out Date Today!' : daysUntilMoveOut === 1 ? 'Move-Out Tomorrow' : `${daysUntilMoveOut} days until move-out`}
            </Text>
          </View>
        </View>

        {/* Customer Info */}
        <View className="bg-white rounded-[24px] p-6 mt-4 shadow-sm border border-white">
          <Text className="text-lg font-black text-slate-900 mb-4">
            Customer Information
          </Text>

          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Name</Text>
              <Text className="font-bold text-slate-900">{moveOutData.customerName}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">MyStay ID</Text>
              <Text className="font-bold text-blue-600">{moveOutData.mystayId}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Room</Text>
              <Text className="font-bold text-slate-900">
                {moveOutData.roomNumber} • {moveOutData.propertyName}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Move-In Date</Text>
              <Text className="font-bold text-slate-900">{formatDate(moveOutData.moveInDate)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Move-Out Date</Text>
              <Text className="font-bold text-slate-900">{formatDate(moveOutData.moveOutDate)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Tenancy Duration</Text>
              <Text className="font-bold text-slate-900">{getTenancyDuration()} days</Text>
            </View>
          </View>
        </View>

        {/* Financial Summary */}
        <View className="bg-white rounded-[24px] p-6 mt-4 shadow-sm border border-white">
          <Text className="text-lg font-black text-slate-900 mb-4">
            Financial Summary
          </Text>

          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Monthly Rent</Text>
              <Text className="font-bold text-slate-900">₹{moveOutData.monthlyRent.toLocaleString()}</Text>
            </View>
            
            {/* Editable Current Due */}
            <View>
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-slate-500 font-medium">Current Due (Total Unpaid)</Text>
                <Text className="text-xs text-slate-400">(Editable)</Text>
              </View>
              <View className="flex-row items-center bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                <Text className="text-slate-500 font-bold">₹</Text>
                <TextInput
                  className="flex-1 ml-2 text-slate-900 font-bold"
                  placeholder="0"
                  value={currentDue}
                  onChangeText={setCurrentDue}
                  keyboardType="numeric"
                />
              </View>
              <Text className="text-slate-400 text-xs mt-2">
                Enter total unpaid rent amount (from tenant's current stay card)
              </Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Security Deposit</Text>
              <Text className="font-bold text-slate-900">₹{moveOutData.securityDeposit.toLocaleString()}</Text>
            </View>
          </View>
        </View>

      

        {/* Security Deposit Settlement */}
        <View className="bg-white rounded-[24px] p-6 mt-4 shadow-sm border border-white">
          

          <View className="mb-4">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-slate-600 font-medium">Amount Returned to Customer</Text>
              {moveOutData?.ownerFilledReturned !== null && moveOutData?.ownerFilledReturned >= 0 && (
                <Text className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">From Owner</Text>
              )}
            </View>
            <View className="flex-row items-center bg-slate-50 rounded-xl px-4 py-3">
              <Text className="text-slate-500 font-bold text-lg">₹</Text>
              <TextInput
                className="flex-1 ml-2 text-slate-900 font-bold text-lg"
                placeholder="0"
                value={securityDepositReturned}
                onChangeText={setSecurityDepositReturned}
                keyboardType="numeric"
              />
            </View>
            <Text className="text-slate-400 text-xs mt-2">
              {moveOutData?.ownerFilledReturned !== null && moveOutData?.ownerFilledReturned >= 0 
                ? "Owner filled this value during move-out initiation. Auto-adjusts when current due changes."
                : "Auto-calculated after deducting current due. You can adjust if needed."}
            </Text>
          </View>

          {securityDepositReturned && (
            <View className="bg-green-50 rounded-xl p-4">
              <View className="flex-row justify-between mb-2">
                <Text className="text-green-800 font-medium">Security Deposit</Text>
                <Text className="text-green-900 font-bold">₹{moveOutData.securityDeposit.toLocaleString()}</Text>
              </View>
              {parseFloat(currentDue || "0") > 0 && (
                <View className="flex-row justify-between mb-2">
                  <Text className="text-red-800 font-medium">Due Deducted</Text>
                  <Text className="text-red-900 font-bold">-₹{parseFloat(currentDue || "0").toLocaleString()}</Text>
                </View>
              )}
              {deductions.length > 0 && (
                <>
                  {deductions.map((d) => (
                    <View key={d.id} className="flex-row justify-between items-center mb-2">
                      <Text className="text-red-800 font-medium flex-1">{d.type}: ₹{(d.amount || 0).toLocaleString()}</Text>
                      <TouchableOpacity onPress={() => removeDeduction(d.id)} className="p-1">
                        <Ionicons name="close-circle" size={20} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-red-800 font-medium">Other Deductions Total</Text>
                    <Text className="text-red-900 font-bold">-₹{getTotalDeductions().toLocaleString()}</Text>
                  </View>
                </>
              )}
              <View className="flex-row justify-between pt-2 border-t border-green-200">
                <Text className="text-green-900 font-black">
                  {isAmountToBeCollected() ? 'Amount to be Collected' : 'Final Amount Returned'}
                </Text>
                <Text className={`font-black text-lg ${isAmountToBeCollected() ? 'text-red-600' : 'text-green-900'}`}>
                  ₹{getFinalAmount().toLocaleString()}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          className="bg-[#1E33FF] py-4 rounded-xl mt-6"
          onPress={handleConfirmMoveOut}
          disabled={!securityDepositReturned}
        >
          <Text className="text-center font-bold text-white text-lg">
            Confirm Move-Out & Update Status
          </Text>
        </TouchableOpacity>

        <View className="h-20" />
      </ScrollView>

      {/* Add Deduction Modal */}
      <Modal visible={showAddDeductionModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[24px] p-6">
            <Text className="text-xl font-black text-slate-900 mb-4">
              Add Deduction
            </Text>

            <View className="mb-4">
              <Text className="text-slate-600 font-medium mb-2">Deduction Type</Text>
              <View className="flex-row flex-wrap">
                {['Cleaning', 'Damage', 'Utilities', 'Penalty', 'Other'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    className={`px-4 py-2 rounded-xl mr-2 mb-2 ${
                      deductionType === type ? 'bg-blue-500' : 'bg-slate-100'
                    }`}
                    onPress={() => setDeductionType(type)}
                  >
                    <Text className={`font-bold ${
                      deductionType === type ? 'text-white' : 'text-slate-600'
                    }`}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-slate-600 font-medium mb-2">Amount</Text>
              <View className="flex-row items-center bg-slate-50 rounded-xl px-4 py-3">
                <Text className="text-slate-500 font-bold">₹</Text>
                <TextInput
                  className="flex-1 ml-2 text-slate-900 font-bold"
                  placeholder="0"
                  value={deductionAmount}
                  onChangeText={setDeductionAmount}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-slate-600 font-medium mb-2">Description</Text>
              <TextInput
                className="border border-slate-200 rounded-xl p-4 text-slate-900"
                placeholder="Describe the deduction reason..."
                value={deductionDescription}
                onChangeText={setDeductionDescription}
                multiline
                numberOfLines={2}
              />
            </View>

            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 bg-slate-100 py-4 rounded-xl"
                onPress={() => {
                  setShowAddDeductionModal(false);
                  setDeductionType("");
                  setDeductionAmount("");
                  setDeductionDescription("");
                }}
              >
                <Text className="text-center font-bold text-slate-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-[#1E33FF] py-4 rounded-xl"
                onPress={addDeduction}
              >
                <Text className="text-center font-bold text-white">Add Deduction</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <Modal visible={showConfirmModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[24px] p-6">
            <Text className="text-xl font-black text-slate-900 mb-4">
              Confirm Move-Out Processing
            </Text>
            
            <View className="bg-slate-50 rounded-xl p-4 mb-4">
              <Text className="font-bold text-slate-900 mb-2">Summary</Text>
              <Text className="text-slate-600 mb-1">
                • Customer: {moveOutData.customerName}
              </Text>
              <Text className="text-slate-600 mb-1">
                • Room: {moveOutData.roomNumber}
              </Text>
              <Text className="text-slate-600 mb-1">
                • Security Deposit: ₹{moveOutData.securityDeposit.toLocaleString()}
              </Text>
              {getTotalDeductions() > 0 && (
                <Text className="text-slate-600 mb-1">
                  • Deductions: ₹{getTotalDeductions().toLocaleString()}
                </Text>
              )}
              <Text className="text-green-600 font-bold mt-2">
                • Amount Returned: ₹{getFinalRefundAmount().toLocaleString()}
              </Text>
            </View>

            <Text className="text-slate-600 text-sm mb-4">
              This will:
              {'\n'}• Mark the tenant as inactive (not allocated any bed)
              {'\n'}• Update bed status to empty after move-out date
              {'\n'}• Complete the move-out process
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
                onPress={confirmMoveOut}
                disabled={loading}
              >
                <Text className="text-center font-bold text-white">
                  {loading ? 'Processing...' : 'Confirm'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}