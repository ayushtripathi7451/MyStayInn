import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { moveOutApi } from "../utils/api";

interface MoveOutStatusScreenProps {
  navigation: any;
  route?: { params?: { requestId?: string; property?: any } };
}

interface MoveOutStatus {
  requestId: string;
  status: 'requested' | 'accepted' | 'moved_out' | 'cancelled';
  requestedDate: Date | string;
  submissionDate: Date | string;
  customerComments?: string;
  adminComments?: string;
  requestedBy: string;
  isWithinNotice: boolean;
  noticePeriodDays: number;
  penaltyAmount?: number;
  securityDepositAmount: number;
  securityDepositReturned?: number;
  finalAmountReturned?: number;
  amountToBeCollected?: number;
  currentDue: number;
  propertyName?: string;
  roomNumber?: string;
  acceptedAt?: Date | string;
  movedOutAt?: Date | string;
}

function mapApiToStatus(api: any): MoveOutStatus | null {
  if (!api) return null;
  return {
    requestId: api.requestId,
    status: api.status,
    requestedDate: api.requestedDate,
    submissionDate: api.submissionDate,
    customerComments: api.customerComments,
    adminComments: api.adminComments,
    requestedBy: api.requestedBy === 'owner' ? 'Owner (Admin)' : 'Tenant',
    isWithinNotice: api.isWithinNotice,
    noticePeriodDays: api.noticePeriodDays,
    penaltyAmount: api.penaltyAmount,
    securityDepositAmount: api.securityDepositAmount,
    securityDepositReturned: api.securityDepositReturned,
    finalAmountReturned: api.finalAmountReturned,
    amountToBeCollected: api.amountToBeCollected,
    currentDue: api.currentDue ?? 0,
    propertyName: api.propertyName,
    roomNumber: api.roomNumber,
    acceptedAt: api.acceptedAt,
    movedOutAt: api.movedOutAt,
  };
}

export default function MoveOutStatusScreen({ navigation }: MoveOutStatusScreenProps) {
  const [moveOutStatus, setMoveOutStatus] = useState<MoveOutStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMoveOutStatus();
  }, []);

  const loadMoveOutStatus = async () => {
    try {
      const res = await moveOutApi.get<{ success: boolean; data?: any }>("/api/move-out/status");
      const mapped = res.data?.success && res.data?.data ? mapApiToStatus(res.data.data) : null;
      setMoveOutStatus(mapped);
    } catch (_) {
      setMoveOutStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMoveOutStatus();
    setRefreshing(false);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested': return 'text-orange-600 bg-orange-50';
      case 'accepted': return 'text-blue-600 bg-blue-50';
      case 'moved_out': return 'text-green-600 bg-green-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'requested': return 'time-outline';
      case 'accepted': return 'checkmark-circle-outline';
      case 'moved_out': return 'checkmark-done-outline';
      case 'cancelled': return 'close-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'requested': return 'Requested';
      case 'accepted': return 'Accepted';
      case 'moved_out': return 'Moved Out';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'requested': return 'Your move-out request is under review by the admin';
      case 'accepted': return 'Your move-out request has been accepted. Complete the process on move-out date.';
      case 'moved_out': return 'Move-out completed. Settlement details below.';
      case 'cancelled': return 'Your move-out request was cancelled. You will continue your stay.';
      default: return 'Status unknown';
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F1F5F9] justify-center items-center">
        <ActivityIndicator size="large" color="#1E33FF" />
        <Text className="text-slate-500 font-medium mt-3">Loading move-out status...</Text>
      </SafeAreaView>
    );
  }

  if (!moveOutStatus) {
    return (
      <SafeAreaView className="flex-1 bg-[#F1F5F9]">
        <StatusBar barStyle="dark-content" />

        {/* Header */}
        <View className="bg-white px-6 py-5 flex-row items-center border-b border-slate-200 shadow-sm">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-1 -ml-1">
            <Ionicons name="arrow-back" size={28} color="#0F172A" />
          </TouchableOpacity>
          <Text className="ml-4 text-2xl font-black text-slate-900 tracking-tight">
            Move-Out Status
          </Text>
        </View>

        {/* No Request State */}
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="document-outline" size={64} color="#94A3B8" />
          <Text className="text-slate-500 font-bold text-center mt-4 text-lg">
            No Move-Out Request
          </Text>
          <Text className="text-slate-400 text-center mt-2">
            You haven't submitted any move-out request yet
          </Text>
          <TouchableOpacity
            className="mt-6 bg-[#1E33FF] px-6 py-3 rounded-xl"
            onPress={() => navigation.navigate('MoveOutRequestScreen')}
          >
            <Text className="text-white font-bold">Submit Move-Out Request</Text>
          </TouchableOpacity>
        </View>
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
          Move-Out Status
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        className="px-5"
      >
        {/* Status Overview */}
        <View className="bg-white rounded-[24px] p-6 mt-6 shadow-sm border border-white">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View className={`w-12 h-12 rounded-full items-center justify-center ${getStatusColor(moveOutStatus.status).split(' ')[1]}`}>
                <Ionicons 
                  name={getStatusIcon(moveOutStatus.status) as any} 
                  size={24} 
                  color={moveOutStatus.status === 'requested' ? '#EA580C' : moveOutStatus.status === 'accepted' ? '#2563EB' : moveOutStatus.status === 'moved_out' ? '#059669' : '#DC2626'}
                />
              </View>
              <View className="ml-4">
                <Text className="text-lg font-black text-slate-900">
                  Request Status
                </Text>
                <Text className={`font-bold uppercase text-sm ${getStatusColor(moveOutStatus.status).split(' ')[0]}`}>
                  {getStatusLabel(moveOutStatus.status)}
                </Text>
              </View>
            </View>
            <View className={`px-3 py-1 rounded-full ${getStatusColor(moveOutStatus.status)}`}>
              <Text className={`text-xs font-bold uppercase ${getStatusColor(moveOutStatus.status).split(' ')[0]}`}>
                {getStatusLabel(moveOutStatus.status)}
              </Text>
            </View>
          </View>

          <View className="p-4 bg-slate-50 rounded-xl">
            <Text className="text-slate-900 font-medium">
              {getStatusMessage(moveOutStatus.status)}
            </Text>
          </View>
        </View>

        {/* Request Details */}
        <View className="bg-white rounded-[24px] p-6 mt-4 shadow-sm border border-white">
          <Text className="text-lg font-black text-slate-900 mb-4">
            Request Details
          </Text>

          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Request ID</Text>
              <Text className="font-bold text-slate-900">{moveOutStatus.requestId}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Move-out Date</Text>
              <Text className="font-bold text-slate-900">{formatDate(moveOutStatus.requestedDate)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Requested On</Text>
              <Text className="font-bold text-slate-900">{formatDate(moveOutStatus.submissionDate)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Requested By</Text>
              <Text className="font-bold text-slate-900">{moveOutStatus.requestedBy}</Text>
            </View>
            {(moveOutStatus.propertyName || moveOutStatus.roomNumber) && (
              <View className="flex-row justify-between">
                <Text className="text-slate-500 font-medium">Property / Room</Text>
                <Text className="font-bold text-slate-900">{[moveOutStatus.propertyName, moveOutStatus.roomNumber].filter(Boolean).join(' · ')}</Text>
              </View>
            )}
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Current Due</Text>
              <Text className={`font-bold ${moveOutStatus.currentDue > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                ₹{moveOutStatus.currentDue.toLocaleString()}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">Notice Period</Text>
              <Text className={`font-bold ${moveOutStatus.isWithinNotice ? 'text-orange-600' : 'text-green-600'}`}>
                {moveOutStatus.noticePeriodDays} days {moveOutStatus.isWithinNotice ? '(Short Notice)' : ''}
              </Text>
            </View>
          </View>

          {moveOutStatus.customerComments && (
            <View className="mt-4 p-3 bg-blue-50 rounded-xl">
              <Text className="text-blue-600 font-medium text-xs uppercase tracking-wide mb-1">
                Your Comments
              </Text>
              <Text className="text-slate-900 font-medium">{moveOutStatus.customerComments}</Text>
            </View>
          )}
        </View>

        {/* Admin Response */}
        {moveOutStatus.adminComments && (
          <View className="bg-white rounded-[24px] p-6 mt-4 shadow-sm border border-white">
            <Text className="text-lg font-black text-slate-900 mb-4">
              Admin Comments
            </Text>
            <View className="p-4 rounded-xl bg-slate-50">
              <Text className="text-slate-900 font-medium">{moveOutStatus.adminComments}</Text>
            </View>
            {(moveOutStatus.acceptedAt || moveOutStatus.movedOutAt) && (
              <Text className="text-slate-500 text-sm mt-2">
                Responded on {formatDate(moveOutStatus.acceptedAt || moveOutStatus.movedOutAt)}
              </Text>
            )}
          </View>
        )}

        {/* Settlement: Security deposit returned / amount to be collected */}
        {(moveOutStatus.finalAmountReturned != null || moveOutStatus.amountToBeCollected != null) && (
          <View className="bg-white rounded-[24px] p-6 mt-4 shadow-sm border border-white">
            <Text className="text-lg font-black text-slate-900 mb-4">
              Settlement
            </Text>
            <View className="space-y-3">
              <View className="flex-row justify-between">
                <Text className="text-slate-500 font-medium">Security Deposit</Text>
                <Text className="font-bold text-slate-900">₹{moveOutStatus.securityDepositAmount.toLocaleString()}</Text>
              </View>
              {moveOutStatus.securityDepositReturned != null && (
                <View className="flex-row justify-between">
                  <Text className="text-slate-500 font-medium">Amount Returned</Text>
                  <Text className="font-bold text-slate-900">₹{Number(moveOutStatus.securityDepositReturned).toLocaleString()}</Text>
                </View>
              )}
              {moveOutStatus.finalAmountReturned != null && moveOutStatus.finalAmountReturned > 0 && (
                <View className="flex-row justify-between">
                  <Text className="text-slate-500 font-medium">Final Amount Returned</Text>
                  <Text className="font-bold text-green-600">₹{moveOutStatus.finalAmountReturned.toLocaleString()}</Text>
                </View>
              )}
              {moveOutStatus.amountToBeCollected != null && moveOutStatus.amountToBeCollected > 0 && (
                <View className="flex-row justify-between">
                  <Text className="text-slate-500 font-medium">Amount to be Collected</Text>
                  <Text className="font-bold text-red-600">₹{moveOutStatus.amountToBeCollected.toLocaleString()}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Penalty Information */}
        {moveOutStatus.isWithinNotice && moveOutStatus.penaltyAmount && moveOutStatus.penaltyAmount > 0 && (
          <View className="bg-orange-50 rounded-[24px] p-6 mt-4">
            <View className="flex-row items-center mb-3">
              <Ionicons name="warning-outline" size={24} color="#EA580C" />
              <Text className="ml-2 text-lg font-black text-orange-900">
                Short Notice Penalty
              </Text>
            </View>
            
            <Text className="text-orange-800 mb-2">
              Due to short notice period, a penalty of ₹{moveOutStatus.penaltyAmount.toLocaleString()} may be applied.
            </Text>
            <Text className="text-orange-700 text-sm">
              This amount will be deducted from your security deposit during settlement.
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        {moveOutStatus.status === 'cancelled' && (
          <TouchableOpacity
            className="bg-[#1E33FF] py-4 rounded-xl mt-6"
            onPress={() => navigation.navigate('MoveOutRequestScreen')}
          >
            <Text className="text-center font-bold text-white text-lg">
              Submit New Request
            </Text>
          </TouchableOpacity>
        )}

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}