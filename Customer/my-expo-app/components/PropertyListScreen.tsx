import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { userApi } from "../utils/api";
import type { CurrentStayProperty } from "./InfoCards";

function mapCurrentStayToProperty(currentStay: any): CurrentStayProperty | null {
  if (!currentStay?.booking || !currentStay?.room) return null;
  const b = currentStay.booking;
  const r = currentStay.room;
  const p = currentStay.property;
  const address = [p?.address, p?.city, p?.state, p?.pincode].filter(Boolean).join(", ") || "";
  return {
    id: b.id,
    bookingId: b.id,
    name: r.propertyName || p?.name || "Property",
    status: "Approved",
    roomNumber: r.roomNumber,
    monthlyRent: Number(b.rentAmount) || 0,
    checkInDate: typeof b.moveInDate === "string" ? b.moveInDate : b.moveInDate?.substring?.(0, 10) || "",
    address,
    roomId: r.id,
    propertyId: p?.id,
    moveOutDate: b.moveOutDate,
    bgColor: "bg-[#FFE8E8]",
    propertyType: p?.propertyType,
    roomType: r?.roomType,
    floor: r?.floor != null ? Number(r.floor) : undefined,
  };
}

export default function PropertyListScreen() {
  const navigation = useNavigation<any>();
  const [properties, setProperties] = useState<CurrentStayProperty[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCurrentStay = async () => {
    try {
      const res = await userApi.get<{ success: boolean; currentStay: any }>("/api/users/me/current-stay");
      const currentStay = res.data?.currentStay ?? null;
      const mapped = mapCurrentStayToProperty(currentStay);
      setProperties(mapped ? [mapped] : []);
    } catch (e) {
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchCurrentStay();
    }, [])
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">
      <StatusBar barStyle="dark-content" />

      <View className="bg-white px-6 py-5 border-b border-slate-200 shadow-sm">
        <Text className="text-2xl font-black text-slate-900 tracking-tight">
          My Properties
        </Text>
        <Text className="text-slate-500 mt-1">
          Manage your current stays
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="px-5">
        <View className="mt-6">
          {loading ? (
            <View className="py-12 items-center">
              <ActivityIndicator size="small" color="#1E33FF" />
            </View>
          ) : properties.length === 0 ? (
            <View className="bg-white rounded-[24px] p-8 items-center">
              <Text className="text-slate-500 text-center">No active stay. Your current property will appear here.</Text>
            </View>
          ) : (
            properties.map((property) => (
              <View key={property.id} className="bg-white rounded-[24px] p-6 mb-4 shadow-sm border border-white">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center">
                    <View className="w-12 h-12 bg-[#FFE8E8] rounded-xl items-center justify-center">
                      <Text className="text-2xl">🏢</Text>
                    </View>
                    <View className="ml-4">
                      <Text className="text-lg font-black text-slate-900">{property.name}</Text>
                      <Text className="text-slate-500 text-sm">Room {property.roomNumber}</Text>
                    </View>
                  </View>
                  <View className="bg-green-50 px-3 py-1 rounded-full">
                    <Text className="text-green-600 font-bold text-xs uppercase">{property.status}</Text>
                  </View>
                </View>

                <View className="space-y-2 mb-4">
                  <View className="flex-row justify-between">
                    <Text className="text-slate-500 font-medium">Monthly Rent</Text>
                    <Text className="font-bold text-slate-900">₹{property.monthlyRent.toLocaleString()}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-slate-500 font-medium">Check-In Date</Text>
                    <Text className="font-bold text-slate-900">{formatDate(property.checkInDate)}</Text>
                  </View>
                  {property.address ? (
                    <View className="flex-row justify-between">
                      <Text className="text-slate-500 font-medium">Address</Text>
                      <Text className="font-bold text-slate-900 text-right flex-1 ml-4">{property.address}</Text>
                    </View>
                  ) : null}
                </View>

                <View className="flex-row space-x-3">
                  <TouchableOpacity
                    className="flex-1 bg-slate-100 py-3 rounded-xl"
                    onPress={() => navigation.navigate("PropertyDetailsScreen", { property })}
                  >
                    <Text className="text-center font-bold text-slate-700">View Details</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 bg-red-500 py-3 rounded-xl"
                    onPress={() => navigation.navigate("MoveOutRequestScreen", { property })}
                  >
                    <Text className="text-center font-bold text-white">Move Out</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View className="bg-blue-50 rounded-[24px] p-6 mt-4">
          <View className="flex-row items-center mb-3">
            <Ionicons name="information-circle-outline" size={24} color="#1E33FF" />
            <Text className="ml-2 text-lg font-black text-blue-900">
              Quick Actions
            </Text>
          </View>
          
          <View className="space-y-2">
            <TouchableOpacity 
              className="flex-row items-center py-2"
              onPress={() => navigation.navigate('MoveOutStatusScreen')}
            >
              <Ionicons name="document-text-outline" size={20} color="#1E33FF" />
              <Text className="ml-3 text-blue-800 font-medium">
                Check Move-Out Status
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className="flex-row items-center py-2"
              onPress={() => navigation.navigate('TicketsScreen')}
            >
              <Ionicons name="help-circle-outline" size={20} color="#1E33FF" />
              <Text className="ml-3 text-blue-800 font-medium">
                Raise Support Ticket
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className="flex-row items-center py-2"
              onPress={() => navigation.navigate('PaymentDueScreen')}
            >
              <Ionicons name="card-outline" size={20} color="#1E33FF" />
              <Text className="ml-3 text-blue-800 font-medium">
                View Payment Due
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}