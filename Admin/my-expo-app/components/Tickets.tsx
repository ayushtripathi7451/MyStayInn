import React from "react";
import { View, Text } from "react-native";

const tickets = [
  { id: "TICKET-001", date: "20 April 2025", status: "Open", color: "#C8FACC", text: "#0A8A2A" },
  { id: "TICKET-002", date: "21 April 2025", status: "In Progress", color: "#E5E3FF", text: "#6C5CE7" },
  { id: "TICKET-003", date: "23 April 2025", status: "Closed", color: "#FAD7D7", text: "#C0392B" },
];

export default function Tickets() {
  return (
    <View className="  mb-6 pr-8 ">
      {/* Header */}
      

      {/* Tickets Container */}
      <View className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {tickets.map((t, i) => (
          <View
            key={t.id}
            className={`px-4 py-4 ${
              i < tickets.length - 1 ? "border-b border-gray-100" : ""
            }`}
          >
            {/* Top Row */}
            <View className="flex-row justify-between items-center">
              <Text className="font-bold text-[15px] text-gray-600 pr-6">{t.id}</Text>
              <Text
                style={{
                  backgroundColor: t.color,
                  color: t.text,
                }}
                className="px-3 py-[3px] text-xs  rounded-full font-semibold"
              >
                {t.status}
              </Text>
            </View>

            {/* Date */}
            <Text className="text-gray-400 text-[16px] mt-1">{t.date}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
