import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ActivityIndicator, ScrollView, AppState, TouchableOpacity } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { userApi } from "../utils/api";
import AnnouncementCard, { type AnnouncementItem } from "./AnnouncementCard";

/**
 * Fetches and shows announcements for the logged-in user.
 * Shown regardless of push notification permission — announcements are always visible in-app.
 * Rendered at the bottom of the Home screen in a horizontal scroll strip.
 */
export default function AnnouncementsSection() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnnouncements = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const res = await userApi.get<{ success: boolean; announcements?: AnnouncementItem[] }>(
        "/api/users/me/announcements"
      );
      if (res.data.success && Array.isArray(res.data.announcements)) {
        const seen = new Set<string>();
        const list = res.data.announcements.filter((a: AnnouncementItem) => {
          if (seen.has(a.id)) return false;
          seen.add(a.id);
          return true;
        });
        setAnnouncements(list);
      } else {
        setAnnouncements([]);
      }
    } catch (err: any) {
      setAnnouncements([]);
      const status = err?.response?.status;
      setError(status === 401 ? "Session invalid. Try logging in again." : "Couldn't load announcements.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements(true);
  }, [fetchAnnouncements]);

  useFocusEffect(
    useCallback(() => {
      fetchAnnouncements(false);
    }, [fetchAnnouncements])
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") fetchAnnouncements(false);
    });
    return () => sub.remove();
  }, [fetchAnnouncements]);

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
            onPress={() => fetchAnnouncements(true)}
            className="mt-3 py-2 bg-amber-200 rounded-xl"
          >
            <Text className="text-amber-900 font-semibold text-center">Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (announcements.length === 0) {
    return null;
  }

  return (
    <View className="mt-6 mb-6">
      <View className="px-4 mb-3">
        <Text className="text-xl font-bold text-slate-800">Announcements</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingRight: 20 }}
      >
        {announcements.map((a, i) => (
          <TouchableOpacity
            key={`${a.id}-${i}`}
            activeOpacity={0.9}
            onPress={() =>
              navigation.navigate("InboxDetail", {
                title: a.title,
                body: a.body,
                sentAt: a.sentAt || new Date().toISOString(),
                kind: "announcement",
              })
            }
          >
            <AnnouncementCard announcement={a} horizontal />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
