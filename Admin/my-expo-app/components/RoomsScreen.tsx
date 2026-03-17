import React, { useState, useRef, createRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ProfileHeader from "./SetupHeader";
import { Ionicons } from "@expo/vector-icons";

const { height: screenHeight } = Dimensions.get("window");

interface DropdownPosition {
  roomIndex: number;
  type: "type" | "billing";
  x: number;
  y: number;
  width: number;
  items: string[];
}

export default function RoomsScreen({ navigation, route }: any) {
  // Get all data from FloorsScreen
  const { 
    floors, 
    avgRooms, 
    defaultPrices,
    propertyData = {},
    facilitiesData = {},
    noticePeriod = 30,
    securityDeposit = 10000,
    pricingMode = "month"
  } = route.params || {};

  const floorNames = ["Ground", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth"];
  
  // Generate floor names dynamically if more than predefined names
  const generateFloorName = (index: number) => {
    if (index < floorNames.length) {
      return floorNames[index];
    }
    // For floors beyond 10, use ordinal numbers
    const ordinals = ["th", "st", "nd", "rd"];
    const num = index + 1;
    const suffix = ordinals[(num % 10 > 3 || Math.floor(num / 10) === 1) ? 0 : num % 10];
    return `${num}${suffix} Floor`;
  };
  
  const usedFloors = Array.from({ length: floors }, (_, i) => generateFloorName(i));
  const AVAILABLE_TYPES = Object.keys(defaultPrices);

  // Logic: Ground -> 001, First -> 101, etc.
  const getFormattedRoomNumber = (floorIdx: number, roomIdx: number) => {
    const sequence = String(roomIdx + 1).padStart(2, "0");
    return `${floorIdx}${sequence}`;
  };

  const generateRooms = (floorIdx: number) =>
    Array.from({ length: avgRooms }, (_, i) => ({
      number: getFormattedRoomNumber(floorIdx, i),
      type: AVAILABLE_TYPES[0] || "Single",
      price: defaultPrices[AVAILABLE_TYPES[0]] || "10000",
      perMonth: "Month",
    }));

  const [activeFloor, setActiveFloor] = useState(0);
  const [allRooms, setAllRooms] = useState(
    usedFloors.map((_, idx) => generateRooms(idx))
  );

  const [openDropdown, setOpenDropdown] = useState<DropdownPosition | null>(null);
  const roomCardRefs = useRef<any>({});
  const scrollViewRef = useRef<ScrollView>(null);

  const changeFloor = (index: number) => {
    setActiveFloor(index);
    setOpenDropdown(null);
    // Scroll to top when changing floors
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const updateRoom = (index: number, key: string, value: string) => {
    const copy = [...allRooms];
    const finalValue = (key === 'price') ? value.replace(/[^0-9]/g, '') : value;
    // @ts-ignore
    copy[activeFloor][index][key] = finalValue;

    // Auto-populate price when type changes
    if (key === "type" && defaultPrices[value]) {
      copy[activeFloor][index]["price"] = defaultPrices[value];
    }
    setAllRooms(copy);
  };

  const addRoom = () => {
    setOpenDropdown(null);
    const copy = [...allRooms];
    const newIdx = copy[activeFloor].length;
    const initialType = AVAILABLE_TYPES[0] || "Single";
    copy[activeFloor].push({
      number: getFormattedRoomNumber(activeFloor, newIdx),
      type: initialType,
      price: defaultPrices[initialType] || "10000",
      perMonth: "Month",
    });
    setAllRooms(copy);
  };

  const deleteRoom = (index: number) => {
    setOpenDropdown(null);
    const copy = [...allRooms];
    copy[activeFloor].splice(index, 1);
    
    // Renumber all remaining rooms on this floor
    copy[activeFloor] = copy[activeFloor].map((room, idx) => ({
      ...room,
      number: getFormattedRoomNumber(activeFloor, idx)
    }));
    
    setAllRooms(copy);
  };

  const handleNextOrSave = () => {
    setOpenDropdown(null);
    if (activeFloor < usedFloors.length - 1) {
      setActiveFloor(activeFloor + 1);
      // Scroll to top when moving to next floor
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      // Navigate back to Verify with all collected data
      navigation.navigate("Verify", {
        propertyData: propertyData || {},
        facilitiesData: facilitiesData || {},
        floorsData: { 
          floors: floors || 0, 
          avgRooms: avgRooms || 0, 
          defaultPrices: defaultPrices || {},
          noticePeriod,
          securityDeposit,
          pricingMode
        },
        allRooms,
        usedFloors,
      });
    }
  };

  const openAndPositionDropdown = (index: number, type: "type" | "billing") => {
    const refKey = `${activeFloor}-${index}-${type}`;
    const ref = roomCardRefs.current[refKey];

    if (ref) {
      ref.measureInWindow((x: number, y: number, width: number, height: number) => {
        setOpenDropdown({
          roomIndex: index,
          type: type,
          x: x,
          y: y + height,
          width: width,
          items: type === "type" ? AVAILABLE_TYPES : ["Day", "Month"],
        });
      });
    }
  };

  const renderDropdownOverlay = () => {
    // CRITICAL FIX: Don't render the blocker if dropdown isn't open
    if (!openDropdown) return null;

    const room = allRooms[activeFloor][openDropdown.roomIndex];
    const key = openDropdown.type === "type" ? "type" : "perMonth";

    return (
      <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, zIndex: 9999 }}>
        <TouchableOpacity activeOpacity={1} onPress={() => setOpenDropdown(null)} style={{ flex: 1 }} />
        <View style={{
            position: "absolute",
            top: openDropdown.y + 5,
            left: openDropdown.x,
            width: openDropdown.width,
            backgroundColor: "white",
            borderWidth: 1,
            borderColor: "#E5E7EB",
            borderRadius: 12,
            elevation: 10,
            overflow: 'hidden',
          }}
        >
          {openDropdown.items.map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => {
                updateRoom(openDropdown.roomIndex, key, item);
                setOpenDropdown(null);
              }}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: room[key] === item ? '#F0F3FF' : 'white',
              }}
            >
              <Text style={{ color: room[key] === item ? '#2F3CFF' : 'black', fontWeight: '500' }}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ProfileHeader activeTab="Rooms" />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollViewRef}
          className="px-6 mt-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 80 }}
          onScrollBeginDrag={() => setOpenDropdown(null)}
        >
          <Text className="text-[20px] font-semibold">Step 4 - Rooms & Pricing</Text>

          {/* FLOOR TABS - SCROLLABLE */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            className="bg-gray-100 rounded-xl mt-4 p-1"
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {usedFloors.map((floor, index) => (
              <TouchableOpacity
                key={floor}
                onPress={() => changeFloor(index)}
                className={`px-6 py-2 rounded-lg ${activeFloor === index ? "bg-white shadow-sm" : ""}`}
                style={{ minWidth: 100 }}
              >
                <Text className={`text-center font-medium ${activeFloor === index ? "text-[#2F3CFF]" : "text-gray-600"}`}>
                  {floor}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {allRooms[activeFloor].map((room, index) => (
            <View key={`${activeFloor}-${index}`} className="mt-4 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <View className="flex-row justify-between mb-4">
                <View className="w-[48%]">
                  <Text className="text-gray-500 mb-1 text-xs font-bold uppercase">Room Number</Text>
                  <TextInput
                    value={room.number}
                    onChangeText={(t) => updateRoom(index, "number", t)}
                    className="border border-gray-100 bg-gray-50 rounded-xl px-4 py-3"
                  />
                </View>

                <View className="w-[48%]">
                  <Text className="text-gray-500 mb-1 text-xs font-bold uppercase">Type</Text>
                  <TouchableOpacity
                    ref={(el) => (roomCardRefs.current[`${activeFloor}-${index}-type`] = el)}
                    onPress={() => openAndPositionDropdown(index, "type")}
                    className="border border-gray-100 bg-gray-50 rounded-xl px-4 py-3 flex-row justify-between items-center"
                  >
                    <Text className="text-gray-800">{room.type}</Text>
                    <Ionicons name="chevron-down" size={16} color="gray" />
                  </TouchableOpacity>
                </View>
              </View>

              <View className="flex-row justify-between">
                <View className="w-[48%]">
                  <Text className="text-gray-500 mb-1 text-xs font-bold uppercase">Price / Person</Text>
                  <TextInput
                    value={room.price}
                    onChangeText={(t) => updateRoom(index, "price", t)}
                    keyboardType="numeric"
                    className="border border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-blue-600 font-bold"
                  />
                </View>

                <View className="w-[48%]">
                  <Text className="text-gray-500 mb-1 text-xs font-bold uppercase">Billing</Text>
                  <TouchableOpacity
                    ref={(el) => (roomCardRefs.current[`${activeFloor}-${index}-billing`] = el)}
                    onPress={() => openAndPositionDropdown(index, "billing")}
                    className="border border-gray-100 bg-gray-50 rounded-xl px-4 py-3 flex-row justify-between items-center"
                  >
                    <Text className="text-gray-800">{room.perMonth}</Text>
                    <Ionicons name="chevron-down" size={16} color="gray" />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity onPress={() => deleteRoom(index)} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 border-2 border-white shadow-sm">
                <Ionicons name="close" size={16} color="white" />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity onPress={addRoom} className="mt-6 border-2 border-dashed border-gray-300 rounded-2xl py-4 items-center">
            <Text className="text-gray-400 font-bold">+ Add Another Room</Text>
          </TouchableOpacity>

          {/* NAVIGATION BUTTONS */}
          <View className="flex-row justify-between mt-10">
            <TouchableOpacity
              onPress={() => activeFloor === 0 ? navigation.goBack() : changeFloor(activeFloor - 1)}
              className="px-8 py-4 rounded-xl bg-gray-100"
            >
              <Text className="text-gray-600 font-bold">Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNextOrSave}
              className="px-10 py-4 rounded-xl bg-[#2F3CFF] shadow-lg shadow-blue-200"
            >
              <Text className="text-white font-bold">
                {activeFloor === usedFloors.length - 1 ? "Finish ›" : "Next Floor ›"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Renders overlay only when needed */}
      {renderDropdownOverlay()}
    </SafeAreaView> 
  );
}