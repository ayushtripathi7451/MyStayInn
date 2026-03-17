import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { TicketItem } from "./TicketsScreen";

const statusLabel: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  closed: "Resolved",
};
const statusBg: Record<string, string> = {
  open: "#DDE5FF",
  in_progress: "#FFF3E0",
  closed: "#DCFCE7",
};
const statusColor: Record<string, string> = {
  open: "#3C4CFF",
  in_progress: "#FB8C00",
  closed: "#16A34A",
};

function formatDate(s: string) {
  try {
    const d = new Date(s);
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

export default function TicketCard({ ticket, navigation }: { ticket: TicketItem; navigation: any }) {
  const status = ticket.status || "open";
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => navigation.navigate("TicketChat", { ticketId: ticket.displayId })}
      className="bg-white rounded-2xl p-5 mb-5 shadow shadow-black/10"
    >
      <View className="flex-row justify-between items-center">
        <View className="px-3 py-1 rounded-full" style={{ backgroundColor: statusBg[status] || statusBg.open }}>
          <Text className="font-semibold text-[12px]" style={{ color: statusColor[status] || statusColor.open }}>
            {statusLabel[status] || status}
          </Text>
        </View>
        <Text className="text-gray-500 font-semibold">#{ticket.displayId}</Text>
      </View>
      <Text className="mt-4 text-[17px] font-semibold text-[#1A1A1A]">{ticket.title}</Text>
      <Text className="text-gray-600 mt-1 leading-5" numberOfLines={2}>
        {ticket.description || ticket.title}
      </Text>
      <View className="flex-row items-center mt-4">
        <Ionicons name="calendar-outline" size={16} color="#6B6B6B" />
        <Text className="ml-2 text-gray-700 text-[14px]">{formatDate(ticket.createdAt)}</Text>
      </View>
      <View className="flex-row items-center mt-5 border-t border-gray-300 pt-4 justify-between">
        <Text className="text-gray-800">
          {ticket.creatorUniqueId || "User"} {ticket.propertyRef ? ` · ${ticket.propertyRef}` : ""}
        </Text>
        <View className="flex-row items-center">
          <Ionicons name="chatbubble-outline" size={16} color="#777" />
          <Text className="ml-1 text-gray-600">{ticket.commentCount ?? 0} Reply</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
