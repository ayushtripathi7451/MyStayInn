import React from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function AadhaarKycCheckoutModal({
  visible,
  onClose,
  onProceed,
  title = "KYC Verification",
  subtitle = "Aadhaar verification charges summary",
}: {
  visible: boolean;
  onClose: () => void;
  onProceed: () => void;
  title?: string;
  subtitle?: string;
}) {
  const charge = 10;
  const discount = 10;
  const total = 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl p-6">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-xl font-extrabold text-slate-900">{title}</Text>
              <Text className="text-slate-500 mt-1">{subtitle}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
            >
              <Ionicons name="close" size={20} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <View className="mt-5 rounded-2xl border border-slate-200 overflow-hidden">
            <View className="px-4 py-4 bg-slate-50">
              <Text className="text-slate-900 font-bold">Checkout</Text>
            </View>

            <View className="px-4 py-4">
              <Row label="KYC verification charges" value={`₹${charge}`} />
              <Row label="Discount" value={`- ₹${discount}`} valueClassName="text-emerald-700" />
              <View className="h-[1px] bg-slate-200 my-3" />
              <Row label="Total charged" value={`₹${total}`} valueClassName="text-slate-900" bold />
            </View>
          </View>

          <View className="flex-row gap-3 mt-6">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 py-4 rounded-2xl bg-slate-100 border border-slate-200"
              activeOpacity={0.85}
            >
              <Text className="text-center text-slate-700 font-bold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onProceed}
              className="flex-1 py-4 rounded-2xl bg-indigo-600"
              activeOpacity={0.85}
            >
              <Text className="text-center text-white font-bold">Proceed</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Row({
  label,
  value,
  valueClassName,
  bold,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  bold?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className={`text-slate-600 ${bold ? "font-bold" : "font-medium"}`}>{label}</Text>
      <Text className={`${bold ? "font-extrabold" : "font-bold"} ${valueClassName || "text-slate-700"}`}>
        {value}
      </Text>
    </View>
  );
}

