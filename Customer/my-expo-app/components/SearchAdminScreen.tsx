/**
 * Customer search: Phase 1 — Unique ID only (property ID myp…, owner ID mys…/myo…, 10-digit phone).
 *
 * Phase 2 (TODO): Restore Location tab — re-add `expo-location`, state `tab: "id" | "location"`,
 * `runSearchByLocation` calling `GET /api/properties/search-by-location`, `useCurrentLocation`,
 * `locationResults` / `locationSearching` / `locationSearchError`, the two-tab header UI, and the
 * second FlatList for location results. Prior implementation lived in git history on this file.
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
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
  fullProperty?: Record<string, any>;
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
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const { theme } = useTheme();
  const primaryBg = theme === "female" ? "#EC4899" : "#1E33FF";
  const primaryText = theme === "female" ? "#EC4899" : "#1E33FF";

  const isValidPhone = (text: string) => /^\d{10}$/.test(normalizePhone(text));
  const isValidAdminId = (text: string) => {
    return /^(mys|myo)\d{2}[a-z]\d{6}$/i.test(text.trim());
  };

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
      ? q.startsWith("+")
        ? q
        : `+91${normalizePhone(q)}`
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

  const runSearchById = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearchError(null);
      return;
    }

    const normalizedQuery = trimmed.toLowerCase();

    if (normalizedQuery.startsWith("myp")) {
      if (trimmed.length < 11) {
        setResults([]);
        setSearchError("Enter full Property ID (e.g. MYP26A000001)");
        return;
      }

      if (!isValidPropertyId(trimmed)) {
        setResults([]);
        setSearchError("Invalid Property ID format");
        return;
      }

      setSearching(true);
      setSearchError(null);

      try {
        const property = await searchPropertyById(trimmed.toLowerCase());

        if (!property) {
          setResults([]);
          setSearchError("No property found with this ID.");
          return;
        }

        const room = (property.rooms && property.rooms[0]) || {};
        const roomType = room.roomType || property.propertyType || "—";
        const price = room.pricePerMonth ?? 0;
        const locationStr =
          [property.city, property.state].filter(Boolean).join(", ") || "—";
        const occ = formatOccupancySharingFromRooms(
          Array.isArray(property.rooms) ? property.rooms : [room]
        );
        const audience = extractPropertyAudience(property) || undefined;

        setResults([
          {
            admin: {
              id: property.ownerUniqueId || property.ownerId,
              name: property.ownerName || "Property owner",
            },
            property: {
              id: property.uniqueId,
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
      } catch {
        setResults([]);
        setSearchError("Failed to search property.");
      } finally {
        setSearching(false);
      }

      return;
    }

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
              [p.city, p.state].filter(Boolean).join(", ") || "—";
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
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearchError(null);
      return;
    }

    const t = setTimeout(runSearchById, 500);
    return () => clearTimeout(t);
  }, [query, runSearchById]);

  const handleSearch = (text: string) => {
    setQuery(text);
  };

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
        <Text className="text-lg font-semibold flex-1">{item.property.name}</Text>

        <Text
          className={`text-sm font-semibold ${getStatusColor(item.enrollmentStatus)}`}
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

      {item.property.id && (
        <Text className="text-gray-400 text-[12px] mt-1">
          Property ID: {item.property.id}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView style={{ backgroundColor: primaryBg }}>
        <View className="pt-4 pb-10 px-6" />
      </SafeAreaView>

      <View className="flex-1 bg-white rounded-t-[40px] px-6 pt-6 -mt-10">
        <View className="relative min-h-[40px] flex-row items-center justify-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="absolute left-0 z-10 h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white"
          >
            <Ionicons name="chevron-back" size={22} />
          </TouchableOpacity>

          <View
            className="rounded-full px-5 py-2"
            style={{ backgroundColor: primaryBg }}
          >
            <Text className="font-semibold text-white">Unique ID</Text>
          </View>
        </View>

        <View className="mt-6">
          <View className="bg-[#F9FAFB] rounded-full h-[46px] px-4 flex-row items-center border border-gray-200">
            <Ionicons name="search" size={18} color="#999" />
            <TextInput
              placeholder="Phone or Property ID (myp...)"
              value={query}
              onChangeText={handleSearch}
              className="ml-2 flex-1"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {searching && (
          <View className="py-10 items-center">
            <ActivityIndicator size="large" color={primaryText} />
            <Text className="mt-3 text-gray-500 font-medium">
              Searching admins & properties...
            </Text>
          </View>
        )}

        {searchError && !searching && (
          <View className="py-6 px-4 bg-red-50 rounded-xl mx-1">
            <Text className="text-red-700 text-center font-medium">
              {searchError}
            </Text>
          </View>
        )}

        {!searching && (
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
      </View>
    </View>
  );
}
