import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNav from "./BottomNav";
import { userApi, propertyApi, bookingApi } from "../utils/api";
import { useProperty } from "../contexts/PropertyContext";
import { useProperties } from "../src/hooks";
import { getInactiveTenants } from "../utils/inactiveTenantsStore";

type FilterType = "FLOOR" | "ROOM" | "DUE" | "A_Z" | "Z_A" | "INACTIVE" | "MOVEOUT_REQUESTED";

interface Customer {
  id: string;
  uniqueId: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  sex?: string;
  userType?: string;
  isActive?: boolean;
  profileExtras?: any;
}

function getFloorLabel(floor: number): string {
  if (floor === 0) return "Ground Floor";
  if (floor === 1) return "1st Floor";
  if (floor === 2) return "2nd Floor";
  if (floor === 3) return "3rd Floor";
  return `${floor}th Floor`;
}

/** Match booking to current property by room's propertyId, propertyUniqueId, or propertyName. */
function bookingBelongsToProperty(b: any, propertyMatchValues: string[]): boolean {
  if (!propertyMatchValues.length) return false;
  const r = b.room;
  if (!r) return false;
  const refs = [r.propertyId, r.propertyUniqueId, r.propertyName].filter(Boolean).map((x: any) => String(x).trim());
  const norm = (s: string) => s.toLowerCase().trim();
  return refs.some((ref) =>
    propertyMatchValues.some((v) => {
      if (!v || !ref) return false;
      const vn = norm(v);
      const rn = norm(ref);
      return rn === vn || ref === v || ref.startsWith(v) || ref.includes(v) || v.includes(ref);
    })
  );
}

/** Match room to current property (for rooms from /api/properties/rooms/all). */
function roomBelongsToProperty(room: any, propertyMatchValues: string[]): boolean {
  if (!propertyMatchValues.length) return false;
  const refs = [room.propertyId, room.propertyUniqueId, room.propertyName].filter(Boolean).map((x: any) => String(x).trim());
  const norm = (s: string) => s.toLowerCase().trim();
  return refs.some((ref) =>
    propertyMatchValues.some((v) => {
      if (!v || !ref) return false;
      const vn = norm(v);
      const rn = norm(ref);
      return rn === vn || ref === v || ref.startsWith(v) || ref.includes(v) || v.includes(ref);
    })
  );
}

/** Total pending due for a booking: security (if unpaid) + rent online (if unpaid) + rent cash (if unpaid). Matches Customer app DueAmount logic. */
function getTotalDueFromBooking(b: any): number {
  const toBool = (v: any) => v === true || v === "true" || v === 1;
  const security = Number(b.securityDeposit) || 0;
  const isSecurityPaid = toBool(b.isSecurityPaid);
  const onlineRecv = Number(b.onlinePaymentRecv) || 0;
  const cashRecv = Number(b.cashPaymentRecv) || 0;
  const isRentOnlinePaid = toBool(b.isRentOnlinePaid);
  const isRentCashPaid = toBool(b.isRentCashPaid);
  let due = 0;
  if (security > 0 && !isSecurityPaid) due += security;
  if (onlineRecv > 0 && !isRentOnlinePaid) due += onlineRecv;
  if (cashRecv > 0 && !isRentCashPaid) due += cashRecv;
  return due;
}

export default function AdminCustomerModule({ navigation }: any) {
  const { currentProperty } = useProperty();
  const { list: propertiesList } = useProperties();
  const propertyId = currentProperty?.id;
  const match = propertiesList?.find(
    (p: any) =>
      p.uniqueId === currentProperty?.id || String(p.id) === currentProperty?.id || p.name === currentProperty?.name
  );
  const propertyUniqueId = match?.uniqueId ?? propertiesList?.[0]?.uniqueId ?? propertyId;
  const propertyMatchValues = useMemo(
    () => [currentProperty?.name, propertyUniqueId, propertyId].filter(Boolean) as string[],
    [currentProperty?.name, propertyUniqueId, propertyId]
  );

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("FLOOR");
  const [showFilter, setShowFilter] = useState(false);
  const [expandedFloor, setExpandedFloor] = useState<string | null>(null);
  const [apiCustomers, setApiCustomers] = useState<Customer[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [inactiveTenants, setInactiveTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch data; refetch when selected property changes so tenants are property-scoped
  useEffect(() => {
    fetchAllData();
  }, [propertyId]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      console.log("[SearchScreen] Fetching data for property:", propertyId ?? "all");

      const params = propertyId ? { propertyId } : {};
      const [customersRes, propertiesRes, roomsRes, bookingsRes, inactiveRes] = await Promise.all([
        userApi.get("/api/users/list/all-customers"),
        propertyApi.get("/api/properties/list"),
        propertyApi.get("/api/properties/rooms/all"),
        bookingApi.get("/api/bookings/list/active-with-details", { params }),
        bookingApi
          .get("/api/bookings/list/inactive-for-property", { params })
          .catch(() => ({ data: { success: false, tenants: [] as any[] } })),
      ]);

      if (customersRes.data.success && customersRes.data.customers) {
        setApiCustomers(customersRes.data.customers);
      }
      if (propertiesRes.data.success && propertiesRes.data.properties) {
        setProperties(propertiesRes.data.properties);
      }
      if (roomsRes.data.success && roomsRes.data.rooms) {
        setRooms(roomsRes.data.rooms);
      }
      if (bookingsRes.data.success && Array.isArray(bookingsRes.data.bookings)) {
        setBookings(bookingsRes.data.bookings);
      }
      const fromServer =
        inactiveRes?.data?.success && Array.isArray(inactiveRes.data.tenants)
          ? inactiveRes.data.tenants
          : [];
      const fromLocal = await getInactiveTenants();
      const serverKey = new Set(
        fromServer.flatMap((t: any) => [t.uniqueId, t.id].filter(Boolean).map(String))
      );
      const merged = [
        ...fromServer,
        ...fromLocal.filter((t: any) => {
          const uid = t.uniqueId ? String(t.uniqueId) : "";
          const id = t.id != null ? String(t.id) : "";
          if (uid && serverKey.has(uid)) return false;
          if (id && serverKey.has(id)) return false;
          return true;
        }),
      ];
      setInactiveTenants(merged);
    } catch (error: any) {
      console.error("[SearchScreen] Error fetching data:", error);
      Alert.alert("Error", "Failed to load data. Please check backend connections.");
    } finally {
      setLoading(false);
    }
  };

  // Only show tenants whose active booking is in the CURRENT selected property
  const bookingsForProperty = useMemo(() => {
    if (!propertyMatchValues.length) return [];
    return bookings.filter((b) => bookingBelongsToProperty(b, propertyMatchValues));
  }, [bookings, propertyMatchValues]);

  const inactiveForProperty = useMemo(() => {
    if (!propertyMatchValues.length) return [];
    const norm = (s: string) => s.toLowerCase().trim();
    return inactiveTenants.filter((tenant: any) => {
      const refs = [tenant.propertyId, tenant.propertyName].filter(Boolean).map((x) => String(x).trim());
      return refs.some((ref) =>
        propertyMatchValues.some((v) => {
          if (!v || !ref) return false;
          const vn = norm(v);
          const rn = norm(ref);
          return rn === vn || ref === v || ref.startsWith(v) || ref.includes(v) || v.includes(ref);
        })
      );
    });
  }, [inactiveTenants, propertyMatchValues]);

  /** Anyone with an active booking on this property (by user id, mystay id, or booking.customerId). */
  const activeBookingKeysForProperty = useMemo(() => {
    const keys = new Set<string>();
    bookingsForProperty.forEach((b: any) => {
      if (b.customerId != null) keys.add(String(b.customerId));
      if (b.customer?.id != null) keys.add(String(b.customer.id));
      if (b.customer?.uniqueId) keys.add(String(b.customer.uniqueId));
    });
    return keys;
  }, [bookingsForProperty]);

  // In AdminCustomerModule.tsx, update the customers useMemo section:

const customers = useMemo(() => {
  const activeCustomers = apiCustomers
    .map(cust => {
      const custIdStr = cust.id != null ? String(cust.id) : "";
      const customerBooking = bookingsForProperty.find((b: any) => {
        if (b.customerId != null && String(b.customerId) === custIdStr) return true;
        if (!b.customer) return false;
        return (
          String(b.customer.id) === custIdStr || b.customer.uniqueId === cust.uniqueId
        );
      });
      const normalizedPhone = (cust.phone || '').replace(/\D/g, '').slice(-10);
      let tenantStatus = 'Inactive';
      let tenantColor = '#999';
      let room = "N/A";
      let floor = "N/A";
      let due = 0;

      if (customerBooking && customerBooking.room) {
        tenantStatus = 'Active Tenant';
        tenantColor = '#22c55e';
        room = customerBooking.room.roomNumber != null ? String(customerBooking.room.roomNumber) : "N/A";
        floor = getFloorLabel(Number(customerBooking.room.floor));
        due = getTotalDueFromBooking(customerBooking);
      } else if (cust.isActive && customerBooking) {
        tenantStatus = 'Active Tenant';
        tenantColor = '#22c55e';
        due = getTotalDueFromBooking(customerBooking);
      }

      const fullName = `${cust.firstName || ''} ${cust.lastName || ''}`.trim() || 'Unknown Customer';
      
      // Fix: Get profile image from profileExtras
      const profileImage = cust.profileExtras?.profileImage;
      
      // Fix: Create proper avatar URL if no profile image
      const photo = profileImage 
        ? profileImage 
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&size=150&background=3B82F6&color=fff&bold=true&length=2`;

      return {
        id: cust.id,
        mystayId: cust.uniqueId,
        name: fullName,
        phone: normalizedPhone || 'Not Provided',
        room,
        floor,
        due,
        status: customerBooking ? "active" : (cust.isActive ? "active" : "inactive"),
        photo, // Use the constructed photo URL
        moveOutRequested: false,
        email: cust.email || 'N/A',
        sex: cust.sex || 'N/A',
        tenantStatus,
        tenantColor,
        userType: cust.userType,
        bedNumbers: customerBooking?.bedNumbers || null,
        isSingleOccupancy: customerBooking?.isSingleOccupancy || false,
        bookingId: customerBooking?.id || null,
        profileExtras: cust.profileExtras, // Pass through profileExtras
      };
    })
    .filter(item => item.bookingId != null);

  // Build a set of IDs / uniqueIds that currently have an active booking
  const activeTenantIds = new Set(
    activeCustomers
      .map((c) => c.id)
      .filter((id) => id != null),
  );
  const activeTenantMystayIds = new Set(
    activeCustomers
      .map((c) => c.mystayId)
      .filter((id) => id != null),
  );

  const inactiveCustomers = inactiveForProperty
    .filter((tenant: any) => {
      const id = tenant.id != null ? String(tenant.id) : "";
      const uniqueId = tenant.uniqueId ? String(tenant.uniqueId) : "";
      if (id && activeBookingKeysForProperty.has(id)) return false;
      if (uniqueId && activeBookingKeysForProperty.has(uniqueId)) return false;
      if (id && activeTenantIds.has(tenant.id)) return false;
      if (uniqueId && activeTenantMystayIds.has(uniqueId)) return false;
      return true;
    })
    .map((tenant: any) => {
      const tenantName = tenant.name || "User";
      // Fix: Get profile image from tenant data
      const profileImage = tenant.profileImage || tenant.profileExtras?.profileImage;
      
      // Fix: Create proper avatar URL
      const photo = profileImage 
        ? profileImage 
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(tenantName)}&size=150&background=3B82F6&color=fff&bold=true&length=2`;

      return {
        id: tenant.id,
        mystayId: tenant.uniqueId,
        name: tenantName,
        phone: tenant.phone || "Not Provided",
        room: tenant.roomNumber || "N/A",
        floor: tenant.floor || "N/A",
        due: Number(tenant.currentDue || 0),
        status: "inactive",
        photo,
        moveOutRequested: false,
        email: tenant.email || "N/A",
        sex: tenant.sex || "N/A",
        tenantStatus: "Inactive",
        tenantColor: "#64748b",
        userType: "inactive",
        bedNumbers: null,
        isSingleOccupancy: false,
        bookingId: tenant.moveOutRequestId || tenant.id,
        profileExtras: tenant.profileExtras,
      };
    });

  return [...activeCustomers, ...inactiveCustomers];
}, [apiCustomers, bookingsForProperty, inactiveForProperty, activeBookingKeysForProperty]);

  // Rooms for current property: from API if they have property info, else from bookings in this property
  const roomsForProperty = useMemo(() => {
    if (!propertyMatchValues.length) return [];
    const fromApi = rooms.filter((r: any) => roomBelongsToProperty(r, propertyMatchValues));
    if (fromApi.length > 0) return fromApi;
    const roomIds = new Set(bookingsForProperty.map((b: any) => b.room?.id).filter(Boolean));
    return rooms.filter((r: any) => r.id != null && roomIds.has(String(r.id)));
  }, [rooms, propertyMatchValues, bookingsForProperty]);

  // Floors: from rooms of current property, or from bookings' rooms if no rooms list
  const floors = useMemo(() => {
    const floorSet = new Set<number>();
    roomsForProperty.forEach((r: any) => {
      const f = Number(r.floor);
      if (!Number.isNaN(f)) floorSet.add(f);
    });
    if (floorSet.size === 0) {
      bookingsForProperty.forEach((b: any) => {
        const f = Number(b.room?.floor);
        if (!Number.isNaN(f)) floorSet.add(f);
      });
    }
    return [...floorSet].sort((a, b) => a - b).map((f) => getFloorLabel(f));
  }, [roomsForProperty, bookingsForProperty]);

  // Room numbers for current property (ROOM filter)
  const allRooms = useMemo(() => {
    const fromRooms = roomsForProperty
      .map((r: any) => (r.roomNumber != null ? String(r.roomNumber) : ""))
      .filter(Boolean);
    if (fromRooms.length > 0) return [...new Set(fromRooms)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const fromBookings = bookingsForProperty
      .map((b: any) => (b.room?.roomNumber != null ? String(b.room.roomNumber) : ""))
      .filter(Boolean);
    return [...new Set(fromBookings)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [roomsForProperty, bookingsForProperty]);

  const getFloorCount = (floorLabel: string) => {
    return customers.filter((c) => c.floor === floorLabel && c.status === "active").length;
  };

  const getRoomOccupant = (roomNumber: string) => {
    const normalized = String(roomNumber);
    return customers.find((c) => String(c.room) === normalized && c.status === "active");
  };

  const processedCustomers = useMemo(() => {
    let data = [...customers];

    // Search by Customer name / ID / phone / room
    data = data.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.mystayId.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.room.includes(search)
    );

    // Filter logic
    switch (filter) {
      case "DUE":
        return data.filter((c) => c.due > 0).sort((a, b) => b.due - a.due);
      case "A_Z":
        return data.sort((a, b) => a.name.localeCompare(b.name));
      case "Z_A":
        return data.sort((a, b) => b.name.localeCompare(a.name));
      case "INACTIVE":
        return data.filter((c) => c.status === "inactive");
      case "MOVEOUT_REQUESTED":
        return data.filter((c) => c.moveOutRequested === true);
      default:
        return data;
    }
  }, [search, filter, customers]);

  // Display card with customer info
  const CustomerCard = ({ item }: any) => (
  <TouchableOpacity
    onPress={() => 
      navigation.navigate("TenantDetailScreen", { 
        customerId: item.id,
        customerData: item 
      })
    }
    className="bg-white p-4 mb-3 rounded-2xl border border-gray-100 shadow-sm"
  >
    <View className="flex-row justify-between items-start">
      <View className="flex-row items-center flex-1">
        {/* Improved Image component with error handling */}
        <View className="w-12 h-12 rounded-xl mr-3 overflow-hidden bg-blue-100">
          <Image
            source={{ uri: item.photo }}
            className="w-full h-full"
            resizeMode="cover"
            onError={(e) => {
              console.log('Image failed to load:', item.photo);
              // You could set a fallback here if needed
            }}
          />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center justify-between pr-2">
            <Text className="text-lg font-bold text-gray-900">{item.name}</Text>
            <View 
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: item.tenantColor + '20' }}
            >
              <Text 
                className="text-xs font-bold"
                style={{ color: item.tenantColor }}
              >
                {item.tenantStatus}
              </Text>
            </View>
          </View>
          <Text className="text-gray-500 text-sm mt-1">{item.phone}</Text>
          <Text className="text-xs text-blue-600 font-bold mt-1">{item.mystayId}</Text>
          
          {/* Room and Bed Information */}
          {item.room !== "N/A" && (
            <View className="flex-row items-center mt-2">
              <Ionicons name="bed-outline" size={14} color="#666" />
              <Text className="text-sm text-gray-600 ml-1">
                {item.floor} • Room {item.room}
                {item.bedNumbers && item.bedNumbers.length > 0 && (
                  <Text className="font-bold"> • Bed{item.bedNumbers.length > 1 ? 's' : ''} {item.bedNumbers.join(', ')}</Text>
                )}
              </Text>
            </View>
          )}
        </View>
      </View>
      <View className="items-end ml-2">
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate("SendNotificationScreen", {
              selectedTenants: [item.id],
            });
          }}
          className="bg-blue-500 w-10 h-10 rounded-xl items-center justify-center mb-2"
        >
          <Ionicons name="notifications-outline" size={18} color="white" />
        </TouchableOpacity>

        <Text className="text-gray-400 text-[10px] uppercase font-bold">Due</Text>
        <Text
          className={`text-lg font-bold ${
            item.due > 0 ? "text-red-500" : "text-green-600"
          }`}
        >
          ₹{item.due}
        </Text>
      </View>
    </View>
  </TouchableOpacity>
);

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="bg-white">
        <View className="bg-white pt-4 pb-6 px-6">
          <View className="flex-row justify-between items-center">
            <Text className="text-black text-3xl font-bold">Tenants</Text>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => navigation.navigate("SendNotificationScreen")}
                className="bg-blue-500 px-4 py-2 rounded-xl flex-row items-center"
              >
                <Ionicons
                  name="notifications-outline"
                  size={16}
                  color="white"
                />
                <Text className="text-white font-bold ml-1 text-sm">Notify</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text className="text-[15px] text-gray-600 mt-2">
            Search & manage current and past occupants
          </Text>
        </View>
      </SafeAreaView>

      <View className="flex-1 bg-[#F6F8FF] rounded-t-[40px] -mt-8 px-6 pt-6">
        {/* Search Bar */}
        <View className="flex-row items-center bg-white rounded-xl px-4 h-12 mb-4 border border-gray-200">
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            placeholder="Search Name/ID/Phone"
            value={search}
            onChangeText={setSearch}
            className="ml-3 flex-1 h-full"
          />
          <TouchableOpacity onPress={() => setShowFilter(!showFilter)}>
            <Ionicons name="options-outline" size={22} color="#1E33FF" />
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {loading && (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#1E33FF" />
            <Text className="text-gray-600 mt-4 text-base">Loading customers...</Text>
          </View>
        )}

        {!loading && !propertyId && (
          <View className="flex-1 items-center justify-center py-10">
            <Ionicons name="business-outline" size={48} color="#94A3B8" />
            <Text className="text-slate-600 text-center mt-4 px-4 text-base font-semibold">
              Select a property
            </Text>
            <Text className="text-slate-500 text-center mt-2 px-4 text-sm">
              Choose a property from the dropdown to see its tenants.
            </Text>
          </View>
        )}

        {!loading && propertyId && customers.length === 0 && (
          <View className="flex-1 items-center justify-center py-10">
            <Ionicons name="people-outline" size={48} color="#94A3B8" />
            <Text className="text-slate-600 text-center mt-4 px-4 text-base font-semibold">
              No tenants in this property
            </Text>
            <Text className="text-slate-500 text-center mt-2 px-4 text-sm">
              Allocate a room from Customers → Enrollment to add tenants here.
            </Text>
            <TouchableOpacity
              onPress={fetchAllData}
              className="mt-6 bg-blue-500 px-8 py-3 rounded-lg"
            >
              <Text className="text-white font-bold">Refresh</Text>
            </TouchableOpacity>
          </View>
        )}



        {/* Current Filter Display */}
        <View className="bg-white rounded-xl px-4 py-3 mb-4 border border-gray-100 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Ionicons name="funnel" size={16} color="#1E33FF" />
            <Text className="ml-2 text-gray-600 font-medium">Current Filter:</Text>
            <Text className="ml-2 text-[#1E33FF] font-bold">
              {filter === "FLOOR" && "Floorwise"}
              {filter === "ROOM" && "Rooms"}
              {filter === "DUE" && "Pending Dues"}
              {filter === "A_Z" && "Customer A–Z"}
              {filter === "Z_A" && "Customer Z–A"}
              {filter === "INACTIVE" && "Inactive"}
              {filter === "MOVEOUT_REQUESTED" && "Move Out Requested"}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowFilter(!showFilter)}>
            <Text className="text-[#1E33FF] font-bold text-sm">Change</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Dropdown */}
        {showFilter && (
          <>
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setShowFilter(false)}
              className="absolute top-0 left-0 right-0 bottom-0 z-40"
              style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
            />

            <View className="absolute top-32 left-6 right-6 bg-white rounded-2xl shadow-2xl z-50 border border-gray-200">
              {[
                ["FLOOR", "Floorwise"],
                ["ROOM", "Rooms"],
                ["DUE", "Pending Dues"],
                ["A_Z", "Customer A–Z"],
                ["Z_A", "Customer Z–A"],
                ["INACTIVE", "Inactive"],
                ["MOVEOUT_REQUESTED", "Move Out Requested"],
              ].map(([key, label], index, array) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => {
                    setFilter(key as FilterType);
                    setShowFilter(false);
                  }}
                  className={`px-5 py-4 ${
                    index < array.length - 1 ? "border-b border-gray-100" : ""
                  }`}
                >
                  <Text
                    className={
                      filter === key
                        ? "text-[#1E33FF] font-bold text-base"
                        : "text-gray-700 text-base"
                    }
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Floor wise - Expandable (floors from current property's rooms) */}
        {filter === "FLOOR" && !loading && propertyId && customers.length > 0 && (
          <ScrollView showsVerticalScrollIndicator={false}>
            {floors.length === 0 ? (
              <View className="py-10 px-4 items-center">
                <Ionicons name="business-outline" size={48} color="#94A3B8" />
                <Text className="text-slate-500 text-center mt-3 font-medium">No floors yet</Text>
                <Text className="text-slate-400 text-center mt-1 text-sm">Add rooms in your property to see floor-wise tenants.</Text>
              </View>
            ) : floors.map((floor) => {
              const floorCount = getFloorCount(floor);
              return (
                <View key={floor} className="mb-4">
                  <TouchableOpacity
                    onPress={() =>
                      setExpandedFloor(
                        expandedFloor === floor ? null : floor
                      )
                    }
                    className="bg-white p-4 rounded-xl flex-row justify-between items-center"
                  >
                    <View>
                      <Text className="font-bold text-gray-800">{floor}</Text>
                      <Text className="text-sm text-gray-500 mt-1">
                        {floorCount} tenant{floorCount !== 1 ? "s" : ""}
                      </Text>
                    </View>
                    <Ionicons
                      name={
                        expandedFloor === floor ? "chevron-up" : "chevron-down"
                      }
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>

                  {expandedFloor === floor && (
                    <View className="mt-3">
                      {processedCustomers
                        .filter((c) => c.floor === floor)
                        .map((c) => (
                          <CustomerCard key={c.id} item={c} />
                        ))}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Room wise - rooms of current property; show allocated tenant per room */}
        {filter === "ROOM" && !loading && propertyId && customers.length > 0 && (
          allRooms.length === 0 ? (
            <View className="py-10 px-4 items-center">
              <Ionicons name="bed-outline" size={48} color="#94A3B8" />
              <Text className="text-slate-500 text-center mt-3 font-medium">No rooms yet</Text>
              <Text className="text-slate-400 text-center mt-1 text-sm">Add rooms in your property to see room-wise occupants.</Text>
            </View>
          ) : (
          <FlatList
            data={allRooms}
            keyExtractor={(room) => room}
            renderItem={({ item: room }) => {
              const occupant = getRoomOccupant(room);
              return (
                <TouchableOpacity
                  onPress={() => {
                    if (occupant) {
                      navigation.navigate("TenantDetailScreen", {
                        customerId: occupant.id,
                        customerData: occupant,
                      });
                    }
                  }}
                  className="bg-white p-4 mb-3 rounded-xl flex-row justify-between items-center"
                  disabled={!occupant}
                >
                  <View>
                    <Text className="font-bold text-gray-800">Room {room}</Text>
                    <Text
                      className={
                        occupant
                          ? "text-gray-600 mt-1"
                          : "text-gray-400 italic mt-1"
                      }
                    >
                      {occupant ? occupant.name : "Vacant"}
                    </Text>
                    {occupant && (
                      <>
                        <Text className="text-xs text-blue-600 font-bold mt-1">
                          {occupant.mystayId}
                        </Text>
                        {occupant.bedNumbers && occupant.bedNumbers.length > 0 && (
                          <Text className="text-xs text-slate-500 mt-0.5">
                            Bed{occupant.bedNumbers.length > 1 ? "s" : ""} {occupant.bedNumbers.join(", ")}
                          </Text>
                        )}
                      </>
                    )}
                  </View>
                  {occupant && (
                    <View className="items-end">
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          navigation.navigate("SendNotificationScreen", {
                            selectedTenants: [occupant.id],
                          });
                        }}
                        className="bg-blue-500 w-10 h-10 rounded-xl items-center justify-center mb-2"
                      >
                        <Ionicons
                          name="notifications"
                          size={18}
                          color="white"
                        />
                      </TouchableOpacity>
                      <Text className="text-xs text-gray-400 uppercase font-bold">
                        Due
                      </Text>
                      <Text
                        className={`text-base font-bold ${
                          occupant.due > 0 ? "text-red-500" : "text-green-600"
                        }`}
                      >
                        ₹{occupant.due}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
          )
        )}

        {/* List for A-Z, Z-A, Dues, and Inactive */}
        {filter !== "FLOOR" && filter !== "ROOM" && !loading && propertyId && customers.length > 0 && (
          <FlatList
            data={processedCustomers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <CustomerCard item={item} />}
            ListEmptyComponent={
              <Text className="text-center text-gray-400 mt-10">
                No customers found
              </Text>
            }
          />
        )}
      </View>

      {/* Floating Button */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate("CustomersScreen")}
        className="absolute bottom-36 right-6 w-16 h-16 rounded-full bg-[#3B4BFF] justify-center items-center"
        style={{
          shadowColor: "#3B4BFF",
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 8,
        }}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
      <BottomNav />
    </View>
  );
}