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
import { MoveOutService } from "../services/moveOutService";

interface InitiateMoveOutScreenProps {
  navigation: any;
  route?: any;
}

interface Tenant {
  customerId: string;
  customerName: string;
  mystayId: string;
  propertyId: string;
  propertyName: string;
  roomId: string;
  roomNumber: string;
  bookingId: string;
  checkInDate: Date;
  monthlyRent: number;
  securityDeposit: number;
  phone: string;
  email: string;
}

export default function InitiateMoveOutScreen({ navigation, route }: InitiateMoveOutScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [moveOutDate, setMoveOutDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reason, setReason] = useState("");
  const [securityDepositReturned, setSecurityDepositReturned] = useState("");
  const [adminComments, setAdminComments] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Handle pre-selected tenant from route params
  useEffect(() => {
    if (route?.params?.tenantId) {
      const preSelectedTenant: Tenant = {
        customerId: route.params.tenantId,
        customerName: route.params.tenantName || '',
        mystayId: route.params.tenantId,
        propertyId: '', // This should come from API
        propertyName: '',
        roomId: '',
        roomNumber: route.params.roomNumber || '',
        bookingId: '',
        checkInDate: new Date(),
        monthlyRent: 0,
        securityDeposit: 0,
        phone: '',
        email: '',
      };
      setSelectedTenant(preSelectedTenant);
    }
  }, [route?.params]);

  const searchTenants = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a search term');
      return;
    }

    setSearching(true);
    try {
      const response = await MoveOutService.searchTenants({
        query: searchQuery,
        includeBookingDetails: true,
      });

      if (response.success && response.data) {
        setSearchResults(response.data);
      } else {
        setSearchResults([]);
        Alert.alert('No Results', 'No tenants found matching your search');
      }
    } catch (error) {
      console.error('Error searching tenants:', error);
      Alert.alert('Error', 'Failed to search tenants');
    } finally {
      setSearching(false);
    }
  };

  const selectTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setMoveOutDate(selectedDate);
    }
  };

  const validateMoveOut = () => {
    if (!selectedTenant) {
      Alert.alert('Error', 'Please select a tenant');
      return false;
    }

    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for move-out');
      return false;
    }

    const today = new Date();
    if (moveOutDate < today) {
      Alert.alert('Error', 'Move-out date cannot be in the past');
      return false;
    }

    if (!securityDepositReturned.trim()) {
      Alert.alert('Error', 'Please enter security deposit amount returned');
      return false;
    }

    const returned = parseFloat(securityDepositReturned);
    if (isNaN(returned) || returned < 0) {
      Alert.alert('Error', 'Please enter a valid security deposit amount');
      return false;
    }

    if (returned > selectedTenant.securityDeposit) {
      Alert.alert('Error', 'Returned amount cannot exceed security deposit');
      return false;
    }

    if (!adminComments.trim()) {
      Alert.alert('Error', 'Please add admin comments');
      return false;
    }

    return true;
  };

  const initiateMoveOut = async () => {
    if (!validateMoveOut() || !selectedTenant) return;

    setLoading(true);
    try {
      const response = await MoveOutService.initiateMoveOut({
        customerId: selectedTenant.customerId,
        propertyId: selectedTenant.propertyId,
        roomId: selectedTenant.roomId,
        bookingId: selectedTenant.bookingId,
        moveOutDate: moveOutDate.toISOString(),
        reason,
        adminComments,
        type: 'admin_initiated',
      });

      if (response.success) {
        Alert.alert(
          'Success',
          `Move-out approved successfully!\n\nSecurity Deposit Returned: ₹${parseFloat(securityDepositReturned).toLocaleString()}\n\nThe tenant will be marked as inactive and bed will be empty after ${formatDate(moveOutDate)}.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to initiate move-out');
      }
    } catch (error) {
      console.error('Error initiating move-out:', error);
      Alert.alert('Error', 'Failed to initiate move-out process');
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getTenancyDuration = (checkInDate: Date) => {
    const today = new Date();
    const diffTime = today.getTime() - new Date(checkInDate).getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="bg-white px-6 py-5 flex-row items-center border-b border-slate-200 shadow-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1 -ml-1">
          <Ionicons name="arrow-back" size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-4 text-2xl font-black text-slate-900 tracking-tight">
          Initiate Move-Out
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="px-5">
        {/* Search Section - Only show if no tenant pre-selected */}
        {!selectedTenant && (
          <View className="bg-white rounded-[24px] p-6 mt-6 shadow-sm border border-white">
            <Text className="text-lg font-black text-slate-900 mb-4">
              Search Tenant
            </Text>

            <View className="flex-row items-center space-x-3">
              <View className="flex-1 flex-row items-center bg-slate-50 rounded-xl px-4 py-3">
                <Ionicons name="search" size={20} color="#64748B" />
                <TextInput
                  className="flex-1 ml-3 text-slate-900 font-medium"
                  placeholder="Search by name, MyStay ID, or phone..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={searchTenants}
                />
              </View>
              <TouchableOpacity
                className="bg-[#1E33FF] px-6 py-3 rounded-xl"
                onPress={searchTenants}
                disabled={searching}
              >
                <Text className="text-white font-bold">
                  {searching ? 'Searching...' : 'Search'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <View className="mt-4">
                <Text className="text-slate-600 font-bold mb-3">Search Results</Text>
                {searchResults.map((tenant) => (
                <TouchableOpacity
                  key={tenant.customerId}
                  className="p-4 bg-slate-50 rounded-xl mb-2"
                  onPress={() => selectTenant(tenant)}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="font-bold text-slate-900">{tenant.customerName}</Text>
                      <Text className="text-slate-500 text-sm">{tenant.mystayId}</Text>
                      <Text className="text-slate-500 text-sm">
                        Room {tenant.roomNumber} • {tenant.propertyName}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#64748B" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        )}

        {/* Selected Tenant Details */}
        {selectedTenant && (
          <View className="bg-white rounded-[24px] p-6 mt-4 shadow-sm border border-white">
            <Text className="text-lg font-black text-slate-900 mb-4">
              Selected Tenant
            </Text>

            <View className="space-y-3">
              <View className="flex-row justify-between">
                <Text className="text-slate-500 font-medium">Name</Text>
                <Text className="font-bold text-slate-900">{selectedTenant.customerName}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-slate-500 font-medium">MyStay ID</Text>
                <Text className="font-bold text-blue-600">{selectedTenant.mystayId}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-slate-500 font-medium">Room</Text>
                <Text className="font-bold text-slate-900">
                  {selectedTenant.roomNumber} • {selectedTenant.propertyName}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-slate-500 font-medium">Check-In Date</Text>
                <Text className="font-bold text-slate-900">{formatDate(selectedTenant.checkInDate)}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-slate-500 font-medium">Tenancy Duration</Text>
                <Text className="font-bold text-slate-900">{getTenancyDuration(selectedTenant.checkInDate)} days</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-slate-500 font-medium">Monthly Rent</Text>
                <Text className="font-bold text-slate-900">₹{selectedTenant.monthlyRent.toLocaleString()}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-slate-500 font-medium">Security Deposit</Text>
                <Text className="font-bold text-slate-900">₹{selectedTenant.securityDeposit.toLocaleString()}</Text>
              </View>
            </View>

            <TouchableOpacity
              className="mt-4 bg-slate-100 py-2 px-4 rounded-xl self-start"
              onPress={() => setSelectedTenant(null)}
            >
              <Text className="text-slate-600 font-bold">Change Tenant</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Move-Out Details */}
        {selectedTenant && (
          <View className="bg-white rounded-[24px] p-6 mt-4 shadow-sm border border-white">
            <Text className="text-lg font-black text-slate-900 mb-4">
              Move-Out Details
            </Text>

            {/* Move-Out Date */}
            <View className="mb-4">
              <Text className="text-slate-600 font-medium mb-2">Move-Out Date *</Text>
              <TouchableOpacity
                className="flex-row items-center justify-between bg-slate-50 rounded-xl p-4"
                onPress={() => setShowDatePicker(true)}
              >
                <Text className="text-slate-900 font-medium">{formatDate(moveOutDate)}</Text>
                <Ionicons name="calendar-outline" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Reason */}
            <View className="mb-4">
              <Text className="text-slate-600 font-medium mb-2">Reason for Move-Out *</Text>
              <View className="flex-row flex-wrap">
                {[
                  'Lease Expired',
                  'Non-Payment',
                  'Rule Violation',
                  'Property Maintenance',
                  'Owner Request',
                  'Other'
                ].map((reasonOption) => (
                  <TouchableOpacity
                    key={reasonOption}
                    className={`px-4 py-2 rounded-xl mr-2 mb-2 ${
                      reason === reasonOption ? 'bg-blue-500' : 'bg-slate-100'
                    }`}
                    onPress={() => setReason(reasonOption)}
                  >
                    <Text className={`font-bold ${
                      reason === reasonOption ? 'text-white' : 'text-slate-600'
                    }`}>
                      {reasonOption}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Security Deposit Returned */}
            <View className="mb-4">
              <Text className="text-slate-600 font-medium mb-2">Security Deposit Amount Returned *</Text>
              <View className="flex-row items-center bg-slate-50 rounded-xl px-4 py-3">
                <Text className="text-slate-500 font-bold text-lg">₹</Text>
                <TextInput
                  className="flex-1 ml-2 text-slate-900 font-bold text-lg"
                  placeholder="0"
                  keyboardType="numeric"
                  value={securityDepositReturned}
                  onChangeText={setSecurityDepositReturned}
                />
              </View>
              <Text className="text-slate-400 text-xs mt-2">
                Original deposit: ₹{selectedTenant.securityDeposit.toLocaleString()}
              </Text>
              {securityDepositReturned && parseFloat(securityDepositReturned) < selectedTenant.securityDeposit && (
                <Text className="text-orange-600 text-xs mt-1">
                  Deduction: ₹{(selectedTenant.securityDeposit - parseFloat(securityDepositReturned)).toLocaleString()}
                </Text>
              )}
            </View>

            {/* Admin Comments */}
            <View className="mb-4">
              <Text className="text-slate-600 font-medium mb-2">Admin Comments *</Text>
              <TextInput
                className="border border-slate-200 rounded-xl p-4 text-slate-900 min-h-[80px]"
                placeholder="Add comments (e.g., 'Clear due amount' or 'Approved - lease expired')..."
                value={adminComments}
                onChangeText={setAdminComments}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Approve Move-Out Button */}
            <TouchableOpacity
              className="bg-[#1E33FF] py-4 rounded-xl"
              onPress={() => setShowConfirmModal(true)}
              disabled={!selectedTenant || !reason || !securityDepositReturned || !adminComments}
            >
              <Text className="text-center font-bold text-white text-lg">
                Approve Move-Out
              </Text>
            </TouchableOpacity>
          </View>
        )}

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
              Confirm Move-Out Approval
            </Text>
            
            {selectedTenant && (
              <View className="bg-slate-50 rounded-xl p-4 mb-4">
                <Text className="font-bold text-slate-900 mb-2">Summary</Text>
                <Text className="text-slate-600 mb-1">
                  <Text className="font-medium">Tenant:</Text> {selectedTenant.customerName} ({selectedTenant.mystayId})
                </Text>
                <Text className="text-slate-600 mb-1">
                  <Text className="font-medium">Room:</Text> {selectedTenant.roomNumber} • {selectedTenant.propertyName}
                </Text>
                <Text className="text-slate-600 mb-1">
                  <Text className="font-medium">Move-Out Date:</Text> {formatDate(moveOutDate)}
                </Text>
                <Text className="text-slate-600 mb-1">
                  <Text className="font-medium">Reason:</Text> {reason}
                </Text>
                <Text className="text-slate-600 mb-1">
                  <Text className="font-medium">Security Deposit:</Text> ₹{selectedTenant.securityDeposit.toLocaleString()}
                </Text>
                <Text className="text-green-600 font-bold mb-1">
                  <Text className="font-medium">Amount Returned:</Text> ₹{parseFloat(securityDepositReturned || "0").toLocaleString()}
                </Text>
                {parseFloat(securityDepositReturned || "0") < selectedTenant.securityDeposit && (
                  <Text className="text-orange-600 font-bold">
                    <Text className="font-medium">Deduction:</Text> ₹{(selectedTenant.securityDeposit - parseFloat(securityDepositReturned || "0")).toLocaleString()}
                  </Text>
                )}
                <Text className="text-slate-600 mt-2">
                  <Text className="font-medium">Comment:</Text> {adminComments}
                </Text>
              </View>
            )}

            <Text className="text-slate-600 text-sm mb-4">
              This will immediately approve the move-out. The tenant will be marked as inactive and the bed will be empty after the move-out date.
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
                onPress={initiateMoveOut}
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
    </SafeAreaView>
  );
}