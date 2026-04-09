import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

type DayMenu = Record<
  string,
  { enabled?: boolean; menu?: string; startTime?: string; endTime?: string }
>;

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const sections = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "snack", label: "Snack" },
  { key: "dinner", label: "Dinner" },
];

function fmt(t?: string): string {
  if (!t) return "";
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export default function PropertyFoodMenuViewScreen({ navigation, route }: any) {
  const propertyName = route?.params?.propertyName || "Property";
  const days = (route?.params?.foodMenuDays || {}) as Record<string, DayMenu>;

  const hasAnyMenu = Object.keys(days).some((d) =>
    sections.some((s) => days[d]?.[s.key]?.enabled && String(days[d]?.[s.key]?.menu || "").trim())
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 pt-2 pb-3 border-b border-gray-200">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 p-1">
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View>
            <Text className="text-lg font-semibold text-gray-900">Food Menu</Text>
            <Text className="text-xs text-gray-500">{propertyName}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
        {!hasAnyMenu ? (
          <View className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <Text className="text-gray-500">No food menu provided by owner.</Text>
          </View>
        ) : (
          <View className="gap-4">
            {dayNames.map((dayName, dayIndex) => {
              const d = days[String(dayIndex)];
              if (!d) return null;
              const daySections = sections.filter(
                (s) => d[s.key]?.enabled && String(d[s.key]?.menu || "").trim()
              );
              if (daySections.length === 0) return null;
              return (
                <View key={dayName} className="bg-white border border-gray-200 rounded-xl p-4">
                  <Text className="font-semibold text-gray-900 mb-3">{dayName}</Text>
                  {daySections.map((s) => {
                    const sec = d[s.key];
                    const time =
                      fmt(sec?.startTime) && fmt(sec?.endTime)
                        ? `${fmt(sec?.startTime)} - ${fmt(sec?.endTime)}`
                        : "";
                    return (
                      <View key={s.key} className="mb-3">
                        <Text className="text-gray-600 text-xs font-semibold mb-1">
                          {s.label}{time ? ` (${time})` : ""}
                        </Text>
                        <View className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                          <Text className="text-gray-800 text-sm">{sec?.menu || "—"}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
