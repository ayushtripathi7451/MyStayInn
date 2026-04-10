import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ActivityIndicator, AppState, TouchableOpacity } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  fetchAnnouncementRows,
  getCustomerPushRows,
  mergeInboxRows,
  type InboxRow,
} from "../utils/customerInbox";
import HomeInboxStrip from "./HomeInboxStrip";

/**
 * Full inbox on Home (server announcements + local push), same merge as Notifications — not limited to 24h.
 * "Last 24 hours" above shows the recent window; this section shows everything.
 */
export default function AnnouncementsSection() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<InboxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const [ann, push] = await Promise.all([fetchAnnouncementRows(), getCustomerPushRows()]);
      setItems(mergeInboxRows(ann, push));
    } catch (err: any) {
      setItems([]);
      const status = err?.response?.status;
      setError(status === 401 ? "Session invalid. Try logging in again." : "Couldn't load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load])
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void load(false);
    });
    return () => sub.remove();
  }, [load]);

  if (loading) {
    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color="#D72626" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="mt-6 mb-6 px-4">
        <View className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
          <Text className="text-amber-800 text-center">{error}</Text>
          <TouchableOpacity
            onPress={() => void load(true)}
            className="mt-3 py-2 bg-amber-200 rounded-xl"
          >
            <Text className="text-amber-900 font-semibold text-center">Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <HomeInboxStrip
      items={items}
      title="Announcements"
      titleClassName="text-xl font-bold text-slate-800"
      wrapperClassName="mt-6 mb-6"
      navigation={navigation}
    />
  );
}
