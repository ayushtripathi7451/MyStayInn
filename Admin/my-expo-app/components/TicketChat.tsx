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

export default function TicketChat({ navigation, route }: any) {
  const ticketId = route?.params?.ticketId;
  const [ticket, setTicket] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(false);

  const fetchTicket = useCallback(async () => {
    if (!ticketId) return;
    try {
      const res = await ticketApi.get<{ success: boolean; ticket?: any; comments?: any[] }>(`/api/tickets/${ticketId}`);
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
  }, [fetchTicket]);

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket || ticket.status === newStatus) {
      setOpenDropdown(false);
      return;
    }
    if (newStatus === "closed") {
      Alert.alert(
        "Close Ticket?",
        "You won't be able to add new comments after closing.",
        [
          { text: "Cancel", style: "cancel", onPress: () => setOpenDropdown(false) },
          { text: "Yes, Close", onPress: () => doUpdateStatus("closed") },
        ]
      );
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
      Alert.alert("Error", e?.response?.data?.message || "Failed to update status");
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
        {loading ? <ActivityIndicator size="large" color="#1E33FF" /> : <Text className="text-slate-500">Ticket not found</Text>}
      </SafeAreaView>
    );
  }

  const status = ticket.status || "open";
  const isClosed = status === "closed";

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-slate-200">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 bg-white rounded-full border border-slate-300 justify-center items-center">
            <Ionicons name="chevron-back" size={22} color="#000" />
          </TouchableOpacity>
          <Text className="ml-3 text-2xl font-semibold text-slate-900">{ticket.displayId}</Text>
        </View>
        <View className="relative">
          <TouchableOpacity
            onPress={() => !isClosed && setOpenDropdown((p) => !p)}
            className="flex-row items-center justify-center px-4 py-1 rounded-full"
            style={{ backgroundColor: statusColor[status]?.bg || statusColor.open.bg, minWidth: 130 }}
          >
            <Text className="font-semibold text-[16px]" style={{ color: statusColor[status]?.text || statusColor.open.text }}>
              {STATUS_LABEL[status] || status}
            </Text>
            {!isClosed && (
              <Ionicons name={openDropdown ? "chevron-up" : "chevron-down"} size={16} color={statusColor[status]?.text} style={{ marginLeft: 6 }} />
            )}
          </TouchableOpacity>
          {openDropdown && (
            <View className="absolute right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-lg z-50">
              {STATUS_OPTIONS.map((s) => (
                <TouchableOpacity key={s} onPress={() => handleStatusChange(s)} className="px-4 py-3" disabled={updatingStatus}>
                  <Text className="font-medium" style={{ color: statusColor[s]?.text }}>{STATUS_LABEL[s]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false} className="px-4 flex-1" keyboardDismissMode="on-drag">
          <View className="bg-slate-50 rounded-2xl p-5 my-4">
            <Text className="text-[17px] font-semibold text-slate-900">{ticket.title}</Text>
            <Text className="text-slate-600 mt-2">{ticket.description || ""}</Text>
            <Text className="text-slate-500 text-sm mt-3">{ticket.category} {ticket.propertyRef ? ` · ${ticket.propertyRef}` : ""}</Text>
            <Text className="text-slate-400 text-xs mt-1">{formatDate(ticket.createdAt)}</Text>
          </View>

          <Text className="mt-4 mb-3 text-[18px] font-semibold text-slate-900">Comments</Text>
          {comments.length === 0 ? (
            <Text className="text-slate-500 py-4">No comments yet.</Text>
          ) : (
            comments.map((c) => (
              <View key={c.id} className="mb-3">
                <View className="bg-slate-100 rounded-xl py-3 px-4 max-w-[85%]">
                  <Text className="text-slate-700">{c.body}</Text>
                  <Text className="text-slate-500 text-[10px] mt-1">{c.authorUniqueId || "User"} · {formatDate(c.createdAt)}</Text>
                </View>
              </View>
            ))
          )}

          <View className="mt-5 mb-6 bg-white rounded-xl p-3 shadow shadow-black/5">
            <TextInput
              placeholder={isClosed ? "Ticket is closed" : "Write a comment..."}
              placeholderTextColor="#9CA3AF"
              editable={!isClosed}
              className="border border-slate-300 rounded-xl px-3 py-2 mb-3"
              style={{ color: "#111827" }}
              multiline
              value={commentText}
              onChangeText={setCommentText}
            />
            <TouchableOpacity
              disabled={isClosed || sendingComment || !commentText.trim()}
              onPress={handleAddComment}
              className={`rounded-full py-3 items-center ${isClosed || sendingComment ? "bg-slate-300" : "bg-[#1E33FF]"}`}
            >
              <Text className="text-white font-semibold">{sendingComment ? "Sending..." : "Add comment"}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
