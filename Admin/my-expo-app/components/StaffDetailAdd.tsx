import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import CustomDropdown from "./CustomDropdown";
import { useProperty } from "../contexts/PropertyContext";
import { expenseApi } from "../utils/api";

const EXPENSE_TYPES = [
  "Staff Salary",
  "Rent",
  "Utilities",
  "Maintenance",
  "Food & Supplies",
  "Cleaning",
  "Miscellaneous",
];

// Parse "5th", "1st", "15" etc. to day number 1-31
function parseDueDay(input: string): number | undefined {
  const s = input.trim();
  if (!s) return undefined;
  const num = parseInt(s.replace(/\D/g, ""), 10);
  if (!Number.isNaN(num) && num >= 1 && num <= 31) return num;
  return undefined;
}

export default function StaffDetailAdd({
  onBack,
  onSaved,
}: {
  onBack: () => void;
  onSaved?: () => void;
}) {
  const { currentProperty } = useProperty();
  const propertyId = currentProperty?.id;

  const [type, setType] = useState<string>("Staff Salary");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!propertyId) {
      Alert.alert("Error", "No property selected.");
      return;
    }
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a name or title.");
      return;
    }
    const num = parseFloat(amount.replace(/,/g, ""));
    if (Number.isNaN(num) || num < 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }

    setSaving(true);
    try {
      await expenseApi.post("/monthly", {
        property_id: propertyId,
        expense_type: type,
        name: name.trim(),
        role: role.trim() || undefined,
        amount: num,
        due_day: parseDueDay(dueDate),
      });
      onSaved?.();
      onBack();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Failed to save monthly expense";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  const nameLabel =
    type === "Staff Salary"
      ? "Staff Name"
      : type === "Rent"
        ? "Rent Title"
        : type === "Utilities"
          ? "Utility Type"
          : type === "Maintenance"
            ? "Maintenance Description"
            : type === "Food & Supplies"
              ? "Supply Description"
              : type === "Cleaning"
                ? "Cleaning Service"
                : "Description";

  const namePlaceholder =
    type === "Staff Salary"
      ? "Enter staff name"
      : type === "Rent"
        ? "Hostel / Building Rent"
        : "Enter description";

  return (
    <View className="flex-1 bg-[#F6F8FF] p-3">
      <Text className="text-gray-700 mb-1">Expense Type</Text>
      <CustomDropdown
        options={EXPENSE_TYPES}
        selectedValue={type}
        onSelect={setType}
        placeholder="Select expense type"
        containerStyle="bg-white rounded-xl px-4 py-3 mb-4 border border-gray-300"
      />

      <Text className="text-gray-700 mb-1">{nameLabel}</Text>
      <TextInput
        className="bg-white rounded-xl px-4 py-3 mb-4 border border-gray-300"
        value={name}
        onChangeText={setName}
        placeholder={namePlaceholder}
      />

      {type === "Staff Salary" && (
        <>
          <Text className="text-gray-700 mb-1">Role</Text>
          <TextInput
            className="bg-white rounded-xl px-4 py-3 mb-4 border border-gray-300"
            value={role}
            onChangeText={setRole}
            placeholder="Enter role/position"
          />
        </>
      )}

      <Text className="text-gray-700 mb-1">Amount</Text>
      <TextInput
        keyboardType="numeric"
        className="bg-white rounded-xl px-4 py-3 mb-4 border border-gray-300"
        value={amount}
        onChangeText={setAmount}
        placeholder="Enter amount"
      />

      <Text className="text-gray-700 mb-1">Due Date</Text>
      <TextInput
        placeholder="e.g. 5th of every month"
        className="bg-white rounded-xl px-4 py-3 mb-4 border border-gray-300"
        value={dueDate}
        onChangeText={setDueDate}
      />

      <View className="flex-row gap-3 mt-6">
        <TouchableOpacity
          onPress={onBack}
          disabled={saving}
          className="flex-1 py-4 bg-white border border-gray-300 rounded-xl items-center"
        >
          <Text className="text-gray-700 font-medium">Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className="flex-1 py-4 bg-[#645CFF] rounded-xl items-center shadow-lg shadow-indigo-300 flex-row justify-center"
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white font-semibold">Save Expense</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
