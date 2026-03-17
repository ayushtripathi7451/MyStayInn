import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNav from "./BottomNav";
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
  const [openCount, setOpenCount] = useState<number>(0);
  const [closedCount, setClosedCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCounts = useCallback(async () => {
    try {
      const res = await ticketApi.get<{ success?: boolean; open?: number; closed?: number }>("/api/tickets/counts");
      if (res.data?.success && typeof res.data.open === "number" && typeof res.data.closed === "number") {
        setOpenCount(res.data.open);
        setClosedCount(res.data.closed);
      }
    } catch (_) {}
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      const [countsRes, listRes] = await Promise.all([
        ticketApi.get<{ success?: boolean; open?: number; closed?: number }>("/api/tickets/counts"),
        ticketApi.get<{ success: boolean; tickets?: TicketItem[] }>("/api/tickets", { params: { tab } }),
      ]);
      if (countsRes.data?.success && typeof countsRes.data.open === "number" && typeof countsRes.data.closed === "number") {
        setOpenCount(countsRes.data.open);
        setClosedCount(countsRes.data.closed);
      }
      if (listRes.data.success && Array.isArray(listRes.data.tickets)) {
        setTickets(listRes.data.tickets);
      } else {
        setTickets([]);
      }
    } catch (_) {
      setTickets([]);
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
    <SafeAreaView className="flex-1 bg-slate-50">

      {/* HEADER */}
      <View className="flex-row items-center px-6 py-4">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 bg-white rounded-full border border-gray-300 justify-center items-center"
        >
          <Ionicons name="chevron-back" size={22} color="#000" />
        </TouchableOpacity>
        <Text className="ml-4 text-2xl font-semibold">Tickets</Text>
      </View>

      {/* TAB SWITCHER - same layout as Admin */}
      <View className="mx-5 mt-2 bg-[#8e91e2] rounded-full p-1 flex-row">
        <TouchableOpacity
          onPress={() => setTab("open")}
          className={`flex-1 py-3 rounded-full ${tab === "open" ? "bg-white" : "bg-transparent"}`}
        >
          <Text className={`text-center text-base font-bold ${tab === "open" ? "text-[#3B4BFF]" : "text-white"}`}>
            Open ({openCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab("closed")}
          className={`flex-1 py-3 rounded-full ${tab === "closed" ? "bg-white" : "bg-transparent"}`}
        >
          <Text className={`text-center text-base font-bold ${tab === "closed" ? "text-[#3B4BFF]" : "text-white"}`}>
            Resolved ({closedCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* TICKETS LIST */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="mt-5 px-5 mb-28"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTickets(); }} />
        }
      >
        {loading ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#3B4BFF" />
          </View>
        ) : tickets.length === 0 ? (
          <View className="py-12 items-center">
            <Text className="text-gray-500 text-center">No {tab === "open" ? "open" : "resolved"} tickets</Text>
          </View>
        ) : (
          tickets.map((t) => (
            <TicketCard key={t.id} ticket={t} navigation={navigation} />
          ))
        )}
      </ScrollView>

      {/* ✅ FLOATING + BUTTON */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate("CreateRequest")}
        className="absolute bottom-36 right-6 w-16 h-16 rounded-full bg-[#3B4BFF] justify-center items-center"
        style={{
          shadowColor: "#3B4BFF",
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 8,
        }}
      >
        <Ionicons name="add" size={34} color="#fff" />
      </TouchableOpacity>

      {/* BOTTOM NAV */}
      <BottomNav />
    </SafeAreaView>
  );
}
