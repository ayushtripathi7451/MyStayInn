import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Pressable,
  Linking,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import MapFallback from "./MapFallback";
import ScrollableDatePicker from "./ScrollableDatePicker";
import { Keyboard } from "react-native";

type Admin = {
  id: string;
  name: string;
  phone?: string;
  imageUrl?: string;
};

type Property = {
  id: string;
  name: string;
  location: string;
  roomType: string;
  occupancy: string;
  rent: string;
};

// Normalize amenities/rules from API (can be array or object)
function toList(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((x) => typeof x === "string");
  if (typeof value === "object")
    return Object.entries(value)
      .filter(([, v]) => !!v)
      .map(([k]) => k);
  return [];
}

export default function AdminDetailsScreen({ route, navigation }: any) {
  const { admin, property, fullProperty } = route.params || {};
  const { theme } = useTheme();

  const primaryBg = theme === "female" ? "#EC4899" : "#1E33FF";
  const softBg = theme === "female" ? "#FCE7F3" : "#EEF2FF";

  const fp = fullProperty;
  const displayName = fp?.name ?? property?.name ?? "Property";
  const displayLocation =
    [fp?.city, fp?.state].filter(Boolean).join(", ") ||
    "—";
  const displayRent = fp?.rent ?? property?.rent ?? "—";
  const propertyFacilities = fp ? toList(fp.amenities) : [];
  const roomFacilitiesList = fp?.rooms?.length
    ? toList((fp.rooms[0] as any)?.amenities)
    : [];
  const roomTypesWithPrice =
    fp?.rooms?.length && Array.isArray(fp.rooms)
      ? (fp.rooms as any[]).reduce(
          (acc: { type: string; price: string; capacity?: number }[], r: any) => {
            const rawType = (r.roomType || "Room").toString();
            const typeLabel =
              rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase();
            const label = `${typeLabel} (${r.capacity ?? "—"} sharing)`;
            const price = r.pricePerMonth
              ? `₹${Number(r.pricePerMonth).toLocaleString()}/month`
              : "—";
            if (!acc.some((x) => x.type === label))
              acc.push({ type: label, price, capacity: r.capacity });
            return acc;
          },
          []
        )
      : [];
  const roomPreferenceOptions = useMemo(() => {
    if (roomTypesWithPrice.length > 0) {
      return roomTypesWithPrice.map((row) => `${row.type} • ${row.price}`);
    }
    if (property?.roomType) {
      return [String(property.roomType)];
    }
    return [];
  }, [roomTypesWithPrice, property?.roomType]);
  const totalRooms = fp?.totalRooms ?? fp?.rooms?.length ?? null;
  const propertyType = fp?.propertyType ?? property?.roomType ?? "—";
  const propertyId = fp?.uniqueId ?? fp?.id ?? admin?.id ?? "—";
  const hasFullData = !!fp;
  // Security deposit from backend (rules.securityDeposit)
  const securityDepositAmount =
    hasFullData && fp?.rules && typeof fp.rules === "object" && (fp.rules as any).securityDeposit != null
      ? Number((fp.rules as any).securityDeposit)
      : null;
  // Boys / Girls / Colive from description (e.g. "PG for Boys") or rules.propertyFor if added later
  const propertyFor =
    hasFullData && fp?.rules && typeof fp.rules === "object" && (fp.rules as any).propertyFor
      ? String((fp.rules as any).propertyFor)
      : (() => {
          const desc = (fp?.description ?? "").toString();
          const match = desc.match(/\bfor\s+(Boys|Girls|Colive|Students|Men|Women)\b/i);
          return match ? match[1] : null;
        })();
  const propertyForLabel = propertyFor
    ? propertyFor.charAt(0).toUpperCase() + propertyFor.slice(1).toLowerCase()
    : null;

  const propertyLat = fp?.latitude ?? fp?.coordinates?.latitude;
  const propertyLng = fp?.longitude ?? fp?.coordinates?.longitude;
  const hasPropertyLocation =
    typeof propertyLat === "number" &&
    !Number.isNaN(propertyLat) &&
    typeof propertyLng === "number" &&
    !Number.isNaN(propertyLng);

  const [geocodedLocation, setGeocodedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geocodeLoading, setGeocodeLoading] = useState(false);

  useEffect(() => {
    if (hasPropertyLocation) {
      setGeocodedLocation(null);
      return;
    }
    const address = (displayLocation || "").trim();
    if (!address || address === "—") {
      setGeocodedLocation(null);
      return;
    }
    let cancelled = false;
    setGeocodeLoading(true);
    setGeocodedLocation(null);
    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { headers: { "User-Agent": "MyStay-Customer/1.0" } }
    )
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data) && data[0]) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
            setGeocodedLocation({ lat, lng: lon });
          }
        }
      })
      .catch(() => { if (!cancelled) setGeocodedLocation(null); })
      .finally(() => { if (!cancelled) setGeocodeLoading(false); });
    return () => { cancelled = true; };
  }, [hasPropertyLocation, displayLocation]);

  const mapLat = hasPropertyLocation ? Number(propertyLat) : geocodedLocation?.lat;
  const mapLng = hasPropertyLocation ? Number(propertyLng) : geocodedLocation?.lng;
  const showMap = (hasPropertyLocation || geocodedLocation) && typeof mapLat === "number" && typeof mapLng === "number";

  const chipBg = theme === "female" ? "bg-pink-100" : "bg-indigo-100";
  const chipText = theme === "female" ? "text-pink-700" : "text-indigo-700";

  const [advance, setAdvance] = useState("");
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [roomPreference, setRoomPreference] = useState("");
  const [comments, setComments] = useState("");
  // Pre-fill security deposit from backend when available
  useEffect(() => {
    if (securityDepositAmount != null && !isNaN(securityDepositAmount) && advance === "") {
      setAdvance(String(securityDepositAmount));
    }
  }, [securityDepositAmount]);

  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const isPastCheckIn = !!checkIn && checkIn < today;
  const isFutureCheckIn = !!checkIn && checkIn > today;
  const headerHeight = Platform.OS === 'ios' ? 10 : 0;
  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const durationText = useMemo(() => {
    if (!checkIn || !checkOut) return null;
    const diff =
      (checkOut.getTime() - checkIn.getTime()) /
      (1000 * 60 * 60 * 24);
    if (diff <= 0) return null;
    return diff >= 30
      ? `${Math.round(diff / 30)} month(s)`
      : `${Math.round(diff)} day(s)`;
  }, [checkIn, checkOut]);

  const submitReservation = async () => {
    const propertyId = fullProperty?.id ?? property?.id;
    if (!propertyId) {
      Alert.alert("Error", "Property not found");
      return;
    }
    try {
      const { bookingApi } = await import("../utils/api");
      const payload = {
        propertyId,
        moveInDate: checkIn?.toISOString?.()?.split("T")[0],
        moveOutDate: checkOut ? checkOut.toISOString?.()?.split("T")[0] : null,
        securityDeposit: advance ? Number(advance) : securityDepositAmount ?? 0,
        payDepositLater: true,
        roomPreference: roomPreference.trim() || null,
        comments: comments.trim() || null,
      };
      const res = await bookingApi.post("/api/enrollment-requests", payload);
      const data = res.data || {};
      if (!data.success) {
        Alert.alert("Error", data?.message || "Failed to submit request");
        return;
      }
      Alert.alert(
        "Reservation submitted",
        "Your reservation request has been sent. After the admin allocates a room, your security deposit payment link will appear in the Due Amount section on your home screen."
      );
      navigation.goBack();
    } catch (e: any) {
      console.error(e);
      const status = e?.response?.status;
      const msg =
        status === 401
          ? "Session expired or invalid. Please log in again."
          : e?.response?.data?.message || "Failed to submit request. Please try again.";
      Alert.alert("Error", msg);
    }
  };

  const handleSubmit = () => {
    if (!checkIn) {
      Alert.alert("Required", "Move-in date is required");
      return;
    }
    submitReservation();
  };

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      <SafeAreaView />

      {/* HEADER */}
      <View className="flex-row items-center px-5 py-3 bg-white shadow-sm">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full border border-gray-300 items-center justify-center"
        >
          <Ionicons name="chevron-back" size={22} />
        </TouchableOpacity>
        <Text className="ml-4 text-[22px] font-semibold">
          Booking Request
        </Text>
      </View>

      <KeyboardAvoidingView
  behavior={Platform.OS === "ios" ? "padding" : "padding"} // Use "height" for Android
  style={{ flex: 1 }}
  keyboardVerticalOffset={headerHeight} // Offset for your custom header
>
        <ScrollView
  className="px-5 pt-4"
  keyboardShouldPersistTaps="handled"
  // Increase bottom padding even more to ensure space for the Reserve button
  contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 120 : 120 }} 
>
          {/* PROPERTY + ADMIN INFO CARD */}
          <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
            {/* HEADER: PROPERTY NAME + RENT */}
            <View className="flex-row justify-between items-start">
              <Text className="text-[18px] font-semibold flex-1 pr-2">
                {displayName}
              </Text>
              
            </View>
            
            {/* LOCATION */}
            <View className="flex-row items-center mt-2">
              <Ionicons name="location-outline" size={16} color="#6B7280" />
              <Text className="ml-1 text-gray-600 text-[14px] flex-1">
                {displayLocation}
              </Text>
            </View>
            {/* Property location map — always show when we have coords or can geocode address */}
            {/* <View className="mt-4 mb-2">
              <Text className="text-gray-700 font-medium mb-2">Property location</Text>
              {geocodeLoading ? (
                <View className="rounded-2xl border border-gray-200 bg-gray-50 py-8 px-4 items-center justify-center" style={adminDetailsMapStyles.mapContainer}>
                  <ActivityIndicator size="small" color="#6B7280" />
                  <Text className="text-gray-500 text-sm mt-2">Loading map…</Text>
                </View>
              ) : showMap ? (
                <View className="rounded-2xl overflow-hidden border border-gray-200" style={adminDetailsMapStyles.mapContainer}>
                  <MapFallback
                    latitude={mapLat}
                    longitude={mapLng}
                    onOpenMaps={(lat, lng) =>
                      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`)
                    }
                    label="Open in Maps"
                  >
                    <MapView
                      style={adminDetailsMapStyles.map}
                      scrollEnabled={true}
                      pitchEnabled={false}
                      initialRegion={{
                        latitude: mapLat,
                        longitude: mapLng,
                        latitudeDelta: 0.004,
                        longitudeDelta: 0.004,
                      }}
                    >
                      <Marker
                        coordinate={{ latitude: mapLat, longitude: mapLng }}
                        title={displayName}
                        description={displayLocation}
                        pinColor={theme === "female" ? "#EC4899" : "#1E33FF"}
                      />
                    </MapView>
                  </MapFallback>
                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          hasPropertyLocation ? `${mapLat},${mapLng}` : displayLocation || ""
                        )}`
                      )
                    }
                    className="flex-row items-center justify-center py-3"
                    style={{ backgroundColor: primaryBg }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="navigate" size={20} color="#fff" />
                    <Text className="ml-2 text-white font-semibold">Open in Maps</Text>
                  </TouchableOpacity>
                  {!hasPropertyLocation && geocodedLocation && (
                    <Text className="text-gray-400 text-xs text-center py-2 bg-gray-50">
                      Map shown from address (exact pin set by property owner)
                    </Text>
                  )}
                </View>
              ) : (
                <View className="rounded-2xl border border-gray-200 bg-gray-50 py-6 px-4 items-center justify-center">
                  <Ionicons name="location-outline" size={32} color="#9CA3AF" />
                  <Text className="text-gray-500 text-sm mt-2">Property location not set</Text>
                  {(displayLocation || "").trim() && (displayLocation || "").trim() !== "—" && (
                    <TouchableOpacity
                      onPress={() =>
                        Linking.openURL(
                          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayLocation)}`
                        )
                      }
                      className="flex-row items-center mt-3 px-4 py-2 rounded-lg"
                      style={{ backgroundColor: primaryBg }}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="navigate" size={18} color="#fff" />
                      <Text className="ml-2 text-white font-semibold text-sm">Open address in Maps</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View> */}

            {/* ROOM META: type, occupancy, total rooms, Boys/Girls/Colive */}
            <View className="flex-row flex-wrap gap-2 mt-4">
              <View className="px-3 py-1 rounded-full bg-gray-100">
                <Text className="text-[13px] text-gray-700">
                  {String(propertyType)}
                </Text>
              </View>
              <View className="px-3 py-1 rounded-full bg-gray-100">
                <Text className="text-[13px] text-gray-700">
                  {fp?.occupancy ?? property?.occupancy ?? "—"}
                </Text>
              </View>
              {totalRooms != null && (
                <View className="px-3 py-1 rounded-full bg-gray-100">
                  <Text className="text-[13px] text-gray-700">
                    {totalRooms} Rooms
                  </Text>
                </View>
              )}
              {propertyForLabel && (
                <View
                  className="px-3 py-1 rounded-full"
                  style={{ backgroundColor: softBg }}
                >
                  <Text
                    className="text-[13px] font-medium"
                    style={{ color: primaryBg }}
                  >
                    {propertyForLabel}
                  </Text>
                </View>
              )}
            </View>
            
            {/* DIVIDER */}
            <View className="h-[1px] bg-gray-200 my-5" />
            
            {/* PROPERTY ID ROW */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <Ionicons name="pricetag-outline" size={16} color="#6B7280" />
                <Text className="ml-2 text-gray-600 text-[13px]">
                  Property ID
                </Text>
              </View>
            
              <View className="px-3 py-1 rounded-full bg-gray-100">
                <Text className="text-[13px] font-semibold">
                  {propertyId}
                </Text>
              </View>
            </View>
            
            {/* ADMIN CONTACT CTA */}
            {admin.phone && (
              <View
                className="flex-row items-center justify-between rounded-xl p-3"
                style={{ backgroundColor: softBg }}
              >
                <View>
                  <Text className="text-gray-600 text-[12px]">
                    Admin Contact
                  </Text>
                  <Text className="text-[15px] font-semibold">
                    {admin.phone}
                  </Text>
                </View>
            
                <TouchableOpacity
                  onPress={() => Linking.openURL(`tel:${admin.phone}`)}
                  className="w-12 h-12 rounded-full items-center justify-center"
                  style={{ backgroundColor: primaryBg }}
                >
                  <Ionicons name="call-outline" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>



          {/* PROPERTY FACILITIES */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <Text className="text-[18px] font-semibold text-black mb-3">
              Property Facilities
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {hasFullData && propertyFacilities.length > 0
                ? propertyFacilities.map((item, index) => (
                    <View
                      key={index}
                      className={`px-4 py-2 rounded-full ${chipBg}`}
                    >
                      <Text className={`text-sm font-semibold ${chipText}`}>
                        {item}
                      </Text>
                    </View>
                  ))
                : !hasFullData &&
                  ["Parking", "Power Backup", "24×7 Security", "Lift", "Laundry"].map(
                    (item, index) => (
                      <View
                        key={index}
                        className={`px-4 py-2 rounded-full ${chipBg}`}
                      >
                        <Text className={`text-sm font-semibold ${chipText}`}>
                          {item}
                        </Text>
                      </View>
                    )
                  )}
              {hasFullData && propertyFacilities.length === 0 && (
                <Text className="text-gray-500 text-sm">
                  No property facilities listed
                </Text>
              )}
            </View>
          </View>

          {/* ROOM FACILITIES */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <Text className="text-[18px] font-semibold text-black mb-3">
              Room Facilities
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {hasFullData && roomFacilitiesList.length > 0
                ? roomFacilitiesList.map((item, index) => (
                    <View
                      key={index}
                      className={`px-4 py-2 rounded-full ${chipBg}`}
                    >
                      <Text className={`text-sm font-semibold ${chipText}`}>
                        {item}
                      </Text>
                    </View>
                  ))
                : !hasFullData &&
                  ["Wi-Fi", "Air Condition", "Cupboard", "Attached Washroom"].map(
                    (item, index) => (
                      <View
                        key={index}
                        className={`px-4 py-2 rounded-full ${chipBg}`}
                      >
                        <Text className={`text-sm font-semibold ${chipText}`}>
                          {item}
                        </Text>
                      </View>
                    )
                  )}
              {hasFullData && roomFacilitiesList.length === 0 && (
                <Text className="text-gray-500 text-sm">
                  No room facilities listed
                </Text>
              )}
            </View>
          </View>

          {/* ROOM TYPES & PRICING (from full property) */}
          {hasFullData && roomTypesWithPrice.length > 0 && (
            <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
              <Text className="text-[18px] font-semibold text-black mb-3">
                Room Types & Pricing
              </Text>
              <View className="gap-3">
                {roomTypesWithPrice.map((row, index) => (
                  <View
                    key={index}
                    className="flex-row justify-between items-center p-3 bg-gray-50 rounded-xl"
                  >
                    <View>
                      <Text className="font-semibold text-gray-900">
                        {row.type}
                      </Text>
                      <Text className="text-gray-600 text-sm">Per Month</Text>
                    </View>
                    <Text
                      className="font-bold text-lg"
                      style={{ color: primaryBg }}
                    >
                      {row.price}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* PROPERTY RULES (saved by admin) */}
          {hasFullData && fp?.rules && typeof fp.rules === "object" && Array.isArray((fp.rules as any).items) && (fp.rules as any).items.length > 0 && (
            <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
              <Text className="text-[18px] font-semibold text-black mb-3">
                Property Rules
              </Text>
              <View className="gap-2">
                {((fp.rules as any).items as string[]).map((item, index) => (
                  <View key={index} className="flex-row items-start">
                    <Text className="text-slate-500 mr-2" style={{ minWidth: 20 }}>{index + 1}.</Text>
                    <Text className="flex-1 text-gray-700 text-sm">{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* FOOD MENU (saved by admin) */}
          {hasFullData && fp?.rules && typeof fp.rules === "object" && (fp.rules as any).foodMenu?.days && typeof (fp.rules as any).foodMenu.days === "object" && (
            (() => {
              const days = (fp.rules as any).foodMenu.days as Record<string, Record<string, { enabled?: boolean; menu?: string; startTime?: string; endTime?: string }>>;
              const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
              const sections = [{ key: "breakfast", label: "Breakfast" }, { key: "lunch", label: "Lunch" }, { key: "snack", label: "Snack" }, { key: "dinner", label: "Dinner" }];
              const hasAnyMenu = Object.keys(days).some((d) => sections.some((s) => days[d]?.[s.key]?.enabled && (days[d][s.key]?.menu || "").trim()));
              if (!hasAnyMenu) return null;
              return (
                <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                  <Text className="text-[18px] font-semibold text-black mb-3">
                    Food Menu & Timings
                  </Text>
                  <View className="gap-4">
                    {dayNames.map((dayName, dayIndex) => {
                      const d = days[String(dayIndex)];
                      if (!d) return null;
                      const daySections = sections.filter((s) => d[s.key]?.enabled && (d[s.key]?.menu || "").trim());
                      if (daySections.length === 0) return null;
                      return (
                        <View key={dayIndex} className="p-3 bg-gray-50 rounded-xl">
                          <Text className="font-semibold text-gray-800 mb-2">{dayName}</Text>
                          {daySections.map((s) => {
                            const sec = d[s.key];
                            const start = sec?.startTime ? new Date(sec.startTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "";
                            const end = sec?.endTime ? new Date(sec.endTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "";
                            const timeStr = start && end ? ` (${start} – ${end})` : "";
                            return (
                              <View key={s.key} className="mb-1">
                                <Text className="text-gray-600 text-xs font-medium">{s.label}{timeStr}</Text>
                                <Text className="text-gray-800 text-sm">{sec?.menu || "—"}</Text>
                              </View>
                            );
                          })}
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })()
          )}

          {/* FORM */}
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            

            {/* CHECK-IN */}
            <Text className="text-gray-700 mb-1">
              Move-in Date *
            </Text>
            <ScrollableDatePicker
              selectedDate={checkIn}
              onDateChange={(date) => {
                setCheckIn(date);
                if (checkOut && checkOut < date) setCheckOut(null);
              }}
              mode="date"
              placeholder="Select move in date"
              containerStyle="mb-4"
            />
            {checkIn && (
              <TouchableOpacity
                onPress={() => {
                  setCheckIn(null);
                  setCheckOut(null);
                }}
                className="self-start mb-4 -mt-2"
              >
                <Text className="text-sm font-semibold text-red-500">Clear move-in date</Text>
              </TouchableOpacity>
            )}

            {/* CHECK-OUT */}
            <Text className="text-gray-700 mb-1">
              Move-out Date
            </Text>
            <ScrollableDatePicker
              selectedDate={checkOut}
              onDateChange={setCheckOut}
              mode="date"
              placeholder="Select move out date"
              minimumDate={checkIn || undefined}
              containerStyle="mb-4"
            />
            {checkOut && (
              <TouchableOpacity
                onPress={() => setCheckOut(null)}
                className="self-start mb-2 -mt-2"
              >
                <Text className="text-sm font-semibold text-red-500">Clear move-out date</Text>
              </TouchableOpacity>
            )}

            {/* SECURITY DEPOSIT (pre-filled from backend, always visible and editable) */}
            <Text className="text-gray-700 mb-1 mt-2">
              Security Deposit
            </Text>
            <View className="flex-row items-center border rounded-xl px-3 h-[48px] mb-1">
              <Ionicons name="cash-outline" size={18} color="#6B7280" />
              <TextInput
                value={advance}
                onChangeText={setAdvance}
                editable
                keyboardType="numeric"
                placeholderTextColor="#64748B"
                placeholder={
                  securityDepositAmount != null && !isNaN(securityDepositAmount)
                    ? `₹${securityDepositAmount.toLocaleString("en-IN")} (as per property)`
                    : "Enter amount (optional)"
                }
                className="ml-2 flex-1"
                style={{ color: "#0F172A", fontWeight: "700" }}
              />
            </View>
            {securityDepositAmount != null && !isNaN(securityDepositAmount) && (
              <Text className="text-[12px] font-semibold mt-1" style={{ color: "#1E33FF" }}>
                Auto-fetched deposit: ₹{securityDepositAmount.toLocaleString("en-IN")}
              </Text>
            )}

            {durationText && (
              <Text className="text-gray-500 text-[13px] mt-2">
                Duration: {durationText}
              </Text>
            )}

            {/* ROOM PREFERENCE */}
            <Text className="text-gray-700 mt-5 mb-1">
              Room Preference
            </Text>
            {roomPreferenceOptions.length > 0 ? (
              <View className="mt-1">
                <View className="flex-row flex-wrap gap-2">
                  {roomPreferenceOptions.map((option) => {
                    const selected = roomPreference === option;
                    return (
                      <TouchableOpacity
                        key={option}
                        onPress={() => setRoomPreference(option)}
                        className={`px-3 py-2 rounded-full border ${
                          selected ? "bg-blue-50 border-blue-500" : "bg-white border-gray-300"
                        }`}
                      >
                        <Text
                          className={`text-sm font-medium ${
                            selected ? "text-blue-700" : "text-gray-700"
                          }`}
                        >
                          {option}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity
                  onPress={() => setRoomPreference("")}
                  className={`mt-3 px-3 py-2 rounded-full border self-start ${
                    roomPreference === "" ? "bg-slate-100 border-slate-400" : "bg-white border-gray-300"
                  }`}
                >
                  <Text className="text-sm text-slate-700 font-medium">No specific preference</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TextInput
                value={roomPreference}
                onChangeText={setRoomPreference}
                placeholder="e.g. Single room, near window, lower floor"
                placeholderTextColor="#9CA3AF"
                className="border rounded-xl p-3"
                style={{ color: "#111827" }}
              />
            )}

            {/* COMMENTS */}
            <Text className="text-gray-700 mt-5 mb-1">
              Comments
            </Text>
            <TextInput
              value={comments}
              onChangeText={setComments}
              multiline
              placeholder="Optional message..."
              className="border rounded-xl p-3 h-[100px]"
              style={{ textAlignVertical: "top" }}
            />
          </View>

          {/* SUBMIT */}
          <TouchableOpacity
            onPress={handleSubmit}
            className="h-[52px] rounded-xl items-center justify-center mt-6"
            style={{ backgroundColor: primaryBg }}
          >
            <Text className="text-white font-semibold text-[16px]">
              Reserve
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const adminDetailsMapStyles = StyleSheet.create({
  mapContainer: {
    height: 220,
  },
  map: {
    width: "100%",
    height: "100%",
  },
});
