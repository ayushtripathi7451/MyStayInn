import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";

export type InboxDetailParams = {
  title: string;
  body: string;
  sentAt: string;
  kind: "announcement" | "push";
};

type R = RouteProp<{ InboxDetail: InboxDetailParams }, "InboxDetail">;

export default function InboxDetailScreen() {
  const navigation = useNavigation<any>();
  const { title, body, sentAt } = useRoute<R>().params;

  const dateLabel = (() => {
    const d = new Date(sentAt);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  })();

  return (
    <SafeAreaView className="flex-1 bg-[#F4F6FF]" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-xl bg-gray-100 items-center justify-center mr-3"
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-bold text-black" numberOfLines={2}>
            {title}
          </Text>
          <Text className="text-gray-500 text-xs mt-1">{dateLabel}</Text>
        </View>
      </View>
      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <Text className="text-gray-800 text-base leading-7">{body || "No additional details."}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
