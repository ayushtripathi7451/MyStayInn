// components/TicketsScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import TicketCard from "./TicketCard";
import { ticketApi } from "../utils/api";

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
  const [tab, setTab] = useState<"open" | "closed">("open");
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [closedCount, setClosedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      const [openRes, closedRes] = await Promise.all([
        ticketApi.get<{ success: boolean; tickets?: TicketItem[] }>("/api/tickets", { params: { tab: "open" } }),
        ticketApi.get<{ success: boolean; tickets?: TicketItem[] }>("/api/tickets", { params: { tab: "closed" } }),
      ]);
      const openList = openRes.data?.success && Array.isArray(openRes.data.tickets) ? openRes.data.tickets : [];
      const closedList = closedRes.data?.success && Array.isArray(closedRes.data.tickets) ? closedRes.data.tickets : [];
      
      setOpenCount(openList.length);
      setClosedCount(closedList.length);
      setTickets(tab === "open" ? openList : closedList);
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
  }, [tab]);

  useEffect(() => {
    setLoading(true);
    fetchTickets();
  }, [fetchTickets]);

  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">

      {/* HEADER */}
      <View className="flex-row items-center px-6 py-4">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1 -ml-1">
          <Ionicons name="arrow-back" size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-4 text-2xl font-semibold text-slate-900">Helpdesk</Text>
      </View>

      {/* TAB SWITCHER */}
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
    </SafeAreaView>
  );
}
