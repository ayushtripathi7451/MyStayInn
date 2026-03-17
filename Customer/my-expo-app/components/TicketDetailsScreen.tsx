import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext"; // ✅ THEME

export default function TicketDetailsScreen() {
  const [comment, setComment] = useState("");
  const { theme } = useTheme(); // ✅ GLOBAL THEME

  // ✅ THEME COLORS
  const primary = theme === "female" ? "#EC4899" : "#4D6BFE"; // pink / blue
  const softPrimary = theme === "female" ? "#FBCFE8" : "#C7D0FF";
  const timeline = theme === "female" ? "bg-pink-500" : "bg-[#4D6BFE]";
  const profileBg = theme === "female" ? "bg-pink-50" : "bg-blue-50";
  const profileIcon = theme === "female" ? "#EC4899" : "#4D6BFE";

  const submitComment = () => {
    if (!comment.trim()) return;
    setComment("");
  };

  return (
    <View className="px-4 mt-4 mb-6">

      {/* ✅ MAIN CARD */}
      <View className="bg-white rounded-3xl p-5 border border-[#E4E8F0]">

        {/* ✅ HEADER */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-2xl font-semibold text-black">TICKET-001</Text>

          <TouchableOpacity
            className={`w-10 h-10 rounded-full items-center justify-center ${profileBg}`}
          >
            <Ionicons name="person-outline" size={22} color={profileIcon} />
          </TouchableOpacity>
        </View>

        {/* ✅ STATUS + MESSAGES */}
        <View className="flex-row">

          {/* ✅ LEFT TIMELINE */}
          <View className="mr-4">
            <Text className="text-gray-500 mb-1">Open</Text>
            <View className={`w-[2px] h-10 ${timeline} ml-[8px] mb-4`} />

            <Text className="text-gray-500 mb-1">In Progress</Text>
            <View className={`w-[2px] h-10 ${timeline} ml-[8px] mb-4`} />

            <Text className="text-gray-500">Closed</Text>
          </View>

          {/* ✅ RIGHT CHAT BUBBLES */}
          <View className="flex-1">

            {/* Incoming bubble */}
            <View className="bg-[#F4F7FF] px-4 py-3 rounded-xl w-[90%] mb-1">
              <Text className="text-gray-700">We are looking into your issue.</Text>
            </View>
            <Text className="text-gray-400 text-xs mb-4">Apr 21, 2025</Text>

            {/* Outgoing bubble */}
            <View className="bg-[#E7ECFF] px-4 py-3 rounded-xl self-end w-[90%] mb-1">
              <Text className="text-gray-700">Thank you for the update</Text>
            </View>
            <Text className="text-gray-400 text-xs text-right mb-4">Apr 21, 2025</Text>

            {/* Grey bubble */}
            <View className="bg-[#EEEEEE] px-4 py-3 rounded-xl w-[90%] mb-1">
              <Text className="text-gray-700">The issue has been resolved</Text>
            </View>
            <Text className="text-gray-400 text-xs mb-2">Apr 23, 2025</Text>

          </View>
        </View>
      </View>

      {/* ✅ COMMENT BOX */}
      <Text className="text-gray-600 mt-4 mb-1">Comment</Text>

      <TextInput
        placeholder="Enter your comment"
        multiline
        value={comment}
        onChangeText={setComment}
        className="bg-white border border-[#E4E8F0] rounded-2xl px-4 py-3 h-28 text-gray-700"
        textAlignVertical="top"
      />

      {/* ✅ SUBMIT BUTTON (THEME AWARE) */}
      <TouchableOpacity
        onPress={submitComment}
        disabled={!comment.trim()}
        className="mt-5 py-4 rounded-2xl"
        style={{
          backgroundColor: comment.trim() ? primary : softPrimary,
        }}
      >
        <Text className="text-center text-white font-semibold text-lg">
          Submit
        </Text>
      </TouchableOpacity>

    </View>
  );
}
