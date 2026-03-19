import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ticketApi } from "../utils/api";

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  closed: "Closed",
};
const statusColor: Record<string, { bg: string; text: string }> = {
  open: { bg: "#DDE3FF", text: "#3B4BFF" },
  in_progress: { bg: "#FFF3E0", text: "#FB8C00" },
  closed: { bg: "#DCFCE7", text: "#16A34A" },
};

function formatDate(s: string) {
  try {
    return new Date(s).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

export default function UserTicketChat({ navigation, route }: any) {
  const ticketId = route?.params?.ticketId;
  const [ticket, setTicket] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchTicket = useCallback(async () => {
    if (!ticketId) return;
    try {
      const res = await ticketApi.get<{ 
        success: boolean; 
        ticket?: any; 
        comments?: any[]; 
        currentUserUniqueId?: string;
        currentUserRole?: string;
      }>(`/api/tickets/${ticketId}`);
      if (res.data.success) {
        setTicket(res.data.ticket);
        setComments(res.data.comments || []);
      }
    } catch (_) {
      setTicket(null);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
    
    // Get current user ID from AsyncStorage
    const getCurrentUserId = async () => {
      try {
        const userData = await AsyncStorage.getItem("userData");
        if (userData) {
          const user = JSON.parse(userData);
          // Use uniqueId as that's what's stored in authorId in the backend
          const userId = user.uniqueId || user.id;
          console.log("Current User ID:", userId);
          setCurrentUserId(userId);
        }
      } catch (error) {
        console.error("Error fetching user ID:", error);
      }
    };
    getCurrentUserId();
  }, [fetchTicket]);

  const handleAddComment = async () => {
    const body = commentText.trim();
    if (!body || !ticketId || ticket?.status === "closed") return;
    setSendingComment(true);
    try {
      const res = await ticketApi.post(`/api/tickets/${ticketId}/comments`, { body });
      if (res.data.success && res.data.comment) {
        setComments((c) => [...c, res.data.comment]);
        setCommentText("");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to add comment");
    } finally {
      setSendingComment(false);
    }
  };

  if (loading || !ticket) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        {loading ? <ActivityIndicator size="large" color="#4361FF" /> : <Text className="text-gray-500">Ticket not found</Text>}
      </SafeAreaView>
    );
  }

  const status = ticket.status || "open";
  const isClosed = status === "closed";

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header with back button and status */}
      <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-100 shadow-sm">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            className="w-10 h-10 bg-white rounded-full border border-gray-300 justify-center items-center active:bg-gray-100"
          >
            <Ionicons name="chevron-back" size={22} color="#000" />
          </TouchableOpacity>
          <Text className="ml-3 text-2xl font-semibold text-gray-900">{ticket.displayId}</Text>
        </View>
        <View className="relative">
          <View
            className="flex-row items-center justify-center px-4 py-2 rounded-full shadow-sm"
            style={{ backgroundColor: statusColor[status]?.bg || statusColor.open.bg, minWidth: 130 }}
          >
            <Text className="font-semibold text-[16px]" style={{ color: statusColor[status]?.text || statusColor.open.text }}>
              {STATUS_LABEL[status] || status}
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : undefined} 
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          className="px-4 flex-1" 
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {/* Ticket Details Card */}
          <View className="bg-gray-50 rounded-2xl p-5 my-4 border border-gray-100">
            <Text className="text-[18px] font-semibold text-gray-900">{ticket.title}</Text>
            <Text className="text-gray-600 mt-2 leading-5">{ticket.description || "No description provided"}</Text>
            <View className="flex-row mt-3">
              <View className="bg-gray-200 rounded-full px-3 py-1 mr-2">
                <Text className="text-gray-700 text-xs font-medium">{ticket.category}</Text>
              </View>
              {ticket.propertyRef && (
                <View className="bg-gray-200 rounded-full px-3 py-1">
                  <Text className="text-gray-700 text-xs font-medium">{ticket.propertyRef}</Text>
                </View>
              )}
            </View>
            <Text className="text-gray-400 text-xs mt-3">{formatDate(ticket.createdAt)}</Text>
          </View>

          {/* Comments Section */}
          <Text className="mt-4 mb-3 text-[18px] font-semibold text-gray-900">Comments</Text>
          
          {comments.length === 0 ? (
            <View className="items-center justify-center py-8">
              <Ionicons name="chatbubble-outline" size={40} color="#CBD5E1" />
              <Text className="text-gray-400 mt-2">No comments yet</Text>
            </View>
          ) : (
            comments.map((c) => {
              // Messages from current user appear on right, others on left
              const isMyMessage = currentUserId && c.authorId === currentUserId;
              console.log("Comment:", { authorId: c.authorId, currentUserId, isMyMessage });
              
              return (
                <View key={c.id} className={`mb-4 ${isMyMessage ? "items-end" : "items-start"}`}>
                  <View className="flex-row items-end max-w-[85%]">
                    {!isMyMessage && (
                      <View className="w-8 h-8 rounded-full bg-gray-300 items-center justify-center mr-2">
                        <Text className="text-gray-700 font-medium text-xs">
                          {c.authorUniqueId?.substring(0, 2).toUpperCase() || "U"}
                        </Text>
                      </View>
                    )}
                    
                    <View 
                      className={`rounded-2xl py-3 px-4 ${
                        isMyMessage 
                          ? "bg-[#4361FF] rounded-tr-sm" 
                          : "bg-gray-100 rounded-tl-sm"
                      }`}
                      style={{
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                        elevation: 2,
                      }}
                    >
                      <Text className={isMyMessage ? "text-white text-[15px]" : "text-gray-800 text-[15px]"}>
                        {c.body}
                      </Text>
                      <View className={`flex-row items-center mt-1 ${isMyMessage ? "justify-end" : "justify-start"}`}>
                        <Text className={`text-[10px] ${isMyMessage ? "text-blue-200" : "text-gray-400"}`}>
                          {isMyMessage ? "You" : c.authorUniqueId || "User"} · {formatDate(c.createdAt)}
                        </Text>
                      </View>
                    </View>

                    {isMyMessage && (
                      <View className="w-8 h-8 rounded-full bg-[#1E33FF] items-center justify-center ml-2">
                        <Text className="text-white font-medium text-xs">AD</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}

          {/* Comment Input Area - Increased height */}
          <View className="mt-5 mb-6 bg-white rounded-xl border border-gray-200 shadow-sm">
            <TextInput
              placeholder={isClosed ? "This ticket is closed" : "Write your message..."}
              placeholderTextColor="#9CA3AF"
              editable={!isClosed}
              className="px-4 pt-4 pb-2 text-gray-900"
              style={{ 
                minHeight: 120, 
                maxHeight: 200,
                textAlignVertical: "top",
                fontSize: 16,
              }}
              multiline
              numberOfLines={5}
              value={commentText}
              onChangeText={setCommentText}
            />
            
            <View className="flex-row items-center justify-between px-3 py-2 border-t border-gray-100">
              <Text className="text-xs text-gray-400">
                {commentText.length}/500
              </Text>
              <TouchableOpacity
                disabled={isClosed || sendingComment || !commentText.trim()}
                onPress={handleAddComment}
                className={`px-6 py-2 rounded-full flex-row items-center ${
                  isClosed || sendingComment || !commentText.trim() 
                    ? "bg-gray-300" 
                    : "bg-[#4361FF] active:bg-[#3251E0]"
                }`}
              >
                <Text className="text-white font-semibold mr-1">
                  {sendingComment ? "Sending" : "Send"}
                </Text>
                {sendingComment ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}