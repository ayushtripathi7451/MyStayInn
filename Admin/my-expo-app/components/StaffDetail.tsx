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
import CustomDropdown from "./CustomDropdown";
import ScrollableDatePicker from "./ScrollableDatePicker";
import { MONTHLY_EXPENSE_TYPES } from "./StaffDetailAdd";

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

  const [editVisible, setEditVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editType, setEditType] = useState("");
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDueDay, setEditDueDay] = useState<number | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<MonthlyExpenseItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const openEdit = (item: MonthlyExpenseItem) => {
    setEditingId(item.monthly_expense_id);
    setEditType(item.expense_type);
    setEditName(item.name);
    setEditRole(item.role ?? "");
    setEditAmount(String(item.amount));
    setEditDueDay(item.due_day != null ? item.due_day : null);
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
    if (!editName.trim()) {
      setEditError("Please enter a name or title.");
      return;
    }
    const num = parseFloat(editAmount.replace(/,/g, ""));
    if (Number.isNaN(num) || num < 0) {
      setEditError("Please enter a valid amount.");
      return;
    }

    setEditSaving(true);
    try {
      await expenseApi.put(`/monthly-entry/${editingId}`, {
        property_id: propertyId,
        expense_type: editType.trim(),
        name: editName.trim(),
        role: editType === "Staff Salary" ? editRole.trim() || null : null,
        amount: num,
        due_day: editDueDay,
      });
      closeEdit();
      await fetchMonthly();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Failed to update";
      setEditError(msg);
    } finally {
      setEditSaving(false);
    }
  };

  const confirmDelete = (item: MonthlyExpenseItem) => {
    setDeleteError(null);
    setPendingDeleteItem(item);
    setDeleteSheetVisible(true);
  };

  const deleteMonthlyExpense = async () => {
    if (!propertyId || !pendingDeleteItem) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await expenseApi.delete(`/monthly-entry/${pendingDeleteItem.monthly_expense_id}`, {
        params: { property_id: propertyId },
      });
      setDeleteSheetVisible(false);
      setPendingDeleteItem(null);
      await fetchMonthly();
    } catch (e: any) {
      setDeleteError(e?.response?.data?.message || e?.message || "Unknown error");
    } finally {
      setDeleting(false);
    }
  };

  const nameLabel =
    editType === "Staff Salary"
      ? "Staff Name"
      : editType === "Rent"
        ? "Rent Title"
        : editType === "Utilities"
          ? "Utility Type"
          : editType === "Maintenance"
            ? "Maintenance Description"
            : editType === "Food & Supplies"
              ? "Supply Description"
              : editType === "Cleaning"
                ? "Cleaning Service"
                : "Description";

  return (
    <View className="mt-2">
      <View className="bg-white rounded-2xl p-4 shadow shadow-black/5">
        <Text className="text-[20px] font-semibold mb-3 text-gray-800">Monthly Fixed Expenses</Text>

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
            {deleteError ? (
              <View className="mb-2 p-3 rounded-xl bg-red-50 border border-red-100">
                <Text className="text-red-700 text-sm">{deleteError}</Text>
              </View>
            ) : null}
            <View className="flex-row justify-between mb-2 px-1">
              <Text className="w-[22%] font-semibold text-gray-600">Type</Text>
              <Text className="w-[28%] font-semibold text-gray-600">Name</Text>
              <Text className="w-[16%] font-semibold text-gray-600">Amount</Text>
              <Text className="w-[14%] font-semibold text-gray-600">Due</Text>
              <Text className="w-[52px]"> </Text>
            </View>
            <View className="h-[1px] bg-gray-200 mb-2" />

            {items.length === 0 ? (
              <Text className="text-gray-500 py-4">No monthly expenses yet. Add one below.</Text>
            ) : (
              items.map((item) => (
                <View
                  key={item.monthly_expense_id}
                  className="flex-row items-center py-2 px-1 border-b border-gray-100"
                >
                  <Text className="w-[22%] text-gray-700 text-[13px]" numberOfLines={2}>
                    {item.expense_type}
                  </Text>
                  <Text className="w-[28%] text-gray-700 text-[13px]" numberOfLines={2}>
                    {item.role ? `${item.name} (${item.role})` : item.name}
                  </Text>
                  <Text className="w-[16%] text-gray-700 text-[13px]">₹{item.amount}</Text>
                  <Text className="w-[14%] text-gray-700 text-[13px]">{item.due_display ?? "—"}</Text>
                  <View className="w-[52px] flex-row justify-end items-center">
                    <TouchableOpacity onPress={() => openEdit(item)} className="p-1" hitSlop={8}>
                      <Ionicons name="pencil" size={18} color="#4F46E5" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => confirmDelete(item)}
                      className="p-1 ml-0.5"
                      hitSlop={8}
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

      <Modal visible={editVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-[#F6F8FF] rounded-t-3xl max-h-[90%] p-4">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-[18px] font-semibold text-gray-800">Edit monthly expense</Text>
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

              <Text className="text-[15px] text-gray-700 mb-1 font-medium">Expense Type</Text>
              <CustomDropdown
                options={MONTHLY_EXPENSE_TYPES}
                selectedValue={editType}
                onSelect={setEditType}
                placeholder="Select expense type"
                containerStyle="bg-white rounded-xl px-4 py-3 mb-4 border border-gray-300"
              />

              <Text className="text-[15px] text-gray-700 mb-1 font-medium">{nameLabel}</Text>
              <TextInput
                className="bg-white rounded-xl px-4 py-3 mb-4 border border-gray-300 text-gray-800"
                value={editName}
                onChangeText={setEditName}
                placeholder="Name or title"
                placeholderTextColor="#9CA3AF"
              />

              {editType === "Staff Salary" && (
                <>
                  <Text className="text-[15px] text-gray-700 mb-1 font-medium">Role</Text>
                  <TextInput
                    className="bg-white rounded-xl px-4 py-3 mb-4 border border-gray-300 text-gray-800"
                    value={editRole}
                    onChangeText={setEditRole}
                    placeholder="Role / position"
                    placeholderTextColor="#9CA3AF"
                  />
                </>
              )}

              <Text className="text-[15px] text-gray-700 mb-1 font-medium">Amount</Text>
              <TextInput
                keyboardType="numeric"
                className="bg-white rounded-xl px-4 py-3 mb-4 border border-gray-300 text-gray-800"
                value={editAmount}
                onChangeText={setEditAmount}
                placeholder="Amount"
                placeholderTextColor="#9CA3AF"
              />

              <Text className="text-[15px] text-gray-700 mb-1 font-medium">Due day</Text>
              <ScrollableDatePicker
                selectedDate={editDueDay != null ? new Date(2020, 0, editDueDay) : null}
                onDateChange={(d) => setEditDueDay(d.getDate())}
                dueDayOnly
                placeholder="Tap to choose day of month"
                containerStyle="mb-2"
              />
              <TouchableOpacity
                onPress={() => setEditDueDay(null)}
                disabled={editSaving}
                className="self-start mb-4 px-3 py-2 rounded-lg bg-white border border-gray-200"
              >
                <Text className="text-sm text-gray-600">Clear due day</Text>
              </TouchableOpacity>

              <View className="flex-row justify-between pb-8">
                <TouchableOpacity
                  onPress={closeEdit}
                  disabled={editSaving}
                  className="flex-1 py-4 bg-white rounded-xl border border-gray-300 items-center mr-3"
                >
                  <Text className="text-[16px] text-gray-700 font-medium">Cancel</Text>
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
            <Text className="text-xl font-black text-slate-900 mb-2">Delete Monthly Expense</Text>
            <Text className="text-slate-600 text-[15px] mb-6 leading-6">
              {pendingDeleteItem
                ? `Remove "${pendingDeleteItem.name}" (${pendingDeleteItem.expense_type}) — ₹${pendingDeleteItem.amount}?`
                : "Are you sure you want to delete this monthly expense?"}
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
                onPress={deleteMonthlyExpense}
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
