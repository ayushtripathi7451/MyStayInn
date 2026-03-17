import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useProperty } from "../contexts/PropertyContext";
import { expenseApi } from "../utils/api";

export interface ExpenseItem {
  expense_id: string;
  category_name: string;
  amount: number;
  description: string | null;
  expense_date: string;
  month_year: string;
}

export default function ExpenseForm({
  onNext,
  refreshTrigger = 0,
}: {
  onNext: () => void;
  refreshTrigger?: number;
}) {
  const { currentProperty } = useProperty();
  const propertyId = currentProperty?.id;
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    if (!propertyId) {
      setLoading(false);
      setExpenses([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await expenseApi.get(`/${propertyId}`);
      const data = res.data?.data ?? res.data;
      setExpenses(Array.isArray(data) ? data : []);
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message || e?.message || "Failed to load expenses";
      const detail = status === 401 ? "Please log in again." : status === 404 ? "Expense service not found. Check that it's running on port 3006." : msg;
      setError(detail);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses, refreshTrigger]);

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return iso;
    }
  };

  return (
    <View>
      <View className="mt-2">
        <View className="bg-white rounded-2xl p-4 shadow shadow-black/5">
          <Text className="text-[20px] font-semibold mb-3 text-gray-800">
            Recent Expenses
          </Text>

          {!propertyId ? (
            <Text className="text-gray-500 py-4">Select a property to view expenses.</Text>
          ) : loading ? (
            <View className="py-6 items-center">
              <ActivityIndicator size="large" color="#1E33FF" />
            </View>
          ) : error ? (
            <Text className="text-red-600 py-4">{error}</Text>
          ) : (
            <>
              <View className="flex-row justify-between mb-2 px-1">
                <Text className="flex-1 font-semibold text-gray-600">Date</Text>
                <Text className="flex-1 font-semibold text-gray-600">Category</Text>
                <Text className="flex-1 font-semibold text-gray-600">Amount</Text>
                <Text className="flex-1 font-semibold text-gray-600">Note</Text>
              </View>
              <View className="h-[1px] bg-gray-200 mb-2" />

              {expenses.length === 0 ? (
                <Text className="text-gray-500 py-4">No expenses yet. Add one below.</Text>
              ) : (
                expenses.map((item) => (
                  <View
                    key={item.expense_id}
                    className="flex-row justify-between py-2 px-1 border-b border-gray-100"
                  >
                    <Text className="flex-1 text-gray-700">{formatDate(item.expense_date)}</Text>
                    <Text className="flex-1 text-gray-700">{item.category_name}</Text>
                    <Text className="flex-1 text-gray-700">₹{item.amount}</Text>
                    <Text className="flex-1 text-gray-700" numberOfLines={1}>
                      {item.description || "—"}
                    </Text>
                  </View>
                ))
              )}
            </>
          )}
        </View>
      </View>

      <View className="justify-end items-end mt-6">
        <TouchableOpacity
          onPress={onNext}
          className="flex-row items-center px-6 py-3 bg-[#1E33FF] rounded-full shadow-md"
        >
          <Ionicons name="add-circle-outline" size={20} color="white" style={{ marginRight: 6 }} />
          <Text className="text-white text-[16px] font-semibold">Add Expense</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
