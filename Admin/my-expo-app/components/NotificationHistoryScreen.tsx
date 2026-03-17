import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import NotificationService, { NotificationData } from "../services/notificationService";

interface NotificationHistoryScreenProps {
  navigation: any;
}

export default function NotificationHistoryScreen({ navigation }: NotificationHistoryScreenProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0,
    highPriority: 0,
    normalPriority: 0
  });

  const loadNotifications = () => {
    const history = NotificationService.getNotificationHistory();
    const notificationStats = NotificationService.getNotificationStats();
    setNotifications(history);
    setStats(notificationStats);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    loadNotifications();
    setRefreshing(false);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'text-green-600 bg-green-50';
      case 'failed': return 'text-red-600 bg-red-50';
      case 'pending': return 'text-orange-600 bg-orange-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const getPriorityColor = (priority: string) => {
    return priority === 'high' ? 'text-red-600' : 'text-slate-600';
  };

  const getRecipientText = (notification: NotificationData) => {
    if (notification.recipientType === 'all') {
      return `All tenants (${notification.recipients.length})`;
    } else {
      const tenantNames = notification.recipients
        .map(id => NotificationService.getTenantById(id)?.name)
        .filter(Boolean)
        .slice(0, 2);
      
      if (notification.recipients.length > 2) {
        return `${tenantNames.join(', ')} +${notification.recipients.length - 2} more`;
      }
      return tenantNames.join(', ');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">
      {/* Header */}
      <View className="bg-white px-6 py-5 flex-row items-center border-b border-slate-200 shadow-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1 -ml-1">
          <Ionicons name="arrow-back" size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-4 text-2xl font-black text-slate-900 tracking-tight">
          Notification History
        </Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        className="flex-1 px-5"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        
        {/* Statistics Cards */}
        <View className="flex-row justify-between mt-6 space-x-3">
          <View className="flex-1 bg-white rounded-[20px] p-4 shadow-sm border border-white">
            <View className="flex-row items-center mb-2">
              <Ionicons name="send-outline" size={20} color="#059669" />
              <Text className="ml-2 text-green-600 font-bold text-sm">Sent</Text>
            </View>
            <Text className="text-2xl font-black text-slate-900">{stats.sent}</Text>
          </View>

          <View className="flex-1 bg-white rounded-[20px] p-4 shadow-sm border border-white">
            <View className="flex-row items-center mb-2">
              <Ionicons name="time-outline" size={20} color="#f59e0b" />
              <Text className="ml-2 text-orange-600 font-bold text-sm">Pending</Text>
            </View>
            <Text className="text-2xl font-black text-slate-900">{stats.pending}</Text>
          </View>

          <View className="flex-1 bg-white rounded-[20px] p-4 shadow-sm border border-white">
            <View className="flex-row items-center mb-2">
              <Ionicons name="warning-outline" size={20} color="#DC2626" />
              <Text className="ml-2 text-red-600 font-bold text-sm">High Priority</Text>
            </View>
            <Text className="text-2xl font-black text-slate-900">{stats.highPriority}</Text>
          </View>
        </View>

        {/* Send New Notification Button */}
        <TouchableOpacity
          onPress={() => navigation.navigate("SendNotificationScreen")}
          className="bg-blue-600 rounded-2xl p-4 mt-6 shadow-sm flex-row items-center justify-center"
        >
          <Ionicons name="add" size={20} color="white" />
          <Text className="text-white font-bold text-lg ml-2">Send New Notification</Text>
        </TouchableOpacity>

        {/* Notifications List */}
        <View className="mt-6">
          {notifications.length > 0 ? (
            notifications.map((notification, index) => (
              <View key={`notif-${index}-${notification.id}`} className="bg-white rounded-[24px] p-6 mb-4 shadow-sm border border-white">
                {/* Notification Header */}
                <View className="flex-row items-start justify-between mb-4">
                  <View className="flex-1 mr-4">
                    <View className="flex-row items-center mb-2">
                      <Text className="text-lg font-black text-slate-900 flex-1">
                        {notification.title}
                      </Text>
                      <View className={`px-2 py-1 rounded-full ${getStatusColor(notification.status)}`}>
                        <Text className={`font-bold text-xs uppercase ${getStatusColor(notification.status).split(' ')[0]}`}>
                          {notification.status}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-slate-600 text-sm leading-5 mb-3">
                      {notification.message}
                    </Text>
                  </View>
                </View>

                {/* Notification Details */}
                <View className="space-y-2 mb-4">
                  <View className="flex-row justify-between">
                    <Text className="text-slate-500 font-medium">Recipients</Text>
                    <Text className="font-bold text-slate-900 text-right flex-1 ml-4">
                      {getRecipientText(notification)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-slate-500 font-medium">Priority</Text>
                    <View className="flex-row items-center">
                      <Ionicons 
                        name={notification.priority === 'high' ? 'warning' : 'information-circle'} 
                        size={16} 
                        color={notification.priority === 'high' ? '#DC2626' : '#64748b'} 
                      />
                      <Text className={`font-bold ml-1 capitalize ${getPriorityColor(notification.priority)}`}>
                        {notification.priority}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-slate-500 font-medium">Sent At</Text>
                    <Text className="font-bold text-slate-900">
                      {formatDate(notification.sentAt)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-slate-500 font-medium">Read By</Text>
                    <Text className="font-bold text-slate-900">
                      {notification.readBy.length} / {notification.recipients.length}
                    </Text>
                  </View>
                </View>

                {/* Read Status Progress */}
                <View className="mb-4">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-slate-500 font-medium text-sm">Read Status</Text>
                    <Text className="text-slate-600 text-sm">
                      {Math.round((notification.readBy.length / notification.recipients.length) * 100)}%
                    </Text>
                  </View>
                  <View className="bg-slate-200 h-2 rounded-full overflow-hidden">
                    <View 
                      className="h-full bg-green-500 rounded-full"
                      style={{ 
                        width: `${(notification.readBy.length / notification.recipients.length) * 100}%`
                      }}
                    />
                  </View>
                </View>

                {/* Action Buttons */}
                <View className="flex-row space-x-2">
                  <TouchableOpacity
                    className="flex-1 bg-slate-100 py-3 rounded-xl"
                    onPress={() => {
                      // Could navigate to detailed view
                      console.log('View details for notification:', notification.id);
                    }}
                  >
                    <Text className="text-center font-bold text-slate-700 text-sm">
                      View Details
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 bg-blue-500 py-3 rounded-xl"
                    onPress={() => navigation.navigate("SendNotificationScreen", {
                      selectedTenants: notification.recipients,
                      template: {
                        title: notification.title,
                        message: notification.message,
                        priority: notification.priority
                      }
                    })}
                  >
                    <Text className="text-center font-bold text-white text-sm">
                      Send Similar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View className="bg-white rounded-[24px] p-8 items-center">
              <Ionicons name="notifications-outline" size={48} color="#94A3B8" />
              <Text className="text-slate-500 font-bold text-lg mt-4">
                No notifications sent yet
              </Text>
              <Text className="text-slate-400 text-center mt-2">
                Send your first notification to get started
              </Text>
            </View>
          )}
        </View>

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}