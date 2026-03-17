import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ProfileHeader from "./SetupHeader";
import { Ionicons } from "@expo/vector-icons";
import { propertyApi } from "../utils/api";
import { debugToken } from "../utils/tokenDebug";

export default function VerifyScreen({ navigation, route }: any) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { 
    allRooms = [], 
    usedFloors = [],
    propertyData = {},
    facilitiesData = {},
    floorsData = {}
  } = route.params || {};

  // Calculate total rooms for the summary
  const totalRooms = Array.isArray(allRooms) ? allRooms.reduce((acc: number, floor: any[]) => acc + (Array.isArray(floor) ? floor.length : 0), 0) : 0;

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

  const handleConfirm = async () => {
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

  const handlePreview = () => {
    navigation.navigate("PropertyPreview", {
      propertyData,
      facilitiesData,
      floorsData,
      allRooms,
      usedFloors,
      fromVerify: true // Flag to indicate this came from verify screen
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ProfileHeader activeTab="Verify" />

      <ScrollView
        className="px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        <View className="mt-6">
          <Text className="text-2xl font-bold text-gray-900">Step 5 – Final Review</Text>
          <Text className="text-gray-500 mt-1">Please verify your floor and room configuration.</Text>
        </View>

        {/* SUMMARY CARD */}
        <View className="mt-6 bg-indigo-50 p-4 rounded-3xl border border-indigo-100">
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-indigo-900 font-bold text-lg">Property Summary</Text>
              <Text className="text-indigo-600 font-medium">{usedFloors.length} Floors • {totalRooms} Total Rooms</Text>
            </View>
            <View className="bg-indigo-600 p-2 rounded-full">
              <Ionicons name="checkmark-done" size={24} color="white" />
            </View>
          </View>
          
          {/* Preview Button */}
          <TouchableOpacity
            onPress={handlePreview}
            className="bg-white border border-indigo-200 rounded-2xl p-3 flex-row items-center justify-center"
          >
            <Ionicons name="eye-outline" size={20} color="#4F46E5" />
            <Text className="text-indigo-600 font-semibold ml-2">Preview All Details</Text>
          </TouchableOpacity>
        </View>

        {/* TABLE DATA GROUPED BY FLOOR */}
        {allRooms.map((floorRooms: any[], floorIdx: number) => (
          <View key={floorIdx} className="mt-6">
            <View className="flex-row items-center mb-3">
              <Text className="text-lg font-bold text-gray-800">{usedFloors[floorIdx]} Floor</Text>
              <View className="h-[1px] bg-gray-200 flex-1 ml-3" />
            </View>

            <View className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <View className="flex-row bg-gray-50 py-3 px-4 border-b border-gray-100">
                <Text className="flex-1 font-bold text-gray-500 text-xs uppercase tracking-wider">Room</Text>
                <Text className="flex-1 font-bold text-gray-500 text-xs uppercase tracking-wider text-center">Sharing</Text>
                <Text className="flex-1 font-bold text-gray-500 text-xs uppercase tracking-wider text-right">Price</Text>
              </View>

              {floorRooms.map((room, roomIdx) => (
                <View key={roomIdx} className={`flex-row py-4 px-4 ${roomIdx !== floorRooms.length - 1 ? 'border-b border-gray-50' : ''}`}>
                  <Text className="flex-1 font-bold text-gray-700">{room.number}</Text>
                  <Text className="flex-1 text-gray-600 text-center font-medium">{room.type}</Text>
                  <Text className="flex-1 font-extrabold text-blue-600 text-right">₹{room.price}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* ACTIONS */}
        <View className="flex-row justify-between mt-10 mb-6">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="flex-1 mr-3 py-4 rounded-2xl bg-gray-100 items-center border border-gray-200"
          >
            <Text className="text-gray-600 font-bold text-lg">Edit Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleConfirm}
            disabled={isSubmitting}
            style={{ elevation: 5, shadowColor: '#2F3CFF', shadowOpacity: 0.3, shadowRadius: 10 }}
            className={`flex-[2] py-4 rounded-2xl items-center justify-center flex-row ${isSubmitting ? 'bg-gray-400' : 'bg-[#2F3CFF]'}`}
          >
            {isSubmitting ? (
              <>
                <ActivityIndicator color="white" size="small" />
                <Text className="text-white font-bold text-lg ml-2">Submitting...</Text>
              </>
            ) : (
              <>
                <Text className="text-white font-bold text-lg mr-2">Confirm & Submit</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}