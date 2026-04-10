import React, { useState, useCallback, useEffect } from "react";
import { View, ActivityIndicator, AppState } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  fetchAnnouncementRows,
  getCustomerPushRows,
  mergeInboxRows,
  isWithinLastHours,
  type InboxRow,
} from "../utils/customerInbox";
import HomeInboxStrip from "./HomeInboxStrip";

/** Last 24 hours: server announcements + local push inbox (same mix as Notifications, time-windowed). */
export default function HomeRecentAnnouncements() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<InboxRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (spinner: boolean) => {
    if (spinner) setLoading(true);
    try {
      const [ann, push] = await Promise.all([fetchAnnouncementRows(), getCustomerPushRows()]);
      const merged = mergeInboxRows(ann, push);
      const recent = merged.filter((row) => isWithinLastHours(row.sentAt, 24));
      setItems(recent);
    } finally {
      setLoading(false);
    }
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

  return (
    <HomeInboxStrip
      items={items}
      title="Last 24 hours"
      showNotificationsLink
      navigation={navigation}
    />
  );
}
