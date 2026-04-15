import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ticketApi } from "../utils/api";

const STATUS_OPTIONS = ["open", "in_progress", "closed"] as const;
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
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [ticketBanner, setTicketBanner] = useState<string | null>(null);
  const [closeConfirmVisible, setCloseConfirmVisible] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

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

  // Scroll to bottom when new comments are added
  useEffect(() => {
    if (comments.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [comments]);

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket || ticket.status === newStatus) {
      setOpenDropdown(false);
      return;
    }
    if (newStatus === "closed") {
      setOpenDropdown(false);
      setCloseConfirmVisible(true);
    } else {
      doUpdateStatus(newStatus);
    }
  };

  const doUpdateStatus = async (status: string) => {
    setOpenDropdown(false);
    if (!ticketId) return;
    setUpdatingStatus(true);
    try {
      const res = await ticketApi.patch(`/api/tickets/${ticketId}`, { status });
      if (res.data.success && res.data.ticket) setTicket(res.data.ticket);
    } catch (e: any) {
      setTicketBanner(e?.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddComment = async () => {
    const body = commentText.trim();
    if (!body || !ticketId || ticket?.status === "closed") return;
    setSendingComment(true);
    try {
      const res = await ticketApi.post(`/api/tickets/${ticketId}/comments`, { body });
      if (res.data.success && res.data.comment) {
        setComments((c) => [...c, res.data.comment]);
        setCommentText("");
        // Scroll to bottom after adding comment
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (e: any) {
      setTicketBanner(e?.response?.data?.message || "Failed to add comment");
    } finally {
      setSendingComment(false);
    }
  };

  // Dismiss keyboard when tapping outside
  const dismissKeyboard = () => {
    Keyboard.dismiss();
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
      {ticketBanner ? (
        <View className="mx-5 mt-2 bg-rose-50 border border-rose-200 rounded-xl p-3">
          <Text className="text-rose-800 text-sm">{ticketBanner}</Text>
        </View>
      ) : null}

      {/* Header with back button and status */}
      <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-100 shadow-sm" style={{ zIndex: 100 }}>
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            className="w-10 h-10 bg-white rounded-full border border-gray-300 justify-center items-center active:bg-gray-100"
          >
            <Ionicons name="chevron-back" size={22} color="#000" />
          </TouchableOpacity>
          <Text className="ml-3 text-2xl font-semibold text-gray-900">{ticket.displayId}</Text>
        </View>
        {/* Status dropdown - admin can change status */}
        <View style={{ position: "relative", zIndex: 100 }}>
          <TouchableOpacity
            onPress={() => !isClosed && setOpenDropdown((p) => !p)}
            className="flex-row items-center justify-center px-4 py-2 rounded-full shadow-sm"
            style={{ backgroundColor: statusColor[status]?.bg || statusColor.open.bg, minWidth: 130 }}
          >
            <Text className="font-semibold text-[16px]" style={{ color: statusColor[status]?.text || statusColor.open.text }}>
              {STATUS_LABEL[status] || status}
            </Text>
            {!isClosed && (
              <Ionicons 
                name={openDropdown ? "chevron-up" : "chevron-down"} 
                size={16} 
                color={statusColor[status]?.text} 
                style={{ marginLeft: 6 }} 
              />
            )}
          </TouchableOpacity>
          
          {openDropdown && (
            <View
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: 8,
                backgroundColor: "#fff",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 8,
                elevation: 20,
                zIndex: 999,
                minWidth: 140,
              }}
            >
              {STATUS_OPTIONS.map((s) => (
                <TouchableOpacity 
                  key={s} 
                  onPress={() => handleStatusChange(s)} 
                  className="px-4 py-3 active:bg-gray-50"
                  disabled={updatingStatus}
                >
                  <Text className="font-medium" style={{ color: statusColor[s]?.text }}>
                    {STATUS_LABEL[s]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        style={{ zIndex: 1 }}
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <View className="flex-1">
            <ScrollView 
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false} 
              className="px-4 flex-1" 
              keyboardDismissMode="interactive"
              contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
              onContentSizeChange={() => {
                // Scroll to bottom when content size changes (like when keyboard opens)
                if (comments.length > 0) {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }
              }}
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
                  // For admin app: admin messages go right, customer messages go left
                  // Use authorRole as the primary indicator
                  const isMyMessage = c.authorRole === "admin";
                  
                  // Debug logging
                  console.log("Admin TicketChat - Comment:", {
                    commentId: c.id,
                    authorId: c.authorId,
                    authorUniqueId: c.authorUniqueId,
                    authorRole: c.authorRole,
                    currentUserId,
                    isMyMessage
                  });
                  
                  // Determine label based on role
                  const authorLabel = isMyMessage 
                    ? "You" 
                    : c.authorRole === "customer"  
                      ? "Customer"
                      : c.authorRole === "support"
                        ? "Support"
                        : (c.authorUniqueId || "User");
                  
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
                              {authorLabel} · {formatDate(c.createdAt)}
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
              {/* Add a small spacer at the bottom for better scrolling */}
              <View style={{ height: 10 }} />
            </ScrollView>

            {/* Comment Input Area - Fixed at bottom */}
            <View className="bg-white border-t border-gray-200 px-4 pb-2 pt-2">
              <View className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <TextInput
                  ref={inputRef}
                  placeholder={isClosed ? "This ticket is closed" : "Write your message..."}
                  placeholderTextColor="#9CA3AF"
                  editable={!isClosed}
                  className="px-4 pt-4 pb-2 text-gray-900"
                  style={{ 
                    minHeight: 100, 
                    maxHeight: 150,
                    textAlignVertical: "top",
                    fontSize: 16,
                  }}
                  multiline
                  numberOfLines={4}
                  value={commentText}
                  onChangeText={setCommentText}
                  onFocus={() => {
                    // Scroll to bottom when input gets focus
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 300);
                  }}
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
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <Modal visible={closeConfirmVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white rounded-2xl p-6">
            <Text className="text-lg font-black text-slate-900 mb-2">Close ticket?</Text>
            <Text className="text-slate-600 text-[15px] mb-6">
              You will not be able to add new comments after closing.
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-slate-100 py-4 rounded-xl"
                onPress={() => setCloseConfirmVisible(false)}
              >
                <Text className="text-center font-bold text-slate-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-[#4361FF] py-4 rounded-xl"
                onPress={() => {
                  setCloseConfirmVisible(false);
                  doUpdateStatus("closed");
                }}
              >
                <Text className="text-center font-bold text-white">Close ticket</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}