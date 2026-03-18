import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  AppState,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  fetchAnnouncementRows,
  isWithinLastHours,
  truncateInboxPreview,
  INBOX_PREVIEW_MAX_CHARS,
  type InboxRow,
} from "../utils/customerInbox";

/** Last 24 hours of announcements — above “My Current Stay” */
export default function HomeRecentAnnouncements() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<InboxRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (spinner: boolean) => {
    if (spinner) setLoading(true);
    const all = await fetchAnnouncementRows();
    setItems(all.filter((a) => isWithinLastHours(a.sentAt, 24)));
    if (spinner) setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => void load(true), [load]));

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void load(false);
    });
    return () => sub.remove();
  }, [load]);

  if (loading) {
    return (
      <View className="px-4 py-2 items-center">
        <ActivityIndicator size="small" color="#D72626" />
      </View>
    );
  }
  if (items.length === 0) return null;

  return (
    <View className="mt-1 mb-1">
      <View className="flex-row items-center justify-between px-4 mb-2">
        <Text className="text-lg font-bold text-slate-800">Last 24 hours</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Notifications")}>
          <Text className="text-sm font-semibold text-purple-600">Notifications</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingRight: 24 }}
      >
        {items.map((a) => (
          <TouchableOpacity
            key={a.id}
            activeOpacity={0.9}
            onPress={() =>
              navigation.navigate("InboxDetail", {
                title: a.title,
                body: a.body,
                sentAt: a.sentAt,
                kind: "announcement",
              })
            }
            className="bg-white rounded-2xl p-4 mr-3 border border-gray-100 shadow-sm"
            style={{ width: 276 }}
          >
            <View className="flex-row items-center justify-between mb-2">
              <View className="bg-[#D72626] px-2 py-0.5 rounded-full">
                <Text className="text-white text-xs font-semibold">New</Text>
              </View>
              <Text className="text-xs text-gray-400">
                {new Date(a.sentAt).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
            <Text className="text-[15px] font-semibold text-gray-900 mb-1" numberOfLines={2}>
              {a.title}
            </Text>
            <Text className="text-gray-600 text-[13px] leading-5" numberOfLines={3}>
              {truncateInboxPreview(a.body, INBOX_PREVIEW_MAX_CHARS)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
