import React from "react";
import { View, Text } from "react-native";

export interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  sentAt: string;
}

interface AnnouncementCardProps {
  announcement: AnnouncementItem;
  /** When true, card has fixed width for horizontal scroll layout */
  horizontal?: boolean;
}

const CARD_WIDTH_HORIZONTAL = 300;
const PREVIEW_MAX_CHARS = 120;

function truncateText(text: string, maxChars: number): string {
  const s = String(text || "").trim();
  if (s.length <= maxChars) return s;
  return `${s.slice(0, maxChars).trim()}…`;
}

export default function AnnouncementCard({ announcement, horizontal }: AnnouncementCardProps) {
  const sentDate = announcement.sentAt
    ? new Date(announcement.sentAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  const cardContent = (
    <>
      {/* Announcement Pill + Date */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="bg-[#D72626] px-3 py-1 rounded-full">
          <Text className="text-white font-semibold text-[13px]">Announcement</Text>
        </View>
        {sentDate ? (
          <Text className="text-gray-400 text-xs font-medium">{sentDate}</Text>
        ) : null}
      </View>

      {/* Title */}
      <Text className="text-[17px] font-semibold text-black" numberOfLines={2}>
        {announcement.title}
      </Text>

      {/* Description - truncated for preview */}
      <Text className="text-gray-500 text-[14px] mt-2 leading-[20px]" numberOfLines={4}>
        {truncateText(announcement.body, PREVIEW_MAX_CHARS)}
      </Text>
    </>
  );

  if (horizontal) {
    return (
      <View
        className="bg-white rounded-3xl p-5 shadow shadow-black/5 mr-4"
        style={{ width: CARD_WIDTH_HORIZONTAL, minHeight: 140 }}
      >
        {cardContent}
      </View>
    );
  }

  return (
    <View className="bg-white rounded-3xl p-5 mx-4 mt-4 shadow shadow-black/5">
      {cardContent}
    </View>
  );
}
