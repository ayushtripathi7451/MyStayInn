import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import ScrollableDatePicker from "./ScrollableDatePicker";
import CustomDropdown from "./CustomDropdown";
import { useProperty } from "../contexts/PropertyContext";
import { expenseApi } from "../utils/api";

const FALLBACK_CATEGORIES = [
  "Food",
  "Rent",
  "Electricity",
  "Water",
  "Transport",
  "Shopping",
  "Other",
];

export default function ExpenseAddForm({
  onBack,
  onSaved,
}: {
  onBack: () => void;
  onSaved?: () => void;
}) {
  const { currentProperty } = useProperty();
  const propertyId = currentProperty?.id;

  const [categories, setCategories] = useState<string[]>(FALLBACK_CATEGORIES);
  const [category, setCategory] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

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

  const handleSave = async () => {
    if (!propertyId) {
      Alert.alert("Error", "No property selected.");
      return;
    }
    if (!category.trim()) {
      Alert.alert("Error", "Please select a category.");
      return;
    }
    const num = parseFloat(amount.replace(/,/g, ""));
    if (Number.isNaN(num) || num < 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }

    setSaving(true);
    try {
      await expenseApi.post("", {
        property_id: propertyId,
        category_name: category.trim(),
        amount: num,
        description: note.trim() || undefined,
        expense_date: date.toISOString(),
      });
      onSaved?.();
      onBack();
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message || e?.message || "Failed to save expense";
      const detail = status === 401 ? "Please log in again." : status === 404 ? "Expense service not found. Check that it's running on port 3006." : msg;
      Alert.alert("Error", detail);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F6F8FF] p-3">
      <Text className="text-[15px] text-gray-700 mb-1">Category</Text>
      <CustomDropdown
        options={categories}
        selectedValue={category}
        onSelect={setCategory}
        placeholder="Select category"
        containerStyle="bg-white rounded-xl px-4 py-4 border border-gray-300 mb-4"
      />

      <Text className="text-[15px] text-gray-700 mb-1">Date</Text>
      <ScrollableDatePicker
        selectedDate={date}
        onDateChange={setDate}
        mode="date"
        placeholder="Select date"
        containerStyle="bg-white rounded-xl px-4 py-4 border border-gray-300 mb-4"
      />

      <Text className="text-[15px] text-gray-700 mb-1">Amount</Text>
      <TextInput
        placeholder="0"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        className="bg-white rounded-xl px-4 py-3 text-[15px] border border-gray-300 mb-4"
      />

      <Text className="text-[15px] text-gray-700 mb-1">Note</Text>
      <TextInput
        placeholder="Write your note here"
        value={note}
        onChangeText={setNote}
        multiline
        className="bg-white rounded-xl px-4 py-3 text-[15px] border border-gray-300 mb-4"
      />

      <View className="flex-row justify-between mt-3">
        <TouchableOpacity
          onPress={onBack}
          disabled={saving}
          className="flex-1 py-4 bg-white rounded-xl border border-gray-300 items-center mr-3"
        >
          <Text className="text-[16px] text-gray-700">‹ Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className="flex-1 py-4 bg-[#645CFF] rounded-xl items-center ml-3 flex-row justify-center"
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-[16px] text-white">Save Expense ›</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
