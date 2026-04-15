import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import CustomDropdown from "./CustomDropdown";
import ScrollableDatePicker from "./ScrollableDatePicker";
import { useProperty } from "../contexts/PropertyContext";
import { expenseApi } from "../utils/api";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

export const MONTHLY_EXPENSE_TYPES = [
  "Staff Salary",
  "Rent",
  "Utilities",
  "Maintenance",
  "Food & Supplies",
  "Cleaning",
  "Miscellaneous",
];

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
  const [dueDay, setDueDay] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSave = async () => {
    setFormError(null);
    if (!propertyId) {
      setFormError("No property selected.");
      return;
    }
    if (!name.trim()) {
      setFormError("Please enter a name or title.");
      return;
    }
    const num = parseFloat(amount.replace(/,/g, ""));
    if (Number.isNaN(num) || num < 0) {
      setFormError("Please enter a valid amount.");
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
        due_day: dueDay ?? undefined,
      });
      onSaved?.();
      onBack();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Failed to save monthly expense";
      setFormError(msg);
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
    <KeyboardAwareScrollView
      contentContainerStyle={{ flexGrow: 1, padding: 12, paddingBottom: 40 }}
      enableOnAndroid={true}
      extraScrollHeight={20}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {formError ? (
        <View className="mb-3 p-3 rounded-xl bg-red-50 border border-red-100">
          <Text className="text-red-700 text-sm">{formError}</Text>
        </View>
      ) : null}
      <Text className="text-gray-700 mb-1 font-medium">Expense Type</Text>
      <CustomDropdown
        options={MONTHLY_EXPENSE_TYPES}
        selectedValue={type}
        onSelect={setType}
        placeholder="Select expense type"
        containerStyle="bg-white rounded-xl px-4 py-3 mb-4 border border-gray-300"
      />

      <Text className="text-gray-700 mb-1 font-medium">{nameLabel}</Text>
      <TextInput
        className="bg-white rounded-xl px-4 py-3 mb-4 border border-gray-300 text-gray-800"
        value={name}
        onChangeText={setName}
        placeholder={namePlaceholder}
        placeholderTextColor="#9CA3AF"
      />

      {type === "Staff Salary" && (
        <>
          <Text className="text-gray-700 mb-1 font-medium">Role</Text>
          <TextInput
            className="bg-white rounded-xl px-4 py-3 mb-4 border border-gray-300 text-gray-800"
            value={role}
            onChangeText={setRole}
            placeholder="Enter role/position"
            placeholderTextColor="#9CA3AF"
          />
        </>
      )}

      <Text className="text-gray-700 mb-1 font-medium">Amount</Text>
      <TextInput
        keyboardType="numeric"
        className="bg-white rounded-xl px-4 py-3 mb-4 border border-gray-300 text-gray-800"
        value={amount}
        onChangeText={setAmount}
        placeholder="Enter amount"
        placeholderTextColor="#9CA3AF"
      />

      <Text className="text-gray-700 mb-1 font-medium">Due day</Text>
      <ScrollableDatePicker
        selectedDate={dueDay != null ? new Date(2020, 0, dueDay) : null}
        onDateChange={(d) => setDueDay(d.getDate())}
        dueDayOnly
        placeholder="Tap to choose day of month"
        containerStyle="mb-4"
      />

      <View className="flex-row gap-3 mt-4">
        <TouchableOpacity
          onPress={onBack}
          disabled={saving}
          className="flex-1 py-4 bg-white border border-gray-300 rounded-xl items-center"
        >
          <Text className="text-gray-700 font-bold">Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
          className="flex-1 py-4 bg-[#4F46E5] rounded-xl items-center shadow-lg shadow-indigo-300 flex-row justify-center"
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white font-bold">Save Expense</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
  );
}
