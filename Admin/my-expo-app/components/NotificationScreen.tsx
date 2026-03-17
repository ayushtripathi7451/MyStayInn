import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import BottomNav from "./BottomNav";
import { userApi } from "../utils/api";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  sentAt: string;
  timeLabel: string;
  icon: any;
  color: string;
};

export default function NotificationScreen({ navigation }: any) {
  const [tab, setTab] = useState<"recent" | "past">("recent");
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const loadNotifications = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await userApi.get<{ success: boolean; announcements?: { id?: string; title?: string; body?: string; sentAt?: string }[] }>(
        "/api/users/me/announcements"
      );
      const list = res.data?.success && Array.isArray(res.data.announcements) ? res.data.announcements : [];
      const mapped = list.map((a, idx) => {
        const sentAt = a.sentAt || new Date().toISOString();
        const d = new Date(sentAt);
        return {
          id: a.id || `notif-${idx}`,
          title: a.title || "Notification",
          body: a.body || "",
          sentAt,
          timeLabel: Number.isNaN(d.getTime())
            ? "—"
            : d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
          icon: "notifications-outline",
          color: "#2ecc71",
        };
      });
      mapped.sort((a, b) => (b.sentAt > a.sentAt ? 1 : b.sentAt < a.sentAt ? -1 : 0));
      setNotifications(mapped);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentNotifications = useMemo(
    () =>
      notifications.filter((n) => {
        const t = new Date(n.sentAt).getTime();
        return !Number.isNaN(t) && t >= sevenDaysAgo;
      }),
    [notifications, sevenDaysAgo]
  );
  const pastNotifications = useMemo(
    () =>
      notifications.filter((n) => {
        const t = new Date(n.sentAt).getTime();
        return Number.isNaN(t) || t < sevenDaysAgo;
      }),
    [notifications, sevenDaysAgo]
  );

  const activeList = tab === "recent" ? recentNotifications : pastNotifications;

  return (
    <SafeAreaView className="flex-1 bg-[#F4F6FF]">
      
      <View className="bg-white rounded-b-3xl shadow-sm pt-10 pb-6 -mt-10">

        {/* HEADER */}
        <View className="flex-row items-center justify-between px-6 pt-4">
          <Text className="text-[28px] font-bold text-black">Notifications</Text>

          <TouchableOpacity onPress={()=> navigation.navigate("Settings")} className="w-10 h-10 bg-white border border-gray-200 rounded-xl justify-center items-center">
             <Ionicons name="menu" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        {/* TAB SWITCH */}
        <View className="flex-row bg-[#EFF1F5] mx-6 rounded-full p-1 mt-4">
          
          {/* RECENT TAB */}
          <TouchableOpacity
            onPress={() => setTab("recent")}
            className={`flex-1 py-2 rounded-full ${
              tab === "recent" ? "bg-white shadow" : ""
            }`}
          >
            <Text
              className={`text-center font-semibold ${
                tab === "recent" ? "text-purple-600" : "text-gray-500"
              }`}
            >
              Recent
            </Text>
          </TouchableOpacity>

          {/* PAST TAB */}
          <TouchableOpacity
            onPress={() => setTab("past")}
            className={`flex-1 py-2 rounded-full ${
              tab === "past" ? "bg-white shadow" : ""
            }`}
          >
            <Text
              className={`text-center font-semibold ${
                tab === "past" ? "text-purple-600" : "text-gray-500"
              }`}
            >
              Past History
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ---------- NOTIFICATION LIST ---------- */}
      <ScrollView
        className="mt-6 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {loading ? (
          <View className="mt-20 items-center">
            <ActivityIndicator size="small" color="#6366F1" />
            <Text className="text-gray-400 mt-2">Loading notifications...</Text>
          </View>
        ) : activeList.length === 0 ? (
          <View className="mt-20 items-center">
            <Ionicons name="notifications-off-outline" size={40} color="#9CA3AF" />
            <Text className="text-gray-400 mt-2">No notifications found</Text>
          </View>
        ) : activeList.map((n) => (
          <View
            key={n.id}
            className="flex-row justify-between items-center bg-white px-4 py-4 rounded-2xl mb-3 border border-gray-100 shadow-sm"
          >
            <View>
              <Text className="text-[16px] font-semibold text-gray-800">
                {n.title}
              </Text>
              {!!n.body && (
                <Text className="text-gray-600 text-[13px] mt-1">{n.body}</Text>
              )}
              <Text className="text-gray-400 text-[12px] mt-1">{n.timeLabel}</Text>
            </View>

            {/* ICON */}
            <View className="w-9 h-9 rounded-full bg-gray-100 justify-center items-center">
              <Ionicons name={n.icon as any} size={20} color={n.color} />
            </View>
          </View>
        ))}
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}
