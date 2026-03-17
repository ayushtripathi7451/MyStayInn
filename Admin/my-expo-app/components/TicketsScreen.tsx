// components/TicketsScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNav from "./BottomNav";
import TicketCard from "./TicketCard";
import { ticketApi } from "../utils/api";
import { useProperty } from "../contexts/PropertyContext";
import { useProperties } from "../src/hooks";

export type TicketItem = {
  id: string;
  displayId: string;
  creatorId: string;
  creatorUniqueId: string;
  propertyRef: string | null;
  category: string;
  title: string;
  description: string | null;
  status: string;
  attachmentUrls: any[];
  createdAt: string;
  updatedAt: string;
  commentCount?: number;
};

export default function TicketsScreen({ navigation }: any) {
  const { currentProperty } = useProperty();
  const { list: propertiesList } = useProperties();
  const [tab, setTab] = useState<"open" | "closed">("open");
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [closedCount, setClosedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Values to match tickets to current property (uniqueId, name, or numeric id); keep in ref to avoid refetch loop
  const propertyMatchValuesRef = useRef<string[]>([]);
  const list = propertiesList || [];
  const match = list.find(
    (p: any) =>
      p.uniqueId === currentProperty?.id ||
      String(p.id) === currentProperty?.id ||
      p.name === currentProperty?.name
  );
  const uniqueId = match?.uniqueId ?? list[0]?.uniqueId ?? currentProperty?.id;
  // Match tickets by property name first (customer sends propertyRef = selected property name/label), then by uniqueId/id
  propertyMatchValuesRef.current = [currentProperty?.name, uniqueId, currentProperty?.id].filter(Boolean) as string[];

  const fetchTickets = useCallback(async () => {
    const propertyMatchValues = propertyMatchValuesRef.current;
    const filter = (items: TicketItem[]) => {
      if (!propertyMatchValues.length) return items;
      return items.filter((t) => {
        const ref = (t.propertyRef || "").trim();
        if (!ref) return false;
        return propertyMatchValues.some(
          (v) => ref === v || ref.startsWith(v) || (v && (ref.includes(v) || v.includes(ref)))
        );
      });
    };
    try {
      const [openRes, closedRes] = await Promise.all([
        ticketApi.get<{ success: boolean; tickets?: TicketItem[] }>("/api/tickets", { params: { tab: "open" } }),
        ticketApi.get<{ success: boolean; tickets?: TicketItem[] }>("/api/tickets", { params: { tab: "closed" } }),
      ]);
      const openList = openRes.data?.success && Array.isArray(openRes.data.tickets) ? openRes.data.tickets : [];
      const closedList = closedRes.data?.success && Array.isArray(closedRes.data.tickets) ? closedRes.data.tickets : [];
      const filteredOpen = filter(openList);
      const filteredClosed = filter(closedList);
      setOpenCount(propertyMatchValues.length ? filteredOpen.length : openList.length);
      setClosedCount(propertyMatchValues.length ? filteredClosed.length : closedList.length);
      setTickets(tab === "open" ? filteredOpen : filteredClosed);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status !== 401 && status !== 404) {
        console.warn("Tickets fetch error:", e);
      }
      setTickets([]);
      setOpenCount(0);
      setClosedCount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, currentProperty?.id]);

  useEffect(() => {
    setLoading(true);
    fetchTickets();
  }, [fetchTickets]);

  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">

      {/* HEADER - same structure as Customer */}
      <View className="flex-row items-center px-6 py-4">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1 -ml-1">
          <Ionicons name="arrow-back" size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-4 text-2xl font-semibold text-slate-900">Support Tickets</Text>
      </View>

      {/* TAB SWITCHER - same layout as Customer: Open (n) | Resolved (n) */}
      <View className="mx-5 mt-2 bg-[#1E33FF] rounded-full p-1 flex-row">
        <TouchableOpacity
          onPress={() => setTab("open")}
          className={`flex-1 py-3 rounded-full ${tab === "open" ? "bg-white" : "bg-transparent"}`}
        >
          <Text className={`text-center text-base font-bold ${tab === "open" ? "text-[#1E33FF]" : "text-white"}`}>
            Open ({openCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab("closed")}
          className={`flex-1 py-3 rounded-full ${tab === "closed" ? "bg-white" : "bg-transparent"}`}
        >
          <Text className={`text-center text-base font-bold ${tab === "closed" ? "text-[#1E33FF]" : "text-white"}`}>
            Resolved ({closedCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tickets List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="mt-5 px-5"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTickets(); }} />
        }
      >
        {loading ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#1E33FF" />
          </View>
        ) : tickets.length === 0 ? (
          <View className="py-12 items-center">
            <Text className="text-slate-500 text-center">No {tab === "open" ? "open" : "resolved"} tickets</Text>
          </View>
        ) : (
          tickets.map((t) => <TicketCard key={t.id} ticket={t} navigation={navigation} />)
        )}
      </ScrollView>

      {/* Floating Add Ticket Button */}
      {/* <TouchableOpacity
        onPress={() => navigation.navigate("CreateTicketScreen")}
        className="absolute bottom-36 right-6 w-16 h-16 bg-[#1E33FF] rounded-full items-center justify-center shadow-xl"
        style={{
          shadowColor: "#1E33FF",
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <MaterialCommunityIcons name="plus" size={32} color="white" />
      </TouchableOpacity> */}

      <BottomNav/>
    </SafeAreaView>
  );
}
