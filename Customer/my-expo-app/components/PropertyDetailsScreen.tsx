import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import type { CurrentStayProperty } from "./InfoCards";
import MapFallback from "./MapFallback";

const MAP_HEIGHT = 220;
const DEFAULT_LAT = 20.5937;
const DEFAULT_LNG = 78.9629;
/** Tighter zoom so the property pin is clearly the focus */
const LOCATION_DELTA = 0.004;

function openNavigation(lat: number, lng: number) {
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  Linking.openURL(url);
}

function formatDate(dateString: string) {
  if (!dateString) return "—";
  const d = new Date(dateString);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getFloorLabel(floor: number | undefined): string {
  if (floor == null) return "—";
  if (floor === 0) return "Ground Floor";
  if (floor === 1) return "1st Floor";
  if (floor === 2) return "2nd Floor";
  if (floor === 3) return "3rd Floor";
  return `${floor}th Floor`;
}

// Same facility labels as Admin preview (customer view)
const PROPERTY_FACILITIES = [
  "Wifi",
  "CCTV",
  "Lift",
  "Security 24x7",
  "Hot Water",
  "Power Backup",
  "House Keeping",
  "Washing Machine",
];

const ROOM_FACILITIES = [
  "Table & Chair",
  "Wardrobe",
  "Cupboard Lock",
  "Geyser",
  "Attached Bath",
  "RO Water",
];

export default function PropertyDetailsScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const mapRef = useRef<MapView | null>(null);
  const hasAnimated = useRef(false);

  const property: CurrentStayProperty = route?.params?.property || {
    id: "",
    name: "Property",
    status: "Approved",
    roomNumber: "—",
    monthlyRent: 0,
    checkInDate: "",
  };

  const currentDue = (property as any).currentDue ?? 0;
  const hasDue = currentDue > 0;
  const securityDeposit = Number((property as any).securityDeposit ?? 0);

  const cardBg = theme === "female" ? "bg-[#FFE4F2]" : "bg-[#F6F8FF]";
  const chipBg = theme === "female" ? "bg-pink-100" : "bg-indigo-100";
  const chipText = theme === "female" ? "text-pink-700" : "text-indigo-700";

  const priceText = property.monthlyRent
    ? `₹${Number(property.monthlyRent).toLocaleString()}/month`
    : "—";

  const lat = (property as any).latitude ?? (property as any).coordinates?.latitude;
  const lng = (property as any).longitude ?? (property as any).coordinates?.longitude;
  const hasLocation =
    typeof lat === "number" && !Number.isNaN(lat) &&
    typeof lng === "number" && !Number.isNaN(lng);
  const mapRegion = {
    latitude: hasLocation ? Number(lat) : DEFAULT_LAT,
    longitude: hasLocation ? Number(lng) : DEFAULT_LNG,
    latitudeDelta: LOCATION_DELTA,
    longitudeDelta: LOCATION_DELTA,
  };

  useEffect(() => {
    if (!hasLocation || hasAnimated.current || !mapRef.current) return;
    hasAnimated.current = true;
    const t = setTimeout(() => {
      mapRef.current?.animateToRegion(mapRegion, 500);
    }, 300);
    return () => clearTimeout(t);
  }, [hasLocation]);

  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]">
      {/* Header */}
      <View className="flex-row items-center px-6 mt-2 mb-2">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full border border-gray-300 justify-center items-center bg-white"
        >
          <Ionicons name="chevron-back" size={22} />
        </TouchableOpacity>
        <Text className="ml-4 text-[22px] font-semibold text-black">
          Property Details
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: Platform.OS === "ios" ? 100 : 80,
        }}
      >
        {/* Property Main Card — same structure as Admin preview */}
        <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
          <View className="flex-row justify-between items-start">
            <Text className="text-[18px] font-semibold flex-1 pr-2 text-slate-900">
              {property.name}
            </Text>
            <Text className="text-[15px] font-semibold text-[#1E33FF]">
              {priceText}
            </Text>
          </View>

          {property.address ? (
            <View className="flex-row items-center mt-2">
              <Ionicons name="location-outline" size={16} color="#6B7280" />
              <Text className="ml-1 text-gray-600 text-[14px] flex-1">
                {property.address}
              </Text>
            </View>
          ) : null}

          <View className="flex-row flex-wrap gap-2 mt-4">
            {(property.propertyType || "PG") && (
              <View className="px-3 py-1 rounded-full bg-gray-100">
                <Text className="text-[13px] text-gray-700">
                  {String(property.propertyType || "PG")}
                </Text>
              </View>
            )}
            {property.roomType && (
              <View className="px-3 py-1 rounded-full bg-gray-100">
                <Text className="text-[13px] text-gray-700">
                  {property.roomType} Room
                </Text>
              </View>
            )}
            <View className="px-3 py-1 rounded-full bg-gray-100">
              <Text className="text-[13px] text-gray-700">
                Room {property.roomNumber}
              </Text>
            </View>
          </View>

          {/* Map: centered on property location with pin */}
          <View className="mt-4 rounded-2xl overflow-hidden border border-gray-200" style={styles.mapContainer}>
            <MapFallback
              latitude={hasLocation ? Number(lat) : undefined}
              longitude={hasLocation ? Number(lng) : undefined}
              onOpenMaps={openNavigation}
              label="Open in Maps"
            >
              <MapView
                ref={mapRef}
                style={styles.map}
                scrollEnabled={true}
                pitchEnabled={false}
                initialRegion={mapRegion}
              >
                {hasLocation && (
                  <Marker
                    coordinate={{
                      latitude: Number(lat),
                      longitude: Number(lng),
                    }}
                    title={property.name}
                    description={property.address ? `${property.address}` : undefined}
                    pinColor="#1E33FF"
                  />
                )}
              </MapView>
            </MapFallback>
            {hasLocation ? (
              <TouchableOpacity
                onPress={() => openNavigation(Number(lat), Number(lng))}
                className="flex-row items-center justify-center py-3 bg-[#1E33FF]"
                activeOpacity={0.85}
              >
                <Ionicons name="navigate" size={20} color="#fff" />
                <Text className="ml-2 text-white font-semibold">Open in Maps</Text>
              </TouchableOpacity>
            ) : (
              <View className="flex-row items-center justify-center py-3 bg-gray-200">
                <Ionicons name="location-outline" size={18} color="#6B7280" />
                <Text className="ml-2 text-gray-600 text-sm">Property location not set</Text>
              </View>
            )}
          </View>

          <View className="h-[1px] bg-gray-200 my-5" />

          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <Text className="ml-2 text-gray-600 text-[13px]">Move-in</Text>
            </View>
            <Text className="text-[13px] font-semibold text-slate-900">
              {formatDate(property.checkInDate)}
            </Text>
          </View>
          {property.propertyId && (
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="pricetag-outline" size={16} color="#6B7280" />
                <Text className="ml-2 text-gray-600 text-[13px]">Property ID</Text>
              </View>
              <Text className="text-[13px] font-semibold text-slate-700">
                {property.propertyId}
              </Text>
            </View>
          )}
        </View>

        {/* Room & stay info */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="text-[18px] font-semibold text-black mb-3">
            Your Stay
          </Text>
          <View className="space-y-3">
            <View className="flex-row justify-between items-center p-3 bg-gray-50 rounded-xl">
              <Text className="text-gray-600">Room Number</Text>
              <Text className="font-semibold text-slate-900">{property.roomNumber}</Text>
            </View>
            {property.roomType && (
              <View className="flex-row justify-between items-center p-3 bg-gray-50 rounded-xl">
                <Text className="text-gray-600">Room Type</Text>
                <Text className="font-semibold text-slate-900">{property.roomType}</Text>
              </View>
            )}
            {property.floor != null && (
              <View className="flex-row justify-between items-center p-3 bg-gray-50 rounded-xl">
                <Text className="text-gray-600">Floor</Text>
                <Text className="font-semibold text-slate-900">
                  {getFloorLabel(property.floor)}
                </Text>
              </View>
            )}
            <View className="flex-row justify-between items-center p-3 bg-gray-50 rounded-xl">
              <Text className="text-gray-600">Move-in Date</Text>
              <Text className="font-semibold text-slate-900">
                {formatDate(property.checkInDate)}
              </Text>
            </View>
          </View>
        </View>

        {/* Property Terms — like Admin preview */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="text-[18px] font-semibold text-black mb-3">
            Property Terms
          </Text>
          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Monthly Rent</Text>
              <Text className="font-semibold text-slate-900">{priceText}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Billing Cycle</Text>
              <Text className="font-semibold text-slate-900">Per Month</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Security Deposit</Text>
              <Text className="font-semibold text-slate-900">
                ₹{securityDeposit.toLocaleString()}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Current Due</Text>
              <Text
                className={`font-semibold ${
                  hasDue ? "text-red-600" : "text-emerald-600"
                }`}
              >
                ₹{currentDue.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Property Rules (property-specific, from admin) */}
        {(property as any).rules && typeof (property as any).rules === "object" && Array.isArray((property as any).rules.items) && (property as any).rules.items.length > 0 && (
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
            <Text className="text-[18px] font-semibold text-black mb-3">
              Property Rules
            </Text>
            <View className="gap-2">
              {((property as any).rules.items as string[]).map((item: string, index: number) => (
                <View key={index} className="flex-row items-start">
                  <Text className="text-slate-500 mr-2" style={{ minWidth: 20 }}>{index + 1}.</Text>
                  <Text className="flex-1 text-gray-700 text-sm">{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Food Menu (property-specific, from admin) */}
        {(property as any).rules?.foodMenu?.days && typeof (property as any).rules.foodMenu.days === "object" && (
          (() => {
            const days = (property as any).rules.foodMenu.days as Record<string, Record<string, { enabled?: boolean; menu?: string; startTime?: string; endTime?: string }>>;
            const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const sections = [{ key: "breakfast", label: "Breakfast" }, { key: "lunch", label: "Lunch" }, { key: "snack", label: "Snack" }, { key: "dinner", label: "Dinner" }];
            const hasAnyMenu = Object.keys(days).some((d) => sections.some((s) => days[d]?.[s.key]?.enabled && (days[d][s.key]?.menu || "").trim()));
            if (!hasAnyMenu) return null;
            return (
              <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
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

        {/* Property Facilities — same labels as Admin preview */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="text-[18px] font-semibold text-black mb-3">
            Property Facilities
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {PROPERTY_FACILITIES.map((facility, index) => (
              <View key={index} className={`px-4 py-2 rounded-full ${chipBg}`}>
                <Text className={`text-sm font-semibold ${chipText}`}>
                  {facility}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Room Facilities */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="text-[18px] font-semibold text-black mb-3">
            Room Facilities
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {ROOM_FACILITIES.map((item, index) => (
              <View key={index} className={`px-4 py-2 rounded-full ${chipBg}`}>
                <Text className={`text-sm font-semibold ${chipText}`}>
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Contact / Call to action — optional */}
        <View className="bg-[#EEF2FF] rounded-xl p-4 mb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-gray-600 text-[12px]">Need help?</Text>
            <Text className="text-[15px] font-semibold text-slate-800">
              Contact property admin
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => Linking.openURL("tel:")}
            className="w-12 h-12 rounded-full items-center justify-center bg-[#1E33FF]"
          >
            <Ionicons name="call-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Move Out */}
        {hasDue && (
          <Text className="text-center text-xs text-red-600 mt-2">
            Please clear your dues to initiate Move-out.
          </Text>
        )}
        <TouchableOpacity
          className={`py-4 rounded-2xl mt-2 mb-6 items-center ${
            hasDue ? "bg-gray-300" : "bg-red-500"
          }`}
          activeOpacity={hasDue ? 1 : 0.85}
          disabled={!hasDue}
          onPress={() => {
            if (hasDue) {
              navigation.navigate("MoveOutRequestScreen", { property });
            }
          }}
        >
          <Text className="text-white text-lg font-bold">
            {hasDue ? "Move Out (Dues Pending)" : "Move Out"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    overflow: "hidden",
  },
  map: {
    width: "100%",
    height: MAP_HEIGHT,
  },
});
