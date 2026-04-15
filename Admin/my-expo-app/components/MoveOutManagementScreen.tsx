import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { MoveOutService } from "../services/moveOutService";
import { MoveOutRequest } from "../types/moveout";
import { useProperty } from "../contexts/PropertyContext";
import { moveOutRequestMatchesProperty } from "../utils/moveOutPropertyFilter";

interface MoveOutManagementScreenProps {
  navigation: any;
  route?: { params?: { openTab?: 'requested' | 'accepted' } };
}

export default function MoveOutManagementScreen({ navigation, route }: MoveOutManagementScreenProps) {
  const { currentProperty } = useProperty();
  const propertyId = currentProperty?.id;
  const propertyUniqueId = currentProperty?.uniqueId ?? currentProperty?.id;
  const openTabParam = route?.params?.openTab;
  const [activeTab, setActiveTab] = useState<'requested' | 'accepted'>(openTabParam ?? 'requested');
  const [pendingRequests, setPendingRequests] = useState<MoveOutRequest[]>([]);
  const [scheduledMoveOuts, setScheduledMoveOuts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (openTabParam) setActiveTab(openTabParam);
  }, [openTabParam]);

  useEffect(() => {
    loadData();
  }, [activeTab, propertyId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [activeTab, propertyId])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      // Same scope as Home move-out badge: current property + tenant-requested only
      const [requestsRes, scheduledRes] = await Promise.all([
        MoveOutService.getMoveOutRequests(undefined, "pending", propertyId),
        MoveOutService.getScheduledMoveOuts(propertyId),
      ]);
      if (requestsRes.success && requestsRes.data?.requests) {
        const tenantRequestedOnly = requestsRes.data.requests.filter(
          (r: MoveOutRequest) => r.type !== "admin_initiated"
        );
        let scoped =
          propertyId || currentProperty?.name || propertyUniqueId
            ? tenantRequestedOnly.filter((r) =>
                moveOutRequestMatchesProperty(r, {
                  propertyId,
                  propertyName: currentProperty?.name,
                  propertyUniqueId,
                })
              )
            : tenantRequestedOnly;
        // Rows with propertyId=null are excluded by API ?propertyId= — widen like scheduled move-outs
        if (
          scoped.length === 0 &&
          (propertyId || propertyUniqueId || currentProperty?.name)
        ) {
          const wideRes = await MoveOutService.getMoveOutRequests(undefined, "pending", undefined);
          if (wideRes.success && wideRes.data?.requests?.length) {
            const tenantWide = wideRes.data.requests.filter(
              (r: MoveOutRequest) => r.type !== "admin_initiated"
            );
            scoped = tenantWide.filter((r) =>
              moveOutRequestMatchesProperty(r, {
                propertyId,
                propertyName: currentProperty?.name,
                propertyUniqueId,
              })
            );
          }
        }
        setPendingRequests(scoped);
      } else {
        setPendingRequests([]);
      }
      if (scheduledRes.success && scheduledRes.data) {
        let scheduled = scheduledRes.data;
        // Rows created before propertyId was passed have propertyId=null and are excluded by API filter — widen and scope client-side
        if (
          scheduled.length === 0 &&
          (propertyId || propertyUniqueId || currentProperty?.name)
        ) {
          const wide = await MoveOutService.getScheduledMoveOuts(undefined);
          if (wide.success && wide.data?.length) {
            scheduled = wide.data.filter((r: any) =>
              moveOutRequestMatchesProperty(
                {
                  propertyId: r.propertyId,
                  propertyUniqueId: r.propertyUniqueId,
                  propertyName: r.propertyName,
                },
                {
                  propertyId,
                  propertyName: currentProperty?.name,
                  propertyUniqueId,
                }
              )
            );
          }
        } else if (propertyId || propertyUniqueId || currentProperty?.name) {
          scheduled = scheduled.filter((r: any) =>
            moveOutRequestMatchesProperty(
              {
                propertyId: r.propertyId,
                propertyUniqueId: r.propertyUniqueId,
                propertyName: r.propertyName,
              },
              {
                propertyId,
                propertyName: currentProperty?.name,
                propertyUniqueId,
              }
            )
          );
        }
        setScheduledMoveOuts(scheduled);
      } else {
        setScheduledMoveOuts([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setPendingRequests([]);
      setScheduledMoveOuts([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleRequestAction = (requestId: string, action: 'approve' | 'reject' | 'view') => {
    navigation.navigate('MoveOutRequestDetail', { requestId, action });
  };

  const handleNewMoveOut = () => {
    navigation.navigate('SearchScreen');
  };

  const renderRequestedRequests = () => (
    <View className="px-5">
      {!pendingRequests || pendingRequests.length === 0 ? (
        <View className="bg-white rounded-[24px] p-8 mt-4 items-center">
          <Ionicons name="document-outline" size={48} color="#94A3B8" />
          <Text className="text-slate-500 font-bold text-center mt-4">
            No requested move-out requests
          </Text>
          <Text className="text-slate-400 text-center mt-2">
            All requests have been processed
          </Text>
        </View>
      ) : (
        // Sort by move out date ascending (immediate ones on top)
        pendingRequests
          .sort((a, b) => new Date(a.requestedDate).getTime() - new Date(b.requestedDate).getTime())
          .map((request) => (
            <RequestedMoveOutCard
              key={request.requestId}
              request={request}
              onAction={handleRequestAction}
            />
          ))
      )}
    </View>
  );

  const renderAcceptedMoveOuts = () => {
    // Filter for move-outs happening today or tomorrow for notification
    const upcomingMoveOuts = scheduledMoveOuts.filter(moveOut => {
      const daysUntil = Math.ceil((new Date(moveOut.moveOutDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 1;
    });

    return (
      <View className="px-5">
        {/* Notification Banner for Upcoming Move-Outs */}
       

        {!scheduledMoveOuts || scheduledMoveOuts.length === 0 ? (
          <View className="bg-white rounded-[24px] p-8 mt-4 items-center">
            <Ionicons name="calendar-outline" size={48} color="#94A3B8" />
            <Text className="text-slate-500 font-bold text-center mt-4">
              No accepted move-outs
            </Text>
            <Text className="text-slate-400 text-center mt-2">
              No upcoming move-out dates
            </Text>
          </View>
        ) : (
          // Sort by move out date ascending (today on top, tomorrow next)
          scheduledMoveOuts
            .sort((a, b) => new Date(a.moveOutDate).getTime() - new Date(b.moveOutDate).getTime())
            .map((moveOut) => (
              <AcceptedMoveOutCard
                key={moveOut.processId}
                moveOut={moveOut}
                onProcess={() => navigation.navigate('ProcessMoveOut', { processId: moveOut.processId })}
              />
            ))
        )}
      </View>
    );
  };

  const renderAnalytics = () => (
    <View className="px-5">
      <TouchableOpacity
        className="bg-white rounded-[24px] p-6 mt-4 shadow-sm"
        onPress={() => navigation.navigate('MoveOutAnalytics')}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-lg font-black text-slate-900">
              Move-Out Analytics
            </Text>
            <Text className="text-slate-500 font-medium mt-1">
              View detailed reports and trends
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#1E33FF" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        className="bg-white rounded-[24px] p-6 mt-4 shadow-sm"
        onPress={() => navigation.navigate('MoveOutReports')}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-lg font-black text-slate-900">
              Settlement Reports
            </Text>
            <Text className="text-slate-500 font-medium mt-1">
              Security deposit and deduction reports
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#1E33FF" />
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="bg-white px-6 py-5 flex-row items-center justify-between border-b border-slate-200 shadow-sm">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-1 -ml-1">
            <Ionicons name="arrow-back" size={28} color="#0F172A" />
          </TouchableOpacity>
          <Text className="ml-4 text-2xl font-black text-slate-900 tracking-tight">
            Move-Out Management
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleNewMoveOut}
          className="bg-[#1E33FF] px-4 py-2 rounded-xl"
        >
          <Text className="text-white font-bold text-sm">New</Text>
        </TouchableOpacity>
      </View>


      {/* Tab Navigation */}
      <View className="bg-white px-6 py-4 border-b border-slate-100">
        <View className="mb-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
          <Text className="text-indigo-800 font-bold text-sm">
            Requested → Accepted → Moved Out
          </Text>
        </View>
        <View className="flex-row bg-slate-100 rounded-xl p-1">
          <TouchableOpacity
            className={`flex-1 py-3 rounded-lg ${
              activeTab === 'requested' ? 'bg-white shadow-sm' : ''
            }`}
            onPress={() => setActiveTab('requested')}
          >
            <View className="flex-row items-center justify-center gap-1.5">
              <Text
                className={`text-center font-bold ${
                  activeTab === 'requested' ? 'text-slate-900' : 'text-slate-500'
                }`}
              >
                Requested
              </Text>
              {pendingRequests.length > 0 && (
                <View className="bg-[#1E33FF] min-w-[22px] h-[22px] rounded-full items-center justify-center px-1.5">
                  <Text className="text-white text-xs font-bold">
                    {pendingRequests.length > 99 ? '99+' : pendingRequests.length}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-3 rounded-lg ${
              activeTab === 'accepted' ? 'bg-white shadow-sm' : ''
            }`}
            onPress={() => setActiveTab('accepted')}
          >
            <Text
              className={`text-center font-bold ${
                activeTab === 'accepted' ? 'text-slate-900' : 'text-slate-500'
              }`}
            >
              Accepted
            </Text>
          </TouchableOpacity>
          {/* <TouchableOpacity
            className={`flex-1 py-3 rounded-lg ${
              activeTab === 'analytics' ? 'bg-white shadow-sm' : ''
            }`}
            onPress={() => setActiveTab('analytics')}
          >
            <Text
              className={`text-center font-bold ${
                activeTab === 'analytics' ? 'text-slate-900' : 'text-slate-500'
              }`}
            >
              Analytics
            </Text>
          </TouchableOpacity> */}
        </View>
      </View>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'requested' && renderRequestedRequests()}
        {activeTab === 'accepted' && renderAcceptedMoveOuts()}
        {/* {activeTab === 'analytics' && renderAnalytics()} */}
        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}

// Requested Move-Out Card Component
const RequestedMoveOutCard = ({ request, onAction }: { request: MoveOutRequest; onAction: any }) => {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <TouchableOpacity 
      className="bg-white rounded-[24px] p-6 mt-4 shadow-sm border border-white"
      onPress={() => onAction(request.requestId, 'view')}
    >
      <View className="flex-row items-start justify-between mb-4">
        <View className="flex-1">
          <Text className="text-lg font-black text-slate-900">
            {(request as any).customerName || request.customerId}
          </Text>
          <Text className="text-slate-500 font-medium mt-1">
            Room {request.roomId || "—"} • Request ID: {request.requestId}
          </Text>
        </View>
      </View>

      <View className="space-y-3">
        <View className="flex-row justify-between">
          <Text className="text-slate-500 font-medium">Tenant Name</Text>
          <Text className="font-bold text-slate-900">{(request as any).customerName || request.customerId}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-slate-500 font-medium">MyStay ID</Text>
          <Text className="font-bold text-blue-600">{(request as any).mystayId || request.customerId}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-slate-500 font-medium">Room</Text>
          <Text className="font-bold text-slate-900">{request.roomId || "—"}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-slate-500 font-medium">Current Due</Text>
          <Text className="font-bold text-red-600">₹{((request as any).currentDue ?? 0).toLocaleString()}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-slate-500 font-medium">Move out date</Text>
          <Text className="font-bold text-slate-900">{formatDate(request.requestedDate)}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-slate-500 font-medium">Notice period</Text>
          <Text className={`font-bold ${request.isWithinNotice ? 'text-red-600' : 'text-green-600'}`}>
            {request.noticePeriodDays} days {request.isWithinNotice ? '(Short Notice)' : ''}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Accepted Move-Out Card Component
const AcceptedMoveOutCard = ({ moveOut, onProcess }: { moveOut: any; onProcess: () => void }) => {
  const formatDate = (value: Date | string | null | undefined) => {
    if (value == null) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getDaysUntilMoveOut = (date: Date | string) => {
    const today = new Date();
    const moveOutDate = new Date(date);
    const diffTime = moveOutDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntil = getDaysUntilMoveOut(moveOut.moveOutDate);

  return (
    <TouchableOpacity 
      className="bg-white rounded-[24px] p-6 mt-4 shadow-sm border border-white"
      onPress={onProcess}
    >
      <View className="flex-row items-start justify-between mb-4">
        <View className="flex-1">
          <Text className="text-lg font-black text-slate-900">
            {moveOut.customerName}
          </Text>
          <Text className="text-slate-500 font-medium mt-1">
            Room {moveOut.roomNumber} • {moveOut.propertyName}
          </Text>
        </View>
        <View className={`px-3 py-1 rounded-full ${
          daysUntil <= 3 ? 'bg-red-50 text-red-600' : 
          daysUntil <= 7 ? 'bg-orange-50 text-orange-600' : 
          'bg-blue-50 text-blue-600'
        }`}>
          <Text className={`text-xs font-bold ${
            daysUntil <= 3 ? 'text-red-600' : 
            daysUntil <= 7 ? 'text-orange-600' : 
            'text-blue-600'
          }`}>
            {daysUntil > 0 ? `${daysUntil} days` : 'Today'}
          </Text>
        </View>
      </View>

      <View className="space-y-3">
        <View className="flex-row justify-between">
          <Text className="text-slate-500 font-medium">Tenant Name</Text>
          <Text className="font-bold text-slate-900">{moveOut.customerName}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-slate-500 font-medium">MyStay ID</Text>
          <Text className="font-bold text-blue-600">{moveOut.mystayId || moveOut.customerId}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-slate-500 font-medium">Room</Text>
          <Text className="font-bold text-slate-900">{moveOut.roomNumber}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-slate-500 font-medium">Current Due</Text>
          <Text className="font-bold text-red-600">₹{(moveOut.currentDue ?? 0).toLocaleString()}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-slate-500 font-medium">Move out date</Text>
          <Text className="font-bold text-slate-900">{formatDate(moveOut.moveOutDate)}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-slate-500 font-medium">Refund amount</Text>
          <Text className="font-bold text-green-600">₹{moveOut.securityDepositAmount?.toLocaleString()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};