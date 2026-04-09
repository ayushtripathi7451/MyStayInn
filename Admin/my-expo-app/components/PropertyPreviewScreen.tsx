import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Platform, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ProfileHeader from "./SetupHeader";
import { Ionicons } from "@expo/vector-icons";
import { propertyApi } from "../utils/api";
import { debugToken } from "../utils/tokenDebug";

export default function PropertyPreviewScreen({ navigation, route }: any) {
  const { 
    propertyData = {}, 
    facilitiesData = {}, 
    floorsData = {}, 
    allRooms = [], 
    usedFloors = [],
    fromVerify = false // Flag to know if we came from verify screen
  } = route.params || {};

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Use React Navigation's focus effect to refresh data when returning from edit screens
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // When screen comes into focus, route.params will have updated data
      if (route.params) {
        // Data is already updated via route.params
      }
    });

    return unsubscribe;
  }, [navigation, route.params]);

  // Calculate totals
  const totalRooms = Array.isArray(allRooms) ? allRooms.reduce((acc: number, floor: any[]) => acc + (Array.isArray(floor) ? floor.length : 0), 0) : 0;
  
  const propertyFacilitiesList = [
    "Wifi", "CCTV", "Lift", "Security 24x7", "Hot Water", 
    "Self Cooking allowed", "House Keeping", "Washing Machine", 
    "Power Backup", "Indoor Games", "Gym"
  ];

  const roomFacilitiesList = [
    "Table & Chair", "Wardrobe", "Cupboard Lock", "Geyser", 
    "Fridge", "Attached Bath", "AC", "Balcony", "RO Water"
  ];

  const selectedPropertyFacilities = Array.isArray(facilitiesData?.propertyFacilities) 
    ? facilitiesData.propertyFacilities.map((isSelected: boolean, index: number) => 
        isSelected ? propertyFacilitiesList[index] : null
      ).filter(Boolean) 
    : [];
  
  const selectedRoomFacilities = Array.isArray(facilitiesData?.roomFacilities)
    ? facilitiesData.roomFacilities.map((isSelected: boolean, index: number) => 
        isSelected ? roomFacilitiesList[index] : null
      ).filter(Boolean) 
    : [];

  const handleEditProperty = () => {
    navigation.navigate("ProfileSetup", { 
      ...propertyData,
      returnToPreview: true,
      facilitiesData,
      floorsData,
      allRooms,
      usedFloors,
      fromVerify
    });
  };
  
  const handleEditFacilities = () => {
    navigation.navigate("Facilities", { 
      ...propertyData,
      returnToPreview: true,
      facilitiesData,
      floorsData,
      allRooms,
      usedFloors,
      fromVerify
    });
  };
  
  const handleEditRooms = () => {
    navigation.navigate("Floors", { 
      propertyData,
      facilitiesData,
      returnToPreview: true,
      floorsData,
      allRooms,
      usedFloors,
      fromVerify
    });
  };
  
  const handleContinue = () => navigation.navigate("Verify", { propertyData, facilitiesData, floorsData, allRooms, usedFloors });

  const generateID = () => {
    const year = new Date().getFullYear().toString().slice(2);
    const rand = Math.floor(10000 + Math.random() * 90000);
    return `MYP${year}X${rand}`;
  };

  // Map room type to RoomType enum
  const mapRoomType = (type: string): string => {
    const typeMap: { [key: string]: string } = {
      'Single': 'single',
      'Double': 'double',
      'Triple': 'triple',
      'Quadruple': 'dormitory',
      'Five': 'dormitory',
      '>6': 'dormitory',
    };
    return typeMap[type] || 'single';
  };

  // Map property type to PropertyType enum
  const mapPropertyType = (type: string): string => {
    const typeMap: { [key: string]: string } = {
      'PG': 'pg',
      'Hostel': 'hostel',
      'Apartment': 'apartment',
      'Hotel': 'hotel',
      'Flat': 'flat',
    };
    return typeMap[type] || 'pg';
  };

  // Get capacity from room type
  const getCapacity = (type: string): number => {
    const capacityMap: { [key: string]: number } = {
      'Single': 1,
      'Double': 2,
      'Triple': 3,
      'Quadruple': 4,
      'Five': 5,
      '>6': 6,
    };
    return capacityMap[type] || 1;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      // Debug: Check if token exists
      const tokenDebug = await debugToken();
      console.log("Token debug before API call:", tokenDebug);
      
      if (!tokenDebug.hasToken) {
        Alert.alert("Error", "No authentication token found. Please login again.");
        return;
      }

      // Transform property facilities to amenities array
      const propertyFacilitiesList = [
        "Wifi", "CCTV", "Lift", "Security 24x7", "Hot Water", 
        "Self Cooking allowed", "House Keeping", "Washing Machine", 
        "Power Backup", "Indoor Games", "Gym"
      ];

      const roomFacilitiesList = [
        "Table & Chair", "Wardrobe", "Cupboard Lock", "Geyser", 
        "Fridge", "Attached Bath", "AC", "Balcony", "RO Water"
      ];

      const propertyAmenities = [];
      
      // Add property facilities
      if (facilitiesData?.propertyFacilities) {
        facilitiesData.propertyFacilities.forEach((isSelected: boolean, index: number) => {
          if (isSelected) {
            propertyAmenities.push(propertyFacilitiesList[index]);
          }
        });
      }

      // Add parking info
      if (facilitiesData?.hasParking) {
        if (facilitiesData.parkingType?.two) propertyAmenities.push("Two Wheeler Parking");
        if (facilitiesData.parkingType?.four) propertyAmenities.push("Four Wheeler Parking");
      }

      // Add food info
      if (facilitiesData?.foodAvailable) {
        propertyAmenities.push(`Food Available - ${facilitiesData.foodType || 'N/A'}`);
        if (facilitiesData.cuisineType) {
          propertyAmenities.push(`Cuisine: ${facilitiesData.cuisineType}`);
        }
      }

      // Room amenities
      const roomAmenities: string[] = [];
      if (facilitiesData?.roomFacilities) {
        facilitiesData.roomFacilities.forEach((isSelected: boolean, index: number) => {
          if (isSelected) {
            roomAmenities.push(roomFacilitiesList[index]);
          }
        });
      }

      // Transform rooms data
      const rooms = allRooms.flatMap((floorRooms: any[], floorIdx: number) => 
        floorRooms.map((room: any) => ({
          roomNumber: room.number,
          roomType: mapRoomType(room.type),
          floor: floorIdx,
          capacity: getCapacity(room.type),
          pricePerMonth: parseFloat(room.price) || 0,
          pricePerDay: room.perMonth === "Day" ? parseFloat(room.price) || 0 : null,
          amenities: roomAmenities,
          images: [],
          isAvailable: true,
        }))
      );

      // Property location: support both coordinates object and top-level lat/lng (industry standard)
      const lat = propertyData?.coordinates?.latitude ?? propertyData?.latitude;
      const lng = propertyData?.coordinates?.longitude ?? propertyData?.longitude;
      const hasLocation =
        typeof lat === "number" && !Number.isNaN(lat) &&
        typeof lng === "number" && !Number.isNaN(lng);

      const propertyPayload: Record<string, any> = {
        name: propertyData?.propertyName || "Unnamed Property",
        description: `${propertyData?.propertyType || 'PG'} for ${propertyData?.propertyFor || 'Students'}`,
        propertyType: mapPropertyType(propertyData?.propertyType || 'PG'),
        address: propertyData?.address?.line1 
          ? `${propertyData.address.line1}, ${propertyData.address.line2 || ''}`.trim()
          : "Address not provided",
        city: propertyData?.address?.city || "Unknown",
        state: propertyData?.address?.state || "Unknown",
        pincode: propertyData?.address?.pincode || "000000",
        totalRooms: totalRooms,
        amenities: propertyAmenities,
        images: [],
        rules: {
          noticePeriod: floorsData?.noticePeriod || 30,
          securityDeposit: floorsData?.securityDeposit || 10000,
          pricingMode: floorsData?.pricingMode || "month",
          propertyFor: propertyData?.propertyFor || undefined,
        },
        rooms: rooms,
      };
      if (hasLocation) {
        propertyPayload.latitude = Number(lat);
        propertyPayload.longitude = Number(lng);
        propertyPayload.coordinates = { latitude: Number(lat), longitude: Number(lng) };
      }

      // Make API call
      const response = await propertyApi.post('/api/properties', propertyPayload);

      if (response.data.success) {
        const propertyId = response.data.property.uniqueId || generateID();
        Alert.alert("Success", "Property created successfully!");
        navigation.navigate("PropertySuccess", { id: propertyId });
      } else {
        throw new Error(response.data.message || "Failed to create property");
      }
    } catch (error: any) {
      console.error("Error creating property:", error);
      Alert.alert(
        "Error", 
        error.response?.data?.message || error.message || "Failed to create property. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get all room types and their prices
  const roomTypes = Object.keys(floorsData?.defaultPrices || {});
  const sampleRoomType = roomTypes[0] || "Single";
  const samplePrice = floorsData?.defaultPrices?.[sampleRoomType] || 15000;
  const priceText = `₹${samplePrice}/month`;

  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]">
      <ProfileHeader activeTab={fromVerify ? "Verify" : "Preview"} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140, paddingHorizontal: 20 }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mt-6 mb-4">
          <View>
            <Text className="text-2xl font-extrabold text-slate-900">Customer View Preview</Text>
            <Text className="text-slate-500 font-medium">Complete property details as customers see them</Text>
          </View>
          
        </View>

        {/* Customer View Container */}
        <View className="bg-white rounded-2xl p-1 shadow-lg border-2 border-blue-200">
          {/* Mock Phone Header */}
          <View className="bg-gray-100 rounded-t-xl px-4 py-2 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-3 h-3 bg-red-400 rounded-full mr-1" />
              <View className="w-3 h-3 bg-yellow-400 rounded-full mr-1" />
              <View className="w-3 h-3 bg-green-400 rounded-full" />
            </View>
            <Text className="text-gray-600 text-xs font-medium">Customer App View</Text>
            <View className="w-6" />
          </View>

          {/* Customer View Content */}
          <View className="p-4">
            {/* Header */}
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 rounded-full border border-gray-300 items-center justify-center bg-white mr-4">
                <Ionicons name="chevron-back" size={22} />
              </View>
              <Text className="text-[22px] font-semibold">Property Details</Text>
            </View>

            {/* Property Main Card */}
            <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
              {/* Property Name + Rent */}
              <View className="flex-row justify-between items-start">
                <Text className="text-[18px] font-semibold flex-1 pr-2">
                  {propertyData?.propertyName || "Property Name"}
                </Text>
                <Text className="text-[15px] font-semibold text-[#1E33FF]">
                  {priceText}
                </Text>
              </View>
              
              {/* Location */}
              <View className="flex-row items-center mt-2">
                <Ionicons name="location-outline" size={16} color="#6B7280" />
                <Text className="ml-1 text-gray-600 text-[14px]">
                  {propertyData?.address?.line1 ? ` ${propertyData.address.city}, ${propertyData.address.state} ` : "Property Location"}
                </Text>
              </View>
              
              {/* Property Type & Category */}
              <View className="flex-row flex-wrap gap-2 mt-4">
                <View className="px-3 py-1 rounded-full bg-gray-100">
                  <Text className="text-[13px] text-gray-700">
                    {propertyData?.propertyType || "PG"}
                  </Text>
                </View>
                <View className="px-3 py-1 rounded-full bg-gray-100">
                  <Text className="text-[13px] text-gray-700">
                    For {propertyData?.propertyFor || "Students"}
                  </Text>
                </View>
                <View className="px-3 py-1 rounded-full bg-gray-100">
                  <Text className="text-[13px] text-gray-700">
                    {totalRooms} Rooms
                  </Text>
                </View>
              </View>
              
              {/* Divider */}
              <View className="h-[1px] bg-gray-200 my-5" />
              
              {/* Property ID */}
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <Ionicons name="pricetag-outline" size={16} color="#6B7280" />
                  <Text className="ml-2 text-gray-600 text-[13px]">Property ID</Text>
                </View>
                <View className="px-3 py-1 rounded-full bg-gray-100">
                  <Text className="text-[13px] font-semibold">{generateID()}</Text>
                </View>
              </View>
              
              {/* Admin Contact */}
              <View className="flex-row items-center justify-between rounded-xl p-3 bg-[#EEF2FF]">
                <View>
                  <Text className="text-gray-600 text-[12px]">Admin Contact</Text>
                  <Text className="text-[15px] font-semibold">+91 98765 43210</Text>
                </View>
                <View className="w-12 h-12 rounded-full items-center justify-center bg-[#1E33FF]">
                  <Ionicons name="call-outline" size={22} color="#fff" />
                </View>
              </View>
            </View>

            {/* Property Facilities */}
            <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
              <Text className="text-[18px] font-semibold text-black mb-3">Property Facilities</Text>
              <View className="flex-row flex-wrap gap-2">
                {selectedPropertyFacilities.length > 0 ? selectedPropertyFacilities.map((facility, index) => (
                  <View key={index} className="px-4 py-2 rounded-full bg-indigo-100">
                    <Text className="text-sm font-semibold text-indigo-700">{facility}</Text>
                  </View>
                )) : (
                  <Text className="text-gray-500 text-sm">No property facilities selected</Text>
                )}
                {facilitiesData?.hasParking && (
                  <View className="px-4 py-2 rounded-full bg-indigo-100">
                    <Text className="text-sm font-semibold text-indigo-700">Parking Available</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Room Facilities */}
            <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
              <Text className="text-[18px] font-semibold text-black mb-3">Room Facilities</Text>
              <View className="flex-row flex-wrap gap-2">
                {selectedRoomFacilities.length > 0 ? selectedRoomFacilities.map((facility, index) => (
                  <View key={index} className="px-4 py-2 rounded-full bg-indigo-100">
                    <Text className="text-sm font-semibold text-indigo-700">{facility}</Text>
                  </View>
                )) : (
                  <Text className="text-gray-500 text-sm">No room facilities selected</Text>
                )}
              </View>
            </View>

            {/* Food Service */}
            {facilitiesData?.foodAvailable && (
              <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                <Text className="text-[18px] font-semibold text-black mb-3">Food Service</Text>
                <View className="flex-row items-center mb-2">
                  <Ionicons name="restaurant-outline" size={16} color="#059669" />
                  <Text className="ml-2 text-green-600 font-semibold">Food Available</Text>
                </View>
                {facilitiesData?.foodType && (
                  <Text className="text-gray-600 text-sm">Type: {facilitiesData.foodType}</Text>
                )}
                {facilitiesData?.foodPrice && (
                  <Text className="text-gray-600 text-sm">Price: ₹{facilitiesData.foodPrice}/month</Text>
                )}
              </View>
            )}

            {/* Room Types & Pricing */}
            <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
              <Text className="text-[18px] font-semibold text-black mb-3">Room Types & Pricing</Text>
              <View className="space-y-3">
                {Object.entries(floorsData?.defaultPrices || {}).map(([type, price]: [string, any]) => (
                  <View key={type} className="flex-row justify-between items-center p-3 bg-gray-50 rounded-xl">
                    <View>
                      <Text className="font-semibold text-gray-900">{type} Room</Text>
                      <Text className="text-gray-600 text-sm">Per Month</Text>
                    </View>
                    <Text className="text-[#1E33FF] font-bold text-lg">₹{price}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Property Terms */}
            <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
              <Text className="text-[18px] font-semibold text-black mb-3">Property Terms</Text>
              <View className="space-y-3">
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Security Deposit</Text>
                  <Text className="font-semibold text-gray-900">₹{floorsData?.securityDeposit || 10000}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Notice Period</Text>
                  <Text className="font-semibold text-gray-900">{floorsData?.noticePeriod || 30} Days</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Billing Cycle</Text>
                  <Text className="font-semibold text-gray-900">Per Month</Text>
                </View>
              </View>
            </View>

            

            {/* Property Rules (if any) */}
            {(propertyData?.rules || floorsData?.rules) && (
              <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                <Text className="text-[18px] font-semibold text-black mb-3">Property Rules</Text>
                <View className="space-y-2">
                  <View className="flex-row items-center">
                    <Ionicons name="time-outline" size={16} color="#6B7280" />
                    <Text className="ml-2 text-gray-600 text-sm">Check-in: After 12:00 PM</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="moon-outline" size={16} color="#6B7280" />
                    <Text className="ml-2 text-gray-600 text-sm">Quiet hours: 10:00 PM - 7:00 AM</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="people-outline" size={16} color="#6B7280" />
                    <Text className="ml-2 text-gray-600 text-sm">Visitors allowed with prior notice</Text>
                  </View>
                </View>
              </View>
            )}

            
          </View>
        </View>

        {/* Admin Summary Section */}
        {/* <View className="mt-6 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <Text className="text-lg font-bold text-gray-900 mb-4">Configuration Summary</Text>
          
          <View className="grid grid-cols-3 gap-4 mb-4">
            <View className="bg-indigo-50 p-3 rounded-xl items-center">
              <Ionicons name="bed-outline" size={20} color="#4F46E5" />
              <Text className="text-indigo-600 font-bold text-lg mt-1">{totalRooms}</Text>
              <Text className="text-indigo-600 text-xs">Total Rooms</Text>
            </View>
            <View className="bg-emerald-50 p-3 rounded-xl items-center">
              <Ionicons name="layers-outline" size={20} color="#059669" />
              <Text className="text-emerald-600 font-bold text-lg mt-1">{floorsData?.floors || 0}</Text>
              <Text className="text-emerald-600 text-xs">Floors</Text>
            </View>
            <View className="bg-amber-50 p-3 rounded-xl items-center">
              <Ionicons name="sparkles-outline" size={20} color="#D97706" />
              <Text className="text-amber-600 font-bold text-lg mt-1">{selectedPropertyFacilities.length + selectedRoomFacilities.length}</Text>
              <Text className="text-amber-600 text-xs">Facilities</Text>
            </View>
          </View>

          <View className="space-y-2">
            <Text className="text-sm text-gray-600">
              <Text className="font-semibold">Property Type:</Text> {propertyData?.propertyType} for {propertyData?.propertyFor}
            </Text>
            <Text className="text-sm text-gray-600">
              <Text className="font-semibold">Pricing:</Text> {Object.keys(floorsData?.defaultPrices || {}).length} room types configured
            </Text>
            <Text className="text-sm text-gray-600">
              <Text className="font-semibold">Location:</Text> {propertyData?.address?.city}, {propertyData?.address?.state}
            </Text>
          </View>
        </View> */}

        {/* Edit Options */}
        <View className="mt-6 space-y-3">
          <TouchableOpacity
            onPress={handleEditProperty}
            className="flex-row items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100"
          >
            <View className="flex-row items-center">
              <Ionicons name="business-outline" size={20} color="#4F46E5" />
              <Text className="ml-3 font-semibold text-gray-800">Edit Property Details</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleEditFacilities}
            className="flex-row items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100"
          >
            <View className="flex-row items-center">
              <Ionicons name="sparkles-outline" size={20} color="#4F46E5" />
              <Text className="ml-3 font-semibold text-gray-800">Edit Facilities</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleEditRooms}
            className="flex-row items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100"
          >
            <View className="flex-row items-center">
              <Ionicons name="bed-outline" size={20} color="#4F46E5" />
              <Text className="ml-3 font-semibold text-gray-800">Edit Rooms & Pricing</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Buttons */}
      <View 
        style={{ 
          position: 'absolute', bottom: 0, left: 0, right: 0, 
          backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#f1f5f9',
          paddingBottom: Platform.OS === 'ios' ? 34 : 20, paddingTop: 15, paddingHorizontal: 20,
          shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 20
        }}
      >
        <View className="flex-row space-x-3">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="flex-1 bg-slate-100 py-4 rounded-2xl items-center"
          >
            <Text className="text-slate-600 font-bold text-base">Back</Text>
          </TouchableOpacity>
          
          {fromVerify ? (
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting}
              className={`flex-[2] py-4 rounded-2xl items-center shadow-lg ${isSubmitting ? 'bg-gray-400' : 'bg-green-600 shadow-green-300'}`}
            >
              {isSubmitting ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="#fff" />
                  <Text className="text-white font-bold text-base ml-2">Submitting...</Text>
                </View>
              ) : (
                <View className="flex-row items-center">
                  <Text className="text-white font-bold text-base mr-2">Confirm & Submit</Text>
                  <Ionicons name="checkmark-circle" size={18} color="white" />
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleContinue}
              className="flex-[2] bg-indigo-600 py-4 rounded-2xl items-center shadow-lg shadow-indigo-300"
            >
              <View className="flex-row items-center">
                <Text className="text-white font-bold text-base mr-2">Continue to Verify</Text>
                <Ionicons name="arrow-forward" size={18} color="white" />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}