import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import * as Location from "expo-location";
import { userApi, propertyApi } from "../utils/api";
import {
  formatOccupancySharingFromRooms,
  extractPropertyAudience,
} from "../utils/roomSharing";

/* ---------------- TYPES ---------------- */

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
  /** Boys / Girls / Colive when known from description or rules */
  audience?: string;
};

type EnrollmentStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "PAYMENT_PENDING"
  | "APPROVED";

type SearchItem = {
  admin: Admin;
  property: Property;
  fullProperty?: Record<string, any>; // full API property for detail screen
  enrollmentStatus: EnrollmentStatus;
};

/* ---------------- STATUS HELPERS ---------------- */

const getStatusLabel = (status: EnrollmentStatus) => {
  switch (status) {
    case "REQUESTED":
      return "Requested";
    case "ACCEPTED":
      return "Accepted";
    case "PAYMENT_PENDING":
      return "Payment Pending";
    case "APPROVED":
      return "Approved";
    default:
      return "";
  }
};

const getStatusColor = (status: EnrollmentStatus) => {
  switch (status) {
    case "REQUESTED":
      return "text-orange-500";
    case "ACCEPTED":
      return "text-blue-600";
    case "PAYMENT_PENDING":
      return "text-yellow-600";
    case "APPROVED":
      return "text-green-600";
    default:
      return "text-gray-500";
  }
};

/* ---------------- SCREEN ---------------- */

const normalizePhone = (text: string) => text.replace(/\D/g, "").slice(-10);

export default function SearchAdminScreen({ navigation }: any) {
  const [tab, setTab] = useState<"id" | "location">("id");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [locationResults, setLocationResults] = useState<SearchItem[]>([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState<string | null>(null);

  const { theme } = useTheme();
  const primaryBg = theme === "female" ? "#EC4899" : "#1E33FF";
  const primaryText = theme === "female" ? "#EC4899" : "#1E33FF";

  const isValidPhone = (text: string) => /^\d{10}$/.test(normalizePhone(text));
  const isValidAdminId = (text: string) => {
  return /^(mys|myo)\d{2}[a-z]\d{6}$/i.test(text.trim());
};

  // Property ID validation: must be exactly 11 characters starting with "myp" (case insensitive)
  const isValidPropertyId = (text: string) => {
  return /^myp\d{2}[a-z]\d{6}$/i.test(text.trim());
};

  const searchPropertyById = useCallback(async (propertyId: string) => {
    const res = await propertyApi.get<{ success: boolean; property?: any }>(
      `/api/properties/public/${encodeURIComponent(propertyId)}`
    );
    if (!res.data?.success || !res.data.property) return null;
    return res.data.property;
  }, []);

  const searchOwnersByQuery = useCallback(async (searchQuery: string) => {
    const q = searchQuery.trim();
    const isPhone = /^\+?\d{10,}$/.test(q.replace(/\s/g, ""));
    const queryParam = isPhone
      ? (q.startsWith("+") ? q : `+91${normalizePhone(q)}`)
      : q.toUpperCase();
    const res = await userApi.get<{ success: boolean; owners?: any[] }>(
      `/api/users/search/owners?query=${encodeURIComponent(queryParam)}`
    );
    if (!res.data?.success || !res.data.owners?.length) return [];
    return res.data.owners;
  }, []);

  const fetchPropertiesForOwner = useCallback(async (ownerUniqueId: string) => {
    const res = await propertyApi.get<{ success: boolean; properties?: any[] }>(
      `/api/properties/by-owner/${encodeURIComponent(ownerUniqueId)}`
    );
    if (!res.data?.success || !res.data.properties?.length) return [];
    return res.data.properties;
  }, []);

  const runSearchByLocation = useCallback(async () => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setLocationResults([]);
      setLocationSearchError(null);
      return;
    }
    setLocationSearching(true);
    setLocationSearchError(null);
    try {
      const res = await propertyApi.get<{
        success: boolean;
        properties?: any[];
        count?: number;
      }>(`/api/properties/search-by-location?q=${encodeURIComponent(trimmed)}`);
      if (!res.data?.success || !res.data.properties?.length) {
        setLocationResults([]);
        return;
      }
      const items: SearchItem[] = res.data.properties.map((p: any) => {
        const room = (p.rooms && p.rooms[0]) || {};
        const roomType = room.roomType || p.propertyType || "—";
        const price = room.pricePerMonth ?? p.rooms?.[0]?.pricePerMonth ?? 0;
        const locationStr =
          [ p.city, p.state].filter(Boolean).join(", ") || "—";
        const occ = formatOccupancySharingFromRooms(
          Array.isArray(p.rooms) ? p.rooms : [room]
        );
        const audience = extractPropertyAudience(p) || undefined;
        return {
          admin: {
            id: p.ownerId || p.uniqueId || p.id,
            name: "Property owner",
          },
          property: {
            id: p.uniqueId || p.id,
            name: p.name || "Property",
            location: locationStr,
            roomType: String(roomType),
            occupancy: occ,
            rent: price
              ? `₹${Number(price).toLocaleString()} / month`
              : "—",
            audience,
          },
          fullProperty: {
            ...p,
            location: locationStr,
            roomType: String(roomType),
            occupancy: occ,
            rent: price
              ? `₹${Number(price).toLocaleString()} / month`
              : "—",
            latitude: p.latitude ?? p.coordinates?.latitude,
            longitude: p.longitude ?? p.coordinates?.longitude,
          },
          enrollmentStatus: "APPROVED" as EnrollmentStatus,
        };
      });
      setLocationResults(items);
    } catch (err: any) {
      console.error("[SearchAdminScreen] location search error:", err);
      setLocationResults([]);
      const data = err?.response?.data;
      const msg =
        (data && (typeof data.message === "string" ? data.message : data.error)) ||
        (err?.response?.status >= 500 && "Server error. Please try again later.") ||
        (err?.code === "ERR_NETWORK" && "Network error. Check your connection.") ||
        "Failed to search by location. Please try again.";
      setLocationSearchError(msg);
    } finally {
      setLocationSearching(false);
    }
  }, [query]);

const runSearchById = useCallback(async () => {
  const trimmed = query.trim();
  if (!trimmed) {
    setResults([]);
    setSearchError(null);
    return;
  }
  
  // Check if it's a property ID (starts with myp, case insensitive)
  const normalizedQuery = trimmed.toLowerCase();

// Detect property ID typing
if (normalizedQuery.startsWith("myp")) {

  // ❌ Don't search until full ID
  if (trimmed.length < 11) {
    setResults([]);
    setSearchError("Enter full Property ID (e.g. MYP26A000001)");
    return;
  }

  // ❌ Invalid format
  if (!isValidPropertyId(trimmed)) {
    setResults([]);
    setSearchError("Invalid Property ID format");
    return;
  }

  // ✅ VALID → Search now
  setSearching(true);
  setSearchError(null);

  try {
    const property = await searchPropertyById(trimmed.toLowerCase());

    if (!property) {
      setResults([]);
      setSearchError("No property found with this ID.");
      return;
    }

    // map result (your existing mapping)
    const room = (property.rooms && property.rooms[0]) || {};
    const roomType = room.roomType || property.propertyType || "—";
    const price = room.pricePerMonth ?? 0;
    const locationStr =
      [ property.city, property.state]
        .filter(Boolean)
        .join(", ") || "—";
    const occ = formatOccupancySharingFromRooms(
      Array.isArray(property.rooms) ? property.rooms : [room]
    );
    const audience = extractPropertyAudience(property) || undefined;

    setResults([
      {
        admin: {
          id: property.ownerUniqueId || property.ownerId, // ✅ Use ownerUniqueId from backend
          name: property.ownerName || "Property owner", // ✅ Use ownerName from backend
        },
        property: {
          id: property.uniqueId, // 👈 IMPORTANT
          name: property.name,
          location: locationStr,
          roomType,
          occupancy: occ,
          audience,
          rent: price
            ? `₹${Number(price).toLocaleString()} / month`
            : "—",
        },
        fullProperty: property,
        enrollmentStatus: "APPROVED",
      },
    ]);

  } catch (err) {
  setResults([]);
  setSearchError("Failed to search property.");
} finally {
    setSearching(false);
  }

  return;
}
  
  // Original admin/phone search logic
  if (!isValidPhone(trimmed) && !isValidAdminId(trimmed)) {
    setResults([]);
    setSearchError(
      "Enter a valid 10-digit phone number, Owner ID (e.g. MYS25A000001), or Property ID (e.g. MYP26A000001)"
    );
    return;
  }
  setSearching(true);
  setSearchError(null);
  try {
    const owners = await searchOwnersByQuery(trimmed);
    if (owners.length === 0) {
      setResults([]);
      setSearchError("No owner found with this phone or ID.");
      return;
    }
    const items: SearchItem[] = [];
    for (const owner of owners) {
      const name =
        `${owner.firstName || ""} ${owner.lastName || ""}`.trim() || "Owner";
      const phone = (owner.phone || "").replace(/\D/g, "").slice(-10);
      const admin: Admin = {
        id: owner.uniqueId || owner.id,
        name,
        phone: phone || undefined,
        imageUrl: owner.profileExtras?.profileImage,
      };
      const properties = await fetchPropertiesForOwner(owner.uniqueId || owner.id);
      if (properties.length === 0) {
        items.push({
          admin,
          property: {
            id: "",
            name: "No property listed",
            location: "—",
            roomType: "—",
            occupancy: "—",
            rent: "—",
          },
          enrollmentStatus: "APPROVED",
        });
      } else {
        for (const p of properties) {
          const room = (p.rooms && p.rooms[0]) || {};
          const roomType = room.roomType || p.propertyType || "—";
          const price =
            room.pricePerMonth ?? p.rooms?.[0]?.pricePerMonth ?? 0;
          const locationStr =
            [ p.city, p.state].filter(Boolean).join(", ") || "—";
          const occ = formatOccupancySharingFromRooms(
            Array.isArray(p.rooms) ? p.rooms : [room]
          );
          const audience = extractPropertyAudience(p) || undefined;
          items.push({
            admin,
            property: {
              id: p.uniqueId || p.id,
              name: p.name || "Property",
              location: locationStr,
              roomType: String(roomType),
              occupancy: occ,
              audience,
              rent: price
                ? `₹${Number(price).toLocaleString()} / month`
                : "—",
            },
            fullProperty: {
              ...p,
              location: locationStr,
              roomType: String(roomType),
              occupancy: occ,
              rent: price
                ? `₹${Number(price).toLocaleString()} / month`
                : "—",
              latitude: p.latitude ?? p.coordinates?.latitude,
              longitude: p.longitude ?? p.coordinates?.longitude,
            },
            enrollmentStatus: "APPROVED",
          });
        }
      }
    }
    setResults(items);
  } catch (err: any) {
    console.error("[SearchAdminScreen] search error:", err);
    setResults([]);
    const data = err?.response?.data;
    const msg =
      (data && (typeof data.message === "string" ? data.message : data.error)) ||
      (err?.response?.status === 401 && "Please log in to search.") ||
      (err?.response?.status === 404 && "Owner or property not found.") ||
      (err?.response?.status >= 500 && "Server error. Please try again later.") ||
      (err?.message && !err.message.startsWith("Request failed") ? err.message : null) ||
      (err?.code === "ERR_NETWORK" && "Network error. Check your connection.") ||
      "Failed to search. Please try again.";
    setSearchError(msg);
  } finally {
    setSearching(false);
  }
}, [query, searchOwnersByQuery, fetchPropertiesForOwner, searchPropertyById]);
  useEffect(() => {
    if (tab !== "id") return;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearchError(null);
      return;
    }
    
    const t = setTimeout(runSearchById, 500);
    return () => clearTimeout(t);
  }, [tab, query, runSearchById]);

  useEffect(() => {
    if (tab !== "location") return;
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setLocationResults([]);
      setLocationSearchError(null);
      return;
    }
    const t = setTimeout(runSearchByLocation, 500);
    return () => clearTimeout(t);
  }, [tab, query, runSearchByLocation]);

  const handleSearch = (text: string) => {
    setQuery(text);
  };

  const displayResults = tab === "id" ? results : locationResults;


  /* ---------------- CURRENT LOCATION ---------------- */

  const useCurrentLocation = async () => {
    try {
      setLoadingLocation(true);

      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow location access to continue"
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({});
      const geo = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      const area =
        geo[0]?.district ||
        geo[0]?.city ||
        geo[0]?.subregion;

      if (!area) {
        Alert.alert("Unable to detect your location");
        return;
      }

      setQuery(area);
      handleSearch(area);
    } catch {
      Alert.alert("Failed to fetch current location");
    } finally {
      setLoadingLocation(false);
    }
  };

  /* ---------------- CARD (tap → AdminDetails: property details + booking form intact) ---------------- */

  const renderCard = ({ item }: { item: SearchItem }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() =>
        navigation.navigate("AdminDetails", {
          admin: item.admin,
          property: item.property,
          fullProperty: item.fullProperty,
        })
      }
      className="bg-white rounded-2xl p-4 mb-4 border border-gray-200 shadow-sm"
    >
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-lg font-semibold flex-1">
          {item.property.name}
        </Text>

        {/* ENROLLMENT STATUS */}
        <Text
          className={`text-sm font-semibold ${getStatusColor(
            item.enrollmentStatus
          )}`}
        >
          ● {getStatusLabel(item.enrollmentStatus)}
        </Text>
      </View>

      <View className="flex-row items-center mb-3">
        <Ionicons name="location-outline" size={16} color="#6B7280" />
        <Text className="ml-1 text-gray-600 text-[15px]">
          {item.property.location}
        </Text>
      </View>

      <View className="flex-row justify-between">
        <View>
          <Text className="text-gray-400 text-[13px]">Occupancy</Text>
          <Text className="font-medium">{item.property.occupancy}</Text>
        </View>
        <View>
          <Text className="text-gray-400 text-[13px]">Property for</Text>
          <Text className="font-medium">{item.property.audience || "—"}</Text>
        </View>
      </View>

      {/* Display Property ID if available */}
      {item.property.id && (
        <Text className="text-gray-400 text-[12px] mt-1">
          Property ID: {item.property.id}
        </Text>
      )}
    </TouchableOpacity>
  );

  /* ---------------- UI ---------------- */

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView style={{ backgroundColor: primaryBg }}>
        <View className="pt-4 pb-10 px-6" />
      </SafeAreaView>

      <View className="flex-1 bg-white rounded-t-[40px] px-6 pt-6 -mt-10">
        {/* BACK + TABS */}
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 bg-white rounded-full justify-center items-center border border-gray-300"
          >
            <Ionicons name="chevron-back" size={22} />
          </TouchableOpacity>

          <View
            className="flex-row ml-4 p-1 rounded-full"
            style={{ backgroundColor: primaryBg }}
          >
            {["id", "location"].map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => {
                  setTab(t as "id" | "location");
                  setQuery("");
                  setResults([]);
                  setLocationResults([]);
                  setSearchError(null);
                  setLocationSearchError(null);
                }}
                className={`px-8 py-2 rounded-full ${
                  tab === t ? "bg-white" : ""
                }`}
              >
                <Text
                  className="font-semibold"
                  style={{ color: tab === t ? primaryText : "#fff" }}
                >
                  {t === "id" ? "Unique ID" : "Location"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* SEARCH */}
        <View className="mt-6">
          <View className="bg-[#F9FAFB] rounded-full h-[46px] px-4 flex-row items-center border border-gray-200">
            <Ionicons name="search" size={18} color="#999" />
            <TextInput
              placeholder={
                tab === "id"
                  ? "Phone or Property ID (myp...)"
                  : "Search by area, sector, city"
              }
              value={query}
              onChangeText={handleSearch}
              className="ml-2 flex-1"
              placeholderTextColor="#9CA3AF"   
            />
          </View>

          {tab === "location" && (
            <TouchableOpacity
              onPress={useCurrentLocation}
              className="flex-row items-center mt-3"
            >
              <Ionicons
                name="locate-outline"
                size={18}
                color={primaryText}
              />
              <Text
                className="ml-2 font-semibold"
                style={{ color: primaryText }}
              >
                {loadingLocation
                  ? "Detecting location..."
                  : "Use current location"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Loading */}
        {tab === "id" && searching && (
          <View className="py-10 items-center">
            <ActivityIndicator size="large" color={primaryText} />
            <Text className="mt-3 text-gray-500 font-medium">
              Searching admins & properties...
            </Text>
          </View>
        )}

        {tab === "location" && locationSearching && (
          <View className="py-10 items-center">
            <ActivityIndicator size="large" color={primaryText} />
            <Text className="mt-3 text-gray-500 font-medium">
              Searching properties in this area...
            </Text>
          </View>
        )}

        {/* Error message */}
        {tab === "id" && searchError && !searching && (
          <View className="py-6 px-4 bg-red-50 rounded-xl mx-1">
            <Text className="text-red-700 text-center font-medium">
              {searchError}
            </Text>
          </View>
        )}

        {tab === "location" && locationSearchError && !locationSearching && (
          <View className="py-6 px-4 bg-red-50 rounded-xl mx-1">
            <Text className="text-red-700 text-center font-medium">
              {locationSearchError}
            </Text>
          </View>
        )}

        {/* RESULTS — same UI; tap opens AdminDetails (details + form intact) */}
        {tab === "id" && !searching && (
          <FlatList
            className="mt-6"
            data={results}
            keyExtractor={(item) => `${item.admin.id}-${item.property.id}`}
            renderItem={renderCard}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              query.trim() &&
              (isValidPhone(query.trim()) || isValidAdminId(query.trim())) &&
              !searchError ? (
                <View className="py-10 items-center">
                  <Ionicons name="search-outline" size={48} color="#9CA3AF" />
                  <Text className="mt-3 text-gray-500 font-medium">
                    No admin or properties found
                  </Text>
                </View>
              ) : null
            }
          />
        )}

        {tab === "location" && !locationSearching && (
          <FlatList
            className="mt-6"
            data={locationResults}
            keyExtractor={(item) => `${item.admin.id}-${item.property.id}`}
            renderItem={renderCard}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              query.trim().length >= 3 && !locationSearchError ? (
                <View className="py-10 items-center">
                  <Ionicons name="search-outline" size={48} color="#9CA3AF" />
                  <Text className="mt-3 text-gray-500 font-medium">
                    No properties found in this area
                  </Text>
                </View>
              ) : null
            }
          />
        )}
      </View>
    </View>
  );
}
