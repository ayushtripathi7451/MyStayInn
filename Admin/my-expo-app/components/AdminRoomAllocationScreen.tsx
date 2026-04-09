import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ScrollableDatePicker from "./ScrollableDatePicker";
import { propertyApi, bookingApi } from "../utils/api";
import { useProperty } from "../contexts/PropertyContext";

interface Room {
  id: string;
  roomNumber: string;
  roomType: string;
  floor: number;
  capacity: number;
  pricePerMonth: string;
  isAvailable: boolean;
  beds: string[]; // Generated bed labels: ['A', 'B', 'C']
}

export default function AdminRoomAllocationScreen({ navigation, route }: any) {
  const { currentProperty } = useProperty();
  const propertyId = currentProperty?.id;

  const [isSecurityPaid, setIsSecurityPaid] = useState(false);
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [showBedPicker, setShowBedPicker] = useState(false);
  const [showRentPeriodPicker, setShowRentPeriodPicker] = useState(false);
  const [splitPayment, setSplitPayment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [selectedBeds, setSelectedBeds] = useState<string[]>([]);
  const [occupiedBeds, setOccupiedBeds] = useState<string[]>([]);
  const [rentPeriod, setRentPeriod] = useState<'month' | 'day'>('month');

  const customer = route?.params?.customer;
  const parseDate = (value: any): Date | null => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const formatCustomerDate = (value: any): string => {
    const d = parseDate(value);
    if (!d) return "—";
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };
  const requestedMoveIn = parseDate(customer?.moveInDate);
  const requestedMoveOut = parseDate(customer?.moveOutDate);
  const requestedSecurityDeposit =
    customer?.securityDeposit != null && !Number.isNaN(Number(customer.securityDeposit))
      ? String(Number(customer.securityDeposit))
      : "";

  const [allocationData, setAllocationData] = useState({
    moveIn: requestedMoveIn || null,
    moveOut: requestedMoveOut || null,
    securityDeposit: requestedSecurityDeposit || "5000",
    roomPreference: customer?.roomPreference || "",
    comments: customer?.comments || "",
    selectedRoom: null as Room | null,
    onlinePayment: "0",
    cashPayment: "",
  });

  const generateBedLabels = (capacity: number): string[] => {
    const labels = [];
    for (let i = 0; i < capacity; i++) {
      labels.push(String.fromCharCode(65 + i));
    }
    return labels;
  };

  // Fetch current selected property only so tenant is assigned to this property
  useEffect(() => {
    fetchPropertyData();
  }, [propertyId]);

  const fetchPropertyData = async () => {
    if (!propertyId) {
      setLoading(false);
      setAvailableRooms([]);
      return;
    }
    try {
      setLoading(true);
      const response = await propertyApi.get(`/api/properties/${encodeURIComponent(propertyId)}`);
      const prop = response.data?.property;
      if (!response.data?.success || !prop) {
        setAvailableRooms([]);
        setLoading(false);
        return;
      }
      if (prop.rules?.securityDeposit != null) {
        setAllocationData(prev => ({
          ...prev,
          securityDeposit:
            requestedSecurityDeposit || String(prop.rules.securityDeposit),
        }));
      }
      const roomList = Array.isArray(prop.rooms) ? prop.rooms : [];
      const available = roomList.filter((r: any) => r.isAvailable !== false);
      
      // Map rooms with bed labels
      const rooms: Room[] = available.map((room: any) => ({
        id: room.id.toString(),
        roomNumber: room.roomNumber,
        roomType: getRoomTypeLabel(room.roomType),
        floor: room.floor || 0,
        capacity: room.capacity,
        pricePerMonth: room.pricePerMonth?.toString?.() ?? "0",
        isAvailable: room.isAvailable !== false,
        beds: generateBedLabels(room.capacity),
      }));

      // Filter out rooms where ALL beds are occupied
      const roomsWithAvailableBeds: Room[] = [];
      for (const room of rooms) {
        try {
          const occupiedBedsRes = await bookingApi.get(`/api/bookings/room/${room.id}/occupied-beds`);
          const occupiedBeds = occupiedBedsRes.data?.occupiedBeds || [];
          
          // Only include room if it has at least one available bed
          const hasAvailableBeds = occupiedBeds.length < room.capacity;
          if (hasAvailableBeds) {
            roomsWithAvailableBeds.push(room);
          } else {
            console.log(`Room ${room.roomNumber} is fully occupied (${occupiedBeds.length}/${room.capacity} beds)`);
          }
        } catch (error) {
          console.error(`Error checking beds for room ${room.id}:`, error);
          // If we can't check, include the room to be safe
          roomsWithAvailableBeds.push(room);
        }
      }

      setAvailableRooms(roomsWithAvailableBeds);
      
      if (roomsWithAvailableBeds.length > 0) {
        // Do not preselect a room/bed. Admin must explicitly select.
        setAllocationData((prev) => ({
          ...prev,
          selectedRoom: null,
          onlinePayment: "0",
          cashPayment: "",
        }));
        setSelectedBeds([]);
        setSplitPayment(false);
      } else {
        Alert.alert("No Rooms", "No rooms with available beds in this property.");
      }
    } catch (error) {
      console.error('Error fetching property data:', error);
      Alert.alert("Error", "Failed to load property data. Please try again.");
      setAvailableRooms([]);
    } finally {
      setLoading(false);
    }
  };

  // Pre-fill from enrollment pay_pending snapshot (admin confirmed allocation without marking deposit paid).
  useEffect(() => {
    const pa = customer?.pendingAllocation;
    if (!pa || typeof pa !== "object" || availableRooms.length === 0) return;
    const roomId = pa.roomId != null ? String(pa.roomId) : "";
    const match = availableRooms.find((r) => r.id === roomId);
    if (!match) return;
    const mi = pa.moveInDate ? new Date(String(pa.moveInDate)) : null;
    const mo = pa.moveOutDate ? new Date(String(pa.moveOutDate)) : null;
    let beds: string[] = [];
    if (Array.isArray(pa.bedNumbers)) beds = pa.bedNumbers.map((x: unknown) => String(x));
    else if (typeof pa.bedNumbers === "string" && pa.bedNumbers)
      beds = pa.bedNumbers.split(",").map((s) => s.trim()).filter(Boolean);
    setAllocationData((prev) => ({
      ...prev,
      selectedRoom: match,
      moveIn: mi && !Number.isNaN(mi.getTime()) ? mi : prev.moveIn,
      moveOut: mo && !Number.isNaN(mo.getTime()) ? mo : prev.moveOut,
      securityDeposit:
        pa.securityDeposit != null ? String(pa.securityDeposit) : prev.securityDeposit,
      onlinePayment:
        pa.onlinePaymentRecv != null ? String(pa.onlinePaymentRecv) : prev.onlinePayment,
      cashPayment:
        pa.cashPaymentRecv != null ? String(pa.cashPaymentRecv) : prev.cashPayment,
    }));
    if (beds.length) setSelectedBeds(beds);
    if (pa.rentPeriod === "day" || pa.rentPeriod === "month") setRentPeriod(pa.rentPeriod);
    setIsSecurityPaid(true);
  }, [customer?.pendingAllocation, availableRooms]);

  // Convert backend room type to display label
  const getRoomTypeLabel = (roomType: string): string => {
    const typeMap: { [key: string]: string } = {
      single: "Single Sharing",
      double: "Double Sharing",
      triple: "Triple Sharing",
      dormitory: "Dormitory",
      suite: "Suite",
    };
    return typeMap[roomType.toLowerCase()] || roomType;
  };

  // Get floor label
  const getFloorLabel = (floor: number): string => {
    if (floor === 0) return "Ground Floor";
    if (floor === 1) return "1st Floor";
    if (floor === 2) return "2nd Floor";
    if (floor === 3) return "3rd Floor";
    return `${floor}th Floor`;
  };

  // Update online payment when rent amount changes
  const updateRentAmount = (newPrice: string) => {
    if (!allocationData.selectedRoom) return;
    
    setAllocationData({
      ...allocationData,
      selectedRoom: {
        ...allocationData.selectedRoom,
        pricePerMonth: newPrice
      },
      onlinePayment: splitPayment ? allocationData.onlinePayment : newPrice,
      cashPayment: splitPayment ? allocationData.cashPayment : ""
    });
  };

  // Handle split payment toggle
  const handleSplitPaymentToggle = (enabled: boolean) => {
    setSplitPayment(enabled);
    if (!enabled && allocationData.selectedRoom) {
      // When disabling split, put full amount in online payment
      setAllocationData({
        ...allocationData,
        onlinePayment: allocationData.selectedRoom.pricePerMonth,
        cashPayment: ""
      });
    }
  };

  // Handle cash payment change and auto-calculate online payment
  const handleCashPaymentChange = (cashAmount: string) => {
    if (!allocationData.selectedRoom) return;
    
    const numericCash = cashAmount.replace(/[^0-9]/g, "");
    const totalRent = parseInt(allocationData.selectedRoom.pricePerMonth || "0");
    const cash = parseInt(numericCash || "0");
    const online = Math.max(0, totalRent - cash);

    setAllocationData({
      ...allocationData,
      cashPayment: numericCash,
      onlinePayment: online.toString()
    });
  };

  // Handle bed selection (multi-select)
  const toggleBedSelection = (bed: string) => {
    setSelectedBeds(prev => {
      if (prev.includes(bed)) {
        // Deselect bed
        return prev.filter(b => b !== bed);
      } else {
        // Select bed
        return [...prev, bed];
      }
    });
  };

  // Check if all beds are selected (single occupancy)
  // Single occupancy = selecting ALL beds in the room at once (not just available beds)
  const isSingleOccupancy = () => {
    if (!allocationData.selectedRoom) return false;
    
    // Single occupancy means selecting ALL beds in the room (total capacity)
    // Not just the available beds
    return selectedBeds.length === allocationData.selectedRoom.capacity;
  };

  // Fetch occupied beds for a room
  const fetchOccupiedBeds = async (roomId: string) => {
    try {
      const response = await bookingApi.get(`/api/bookings/room/${roomId}/occupied-beds`);
      if (response.data.success) {
        setOccupiedBeds(response.data.occupiedBeds || []);
        console.log(`Occupied beds for room ${roomId}:`, response.data.occupiedBeds);
      }
    } catch (error) {
      console.error('Error fetching occupied beds:', error);
      setOccupiedBeds([]);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View className="bg-white px-6 py-5 flex-row items-center border-b border-slate-200 shadow-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1 -ml-1">
          <Ionicons name="arrow-back" size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-4 text-2xl font-black text-slate-900 tracking-tight">
          Let's Allocate Room
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1E33FF" />
          <Text className="text-gray-500 mt-4">Loading property details...</Text>
        </View>
      ) : availableRooms.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="home-outline" size={64} color="#94A3B8" />
          <Text className="text-slate-700 font-bold text-center mt-4 text-lg">
            No Available Rooms
          </Text>
          <Text className="text-slate-500 text-center mt-2">
            Please add rooms to your property first
          </Text>
          <TouchableOpacity
            className="mt-6 bg-indigo-600 px-6 py-3 rounded-xl"
            onPress={() => navigation.goBack()}
          >
            <Text className="text-white font-bold">Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} className="px-5">

        {/* SECTION 1B: CUSTOMER REQUEST DETAILS */}
        <View className="bg-white rounded-[32px] p-6 mt-6 shadow-sm border border-white">
          <Text className="text-[12px] font-black text-slate-900 uppercase tracking-[2px] mb-4">
            Customer Request
          </Text>
          <View className="flex-row justify-between mb-4">
            <View className="w-[48%]">
              <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Requested Move In
              </Text>
              <Text className="text-slate-900 font-bold">
                {customer?.moveInDate ? formatCustomerDate(customer.moveInDate) : "Not provided"}
              </Text>
            </View>
            <View className="w-[48%]">
              <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Requested Move Out
              </Text>
              <Text className="text-slate-900 font-bold">
                {customer?.moveOutDate ? formatCustomerDate(customer.moveOutDate) : "Not provided"}
              </Text>
            </View>
          </View>
          <View className="mb-4">
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Room Preference
            </Text>
            <View className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <Text className="text-slate-900 font-medium">
                {customer?.roomPreference?.trim?.() ? String(customer.roomPreference) : "No preference provided"}
              </Text>
            </View>
          </View>
          <View>
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Comments
            </Text>
            <View className="bg-slate-50 border border-slate-100 rounded-2xl p-4 h-28">
              <Text className="text-slate-900" style={{ textAlignVertical: "top" as any }}>
                {customer?.comments?.trim?.() ? String(customer.comments) : "No comments provided"}
              </Text>
            </View>
          </View>
        </View>
        
        {/* SECTION 1: DATES & SECURITY */}
        <View className="bg-white rounded-[32px] p-6 mt-6 shadow-sm border border-white">
          <View className="flex-row justify-between mb-4">
            <View className="w-[48%]">
              <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Move In</Text>
              <ScrollableDatePicker
                selectedDate={allocationData.moveIn}
                onDateChange={(date) => {
                  setAllocationData({
                    ...allocationData,
                    moveIn: date,
                    moveOut:
                      allocationData.moveOut && allocationData.moveOut < date
                        ? null
                        : allocationData.moveOut,
                  });
                }}
                mode="date"
                placeholder="Select"
              />
              {allocationData.moveIn && (
                <TouchableOpacity
                  onPress={() =>
                    setAllocationData({
                      ...allocationData,
                      moveIn: null,
                      moveOut: null,
                    })
                  }
                  className="mt-2"
                >
                  <Text className="text-xs font-semibold text-red-500">Clear move in date</Text>
                </TouchableOpacity>
              )}
            </View>

            <View className="w-[48%]">
              <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Move Out</Text>
              <ScrollableDatePicker
                selectedDate={allocationData.moveOut}
                onDateChange={(date) => setAllocationData({ ...allocationData, moveOut: date })}
                mode="date"
                placeholder="Select "
                minimumDate={allocationData.moveIn || undefined}
              />
              {allocationData.moveOut && (
                <TouchableOpacity
                  onPress={() => setAllocationData({ ...allocationData, moveOut: null })}
                  className="mt-2"
                >
                  <Text className="text-xs font-semibold text-red-500">Clear move out date</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <Text className="text-xs text-slate-500 mb-2">Move-in is mandatory. Move-out is optional.</Text>

          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Security Deposit</Text>
            
          </View>
          <TextInput
            value={allocationData.securityDeposit}
            onChangeText={(t) => setAllocationData({...allocationData, securityDeposit: t})}
            className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-900 font-bold mb-4"
            placeholder="Enter Amount"
            keyboardType="numeric"
          />

          <TouchableOpacity onPress={() => setIsSecurityPaid(!isSecurityPaid)} className="flex-row items-center">
            <View className={`w-6 h-6 rounded-lg border-2 items-center justify-center ${isSecurityPaid ? "bg-green-500 border-green-500" : "border-slate-300 bg-white"}`}>
              {isSecurityPaid && <Ionicons name="checkmark" size={16} color="white" />}
            </View>
            <Text className="ml-3 text-slate-700 font-bold">Mark as Paid</Text>
          </TouchableOpacity>
        </View>

       

        {/* SECTION 2: AVAILABLE ROOMS SELECTION */}
        <View className="bg-white rounded-[32px] p-6 mt-6 shadow-sm border border-white">
          <Text className="text-[12px] font-black text-slate-900 uppercase tracking-[2px] mb-4">Select Available Room</Text>
          
          <TouchableOpacity 
            onPress={() => setShowRoomPicker(true)}
            className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex-row justify-between items-center mb-3"
          >
            <View>
              <Text className="text-slate-900 font-black text-lg">
                Room {allocationData.selectedRoom?.roomNumber || "---"}
              </Text>
              <Text className="text-slate-500 font-medium">
                {allocationData.selectedRoom?.roomType || "Select Room"} • {allocationData.selectedRoom ? getFloorLabel(allocationData.selectedRoom.floor) : ""}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={24} color="#1E33FF" />
          </TouchableOpacity>

          {/* BED SELECTION - Multi-select */}
          {allocationData.selectedRoom && allocationData.selectedRoom.beds.length > 0 && (
            <>
              <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 mt-2">Select Bed(s)</Text>
              <TouchableOpacity 
                onPress={() => setShowBedPicker(true)}
                className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex-row justify-between items-center"
              >
                <View className="flex-row items-center flex-1">
                  <Ionicons name="bed" size={20} color="#1E33FF" />
                  <View className="ml-3 flex-1">
                    <Text className="text-slate-900 font-bold text-base">
                      {selectedBeds.length > 0 
                        ? `Bed ${selectedBeds.sort().join(', ')}` 
                        : "Select Bed(s)"}
                    </Text>
                    {isSingleOccupancy() && (
                      <Text className="text-xs text-green-600 font-bold mt-0.5">
                        Single Occupancy (All beds selected)
                      </Text>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-down" size={20} color="#1E33FF" />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* SECTION 3: RENT & PAYMENT */}
        <View className="bg-white rounded-[32px] p-6 mt-6 shadow-sm border border-white">
          <View className="flex-row justify-between items-end mb-4">
            <View className="flex-1 mr-3">
              <Text className="text-[12px] font-black text-slate-900 uppercase tracking-[2px] mb-2">Rent Amount</Text>
              <TextInput
                value={allocationData.selectedRoom?.pricePerMonth || "0"}
                onChangeText={updateRentAmount}
                keyboardType="numeric"
                placeholder="Enter rent amount"
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 font-black text-xl"
              />
            </View>
            <TouchableOpacity
              onPress={() => setShowRentPeriodPicker(true)}
              className="mb-4 bg-slate-100 px-4 py-3 rounded-xl flex-row items-center"
            >
              <Text className="text-slate-700 font-bold mr-1">per {rentPeriod}</Text>
              <Ionicons name="chevron-down" size={16} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Split Payment Checkbox */}
          <TouchableOpacity
            onPress={() => handleSplitPaymentToggle(!splitPayment)}
            className="flex-row items-center mb-4 p-3 bg-slate-50 rounded-xl"
          >
            <View className={`w-6 h-6 rounded border-2 items-center justify-center mr-3 ${
              splitPayment ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
            }`}>
              {splitPayment && <Ionicons name="checkmark" size={16} color="white" />}
            </View>
            <Text className="text-slate-700 font-bold">Split payment (Online + Cash)</Text>
          </TouchableOpacity>

          <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Collect Cash</Text>
          <TextInput
            value={allocationData.cashPayment}
            onChangeText={handleCashPaymentChange}
            editable={splitPayment}
            placeholder="Enter cash amount"
            placeholderTextColor={splitPayment ? "#4B5563" : "#9CA3AF"}
            className={`border border-slate-200 rounded-2xl p-4 font-bold mb-4 ${
              splitPayment ? 'bg-slate-50 text-slate-900' : 'bg-slate-100 text-slate-400'
            }`}
            keyboardType="numeric"
          />

          <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Collect Online</Text>
          <TextInput
            value={allocationData.onlinePayment}
            editable={false}
            className="bg-slate-100 border border-slate-200 rounded-2xl p-4 text-slate-900 font-bold mb-4"
            keyboardType="numeric"
          />

          {/* Total Summary */}
          {splitPayment && (
            <View className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <View className="flex-row justify-between mb-2">
                <Text className="text-blue-700 font-medium">Total Rent</Text>
                <Text className="text-blue-900 font-bold">₹{allocationData.selectedRoom?.pricePerMonth || "0"}</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-blue-700 font-medium">Online</Text>
                <Text className="text-blue-900 font-bold">₹{allocationData.onlinePayment}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-blue-700 font-medium">Cash</Text>
                <Text className="text-blue-900 font-bold">₹{allocationData.cashPayment || "0"}</Text>
              </View>
            </View>
          )}
        </View>

        <View className="h-40" />
      </ScrollView>

      {/* --- ROOM SELECTOR MODAL --- */}
      <Modal visible={showRoomPicker} transparent={true} animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-[40px] p-8 h-[60%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-black text-slate-900">Available Rooms</Text>
              <TouchableOpacity onPress={() => setShowRoomPicker(false)}>
                <Ionicons name="close-circle" size={32} color="#CBD5E1" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={availableRooms}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={async () => {
                    setAllocationData({
                      ...allocationData, 
                      selectedRoom: item,
                      onlinePayment: item.pricePerMonth,
                      cashPayment: ""
                    });
                    setSelectedBeds([]); // Do not preselect bed; admin selects explicitly
                    setSplitPayment(false); // Reset split payment
                    setShowRoomPicker(false);
                    // Fetch occupied beds for this room
                    await fetchOccupiedBeds(item.id);
                  }}
                  className={`p-5 rounded-3xl mb-3 flex-row justify-between items-center border ${
                    allocationData.selectedRoom?.id === item.id 
                    ? "bg-blue-50 border-blue-200" 
                    : "bg-slate-50 border-slate-100"
                  }`}
                >
                  <View>
                    <View className="flex-row items-center mb-1">
                      <Text className="text-xl font-black text-slate-900 mr-2">Room {item.roomNumber}</Text>
                      <View className="bg-blue-100 px-2 py-0.5 rounded-md">
                        <Text className="text-[10px] font-bold text-blue-600 uppercase">{getFloorLabel(item.floor)}</Text>
                      </View>
                    </View>
                    <Text className="text-slate-500 font-semibold">{item.roomType} • {item.capacity} Beds</Text>
                  </View>
                  <Text className="text-lg font-black text-slate-900">₹{item.pricePerMonth}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* --- BED SELECTOR MODAL - Multi-select --- */}
      <Modal visible={showBedPicker} transparent={true} animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-[40px] p-8 h-[60%]">
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text className="text-2xl font-black text-slate-900">Select Bed(s)</Text>
                <Text className="text-sm text-slate-500 mt-1">
                  {selectedBeds.length} bed(s) selected
                  {isSingleOccupancy() && " • Single Occupancy"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowBedPicker(false)}>
                <Ionicons name="close-circle" size={32} color="#CBD5E1" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="flex-row flex-wrap">
                {allocationData.selectedRoom?.beds
                  .filter(bed => !occupiedBeds.includes(bed)) // Only show available beds
                  .map((bed) => {
                    const isSelected = selectedBeds.includes(bed);
                    
                    return (
                      <TouchableOpacity
                        key={bed}
                        onPress={() => toggleBedSelection(bed)}
                        className={`w-[30%] m-1 p-6 rounded-2xl items-center justify-center border-2 ${
                          isSelected
                            ? "bg-blue-50 border-blue-500"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <Ionicons 
                          name="bed" 
                          size={32} 
                          color={isSelected ? "#3B82F6" : "#94A3B8"} 
                        />
                        <Text className={`text-2xl font-black mt-2 ${
                          isSelected ? "text-blue-600" : "text-slate-600"
                        }`}>
                          {bed}
                        </Text>
                        {isSelected && (
                          <View className="absolute top-2 right-2 bg-blue-500 rounded-full p-1">
                            <Ionicons name="checkmark" size={12} color="white" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
              </View>

              {/* Occupied Beds Info */}
              {occupiedBeds.length > 0 && (
                <View className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <View className="flex-row items-center">
                    <Ionicons name="information-circle" size={20} color="#F59E0B" />
                    <Text className="ml-2 text-amber-700 font-bold">
                      {occupiedBeds.length} bed(s) already occupied: {occupiedBeds.join(', ')}
                    </Text>
                  </View>
                </View>
              )}

              {/* Single Occupancy Info */}
              {isSingleOccupancy() && (
                <View className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
                  <View className="flex-row items-center">
                    <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                    <Text className="ml-2 text-green-700 font-bold">
                      Single Occupancy - All {allocationData.selectedRoom?.capacity} beds selected
                    </Text>
                  </View>
                </View>
              )}

              {/* Done Button */}
              <TouchableOpacity
                onPress={() => setShowBedPicker(false)}
                disabled={selectedBeds.length === 0}
                className={`mt-4 p-4 rounded-2xl ${
                  selectedBeds.length > 0 ? 'bg-blue-500' : 'bg-slate-300'
                }`}
              >
                <Text className="text-white font-bold text-center text-lg">
                  Done ({selectedBeds.length} selected)
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* --- RENT PERIOD SELECTOR MODAL --- */}
      <Modal visible={showRentPeriodPicker} transparent={true} animationType="fade">
        <TouchableOpacity 
          className="flex-1 justify-center items-center bg-black/50"
          activeOpacity={1}
          onPress={() => setShowRentPeriodPicker(false)}
        >
          <View className="bg-white rounded-3xl p-6 mx-8 w-64">
            <Text className="text-xl font-black text-slate-900 mb-4">Select Period</Text>
            
            <TouchableOpacity
              onPress={() => {
                setRentPeriod('month');
                setShowRentPeriodPicker(false);
              }}
              className={`p-4 rounded-xl mb-2 flex-row items-center justify-between ${
                rentPeriod === 'month' ? 'bg-blue-50 border-2 border-blue-500' : 'bg-slate-50'
              }`}
            >
              <Text className={`font-bold ${
                rentPeriod === 'month' ? 'text-blue-600' : 'text-slate-700'
              }`}>
                Per Month
              </Text>
              {rentPeriod === 'month' && (
                <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setRentPeriod('day');
                setShowRentPeriodPicker(false);
              }}
              className={`p-4 rounded-xl flex-row items-center justify-between ${
                rentPeriod === 'day' ? 'bg-blue-50 border-2 border-blue-500' : 'bg-slate-50'
              }`}
            >
              <Text className={`font-bold ${
                rentPeriod === 'day' ? 'text-blue-600' : 'text-slate-700'
              }`}>
                Per Day
              </Text>
              {rentPeriod === 'day' && (
                <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* PROCEED BUTTON */}
      <View className="absolute bottom-0 left-0 right-0 bg-white/90 px-6 pt-4 pb-10 border-t border-slate-200">
        <TouchableOpacity
          onPress={() => navigation.navigate("AdminAllocationSummaryScreen", { 
            data: {
              ...allocationData,
              selectedBeds,
              isSecurityPaid,
              rentPeriod,
              isSingleOccupancy: isSingleOccupancy()
            },
            customer,
            propertyId,
            enrollmentRequestId: customer?.enrollmentRequestId,
          })}
          disabled={!allocationData.selectedRoom || selectedBeds.length === 0 || !allocationData.moveIn}
          className={`h-16 rounded-[22px] justify-center items-center shadow-lg ${
            allocationData.selectedRoom && selectedBeds.length > 0 && allocationData.moveIn
              ? "bg-[#1E33FF] shadow-blue-300"
              : "bg-slate-300"
          }`}
        >
          <Text className="text-white font-black text-lg">Proceed Allocation</Text>
        </TouchableOpacity>
      </View>
        </>
      )}
    </SafeAreaView>
  );
}
