import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useProperty } from "../contexts/PropertyContext";
import { expenseApi } from "../utils/api";
import ScrollableDatePicker from "./ScrollableDatePicker";
import CustomDropdown from "./CustomDropdown";

export interface ExpenseItem {
  expense_id: string;
  category_name: string;
  amount: number;
  description: string | null;
  expense_date: string;
  month_year: string;
  paid_mode?: string;
}

const FALLBACK_CATEGORIES = [
  "Food",
  "Rent",
  "Electricity",
  "Water",
  "Transport",
  "Shopping",
  "Other",
];

const PAID_MODE_OPTIONS = ["cash", "online", "upi", "bank_transfer"] as const;

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

  const [editVisible, setEditVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>(FALLBACK_CATEGORIES);
  const [editCategory, setEditCategory] = useState("");
  const [editDate, setEditDate] = useState<Date>(new Date());
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editPaidMode, setEditPaidMode] = useState<string>("cash");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<ExpenseItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
      const detail =
        status === 401
          ? "Please log in again."
          : status === 404
            ? "Expense service not found. Check that it's running on port 3006."
            : msg;
      setError(detail);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses, refreshTrigger]);

  useEffect(() => {
    expenseApi
      .get("/categories")
      .then((res) => {
        const data = res.data?.data ?? res.data;
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data.map((c: { name: string }) => c.name));
        }
      })
      .catch(() => {});
  }, []);

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return iso;
    }
  };

  const openEdit = (item: ExpenseItem) => {
    setEditingId(item.expense_id);
    setEditCategory(item.category_name);
    setEditDate(new Date(item.expense_date));
    setEditAmount(String(item.amount));
    setEditNote(item.description ?? "");
    const pm = item.paid_mode && PAID_MODE_OPTIONS.includes(item.paid_mode as (typeof PAID_MODE_OPTIONS)[number])
      ? item.paid_mode
      : "cash";
    setEditPaidMode(pm);
    setEditError(null);
    setEditVisible(true);
  };

  const closeEdit = () => {
    setEditVisible(false);
    setEditingId(null);
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!propertyId || !editingId) return;
    setEditError(null);
    if (!editCategory.trim()) {
      setEditError("Please select a category.");
      return;
    }
    const num = parseFloat(editAmount.replace(/,/g, ""));
    if (Number.isNaN(num) || num < 0) {
      setEditError("Please enter a valid amount.");
      return;
    }

    setEditSaving(true);
    try {
      await expenseApi.put(`/entry/${editingId}`, {
        property_id: propertyId,
        category_name: editCategory.trim(),
        amount: num,
        description: editNote.trim() || null,
        expense_date: editDate.toISOString(),
        paid_mode: editPaidMode,
      });
      closeEdit();
      await fetchExpenses();
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message || e?.message || "Failed to update expense";
      setEditError(
        status === 401
          ? "Please log in again."
          : status === 404
            ? "Expense not found or service unavailable."
            : msg
      );
    } finally {
      setEditSaving(false);
    }
  };

  const confirmDelete = (item: ExpenseItem) => {
    setDeleteError(null);
    setPendingDeleteItem(item);
    setDeleteSheetVisible(true);
  };

  const deleteExpense = async () => {
    if (!propertyId || !pendingDeleteItem) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      await expenseApi.delete(`/entry/${pendingDeleteItem.expense_id}`, {
        params: { property_id: propertyId },
      });
      setDeleteSheetVisible(false);
      setPendingDeleteItem(null);
      await fetchExpenses();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Failed to delete";
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View>
      <View className="mt-2">
        <View className="bg-white rounded-2xl p-4 shadow shadow-black/5">
          <Text className="text-[20px] font-semibold mb-3 text-gray-800">Recent Expenses</Text>

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
              {deleteError ? (
                <View className="mb-2 p-3 rounded-xl bg-red-50 border border-red-100">
                  <Text className="text-red-700 text-sm">{deleteError}</Text>
                </View>
              ) : null}
              <View className="flex-row justify-between mb-2 px-1">
                <Text className="w-[22%] font-semibold text-gray-600">Date</Text>
                <Text className="w-[22%] font-semibold text-gray-600">Category</Text>
                <Text className="w-[16%] font-semibold text-gray-600">Amount</Text>
                <Text className="flex-1 font-semibold text-gray-600">Note</Text>
                <Text className="w-[56px] font-semibold text-gray-600 text-right"> </Text>
              </View>
              <View className="h-[1px] bg-gray-200 mb-2" />

              {expenses.length === 0 ? (
                <Text className="text-gray-500 py-4">No expenses yet. Add one below.</Text>
              ) : (
                expenses.map((item) => (
                  <View
                    key={item.expense_id}
                    className="flex-row items-center justify-between py-2 px-1 border-b border-gray-100"
                  >
                    <Text className="w-[22%] text-gray-700 text-[13px]">{formatDate(item.expense_date)}</Text>
                    <Text className="w-[22%] text-gray-700 text-[13px]" numberOfLines={2}>
                      {item.category_name}
                    </Text>
                    <Text className="w-[16%] text-gray-700 text-[13px]">₹{item.amount}</Text>
                    <Text className="flex-1 text-gray-700 text-[13px] pr-1" numberOfLines={2}>
                      {item.description || "—"}
                    </Text>
                    <View className="w-[56px] flex-row justify-end items-center">
                      <TouchableOpacity
                        onPress={() => openEdit(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                        className="p-1"
                      >
                        <Ionicons name="pencil" size={18} color="#4F46E5" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => confirmDelete(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                        className="p-1 ml-0.5"
                      >
                        <Ionicons name="trash-outline" size={18} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </>
          )}
        </View>
      </View>

      <Modal visible={editVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-[#F6F8FF] rounded-t-3xl max-h-[88%] p-4">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-[18px] font-semibold text-gray-800">Edit expense</Text>
              <TouchableOpacity onPress={closeEdit} disabled={editSaving} className="p-2">
                <Ionicons name="close" size={26} color="#374151" />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {editError ? (
                <View className="mb-3 p-3 rounded-xl bg-red-50 border border-red-100">
                  <Text className="text-red-700 text-sm">{editError}</Text>
                </View>
              ) : null}

              <Text className="text-[15px] text-gray-700 mb-1">Category</Text>
              <CustomDropdown
                options={categories}
                selectedValue={editCategory}
                onSelect={setEditCategory}
                placeholder="Select category"
                containerStyle="bg-white rounded-xl px-4 py-4 border border-gray-300 mb-4"
              />

              <Text className="text-[15px] text-gray-700 mb-1">Date</Text>
              <ScrollableDatePicker
                selectedDate={editDate}
                onDateChange={setEditDate}
                mode="date"
                placeholder="Select date"
                containerStyle="bg-white rounded-xl px-4 py-4 border border-gray-300 mb-4"
              />

              <Text className="text-[15px] text-gray-700 mb-1">Amount</Text>
              <TextInput
                placeholder="0"
                keyboardType="numeric"
                value={editAmount}
                onChangeText={setEditAmount}
                className="bg-white rounded-xl px-4 py-3 text-[15px] border border-gray-300 mb-4"
              />

              <Text className="text-[15px] text-gray-700 mb-1">Payment mode</Text>
              <CustomDropdown
                options={[...PAID_MODE_OPTIONS]}
                selectedValue={editPaidMode}
                onSelect={setEditPaidMode}
                placeholder="Mode"
                containerStyle="bg-white rounded-xl px-4 py-4 border border-gray-300 mb-4"
              />

              <Text className="text-[15px] text-gray-700 mb-1">Note</Text>
              <TextInput
                placeholder="Write your note here"
                value={editNote}
                onChangeText={setEditNote}
                multiline
                className="bg-white rounded-xl px-4 py-3 text-[15px] border border-gray-300 mb-6"
              />

              <View className="flex-row justify-between pb-6">
                <TouchableOpacity
                  onPress={closeEdit}
                  disabled={editSaving}
                  className="flex-1 py-4 bg-white rounded-xl border border-gray-300 items-center mr-3"
                >
                  <Text className="text-[16px] text-gray-700">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={saveEdit}
                  disabled={editSaving}
                  className="flex-1 py-4 bg-[#4F46E5] rounded-xl items-center ml-3 flex-row justify-center"
                >
                  {editSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-[16px] text-white font-semibold">Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={deleteSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !deleting && setDeleteSheetVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[24px] p-6 pb-8">
            <Text className="text-xl font-black text-slate-900 mb-2">Delete Expense</Text>
            <Text className="text-slate-600 text-[15px] mb-6 leading-6">
              {pendingDeleteItem
                ? `Remove ${pendingDeleteItem.category_name} — ₹${pendingDeleteItem.amount} on ${formatDate(pendingDeleteItem.expense_date)}?`
                : "Are you sure you want to delete this expense?"}
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-slate-100 py-4 rounded-xl"
                onPress={() => {
                  setDeleteSheetVisible(false);
                  setPendingDeleteItem(null);
                }}
                disabled={deleting}
              >
                <Text className="text-center font-bold text-slate-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-red-500 py-4 rounded-xl items-center justify-center"
                onPress={deleteExpense}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-center font-bold text-white">Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
