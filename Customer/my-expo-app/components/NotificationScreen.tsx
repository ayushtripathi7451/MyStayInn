import React, { useState, useMemo, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import BottomNav from "./BottomNav";
import {
  fetchAnnouncementRows,
  getCustomerPushRows,
  mergeInboxRows,
  hasDisplayablePushContent,
  truncateInboxPreview,
  INBOX_PREVIEW_MAX_CHARS,
  type InboxRow,
} from "../utils/customerInbox";

type ListItem = InboxRow & {
  timeLabel: string;
};

export default function NotificationScreen() {
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<"recent" | "past">("recent");
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const [ann, push] = await Promise.all([fetchAnnouncementRows(), getCustomerPushRows()]);
      const merged = mergeInboxRows(ann, push);
      
      const filtered = merged.filter((r) => {
        if (r.kind === "push") {
          return hasDisplayablePushContent(r.title, r.body);
        }
        const hasTitle = String(r.title || "").trim().length > 0;
        const hasBody = String(r.body || "").trim().length > 0;
        return hasTitle || hasBody;
      });
      
      const mapped: ListItem[] = filtered.map((r) => {
        const date = new Date(r.sentAt);
        const timeLabel = Number.isNaN(date.getTime())
          ? "—"
          : date.toLocaleString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
        return { ...r, timeLabel };
      });
      setItems(mapped);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const recentNotifications = useMemo(
    () =>
      items.filter((n) => {
        const t = new Date(n.sentAt).getTime();
        // For push notifications, show in Recent if within 7 days
        if (n.kind === "push") {
          return !Number.isNaN(t) && t >= sevenDaysAgo;
        }
        // For announcements, always show in Recent (they're already customer-specific from backend)
        return true;
      }),
    [items, sevenDaysAgo]
  );
  const pastNotifications = useMemo(
    () =>
      items.filter((n) => {
        const t = new Date(n.sentAt).getTime();
        // Only push notifications go to Past History (after 7 days)
        if (n.kind === "push") {
          return Number.isNaN(t) || t < sevenDaysAgo;
        }
        // Announcements never go to Past History
        return false;
      }),
    [items, sevenDaysAgo]
  );

  const activeList = tab === "recent" ? recentNotifications : pastNotifications;

  const openDetail = (n: ListItem) => {
    navigation.navigate("InboxDetail", {
      title: n.title,
      body: n.body,
      sentAt: n.sentAt,
      kind: n.kind,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F4F6FF]">
      <View className="bg-white rounded-b-3xl shadow-sm pt-10 pb-6 -mt-10">
        <View className="flex-row items-center justify-between px-6 pt-4">
          <Text className="text-[28px] font-bold text-black">Notifications</Text>

          <TouchableOpacity
            onPress={() => navigation.navigate("Settings")}
            className="w-10 h-10 bg-white border border-gray-200 rounded-xl justify-center items-center"
          >
            <Ionicons name="settings-outline" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        <View className="flex-row bg-[#EFF1F5] mx-6 rounded-full p-1 mt-4">
          <TouchableOpacity
            onPress={() => setTab("recent")}
            className={`flex-1 py-2 rounded-full ${tab === "recent" ? "bg-white shadow" : ""}`}
          >
            <Text
              className={`text-center font-semibold ${
                tab === "recent" ? "text-indigo-600" : "text-gray-500"
              }`}
            >
              Recent
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTab("past")}
            className={`flex-1 py-2 rounded-full ${tab === "past" ? "bg-white shadow" : ""}`}
          >
            <Text
              className={`text-center font-semibold ${
                tab === "past" ? "text-indigo-600" : "text-gray-500"
              }`}
            >
              Past History
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        key={tab}
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
        ) : (
          activeList.map((n) => (
            <TouchableOpacity
              key={n.id}
              activeOpacity={0.85}
              onPress={() => openDetail(n)}
              className="flex-row justify-between items-center bg-white px-4 py-4 rounded-2xl mb-3 border border-gray-100 shadow-sm"
            >
              <View className="flex-1 pr-3">
                <Text className="text-[16px] font-semibold text-gray-800">{n.title}</Text>
                {!!n.body && (
                  <Text className="text-gray-600 text-[13px] mt-1" numberOfLines={3}>
                    {truncateInboxPreview(n.body, INBOX_PREVIEW_MAX_CHARS)}
                  </Text>
                )}
                <Text className="text-gray-400 text-[12px] mt-1">{n.timeLabel}</Text>
              </View>

              <View className="w-9 h-9 rounded-full bg-gray-100 justify-center items-center">
                <Ionicons name="notifications-outline" size={20} color="#3b82f6" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}
