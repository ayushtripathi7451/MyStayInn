import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { bookingApi, moveOutApi } from "../utils/api";
import { useProperty } from "../contexts/PropertyContext";
import { useProperties } from "../src/hooks";
import { getInactiveTenants, InactiveTenantSnapshot } from "../utils/inactiveTenantsStore";
import { adminDisplayDueAmount } from "./DueAmount";

interface BookingWithDetails {
  id: string;
  uniqueId: string;
  customerId: string;
  customer: { id?: string; uniqueId?: string; firstName?: string; lastName?: string; phone?: string; email?: string } | null;
  room: { id?: string; roomNumber?: string; floor?: number | string; propertyName?: string; propertyId?: string; propertyUniqueId?: string } | null;
  moveInDate: string;
  moveOutDate?: string | null;
  securityDeposit: number;
  isSecurityPaid: boolean;
  rentAmount: string;
  status: string;
  /** From booking-service: security + unpaid rent (customerTotalDue / effective-dues) */
  currentDue?: number | string;
  rentPeriod?: string;
  scheduledOnlineRent?: number;
  scheduledCashRent?: number;
  rentOnlinePaidYearMonth?: string | null;
  rentCashPaidYearMonth?: string | null;
}

function isEnrollmentBookingStatus(status: string | undefined): boolean {
  const s = String(status || "").toLowerCase();
  return (
    s === "enrollment_pending" ||
    s === "enrollment_pay_pending" ||
    s === "enrollment_requested"
  );
}

/** Same property matching as other screens: by id, uniqueId, or name so only tenants of the selected property are shown. */
function bookingBelongsToProperty(
  b: BookingWithDetails,
  propertyMatchValues: string[]
): boolean {
  if (!propertyMatchValues.length) return false;
  const r = b.room;
  if (!r) return false;
  const refs = [r.propertyId, r.propertyUniqueId, r.propertyName].filter(Boolean).map((x) => String(x).trim());
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

export default function TenantManagementScreen({ navigation }: { navigation: any }) {
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

  const selectedPropertyForDue = useMemo(
    () => ({
      propertyId: propertyId != null ? String(propertyId) : undefined,
      propertyUniqueId: propertyUniqueId != null ? String(propertyUniqueId) : undefined,
      propertyName: currentProperty?.name,
    }),
    [propertyId, propertyUniqueId, currentProperty?.name]
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "room" | "floor" | "pending_dues" | "move_out_requested" | "inactive">("all");
  const [filterRoom, setFilterRoom] = useState<string | null>(null);
  const [filterFloor, setFilterFloor] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [inactiveTenants, setInactiveTenants] = useState<InactiveTenantSnapshot[]>([]);
  const [moveOutCustomerIds, setMoveOutCustomerIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      if (!propertyId || !propertyMatchValues.length) {
        setBookings([]);
        setInactiveTenants([]);
        setMoveOutCustomerIds(new Set());
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const params: Record<string, string> = { propertyId };
      const [bookingsRes, requestedRes, acceptedRes] = await Promise.all([
        bookingApi.get("/api/bookings/list/active-with-details", { params, timeout: 15000 }),
        moveOutApi.get("/api/move-out/requests", { params: { status: "requested", propertyId }, timeout: 10000 }).catch(() => ({ data: { data: { requests: [] } } })),
        moveOutApi.get("/api/move-out/requests", { params: { status: "accepted", propertyId }, timeout: 10000 }).catch(() => ({ data: { data: { requests: [] } } })),
      ]);

      if (bookingsRes.data?.success && Array.isArray(bookingsRes.data.bookings)) {
        const raw = bookingsRes.data.bookings.map((b: any) => ({
          ...b,
          securityDeposit: b.securityDeposit != null ? Number(b.securityDeposit) : 0,
          isSecurityPaid: Boolean(b.isSecurityPaid),
        }));
        const forThisProperty = raw.filter((b: BookingWithDetails) => bookingBelongsToProperty(b, propertyMatchValues));
        setBookings(forThisProperty);
      } else {
        setBookings([]);
      }

      const requested = requestedRes.data?.data?.requests ?? [];
      const accepted = acceptedRes.data?.data?.requests ?? [];
      const ids = new Set<string>();
      requested.forEach((r: any) => r.customerId && ids.add(String(r.customerId)));
      accepted.forEach((r: any) => r.customerId && ids.add(String(r.customerId)));
      setMoveOutCustomerIds(ids);
      const inactive = await getInactiveTenants();
      setInactiveTenants(
        inactive.filter((tenant) =>
          bookingBelongsToProperty(
            {
              room: {
                propertyId: tenant.propertyId,
                propertyName: tenant.propertyName,
              },
            } as BookingWithDetails,
            propertyMatchValues
          )
        )
      );
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load tenants");
      setBookings([]);
      setInactiveTenants([]);
      setMoveOutCustomerIds(new Set());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [propertyId, propertyMatchValues]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const nameFor = (b: BookingWithDetails) =>
    b.customer ? [b.customer.firstName, b.customer.lastName].filter(Boolean).join(" ").trim() || "Tenant" : "Tenant";
  const roomNumber = (b: BookingWithDetails) => b.room?.roomNumber ?? "—";
  const floorDisplay = (b: BookingWithDetails) => {
    const f = b.room?.floor;
    if (f == null) return "—";
    return typeof f === "number" ? `Floor ${f}` : String(f);
  };
  const dueAmount = (b: BookingWithDetails) =>
    adminDisplayDueAmount(b as Record<string, any>, selectedPropertyForDue);
  const hasMoveOutRequested = (b: BookingWithDetails) => moveOutCustomerIds.has(String(b.customerId));
  const openInactiveDetail = (tenant: InactiveTenantSnapshot) => {
    navigation.navigate("TenantDetailScreen", {
      tenantId: tenant.id,
      uniqueId: tenant.uniqueId,
      customer: tenant,
      booking: tenant.roomId
        ? {
            id: tenant.moveOutRequestId || tenant.id,
            roomId: tenant.roomId,
            roomNumber: tenant.roomNumber,
            floor: tenant.floor,
            propertyName: tenant.propertyName,
            moveInDate: tenant.moveInDate,
            rentAmount: "0",
            securityDeposit: tenant.securityDeposit,
            isSecurityPaid: true,
            status: "inactive",
          }
        : null,
      initialTab: "details",
    });
  };

  const uniqueRooms = Array.from(new Set(bookings.map((b) => roomNumber(b)).filter(Boolean))).sort();
  const uniqueFloors = Array.from(new Set(bookings.map((b) => floorDisplay(b)).filter((x) => x !== "—"))).sort();

  let filtered = bookings.filter((b) => {
    const matchesSearch =
      !searchQuery ||
      nameFor(b).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.customer?.phone && b.customer.phone.includes(searchQuery)) ||
      roomNumber(b).toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterType === "room" && filterRoom != null) return roomNumber(b) === filterRoom;
    if (filterType === "floor" && filterFloor != null) return floorDisplay(b) === filterFloor;
    if (filterType === "pending_dues") return dueAmount(b) > 0;
    if (filterType === "move_out_requested") return hasMoveOutRequested(b);
    return true;
  });
  const filteredInactive = inactiveTenants.filter((tenant) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      tenant.name.toLowerCase().includes(q) ||
      tenant.uniqueId.toLowerCase().includes(q) ||
      String(tenant.phone || "").toLowerCase().includes(q) ||
      String(tenant.roomNumber || "").toLowerCase().includes(q)
    );
  });

  const activeCount = bookings.length;
  const totalDues = bookings.reduce((sum, b) => sum + dueAmount(b), 0);
  const inactiveCount = inactiveTenants.length;

  const openTenantDetail = (b: BookingWithDetails) => {
    navigation.navigate("TenantDetailScreen", {
      tenantId: b.customerId,
      uniqueId: b.customer?.uniqueId ?? undefined,
      customer: b.customer,
      booking: {
        id: b.id,
        roomId: b.room?.id,
        roomNumber: b.room?.roomNumber,
        floor: b.room?.floor,
        propertyName: b.room?.propertyName,
        moveInDate: b.moveInDate,
        rentAmount: b.rentAmount,
        securityDeposit: b.securityDeposit,
        isSecurityPaid: b.isSecurityPaid,
        status: b.status,
        currentDue: b.currentDue,
        rentPeriod: b.rentPeriod,
        scheduledOnlineRent: b.scheduledOnlineRent,
        scheduledCashRent: b.scheduledCashRent,
        rentOnlinePaidYearMonth: b.rentOnlinePaidYearMonth,
        rentCashPaidYearMonth: b.rentCashPaidYearMonth,
        room: b.room,
      },
    });
  };

  if (loading && bookings.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-[#F1F5F9] items-center justify-center">
        <ActivityIndicator size="large" color="#1E33FF" />
        <Text className="text-slate-500 mt-4">Loading tenants...</Text>
      </SafeAreaView>
    );
  }

  if (!propertyId) {
    return (
      <SafeAreaView className="flex-1 bg-[#F1F5F9]">
        <View className="bg-white px-6 py-5 border-b border-slate-200 shadow-sm">
          <Text className="text-2xl font-black text-slate-900 tracking-tight">Tenant Management</Text>
          <Text className="text-slate-500 mt-1">Manage your tenants and rooms</Text>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="business-outline" size={48} color="#94A3B8" />
          <Text className="text-slate-600 font-bold text-center mt-4">Select a property</Text>
          <Text className="text-slate-500 text-center mt-2">Choose a property from the dropdown to view its tenants.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">
      <View className="bg-white px-6 py-5 border-b border-slate-200 shadow-sm">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-black text-slate-900 tracking-tight">Tenant Management</Text>
            <Text className="text-slate-500 mt-1">
              {currentProperty?.name ? `${currentProperty.name} · ` : ""}Manage your tenants and rooms
            </Text>
          </View>
          <View className="flex-row gap-3">
            <TouchableOpacity className="bg-blue-500 px-4 py-2 rounded-xl flex-row items-center" onPress={() => navigation.navigate("SendNotificationScreen")}>
              <Ionicons name="notifications-outline" size={16} color="white" />
              <Text className="text-white font-bold ml-1 text-sm">Notify</Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-[#1E33FF] px-4 py-2 rounded-xl flex-row items-center" onPress={() => navigation.navigate("AddTenantScreen")}>
              <Ionicons name="add" size={16} color="white" />
              <Text className="text-white font-bold ml-1 text-sm">Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="px-5"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {error ? (
          <View className="bg-amber-50 rounded-xl p-4 mt-4 border border-amber-200">
            <Text className="text-amber-800">{error}</Text>
          </View>
        ) : null}

        <View className="flex-row justify-between mt-6 gap-3 px-1">
          <View className="flex-1 bg-white rounded-[20px] p-4 shadow-sm border border-white">
            <View className="flex-row items-center mb-2">
              <Ionicons name="people-outline" size={20} color="#059669" />
              <Text className="ml-2 text-green-600 font-bold text-sm">Active Tenants</Text>
            </View>
            <Text className="text-2xl font-black text-slate-900">{activeCount}</Text>
          </View>
          <View className="flex-1 bg-white rounded-[20px] p-4 shadow-sm border border-white">
            <View className="flex-row items-center mb-2">
              <Ionicons name="archive-outline" size={20} color="#64748B" />
              <Text className="ml-2 text-slate-600 font-bold text-sm">Inactive</Text>
            </View>
            <Text className="text-2xl font-black text-slate-900">{inactiveCount}</Text>
          </View>
          <View className="flex-1 bg-white rounded-[20px] p-4 shadow-sm border border-white">
            <View className="flex-row items-center mb-2">
              <Ionicons name="card-outline" size={20} color="#DC2626" />
              <Text className="ml-2 text-red-600 font-bold text-sm">Total Dues</Text>
            </View>
            <Text className="text-2xl font-black text-slate-900">₹{totalDues.toLocaleString()}</Text>
          </View>
        </View>

        {/* Search and filters */}
        <View className="bg-white rounded-[24px] p-4 mt-6 shadow-sm border border-white">
          <View className="flex-row items-center bg-slate-50 rounded-xl p-3 mb-4">
            <Ionicons name="search-outline" size={20} color="#64748B" />
            <TextInput
              className="flex-1 ml-3 text-slate-900"
              placeholder="Search by name, phone, or room..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View className="flex-row flex-wrap gap-2">
            {[
              { key: "all" as const, label: "All" },
              { key: "room" as const, label: "Room" },
              { key: "floor" as const, label: "Floor" },
              { key: "pending_dues" as const, label: "Pending dues" },
              { key: "move_out_requested" as const, label: "Move-out requested" },
              { key: "inactive" as const, label: "Inactive" },
            ].map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                className={`px-4 py-2 rounded-xl ${filterType === key ? "bg-blue-500" : "bg-slate-100"}`}
                onPress={() => {
                  setFilterType(key);
                  if (key !== "room") setFilterRoom(null);
                  if (key !== "floor") setFilterFloor(null);
                }}
              >
                <Text className={`font-bold text-sm ${filterType === key ? "text-white" : "text-slate-600"}`}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {filterType === "room" && uniqueRooms.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mt-3">
              {uniqueRooms.map((room) => (
                <TouchableOpacity
                  key={room}
                  className={`px-3 py-1.5 rounded-lg ${filterRoom === room ? "bg-indigo-500" : "bg-slate-100"}`}
                  onPress={() => setFilterRoom(filterRoom === room ? null : room)}
                >
                  <Text className={filterRoom === room ? "text-white font-semibold text-xs" : "text-slate-600 text-xs"}>{room}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {filterType === "floor" && uniqueFloors.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mt-3">
              {uniqueFloors.map((floor) => (
                <TouchableOpacity
                  key={floor}
                  className={`px-3 py-1.5 rounded-lg ${filterFloor === floor ? "bg-indigo-500" : "bg-slate-100"}`}
                  onPress={() => setFilterFloor(filterFloor === floor ? null : floor)}
                >
                  <Text className={filterFloor === floor ? "text-white font-semibold text-xs" : "text-slate-600 text-xs"}>{floor}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View className="mt-4">
          {filterType === "inactive" && (
            filteredInactive.length > 0 ? filteredInactive.map((tenant) => (
              <TouchableOpacity
                key={tenant.moveOutRequestId || tenant.uniqueId}
                activeOpacity={0.8}
                onPress={() => openInactiveDetail(tenant)}
                className="bg-white rounded-[24px] p-6 mb-4 shadow-sm border border-white"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View className="w-12 h-12 rounded-xl bg-slate-200 items-center justify-center">
                      <Text className="text-slate-600 font-bold text-lg">{(tenant.firstName || tenant.name || "T").charAt(0)}</Text>
                    </View>
                    <View className="ml-4 flex-1">
                      <Text className="text-lg font-black text-slate-900">{tenant.name}</Text>
                      <Text className="text-slate-500 text-sm">Room {tenant.roomNumber ?? "—"} • {tenant.propertyName ?? "—"}</Text>
                      <Text className="text-xs text-blue-600 font-bold mt-1">{tenant.uniqueId}</Text>
                    </View>
                  </View>
                  <View className="px-3 py-1 rounded-full bg-slate-100">
                    <Text className="text-slate-600 font-bold text-xs uppercase">Inactive</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )) : (
              <View className="bg-white rounded-[24px] p-8 mt-4 items-center">
                <Ionicons name="archive-outline" size={48} color="#94A3B8" />
                <Text className="text-slate-500 font-bold text-lg mt-4">No inactive tenants</Text>
                <Text className="text-slate-400 text-center mt-2">Completed move-outs will appear here.</Text>
              </View>
            )
          )}
          {filterType !== "inactive" && filtered.map((b) => {
            const due = dueAmount(b);
            const moveOut = hasMoveOutRequested(b);
            return (
              <TouchableOpacity
                key={b.id}
                activeOpacity={0.8}
                onPress={() => openTenantDetail(b)}
                className="bg-white rounded-[24px] p-6 mb-4 shadow-sm border border-white"
              >
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center flex-1">
                    <View className="w-12 h-12 rounded-xl bg-slate-200 items-center justify-center">
                      <Text className="text-slate-600 font-bold text-lg">{nameFor(b).charAt(0)}</Text>
                    </View>
                    <View className="ml-4 flex-1">
                      <Text className="text-lg font-black text-slate-900">{nameFor(b)}</Text>
                      <Text className="text-slate-500 text-sm">Room {roomNumber(b)} • {b.room?.propertyName ?? "—"}</Text>
                      <Text className="text-xs text-blue-600 font-bold mt-1">{b.customer?.uniqueId ?? b.customerId}</Text>
                      {isEnrollmentBookingStatus(b.status) && (
                        <View className="self-start mt-1.5 bg-amber-100 px-2 py-0.5 rounded-full">
                          <Text className="text-amber-900 text-[10px] font-bold uppercase">Enrollment</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View className="items-end">
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        navigation.navigate("SendNotificationScreen", { selectedTenants: [b.customerId] });
                      }}
                      className="bg-blue-500 w-10 h-10 rounded-xl items-center justify-center mb-2"
                    >
                      <Ionicons name="notifications" size={18} color="white" />
                    </TouchableOpacity>
                    <Text className="text-xs text-slate-400 uppercase font-bold">Due</Text>
                    <Text className={`text-lg font-bold ${due > 0 ? "text-red-600" : "text-green-600"}`}>₹{due.toLocaleString()}</Text>
                    {moveOut && (
                      <View className="bg-amber-100 px-2 py-0.5 rounded-full mt-1">
                        <Text className="text-amber-800 text-xs font-medium">Move-out</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {filterType !== "inactive" && filtered.length === 0 && (
          <View className="bg-white rounded-[24px] p-8 mt-4 items-center">
            <Ionicons name="people-outline" size={48} color="#94A3B8" />
            <Text className="text-slate-500 font-bold text-lg mt-4">No tenants found</Text>
            <Text className="text-slate-400 text-center mt-2">{searchQuery || filterType !== "all" ? "Try adjusting filters" : "Add your first tenant to get started"}</Text>
          </View>
        )}

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
