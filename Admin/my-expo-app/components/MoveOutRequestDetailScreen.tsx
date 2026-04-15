import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Modal,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { MoveOutService } from "../services/moveOutService";
import { userApi } from "../utils/api";

export default function MoveOutRequestDetailScreen(props: any) {
  const { navigation, route } = props;
  const requestId = route?.params?.requestId;
  const action = route?.params?.action || "view";

  const [customerData, setCustomerData] = useState<any>(null);
  const [adminComment, setAdminComment] = useState("");
  const [securityDepositReturned, setSecurityDepositReturned] = useState("");
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadCustomerData = useCallback(async () => {
    if (!requestId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await MoveOutService.getRequestById(requestId);
      if (!res.success || !res.data) {
        setLoadError(res.error || "Failed to load request");
        setCustomerData(null);
        return;
      }
      const r = res.data;
      let customerName = r.customerUniqueId || r.customerId || "Tenant";
      let mystayId = r.customerUniqueId || r.customerId || "—";
      let phone = "";
      let email = "";
      const hasAlphaInUnique = typeof r.customerUniqueId === "string" && /[A-Za-z]/.test(r.customerUniqueId);
      if (r.customerUniqueId && hasAlphaInUnique) {
        try {
          const profileRes = await userApi.get(`/api/users/${encodeURIComponent(r.customerUniqueId)}/profile`, { timeout: 8000 });
          const user = profileRes.data?.user;
          if (user) {
            customerName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || customerName;
            phone = user.phone || "";
            email = user.email || "";
            mystayId = user.uniqueId || mystayId;
          }
        } catch {
          // keep defaults
        }
      } else if (r.customerId) {
        // Fallback for old owner-initiated records where customerUniqueId was stored as numeric id.
        try {
          const byIdRes = await userApi.get(`/api/users/${encodeURIComponent(String(r.customerId))}`, { timeout: 8000 });
          const customer = byIdRes.data?.customer;
          if (customer) {
            customerName = [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() || customerName;
            phone = customer.phone || "";
            email = customer.email || "";
            mystayId = customer.uniqueId || mystayId;
          }
        } catch {
          // keep defaults
        }
      }
      setCustomerData({
        requestId: r.requestId,
        customerName,
        mystayId,
        roomNumber: r.roomNumber || "—",
        propertyName: r.propertyName || "—",
        moveInDate: r.submissionDate,
        requestedMoveOutDate: r.requestedDate,
        submissionDate: r.submissionDate,
        customerComments: r.customerComments,
        noticePeriodDays: r.noticePeriodDays ?? 0,
        isWithinNotice: r.isWithinNotice ?? false,
        currentDue: r.currentDue ?? 0,
        securityDeposit: r.securityDepositAmount ?? 0,
        monthlyRent: 0,
        status: r.status === "requested" ? "pending" : r.status === "accepted" ? "accepted" : r.status,
        phone,
        email,
      });
    } catch {
      setLoadError("Failed to load request");
      setCustomerData(null);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    if (requestId) loadCustomerData();
    else setLoadError("No request ID");
  }, [requestId, loadCustomerData]);

  const formatDate = (value: Date | string | null | undefined) => {
    if (value == null) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getTenancyDuration = () => {
    if (!customerData) return 0;
    const today = new Date();
    const moveInDate = new Date(customerData.moveInDate);
    const diffTime = today.getTime() - moveInDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleApprove = () => {
   
    setShowApproveModal(true);
  };

  const confirmApprove = async () => {
    if (!requestId) return;
    setLoading(true);
    setActionError(null);
    try {
      const res = await MoveOutService.acceptRequest(requestId, adminComment);
      setShowApproveModal(false);
      if (res.success) {
        navigation.goBack();
      } else {
        setActionError(res.error || "Failed to accept request");
      }
    } catch {
      setActionError("Failed to accept request");
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = () => {
    setActionError(null);
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    if (!requestId) return;
    setLoading(true);
    setActionError(null);
    try {
      const res = await MoveOutService.cancelRequest(requestId);
      setShowCancelModal(false);
      if (res.success) {
        navigation.goBack();
      } else {
        setActionError(res.error || "Failed to cancel request");
      }
    } catch {
      setActionError("Failed to cancel request");
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
  if (!customerData) {
    return (
      <SafeAreaView className="flex-1 bg-[#F1F5F9] justify-center items-center">
        <Text className="text-slate-500 font-medium">Loading...</Text>
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

      {actionError ? (
        <View className="mx-5 mt-3 bg-rose-50 border border-rose-200 rounded-xl p-3">
          <Text className="text-rose-800 text-sm">{actionError}</Text>
        </View>
      ) : null}

      <ScrollView showsVerticalScrollIndicator={false} className="px-5">
        {/* Customer Info */}
        <View className="bg-white rounded-[24px] p-6 mt-6 shadow-sm border border-white">
          <Text className="text-lg font-black text-slate-900 mb-4">
            Customer Information
          </Text>

          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Name</Text>
              <Text className="font-bold text-slate-900">{customerData.customerName}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">MyStay ID</Text>
              <Text className="font-bold text-blue-600">{customerData.mystayId}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Room</Text>
              <Text className="font-bold text-slate-900">
                {customerData.roomNumber} • {customerData.propertyName}
              </Text>
            </View>
            {(customerData.phone || customerData.email) && (
              <>
                {customerData.phone ? (
                  <View className="flex-row justify-between items-center">
                    <Text className="text-slate-500 font-medium">Phone</Text>
                    <TouchableOpacity
                      className="flex-row items-center"
                      onPress={() => {
                        const raw = String(customerData.phone || "").trim();
                        if (!raw) {
                          setActionError("No phone number on file");
                          return;
                        }
                        Linking.openURL(`tel:${raw}`).catch(() =>
                          setActionError("Could not start phone call")
                        );
                      }}
                    >
                      <Text className="font-bold text-slate-900 mr-2">{customerData.phone}</Text>
                      <Ionicons name="call" size={16} color="#1E33FF" />
                    </TouchableOpacity>
                  </View>
                ) : null}
                {customerData.email ? (
                  <View className="flex-row justify-between">
                    <Text className="text-slate-500 font-medium">Email</Text>
                    <Text className="font-bold text-slate-900">{customerData.email}</Text>
                  </View>
                ) : null}
              </>
            )}
          </View>
        </View>

        {/* Booking Details */}
        <View className="bg-white rounded-[24px] p-6 mt-4 shadow-sm border border-white">
          <Text className="text-lg font-black text-slate-900 mb-4">
            Booking Details
          </Text>

          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Move-In Date</Text>
              <Text className="font-bold text-slate-900">{formatDate(customerData.moveInDate)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Tenancy Duration</Text>
              <Text className="font-bold text-slate-900">{getTenancyDuration()} days</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Monthly Rent</Text>
              <Text className="font-bold text-slate-900">₹{customerData.monthlyRent.toLocaleString()}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Current Due</Text>
              <Text className={`font-bold ${customerData.currentDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ₹{customerData.currentDue.toLocaleString()}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Security Deposit</Text>
              <Text className="font-bold text-slate-900">₹{customerData.securityDeposit.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Move-Out Request Details */}
        <View className="bg-white rounded-[24px] p-6 mt-4 shadow-sm border border-white">
          <Text className="text-lg font-black text-slate-900 mb-4">
            Move-Out Request Details
          </Text>

          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Move out date</Text>
              <Text className="font-bold text-slate-900">{formatDate(customerData.requestedMoveOutDate)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Submitted On</Text>
              <Text className="font-bold text-slate-900">{formatDate(customerData.submissionDate)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Notice Period</Text>
              <Text className={`font-bold ${customerData.isWithinNotice ? 'text-orange-600' : 'text-green-600'}`}>
                {customerData.noticePeriodDays} days {customerData.isWithinNotice ? '(Short Notice)' : ''}
              </Text>
            </View>
          </View>

          {customerData.customerComments && (
            <View className="mt-4 p-4 bg-slate-50 rounded-xl">
              <Text className="text-slate-500 font-medium text-xs uppercase tracking-wide mb-1">
                Tenant Comments
              </Text>
              <Text className="text-slate-900 font-medium">{customerData.customerComments}</Text>
            </View>
          )}
        </View>

        {/* Admin Comment Section */}
        {action !== 'view' && (
          <View className="bg-white rounded-[24px] p-6 mt-4 shadow-sm border border-white">
            <Text className="text-lg font-black text-slate-900 mb-4">
              Security Deposit Returned
            </Text>
            <TextInput
              className="border border-slate-200 rounded-xl p-4 text-slate-900"
              placeholder="Enter amount returned (optional)"
              value={securityDepositReturned}
              onChangeText={setSecurityDepositReturned}
              keyboardType="numeric"
            />
          </View>
        )}

        {/* Admin Comment Section */}
        {action !== 'view' && (
          <View className="bg-white rounded-[24px] p-6 mt-4 shadow-sm border border-white">
            <Text className="text-lg font-black text-slate-900 mb-4">
              Admin Comments *
            </Text>

            <TextInput
              className="border border-slate-200 rounded-xl p-4 text-slate-900 min-h-[100px]"
              placeholder="Add your comment here (e.g., 'Clear due amount before move-out' or 'Approved - proper notice given')"
              value={adminComment}
              onChangeText={setAdminComment}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Text className="text-slate-400 text-xs mt-2">
              This comment will be sent to the customer as notification
            </Text>
          </View>
        )}

        <View className="h-32" />
      </ScrollView>

        {/* Action Buttons */}
        {customerData.status === 'pending' && (
          <View className="absolute bottom-0 left-0 right-0 bg-white px-6 py-4 border-t border-slate-200">
            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 bg-red-500 py-4 rounded-xl"
                onPress={handleDecline}
              >
                <Text className="text-center font-bold text-white text-lg">Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-green-500 py-4 rounded-xl"
                onPress={handleApprove}
              >
                <Text className="text-center font-bold text-white text-lg">Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      {/* Approve Confirmation Modal */}
      <Modal visible={showApproveModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[24px] p-6">
            <Text className="text-xl font-black text-slate-900 mb-4">
              Confirm Approval
            </Text>
            
            <View className="bg-green-50 rounded-xl p-4 mb-4">
              <Text className="font-bold text-green-900 mb-2">Summary</Text>
              <Text className="text-green-800 mb-1">
                • Customer: {customerData.customerName}
              </Text>
              <Text className="text-green-800 mb-1">
                • Move-Out Date: {formatDate(customerData.requestedMoveOutDate)}
              </Text>
              <Text className="text-green-800 mb-1">
                • Security Deposit: ₹{customerData.securityDeposit.toLocaleString()}
              </Text>
              <Text className="text-green-800">
                • Your Comment: {adminComment}
              </Text>
            </View>

            <Text className="text-slate-600 text-sm mb-4">
              Notification will be sent to the customer. The request will be moved to the Accepted tab and status updated to Accepted.
            </Text>

            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 bg-slate-100 py-4 rounded-xl"
                onPress={() => setShowApproveModal(false)}
              >
                <Text className="text-center font-bold text-slate-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-green-500 py-4 rounded-xl"
                onPress={confirmApprove}
                disabled={loading}
              >
                <Text className="text-center font-bold text-white">
                  {loading ? 'Processing...' : 'Confirm Approval'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Decline Confirmation Modal */}
      <Modal visible={showCancelModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[24px] p-6">
            <Text className="text-xl font-black text-slate-900 mb-4">
              Confirm Decline
            </Text>
            
            <View className="bg-red-50 rounded-xl p-4 mb-4">
              <Text className="font-bold text-red-900 mb-2">Reason (optional)</Text>
              <Text className="text-red-800">{adminComment || '—'}</Text>
            </View>

            <Text className="text-slate-600 text-sm mb-4">
              Move out request will be rejected. {customerData.customerName} will continue his/her stay.
            </Text>

            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 bg-slate-100 py-4 rounded-xl"
                onPress={() => setShowCancelModal(false)}
              >
                <Text className="text-center font-bold text-slate-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-red-500 py-4 rounded-xl"
                onPress={confirmCancel}
                disabled={loading}
              >
                <Text className="text-center font-bold text-white">
                  {loading ? 'Processing...' : 'Confirm Decline'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}