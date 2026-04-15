import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Modal,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { State, City } from "country-state-city";

import ProfileHeader from "./SetupHeader";
import MapFallback from "./MapFallback";

// Using country-state-city library for state and city data

export default function ProfileSetupScreen({ navigation, route }: any) {
  // Get data if returning from preview
  const { 
    returnToPreview = false,
    facilitiesData: existingFacilitiesData,
    floorsData: existingFloorsData,
    allRooms: existingAllRooms,
    usedFloors: existingUsedFloors,
    fromVerify: existingFromVerify,
    // Property data fields
    propertyName: existingPropertyName,
    propertyType: existingPropertyType,
    propertyFor: existingPropertyFor,
    address: existingAddress,
    coordinates: existingCoordinates
  } = route.params || {};

  /* -------------------- STATES -------------------- */
  const [propertyType, setPropertyType] = useState(existingPropertyType || "PG");
  const [propertyFor, setPropertyFor] = useState(existingPropertyFor || "Boys");
  const [propertyName, setPropertyName] = useState(existingPropertyName || "");
  
  const [address, setAddress] = useState(existingAddress || {
    line1: "",
    line2: "",
    state: "",
    stateCode: "", // API needs the ISO code (e.g., 'RJ' for Rajasthan)
    city: "",
    pincode: "",
  });

  const [coordinates, setCoordinates] = useState(existingCoordinates || {
    latitude: 28.6139,
    longitude: 77.209,
  });
  const [locationSet, setLocationSet] = useState(!!existingCoordinates);
  const [mapRegion, setMapRegion] = useState({
    latitude: 28.6139,
    longitude: 77.209,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });
  const [addressSearchQuery, setAddressSearchQuery] = useState("");
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [gettingCurrentLocation, setGettingCurrentLocation] = useState(false);
  const mapRef = useRef<MapView>(null);

  // API Data States
  const [stateList, setStateList] = useState<any[]>([]);
  const [cityList, setCityList] = useState<any[]>([]);
  const [loading, setLoading] = useState({ states: false, cities: false });

  const [errors, setErrors] = useState<any>({});
  const [locationHint, setLocationHint] = useState<string | null>(null);
  const [isStateModalVisible, setStateModalVisible] = useState(false);
  const [isCityModalVisible, setCityModalVisible] = useState(false);

  useEffect(() => {
    if (!locationHint) return;
    const t = setTimeout(() => setLocationHint(null), 6000);
    return () => clearTimeout(t);
  }, [locationHint]);

  /* -------------------- GEOCODE (search address → map zooms to location) -------------------- */
  const searchAddressOnMap = async () => {
    const query = (addressSearchQuery || `${address.line1} ${address.city} ${address.state} ${address.pincode}`).trim();
    if (!query) return;
    setSearchingLocation(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { "User-Agent": "MyStay-Admin/1.0" } }
      );
      const data = await res.json();
      if (Array.isArray(data) && data[0]) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
          setCoordinates({ latitude: lat, longitude: lon });
          const region = regionFromCoords(lat, lon);
          setMapRegion(region);
          setTimeout(() => mapRef.current?.animateToRegion(region, 400), 100);
        }
      }
    } catch (e) {
      console.warn("Geocode error:", e);
    } finally {
      setSearchingLocation(false);
    }
  };

  const regionFromCoords = (lat: number, lon: number) => ({
    latitude: lat,
    longitude: lon,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });

  const centerMapOnPin = () => {
    const region = regionFromCoords(coordinates.latitude, coordinates.longitude);
    setMapRegion(region);
    mapRef.current?.animateToRegion(region, 400);
  };

  const setPinAt = (lat: number, lon: number) => {
    if (Number.isNaN(lat) || Number.isNaN(lon)) return;
    setCoordinates({ latitude: lat, longitude: lon });
    setLocationSet(true);
    setMapRegion(regionFromCoords(lat, lon));
    mapRef.current?.animateToRegion(regionFromCoords(lat, lon), 300);
  };

  const useCurrentLocation = async () => {
    setLocationHint(null);
    setGettingCurrentLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationHint("Location permission is required to use your current position.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = position.coords;
      setPinAt(latitude, longitude);
    } catch (e) {
      console.warn("Current location error:", e);
      setLocationHint("Could not get your location. Try searching by address instead.");
    } finally {
      setGettingCurrentLocation(false);
    }
  };

  /* -------------------- FETCH STATES & CITIES -------------------- */

  // Fetch all Indian States on component mount using country-state-city library
  useEffect(() => {
    setLoading(prev => ({ ...prev, states: true }));
    try {
      // Get all states of India (country code: IN)
      const indianStates = State.getStatesOfCountry("IN");
      const formattedStates = indianStates.map((state) => ({
        name: state.name,
        iso2: state.isoCode,
      })).sort((a, b) => a.name.localeCompare(b.name));
      setStateList(formattedStates);
    } catch (error) {
      console.error("Error fetching states:", error);
    } finally {
      setLoading(prev => ({ ...prev, states: false }));
    }
  }, []);

  // Fetch Cities when a state is selected using country-state-city library
  const fetchCities = (stateCode: string) => {
    setLoading(prev => ({ ...prev, cities: true }));
    try {
      // Get all cities of the selected state in India
      const cities = City.getCitiesOfState("IN", stateCode);
      const formattedCities = cities.map((city) => ({
        name: city.name,
      })).sort((a, b) => a.name.localeCompare(b.name));
      setCityList(formattedCities);
    } catch (error) {
      console.error("Error fetching cities:", error);
      setCityList([]);
    } finally {
      setLoading(prev => ({ ...prev, cities: false }));
    }
  };

  /* -------------------- VALIDATION -------------------- */
  const validate = () => {
    let e: any = {};
    if (!propertyName.trim()) e.propertyName = "Property name is required";
    if (!address.line1.trim()) e.line1 = "Address line 1 is required";
    if (!address.state) e.state = "State is required";
    if (!address.city) e.city = "City is required";
    if (!address.pincode || address.pincode.length !== 6) e.pincode = "Valid 6-digit pin code required";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const isValid = propertyName && address.line1 && address.state && address.city && address.pincode.length === 6;

  const onNext = () => {
    if (!validate()) return;
    
    const propertyData = { propertyName, propertyType, propertyFor, address, coordinates };
    
    if (returnToPreview) {
      // Return to preview with updated data
      navigation.navigate("PropertyPreview", {
        propertyData,
        facilitiesData: existingFacilitiesData,
        floorsData: existingFloorsData,
        allRooms: existingAllRooms,
        usedFloors: existingUsedFloors,
        fromVerify: existingFromVerify
      });
    } else {
      // Normal flow - go to Facilities
      navigation.navigate("Facilities", propertyData);
    }
  };

  /* -------------------- UI COMPONENTS -------------------- */

  const renderStatePicker = () => (
    <Modal visible={isStateModalVisible} animationType="slide" transparent={true}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white h-[60%] rounded-t-3xl p-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-bold">Select State</Text>
            <TouchableOpacity onPress={() => setStateModalVisible(false)}>
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>
          </View>
          {loading.states ? (
            <ActivityIndicator color="#2F3CFF" size="large" className="mt-10" />
          ) : (
            <FlatList
              data={stateList}
              keyExtractor={(item, index) => `state-${index}-${item.iso2 || index}`}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  className="py-4 border-b border-gray-100"
                  onPress={() => {
                    setAddress({ ...address, state: item.name, stateCode: item.iso2, city: "" });
                    fetchCities(item.iso2); // Trigger city fetch
                    setStateModalVisible(false);
                    setErrors({ ...errors, state: null });
                  }}
                >
                  <Text className={address.state === item.name ? "text-blue-600 font-bold" : "text-gray-700"}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );

  const renderCityPicker = () => (
    <Modal visible={isCityModalVisible} animationType="slide" transparent={true}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white h-[60%] rounded-t-3xl p-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-bold">Select City</Text>
            <TouchableOpacity onPress={() => setCityModalVisible(false)}>
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>
          </View>
          {loading.cities ? (
            <ActivityIndicator color="#2F3CFF" size="large" className="mt-10" />
          ) : (
            <FlatList
              data={cityList}
              keyExtractor={(item, index) => `city-${index}-${item.name || index}`}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  className="py-4 border-b border-gray-100"
                  onPress={() => {
                    setAddress({ ...address, city: item.name });
                    setCityModalVisible(false);
                    setErrors({ ...errors, city: null });
                  }}
                >
                  <Text className={address.city === item.name ? "text-blue-600 font-bold" : "text-gray-700"}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <Text className="text-center text-gray-400 mt-10">
                  {address.state ? "No cities found" : "Please select a state first"}
                </Text>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ProfileHeader activeTab="Property" />
      {locationHint ? (
        <View className="mx-6 mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <Text className="text-amber-800 text-sm">{locationHint}</Text>
        </View>
      ) : null}
      {renderStatePicker()}
      {renderCityPicker()}

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24 }}>
          
          <Text className="text-2xl font-bold text-gray-900">Property details</Text>
          <Text className="text-gray-500 mb-6">Tell us about your property location and type</Text>

          {/* PROPERTY NAME */}
          <View className="mb-5">
            <Text className="text-gray-700 font-medium mb-2">Property Name</Text>
            <TextInput
              value={propertyName}
              onChangeText={(t) => { setPropertyName(t); setErrors({...errors, propertyName: null}); }}
              placeholder="e.g. MyOnboard Residency"
              placeholderTextColor="#9CA3AF"
              className={`border rounded-xl px-4 py-3.5 bg-gray-50 ${errors.propertyName ? 'border-red-500' : 'border-gray-200'}`}
            />
            {errors.propertyName && <Text className="text-red-500 text-xs mt-1">{errors.propertyName}</Text>}
          </View>

          {/* PROPERTY TYPE */}
          <Text className="text-gray-700 font-medium mb-3">Property Type</Text>
          <View className="flex-row gap-6 mb-6">
            {["PG", "Hostel"].map((type) => (
              <TouchableOpacity key={type} onPress={() => setPropertyType(type)} className="flex-row items-center">
                <View className={`w-5 h-5 rounded-full mr-2 border-2 items-center justify-center ${propertyType === type ? "border-blue-600" : "border-gray-300"}`}>
                  {propertyType === type && <View className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                </View>
                <Text className={propertyType === type ? "text-blue-700 font-semibold" : "text-gray-500"}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* PROPERTY FOR */}
          <Text className="text-gray-700 font-medium mb-3">Is this property for?</Text>
          <View className="flex-row justify-between mb-8">
            {[
              { label: "Boys", icon: "male" },
              { label: "Girls", icon: "female" },
              { label: "Co-live", icon: "people" },
            ].map((item) => {
              const active = propertyFor === item.label;
              return (
                <TouchableOpacity
                  key={item.label}
                  onPress={() => setPropertyFor(item.label)}
                  className={`w-[30%] items-center py-4 rounded-2xl border-2 ${active ? "bg-blue-50 border-blue-600" : "bg-white border-gray-100"}`}
                >
                  <Ionicons name={item.icon as any} size={24} color={active ? "#2F3CFF" : "#9CA3AF"} />
                  <Text className={`mt-2 font-medium ${active ? "text-blue-600" : "text-gray-400"}`}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View className="h-[1px] bg-gray-100 w-full mb-8" />

          {/* ADDRESS SECTION */}
          <Text className="text-lg font-bold mb-4">Location Details</Text>
          
          <View className="mb-4">
            <Text className="text-gray-600 mb-1 text-sm">Address Line 1</Text>
            <TextInput
              value={address.line1}
              onChangeText={(t) => setAddress({ ...address, line1: t })}
              placeholder="House no, Street name"
              placeholderTextColor="#9CA3AF"
              className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50"
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-600 mb-1 text-sm">Address Line 2</Text>
            <TextInput
              value={address.line2}
              onChangeText={(t) => setAddress({ ...address, line2: t })}
              placeholder="Landmark, Area name"
              placeholderTextColor="#9CA3AF"
              className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50"
            />
          </View>

          {/* STATE & CITY DROP-DOWNS */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text className="text-gray-600 mb-1 text-sm">State</Text>
              <TouchableOpacity 
                onPress={() => setStateModalVisible(true)}
                className={`border rounded-xl px-4 py-3 bg-gray-50 flex-row justify-between items-center ${errors.state ? 'border-red-500' : 'border-gray-200'}`}
              >
                <Text numberOfLines={1} className={address.state ? "text-black" : "text-gray-400"}>
                  {address.state || "Select"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="gray" />
              </TouchableOpacity>
            </View>

            <View className="flex-1">
              <Text className="text-gray-600 mb-1 text-sm">City</Text>
              <TouchableOpacity 
                onPress={() => setCityModalVisible(true)}
                className={`border rounded-xl px-4 py-3 bg-gray-50 flex-row justify-between items-center ${errors.city ? 'border-red-500' : 'border-gray-200'}`}
              >
                <Text numberOfLines={1} className={address.city ? "text-black" : "text-gray-400"}>
                  {address.city || "Select"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="gray" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-gray-600 mb-1 text-sm">Pin Code</Text>
            <TextInput
              keyboardType="number-pad"
              maxLength={6}
              value={address.pincode}
              onChangeText={(t) => setAddress({ ...address, pincode: t })}
              placeholder="6-digit PIN"
              placeholderTextColor="#9CA3AF"
              className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50"
            />
          </View>

          {/* MAP: Industry-style — search address, then drag pin or tap map to set exact location. Saved when you tap Continue. */}
          <Text className="text-gray-700 font-medium mb-2">Property location on map</Text>
          <Text className="text-gray-500 text-xs mb-2">
            Search for your address, then drag the pin or tap the map to set the exact spot. This location is saved when you tap Continue.
          </Text>
          <View className="flex-row gap-2 mb-2">
            <TextInput
              value={addressSearchQuery}
              onChangeText={setAddressSearchQuery}
              placeholder="Search address (e.g. street, city, pincode)"
              placeholderTextColor="#9CA3AF"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 bg-gray-50"
            />
            <TouchableOpacity
              onPress={searchAddressOnMap}
              disabled={searchingLocation}
              className="bg-[#2F3CFF] px-4 py-3 rounded-xl justify-center"
            >
              {searchingLocation ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="search" size={22} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          <View className="flex-row items-center justify-between mb-2 flex-wrap gap-2">
            <Text className="text-gray-500 text-xs">Drag pin or tap map to set location</Text>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={useCurrentLocation}
                disabled={gettingCurrentLocation}
                className="flex-row items-center px-3 py-1.5 rounded-lg bg-green-50 border border-green-200"
              >
                {gettingCurrentLocation ? (
                  <ActivityIndicator size="small" color="#059669" />
                ) : (
                  <Ionicons name="locate" size={16} color="#059669" />
                )}
                <Text className="ml-1.5 text-green-700 text-xs font-medium">
                  {gettingCurrentLocation ? "Getting…" : "Use my location"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={centerMapOnPin}
                className="flex-row items-center px-3 py-1.5 rounded-lg bg-gray-100"
              >
                <Ionicons name="navigate" size={16} color="#2F3CFF" />
                <Text className="ml-1.5 text-[#2F3CFF] text-xs font-medium">Center on pin</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.mapWrapper} className="rounded-2xl overflow-hidden border border-gray-200 mb-2">
            <MapFallback
              latitude={coordinates.latitude}
              longitude={coordinates.longitude}
              onOpenMaps={(lat, lng) => {
                const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                Linking.openURL(url);
              }}
              label="Open in Maps"
            >
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={mapRegion}
                onPress={(e) => {
                  const { latitude, longitude } = e.nativeEvent.coordinate;
                  setPinAt(latitude, longitude);
                }}
              >
                <Marker
                  coordinate={{ latitude: coordinates.latitude, longitude: coordinates.longitude }}
                  draggable
                  onDragEnd={(e) => {
                    const { latitude, longitude } = e.nativeEvent.coordinate;
                    setPinAt(latitude, longitude);
                  }}
                  title="Property location"
                  description="Drag to adjust. This will be saved when you tap Continue."
                  pinColor="#2F3CFF"
                />
              </MapView>
            </MapFallback>
          </View>
          <View className="flex-row items-center justify-between mb-8">
            {locationSet ? (
              <Text className="text-gray-400 text-xs">
                Saved location: {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}
              </Text>
            ) : (
              <View className="flex-row items-center gap-1">
                <Ionicons name="warning-outline" size={14} color="#f59e0b" />
                <Text className="text-amber-500 text-xs font-medium">Location not set — tap the map or search an address</Text>
              </View>
            )}
            {locationSet && (
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL(
                    `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`
                  )
                }
                className="flex-row items-center px-2 py-1"
              >
                <Ionicons name="navigate" size={14} color="#2F3CFF" />
                <Text className="ml-1 text-[#2F3CFF] text-xs font-medium">Open in Maps</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ACTION BUTTONS */}
          <View className="flex-row gap-4 mb-10">
            <TouchableOpacity onPress={() => navigation.goBack()} className="flex-1 py-4 rounded-xl bg-gray-100 items-center">
              <Text className="text-gray-600 font-bold">Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={!isValid}
              onPress={onNext}
              className={`flex-[2] py-4 rounded-xl items-center shadow-lg shadow-blue-300 ${isValid ? "bg-[#2F3CFF]" : "bg-blue-300"}`}
            >
              <Text className="text-white font-bold text-lg">Continue</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mapWrapper: {
    height: 220,
    position: "relative",
  },
  map: {
    width: "100%",
    height: "100%",
  },
});