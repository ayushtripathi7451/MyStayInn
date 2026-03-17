import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useProperty } from "../contexts/PropertyContext";
import { expenseApi } from "../utils/api";

export interface MonthlyExpenseItem {
  monthly_expense_id: string;
  expense_type: string;
  name: string;
  role?: string;
  amount: number;
  due_display?: string;
  due_day?: number;
}

export default function StaffDetail({
  onNext,
  refreshTrigger = 0,
}: {
  onNext: () => void;
  refreshTrigger?: number;
}) {
  const { currentProperty } = useProperty();
  const propertyId = currentProperty?.id;
  const [items, setItems] = useState<MonthlyExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMonthly = useCallback(async () => {
    if (!propertyId) {
      setLoading(false);
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await expenseApi.get(`/monthly/${propertyId}`);
      const data = res.data?.data ?? res.data;
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load monthly expenses");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchMonthly();
  }, [fetchMonthly, refreshTrigger]);

  return (
    <View className="mt-2">
      <View className="bg-white rounded-2xl p-4 shadow shadow-black/5">
        <Text className="text-[20px] font-semibold mb-3 text-gray-800">
          Monthly Fixed Expenses
        </Text>

        {!propertyId ? (
          <Text className="text-gray-500 py-4">Select a property to view monthly expenses.</Text>
        ) : loading ? (
          <View className="py-6 items-center">
            <ActivityIndicator size="large" color="#1E33FF" />
          </View>
        ) : error ? (
          <Text className="text-red-600 py-4">{error}</Text>
        ) : (
          <>
            <View className="flex-row justify-between mb-2 px-1">
              <Text className="flex-1 font-semibold text-gray-600">Type</Text>
              <Text className="flex-1 font-semibold text-gray-600">Name</Text>
              <Text className="flex-1 font-semibold text-gray-600">Amount</Text>
              <Text className="flex-1 font-semibold text-gray-600">Due</Text>
            </View>
            <View className="h-[1px] bg-gray-200 mb-2" />

            {items.length === 0 ? (
              <Text className="text-gray-500 py-4">No monthly expenses yet. Add one below.</Text>
            ) : (
              items.map((item) => (
                <View key={item.monthly_expense_id} className="flex-row py-2 px-1 border-b border-gray-100">
                  <Text className="flex-1 text-gray-700">{item.expense_type}</Text>
                  <Text className="flex-1 text-gray-700" numberOfLines={1}>
                    {item.role ? `${item.name} (${item.role})` : item.name}
                  </Text>
                  <Text className="flex-1 text-gray-700">₹{item.amount}</Text>
                  <Text className="flex-1 text-gray-700">{item.due_display ?? "—"}</Text>
                </View>
              ))
            )}
          </>
        )}
      </View>

      <View className="items-end mt-6">
        <TouchableOpacity
          onPress={onNext}
          className="flex-row items-center px-6 py-3 bg-[#1E33FF] rounded-full shadow-md"
        >
          <Ionicons name="add-circle-outline" size={20} color="white" />
          <Text className="text-white ml-2 font-semibold">Add Monthly Expense</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
