import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useCurrentStay } from "../src/hooks";
import type { CurrentStayProperty } from "../src/store/redux/slices/currentStaySlice";

export type { CurrentStayProperty };

export default function InfoCards() {
  const navigation = useNavigation<any>();
  const { data: property, loading, error } = useCurrentStay();
  const showLoading = !property && !error && loading;

  const currentDue = property?.currentDue ?? 0;
  const hasDue = currentDue > 0;
  const securityDeposit = property?.securityDeposit ?? 0;
  const moveInDisplay =
    property?.checkInDate
      ? new Date(property.checkInDate).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  return (
    <View className="mt-6">
      <View className="flex-row justify-between items-center px-4 mb-3">
        <Text className="text-xl font-bold text-slate-800">
          My Current Stay
        </Text>
      </View>

      {showLoading ? (
        <View className="mx-4 py-8 items-center rounded-2xl bg-white/80">
          <ActivityIndicator size="small" color="#1E33FF" />
          <Text className="text-slate-500 text-sm mt-2">Loading your stay...</Text>
        </View>
      ) : error ? (
        <View className="mx-4 py-5 px-4 bg-amber-50 rounded-2xl border border-amber-200">
          <Ionicons name="warning-outline" size={22} color="#B45309" style={{ alignSelf: "center", marginBottom: 6 }} />
          <Text className="text-amber-800 text-center text-sm">{error}</Text>
        </View>
      ) : property ? (
        <View className="mx-4" key={`stay-card-${property.id}`}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => navigation.navigate("PropertyDetailsScreen", { property })}
            className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm"
            style={{
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            {/* Header strip with property name */}
            <View className="bg-[#1E33FF]/08 px-5 pt-4 pb-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-lg font-bold text-slate-900" numberOfLines={1}>
                    {property.name}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <View className="bg-emerald-500/20 px-2 py-0.5 rounded-full">
                      <Text className="text-xs font-semibold text-emerald-700">{property.status}</Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#64748B" />
              </View>
            </View>

            <View className="px-5 py-4">
              {/* Room & Move-in row */}
              <View className="flex-row flex-wrap gap-4 mb-4">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center">
                    <Ionicons name="bed-outline" size={18} color="#475569" />
                  </View>
                  <View className="ml-2">
                    <Text className="text-xs text-slate-500">Room</Text>
                    <Text className="text-sm font-semibold text-slate-800">{property.roomNumber}</Text>
                  </View>
                </View>
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center">
                    <Ionicons name="calendar-outline" size={18} color="#475569" />
                  </View>
                  <View className="ml-2">
                    <Text className="text-xs text-slate-500">Move-in</Text>
                    <Text className="text-sm font-semibold text-slate-800">{moveInDisplay}</Text>
                  </View>
                </View>
              </View>

              {property.address ? (
                <View className="mb-4 flex-row items-start">
                  <Ionicons name="location-outline" size={16} color="#94A3B8" style={{ marginTop: 2 }} />
                  <Text className="text-sm text-slate-600 ml-2 flex-1" numberOfLines={2}>
                    {property.address}
                  </Text>
                </View>
              ) : null}

              {/* Financial summary */}
              <View className="flex-row border-t border-slate-100 pt-4 gap-4">
                <View className="flex-1">
                  <Text className="text-xs text-slate-500 mb-0.5">Security Deposit</Text>
                  <Text className="text-base font-bold text-slate-800">₹{securityDeposit.toLocaleString()}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-slate-500 mb-0.5">Current Due</Text>
                  <Text
                    className={`text-base font-bold ${hasDue ? "text-red-600" : "text-emerald-600"}`}
                  >
                    ₹{currentDue.toLocaleString()}
                  </Text>
                  
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="mx-4 py-8 px-5 bg-slate-50 rounded-2xl border border-slate-200 items-center">
          <Ionicons name="home-outline" size={40} color="#94A3B8" />
          <Text className="text-slate-600 text-center mt-3 font-medium">No active stay</Text>
          <Text className="text-slate-500 text-center text-sm mt-1">Your current property will appear here once you’re allocated.</Text>
        </View>
      )}
    </View>
  );
}
