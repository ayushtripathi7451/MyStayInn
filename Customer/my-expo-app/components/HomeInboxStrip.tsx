import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import {
  parseFlexibleDate,
  truncateInboxPreview,
  INBOX_PREVIEW_MAX_CHARS,
  type InboxRow,
} from "../utils/customerInbox";

type Props = {
  items: InboxRow[];
  title: string;
  /** e.g. "text-lg font-bold" or "text-xl font-bold" */
  titleClassName?: string;
  wrapperClassName?: string;
  showNotificationsLink?: boolean;
  navigation: { navigate: (name: string, params?: object) => void };
};

/** Shared horizontal cards for server announcements + local push inbox (Home). */
export default function HomeInboxStrip({
  items,
  title,
  titleClassName = "text-lg font-bold text-slate-800",
  wrapperClassName = "mt-1 mb-1",
  showNotificationsLink,
  navigation,
}: Props) {
  if (items.length === 0) return null;

  return (
    <View className={wrapperClassName}>
      <View className="flex-row items-center justify-between px-4 mb-2">
        <Text className={titleClassName}>{title}</Text>
        {showNotificationsLink ? (
          <TouchableOpacity onPress={() => navigation.navigate("Notifications")}>
            <Text className="text-sm font-semibold text-indigo-600">Notifications</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingRight: 24 }}
      >
        {items.map((a) => {
          const t = parseFlexibleDate(a.sentAt);
          const timeStr = Number.isNaN(t)
            ? "—"
            : new Date(t).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              });
          return (
            <TouchableOpacity
              key={a.id}
              activeOpacity={0.9}
              onPress={() =>
                navigation.navigate("InboxDetail", {
                  title: a.title,
                  body: a.body,
                  sentAt: a.sentAt,
                  kind: a.kind,
                })
              }
              className="bg-white rounded-2xl p-4 mr-3 border border-gray-100 shadow-sm"
              style={{ width: 276 }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <View
                  className={`px-2 py-0.5 rounded-full ${a.kind === "push" ? "bg-[#D72626]" : "bg-[#D72626]"}`}
                >
                  <Text className="text-white text-xs font-semibold">Announcement</Text>
                </View>
                <Text className="text-xs text-gray-400">{timeStr}</Text>
              </View>
              <Text className="text-[15px] font-semibold text-gray-900 mb-1" numberOfLines={2}>
                {a.title}
              </Text>
              <Text className="text-gray-600 text-[13px] leading-5" numberOfLines={3}>
                {truncateInboxPreview(a.body, INBOX_PREVIEW_MAX_CHARS)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
