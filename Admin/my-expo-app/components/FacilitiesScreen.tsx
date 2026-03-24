import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ProfileHeader from "./SetupHeader";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

export default function FacilitiesScreen({ navigation, route }: any) {
  // Get data from previous screen - ProfileSetup passes individual properties
  const { 
    propertyName, 
    propertyType, 
    propertyFor, 
    address, 
    coordinates,
    returnToPreview = false,
    facilitiesData: existingFacilitiesData,
    floorsData: existingFloorsData,
    allRooms: existingAllRooms,
    usedFloors: existingUsedFloors,
    fromVerify: existingFromVerify
  } = route.params || {};
  
  const propertyData = { propertyName, propertyType, propertyFor, address, coordinates };
  
  // --- PROPERTY FACILITIES ---
  const propertyFacilitiesList = [
    { label: "Wifi", icon: "wifi-outline" },
    { label: "CCTV", icon: "videocam-outline" },
    { label: "Lift", icon: "arrow-up-circle-outline" },
    { label: "Security 24x7", icon: "shield-checkmark-outline" },
    { label: "Hot Water", icon: "water-outline" },
    { label: "Self Cooking allowed", icon: "restaurant-outline" }, 
    { label: "House Keeping", icon: "hammer-outline" },
    { label: "Washing Machine", icon: "shirt-outline" },
    { label: "Power Backup", icon: "battery-charging-outline" },
    { label: "Indoor Games", icon: "game-controller-outline" },
    { label: "Gym", icon: "barbell-outline" },
  ];

  const [propertyFacilities, setPropertyFacilities] = useState(
    existingFacilitiesData?.propertyFacilities || propertyFacilitiesList.map(() => false)
  );

  const togglePropertyFacility = (idx: number) => {
    setPropertyFacilities((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  };

  // --- PARKING ---
  const [hasParking, setHasParking] = useState(existingFacilitiesData?.hasParking || false);
  const [parkingType, setParkingType] = useState(existingFacilitiesData?.parkingType || { two: false, four: false });

  // --- FOOD ---
  const [foodAvailable, setFoodAvailable] = useState(existingFacilitiesData?.foodAvailable || false);
  const [foodType, setFoodType] = useState<"Pure Veg" | "Non-Veg" | "Both" | null>(existingFacilitiesData?.foodType || null);
  const [cuisineType, setCuisineType] = useState<"North" | "South" | "Both" | null>(existingFacilitiesData?.cuisineType || null);

  // --- ROOM FACILITIES (Optimized with MaterialCommunityIcons) ---
  const roomFacilitiesList = [
    { label: "Table & Chair", icon: "table-chair" }, 
    { label: "Wardrobe", icon: "wardrobe-outline" },
    { label: "Cupboard Lock", icon: "lock-smart" }, 
    { label: "Geyser", icon: "water-boiler" }, 
    { label: "Fridge", icon: "fridge-outline" },
    { label: "Attached Bath", icon: "shower" },
    { label: "AC", icon: "air-conditioner" },
    { label: "Balcony", icon: "balcony" },
    { label: "RO Water", icon: "water-check-outline" },
  ];

  const [roomFacilities, setRoomFacilities] = useState(
    existingFacilitiesData?.roomFacilities || roomFacilitiesList.map(() => false)
  );

  const toggleRoomFacility = (idx: number) => {
    setRoomFacilities((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  };

  /**
   * UNIFORM CARD COMPONENT
   */
  const Card = ({ label, icon, active, onPress, iconLibrary = "Ionicons" }: any) => {
    const IconComponent = iconLibrary === "MaterialCommunityIcons" ? MaterialCommunityIcons : Ionicons;
    
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        className={`w-[31%] min-h-[85px] p-2 mt-3 rounded-2xl border-2 items-center justify-center ${
          active ? "bg-indigo-50 border-indigo-600" : "bg-gray-50 border-transparent"
        }`}
      >
        <IconComponent name={icon as any} size={24} color={active ? "#4F46E5" : "#6B7280"} />
        <Text 
          numberOfLines={2} 
          className={`mt-2 text-[10px] font-bold text-center leading-tight ${
            active ? "text-indigo-900" : "text-gray-600"
          }`}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const ACTIVE_COLOR = "#4F46E5";

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ProfileHeader activeTab="Facilities" />

      <ScrollView
        className="px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* PROPERTY FACILITIES */}
        <Text className="text-xl font-bold text-gray-900 mt-6">Property Facilities</Text>
        <View className="flex-row flex-wrap justify-between">
          {propertyFacilitiesList.map((f, i) => (
            i !== 5 && <Card key={i} label={f.label} icon={f.icon} active={propertyFacilities[i]} onPress={() => togglePropertyFacility(i)} />
          ))}
        </View>

        {/* PARKING FACILITY */}
        <View className="mt-8 p-5 bg-gray-50 rounded-3xl border border-gray-100">
          <View className="flex-row justify-between items-center">
            <Text className="text-lg font-bold text-gray-800">Parking Available?</Text>
            <Switch 
              value={hasParking} 
              onValueChange={setHasParking} 
              trackColor={{ false: "#D1D5DB", true: "#A5B4FC" }}
              thumbColor={hasParking ? ACTIVE_COLOR : "#F3F4F6"}
            />
          </View>
          {hasParking && (
            <View className="flex-row justify-between">
              <Card 
                label="Two Wheeler" 
                icon="moped" 
                iconLibrary="MaterialCommunityIcons"
                active={parkingType.two} 
                onPress={() => setParkingType({ ...parkingType, two: !parkingType.two })} 
              />
              <Card 
                label="Four Wheeler" 
                icon="car-side" 
                iconLibrary="MaterialCommunityIcons"
                active={parkingType.four} 
                onPress={() => setParkingType({ ...parkingType, four: !parkingType.four })} 
              />
              <View className="w-[31%]" />
            </View>
          )}
        </View>

        {/* FOOD SERVICE */}
        <View className="mt-8">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-xl font-bold text-gray-900">Food Service</Text>
            <Switch 
              value={foodAvailable} 
              onValueChange={setFoodAvailable} 
              trackColor={{ false: "#D1D5DB", true: "#A5B4FC" }}
              thumbColor={foodAvailable ? ACTIVE_COLOR : "#F3F4F6"}
            />
          </View>

          {foodAvailable && (
            <View className="bg-slate-50 p-4 rounded-3xl border border-slate-100 mt-2">
              <Text className="font-bold text-gray-700 mb-1">Food Type</Text>
              <View className="flex-row justify-between">
                <Card label="Pure Veg" icon="leaf-outline" active={foodType === "Pure Veg"} onPress={() => setFoodType("Pure Veg")} />
                <Card label="Non-Veg" icon="pizza-outline" active={foodType === "Non-Veg"} onPress={() => setFoodType("Non-Veg")} />
                <Card label="Both" icon="fast-food-outline" active={foodType === "Both"} onPress={() => setFoodType("Both")} />
              </View>

              <Text className="font-bold text-gray-700 mt-4 mb-1">Cuisine</Text>
              <View className="flex-row justify-between">
                <Card label="North" icon="restaurant-outline" active={cuisineType === "North"} onPress={() => setCuisineType("North")} />
                <Card label="South" icon="restaurant-outline" active={cuisineType === "South"} onPress={() => setCuisineType("South")} />
                <Card label="Both" icon="restaurant-outline" active={cuisineType === "Both"} onPress={() => setCuisineType("Both")} />
              </View>

              <Text className="font-bold text-gray-700 mt-4 mb-1">Cooking</Text>
              <View className="flex-row">
                <Card label="Self Cooking allowed" icon="restaurant-outline" active={propertyFacilities[5]} onPress={() => togglePropertyFacility(5)} />
              </View>
            </View>
          )}
        </View>

        {/* ROOM FACILITIES - UPDATED ICONS */}
        <Text className="text-xl font-bold text-gray-900 mt-10">Room Facilities</Text>
        <View className="flex-row flex-wrap justify-between">
          {roomFacilitiesList.map((f, i) => (
            <Card 
                key={i} 
                label={f.label} 
                icon={f.icon} 
                iconLibrary="MaterialCommunityIcons"
                active={roomFacilities[i]} 
                onPress={() => toggleRoomFacility(i)} 
            />
          ))}
        </View>

        {/* NAVIGATION BUTTONS */}
        <View className="flex-row items-center justify-between mt-12 mb-6">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            className="flex-row items-center justify-center px-8 py-4 rounded-2xl bg-gray-100 border border-gray-200"
          >
            <Ionicons name="chevron-back" size={20} color="#4B5563" />
            <Text className="text-gray-600 font-bold ml-1">Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              const facilitiesData = {
                propertyFacilities,
                hasParking,
                parkingType,
                foodAvailable,
                foodType,
                cuisineType,
                roomFacilities,
              };
              
              if (returnToPreview) {
                // Return to preview with updated data
                navigation.navigate("PropertyPreview", {
                  propertyData,
                  facilitiesData,
                  floorsData: existingFloorsData,
                  allRooms: existingAllRooms,
                  usedFloors: existingUsedFloors,
                  fromVerify: existingFromVerify
                });
              } else {
                // Normal flow - go to Floors
                navigation.navigate("Floors", {
                  propertyData,
                  facilitiesData
                });
              }
            }}
            activeOpacity={0.8}
            style={{
              shadowColor: "#2F3CFF",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5
            }}
            className="flex-row items-center justify-center px-10 py-4 rounded-2xl bg-[#2F3CFF]"
          >
            <Text className="text-white font-bold text-lg mr-1">{returnToPreview ? "Save & Return" : "Next Step"}</Text>
            <Ionicons name={returnToPreview ? "checkmark" : "chevron-forward"} size={20} color="white" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}